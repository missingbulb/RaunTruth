// Drives the vascular study's page in a GT stage (web/) in headless Chromium against a stand-in worker
// (stand_in.mjs) whose Execute answers with a model fixture, over a drawn stack. Checks req/vascular/truth/keys: F and J
// judge the area's junction as Junction and They cross do, Space does the area once Area is right is on, S skips it;
// no key acts out of tagging, typing in a field, with a menu open, held down, or when its button is off, and a key that
// did not act is left to the page; each button shows its key. The image's keys legend (req/shell/image/keys) lists exactly the keys that act,
// each filled blue while held; the number keys switch the views (req/vascular/model/view): 1 held shows the model
// alone as Ctrl did, Ctrl no longer does, 2 held hides the lines over the stack, 3 held shows side by side, each kept on
// by clicking its row, no key for Vessel widths or Missed, and a digit typed in a field does nothing. Exits 1 on a failed check, 2 when it cannot run.
//   node studies/vascular/tests/vessel_keys_driver.mjs STUDIES
import { annotateIfAsked } from "../../../web-tests/annotating.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { SOFTWARE_3D } from "../../../web-tests/engine.mjs";
import { frames } from "../../../web-tests/page_frames.mjs";
import { serve, atStage, taggersDevice, drawnStack, legend, legendKeys } from "./stand_in.mjs";
import { openFromDrive } from "../../../web-tests/drive_open.mjs";
import { pw, launch, check } from "../../../web-tests/harness.mjs";
import { world } from "../../../web-tests/world.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..", "..", "..");
const [studies] = process.argv.slice(2);
const model = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cd31_frontal_x20_r_1_slices1-12.vessels.json"), "utf8"));
const site = await serve(studies, model);

const browser = await launch(pw), w = world(browser, site.origin);
// the deploy with a Google key, the page offering no sign-in
w.site.withoutGoogleClient();
let failed = false;
// the page at a stage, the stack opened and the algorithm run; where the study asks how to get annotations (its GT stage),
// from scratch chosen: the view toggles are tried in a published study, which is only viewed, and the keys of the walk in a GT one
atStage(browser, "Develop");
let device, page;
async function begin(stage) {
  device = taggersDevice(w).with({ ...SOFTWARE_3D }).withStudy("vascular", { stage });
  page = await device.opens("vascular");
  await openFromDrive(page, { name: model.source, mimeType: "image/tiff", buffer: drawnStack(model) });
  await page.waitForFunction(() => !$("#vm-run").disabled);
  await annotateIfAsked(page, "#vm-run");
  await page.evaluate(() => { $("#notice").hidden = true; });
  await page.waitForFunction(() => !$("#vm-review").hidden);
}

