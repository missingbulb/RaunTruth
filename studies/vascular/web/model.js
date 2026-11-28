// A vessel model: junctions and tips joined by smooth curves, the format algorithm/vessel_model.py
// writes (vessel-model/2). Each edge is a centripetal Catmull-Rom curve from node a to node b through
// its "via" points, which sit on the vessel. x, y and r (radius) are µm from the image's top-left
// corner, z is in slices. Everything here is plain data in, data out, so the edits can be tested
// without a browser.
//
// In memory the model is points joined by segments: an edge's via points are points where only that
// edge passes, so moving a point drags the curve, adding one adds a bend, and removing one lets the
// curve run smoother. Writing the model back collapses each run of such points into one edge again.
//
// Each edge has a state. "vessel" is drawn by the extractor with confidence, or by the owner;
// "candidate" is a low-confidence vessel the extractor kept for the owner to review, which becomes
// "accepted" or "rejected". A rejected edge stays in the file as a recorded "no", but is no part
// of the network: junctions, tips and every edit see only the others. Junctions and tips are counted
// over confirmed vessels only, so a candidate turns a point into a junction once it is accepted.
// The owner's verdict goes on a confident vessel too; "proposed" keeps the state the extractor gave
// each edge it drew ("vessel" or "candidate"), so the verdicts can be scored against it, and an edge
// the owner drew has none.

export const FORMAT = 'vessel-model/2';
const FORMATS = ['vessel-model/1', FORMAT];

export const STATES = ['vessel', 'candidate', 'accepted', 'rejected'];
const CONFIRMED = new Set(['vessel', 'accepted']);
export const confirmed = (s) => CONFIRMED.has(s.state);
export const live = (s) => s.state !== 'rejected';

export class ModelError extends Error {}

// Every segment has an id that stays its own through edits and through the file: the algorithm's are s1, s2 … in the order
// its file lists them, a person's u1, u2 …, and a point a person adds takes its id from USER_NODE up, so a run again,
// whose ids may fall anywhere below it, never gives them to something else.
export const USER_NODE = 1e6;
// a point's name for a person: a number, or u and the order a person added it in
export const pointName = (id) => (id >= USER_NODE ? `u${id - USER_NODE + 1}` : String(id));

