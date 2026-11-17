// The Vascular study's GT actions: pure functions the shell's action log replays, with no page and no clock (the day an
// action carries is its own, `at`). The model is model.js's; an action names a segment by its id and a point by its
// number, so it means the same item after the model is saved and read again, or the algorithm runs again.
import * as Mo from './model.js';
import { build, inBox, region } from './model_items.js';

const MATCH_UM = .5, MATCH_SLICES = .5;
// how far a point the tagger moved may now be from where the run puts it; scale-dependent: micrometres
const MOVED_UM = 3;
const GONE_VESSEL = { skip: 'its vessel is gone' }, GONE_POINT = { skip: 'its point is gone' }, SAME = { skip: 'nothing to change' };
const isSkip = (r) => !!r && typeof r === 'object' && 'skip' in r;
const largest = (values, from) => values.reduce((n, v) => Math.max(n, v), from);

// ---------- a run's model ----------
// the largest id the algorithm could have given: a person's are apart from them
const lastPoint = (m) => largest([...m.nodes.keys()].filter((k) => k < Mo.USER_NODE), 0);
const number = (id) => { const k = /^s(\d+)$/.exec(id); return k ? +k[1] : 0; };
const lastSegment = (m) => largest(m.segments.map((s) => number(s.id)), 0);
const pair = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const person = (id) => id >= Mo.USER_NODE;
// whether the tagger's own work is in a model: a verdict, a width, a point or a vessel of their own, an area or a junction checked
const worked = (m) => m.segments.some((s) => Mo.decided(s) || s.width || !s.proposed) || [...m.nodes.keys()].some(person)
  || !!m.reviewed_regions?.length || !!m.checked_junctions?.length;

// The algorithm's output as a model. With the model before it, a point within MATCH_UM in x and y and MATCH_SLICES in z of
// one of its points takes that point's id, and a segment whose two ends are then those of one of its segments takes its id;
// the rest take ids above both models' largest, so no id in a log means two things. When the model before holds the tagger's
// work (a base), a point the run has none within MATCH_UM of but one within MOVED_UM of is the tagger's moved point, and the
// work is carried: see `carried`.
export function start(output, previous) {
  const m = Mo.identify(Mo.parse(output));
  if (!previous) return m;
  const free = new Map([...previous.nodes].filter(([id]) => !person(id))), name = new Map(), work = worked(previous);
  const claim = (reach) => {
    for (const n of [...m.nodes.values()].sort((p, q) => p.id - q.id)) {
      if (name.has(n.id)) continue;
      let best = null, near = Infinity;
      for (const p of free.values()) {
        if (Math.abs(p.x - n.x) > reach || Math.abs(p.y - n.y) > reach || Math.abs(p.z - n.z) > MATCH_SLICES) continue;
        const d = Math.hypot(p.x - n.x, p.y - n.y, p.z - n.z);
        if (d < near) { best = p; near = d; }
      }
      if (best) { free.delete(best.id); name.set(n.id, best.id); }
    }
  };
  claim(MATCH_UM);
  const moved = new Set();
  if (work) { const before = new Set(name.keys()); claim(MOVED_UM); for (const k of name.keys()) if (!before.has(k)) moved.add(name.get(k)); }
  let point = Math.max(lastPoint(previous), lastPoint(m));
  for (const n of [...m.nodes.values()].sort((p, q) => p.id - q.id)) if (!name.has(n.id)) name.set(n.id, ++point);
  const nodes = new Map([...m.nodes.values()].map((n) => {
    const id = name.get(n.id);
    return [id, moved.has(id) ? { ...previous.nodes.get(id) } : { ...n, id }];
  }));
  const before = new Map();
  for (const s of previous.segments) before.set(pair(s.a, s.b), [...(before.get(pair(s.a, s.b)) ?? []), s]);
  let segment = Math.max(lastSegment(previous), lastSegment(m));
  const segments = m.segments.map((s) => {
    const a = name.get(s.a), b = name.get(s.b), own = before.get(pair(a, b))?.shift();
    const now = { ...s, a, b, id: own?.id ?? null };
    return own && work ? { ...now, ...(Mo.decided(own) ? { state: own.state } : {}), ...(own.width ? { width: own.width } : {}) } : now;
  }).map((s) => (s.id == null ? { ...s, id: `s${++segment}` } : s));
  const out = { ...m, nodes, segments };
  return Mo.identify(work ? carried(previous, out, before) : out);
}

// What the tagger did in the model before, put onto a run's model whose points have taken its ids: the vessels the tagger
// drew or split, and the points they added, stand as they were (a vessel the run has between the same two points is
// replaced by them), and so do the areas checked and the junctions found right. A verdict or a width on a segment the run
// has none for, and a junction it has no point for, is listed in `dropped` and left out; `leftover` holds the segments of
// the model before no segment of the run took.
function carried(previous, m, leftover) {
  const nodes = new Map(m.nodes), segments = [...m.segments], dropped = [];
  const mine = (s) => person(s.a) || person(s.b) || !s.proposed;
  const kept = previous.segments.filter(mine);
  const placeable = kept.filter((s) => [s.a, s.b].every((n) => nodes.has(n) || person(n)));
  for (const s of kept) if (!placeable.includes(s)) dropped.push(s.id);
  const have = new Set(segments.map((s) => pair(s.a, s.b)));
  // the vessels of the run that a chain of the tagger's own points now stands in for
  const links = new Map();
  for (const s of placeable) for (const [x, y] of [[s.a, s.b], [s.b, s.a]]) links.set(x, [...(links.get(x) ?? []), y]);
  const chained = (a, b) => {
    const seen = new Set([a]), todo = [a];
    while (todo.length) {
      const from = todo.pop();
      for (const n of links.get(from) ?? []) {
        if (n === b && from !== a) return true;
        if (person(n) && !seen.has(n)) { seen.add(n); todo.push(n); }
      }
    }
    return false;
  };
  const rest = segments.filter((s) => !(!person(s.a) && !person(s.b) && chained(s.a, s.b)));
  for (const s of placeable) {
    for (const n of [s.a, s.b]) if (person(n) && !nodes.has(n)) nodes.set(n, { ...previous.nodes.get(n) });
    if (!have.has(pair(s.a, s.b)) || person(s.a) || person(s.b)) rest.push({ ...s });
  }
  for (const list of leftover.values()) for (const s of list) if (!mine(s) && (Mo.decided(s) || s.width)) dropped.push(s.id);
  const checked = (previous.checked_junctions ?? []).filter((id) => nodes.has(id) || (dropped.push(`junction ${id}`), false));
  return { ...m, nodes, segments: rest,
    ...(previous.reviewed_regions?.length ? { reviewed_regions: [...previous.reviewed_regions] } : {}),
    ...(checked.length ? { checked_junctions: checked } : {}), ...(dropped.length ? { dropped } : {}) };
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
