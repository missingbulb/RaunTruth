// Drives the Google Drive dialog (web/) in headless Chromium against the Drive fake, which can refuse
// downloads as Google does when it throttles a site (a 403 without the header that lets the page read it, which
// the page sees as a failed request) while
// still answering for files' details, or fail outright. Checks req/shell/drive/throttle: a refused download, or a refused read for a
// row's badge, starts a 15-minute wait: a large notice and a red countdown, and no call to Drive from the dialog,
// nor from a page opened with the wait kept; an image kept on this device still opens; when the countdown ends the dialog lists its link
// again. A failure where the details fail too starts no wait.
// Optional SHOTS: a directory for a screenshot. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_throttle_driver.mjs [SHOTS]
import path from "node:path";
import { until, idle } from "./page_until.mjs";
import { pressDrive, pickRecent } from "./drive_open.mjs";
import { pw, launch, expecting, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { image } from "./images.mjs";

const [shots] = process.argv.slice(2);
// the same PNG under each name, c.tif's too
const PNG = image.png("a.png"), FILES = ["a.png", "b.png", "c.tif"];
const { origin, server } = await serveSite({ "/web/worker.js": "" });

let failed = false;
const browser = await launch(pw), w = world(browser, origin), drive = w.drive;
// the deploy's Google key and a folder of three images on Drive
w.site.withoutGoogleClient();
const throttled = w.folder("Throttled").public();
for (const name of FILES) throttled.holds({ ...PNG, name }, { createdTime: "2026-10-01T10:00:00Z" });
// a device of its own remembering the folder's link, opened at the page on a clock the test moves; time: the clock's
// start; keys: kept before the page opens
async function start({ time, keys = {} } = {}) {
  const device = w.device().kept().remembersDriveLink(throttled).keeps(keys);
  await (await device.context()).clock.install(time === undefined ? {} : { time });
  return { device, page: await device.opens(undefined, { until: "title" }) };
}
const { device, page } = await start();
// calls: every request the page made of Drive since the test cleared them
const calls = drive.calls, kinds = () => calls.map((c) => c.kind);

const listed = () => page.waitForFunction((n) => document.querySelectorAll("#remote-list .item").length === n, FILES.length);
// what the dialog shows of the wait: the notice, the clock and whether its controls are held
const wait = (p = page) => p.evaluate(() => ({
  notice: !$("#remote-throttle").hidden && $("#remote-throttle").textContent.includes("Try again in 15 minutes"),
  clock: $("#remote-clock").textContent, red: getComputedStyle($("#remote-clock")).color,
  held: ["#remote-link", "#remote-go", "#remote-open"].every((s) => $(s).disabled),
}));

try {
  // b.png opened while Drive answers, so it is kept on this device
  await pressDrive(page); await listed();
  await page.dblclick("#remote-list .item:nth-child(2)");
  await page.waitForFunction(() => st.fileName === "b.png");
  await until(page, async () => (await (await caches.open("nor-images-v1")).keys()).length === 1);

  // throttled: opening a.png is refused
  await idle(page);
  drive.outage = "throttled";
  await expecting(/ERR_FAILED/, async () => {
    await pressDrive(page); await listed();
    await page.dblclick("#remote-list .item:nth-child(1)");
    await page.waitForFunction(() => !$("#remote-throttle").hidden);
  });
  let shown = await wait();
  check(shown.notice && /^1[45]:\d\d$/.test(shown.clock) && shown.held, `a refused download shows the notice and a countdown from 15:00, and holds the dialog: ${JSON.stringify(shown)}`);
  check(/rgb\((1\d\d|2\d\d), \d{1,2}, \d{1,2}\)/.test(shown.red), `the countdown is red: ${shown.red}`);
  if (shots) await page.locator("#remote-dlg").screenshot({ path: path.join(shots, "drive_throttle.png") });
  await page.clock.fastForward(61000);
  shown = await wait();
  check(/^1[34]:\d\d$/.test(shown.clock), `it counts down: ${shown.clock} a minute later`);

  // nothing reaches Drive from the dialog while it waits, nor from a page opened with the wait kept
  calls.length = 0;
  await page.evaluate(() => { $("#remote-go").click(); $("#remote-open").click(); });
  await page.dblclick("#remote-list .item:nth-child(1)", { force: true }).catch(() => {});
  await page.click("#remote-dlg button[value=close]");
  check(calls.length === 0, `no call to Drive from the dialog while it waits: ${kinds()}`);
  const [end, now] = await page.evaluate(() => [localStorage.getItem("nor-drive-throttled-until"), Date.now()]);
  check(Number(end) - now > 13 * 60000 && Number(end) - now <= 14 * 60000, `the wait's end is kept, 15 minutes from the refusal: ${end} at ${now}`);
  {
    const from = calls.length, seeded = await start({ time: now, keys: { "nor-drive-throttled-until": end } });
    await pressDrive(seeded.page);
    // the notice is the page holding Drive: it shows in place of the listing it would otherwise ask for
    await seeded.page.waitForFunction(() => $("#remote-dlg").open && !$("#remote-throttle").hidden);
    shown = await wait(seeded.page);
    check(shown.notice && shown.held && calls.length === from, `a page opened with the wait kept shows it, with no call to Drive: ${kinds().slice(from)}`);
    await seeded.device.close();
  }

  // a kept image still opens, from this device
  await pickRecent(page);
  await page.waitForFunction(() => st.fileName === "b.png");
  check(calls.length === 0, "an image kept on this device opens while it waits, with no call to Drive");
  // one no longer kept shows the notice instead of downloading
  await page.evaluate(async () => { const c = await caches.open("nor-images-v1"); for (const q of await c.keys()) await c.delete(q); });
  await pickRecent(page);
  await page.waitForFunction(() => $("#remote-dlg").open && !$("#remote-throttle").hidden);
  check(calls.length === 0, `a recent image no longer kept shows the notice, with no call to Drive: ${kinds()}`);
  await page.click("#remote-dlg button[value=close]");

  // the countdown ends: the notice goes and the dialog lists its link again
  await idle(page);
  drive.outage = null;
  await pressDrive(page);
  await page.clock.fastForward(15 * 60000);
  await listed();
  shown = await wait();
  check(!shown.notice && !shown.held && kinds().includes("list"), `after 15 minutes the notice goes and the link is listed again: ${JSON.stringify(shown)}`);

  // a failure where the details fail too is an error, not a wait
  await idle(page);
  drive.outage = "down";
  await expecting(/ERR_FAILED/, async () => {
    await page.dblclick("#remote-list .item:nth-child(1)");
    await page.waitForFunction(() => $("#remote-dlg").open && $("#remote-msg").classList.contains("err"));
  });
  shown = await wait();
  check(!shown.notice && !shown.held, `with Drive unreachable, the dialog shows an error and does not wait: "${await page.textContent("#remote-msg")}"`);

  // a refused read for a row's badge starts the wait too
  await idle(page);
  drive.outage = "throttled";
  await page.evaluate(() => localStorage.removeItem("nor-drive-holds"));
  await expecting(/ERR_FAILED/, async () => {
    await page.click("#remote-go");
    await page.waitForFunction(() => !$("#remote-throttle").hidden);
  });
  check((await wait()).notice, "a refused read for a TIFF row's badge starts the wait too");
} catch (e) {
  failed = true; console.error("FAILED: " + e.message);
}
await device.close(); await browser.close(); server.close();
process.exitCode = failed ? 1 : 0;
