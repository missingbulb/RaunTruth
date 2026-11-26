// Drives the page (web/) in headless Chromium, with a worker that never answers, and checks
// req/shell/dialogs/close-as-opened: a dialog a press opened closes with a motion that ends with it gone, a part that
// makes room for itself draws out, the button of the step to do shines three times and rests; and with
// animations off or reduced motion asked for each happens at once. Only that a motion is on, starts and ends in the
// right state is checked, never how it looks on the way. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/fold_motion_driver.mjs
import { pw, launch } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { record, played, ran, atRest } from "./page_motions.mjs";
import { greyPng } from "./png_fixture.mjs";

const { origin, server } = await serveSite({ "/web/worker.js": "", "/web/version_history.json": "[]" });
const browser = await launch(pw), w = world(browser, origin);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen ? " " + JSON.stringify(seen) : "")); await done(1); } console.log("ok: " + what); };

// a grey square, as a file a person picks
const PNG = { name: "acme.png", mimeType: "image/png", buffer: greyPng(8, 8, () => 128) };
// the Image Viewer, which opens a file of this computer, with one open
async function open({ motion = true, reducedMotion = "no-preference" } = {}) {
  const device = w.device().with({ reducedMotion }).keeps({ "nor-motion": JSON.stringify(motion) });
  const ctx = await device.context();
  await record(ctx);
  const page = await device.opens(null, { until: "none" });
  await page.waitForFunction(() => $("#sb-version").textContent);
  return { ctx, page };
}
// the motions since `n` on what `sel` names, by name, with whether each ended
const on = (page, n, sel) => page.evaluate(([n, sel]) => window.cssMotions.slice(n).filter((m) => m.target.matches?.(sel)).map((m) => [m.name, m.ended]), [n, sel]);
const usage = async (page) => { await page.click("#sb-res-icon"); await page.waitForFunction(() => $("#usage-dlg").open); await atRest(page, "#usage-dlg"); };
const gone = (page, sel) => page.evaluate((s) => !document.querySelector(s).checkVisibility(), sel);

// ---- with animations on ----
{
  const { ctx, page } = await open();
  // the step to do: its button shines three times, then rests, still the one to press
  await page.waitForFunction(() => document.querySelector(".shine"));
  const shining = await page.evaluate(() => { const b = document.querySelector(".shine"); return b && { id: b.id, times: getComputedStyle(b, "::after").animationIterationCount }; });
  await check(shining?.times === "3", "the button of the step to do shines three times", shining);
  await page.waitForFunction(() => window.cssMotions.some((m) => m.name === "shine" && m.ended), null, { timeout: 15000 });
  await check(await page.evaluate((id) => document.getElementById(id).classList.contains("shine"), shining.id), "and then rests, still marked as the step to do");
  // a part that makes room for itself: the image's details, as an image opens
  let n = await played(page);
  await page.setInputFiles("#file", PNG);
  await page.waitForFunction(() => !$("#file-box").hidden);
  const unfolded = await ran(page, n, [{ name: "height" }]);
  // the Image box folds to its title once the image is open: the part is measured with its box open again
  if (await page.evaluate(() => $("#image-box").classList.contains("folded"))) await page.click("#image-box .sec-head h2");
  await page.waitForFunction(() => !$("#image-box").classList.contains("folded"));
  await atRest(page, "#file-box");
  await check(!unfolded.missing && (await on(page, n, "#file-box")).some(([name, ended]) => name === "height" && ended) && await page.evaluate(() => $("#file-box").getBoundingClientRect().height > 10),
    "a part that makes room for itself draws out with a motion, at its own height at the end", { unfolded, on: await on(page, n, "#file-box") });
  await usage(page);
  // the dialog closing
  n = await played(page);
  await page.keyboard.press("Escape");
  await check(await page.evaluate(() => !$("#usage-dlg").open), "a dialog closed is closed at once to the page");
  const closing = await ran(page, n, [{ name: "opacity" }]);
  await check(!closing.missing && (await on(page, n, "#usage-dlg")).some(([name, ended]) => name === "opacity" && ended) && await gone(page, "#usage-dlg"),
    "and it closes with a motion of its own, gone at its end", { closing, on: await on(page, n, "#usage-dlg") });
  // a dialog closed by its own action goes at once: what the action started is what shows next
  await page.evaluate(() => $("#open-settings").click());
  await page.waitForFunction(() => $("#settings-dlg").open);
  await atRest(page, "#settings-dlg");
  n = await played(page);
  await page.click("#settings-save");
  await page.waitForFunction(() => !$("#settings-dlg").checkVisibility());
  const acted = await on(page, n, "#settings-dlg");
  await check(!acted.length, "a dialog closed by its own action goes at once", acted);
  await ctx.close();
}

// ---- with animations off, and with reduced motion asked for ----
for (const [how, opts] of [["animations off", { motion: false }], ["reduced motion asked for", { reducedMotion: "reduce" }]]) {
  const { ctx, page } = await open(opts);
  const n = await played(page);
  await page.setInputFiles("#file", PNG);
  await page.waitForFunction(() => !$("#file-box").hidden);
  await usage(page);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !$("#usage-dlg").checkVisibility());
  const made = await page.evaluate((n) => window.cssMotions.slice(n).filter((m) => m.target.matches?.("#usage-dlg, #file-box") && ["height", "opacity", "transform"].includes(m.name)).map((m) => m.name), n);
  await check(!made.length, `with ${how}, the part shows and the dialog closes at once`, made);
  await ctx.close();
}
await done(0);
