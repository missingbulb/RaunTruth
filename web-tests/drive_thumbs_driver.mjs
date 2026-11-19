// Drives the Google Drive dialog (web/) in headless Chromium against the Drive fake listing a folder of
// N images and a slow subfolder, with a stand-in driveThumbs set whose thumbnail for row k is k + 1 pixels wide,
// so a thumbnail in the wrong row shows. Checks req/shell/drive/dialog: thumbnails are fetched for the rows in view and the next
// 10, each landing in its own row whatever order they arrive in; a fast scroll skips the rows passed over; a
// stale folder listing never shows; closing stops the fetches and reopening shows those already fetched at once
// and fetches what the rows in view still lack.
// Optional SHOTS: a directory for a screenshot. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_thumbs_driver.mjs [SHOTS]
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";

import { pressDrive, pickRecent } from "./drive_open.mjs";
import { repoFile } from "./repo_file.mjs";
import { frames as framesOf } from "./page_frames.mjs";
import { launch, siteOf } from "./harness.mjs";
import { googleDrive } from "./fakes/google_drive.mjs";
import { orMissed, untilHeard } from "./page_until.mjs";
import { held as holding } from "./held.mjs";
import { STEP } from "./deadlines.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const [shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const N = 60, AHEAD = 10;
// the fixture study's own folder, which its dialog lists
const ROOT = "fixturefolder00000001", SLOW = { id: "thumbfolder000000002", name: "slow" };
const IMAGES = Array.from({ length: N }, (_, k) => ({ id: "thumbimage" + String(k).padStart(10, "0"), name: `img ${String(k).padStart(2, "0")}.tif` }));
// a grey PNG w pixels wide
function png(w) {
  const chunk = (type, data) => {
    const t = Buffer.concat([Buffer.from(type), data]), n = Buffer.alloc(4), c = Buffer.alloc(4);
    n.writeUInt32BE(data.length); c.writeUInt32BE(zlib.crc32(t));
    return Buffer.concat([n, t, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(4, 4); ihdr[8] = 8; ihdr[9] = 0;
  const rows = Buffer.concat(Array.from({ length: 4 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w, 128)])));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(""); }
  // the fixture with ready-made thumbnails, opening the TIFFs its folder holds
  if (u === "/studies/fixture/study.json") {
    const m = JSON.parse(fs.readFileSync(path.join(repo, u), "utf8"));
    r.writeHead(200, { "content-type": "application/json" }); return r.end(JSON.stringify({ ...m, driveThumbs: "thumbs/", files: { ...m.files, accept: ".tif,.tiff" } }));
  }
  if (u === "/studies/fixture/thumbs/index.json") { r.writeHead(200, { "content-type": "application/json" }); return r.end(JSON.stringify(IMAGES.map((f) => f.id))); }
  const f = repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await launch(pw);
// the deploy with a Google key
siteOf(browser).settings.env = { GOOGLE_API_KEY: "stand-in" };
let failed = false;
const check = (ok, what) => { if (!ok) { failed = true; console.error("FAILED: " + what); } else console.log("ok: " + what); };
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
// the Drive fake's folder: the slow subfolder, and N images whose bytes are never read here; the subfolder's listing
// held until the user has moved on
const drive = googleDrive(ctx);
drive.folder({ ...SLOW, parent: ROOT });
drive.file({ id: "slowimage00000000001", name: "stale.tif", parent: SLOW.id, bytes: Buffer.alloc(1000), mimeType: "image/tiff" });
for (const f of IMAGES) drive.file({ ...f, parent: ROOT, bytes: Buffer.alloc(1000), mimeType: "image/tiff", createdTime: "2026-10-01T10:00:00Z" });
const slowListing = holding();
drive.hold = (c) => (c.kind === "list" && c.parent === SLOW.id ? slowListing.hold() : null);
// each thumbnail's request, in order, and how many are still unanswered (answered or aborted by the page leaves
// them)
const asked = [];
let inflight = 0;
// while held, no thumbnail is answered, so the answers are slower than whatever the test does meanwhile: gates holds
// each held answer's release by its row, and letGo(rows) lets those rows' answers go, every one held by default
let holdingAll = false;
const gates = new Map();
const hold = () => { holdingAll = true; };
const letGo = (rows = [...gates.keys()]) => {
  if (rows.length === gates.size) holdingAll = false;
  for (const k of rows) { gates.get(k)?.(); gates.delete(k); }
};
// resolves at the next request or answer
let moved, next = new Promise((ok) => { moved = ok; });
const note = () => { moved(); next = new Promise((ok) => { moved = ok; }); };
const slowListed = drive.next((c) => c.kind === "list" && c.parent === SLOW.id);
// a bound on waiting for the stand-in, so a page that never asks fails its check rather than hanging
const atMost = (ms) => new Promise((ok) => setTimeout(ok, ms)); // bounds a hang: a page that never asks fails its check
await ctx.route(`${origin}/studies/fixture/thumbs/*.jpg`, async (route) => {
  const id = path.basename(new URL(route.request().url()).pathname, ".jpg"), k = IMAGES.findIndex((f) => f.id === id);
  asked.push(k); inflight++;
  const gate = holdingAll && new Promise((ok) => gates.set(k, ok));
  note();
  if (gate) await gate;
  try { await route.fulfill({ status: 200, contentType: "image/png", body: png(k + 1) }); } catch { /* aborted by the page */ }
  inflight--; note();
});
await ctx.addInitScript((link) => {
  delete Navigator.prototype.serviceWorker;
  localStorage.setItem("nor-drive-link", JSON.stringify(link));
}, `https://drive.google.com/drive/folders/${ROOT}`);
// the thumbnails the page has asked for, counted as it asks, before any request reaches the stand-in
await ctx.addInitScript(() => {
  window.thumbsAsked = 0;
  const fetchNow = window.fetch;
  window.fetch = function (u, ...rest) { if (/\/thumbs\/[^/]+\.jpg$/.test(String(u?.url ?? u))) window.thumbsAsked++; return fetchNow.call(this, u, ...rest); };
});
const page = await ctx.newPage();
page.on("pageerror", (e) => { failed = true; console.error("page error: " + e.message); });
page.setDefaultTimeout(STEP);

// the image rows in view, by row number, and the window the page should fetch for them
const inView = () => page.evaluate(() => {
  const box = $("#remote-list").getBoundingClientRect();
  return [...document.querySelectorAll("#remote-list .item:not(.folder)")].flatMap((b, k) => {
    const r = b.getBoundingClientRect();
    return r.bottom > box.top && r.top < box.bottom ? [k] : [];
  });
});
const span = (rows) => { const out = []; for (let k = rows[0]; k <= Math.min(N - 1, rows[rows.length - 1] + AHEAD); k++) out.push(k); return out; };
// the width of the picture each image row shows, null where it shows none
const shown = () => page.evaluate(() => [...document.querySelectorAll("#remote-list .item:not(.folder) .pic")].map((p) => p.querySelector("img")?.naturalWidth || null));
// waits until every row in view and the next AHEAD has its picture or has been asked for, every request is answered, and the page says
// its thumbnails are in (the status bar's "Thumbnails n of m" gone); 10 s at most, the checks after it saying what is missing
const quiet = async () => {
  let want, pics;
  const done = await untilHeard(async () => {
    want = span(await inView()); pics = await shown();
    if (!want.every((k) => asked.includes(k) || pics[k]) || inflight) return false;
    await orMissed(page.waitForFunction(() => !/^Thumbnails /.test($("#status").textContent), null, { timeout: 10000 }));
    await framesOf(page);
    const now = await shown();
    return !inflight && span(await inView()).every((k) => asked.includes(k) || now[k]);
  }, () => Promise.race([next, orMissed(page.waitForEvent("requestfinished", { timeout: 10000 }))]), { timeout: 10000 });
  if (!done) console.log("quiet: gave up after 10 s", JSON.stringify({ want, pics: want.map((k) => pics[k]), asked: sorted(asked), inflight, status: await page.textContent("#status") }));
};
// the page's handlers for what was just done have all run
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const sorted = (a) => [...new Set(a)].sort((x, y) => x - y);
const open = async () => {
  await pressDrive(page);
  await page.waitForFunction((n) => document.querySelectorAll("#remote-list .item:not(.folder)").length === n, N);
};

try {
  await page.goto(origin + "/web/fixture");
  await page.waitForFunction(() => window.$ && $("#title").textContent);

  // answers arrive in reverse order of asking: the later rows' first
  hold();
  // the status bar's message, each time it changes
  await page.evaluate(() => {
    window.said = []; window.saidBefore = $("#status").textContent;
    new MutationObserver(() => said.push($("#status").textContent)).observe($("#status"), { childList: true, characterData: true, subtree: true });
  });
  await open();
  await untilHeard(async () => span(await inView()).every((k) => gates.has(k)), () => next);
  for (const k of [...gates.keys()].sort((x, y) => y - x)) {
    const left = inflight;
    letGo([k]);
    await untilHeard(() => inflight < left, () => next);
  }
  letGo();
  await quiet();
  const told = await page.evaluate(() => ({ said, before: saidBefore, now: $("#status").textContent, own: !!document.querySelector("#sb-thumbs") }));
  check(told.said.some((t) => /^Thumbnails \d+ of \d+ · /.test(t)) && !told.own, `while thumbnails load, the status message says how many: ${JSON.stringify(told.said)}`);
  // what the page last said besides them, which may have moved on while they loaded
  const lastSaid = told.said.filter((t) => !t.startsWith("Thumbnails ")).at(-1) ?? told.before;
  check(told.now === lastSaid, `and once they are in it says again what the page last said: ${told.now} (last said ${lastSaid})`);
  const first = span(await inView());
  check(same(sorted(asked), first), `fetched only the rows in view and the next ${AHEAD}: ${sorted(asked)} (want ${first})`);
  check(asked.length === first.length, `each once: ${asked.length} fetches for ${first.length} rows`);
  let pics = await shown();
  check(first.every((k) => pics[k] === k + 1), `each thumbnail in its own row, whatever order they arrived in: ${first.map((k) => pics[k])}`);
  if (shots) await page.locator("#remote-dlg").screenshot({ path: path.join(shots, "drive_thumbs.png") });

  // a fast scroll to the bottom, answers slower than the scroll: the rows passed over are never fetched
  asked.length = 0; hold();
  const height = await page.evaluate(() => $("#remote-list").scrollHeight);
  // a step a frame, as a flung wheel scrolls
  for (let y = 0; y <= height; y += 250) { await page.evaluate((t) => { $("#remote-list").scrollTop = t; }, y); await framesOf(page, 1); }
  letGo();
  await quiet();
  const last = span(await inView());
  // the fetches started as the scroll began, before it outran them, are the only rows passed over that are fetched
  const passed = sorted(asked).filter((k) => !first.includes(k) && !last.includes(k));
  check(passed.length <= 4, `a fast scroll skips the rows passed over, bar the ${passed.length} it started on: ${passed}`);
  check(last.length > 0 && last.every((k) => first.includes(k) || asked.includes(k)), `and fetches the ${last.length} rows it stops on`);
  pics = await shown();
  check(last.every((k) => pics[k] === k + 1), `which land in their own rows: ${last.map((k) => pics[k])}`);

  // closing midway stops the fetches; reopening shows what was fetched at once and fetches the rest in view
  await page.evaluate(() => { $("#remote-list").scrollTop = 0; });
  await quiet();
  const had = (await shown()).flatMap((w, k) => (w ? [k] : []));
  asked.length = 0; hold();
  const from = await page.evaluate(() => window.thumbsAsked);
  await page.evaluate(() => { $("#remote-list").scrollTop = $("#remote-list").scrollHeight / 2; });
  // the first rows there asked for, their answers still on the way
  await orMissed(page.waitForFunction((n) => window.thumbsAsked > n, from));
  const middle = span(await inView());
  check(had.length >= first.length && middle.length > AHEAD, `${had.length} thumbnails held before closing, ${middle.length} rows wanted midway`);
  // what the page had asked for, read in the same task as the close, so none is asked between the two
  const cut = await page.evaluate(() => { const n = window.thumbsAsked; document.querySelector("#remote-dlg button[value=close]").click(); return n; }) - from;
  // every request made before closing answered or cut off, and the page done with them
  letGo();
  await untilHeard(() => !inflight, () => next, { timeout: 5000 });
  await framesOf(page);
  const after = (await page.evaluate(() => window.thumbsAsked)) - from - cut;
  check(cut > 0 && after === 0, `closing the dialog stops the fetches: ${cut} asked before, ${after} after`);
  asked.length = 0;
  await open();
  pics = await shown();
  check(had.every((k) => pics[k] === k + 1) && asked.length === 0, `reopened, the thumbnails fetched before show at once, none fetched again: ${had.filter((k) => pics[k] !== k + 1)}; asked ${asked}`);
  await page.evaluate(() => { $("#remote-list").scrollTop = $("#remote-list").scrollHeight / 2; });
  await quiet();
  pics = await shown();
  check(middle.every((k) => pics[k] === k + 1), `and it goes on to fetch what the rows in view lack: ${middle.map((k) => pics[k])}`);
  check(asked.every((k) => !had.includes(k)), `never one it already has: ${asked.filter((k) => had.includes(k))}`);

  // a folder asked for and left before its listing arrives never shows
  await page.evaluate(() => { $("#remote-list").scrollTop = 0; });
  await page.dblclick("#remote-list .item.folder");
  await Promise.race([slowListing.asked, atMost(5000)]);
  await page.click("#remote-path button[data-k='0']");
  // the slow listing in, after the user moved on, and the page done with it
  slowListing.release();
  await Promise.race([slowListed, atMost(5000)]);
  await framesOf(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#remote-list .item .name")].map((e) => e.textContent));
  check(rows.length === N + 1 && !rows.includes("stale.tif"), `a listing that arrives after the user moved on is dropped: ${rows.length} rows${rows.includes("stale.tif") ? ", stale.tif among them" : ""}`);
} catch (e) {
  failed = true; console.error("FAILED: " + e.message);
}
await browser.close(); server.close();
process.exitCode = failed ? 1 : 0;
