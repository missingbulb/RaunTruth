// Drives the fixture study's GT actions in headless Chromium, against the stand-in Google of stand_in_drive.mjs, as a
// annotating. Checks req/shell/ground-truth/save-draft (nothing is kept until Save Draft; unsaved actions counted
// and guarded; a failed write said; replacing an unloaded draft asks), req/shell/ground-truth/draft-offer (Load draft is
// offered, never loaded unasked, and asks before it replaces unsaved actions), req/shell/ground-truth/history (Undo and
// Redo by button and key, and a drag's cancel), req/shell/ground-truth/history-file (Save's file carries the log in
// force, and a viewer's copy is handed the study without it) and req/shell/storage/manage (a draft listed and deleted).
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/gt_history_driver.mjs ANSWERS STUDIES ROOT
import { loadStored, fromScratch } from "./annotating.mjs";
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { until, idle } from "./page_until.mjs";
import { kit } from "./gt_history_kit.mjs";
import { expecting } from "./harness.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const drive = await standIn({ answers, studies, rootDir, editHistory: true });
const { FILES, GT, studyFile, open, dataManagement, check, done } = drive;
const png = FILES.find((f) => /\.png$/.test(f.name));
const sub = `${png.name.replace(/\.[^.]*$/, "")}__${createHash("sha256").update(png.bytes).digest("hex").slice(0, 8)}`;

const { ready, openImage, tagger, openKept, model, marks, counted, label, dragMark, moved, records, ask } = kit({ drive, png });
const unloadAsks = (page) => page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); dispatchEvent(e); return e.defaultPrevented; });
const submit = async (page) => {
  await page.evaluate(() => $("#gt-submit").click());
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
  await page.click("#gt-send");
  await page.waitForFunction(() => /Uploaded|not uploaded/.test($("#gt-msg").textContent));
  const msg = await page.textContent("#gt-msg");
  await page.click("#gt-close");
  return msg;
};

// nothing is saved before Save Draft: two actions made, no record, and a page opened on what the device keeps offers nothing
let page = await open(true);
await tagger(page);
await check(await page.evaluate(() => !document.querySelector("#gt-continue, .gt-clear-slot, .gt-clear")), "a study with GT actions has no Continue GT tagging and no Clear progress: the draft is Load draft, the clearing Clear all history");
await counted(page);
await moved(page, "m1", 20, 14); await moved(page, "m2", -16, 10);
await check((await records(page)).length === 0, "counted and two actions made, the device keeps no draft: nothing saves before Save Draft");
let l = await label(page);
let asked = null;
await check(!l.hidden && l.text === "· 2 unsaved", "the two actions are counted beside Undo", l);
await check(await unloadAsks(page), "leaving the page with unsaved actions asks first");
let recs = await records(page);
await page.context().close();
page = await openKept({ drafts: recs });
await until(page, () => document.documentElement.dataset.gtLookup === "done");
await check(await page.isHidden("#gt-offers"), "a page opened on what the device keeps finds nothing kept: no offer, and the shell says its look for a draft has ended");

// Save Draft keeps the log and the model on this device
await counted(page);
await moved(page, "m1", 20, 14); await moved(page, "m2", -16, 10);
const edited2 = await marks(page);
await page.click("#gt-save-draft");
l = await label(page);
await check(l.hidden && !(await unloadAsks(page)) && await page.isDisabled("#gt-save-draft"), "Save Draft clears the unsaved count and the guard against leaving", l);
recs = await records(page);
await check(recs.length === 1 && recs[0].study === "fixture" && recs[0].sha256.length === 64 && recs[0].log[0].type === "open" && recs[0].log[1].type === "run"
  && typeof recs[0].log[1].output.deflate === "string" && recs[0].log.filter((a) => a.type === "move-mark").length === 2 && recs[0].model.marks.length === 2,
  "one record per study and image holds the open, the run with its output deflated and the two moves", recs.map((r) => ({ ...r, log: r.log.map((a) => a.type) })));
const savedAt = recs[0].saved;

