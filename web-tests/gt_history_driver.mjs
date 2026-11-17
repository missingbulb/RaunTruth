// Drives the fixture study's GT actions in headless Chromium, against the stand-in Google of stand_in_drive.mjs, as a
// Ground Truth Tagger. Checks req/shell/ground-truth/save-draft (nothing is kept until Save Draft; unsaved actions counted
// and guarded; a failed write said; replacing an unloaded draft asks), req/shell/ground-truth/draft-offer (Load draft is
// offered, never loaded unasked, and asks before it replaces unsaved actions), req/shell/ground-truth/history (Undo and
// Redo by button and key, and a drag's cancel), req/shell/ground-truth/history-file (Submit's file carries the log in
// force, and a viewer's copy is handed the study without it) and req/shell/storage/manage (a draft listed and deleted).
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/gt_history_driver.mjs ANSWERS STUDIES ROOT
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { until } from "./page_until.mjs";
import { kit } from "./gt_history_kit.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const drive = await standIn({ answers, studies, rootDir });
const { FILES, GT, approved, open, role, check, done } = drive;
approved.add(GT.submissions);
const png = FILES.find((f) => /\.png$/.test(f.name));
const sub = `${png.name.replace(/\.[^.]*$/, "")}__${createHash("sha256").update(png.bytes).digest("hex").slice(0, 8)}`;

const { ready, tagger, reopen, model, marks, counted, label, dragMark, moved, records, ask } = kit({ drive, png });
const unloadAsks = (page) => page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); dispatchEvent(e); return e.defaultPrevented; });
const submit = async (page) => {
  await page.evaluate(() => $("#gt-submit").click());
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
  await page.click("#gt-send");
  await page.waitForFunction(() => /Submitted|not submitted/.test($("#gt-msg").textContent));
  const msg = await page.textContent("#gt-msg");
  await page.click("#gt-close");
  return msg;
};

// nothing is saved before Save Draft: two actions made, no record, and after a reload no offer
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
await reopen(page);
await until(page, () => document.documentElement.dataset.gtLookup === "done");
await check(await page.isHidden("#gt-offers") && (await model(page)) === null, "after a reload nothing was kept: no offer, nothing counted, and the shell says its look for a draft has ended");

// Save Draft keeps the log and the model on this device
await counted(page);
await moved(page, "m1", 20, 14); await moved(page, "m2", -16, 10);
const edited2 = await marks(page);
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
l = await label(page);
await check(l.hidden && !(await unloadAsks(page)) && await page.isDisabled("#gt-save-draft"), "Save Draft clears the unsaved count and the guard against leaving", l);
let recs = await records(page);
await check(recs.length === 1 && recs[0].study === "fixture" && recs[0].sha256.length === 64 && recs[0].log[0].type === "open" && recs[0].log[1].type === "run"
  && typeof recs[0].log[1].output.deflate === "string" && recs[0].log.filter((a) => a.type === "move-mark").length === 2 && recs[0].model.marks.length === 2,
  "one record per study and image holds the open, the run with its output deflated and the two moves", recs.map((r) => ({ ...r, log: r.log.map((a) => a.type) })));
const savedAt = recs[0].saved;

// Load draft: offered with when and how many, nothing loaded unasked, and no step of the study run again
await reopen(page);
await until(page, () => !$("#gt-offers").hidden);
const offer = await page.evaluate(() => ({ shown: !$("#gt-offers").hidden, text: $("#gt-load-draft").textContent.trim(), above: $("#gt-offers").nextElementSibling.id }));
await check(offer.shown && /^Load draft · saved \d\d:\d\d, 2 actions$/.test(offer.text) && offer.above === "gt-list", "the image's draft is offered above Start GT tagging, with when it was saved and how many actions", offer);
await check((await model(page)) === null && (await page.textContent("#fx-result")).startsWith("Nothing counted"), "nothing is loaded unasked");
await page.evaluate(() => { window.posted = []; const p = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m, ...r) { posted.push(m.type + ":" + (m.action || "")); return p.call(this, m, ...r); }; });
await page.click("#gt-load-draft");
await until(page, () => !!window.fixture.model());
await check((await marks(page)) === edited2, "Load draft brings the model back with the two moves", { got: await marks(page), edited2 });
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
await page.click("#gt-start");
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
await reopen(page);
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

