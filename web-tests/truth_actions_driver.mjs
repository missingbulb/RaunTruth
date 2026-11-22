// Runs the GT action log (web/truth_actions.js) under Node against the fixture study's GT actions, case by case, and
// prints each case's outcome as one JSON object for test_truth_actions.py to judge.
//   node web-tests/truth_actions_driver.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ta = await import(path.join(repo, "web", "truth_actions.js"));
const fx = await import(path.join(repo, "studies", "fixture", "web", "gt_actions.js"));

const out = {};
const same = (a, b) => ta.canonical(a) === ta.canonical(b);
const runOf = (spots, threshold = 5) => ({ algorithm: { key: "count", settings: { threshold } }, output: { threshold, count: spots.length, spots } });
const TWO = [[10, 10], [50, 50]];
const fresh = (spots = TWO, study = fx) => { const log = ta.actionLog(study); log.open({ name: "a.png" }, "fixture"); log.ran(runOf(spots)); return log; };
const types = (log) => log.actions.map((a) => a.type);
const deepFreeze = (v) => { if (v && typeof v === "object" && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const counting = () => { const c = { runs: 0 }; return { c, study: { ...fx, run: (m, a) => (c.runs++, fx.run(m, a)) } }; };

// 1. a replay
{
  const log = fresh();
  log.act({ type: "move-mark", mark: "m1", to: [12, 13] });
  log.act({ type: "add-mark", mark: "m3", to: [70, 70] });
  log.act({ type: "delete-mark", mark: "m2" });
  log.act({ type: "check", on: true });
  const r = ta.replay(fx, log.actions);
  out.replay = { model: r.model, live: log.model, equal: same(r.model, log.model), skipped: [...r.skipped], dead: r.dead,
    types: types(log), count: log.count, timed: log.actions.every((a) => typeof a.at === "string") };
}

// 2. undo then redo for every fixture action
{
  out.undoRedo = {};
  const each = {
    "move-mark": { type: "move-mark", mark: "m1", to: [20, 21] },
    "add-mark": { type: "add-mark", mark: "m3", to: [5, 6] },
    "delete-mark": { type: "delete-mark", mark: "m2" },
    check: { type: "check", on: true },
  };
  for (const [name, a] of Object.entries(each)) {
    const log = fresh(), before = log.model;
    const done = log.act(a).model;
    const moved = log.undo();
    const undone = log.model, canRedo = log.canRedo;
    const again = log.redo();
    out.undoRedo[name] = { undoneIsBefore: same(undone, before), movedType: moved?.type, canRedo, redoType: again?.type,
      redoneIsDone: same(log.model, done), changed: !same(done, before), atEnd: !log.canRedo };
  }
}

// 3. a new action forgets what was undone
{
  const log = fresh();
  log.act({ type: "check", on: true });
  log.act({ type: "delete-mark", mark: "m1" });
  log.undo();
  const before = log.undone.length;
  log.act({ type: "move-mark", mark: "m2", to: [1, 1] });
  out.forgets = { before, after: log.undone.length, canRedo: log.canRedo, types: types(log) };
}

// 4. undo stops at the first run
{
  const log = fresh(), model = log.model;
  const r = log.undo();
  out.stops = { canUndo: log.canUndo, undo: r, same: same(log.model, model), types: types(log), floor: log.floor };
  const opened = ta.actionLog(fx); opened.open({ name: "a.png" }, "fixture");
  const can = opened.canUndo, undo = opened.undo();
  opened.goto(0);
  out.stops.opened = { can, undo, types: types(opened) };
}

// 5. a second run carries actions by id
{
  const log = fresh();
  log.act({ type: "move-mark", mark: "m1", to: [11, 11] });
  log.act({ type: "move-mark", mark: "m2", to: [52, 52] });
  const onRun1 = log.model;
  log.ran(runOf([[51, 50]]));
  const m = log.model;
  const skippedBefore = [...log.skipped];
  log.undo();
  out.second = { marks: m.marks, next: m.next, skipped: skippedBefore, types: types(log).length,
    undoneToRun1: same(log.model, onRun1), undoneMarks: log.model.marks };
}

// 6. two runs with nothing between are one
{
  const log = fresh();
  log.ran(runOf([[1, 1]], 9));
  out.twoRuns = { types: types(log), threshold: log.model.threshold, marks: log.model.marks.length, undone: log.undone.length };
}

// 7. no action before a run, none for a missing item
{
  const bare = ta.actionLog(fx); bare.open({ name: "a.png" }, "fixture");
  let threw = false; try { bare.act({ type: "check", on: true }); } catch { threw = true; }
  const log = fresh(), n = log.actions.length;
  const r = log.act({ type: "move-mark", mark: "m9", to: [0, 0] });
  const d = log.act({ type: "delete-mark", mark: "m9" });
  out.refused = { threw, none: bare.actions.length, skip: r, delSkip: d, appended: log.actions.length - n };
}

// 8. goto equals a replay
{
  const log = fresh();
  for (let i = 0; i < 6; i++) log.act({ type: "move-mark", mark: i % 2 ? "m2" : "m1", to: [i, i] });
  const all = log.actions.slice();
  log.undo(); log.undo();
  out.goto = { checks: {} };
  for (const n of [3, 5, 7, 8]) { log.goto(n); out.goto.checks[n] = { len: log.actions.length, same: same(log.model, ta.replay(fx, all.slice(0, n)).model), undone: log.undone.length }; }
  log.goto(0); out.goto.low = log.actions.length;
  log.goto(99); out.goto.high = log.actions.length;
  out.goto.highSame = same(log.model, ta.replay(fx, all).model);
}

// 9. an undo replays at most 25
{
  const { c, study } = counting();
  const log = fresh(TWO, study);
  for (let i = 0; i < 60; i++) log.act({ type: "move-mark", mark: "m1", to: [i, i] });
  out.cap = { acts: c.runs };
  const worst = { undo: 0, goto: 0 };
  for (let k = 0; k < 20; k++) { c.runs = 0; log.undo(); worst.undo = Math.max(worst.undo, c.runs); }
  for (const n of [10, 40, 55, 62]) { c.runs = 0; log.goto(n); worst.goto = Math.max(worst.goto, c.runs); }
  out.cap.worst = worst;
  out.cap.right = same(log.model, ta.replay(fx, log.actions).model);
}

// 10. the check
{
  const log = fresh();
  log.act({ type: "move-mark", mark: "m1", to: [11, 11] });
  const stored = { ...fx.document(log.model), tagger: "a@b.c", created: "2026-11-17T10:00:00Z", history: [], image: { name: "a.png" }, accepted: true };
  const a = await ta.check(fx, log.actions, stored);
  const wrong = { ...stored, marks: [{ id: "m1", x: 99, y: 99 }, { id: "m2", x: 50, y: 50 }] };
  const b = await ta.check(fx, log.actions, wrong);
  const none = await ta.check(fx, [], wrong);
  const rb = ta.replay(fx, b.actions);
  const lg = ta.actionLog(fx); lg.load(b.actions);
  const broken = await ta.check({ ...fx, run() { throw new Error("no such mark"); } }, await ta.pack(log.actions), stored, { now: () => "then" });
  out.check = { broken: { replay: broken.replay, types: broken.actions.map((x) => x.type), error: broken.error, at: broken.actions.at(-1).at, plain: Array.isArray(broken.actions[1].output.spots) },
    okError: "error" in a, ok: a.replay, okSame: same(a.actions, log.actions),
    bad: b.replay, badTypes: b.actions.map((x) => x.type), badModelWins: same(fx.document(rb.model).marks, wrong.marks), badDead: rb.dead, badDeadLog: lg.dead,
    badFloor: lg.floor, badCanUndo: lg.canUndo,
    none: none.replay, noneTypes: none.actions.map((x) => x.type), noneFrom: none.actions[0]?.from, noneModel: none.actions[0]?.model };
}

// 11. a run's output packs and unpacks
{
  const spots = Array.from({ length: 300 }, (_, i) => [i * 3 % 251, i * 7 % 241]);
  const log = fresh(spots);
  log.act({ type: "check", on: true });
  const packed = await ta.pack(log.actions);
  const back = await ta.unpack(packed);
  const again = await ta.unpack(back);
  const run = packed.find((a) => a.type === "run");
  out.pack = { equal: same(back, log.actions), plainLeft: same(again, back), keys: Object.keys(run.output), smaller: JSON.stringify(run.output).length < JSON.stringify(log.actions[1].output).length,
    others: same(packed.filter((a) => a.type !== "run"), log.actions.filter((a) => a.type !== "run")), notChanged: Array.isArray(log.actions[1].output.spots) };
}

// 12. the hash ignores the shell's keys and key order
{
  const d = { labels: [{ threshold: 5, count: 2 }], marks: [{ id: "m1", x: 1, y: 2 }], checked: false };
  const h = await ta.sha256(d);
  const dressed = { checked: false, tagger: "a@b.c", marks: [{ y: 2, x: 1, id: "m1" }], history: [1], created: "x", image: {}, accepted: true, labels: [{ count: 2, threshold: 5 }] };
  const other = await ta.sha256({ ...d, checked: true });
  out.hash = { equal: h === await ta.sha256(dressed), differs: h !== other, hex: /^[0-9a-f]{64}$/.test(h),
    canonical: ta.canonical({ b: 1, a: { d: undefined, c: [2, { z: 1, y: 0 }] } }), bare: ta.bare(dressed) };
}

// 13. clear
{
  const log = fresh();
  log.act({ type: "check", on: true });
  log.act({ type: "move-mark", mark: "m1", to: [3, 3] });
  log.undo();
  const run = log.actions[1], first = log.model;
  log.clear();
  out.clear = { types: types(log), undone: log.undone.length, run: same(log.actions[1], run), model: same(log.model, fx.start(run.output)), marks: log.model.marks.length, first: first.marks.length };
  const b = ta.actionLog(fx); b.load([{ type: "open", at: "t" }, { type: "run", at: "t", ...runOf(TWO) }, { type: "check", at: "t", on: true },
    { type: "base", at: "t", model: fx.document(fx.start(runOf(TWO).output)) }, { type: "check", at: "t", on: true }]);
  b.clear();
  out.clear.base = types(b);
}

// 14. no model is changed in place
{
  const seen = [];
  const study = { ...fx, start: (o, p) => deepFreeze(fx.start(o, p)), run: (m, a) => { seen.push(Object.isFrozen(m)); return deepFreeze(fx.run(deepFreeze(m), deepFreeze(a))); }, load: (d) => deepFreeze(fx.load(d)) };
  let error = null;
  try {
    const log = fresh(TWO, study);
    log.act({ type: "move-mark", mark: "m1", to: [1, 1] });
    log.act({ type: "add-mark", mark: "m3", to: [9, 9] });
    log.act({ type: "delete-mark", mark: "m2" });
    log.act({ type: "check", on: true });
    log.ran(runOf([[10, 10]]));
    log.undo(); log.undo(); log.redo(); log.goto(3);
    ta.replay(study, log.actions);
  } catch (e) { error = String(e); }
  out.frozen = { error, calls: seen.length, allFrozen: seen.every(Boolean) };
}

// 15. an action keeps its time or takes the clock
{
  let t = 0;
  const log = ta.actionLog(fx, { now: () => "T" + ++t });
  log.open({ name: "a.png" }, "fixture");
  log.ran(runOf(TWO));
  log.act({ type: "check", on: true });
  log.act({ type: "check", on: false, at: "mine" });
  let place = null; try { log.act({ type: "check", on: true, at: [3, 4] }); } catch (e) { place = String(e); }
  out.clock = { place, ats: log.actions.map((a) => a.at), open: log.actions[0], run: { at: log.actions[1].at, algorithm: log.actions[1].algorithm } };
  const d = ta.actionLog(fx); d.open({ name: "a.png" }, "fixture");
  out.clock.default = /^\d{4}-\d\d-\d\dT/.test(d.actions[0].at);
}

// 16. every study's GT actions load without a page
{
  const names = ["start", "run", "describe", "where", "document", "load"], found = {};
  for (const dir of fs.readdirSync(path.join(repo, "studies")).sort()) {
    const file = path.join(repo, "studies", dir, "study.json");
    if (!fs.existsSync(file)) continue;
    const rel = JSON.parse(fs.readFileSync(file, "utf8")).groundTruth?.actions;
    if (!rel) continue;
    const mod = await import(pathToFileURL(path.join(repo, "studies", dir, rel)).href);
    found[dir] = Object.fromEntries(names.map((n) => [n, typeof mod[n]]));
  }
  out.studies = found;
}

// 17. what a run could not carry over, from the log alone: a run after a base lists the base's edits that found no place
{
  const log = ta.actionLog(fx); log.open({ name: "a.png" }, "fixture");
  log.load([...log.actions, { type: "base", at: "T0", from: {}, model: { labels: [{ threshold: 5, count: 3 }], marks: [{ id: "m1", x: 10, y: 10 }, { id: "m2", x: 70, y: 50 }, { id: "m3", x: 30, y: 30 }], checked: false } }]);
  log.ran(runOf([[10, 10], [30, 31]]));
  const acts = log.actions, aRun = fresh();
  out.leftOut = { model: log.model.dropped, listed: ta.leftOut(fx, acts, 2), again: ta.leftOut(fx, acts, 2), marks: log.model.marks.map((m) => m.id),
    afterRun: ta.leftOut(fx, aRun.actions, 1), onBase: ta.leftOut(fx, acts, 1), outOfRange: ta.leftOut(fx, acts, 9) };
}

// 18. a run records the version that made it (req/shell/extractions/file): the site's and the study's code hash, as handed in; a run
// from a file written before has none, and says so: never a guessed one
{
  const log = ta.actionLog(fx); log.open({ name: "a.png" }, "fixture");
  log.ran({ ...runOf(TWO), version: { site: "0.11121.154", code: "c0de".repeat(16) } });
  const old = fresh(), stored = fx.document(old.model);
  const checked = await ta.check(fx, await ta.unpack(await ta.pack(log.actions)), fx.document(log.model));
  out.version = { recorded: log.actions[1].version, label: ta.versionLabel(log.actions[1]), kept: checked.actions[1].version,
    old: old.actions[1].version ?? null, oldLabel: ta.versionLabel(old.actions[1]), notARun: ta.versionLabel(old.actions[0]),
    oldLoads: (await ta.check(fx, old.actions, stored)).replay };
}

console.log(JSON.stringify(out));