// Checks a parsed JSON file and returns the model with ids made consistent: every segment names two
// existing, different points, no segment is listed twice, and no point is left unconnected. Reads
// the straight-segment vessel-model/1 files too.
export function parse(j) {
  if (!j || !FORMATS.includes(j.format)) throw new ModelError(`it is not a vessel model (expected format "${FORMAT}")`);
  for (const k of ['slices', 'um_per_px']) if (!(j[k] > 0)) throw new ModelError(`it has no "${k}"`);
  if (!Array.isArray(j.size_px) || j.size_px.length !== 2) throw new ModelError('it has no "size_px"');
  const v2 = j.format === FORMAT, list = v2 ? j.edges : j.segments;
  if (!Array.isArray(j.nodes) || !Array.isArray(list)) throw new ModelError(`it has no "nodes" or "${v2 ? 'edges' : 'segments'}"`);
  const { nodes: _n, segments: _s, edges: _e, ...rest } = j;
  const m = { ...rest, format: FORMAT, nodes: new Map(), segments: [] };
  for (const n of j.nodes) {
    if (![n.x, n.y, n.z].every(Number.isFinite)) throw new ModelError(`point ${n.id} has no position`);
    m.nodes.set(n.id, pt(n.id, n));
  }
  let next = newId(m);
  const seen = new Set();
  // the ids the file gives: a curve point's own, when it is a whole number no other point holds, and an edge's segment_ids,
  // when it names one segment of its edge each and none another edge has
  const reserved = new Set(), claimed = new Set(), given = new Map();
  list.forEach((e, k) => {
    for (const p of (v2 && e.via) || []) if (Number.isInteger(p?.id) && !m.nodes.has(p.id) && !reserved.has(p.id)) reserved.add(p.id);
    const want = ((v2 && e.via) || []).length + 1, own = e.segment_ids;
    if (Array.isArray(own) && own.length === want && own.every((x) => typeof x === 'string' && x) && new Set(own).size === want && own.every((x) => !claimed.has(x))) {
      own.forEach((x) => claimed.add(x)); given.set(k, own);
    }
  });
  let nextSeg = 1;
  const freshSeg = () => { while (claimed.has(`s${nextSeg}`)) nextSeg++; claimed.add(`s${nextSeg}`); return `s${nextSeg++}`; };
  const freshPoint = () => { while (m.nodes.has(next) || reserved.has(next)) next++; return next++; };
  const taken = new Set();
  for (const [ei, s] of list.entries()) {
    if (!m.nodes.has(s.a) || !m.nodes.has(s.b)) throw new ModelError(`${v2 ? 'an edge' : 'a segment'} names a point that does not exist (${s.a}–${s.b})`);
    // a file written before segments had a state holds only the extractor's confident vessels
    const state = s.state ?? 'vessel';
    if (!STATES.includes(state)) throw new ModelError(`${v2 ? 'an edge' : 'a segment'} has the unknown state "${state}" (${s.a}–${s.b})`);
    const ids = [s.a], flow = FLOWS.includes(s.flow) ? s.flow : null;
    // a verdict in a file written before "proposed": only a candidate could take one
    const proposed = ['vessel', 'candidate'].includes(s.proposed) ? s.proposed : state === 'vessel' || state === 'candidate' ? state : 'candidate';
    const { id: _i, a: _a, b: _b, via: _v, segment_ids: _si, state: _st, confidence: _c, vessel: _ve, r_a: _ra, r_b: _rb, flow: _f, proposed: _p, drawn: _d, width, ...rest } = s;
    const extra = Object.keys(rest).length ? rest : null;
    if (width != null) readWidth(width, s);
    for (const p of (v2 && s.via) || []) {
      if (![p.x, p.y, p.z].every(Number.isFinite)) throw new ModelError(`a curve point on edge ${s.a}–${s.b} has no position`);
      const id = Number.isInteger(p.id) && reserved.has(p.id) && !taken.has(p.id) ? p.id : freshPoint();
      taken.add(id); m.nodes.set(id, pt(id, p)); ids.push(id);
    }
    ids.push(s.b);
    const r = taperAlong(m, ids, s.r_a, s.r_b);
    for (let i = 1; i < ids.length; i++) {
      const k = key(ids[i - 1], ids[i]);
      if (ids[i - 1] !== ids[i] && !seen.has(k)) {
        seen.add(k);
        m.segments.push(seg(ids[i - 1], ids[i], { id: given.get(ei)?.[i - 1] ?? freshSeg(), state, proposed: s.drawn ? null : proposed, confidence: s.confidence, vessel: s.vessel, ...(r && { ra: r[i - 1], rb: r[i] }), flow, extra, width }));
      }
    }
  }
  if (j.excluded_regions != null) {
    if (!Array.isArray(j.excluded_regions)) throw new ModelError('its "excluded_regions" is not a list');
    for (const r of j.excluded_regions) if (!Array.isArray(r?.polygon) || r.polygon.length < 3 || !r.polygon.every((q) => q?.length === 2 && q.every(Number.isFinite)))
      throw new ModelError('an excluded area has no outline of at least three points');
  }
  prune(m);
  return m;
}

// An edge narrows from its start width r_a to its end width r_b, steadily along its points. Blood flows
// along it as "ab" (from a to b) or "ba"; with no flow the direction is unknown.
const FLOWS = ['ab', 'ba'];
function taperAlong(m, ids, ra, rb) {
  if (!Number.isFinite(ra) || !Number.isFinite(rb)) return null;
  const P = ids.map((id) => m.nodes.get(id)), d = [0];
  for (let i = 1; i < P.length; i++) d.push(d[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y, P[i].z - P[i - 1].z));
  const L = d.at(-1) || 1;
  return d.map((v) => ra + (rb - ra) * v / L);
}
// A segment carries its own radius at each end (ra at a, rb at b) when its edge tapers, and its flow
// as "ab" or "ba" between its own ends. Seen from its end p: the radius there, at the far end, and
// whether blood flows away from p.
function from(s, p) {
  const fwd = p === s.a;
  return { r0: fwd ? s.ra : s.rb, r1: fwd ? s.rb : s.ra, out: s.flow == null ? null : (s.flow === 'ab') === fwd };
}
// the fields of a segment running from p, given what `from` reports for it there
const taper = ({ r0, r1, out }) => ({ ...(Number.isFinite(r0) && Number.isFinite(r1) && { ra: r0, rb: r1 }), ...(out != null && { flow: out ? 'ab' : 'ba' }) });
const bare = ({ ra: _a, rb: _b, flow: _f, ...rest }) => rest;