// Load draft, on a page opened with that record kept: offered with when and how many, nothing loaded unasked, and no step of the study run again
await page.context().close();
page = await openKept({ drafts: recs });
await until(page, () => !$("#gt-offers").hidden);
const offer = await page.evaluate(() => ({ shown: !$("#gt-offers").hidden, text: $("#gt-load-draft").textContent.trim(), above: $("#gt-offers").nextElementSibling.id }));
await check(offer.shown && /^Load draft · saved \d\d:\d\d, 2 actions$/.test(offer.text) && offer.above === "gt-list", "the image's draft is offered above the tasks, with when it was saved and how many actions", offer);
await check((await marks(page)) !== edited2, "nothing of the draft is loaded unasked: the marks are the run's own", await marks(page));
await page.evaluate(() => { window.posted = []; const p = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m, ...r) { posted.push(m.type + ":" + (m.action || "")); return p.call(this, m, ...r); }; });
await page.click("#gt-load-draft");
await check(await page.isHidden("#gt-offers") && (await marks(page)) === edited2, "Load draft brings the model back with the two moves", { got: await marks(page), edited2 });
const status = await page.textContent("#status");
await check(/verified/.test(status) && !(await page.evaluate(() => posted.some((p) => p.startsWith("call:")))) && await page.isHidden("#gt-offers"),
  "the replay is verified on the status line, the study ran nothing again, and the loaded draft is no longer offered", { status, posted: await page.evaluate(() => posted) });
await check((await page.textContent("#fx-result")).includes("pixels") && await page.evaluate(() => !document.querySelector("#fx-mask")), "the count is back, with no mask: no Count ran this visit");

// Undo and Redo, by button and by key
const m2 = await marks(page);
await check((await label(page)).hidden, "a loaded draft has nothing unsaved");
await page.click("#gt-undo");
const m1 = await marks(page);
await check(m1 !== m2 && JSON.parse(m1)[1].x !== JSON.parse(m2)[1].x, "Undo takes back the last move", { m1, m2 });
l = await label(page);
await check(l.text === "· 1 unsaved", "undoing a saved action counts as unsaved", l);
await page.click("#gt-redo");
await check((await marks(page)) === m2 && (await label(page)).hidden, "Redo puts it back, and the count with it");
const keys = await page.evaluate(() => ({ undo: $("#gt-undo kbd.key-on")?.textContent, redo: $("#gt-redo kbd.key-on")?.textContent, tip: $("#gt-undo").title }));
await check(/Z/.test(keys.undo) && /Y/.test(keys.redo) && /^Undo: Moved mark m2/.test(keys.tip), "each button carries its key, and Undo says what it undoes", keys);
await page.keyboard.press("Control+KeyZ");
await check((await marks(page)) === m1, "Ctrl+Z undoes");
await page.keyboard.press("Control+Shift+KeyZ");
await check((await marks(page)) === m2, "Ctrl+Shift+Z redoes");
await page.keyboard.press("Control+KeyZ"); await page.keyboard.press("Control+KeyY");
await check((await marks(page)) === m2, "Ctrl+Z then Ctrl+Y leaves it as it was");
await page.focus("#fx-threshold");
await page.keyboard.press("Control+KeyZ");
await check((await marks(page)) === m2, "typed in a field, Ctrl+Z is the browser's own, not the log's");
await page.evaluate(() => document.activeElement.blur());
// a drag: Escape puts the mark back and records nothing; Ctrl+Z mid-drag does nothing; a drop is one action
await dragMark(page, "m1", 30, 20, { hold: true });
await page.keyboard.press("Control+KeyZ");
await check((await marks(page)) === m2, "Ctrl+Z during a drag does nothing");
await page.keyboard.press("Escape");
await page.mouse.up();
await check((await marks(page)) === m2 && (await label(page)).hidden, "a drag cancelled with Escape leaves the model and the log as they were");
await moved(page, "m1", 30, 20);
l = await label(page);
await check(l.text === "· 1 unsaved", "a drag dropped is exactly one action", l);

// Load draft over unsaved actions asks first, and dismissing keeps the model
recs = await records(page);
await page.context().close();
page = await openKept({ drafts: recs });
await counted(page);
await moved(page, "m1", 12, 12);
await until(page, () => !$("#gt-offers").hidden);
const afterMove = await marks(page);
asked = await ask(page, false, () => page.click("#gt-load-draft"));
await check(/unsaved/.test(asked || "") && (await marks(page)) === afterMove && !(await label(page)).hidden, "Load draft over an unsaved action asks first, and dismissing it keeps the model", asked);

