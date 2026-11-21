// Drives the page (web/) in headless Chromium with a stand-in worker that answers only the study's ready() (READY,
// written by tests/test_processing_box.py), and checks the Processing box before any image: its algorithm note starts
// folded, and it holds no setting, filter or preset; each finder in the list carries its icon; the note's title names the chosen
// algorithm, its explanation is drawn as a nested list of steps, and it gives in bold its precision and recall as the
// page runs it, as the list shows them, with the metrics' note after them, not bold. Prints what it saw; exits 1 on a failure, 2
// when it cannot run.
//   node tests/processing_box_driver.mjs READY
import { EARLY } from "../../../web-tests/early_messages.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { pw, launch } from "../../../web-tests/harness.mjs";
import { serveSite } from "../../../web-tests/site_server.mjs";
import { ENGINE, LAUNCH } from "../../../web-tests/engine.mjs";
import { orMissed } from "../../../web-tests/page_until.mjs";
import { STEP } from "../../../web-tests/deadlines.mjs";

const [ready] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const READY = JSON.parse(fs.readFileSync(ready, "utf8"));
const QUALITY = JSON.parse(fs.readFileSync(path.join(repo, "studies", "nor", "web", "algorithm_metrics.json"), "utf8"));
// the study's list of finders, as data: each one's name and icon
const LISTED = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(repo, "studies", "nor", "web", "algorithms.json"), "utf8")).map((a) => [a.key, a]));

const STAND_IN = `postMessage({ type: "ready", info: ${JSON.stringify(READY)}, secs: 0 });`;
const { origin, server } = await serveSite({ "/web/worker.js": () => EARLY + STAND_IN });

const browser = await launch(pw);
const problems = [];
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
const page = await ctx.newPage();
page.on("pageerror", (e) => problems.push("page error: " + e.message));
page.setDefaultTimeout(STEP);
try {
  await page.goto(origin + "/web/index.html?study=nor");
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  // the list's numbers arrive with the study's measured quality
  await page.waitForFunction(() => /\(P\s/.test(document.querySelector("#algorithm").options[0].textContent));
  const folds = await page.evaluate(() => ({ about: document.querySelector("#algorithm-about").open }));
  console.log("folds", JSON.stringify(folds));
  if (folds.about) problems.push("the algorithm's note starts open");
  // the algorithm gives a list of NoRs and nothing else: no setting, filter or preset anywhere on the page
  const controls = await page.evaluate(() => ["#settings-box", "#filters-fold", "#filters", "#presets", "#main-params", "#detect-params", "#reset-detect"]
    .filter((id) => document.querySelector(id)));
  console.log("controls", JSON.stringify(controls));
  if (controls.length) problems.push(`the page still has the algorithm's controls: ${controls.join(", ")}`);

  const options = await page.evaluate(() => [...document.querySelector("#algorithm").options].map((o) => [o.value, o.textContent]));
  console.log("options", JSON.stringify(options));
  if (options.length !== Object.keys(LISTED).length) problems.push(`the list shows ${options.length} of ${Object.keys(LISTED).length} finders`);
  let nested = 0;
  for (const [k, text] of options) {
    const icon = LISTED[k].icon;
    if (!icon || !text.startsWith(icon + " " + LISTED[k].title)) problems.push(`${k} in the list does not start with its icon: ${text}`);
    // the box is folded until an image opens, so the choice is made as the list would make it
    await page.evaluate((k) => { const s = document.querySelector("#algorithm"); s.value = k; s.dispatchEvent(new Event("change")); }, k);
    await orMissed(page.waitForFunction((n) => document.querySelector("#algorithm-about summary").textContent.includes(n) && document.querySelector("#algorithm-note strong"), LISTED[k].title));
    const note = await page.evaluate(() => {
      const n = document.querySelector("#algorithm-note"), sel = document.querySelector("#algorithm");
      return {
        title: document.querySelector("#algorithm-about summary").textContent, nested: !!n.querySelector("li > ul > li, li > ol > li"),
        text: n.textContent, strong: n.querySelector("strong")?.textContent, line: n.querySelector("strong")?.parentElement.textContent, raw: /(^|\n)\s*- /.test(n.innerText), option: sel.selectedOptions[0].textContent,
      };
    });
    console.log(k, JSON.stringify(note));
    if (note.nested) nested++;
    if (note.title !== `How the ${LISTED[k].title} algorithm works`) problems.push(`${k}: the note's title does not name the algorithm: ${note.title}`);
    if (note.raw) problems.push(`${k}: the note shows its list's markup instead of a list`);
    // the bold line gives the finder as the page runs it, as the list does, and what it was measured on; its note follows, not bold
    const def = QUALITY.versions[k];
    const [, lp, lr] = note.option.match(/\(P\s(\.\d+)\s·\sR\s(\.\d+)\)/) || [];
    if (+lp !== +def.precision.toFixed(2) || +lr !== +def.recall.toFixed(2)) problems.push(`${k}: the list's ${lp}, ${lr} are not its default's ${def.precision}, ${def.recall}`);
    const name = LISTED[k].title[0].toUpperCase() + LISTED[k].title.slice(1);
    const bold = `${name} algorithm shows precision of ${def.precision.toFixed(2)} and recall of ${def.recall.toFixed(2)} ${QUALITY.measured}`;
    const plain = `(${def.note})`;
    if (note.strong !== bold) problems.push(`${k}: the bold line reads "${note.strong}", not "${bold}"`);
    if (!note.line || note.line.replace(/\s+/g, " ") !== `${bold} ${plain}`) problems.push(`${k}: the numbers' line reads "${note.line}", not "${bold} ${plain}"`);
  }
  if (!nested) problems.push("no finder's note draws a step with steps of its own");
} catch (e) {
  problems.push(e.stack || String(e));
}
await browser.close(); server.close();
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
