// Drives req/setup/marks in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT:
// the owner on Study Setup marks an image's extractions GT and official; the study file holds {file, by} for each, a mark follows
// its file's latest content (the main app shows it), one GT mark and one official mark per image, a mark taken off.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_marks_driver.mjs ANSWERS STUDIES ROOT
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { pressDrive } from "./drive_open.mjs";
import { until } from "./page_until.mjs";
import { loadStored } from "./annotating.mjs";
import { personFile } from "../web/truth_folders.js";

const [answers, studies, rootDir] = process.argv.slice(2);
const { w, root, ROOT, FILES, GT, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const Y = "y@lab.example", Z = "z@lab.example";

// IMAGE's extractions, as the page's own saves make them: y's and z's, each a count of its own
const image = path.join(rootDir, "img1.png"), bytes = fs.readFileSync(image), sha = createHash("sha256").update(bytes).digest("hex");
const sub = w.of(GT.extractions).folder(`img1__${sha.slice(0, 8)}`, { bySite: true });
const doc = (who, count) => Buffer.from(JSON.stringify({ created: "2026-11-01T10:00:00Z", tagger: who, image: { name: "img1.png", sha256: sha },
  labels: [{ threshold: 100, count }], marks: [{ id: "m1", x: 12, y: 12 }], checked: true }));
const yFile = sub.holds({ name: await personFile(Y), bytes: doc(Y, 7) }, { bySite: true });
const zFile = sub.holds({ name: await personFile(Z), bytes: doc(Z, 5) }, { bySite: true });
const marks = () => root.study().marks?.[sha] ?? null;
const pressed = (page, file, kind) => page.evaluate(([f, k]) => document.querySelector(`#marks-list .mark-row[data-id="${f}"] button[data-kind="${k}"]`)?.getAttribute("aria-pressed") === "true", [file, kind]);
const rowsOf = (page) => page.evaluate(() => [...document.querySelectorAll("#marks-list .mark-row")].map((r) => r.dataset.id));
const press = async (page, file, kind) => {
  await page.evaluate(() => { document.querySelector("#marks-msg").textContent = ""; });
  await page.click(`#marks-list .mark-row[data-id="${file}"] button[data-kind="${kind}"]`);
  await check(await page.evaluate(() => !document.querySelector("#marks-list button:disabled") && /^(Marked|Took)/.test(document.querySelector("#marks-msg").textContent)), `the ${kind} press is taken and said`, await page.textContent("#marks-msg"));
};

// the owner on Study Setup, the image chosen
let page = await open(true, { setup: true });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await page.click("#data-tree .tree-folder .name");
await check(await page.evaluate(() => !!document.querySelector("#folder-items .cell") && document.querySelector("#marks-box").hidden), "with a folder chosen, the extractions box is not there");
await page.click('#folder-items .cell:has(.name:text-is("img1.png")) .name');
await check(await page.evaluate(() => !document.querySelector("#marks-box").hidden), "choosing an image shows its extractions");
await check(JSON.stringify((await rowsOf(page)).sort()) === JSON.stringify([yFile.id, zFile.id].sort()), "it lists the image's two extractions", await rowsOf(page));
await check(marks() === null, "none is marked yet", marks());

// mark y's extraction GT: the study file names the file, and who made it
await press(page, yFile.id, "gt");
await check(marks()?.gt?.file === yFile.id && marks().gt.by === Y && !marks().official, "marking y's extraction GT writes {file, by} into the study file", marks());
await check(await pressed(page, yFile.id, "gt") && !(await pressed(page, zFile.id, "gt")), "its GT button shows pressed, z's does not");

// y saves again: the mark still names the file, and the main app shows the new model as ground truth
yFile.bytes = doc(Y, 9);
const main = await open(true);
await pressDrive(main);
await main.dblclick(`#remote-list .item[data-id="${FILES.find((f) => f.parent === ROOT && f.name === "img1.png").id}"]`);
await check(await main.evaluate((n) => st.fileName === n && !!window.shellForTests?.page.get("image") && /^Image loaded/.test($("#status").textContent), "img1.png") && marks().gt.file === yFile.id, "y's later save leaves the mark on the same file", marks());
await loadStored(main, yFile.id);
const shown = await until(main, () => /^Ground truth: 9 pixels/.test($("#fx-result").textContent) && $("#fx-result").textContent);
await check(!!shown, "the main app shows y's new model as ground truth", shown);
await main.context().close();

// marking another GT replaces the first; an official mark is its own
await press(page, zFile.id, "gt");
await check(marks().gt.file === zFile.id && marks().gt.by === Z, "marking z's extraction GT replaces y's: one GT mark per image", marks());
await check(!(await pressed(page, yFile.id, "gt")) && await pressed(page, zFile.id, "gt"), "only z's GT button is pressed now");
await press(page, yFile.id, "official");
await check(marks().official.file === yFile.id && marks().gt.file === zFile.id, "an official mark is kept beside the GT mark, on another file", marks());
await press(page, yFile.id, "official");
await check(marks().gt.file === zFile.id && !marks().official, "pressing a pressed button takes its mark off, the other kept", marks());
await press(page, zFile.id, "gt");
await check(marks() === null, "with both taken off, the image has no entry", marks());

// the folder's cells carry the marks
await press(page, yFile.id, "gt");
await press(page, zFile.id, "official");
await page.click("#data-tree .tree-folder .name");
const tags = await page.evaluate(() => [...document.querySelectorAll("#folder-items .tag.yes")].map((t) => t.textContent));
await check(tags.join() === "Ground truth,Official", "the folder's image shows it has ground truth and an official mark", tags);
await done(0);
