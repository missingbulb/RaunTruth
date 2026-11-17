// The NoR Finder's GT actions (web/gt_actions.js), on a small hand-built run, under Node.
// Run: node tests/test_gt_actions.mjs
import assert from 'node:assert/strict';
import * as N from '../web/gt_actions.js';
import { actionLog, check, canonical } from '../../../web/truth_actions.js';

const DAY = '2026-11-17T10:00:00.000Z';
const act = (a) => ({ at: DAY, ...a });
const seg = (x, y, a) => [[x - a / 2, y], [x + a / 2, y]];
const linesAt = (x, y) => ({ length: seg(x, y, 10), red: seg(x, y, 4), width: [[x, y - 2], [x, y + 2]] });
const cand = (i, x, y, fail = null) => ({ i, n: i + 1, x, y, bb: [x - 5, y - 2, x + 5, y + 2], lines: linesAt(x, y), m: { length: 10, red_length: 4, width: 4, red_over_length: .4, length_over_width: 2.5 }, fail });
// what Find Candidates hands over: four numbered candidates, the second rejected by a filter
const IMAGE = { name: 'slide.tif', sha256: 'ab'.repeat(32), width: 400, height: 300, um_per_px: .17, location: { source: 'local' } };
const output = (over = {}) => ({ image: IMAGE, finder: 'tl', finder_settings: {}, filters: { values: {}, off: [] }, grid: 10, numbered: 4,
  cands: [cand(0, 10, 10), cand(1, 50, 50, 'dim'), cand(2, 80, 80), cand(3, 30, 70)], ...over });
const start = (over, previous) => N.start(output(over), previous);
const cand_ = (m, id) => [...m.cands, ...m.deleted].find((c) => c.id === id);
const ids = (list) => list.map((c) => c.id);
const frozen = (x) => { if (x && typeof x === 'object') { Object.values(x).forEach(frozen); Object.freeze(x); } return x; };
const run = (m, a) => N.run(m, act(a));
const doc = (m) => N.document(m);
const log = (out = output()) => {
  const l = actionLog(N);
  l.open({ name: 'slide.tif' }, 'nor');
  l.ran({ algorithm: { key: 'tl' }, output: N.identify(out, l.model) });
  return l;
};

