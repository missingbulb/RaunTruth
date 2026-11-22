// Drives the one store of extractions (req/shell/extractions/save, req/shell/extractions/list, req/shell/extractions/outsiders) in
// headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT: Save writing one
// file per person and image and replacing it, keeping the old revision; the list of an image's extractions, mine then marked
// then others folded, each labelled; Edit this annotation saving as the user's own with its base, the other's file left
// alone; and someone not a member listed the marked alone, with no name. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/extractions_driver.mjs ANSWERS STUDIES ROOT IMAGE SECOND
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { standInDrive, openFromDrive } from "./drive_open.mjs";
import { until } from "./page_until.mjs";
import { fromScratch } from "./annotating.mjs";

const [answers, studies, rootDir, image, second] = process.argv.slice(2);
const { drive, GT, studyFile, writes, keptForever, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const ME = "someone@example.com", YAEL = "yael@lab.org";

const shaOf = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const subName = (file) => `${path.basename(file).replace(/\.[^.]*$/, "")}__${shaOf(file).slice(0, 8)}`;
const sub = drive.folder({ mine: true, name: subName(image), parent: GT.extractions }).id;
const doc = (who, marks) => JSON.stringify({ created: "2026-11-01T10:00:00Z", tagger: who, image: { name: path.basename(image), sha256: shaOf(image) },
  labels: [{ threshold: 100, count: 7 }], marks: marks.map(([x, y], k) => ({ id: "m" + (k + 1), x, y })), checked: true });
// the user's own extraction of IMAGE, another person's and a batch run's
const mine = drive.file({ mine: true, name: `x_${ME}.json`, parent: sub, bytes: Buffer.from(doc(ME, [[20, 20]])) });
const yael = drive.file({ name: `x_${YAEL}.json`, parent: sub, bytes: Buffer.from(doc(YAEL, [[12, 12], [55, 35]])) });
const batch = drive.file({ name: "run_count__0.1.2.json", parent: sub, bytes: Buffer.from(doc(null, [[30, 30]])) });
const yaelBytes = Buffer.from(yael.bytes);
studyFile({ marks: { [shaOf(image)]: { gt: { file: yael.id, by: YAEL } } } });

const loaded = (page, name) => page.waitForFunction((n) => st.fileName === n && !!window.shellForTests?.page.get("image") && /^Image loaded/.test($("#status").textContent), name);
const opened = async (page, file) => { await openFromDrive(page, file); await loaded(page, path.basename(file)); };
const rows = (page) => page.evaluate(() => [...document.querySelectorAll("#annotate-list > button[data-key], #annotate-list > details > summary")].map((e) => e.textContent.replace(/\d{1,2}\/\d{1,2}\/\d{4}.*$/, "").trim()));
const saved = async (page) => {
  await page.evaluate(() => $("#gt-submit").click());
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
  await page.click("#gt-send");
  await page.waitForFunction(() => /^Saved|not saved/.test($("#gt-msg").textContent));
  const msg = await page.textContent("#gt-msg");
  await page.click("#gt-close");
  return msg;
};
const bodyOf = (f) => JSON.parse(f.bytes.toString());

// ---- a member: the list is mine, then the marked, then the others folded, each labelled
let page = await open(true, { email: ME, prepare: standInDrive });
await opened(page, image);
await page.click("#annotate-drive");
await page.waitForFunction(() => document.querySelectorAll("#annotate-list button[data-key]").length === 3);
await check(JSON.stringify(await rows(page)) === JSON.stringify(["Yours", `${YAEL} · GT`, "Others (1)"]),
  "the list holds mine, then the marked with who made it and its mark, then the others folded", await rows(page));
await page.click("#annotate-list .others summary");
const run = await page.evaluate(() => document.querySelector("#annotate-list .others button[data-key]").textContent);
await check(/^count 0\.1\.2/.test(run), "a batch run is named by its algorithm and version", run);

// Edit this annotation on the other's: the next Save writes the user's own, recording its base, and the other's file is left alone
await page.click(`#annotate-list button[data-key="${yael.id}"]`);
await page.waitForFunction(() => /^Showing/.test($("#annotate-say").textContent.trim()));
await page.click("#annotate-edit");
await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && window.fixture?.model()?.marks.length === 2 && document.querySelector("#busy").hidden);
await page.click("#fx-add");
const w0 = writes.length;
await check(/^Saved/.test(await saved(page)), "Save after Edit this annotation lands");
await check(bodyOf(mine).base === yael.id && bodyOf(mine).tagger === ME && bodyOf(mine).marks.length === 3,
  "the user's own extraction was replaced by the edited one, recording the other's file as its base", bodyOf(mine));
