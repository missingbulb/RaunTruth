// Drives the fixture study's extractions in headless Chromium, against the stand-in Google of stand_in_drive.mjs
// serving ROOT, the study's root, set up from Data Management. Checks req/shell/ground-truth/setup (Set up makes the
// Extractions folder, shares it by link and writes the study file), req/shell/data/roles (who may save: where the store lets
// the user write the extractions folder), req/shell/annotate/no-save, req/shell/extractions/save (Save writes the person's file into
// the image's subfolder, and saving again replaces it keeping the old version), req/shell/ground-truth/clear (the Edit History
// window's), req/shell/extractions/marks-shown, req/shell/extractions/list and req/shell/data/folder's Needs GT (a marker in the
// extractions folder, shown GT wanted in the Drive dialog). Exits 1 on a failed check, 2 when it cannot run.
import { createHash } from "node:crypto";
import { fromScratch } from "./annotating.mjs";
import { standIn } from "./stand_in_drive.mjs";
import { orMissed } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";
import { personFile } from "../web/truth_folders.js";
import { aspect } from "./setup_page.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const drive = await standIn({ answers, studies, rootDir, gt: false, rooted: true });
const { ROOT, FILES, writes, keptForever, viewOnly, sharedOut, studyFile, open, dataManagement, check, done } = drive;
const id = (name) => FILES.find((f) => f.folder && f.name === name)?.id;
// the access line once read: what it says, and whether it takes any room
const line = (page) => page.waitForFunction(() => { const e = document.querySelector("#left .gt-access"); return e?.dataset.access ? { access: e.dataset.access, text: e.textContent.trim(), room: e.getClientRects().length > 0 && e.offsetHeight > 0 } : null; }).then((h) => h.jsonValue());
// the study's image opened from its folder, and annotation from scratch chosen for it: the access line once read
const openPng = async (page) => {
  await page.click("#load-remote");
  await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
  await page.dblclick(`#remote-list .item[data-id="${png.id}"]`);
  await page.waitForFunction((n) => st.fileName === n && !$("#fx-count").disabled, png.name);
};
const asTagger = async (page) => { await openPng(page); await fromScratch(page, "#fx-count"); return line(page); };
// an image's ground-truth subfolder, and what Needs GT writes for it
const subOf = (f) => `${f.name.replace(/\.[^.]*$/, "")}__${createHash("sha256").update(f.bytes).digest("hex").slice(0, 8)}`;
const neededOf = (f) => subOf(f) + ".needs_gt";
const [png, beta] = FILES.filter((f) => /\.png$/.test(f.name));
// Needs GT pressed on an image in Data Management's folder view, the marker's write landed
const markNeeded = async (page, f) => {
  await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
  await page.click("#data-tree .tree-folder .name");
  const b = `#folder-items .cell[data-id="${f.id}"] .mark-gt`;
  await page.waitForSelector(b + ":not([disabled])");
  const n = writes.length;
  await page.click(b);
  await orMissed(page.waitForFunction((b) => document.querySelector(b)?.getAttribute("aria-pressed") === "true", b, { timeout: 10000 }));
  return writes.slice(n);
};
const pressed = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#folder-items .cell")].map((c) => [c.dataset.id, c.querySelector(".mark-gt").getAttribute("aria-pressed")])));
// whether the page offers Save, and the line it gives
const saves = (page) => page.evaluate(() => ({ save: !$("#gt-submit").hidden, download: !$("#analysis-dl").hidden, access: $("#left .gt-access").dataset.access || "" }));

// not set up: nobody may save, and the study manager is offered Set up ground truth
let page = await open(true);
await asTagger(page);
await page.waitForFunction(() => $("#left .gt-access").dataset.access === "nosave");
await check(!(await saves(page)).save && (await saves(page)).download, "with no extractions folder, no one may save: there is no Upload, and Download Analysis is there", await saves(page));
await dataManagement(page);
const nudge = () => page.evaluate(() => getComputedStyle(document.querySelector('#setup-rail button[data-aspect="truth"]'), "::after").content);
await page.waitForFunction(() => !$("#gt-setup").hidden);
const dotted = await nudge();
await aspect(page, "truth");
await page.waitForSelector("#gt-setup:not([hidden])");
const top = await page.evaluate(() => ({ first: document.querySelector("#truth-panel").firstElementChild?.id, nudged: $("#gt-setup").classList.contains("nudge"), text: $("#gt-setup").textContent.trim() }));
await check(dotted !== "none" && dotted !== "normal", "while the folder is missing, the rail marks Ground Truth", dotted);
await check(top.text === "Set up Analysis Files…" && top.first === "gt-setup" && top.nudged, "a study manager is offered Set up Analysis Files at the top of Ground Truth, highlighted while the folder is missing", top);
await check(await page.isHidden("#gt-box"), "with no extractions folder, there is no Extractions box");
await page.click("#gt-setup");
await page.click("#setup-go");
await page.waitForFunction(() => !$("#setup-dlg").open || $("#setup-msg").classList.contains("err"), null, { timeout: 15000 });
await check(!(await page.evaluate(() => $("#setup-dlg").open)), "confirming sets it up and closes the dialog", await page.textContent("#setup-msg"));
const EXT = id("Extractions");
const settings = FILES.find((f) => f.parent === ROOT && f.name === "rauntruth-study.json");
const doc = settings && JSON.parse(settings.bytes.toString());
await check(!!EXT && doc?.extractions === EXT && doc.set_by === "tester@example.com" && !("curated" in doc) && !("submissions" in doc),
  "Set up makes the Extractions folder in the root and names it in its study file", { msg: await page.textContent("#setup-msg"), doc });
