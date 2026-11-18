// The vessel model's ids, and the study's GT actions (web/gt_actions.js), on small drawn models, under Node.
// Run: node tests/test_gt_actions.mjs
import assert from 'node:assert/strict';
import * as Mo from '../web/model.js';
import * as S from '../web/gt_actions.js';
import { build } from '../web/model_items.js';
import { actionLog, replay, leftOut } from '../../../web/truth_actions.js';

// a v2 file: a vessel 1 - 2 with a curve point between, and two branches off 2, to 3 and to 4
const file = (extra = {}) => ({ format: 'vessel-model/2', source: 'acme.tif', slices: 4, size_px: [100, 100], um_per_px: 1,
  nodes: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 20, y: 0, z: 0 }, { id: 3, x: 20, y: 20, z: 0 }, { id: 4, x: 40, y: 0, z: 0 }],
  edges: [{ id: 1, a: 1, b: 2, state: 'vessel', via: [{ x: 10, y: 4, z: 0 }] }, { id: 2, a: 2, b: 3, state: 'vessel', via: [] },
    { id: 3, a: 2, b: 4, state: 'vessel', via: [] }], ...extra });
const ids = (m) => m.segments.map((s) => s.id);
const spans = (m) => Object.fromEntries(m.segments.map((s) => [s.id, `${s.a}-${s.b}`]));

// a drawn model for the actions: a junction at 2 where three vessels meet (one with a curve point), a tip 8 under 3, and a
// low-confidence vessel 5 - 6 across the field's far corner, with radii so the widths are estimates
const DAY = '2026-11-17T10:00:00.000Z';
const drawn = (over = {}) => ({ format: 'vessel-model/2', source: 'acme.tif', slices: 4, size_px: [100, 100], um_per_px: 1, score: { seconds: 3 },
  nodes: [[1, 0, 0], [2, 20, 0], [3, 20, 20], [4, 40, 0], [5, 60, 60], [6, 80, 60], [8, 20, 40]].map(([id, x, y]) => ({ id, x, y, z: 0, r: 2 })),
  edges: [{ a: 1, b: 2, state: 'vessel', proposed: 'vessel', via: [{ x: 10, y: 4, z: 0, r: 2 }] }, { a: 2, b: 3, state: 'vessel', proposed: 'vessel', via: [] },
    { a: 2, b: 4, state: 'vessel', proposed: 'vessel', via: [] }, { a: 5, b: 6, state: 'candidate', proposed: 'candidate', confidence: .3, via: [{ x: 70, y: 62, z: 0, r: 2 }] },
    { a: 3, b: 8, state: 'vessel', proposed: 'vessel', via: [] }], ...over });
const start = (over) => S.start(drawn(over));
const doc = (m) => Mo.toJSON(m);
const act = (a) => ({ at: DAY, ...a });

