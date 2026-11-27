// The Summary's three levels over a vessel model (web/networks.js): the whole image, each sub-network (a connected
// component of the confirmed vessels inside the volume) and each branch. Run: node tests/test_vessel_networks.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Mo from '../web/model.js';
import { networks } from '../web/networks.js';
import { summarize, nearestVessel } from '../web/summary.js';

// an H in one slice of a 100 × 100 µm field, 10 slices of 1 µm: two junctions joined by a 20 µm bridge drawn in two
// edges, each with two 20 µm arms to tips; a declined bar across the top; and apart, an island 30 µm long from the
// field's left edge
const H = (extra = {}) => Mo.parse({ format: 'vessel-model/2', source: 'h.tif', slices: 10, size_px: [100, 100], um_per_px: 1,
  nodes: [{ id: 1, x: 40, y: 50, z: 5, r: 2 }, { id: 2, x: 60, y: 50, z: 5, r: 2 }, { id: 3, x: 50, y: 50, z: 5, r: 2 },
    { id: 4, x: 40, y: 30, z: 5, r: 2 }, { id: 5, x: 40, y: 70, z: 5, r: 2 }, { id: 6, x: 60, y: 30, z: 5, r: 2 }, { id: 7, x: 60, y: 70, z: 5, r: 2 },
    { id: 8, x: 0, y: 10, z: 5, r: 1 }, { id: 9, x: 30, y: 10, z: 5, r: 1 }],
  edges: [{ id: 1, a: 1, b: 3, state: 'vessel', via: [] }, { id: 2, a: 3, b: 2, state: 'accepted', proposed: 'candidate', via: [] },
    { id: 3, a: 1, b: 4, state: 'vessel', via: [] }, { id: 4, a: 1, b: 5, state: 'vessel', via: [] },
    { id: 5, a: 2, b: 6, state: 'vessel', via: [] }, { id: 6, a: 2, b: 7, state: 'vessel', via: [] },
    { id: 7, a: 4, b: 6, state: 'rejected', proposed: 'candidate', via: [] }, { id: 8, a: 8, b: 9, state: 'vessel', via: [] }], ...extra });
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} is not within ${tol} of ${b}`);

const tests = {
  'the confirmed vessels fall into sub-networks, the longest first'() {
    const n = networks(H(), { zStepUm: 1 });
    assert.equal(n.components.length, 2);
    const [h, island] = n.components;
    assert.deepEqual([h.id, h.junctions, h.tips, h.nodes, h.branches], [1, 2, 4, 6, 5]);
    near(h.lengthUm, 100, 1e-6, 'the H');
    near(h.share, 100 / 130, 1e-9, 'its share of all the length');
    near(h.branchLength.mean, 20, 1e-6, 'its mean branch length, every branch');
    near(h.branchLength.med, 20, 1e-6, 'its median branch length');
    near(h.diameter.med, 4, 1e-6, 'its median diameter');
    near(h.tortuosity.mean, 1, 1e-6, 'straight');
    near(h.junctionsPerMm, 20, 1e-6, 'two junctions over 0.1 mm');
    assert.deepEqual([island.id, island.junctions, island.tips, island.branches], [2, 0, 2, 1]);
  },
  'the longest shortest path runs along the vessels, in µm'() {
    const [h, island] = networks(H(), { zStepUm: 1 }).components;
    near(h.longestPathUm, 60, 1e-6, 'tip to tip across the bridge');
    // drawn through its points in the order it runs, each step along a vessel, never across the field
    const steps = h.longestPath.slice(1).map(([x, y], k) => Math.hypot(x - h.longestPath[k][0], y - h.longestPath[k][1]));
    assert.ok(steps.length >= 3 && Math.max(...steps) <= 20 + 1e-9, `steps ${steps}`);
    near(steps.reduce((t, d) => t + d, 0), 60, 1e-6, 'the drawn path is as long as the path');
    near(island.longestPathUm, 30, 1e-6, 'the island end to end');
  },
  'a sub-network touching the volume\'s border says so, and its tips there are border tips'() {
    const [h, island] = networks(H(), { zStepUm: 1 }).components;
    assert.deepEqual([h.touchesBorder, h.borderTips], [false, 0]);
    assert.deepEqual([island.touchesBorder, island.borderTips], [true, 1]);
  },
  'node degrees: 1, 2, 3 and 4 or more confirmed vessels meeting'() {
    assert.deepEqual(networks(H(), { zStepUm: 1 }).degrees, { 1: 6, 2: 1, 3: 2, '4+': 0 });
  },
  'branching angles are between the branches meeting at a junction, in 3D'() {
    const a = networks(H(), { zStepUm: 1 }).angles;
    assert.equal(a.n, 6, 'three pairs at each of two junctions');
    assert.deepEqual(a.v.map(Math.round), [90, 90, 90, 90, 180, 180]);
  },
  'every branch carries its sub-network'() {
    const n = networks(H(), { zStepUm: 1 });
    assert.equal(n.branches.length, 6);
    assert.deepEqual(n.branches.map((b) => b.component).sort(), [1, 1, 1, 1, 1, 2]);
  },
  'the mask keeps only the sub-networks of the branches inside it'() {
    const n = networks(H(), { zStepUm: 1, mask: [[[0, 0], [100, 0], [100, 42], [0, 42]]] });
    // inside: the island and the two upper arms, each counted at its middle; the arms meet nowhere inside
    assert.equal(n.components.length, 3);
  },
  'heterogeneity: vessel length density over a grid of cells from above, and how much it varies'() {
    const n = networks(H(), { zStepUm: 1, cellUm: 50 });
    assert.equal(n.grid.cells.length, 4);
    near(n.grid.cells.reduce((t, c) => t + c.lengthUm, 0), 130, 1e-6, 'every piece of vessel in one cell');
    assert.ok(n.grid.cv > 0, `the field is uneven: CV ${n.grid.cv}`);
  },
  'Junction density replaces Branch point density'() {
    const s = summarize(H(), { zStepUm: 1 });
    near(s.junctionDensity, 2 / s.tissueMm3, 1e-6, 'junctions per mm³');
    assert.equal('branchPointDensity' in s, false);
    near(s.junctionsPerMm, 2 / 0.13, 1e-6, 'junctions per mm of vessel');
  },
  'the nearest-vessel distance gives its median, 90th and 95th percentiles, and the share beyond a distance'() {
    const d = nearestVessel(H(), { zStepUm: 1 });
    assert.ok(d.med <= d.p90 && d.p90 <= d.p95 && d.p95 <= d.max, `${d.med} ${d.p90} ${d.p95} ${d.max}`);
    near(d.beyond(0), 1, 1e-9, 'every point outside the vessels is beyond 0');
    near(d.beyond(d.max), 0, 1e-9, 'none beyond the farthest');
  },
  'the sub-networks of a whole stack\'s model take under 20 ms'() {
    const m = Mo.parse(JSON.parse(fs.readFileSync(new URL('fixtures/cd31_frontal_x20_r_1_slices1-12.vessels.json', import.meta.url))));
    for (let i = 0; i < 10; i++) networks(m, { zStepUm: 1 });
    const ms = Array.from({ length: 31 }, () => { const t = performance.now(); networks(m, { zStepUm: 1 }); return performance.now() - t; }).sort((a, b) => a - b);
    assert.ok(ms[15] < 20, `the median run took ${ms[15].toFixed(2)} ms`);
    console.log(`  networks: median ${ms[15].toFixed(2)} ms, ${networks(m, { zStepUm: 1 }).components.length} sub-networks`);
  },
};

let failed = 0;
for (const [name, t] of Object.entries(tests)) {
  try { t(); console.log(`ok - ${name}`); } catch (e) { failed++; console.log(`not ok - ${name}\n  ${e.message}`); }
}
process.exit(failed ? 1 : 0);