await check(JSON.stringify(sharedOut) === JSON.stringify([["Extractions", { type: "anyone", role: "reader" }]]), "and shares it with anyone with the link to view", sharedOut);
const tree = await page.evaluate(() => [...document.querySelectorAll("#data-tree .tree-folder .name")].map((n) => n.textContent));
await check(!tree.some((n) => /^Extractions/.test(n)), "the tree leaves the extractions folder out of the data", tree);
await check(await orMissed(page.waitForSelector("#gt-setup", { state: "hidden", timeout: 5000 })), "set up, nothing offers to set it up again");
await page.waitForFunction(() => /No image/.test($("#gt-box").textContent));
const box = await page.evaluate(() => ({ text: $("#gt-box").textContent, above: !!$("#gt-box").closest("#truth-panel") && $("#gt-box").checkVisibility() }));
await aspect(page, "images");
await check(box.above && /Analysis Files folder/.test(box.text) && !(await page.$("#gt-switch")), "an Analysis Files box in Ground Truth says where they are kept and that no image has one yet, with no switch between reviewed and not", box);
// Needs GT: a marker in the extractions folder named as the image's subfolder, nothing written beside the image
let marked = await markNeeded(page, png);
const marker = FILES.find((f) => f.name === neededOf(png));
await check(JSON.stringify(marked) === JSON.stringify([["create", neededOf(png)]]) && marker?.parent === EXT,
  "Needs GT creates the image's marker in the extractions folder, and nothing else", { marked, parent: marker?.parent });
let on = await pressed(page);
await check(on[png.id] === "true" && on[beta.id] === "false", "only the image marked shows Needs GT pressed", on);
await page.context().close();

// a user the store lets only view the extractions folder may not save
viewOnly.add(EXT);
page = await open(true);
await asTagger(page);
await page.waitForFunction(() => $("#left .gt-access").dataset.access === "nosave");
await check(!(await saves(page)).save && (await saves(page)).download, "where the store lets the user only view the extractions folder, there is no Save, and Download is there", await saves(page));
await page.context().close();
viewOnly.delete(EXT);

// writable: open the image from the study's folder, annotate from scratch, count, submit
page = await open(true);
let said = await asTagger(page);
await check(said.access === "write" && !said.text && !said.room, "writable: the line says nothing and takes no room", said);
// before any extraction, the Drive dialog tags the marked image GT wanted, the other nothing
await page.evaluate(() => document.querySelector("#load-remote").click());
await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
const wanted = await page.waitForFunction((id) => document.querySelector(`#remote-list .item[data-id="${id}"] .gt-tag`)?.textContent || null, png.id, { timeout: 5000 }).then((h) => h.jsonValue(), () => "");
const other = await page.evaluate((id) => document.querySelector(`#remote-list .item[data-id="${id}"] .gt-tag`)?.textContent || "", beta.id);
await check(wanted === "GT wanted" && !other, "to the tagger, the Drive dialog tags the marked image GT wanted, the other nothing", { wanted, other });
await page.keyboard.press("Escape");
await page.click("#fx-count");
await page.waitForFunction(() => !$("#gt-submit").disabled);
// req/shell/ground-truth/tagging: annotating, the study's task is open once there is a count; a task's name opens it again
const tagging = () => page.evaluate(() => ({ open: document.querySelector("#gt-tasks > li.now")?.dataset.task || null, check: !!document.querySelector("#gt-tasks li.now #fx-check"),
  start: !!$("#gt-start") }));
