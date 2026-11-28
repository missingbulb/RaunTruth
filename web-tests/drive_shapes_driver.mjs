// Drives the Google Drive dialog (web/) in headless Chromium against the Drive fake, which answers Range
// requests, listing ImageJ TIFFs: a flat three-channel image, an eight-slice stack, a TIFF with no ImageJ header
// and a run of stacks below them. Checks req/shell/drive/stacks: each row says what its file holds, read from the file's first 64 KB
// for the rows in view and the next 10, remembered so a page opened with it kept reads nothing again, and not read while Show
// thumbnails is off; opening the stack saves a 3D thumbnail at once, opening the flat image does not.
// Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_shapes_driver.mjs [SHOTS]
import fs from "node:fs";
import path from "node:path";

import { pressDrive, pickRecent } from "./drive_open.mjs";
import { frames as framesOf } from "./page_frames.mjs";
import { until, orMissed, untilHeard } from "./page_until.mjs";
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { image } from "./images.mjs";

const [shots] = process.argv.slice(2);
const HEAD = 65536, AHEAD = 10;

// a tube crossing the stack on a slant, so a 3D view of it differs from any one slice
const tube = (k, x, y) => ((x - 60 - 16 * k) ** 2 + (y - 128) ** 2 < 400 ? 3000 : 100);
// each 256x256, its IFD first as the head a reader of the first 64 KB has; want: what its row says it holds
const tiff = (name, planes, description, value) => image.tiff(name, { width: 256, planes, description, value, headFirst: true });
const MORE = tiff("d more.tif", 5, "ImageJ=1.54f\nimages=5\nslices=5\n", tube);
const FILES = [
  { image: tiff("a flat.tif", 3, "ImageJ=1.54f\nimages=3\nchannels=3\nmode=composite\n", (k, x) => 100 + k * x), want: "2D · 3 channels" },
  { image: tiff("b plain.tif", 1, null, () => 500), want: "" },
  { image: tiff("c stack.tif", 8, "ImageJ=1.54f\nimages=8\nslices=8\nunit=micron\nspacing=4\n", tube), want: "3D · 8 slices" },
  // two channels, interleaved slice by slice as ImageJ stores a hyperstack: the tube, and a square in the other
  { want: "3D · 4 slices · 2 channels",
    image: tiff("c two.tif", 8, "ImageJ=1.54f\nimages=8\nchannels=2\nslices=4\nhyperstack=true\n", (k, x, y) => (k % 2 ? (Math.abs(x - 190) < 30 && Math.abs(y - 60) < 30 ? 3000 : 100) : tube(k >> 1, x, y))) },
  ...Array.from({ length: 30 }, (_, k) => ({ image: { ...MORE, name: `d more ${String(k).padStart(2, "0")}.tif` }, want: "3D · 5 slices" })),
];
const { origin, server } = await serveSite({ "/web/worker.js": "" });

const browser = await launch(pw), w = world(browser, origin);
// the browser's Drive, every context's, with the folder of TIFFs; reads(): every read of a file's bytes since the
// test cleared them, its row and the Range asked for ("" for the whole file)
const { drive } = w, shapes = w.folder("Shapes").public();
for (const f of FILES) f.id = shapes.holds(f.image, { createdTime: "2026-10-01T10:00:00Z" }).id;
let readsFrom = 0;
const reads = () => drive.calls.slice(readsFrom).filter((c) => c.kind === "download").map((c) => ({ k: FILES.findIndex((f) => f.id === c.id), range: c.range || "" }));
// a device remembering the folder's link, opened at the page; keys: kept before the page opens
async function start(keys = {}) {
  const device = w.visitorWithLink(shapes).keeps(keys);
  return { device, page: await device.opens(undefined, { until: "title" }) };
}
const { page } = await start();

