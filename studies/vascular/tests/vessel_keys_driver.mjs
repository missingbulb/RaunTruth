// Drives the vascular study's page in a GT stage (web/) in headless Chromium against a stand-in worker
// (stand_in.mjs) whose Execute answers with a model fixture, over a drawn stack. Checks req/vascular/truth/keys: F and J
// judge the area's junction as Junction and They cross do, Space does the area once Area is right is on, S skips it,
// each button showing its key; no key acts out of tagging, typing in a field, with a menu open, held down, or when its
// button is off, and a key that did not act is left to the page. Exits 1 on a failed check, 2 when it cannot run.
//   node studies/vascular/tests/vessel_keys_driver.mjs STUDIES
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { offSite } from "../../../web-tests/off_site.mjs";
import { ENGINE, LAUNCH } from "../../../web-tests/engine.mjs";
import { asTagger } from "../../../web-tests/tagger.mjs";
import { serve, drawnStack } from "./stand_in.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..", "..", "..");
const [studies] = process.argv.slice(2);
const model = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cd31_frontal_x20_r_1_slices1-12.vessels.json"), "utf8"));
const site = await serve(repo, studies, model, "GT");

const browser = await pw[ENGINE].launch(LAUNCH);
let failed = false;
const check = (ok, what) => { if (!ok) { failed = true; console.error("FAILED: " + what); } else console.log("ok: " + what); };
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await asTagger(ctx);
await ctx.route(offSite(site.origin), (r) => r.abort());
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
await standInDrive(ctx);
const page = await ctx.newPage();
page.on("pageerror", (e) => { failed = true; console.error("page error: " + e.message); });
page.setDefaultTimeout(10000);

const tasks = () => page.evaluate(() => window.vascular.tasks());
const doc = () => page.evaluate(() => window.vascular.model().model);
// a key pressed where the page hears it, on the element given or the page: whether the page kept it to itself
const press = (code, { on = null, repeat = false } = {}) => page.evaluate(({ code, on, repeat }) => {
  const key = { Space: " ", Backspace: "Backspace" }[code] || code.replace(/^Key/, "").toLowerCase();
  const e = new KeyboardEvent("keydown", { code, key, repeat, bubbles: true, cancelable: true });
  (on ? document.querySelector(on) : document.body).dispatchEvent(e);
  return e.defaultPrevented;
}, { code, on, repeat });
const state = async () => { const t = await tasks(), m = await doc(); return { area: t.area, key: t.key, junctions: t.junctions.length,
  checked: (m.checked_junctions || []).length, regions: (m.reviewed_regions || []).length, nodes: m.nodes.length }; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  await page.goto(site.origin + "/web/vascular");
  await page.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  await openFromDrive(page, { name: model.source, mimeType: "image/tiff", buffer: drawnStack(model) });
  await page.waitForFunction(() => !$("#vm-run").disabled);
  await page.evaluate(() => { $("#notice").hidden = true; });
  await page.click("#vm-run");
  await page.waitForFunction(() => !$("#model-on").hidden);

  // out of tagging no key acts
  let s0 = await state();
  const outF = await press("KeyF");
  check(!outF && same(await state(), s0), "out of GT tagging F does nothing and is left to the page");

  await page.click("#gt-start");
  await page.waitForFunction(() => window.vascular.tasks().key);
  const hints = await page.evaluate(() => ({ yes: $("#task-card .verdict .yes kbd")?.textContent, no: $("#task-card .verdict .no kbd")?.textContent,
    ok: $("#area-ok kbd")?.textContent, skip: $("#task-skip kbd")?.textContent }));
  check(same(hints, { yes: "F", no: "J", ok: "Space", skip: "S" }), `each button shows its key: ${JSON.stringify(hints)}`);

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
  check(!(await press("KeyF", { on: "#area-grid" })) && same(await state(), s0), "F in a field does nothing");
  await page.evaluate(() => { $("#task-menu").hidden = false; $("#task-menu").open = true; });
  check(!(await press("KeyF")) && same(await state(), s0), "F with a menu open does nothing");
  await page.evaluate(() => { $("#task-menu").open = false; });

  // Space while Area is right is off, Backspace with no Back, a key of no task: nothing, left to the page
  check(await page.evaluate(() => $("#area-ok").disabled), "a junction is still to judge, so Area is right is off");
  check(!(await press("Space")) && same(await state(), s0), "Space does nothing while Area is right is off, and is left to the page");
  check(!(await press("Backspace")) && same(await state(), s0), "Backspace does nothing: these tasks have no Back");
  check(!(await press("KeyQ")) && same(await state(), s0), "a key of no task is left to the page");

  // every junction of this area judged with F, Space does it
  for (let k = 0; k < 200 && (await tasks()).key; k++) await press("KeyF");
  check(!(await page.evaluate(() => $("#area-ok").disabled)), "every junction judged by F, Area is right is on");
  s0 = await state();
  // Space on a focused button presses that button, not Area is right
  check(!(await press("Space", { on: "#task-skip" })) && same(await state(), s0), "Space on a focused button is that button's");
  const spaceKept = await press("Space");
  s1 = await state();
  check(spaceKept && s1.regions === s0.regions + 1 && s1.area !== s0.area, `Space does the area and moves on: ${JSON.stringify([s0, s1])}`);

  // S: Skip, the next area
  s0 = s1;
  const skipKept = await press("KeyS");
  s1 = await state();
  check(skipKept && s1.area !== s0.area && s1.regions === s0.regions, `S skips the area: ${s0.area} → ${s1.area}`);

  // stopped, no key acts
  await page.click("#gt-start");
  s0 = await state();
  check(!(await press("KeyS")) && same(await state(), s0), "after Stop tagging S does nothing");
} catch (e) {
  failed = true; console.error(e);
}
await browser.close(); site.close();
process.exit(failed ? 1 : 0);
