// Drives req/setup/batch in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT
// (three images) and the stand-in worker answering from ANSWERS: the owner on Study Setup selects images of a folder and acts on the
// selection. Run analysis gives each an Analysis File at the default algorithm's version, a rerun writes none, a token run out holds
// the run until the next click, and Mark official marks each image the run reached, Undo taking the marks off; Hide tags them hidden
// and Request GT marks each as needing ground truth.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_batch_driver.mjs ANSWERS STUDIES ROOT
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { expecting } from "./harness.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
// armed: the first run file Drive takes is the last the token lasts for: before Drive's next listing is answered the clock is put on
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
  .catch(async (e) => { throw new Error(`${String(e.message).split("\n")[0]}; the bar said: ${await said(p)} / ${await p.evaluate(() => document.querySelector("#batch-run").outerHTML + document.querySelector("#batch-bar").hidden)}`); });
const clock = (ctx) => ctx.addInitScript(() => { const now = Date.now.bind(Date); window.skew = 0; Date.now = () => now() + window.skew; });
const folder = async (p) => {
  await p.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
  await p.click("#data-tree .tree-folder .name");
  await p.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length === 3 && /of 3 selected/.test(document.querySelector("#batch-for").textContent));
};
const pick = (n) => `#folder-items .cell:has(.name:text-is("${n}")) .pick`;
const selected = (p, n) => p.waitForFunction((k) => document.querySelector("#batch-for").textContent.startsWith(`${k} of 3 selected`), n);
const status = (p) => p.textContent("#status");

// the folder chosen: a checkbox on each image, nothing selected, no bar of actions, no algorithm to choose, no aspect of its own
page = await open(true, { setup: true, prepare: clock });
await folder(page);
const first = await page.evaluate(() => ({ picks: document.querySelectorAll("#folder-items .cell .pick").length, bar: document.querySelector("#batch-bar").hidden,
  algorithm: !!document.querySelector("#batch-algorithm"), rail: !!document.querySelector('#setup-rail [data-aspect="batch"]'), says: document.querySelector("#batch-for").textContent }));
await check(first.picks === 3 && first.bar && !first.algorithm && !first.rail && /^0 of 3 selected/.test(first.says),
  "the folder's images each have a checkbox, none selected, no actions yet, no algorithm to choose and no aspect of its own", first);

// one image selected and run: its Analysis File alone, at the study's default algorithm, its result listed from the run
await page.click(pick("img2.png"));
await selected(page, 1);
await check(!(await page.evaluate(() => document.querySelector("#batch-bar").hidden)), "a selection shows the actions");
await page.click("#batch-run");
await finished(page, /^Done: 1 image run\./);
await check(runFiles().length === 1 && FILES.find((g) => g.id === runFiles()[0].parent).name.startsWith("img2__"), "one image selected, one Analysis File: that image's", runFiles().map((f) => f.name));
const listed = await page.evaluate(() => [...document.querySelectorAll("#batch-results li")].map((l) => l.textContent));
await check(listed.length === 1 && /^img2\.png/.test(listed[0]) && /Pixels counted: \d+/.test(listed[0]), "the run's result is listed for the image, the study's measure read from the run", listed);
await check(/Mark it official to see it in Results/.test(await said(page)), "and the bar says to mark it official to see it in Results", await said(page));
const asked = drive.calls.length;

// Results, before any mark: what was run and not marked, and the way back to it
await page.click('#setup-rail [data-aspect="results"]');
const pending = await page.evaluate(() => ({ text: document.querySelector("#results-pending").textContent, hidden: document.querySelector("#results-pending").hidden }));
await check(!pending.hidden && /^1 image was run but not marked official/.test(pending.text), "Results says how many images were run but not marked official", pending);
await check(drive.calls.length === asked, "... from what the page knows, asking the store nothing", drive.calls.slice(asked));
await page.click("#results-to-images");
await check(await page.evaluate(() => document.querySelector("#setup-aspect").dataset.aspect === "images" && !document.querySelector("#batch-bar").hidden), "and its link goes back to the images, the selection as it was");

// the three selected and run: an Analysis File each, named for the default algorithm and the version; the one done is skipped
await page.click("#batch-all");
await selected(page, 3);
await check(await page.evaluate(() => [...document.querySelectorAll("#folder-items .pick")].every((b) => b.checked)), "Select all selects them, their checkboxes ticked");
await page.click("#batch-run");
await finished(page, /^Done/);
const made = runFiles();
await check(made.length === 3, "the run wrote three Analysis Files", made.map((f) => f.name));
await check(made.every((f) => f.name === "run_above__standin0.json"), "each file is named for the study's default algorithm and the version", made.map((f) => f.name));
const parents = made.map((f) => FILES.find((g) => g.id === f.parent));
await check(names.every((n) => parents.some((p) => p.name === `${n.replace(/\.[^.]*$/, "")}__${shaOf(n).slice(0, 8)}` && p.parent === GT.extractions)), "each is in its image's subfolder of the Analysis folder", parents.map((p) => p.name));
const read = (n) => JSON.parse(made.find((f) => FILES.find((g) => g.id === f.parent).name.startsWith(n.replace(/\.[^.]*$/, "") + "__")).bytes.toString());
const doc = read(names[0]);
await check(doc.image.sha256 === shaOf(names[0]) && doc.tagger === undefined && doc.history.actions.some((a) => a.type === "run" && a.algorithm.key === "above"),
  "a file holds the image's SHA, the run as the log keeps it and no person's name", { image: doc.image, tagger: doc.tagger, actions: doc.history.actions.map((a) => a.type) });