// the page's handlers for what was just done have all run: a read it would start has started
// every row in view, and every row read, has its badge (or holds nothing to tell), and no read is on the way once the
// page has run its handlers, the rows ahead of the view among them; 10 s at most, the checks after it saying what is
// missing
const quiet = async (p = page) => {
  const wants = FILES.map((f) => f.want);
  const told = () => orMissed(p.waitForFunction(([wants, read]) => {
    const box = $("#remote-list").getBoundingClientRect(), rows = [...document.querySelectorAll("#remote-list .item")];
    return rows.every((b, k) => { const r = b.getBoundingClientRect(); return !(r.bottom > box.top && r.top < box.bottom || read.includes(k)) || (b.querySelector(".shape")?.textContent || "") === wants[k]; });
  }, [wants, reads().map((r) => r.k)], { timeout: 10000 }));
  // done when nothing is on the way and no read began since the rows read were told
  const done = await untilHeard(async () => {
    const asked = reads().length;
    await told();
    await framesOf(p);
    return !drive.inflight && reads().length === asked;
  }, () => drive.inflight && orMissed(p.waitForEvent("requestfinished", { timeout: 10000 })), { timeout: 10000 });
  if (!done) {
    const rows = await inView(p), b = await badges(p);
    console.log("quiet: gave up after 10 s", JSON.stringify({ inflight: drive.inflight, rows, badges: rows.map((k) => b[k]) }));
  }
};
const open = async (p = page) => {
  await pressDrive(p);
  await p.waitForFunction((n) => document.querySelectorAll("#remote-list .item").length === n, FILES.length);
  await quiet(p);
};
// each row's badge text, "" where it has none
const badges = (p = page) => p.evaluate(() => [...document.querySelectorAll("#remote-list .item")].map((b) => b.querySelector(".shape")?.textContent || ""));
const inView = (p = page) => p.evaluate(() => {
  const box = $("#remote-list").getBoundingClientRect();
  return [...document.querySelectorAll("#remote-list .item")].flatMap((b, k) => { const r = b.getBoundingClientRect(); return r.bottom > box.top && r.top < box.bottom ? [k] : []; });
});
// a saved thumbnail as a data URL, "" before it is saved
const thumbOf = (k) => page.evaluate(async (id) => {
  const r = await (await caches.open("nor-thumbs-v1")).match(new URL("drive-thumb/" + id, location.href).href);
  return r ? new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); r.blob().then((b) => f.readAsDataURL(b)); }) : "";
}, FILES[k].id);
const thumbSaved = (k, timeout = 3000) => orMissed(until(page, async (id) => !!(await (await caches.open("nor-thumbs-v1")).match(new URL("drive-thumb/" + id, location.href).href)), FILES[k].id, { timeout }));