const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
// a radius the file does not give stays unknown rather than zero
const pt = (id, p) => (Number.isFinite(p.r) ? { id, x: p.x, y: p.y, z: p.z, r: p.r } : { id, x: p.x, y: p.y, z: p.z });
// confidence is the extractor's score and vessel its guess at which branch continues a trunk; a
// segment the owner drew has neither, and stays without them
// extra holds the edge's fields this viewer has no use for, written back as they came
// width is the person's word on the vessel's width (setWidth), one object shared by every segment of the vessel
const seg = (a, b, { id, state, proposed, confidence, vessel, ra, rb, flow, extra, width }) => ({ ...(id != null && { id }), a, b, state, ...(proposed && { proposed }), ...(confidence != null && { confidence }),
  ...(vessel != null && { vessel }), ...(Number.isFinite(ra) && Number.isFinite(rb) && { ra, rb }), ...(flow != null && { flow }), ...(extra && { extra }), ...(width && { width }) });
const sameEdge = (p, q) => p.state === q.state && p.proposed === q.proposed && p.confidence === q.confidence && p.vessel === q.vessel && p.extra === q.extra && p.width === q.width;

// The segments at each point, rejected ones included, since a recorded "no" keeps its own ends.
function incidence(m) {
  const inc = new Map();
  m.segments.forEach((s, i) => { for (const n of [s.a, s.b]) { if (!inc.has(n)) inc.set(n, []); inc.get(n).push(i); } });
  return inc;
}
// A point inside one edge: exactly two segments meet there, and they belong to the same edge.
function throughPoint(m, inc, id) {
  const l = inc.get(id);
  return l?.length === 2 && l[0] !== l[1] && sameEdge(m.segments[l[0]], m.segments[l[1]]) ? l : null;
}

// The model's edges: each a run of segments between points that are not inside one edge, as the
// ordered point ids from a to b.
export function edges(m) {
  const inc = incidence(m), used = new Set(), out = [];
  const other = (s, n) => (s.a === n ? s.b : s.a);
  m.segments.forEach((s, i) => {
    if (used.has(i)) return;
    used.add(i);
    const ids = [s.a, s.b], segs = [i];
    for (const forward of [true, false]) {
      for (;;) {
        const end = forward ? ids.at(-1) : ids[0], l = throughPoint(m, inc, end);
        const j = l && l.find((k) => !used.has(k));
        if (j == null) break;
        used.add(j);
        if (forward) { ids.push(other(m.segments[j], end)); segs.push(j); } else { ids.unshift(other(m.segments[j], end)); segs.unshift(j); }
      }
    }
    out.push({ ids, segments: segs, ...m.segments[i] });
  });
  return out;
}

// The widths the algorithm estimated: a person's word on a width goes in the vessel's own "width" and never over these,
// so a submitted model names them in its "unchecked" list rather than passing them off as corrected.
export const WIDTHS = ['r', 'r_a', 'r_b', 'taper_known'];

