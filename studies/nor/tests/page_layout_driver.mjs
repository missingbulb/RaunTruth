// Drives the page (web/) in headless Chromium with a stand-in worker that answers from ANSWERS, a folder
// of real results written by tests/test_memory.py, and checks that no image is drawn out of its own
// proportions when the side bar is narrow: the minimap, the image and the
// selected card; and where the selected card and Save sit, with no right bar. Prints what it
// measured; exits 1 on a skewed image or a misplaced part, 2 when it cannot run.
//   node tests/page_layout_driver.mjs ANSWERS IMAGE
import { annotateIfAsked } from "../../../web-tests/annotating.mjs";
import { EARLY } from "../../../web-tests/early_messages.mjs";

import { TAGGER } from "../../../web-tests/tagger.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { pw, launch } from "../../../web-tests/harness.mjs";
import { world } from "../../../web-tests/world.mjs";
import { serveSite } from "../../../web-tests/site_server.mjs";

const [answers, image] = process.argv.slice(2);

const STAND_IN = `
const A = await (await fetch("answers/answers.json")).json();
const bin = async (n) => new Uint8Array(await (await fetch("answers/" + n)).arrayBuffer());
let finder;
postMessage({ type: "ready", info: {}, secs: 0 });
onmessage = async ({ data: m }) => {
  if (m.type === "open") {
    postMessage({ type: "held", secs: 0 });
  } else if (m.type === "call" && m.action === "run") {
    finder = m.args.algorithm; const seg = await bin("seg_" + finder + ".bin");
    postMessage({ type: "result", action: "run", meta: A.detected[finder], bytes: seg, secs: 0 }, [seg.buffer]);
  } else if (m.type === "call") {
    // the page asks Python for nothing but a run (req/nor/find/nors-only)
    postMessage({ type: "error", text: "the page asked Python for " + m.action + ", not a run" });
  }
};`;

const { origin, server } = await serveSite({
  "/web/worker.js": EARLY + STAND_IN,
  "/web/answers/": { dir: answers },
});

