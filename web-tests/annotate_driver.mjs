// Drives the main app's one page for everyone, with no role menu (req/shell/annotate/choice, req/shell/annotate/clear,
// req/shell/annotate/no-save, req/shell/annotate/survives, req/shell/left-bar/shells) in headless Chromium on the fixture study (in its GT
// stage), against the stand-in Google of stand_in_drive.mjs serving ROOT: how an image's analysis is got once it
// loads (Start, its dialog and Run; Load, its dialog), annotation mode and its tools, who may upload, and what keeps the
// work through a token run out and a store that does not answer. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/annotate_driver.mjs ANSWERS STUDIES ROOT IMAGE SECOND
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { standInDrive, openFromDrive } from "./drive_open.mjs";
import { until } from "./page_until.mjs";
import { expecting, NETWORK_GONE } from "./harness.mjs";
import { storedDrafts, seedDrafts } from "./device_storage.mjs";
import { fromScratch, openStart } from "./annotating.mjs";

import { personFile } from "../web/truth_folders.js";

const [answers, studies, rootDir, image, second] = process.argv.slice(2);
const { w, google, drive, GT, studyFile, writes, viewOnly, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const OTHER = "someone@example.com", OWNER = "owner@acme.example";

// the owner's extraction of IMAGE on Drive, marked GT in the study file, and the user's own, as the page's own saves are made
const bytes = fs.readFileSync(image), sha = createHash("sha256").update(bytes).digest("hex");
const sub = w.of(GT.extractions).folder(`${path.basename(image).replace(/\.[^.]*$/, "")}__${sha.slice(0, 8)}`, { bySite: true });
const seed = async (who, marks, bySite = false) => sub.holds({ name: await personFile(who),
  bytes: Buffer.from(JSON.stringify({ created: "2026-11-01T10:00:00Z", tagger: who, image: { name: path.basename(image), sha256: sha },
    labels: [{ threshold: 100, count: 7 }], marks: marks.map(([x, y], k) => ({ id: "m" + (k + 1), x, y })), checked: true })) }, { bySite });
const ownersFile = await seed(OWNER, [[12, 12], [55, 35]]), mineFile = await seed(OTHER, [[20, 20]], true);
studyFile({ marks: { [sha]: { gt: { file: ownersFile.id, by: OWNER } } } });

const shown = (page, sel) => page.evaluate((s) => !!document.querySelector(s)?.checkVisibility(), sel);
// the choices on show, a disabled one in brackets
const choices = (page) => page.evaluate(() => ["#annotate-local", "#annotate-scratch", "#annotate-load"].map((s) => document.querySelector(s)).filter((b) => b.checkVisibility()).map((b) => (b.disabled ? `(${b.textContent.trim()})` : b.textContent.trim())));
const BOTH = JSON.stringify(["Start", "Load"]), NO_LOAD = JSON.stringify(["Start", "(Load)"]);
// each view transition the page starts, noted as its change ends: whether the page annotated before and after it, and whether an
// image was open by then
const holds = (ctx) => ctx.addInitScript(() => {
  window.holds = [];
  const start = Document.prototype.startViewTransition;
  if (start) Document.prototype.startViewTransition = function (change) {
    const annotatingBefore = document.documentElement.hasAttribute("data-annotating");
    return start.call(this, async () => {
      await change?.();
      window.holds.push({ annotatingBefore, annotatingAfter: document.documentElement.hasAttribute("data-annotating"), imageAfter: !!window.shellForTests?.page.get("image") });
    });
  };
});
// how many times the store was asked to list the folder
const listings = (id) => drive.calls.filter((c) => c.kind === "list" && c.parent === id).length;
const annotating = (page) => page.evaluate(() => document.documentElement.hasAttribute("data-annotating"));
const model = (page) => page.evaluate(() => window.fixture?.model() ?? null);
const loaded = (page, name) => page.waitForFunction((n) => st.fileName === n && !!window.shellForTests?.page.get("image") && /^Image loaded/.test($("#status").textContent), name);
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
// Start, then Run in its dialog: the study opens afresh on the same image in annotation mode, and its count has run
const scratch = async (page) => { await fromScratch(page, "#fx-count"); await until(page, () => !!window.fixture.model()); };
const unsaved = (page) => page.evaluate(() => ($("#gt-unsaved").hidden ? "" : $("#gt-unsaved").textContent.trim()));

// ---- no role menu; a signed-in tagger gets Start and Load, the runner only from Start
let page = await open(true, { email: OTHER, prepare: async (ctx) => { await standInDrive(ctx); await holds(ctx); } });
await check(await page.evaluate(() => !document.querySelector("#role-menu, #role-name, header .as")), "the header has no role menu");
await check(!(await shown(page, "#annotate-box")), "before an image loads there is nothing to choose");
await opened(page);
await page.waitForFunction(() => document.documentElement.dataset.gtLookup === "done" && !$("#annotate-load").disabled);
await check(JSON.stringify(await choices(page)) === BOTH, "after the image loads, the Analysis box offers Start and Load, no local work to continue", await choices(page));
await check(await page.evaluate(() => !document.querySelector("#annotate-ask") && !$("#annotate-say").checkVisibility()), "with no line asking how, and none saying where the analysis is from");
await check(listings(sub.id) === 1, "the image's Analysis Files were listed once as it opened", listings(sub.id));
await check(!(await shown(page, "#processing-box")) && !(await shown(page, "#fx-count")) && !(await annotating(page)),
  "the algorithm runner is not there, and the page is not in annotation mode", { runner: await shown(page, "#fx-count") });
await check(!(await shown(page, "#tasks-box")) && await page.evaluate(() => $("#summary-box").classList.contains("waits") && $("#summary-box").classList.contains("folded")),
  "with no model on the image, there are no Analysis Tasks and Summary waits, folded");

// Load: a dialog listing the image's Analysis Files, one chosen and loaded read-only, no tool; the press lists nothing again
await page.click("#annotate-load");
await page.waitForFunction(() => $("#load-dlg").open && document.querySelectorAll("#annotate-list button[data-key]").length === 2);
const rows = await page.evaluate(() => [...document.querySelectorAll("#annotate-list button[data-key]")].map((b) => b.dataset.key));
await check(rows.join() === [mineFile.id, ownersFile.id].join(), "Load opens a dialog listing the image's Analysis Files: the user's own, then the marked", rows);
await check(listings(sub.id) === 1, "and pressing it asked the store for no second list", listings(sub.id));
await check(await page.evaluate(() => $("#load-go").disabled && $("#load-cancel").textContent === "Cancel" && $("#load-go").textContent === "Load"), "its actions are Cancel and Load, Load waiting for a choice");
await page.click("#load-cancel");
await check(await page.evaluate(() => !$("#load-dlg").open) && !(await shown(page, "#annotate-edit")), "Cancel closes it with nothing loaded");
await page.click("#annotate-load");
await page.click(`#annotate-list button[data-key="${ownersFile.id}"]`);
await page.click("#load-go");
await page.waitForFunction(() => /^Ground truth: 7 pixels/.test($("#fx-result").textContent));
await check(!(await annotating(page)) && !(await shown(page, "#fx-count")) && !(await shown(page, "#gt-undo")) && await shown(page, "#annotate-edit"),
  "the one loaded shows read-only: no tool, no runner, and Edit this analysis offered", { annotating: await annotating(page) });
await check(await shown(page, "#summary-box") && await page.evaluate(() => !$("#summary-box").classList.contains("waits") && !$("#summary-box").classList.contains("folded")) && !(await shown(page, "#tasks-box")),
  "a model loaded read-only opens Summary");
const holdsBefore = await page.evaluate(() => window.holds.length);
await page.click("#annotate-edit");
await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && window.fixture?.model()?.marks.length === 2);
await check(await annotating(page) && !(await shown(page, "#fx-count")) && await shown(page, "#tasks-box") && await shown(page, "#summary-box") && await shown(page, "#annotate-clear") && !(await shown(page, "#annotate-choices")),
  "Edit this analysis enters annotation mode on it: the tools and Summary show, the runner does not, the choices give way", { marks: (await model(page))?.marks });
