// Drives the fixture study's ground truth in headless Chromium, against the stand-in Google of stand_in_drive.mjs
// serving ROOT, the study's root, set up from Data Management. Checks req/shell/ground-truth/setup (Set up ground
// truth makes the folders, shares the curated one and writes the settings file), req/shell/data/roles (Ground Truth
// Tagger offered only where the store lets the user write to submissions), req/shell/ground-truth/tagger-access,
// req/shell/ground-truth/submit and req/shell/ground-truth/layout (Submit writes the tagger's file into the image's
// subfolder, and submitting again replaces it keeping the old version), req/shell/ground-truth/clear (the Edit History window's),
// req/shell/ground-truth/pending, req/shell/ground-truth/curate, req/shell/ground-truth/summary (the Ground Truth box),
// req/shell/ground-truth/switch, req/shell/ground-truth/view and req/shell/data/folder's Needs GT (a marker in the
// curated folder, in either mode, shown GT wanted in the Drive dialog). Exits 1 on a failed
// check, 2 when it cannot run.
//   node web-tests/gt_drive_driver.mjs ANSWERS STUDIES ROOT
import { createHash } from "node:crypto";
import { fromScratch } from "./annotating.mjs";
import { standIn } from "./stand_in_drive.mjs";
import { orMissed } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const drive = await standIn({ answers, studies, rootDir, gt: false });
const { ROOT, FILES, writes, keptForever, viewOnly, sharedOut, open, dataManagement, check, done } = drive;
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
const saves = (page) => page.evaluate(() => ({ save: !$("#gt-submit").hidden, download: !$("#gt-download").hidden, access: $("#left .gt-access").dataset.access || "" }));

// not set up: nobody may save, and the study manager is offered Set up ground truth
let page = await open(true);
await asTagger(page);
await page.waitForFunction(() => $("#left .gt-access").dataset.access === "nosave");
await check(!(await saves(page)).save && (await saves(page)).download, "with no submissions folder, no one may save: there is no Save, and Download is there", await saves(page));
await dataManagement(page);
await page.waitForSelector("#gt-setup:not([hidden])");
const top = await page.evaluate(() => ({ first: document.querySelector("#data-body").firstElementChild?.id, nudged: $("#gt-setup").classList.contains("nudge"), text: $("#gt-setup").textContent.trim() }));
await check(top.text === "Set up ground truth…" && top.first === "gt-setup" && top.nudged, "a study manager is offered Set up ground truth at the top of the bar, highlighted while the folders are missing", top);
await check(await page.isHidden("#gt-box"), "with no ground-truth folders, there is no Ground Truth box");
await page.click("#gt-setup");
await page.click('#setup-dlg button[data-review="yes"]');
await page.waitForFunction(() => !$("#setup-dlg").open || $("#setup-msg").classList.contains("err"), null, { timeout: 15000 });
await check(!(await page.evaluate(() => $("#setup-dlg").open)), "choosing an option sets it up and closes the dialog", await page.textContent("#setup-msg"));
const CUR = id("GT curated"), SUBS = id("GT submissions");
const settings = FILES.find((f) => f.parent === ROOT && f.name === "rauntruth-study.json");
const doc = settings && JSON.parse(settings.bytes.toString());
await check(!!CUR && !!SUBS && doc?.curated === CUR && doc?.submissions === SUBS && doc.review === true && doc.set_by === "tester@example.com",
  "Set up with review makes GT curated and GT submissions in the root and names them in its settings file", { msg: await page.textContent("#setup-msg"), doc });
