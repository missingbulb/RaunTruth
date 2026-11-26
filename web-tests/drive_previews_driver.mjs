// Drives the Google Drive dialog (web/) in headless Chromium against the Drive fake serving the folder
// IMAGES, its rauntruth-previews.tiff among them, each file with its SHA-256 where a request's fields ask, as
// Drive gives it. Checks req/shell/drive/previews: the file is not listed and is downloaded once; the images it covers show their
// preview and what they hold with no read of their own, a stack turning while the pointer is over its row; one
// it lacks, or one changed since it was made, is read as without it; a page opened with the copy kept reads it, and
// a new file on Drive is downloaded again; Manage storage counts it with its study's thumbnails. Drive's own small picture
// (req/shell/drive/dialog) shows for every photo, the file's picture of one ignored, and never for a TIFF, which may be a stack.
// Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_previews_driver.mjs IMAGES [SHOTS]
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pressDrive, pickRecent } from "./drive_open.mjs";
import { frames as framesOf } from "./page_frames.mjs";
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { orMissed, untilHeard } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";

const [images, shots] = process.argv.slice(2);
const PREVIEWS = "rauntruth-previews.tiff";
const FILES = fs.readdirSync(images).sort().map((name) => ({ name, bytes: fs.readFileSync(path.join(images, name)) }));
const { origin, server } = await serveSite({ "/web/worker.js": "" });

const browser = await launch(pw), w = world(browser, origin), drive = w.drive;
// the deploy's Google key, IMAGES on Drive, and the Image Viewer opening photos too
w.site.withoutGoogleClient();
const shown = w.folder("Previews test").public();
const files = FILES.map((f) => shown.holds(f, { createdTime: "2026-10-01T10:00:00Z" }));
w.studies.edit("viewer", (own) => ({ ...own, files: { ...own.files, accept: own.files.accept + ",.jpg" } }));
const file = (name) => files.find((f) => f.name === name);
// a device of its own remembering the folder's link, opened at the page; previews: a copy of the folder's previews
// file kept on it before the page opens, {url, headers, bytes} as Cache Storage holds it
async function start(previews) {
  const device = w.device().kept().remembersDriveLink(shown);
  if (previews) device.keepsCached("nor-previews-v1", [{ ...previews, bytes: Buffer.from(previews.bytes, "base64") }]);
  const page = await device.opens(undefined, { until: "title" });
  if (previews) await page.evaluate(() => window.worldCached);
  return { device, page, readsFrom: drive.calls.length };
}
const main = await start();
const { device, page } = main;
// reads(): every read of a file's bytes since the test cleared them, by name, "whole" or "piece"; driveThumbs: Drive's
// own small pictures asked for, by file name
const reads = (s = main) => drive.calls.slice(s.readsFrom).filter((c) => c.kind === "download").map((c) => ({ name: drive.get(c.id)?.name, how: c.range ? "piece" : "whole" }));
const driveThumbs = drive.thumbs;

// the page's handlers for what was just done have all run: a read it would start has started
// every TIFF row says what it holds, the page says its thumbnails are in (the status bar's "Thumbnails n of m" gone), and no
// read is on the way once the page has run its handlers; 10 s at most, the
// checks after it saying what is missing
const quiet = async ({ page } = main) => {
  const done = await untilHeard(async () => {
    await orMissed(page.waitForFunction(() => !/^Thumbnails /.test($("#status").textContent)
      && [...document.querySelectorAll("#remote-list .item")].every((b) => !/\.tiff?$/i.test(b.querySelector(".name").textContent) || b.querySelector(".shape").textContent),
      null, { timeout: 10000 }));
    await framesOf(page);
    return !drive.inflight;
  }, () => orMissed(page.waitForEvent("requestfinished", { timeout: 10000 })), { timeout: 10000 });
  if (!done) console.log("quiet: gave up after 10 s", JSON.stringify({ inflight: drive.inflight, rows: await rows(page) }));
};
const open = async (s = main) => {
  await pressDrive(s.page);
  await s.page.waitForFunction((n) => document.querySelectorAll("#remote-list .item").length === n, FILES.length - 1);
  await quiet(s);
};
// each row: its name, what it holds and whether it shows a picture
const rows = (p = page) => p.evaluate(() => [...document.querySelectorAll("#remote-list .item")].map((b) => ({
  name: b.querySelector(".name").textContent, shape: b.querySelector(".shape").textContent, pic: !!b.querySelector(".pic img, .pic canvas") })));