// the study coming in afresh on the same image is held on screen: the page as it was until the image is open again
// (req/shell/annotate/held). What the hold looks like on the way is not checked.
const hold = await page.evaluate((n) => window.holds.slice(n).filter((h) => !h.annotatingBefore && h.annotatingAfter), holdsBefore);
await check(hold.length === 1 && hold[0].imageAfter, "the page was held as it was while the study came in again, until the image was open in it", await page.evaluate((n) => window.holds.slice(n), holdsBefore));
// loading another image asks again
const asked = await ask(page, true, () => page.click("#fx-add").then(() => opened(page, second)));
await page.waitForFunction(() => document.documentElement.dataset.gtLookup === "done");
await check(/unsaved/.test(asked || "") && !(await annotating(page)) && JSON.stringify(await choices(page)) === NO_LOAD && !(await shown(page, "#fx-count")),
  "loading another image leaves annotation mode and offers Start again, Load off for an image with no Analysis File, the runner gone", { asked, choices: await choices(page) });
await page.context().close();

// ---- Start: its dialog, Run, a draft kept on the device, reset analysis
page = await open(true, { email: OTHER, prepare: standInDrive });
await opened(page);
await check(await openStart(page), "Start opens a dialog");
await page.waitForFunction(() => $("#algorithm").options.length > 0);
const dialog = await page.evaluate(() => ({ list: [...$("#algorithm").options].map((o) => o.value), box: $("#algorithm").size > 1, about: $("#algorithm-note").textContent.trim().length > 0,
  under: $("#algorithm-note").getBoundingClientRect().top >= $("#algorithm").getBoundingClientRect().bottom, actions: [...$("#start-dlg").querySelectorAll(".dlg-row button")].map((b) => b.textContent.trim()) }));