await check(Buffer.compare(yael.bytes, yaelBytes) === 0 && !writes.slice(w0).some(([, n]) => n === yael.name) && Buffer.compare(batch.bytes, Buffer.from(doc(null, [[30, 30]]))) === 0,
  "the other's file is unchanged, and nothing but the user's own was written", writes.slice(w0));
await page.context().close();

// ---- Save twice on an image of no extraction: one file in the image's own subfolder, two revisions
page = await open(true, { email: ME, prepare: standInDrive });
await opened(page, second);
await fromScratch(page, "#fx-count");
await page.click("#fx-count"); await until(page, () => !!window.fixture.model());
const before = writes.length;
await check(/^Saved/.test(await saved(page)), "Save on an image with no extraction lands");
await page.click("#fx-add");
const marksNow = await page.evaluate(() => window.fixture.model().marks.length);
await check(/^Saved/.test(await saved(page)), "and again");
const folder = drive.files.find((f) => f.folder && f.name === subName(second) && f.parent === GT.extractions);
const files = drive.files.filter((f) => f.parent === folder?.id);
await check(files.length === 1 && files[0].name === `x_${ME}.json`, "one file `x_<email>.json` in the image's subfolder `<stem>__<sha8>`", files.map((f) => f.name));
await check(files[0].revisions.length + 1 === 2 && keptForever.includes(files[0].name) && bodyOf(files[0]).marks.length === marksNow,
  "saved twice, it has two revisions, the old one kept, and holds the later", { revisions: files[0].revisions.length + 1 });
await check(JSON.stringify(writes.slice(before).map(([w]) => w)) === JSON.stringify(["folder", "create", "replace"]), "and Save wrote the subfolder, the file and its replacement, nothing else", writes.slice(before));
await page.context().close();

// ---- someone who is not a member, signed out: the marked extractions alone, by hand or by version, with no name
studyFile({ marks: { [shaOf(image)]: { gt: { file: yael.id, by: YAEL }, official: { file: batch.id, by: null } } } });
page = await open(false, { prepare: standInDrive });
await opened(page, image);
await page.click("#annotate-drive");
await page.waitForFunction(() => document.querySelectorAll("#annotate-list button[data-key]").length > 0);
const outsider = await page.evaluate(() => [...document.querySelectorAll("#annotate-list button[data-key]")].map((b) => b.textContent));
await check(outsider.length === 2 && outsider.every((t) => !t.includes("@")) && !(await page.evaluate(() => !!document.querySelector("#annotate-list .others"))),
  "signed out, the list holds two rows, the GT and the official one, neither with an @, and no folded others", outsider);
await check(/^by hand · GT/.test(outsider[0]) && /^count 0\.1\.2 · official/.test(outsider[1]), "labelled by hand or by algorithm version, with the mark", outsider);
await page.click(`#annotate-list button[data-key="${yael.id}"]`);
await page.waitForFunction(() => /^Showing/.test($("#annotate-say").textContent.trim()));
await check(!(await page.textContent("#annotate-say")).includes("@") && !(await page.evaluate(() => document.body.innerText.includes("yael"))), "its line names nobody", await page.textContent("#annotate-say"));
await page.context().close();
await done(0);
