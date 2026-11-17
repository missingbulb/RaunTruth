// The Vascular study's GT actions: pure functions the shell's action log replays, with no page and no clock (the day an
// action carries is its own, `at`). The model is model.js's; an action names a segment by its id and a point by its
// number, so it means the same item after the model is saved and read again, or the algorithm runs again.
import * as Mo from './model.js';
import { build, inBox, region } from './model_items.js';

const MATCH_UM = .5, MATCH_SLICES = .5;
const GONE_VESSEL = { skip: 'its vessel is gone' }, GONE_POINT = { skip: 'its point is gone' }, SAME = { skip: 'nothing to change' };
const isSkip = (r) => !!r && typeof r === 'object' && 'skip' in r;
const largest = (values, from) => values.reduce((n, v) => Math.max(n, v), from);

// ---------- a run's model ----------
// the largest id the algorithm could have given: a person's are apart from them
const lastPoint = (m) => largest([...m.nodes.keys()].filter((k) => k < Mo.USER_NODE), 0);
const number = (id) => { const k = /^s(\d+)$/.exec(id); return k ? +k[1] : 0; };
const lastSegment = (m) => largest(m.segments.map((s) => number(s.id)), 0);

// The algorithm's output as a model. With the model before it, a point within MATCH_UM in x and y and MATCH_SLICES in z of
// one of its points takes that point's id, and a segment whose two ends are then those of one of its segments takes its id;
// the rest take ids above both models' largest, so no id in a log means two things.
export function start(output, previous) {
  const m = Mo.identify(Mo.parse(output));
  if (!previous) return m;
  const free = new Map(previous.nodes), name = new Map();
  for (const n of [...m.nodes.values()].sort((p, q) => p.id - q.id)) {
    let best = null, near = Infinity;
    for (const p of free.values()) {
      if (Math.abs(p.x - n.x) > MATCH_UM || Math.abs(p.y - n.y) > MATCH_UM || Math.abs(p.z - n.z) > MATCH_SLICES) continue;
      const d = Math.hypot(p.x - n.x, p.y - n.y, p.z - n.z);
      if (d < near) { best = p; near = d; }
    }
    if (best) { free.delete(best.id); name.set(n.id, best.id); }
  }
  let point = Math.max(lastPoint(previous), lastPoint(m));
  for (const n of [...m.nodes.values()].sort((p, q) => p.id - q.id)) if (!name.has(n.id)) name.set(n.id, ++point);
  const nodes = new Map([...m.nodes.values()].map((n) => [name.get(n.id), { ...n, id: name.get(n.id) }]));
  const pair = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const before = new Map();
  for (const s of previous.segments) before.set(pair(s.a, s.b), [...(before.get(pair(s.a, s.b)) ?? []), s.id]);
  let segment = Math.max(lastSegment(previous), lastSegment(m));
  const segments = m.segments.map((s) => {
    const a = name.get(s.a), b = name.get(s.b), own = before.get(pair(a, b))?.shift();
    return { ...s, a, b, id: own ?? null };
  }).map((s) => (s.id == null ? { ...s, id: `s${++segment}` } : s));
  return Mo.identify({ ...m, nodes, segments });
}

// ---------- the model and its file ----------
// the file: the model with no clock and no count of corrections in it
export function document(model) {
  const { corrected_at: _at, corrections: _n, ...rest } = model;
  return Mo.toJSON(rest, { status: 'corrected', unchecked: Mo.WIDTHS });
}
export const load = (doc) => Mo.identify(Mo.parse(doc));

// ---------- an action done ----------
const indices = (m, ids) => { const k = ids.map((id) => m.segments.findIndex((s) => s.id === id)); return k.includes(-1) ? null : k; };
// an end of a connection or a drawn vessel, its segment named by index; null when what it names is not there
function end(m, t) {
  if (t.node != null) return m.nodes.has(t.node) ? t : null;
  if (t.segment != null) { const i = m.segments.findIndex((s) => s.id === t.segment); return i < 0 ? null : { segment: i, t: t.t }; }
  return t.point ? t : null;
}
const sameWidth = (m, o, idx) => idx.every((i) => JSON.stringify(m.segments[i]?.width ?? null) === JSON.stringify(o.segments[i]?.width ?? null));

