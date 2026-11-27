// Drives shell/study/members, req/shell/study/visibility and shell/study/review-link in headless Chromium against the
// stand-in Google of stand_in_drive.mjs: four studies whose roots Drive's sharing gives to named accounts, the fixture
// (D) being the one whose root is shared by link and whose study file says Review. Exits 1 on a failed check, 2 when
// it cannot run.
//   node web-tests/members_driver.mjs ANSWERS ROOT
import fs from "node:fs";
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { studies as studiesOf } from "./fakes/studies.mjs";
import { idle } from "./page_until.mjs";
import { expecting } from "./harness.mjs";

const [answers, rootDir] = process.argv.slice(2);
const { w, root, drive, ROOT, settings, studyFile, open, check, done } = await standIn({ answers, rootDir });
const X = "x@example.com", Y = "y@example.com";

// A: members {x}; B: members {y}; C: shared by link, its study file at Public; D: the fixture, shared by link, Review
const ROOTS = { nor: w.folder("Root A").readableBy(X).id, b: w.folder("Root B").readableBy(Y).id, c: w.folder("Root C").public().saysStudy({ stage: "Public" }).id };
studyFile({ stage: "Review" });

const link = (id) => `https://drive.google.com/drive/folders/${id}`;
const LIST = [{ id: "nor", title: "Study A", stage: "Develop", root: ROOTS.nor }, { id: "b", title: "Study B", stage: "Develop", root: ROOTS.b },
  { id: "c", title: "Study C", stage: "Public", root: ROOTS.c }, { id: "fixture", title: "Study D", stage: "Develop", root: ROOT }];