await check(dialog.list.length >= 2 && dialog.box && dialog.about && dialog.under && dialog.actions.join() === "Cancel,Run",
  "it lists the study's algorithms in a box, how the chosen one works under it, and its actions are Cancel and Run", dialog);
await page.click("#start-cancel");
await check(await page.evaluate(() => !$("#start-dlg").open) && !(await annotating(page)) && (await model(page)) === null, "Cancel closes it: nothing ran, the page is not in annotation mode");
await openStart(page);
await page.selectOption("#algorithm", dialog.list[1]);
await page.click("#start-run");
await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && !!window.fixture?.model());
await check(await annotating(page) && /at or above the threshold/.test(await page.textContent("#fx-result")),
  "Run enters annotation mode and runs the algorithm chosen, with no further press", await page.textContent("#fx-result"));
await check(await shown(page, "#fx-count") && await shown(page, "#tasks-box") && await shown(page, "#summary-box") && !(await shown(page, "#algorithm")) && /./.test(await page.textContent("#algorithm-ran")),
  "the Analysis box then shows the study's runner and its Analysis Tasks, says which algorithm ran and holds no list of algorithms; Summary shows beside it",
  { ran: await page.textContent("#algorithm-ran") });
await check(await page.evaluate(() => !$("#annotate-say").checkVisibility()), "no line says the analysis started from scratch");
await page.click("#fx-add"); await page.click("#fx-add");
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
await page.click("#fx-add"); await page.click("#fx-add");
await until(page, () => window.fixture.model().marks.length >= 4);
const before = writes.length;
await check(await unsaved(page) === "· 2 unsaved" && (await storedDrafts(page)).length === 1, "two actions are unsaved after the draft kept", await unsaved(page));
await check(await page.evaluate(() => $("#annotate-clear").closest(".sec-head") === $("#analysis-box > .sec-head") && $("#annotate-clear").textContent.trim() === "reset analysis"),
  "reset analysis is a link on the Analysis box's header");
let said = await ask(page, false, () => page.click("#annotate-clear"));
await check(/2 unsaved actions/.test(said || "") && await annotating(page) && (await model(page)) !== null && (await storedDrafts(page)).length === 1,
  "reset analysis asks, naming the unsaved actions lost, and Cancel changes nothing", said);
const listedAtReset = listings(sub.id);
await ask(page, true, () => page.click("#annotate-clear"));
await page.waitForFunction(() => !document.documentElement.hasAttribute("data-annotating") && window.fixture?.model() === null && !!window.shellForTests.page.get("image") && !$("#annotate-load").disabled);
await check(!(await annotating(page)) && (await model(page)) === null && JSON.stringify(await choices(page)) === BOTH
  && (await storedDrafts(page)).length === 0 && writes.length === before,
  "accepted, the page is back just after loading, the device's draft is gone and Drive was not written", { choices: await choices(page), records: (await storedDrafts(page)).length, writes: writes.length - before });
await check(listings(sub.id) === listedAtReset + 1, "the image open again was listed once more: nothing of the store is kept between openings", listings(sub.id) - listedAtReset);
await page.context().close();

// ---- the device holds a draft: Continue local work, only on that image
page = await open(true, { email: OTHER, prepare: standInDrive });
await opened(page);
await scratch(page);
await page.click("#fx-add"); await page.click("#fx-add");
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
const drafts = await storedDrafts(page);
await check(drafts.length === 1 && drafts[0].sha256 === sha, "Save draft keeps the image's draft on the device", drafts.map((d) => d.sha256));
await page.context().close();
page = await open(true, { email: OTHER, prepare: async (ctx) => { await standInDrive(ctx); await seedDrafts(ctx, drafts); } });
await opened(page);
await page.waitForFunction(() => document.documentElement.dataset.gtLookup === "done" && document.querySelector("#annotate-local").checkVisibility() && !$("#annotate-load").disabled);
await check(JSON.stringify(await choices(page)) === JSON.stringify(["Continue local work", "Start", "Load"]),
  "the image the device holds a draft of offers Continue local work first", await choices(page));