// ---------- a vessel's width, as a person said it ----------
// One width per vessel (junction or tip to the next), never a taper: {um, how, walls, on}. how is "walls" (a drag from
// one wall to the other, walls its two ends [x, y] in µm), "nudge" (the estimate stepped), "cannot" (it cannot be told)
// "looked" (its estimate looked at in an area found right, not measured), "measured" (the width at half height across
// it, agreed) or "unclear" (the person could not tell); um, a diameter in µm, on "walls", "nudge" and "measured".
// A vessel nobody said anything of has none, and its width is the algorithm's estimate.
export const WIDTH_HOWS = ['walls', 'nudge', 'cannot', 'looked', 'measured', 'unclear'];
const MEASURED = new Set(['walls', 'nudge', 'measured']);
export const measured = (w) => !!w && MEASURED.has(w.how);
function readWidth(w, s) {
  const at = `(${s.a}–${s.b})`;
  if (!WIDTH_HOWS.includes(w?.how)) throw new ModelError(`an edge's width says neither of ${WIDTH_HOWS.join(', ')} ${at}`);
  if (MEASURED.has(w.how) && !(w.um > 0)) throw new ModelError(`an edge's width set by hand has no µm ${at}`);
  if (w.walls != null && !(w.walls.length === 2 && w.walls.every((p) => p?.length === 2 && p.every(Number.isFinite)))) throw new ModelError(`an edge's walls are not two points ${at}`);
}
export const widthOf = (m, segs) => m.segments[segs[0]]?.width ?? null;
// the segments segs, one vessel's, given width w, or none with w null: the same object on each, so they stay one edge
export function setWidth(m, segs, w) {
  const o = clone(m);
  for (const i of segs) { if (!o.segments[i]) continue; const { width: _w, ...s } = o.segments[i]; o.segments[i] = w ? { ...s, width: w } : s; }
  return o;
}
const day = (on) => (on ? { on } : {});
// a drag from one wall to the other, [[x, y], [x, y]] in µm: the vessel's width is its length
export const measure = (m, segs, walls, on) => setWidth(m, segs, { um: Math.hypot(walls[1][0] - walls[0][0], walls[1][1] - walls[0][1]), how: 'walls', walls, ...day(on) });
// the width stepped by `by` µm: a measured one's walls each moved half of it, else from the width set or, with none, from
// the estimate (µm, null when there is none, and then nothing changes)
const LEAST_UM = .25;
export function nudge(m, segs, by, estimate, on) {
  const w = widthOf(m, segs);
  if (w?.how === 'walls' && w.walls) {
    const [p, q] = w.walls, L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, um = Math.max(LEAST_UM, L + by), k = (um - L) / 2 / L;
    const d = [(q[0] - p[0]) * k, (q[1] - p[1]) * k];
    return setWidth(m, segs, { ...w, um, walls: [[p[0] - d[0], p[1] - d[1]], [q[0] + d[0], q[1] + d[1]]], ...day(on) });
  }
  const from = measured(w) ? w.um : estimate;
  if (!(from > 0)) return m;
  return setWidth(m, segs, { um: Math.max(LEAST_UM, from + by), how: 'nudge', ...day(on) });
}

export function toJSON(m, extra = {}) {
  const { nodes, segments, ...rest } = m;
  const es = edges(m), ends = new Set(es.flatMap((e) => [e.ids[0], e.ids.at(-1)]));
  const at = (id) => ({ ...nodes.get(id) });
  return { ...rest, ...extra, format: FORMAT,
    nodes: [...nodes.values()].filter((n) => ends.has(n.id)),
    edges: es.map((e, k) => {
      const start = from(m.segments[e.segments[0]], e.ids[0]), end = from(m.segments[e.segments.at(-1)], e.ids.at(-1));
      const out = start.out ?? (end.out == null ? null : !end.out);
      return { ...e.extra, id: k + 1, segment_ids: e.segments.map((i) => m.segments[i].id), a: e.ids[0], b: e.ids.at(-1), ...(e.vessel != null && { vessel: e.vessel }), state: e.state,
        ...(e.proposed ? { proposed: e.proposed } : { drawn: true }),
        ...(e.confidence != null && { confidence: e.confidence }),
        ...(Number.isFinite(start.r0) && Number.isFinite(end.r0) && { r_a: start.r0, r_b: end.r0 }), ...(out != null && { flow: out ? 'ab' : 'ba' }),
        ...(e.width && { width: e.width }), via: e.ids.slice(1, -1).map(at) };
    }) };
}

// ---------- the curve ----------
// For each segment, the points either side of it along its edge (null at an edge's end), cached
// per model since a model is never changed in place.
const around = new WeakMap();
function neighbourhood(m) {
  if (around.has(m)) return around.get(m);
  const inc = incidence(m), out = m.segments.map((s, i) => {
    const beyond = (n) => { const l = throughPoint(m, inc, n); if (!l) return null; const t = m.segments[l[0] === i ? l[1] : l[0]]; return t.a === n ? t.b : t.a; };
    return [beyond(s.a), beyond(s.b)];
  });
  around.set(m, out);
  return out;
}

// The point at t (0..1) along segment i's stretch of its curve: centripetal Catmull-Rom through the
// segment's ends and the points either side, with an edge's end continued straight past itself.
export function curvePoint(m, i, t) {
  const s = m.segments[i], [pa, pb] = neighbourhood(m)[i];
  const P1 = m.nodes.get(s.a), P2 = m.nodes.get(s.b);
  const mirror = (p, q) => ({ x: 2 * p.x - q.x, y: 2 * p.y - q.y, z: 2 * p.z - q.z });
  const P0 = pa != null ? m.nodes.get(pa) : mirror(P1, P2), P3 = pb != null ? m.nodes.get(pb) : mirror(P2, P1);
  const out = catmullRom(P0, P1, P2, P3, t);
  const r1 = s.ra ?? P1.r, r2 = s.rb ?? P2.r;
  if (Number.isFinite(r1) && Number.isFinite(r2)) out.r = r1 + (r2 - r1) * t;
  return out;
}

