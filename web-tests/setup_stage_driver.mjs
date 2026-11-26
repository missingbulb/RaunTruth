// Drives req/setup/promote in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT
// (three images): the owner on Study Setup sees the study's stage, lists the images whose extractions are newer than their GT before
// Review, promotes and moves back (the stage written into the study file, the sharing checked again), and freezes: marking and data
// close; the main app's Save of a session begun before the freeze still writes the extraction, labelled as not counted.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_stage_driver.mjs ANSWERS STUDIES ROOT
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { pressDrive } from "./drive_open.mjs";
import { until, idle } from "./page_until.mjs";
import { fromScratch } from "./annotating.mjs";
import { personFile } from "../web/truth_folders.js";
import { aspect } from "./setup_page.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { w, root, drive, ROOT, FILES, GT, studyFile, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const Y = "y@lab.example", Z = "z@lab.example";

const shaOf = (n) => createHash("sha256").update(fs.readFileSync(path.join(rootDir, n))).digest("hex");
// a person's extraction of an image, in the image's own folder of the extractions folder, both as the site makes them
const extractions = w.of(GT.extractions), perImage = new Map();
const extraction = async (name, who) => {
  const sha = shaOf(name), sub = `${name.replace(/\.[^.]*$/, "")}__${sha.slice(0, 8)}`;
  if (!perImage.has(sub)) perImage.set(sub, extractions.folder(sub, { bySite: true }));
  return perImage.get(sub).holds({ name: await personFile(who), bytes: Buffer.from(JSON.stringify({ created: "2026-11-01T10:00:00Z", tagger: who,
    image: { name, sha256: sha }, labels: [{ threshold: 100, count: 7 }], marks: [{ id: "m1", x: 12, y: 12 }], checked: true })) }, { bySite: true });
};
// img1: y's extraction is GT, and z saved one after it; img2: y's is GT and nothing came after
const y1 = await extraction("img1.png", Y), y2 = await extraction("img2.png", Y);
await extraction("img1.png", Z);
studyFile({ stage: "Develop", marks: { [shaOf("img1.png")]: { gt: { file: y1.id, by: Y } }, [shaOf("img2.png")]: { gt: { file: y2.id, by: Y } } } });
const study = () => root.study();

// an image of the study opened the way a person does, from the study's own list in the Drive dialog
const openFromStudy = async (page, file) => {
  await pressDrive(page);
  await page.dblclick(`#remote-list .item[data-id="${FILES.find((f) => f.parent === ROOT && f.name === path.basename(file)).id}"]`);
};

const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent.trim() ?? null, sel);
const names = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((li) => li.dataset.name), sel);
const visible = (page, sel) => page.evaluate((s) => !!document.querySelector(s)?.checkVisibility(), sel);
const settledStage = (page, stage) => page.waitForFunction((s) => document.querySelector("#stage-steps > li[aria-current] .stage-name")?.textContent.trim() === s && !document.querySelector("#stage-box").classList.contains("busy"), stage);
const checks = (page) => page.evaluate(() => +document.querySelector("#sharing-box").dataset.checks);

let page = await open(true, { setup: true });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await settledStage(page, "Develop");
await check(await visible(page, "#stage-box"), "Study Setup has a stage box, whatever the stage");
await check(await text(page, "#stage-up") === "Promote to Analyze…" && await text(page, "#stage-back") === "Move back to Setup…", "it offers the next stage and the one before", { up: await text(page, "#stage-up"), back: await text(page, "#stage-back") });
await check(/^Develop: /.test(await text(page, "#stage-what")) && (await text(page, "#stage-what")).includes("To move on to Analyze:"), "under the stages it says what the stage is and what moves the study on", await text(page, "#stage-what"));

// no listing of an image's extractions on opening, on a mark being written or on a stage change: the list of newer extractions is read on a press alone
const lists = () => drive.calls.filter((c) => c.kind === "list" && FILES.some((f) => f.id === c.parent && f.folder && (f.parent === GT.extractions || f.id === GT.extractions)))
  .map((c) => FILES.find((f) => f.id === c.parent).name).filter((n) => n !== "Extractions").map((n) => n.split("__")[0]);
