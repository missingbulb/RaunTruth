// Drives the page (web/) in headless Chromium against a stand-in Drive API and a stand-in worker answering from
// ANSWERS (tests/test_study_runs.py). Checks req/shell/load/from: the Image Viewer opens from this computer and from
// Drive, its recent files from the computer reopened through the browser's reference to them (a stand-in file picker
// handing over a file of the browser's own private storage), and its Drive dialog takes a pasted link; the fixture,
// NoR Finder and Vascular Measurements open from Google Drive alone, with no way to the computer, their dialog
// browsing the study's own root with no link to paste (req/shell/drive/dialog). Then req/shell/load/selector on the
// fixture: the Image box's top line, a selector of the images opened lately, newest first, each with how long ago,
// the first selected; Drive's button at the line's right, and Unload between them once an image is open. Then
// req/shell/drive/offline-listing: the Drive dialog keeps each folder
// it lists, opens offline on it greying what cannot open, marks the images kept here online, and reads the folder
// again when opened online. Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it
// cannot run.
//   node web-tests/image_line_driver.mjs ANSWERS STUDIES [SHOTS]
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ENGINE, BLOBS_READ_OFFLINE } from "./engine.mjs";
import { until, orMissed } from "./page_until.mjs";
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { image } from "./images.mjs";
import { STEP } from "./deadlines.mjs";

const [answers, studies, shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PNG = image.png("picked.png").bytes;

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
postMessage({ type: "ready", info: A.ready.fixture });
onmessage = ({ data: m }) => {
  if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images }, [images.buffer]); }
};`;
const { origin, server } = await serveSite({
  "/web/worker.js": STAND_IN,
  "/web/vendor/wheels.json": "[]",
  "/web/answers.json": { file: answers },
  "/web/studies.json": { file: studies },
});

let failed = false;
const browser = await launch(pw), w = world(browser, origin);
// the deploy with a Google key
w.site.withoutGoogleClient();
// the fixture's Drive root: kept.png, opened 30 minutes ago and kept on this device; far.png, opened 6 days ago and
// not kept; never.png, never opened; and a subfolder the dialog never lists. Another folder elsewhere, empty;
// calls(): the page's lists and downloads since the test cleared them
const { drive } = w;
const slides = w.folder("Slides").public(), ROOT = slides.id;
w.studies.rootedAt("fixture", slides);
slides.folder("Sub");
w.folder("Other").public();
const FILES = ["kept.png", "far.png", "never.png"].map((name, k) => slides.holds(image.png(name, { seed: k + 1 }), { createdTime: "2026-10-01T10:00:00Z" }));
const KEPT = `#remote-list .item[data-id="${FILES[0].id}"]`;
const HOUR = 3600000, NOW = Date.now();
const RECENT = [
  { id: FILES[0].id, name: "kept.png", path: [], study: "fixture", at: NOW - HOUR / 2 },
  { id: "linethree00000000001", name: "three.png", path: ["Old"], study: "fixture", at: NOW - 3 * HOUR - 60000 },
  { id: FILES[1].id, name: "far.png", path: [], study: "fixture", at: NOW - 6 * 24 * HOUR - 60000 },
  { id: "lineundated000000001", name: "undated.png", path: [], study: "fixture" },
  { id: "lineelsewhere0000001", name: "elsewhere.png", path: [], study: "nor", at: NOW },
];
let callsFrom = 0;
// a device of its own remembering the folder's link and the images opened lately
const device = w.device().kept().remembersDriveLink(slides).keeps({ "nor-drive-recent": JSON.stringify(RECENT) }), ctx = await device.context();
const calls = () => drive.calls.slice(callsFrom).map((c) => c.kind).filter((k) => k === "list" || k === "download");
// the browser's own file picker, where the browser has one, stands in as one handing over picked.png, a file of the
// page's private storage, so the reference the page keeps to it is a real one; picks counts the times it was shown
await ctx.addInitScript((png) => {
  if (typeof window.showOpenFilePicker !== "function") return;
  window.picks = 0;
  window.showOpenFilePicker = async () => {
    window.picks++;
    const dir = await navigator.storage.getDirectory(), h = await dir.getFileHandle("picked.png", { create: true }), w = await h.createWritable();
    await w.write(Uint8Array.from(atob(png), (c) => c.charCodeAt(0))); await w.close();
    return [h];
  };
}, PNG.toString("base64"));
const page = await device.opens();
const shot = async (name, sel) => { if (shots) await page.locator(sel).screenshot({ path: path.join(shots, name + ".png") }); };
const shown = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; }, sel);
const box = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
const mounted = (id) => page.waitForFunction((t) => window.$ && $("#title").textContent === t, id);
// the selector's rows: name, where, age, whether greyed and selected
const rows = () => page.$$eval("#image-menu .recent", (bs) => bs.map((b) => ({ name: b.querySelector(".name").textContent, where: b.querySelector(".where")?.textContent,
  age: b.querySelector(".age")?.textContent || "", grey: b.disabled, selected: b.getAttribute("aria-selected") === "true" })));
