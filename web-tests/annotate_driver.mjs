// Drives the main app's one page for everyone, with no role menu (req/shell/annotate/choice, req/shell/annotate/clear,
// req/shell/annotate/no-save, req/shell/annotate/survives, req/shell/left-bar/shells) in headless Chromium on the fixture study (in its GT
// stage), against the stand-in Google of stand_in_drive.mjs serving ROOT: how an image's annotations are got once it
// loads, annotation mode and its tools, who may save, and what keeps the work through a token run out and a store that
// does not answer. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/annotate_driver.mjs ANSWERS STUDIES ROOT IMAGE SECOND
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { standInDrive, openFromDrive } from "./drive_open.mjs";
import { until } from "./page_until.mjs";
import { expecting, NETWORK_GONE } from "./harness.mjs";
import { personFile } from "../web/truth_folders.js";

const [answers, studies, rootDir, image, second] = process.argv.slice(2);
const { google, drive, ROOT, GT, studyFile, writes, viewOnly, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const OTHER = "someone@example.com", OWNER = "owner@acme.example";

// the owner's extraction of IMAGE on Drive, marked GT in the study file, and the user's own, as the page's own saves are made
const bytes = fs.readFileSync(image), sha = createHash("sha256").update(bytes).digest("hex");
const sub = drive.folder({ mine: true, name: `${path.basename(image).replace(/\.[^.]*$/, "")}__${sha.slice(0, 8)}`, parent: GT.extractions }).id;
const seed = async (who, marks, mine = false) => drive.file({ mine, name: await personFile(who), parent: sub,
  bytes: Buffer.from(JSON.stringify({ created: "2026-11-01T10:00:00Z", tagger: who, image: { name: path.basename(image), sha256: sha },
    labels: [{ threshold: 100, count: 7 }], marks: marks.map(([x, y], k) => ({ id: "m" + (k + 1), x, y })), checked: true })) });
const ownersFile = await seed(OWNER, [[12, 12], [55, 35]]), mineFile = await seed(OTHER, [[20, 20]], true);
studyFile({ marks: { [sha]: { gt: { file: ownersFile.id, by: OWNER } } } });

const shown = (page, sel) => page.evaluate((s) => !!document.querySelector(s)?.checkVisibility(), sel);
const choices = (page) => page.evaluate(() => ["#annotate-local", "#annotate-drive", "#annotate-scratch"].filter((s) => document.querySelector(s).checkVisibility()).map((s) => document.querySelector(s).textContent.trim()));
const annotating = (page) => page.evaluate(() => document.documentElement.hasAttribute("data-annotating"));
const model = (page) => page.evaluate(() => window.fixture?.model() ?? null);
const loaded = (page, name) => page.waitForFunction((n) => st.fileName === n && !!window.shellForTests?.page.get("image") && /^Image loaded/.test($("#status").textContent), name);
const records = (page) => page.evaluate(() => new Promise((ok, bad) => {
  const q = indexedDB.open("gt-drafts", 1);
  q.onupgradeneeded = () => { q.transaction.abort(); ok([]); };
  q.onsuccess = () => { const r = q.result.transaction("drafts").objectStore("drafts").getAll(); r.onsuccess = () => { q.result.close(); ok(r.result); }; r.onerror = () => bad(r.error); };
}));
// a question the page asks, answered as told; its text
const ask = async (page, accept, act) => {
  const asked = page.waitForEvent("dialog");
  const acting = act();
  const dlg = await asked, text = dlg.message();
  await (accept ? dlg.accept() : dlg.dismiss());
  await acting;
  return text;
};
// the image opened from the study's folder, the choice of how to annotate it waiting
const opened = async (page, file = image) => { await openFromDrive(page, file); await loaded(page, path.basename(file)); };
// annotation mode entered from scratch: the study opens afresh on the same image, the algorithm runner there
const scratch = async (page) => {
  await page.click("#annotate-scratch");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && !!window.shellForTests.page.get("image") && !$("#fx-count").disabled);
};
const counted = async (page) => { await page.click("#fx-count"); await until(page, () => !!window.fixture.model()); };
const unsaved = (page) => page.evaluate(() => ($("#gt-unsaved").hidden ? "" : $("#gt-unsaved").textContent.trim()));