const tests = {
  'a run gives each candidate an id c1, c2, … in the order found, none approved or deleted'() {
    const m = start();
    assert.deepEqual(ids(m.cands), ['c1', 'c2', 'c3', 'c4']);
    assert.deepEqual([m.deleted, m.added, m.areas, m.nextC, m.nextU], [[], [], [], 5, 1]);
    assert.deepEqual(m.meta.size, [400, 300]);
    assert.equal(m.meta.finder, 'tl');
    assert.ok(m.cands.every((c) => !('approved' in c) && c.fail !== undefined));
    assert.equal(cand_(m, 'c2').fail, 'dim');
    assert.ok(!('mask' in m.cands[0]) && !('blk' in m.cands[0]), 'no pixel masks');
  },
  'identify gives a candidate at the same rounded place the id it had, kept or rejected, and a new one an id no run gave'() {
    const before = run(start(), { type: 'delete', cand: 'c3' });
    const again = N.identify(output({ cands: [cand(0, 80.4, 79.6), cand(1, 200, 200), cand(2, 10, 10), cand(3, 51, 50)] }), before);
    assert.deepEqual(ids(again.cands), ['c3', 'c5', 'c1', 'c6'], 'c3 was rejected and still keeps its place; 51 is not 50');
    // two candidates at one place: the first takes the id, the other a new one
    const twin = N.identify(output({ cands: [cand(0, 10, 10), cand(1, 10.2, 9.8)] }), start());
    assert.deepEqual(ids(twin.cands), ['c1', 'c5']);
    assert.deepEqual(ids(N.identify(output()).cands), ['c1', 'c2', 'c3', 'c4'], 'with no model before, they count from 1');
    assert.equal(N.identify(output(), before).cands.length, 4);
  },
  'a run whose candidates have ids keeps them; the next model counts past every id given'() {
    const stamped = N.identify(output({ cands: [cand(0, 10, 10), cand(1, 200, 200)] }), start());
    const m = N.start(stamped, start());
    assert.deepEqual(ids(m.cands), ['c1', 'c5']);
    assert.equal(m.nextC, 6);
    assert.equal(N.start(stamped, undefined).nextC, 6);
  },
  'approve marks a candidate approved, once; a rejected one is brought back first'() {
    const m = start(), o = run(m, { type: 'approve', cand: 'c3' });
    assert.equal(cand_(o, 'c3').approved, true);
    assert.equal(cand_(m, 'c3').approved, undefined, 'the model before is not changed');
    assert.deepEqual(run(o, { type: 'approve', cand: 'c3' }), { skip: 'nothing to change' });
    const back = run(run(m, { type: 'delete', cand: 'c2' }), { type: 'approve', cand: 'c2' });
    assert.deepEqual([ids(back.cands), back.deleted, cand_(back, 'c2').approved], [['c1', 'c2', 'c3', 'c4'], [], true], 'it stands among the others again');
  },
  'delete takes a finder\'s candidate out and keeps it, with its lines, apart; deleting an approved one drops its approval'() {
    const m = run(run(start(), { type: 'approve', cand: 'c3' }), { type: 'set-lines', cand: 'c3', lines: { length: seg(80, 80, 14) } });
    const o = run(m, { type: 'delete', cand: 'c3' });
    assert.deepEqual([ids(o.cands), ids(o.deleted)], [['c1', 'c2', 'c4'], ['c3']]);
    assert.equal(o.deleted[0].approved, undefined);
    assert.deepEqual(o.deleted[0].edited.length, seg(80, 80, 14));
    assert.deepEqual(run(o, { type: 'delete', cand: 'c3' }), { skip: 'nothing to change' });
  },
  'undecide clears an approval, or brings a rejected candidate back with its lines'() {
    const m = start(), approved = run(m, { type: 'approve', cand: 'c1' });
    assert.equal(cand_(run(approved, { type: 'undecide', cand: 'c1' }), 'c1').approved, undefined);
    assert.deepEqual(run(m, { type: 'undecide', cand: 'c1' }), { skip: 'nothing to change' });
    const gone = run(run(m, { type: 'set-lines', cand: 'c4', lines: { red: seg(30, 70, 6) } }), { type: 'delete', cand: 'c4' });
    const back = run(gone, { type: 'undecide', cand: 'c4' });
    assert.deepEqual([ids(back.cands), back.deleted], [['c1', 'c2', 'c3', 'c4'], []]);
    assert.deepEqual(cand_(back, 'c4').edited, { red: seg(30, 70, 6) });
    assert.deepEqual(cand_(back, 'c4').lines, linesAt(30, 70), 'the finder\'s lines are kept beside the edit');
  },
  'set-lines keeps only the lines that changed, merges the next drop, and null puts the finder\'s back'() {
    const one = run(start(), { type: 'set-lines', cand: 'c1', lines: { length: seg(10, 10, 12) } });
    assert.deepEqual(Object.keys(cand_(one, 'c1').edited), ['length']);
    const two = run(one, { type: 'set-lines', cand: 'c1', lines: { width: [[10, 7], [10, 13]] } });
    assert.deepEqual(Object.keys(cand_(two, 'c1').edited), ['length', 'width']);
    assert.deepEqual(run(two, { type: 'set-lines', cand: 'c1', lines: { width: [[10, 7], [10, 13]] } }), { skip: 'nothing to change' });
    const reset = run(two, { type: 'set-lines', cand: 'c1', lines: null });
    assert.deepEqual(cand_(reset, 'c1'), cand_(start(), 'c1'));
    assert.deepEqual(run(reset, { type: 'set-lines', cand: 'c1', lines: null }), { skip: 'nothing to change' });
    assert.deepEqual(run(start(), { type: 'set-lines', cand: 'c1', lines: { length: seg(10, 10, 12) } }).cands[0].lines, linesAt(10, 10));
  },
  'add makes a NoR of the tagger\'s own kind of id, undecided, and takes the next id only'() {
    const m = start(), o = run(m, { type: 'add', cand: 'u1', to: [200, 100], lines: linesAt(200, 100) });
    assert.deepEqual([ids(o.added), o.added[0].approved, o.nextU], [['u1'], undefined, 2]);
    assert.deepEqual(run(o, { type: 'add', cand: 'u1', to: [1, 1], lines: linesAt(1, 1) }), { skip: 'its id is taken' });
    assert.deepEqual(run(m, { type: 'add', cand: 'u7', to: [1, 1], lines: linesAt(1, 1) }), { skip: 'its id is taken' });
    assert.equal(N.nextAdded(o), 'u2');
  },
  'an added id is not reused after a delete, and an added NoR is approved, edited, taken back and deleted by id'() {
    let m = run(start(), { type: 'add', cand: 'u1', to: [200, 100], lines: linesAt(200, 100) });
    m = run(m, { type: 'add', cand: 'u2', to: [300, 100], lines: linesAt(300, 100) });
    m = run(m, { type: 'approve', cand: 'u2' });
    assert.equal(m.added[1].approved, true);
    m = run(m, { type: 'set-lines', cand: 'u2', lines: { red: seg(300, 100, 3) } });
    assert.deepEqual(m.added[1].lines.red, seg(300, 100, 3));
    assert.deepEqual(m.added[1].lines.length, seg(300, 100, 10), 'its other lines stay');
    assert.deepEqual(run(m, { type: 'set-lines', cand: 'u2', lines: null }), { skip: 'it has no lines' });
    assert.equal(run(m, { type: 'undecide', cand: 'u2' }).added[1].approved, undefined);
    const gone = run(m, { type: 'delete', cand: 'u2' });
    assert.deepEqual(ids(gone.added), ['u1']);
    assert.equal(N.nextAdded(gone), 'u3');
    assert.deepEqual(run(gone, { type: 'add', cand: 'u2', to: [1, 1], lines: linesAt(1, 1) }), { skip: 'its id is taken' });
    assert.deepEqual(run(gone, { type: 'delete', cand: 'u2' }), { skip: 'its candidate is gone' });
  },
  'check-area adds an area, sorted, and takes it back'() {
    const m = run(run(start(), { type: 'check-area', area: 8, on: true }), { type: 'check-area', area: 3, on: true });
    assert.deepEqual(m.areas, [3, 8]);
    assert.deepEqual(run(m, { type: 'check-area', area: 3, on: true }), { skip: 'nothing to change' });
    assert.deepEqual(run(m, { type: 'check-area', area: 3, on: false }).areas, [8]);
    assert.deepEqual(run(m, { type: 'check-area', area: 5, on: false }), { skip: 'nothing to change' });
  },
  'an action on a candidate that is gone is skipped'() {
    for (const a of [{ type: 'approve' }, { type: 'delete' }, { type: 'undecide' }, { type: 'set-lines', lines: null }]) {
      assert.deepEqual(run(start(), { ...a, cand: 'c9' }), { skip: 'its candidate is gone' }, a.type);
    }
    assert.deepEqual(run(start(), { type: 'mystery' }), { skip: 'not an action of this study' });
  },
  'every action leaves the model before it as it was'() {
    let m = frozen(start());
    for (const a of [{ type: 'approve', cand: 'c1' }, { type: 'set-lines', cand: 'c1', lines: { length: seg(10, 10, 12) } }, { type: 'delete', cand: 'c3' }, { type: 'undecide', cand: 'c3' },
      { type: 'add', cand: 'u1', to: [5, 5], lines: linesAt(5, 5) }, { type: 'approve', cand: 'u1' }, { type: 'check-area', area: 2, on: true }, { type: 'delete', cand: 'u1' }]) {
      m = frozen(run(m, a));
    }
  },
  'the document is the model\'s candidates that remain, the added NoRs and the checked areas, and the same twice'() {
    let m = start();
    m = run(m, { type: 'approve', cand: 'c1' });
    m = run(m, { type: 'delete', cand: 'c2' });
    m = run(m, { type: 'add', cand: 'u1', to: [200, 100], lines: linesAt(200, 100) });
    m = run(m, { type: 'check-area', area: 4, on: true });
    const d = doc(m);
    assert.equal(d.format, 'norfinder-ground-truth/3');
    assert.deepEqual(ids(d.candidates), ['c1', 'c3', 'c4'], 'a rejected candidate is absent');
    assert.equal(d.candidates[0].approved, true);
    assert.deepEqual([d.added.map((a) => a.id), d.areas, d.grid, d.image.name, d.finder], [['u1'], [4], 10, 'slide.tif', 'tl']);
    assert.ok(!('exported' in d) && !('created' in d), 'no clock');
    assert.equal(canonical(doc(m)), canonical(d));
    assert.equal(canonical(doc(N.load(JSON.parse(JSON.stringify(d))))), canonical(d), 'read again, it is the same file');
  },
  'a /3 file read again has the model\'s candidates, and counts ids on from them'() {
    const m = N.load(doc(run(run(start(), { type: 'add', cand: 'u1', to: [1, 1], lines: linesAt(1, 1) }), { type: 'delete', cand: 'c1' })));
    assert.deepEqual([ids(m.cands), m.deleted, ids(m.added), m.nextC, m.nextU], [['c2', 'c3', 'c4'], [], ['u1'], 5, 2]);
  },
  'a /2 file is read: what was marked right is approved, an added NoR is added, what was marked wrong is nothing kept'() {
    const labels = [
      { id: 3, x: 80, y: 80, label: 1, source: 'user', decision: 'approved', measured: 'approved', lines: linesAt(80, 80) },
      { id: 2, x: 50, y: 50, label: 0, source: 'user', decision: 'rejected', measured: null, lines: linesAt(50, 50) },
      { id: 5, kind: 'missing', origin: 'added by user', x: 200, y: 100, label: 1, source: 'user', radius_px: 12, lines: linesAt(200, 100) }];
    const m = N.load({ format: 'norfinder-ground-truth/2', image: IMAGE, finder: 'tl', finder_settings: {}, filters: { values: {}, off: [] }, labels });
    assert.deepEqual([m.cands.length, m.cands[0].approved, m.cands[0].n, m.deleted, ids(m.added), m.added[0].approved], [1, true, 3, [], ['u1'], true]);
    assert.deepEqual(m.meta.size, [400, 300]);
    assert.equal(N.document(m).format, 'norfinder-ground-truth/3');
  },
  'undo and redo take each action back and forward'() {
    const l = log();
    const types = [{ type: 'approve', cand: 'c1' }, { type: 'delete', cand: 'c2' }, { type: 'set-lines', cand: 'c3', lines: { length: seg(80, 80, 14) } },
      { type: 'add', cand: 'u1', to: [200, 100], lines: linesAt(200, 100) }, { type: 'check-area', area: 7, on: true }, { type: 'undecide', cand: 'c1' }];
    for (const t of types) {
      const before = canonical(doc(l.model));
      assert.ok(l.act(act(t)).model, t.type);
      const after = canonical(doc(l.model));
      assert.notEqual(after, before, t.type);
      l.undo();
      assert.equal(canonical(doc(l.model)), before, `undo ${t.type}`);
      l.redo();
      assert.equal(canonical(doc(l.model)), after, `redo ${t.type}`);
    }
    assert.equal(l.count, types.length);
  },
  'delete then undo brings the candidate back with its lines'() {
    const l = log();
    l.act(act({ type: 'set-lines', cand: 'c4', lines: { red: seg(30, 70, 6) } }));
    l.act(act({ type: 'delete', cand: 'c4' }));
    l.undo();
    assert.deepEqual(cand_(l.model, 'c4').edited, { red: seg(30, 70, 6) });
    assert.deepEqual(l.model.deleted, []);
  },
  'a run again keeps each candidate\'s id by place, carries the actions over, and skips one whose candidate has vanished'() {
    const l = log();
    l.act(act({ type: 'approve', cand: 'c1' }));
    l.act(act({ type: 'delete', cand: 'c3' }));
    l.act(act({ type: 'approve', cand: 'c4' }));
    l.act(act({ type: 'add', cand: 'u1', to: [200, 100], lines: linesAt(200, 100) }));
    // the finder again, with filters changed: the candidates at 10,10 and 80,80 are there, 30,70 is not, and one is new
    l.ran({ algorithm: { key: 'tl' }, output: N.identify(output({ cands: [cand(0, 10, 10), cand(1, 80, 80), cand(2, 150, 150)] }), l.model) });
    assert.deepEqual(ids(l.model.cands), ['c1', 'c5'], 'c3 stays rejected and the new one takes the next id');
    assert.deepEqual(ids(l.model.deleted), ['c3']);
    assert.equal(cand_(l.model, 'c1').approved, true);
    assert.deepEqual(ids(l.model.added), ['u1']);
    assert.equal([...l.skipped.values()].length, 1, 'the approval of c4 found no candidate');
    assert.equal([...l.skipped.values()][0], 'its candidate is gone');
    assert.deepEqual(l.model.deleted.length + l.model.cands.length, 3);
  },
  'a NoR added before any run is carried over when the finder runs'() {
    const none = N.blank(IMAGE);
    assert.deepEqual([none.format, none.candidates, none.added, none.areas], ['norfinder-ground-truth/3', [], [], []]);
    const l = actionLog(N);
    l.open({ name: 'slide.tif' }, 'nor');
    l.load([...l.actions, { type: 'base', at: DAY, model: none, from: { note: 'the image alone, before Find Candidates' } }]);
    assert.equal(N.nextAdded(l.model), 'u1');
    assert.ok(l.act(act({ type: 'add', cand: 'u1', to: [200, 100], lines: linesAt(200, 100) })).model);
    l.ran({ algorithm: { key: 'tl' }, output: N.identify(output(), l.model) });
    assert.deepEqual([ids(l.model.cands), ids(l.model.added), l.skipped.size], [['c1', 'c2', 'c3', 'c4'], ['u1'], 0]);
    assert.equal(N.nextAdded(l.model), 'u2');
  },
  'describe names the candidate by its number, and every action reads'() {
    const m = run(run(start(), { type: 'add', cand: 'u1', to: [812.4, 440.2], lines: linesAt(812, 440) }), { type: 'delete', cand: 'c4' });
    assert.equal(N.describe(act({ type: 'approve', cand: 'c3' }), 1, m), 'Approved #3');
    assert.equal(N.describe(act({ type: 'approve', cand: 'c3' }), 31, m), 'Approved 31 candidates');
    assert.equal(N.describe(act({ type: 'delete', cand: 'c4' }), 1, m), 'Deleted #4', 'a rejected candidate keeps its number');
    assert.equal(N.describe(act({ type: 'approve', cand: 'u1' }), 1, m), 'Approved #5', 'an added NoR is numbered after the finder\'s');
    assert.equal(N.describe(act({ type: 'set-lines', cand: 'c3', lines: { length: seg(1, 1, 1) } }), 1, m), 'Moved the length line of #3');
    assert.equal(N.describe(act({ type: 'set-lines', cand: 'c3', lines: { length: seg(1, 1, 1), red: seg(1, 1, 1) } }), 1, m), 'Moved the lines of #3');
    assert.equal(N.describe(act({ type: 'set-lines', cand: 'c3', lines: null }), 1, m), 'Reset the lines of #3');
    assert.equal(N.describe(act({ type: 'add', cand: 'u1', to: [812.4, 440.2] }), 1, m), 'Added a NoR at 812, 440');
    assert.equal(N.describe(act({ type: 'check-area', area: 7, on: true }), 1, m), 'No missed NoRs in area 8');
    assert.equal(N.describe(act({ type: 'check-area', area: 7, on: false }), 1, m), 'Took back no missed NoRs in area 8');
    assert.equal(N.describe(act({ type: 'undecide', cand: 'c3' }), 1, m), 'Took back the verdict on #3');
    assert.equal(N.describe(act({ type: 'approve', cand: 'c9' }), 1, m), 'Approved a candidate');
    assert.equal(N.describe(act({ type: 'delete', cand: 'u1' }), 1, run(m, { type: 'delete', cand: 'u1' })), 'Deleted an added NoR', 'a removed NoR has no number left to name');
    assert.equal(N.describe({ type: 'run', output: output() }), '4 candidates');
    for (const a of [{ type: 'approve', cand: 'c1' }, { type: 'undecide', cand: 'c1' }, { type: 'delete', cand: 'c1' }, { type: 'set-lines', cand: 'c1', lines: null },
      { type: 'add', cand: 'u1', to: [1, 1] }, { type: 'check-area', area: 1, on: true }]) assert.notEqual(N.describe(act(a), 3, m), N.describe(act(a), 1, m), a.type);
  },
  'where is the candidate\'s box in image pixels, an added NoR\'s lines\' box, an area\'s rectangle'() {
    const m = run(run(start(), { type: 'add', cand: 'u1', to: [200, 100], lines: linesAt(200, 100) }), { type: 'delete', cand: 'c4' });
    assert.deepEqual(N.where(act({ type: 'approve', cand: 'c3' }), m), [75, 78, 85, 82]);
    assert.deepEqual(N.where(act({ type: 'delete', cand: 'c4' }), m), [25, 68, 35, 72], 'a rejected candidate is still on the image');
    assert.deepEqual(N.where(act({ type: 'approve', cand: 'u1' }), m), [195, 98, 205, 102]);
    assert.equal(N.where(act({ type: 'approve', cand: 'c9' }), m), null);
    assert.equal(N.where({ type: 'run' }, m), null);
    // area 0 is the top left of 10 × 10, area 10 the first of the second row, which runs back
    assert.deepEqual(N.where(act({ type: 'check-area', area: 0, on: true }), m), [0, 0, 40, 30]);
    assert.deepEqual(N.where(act({ type: 'check-area', area: 10, on: true }), m), [360, 30, 400, 60]);
    assert.deepEqual(N.where(act({ type: 'check-area', area: 19, on: true }), m), [0, 30, 40, 60]);
  },
  'a check against the document it replays to says verified'() {
    const out = N.identify(output());
    return check(N, [{ type: 'open', at: DAY }, { type: 'run', at: DAY, output: out }, act({ type: 'delete', cand: 'c2' })],
      doc(run(N.start(out), { type: 'delete', cand: 'c2' })), { now: () => DAY }).then((r) => assert.equal(r.replay, 'verified'));
  },
};

let n = 0;
for (const [name, fn] of Object.entries(tests)) { await fn(); n++; console.log('ok', name); }
assert.equal(n, Object.keys(tests).length);
