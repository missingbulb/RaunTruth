// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from
// ANSWERS (tests/test_study_runs.py), and checks that Escape pressed in the middle of the shell's drags cancels
// each: the ruler, the image's pan, the left bar's width and the minimap all go back to where the press found
// them, the Escape reaches nothing else on the page, and letting go afterwards does nothing.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drag_escape_driver.mjs ANSWERS IMAGE.png STUDIES
import { EARLY } from "./early_messages.mjs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { repoFile } from "./repo_file.mjs";

import { localStudy } from "./local_study.mjs";
import { launch } from "./harness.mjs";
import { STEP } from "./deadlines.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const [answers, image, studies] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
postMessage({ type: "ready", info: A.ready.fixture, heap: 0, files: 0 });
onmessage = ({ data: m }) => {
  if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images }, [images.buffer]); }
};`;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(EARLY + STAND_IN); }
  if (u === "/web/vendor/wheels.json") { r.writeHead(200, { "content-type": "application/json" }); return r.end("[]"); }
  const f = u === "/web/answers.json" ? answers : u === "/web/studies.json" ? studies : repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await launch(pw);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); } console.log("ok: " + what); };

const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await localStudy(ctx, "fixture");
// every Escape the page itself hears, after the drag's own wrapper has had its say
await ctx.addInitScript(() => {
  delete Navigator.prototype.serviceWorker;
  window.heardEscape = 0;
  addEventListener("keydown", (e) => { if (e.key === "Escape") heardEscape++; });
});
const page = await ctx.newPage();
page.on("pageerror", async (e) => { console.error("page error: " + e.message); await done(1); });
page.setDefaultTimeout(STEP);
await page.goto(origin + "/web/fixture");
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
await page.setInputFiles("#file", image);
await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");

// a press at `from` dragged to `to`, Escape while it is held, then a little more motion and the release
// and, while it is held, the label at the page's bottom center that says Escape cancels it (req/shell/drag/hint)
const hint = () => page.evaluate(() => {
  const el = [...document.querySelectorAll("body *")].find((n) => n.textContent.trim() === "Hit 'esc' to cancel" && !n.children.length);
  if (!el || !el.checkVisibility()) return null;
  const b = el.getBoundingClientRect(), bar = $("#statusbar").getBoundingClientRect();
  return { centered: Math.abs(b.x + b.width / 2 - innerWidth / 2) < 2, above: b.bottom <= bar.top && bar.top - b.bottom < 60, through: getComputedStyle(el).pointerEvents === "none" };
});
async function escaped(from, to, during) {
  await page.mouse.move(...from); await page.mouse.down();
  await page.mouse.move(...to, { steps: 5 });
  const mid = during ? await during() : null;
  const shown = await hint();
  await check(shown && shown.centered && shown.above && shown.through, "mid-drag, 'Hit 'esc' to cancel' shows at the bottom center, above the status bar", shown);
  await page.keyboard.press("Escape");
  await check(await hint() === null, "Escape takes the label away");
  await page.mouse.move(to[0] + 15, to[1] + 10, { steps: 3 });
  await page.mouse.up();
  return mid;
}
const scroll = () => page.evaluate(() => [$("#scroller").scrollLeft, $("#scroller").scrollTop]);
const middleOf = async (sel) => { const b = await page.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const heard = () => page.evaluate(() => heardEscape);

// in far enough that the image is larger than the view, with room to pan every way
await page.evaluate(() => { const sc = $("#scroller"); shellForTests.viewer.setZoom(Math.max(4, 3 * sc.clientWidth / st.W, 3 * sc.clientHeight / st.H)); });
const home = () => page.evaluate(() => { const sc = $("#scroller"); sc.scrollTo((sc.scrollWidth - sc.clientWidth) / 2, (sc.scrollHeight - sc.clientHeight) / 2); });
await home();

// the image's pan
{
  const before = await scroll(), at = await middleOf("#scroller");
  const mid = await escaped(at, [at[0] - 60, at[1] - 40], scroll);
  const after = await scroll();
  await check(mid.join() !== before.join(), "dragging the image pans it", { before, mid });
  await check(after.join() === before.join(), "Escape mid-pan puts the view back where the press found it", { before, after });
}

// the ruler
{
  await page.click("#ruler-btn");
  const before = await scroll(), at = await middleOf("#scroller");
  const mid = await escaped(at, [at[0] + 90, at[1] + 60], () => page.evaluate(() => document.querySelectorAll("#ruler path").length));
  const r = await page.evaluate(() => ({ pressed: $("#ruler-btn").getAttribute("aria-pressed"), paths: document.querySelectorAll("#ruler path").length }));
  await check(mid > 0, "dragging the ruler draws it");
  await check(r.paths === 0 && r.pressed === "true", "Escape mid-measure leaves no ruler, the ruler still armed", r);
  await check((await scroll()).join() === before.join(), "and the release after it pans nothing");
  await page.click("#ruler-btn");
}

// the left bar's width
{
  const width = () => page.evaluate(() => Math.round($("#left").getBoundingClientRect().width));
  const stored = () => page.evaluate(() => localStorage.length && JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
  const before = await width(), kept = await stored(), at = await middleOf("#gutter-left");
  const mid = await escaped(at, [at[0] + 120, at[1]], width);
  await page.waitForFunction(() => !document.getAnimations().some((a) => a.transitionProperty === "grid-template-columns"));
  await check(Math.abs(mid - before) > 60, "dragging the gutter widens the left bar", { before, mid });
  await check(await width() === before && await stored() === kept, "Escape mid-resize puts the bar back at its width, nothing saved", { before, after: await width() });
}

// the minimap
{
  await home();
  const before = await scroll(), body = await page.locator("#minimap .mm-body").boundingBox();
  const mid = await escaped([body.x + body.width * 0.7, body.y + body.height * 0.7], [body.x + body.width * 0.9, body.y + body.height * 0.8], scroll);
  await check(mid.join() !== before.join(), "dragging in the minimap moves the view", { before, mid });
  await check((await scroll()).join() === before.join(), "Escape mid-drag in the minimap puts the view back", { before, after: await scroll() });
}

// a drag let go, not Escaped, takes the label with it; a click that does not move never shows it
{
  await home();
  const at = await middleOf("#scroller");
  await page.mouse.move(...at); await page.mouse.down();
  await check(await hint() === null, "a press that has not moved shows no label");
  await page.mouse.move(at[0] - 30, at[1] - 20, { steps: 3 });
  await check(await hint() !== null, "the label shows once the press moves");
  await page.mouse.up();
  await check(await hint() === null, "letting go takes the label away");
  await home();
}

await check(await heard() === 0, "no Escape that cancelled a drag reached the page", await heard());
// with nothing dragged, Escape is the page's again
await page.keyboard.press("Escape");
await check(await heard() === 1, "an Escape with no drag reaches the page as before", await heard());
await done(0);