const row = (all, name) => all.find((r) => r.name === name) || {};
const readsOf = (name, s = main) => reads(s).filter((r) => r.name === name).map((r) => r.how).join();

try {
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
  await orMissed(page.waitForFunction((sel) => document.querySelector(sel + " .pic canvas"), stackRow, { timeout: STEP }));
  const f1 = await frame();
  await orMissed(page.waitForFunction(([sel, f1]) => document.querySelector(sel + " .pic canvas")?.toDataURL() !== f1, [stackRow, f1], { timeout: STEP }));
  const f2 = await frame();
  check(!!f1 && !!f2 && f1 !== f2, "hovering a stack's row turns it");
  if (shots && f2) fs.writeFileSync(path.join(shots, "turning.png"), Buffer.from(f2.split(",")[1], "base64"));
  await page.mouse.move(5, 5);
  await orMissed(page.waitForFunction((sel) => !document.querySelector(sel + " .pic canvas"), stackRow, { timeout: STEP }));
  check((await frame()) === null, "and leaving it shows its still again");
  check(!readsOf("b stack.tif"), "turning reads nothing");

  await page.click("#remote-dlg button[value=close]");

  // the copy kept on this device; a page opened with it reads it, and a new previews file on Drive is downloaded again
  const kept = await page.evaluate(async () => {
    const c = await caches.open("nor-previews-v1"), [q] = await c.keys(), r = q && await c.match(q);
    if (!r) return null;
    const b = new Uint8Array(await r.arrayBuffer());
    return { url: q.url, headers: Object.fromEntries(r.headers), bytes: btoa(Array.from(b, (x) => String.fromCharCode(x)).join("")) };
  });
  const pvBytes = file(PREVIEWS).bytes;
  check(kept && kept.url.endsWith("/drive-previews/" + shown.id) && Buffer.from(kept.bytes, "base64").equals(pvBytes)
    && kept.headers["x-nor-sha256"] === createHash("sha256").update(pvBytes).digest("hex"),
    `the previews file is kept on this device, by its folder, with its SHA-256: ${kept?.url}, ${JSON.stringify(kept?.headers)}`);
  {
    const seeded = await start(kept);
    await open(seeded);
    check(!readsOf(PREVIEWS, seeded) && row(await rows(seeded.page), "b stack.tif").pic, `a page opened with it kept reads it from this device: ${readsOf(PREVIEWS, seeded) || "no read"}`);
    const pv = file(PREVIEWS); pv.bytes = Buffer.concat([pv.bytes, Buffer.from([0])]);
    await seeded.page.click("#remote-dlg button[value=close]");
    seeded.readsFrom = drive.calls.length;
    await open(seeded);
    // the new file read and its pictures drawn on the rows it covers
    await orMissed(seeded.page.waitForFunction(() => [...document.querySelectorAll("#remote-list .item")].find((b) => b.querySelector(".name").textContent === "a flat.tif")?.querySelector(".pic img, .pic canvas"),
      null, { timeout: 5000 }));
    check(readsOf(PREVIEWS, seeded) === "whole" && row(await rows(seeded.page), "a flat.tif").pic, `changed on Drive, it is downloaded again: ${readsOf(PREVIEWS, seeded)}`);
    await seeded.device.close();
  }

  await page.click("#user-menu summary"); await page.click("#manage-storage");
  await page.waitForFunction(() => $("#usage-dlg").open && !/Reading/.test($("#storage-list").textContent));
  const thumbs = await page.evaluate(() => [...document.querySelectorAll("#storage-list .entry[data-kind=thumb] .what")].map((e) => e.textContent));
  check(thumbs.some((t) => /1 folder's previews/.test(t)), `Manage storage counts it with its study's thumbnails: ${thumbs}`);
} finally {
  await device.close(); await browser.close(); server.close();
}