const tasks = () => page.evaluate(() => window.vascular.tasks());
const doc = () => page.evaluate(() => window.vascular.model().model);
// a key pressed where the page hears it, on the element given or the page: whether the page kept it to itself
const press = (code, { on = null, repeat = false } = {}) => page.evaluate(({ code, on, repeat }) => {
  const key = { Space: " ", Backspace: "Backspace" }[code] || code.replace(/^(Key|Digit|Numpad)/, "").toLowerCase();
  const e = new KeyboardEvent("keydown", { code, key, repeat, bubbles: true, cancelable: true });
  (on ? document.querySelector(on) : document.body).dispatchEvent(e);
  document.body.dispatchEvent(new KeyboardEvent("keyup", { code, key, bubbles: true }));
  return e.defaultPrevented;
}, { code, on, repeat });
const state = async () => { const t = await tasks(), m = await doc(); return { area: t.area, key: t.key, junctions: t.junctions.length,
  checked: (m.checked_junctions || []).length, regions: (m.reviewed_regions || []).length, nodes: m.nodes.length }; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// what the main view shows; a row of the keys legend by its key
const mode = () => page.evaluate(() => window.vascular.model().view);
// the view toggles as the Show menu and the keys legend each draw them: label and pressed, in order
const toggles = () => page.evaluate(() => ({
  menu: [...document.querySelectorAll("#model-mode button, #model-dim button")].map((b) => `${b.textContent.trim()}${b.getAttribute("aria-pressed") === "true" ? "*" : ""}`).join(" "),
  legend: ["model", "outlines", "side"].map((id) => { const b = $(`#key-${id}`); return `${b.textContent.trim()}${b.getAttribute("aria-pressed") === "true" ? "*" : ""}`; })
    .concat([...document.querySelectorAll("#key-swap span")].map((h) => `${h.textContent}${getComputedStyle(h).backgroundColor === getComputedStyle($("#key-model")).getPropertyValue("--blue") || /^rgba?\(\s*\d{1,2},\s*\d+,\s*2\d\d/.test(getComputedStyle(h).backgroundColor) ? "*" : ""}`)).join(" "),
}));
// a chip's look while its key is held: its dashed ring, filled or not
const ring = (id) => page.evaluate((id) => { const b = $(`#key-${id}`), cs = getComputedStyle(b);
  return { held: b.classList.contains("held"), dashed: cs.outlineStyle === "dashed", pressed: b.getAttribute("aria-pressed") }; }, id);
const row = async (key) => (await legend(page)).find((r) => r.key === key);

try {
  await begin("Public");
  let s0, keys;
  // 2 held hides the lines over the stack, its row filled; let go, they are back; clicking its row keeps them hidden
  const m0 = await mode();
  await page.keyboard.down("2");
  const bare0 = await mode(), bare0Row = await row("2");
  await page.keyboard.up("2");
  check(m0 === "overlay" && bare0 === "image" && bare0Row.lit && (await mode()) === "overlay" && !(await row("2")).lit,
    `holding 2 hides the lines over the stack, its row filled, letting go shows them again: ${m0} → ${bare0} → ${await mode()}`);
  await page.keyboard.down("Numpad2");
  const padBare = await mode();
  await page.keyboard.up("Numpad2");
  check(padBare === "image" && (await mode()) === "overlay", `2 on the number pad does the same: ${padBare}`);
  await page.click("#key-outlines");
  const keptBare = await mode();
  await page.click("#key-outlines");
  check(keptBare === "image" && (await mode()) === "overlay", `clicking the 2 row keeps the lines hidden, again shows them: ${keptBare} → ${await mode()}`);
  check(!(await press("Digit2", { on: "#gt-areas" })) && (await mode()) === "overlay", "2 typed in a field does nothing");
  await page.evaluate(() => { $("#vm-show").open = true; });
  check(!(await press("Digit2")) && (await mode()) === "overlay", "2 with the Show menu open does nothing");
  await page.evaluate(() => { $("#vm-show").open = false; });
  // 3 held: side by side; let go, the view as it was; clicking its row keeps side by side on
  await page.keyboard.down("3");
  const side = await mode(), sideRow = await row("3");
  await page.keyboard.up("3");
  check(side === "side" && sideRow.lit && sideRow.label === "Side by side" && (await mode()) === "overlay" && !(await row("3")).lit,
    `holding 3 shows side by side, its row filled, letting go the view as it was: ${side} → ${await mode()}`);
  await page.click("#key-side");
  const keptSide = await mode();
  await page.click("#key-side");
  check(keptSide === "side" && (await mode()) === "overlay", `clicking the 3 row keeps side by side on, again off: ${keptSide} → ${await mode()}`);
  // 4 is the grey picture with the widths on the whole stack too, and 5 no key; no key switches Vessel widths or Missed
  const w0 = await page.evaluate(() => $("#m-widths").checked);
  const seen = [];
  for (const k of ["4", "5"]) { await page.keyboard.down(k); seen.push(await page.evaluate(() => window.vascular.model().view)); await page.keyboard.up(k); }
  check(seen.join() === "widths,overlay" && (await mode()) === "overlay" && (await page.evaluate(() => $("#m-widths").checked)) === w0
    && (await page.evaluate(() => $("#review-mode [aria-pressed=true]").dataset.v)) === "all",
    `holding 4 shows the whole stack grey with its widths, 5 nothing, and no key switches Vessel widths or Missed: ${seen}`);

  // req/vascular/model/view, 2026-11-18: the Show menu and the legend hold the same four toggles, a click on either
  // keeps one for both, and a held number flips its toggle over what is kept, whatever the view
  let t = await toggles();
  check(t.menu === "Model No markings Side by side 3D* 2D" && t.legend === "Model No markings Side by side 3D* 2D",
    `the Show menu and the keys legend hold the same toggles, 3D shown: ${JSON.stringify(t)}`);
  await page.evaluate(() => { $("#vm-show").open = true; });
  await page.click('#model-dim [data-v="2d"]');
  await page.evaluate(() => { $("#vm-show").open = false; });
  t = await toggles();
  check((await mode()) === "widths" && t.legend.endsWith("3D 2D*") && t.menu.endsWith("3D 2D*"), `2D clicked in the Show menu shows 2D, the legend's 3D | 2D too: ${await mode()} ${JSON.stringify(t)}`);
  await page.keyboard.down("4");
  const inverse4 = await mode(), ring4 = await ring("swap");
  await page.keyboard.up("4");
  check(inverse4 === "overlay" && ring4.held && ring4.dashed && ring4.pressed === "false" && (await mode()) === "widths",
    `with 2D kept, holding 4 shows 3D, its chip ringed and unfilled, letting go 2D again: ${inverse4} ${JSON.stringify(ring4)} → ${await mode()}`);
  await page.click("#key-side");
  t = await toggles();
  check((await mode()) === "wside" && t.menu === "Model No markings Side by side* 3D 2D*", `Side by side clicked in the legend shows in the Show menu too: ${await mode()} ${t.menu}`);
  await page.keyboard.down("3");
  const inverse3 = await mode(), ring3 = await ring("side");
  await page.keyboard.up("3");
  check(inverse3 === "widths" && ring3.held && ring3.dashed && ring3.pressed === "false" && (await mode()) === "wside",
    `with Side by side kept, holding 3 turns it off while held: ${inverse3} ${JSON.stringify(ring3)} → ${await mode()}`);
  await page.keyboard.down("1");
  const over1 = await mode();
  await page.keyboard.down("2");
  const over12 = await mode();
  await page.keyboard.up("2");
  const back1 = await mode(), ring1 = await ring("model");
  await page.keyboard.up("1");
  check(over1 === "wmodel" && over12 === "grey" && back1 === "wmodel" && ring1.held && ring1.pressed === "true" && (await mode()) === "wside",
    `held numbers apply in the order pressed over what is kept, 1 in 2D the model from straight above: ${over1} → ${over12} → ${back1} → ${await mode()}`);
  await page.evaluate(() => { $("#vm-show").open = true; });
  await page.click('#model-mode [data-v="side"]');
  const menuOff = await mode();
  await page.click('#model-dim [data-v="3d"]');
  await page.evaluate(() => { $("#vm-show").open = false; });
  check(menuOff === "widths" && (await mode()) === "overlay", `clicking an on toggle in the Show menu turns it off, as in the legend: ${menuOff} → ${await mode()}`);
  await page.click("#key-swap span:last-child");
  const half2 = await mode();
  await page.click("#key-swap span:last-child");
  const half2again = await mode();
  await page.click("#key-swap span:first-child");
  check(half2 === "widths" && half2again === "widths" && (await mode()) === "overlay", `each half of the legend's 3D | 2D shows its own view: ${half2} ${half2again} → ${await mode()}`);

  await device.close();
  await begin("Develop");
  await page.waitForFunction(() => window.vascular.tasks().key);
  // annotating, a junction to judge: its verdicts, Skip, the widths look, the views and Panning; Area is right still off
  keys = await legendKeys(page);
  check(keys === "1 2 3 4 shift", `tagging a junction, the keys legend lists only the views and Panning, F, J, S and W on their buttons or none: ${keys}`);
  const labels = Object.fromEntries((await legend(page)).map((r) => [r.key, r.label]));
  check(labels["1"] === "Model" && labels["2"] === "No markings" && labels["3"] === "Side by side", `each row says what its key does: ${JSON.stringify(labels)}`);
  await frames(page);
  const hints = await page.evaluate(() => ({ yes: $("#task-card .verdict .yes kbd")?.textContent, no: $("#task-card .verdict .no kbd")?.textContent,
    ok: $("#area-ok kbd")?.textContent, skip: $("#task-skip kbd")?.textContent }));
  check(same(hints, { yes: "F", no: "J", ok: "Space", skip: "S" }), `each button shows its key: ${JSON.stringify(hints)}`);

  // 1 held: the model alone, its row filled, as Ctrl did; let go, the lines over the stack; Ctrl does nothing now
  await page.keyboard.down("1");
  const held = await mode(), heldRow = await row("1");
  await page.keyboard.up("1");
  check(held === "model" && heldRow.lit && (await mode()) === "overlay" && !(await row("1")).lit,
    `holding 1 shows the model alone, its row filled blue, letting go the lines over the stack: ${held} → ${await mode()}`);
  await page.keyboard.down("Control");
  const ctrl = await mode();
  await page.keyboard.up("Control");
  check(ctrl === "overlay", `Ctrl no longer shows the model alone: ${ctrl}`);
  await page.click("#key-model");
  const kept = await mode();
  await page.click("#key-model");
  check(kept === "model" && (await mode()) === "overlay", `clicking the Model row keeps the model alone on, again off: ${kept} → ${await mode()}`);
  // 2 in an area: the lines hidden while it is held
  await page.keyboard.down("2");
  const bare = await mode(), bareRow = await row("2");
  await page.keyboard.up("2");
  check(bare === "image" && bareRow.lit && (await mode()) === "overlay" && !(await row("2")).lit, `holding 2 in an area hides the lines over the stack, letting go shows them: ${bare}`);

  // F: Junction, the junction found right and the next one current
  s0 = await state();
  const fKept = await press("KeyF");
  let s1 = await state();
  check(fKept && s1.checked === s0.checked + 1 && s1.key !== s0.key && (await doc()).checked_junctions.includes(+s0.key.slice(1)),
    `F gives the junction Junction's verdict, kept from the page: ${JSON.stringify([s0, s1])}`);
  // J: They cross, the junction split
  s0 = s1;
  const jKept = await press("KeyJ");
  s1 = await state();
  check(jKept && s1.junctions < s0.junctions && s1.checked === s0.checked && !(await tasks()).junctions.some((j) => j.key === s0.key),
    `J gives They cross's verdict, the junction split: ${JSON.stringify([s0, s1])}`);

  // held down, in a field, with a menu open: nothing
  s0 = s1;
  check(!(await press("KeyF", { repeat: true })) && same(await state(), s0), "F held down judges no second junction");
  check(!(await press("KeyF", { on: "#gt-areas" })) && same(await state(), s0), "F in a field does nothing");
  await page.evaluate(() => { $("#task-menu").hidden = false; $("#task-menu").open = true; });
  check(!(await press("KeyF")) && same(await state(), s0), "F with a menu open does nothing");
  await page.evaluate(() => { $("#task-menu").open = false; });

  // Space while Area is right is off, Backspace with no Back, a key of no task: nothing, left to the page
  check(await page.evaluate(() => $("#area-ok").disabled), "a junction is still to judge, so Area is right is off");
  check(!(await press("Space")) && same(await state(), s0), "Space does nothing while Area is right is off, and is left to the page");
  check(!(await press("Backspace")) && same(await state(), s0), "Backspace does nothing: these tasks have no Back");
  check(!(await press("KeyQ")) && same(await state(), s0), "a key of no task is left to the page");

  // every junction of this area judged with F, Space does it
  // a key held fills its row blue, let go it is grey again
  for (let k = 0; k < 200 && (await tasks()).key; k++) await press("KeyF");
  check(!(await page.evaluate(() => $("#area-ok").disabled)), "every junction judged by F, Area is right is on");
  keys = await legendKeys(page);
  check(keys === "1 2 3 4 shift", `no junction left, the legend still lists only the views and Panning: ${keys}`);
  s0 = await state();
  // Space on a focused button presses that button, not Area is right
  check(!(await press("Space", { on: "#task-skip" })) && same(await state(), s0), "Space on a focused button is that button's");
  const spaceKept = await press("Space");
  s1 = await state();
  check(spaceKept && s1.regions === s0.regions && s1.area === s0.area && (await tasks()).widths, `Space opens the area's widths step: ${JSON.stringify([s0, s1])}`);
  keys = await legendKeys(page);
  check(keys === "1 2 3 4 shift", `in the widths step the legend lists the same views and Panning: ${keys}`);
  await press("Space");
  s1 = await state();
  check(s1.regions === s0.regions + 1 && s1.area !== s0.area, `Space again, These widths look right, does the area and moves on: ${JSON.stringify([s0, s1])}`);

  // S: Skip, the next area
  s0 = s1;
  const skipKept = await press("KeyS");
  s1 = await state();
  check(skipKept && s1.area !== s0.area && s1.regions === s0.regions, `S skips the area: ${s0.area} → ${s1.area}`);

} catch (e) {
  failed = true; console.error(e);
}
await browser.close(); site.close();
process.exit(failed ? 1 : 0);
