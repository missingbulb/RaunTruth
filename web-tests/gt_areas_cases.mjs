// The shell's ground-truth areas (web/gt_areas.js) under Node: the walk's order, the area a point lies in, each area's
// box, for every count the Areas menu offers. Exits 1 on a failed case.
//   node web-tests/gt_areas_cases.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const A = await import(path.join(repo, "web", "gt_areas.js"));

const cases = {
  "the rows go top to bottom, each the way back from the last, so the next area borders the one before"() {
    let walked = 0;
    for (const n of A.COUNTS) {
      const places = Array.from({ length: n * n }, (_, a) => A.place(a, n));
      assert.deepEqual(places[0], [0, 0], `n=${n} starts at the top left`);
      assert.equal(new Set(places.map(String)).size, n * n, `n=${n} visits every area once`);
      for (let a = 1; a < n * n; a++) {
        const [r0, k0] = places[a - 1], [r1, k1] = places[a];
        assert.equal(Math.abs(r1 - r0) + Math.abs(k1 - k0), 1, `n=${n}: area ${a} borders area ${a - 1}`);
        walked++;
      }
    }
    assert.equal(walked, A.COUNTS.reduce((s, n) => s + n * n - 1, 0));
  },
  "a point lies in the area whose box holds it, an edge point in the area at that edge"() {
    let seen = 0;
    for (const n of A.COUNTS) for (let a = 0; a < n * n; a++) {
      const [x0, y0, x1, y1] = A.box(a, n);
      assert.equal(A.areaAt((x0 + x1) / 2, (y0 + y1) / 2, n), a, `n=${n}: the middle of area ${a}`);
      assert.equal(A.areaAt(x0, y0, n), a, `n=${n}: the top left corner of area ${a} is its own`);
      seen++;
    }
    assert.equal(seen, A.COUNTS.reduce((s, n) => s + n * n, 0));
    assert.equal(A.areaAt(1, 1, 4), A.areaAt(0.99, 0.99, 4), "the field's far edge is in its last area");
    assert.equal(A.areaAt(-0.5, 2, 3), A.areaAt(0, 0.99, 3), "a point past the field is in the area at its edge");
  },
  "the boxes tile the field, in its own units"() {
    for (const n of A.COUNTS) {
      const boxes = Array.from({ length: n * n }, (_, a) => A.box(a, n, 400, 300));
      const area = boxes.reduce((s, [x0, y0, x1, y1]) => s + (x1 - x0) * (y1 - y0), 0);
      assert.ok(Math.abs(area - 400 * 300) < 1e-6, `n=${n}: the boxes add up to the field`);
      assert.ok(boxes.every(([x0, y0, x1, y1]) => x0 >= 0 && y0 >= 0 && x1 <= 400 + 1e-9 && y1 <= 300 + 1e-9 && x1 > x0 && y1 > y0));
    }
    assert.deepEqual(A.box(1, 2, 400, 300), [200, 0, 400, 150]);
    assert.deepEqual(A.box(2, 2, 400, 300), [200, 150, 400, 300], "the second row runs back from the right");
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(cases)) {
  try { fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
process.exit(failed ? 1 : 0);