const subs = () => new Set(lists());
await idle(page);
await check(lists().length === 0 && (await page.evaluate(() => $("#stage-newer-box").hidden)), "opening Study Setup lists no image's extractions and shows no list", lists());
await aspect(page, "truth");
await check(await text(page, "#stage-find") === "Find images with newer Analysis Files" && await visible(page, "#stage-find"), "Ground Truth has a button, Find images with newer Analysis Files", await text(page, "#stage-find"));
await aspect(page, "images");
await page.click("#data-tree .tree-folder .name");
await page.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length === 3);
await page.click('#folder-items .cell:has(.name:text-is("img2.png")) .name');
await page.waitForFunction(() => document.querySelectorAll("#marks-list .mark-row").length === 1);
await page.click(`#marks-list .mark-row[data-id="${y2.id}"] button[data-kind="official"]`);
await page.waitForFunction(() => !document.querySelector("#marks-list button:disabled") && /^(Marked|Took)/.test(document.querySelector("#marks-msg").textContent));
await idle(page);
await check(study().marks[shaOf("img2.png")].official?.file === y2.id, "a mark is written", study().marks);
await check([...subs()].every((n) => n === "img2") && (await page.evaluate(() => $("#stage-newer-box").hidden)), "writing a mark lists only the extractions of the image it is on, and no list of newer ones", lists());

// promote to Analyze: the stage is written into the study file, its other keys kept, and the sharing is checked again
const was = await checks(page);
const wrote = drive.writes.length;
const listed = lists().length;
// every stage change asks first (the owner, 2026-11-25): what the stage is and what the change opens and closes; Cancel writes nothing
const asking = (page) => page.waitForFunction(() => document.querySelector("#stage-change-dlg").open);
await page.click("#stage-up");
await asking(page);
await check(await text(page, "#stage-change-title") === "Promote to Analyze" && (await text(page, "#stage-change-what")).startsWith("Analyze: ") && await text(page, "#stage-change-go") === "Promote to Analyze",
  "Promote to Analyze asks first, naming the stage and what it is", await text(page, "#stage-change-dlg"));
await check(/opens the study's numbers|changes nothing people may do/.test(await text(page, "#stage-change-moves")), "and says what the change opens and closes", await text(page, "#stage-change-moves"));
await page.click("#stage-change-cancel");
await page.waitForFunction(() => !document.querySelector("#stage-change-dlg").open);
await idle(page);
await check(study().stage === "Develop" && drive.writes.length === wrote, "Cancel writes nothing", { stage: study().stage, writes: drive.writes.slice(wrote) });
await page.click("#stage-up");
await asking(page);
await page.click("#stage-change-go");
await settledStage(page, "Analyze");
await check(await text(page, "#status") === "Moved the study to Analyze.", "the status line says the study was moved", await text(page, "#status"));
await idle(page);
const kept = await page.evaluate(() => ({ on: document.activeElement?.className || document.activeElement?.localName, text: document.activeElement?.textContent.trim() }));
await check(/stage-act/.test(kept.on) && /Analyze|Review|Develop/.test(kept.text), "the keyboard is left on one of the stage's actions, the one pressed being gone with the old stage", kept);
await check(!lists().slice(listed).includes("img1") && (await page.evaluate(() => $("#stage-newer-box").hidden)), "a stage change lists no other image's extractions than the open one's, and no list of newer ones", lists().slice(listed));

// the button runs the listing and shows the image with an extraction newer than its GT, and not the one without
await aspect(page, "truth");
await page.click("#stage-find");
await page.waitForFunction(() => document.querySelectorAll("#stage-newer li").length >= 1);
await check(JSON.stringify(await names(page, "#stage-newer li")) === JSON.stringify(["img1.png"]), "pressing it lists the image with an extraction newer than its GT, and not the one without", await names(page, "#stage-newer li"));
await check(lists().slice(listed).includes("img1") && lists().slice(listed).includes("img2"), "by one extractions listing per GT-marked image", lists().slice(listed));
await check(study().stage === "Analyze" && study().marks?.[shaOf("img1.png")]?.gt?.file === y1.id && study().extractions === GT.extractions, "promoting writes the stage into the study file and keeps the rest of it", study());
await check((await until(page, (n) => +document.querySelector("#sharing-box").dataset.checks > n && document.querySelector("#sharing-title").textContent === "Sharing (Analyze)", was)) !== false, "and the sharing is checked again, for the new stage", await text(page, "#sharing-title"));
await check(drive.writes.slice(wrote).every((w) => w[0] === "replace" && w[1] === "rauntruth-study.json"), "the promotion writes the study file and nothing else", drive.writes.slice(wrote));

// promote to Review: a dialog names what freezes and the images whose newer extractions are not marked; Cancel writes nothing
await check(await text(page, "#stage-up") === "Promote to Review…", "the way into Review is marked as asking", await text(page, "#stage-up"));
const listsBefore = lists().length;
await page.click("#stage-up");
await page.waitForFunction(() => document.querySelector("#stage-freeze-dlg").open);
await check(lists().length > listsBefore, "promoting to Review lists the extractions before the Freeze dialog is shown", lists().slice(listsBefore));
await check(/marking|marks/i.test(await text(page, "#stage-freeze-dlg")) && /data/i.test(await text(page, "#stage-freeze-dlg")), "it says marking and data close", await text(page, "#stage-freeze-dlg"));
await check(JSON.stringify(await names(page, "#stage-freeze-newer li")) === JSON.stringify(["img1.png"]), "and lists the images with newer unmarked extractions again", await names(page, "#stage-freeze-newer li"));
await page.click("#stage-freeze-cancel");
await page.waitForFunction(() => !document.querySelector("#stage-freeze-dlg").open);
await check(study().stage === "Analyze", "Cancel leaves the stage as it was", study().stage);
await page.click("#stage-up");
await page.waitForFunction(() => document.querySelector("#stage-freeze-dlg").open);
await page.click("#stage-freeze");
await settledStage(page, "Review");
await check(study().stage === "Review", "Freeze writes Review into the study file", study().stage);

// frozen: no data control, no mark button; the stage and the way back stay
await aspect(page, "images");
await page.click("#data-tree .tree-folder .name");
await page.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length === 3);
await page.click('#folder-items .cell:has(.name:text-is("img1.png")) .name');
await page.waitForFunction(() => document.querySelectorAll("#marks-list .mark-row").length === 2);
await check(!(await visible(page, "#marks-list button.mark-gt")) && !(await visible(page, "#marks-list button.mark-official")), "after the freeze the extractions show with no mark button", await page.evaluate(() => document.querySelector("#marks-list").innerHTML));
await check(!(await visible(page, "#data-add")) && !(await visible(page, "#data-tree .unlist")), "and the data controls are gone");
await check(await visible(page, "#stage-back") && await text(page, "#stage-back") === "Move back to Analyze…" && await text(page, "#stage-up") === "Promote to Public…", "while the stage's own buttons remain", { up: await text(page, "#stage-up") });
await check(await text(page, "#stage-newer") === null || !(await visible(page, "#stage-newer li")), "the list of newer extractions is a thing of before Review");

