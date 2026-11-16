// The Summary box's numbers over a vessel model and a mask (web/summary.js). Run: node tests/test_vessel_summary.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Mo from '../web/model.js';
import { summarize, nearestVessel, branches } from '../web/summary.js';

// an H in one slice of a 100 × 100 µm field at 1 µm/px, 10 slices of 1 µm: two junctions joined by a 20 µm bridge,
// each with two arms 20 µm long to tips; the bridge drawn as two edges, one a vessel and one an approved candidate
const H = (extra = {}) => Mo.parse({ format: 'vessel-model/2', source: 'h.tif', slices: 10, size_px: [100, 100], um_per_px: 1,
  nodes: [{ id: 1, x: 40, y: 50, z: 5, r: 2 }, { id: 2, x: 60, y: 50, z: 5, r: 2 }, { id: 3, x: 50, y: 50, z: 5, r: 2 },
    { id: 4, x: 40, y: 30, z: 5, r: 2 }, { id: 5, x: 40, y: 70, z: 5, r: 2 }, { id: 6, x: 60, y: 30, z: 5, r: 2 }, { id: 7, x: 60, y: 70, z: 5, r: 2 }],
  edges: [{ id: 1, a: 1, b: 3, state: 'vessel', via: [] }, { id: 2, a: 3, b: 2, state: 'accepted', proposed: 'candidate', via: [] },
    { id: 3, a: 1, b: 4, state: 'vessel', via: [] }, { id: 4, a: 1, b: 5, state: 'vessel', via: [] },
    { id: 5, a: 2, b: 6, state: 'vessel', via: [] }, { id: 6, a: 2, b: 7, state: 'vessel', via: [] },
    { id: 7, a: 4, b: 6, state: 'rejected', proposed: 'candidate', via: [] }], ...extra });
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} is not within ${tol} of ${b}`);

const tests = {
  'a branch runs junction to junction or to a tip, however many edges the model drew it in'() {
    const bs = branches(H(), 1);
    assert.equal(bs.length, 5);
    const jj = bs.filter((b) => b.ends.every((e) => e === 'junction'));
    assert.equal(jj.length, 1, 'the bridge is one branch, across the change of state');
    near(jj[0].length, 20, 1e-6, 'the bridge');
  },
  'mean branch length is junction to junction only, and branch points are the junctions'() {
    const s = summarize(H(), { zStepUm: 1 });
    assert.equal(s.junctions, 2);
    assert.equal(s.branches, 5);
    assert.equal(s.branchLength.n, 1);
    near(s.branchLength.mean, 20, 1e-6, 'mean branch length');
    near(s.tissueMm3, 100 * 100 * 10 * 1e-9, 1e-12, 'tissue');
    near(s.branchPointDensity, 2 / s.tissueMm3, 1e-6, 'branch point density');
    near(s.lengthDensity, (100 * 1e-3) / s.tissueMm3, 1, 'length density, mm per mm³');
    near(s.tortuosity.mean, 1, 1e-6, 'straight vessels');
    near(s.diameter.mean, 4, 1e-6, 'diameter');
  },
  'the volume fraction is the tubes over the tissue'() {
    const s = summarize(H(), { zStepUm: 1 });
    near(s.volumeFraction, (Math.PI * 4 * 100) / 1e5, 1e-4, 'volume fraction');
  },
  'a declined vessel is no vessel'() {
    const s = summarize(H(), { zStepUm: 1 });
    near(s.lengthUm, 100, 1e-6, 'the declined top bar adds no length');
  },
  'the mask keeps only the junctions, branches and tissue inside it, and a second area cuts a hole'() {
    const left = [[0, 0], [50, 0], [50, 100], [0, 100]];
    const s = summarize(H(), { zStepUm: 1, mask: [left] });
    assert.equal(s.junctions, 1);
    assert.equal(s.branches, 2, 'the two left arms; the bridge is counted at its middle, on the line');
    near(s.tissueMm3, 50 * 100 * 10 * 1e-9, 1e-12, 'half the tissue');
    const holed = summarize(H(), { zStepUm: 1, mask: [left, [[30, 40], [45, 40], [45, 60], [30, 60]]] });
    assert.equal(holed.junctions, 0, 'the junction sits in the hole');
  },
  'damaged areas are not tissue'() {
    const s = summarize(H({ excluded_regions: [{ polygon: [[0, 0], [50, 0], [50, 100], [0, 100]] }] }), { zStepUm: 1 });
    near(s.tissueMm3, 50 * 100 * 10 * 1e-9, 1e-12, 'half the tissue');
    assert.equal(s.junctions, 1);
  },
  'the distance to the nearest vessel is measured from tissue outside every vessel, the mask none of its seeds'() {
    const s = { nearest: nearestVessel(H(), { zStepUm: 1, mask: [[[80, 0], [100, 0], [100, 100], [80, 100]]] }) };
    assert.ok(s.nearest.min >= 17 && s.nearest.min <= 19, `the strip's nearest tissue is ~18 µm from the right arms' walls, not ${s.nearest.min}`);
  },
  'the nearest-vessel distance is to the nearest wall, never negative, and none from inside a vessel'() {
    // one vessel of radius 2 along y = 50; tissue from y = 0 to 100, so distances run from 0 to 48 µm
    const one = Mo.parse({ format: 'vessel-model/2', source: 'o.tif', slices: 10, size_px: [100, 100], um_per_px: 1,
      nodes: [{ id: 1, x: 0, y: 50, z: 5, r: 2 }, { id: 2, x: 100, y: 50, z: 5, r: 2 }], edges: [{ id: 1, a: 1, b: 2, state: 'vessel', via: [] }] });
    const s = { nearest: nearestVessel(one, { zStepUm: 1, points: 20000 }) };
    assert.ok(s.nearest.min >= 0 && s.nearest.max <= Math.hypot(48, 5) + 1e-6, `${s.nearest.min}–${s.nearest.max}`);
    // the distance from a plane to a line is spread evenly over 0–48 in y, with z up to 5 µm off: about a quarter of 100
    near(s.nearest.mean, 24.5, 1.5, 'mean nearest distance');
  },
  'the seven numbers from the model take under a millisecond, on a whole stack\'s model with a mask'() {
    // the extraction's model of one of the owner's stacks: 646 segments, 680 points, 12 slices of 1200 × 1200 px
    const m = Mo.parse(JSON.parse(fs.readFileSync(new URL('fixtures/cd31_frontal_x20_r_1_slices1-12.vessels.json', import.meta.url))));
    const mask = [[[50, 50], [400, 60], [380, 500], [60, 420]], [[150, 150], [250, 150], [250, 250], [150, 250]]];
    for (let i = 0; i < 50; i++) summarize(m, { zStepUm: 1, mask });
    const ms = Array.from({ length: 101 }, () => { const t = performance.now(); summarize(m, { zStepUm: 1, mask }); return performance.now() - t; }).sort((a, b) => a - b);
    assert.ok(ms[50] < 1, `the median run took ${ms[50].toFixed(3)} ms`);
    console.log(`  summarize: median ${ms[50].toFixed(3)} ms`);
  },
};

let failed = 0;
for (const [name, t] of Object.entries(tests)) {
  try { t(); console.log(`ok - ${name}`); } catch (e) { failed++; console.log(`not ok - ${name}\n  ${e.message}`); }
}
process.exit(failed ? 1 : 0);
