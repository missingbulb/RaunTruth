// Drives the Google Drive dialog (web/) in headless Chromium against the Drive fake serving the folder
// IMAGES, its rauntruth-previews.tiff among them, each file with its SHA-256 where a request's fields ask, as
// Drive gives it. Checks req/shell/drive/previews: the file is not listed and is downloaded once; the images it covers show their
// preview and what they hold with no read of their own, a stack turning while the pointer is over its row; one
// it lacks, or one changed since it was made, is read as without it; a reload reads the kept copy, and a new
// file on Drive is downloaded again; Manage storage counts it with its study's thumbnails. Drive's own small picture
// (req/shell/drive/dialog) shows for every photo, the file's picture of one ignored, and never for a TIFF, which may be a stack.
// Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_previews_driver.mjs IMAGES [SHOTS]
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { pressDrive, pickRecent } from "./drive_open.mjs";
import { frames as framesOf } from "./page_frames.mjs";
import { pw, keptContext, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { studies } from "./fakes/studies.mjs";
import { siteSettings } from "./fakes/site_settings.mjs";
import { googleDrive } from "./fakes/google_drive.mjs";
import { orMissed, untilHeard } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";

const [images, shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ROOT = "previewfolder0000001", PREVIEWS = "rauntruth-previews.tiff";
let FILES = fs.readdirSync(images).sort().map((name, k) => ({ id: "previewfile" + String(k).padStart(9, "0"), name, bytes: fs.readFileSync(path.join(images, name)) }));
const file = (name) => FILES.find((f) => f.name === name);
const { origin, server } = await serveSite({ "/web/worker.js": "" });

let failed = false;
const ctx = await keptContext(pw, { viewport: { width: 1400, height: 900 } });
// the deploy with a Google key
siteSettings(ctx).env = { GOOGLE_API_KEY: "stand-in" };
// the Drive fake's folder IMAGES, its files the test may change; reads(): every read of a file's bytes since the test
// cleared them, by name, "whole" or "piece"; driveThumbs: Drive's own small pictures asked for, by file name
const drive = googleDrive(ctx);
drive.folder({ id: ROOT, name: "Previews test", access: "public" });
FILES = FILES.map((f) => drive.file({ ...f, parent: ROOT, createdTime: "2026-10-01T10:00:00Z" }));
let readsFrom = 0;
const reads = () => drive.calls.slice(readsFrom).filter((c) => c.kind === "download").map((c) => ({ name: drive.get(c.id)?.name, how: c.range ? "piece" : "whole" }));
const driveThumbs = drive.thumbs;
studies(ctx).edit("viewer", (own) => ({ ...own, files: { ...own.files, accept: own.files.accept + ",.jpg" } }));
await ctx.addInitScript((link) => {
  delete Navigator.prototype.serviceWorker;
  if (sessionStorage.getItem("primed")) return;
  sessionStorage.setItem("primed", "1");
  localStorage.setItem("nor-drive-link", JSON.stringify(link));
}, `https://drive.google.com/drive/folders/${ROOT}`);
const page = await ctx.newPage();
page.setDefaultTimeout(STEP);

// the page's handlers for what was just done have all run: a read it would start has started
// every TIFF row says what it holds, the page says its thumbnails are in (the status bar's "Thumbnails n of m" gone), and no
// read is on the way once the page has run its handlers; 10 s at most, the
// checks after it saying what is missing
const quiet = async () => {
  const done = await untilHeard(async () => {
    await orMissed(page.waitForFunction(() => !/^Thumbnails /.test($("#status").textContent)
      && [...document.querySelectorAll("#remote-list .item")].every((b) => !/\.tiff?$/i.test(b.querySelector(".name").textContent) || b.querySelector(".shape").textContent),
      null, { timeout: 10000 }));
    await framesOf(page);
    return !drive.inflight;
  }, () => orMissed(page.waitForEvent("requestfinished", { timeout: 10000 })), { timeout: 10000 });
  if (!done) console.log("quiet: gave up after 10 s", JSON.stringify({ inflight: drive.inflight, rows: await rows() }));
};
const open = async () => {
  await pressDrive(page);
  await page.waitForFunction((n) => document.querySelectorAll("#remote-list .item").length === n, FILES.length - 1);
  await quiet();
};
// each row: its name, what it holds and whether it shows a picture
const rows = () => page.evaluate(() => [...document.querySelectorAll("#remote-list .item")].map((b) => ({
  name: b.querySelector(".name").textContent, shape: b.querySelector(".shape").textContent, pic: !!b.querySelector(".pic img, .pic canvas") })));
const row = (all, name) => all.find((r) => r.name === name) || {};
const readsOf = (name) => reads().filter((r) => r.name === name).map((r) => r.how).join();

try {
  await page.goto(origin + "/web/");
  await page.waitForFunction(() => window.$ && $("#title").textContent);
  await open();
  let all = await rows();
  check(!all.some((r) => r.name === PREVIEWS) && all.length === FILES.length - 1, `the previews file is not listed: ${all.map((r) => r.name)}`);
  check(readsOf(PREVIEWS) === "whole", `it is downloaded, once: ${readsOf(PREVIEWS)}`);
  check(row(all, "a flat.tif").pic && row(all, "a flat.tif").shape === "2D · 3 channels" && !readsOf("a flat.tif"),
    `a flat image it covers shows its preview and what it holds, with no read of its own: ${JSON.stringify(row(all, "a flat.tif"))}, reads ${readsOf("a flat.tif")}`);
  check(row(all, "b stack.tif").pic && row(all, "b stack.tif").shape === "3D · 12 slices · 2 channels" && !readsOf("b stack.tif"),
    `so does a stack: ${JSON.stringify(row(all, "b stack.tif"))}, reads ${readsOf("b stack.tif")}`);
  check(row(all, "f covered.png").pic && row(all, "f covered.png").shape === "" && !readsOf("f covered.png"),
    `a PNG shows a picture but no 2D or channel tags, which only a TIFF's header tells: ${JSON.stringify(row(all, "f covered.png"))}`);
  check(readsOf("c changed.tif") === "piece" && readsOf("d new.tif") === "piece",
    `an image changed since the file was made, and one it lacks, are read as without it: ${readsOf("c changed.tif")} / ${readsOf("d new.tif")}`);
  check(row(all, "e photo.jpg").pic && JSON.stringify(driveThumbs.sort()) === JSON.stringify(["e photo.jpg", "f covered.png"]),
    `a photo shows Drive's own small picture, even one an older previews file pictures, and a TIFF, which may be a stack, never does: ${JSON.stringify(row(all, "e photo.jpg"))}, Drive's pictures of ${driveThumbs}`);
  const colour = await page.evaluate(() => {
    const i = [...document.querySelectorAll("#remote-list .item")].find((b) => b.querySelector(".name").textContent === "a flat.tif").querySelector(".pic img");
    const c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight;
    const g = c.getContext("2d"); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    let rg = 0, gb = 0; for (let j = 0; j < d.length; j += 4) { rg += Math.abs(d[j] - d[j + 1]); gb += Math.abs(d[j + 1] - d[j + 2]); }
    return [rg, gb].map((v) => v / (d.length / 4));
  });
  check(Math.min(...colour) > 5, `the flat preview is in colour: mean |r-g|, |g-b| ${colour.map((v) => v.toFixed(1))}`);
  if (shots) await page.locator("#remote-dlg").screenshot({ path: path.join(shots, "drive_previews.png") });

  // the stack turns while the pointer is over its row, and shows its still again after
  const stackRow = `#remote-list .item:nth-child(${all.findIndex((r) => r.name === "b stack.tif") + 1})`;
  // the turning canvas's picture, null when the row shows its still
  const frame = () => page.evaluate((sel) => document.querySelector(sel + " .pic canvas")?.toDataURL() ?? null, stackRow);
  await page.hover(stackRow);
  await orMissed(page.waitForFunction((sel) => document.querySelector(sel + " .pic canvas"), stackRow, { timeout: 3000 }));
  const f1 = await frame();
  await orMissed(page.waitForFunction(([sel, f1]) => document.querySelector(sel + " .pic canvas")?.toDataURL() !== f1, [stackRow, f1], { timeout: 3000 }));
  const f2 = await frame();
  check(!!f1 && !!f2 && f1 !== f2, "hovering a stack's row turns it");
  if (shots && f2) fs.writeFileSync(path.join(shots, "turning.png"), Buffer.from(f2.split(",")[1], "base64"));
  await page.mouse.move(5, 5);
  await orMissed(page.waitForFunction((sel) => !document.querySelector(sel + " .pic canvas"), stackRow, { timeout: 3000 }));
  check((await frame()) === null, "and leaving it shows its still again");
  check(!readsOf("b stack.tif"), "turning reads nothing");

  // a reload reads the kept copy; a new previews file on Drive is downloaded again
  readsFrom = drive.calls.length;
  await page.reload(); await page.waitForFunction(() => window.$ && $("#title").textContent);
  await open();
  check(!readsOf(PREVIEWS) && row(await rows(), "b stack.tif").pic, `after a reload it comes from this device: ${readsOf(PREVIEWS) || "no read"}`);
  const pv = file(PREVIEWS); pv.bytes = Buffer.concat([pv.bytes, Buffer.from([0])]);
  await page.click("#remote-dlg button[value=close]");
  readsFrom = drive.calls.length;
  await open();
  // the new file read and its pictures drawn on the rows it covers
  await orMissed(page.waitForFunction(() => [...document.querySelectorAll("#remote-list .item")].find((b) => b.querySelector(".name").textContent === "a flat.tif")?.querySelector(".pic img, .pic canvas"),
    null, { timeout: 5000 }));
  check(readsOf(PREVIEWS) === "whole" && row(await rows(), "a flat.tif").pic, `changed on Drive, it is downloaded again: ${readsOf(PREVIEWS)}`);
  await page.click("#remote-dlg button[value=close]");

  await page.click("#user-menu summary"); await page.click("#manage-storage");
  await page.waitForFunction(() => $("#usage-dlg").open && !/Reading/.test($("#storage-list").textContent));
  const thumbs = await page.evaluate(() => [...document.querySelectorAll("#storage-list .entry[data-kind=thumb] .what")].map((e) => e.textContent));
  check(thumbs.some((t) => /1 folder's previews/.test(t)), `Manage storage counts it with its study's thumbnails: ${thumbs}`);
} catch (e) {
  failed = true; console.error("FAILED: " + e.message);
}
await ctx.close(); server.close();
process.exitCode = failed ? 1 : 0;
