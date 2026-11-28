// A vessel's width read from the stack's own pixels (req/vascular/truth/widths): the vessel straightened, each column
// across it read in the slices at its depth, between slices; the brightness across it over its middle; and the width
// where that brightness crosses half its height.

// along the vessel and across it, µm between samples; across it, µm each way, and at least this many of its own widths
const ALONG_UM = .25, ACROSS_UM = .25, HALF_UM = 6, WIDTHS = 3;
// the share of its length, about its middle, the profile is averaged over; the slices either side of its depth read
const MIDDLE = .6, SLAB = 1;
// a second peak counts when it rises this share of the way from the floor to the main peak, away from the main peak
const SECOND = .5;

// the path's points every step µm, x, y and z (slices) between them
function resample(path, step) {
  const s = [0];
  for (let k = 1; k < path.length; k++) s.push(s[k - 1] + Math.hypot(path[k].x - path[k - 1].x, path[k].y - path[k - 1].y));
  const L = s.at(-1), n = Math.max(2, Math.round(L / step) + 1), out = [];
  for (let i = 0; i < n; i++) {
    const t = (L * i) / (n - 1);
    let k = 1; while (k < s.length - 1 && s[k] < t) k++;
    const f = (t - s[k - 1]) / Math.max(s[k] - s[k - 1], 1e-9), p = path[k - 1], q = path[k];
    out.push({ x: p.x + f * (q.x - p.x), y: p.y + f * (q.y - p.y), z: p.z + f * (q.z - p.z) });
  }
  return { pts: out, length: L };
}

// the stack P ({X, Y, Z, data}) at µm (x, y) and fractional slice z, read between pixels and between slices
function read(P, k, x, y, z) {
  const fx = x * k[0] - .5, fy = y * k[1] - .5, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j, n = P.X * P.Y;
  const at = (a, b, c) => (a < 0 || b < 0 || a >= P.X || b >= P.Y ? 0 : P.data[c * n + b * P.X + a]);
  const plane = (c) => at(i, j, c) * (1 - u) * (1 - w) + at(i + 1, j, c) * u * (1 - w) + at(i, j + 1, c) * (1 - u) * w + at(i + 1, j + 1, c) * u * w;
  const zc = Math.min(Math.max(z, 0), P.Z - 1), z0 = Math.floor(zc), z1 = Math.min(z0 + 1, P.Z - 1), f = zc - z0;
  return plane(z0) * (1 - f) + plane(z1) * f;
}

// vessel v ({path: [{x, y, z, r}]}, µm and slices) in stack P of model m: {strip: {w, h, values}, offsets (µm across),
// profile, half, edges [left, right] µm or null, measured µm or null, secondPeak, length, estimate µm or null}
export function widthOf(P, m, v) {
  const k = [P.X / (m.size_px[0] * m.um_per_px), P.Y / (m.size_px[1] * m.um_per_px)];
  const rs = v.path.map((p) => p.r).filter(Number.isFinite), estimate = rs.length ? 2 * rs.reduce((a, b) => a + b) / rs.length : null;
  const half = Math.max(HALF_UM, WIDTHS * (estimate ?? 0) / 2);
  const { pts, length } = resample(v.path, ALONG_UM), offsets = [];
  for (let d = -half; d <= half + 1e-9; d += ACROSS_UM) offsets.push(d);
  const values = new Float32Array(offsets.length * pts.length);
  pts.forEach((p, c) => {
    const a = pts[Math.max(c - 1, 0)], b = pts[Math.min(c + 1, pts.length - 1)], L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
    offsets.forEach((o, r) => {
      let t = 0;
      for (let dz = -SLAB; dz <= SLAB; dz++) t += read(P, k, p.x + nx * o, p.y + ny * o, p.z + dz);
      values[r * pts.length + c] = t / (2 * SLAB + 1);
    });
  });
  const c0 = Math.floor(pts.length * (1 - MIDDLE) / 2), c1 = Math.max(c0 + 1, Math.ceil(pts.length * (1 + MIDDLE) / 2));
  const profile = offsets.map((_, r) => { let t = 0; for (let c = c0; c < c1; c++) t += values[r * pts.length + c]; return t / (c1 - c0); });
  // the main peak: the brightest within a width of the line; the floor: the profile's low tenth
  const sorted = [...profile].sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * .1)];
  const mid = offsets.length >> 1, reach = Math.max(2, Math.round((estimate ?? 3) / ACROSS_UM / 2));
  let peak = mid; for (let r = mid - reach; r <= mid + reach; r++) if (r >= 0 && r < profile.length && profile[r] > profile[peak]) peak = r;
  const top = profile[peak], hm = floor + (top - floor) / 2;
  let l = peak; while (l > 0 && profile[l] >= hm) l--;
  let r = peak; while (r < profile.length - 1 && profile[r] >= hm) r++;
  const cross = (a, b) => offsets[a] + (hm - profile[a]) / ((profile[b] - profile[a]) || 1e-9) * (offsets[b] - offsets[a]);
  const edges = profile[l] < hm && profile[r] < hm ? [cross(l, l + 1), cross(r, r - 1)] : null;
  // a second peak: beyond the main one's half-height edges, rising most of the way back up and falling again
  const rise = floor + (top - floor) * SECOND;
  const secondPeak = profile.some((x, q) => (q < l || q > r) && x >= rise && q > 0 && q < profile.length - 1 && x >= profile[q - 1] && x >= profile[q + 1]);
  return { strip: { w: pts.length, h: offsets.length, values }, offsets, profile, half: hm, floor, top, edges,
    measured: edges && !secondPeak ? edges[1] - edges[0] : null, secondPeak, length, estimate };
}
