// The vessel model below the whole image: its sub-networks, each a connected component of the confirmed branches
// counted inside the tissue (connected inside the imaged volume, which may join outside it), and each branch with the
// sub-network it belongs to; then how the network branches at its points, and how evenly its vessels fill the field.
// Plain data in, data out, so it can be tested without a browser.
import * as Mo from './model.js';
import { branches, counted, stats, tissueRuns, withDamaged, withRadii } from './summary.js';

const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
// how far along a branch its direction at a junction is read, in µm: scale-dependent, set for capillaries a few µm wide
const DIRECTION_UM = 10;
// the side of the heterogeneity grid's cells from above, in µm: scale-dependent
export const CELL_UM = 50;

// The shortest path along the vessels from `from` to every end point of a sub-network (Dijkstra over its branches):
// each point's distance and the branch it was reached by.
function shortest(adj, from) {
  const dist = new Map([[from, 0]]), via = new Map(), heap = [[0, from]];
  const push = (e) => { heap.push(e); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let k = i; if (l < heap.length && heap[l][0] < heap[k][0]) k = l; if (r < heap.length && heap[r][0] < heap[k][0]) k = r; if (k === i) break; [heap[k], heap[i]] = [heap[i], heap[k]]; i = k; } }
    return top;
  };
  while (heap.length) {
    const [d, u] = pop();
    if (d > dist.get(u)) continue;
    for (const { to, length, b } of adj.get(u) || []) {
      const nd = d + length;
      if (!(nd >= dist.get(to))) { dist.set(to, nd); via.set(to, b); push([nd, to]); }
    }
  }
  return { dist, via };
}

// the direction a branch leaves its end point `id` in, read DIRECTION_UM along it (or half its length, if shorter)
function leaving(b, fromStart) {
  const P = fromStart ? b.path : [...b.path].reverse(), a = P[0], reach = Math.min(DIRECTION_UM, b.length / 2);
  let went = 0, at = P[P.length - 1];
  for (let k = 1; k < P.length; k++) {
    const p = P[k - 1], q = P[k], d = len3(q.x - p.x, q.y - p.y, q.z - p.z);
    if (went + d >= reach) { const t = d ? (reach - went) / d : 0; at = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t }; break; }
    went += d;
  }
  const v = [at.x - a.x, at.y - a.y, at.z - a.z], n = len3(...v);
  return n ? v.map((c) => c / n) : null;
}