// Save Draft over a draft this visit did not load asks first, naming it
asked = await ask(page, false, () => page.click("#gt-save-draft"));
await check(/Replace the draft saved at \d\d:\d\d, with 2 actions/.test(asked || "") && (await records(page))[0].saved === savedAt, "Save Draft over an unloaded draft asks, naming its time and actions, and dismissing keeps it", asked);
await ask(page, true, () => page.click("#gt-save-draft"));
await until(page, () => $("#gt-unsaved").hidden);
recs = await records(page);
await check(recs.length === 1 && recs[0].saved !== savedAt && recs[0].log.filter((a) => a.type === "move-mark").length === 1, "accepted, it replaces the image's draft", recs.length);

// Save after one undo: the file carries the log in force, and the draft is saved with it
await moved(page, "m2", -10, -10); await moved(page, "m1", 8, -6);
await page.click("#gt-undo");
const draftBefore = recs[0].saved;
await check((await label(page)).text === "· 1 unsaved", "one action is unsaved before Save", await label(page));
const msg = await submit(page);
await check(/^Uploaded/.test(msg), "Save says the file landed", msg);
const subFolder = FILES.find((f) => f.folder && f.name === sub && f.parent === GT.extractions);
const file = FILES.filter((f) => f.parent === subFolder?.id).at(-1);
const doc = JSON.parse(file.bytes.toString());
await check(Array.isArray(doc.labels) && doc.history?.format === "rauntruth-gt-history/1" && doc.history.replay === "verified", "the file is the study's document with a history, its replay verified", { keys: Object.keys(doc), history: doc.history && { format: doc.history.format, replay: doc.history.replay } });
const acts = doc.history.actions;
await check(acts.filter((a) => a.type === "move-mark").length === 2 && acts.every((a) => typeof a.at === "string") && typeof acts.find((a) => a.type === "run").output.deflate === "string",
  "the undone move is not written, each action has its time, and the run's output is deflated", acts.map((a) => a.type));
recs = await records(page);
await check(recs.length === 1 && recs[0].saved !== draftBefore && recs[0].log.filter((a) => a.type === "move-mark").length === 2 && (await label(page)).hidden,
  "Save saved the draft too, the action it had not saved with it", recs.map((r) => ({ saved: r.saved, log: r.log.map((a) => a.type) })));

// a viewer loading that file once the study file marks it GT is handed the study's document, without the history
studyFile({ marks: { [createHash("sha256").update(png.bytes).digest("hex")]: { gt: { file: file.id, by: "tester@example.com" } } } });
await page.context().close();
page = await open(false);
await page.click("#load-remote");
await page.dblclick(`#remote-list .item[data-id="${png.id}"]`);
await check(await page.evaluate((n) => st.fileName === n && !$("#fx-count").disabled, png.name), "a viewer opens the image from the Drive dialog");
await loadStored(page, file.id);
await until(page, () => !!window.fixture.truth());
const shown = await page.evaluate(() => Object.keys(window.fixture.truth()));
await check(shown.includes("labels") && !shown.includes("history"), "a viewer loading the marked annotation from Drive hands the study the file without its history", shown);
await page.context().close();

page = await open(true);
await tagger(page);
await counted(page);
await moved(page, "m1", 12, 12);
await page.click("#gt-save-draft");
await check(await page.isHidden("#gt-unsaved"), "Save Draft leaves nothing unsaved");
// a run after the draft was saved is unsaved too
await page.evaluate(() => $("#fx-count").click());
await until(page, () => !$("#gt-save-draft").disabled);
l = await label(page);
await check(l.text === "· 1 unsaved" && !(await page.isDisabled("#gt-save-draft")), "a run after Save Draft counts as unsaved, and Save Draft is on", l);
await until(page, () => !document.activeViewTransition);
// opening another image, or unloading this one, with an action unsaved asks first
await moved(page, await page.evaluate(() => window.fixture.model().marks[0].id), 9, 9);
asked = await ask(page, false, () => page.evaluate(() => $("#unload").click()));
await check(/unsaved/.test(asked || "") && (await page.evaluate(() => st.fileName)) === png.name, "Unload with an unsaved action asks, and dismissing keeps the image", asked);
asked = await ask(page, false, async () => { await page.click("#load-remote"); await page.dblclick(`#remote-list .item[data-id="${png.id}"]`); });
await check(/unsaved/.test(asked || "") && (await page.evaluate(() => st.fileName)) === png.name && !(await label(page)).hidden, "opening an image over an unsaved action asks, and dismissing keeps the model", asked);
await page.evaluate(() => { const d = $("#remote-dlg"); if (d.open) d.close(); });
// choosing another study, or clearing all annotations, with an action unsaved asks first
const studyIs = (page) => page.evaluate(() => st.fileName + "|" + document.title);
const before = await studyIs(page);
asked = await ask(page, false, async () => { await page.click("#study-menu summary"); await page.click('#study-list a[data-id="viewer"]'); });
await check(/unsaved/.test(asked || "") && (await studyIs(page)) === before && new URL(page.url()).pathname.endsWith("/fixture") && !(await label(page)).hidden,
  "choosing another study with an unsaved action asks, and dismissing keeps the study, its image and the action", asked);
