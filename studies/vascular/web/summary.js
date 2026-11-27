// What a vessel model adds up to over the tissue a mask outlines: the Summary box's numbers. The mask is areas
// outlined from straight above, [[x, y], ...] in µm, combined by exclusive or, each running through every slice;
// with none it is the whole field. Areas the model marks as damaged, and the image's damaged areas (in µm), are never
// tissue. Plain data in, data out, so it can be tested without a browser.
import * as Mo from './model.js';

const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

export function inPolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// whether tissue at x, y (µm) is counted: inside the mask and outside every damaged area
export function counted(m, mask, x, y) {
  const inMask = !mask?.length || mask.reduce((k, p) => k !== inPolygon(p, x, y), false);
  return inMask && !Mo.excluded(m, { x, y });
}

// The confirmed network's branches: each the run of vessel between two points that are not plain points along a
// vessel (a junction, three or more vessels meeting, or a tip), however many segments and edges the model drew it
// in. Each: its ends' kinds, its path through the model's points in µm (z already scaled), its length along that path,
// its straight span and its mean diameter, the ids of its two end points and its segments.
export function branches(m, zStepUm) {
  const inc = new Map(), S = m.segments;
  for (let i = 0; i < S.length; i++) if (Mo.confirmed(S[i])) for (const n of [S[i].a, S[i].b]) { const l = inc.get(n); if (l) l.push(i); else inc.set(n, [i]); }
  // a point's kind by how many confirmed segments meet there
  const kind = (id) => { const d = inc.get(id)?.length || 0; return d >= 3 ? 'junction' : d === 1 ? 'tip' : 'point'; };
  const used = new Uint8Array(S.length), out = [];
  const walk = (start, first) => {
    const path = [], segs = [];
    let at = start, i = first;
    for (;;) {
      used[i] = 1; segs.push(i);
      // the model's own points, which sit on the vessel, joined straight: a radius at each where the model gives one
      const s = S[i], fwd = s.a === at, A = m.nodes.get(s.a), B = m.nodes.get(s.b);
      const [P, rP, Q, rQ] = fwd ? [A, s.ra ?? A.r, B, s.rb ?? B.r] : [B, s.rb ?? B.r, A, s.ra ?? A.r];
      if (!path.length) path.push({ x: P.x, y: P.y, z: P.z * zStepUm, r: rP });
      path.push({ x: Q.x, y: Q.y, z: Q.z * zStepUm, r: rQ });
      at = fwd ? s.b : s.a;
      if (kind(at) !== 'point' || at === start) break;
      const l = inc.get(at), next = used[l[0]] ? (used[l[1]] ? null : l[1]) : l[0];
      if (next == null) break;
      i = next;
    }
    return { ends: [kind(start), kind(at)], at: [start, at], path, segs };
  };
  for (const [id, l] of inc) if (kind(id) !== 'point') for (const i of l) if (!used[i]) out.push(walk(id, i));
  // a closed loop of plain points has no end to start from
  for (const [id, l] of inc) for (const i of l) if (!used[i]) out.push(walk(id, i));
  return out.map((b) => {
    let length = 0;
    for (let k = 1; k < b.path.length; k++) { const p = b.path[k - 1], q = b.path[k]; length += len3(q.x - p.x, q.y - p.y, q.z - p.z); }
    const a = b.path[0], z = b.path.at(-1), span = len3(z.x - a.x, z.y - a.y, z.z - a.z);
    // a person's word on a vessel's width over the algorithm's estimate, weighted by how much of the branch it covers
    let wsum = 0, wlen = 0;
    for (const i of b.segs) {
      const s = m.segments[i], w = Mo.measured(s.width) ? s.width.um : null;
      const r = w == null ? [s.ra ?? m.nodes.get(s.a).r, s.rb ?? m.nodes.get(s.b).r].filter(Number.isFinite) : [];
      const d = w ?? (r.length ? 2 * r.reduce((x, y) => x + y) / r.length : null);
      const A = m.nodes.get(s.a), B = m.nodes.get(s.b), L = len3(B.x - A.x, B.y - A.y, (B.z - A.z) * zStepUm) || 1e-6;
      if (d != null) { wsum += d * L; wlen += L; }
    }
    // where the branch is counted: its point halfway along
    let half = length / 2, mid = a;
    for (let k = 1; k < b.path.length; k++) {
      const p = b.path[k - 1], q = b.path[k], d = len3(q.x - p.x, q.y - p.y, q.z - p.z);
      if (d >= half) { const t = d ? half / d : 0; mid = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; break; }
      half -= d;
    }
    return { ends: b.ends, at: b.at, segs: b.segs, path: b.path, length, span, diameter: wlen ? wsum / wlen : null, mid };
  });
}