await page.click("#annotate-local");
await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && window.fixture?.model()?.marks.length === 4);
await check(await annotating(page) && !(await shown(page, "#fx-count")), "continuing enters annotation mode with the draft loaded and no runner", { marks: (await model(page))?.marks.length });
await opened(page, second);
await page.waitForFunction(() => document.documentElement.dataset.gtLookup === "done");
await check(JSON.stringify(await choices(page)) === NO_LOAD, "the other image, with no draft, does not offer it", await choices(page));
await page.context().close();

// ---- who may not upload: Start and the tools, no Upload, Download Analysis on the box's header, a line saying what to do;
// signed out, the store is asked for no list as the image opens: Load asks at its press
page = await open(false, { prepare: standInDrive });
const listedBefore = listings(sub.id);
await opened(page);
await check(JSON.stringify(await choices(page)) === BOTH && listings(sub.id) === listedBefore, "signed out, Start and Load are offered, and the store was asked for no list of the image's Analysis Files as it opened",
  { choices: await choices(page), listed: listings(sub.id) - listedBefore });
await page.click("#annotate-load");
await page.waitForFunction(() => document.querySelectorAll("#annotate-list button[data-key]").length === 1);
await check(listings(sub.id) === listedBefore + 1, "Load's press lists them, the marked one alone for someone signed out", listings(sub.id) - listedBefore);
await page.click("#load-cancel");
await scratch(page);
let line = await page.evaluate(() => ({ upload: !!$("#gt-submit").checkVisibility(), download: $("#analysis-dl").checkVisibility() && !$("#analysis-dl").disabled, title: $("#analysis-dl").title,
  onHeader: $("#analysis-dl").closest(".sec-head") === $("#analysis-box > .sec-head"), say: $("#left .gt-access").textContent.trim(), tools: !!$("#fx-add").checkVisibility() }));
await check(!line.upload && line.download && line.onHeader && line.title === "Download Analysis" && line.tools && /sign in/i.test(line.say),
  "signed out, there is no Upload, Download Analysis is on the box's header, the tools work and a line says to sign in", line);
const got = page.waitForEvent("download");
await page.click("#analysis-dl");
const file = await got;
await check(/_analysis\.json$/.test(file.suggestedFilename()), "Download Analysis saves the analysis as a file", file.suggestedFilename());
await page.context().close();
w.of(GT.extractions).viewableOnly();
page = await open(true, { email: OTHER, prepare: standInDrive });
await opened(page);
await scratch(page);
await page.waitForFunction(() => $("#left .gt-access").dataset.access === "nosave");
line = await page.evaluate(() => ({ upload: !!$("#gt-submit").checkVisibility(), download: $("#analysis-dl").checkVisibility(), say: $("#left .gt-access").textContent.trim() }));
await check(!line.upload && line.download && /ask the study owner/i.test(line.say), "signed in without the right to upload, there is no Upload, Download Analysis is there and the line says to ask the study owner", line);
await page.context().close();
viewOnly.delete(GT.extractions);

// ---- the token running out, and the store not answering: the mode and the work stay, Save waits for the next click
page = await open(true, { email: OTHER, prepare: standInDrive });
await page.evaluate(() => { const now = Date.now.bind(Date); window.skew = 0; Date.now = () => now() + window.skew; });
await opened(page);
await scratch(page);
await page.click("#fx-add"); await page.click("#fx-add"); await page.click("#fx-add");
await check(await unsaved(page) === "· 4 unsaved" || await unsaved(page) === "· 3 unsaved", "three actions are made", await unsaved(page));
const work = await unsaved(page);
// the settings the page syncs meanwhile meet the token it was just refused, and the network that went
await expecting(new RegExp(NETWORK_GONE.source + "|401|settings not (synced|saved)"), async () => {
  google.revokeAll();
  await page.evaluate(() => { window.skew = 2 * 3600 * 1000; });
  await page.waitForTimeout(1500); // waits on purpose (no event): the page's once-a-second clock must pass over the run-out token, and the check is that nothing then changes
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
  await page.waitForFunction(() => /waits on this device|Uploaded|not uploaded/.test($("#gt-msg").textContent));
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
  await page.click("#tasks-title");
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
