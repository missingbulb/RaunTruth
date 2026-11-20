// Drives the Google Drive dialog (web/) in headless Chromium against a stand-in Drive API that serves
// IMAGE... (each given the id the test gave its ready-made thumbnail, dialogfile<k>) and one image the lab's list lacks from a folder, with one
// subfolder holding the first image again: a click only selects a row, Open loads the selection, a double
// click enters a folder, and thumbnails come from the study's ready-made ones (served from THUMBS, a
// stand-in driveThumbs folder) or one saved when an image was opened, never from Drive, and not at all
// while Show thumbnails, in Settings, is off.
// Prints what it measured; exits 1 when something is wrong, 2 when it cannot run. With SHOT, also saves a
// screenshot of the dialog there.
//   node tests/drive_dialog_driver.mjs SHOT|- THUMBS IMAGE...
import { repoFile } from "../../../web-tests/repo_file.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { cutShort } from "../../../web-tests/page_errors.mjs";
import { frames } from "../../../web-tests/page_frames.mjs";
import { pw, launch, siteOf } from "../../../web-tests/harness.mjs";
import { googleDrive } from "../../../web-tests/fakes/google_drive.mjs";

const [shot, thumbs, ...images] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const ROOT = "rootfolder0000000001", SUB = "subfolder00000000001";
const files = images.map((p, k) => ({ id: `dialogfile${String(k).padStart(10, "0")}`, name: path.basename(p), bytes: fs.readFileSync(p) }));
const stranger = { id: "notinthelab000000001", name: "Not in the lab's list.tif", bytes: files[0].bytes };
const TYPES = { ".jpg": "image/jpeg", ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
let thumbsServed = 0;
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(""); }
  const ready = u.startsWith("/studies/nor/ready-thumbs/");
  if (ready && u.endsWith(".jpg")) thumbsServed++;
  const f = ready ? path.join(thumbs, u.slice("/studies/nor/ready-thumbs/".length)) : repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await launch(pw);
siteOf(browser).studies.edit("nor", (m) => ({ ...m, driveThumbs: "ready-thumbs/", root: `https://drive.google.com/drive/folders/${ROOT}` }));
// the deploy with a Google key
siteOf(browser).settings.env = { GOOGLE_API_KEY: "stand-in" };
const done = async (code, why) => { if (why) console.error(why); await browser.close(); server.close(); process.exit(code); };
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
// the Drive fake's folder: a subfolder holding the first image too, the lab's images and one it lacks
const drive = googleDrive(ctx);
drive.folder({ id: ROOT, name: "Slides", access: "public" });
drive.folder({ id: SUB, name: "More slides", parent: ROOT });
for (const [k, f] of [...files, stranger].entries()) drive.file({ ...f, parent: ROOT, also: k ? undefined : [SUB], mimeType: "image/tiff", createdTime: "2026-10-01T10:00:00Z" });
// what the page took from Drive: per file, how often the whole file and how often a piece of it
const asked = (id) => { const c = drive.calls.filter((x) => x.kind === "download" && x.id === id); return { whole: c.filter((x) => !x.range).length, pieces: c.filter((x) => x.range).length }; };
// resolves once the whole file is asked for, or rejects after ms
const askedWhole = (id, ms) => asked(id).whole ? Promise.resolve() : Promise.race([drive.next((c) => c.kind === "download" && c.id === id && !c.range),
  new Promise((ok, no) => setTimeout(no, ms))]); // bounds a hang: a page that never asks fails, not hangs
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
const page = await ctx.newPage();
page.on("pageerror", (e) => { if (!cutShort(e)) done(1, "page error: " + e.message); });
page.setDefaultTimeout(15000);
await page.goto(origin + "/web/index.html?study=nor");
await page.click("#load-remote");
await page.waitForSelector("#remote-list .item");
const rows = await page.$$eval("#remote-list .item", (b) => b.map((e) => e.querySelector(".name").textContent));
console.log("rows:", rows.join(" | "));
if (rows.length !== files.length + 2) await done(1, `expected ${files.length + 2} rows`);

