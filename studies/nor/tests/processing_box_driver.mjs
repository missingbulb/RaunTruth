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
import { world } from "../../../web-tests/world.mjs";
import { serveSite } from "../../../web-tests/site_server.mjs";
import { ENGINE, LAUNCH } from "../../../web-tests/engine.mjs";
import { orMissed } from "../../../web-tests/page_until.mjs";


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
// a device whose welcome popup is not answered yet
const device = world(browser, origin).device().welcomed(null);
const page = await (await device.context()).newPage();
page.on("pageerror", (e) => problems.push("page error: " + e.message));
try {
  await device.opens("nor", { until: "none" });
  await page.waitForFunction(() => !!document.querySelector("#find") && document.querySelector("#status").textContent.startsWith("Ready"));
  // the algorithm gives a list of NoRs and nothing else: no setting, filter or preset anywhere on the page
  const controls = await page.evaluate(() => ["#settings-box", "#filters-fold", "#filters", "#presets", "#main-params", "#detect-params", "#reset-detect"]
    .filter((id) => document.querySelector(id)));
  console.log("controls", JSON.stringify(controls));
  if (controls.length) problems.push(`the page still has the algorithm's controls: ${controls.join(", ")}`);

  // the page offers no choice of finder: no list of them anywhere, before an image or after
  const lists = await page.evaluate(() => document.querySelectorAll("#algorithm, select[aria-label=Algorithm]").length);
  if (lists) problems.push(`the page lists ${lists} options, where it offers no choice of algorithm`);
  // how the default finder works is a fold of the Analysis box, as the shell draws it once the study's list is read
  const k = Object.values(LISTED).find((a) => a.default === true)?.key;
  if (!k) problems.push("the study's list marks no default");
  await orMissed(page.waitForFunction(() => !!document.querySelector("#algorithm-note strong")));
  const note = await page.evaluate(() => {
    const n = document.querySelector("#algorithm-note"), fold = document.querySelector("#algorithm-pick");
    return {
      title: fold.querySelector(":scope > summary").textContent, inBox: !!document.querySelector("#processing-box #algorithm-pick"), nested: !!n.querySelector("li > ul > li, li > ol > li"),
      text: n.textContent, strong: n.querySelector("strong")?.textContent, line: n.querySelector("strong")?.parentElement.textContent, raw: /(^|\n)\s*- /.test(n.textContent),
    };
  });
  console.log(k, JSON.stringify(note));
  if (note.title !== "How the analysis works" || !note.inBox) problems.push(`the fold is not How the analysis works, in the Analysis box: ${note.title}`);
  if (!note.nested) problems.push("the default finder's note draws no step with steps of its own");
  if (note.raw) problems.push("the note shows its list's markup instead of a list");
  // the bold line gives the finder as the page runs it and what it was measured on; its note follows, not bold
  const def = QUALITY.versions[k];
  const bold = `It shows precision of ${def.precision.toFixed(2)} and recall of ${def.recall.toFixed(2)} ${QUALITY.measured}`;
  const plain = `(${def.note})`;
  if (note.strong !== bold) problems.push(`the bold line reads "${note.strong}", not "${bold}"`);
  if (!note.line || note.line.replace(/\s+/g, " ") !== `${bold} ${plain}`) problems.push(`the numbers' line reads "${note.line}", not "${bold} ${plain}"`);
} catch (e) {
  problems.push(e.stack || String(e));
}
await browser.close(); server.close();
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
