// Drives the page (web/) in headless Chromium, with a worker that never answers, and checks
// req/shell/dialogs/close-as-opened: a dialog a press opened closes with a motion that ends with it gone, a part that
// makes room for itself draws out, the button of the step to do shines three times and rests; and with
// animations off or reduced motion asked for each happens at once. Only that a motion is on, starts and ends in the
// right state is checked, never how it looks on the way. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/fold_motion_driver.mjs
import { pw, launch, mustHold } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { record, played, ran, atRest, scripted, animated } from "./page_motions.mjs";
import { greyPng } from "./png_fixture.mjs";

const { origin, server } = await serveSite({ "/web/worker.js": "", "/web/version_history.json": "[]" });
const browser = await launch(pw), w = world(browser, origin);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };

// a grey square, as a file a person picks
const PNG = { name: "acme.png", mimeType: "image/png", buffer: greyPng(8, 8, () => 128) };
// the Image Viewer, which opens a file of this computer, with one open
async function open({ motion = true, reducedMotion = "no-preference", sizeKeywords = true } = {}) {
  let device = w.device().with({ reducedMotion }).keeps({ "nor-motion": JSON.stringify(motion) });
  if (!sizeKeywords) device = device.withoutSizeKeywordMotion();
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
  await mustHold(shining?.times === "3", "the button of the step to do shines three times", shining);
  await page.waitForFunction(() => window.cssMotions.some((m) => m.name === "shine" && m.ended), null, { timeout: 15000 });
  await mustHold(await page.evaluate((id) => document.getElementById(id).classList.contains("shine"), shining.id), "and then rests, still marked as the step to do");
  // a part that makes room for itself: the image's details, as an image opens
  let n = await played(page);
  await page.setInputFiles("#file", PNG);
  await page.waitForFunction(() => !$("#file-box").hidden);
  const unfolded = await ran(page, n, [{}]);
  // the Image box folds to its title once the image is open: the part is measured with its box open again
  if (await page.evaluate(() => $("#image-box").classList.contains("folded"))) await page.click("#image-box .sec-head h2");
  await page.waitForFunction(() => !$("#image-box").classList.contains("folded"));
  await atRest(page, "#file-box");
  await mustHold(!unfolded.missing && (await on(page, n, "#file-box")).some(([, ended]) => ended) && await page.evaluate(() => $("#file-box").getBoundingClientRect().height > 10),
    "a part that makes room for itself opens with a motion that ends, at its own height at the end", { unfolded, on: await on(page, n, "#file-box") });
  await usage(page);
  // the dialog closing
  n = await played(page);
  await page.keyboard.press("Escape");
  await mustHold(await page.evaluate(() => !$("#usage-dlg").open), "a dialog closed is closed at once to the page");
  const closing = await ran(page, n, [{ name: "opacity" }]);
  await mustHold(!closing.missing && (await on(page, n, "#usage-dlg")).some(([name, ended]) => name === "opacity" && ended) && await gone(page, "#usage-dlg"),
    "and it closes with a motion of its own, gone at its end", { closing, on: await on(page, n, "#usage-dlg") });
  // a dialog closed by its own action goes at once: what the action started is what shows next
  await page.evaluate(() => $("#open-settings").click());
  await page.waitForFunction(() => $("#settings-dlg").open);
  await atRest(page, "#settings-dlg");
  n = await played(page);
  await page.click("#settings-save");
  await page.waitForFunction(() => !$("#settings-dlg").checkVisibility());
  const acted = await on(page, n, "#settings-dlg");
  await mustHold(!acted.length, "a dialog closed by its own action goes at once", acted);
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
  await mustHold(!made.length, `with ${how}, the part shows and the dialog closes at once`, made);
  await ctx.close();
}
// ---- on an engine that cannot move a height to a part's own, as Firefox and Safari: the part still draws out and in ----
for (const [how, opts] of [["animations on", {}], ["animations off", { motion: false }], ["reduced motion asked for", { reducedMotion: "reduce" }]]) {
  const { ctx, page } = await open({ ...opts, sizeKeywords: false });
  const moves = how === "animations on";
  // the Image box kept open, so that its parts fold with motions of their own
  await page.evaluate(() => { new MutationObserver(() => $("#image-box").classList.remove("folded")).observe($("#image-box"), { attributeFilter: ["class"] }); });
  let n = await scripted(page);
  await page.setInputFiles("#file", PNG);
  await page.waitForFunction(() => !$("#file-box").hidden);
  if (moves) {
    const opened = await animated(page, n, "#file-box", "height");
    await atRest(page, "#file-box");
    const tall = await page.evaluate(() => $("#file-box").getBoundingClientRect().height);
    await mustHold(!opened.missing && tall > 10, "where the engine cannot move a height to its own, a part opens with a height motion that ends at its own height", { opened, tall });
  }
  await atRest(page, "#file-box");
  const opening = await page.evaluate((n) => window.scriptMotions.slice(n).filter((m) => m.target.matches("#file-box")).length, n);
  n = await scripted(page);
  await page.focus("#unload");
  // whether the part is still on show in the first frame after it is hidden, as its motion begins
  await page.evaluate(() => {
    const seen = new MutationObserver(() => {
      if (!$("#file-box").hidden) return;
      seen.disconnect();
      requestAnimationFrame(() => { window.foldGoing = $("#file-box").checkVisibility({ opacityProperty: true }); });
    });
    seen.observe(document.body, { subtree: true, attributeFilter: ["hidden"] });
  });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => $("#file-box").hidden);
  await mustHold(await page.evaluate(() => $("#file-box").hidden), "a part closed is hidden at once to the page");
  if (moves) {
    const closed = await animated(page, n, "#file-box", "height");
    await page.waitForFunction(() => !$("#file-box").checkVisibility());
    const going = await page.evaluate(() => window.foldGoing);
    await mustHold(!closed.missing && going, "and it closes with a height motion, on show as it goes and hidden at its end", { closed, going });
  } else {
    await page.waitForFunction(() => !$("#file-box").checkVisibility());
    const closing = await page.evaluate((n) => window.scriptMotions.slice(n).filter((m) => m.target.matches("#file-box")).length, n);
    await mustHold(!opening && !closing, `with ${how}, the part opens and closes at once there too`, { opening, closing });
  }
  await ctx.close();
}
await done(0);
