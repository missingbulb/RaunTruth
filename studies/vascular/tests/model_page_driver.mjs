// Drives the vascular study's page (web/) in a PreGT stage in headless Chromium against a stand-in worker
// (stand_in.mjs) whose Execute answers with a model fixture. Checks req/vascular/model/view: Image, Model, Overlay and
// Side by side, colour by depth painting the model too, and vessel widths; req/vascular/model/correct: Detected keeps
// only the signal near the model; req/vascular/model/cards: Items shows the model's cards
// outside a ground-truth stage and approves a low-confidence vessel from one; and the model's canvas leaves the 3D
// view with the study. Exits 1 on a failed check, 2 when it cannot run.
//   node studies/vascular/tests/model_page_driver.mjs STUDIES
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { ENGINE } from "../../../web-tests/engine.mjs";
import { asTagger } from "../../../web-tests/tagger.mjs";
import { serve, drawnStack } from "./stand_in.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { frames, viewDrawn } from "../../../web-tests/page_frames.mjs";
import { pw, launch, check } from "../../../web-tests/harness.mjs";
import { STEP } from "../../../web-tests/deadlines.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..", "..", "..");
const [studies] = process.argv.slice(2);
const model = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cd31_frontal_x20_r_1_slices1-12.vessels.json"), "utf8"));
// the item views only show what was found, so they are driven in a PreGT study (req/shell/views/second)
const site = await serve(repo, studies, model, "PreGT"), origin = site.origin;

const browser = await launch(pw);
let failed = false;
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
await asTagger(ctx);
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
await standInDrive(ctx);
const page = await ctx.newPage();
page.setDefaultTimeout(STEP);

// the 3D view's brightness now, its mean over every pixel of red, green and blue
const brightness = async () => { await viewDrawn(page); return brightnessNow(); };
const brightnessNow = () => page.evaluate(() => {
  const gl = document.querySelector("#v3-gl"), c = document.createElement("canvas"); c.width = gl.width; c.height = gl.height;
  const g = c.getContext("2d"); g.drawImage(gl, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
  return s / (d.length / 4);
});
const facts = () => page.textContent("#model-facts");
// the model's own canvas now: how many pixels are lit, and how many of those are coloured rather than grey
const drawn = async () => { await frames(page); return drawnNow(); };
const drawnNow = () => page.evaluate(() => {
  const d = testCopy(document.querySelector("#mcv")).getImageData(0, 0, document.querySelector("#mcv").width, document.querySelector("#mcv").height).data;
  let lit = 0, coloured = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128 || d[i] + d[i + 1] + d[i + 2] < 60) continue;
    lit++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 60) coloured++;
  }
  return { lit, coloured };
});