// Centripetal Catmull-Rom between P1 and P2 (Barry and Goldman's form), over x, y and z as stored.
export function catmullRom(P0, P1, P2, P3, t) {
  const P = [P0, P1, P2, P3].map((p) => [p.x, p.y, p.z]);
  const d = (a, b) => Math.max(Math.sqrt(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])), 1e-6);
  const t0 = 0, t1 = d(P[0], P[1]), t2 = t1 + d(P[1], P[2]), t3 = t2 + d(P[2], P[3]);
  const u = t1 + (t2 - t1) * t;
  const lerp = (a, b, ta, tb) => a.map((v, k) => ((tb - u) * v + (u - ta) * b[k]) / (tb - ta));
  const A1 = lerp(P[0], P[1], t0, t1), A2 = lerp(P[1], P[2], t1, t2), A3 = lerp(P[2], P[3], t2, t3);
  const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3), C = lerp(B1, B2, t1, t2);
  return { x: C[0], y: C[1], z: C[2] };
}

// n + 1 points along segment i's stretch of curve, ends included.
export const sampleSegment = (m, i, n) => Array.from({ length: n + 1 }, (_, k) => curvePoint(m, i, k / n));

// The model with every segment that has no id, or repeats one an earlier segment has, given a person's id; the model
// itself when none needs one.
export function identify(m) {
  let u = 0;
  for (const s of m.segments) { const k = /^u(\d+)$/.exec(s.id ?? ''); if (k) u = Math.max(u, +k[1]); }
  const seen = new Set();
  let changed = false;
  const segments = m.segments.map((s) => {
    if (typeof s.id === 'string' && s.id && !seen.has(s.id)) { seen.add(s.id); return s; }
    changed = true;
    const id = `u${++u}`; seen.add(id);
    return { ...s, id };
  });
  return changed ? { ...m, segments } : m;
}

export const clone = (m) => ({ ...m, nodes: new Map([...m.nodes].map(([k, n]) => [k, { ...n }])), segments: m.segments.map((s) => ({ ...s })) });

// How many segments meet at each point: confirmed vessels by default, or those `which` picks.
export function degrees(m, which = confirmed) {
  const d = new Map();
  for (const s of m.segments) if (which(s)) { d.set(s.a, (d.get(s.a) || 0) + 1); d.set(s.b, (d.get(s.b) || 0) + 1); }
  return d;
}
export const neighbours = (m, id) => m.segments.filter((s) => live(s) && (s.a === id || s.b === id)).map((s) => (s.a === id ? s.b : s.a));
const between = (m, a, b) => m.segments.find((s) => live(s) && key(s.a, s.b) === key(a, b));

function prune(m) {
  const d = degrees(m, () => true);
  for (const id of [...m.nodes.keys()]) if (!d.get(id)) m.nodes.delete(id);
}
function newId(m) { let k = 0; for (const id of m.nodes.keys()) if (id > k) k = id; return k + 1; }
function addNode(m, p) { const id = Math.max(newId(m), USER_NODE); m.nodes.set(id, pt(id, p)); return id; }
const DRAWN = { state: 'vessel' };
function link(m, a, b, like = DRAWN) {
  if (a === b) return false;
  const old = m.segments.findIndex((s) => key(s.a, s.b) === key(a, b));
  if (old >= 0 && live(m.segments[old])) return false;
  if (old >= 0) m.segments.splice(old, 1);   // drawn again where a rejected candidate lay: the owner has changed their mind
  m.segments.push(seg(a, b, like)); return true;
}
// the less certain of two segments' states, for a segment that replaces both
const merged = (p, q) => (p.state === 'candidate' ? p : q.state === 'candidate' ? q : confirmed(p) ? p : q);

// Each edit returns a new model and leaves the one it was given unchanged, so undo is a list of models.

export function moveNode(m, id, p) {
  const o = clone(m); Object.assign(o.nodes.get(id), { x: p.x, y: p.y, z: p.z }); return o;
}

export function deleteSegment(m, i) {
  const o = clone(m); o.segments.splice(i, 1); prune(o); return o;
}

export function deleteNode(m, id) {
  const o = clone(m); o.segments = o.segments.filter((s) => !live(s) || (s.a !== id && s.b !== id)); prune(o); return o;
}