// the dialog's rows: name, age, whether greyed and marked kept
const listed = () => page.$$eval("#remote-list .item", (bs) => bs.map((b) => ({ name: b.querySelector(".name").textContent, age: b.querySelector(".age")?.textContent || "",
  grey: b.disabled, kept: !!b.querySelector(".offline-mark"), fresh: b.querySelector(".new")?.title ?? null, meta: b.querySelector(".meta")?.textContent || "" })));

try {
  // ---- req/shell/load/from: the Image Viewer opens from this computer and from Drive ----
  await mounted("Image Viewer");
  check(await shown("#image-menu") && (await shown("#load-main")) && (await shown("#load-remote")) && !(await shown("#load-menu")),
    "the Image Viewer offers the image selector, the computer's button and Drive's button");
  check(await page.$("#load-main svg.computer-logo"), "the computer's button bears a computer");
  const [vPick, vLocal, vDrive] = [await box("#image-menu"), await box("#load-main"), await box("#load-remote")];
  check(vLocal.x > vPick.x + vPick.w - 1 && vDrive.x > vLocal.x + vLocal.w - 1, "the computer's button, then Drive's, at the selector's right", { vPick, vLocal, vDrive });
  if (await page.evaluate(() => typeof window.showOpenFilePicker === "function")) {
    await page.click("#load-main");
    await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");
    check(await page.evaluate(() => window.picks === 1 && st.fileName === "picked.png"), "the computer's button opens the image the browser's own picker hands over");
    await page.click("#unload");
    await page.waitForFunction(() => !window.st.img);
    await page.click("#image-pick");
    const v = await rows();
    check(v.length === 1 && v[0].name === "picked.png" && v[0].where === "This computer" && v[0].age === "<1h", "its recent files list the file from this computer, saying so", v);
    check(await page.$("#image-menu .recent svg.computer-logo"), "beside a computer");
    await shot("viewer_line", "#left");
    await page.click("#image-menu .recent");
    await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded." && st.fileName === "picked.png");
    check(await page.evaluate(() => window.picks === 1), "chosen there, the file opens again with no picker shown");
  } else {
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#load-main")]);
    await chooser.setFiles({ name: "picked.png", mimeType: "image/png", buffer: PNG });
    await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded." && st.fileName === "picked.png");
    check(true, `with no picker that keeps a reference to the file, as in this ${ENGINE}, the computer's button opens the file chooser`);
    check(!(await rows()).some((r) => r.where === "This computer"), "and the file is not among the recent ones, which could not open it again");
  }
  await page.click("#load-remote");
  await page.waitForFunction(() => $("#remote-dlg").open);
  check(await shown("#remote-link") && (await shown("#remote-go")), "the Image Viewer's Drive dialog takes a pasted link");
  await page.click("#remote-dlg button[value=close]");
  await page.click("#user-menu summary"); await page.click("#open-settings");
  await page.waitForFunction(() => $("#settings-dlg").open && $("#settings-dlg [name=nor-theme]"));
  check(!(await page.$("#settings-dlg [name=nor-load-source]")), "where Load reads from is no setting");
  await page.keyboard.press("Escape");

  // ---- the fixture, and the real studies, open from Google Drive alone ----
  for (const [id, title] of [["nor", "NoR Finder"], ["vascular", "Vascular Measurements"], ["fixture", "Fixture"]]) {
    await page.goto(origin + "/web/" + id);
    await mounted(title);
    check(!(await shown("#load-main")) && !(await shown("#load-menu")) && (await shown("#image-menu")) && (await shown("#load-remote")),
      `${title} offers the image selector and Drive's button, and no Load from the computer`);
  }
  check(!(await page.$$eval("#image-menu .recent .where", (ws) => ws.some((w) => w.textContent === "This computer"))), "a file from the computer is listed in the Image Viewer alone");

  // ---- req/shell/drive/dialog: a study's dialog browses its own folders, with no link to paste ----
  await page.click("#load-remote");
  await page.waitForFunction(() => $("#remote-dlg").open && document.querySelectorAll("#remote-list .item").length === 4);
  check(!(await shown("#remote-link")) && !(await shown("#remote-go")), "a study's Drive dialog has no link to paste");
  check(/Slides/.test(await page.textContent("#remote-path")), "and opens straight into the study's root, which names no data folder", await page.textContent("#remote-path"));
  await page.click("#remote-dlg button[value=close]");

  // ---- req/shell/load/selector ----
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
  const line = await page.evaluate(() => {
    const box = $("#image-box"), first = [...box.children].find((e) => e.matches(":not(.sec-head)") && e.getClientRects().length);
    return { first: first?.id, beforeDetails: !!(first.compareDocumentPosition($("#file-box")) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  check(line.first === "load" && line.beforeDetails, "the selector's line is the Image box's top line, above the details", line);
  check(/Recently Opened/.test(await page.textContent("#image-pick")), "before an image, the selector is titled Recently Opened");
  check(!(await shown("#unload")), "with no Unload yet");
  check(await page.evaluate(() => $("#image-pick").classList.contains("primary")), "the selector shines until an image is open");
  check(await page.$("#load-remote svg.remote-logo"), "Drive's button bears Drive's logo");
  const [pick, driveButton, lineBefore] = [await box("#image-menu"), await box("#load-remote"), await box("#load")];
  check(driveButton.x > pick.x + pick.w - 1 && Math.abs(driveButton.y + driveButton.h / 2 - (pick.y + pick.h / 2)) < 4, "Drive's button stands at the selector's right, on its line", { pick, driveButton });
  await page.click("#image-pick");
  let r = await rows();
  check(r.map((x) => x.name).join() === "kept.png,three.png,far.png,undated.png", "the selector lists the study's images opened lately, newest first", r);
  check(r.map((x) => x.age).join() === "<1h,3h,6d,", "each says how long since it was opened, none for one opened before that was kept", r.map((x) => x.age));
  check(r[0].selected && r.slice(1).every((x) => !x.selected), "the last opened is selected");
  check(r[1].where.includes("Old"), "each says where it is in Drive", r[1]);
  check(r[1].where.startsWith("Data / ") && !r[1].where.includes("Google Drive"), "from the Data folder, Drive itself being the row's logo", r[1]);
  // the row under the mouse is marked whole, apart from the selected one, as Drive's own lists do
  const look = () => page.$$eval("#image-menu .recent", (bs) => bs.map((b) => ({ bg: getComputedStyle(b).backgroundColor, name: getComputedStyle(b.querySelector(".name")).color })));
  const calm = await look();
  await page.hover("#image-menu .recent:nth-child(3)");
  const hovered = await look();
  check(hovered[2].bg !== calm[2].bg && hovered[2].bg !== calm[0].bg && hovered[2].name === calm[2].name,
    "the row under the mouse has its own background, not the selected row's, and its name keeps its colour", { calm, hovered });
  await shot("selector", "#left");
  await page.keyboard.press("Escape");

  // a first open, from the dialog, downloads and keeps kept.png
  await page.click("#load-remote");
  await page.waitForFunction(() => $("#remote-dlg").open && document.querySelectorAll("#remote-list .item").length === 4);
  let d = await listed();
  check(d.find((x) => x.name === "kept.png").age === "<1h" && d.find((x) => x.name === "far.png").age === "6d" && !d.find((x) => x.name === "never.png").age,
    "the Drive dialog says how long since each image was opened, nothing for one never opened", d);
  check(d.every((x) => !x.kept), "online, nothing kept yet carries the mark", d);
  // req/shell/drive/dialog: no date added to Drive on a row; a folder listed for the first time marks nothing new
  check(d.every((x) => x.fresh === null && !/2026/.test(x.meta)), "a row shows no date, and a folder listed here for the first time marks none of its images new", d);
  await page.dblclick(KEPT);
  await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");
  await until(page, async () => (await (await caches.open("nor-images-v1")).keys()).length === 1);
  // the box folds once the image is open, a step coming after Load: a click opens it again
  await page.click("#image-box.folded");
  await page.waitForFunction(() => !$("#image-box").classList.contains("folded") && $("#unload").getClientRects().length);
  check(/kept\.png/.test(await page.textContent("#image-pick")), "once open, the selector names the image");
  check(await shown("#unload"), "and Unload shows");
  const [p2, d2, l2] = [await box("#image-menu"), await box("#load-remote"), await box("#load")];
  check(await page.evaluate(() => $("#unload").parentElement.matches("#image-box > .sec-head") && $("#unload").textContent.trim() === "Unload image"), "as a link on the box's header");
  check(p2.w === pick.w && d2.x === driveButton.x && d2.w === driveButton.w && l2.w === lineBefore.w && l2.h === lineBefore.h, "the selector's line keeps its controls where they were before the image", { pick, p2, driveButton, d2 });
  check(await page.evaluate(() => $("#file-name").textContent.trim() === "Details"), "the details below are titled Details");
  await shot("loaded", "#image-box");
  await page.click("#unload");
  await page.waitForFunction(() => !window.st.img && /Recently Opened/.test($("#image-pick").textContent));
  check(true, "Unload clears the image");

  // ---- req/shell/drive/offline-listing ----
  await page.click("#load-remote");
  await page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 4);
  await until(page, (s) => document.querySelector(s), KEPT + " .offline-mark");
  d = await listed();
  check(d.find((x) => x.name === "kept.png").kept && !d.find((x) => x.name === "far.png").kept, "online, the image kept here carries the mark, the others nothing", d);
  const colour = await page.evaluate(() => getComputedStyle(document.querySelector("#remote-list .offline-mark")).color.match(/\d+/g).map(Number));
  check(colour[1] > colour[0] + 40 && colour[1] > colour[2] + 40, "the mark is green", colour);
  // the nor-finder pack's row-indicators-edges: what every row shows at its edges, what only some do inward
  const order = await page.$eval(KEPT, (b) => {
    const at = (sel) => [...b.querySelectorAll("*")].indexOf(b.querySelector(sel)), r = (sel) => b.querySelector(sel).getBoundingClientRect();
    return { meta: b.lastElementChild.classList.contains("meta"), inward: [".age", ".offline-mark"].every((sel) => r(sel).right <= r(".meta").left + 1 && r(sel).left >= r(".name").left),
      before: at(".age") < at(".offline-mark"), shape: at(".offline-mark") < at(".shape") && (!r(".shape").width || r(".offline-mark").right <= r(".shape").left + 1),
      tip: b.querySelector(".offline-mark").title };
  });
  check(order.meta && order.inward && order.before && order.shape, "a row's size and date, which every image shows, sit at its edge; its age and mark inward, the mark before what the image holds", order);
  check(order.tip === "Available for offline", "the mark carries a tiny tooltip", order);
  check(await page.evaluate((id) => !!JSON.parse(localStorage.getItem("nor-drive-listings") || "{}")[id], ROOT), "the folder's listing is kept on this device");
  await page.click("#remote-dlg button[value=close]");

  await ctx.setOffline(true);
  await page.waitForFunction(() => document.documentElement.classList.contains("offline"));
  await page.click("#image-pick");
  await orMissed(until(page, () => document.querySelectorAll("#image-menu .recent:disabled").length > 0, null, { timeout: STEP }));
  r = await rows();
  check(r.find((x) => x.name === "kept.png").grey === false && r.filter((x) => x.name !== "kept.png").every((x) => x.grey), "offline, the selector greys the images not kept here", r);
  await page.keyboard.press("Escape");
  await page.click("#load-remote");
  await page.waitForFunction(() => $("#remote-dlg").open && document.querySelectorAll("#remote-list .item").length === 4);
  d = await listed();
  check(d.map((x) => x.name).join() === "Sub,kept.png,far.png,never.png", "offline, the dialog opens on the folder as last listed", d.map((x) => x.name));
  check(!d.find((x) => x.name === "kept.png").grey && ["Sub", "far.png", "never.png"].every((n) => d.find((x) => x.name === n).grey),
    "the image kept here opens, the others and a folder never listed are greyed", d);
  await shot("offline_dialog", "#remote-dlg");
  callsFrom = drive.calls.length;
  if (BLOBS_READ_OFFLINE) {
    await page.dblclick(KEPT);
    await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");
    check(calls().length === 0, "and opens from this device", calls());
  } else {
    console.log(`not checked in this ${ENGINE}: the image kept here opening offline, a blob its offline refuses the page`);
    await page.click("#remote-dlg button[value=close]");
  }

  // online again: the listing is read again, what changed taking its place
  await ctx.setOffline(false);
  await page.waitForFunction(() => !document.documentElement.classList.contains("offline"));
  const NEW = `#remote-list .item[data-id="${slides.holds(image.png("new.png", { seed: 4 })).id}"]`;
  callsFrom = drive.calls.length;
  if (BLOBS_READ_OFFLINE) await page.click("#image-box.folded");
  await page.click("#load-remote");
  await page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 5);
  check(calls().includes("list"), "online, opening the dialog reads the folder again", calls());
  await until(page, (id) => JSON.parse(localStorage.getItem("nor-drive-listings") || "{}")[id]?.items?.some((f) => f.name === "new.png"), ROOT);
  check(true, "and keeps what Drive says now in place of the old listing");
  await until(page, (s) => document.querySelector(s), NEW + " .new");
  d = await listed();
  const added = d.find((x) => x.name === "new.png");
  check(/2026/.test(added.fresh || "") && d.filter((x) => x.fresh !== null).length === 1, "the image the folder did not hold last time is marked new, its hover saying when it was added to Drive", d);
  const where = await page.$eval(NEW, (b) => { const r = (s) => b.querySelector(s).getBoundingClientRect(); return r(".new").left >= r(".name").left && r(".new").right <= r(".meta").left + 1; });
  check(where, "the new mark sits inward, the size at the row's edge (the nor-finder pack's row-indicators-edges)");
  await shot("new_in_dialog", "#remote-dlg");
  await page.click("#remote-dlg button[value=close]");
  await page.click("#load-remote");
  await orMissed(page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 5 && !document.querySelector("#remote-list .item .new"), null, { timeout: STEP }));
  d = await listed();
  check(d.every((x) => x.fresh === null), "listed again, the folder holding the same images, none is new any more", d);
  await page.click("#remote-dlg button[value=close]");
} catch (e) {
  failed = true; console.error("FAILED: " + e.message);
}
await device.close(); await browser.close(); server.close();
process.exitCode = failed ? 1 : 0;
