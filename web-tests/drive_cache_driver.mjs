// Drives the Google Drive dialog (web/) in headless Chromium against the Drive fake, whose files' bytes can change,
// and which gives each file's SHA-256 only where a request's fields ask for it, as Drive does. Checks req/shell/drive/kept-images:
// a recent image opens from this device with no call to Drive; one chosen from Drive, in the list or by its link,
// opens from this device once its SHA-256 matches Drive's (the listing's, or the file's details for a link); one
// changed on Drive is downloaded again and kept in place of the old; with no SHA-256 from Drive it is downloaded,
// and with none to be had it does not open from this device. Then req/shell/load/recents-tip: opening a kept image from the dialog shows
// a tip at the image selector; its × closes it for good, a page opened with it closed too, and opening the selector does too.
// Optional SHOTS: a directory for a screenshot. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_cache_driver.mjs [SHOTS]
import { createHash } from "node:crypto";
import path from "node:path";
import { until, idle } from "./page_until.mjs";
import { pressDrive, pickRecent } from "./drive_open.mjs";
import { pw, launch, expecting, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { image } from "./images.mjs";

const [shots] = process.argv.slice(2);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const { origin, server } = await serveSite({ "/web/worker.js": "" });

const browser = await launch(pw), w = world(browser, origin), drive = w.drive;
// the deploy's Google key, and a.png on Drive, whose bytes the test changes
w.site.withoutGoogleClient();
const cache = w.folder("Cache").public(), PNG = image.png("a.png");
const FILE = cache.holds(PNG, { createdTime: "2026-10-01T10:00:00Z" });
// the folder's link, which the dialog remembers until a file's link is opened in its place
const FOLDER = `https://drive.google.com/drive/folders/${cache.id}`;
// a device of its own, remembering the folder's link; keys: kept before the page opens
async function open(keys = {}) {
  const device = w.device().kept().remembersDriveLink(cache).keeps(keys);
  return { device, page: await device.opens(undefined, { until: "title" }) };
}
const { device, page } = await open();
// every request the page made of Drive since the test last cleared them, by kind: list, details or download
const calls = drive.calls, kinds = () => calls.map((c) => c.kind);

const downloads = () => kinds().filter((c) => c === "download").length;
// opens a.png from the Drive dialog, or from the recents, and waits until the page holds it
const fromDialog = async (p = page) => {
  await pressDrive(p);
  if (await p.inputValue("#remote-link") !== FOLDER) { await p.fill("#remote-link", FOLDER); await p.click("#remote-go"); }
  await p.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 1);
  await p.evaluate(() => { st.fileName = ""; st.sha = ""; });
  await p.dblclick("#remote-list .item");
  await p.waitForFunction(() => st.fileName === "a.png");
};
const fromLink = async () => {
  await pressDrive(page);
  await page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 1);
  await page.evaluate((id) => { st.fileName = ""; st.sha = ""; $("#remote-link").value = `https://drive.google.com/file/d/${id}/view`; }, FILE.id);
  await page.click("#remote-go");
  await page.waitForFunction(() => st.fileName === "a.png");
};
const fromRecents = async () => {
  await page.evaluate(() => { st.fileName = ""; st.sha = ""; });
  await pickRecent(page);
  await page.waitForFunction(() => st.fileName === "a.png");
};
// the SHA-256 of the copy kept on this device
const keptSha = () => page.evaluate(async () => {
  const c = await caches.open("nor-images-v1"), [q] = await c.keys();
  if (!q) return null;
  const b = await (await c.match(q)).arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))].map((x) => x.toString(16).padStart(2, "0")).join("");
});
// the open gone as far as it goes with no Python: its SHA-256 taken, the image queued for Python
const settle = (p = page) => p.waitForFunction(() => !!st.sha);
const tip = (p = page) => p.evaluate(() => { const t = document.querySelector(".tip-bubble[data-tip]"); return t && !t.hidden ? t.dataset.tip : null; });

