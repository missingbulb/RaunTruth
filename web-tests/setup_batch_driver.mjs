// Drives req/setup/batch in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT
// (three images) and the stand-in worker answering from ANSWERS: the owner on Study Setup runs the chosen algorithm over the chosen
// images, each gets an extraction at that version, a rerun writes none, a token run out holds the batch until the next click, and
// "Mark this batch official" marks each image the batch reached.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_batch_driver.mjs ANSWERS STUDIES ROOT
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { expecting } from "./harness.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
// armed: the first batch file Drive takes is the last the token lasts for: before Drive's next listing is answered the clock is put on
// and Google's window cannot open without a click to renew it
let armed = false, expiring = false, page = null;
const { drive, google, ROOT, FILES, GT, open, check, done } = await standIn({ answers, studies, rootDir,
  uploaded: (f) => { if (armed && /^run_/.test(f.name)) { armed = false; expiring = true; } } });
drive.hold = async (call) => {
  if (!expiring || call.kind !== "list") return;
  expiring = false;
  google.answer = "blocked";
  await page.evaluate(() => { window.skew = 2 * 3600 * 1000; });
};

const names = fs.readdirSync(rootDir).filter((n) => n.endsWith(".png")).sort();
const shaOf = (n) => createHash("sha256").update(fs.readFileSync(path.join(rootDir, n))).digest("hex");
const runFiles = () => FILES.filter((f) => !f.folder && /^run_/.test(f.name));
const study = () => JSON.parse(FILES.find((f) => f.parent === ROOT && f.name === "rauntruth-study.json").bytes.toString());
const said = (p) => p.evaluate(() => document.querySelector("#batch-msg").textContent);
const finished = (p, re) => p.waitForFunction((s) => new RegExp(s).test(document.querySelector("#batch-msg").textContent) && !document.querySelector("#batch-run").textContent.startsWith("Stop"), re.source)
  .catch(async (e) => { throw new Error(`${String(e.message).split("\n")[0]}; the box said: ${await said(p)} / ${await p.evaluate(() => document.querySelector("#batch-run").outerHTML + document.querySelector("#batch-box").hidden)}`); });
const clock = (ctx) => ctx.addInitScript(() => { const now = Date.now.bind(Date); window.skew = 0; Date.now = () => now() + window.skew; });
const folder = async (p) => {
  await p.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
  await p.click("#data-tree .tree-folder .name");
  await p.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length === 3 && !document.querySelector("#batch-box").hidden);
};

// the folder chosen: the batch box, the study's algorithms, nothing chosen to run on
page = await open(true, { setup: true, prepare: clock });
await folder(page);
const box = await page.evaluate(() => ({ algorithms: [...document.querySelectorAll("#batch-algorithm option")].map((o) => o.value), run: document.querySelector("#batch-run").disabled,
  picks: document.querySelectorAll("#folder-items .cell .pick").length }));
await check(box.algorithms.join() === "above,from" && box.run && box.picks === 3, "the folder's cells each have a checkbox, the box lists the study's algorithms, and Run waits for a choice", box);

// one image chosen and run: its extraction alone
await page.click('#folder-items .cell:has(.name:text-is("img2.png")) .pick');
await page.waitForFunction(() => /1 image chosen/.test(document.querySelector("#batch-for").textContent) && !document.querySelector("#batch-run").disabled);
await page.click("#batch-run");
await finished(page, /^Done: 1 image run\./);
await check(runFiles().length === 1 && FILES.find((g) => g.id === runFiles()[0].parent).name.startsWith("img2__"), "one image chosen, one extraction: that image's", runFiles().map((f) => f.name));