await check(JSON.stringify(sharedOut) === JSON.stringify([["GT curated", { type: "anyone", role: "reader" }]]), "and shares the curated folder with anyone with the link to view", sharedOut);
const tree = await page.evaluate(() => [...document.querySelectorAll("#data-tree .tree-folder .name")].map((n) => n.textContent));
await check(!tree.some((n) => /^GT/.test(n)), "the tree leaves the ground-truth folders out of the data", tree);
await check(await orMissed(page.waitForSelector("#gt-setup", { state: "hidden", timeout: 5000 })), "set up, nothing offers to set it up again");
await page.waitForFunction(() => /No image/.test($("#gt-box").textContent));
const box = await page.evaluate(() => ({ text: $("#gt-box").textContent, above: !!($("#gt-box").compareDocumentPosition($("#data-tree")) & Node.DOCUMENT_POSITION_FOLLOWING) }));
await check(box.above && /review/i.test(box.text), "a Ground Truth box above the folders says submissions are reviewed and that no image has ground truth yet", box);
// Needs GT, with review: a marker in the curated folder named as the image's subfolder, nothing written beside the image
let marked = await markNeeded(page, png);
const marker = FILES.find((f) => f.name === neededOf(png));
await check(JSON.stringify(marked) === JSON.stringify([["create", neededOf(png)]]) && marker?.parent === CUR,
  "with review, Needs GT creates the image's marker in the curated folder, and nothing else", { marked, parent: marker?.parent });
let on = await pressed(page);
await check(on[png.id] === "true" && on[beta.id] === "false", "only the image marked shows Needs GT pressed", on);
await page.context().close();

// a user the store lets only view the submissions folder may not save
viewOnly.add(SUBS);
page = await open(true);
await asTagger(page);
await page.waitForFunction(() => $("#left .gt-access").dataset.access === "nosave");
await check(!(await saves(page)).save && (await saves(page)).download, "where the store lets the user only view submissions, there is no Save, and Download is there", await saves(page));
await page.context().close();
viewOnly.delete(SUBS);

// writable: open the image from the study's folder, annotate from scratch, count, submit
page = await open(true);
let said = await asTagger(page);
await check(said.access === "write" && !said.text && !said.room, "writable: the line says nothing and takes no room", said);
// req/shell/ground-truth/pending: before any ground truth, the Drive dialog tags the marked image GT wanted, the other nothing
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
await page.click('#gt-tasks > li[data-task="check"] .task-head .t');
tg = await tagging();
await check(tg.open === "check", "clicking a task's name opens it", tg);
const submit = async () => {
  // the button sits in the item view's bar: pressed where it is
  await page.evaluate(() => $("#gt-submit").click());
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
  await page.click("#gt-send");
  await page.waitForFunction(() => /Submitted/.test($("#gt-msg").textContent) || /not/.test($("#gt-msg").textContent));
  const msg = await page.textContent("#gt-msg");
  await page.click("#gt-close");
  return msg;
};
let msg = await submit();
const sub = subOf(png);
await check(/Submitted/.test(msg), "Submit says the file landed", msg);
const folder = FILES.find((f) => f.folder && f.name === sub);
await check(!!folder && folder.parent === SUBS, "Submit makes the image's subfolder in the submissions folder", sub);
const file = FILES.find((f) => f.parent === folder.id);
await check(file?.name === "gt_tester@example.com.json", "the tagger's file is named for their email", file?.name);
const gtDoc = JSON.parse(file.bytes.toString());
await check(gtDoc.tagger === "tester@example.com" && !Number.isNaN(Date.parse(gtDoc.created)) && gtDoc.image.sha256 === createHash("sha256").update(png.bytes).digest("hex") && gtDoc.labels.length === 1,
  "the file names its tagger, when it was made and the image's SHA-256, and holds the study's marks", gtDoc);
msg = await submit();
await check(/Submitted/.test(msg) && writes.filter(([w, n]) => w === "folder" && n === sub).length === 1 && JSON.stringify(writes.slice(-2)) === JSON.stringify([["replace", file.name], ["mark", sub]]) && keptForever.includes(file.name),
  "submitting again replaces the tagger's own file, keeping the old version", writes);

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