const browser = await launch(pw), w = world(browser, origin);
w.site.withGoogle();
const tagger = w.user(TAGGER).named("Acme Tagger").annotates("nor");
// a tagger's device in a window that wide, the side bars at their narrowest, the study at that stage, its image opened
// from Drive and found on
async function found(width, stage) {
  tagger.savedSettings(null);
  const device = w.device().signedInAs(tagger).with({ viewport: { width, height: 900 } }).withStudy("nor", { stage })
    .keeps({ "nor-bars-v1": JSON.stringify({ left: 200, right: 200 }) });
  const ctx = await device.context();
  await standInDrive(ctx);
  const page = await device.opens("nor", { until: "none" });
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  await openFromDrive(page, image);
  await page.waitForFunction(() => !document.querySelector("#find").disabled);
  await annotateIfAsked(page, "#find");
  await page.click("#find");
  await page.waitForFunction(() => st.passes && $("#busy").hidden);
  return { device, page };
}
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
// every drawn canvas and image: how far its shown width / height strays from its pixels' own
const measure = (page) => page.evaluate(() => [...document.querySelectorAll("canvas, img")].filter((c) => c.offsetWidth && c.offsetHeight).map((c) => {
  const r = c.getBoundingClientRect(), w = c.naturalWidth || c.width, h = c.naturalHeight || c.height;
  return { where: c.closest("[id]").id, skew: Math.abs(r.width / r.height / (w / h) - 1) };
}));
let seen = 0, worst = { skew: 0 };
// the selected card only shows what was found, so it is driven in a Review study
// (req/shell/views/second); while the study makes ground truth, the task's card is in the left bar
// the side bars at their narrowest, in a narrow and a wide window
for (const width of [1000, 1600]) {
  const { device, page } = await found(width, "Review");
    // ---- the selected card over the image's top right corner, only while one is selected; Submit Ground
  // Truth not in the image view; no right bar (req/nor/layout, req/nor/candidates/decide, req/nor/downloads) ----
  const fail = async (what, seen) => { console.error("FAILED: " + what + ": " + JSON.stringify(seen)); await done(1); };
  if (await page.isVisible("#selected-box")) await fail("the selected card shows with nothing selected", true);
  const sc = await page.locator("#scroller").boundingBox();
  await page.mouse.move(sc.x + sc.width / 2, sc.y + sc.height / 2);
  await page.mouse.wheel(200, 0); // a sideways swipe steps to the first candidate
  await page.waitForSelector("#selected-box", { state: "visible" });
  const layout = await page.evaluate(() => {
    const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const tools = [...document.querySelector(".toolbar").children].filter((e) => e.offsetParent && e.tagName !== "SLOT-HERE");
    return { sel: box("#selected-box"), view: box("#image-view"), mm: box("#minimap"), crop: box("#selected .crop-wrap canvas, #selected .crop-wrap img"),
      prev: box("#sel-prev"), next: box("#sel-next"), title: document.querySelector("#selected-box h2")?.textContent || "",
      stepIn: !!document.querySelector("#selected .crop-wrap #sel-prev"), right: !!document.querySelector("#right"),
      gt: document.querySelector("#gt-submit").textContent.trim(), gtShown: !!document.querySelector("#gt-submit").offsetParent };
  });
  console.log(JSON.stringify(layout));
  if (layout.title) await fail("the selected card has a title", layout.title);
  if (Math.abs(layout.sel.r - layout.view.r) > 40 || Math.abs(layout.sel.t - layout.view.t) > 40) await fail("the selected card is not at the image's top right corner", layout);
  if (layout.mm && layout.mm.r > layout.sel.l) await fail("the minimap and the selected card overlap", layout);
  if (!layout.stepIn || layout.prev.b > layout.crop.b + 1 || layout.prev.t < layout.crop.t || layout.next.l < layout.prev.r - 1) await fail("previous and next do not hover side by side over the bottom of the selected crop", layout);
  if (layout.gt !== "Save" || layout.gtShown) await fail("Save shows in the image view", layout);
  if (layout.right) await fail("the right bar is still there", layout);
  if (process.env.SHOTS) { await page.evaluate(() => { $("#notice").hidden = true; }); await page.mouse.move(5, 5); await page.screenshot({ path: `${process.env.SHOTS}/${width}_image.png` }); }
  {
    await page.waitForFunction(() => !document.querySelector("button.working"));
    const got = await measure(page), view = "image";
    const selected = got.filter((g) => g.where === "selected").length;
    console.log(`${width}px ${view}: ${got.length} images, ${selected} selected`);
    if (!selected) { console.error("no selected card drawn"); await done(1); }
    seen += got.length;
    for (const g of got) if (g.skew > worst.skew) worst = { ...g, width, view };
  }
  await device.close();
}
// a GT study: the image and the task's card in the left bar, at the left bar's narrowest
for (const width of [1000, 1600]) {
  const { device, page } = await found(width, "Develop");
  // the walk may open on an area's check; the finalists' row goes to a candidate
  await page.click('#gt-tasks > li[data-task="pass"] .task-head .t');
  await page.waitForFunction(() => document.querySelector("#task-card canvas"));
  const got = await measure(page), task = got.filter((g) => g.where === "task-card").length;
  console.log(`${width}px GT: ${got.length} images, ${task} task card`);
  if (task !== 1) { console.error("no task card drawn in the left bar"); await done(1); }
  if (process.env.SHOTS) { await page.evaluate(() => { $("#notice").hidden = true; }); await page.screenshot({ path: `${process.env.SHOTS}/${width}_gt.png` }); }
  seen += got.length;
  for (const g of got) if (g.skew > worst.skew) worst = { ...g, width, view: "GT" };
  await device.close();
}
console.log(`${seen} images measured; most skewed ${worst.skew.toFixed(3)}`, worst.where ? `(${worst.where}, ${worst.view}, ${worst.width}px)` : "");
// a pixel of rounding in a crop's width is under 1%
await done(worst.skew > 0.02 ? 1 : 0);
