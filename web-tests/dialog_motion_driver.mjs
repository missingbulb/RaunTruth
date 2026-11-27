// Drives the page (web/) in headless Chromium, with a worker that never answers, and checks
// req/shell/dialogs/open-from-button: a dialog a button opens is animated, and its motion ends with the dialog at its
// own size; one opened with nothing pressed, or with animations off or reduced motion asked for, appears at once.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/dialog_motion_driver.mjs
import { fileURLToPath } from "node:url";
import path from "node:path";

import { frames } from "./page_frames.mjs";
import { pw, launch, mustHold } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { origin, server } = await serveSite({
  "/web/worker.js": "",
  "/web/version_history.json": "[]",
});

const browser = await launch(pw), w = world(browser, origin);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };

// clock: the page's clock made one the test can move past the page's own time windows; it runs as the real one does
async function open({ motion = true, reducedMotion = "no-preference", clock = false } = {}) {
  const device = w.device().with({ reducedMotion }).keeps({ "nor-motion": JSON.stringify(motion) });
  const ctx = await device.context();
  if (clock) await ctx.clock.install();
  await ctx.addInitScript(() => {
    // each dialog's motions as the page makes them, and how many have ended, so a test asks only whether one ran
    window.dialogMotions = {};
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...a) {
      const x = animate.apply(this, a);
      if (this.localName === "dialog") {
        const m = (window.dialogMotions[this.id] ||= { made: 0, ended: 0 });
        m.made++; x.finished.then(() => m.ended++, () => m.ended++);
      }
      return x;
    };
  });
  const page = await device.opens(undefined, { until: "none" });
  await page.waitForFunction(() => $("#sb-version").textContent);
  return { ctx, page };
}
// whether the dialog opened, and the motions made for it: the motion starts in the frame after it opens, so two
// frames on any it has are made
const opened = async (page, dlg) => { await frames(page); return openedNow(page, dlg); };
const openedNow = (page, dlg) => page.evaluate((dlg) => {
  const d = document.querySelector(dlg);
  return { open: d.open, ...(window.dialogMotions[d.id] || { made: 0, ended: 0 }) };
}, dlg);
const near = (a, b, by = 2) => Math.abs(a - b) <= by;

// ---- a button opens its dialog out of itself ----
{
  const { ctx, page } = await open({ clock: true });
  // the history arrives once, and the dialog grows with it: let that happen first
  await page.evaluate(() => { $("#sb-version").click(); $("#history-dlg").close(); });
  await page.waitForFunction(() => !/Loading/.test($("#history-list").textContent));
  // its motion runs and ends with the dialog at its own size; how it looks on the way is not checked
  for (const [btn, dlg, what] of [["#sb-version", "#history-dlg", "Version history"], ["#sb-res-icon", "#usage-dlg", "Resource Usage"]]) {
    await page.click(btn);
    const f = await opened(page, dlg);
    await mustHold(f.open && f.made >= 1, `${btn} opens ${what}, animated`, f);
    await page.waitForFunction((id) => { const m = window.dialogMotions[id]; return m && m.ended === m.made; }, dlg.slice(1));
    const last = await page.evaluate((dlg) => { const d = document.querySelector(dlg), r = d.getBoundingClientRect(); return { w: r.width, h: r.height, ow: d.offsetWidth, oh: d.offsetHeight, n: d.getAnimations({ subtree: true }).length,
      running: d.getAnimations({ subtree: true }).map((a) => `${a.animationName || a.transitionProperty || a.constructor.name} on ${a.effect?.target?.id || a.effect?.target?.className || a.effect?.target?.localName} ${a.playState} ${Math.round(a.currentTime ?? -1)}/${a.effect?.getComputedTiming().endTime}`) }; }, dlg);
    await mustHold(near(last.w, last.ow) && near(last.h, last.oh) && last.n === 0, `then ends at its own size`, last);
    await page.keyboard.press("Escape");
  }
  // a button that opens nothing, pressed over a second ago, does not lend the dialog its place
  await page.click("#theme"); await page.click("#theme");
  // past the second after a click in which the page takes a dialog opening as that click's (web/dialog_motion.js)
  await ctx.clock.fastForward(1200);
  const was = await page.evaluate(() => window.dialogMotions["history-dlg"]?.made || 0);
  await page.evaluate(() => $("#history-dlg").showModal());
  const f = await opened(page, "#history-dlg");
  await mustHold(f.open && f.made === was, "a dialog opened with nothing pressed lately appears at once", f);
  await ctx.close();
}

// ---- animations off, or reduced motion asked for: at once ----
for (const [opts, what] of [[{ motion: false }, "with animations off"], [{ reducedMotion: "reduce" }, "with reduced motion asked for"]]) {
  const { ctx, page } = await open(opts);
  await page.click("#sb-version");
  const f = await opened(page, "#history-dlg");
  await mustHold(f.open && f.made === 0, `${what}, Version history appears at once`, f);
  await ctx.close();
}
await done(0);