// req/shell/ground-truth/pending: the Drive dialog marks the image as pending for the tagger
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
let tag = await dialogTag("GT pending");
await check(tag === "GT pending", "to the tagger, the Drive dialog marks the submitted image GT pending", tag);
// and so does the image selector's list of recent images
const recentTag = async (want) => {
  await page.evaluate(() => { $("#image-menu").open = true; });
  const row = `#recent .recent[data-id="${png.id}"] .gt-tag`;
  const tag = await tagAs(row, want);
  await page.evaluate(() => { $("#image-menu").open = false; });
  return tag;
};
tag = await recentTag("GT pending");
await check(tag === "GT pending", "to the tagger, the image selector marks the submitted image GT pending", tag);

// req/shell/ground-truth/curate: the study manager sees it pending, reviews it and accepts it into the curated folder
await dataManagement(page);
await orMissed(page.waitForFunction(() => /1 image.*pending/.test($("#gt-box").textContent), null, { timeout: 5000 }));
await check(/1 image.*pending/.test(await page.textContent("#gt-box")), "the Ground Truth box counts the submission pending", await page.textContent("#gt-box"));
const sw = await page.evaluate(() => ({ text: $("#gt-switch").textContent.trim(), off: $("#gt-switch").disabled, why: $("#gt-switch").title }));
await check(sw.text === "Switch to unreviewed…" && sw.off && /1 submission/.test(sw.why), "while a submission is pending, switching to unreviewed waits, saying how many", sw);
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await page.click("#data-tree .tree-folder .name");
const cell = `#folder-items .cell[data-id="${png.id}"]`;
await page.waitForSelector(cell);
const sums = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#folder-summary dd")].map((d) => [d.dataset.k, +d.textContent])));
let s = await sums();
await check(s.pending === 1 && s.truth === 0 && await page.isVisible(cell + " .review-gt"), "Data Management counts it pending and offers Review GT", s);
await page.click(cell + " .review-gt");
await page.waitForFunction(() => document.querySelector("#curate-list li .accept") && !document.querySelector("#curate-list li .accept").disabled);
const who = await page.textContent("#curate-list li .who");
await check(who === "tester@example.com", "the review lists the tagger's submission", who);
await page.click("#curate-list li .accept");
await page.waitForFunction(() => /Accepted/.test($("#curate-msg").textContent) || $("#curate-msg").classList.contains("err"));
const into = FILES.find((f) => f.folder && f.name === sub && f.parent === CUR), copy = into && FILES.find((f) => f.parent === into.id);
const accepted = copy && JSON.parse(copy.bytes.toString()).accepted;
await check(copy?.name === file.name && accepted?.by === "tester@example.com" && accepted.from_sha256?.length === 64,
  "Accept copies the submission into the image's subfolder of the curated folder, recording who accepted it and from which file", accepted || await page.textContent("#curate-msg"));
await page.click("#curate-close");
await page.waitForFunction(() => +document.querySelector('#folder-summary dd[data-k="truth"]')?.textContent === 1);
s = await sums();
await check(s.truth === 1 && s.pending === 0 && !(await page.$(cell + " .review-gt")), "accepted, the image has ground truth and nothing pending", s);
await check(await page.isDisabled(cell + " .mark-gt"), "an image with ground truth needs no marker");
await orMissed(page.waitForFunction(() => /1 image has ground truth/.test($("#gt-box").textContent), null, { timeout: 5000 }));
await check(/1 image has ground truth/.test(await page.textContent("#gt-box")), "accepted, the Ground Truth box counts it", await page.textContent("#gt-box"));
tag = await recentTag("GT");
await check(tag === "GT", "accepted, the image selector marks the image GT", tag);