// the three chosen and run: an extraction each, named for the algorithm and the version, from the study's first step; the one done is skipped
await page.click("#batch-all");
await page.waitForFunction(() => !document.querySelector("#batch-run").disabled && /3 images chosen/.test(document.querySelector("#batch-for").textContent));
await check(await page.evaluate(() => [...document.querySelectorAll("#folder-items .pick")].every((b) => b.checked)), "Choose all chooses them, their checkboxes ticked, and Run is ready");
await page.click("#batch-run");
await finished(page, /^Done/);
const made = runFiles();
await check(made.length === 3, "the batch wrote three extractions", made.map((f) => f.name));
await check(made.every((f) => f.name === "run_above__standin0.json"), "each file is named for the algorithm and the version", made.map((f) => f.name));
const parents = made.map((f) => FILES.find((g) => g.id === f.parent));
await check(names.every((n) => parents.some((p) => p.name === `${n.replace(/\.[^.]*$/, "")}__${shaOf(n).slice(0, 8)}` && p.parent === GT.extractions)), "each is in its image's subfolder of the extractions folder", parents.map((p) => p.name));
const read = (n) => JSON.parse(made.find((f) => FILES.find((g) => g.id === f.parent).name.startsWith(n.replace(/\.[^.]*$/, "") + "__")).bytes.toString());
const first = read(names[0]);
await check(first.image.sha256 === shaOf(names[0]) && first.tagger === undefined && first.history.actions.some((a) => a.type === "run" && a.algorithm.key === "above"),
  "a file holds the image's SHA, the run as the log keeps it and no person's name", { image: first.image, tagger: first.tagger, actions: first.history.actions.map((a) => a.type) });
await check(/^Done: 2 images run, 1 image already had it/.test(await said(page)), "the box says how many ran and how many it skipped", await said(page));

// again: every image already has one at that version, so nothing is written
const wrote = drive.writes.length;
await page.click("#batch-run");
await finished(page, /^Done: 0 images run, 3 images already had it/);
await check(drive.writes.length === wrote, "a rerun writes nothing: the images done are skipped", drive.writes.slice(wrote));

// Mark this batch official: each image the batch reached
await page.click("#batch-official");
await page.waitForFunction(() => /^Marked 3 images official/.test(document.querySelector("#batch-msg").textContent));
const official = Object.fromEntries(Object.entries(study().marks).map(([sha, m]) => [sha, m.official?.file]));
await check(names.every((n) => official[shaOf(n)] === made.find((f) => FILES.find((g) => g.id === f.parent).name.startsWith(n.replace(/\.[^.]*$/, "") + "__")).id),
  "each image's official mark names its batch file", official);
await check(names.every((n) => study().marks[shaOf(n)].official.by === null), "a batch's mark names no author", study().marks);
await page.context().close();

// the token runs out after the first: the batch is held, the next click goes on with the other two
for (const f of runFiles()) FILES.splice(FILES.indexOf(f), 1);
armed = true;
page = await open(true, { setup: true, prepare: clock });
await folder(page);
await expecting(/sign-in has run out|popup_failed_to_open/, async () => {
  await page.click("#batch-all");
  await page.click("#batch-run");
  await finished(page, /sign-in ran out/);
  await check(runFiles().length === 1 && /held \(1 image run\)/.test(await said(page)), "with the token run out after one image, the batch holds with one file written", { files: runFiles().length, said: await said(page) });
  await check(await page.evaluate(() => document.querySelector("#batch-run").textContent === "Run" && !document.querySelector("#batch-run").disabled), "and Run is there for the next click");
  google.answer = "grant";
  await page.evaluate(() => { window.skew = 0; });
  await page.click("#batch-run");
  await finished(page, /^Done/);
  await check(runFiles().length === 3 && /2 images run, 1 image already had it/.test(await said(page)), "the next click goes on: the other two follow, the first is not run again", { files: runFiles().length, said: await said(page) });
}, { maybe: true });

// Choose all again unchooses
await page.click("#batch-all");
await page.waitForFunction(() => document.querySelector("#batch-run").disabled);
await check(await page.evaluate(() => [...document.querySelectorAll("#folder-items .pick")].every((b) => !b.checked)), "Choose all again unchooses every image, and Run waits");
await done(0);