// The model's sub-networks, degrees, branching angles and heterogeneity over the tissue the mask and the damaged areas
// leave. zStepUm: µm a slice stands for; cellUm: the heterogeneity grid's cell side.
export function networks(m, { mask = [], damaged = [], zStepUm, cellUm = CELL_UM } = {}) {
  m = withDamaged(m, damaged);
  const W = m.size_px[0] * m.um_per_px, H = m.size_px[1] * m.um_per_px, zTop = 0, zBottom = (m.slices - 1) * zStepUm;
  const all = withRadii(branches(m, zStepUm)).filter((b) => counted(m, mask, b.mid.x, b.mid.y));
  const total = all.reduce((t, b) => t + b.length, 0);

  // the sub-networks: branches joined where they share an end point
  const parent = new Map(), find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const b of all) for (const id of b.at) if (!parent.has(id)) parent.set(id, id);
  for (const b of all) { const [p, q] = b.at.map(find); if (p !== q) parent.set(p, q); }
  const groups = new Map();
  for (const b of all) { const r = find(b.at[0]); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(b); }

  // a point on the volume's border: within its radius (and at least a pixel) of a side, or within half a slice of the
  // first or last slice
  const onSide = (p) => { const e = Math.max(p.r || 0, m.um_per_px); return p.x <= e || p.y <= e || p.x >= W - e || p.y >= H - e; };
  const onFace = (p) => p.z <= zTop + zStepUm / 2 || p.z >= zBottom - zStepUm / 2;
  const onBorder = (p) => onSide(p) || onFace(p);

  const components = [...groups.values()].map((bs) => {
    const ends = new Map(), adj = new Map();
    for (const b of bs) b.at.forEach((id, k) => ends.set(id, { kind: b.ends[k], p: b.path[k ? b.path.length - 1 : 0] }));
    for (const b of bs) for (const [u, v] of [b.at, [b.at[1], b.at[0]]]) { if (!adj.has(u)) adj.set(u, []); adj.get(u).push({ to: v, length: b.length, b }); }
    // the longest shortest path: the farthest pair of end points along the vessels
    let best = { d: 0, from: bs[0].at[0], to: bs[0].at[0], via: new Map() };
    for (const id of ends.keys()) {
      const { dist, via } = shortest(adj, id);
      for (const [to, d] of dist) if (d > best.d) best = { d, from: id, to, via };
    }
    // the path's points from its far end back, each branch walked the way the path runs through it
    const route = [];
    for (let at = best.to; at !== best.from;) {
      const b = best.via.get(at), back = b.at[1] === at;
      route.push(...(back ? [...b.path].reverse() : b.path).map((p) => [p.x, p.y]));
      at = back ? b.at[0] : b.at[1];
    }
    const length = bs.reduce((t, b) => t + b.length, 0), kinds = [...ends.values()];
    const junctions = kinds.filter((e) => e.kind === 'junction').length, tips = kinds.filter((e) => e.kind === 'tip');
    return {
      branchList: bs, lengthUm: length, share: total ? length / total : null,
      junctions, tips: tips.length, nodes: junctions + tips.length, branches: bs.length,
      borderTips: tips.filter((e) => onBorder(e.p)).length,
      touchesBorder: bs.some((b) => b.path.some(onBorder)), touchesSide: bs.some((b) => b.path.some(onSide)),
      branchLength: stats(bs.map((b) => b.length)), diameter: stats(bs.map((b) => b.diameter)),
      tortuosity: stats(bs.filter((b) => b.span > 1).map((b) => b.length / b.span)),
      junctionsPerMm: length ? junctions / (length * 1e-3) : null,
      longestPathUm: best.d, longestPath: route,
    };
  }).sort((a, b) => b.lengthUm - a.lengthUm);
  components.forEach((c, k) => { c.id = k + 1; for (const b of c.branchList) b.component = c.id; });

  // node degrees: how many confirmed vessels meet at each of the model's points inside the tissue
  const degrees = { 1: 0, 2: 0, 3: 0, '4+': 0 };
  for (const [id, d] of Mo.degrees(m)) {
    const p = m.nodes.get(id);
    if (d >= 1 && counted(m, mask, p.x, p.y)) degrees[d >= 4 ? '4+' : d]++;
  }

  // branching angles: between each pair of branches leaving a junction, in 3D
  const out = new Map();
  for (const b of all) b.at.forEach((id, k) => { if (b.ends[k] !== 'junction') return; const v = leaving(b, !k); if (!v) return; if (!out.has(id)) out.set(id, []); out.get(id).push(v); });
  const angles = [];
  for (const vs of out.values()) for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const c = vs[i][0] * vs[j][0] + vs[i][1] * vs[j][1] + vs[i][2] * vs[j][2];
    angles.push((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
  }

  return { components, degrees, angles: stats(angles), grid: grid(m, mask, all, W, H, zStepUm, cellUm), totalUm: total,
    branches: all.map(({ component, ends, at, length, span, diameter, mid }) => ({ component, ends, at, length, span, diameter, mid })) };
}

// Spatial heterogeneity: the field from above in square cells of cellUm, through every slice; each cell's tissue and
// the vessel length whose pieces have their middle in it, as a length density; and the coefficient of variation of that
// density over the cells at least half tissue.
function grid(m, mask, all, W, H, zStepUm, cellUm) {
  const nx = Math.max(1, Math.ceil(W / cellUm - 1e-9)), ny = Math.max(1, Math.ceil(H / cellUm - 1e-9)), depth = m.slices * zStepUm;
  const area = new Float64Array(nx * ny), length = new Float64Array(nx * ny), rows = 8;
  for (let j = 0; j < ny; j++) for (let k = 0; k < rows; k++) {
    const y0 = j * cellUm, y1 = Math.min(H, y0 + cellUm), dy = (y1 - y0) / rows, y = y0 + (k + 0.5) * dy;
    for (const [a, b] of tissueRuns(m, mask, y)) for (let i = Math.floor(a / cellUm); i < nx && i * cellUm < b; i++)
      area[j * nx + i] += Math.max(0, Math.min(b, (i + 1) * cellUm) - Math.max(a, i * cellUm)) * dy;
  }
  for (const b of all) for (let k = 1; k < b.path.length; k++) {
    const p = b.path[k - 1], q = b.path[k], x = (p.x + q.x) / 2, y = (p.y + q.y) / 2;
    const i = Math.min(nx - 1, Math.max(0, Math.floor(x / cellUm))), j = Math.min(ny - 1, Math.max(0, Math.floor(y / cellUm)));
    length[j * nx + i] += len3(q.x - p.x, q.y - p.y, q.z - p.z);
  }
  const cells = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = area[j * nx + i], full = Math.min(cellUm, W - i * cellUm) * Math.min(cellUm, H - j * cellUm);
    cells.push({ i, j, tissue: full ? a / full : 0, lengthUm: length[j * nx + i], density: a ? (length[j * nx + i] * 1e-3) / (a * depth * 1e-9) : null });
  }
  const used = stats(cells.filter((c) => c.tissue >= 0.5).map((c) => c.density));
  return { cellUm, nx, ny, cells, density: used, cv: used.n > 1 && used.mean ? used.sd / used.mean : null };
}