const tests = {
  'every segment has an id, none repeated, in creation order'() {
    const m = Mo.parse(file());
    assert.deepEqual(ids(m), ['s1', 's2', 's3', 's4']);
  },
  'toJSON then parse keeps every point id and segment id'() {
    let m = Mo.parse(file());
    m = Mo.identify(Mo.splitSegment(m, 2, .5)[0]);
    m = Mo.identify(Mo.cutSegment(m, 0, .3, .6));
    const back = Mo.parse(Mo.toJSON(m));
    assert.deepEqual([...back.nodes.keys()].sort((a, b) => a - b), [...m.nodes.keys()].sort((a, b) => a - b));
    assert.deepEqual(spans(back), spans(m));
    assert.equal(new Set(ids(back)).size, ids(back).length);
  },
  'a curve point keeps the id the file gives it, and takes a free one when it has none or a taken one'() {
    const f = file();
    f.edges[0].via = [{ id: 40, x: 5, y: 2, z: 0 }, { id: 2, x: 15, y: 2, z: 0 }, { x: 18, y: 1, z: 0 }];
    const m = Mo.parse(f);
    assert.ok(m.nodes.has(40));
    const free = [...m.nodes.keys()].filter((k) => ![1, 2, 3, 4, 40].includes(k));
    assert.equal(free.length, 2, 'the other two curve points were given ids of their own');
    assert.equal(m.nodes.size, 7);
  },
  'toJSON writes the ids it keeps'() {
    const out = Mo.toJSON(Mo.parse(file()));
    assert.deepEqual(out.edges[0].segment_ids, ['s1', 's2']);
    assert.deepEqual(out.edges[1].segment_ids, ['s3']);
    assert.deepEqual(out.edges[2].segment_ids, ['s4']);
    assert.equal(typeof out.edges[0].via[0].id, 'number');
    assert.ok(!('segment_ids' in (out.edges[0].extra ?? {})));
  },
  'an edge whose segment_ids do not fit is given fresh ones, never a repeat'() {
    const f = file();
    f.edges[0].segment_ids = ['s9']; // two segments, one id
    f.edges[1].segment_ids = ['s9'];
    const m = Mo.parse(f);
    assert.equal(new Set(ids(m)).size, 4);
    assert.equal(m.segments[2].id, 's9', 'the edge that fits keeps its id');
  },
  'identify gives a segment without an id, or a repeat, one of its own, and changes nothing otherwise'() {
    const m = Mo.parse(file());
    assert.equal(Mo.identify(m), m);
    const bent = Mo.splitSegment(m, 2, .5)[0];
    const o = Mo.identify(bent);
    assert.notEqual(o, bent);
    assert.equal(o.segments[2].id, 's3', 'the first half keeps the vessel\'s id');
    assert.equal(o.segments[3].id, 'u1');
    assert.equal(Mo.identify(o), o);
  },
  'a point a person adds takes its id from 1,000,000 up, apart from the algorithm\'s'() {
    const m = Mo.parse(file());
    const [o, id] = Mo.splitSegment(m, 2, .5);
    assert.ok(id >= Mo.USER_NODE);
    assert.ok([...m.nodes.keys()].every((k) => k < Mo.USER_NODE));
    assert.equal(Mo.splitSegment(o, 2, .5)[1], id + 1);
  },
};

// every action type, done by the study's run and by calling model.js directly, on the same model by the same ids
const CASES = (m) => {
  const at = (id) => m.segments.findIndex((x) => x.id === id), to = { x: 25, y: 22, z: 1 };
  return {
    'move-node': [{ node: 3, to }, Mo.moveNode(m, 3, to)],
    attach: [{ node: 6, to: { x: 78, y: 58, z: 0 }, onto: { segment: 's4', t: .5 } }, Mo.attach(Mo.moveNode(m, 6, { x: 78, y: 58, z: 0 }), 6, { segment: at('s4'), t: .5 })],
    connect: [{ from: { node: 8 }, to: { segment: 's4', t: .5 } }, Mo.connect(m, { node: 8 }, { segment: at('s4'), t: .5 })],
    draw: [{ from: { node: 4 }, to: { point: { x: 60, y: 20, z: 0 } } }, Mo.drawSegment(m, { node: 4 }, { point: { x: 60, y: 20, z: 0 } })[0]],
    split: [{ segment: 's3', t: .5 }, Mo.splitSegment(m, at('s3'), .5)[0]],
    cut: [{ segment: 's3', ta: .4, tb: .6 }, Mo.cutSegment(m, at('s3'), .4, .6)],
    'remove-bend': [{ node: 9 }, Mo.removeBend(m, 9)],
    'delete-node': [{ node: 8 }, Mo.deleteNode(m, 8)],
    'delete-segment': [{ segments: ['s5', 's6'] }, Mo.deleteSegment(Mo.deleteSegment(m, at('s6')), at('s5'))],
    'split-junction': [{ node: 2, zScale: 2 }, Mo.splitJunction(m, 2, 2)],
    review: [{ segment: 's5', verdict: 'accepted' }, Mo.review(m, at('s5'), 'accepted')],
    decide: [{ segments: ['s1', 's2'], verdict: 'rejected' }, Mo.decide(m, [at('s1'), at('s2')], 'rejected')],
    'check-junction': [{ node: 2, on: true }, Mo.checkJunction(m, 2, true)],
    'set-width': [{ segments: ['s1', 's2'], width: { um: 3, how: 'nudge', on: '2000-01-01' } }, Mo.setWidth(m, [at('s1'), at('s2')], { um: 3, how: 'nudge', on: '2026-11-17' })],
  };
};