try {
  await page.goto(origin + "/web/vascular");
  await page.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  await openFromDrive(page, { name: model.source, mimeType: "image/tiff", buffer: drawnStack(model) });
  await page.waitForFunction(() => !$("#vm-run").disabled);
  await page.evaluate(() => { $("#notice").hidden = true; });
  check(await page.evaluate(() => $("#v3-stage #mcv") === null && $("#vm-review").hidden), "a stack opens with no model");
  // req/vascular/model/run: the Processing box runs the algorithm on the image open, as NoR's; no model file is loaded
  check(await page.evaluate(() => !$("#model-load") && !$("#model-file") && !/model file/i.test($("#model-set").textContent + $("#model-facts").textContent)),
    "the Processing box offers no model file to load, only Execute");
  await page.click("#vm-run");
  await page.waitForFunction(() => !$("#vm-review").hidden);
  check(/vessel edges/.test(await facts()), `Execute opens the model it draws: ${(await facts()).slice(0, 80)}`);
  // req/vascular/summary/metrics and req/vascular/summary/mask: the eight numbers, over the whole field and then inside a lassoed mask
  await page.waitForFunction(() => !!window.vascular.summary().summary);
  const sum = () => page.evaluate(() => ({ s: window.vascular.summary().summary, text: $("#vm-summary").textContent }));
  const whole = await sum();
  const NAMES = ["Vascular volume fraction", "Vessel length density", "Branch point density", "Branch density", "Mean branch length",
    "Vessel diameter", "Vessel tortuosity", "Nearest-vessel distance"];
  check(NAMES.every((n) => whole.text.includes(n)) && whole.s.junctions > 0 && whole.s.volumeFraction > 0 && whole.s.nearest.n > 0,
    `Summary gives the eight numbers over the whole field: ${whole.s.junctions} junctions, ${(100 * whole.s.volumeFraction).toFixed(2)}% vessel`);
  await page.click("#mask-add");
  check(await page.evaluate(() => $("#v3-stage").classList.contains("lassoing") && !$("#lasso-hint").hidden), "Add mask arms the shell's lasso on the stack from straight above");
  // the left half of the field, lassoed by dragging on the view
  const corners = await page.evaluate(() => {
    const T = window.shellForTests.viewer.three, r = T.stage.getBoundingClientRect(), { W: w, H: h } = window.shellForTests.page.get("image");
    const at = (x, y) => { const p = T.toScreen(x, y); return [r.left + p[0], r.top + p[1]]; };
    return [at(1, 1), at(w / 2, 1), at(w / 2, h - 1), at(1, h - 1), at(1, 2)];
  });
  await page.mouse.move(...corners[0]); await page.mouse.down();
  for (let c = 1; c < corners.length; c++) for (let k = 1; k <= 10; k++) {
    const [x0, y0] = corners[c - 1], [x1, y1] = corners[c];
    await page.mouse.move(x0 + ((x1 - x0) * k) / 10, y0 + ((y1 - y0) * k) / 10);
  }
  await page.mouse.up();
  await page.waitForFunction((t) => window.vascular.summary().summary?.tissueMm3 < t * 0.6, whole.s.tissueMm3);
  const half = await sum();
  check(Math.abs(half.s.tissueMm3 / whole.s.tissueMm3 - 0.5) < 0.05 && half.s.junctions < whole.s.junctions && /inside the mask/.test(half.text) && !(await page.evaluate(() => $("#mask-clear").hidden)),
    `the summary counts only inside the mask: tissue ×${(half.s.tissueMm3 / whole.s.tissueMm3).toFixed(2)}, ${whole.s.junctions} → ${half.s.junctions} junctions`);
  // the border drawn where the lasso went: its corners where the drag turned them
  const border = await page.evaluate(() => { const r = $("#v3-stage").getBoundingClientRect(), b = $("#mask-3d .mask-marks path.edge:not(.under)")?.getBBox();
    return b && [r.left + b.x, r.top + b.y, r.left + b.x + b.width, r.top + b.y + b.height]; });
  check(!!border && [border[0] - corners[0][0], border[1] - corners[0][1], border[2] - corners[2][0], border[3] - corners[2][1]].every((d) => Math.abs(d) < 3),
    `the mask's border shows over the view where it was lassoed: ${JSON.stringify(border)} for ${JSON.stringify([corners[0], corners[2]])}`);
  // req/shell/summary/download: the numbers inside the mask, saved through the shell's Download Summary
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#summary-dl")]);
  const csv = fs.readFileSync(await dl.path(), "utf8").trim().split("\n").map((r) => r.split(","));
  const row = (name) => csv.find((r) => r[3] === name);
  const jn = row("Junctions"), nearest = row("Nearest-vessel distance");
  check(dl.suggestedFilename() === model.source.replace(/\.tiff?$/, "") + "_summary.csv" && csv.length === 13 && csv[1][2] === "a mask of 1 area"
    && +jn?.[5] === half.s.junctions && +nearest?.[6] === half.s.nearest.n && nearest?.[5] === "",
    `Download Summary saves the twelve rows inside the mask: ${dl.suggestedFilename()}, ${csv.length - 1} rows, junctions ${jn?.[5]}, nearest n ${nearest?.[6]}`);
  await page.click("#mask-clear");
  await page.waitForFunction((t) => window.vascular.summary().summary?.tissueMm3 === t, whole.s.tissueMm3);
  check(true, "Clear mask counts the whole field again");
  // req/vascular/model/view: every choice of how the model shows is in one Show menu at the toolbar's left, as NoR's
  // (outside a ground-truth stage the tasks' Back to image button is not shown)
  const menu = await page.evaluate(() => { const m = $("#vm-show");
    return { menu: !!m && m.matches(".toolbar details.menu") && m.querySelector("summary").textContent.trim(),
      inside: ["#model-mode", "#m-widths", "#review-mode", "#reach"].filter((s) => !$(s)?.closest("#vm-show .pop")),
      hider: !!$("#m-candidates"),
      loose: [...document.querySelectorAll(".toolbar [data-study-panel]")].filter((e) => e.id !== "vm-show" && !e.hidden).map((e) => e.id || e.tagName) }; });
  check(menu.menu === "Show" && !menu.inside.length && !menu.loose.length, `a Show menu holds the views, Vessel widths and Everything, Detected, Missed: ${JSON.stringify(menu)}`);
  check(!menu.hider, "the low-confidence vessels always show: no option hides them");
  // a control in the menu, reached as a person reaches it: the menu opened first
  const inMenu = async (sel) => { if (!(await page.evaluate(() => $("#vm-show").open))) await page.click("#vm-show summary"); return sel; };
  const shown = () => page.evaluate(() => ({ pressed: window.vascular.model().view, split: $("#v3-stage").classList.contains("split"), over: !!$("#v3-stage #mcv") }));
  check(JSON.stringify(await shown()) === JSON.stringify({ pressed: "overlay", split: false, over: true }), "the model opens over the stack");
  await page.click(await inMenu('#model-mode [data-v="bare"]'));
  check((await drawn()).lit === 0, "No markings shows the stack alone");
  await page.click(await inMenu('#model-mode [data-v="side"]'));
  check((await shown()).split, "Side by side splits the view in two");
  await page.click(await inMenu('#model-mode [data-v="alone"]'));
  const alone = await drawn();
  check(!(await shown()).split && alone.lit > 500, `Model shows the model alone, over the whole view: ${alone.lit} lit pixels`);
  // CD31's Colour by depth, its tick in the image box (req/shell/viewer-3d), paints the model as it paints the stack
  if (await page.evaluate(() => $("#image-box").classList.contains("folded"))) { await page.click("#image-box"); await page.waitForFunction(() => !$("#image-box").classList.contains("folded")); }
  const depth = await page.isChecked("#depth-0");
  await page.setChecked("#depth-0", !depth);
  const flip = await drawn(), [byDepth, plain] = depth ? [alone, flip] : [flip, alone];
  check(byDepth.coloured > plain.coloured * 4 + 100, `Colour by depth paints the model in depth colours: ${plain.coloured} → ${byDepth.coloured} coloured pixels`);
  check(await page.evaluate(() => !!window.shellForTests.viewer.three.depthPalette()) === !depth, "and the stack too");
  await page.setChecked("#depth-0", depth);
  await page.uncheck(await inMenu("#m-widths"));
  const thin = await drawn();
  check(thin.lit < alone.lit * 0.7, `Vessel widths off draws the vessels as lines: ${alone.lit} → ${thin.lit} lit pixels`);
  await page.check(await inMenu("#m-widths"));
  await page.click(await inMenu('#model-mode [data-v="alone"]'));
  check((await shown()).pressed === "overlay", "Model clicked again shows the model over the stack");

  // what the 3D view draws needs WebGL2, which a headless browser may lack
  if (await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"))) {
    const all = await brightness();
    await page.click(await inMenu('#review-mode [data-v="detected"]'));
    // the study applies the mask in a task of its own after the click: drawn again until it shows, 60 draws at most
    let detected = await brightness();
    for (let n = 0; n < 60 && detected >= all * 0.8; n++) detected = await brightness();
    check(detected < all * 0.8, `Detected keeps only the signal near the model's vessels: ${all.toFixed(2)} → ${detected.toFixed(2)}`);
    await page.click(await inMenu('#review-mode [data-v="all"]'));
  } else console.log(`not checked in this ${ENGINE}: what Detected leaves in the 3D view, which needs the WebGL2 it lacks`);

  check(await page.isHidden("#tasks-box") && await page.isHidden("#gt-submit") && await page.isHidden("#m-draw") && !(await page.$("#m-lasso")),
    "outside a ground-truth stage there are no tasks, no Submit and no Draw a missed vessel, a ground-truth task; no damaged area is marked on the model, which Data Management does");
  // req/shell/image/toolbar: how the model shows is the toolbar's left, and the left bar holds none of it
  const where = await page.evaluate(() => ["#model-mode", "#m-widths", "#review-mode", "#reach"].map((s) => !!$(s)?.closest(".toolbar") && !$(s).closest("#left")));
  check(where.every(Boolean), `what the model shows and how sit at the toolbar's left: ${where}`);
  // the study's options and the viewer's tools together never push one out of the toolbar (a menu's popup hangs below it)
  const out = await page.evaluate(() => { const t = $("#view .toolbar").getBoundingClientRect();
    return [...$("#view .toolbar").querySelectorAll("button, label, input")].filter((e) => e.offsetParent !== null && !e.closest(".pop"))
      .filter((e) => { const r = e.getBoundingClientRect(); return r.right > t.right + 0.5 || r.bottom > t.bottom + 0.5 || r.left < t.left - 0.5; })
      .map((e) => e.id || e.textContent.trim()); });
  check(!out.length, `every toolbar control is inside the toolbar: ${out}`);
  await page.click("#switch");
  await page.click('#item-kind [data-v="vessels"]');
  await page.selectOption("#item-filter", "review");
  await page.waitForSelector("#item-list .card:not(.placeholder) button.yes");
  const cards = await page.locator("#item-list .card:not(.placeholder)").count();
  check(cards > 0, `Items shows the low-confidence vessels as cards: ${cards}`);
  await page.click("#item-list .card:not(.placeholder) button.yes");
  check(/1 approved/.test(await facts()), "a card's Approve approves the vessel");
  await page.click("#switch");
  check(await page.evaluate(() => !document.querySelector("#m-undo, #m-redo, #m-reset") && !/Discard edits/.test($("#model-set").textContent)), "the model has no Undo, Redo or Discard edits of its own: the shell's log undoes its edits");

  // the switcher lists the studies once it has read them
  await page.waitForFunction(() => [...document.querySelectorAll("#study-list a")].some((x) => x.textContent.includes("Image Viewer")));
  await page.evaluate(() => { const a = [...document.querySelectorAll("#study-list a")].find((x) => x.textContent.includes("Image Viewer")); a.click(); });
  await page.waitForFunction(() => $("#title").textContent === "Image Viewer");
  check(await page.evaluate(() => !document.querySelector("#mcv")), "the model's canvas leaves the 3D view with the study");
} catch (e) {
  failed = true; console.error(e);
}
await browser.close(); site.close();
process.exit(failed ? 1 : 0);