let tg = await tagging();
await check(tg.open === "check" && tg.check && !tg.start, "counted while annotating, the study's task is open and there is no Start GT tagging", tg);
await page.click('#gt-counters > [data-task="check"]');
tg = await tagging();
await check(tg.open === "check", "clicking a task's name opens it", tg);
const submit = async () => {
  // the button sits in the item view's bar: pressed where it is
  await page.evaluate(() => $("#gt-submit").click());
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
  const before = await page.textContent("#gt-msg");
  await page.click("#gt-send");
  await page.waitForFunction(() => /Uploaded/.test($("#gt-msg").textContent) || /not uploaded/.test($("#gt-msg").textContent));
  const msg = await page.textContent("#gt-msg");
  await page.click("#gt-close");
  return Object.assign(new String(msg), { before, status: await page.textContent("#status") });
};
let msg = await submit();
const sub = subOf(png);
await check(/^Uploaded/.test(msg), "Save says the file landed", msg);
await check(msg.before.includes(png.name) && /Analysis Files/.test(msg.before) && !/replaces/.test(msg.before),
  "before the first upload the dialog says where the analysis goes and of which image, and names nothing it replaces", msg.before);
await check(/^Uploaded/.test(msg.status) && msg.status.includes(png.name), "once the dialog is closed the status line still says it was uploaded", msg.status);
const folder = FILES.find((f) => f.folder && f.name === sub);
await check(!!folder && folder.parent === EXT, "Save makes the image's subfolder in the extractions folder", sub);
const file = FILES.find((f) => f.parent === folder.id);
await check(file?.name === await personFile("tester@example.com"), "the person's file is named for their email's hash", file?.name);
const gtDoc = JSON.parse(file.bytes.toString());
await check(gtDoc.tagger === "tester@example.com" && !Number.isNaN(Date.parse(gtDoc.created)) && gtDoc.image.sha256 === createHash("sha256").update(png.bytes).digest("hex") && gtDoc.labels.length === 1,
  "the file names who made it, when it was made and the image's SHA-256, and holds the study's marks", gtDoc);
const run = gtDoc.history?.actions?.find((a) => a.type === "run");
await check(run?.version?.site === (await page.evaluate(() => $("#site-version").title.replace(/^version /, ""))) && run.version.code === "standin0",
  "its run records the site's version and the code version the worker reported", run?.version);
msg = await submit();
await check(/^Uploaded/.test(msg) && writes.filter(([w, n]) => w === "folder" && n === sub).length === 1 && JSON.stringify(writes.slice(-1)) === JSON.stringify([["replace", file.name]]) && keptForever.includes(file.name),
  "saving again replaces the person's own file, keeping the old version, and writes nothing else", writes);
await check(/replaces/.test(msg.before), "before uploading again the dialog says it replaces the person's earlier Analysis File", msg.before);

// Clear all history, at the Edit History window's foot: asks first, naming the image, then forgets the draft Submit kept
let asked = null;
page.once("dialog", (d) => { asked = d.message(); d.accept(); });
await check(await page.evaluate(() => !document.querySelector("#left .gt-clear") && !!document.querySelector("#edit-history:not([hidden]) #eh-clear")),
  "a study with GT actions has no Clear progress: Clear all history is at the Edit History window's foot");
await page.click("#eh-clear");
await page.waitForFunction(() => /History cleared/.test($("#status").textContent));
await check(asked && asked.includes(png.name), "Clear all history asks first, naming the image", asked);
await check(await page.evaluate(() => new Promise((ok) => { const q = indexedDB.open("gt-drafts", 1); q.onsuccess = () => { const r = q.result.transaction("drafts").objectStore("drafts").getAll(); r.onsuccess = () => ok(r.result.length === 0); }; })),
  "and forgets the image's draft on this device");

// req/shell/extractions/marks-shown: the Drive dialog and the image selector's recents say the image has an extraction of yours saved
// the row's tag once it reads want, or what it read instead once the step's time is up: a row drawn from what the
// device kept shows its old tag until the folder's listing comes, and draws it again then
const tagAs = (row, want) => page.waitForFunction(([r, w]) => document.querySelector(r)?.textContent === w, [row, want], { timeout: STEP })
  .then(() => want, () => page.evaluate((r) => document.querySelector(r)?.textContent ?? "", row));