// A curve point taken out: the curve runs on from one neighbour to the other.
export function removeBend(m, id) {
  const nb = neighbours(m, id);
  if (nb.length !== 2) return m;
  const p = between(m, id, nb[0]), q = between(m, id, nb[1]), here = from(p, nb[0]), there = from(q, nb[1]);
  const o = deleteNode(m, id);
  for (const n of nb) if (!o.nodes.has(n)) o.nodes.set(n, { ...m.nodes.get(n) });
  link(o, nb[0], nb[1], { ...bare(merged(p, q)), ...taper({ r0: here.r0, r1: there.r0, out: here.out ?? (there.out == null ? null : !there.out) }) });
  return o;
}

// A point placed on the curve of segment i at fraction t from its first end, so the curve keeps its
// shape until the point is moved; returns [model, new point id].
export function splitSegment(m, i, t) {
  const o = clone(m), s = o.segments[i], p = curvePoint(m, i, t);
  const id = addNode(o, p);
  o.segments.splice(i, 1, seg(s.a, id, { ...s, rb: p.r }), seg(id, s.b, { ...s, ra: p.r }));
  return [o, id];
}

// Segment i cut in two between fractions ta < tb along it: each half ends in a tip of its own, on the curve where it
// was cut, and keeps the segment's state. Unchanged when ta and tb are not in order inside the segment.
export function cutSegment(m, i, ta, tb) {
  const s = m.segments[i];
  if (!s || !(0 < ta && ta < tb && tb < 1)) return m;
  const o = clone(m), p = curvePoint(m, i, ta), q = curvePoint(m, i, tb), pa = addNode(o, p), qb = addNode(o, q);
  o.segments.splice(i, 1, seg(s.a, pa, { ...s, rb: p.r }), seg(qb, s.b, { ...s, ra: q.r }));
  return o;
}

// The junction is wrong: its vessels pass each other instead of meeting. The branches are paired off
// most-opposite first (a vessel runs straight through a crossing), each pair keeps its own point at
// the depth between its two neighbours, and a branch left over becomes a tip set a little back from
// the crossing so it reads as detached. zScale converts slices to µm for the angles.
export function splitJunction(m, id, zScale = 1) {
  const nb = neighbours(m, id);
  if (nb.length < 3) return m;
  const N = m.nodes.get(id);
  const dir = nb.map((k) => { const P = m.nodes.get(k), v = [P.x - N.x, P.y - N.y, (P.z - N.z) * zScale], l = Math.hypot(...v) || 1; return v.map((x) => x / l); });
  const left = new Set(nb.map((_, i) => i)), groups = [];
  while (left.size >= 2) {
    let best = null;
    for (const i of left) for (const j of left) if (i < j) {
      const c = dir[i][0] * dir[j][0] + dir[i][1] * dir[j][1] + dir[i][2] * dir[j][2];
      if (!best || c < best[2]) best = [i, j, c];
    }
    groups.push([best[0], best[1]]); left.delete(best[0]); left.delete(best[1]);
  }
  for (const i of left) groups.push([i]);
  const like = nb.map((k) => between(m, id, k));
  const o = clone(m);
  o.segments = o.segments.filter((s) => !live(s) || (s.a !== id && s.b !== id));
  if (!o.segments.some((s) => s.a === id || s.b === id)) o.nodes.delete(id);
  for (const g of groups) {
    const ps = g.map((i) => m.nodes.get(nb[i]));
    const p = g.length === 2
      ? { x: N.x, y: N.y, z: (ps[0].z + ps[1].z) / 2 }
      : { x: N.x + (ps[0].x - N.x) * .25, y: N.y + (ps[0].y - N.y) * .25, z: N.z + (ps[0].z - N.z) * .25 };
    if (Number.isFinite(N.r)) p.r = N.r;
    const nid = addNode(o, p);
    // the pair is one vessel running through
    for (const i of g) { if (!o.nodes.has(nb[i])) o.nodes.set(nb[i], { ...m.nodes.get(nb[i]) }); link(o, nid, nb[i], { ...bare(like[i]), vessel: like[g[0]].vessel, ...taper(from(like[i], id)) }); }
  }
  return o;
}

// Two parts of one vessel joined. Each end is {node: id} or {segment: i, t}, a point on a segment.
export const connect = (m, from, to) => join(m, from, to)[0];