await check(/^Done: 2 images run, 1 image already had it/.test(await said(page)), "the bar says how many ran and how many it skipped", await said(page));
const rows = await page.evaluate(() => [...document.querySelectorAll("#batch-results li")].map((l) => l.textContent));
await check(rows.length === 3 && rows.filter((r) => /already had one/.test(r)).length === 1 && rows.filter((r) => /Pixels counted: \d+/.test(r)).length === 2,
  "each image the run reached is listed: its result, or that it already had one", rows);

// again: every image already has one at that version, so nothing is written
const wrote = drive.writes.length;
await page.click("#batch-run");
await finished(page, /^Done: 0 images run, 3 images already had it/);
await check(drive.writes.length === wrote, "a rerun writes nothing: the images done are skipped", drive.writes.slice(wrote));

// Mark official: each image the run reached, in one write; then Undo takes the marks off, in one
const before = drive.writes.length;
await page.click("#batch-official");
await page.waitForFunction(() => /^Marked 3 images official/.test(document.querySelector("#batch-msg").textContent));
const official = () => Object.fromEntries(Object.entries(study().marks || {}).map(([sha, m]) => [sha, m.official?.file]));
await check(names.every((n) => official()[shaOf(n)] === made.find((f) => FILES.find((g) => g.id === f.parent).name.startsWith(n.replace(/\.[^.]*$/, "") + "__")).id),
  "each image's official mark names its run's file", official());
await check(names.every((n) => study().marks[shaOf(n)].official.by === null), "a run's mark names no author", study().marks);
await check(drive.writes.length === before + 1, "... in one write", drive.writes.slice(before));
await check(/^Marked 3 images official in the study\./.test(await status(page)), "and the status line says so", await status(page));
await check((await page.textContent("#batch-official")) === "Official ✓ · Undo", "the button then offers to undo it", await page.textContent("#batch-official"));
await page.click("#batch-official");
await page.waitForFunction(() => document.querySelector("#batch-official").textContent === "Mark official");
await check(names.every((n) => !official()[shaOf(n)]) && drive.writes.length === before + 2, "Undo takes the three marks off, in one write", { marks: official(), writes: drive.writes.slice(before) });
await page.context().close();

// the token runs out after the first: the run is held, the next click goes on with the other two
for (const f of runFiles()) FILES.splice(FILES.indexOf(f), 1);
armed = true;
page = await open(true, { setup: true, prepare: clock });
await folder(page);
await expecting(/sign-in has run out|popup_failed_to_open/, async () => {
  await page.click("#batch-all");
  await page.click("#batch-run");
  await finished(page, /sign-in ran out/);
  await check(runFiles().length === 1 && /held \(1 image run\)/.test(await said(page)), "with the token run out after one image, the run holds with one file written", { files: runFiles().length, said: await said(page) });
  await check(await page.evaluate(() => document.querySelector("#batch-run").textContent === "Run analysis" && !document.querySelector("#batch-run").disabled), "and Run analysis is there for the next click");
  google.answer = "grant";
  await page.evaluate(() => { window.skew = 0; });
  await page.click("#batch-run");
  await finished(page, /^Done/);
  await check(runFiles().length === 3 && /2 images run, 1 image already had it/.test(await said(page)), "the next click goes on: the other two follow, the first is not run again", { files: runFiles().length, said: await said(page) });
}, { maybe: true });

// Select all again unselects
await page.click("#batch-all");
await selected(page, 0);
await check(await page.evaluate(() => [...document.querySelectorAll("#folder-items .pick")].every((b) => !b.checked)), "Select all again unselects every image");

// Request GT: each selected image marked as needing ground truth, a file each in the Analysis folder
const markers = () => FILES.filter((f) => f.parent === GT.extractions && /\.needs_gt$/.test(f.name)).map((f) => f.name).sort();
await page.click(pick("img1.png")); await page.click(pick("img3.png"));
await selected(page, 2);
await page.click("#batch-gt");
await page.waitForFunction(() => /^Requested ground truth for 2 images\./.test(document.querySelector("#status").textContent));
await check(markers().length === 2 && markers().every((m) => /^img[13]__/.test(m)), "Request GT marks each selected image as needing ground truth", markers());
await page.waitForFunction(() => document.querySelectorAll('#folder-items .mark-gt[aria-pressed="true"]').length === 2);
const requested = await page.evaluate(() => [...document.querySelectorAll("#folder-items .cell")].map((c) => `${c.querySelector(".name").textContent}: ${c.querySelector(".mark-gt").textContent}`));
await check(requested.join("|") === "img1.png: GT requested|img2.png: Request GT|img3.png: GT requested", "their buttons read GT requested, the other's Request GT", requested);

// Hide: each selected image tagged hidden, and hidden a tag that hides
await page.waitForFunction(() => document.querySelector("#batch-for").textContent.startsWith("0 of 3 selected"));
await page.click(pick("img2.png"));
await selected(page, 1);
await page.click("#batch-hide");
await page.waitForFunction(() => /^Hid 1 image from the study\./.test(document.querySelector("#status").textContent));
const kept = study(), img2 = FILES.find((f) => f.name === "img2.png").id;
await check((kept.hide || []).includes("hidden") && (kept.tags?.images?.[img2]?.tags || []).includes("hidden") && Object.keys(kept.tags?.images || {}).length === 1,
  "Hide tags the selected image hidden, and hidden becomes a tag that hides", { hide: kept.hide, tags: kept.tags });
const tagged = await page.waitForFunction(() => /hidden/.test(document.querySelector('#folder-items .cell:nth-of-type(2) .tags')?.textContent || ""), null, { timeout: 5000 }).then(() => true, () => false);
await check(tagged, "its cell shows the tag, once the folder is drawn again", await page.evaluate(() => document.querySelector("#folder-items").textContent));
await done(0);