// the lab's images show the site's thumbnails, the other none, and nothing is read from Drive
await page.waitForFunction((n) => document.querySelectorAll("#remote-list .item .pic img").length === n, files.length);
const pics = await page.$$eval("#remote-list .item .pic", (ps) => ps.map((p) => (p.querySelector("img") ? p.querySelector("img").naturalWidth : 0)));
console.log("thumbnail widths:", JSON.stringify(pics));
if (pics[pics.length - 1]) await done(1, "an image the lab's list lacks has a thumbnail");
if ([...files, stranger].some((f) => asked(f.id).whole)) await done(1, "thumbnails were read from Drive");
// a colour thumbnail: its three colours differ
const colour = await page.$eval("#remote-list .item .pic img", (i) => {
  const c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight;
  const x = c.getContext("2d"); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
  let rg = 0, gb = 0; for (let j = 0; j < d.length; j += 4) { rg += Math.abs(d[j] - d[j + 1]); gb += Math.abs(d[j + 1] - d[j + 2]); }
  return [rg, gb].map((v) => v / (d.length / 4));
});
console.log("mean |r-g|, |g-b|:", colour.map((v) => v.toFixed(1)).join(", "));
if (Math.min(...colour) < 5) await done(1, "the thumbnail is not in colour");

// a click selects and loads nothing; Open waits for a selection
if (!(await page.$eval("#remote-open", (b) => b.disabled))) await done(1, "Open is on with nothing selected");
await page.click("#remote-list .item:nth-child(2)");
const selected = await page.$$eval("#remote-list .item", (b) => b.map((e) => e.getAttribute("aria-selected")));
if (selected.join() !== rows.map((_, k) => String(k === 1)).join()) await done(1, "a click did not select just that row: " + selected);
if (!(await page.$eval("#remote-dlg", (d) => d.open)) || asked(files[0].id).whole) await done(1, "a click loaded the image");
if (shot && shot !== "-") await page.locator("#remote-dlg").screenshot({ path: shot });

// a double click enters a folder, and its thumbnail is kept from before
const served = thumbsServed;
await page.dblclick("#remote-list .item:nth-child(1)");
await page.waitForFunction(() => document.querySelector("#remote-path").textContent.includes("More slides") && document.querySelectorAll("#remote-list .item").length === 1);
await page.waitForSelector("#remote-list .item .pic img");
if (thumbsServed !== served) await done(1, "a thumbnail was fetched again");
// Open loads the selected image
await page.click("#remote-list .item");
await page.click("#remote-open");
await page.waitForFunction(() => !document.querySelector("#remote-dlg").open);
if (!(await askedWhole(files[0].id, 5000).then(() => true, () => false))) await done(1, "Open did not load the image");
console.log("select, double click and Open all work");

// an opened image keeps its thumbnail in the browser, shown next time without a download
await page.evaluate((id) => { st.W = 8; st.H = 8; const v = (k) => Uint8Array.from({ length: 64 }, (_, i) => (i * k) % 256); st.img = { planes: Uint8Array.from([...v(3), ...v(5), ...v(7)]), n: 3 }; shellForTests.saveThumb(id); }, stranger.id);

// with Show thumbnails off in Settings, nothing is downloaded
const fresh = await ctx.newPage();
fresh.on("pageerror", (e) => { if (!cutShort(e)) done(1, "page error: " + e.message); });
await fresh.goto(origin + "/web/index.html?study=nor");
await fresh.click("#load-remote");
await fresh.waitForSelector("#remote-list .item");
await fresh.waitForSelector("#remote-list .item:last-child .pic img");
await fresh.evaluate(() => localStorage.setItem("nor-drive-thumbs", JSON.stringify("off")));
await fresh.reload();
const before = thumbsServed;
let thumbsAsked = 0;
fresh.on("request", (q) => { if (/\/ready-thumbs\/.*\.jpg$/.test(q.url())) thumbsAsked++; });
await fresh.click("#load-remote");
await fresh.waitForSelector("#remote-list .item:last-child .pic img");
// the dialog starts its thumbnails' fetches in the frame after it lists the rows: two frames on, none was asked for
await frames(fresh);
const shown = await fresh.$$eval("#remote-list .item .pic img", (is) => is.length);
// the ones kept in the browser still show: the image Open loaded, and the one saved above
if (thumbsServed !== before || thumbsAsked || shown !== 2) await done(1, `turned off, ${thumbsAsked} thumbnails were asked for, ${thumbsServed - before} downloaded and ${shown} shown`);
console.log("a saved thumbnail shows; with Show thumbnails off, none is downloaded");
await done(0);