// A vessel's tip dropped on another vessel, for a connection the extractor missed: the tip's one segment ends there
// instead, on a point of it ({node: id}) or on a new point of its line ({segment: i, t}), and the tip goes. Unchanged
// when id is no tip, or the place is the tip itself, its own segment, its neighbour or a point it already reaches.
export function attach(m, id, to) {
  const own = m.segments.flatMap((s, i) => (live(s) && (s.a === id || s.b === id) ? [i] : []));
  if (own.length !== 1) return m;
  const i = own[0], s = m.segments[i], nb = s.a === id ? s.b : s.a;
  if (to.node != null ? to.node === id || to.node === nb || !m.nodes.has(to.node) : !m.segments[to.segment]) return m;
  let o = clone(m), at = to.node;
  if (at == null) [o, at] = splitSegment(o, to.segment, to.t);
  if (between(o, nb, at)) return m;
  const k = o.segments.findIndex((x) => live(x) && (x.a === id || x.b === id)), x = o.segments[k];
  o.segments[k] = { ...x, ...(x.a === id ? { a: at } : { b: at }) };
  prune(o);
  return o;
}

// A vessel the extractor missed, drawn a segment at a time: from one end to the next, where an end
// may also be {point: {x, y, z}}, a new point in the open. Returns [model, id of the point drawn to],
// or the model unchanged and null when the two ends are one point or already joined. The segment has
// a width from the start (no vessel is without one): at an end on the model, the radius of the vessel
// there; at an end in the open, the other end's; with both in the open, the mean of the model's vessels.
export const drawSegment = (m, from, to) => { const [o, ids] = join(m, from, to); return o === m ? [m, null] : [o, ids[1]]; };

function join(m, from, to) {
  let o = m;
  const ids = [];
  // split the later-listed segment first so the earlier index stays valid
  const ends = [from, to].map((e, k) => ({ ...e, k })).sort((p, q) => (q.segment ?? -1) - (p.segment ?? -1));
  for (const e of ends) {
    if (e.node != null) { ids[e.k] = e.node; continue; }
    if (e.point) { if (o === m) o = clone(m); ids[e.k] = addNode(o, e.point); continue; }
    [o, ids[e.k]] = splitSegment(o, e.segment, e.t);
  }
  if (ids[0] === ids[1]) return [m, ids];
  if (o === m) o = clone(m);
  const joined = [from, to].map((e, k) => (e.point ? null : radiusAt(o, ids[k])));
  const lone = joined[0] ?? joined[1] ?? meanRadius(m), [ra, rb] = joined.map((r) => r ?? lone);
  if (!link(o, ids[0], ids[1], { ...DRAWN, ra, rb })) return [m, ids];
  [ra, rb].forEach((r, k) => { const n = o.nodes.get(ids[k]); if (Number.isFinite(r) && !Number.isFinite(n.r)) n.r = r; });
  return [o, ids];
}
// the radius of the model's vessels at a point: where their segments end there, else the point's own; null when unknown
function radiusAt(m, id) {
  const rs = m.segments.filter((s) => live(s) && (s.a === id || s.b === id)).map((s) => from(s, id).r0).filter(Number.isFinite);
  if (rs.length) return rs.reduce((a, b) => a + b) / rs.length;
  const r = m.nodes.get(id)?.r;
  return Number.isFinite(r) ? r : null;
}
// the mean radius of the model's vessels, each segment by its length in the image plane; null when none has a width
function meanRadius(m) {
  let sum = 0, length = 0;
  for (const s of m.segments) {
    if (!confirmed(s)) continue;
    const a = m.nodes.get(s.a), b = m.nodes.get(s.b), ra = s.ra ?? a.r, rb = s.rb ?? b.r, L = Math.hypot(b.x - a.x, b.y - a.y);
    if (Number.isFinite(ra) && Number.isFinite(rb)) { sum += (ra + rb) / 2 * L; length += L; }
  }
  return length ? sum / length : null;
}

// The segments of the one vessel segment i belongs to, as far as its state runs: it continues
// through points where only it and one other segment meet, and stops at a junction, a tip, or where
// a segment in another state takes over.
export function piece(m, i) {
  const state = m.segments[i].state, d = degrees(m, (t) => live(t) || t.state === state), out = new Set([i]), todo = [i];
  while (todo.length) {
    const s = m.segments[todo.pop()];
    for (const n of [s.a, s.b]) {
      if (d.get(n) !== 2) continue;
      const j = m.segments.findIndex((t, k) => !out.has(k) && t.state === state && (t.a === n || t.b === n));
      if (j >= 0) { out.add(j); todo.push(j); }
    }
  }
  return [...out].sort((a, b) => a - b);
}

