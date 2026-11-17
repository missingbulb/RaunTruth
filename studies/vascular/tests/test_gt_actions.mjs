// The vessel model's ids, and the study's GT actions (web/gt_actions.js), on small drawn models, under Node.
// Run: node tests/test_gt_actions.mjs
import assert from 'node:assert/strict';
import * as Mo from '../web/model.js';

// a v2 file: a vessel 1 - 2 with a curve point between, and two branches off 2, to 3 and to 4
const file = (extra = {}) => ({ format: 'vessel-model/2', source: 'acme.tif', slices: 4, size_px: [100, 100], um_per_px: 1,
  nodes: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 20, y: 0, z: 0 }, { id: 3, x: 20, y: 20, z: 0 }, { id: 4, x: 40, y: 0, z: 0 }],
  edges: [{ id: 1, a: 1, b: 2, state: 'vessel', via: [{ x: 10, y: 4, z: 0 }] }, { id: 2, a: 2, b: 3, state: 'vessel', via: [] },
    { id: 3, a: 2, b: 4, state: 'vessel', via: [] }], ...extra });
const ids = (m) => m.segments.map((s) => s.id);
const spans = (m) => Object.fromEntries(m.segments.map((s) => [s.id, `${s.a}-${s.b}`]));

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

let n = 0;
for (const [name, fn] of Object.entries(tests)) { fn(); n++; console.log('ok', name); }
assert.equal(n, 7);