try {
  await fromDialog();
  await until(page, async () => (await (await caches.open("nor-images-v1")).keys()).length === 1);
  check(downloads() === 1 && (await tip()) === null, "a first open downloads the image, and shows no tip");

  // ---- req/shell/drive/kept-images ----
  calls.length = 0;
  await fromDialog(); await settle();
  check(downloads() === 0 && !kinds().includes("details"), `kept, and matching the listing's SHA-256, it opens from this device with no further request: ${kinds()}`);
  check((await tip()) === "recent-files", "and the tip shows");
  const near = await page.evaluate(() => {
    const t = document.querySelector(".tip-bubble[data-tip]").getBoundingClientRect(), a = $("#image-pick").getBoundingClientRect();
    return Math.hypot((t.left + t.right) / 2 - (a.left + a.right) / 2, Math.min(Math.abs(t.top - a.bottom), Math.abs(t.bottom - a.top)));
  });
  check(near < 200, `the tip sits by the image selector: ${Math.round(near)} px away`);
  check(/To load recent files click here/.test(await page.textContent(".tip-bubble[data-tip]")), "and says to click there for recent files");
  if (shots) await page.screenshot({ path: path.join(shots, "tip.png"), clip: { x: 0, y: 0, width: 520, height: 260 } });

  calls.length = 0;
  await fromRecents(); await settle();
  check(calls.length === 0, `from the recents, it opens from this device with no call to Drive: ${kinds()}`);
  calls.length = 0;
  await fromLink(); await settle();
  check(downloads() === 0 && kinds().join() === "list,details", `by its link, the file's details give its SHA-256, and it opens from this device: ${kinds()}`);

  // the file changes on Drive
  FILE.bytes = Buffer.concat([PNG.bytes, Buffer.from([0])]);
  calls.length = 0;
  await fromDialog();
  await until(page, async (want) => {
    const c = await caches.open("nor-images-v1"), [q] = await c.keys(), b = await (await c.match(q)).arrayBuffer();
    return b.byteLength === want;
  }, FILE.bytes.length);
  check(downloads() === 1, `changed on Drive, it is downloaded again: ${kinds()}`);
  check((await keptSha()) === sha(FILE.bytes), "and kept in place of the old copy");
  calls.length = 0;
  await fromDialog(); await settle();
  check(downloads() === 0, "after which it opens from this device again");

  // Drive gives no SHA-256, or cannot be asked: downloaded
  await idle(page);
  drive.checksums = false; calls.length = 0;
  await fromDialog(); await settle();
  check(downloads() === 1, `with no SHA-256 in the listing, it is downloaded: ${kinds()}`);
  calls.length = 0;
  await fromLink(); await settle();
  check(downloads() === 1, `with no SHA-256 in the file's details, it is downloaded: ${kinds()}`);
  // a link's details also name the file, so with them unreachable nothing opens: the dialog shows the error
  await idle(page);
  drive.checksums = true; drive.outage = "details"; calls.length = 0;
  await expecting(/ERR_FAILED/, async () => {
    await pressDrive(page);
    await page.evaluate((id) => { st.fileName = ""; st.sha = ""; $("#remote-link").value = `https://drive.google.com/file/d/${id}/view`; }, FILE.id);
    await page.click("#remote-go");
    await page.waitForFunction(() => $("#remote-msg").classList.contains("err"));
  });
  check(!(await page.evaluate(() => st.fileName)), `with the file's details unreachable, the kept copy does not open, and the dialog shows the error: "${await page.textContent("#remote-msg")}"`);
  await page.click("#remote-dlg button[value=close]");
  await idle(page);
  drive.outage = null;
  await idle(page);
  drive.checksums = false; calls.length = 0;
  await fromRecents(); await settle();
  check(calls.length === 0, `from the recents it still opens from this device, with no call to Drive: ${kinds()}`);
  await idle(page);
  drive.checksums = true;

  // ---- req/shell/load/recents-tip ----
  // opening the recents above closed the tip for good; start again
  check((await page.evaluate(() => JSON.parse(localStorage.getItem("nor-tips-closed")) || [])).includes("recent-files"), "opening the recents has closed the tip for good");
  await page.evaluate(() => localStorage.removeItem("nor-tips-closed"));
  await fromDialog(); await settle();
  await page.click(".tip-bubble[data-tip] .x");
  check((await tip()) === null && (await page.evaluate(() => JSON.parse(localStorage.getItem("nor-tips-closed")))).includes("recent-files"), "the tip's × closes it, and its id is kept");
  await fromDialog(); await settle();
  check((await tip()) === null, "a closed tip does not show again");
  {
    calls.length = 0;
    const seeded = await open({ "nor-tips-closed": JSON.stringify(["recent-files"]) });
    await fromDialog(seeded.page); await settle(seeded.page);
    await fromDialog(seeded.page); await settle(seeded.page);
    check(downloads() === 1 && (await tip(seeded.page)) === null, "a page opened with the tip closed opens a kept image with no tip");
    await seeded.device.close();
  }

  // opening the selector closes it too
  await page.evaluate(() => localStorage.removeItem("nor-tips-closed"));
  await fromDialog(); await settle();
  check((await tip()) === "recent-files", "with the closed tips cleared, it shows again");
  await pickRecent(page, null); await page.click("#image-pick");
  check((await tip()) === null && (await page.evaluate(() => JSON.parse(localStorage.getItem("nor-tips-closed")) || [])).includes("recent-files"), "opening the selector closes it for good");

  await page.click("#user-menu summary"); await page.click("#open-settings");
  await page.waitForFunction(() => $("#settings-dlg").open);
  check(!!(await page.$('#settings-dlg input[name="nor-tips-closed"][value="recent-files"]')), "Settings lists the closed tip, to clear");
} finally {
  await device.close(); await browser.close(); server.close();
}