// The owner's verdict on a candidate: the whole vessel it belongs to is accepted or rejected.
export function review(m, i, verdict) {
  if (m.segments[i]?.state !== 'candidate' || !['accepted', 'rejected'].includes(verdict)) return m;
  const o = clone(m);
  for (const k of piece(m, i)) o.segments[k].state = verdict;
  return o;
}

// The owner's verdict on a vessel the extractor drew, confident or not: each of the segments `segs` accepted or
// rejected, or, with verdict null, back to the state the extractor proposed.
export function decide(m, segs, verdict) {
  if (![null, 'accepted', 'rejected'].includes(verdict) || !segs.some((i) => m.segments[i]?.proposed)) return m;
  const o = clone(m);
  for (const i of segs) if (o.segments[i]?.proposed) o.segments[i].state = verdict || o.segments[i].proposed;
  return o;
}
export const decided = (s) => !!s.proposed && (s.state === 'accepted' || s.state === 'rejected');

// A junction the owner found right is kept by its id in checked_junctions; one found to be vessels that only cross
// is split instead (splitJunction).
export const checkedJunction = (m, id) => (m.checked_junctions || []).includes(id);
// A junction nobody could tell is kept by its id in unclear_junctions; it and a verdict that it is right replace each other.
const listed = (m, key, id) => (m[key] || []).includes(id);
function mark(m, key, other, id, on) {
  if (listed(m, key, id) === on && !(on && listed(m, other, id))) return m;
  const now = new Set(m[key] || []), was = new Set(m[other] || []);
  on ? now.add(id) : now.delete(id);
  if (on) was.delete(id);
  const o = { ...clone(m), [key]: [...now].sort((a, b) => a - b) };
  if (m[other]) o[other] = [...was].sort((a, b) => a - b);
  return o;
}
export const checkJunction = (m, id, on = true) => mark(m, 'checked_junctions', 'unclear_junctions', id, on);
export const unclearJunction = (m, id) => listed(m, 'unclear_junctions', id);
export const markUnclear = (m, id, on = true) => mark(m, 'unclear_junctions', 'checked_junctions', id, on);

// How many vessels (junction to junction, not segments between curve points) are in each state, and
// how many of the live ones lie mostly in an area marked as damaged, counted there instead.
export function pieceCounts(m) {
  const n = { ...Object.fromEntries(STATES.map((s) => [s, 0])), excluded: 0 }, seen = new Set();
  m.segments.forEach((s, i) => {
    if (seen.has(i)) return;
    const p = piece(m, i);
    for (const k of p) seen.add(k);
    n[live(s) && 2 * p.filter((k) => excluded(m, curvePoint(m, k, .5))).length > p.length ? 'excluded' : s.state]++;
  });
  return n;
}

// Counts over the confirmed vessels, leaving out whatever lies in an area marked as damaged.
export function stats(m) {
  const d = degrees(m), all = degrees(m, live), out = (id) => excluded(m, m.nodes.get(id));
  let junctions = 0, tips = 0, pending = 0, segments = 0, excludedSegments = 0;
  for (const [id, v] of d) { if (out(id)) continue; if (v >= 3) junctions++; else if (v === 1) tips++; }
  for (const [id, v] of all) if (v >= 3 && !((d.get(id) || 0) >= 3) && !out(id)) pending++;
  m.segments.forEach((s, i) => { if (confirmed(s)) { if (excluded(m, curvePoint(m, i, .5))) excludedSegments++; else segments++; } });
  return { points: m.nodes.size, segments, excludedSegments, junctions, tips, pendingJunctions: pending };
}

// ---------- areas excluded from analysis ----------
// Areas a model file marks as damaged sample (a fold, a tear, a bubble, debris, out of focus), each an
// outline of x, y points in µm drawn from above. An area runs through every slice: the stacks are thin
// and damage cuts through them. Analysis leaves out what lies inside, and measures density over the
// rest of the field.

function inPolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const excluded = (m, p) => (m.excluded_regions || []).some((r) => inPolygon(r.polygon, p.x, p.y));

// The share of the field the areas cover, overlaps counted once, sampled on a fine grid.
export function excludedFraction(m, n = 500) {
  const rs = m.excluded_regions || [];
  if (!rs.length) return 0;
  const W = m.size_px[0] * m.um_per_px, H = m.size_px[1] * m.um_per_px;
  let hit = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (excluded(m, { x: (i + .5) * W / n, y: (j + .5) * H / n })) hit++;
  return hit / (n * n);
}