try {
  await open();
  const seen = await inView(), window = []; for (let k = seen[0]; k <= seen[seen.length - 1] + AHEAD; k++) window.push(k);
  let b = await badges();
  check(FILES.slice(0, 4).every((f, k) => b[k] === f.want), `each row says what its file holds: ${JSON.stringify(b.slice(0, 4))}`);
  const read = [...new Set(reads().map((r) => r.k))].sort((x, y) => x - y);
  check(read.length === window.length && read.every((k, i) => k === window[i]), `read for the rows in view and the next ${AHEAD} only: ${read} (want ${window})`);
  check(reads().length > 0 && reads().length === read.length && reads().every((r) => r.range === `bytes=0-${HEAD - 1}`), `each read once, its first 64 KB: ${JSON.stringify(reads().slice(0, 3))}`);
  check(window.every((k) => b[k] === FILES[k].want), `every row read shows its badge: ${JSON.stringify(window.map((k) => [k, b[k], FILES[k].want]))}`);
  if (shots) await page.locator("#remote-dlg").screenshot({ path: path.join(shots, "drive_shapes.png") });

  // remembered, by file: a page opened with them remembered reads nothing it read before
  const holds = await page.evaluate(() => localStorage.getItem("nor-drive-holds"));
  const kept = JSON.parse(holds || "{}");
  check(Object.keys(kept).length === window.length && window.every((k) => kept[FILES[k].id] === FILES[k].want), `what each file read holds is kept: ${holds}`);
  {
    const seeded = await start({ "nor-drive-holds": holds });
    readsFrom = drive.calls.length;
    await open(seeded.page);
    b = await badges(seeded.page);
    check(reads().length === 0 && window.every((k) => b[k] === FILES[k].want), `a page opened with them kept shows the badges with no read: ${reads().length} reads`);
    await seeded.device.close();
    readsFrom = drive.calls.length;
  }

  // not read while Show thumbnails, in Settings, is off
  const thumbsSetting = async (v) => {
    await page.click("#remote-dlg button[value=close]");
    await page.evaluate((x) => localStorage.setItem("nor-drive-thumbs", JSON.stringify(x)), v);
    await open();
    await page.evaluate(() => { $("#remote-list").scrollTop = $("#remote-list").scrollHeight; });
    await framesOf(page);
  };
  await thumbsSetting("off");
  check(reads().length === 0, `with Show thumbnails off, nothing is read: ${reads().length} reads`);
  await thumbsSetting("on");
  await quiet();
  const end = await inView();
  b = await badges();
  check(end.length > 0 && end.every((k) => b[k] === FILES[k].want) && reads().every((r) => r.range), `turned on again, the rows in view are read: ${end.map((k) => b[k] || "-")}`);
  await page.evaluate(() => { $("#remote-list").scrollTop = 0; });

  // opening the stack saves its 3D thumbnail at once; opening the flat image does not (its waits for the image to show)
  await page.dblclick("#remote-list .item:nth-child(3)");
  await page.waitForFunction(() => !$("#remote-dlg").open);
  await page.waitForFunction(() => st.fileName === "c stack.tif");
  await thumbSaved(2);
  const pic = await thumbOf(2);
  check(reads().some((r) => r.k === 2 && !r.range), "opening the stack downloads the whole file");
  check(!!pic && pic.startsWith("data:image/"), "and saves a thumbnail of it as it opens");
  const size = pic && await page.evaluate((u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.src = u; }), pic);
  check(size && size[0] > 0 && size[0] <= 128 && size[1] <= 128, `a small picture: ${size}`);
  if (shots && pic) fs.writeFileSync(path.join(shots, "stack_preview.png"), Buffer.from(pic.split(",")[1], "base64"));
  await open();
  check(await page.evaluate(() => !!document.querySelector("#remote-list .item:nth-child(3) .pic img")), "the dialog shows it on the stack's row");
  // a two-channel stack: each channel in its own colour
  await page.dblclick("#remote-list .item:nth-child(4)");
  await page.waitForFunction(() => st.fileName === "c two.tif");
  await thumbSaved(3);
  const two = await thumbOf(3);
  const hues = two && await page.evaluate((u) => new Promise((ok) => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight;
      const g = c.getContext("2d"); g.drawImage(i, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let green = 0, magenta = 0;
      for (let j = 0; j < d.length; j += 4) { if (d[j + 1] > 150 && d[j] < 80) green++; if (d[j] > 150 && d[j + 2] > 150 && d[j + 1] < 80) magenta++; }
      ok({ green, magenta });
    };
    i.src = u;
  }), two);
  check(hues && hues.green > 10 && hues.magenta > 10, `a two-channel stack's thumbnail shows one channel green and the other magenta: ${JSON.stringify(hues)}`);
  if (shots && two) fs.writeFileSync(path.join(shots, "two_preview.png"), Buffer.from(two.split(",")[1], "base64"));
  await open();
  await page.dblclick("#remote-list .item:nth-child(1)");
  await page.waitForFunction(() => st.fileName === "a flat.tif");
  // its shape remembered last: the moment, as it opens, that a stack's thumbnail is saved
  await page.waitForFunction((id) => Object.keys(JSON.parse(localStorage.getItem("nor-drive-holds") || "{}")).at(-1) === id, FILES[0].id);
  const shownFirst = (await thumbOf(0)) === "" || (await page.evaluate(() => !!st.img));
  const thumbed = await thumbSaved(0, 10000);
  check(shownFirst && thumbed, "a flat image's thumbnail is saved once it shows, never before");
} finally {
  await browser.close(); server.close();
}