// moving back reopens them
await page.click("#stage-back");
await asking(page);
await check(await text(page, "#stage-change-title") === "Move back to Analyze" && /^Moving from Review opens /.test(await text(page, "#stage-change-moves")) && /marking an Analysis File GT or official/.test(await text(page, "#stage-change-moves")) && /changing the study's folders, tags and areas/.test(await text(page, "#stage-change-moves")),
  "Move back asks first too, saying what reopens", await text(page, "#stage-change-dlg"));
await check(study().stage === "Review", "and writes nothing until its button is pressed", study().stage);
await page.click("#stage-change-go");
await settledStage(page, "Analyze");
await check(study().stage === "Analyze", "Move back writes the earlier stage", study().stage);
await idle(page);
const after = await page.evaluate(() => document.activeElement?.className || document.activeElement?.localName);
await check(/stage-act/.test(after), "and the keyboard is on one of the stage's actions again", after);
await page.waitForFunction(() => document.querySelectorAll("#marks-list button.mark-gt").length === 2);
await check(await visible(page, "#data-add"), "and marking and data are open again");
await page.context().close();

// the main app: a session begun before the freeze saves after it; the save is made and says it is not counted
page = await open(true);
await openFromStudy(page, path.join(rootDir, "img3.png"));
await page.waitForFunction(() => st.fileName === "img3.png" && !!window.shellForTests?.page.get("image") && /^Image loaded/.test($("#status").textContent));
await fromScratch(page, "#fx-count");
await until(page, () => !!window.fixture.model());
await page.click("#fx-add");
studyFile({ stage: "Review" });
const before = drive.writes.length;
await page.evaluate(() => $("#gt-submit").click());
await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
await page.click("#gt-send");
await page.waitForFunction(() => /^Uploaded/.test($("#gt-msg").textContent));
const said = await text(page, "#gt-msg");
await check(/after the freeze, not counted/.test(said), "the main app's Save still works after the freeze and says it is after the freeze, not counted", said);
await check(drive.writes.slice(before).some((w) => w[0] === "create" && /^x_/.test(w[1])), "and the extraction is written", drive.writes.slice(before));
await done(0);