// ---- no role menu; a signed-in tagger gets the three ways, and the runner only from scratch
let page = await open(true, { email: OTHER, prepare: standInDrive });
await check(await page.evaluate(() => !document.querySelector("#role-menu, #role-name, header .as")), "the header has no role menu");
await check(!(await shown(page, "#annotate-box")), "before an image loads there is nothing to choose");
await opened(page);
await page.waitForFunction(() => document.documentElement.dataset.gtLookup === "done");
await check(JSON.stringify(await choices(page)) === JSON.stringify(["Load annotation from Drive", "Start annotating from scratch"]),
  "after the image loads, the left bar asks how to get annotations: from Drive or from scratch, no local work to continue", await choices(page));
await check(!(await shown(page, "#processing-box")) && !(await shown(page, "#fx-count")) && !(await annotating(page)),
  "the algorithm runner is not there, and the page is not in annotation mode", { runner: await shown(page, "#fx-count") });
await check(!(await shown(page, "#tasks-box")) && !(await shown(page, "#summary-box")), "with no model on the image, there is no Summary and no Ground Truth Tasks");

// Load annotation from Drive: the list, one chosen read-only, no tool
await page.click("#annotate-drive");
await page.waitForFunction(() => document.querySelectorAll("#annotate-list button[data-key]").length === 2);
const rows = await page.evaluate(() => [...document.querySelectorAll("#annotate-list button[data-key]")].map((b) => b.dataset.key));
await check(rows.join() === [mineFile.id, ownersFile.id].join(), "Load annotation from Drive lists the image's extractions: the user's own, then the marked", rows);
await page.click(`#annotate-list button[data-key="${ownersFile.id}"]`);
await page.waitForFunction(() => /^Ground truth: 7 pixels/.test($("#fx-result").textContent));
await check(!(await annotating(page)) && !(await shown(page, "#fx-count")) && !(await shown(page, "#gt-undo")) && await shown(page, "#annotate-edit"),
  "choosing one shows it read-only: no annotation tool, no runner, and Edit this annotation offered", { annotating: await annotating(page) });
await check(await shown(page, "#summary-box") && !(await shown(page, "#tasks-box")), "a model loaded read-only makes Summary show", { summary: await shown(page, "#summary-box") });
await page.click("#annotate-edit");
await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && window.fixture?.model()?.marks.length === 2);
await check(await annotating(page) && !(await shown(page, "#fx-count")) && await shown(page, "#tasks-box") && await shown(page, "#summary-box") && await shown(page, "#annotate-clear") && !(await shown(page, "#annotate-choices")),
  "Edit this annotation enters annotation mode on it: the tools and Summary show, the runner does not, the choices give way", { marks: (await model(page))?.marks });
// loading another image asks again
const asked = await ask(page, true, () => page.click("#fx-add").then(() => opened(page, second)));
await check(/unsaved/.test(asked || "") && !(await annotating(page)) && JSON.stringify(await choices(page)) === JSON.stringify(["Load annotation from Drive", "Start annotating from scratch"]) && !(await shown(page, "#fx-count")),
  "loading another image leaves annotation mode and asks again, the runner gone", { asked, choices: await choices(page) });
await page.context().close();

// ---- from scratch, a draft kept on the device, Clear
page = await open(true, { email: OTHER, prepare: standInDrive });
await opened(page);
await scratch(page);
await page.waitForFunction(() => document.activeElement?.id === "annotate-clear");
await check(await annotating(page) && await shown(page, "#fx-count") && !(await shown(page, "#summary-box")) && await shown(page, "#tasks-box"),
  "Start annotating from scratch enters annotation mode and shows the algorithm runner, Ground Truth Tasks and no Summary yet", { runner: await shown(page, "#fx-count") });