const dialogTag = async (want) => {
  await page.evaluate(() => document.querySelector("#load-remote").click());
  await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
  const row = `#remote-list .item[data-id="${png.id}"] .gt-tag`;
  const tag = await tagAs(row, want);
  await page.keyboard.press("Escape");
  return tag;
};
let tag = await dialogTag("yours: saved");
await check(tag === "yours: saved", "the Drive dialog says the saved image has an extraction of yours", tag);
const recentTag = async (want) => {
  await page.evaluate(() => { $("#image-menu").open = true; });
  const row = `#recent .recent[data-id="${png.id}"] .gt-tag`;
  const tag = await tagAs(row, want);
  await page.evaluate(() => { $("#image-menu").open = false; });
  return tag;
};
tag = await recentTag("yours: saved");
await check(tag === "yours: saved", "and so does the image selector's list of recent images", tag);

// Data Management counts it, and a GT mark in the study file (what Study Setup writes) shows
await dataManagement(page);
await orMissed(page.waitForFunction(() => /1 image has an extraction/.test($("#gt-box").textContent), null, { timeout: 5000 }));
await check(/1 image has an Analysis File/.test(await page.textContent("#gt-box")), "the Analysis Files box counts it", await page.textContent("#gt-box"));
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await page.click("#data-tree .tree-folder .name");
const cell = `#folder-items .cell[data-id="${png.id}"]`;
await page.waitForSelector(cell);
const sums = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#folder-summary dd")].map((d) => [d.dataset.k, +d.textContent])));
let s = await sums();
await check(s.extracted === 1 && s.truth === 0 && s.pending === undefined && !(await page.$(cell + " .review-gt")), "Data Management counts one image with an extraction, none with ground truth, and offers no review", s);
await page.context().close();
studyFile({ marks: { [createHash("sha256").update(png.bytes).digest("hex")]: { gt: { file: file.id, by: "tester@example.com" } } } });
page = await open(true);
await dataManagement(page);
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await page.click("#data-tree .tree-folder .name");
await page.waitForSelector(cell);
await page.waitForFunction(() => +document.querySelector('#folder-summary dd[data-k="truth"]')?.textContent === 1, null, { timeout: 8000 });
await check(await page.isDisabled(cell + " .mark-gt"), "an image with a GT mark needs no marker");
tag = await dialogTag("yours: GT");
await check(tag === "yours: GT", "marked GT, the Drive dialog says so", tag);
await page.context().close();

// req/shell/annotate/choice, req/shell/extractions/outsiders: someone not signed in loads the image and, from Drive, the marked extraction, with no algorithm run
page = await open(false);
// what the page downloads from the store, to tell the listing from reading the extraction
const downloads = [];
page.on("request", (q) => { const u = new URL(q.url()); if (u.searchParams.get("alt") === "media") downloads.push(decodeURIComponent(u.pathname.split("/").pop())); });
await openPng(page);
await page.waitForFunction(() => document.querySelector("#annotate-load")?.checkVisibility());
const beforeGt = await page.evaluate(() => ({ processing: !$("#processing-box").hidden, items: !$("#switch").hidden }));
await check(!beforeGt.processing, "before choosing an annotation, Processing is not shown: only starting from scratch shows it", beforeGt);
await page.click("#annotate-load");
await page.waitForFunction(() => document.querySelectorAll("#annotate-list button[data-key]").length > 0);
await check(downloads.every((d) => d === png.id || d === settings.id), "before a row is chosen, only the image and the root's study file (which holds the study index and the marks) are downloaded: the two listings alone offer it", downloads);
const rows = await page.evaluate(() => [...document.querySelectorAll("#annotate-list button[data-key]")].map((b) => b.textContent));
await check(rows.length === 1 && /^by hand · GT/.test(rows[0]) && !/@/.test(rows[0]), "signed out, the list holds the marked extraction alone, by hand, with no name", rows);
await page.click(`#annotate-list button[data-key="${file.id}"]`);
await page.click("#load-go");
// only the choice loaded reads the extraction
await page.waitForFunction(() => /^Showing/.test($("#annotate-say").textContent.trim()));
const summed = await page.textContent("#annotate-say"), shown = await page.textContent("#fx-result");
await check(/GT/.test(summed) && !/@/.test(summed) && /pixels counted/.test(summed), "its line says it is the GT one, with the study's counts and no name", summed);
await check(/^Ground truth: \d+ pixels/.test(shown) && await page.evaluate(() => !document.querySelector("#busy") || $("#busy").hidden), "the study shows the final result, with nothing run", shown);
// ground truth loaded or the algorithm run, never both: Processing is not shown, nor the Items switch
const afterGt = await page.evaluate(() => ({ processing: !$("#processing-box").hidden, items: !$("#switch").hidden, view: $("#view").dataset.view }));
await check(!afterGt.processing && !afterGt.items && afterGt.view === "image", "with an extraction loaded, Processing and the Items switch are gone, the image in view", afterGt);
await page.context().close();
await done(0);