// Submit after one undo: the file carries the log in force, and the draft is saved with it
await moved(page, "m2", -10, -10); await moved(page, "m1", 8, -6);
await page.click("#gt-undo");
const draftBefore = recs[0].saved;
await check((await label(page)).text === "· 1 unsaved", "one action is unsaved before Submit", await label(page));
const msg = await submit(page);
await check(/Submitted/.test(msg), "Submit says the file landed", msg);
const subFolder = FILES.find((f) => f.folder && f.name === sub && f.parent === GT.submissions);
const file = FILES.filter((f) => f.parent === subFolder?.id).at(-1);
const doc = JSON.parse(file.bytes.toString());
await check(Array.isArray(doc.labels) && doc.history?.format === "rauntruth-gt-history/1" && doc.history.replay === "verified", "the file is the study's document with a history, its replay verified", { keys: Object.keys(doc), history: doc.history && { format: doc.history.format, replay: doc.history.replay } });
const acts = doc.history.actions;
await check(acts.filter((a) => a.type === "move-mark").length === 2 && acts.every((a) => typeof a.at === "string") && typeof acts.find((a) => a.type === "run").output.deflate === "string",
  "the undone move is not written, each action has its time, and the run's output is deflated", acts.map((a) => a.type));
recs = await records(page);
await check(recs.length === 1 && recs[0].saved !== draftBefore && recs[0].log.filter((a) => a.type === "move-mark").length === 2 && (await label(page)).hidden,
  "Submit saved the draft too, the action it had not saved with it", recs.map((r) => ({ saved: r.saved, log: r.log.map((a) => a.type) })));

// a viewer loading that file as curated ground truth is handed the study's document, without the history
const curated = { id: "dmcuratedsub0000000001", name: sub, parent: GT.curated, folder: true, bytes: null, mine: false, props: {}, modified: "2026-11-17T09:00:00.000Z" };
FILES.push(curated, { id: "dmcuratedfile00000001", name: file.name, parent: curated.id, folder: false, mine: false, props: {}, modified: "2026-11-17T09:00:01.000Z",
  bytes: Buffer.from(JSON.stringify({ ...doc, accepted: { by: "boss@example.com", at: "2026-11-17T09:00:00.000Z", from_sha256: "0".repeat(64) } })) });
await page.context().close();
page = await open(false);
await page.click("#load-remote");
await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
await page.dblclick(`#remote-list .item[data-id="${png.id}"]`);
await page.waitForFunction((n) => st.fileName === n && !$("#fx-count").disabled, png.name);
await page.waitForSelector("#load-gt:not([hidden])", { timeout: 5000 });
await page.click("#load-gt");
await until(page, () => !!window.fixture.truth());
const shown = await page.evaluate(() => Object.keys(window.fixture.truth()));
await check(shown.includes("labels") && !shown.includes("history"), "a viewer's Load GT tagging hands the study the file without its history", shown);
await page.context().close();

page = await open(true);
await tagger(page);
await counted(page);
await moved(page, "m1", 12, 12);
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
// a run after the draft was saved is unsaved too
await page.evaluate(() => $("#fx-count").click());
await until(page, () => !$("#gt-save-draft").disabled);
l = await label(page);
await check(l.text === "· 1 unsaved" && !(await page.isDisabled("#gt-save-draft")), "a run after Save Draft counts as unsaved, and Save Draft is on", l);
if ((await page.textContent("#gt-start")).trim() === "Start GT tagging") await page.click("#gt-start");
await until(page, () => !document.activeViewTransition);
// opening another image, or unloading this one, with an action unsaved asks first
await moved(page, await page.evaluate(() => window.fixture.model().marks[0].id), 9, 9);
asked = await ask(page, false, () => page.evaluate(() => $("#unload").click()));
await check(/unsaved/.test(asked || "") && (await page.evaluate(() => st.fileName)) === png.name, "Unload with an unsaved action asks, and dismissing keeps the image", asked);
asked = await ask(page, false, async () => { await page.click("#load-remote"); await page.waitForFunction(() => document.querySelector("#remote-dlg").open); await page.dblclick(`#remote-list .item[data-id="${png.id}"]`); });
await check(/unsaved/.test(asked || "") && (await page.evaluate(() => st.fileName)) === png.name && !(await label(page)).hidden, "opening an image over an unsaved action asks, and dismissing keeps the model", asked);
await page.evaluate(() => { const d = $("#remote-dlg"); if (d.open) d.close(); });
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);

await page.context().close();
// a write that fails is said, and the unsaved count stays
page = await open(true, { prepare: (ctx) => ctx.addInitScript(() => {
  const real = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function (name, ...rest) { if (name === "gt-drafts") throw new Error("storage refused"); return real.call(this, name, ...rest); };
}) });
await tagger(page);
await page.waitForFunction(() => /could not be read/.test($("#status").textContent));
await check(true, "a draft that cannot be looked up is said on the status line", await page.textContent("#status"));
await counted(page);
await moved(page, "m1", 12, 12);
await page.click("#gt-save-draft");
await page.waitForFunction(() => /could not be saved/.test($("#notice").textContent));
l = await label(page);
await check(l.text === "· 1 unsaved" && await unloadAsks(page), "a draft that cannot be written is said, and the action stays unsaved", l);
await page.context().close();
// a draft is listed in Manage storage, under its image, and deleted there
page = await open(true);
await tagger(page);
await counted(page);
await moved(page, "m1", 12, 12);
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
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