await counted(page);
await check(await shown(page, "#summary-box") && await shown(page, "#tasks-box"), "once the image carries a model, Summary shows beside Ground Truth Tasks");
await page.click("#fx-add"); await page.click("#fx-add");
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
await page.click("#fx-add"); await page.click("#fx-add");
await until(page, () => window.fixture.model().marks.length >= 4);
const before = writes.length;
await check(await unsaved(page) === "· 2 unsaved" && (await records(page)).length === 1, "two actions are unsaved after the draft kept", await unsaved(page));
let said = await ask(page, false, () => page.click("#annotate-clear"));
await check(/2 unsaved actions/.test(said || "") && await annotating(page) && (await model(page)) !== null && (await records(page)).length === 1,
  "Clear all annotations from image asks, naming the unsaved actions lost, and Cancel changes nothing", said);
await ask(page, true, () => page.click("#annotate-clear"));
await page.waitForFunction(() => !document.documentElement.hasAttribute("data-annotating") && window.fixture?.model() === null && !!window.shellForTests.page.get("image"));
await check(!(await annotating(page)) && (await model(page)) === null && JSON.stringify(await choices(page)) === JSON.stringify(["Load annotation from Drive", "Start annotating from scratch"])
  && (await records(page)).length === 0 && writes.length === before,
  "accepted, the page is back just after loading, the device's draft is gone and Drive was not written", { choices: await choices(page), records: (await records(page)).length, writes: writes.length - before });
await page.context().close();

// ---- the device holds a draft: Continue local annotation work, only on that image
page = await open(true, { email: OTHER, prepare: standInDrive });
await opened(page);
await scratch(page);
await counted(page);
await page.click("#fx-add"); await page.click("#fx-add");
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
await page.reload();
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
await opened(page);
await page.waitForFunction(() => document.documentElement.dataset.gtLookup === "done" && document.querySelector("#annotate-local").checkVisibility());
await check(JSON.stringify(await choices(page)) === JSON.stringify(["Continue local annotation work", "Load annotation from Drive", "Start annotating from scratch"]),
  "the image the device holds a draft of offers Continue local annotation work first", await choices(page));
await page.click("#annotate-local");
await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && window.fixture?.model()?.marks.length === 4);
await check(await annotating(page) && !(await shown(page, "#fx-count")), "continuing enters annotation mode with the draft loaded and no runner", { marks: (await model(page))?.marks.length });
await opened(page, second);
await check(JSON.stringify(await choices(page)) === JSON.stringify(["Load annotation from Drive", "Start annotating from scratch"]), "the other image, with no draft, does not offer it", await choices(page));
await page.context().close();

// ---- who may not save: the same choices and tools, no Save, a download, a line saying what to do
page = await open(false, { prepare: standInDrive });
await opened(page);
await check(JSON.stringify(await choices(page)) === JSON.stringify(["Load annotation from Drive", "Start annotating from scratch"]), "signed out, the same choices are offered", await choices(page));
await scratch(page);
await counted(page);
let line = await page.evaluate(() => ({ save: !!$("#gt-submit").checkVisibility(), download: $("#gt-download").checkVisibility() && !$("#gt-download").disabled, say: $("#left .gt-access").textContent.trim(), tools: !!$("#fx-add").checkVisibility() }));
await check(!line.save && line.download && line.tools && /sign in/i.test(line.say), "signed out, there is no Save, Download is there, the tools work and a line says to sign in", line);
await page.click("#gt-download");
await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-export").disabled);
await check(await page.evaluate(() => $("#gt-send").hidden), "its dialog offers the download alone");
await page.click("#gt-close");
await page.context().close();
viewOnly.add(GT.extractions);
page = await open(true, { email: OTHER, prepare: standInDrive });
await opened(page);
await scratch(page);
await counted(page);
await page.waitForFunction(() => $("#left .gt-access").dataset.access === "nosave");
line = await page.evaluate(() => ({ save: !!$("#gt-submit").checkVisibility(), download: $("#gt-download").checkVisibility(), say: $("#left .gt-access").textContent.trim() }));
await check(!line.save && line.download && /ask the study owner/i.test(line.say), "signed in without the right to save, there is no Save, Download is there and the line says to ask the study owner", line);
await page.context().close();
viewOnly.delete(GT.extractions);

