// Drives shell.gt.legacy (req/shell/ground-truth/legacy) in headless Chromium on the fixture study, against the stand-in Google of
// stand_in_drive.mjs, as a Ground Truth Tagger: an old store of the study's own is offered once its run is in the log, is never
// loaded unasked, loads as a base counted as unsaved, is forgotten only when a draft has kept it, and is offered again at the
// next visit until then. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/gt_legacy_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { until } from "./page_until.mjs";
import { kit } from "./gt_history_kit.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const drive = await standIn({ answers, studies, rootDir });
const { GT, approved, FILES, open, check, done } = drive;
approved.add(GT.submissions);
const png = FILES.find((f) => /\.png$/.test(f.name));
const { tagger, reopen, marks, label, records, ask } = kit({ drive, png });

const KEY = `fx-legacy:${png.name}`;
const OLD = { edits: 3, model: { labels: [{ threshold: 5, count: 3 }], marks: [{ id: "m1", x: 11, y: 12 }, { id: "m2", x: 30, y: 31 }, { id: "m9", x: 5, y: 5 }], checked: true } };
const offers = (page) => page.evaluate(() => ({ box: !$("#gt-offers").hidden, legacy: !$("#gt-load-legacy").hidden, draft: !$("#gt-load-draft").hidden,
  text: $("#gt-load-legacy").textContent.trim(), title: $("#gt-load-legacy").title }));
const kept = (page) => page.evaluate((k) => localStorage.getItem(k) !== null, KEY);

const page = await open(true);
await tagger(page);
await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, OLD]);

// offered once the run is in the log, and never loaded unasked
await page.click("#fx-count");
await until(page, () => !!window.fixture.model());
const fromRun = await marks(page);
await until(page, () => !$("#gt-offers").hidden);
let o = await offers(page);
await check(o.box && o.legacy && !o.draft && /^Load earlier edits/.test(o.text) && /marks kept in this browser/.test(o.title), "the old store is offered beside Load draft once the run lands, saying where it came from", o);
await check(JSON.parse(fromRun).length === 2 && (await kept(page)), "nothing is loaded unasked, and the old store is still there");
await page.click("#gt-start");

// loaded as a base, counted as unsaved, and not yet forgotten
await page.click("#gt-load-legacy");
await until(page, () => window.fixture.model().marks.length === 3);
const loaded = (await page.evaluate(() => window.fixture.model())).marks.map((m) => m.id).join();
const l = await label(page);
o = await offers(page);
await check(loaded === "m1,m2,m9" && !o.box && l.text === "· 3 unsaved" && !(await page.isDisabled("#gt-save-draft")) && await kept(page),
  "Load earlier edits makes the document the base, counts its edits as unsaved and leaves the old store in place", { loaded, o, l });
await check(await page.isDisabled("#gt-undo"), "there is nothing to undo before the base");
const rows = await page.evaluate(() => [...document.querySelectorAll("#eh-list .what")].map((x) => x.textContent));
await check(rows.some((r) => /marks kept in this browser/.test(r)), "Edit History names where the base came from", rows);

// Clear all history keeps the base it was loaded as, and says so
await ask(page, true, () => page.click("#eh-clear"));
await until(page, () => /History cleared/.test($("#status").textContent));
await check(/back to the earlier edits/.test(await page.textContent("#status")) && (await page.evaluate(() => window.fixture.model().marks.length)) === 3,
  "Clear all history goes back to the earlier edits, not to the algorithm's output, and says so", await page.textContent("#status"));

// closing the page before it is saved loses nothing: it is offered again at the next visit
await reopen(page);
await page.click("#fx-count");
await until(page, () => !!window.fixture.model());
await until(page, () => !$("#gt-offers").hidden);
o = await offers(page);
await check(o.legacy && await kept(page), "the page closed before a draft held the base: the old store is still there and offered again", o);
await page.click("#gt-start");

// loaded and saved: forgotten, and the draft holds the base
await page.click("#gt-load-legacy");
await until(page, () => window.fixture.model().marks.length === 3);
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
o = await offers(page);
const recs = await records(page);
await check(!(await kept(page)) && !o.box && recs.length === 1 && recs[0].log.at(-1).type === "base" && recs[0].model.marks.length === 3,
  "Save Draft keeps the base and only then forgets the old store", { kept: await kept(page), o, log: recs[0]?.log.map((a) => a.type) });

// a new visit: nothing of the old store is offered, the draft is, and it brings the base back with its replay verified
await reopen(page);
await page.click("#fx-count");
await until(page, () => !!window.fixture.model());
await until(page, () => !$("#gt-offers").hidden);
o = await offers(page);
await check(!o.legacy && o.draft, "the old store is gone and the draft is offered", o);
await page.click("#gt-load-draft");
await until(page, () => window.fixture.model().marks.length === 3);
await check(/verified/.test(await page.textContent("#status")) && (await page.evaluate(() => window.fixture.model().marks.map((m) => m.id).join())) === "m1,m2,m9", "the draft brings the base back, its replay verified");
await page.context().close();

// an old store handed over as the GT actions it implies: recorded on the run's model at the click, each the tagger's own
{
  const page = await open(true);
  await tagger(page);
  const ACTIONS = [{ type: "move-mark", mark: "m1", to: [40, 41] }, { type: "delete-mark", mark: "m7" }, { type: "check", on: true }];
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, { actions: ACTIONS }]);
  const there = () => kept(page);
  await page.click("#fx-count");
  await until(page, () => !!window.fixture.model());
  await until(page, () => !$("#gt-offers").hidden);
  let o = await offers(page);
  await check(o.legacy && /3 actions/.test(o.title) && !(await page.evaluate(() => window.fixture.model().checked)), "actions of an old store are offered, and none is done unasked", o);
  await page.click("#gt-start");
  await page.click("#gt-load-legacy");
  await until(page, () => window.fixture.model().checked);
  const m = await page.evaluate(() => window.fixture.model());
  const rows = await page.evaluate(() => [...document.querySelectorAll("#eh-list .what")].map((x) => x.textContent));
  const l = await label(page);
  o = await offers(page);
  await check(m.marks.find((x) => x.id === "m1").x === 40 && m.marks.length === 2 && l.text === "· 2 unsaved" && !o.legacy && await there()
    && /Count checked/.test(rows[0]) && /Moved mark m1/.test(rows[1]) && !rows.some((r) => /marks kept in this browser/.test(r)),
    "Load earlier edits records each as a GT action of the tagger's, leaving out the one whose mark is not there, with no base", { m, rows, l, o });
  await page.click("#gt-undo");
  await check(!(await page.evaluate(() => window.fixture.model().checked)) && (await page.evaluate(() => window.fixture.model().marks.find((x) => x.id === "m1").x)) === 40, "and Undo takes back the last of them alone");
  await page.click("#gt-save-draft");
  await until(page, () => $("#gt-unsaved").hidden);
  await check(!(await there()), "Save Draft keeps them and only then forgets the old store");
  await page.context().close();
}
await done(0);