asked = await ask(page, false, () => page.click("#annotate-clear"));
await check(/unsaved/.test(asked || "") && await page.evaluate(() => document.documentElement.hasAttribute("data-annotating")) && (await studyIs(page)) === before && !(await label(page)).hidden,
  "clearing all annotations with an unsaved action asks, and dismissing keeps annotation mode and the action", asked);
await page.click("#gt-save-draft");
await check(await page.isHidden("#gt-unsaved"), "and Save Draft then leaves nothing unsaved");

await page.context().close();
// the browser's Back and Forward cannot be cancelled: the study is swapped with an action unsaved, and nothing is asked
page = await open(true);
let dialogs = 0;
page.on("dialog", (d) => { dialogs++; d.dismiss(); });
await tagger(page);
await page.click("#study-menu summary"); await page.click('#study-list a[data-id="viewer"]');
await page.waitForFunction(() => document.title === "Image Viewer" && !st.img);
await page.goBack();
// the study back on show, not only its address: what the first visit left on the page says nothing of this one
await page.waitForFunction(() => /\/fixture$/.test(location.pathname) && document.title === "Fixture");
await idle(page);
await ready(page);
await tagger(page);
await counted(page);
await moved(page, "m1", 12, 12);
await check(!(await label(page)).hidden, "an action is unsaved before Forward");
await page.goForward();
await page.waitForFunction(() => document.title === "Image Viewer");
await check(dialogs === 0, "Forward swapped the study over an unsaved action while tagging, without a question and without an error: the action is lost there", dialogs);
await page.context().close();
// a write that fails is said, and the unsaved count stays; the page warns of each refusal
await expecting(/storage refused/, async () => {
  page = await open(true, { prepare: (ctx) => ctx.addInitScript(() => {
    const real = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name, ...rest) { if (name === "gt-drafts") throw new Error("storage refused"); return real.call(this, name, ...rest); };
  }) });
  await openImage(page);
  await page.waitForFunction(() => /could not be read/.test($("#status").textContent));
  await check(true, "a draft that cannot be looked up is said on the status line", await page.textContent("#status"));
  await fromScratch(page, "#fx-count");
  await counted(page);
  await moved(page, "m1", 12, 12);
  await page.click("#gt-save-draft");
  l = await label(page);
  await check(/could not be saved/.test(await page.textContent("#notice")) && l.text === "· 1 unsaved" && await unloadAsks(page), "a draft that cannot be written is said, and the action stays unsaved", l);
  await page.context().close();
});
// a draft is listed in Manage storage, under its image, and deleted there
page = await open(true);
await tagger(page);
await counted(page);
await moved(page, "m1", 12, 12);
await page.click("#gt-save-draft");
await page.click("#user-menu summary");
await page.click("#manage-storage");
await page.waitForFunction(() => $("#usage-dlg").open && !/Reading/.test($("#storage-list").textContent));
for (const s of await page.$$("#storage-list .group > summary")) await s.click();
const entry = `#storage-list .entry[data-kind=selections][data-name="${png.name}"]`;
const listed = await page.textContent(entry, { timeout: 2000 }).catch(async () => "none: " + JSON.stringify(await page.$$eval("#storage-list .group", (g) => g.map((x) => [x.dataset.group, x.textContent.slice(0, 200)]))));
await check(/ground-truth draft/.test(listed), "Manage storage lists the draft among the image's selections", listed);
await ask(page, true, () => page.click(entry + " .del"));
await page.waitForFunction((e) => !document.querySelector(e), entry);
await check((await records(page)).length === 0, "deleting it removes the record from this device");
await page.context().close();
await done(0);
