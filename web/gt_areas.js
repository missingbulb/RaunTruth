// The areas a study's ground truth is walked through (req/shell/ground-truth/areas): the field cut into n × n, taken
// in rows top to bottom, each row the way back from the last, so the next area always borders the one just done.
// Places and boxes are in the field's own units, a point given as a fraction of it.
"use strict";

// the counts each way the Areas menu offers, 1 the whole field
export const COUNTS = [1, 2, 3, 4, 5, 6, 8, 10];

// area a's row and column
export function place(a, n) {
  const r = Math.floor(a / n);
  return [r, r % 2 ? n - 1 - (a % n) : a % n];
}

// the area a point lies in, (fx, fy) its place across the field from 0 to 1; a point on or past an edge is in the
// area at that edge
export function areaAt(fx, fy, n) {
  const cell = (v) => Math.min(n - 1, Math.max(0, Math.floor(v * n)));
  const r = cell(fy), k = cell(fx);
  return r * n + (r % 2 ? n - 1 - k : k);
}

// area a's box, [x0, y0, x1, y1], in a field W wide and H high
export function box(a, n, W = 1, H = 1) {
  const [r, k] = place(a, n);
  return [k * W / n, r * H / n, (k + 1) * W / n, (r + 1) * H / n];
}