Object.assign(tests, {
  'every action does what calling model.js directly does'() {
    const m = start();
    const cases = CASES(m);
    assert.equal(Object.keys(cases).length, 14);
    for (const [type, [fields, want]] of Object.entries(cases)) {
      const got = S.run(m, act({ type, ...fields }));
      assert.ok(!('skip' in got), `${type}: ${got.skip}`);
      assert.deepEqual(doc(got), doc(Mo.identify(want)), type);
    }
  },
  'an action leaves the model it was given as it was'() {
    const m = start(), before = JSON.stringify(doc(m));
    for (const [type, [fields]] of Object.entries(CASES(m))) S.run(m, act({ type, ...fields }));
    S.run(m, act({ type: 'widths-right', area: 0, box: { x0: 0, y0: 0, x1: 50, y1: 50 }, slices: [0, 3] }));
    assert.equal(JSON.stringify(doc(m)), before);
  },
  'an action whose item is gone, or that changes nothing, is skipped with why'() {
    const m = start();
    assert.deepEqual(S.run(m, act({ type: 'split', segment: 's99', t: .5 })), { skip: 'its vessel is gone' });
    assert.deepEqual(S.run(m, act({ type: 'delete-segment', segments: ['s1', 's99'] })), { skip: 'its vessel is gone' });
    assert.deepEqual(S.run(m, act({ type: 'move-node', node: 99, to: { x: 1, y: 1, z: 1 } })), { skip: 'its point is gone' });
    assert.deepEqual(S.run(m, act({ type: 'connect', from: { node: 1 }, to: { node: 99 } })), { skip: 'its point is gone' });
    assert.deepEqual(S.run(m, act({ type: 'review', segment: 's1', verdict: 'accepted' })), { skip: 'nothing to change' }, 'only a low-confidence vessel takes a verdict');
    assert.deepEqual(S.run(m, act({ type: 'move-node', node: 1, to: { x: 0, y: 0, z: 0 } })), { skip: 'nothing to change' });
    assert.deepEqual(S.run(m, act({ type: 'set-width', segments: ['s1'], width: null })), { skip: 'nothing to change' });
    assert.ok(S.run(m, act({ type: 'unknown' })).skip);
  },
  'undo then redo through the action log gives an equal document, step by step'() {
    const log = actionLog(S);
    log.open({ name: 'a.tif' }, 'vascular');
    log.ran({ algorithm: { key: 'v2' }, output: drawn() });
    const m = log.model, types = [], docs = [doc(m)];
    for (const [type, [fields]] of Object.entries(CASES(m)).filter(([t]) => !['attach', 'connect', 'remove-bend', 'delete-node', 'delete-segment', 'split-junction', 'draw'].includes(t))) {
      const r = log.act({ type, ...fields }); assert.ok(r.model, type);
      types.push(type); docs.push(doc(log.model));
    }
    for (let k = types.length; k > 0; k--) { log.undo(); assert.deepEqual(doc(log.model), docs[k - 1], `undone ${types[k - 1]}`); }
    for (let k = 1; k <= types.length; k++) { log.redo(); assert.deepEqual(doc(log.model), docs[k], `redone ${types[k - 1]}`); }
  },
  'the log replays to the same document from the file it wrote, ids and all'() {
    const log = actionLog(S);
    log.open({ name: 'a.tif' }, 'vascular');
    log.ran({ algorithm: { key: 'v2' }, output: drawn() });
    log.act({ type: 'split', segment: 's3', t: .5 });
    log.act({ type: 'move-node', node: 1000000, to: { x: 22, y: 9, z: 0 } });
    log.act({ type: 'delete-segment', segments: ['u1'] });
    const stored = S.document(log.model);
    assert.deepEqual(S.document(replay(S, log.actions).model), stored);
    assert.deepEqual(S.document(S.load(JSON.parse(JSON.stringify(stored)))), stored, 'the study\'s document of what it loaded is the file');
  },
  'a run again whose output moved a point a little keeps the ids and replays the actions'() {
    const log = actionLog(S);
    log.open({ name: 'a.tif' }, 'vascular');
    log.ran({ algorithm: { key: 'v2' }, output: drawn() });
    log.act({ type: 'move-node', node: 3, to: { x: 25, y: 22, z: 1 } });
    log.act({ type: 'split', segment: 's7', t: .5 });
    log.act({ type: 'move-node', node: 1000000, to: { x: 21, y: 30, z: 0 } });
    const nodes = drawn().nodes.map((n) => (n.id === 3 ? { ...n, x: n.x + .2 } : n));
    log.ran({ algorithm: { key: 'v2', params: { z_step: 2 } }, output: drawn({ nodes }) });
    assert.equal(log.skipped.size, 0);
    const m = log.model;
    assert.deepEqual([m.nodes.get(3).x, m.nodes.get(3).y], [25, 22], 'the move is replayed over the new run');
    assert.deepEqual(m.nodes.get(1000000), { id: 1000000, x: 21, y: 30, z: 0, r: 2 }, 'a point a person added is still the one the action names');
    assert.equal(m.segments.find((x) => x.id === 's7').a, 3);
  },
  'a run again that has no such vessel skips the action, saying so'() {
    const log = actionLog(S);
    log.open({ name: 'a.tif' }, 'vascular');
    log.ran({ algorithm: { key: 'v2' }, output: drawn() });
    log.act({ type: 'split', segment: 's3', t: .5 });
    log.act({ type: 'review', segment: 's5', verdict: 'accepted' });
    const o = drawn(); o.edges.splice(1, 1); // 2 - 3 is gone, and 3 - 8 with it by position: nothing joins them
    log.ran({ algorithm: { key: 'v2' }, output: o });
    assert.deepEqual([...log.skipped.values()], ['its vessel is gone']);
    assert.equal(log.model.segments.find((x) => x.id === 's5').state, 'accepted', 'the other action carries over');
  },
  'what a run again adds takes ids above both runs\', and what it shares keeps the id it had'() {
    const m = start();
    const nodes = [...drawn().nodes, { id: 7, x: 5, y: 90, z: 0, r: 2 }], edges = [...drawn().edges, { a: 1, b: 7, state: 'vessel', proposed: 'vessel', via: [] }];
    const more = S.start(drawn({ nodes, edges }), m);
    const before = [...m.nodes.keys()].filter((k) => k < Mo.USER_NODE).length;
    assert.equal(more.nodes.size, before + 1);
    for (const id of m.nodes.keys()) assert.deepEqual([more.nodes.get(id).x, more.nodes.get(id).y], [m.nodes.get(id).x, m.nodes.get(id).y]);
    assert.ok(more.nodes.has(Math.max(...m.nodes.keys()) + 1), 'the new point is above the model before\'s largest');
    assert.deepEqual(more.segments.slice(0, 5).map((x) => x.id), m.segments.map((x) => x.id).slice(0, 5));
    const ids = more.segments.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length);
  },
  'a run after a base carries its verdicts, widths, a moved point, a point and a vessel drawn, a split vessel, the areas and the junctions checked'() {
    let m = start();
    for (const a of [{ type: 'review', segment: 's5', verdict: 'accepted' }, { type: 'set-width', segments: ['s3'], width: { um: 3, how: 'nudge' } },
      { type: 'move-node', node: 4, to: { x: 42, y: 0, z: 0 } }, { type: 'draw', from: { node: 4 }, to: { point: { x: 60, y: 20, z: 0 } } }, { type: 'split', segment: 's7', t: .5 },
      { type: 'check-junction', node: 2, on: true }, { type: 'widths-right', area: 0, box: { x0: 0, y0: 0, x1: 50, y1: 50 }, slices: [0, 3] }]) m = S.run(m, act(a));
    const base = S.load(JSON.parse(JSON.stringify(S.document(m))));
    const got = S.start(drawn(), base);
    const by = (id) => got.segments.find((x) => x.id === id);
    assert.deepEqual(got.segments.map((x) => x.id).sort(), ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 'u1', 'u2'], 'the split vessel replaces the algorithm\'s one, the drawn one is kept');
    assert.deepEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 'u2'].map((id) => by(id).state), Array(8).fill('accepted'), 'the verdicts');
    assert.equal(by('s3').width.um, 3, 'a width the tagger set');
    assert.deepEqual([got.nodes.get(4).x, got.nodes.get(4).y], [42, 0], 'a moved point stays where the tagger put it, and keeps its id');
    assert.deepEqual([got.nodes.get(1000000), by('u1').proposed], [{ id: 1000000, x: 60, y: 20, z: 0, r: 2 }, undefined], 'the drawn vessel has the width of the vessel it was drawn from');
    assert.deepEqual([by('s7').b, by('u2').a], [1000001, 1000001]);
    assert.deepEqual([got.checked_junctions, got.reviewed_regions.length, got.dropped], [[2], 1, undefined]);
    assert.equal(got.nodes.size, 11);
  },
  'a run after a base lists a decision or a width the run has no vessel for, and a run after a run carries nothing'() {
    let m = start();
    for (const a of [{ type: 'review', segment: 's5', verdict: 'accepted' }, { type: 'set-width', segments: ['s3'], width: { um: 3, how: 'nudge' } }, { type: 'check-junction', node: 8, on: true }]) m = S.run(m, act(a));
    const base = S.load(JSON.parse(JSON.stringify(S.document(m))));
    const o = drawn(); o.edges.splice(3, 2); o.edges.splice(1, 1); // 5 - 6, 2 - 3 and 3 - 8 are gone
    const got = S.start(o, base);
    // the file left no vessel undecided, so the vessel 3 - 8 the tagger never touched (s7) was accepted in it too
    assert.deepEqual(got.dropped.sort(), ['junction 8', 's3', 's5', 's6', 's7']);
    assert.ok(got.segments.every((x) => x.state === 'accepted'), 'the vessels the run still has were accepted in the file; what else was decided has nothing to be carried to');
    const quiet = S.start(o, start());
    assert.deepEqual([quiet.dropped, quiet.nodes.size, quiet.segments.length], [undefined, S.start(o).nodes.size, S.start(o).segments.length], 'a model of the algorithm alone is not carried');
  },
  'the log says from its actions alone what a run after a base could not carry over, and a run after a run left nothing out'() {
    let m = start();
    for (const a of [{ type: 'review', segment: 's5', verdict: 'accepted' }, { type: 'set-width', segments: ['s3'], width: { um: 3, how: 'nudge' } }, { type: 'check-junction', node: 8, on: true }]) m = S.run(m, act(a));
    const o = drawn(); o.edges.splice(3, 2); o.edges.splice(1, 1);
    const log = actionLog(S);
    log.open({ name: 'acme.tif' }, 'vascular');
    log.load([...log.actions, { type: 'base', at: DAY, model: JSON.parse(JSON.stringify(S.document(m))), from: {} }]);
    log.ran({ algorithm: { key: 'v' }, output: o });
    assert.deepEqual(leftOut(S, log.actions, 2).sort(), ['junction 8', 's3', 's5', 's6', 's7']);
    assert.deepEqual(leftOut(S, log.actions, 2), log.model.dropped);
    const quiet = actionLog(S);
    quiet.open({ name: 'acme.tif' }, 'vascular');
    quiet.ran({ algorithm: { key: 'v' }, output: o });
    assert.deepEqual(leftOut(S, quiet.actions, 1), []);
  },
  'a model read again counts its ids on from its largest, so no point or segment id is given twice'() {
    let m = start();
    m = S.run(m, act({ type: 'split', segment: 's3', t: .5 }));
    m = S.run(m, act({ type: 'split', segment: 's3', t: .3 }));
    const back = S.load(JSON.parse(JSON.stringify(S.document(m))));
    const more = S.run(back, act({ type: 'split', segment: 's4', t: .5 }));
    const nodes = [...more.nodes.keys()], segs = more.segments.map((x) => x.id);
    assert.equal(new Set(nodes).size, nodes.length);
    assert.equal(new Set(segs).size, segs.length);
    assert.ok(Math.max(...nodes) > Math.max(...back.nodes.keys()));
  },
  'widths right does what the page does today, from the model alone, and writes the day of its action'() {
    const m = start();
    // the page's path before, as tasks.js wrote it: the area's vessels by the grid's cell of their middle point
    const n = 2, cell = (v, L) => Math.min(n - 1, Math.max(0, Math.floor(v / L * n)));
    const areaOf = (p) => { const r = cell(p.y, 100), k = cell(p.x, 100); return r * n + (r % 2 ? n - 1 - k : k); };
    const old = (area, box, on) => {
      let o = { ...m, reviewed_regions: [...(m.reviewed_regions || []), { x: [box.x0, box.x1], y: [box.y0, box.y1], z: [0, m.slices - 1], on, step: 'area' }] };
      for (const v of build(m, 1).vessels) {
        if (areaOf(v.path[v.path.length >> 1]) !== area) continue;
        const open = v.proposed ? v.segments.filter((i) => o.segments[i].state === v.proposed) : [];
        if (open.length) o = Mo.decide(o, open, v.proposed === 'vessel' ? 'accepted' : 'rejected');
        if (Mo.live(o.segments[v.segments[0]]) && !Mo.widthOf(m, v.segments) && v.width != null) o = Mo.setWidth(o, v.segments, { how: 'looked', on });
      }
      return o;
    };
    // area 0 is the top left, and area 2 the bottom left of the grid's walk (rows run back and forth), area 3 the bottom right
    const boxes = { 0: { x0: 0, y0: 0, x1: 50, y1: 50 }, 3: { x0: 0, y0: 50, x1: 50, y1: 100 }, 2: { x0: 50, y0: 50, x1: 100, y1: 100 } };
    let checked = 0;
    for (const [area, box] of Object.entries(boxes)) {
      const got = S.run(m, act({ type: 'widths-right', area: +area, box, slices: [0, 3] }));
      assert.deepEqual(doc(got), doc(old(+area, box, '2026-11-17')), `area ${area}`);
      assert.equal(got.reviewed_regions.at(-1).on, '2026-11-17');
      checked++;
    }
    assert.equal(checked, 3);
    const got = S.run(m, act({ type: 'widths-right', area: 2, box: boxes[2], slices: [0, 3] }));
    assert.equal(got.segments.find((x) => x.id === 's5').state, 'rejected', 'a low-confidence vessel nobody kept is declined');
    assert.equal(Mo.widthOf(got, [got.segments.findIndex((x) => x.id === 's5')]), null, 'a declined vessel has no width said');
    const top = S.run(m, act({ type: 'widths-right', area: 0, box: boxes[0], slices: [0, 3] }));
    assert.deepEqual(Mo.widthOf(top, [top.segments.findIndex((x) => x.id === 's3')]), { how: 'looked', on: '2026-11-17' });
    const later = S.run(m, { ...act({ type: 'widths-right', area: 2, box: boxes[2], slices: [0, 3] }), at: '2027-01-02T00:00:00.000Z' });
    assert.equal(later.reviewed_regions.at(-1).on, '2027-01-02');
  },
  'a width said carries the day of its action, whatever day the page computed and whatever day it is'() {
    const m = start();
    const got = S.run(m, { type: 'set-width', segments: ['s1', 's2'], width: { um: 3, how: 'nudge', on: '2000-01-01' }, at: '2027-01-02T23:00:00.000Z' });
    assert.deepEqual(Mo.widthOf(got, [0, 1]), { um: 3, how: 'nudge', on: '2027-01-02' });
  },
  'where is in the image\'s pixels, whatever a pixel measures'() {
    const m = start({ um_per_px: .5 }), n = m.nodes.get(3);
    assert.deepEqual([n.x, n.y], [20, 20], 'the point is at 20 µm, pixel 40');
    assert.deepEqual(S.where(act({ type: 'delete-node', node: 3 }), m), [35, 35, 45, 45, 0]);
    assert.deepEqual(S.where(act({ type: 'move-node', node: 3, to: { x: 30, y: 10, z: 2 } }), m), [55, 15, 65, 25, 2]);
    assert.deepEqual(S.where(act({ type: 'widths-right', area: 0, box: { x0: 0, y0: 0, x1: 25, y1: 25 }, slices: [0, 3] }), m), [0, 0, 50, 50, 1.5]);
  },
  'the file has no clock: the same model is the same document a day apart'() {
    const m = start(), real = Date;
    const at = (iso) => { globalThis.Date = class extends real { constructor(...a) { super(...(a.length ? a : [iso])); } static now() { return new real(iso).getTime(); } }; };
    try {
      at('2026-11-17T09:00:00Z'); const one = JSON.stringify(S.document(m));
      at('2026-11-18T09:00:00Z'); const two = JSON.stringify(S.document(m));
      assert.equal(one, two);
    } finally { globalThis.Date = real; }
    assert.ok(!('corrected_at' in S.document({ ...m, corrected_at: 'x', corrections: 4 })) && !('corrections' in S.document({ ...m, corrections: 4 })));
  },
  'the file has no undecided vessel: one the tagger left as the algorithm drew it is written accepted, a faint one left alone rejected'() {
    // req/vascular/model/no-undecided
    let m = start();
    m = S.run(m, act({ type: 'draw', from: { node: 4 }, to: { point: { x: 60, y: 20, z: 0 } } }));
    m = S.run(m, act({ type: 'decide', segments: ['s3'], verdict: 'rejected' }));
    const file = S.document(m);
    const by = (a, b) => file.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    assert.deepEqual([by(1, 2).state, by(2, 4).state, by(3, 8).state], ['accepted', 'accepted', 'accepted'], 'vessels left as they were');
    assert.equal(by(2, 3).state, 'rejected', 'the tagger\'s own verdict stands');
    assert.equal(by(5, 6).state, 'rejected', 'a faint vessel the tagger never took into the model');
    assert.deepEqual(file.edges.filter((e) => e.drawn).map((e) => e.state), ['vessel'], 'a vessel the tagger drew is a vessel');
    assert.ok(file.edges.every((e) => e.drawn || ['accepted', 'rejected'].includes(e.state)));
    assert.deepEqual(file.edges.filter((e) => !e.drawn).map((e) => e.proposed), ['vessel', 'vessel', 'vessel', 'candidate', 'vessel'], 'what the algorithm said of each is kept beside it');
    // the model being tagged is not touched: what is undecided there is still to be judged
    assert.equal(m.segments.filter((x) => x.proposed && x.state === x.proposed).length, 6);
    assert.deepEqual(S.document(S.load(JSON.parse(JSON.stringify(file)))), file);
  },
  'describe and where read every action, and where is null for an item that is gone'() {
    const m = start();
    const cases = CASES(m);
    let boxes = 0;
    for (const [type, [fields]] of Object.entries(cases)) {
      const a = act({ type, ...fields });
      assert.ok(S.describe(a, 1, m) && S.describe(a, 3, m), type);
      const w = S.where(a, m);
      assert.ok(w && w.length === 5 && w[2] > w[0] && w[3] > w[1], type);
      boxes++;
    }
    assert.equal(boxes, 14);
    assert.equal(S.describe(act({ type: 'widths-right', area: 13 }), 1), 'Widths right in area 14');
    assert.equal(S.describe(act({ type: 'delete-segment', segments: ['a', 'b', 'c'] }), 1), 'Deleted 3 segments');
    assert.equal(S.describe({ type: 'run', output: drawn() }), '5 vessels');
    assert.equal(S.where(act({ type: 'split', segment: 's99', t: .5 }), m), null);
    assert.equal(S.where(act({ type: 'delete-node', node: 99 }), m), null);
  },
});

let n = 0;
for (const [name, fn] of Object.entries(tests)) { fn(); n++; console.log('ok', name); }
assert.equal(n, 25);