function widthsRight(m, a) {
  const day = a.at.slice(0, 10);
  let o = { ...m, reviewed_regions: [...(m.reviewed_regions || []), region(a.box, a.slices, day)] };
  for (const v of build(m, 1).vessels) {
    if (!inBox(m, a.box, v.path[v.path.length >> 1])) continue;
    const open = v.proposed ? v.segments.filter((i) => o.segments[i].state === v.proposed) : [];
    if (open.length) o = Mo.decide(o, open, v.proposed === 'vessel' ? 'accepted' : 'rejected');
    if (Mo.live(o.segments[v.segments[0]]) && !Mo.widthOf(m, v.segments) && v.width != null) o = Mo.setWidth(o, v.segments, { how: 'looked', on: day });
  }
  return o;
}

function apply(m, a) {
  const vessel = () => indices(m, [a.segment]);
  switch (a.type) {
    case 'move-node': {
      const n = m.nodes.get(a.node);
      if (!n) return GONE_POINT;
      return n.x === a.to.x && n.y === a.to.y && n.z === a.to.z ? m : Mo.moveNode(m, a.node, a.to);
    }
    case 'attach': {
      if (!m.nodes.has(a.node)) return GONE_POINT;
      const onto = end(m, a.onto);
      if (!onto) return a.onto.node != null ? GONE_POINT : GONE_VESSEL;
      const moved = Mo.moveNode(m, a.node, a.to), joined = Mo.attach(moved, a.node, onto), at = m.nodes.get(a.node);
      // a tip dropped where it cannot attach has only moved
      return joined === moved && at.x === a.to.x && at.y === a.to.y && at.z === a.to.z ? m : joined;
    }
    case 'connect': case 'draw': {
      const [from, to] = [a.from, a.to].map((t) => end(m, t));
      if (!from || !to) return [a.from, a.to].some((t) => t.segment != null && !end(m, t)) ? GONE_VESSEL : GONE_POINT;
      return a.type === 'connect' ? Mo.connect(m, from, to) : Mo.drawSegment(m, from, to)[0];
    }
    case 'split': { const [i] = vessel() ?? []; return i == null ? GONE_VESSEL : Mo.splitSegment(m, i, a.t)[0]; }
    case 'cut': { const [i] = vessel() ?? []; return i == null ? GONE_VESSEL : Mo.cutSegment(m, i, a.ta, a.tb); }
    case 'remove-bend': return m.nodes.has(a.node) ? Mo.removeBend(m, a.node) : GONE_POINT;
    case 'delete-node': return m.nodes.has(a.node) ? Mo.deleteNode(m, a.node) : GONE_POINT;
    case 'delete-segment': {
      const idx = indices(m, a.segments);
      if (!idx) return GONE_VESSEL;
      let o = m;
      for (const i of [...idx].sort((p, q) => q - p)) o = Mo.deleteSegment(o, i);
      return o;
    }
    case 'split-junction': return m.nodes.has(a.node) ? Mo.splitJunction(m, a.node, a.zScale) : GONE_POINT;
    case 'review': { const [i] = vessel() ?? []; return i == null ? GONE_VESSEL : Mo.review(m, i, a.verdict); }
    case 'decide': { const idx = indices(m, a.segments); return idx ? Mo.decide(m, idx, a.verdict) : GONE_VESSEL; }
    case 'check-junction': return m.nodes.has(a.node) ? Mo.checkJunction(m, a.node, a.on) : GONE_POINT;
    case 'set-width': {
      const idx = indices(m, a.segments);
      if (!idx) return GONE_VESSEL;
      const o = Mo.setWidth(m, idx, a.width ? { ...a.width, on: a.at.slice(0, 10) } : null);
      return sameWidth(m, o, idx) ? m : o;
    }
    case 'widths-right': return widthsRight(m, a);
    default: return { skip: 'not an action of this study' };
  }
}

export function run(model, action) {
  const r = apply(model, action);
  if (isSkip(r)) return r;
  return r === model ? SAME : Mo.identify(r);
}

