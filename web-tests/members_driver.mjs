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
const { drive, google, ROOT, open, check, done } = await standIn({ answers, rootDir });
const X = "x@example.com", Y = "y@example.com";

// A: members {x}; B: members {y}; C: shared by link, its study file at Public; D: the fixture, shared by link, Review
const ROOTS = { nor: "memrootA0000000000001", b: "memrootB0000000000001", c: "memrootC0000000000001" };
drive.folder({ id: ROOTS.nor, name: "Root A", access: "private" }); drive.readers.set(ROOTS.nor, new Set([X]));
drive.folder({ id: ROOTS.b, name: "Root B", access: "private" }); drive.readers.set(ROOTS.b, new Set([Y]));
drive.folder({ id: ROOTS.c, name: "Root C", access: "public" });
drive.file({ id: "memstudyC00000000001", name: "rauntruth-study.json", parent: ROOTS.c, bytes: Buffer.from(JSON.stringify({ format: "rauntruth-study/2", stage: "Public" })) });
const settings = drive.get("dmsettings00000000001");
settings.bytes = Buffer.from(JSON.stringify({ ...JSON.parse(settings.bytes.toString()), format: "rauntruth-study/2", stage: "Review" }));

const link = (id) => `https://drive.google.com/drive/folders/${id}`;
const LIST = [{ id: "nor", title: "Study A", stage: "Develop", root: ROOTS.nor }, { id: "b", title: "Study B", stage: "Develop", root: ROOTS.b },
  { id: "c", title: "Study C", stage: "Public", root: ROOTS.c }, { id: "fixture", title: "Study D", stage: "Develop", root: ROOT }];
const moduleFetches = [];
const prepare = (ctx) => {
  ctx.on("request", (r) => { if (/\/studies\/nor\/web\//.test(r.url())) moduleFetches.push(r.url()); });
  const s = studiesOf(ctx);
  for (const [id, title, stage] of [["nor", "Study A", "Develop"], ["b", "Study B", "Develop"], ["c", "Study C", "Public"]]) {
    s.edit(id, () => ({ id, title, visibility: "listed", stage, root: link(ROOTS[id]), web: { module: "web/none.js" }, python: { paths: [], entry: "none", packages: [], wheels: [] } }));
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

// the token run out, the page opened again: the list Drive last gave, and a line saying so
google.revokeAll();
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("nor-google-sign-in")); s.until = Date.now() - 1; localStorage.setItem("nor-google-sign-in", JSON.stringify(s)); });
n = was();
await page.reload();
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
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
  const fileSays = (stage) => { drive.get("dmsettings00000000001").bytes = Buffer.from(JSON.stringify({ ...JSON.parse(drive.get("dmsettings00000000001").bytes.toString()), stage })); };
  const listedAs = (stage) => (ctx) => { prepare(ctx); studiesOf(ctx).editList(() => LIST.map((e) => (e.id === "fixture" ? { ...e, stage } : e))); };
  const annotatable = async (pg) => {
    await pg.setInputFiles("#file", image);
    await pg.waitForFunction(() => !!window.shellForTests?.page.get("image") && document.querySelector("#busy").hidden);
    await idle(pg);
    return pg.evaluate(() => !!document.querySelector("#annotate-scratch")?.checkVisibility());
  };
  const stageOn = (pg, want) => pg.waitForFunction((w) => document.documentElement.dataset.stage === w, want).then(() => true, async () => pg.evaluate(() => document.documentElement.dataset.stage));
  const reads = () => drive.calls.filter((c) => !c.token && c.key && c.kind !== "batch" && c.parent === ROOT || c.id === "dmsettings00000000001");

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
await check(!moduleFetches.length, "neither loads the study's module", moduleFetches);
await done(0);