// ---- the token running out, and the store not answering: the mode and the work stay, Save waits for the next click
page = await open(true, { email: OTHER, prepare: standInDrive });
await page.evaluate(() => { const now = Date.now.bind(Date); window.skew = 0; Date.now = () => now() + window.skew; });
await opened(page);
await scratch(page);
await counted(page);
await page.click("#fx-add"); await page.click("#fx-add"); await page.click("#fx-add");
await check(await unsaved(page) === "· 4 unsaved" || await unsaved(page) === "· 3 unsaved", "three actions are made", await unsaved(page));
const work = await unsaved(page);
// the settings the page syncs meanwhile meet the token it was just refused, and the network that went
await expecting(new RegExp(NETWORK_GONE.source + "|401|settings not (synced|saved)"), async () => {
  google.revokeAll();
  await page.evaluate(() => { window.skew = 2 * 3600 * 1000; });
  await page.waitForTimeout(1500); // waits on purpose: the page's own once-a-second clock must pass over the run-out token
  await check(await annotating(page) && await unsaved(page) === work && !(await page.evaluate(() => $("#gt-undo").disabled)),
    "the token run out, annotation mode and the unsaved work stay, Undo still counting them", { work, now: await unsaved(page) });
  await page.context().setOffline(true);
  await page.waitForFunction(() => document.documentElement.classList.contains("offline"));
  await check(await annotating(page) && await unsaved(page) === work, "offline too, annotation mode and the unsaved work stay", { work, now: await unsaved(page) });
  await page.context().setOffline(false);
  await page.waitForFunction(() => !document.documentElement.classList.contains("offline"));
}, { maybe: true });
// the store not answering: Save on each of two images waits on the device, a count says how many
drive.outage = "writes";
const save = async () => {
  await page.evaluate(() => $("#gt-submit").click());
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
  await page.click("#gt-send");
  await page.waitForFunction(() => /waits on this device|Saved|not saved/.test($("#gt-msg").textContent));
  const msg = await page.textContent("#gt-msg");
  await page.click("#gt-close");
  return msg;
};
const wrote = () => writes.filter(([w]) => w === "create" || w === "replace").length;
const w0 = wrote();
await expecting(new RegExp(NETWORK_GONE.source + "|ERR_EMPTY_RESPONSE|Failed to load resource|waiting save|settings not (synced|saved)"), async () => {
  let msg = await save();
  await check(/waits on this device/.test(msg) && wrote() === w0, "Save, the store not answering, waits on this device", msg);
  await opened(page, second);
  await scratch(page);
  await counted(page);
  await page.click("#fx-add");
  msg = await save();
  const waiting = await page.evaluate(() => $("#gt-waiting").hidden ? "" : $("#gt-waiting").textContent.trim());
  await check(/waits on this device/.test(msg) && /^2 images waiting to upload/.test(waiting), "the second image's Save waits too, and a count says 2 are waiting", { msg, waiting });
}, { maybe: true });
// back, and a click: both go. The settings sync the revoked token left behind may meet the page's clock put back first.
await expecting(/settings not (synced|saved)/, async () => {
  drive.outage = null;
  for (const t of google.tokens.values()) t.revoked = false;
  await page.evaluate(() => { window.skew = 0; });
  await page.click("#annotate-say");
  await until(page, () => $("#gt-waiting").hidden, undefined, { timeout: 8000 });
  await check(wrote() - w0 === 2, "back online, the next click sends both, and the count goes", { wrote: wrote() - w0 });
}, { maybe: true });
await page.context().close();

// the page asked whether to be left while the study it showed has gone and the next is not yet in (a reload, a tab closed, in
// the swap): nothing is unsaved then, and nothing throws
page = await open(true, { email: OTHER, prepare: standInDrive });
await opened(page);
await scratch(page);
await page.evaluate(() => {
  const fetchNow = window.fetch;
  window.fetch = function (u, ...rest) {
    if (/studies\/viewer\/study\.json/.test(String(u?.url ?? u))) window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    return fetchNow.call(this, u, ...rest);
  };
});
page.once("dialog", (d) => d.accept());
await page.click("#study-menu summary");
await page.click('#study-list a[data-id="viewer"]');
await page.waitForFunction(() => document.title === "Image Viewer");
await check(true, "the page asked whether to be left between two studies of a swap throws nothing");
await page.context().close();
await done(0);