// ---------- how an action reads, and where it is ----------
const plural = (n, one, many) => (n === 1 ? one : `${n} ${many}`);
export function describe(a, count = 1) {
  switch (a.type) {
    case 'run': return `${a.output?.edges?.length ?? 0} vessels`;
    case 'move-node': return count > 1 ? `Moved ${count} points` : 'Moved a point';
    case 'attach': return count > 1 ? `Attached ${count} tips to vessels` : 'Attached a tip to a vessel';
    case 'connect': return count > 1 ? `Joined ${count} pairs of vessels` : 'Joined two vessels';
    case 'draw': return count > 1 ? `Drew ${count} vessel segments` : 'Drew a vessel segment';
    case 'split': return count > 1 ? `Added ${count} curve points` : 'Added a curve point';
    case 'cut': return count > 1 ? `Split ${count} vessels in two` : 'Split a vessel in two';
    case 'remove-bend': return count > 1 ? `Removed ${count} curve points` : 'Removed a curve point';
    case 'delete-node': return count > 1 ? `Deleted ${count} points` : 'Deleted a point';
    case 'delete-segment': return count > 1 ? `Deleted segments ${count} times` : `Deleted ${plural(a.segments.length, 'a segment', 'segments')}`;
    case 'split-junction': return count > 1 ? `Split ${count} junctions into crossing vessels` : 'Split a junction into crossing vessels';
    case 'review': return count > 1 ? `${a.verdict === 'accepted' ? 'Approved' : 'Declined'} ${count} vessels` : `${a.verdict === 'accepted' ? 'Approved' : 'Declined'} a vessel`;
    case 'decide': {
      const word = a.verdict === 'accepted' ? 'Approved' : a.verdict === 'rejected' ? 'Declined' : 'Took back the verdict on';
      return count > 1 ? `${word} ${count} vessels` : `${word} ${plural(a.segments.length, 'a vessel', 'vessels')}`;
    }
    case 'check-junction': return count > 1 ? `Judged ${count} junctions` : a.on ? 'Found a junction right' : 'Took back a junction verdict';
    case 'set-width': return count > 1 ? `Set ${count} widths` : a.width ? (a.width.how === 'cannot' ? 'Said a width cannot be told' : `Set a width: ${(+a.width.um).toFixed(2)} µm`) : 'Went back to the estimated width';
    case 'widths-right': return count > 1 ? `Widths right in ${count} areas` : `Widths right in area ${a.area + 1}`;
    default: return a.type;
  }
}

const PAD_PX = 5;
// the item's box in image pixels, [x0, y0, x1, y1, z], z in slices: from the model as it stands, null when it is not there
export function where(a, m) {
  const px = m.um_per_px;
  const point = (id) => m.nodes.get(id) ?? null;
  const segmentPoints = (ids) => { const k = indices(m, ids); return k && k.flatMap((i) => [point(m.segments[i].a), point(m.segments[i].b)]); };
  let ps = null, at = null;
  switch (a.type) {
    case 'move-node': case 'attach': { const n = point(a.node); ps = n ? [{ x: a.to.x, y: a.to.y, z: a.to.z }] : null; break; }
    case 'remove-bend': case 'delete-node': case 'split-junction': case 'check-junction': { const n = point(a.node); ps = n && [n]; break; }
    case 'split': case 'cut': case 'review': ps = segmentPoints([a.segment]); break;
    case 'delete-segment': case 'decide': case 'set-width': ps = segmentPoints(a.segments); break;
    case 'connect': case 'draw': {
      ps = [a.from, a.to].map((t) => (t.point ?? (t.node != null ? point(t.node) : segmentPoints([t.segment])?.[0])));
      if (ps.some((p) => !p)) ps = null;
      break;
    }
    case 'widths-right': at = [a.box.x0 / px, a.box.y0 / px, a.box.x1 / px, a.box.y1 / px, (a.slices[0] + a.slices[1]) / 2]; break;
    default: return null;
  }
  if (at) return at;
  if (!ps?.length || ps.some((p) => !p)) return null;
  const xs = ps.map((p) => p.x / px), ys = ps.map((p) => p.y / px);
  return [Math.min(...xs) - PAD_PX, Math.min(...ys) - PAD_PX, Math.max(...xs) + PAD_PX, Math.max(...ys) + PAD_PX, ps.reduce((t, p) => t + p.z, 0) / ps.length];
}