// the q-quantile of values sorted, linear between the two nearest
export const quantile = (v, q) => { if (!v.length) return undefined; const i = (v.length - 1) * q, lo = Math.floor(i); return v[lo] + (v[Math.min(lo + 1, v.length - 1)] - v[lo]) * (i - lo); };
// n, mean, sd, median and the values sorted, of the finite ones in xs
export function stats(xs) {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b), n = v.length;
  if (!n) return { n, v };
  const mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1));
  return { n, mean, sd, med: n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2, min: v[0], max: v[n - 1], v };
}

// Where a row y of the field crosses a polygon's border, the x of each crossing.
function crossings(poly, y, out) {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y)) out.push((xj - xi) * (y - yi) / (yj - yi) + xi);
  }
  return out;
}
// the stretches [x0, x1] of row y inside an odd number of the polygons
const oddRuns = (polys, y) => {
  const xs = []; for (const p of polys) crossings(p, y, xs);
  xs.sort((a, b) => a - b);
  const out = []; for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] > xs[k]) out.push([xs[k], xs[k + 1]]);
  return out;
};
// The counted stretches of row y, in µm: inside the mask (all of the row without one), outside every damaged area.
export function tissueRuns(m, mask, y) {
  const W = m.size_px[0] * m.um_per_px;
  let runs = mask?.length ? oddRuns(mask, y).map(([a, b]) => [Math.max(0, a), Math.min(W, b)]).filter(([a, b]) => b > a) : [[0, W]];
  for (const r of m.excluded_regions || []) for (const [a, b] of oddRuns([r.polygon], y))
    runs = runs.flatMap(([c, d]) => (b <= c || a >= d ? [[c, d]] : [...(a > c ? [[c, a]] : []), ...(b < d ? [[b, d]] : [])]));
  return runs;
}

// The tissue as an even lattice of points s µm apart through it and every slice, s set so there are about `points` of
// them. Each point [x, y, z] in µm.
function lattice(m, mask, zStepUm, points) {
  const H = m.size_px[1] * m.um_per_px, depthUm = m.slices * zStepUm, s = Math.cbrt(tissueUm3(m, mask, zStepUm) / points) || 1, out = [];
  for (let y = s / 2; y < H; y += s) for (const [a, b] of tissueRuns(m, mask, y))
    for (let x = a + (((s / 2 - a) % s) + s) % s; x < b; x += s) for (let z = s / 2; z < depthUm; z += s) out.push([x, y, z]);
  return { s, out };
}

// The vessels as straight pieces with a radius at each end, binned in cubes of `cell` µm, and the distance from a point
// to the nearest vessel wall (0 inside one).
function walls(paths, cell) {
  // a cube's number: room for 2¹⁰ cubes a side, from 64 cubes before the field's corner
  const pieces = [], bins = new Map(), key = (i, j, k) => ((i + 64) * 1024 + j + 64) * 1024 + k + 64;
  for (const p of paths) for (let k = 1; k < p.length; k++) {
    const a = p[k - 1], b = p[k], ra = a.r, rb = b.r;
    const n = pieces.push({ a, b, ra, rb }) - 1, lo = [a, b].map((q) => [q.x, q.y, q.z]);
    const R = Math.max(ra, rb);
    for (let i = Math.floor((Math.min(lo[0][0], lo[1][0]) - R) / cell); i <= Math.floor((Math.max(lo[0][0], lo[1][0]) + R) / cell); i++)
      for (let j = Math.floor((Math.min(lo[0][1], lo[1][1]) - R) / cell); j <= Math.floor((Math.max(lo[0][1], lo[1][1]) + R) / cell); j++)
        for (let l = Math.floor((Math.min(lo[0][2], lo[1][2]) - R) / cell); l <= Math.floor((Math.max(lo[0][2], lo[1][2]) + R) / cell); l++) {
          const kk = key(i, j, l); if (!bins.has(kk)) bins.set(kk, []); bins.get(kk).push(n);
        }
  }
  const toPiece = ({ a, b, ra, rb }, x, y, z) => {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy + (z - a.z) * dz) / L2)) : 0;
    return len3(x - a.x - t * dx, y - a.y - t * dy, z - a.z - t * dz) - (ra + (rb - ra) * t);
  };
  return (x, y, z) => {
    if (!pieces.length) return null;
    const ci = Math.floor(x / cell), cj = Math.floor(y / cell), ck = Math.floor(z / cell);
    let best = Infinity;
    // rings of cubes outwards, until the next ring lies farther than the nearest wall found
    for (let r = 0; ; r++) {
      if ((r - 1) * cell > best || r > 1000) break;
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
        const edge = i === ci - r || i === ci + r || j === cj - r || j === cj + r;
        // inside the ring's square, only its top and bottom cubes are new
        for (let k = ck - r; k <= ck + r; k += edge || !r ? 1 : 2 * r) {
          const l = bins.get(key(i, j, k));
          if (l) for (let q = 0; q < l.length; q++) { const d = toPiece(pieces[l[q]], x, y, z); if (d < best) best = d; }
        }
      }
    }
    return Math.max(0, best);
  };
}

