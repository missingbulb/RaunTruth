// Drives req/shell/study/stage in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT
// (three images): the study file holds each of the five stages in turn, and the page's controls are held to web-tests/stage_table.json,
// the map's table transcribed: on the study's page the way to start annotating and the own-images button, on Study Setup the data
// controls, the mark buttons and the batch run are present where the table opens the action and absent where it closes it.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/stage_table_driver.mjs ANSWERS STUDIES ROOT
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { standIn } from "./stand_in_drive.mjs";
import { pressDrive } from "./drive_open.mjs";
import { personFile } from "../web/truth_folders.js";
import { aspect, aspectOf } from "./setup_page.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { w, GT, FILES, ROOT, studyFile, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const TABLE = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "stage_table.json"), "utf8"));
const Y = "y@lab.example";

// img1's one extraction, so that a mark button has a row to stand on, in its own folder of the extractions folder, both as the site makes them
const image = path.join(rootDir, "img1.png"), sha = createHash("sha256").update(fs.readFileSync(image)).digest("hex");
w.of(GT.extractions).folder(`img1__${sha.slice(0, 8)}`, { bySite: true }).holds({ name: await personFile(Y), bytes: Buffer.from(JSON.stringify({ created: "2026-11-01T10:00:00Z", tagger: Y,
  image: { name: "img1.png", sha256: sha }, labels: [{ threshold: 100, count: 7 }], marks: [{ id: "m1", x: 12, y: 12 }], checked: true })) }, { bySite: true });

// an image of the study opened the way a person does, from the study's own list in the Drive dialog
const openFromStudy = async (page, file) => {
  await pressDrive(page);
  await page.dblclick(`#remote-list .item[data-id="${FILES.find((f) => f.parent === ROOT && f.name === path.basename(file)).id}"]`);
};

const here = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].some((e) => e.checkVisibility()), sel);

for (const [k, stage] of TABLE.stages.entries()) {
  studyFile({ stage });
  const want = (action) => TABLE.actions[action].open[k];
  const where = (page) => Object.entries(TABLE.actions).filter(([, a]) => a.control?.page === page);

  // the study's page: the image from the study's folder open, the way to annotate it and the button for one's own image
  let page = await open(true);
  await check(await page.evaluate((s) => document.documentElement.dataset.stage === s, stage), `${stage}: the page knows the study is in ${stage}, from its study file`, await page.evaluate(() => document.documentElement.dataset.stage));
  for (const [action, a] of where("main").filter(([, x]) => !x.control.after)) {
    await check(await here(page, a.control.selector) === want(action), `${stage}: ${action} is ${want(action) ? "open" : "closed"}: ${a.control.selector} is ${want(action) ? "there" : "not there"}`);
  }
  await openFromStudy(page, image);
  await page.waitForFunction(() => st.fileName === "img1.png" && !!window.shellForTests?.page.get("image") && /^Image loaded/.test($("#status").textContent));
  // where annotating is open the choice of how to start waits for the lookup of the image's annotations; where it is closed there is nothing to wait for
  if (want("annotate")) await page.waitForSelector("#annotate-load", { state: "visible" });
  else await page.waitForFunction(() => document.querySelector("#busy").hidden);
  for (const [action, a] of where("main").filter(([, x]) => x.control.after)) {
    await check(await here(page, a.control.selector) === want(action), `${stage}: ${action} is ${want(action) ? "open" : "closed"}: ${a.control.selector} is ${want(action) ? "there" : "not there"}`);
  }
  await page.context().close();

  // Study Setup: a folder and then an image chosen
  page = await open(true, { setup: true });
  await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
  await page.waitForSelector("#data-add", { state: "attached" });
  await check(await here(page, "#data-col"), `${stage}: Study Setup opens whatever the stage, its stage, sharing and people there`);
  await check(await here(page, "#stage-box"), `${stage}: the stage box shows`);
  await page.click("#data-tree .tree-folder .name");
  await page.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length === 3 && !document.querySelector("#batch-box").hidden);
  const holds = async (a, action) => check((await aspectOf(page, a.control.selector), await here(page, a.control.selector)) === want(action), `${stage}: ${action} is ${want(action) ? "open" : "closed"}: ${a.control.selector} is ${want(action) ? "there" : "not there"}`);
  for (const [action, a] of where("setup").filter(([, x]) => !x.control.after)) await holds(a, action);
  await aspect(page, "images");
  await page.click('#folder-items .cell:has(.name:text-is("img1.png")) .name');
  await page.waitForFunction(() => document.querySelectorAll("#marks-list .mark-row").length === 1);
  for (const [action, a] of where("setup").filter(([, x]) => x.control.after)) await holds(a, action);
  // the tree's own way of taking a folder out of the study, a data action too
  await check(await here(page, "#data-tree .unlist") === want("setup-data"), `${stage}: setup-data: a folder's remove button follows it`);
  await page.context().close();
}
await done(0);