const moduleFetches = [];
const prepare = (ctx) => {
  ctx.on("request", (r) => { if (/\/studies\/nor\/web\//.test(r.url())) moduleFetches.push(r.url()); });
  const s = studiesOf(ctx);
  for (const [id, title, stage] of [["nor", "Study A", "Develop"], ["b", "Study B", "Develop"], ["c", "Study C", "Public"]]) {
    s.edit(id, () => ({ id, title, visibility: "listed", stage, root: link(ROOTS[id]), files: { from: ["drive"], accept: ".png" }, web: { module: "web/none.js" }, python: { paths: [], entry: "none", packages: [], wheels: [] } }));
  }
  s.editList(() => LIST);
};
const offered = (page) => page.evaluate(() => [...document.querySelectorAll("#study-list a")].map((a) => a.dataset.id).sort());
const listed = async (page, want) => {
  await page.waitForFunction((w) => JSON.stringify([...document.querySelectorAll("#study-list a")].map((a) => a.dataset.id).sort()) === JSON.stringify(w), want)
    .catch(async (e) => { console.error("listed " + JSON.stringify(await offered(page)) + ", wanted " + JSON.stringify(want)); throw e; });
  await idle(page);
  return offered(page);
};
const was = () => drive.calls.length;
const since = (n) => drive.calls.slice(n);
const batches = (calls) => calls.filter((c) => c.kind === "batch");
const roots = new Set(Object.values(ROOTS));

// signed in as x: A, C and D; one batch request, and no call of its own about any study's root
let n = was();
let page = await open(true, { email: X, prepare });
await listed(page, ["c", "fixture", "nor"]);
let calls = since(n);
await check(batches(calls).length === 1 && !calls.some((c) => !c.batched && c.kind === "details" && roots.has(c.id)),
  "signed in as x, the switcher lists A, C and D, asked of Drive in one batch request and no call per study", calls.map((c) => [c.kind, c.id, c.batched]));
await page.context().close();

// signed in as y: B, C and D
page = await open(true, { email: Y, prepare });
await check(JSON.stringify(await listed(page, ["b", "c", "fixture"])) === '["b","c","fixture"]', "signed in as y, the switcher lists B, C and D");

// the studies Drive let y open, kept with the sign-in
const learned = await page.evaluate(() => JSON.parse(localStorage.getItem("nor-google-sign-in")).learned);
await check(Array.isArray(learned?.members) && learned.members.includes("b") && !learned.members.includes("nor"), "the page keeps the studies Drive let y open with y's sign-in", learned);
await page.context().close();

// a device that kept that, its token run out: the list Drive last gave, and a line saying so
n = was();
page = await open(true, { email: Y, prepare, until: Date.now() - 1, learned });
await listed(page, ["b", "c", "fixture"]);
const note = await page.evaluate(() => { const e = document.querySelector("#study-stale"); return e && !e.hidden ? e.textContent : ""; });
await check(/as Drive last said/.test(note) && !batches(since(n)).length, "with the token run out, the list Drive last gave stays, with the line \"as Drive last said\" under it and no batch request", [note, batches(since(n)).length]);
await page.context().close();

// signed out: C alone, and no batch request
n = was();
page = await open(false, { prepare });
await listed(page, ["c"]);
await check(!batches(since(n)).length, "signed out, the switcher lists C alone and asks Drive for no batch", since(n).map((c) => c.kind));

// D, in Review, opens at its address signed out and is not listed
const title = await page.evaluate(() => document.querySelector("#title").textContent.trim());
await check(title === "Fixture" && !(await offered(page)).includes("fixture"), "signed out, D (Review) opens at its address and is not listed", title);
await page.context().close();

// sign out then in as another account: the first account's list is gone
page = await open(true, { email: X, prepare });
await listed(page, ["c", "fixture", "nor"]);
await page.click("#user-menu summary");
await page.click("#sign-out");
await listed(page, ["c"]);
await check(true, "signing out takes the account's list away");
await page.context().close();

// a study's address opened by someone who may not see it: signed in, naming the account and offering Sign out
{
  const ctxPage = await open(true, { email: Y, id: "nor", prepare });
  const seen = await ctxPage.evaluate(() => ({ text: document.querySelector("#notice-text").textContent, shown: !document.querySelector("#notice").hidden,
    out: !!document.querySelector("#notice-sign-out") && !document.querySelector("#notice-sign-out").hidden, title: document.querySelector("#title").textContent.trim() }));
  await check(seen.shown && seen.text.includes(Y) && seen.out && seen.title === "Image Viewer", "opened by y, study A says it is not open to y's account, offers Sign out and opens the Image Viewer", seen);
  await ctxPage.context().close();
}
{
  // asking whether the site's key reads the root: Drive knows it not
  let out = null;
  await expecting(/status of 404.*googleapis/, async () => { out = await open(false, { id: "nor", prepare }); });
  const seen = await out.evaluate(() => ({ text: document.querySelector("#notice-text").textContent, shown: !document.querySelector("#notice").hidden,
    out: !!document.querySelector("#notice-sign-out") && !document.querySelector("#notice-sign-out").hidden }));
  await check(seen.shown && /not open right now/.test(seen.text) && !seen.out, "opened signed out, study A says it is not open right now", seen);
  await out.context().close();
}
// signed out, the stage is the study file's, read by the site's key (shell/study/stage): the study.json's and the list's stand in until it answers
{
  const image = path.join(rootDir, "d photo.jpg");
  const fileSays = (stage) => studyFile({ stage });
  const listedAs = (stage) => (ctx) => { prepare(ctx); studiesOf(ctx).editList(() => LIST.map((e) => (e.id === "fixture" ? { ...e, stage } : e))); };
  const annotatable = async (pg) => {
    await pg.setInputFiles("#file", image);
    await pg.waitForFunction(() => !!window.shellForTests?.page.get("image") && document.querySelector("#busy").hidden);
    await idle(pg);
    return pg.evaluate(() => !!document.querySelector("#annotate-load")?.checkVisibility());
  };
  const stageOn = (pg, want) => pg.waitForFunction((w) => document.documentElement.dataset.stage === w, want).then(() => true, async () => pg.evaluate(() => document.documentElement.dataset.stage));
  const reads = () => drive.calls.filter((c) => !c.token && c.key && c.kind !== "batch" && c.parent === ROOT || c.id === settings.id);

  // the file says Review, study.json and the list Public: shown as Review, annotating closed, not listed
  fileSays("Review");
  let sp = await open(false, { prepare: listedAs("Public"), study: { stage: "Public" } });
  await check(await stageOn(sp, "Review") === true, "signed out, a study whose file says Review shows as Review though study.json says Public", await stageOn(sp, "Review"));
  await listed(sp, ["c"]);
  await check(!(await annotatable(sp)), "and annotating is closed", await sp.evaluate(() => document.documentElement.dataset.stage));
  await check(reads().length >= 1, "the study file was read signed out, by the site's key", reads().length);
  await sp.context().close();

  // the file says Public, study.json and the list Develop: shown as Public and listed
  fileSays("Public");
  sp = await open(false, { prepare: listedAs("Develop"), study: { stage: "Develop" } });
  await check(await stageOn(sp, "Public") === true, "signed out, a study whose file says Public shows as Public though study.json says Develop", await stageOn(sp, "Public"));
  await listed(sp, ["c", "fixture"]);
  await check(true, "and it is listed");
  await sp.context().close();

  // the file says Develop, study.json and the list Public: not listed, and annotating open
  fileSays("Develop");
  sp = await open(false, { prepare: listedAs("Public"), study: { stage: "Public" } });
  await check(await stageOn(sp, "Develop") === true, "signed out, a study whose file says Develop shows as Develop though study.json says Public", await stageOn(sp, "Develop"));
  await listed(sp, ["c"]);
  await check(await annotatable(sp), "annotating is open, which the Review case had closed");
  await sp.context().close();
  fileSays("Review");
}
// Make Available Offline for a study whose file lists no data folder: no folder is listed, least of all one named undefined
{
  const { folders } = root.study();
  studyFile({ folders: [] });
  const op = await open(true, { email: X, prepare });
  await op.click("#user-menu summary");
  await op.click("#manage-storage");
  await op.waitForFunction(() => document.querySelector("#usage-dlg").open && !/Reading/.test(document.querySelector("#storage-list").textContent));
  const n = was();
  await op.click('#storage-list .group[data-group="study:fixture"] .make-offline');
  await op.waitForSelector("#offline-dlg[open]");
  await idle(op);
  const parents = drive.calls.slice(n).filter((c) => c.kind === "list").map((c) => c.parent);
  await check(!parents.some((p) => !p || p === "undefined"), "Make Available Offline of a study whose file lists no data folder lists no folder of an undefined id", parents);
  await op.context().close();
  studyFile({ folders });
}
// a member who signs out from a study whose root is the members': the stage and the index are refused by design, and read quietly
{
  root.readableBy(X);
  const mp = await open(true, { email: X, prepare });
  await mp.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
  await idle(mp);
  // the minute's copy of the study file lapsed, so signing out asks the store again, refused as the root is the members' alone
  await mp.evaluate(() => { const now = Date.now(); Date.now = () => now + 120000; });
  await expecting(/status of 404/, async () => {
    await mp.click("#user-menu summary");
    await mp.click("#sign-out");
    await idle(mp);
    await mp.click("#load .shine");
    await idle(mp);
  });
  await check(true, "signing out of a study whose root is the members', and opening Load, warn of no stage or index not read");
  await mp.context().close();
}
await check(!moduleFetches.length, "neither loads the study's module", moduleFetches);
await done(0);