// The tissue's volume, in µm³: its area from above, exact along rows 1/200 of the field apart, through every slice.
export function tissueUm3(m, mask, zStepUm) {
  const H = m.size_px[1] * m.um_per_px, rows = 200, dy = H / rows;
  let area = 0;
  for (let k = 0; k < rows; k++) for (const [a, b] of tissueRuns(m, mask, (k + .5) * dy)) area += (b - a) * dy;
  return area * m.slices * zStepUm;
}

// The paths of the network's branches with a radius at every point: one the file does not give is the median of the
// others.
export function withRadii(every) {
  const known = [];
  let missing = false;
  for (const b of every) for (const p of b.path) if (Number.isFinite(p.r)) known.push(p.r); else missing = true;
  if (!missing) return every;
  const rs = Float64Array.from(known).sort(), r0 = rs.length ? rs[rs.length >> 1] : 0;
  for (const b of every) for (const p of b.path) if (!Number.isFinite(p.r)) p.r = r0;
  return every;
}

// The seven numbers the model's own geometry gives, over the tissue the mask and the damaged areas leave: sums and
// counts over its points and segments, nothing sampled. zStepUm: µm a slice stands for.
// the model with the image's damaged areas among its own
export const withDamaged = (m, damaged) => (damaged.length ? { ...m, excluded_regions: [...(m.excluded_regions || []), ...damaged.map((polygon) => ({ polygon }))] } : m);

export function summarize(m, { mask = [], damaged = [], zStepUm } = {}) {
  m = withDamaged(m, damaged);
  const t3 = tissueUm3(m, mask, zStepUm), mm3 = t3 * 1e-9, every = withRadii(branches(m, zStepUm));
  // the vessels' volume inside the tissue: each piece of tube, π r² times its length, counted where its middle lies
  let vesselUm3 = 0;
  for (const b of every) for (let k = 1; k < b.path.length; k++) {
    const p = b.path[k - 1], q = b.path[k];
    if (!counted(m, mask, (p.x + q.x) / 2, (p.y + q.y) / 2)) continue;
    const r = (p.r + q.r) / 2;
    vesselUm3 += Math.PI * r * r * len3(q.x - p.x, q.y - p.y, q.z - p.z);
  }
  const all = every.filter((b) => counted(m, mask, b.mid.x, b.mid.y));
  let junctions = 0;
  for (const [id, d] of Mo.degrees(m)) if (d >= 3) { const p = m.nodes.get(id); if (counted(m, mask, p.x, p.y)) junctions++; }
  // a branch, for counting, ends at a junction at one end at least; for its length, at both
  const counting = all.filter((b) => b.ends.includes('junction')), jj = all.filter((b) => b.ends[0] === 'junction' && b.ends[1] === 'junction');
  const length = all.reduce((t, b) => t + b.length, 0);
  const per = (k) => (mm3 ? k / mm3 : null);
  return {
    tissueMm3: mm3,
    volumeFraction: t3 ? vesselUm3 / t3 : null,
    lengthDensity: per(length * 1e-3), lengthUm: length,
    junctions, junctionDensity: per(junctions), junctionsPerMm: length ? junctions / (length * 1e-3) : null,
    branches: counting.length, branchDensity: per(counting.length),
    branchLength: stats(jj.map((b) => b.length)),
    diameter: stats(all.map((b) => b.diameter)),
    tortuosity: stats(all.filter((b) => b.span > 1).map((b) => b.length / b.span)),
  };
}

// The eighth number, the one that is not the model's alone: how far the tissue lies from its nearest vessel wall,
// measured from an even lattice of about `points` points through the tissue, to any vessel, the mask's or not; a point
// inside a vessel has none. Its cost grows with the points, not the model.
export function nearestVessel(m, { mask = [], damaged = [], zStepUm, points = 2000 } = {}) {
  m = withDamaged(m, damaged);
  const T = lattice(m, mask, zStepUm, points), near = walls(withRadii(branches(m, zStepUm)).map((b) => b.path), 20), far = [];
  for (const [x, y, z] of T.out) { const d = near(x, y, z); if (d != null && d > 0) far.push(d); }
  const st = stats(far), v = st.v;
  // the share of the tissue outside the vessels lying farther than d µm from the nearest wall
  const beyond = (d) => { if (!v.length) return null; let lo = 0, hi = v.length; while (lo < hi) { const k = (lo + hi) >> 1; if (v[k] > d) hi = k; else lo = k + 1; } return (v.length - lo) / v.length; };
  return { ...st, p90: quantile(v, 0.9), p95: quantile(v, 0.95), beyond, samples: T.out.length, spacingUm: T.s };
}