// req/shell/ground-truth/switch: nothing pending, the study switches to unreviewed, nothing moved or deleted
await page.waitForFunction(() => !$("#gt-switch").disabled);
const before = FILES.length;
await page.click("#gt-switch");
await page.waitForFunction(() => $("#switch-dlg").open);
const told = await page.textContent("#switch-text");
await check(/edit access/.test(told) && /GT curated/.test(told) && /no file/i.test(told), "the confirmation says no file moves and that taggers need edit access to GT curated", told);
await page.click("#switch-go");
await page.waitForFunction(() => !$("#switch-dlg").open || $("#switch-msg").classList.contains("err"), null, { timeout: 15000 });
const switched = JSON.parse(FILES.find((f) => f.parent === ROOT && f.name === "rauntruth-study.json").bytes.toString());
await check(switched.curated === CUR && switched.submissions === CUR && switched.review === false && switched.switched?.from?.submissions === SUBS && switched.switched?.by === "tester@example.com" && FILES.length === before && FILES.some((f) => f.id === SUBS),
  "switched, GT curated serves as both, GT submissions stays, and the settings file records the mode before and who switched", { switched, msg: await page.textContent("#switch-msg") });
await orMissed(page.waitForFunction(() => /One folder/.test($("#gt-mode").textContent) && /1 image has ground truth/.test($("#gt-counts").textContent), null, { timeout: 5000 }));
await check(/One folder/.test(await page.textContent("#gt-mode")) && /1 image has ground truth/.test(await page.textContent("#gt-counts")), "the Ground Truth box now says one folder, its ground truth still counted", await page.textContent("#gt-box"));
// Needs GT, one folder for both: the marker lands in that one folder too
marked = await markNeeded(page, beta);
await check(JSON.stringify(marked) === JSON.stringify([["create", neededOf(beta)]]) && FILES.find((f) => f.name === neededOf(beta))?.parent === CUR,
  "with one folder, Needs GT creates the marker in it, and nothing else", marked);
on = await pressed(page);
await check(on[beta.id] === "true" && FILES.some((f) => f.name === neededOf(png)), "the image with ground truth keeps its marker, no longer shown", on);
await page.context().close();

// shell/annotate/choice: someone not signed in loads the image and, from Drive, its curated ground truth, with no algorithm run
page = await open(false);
// what the page downloads from the store, to tell the listing from reading the ground truth
const downloads = [];
page.on("request", (q) => { const u = new URL(q.url()); if (u.searchParams.get("alt") === "media") downloads.push(decodeURIComponent(u.pathname.split("/").pop())); });
await openPng(page);
await page.waitForFunction(() => document.querySelector("#annotate-drive")?.checkVisibility());
const beforeGt = await page.evaluate(() => ({ processing: !$("#processing-box").hidden, items: !$("#switch").hidden }));
await check(!beforeGt.processing, "before choosing an annotation, Processing is not shown: only starting from scratch shows it", beforeGt);
await page.click("#annotate-drive");
await page.waitForFunction(() => document.querySelectorAll("#annotate-list button[data-key]").length > 0);
await check(downloads.every((d) => d === png.id || d === settings.id), "before a row is chosen, only the image and the root's study file (which holds the study index) are downloaded: the curated folder's listing alone offers it", downloads);
await page.click('#annotate-list button[data-key="curated"]');
// only the click reads the image's ground truth
await page.waitForFunction(() => /^Showing/.test($("#annotate-say").textContent.trim()));
const summed = await page.textContent("#annotate-say"), shown = await page.textContent("#fx-result");
await check(/tester@example\.com/.test(summed) && /accepted by/.test(summed) && /pixels counted/.test(summed), "its line names who made it, who accepted it, and the study's counts", summed);
await check(/^Ground truth: \d+ pixels/.test(shown) && await page.evaluate(() => !document.querySelector("#busy") || $("#busy").hidden), "the study shows the final result, with nothing run", shown);
// ground truth loaded or the algorithm run, never both: Processing is not shown, nor the Items switch
const afterGt = await page.evaluate(() => ({ processing: !$("#processing-box").hidden, items: !$("#switch").hidden, view: $("#view").dataset.view }));
await check(!afterGt.processing && !afterGt.items && afterGt.view === "image", "with its ground truth loaded, Processing and the Items switch are gone, the image in view", afterGt);
await page.context().close();
await done(0);
