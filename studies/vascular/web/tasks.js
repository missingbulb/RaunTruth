// The Ground Truth Tasks, in the left bar while the study makes ground truth: the stack's areas, a row each, then
// Submit. An area is open only while the owner annotates (req/shell/annotate/choice); then the main view shows it alone
// (model_view.js) and the box walks its four steps, one item at a time (req/vascular/truth/tasks): its doubts (each
// low-confidence vessel kept or rejected), its junctions (each a junction, a crossing, or can't tell), a look over its
// slices for what was missed, and each vessel's width (width_card.js). Back to image shows the whole stack and Back to
// task the area again; the areas float as a map over the view meanwhile. Every answer is an edit of the model, so it is
// undone, saved and submitted with the rest.
import * as Mo from './model.js';
import * as MV from './model_view.js';
import { build, junctionPicture, junctionArms, vesselPicture } from './items.js';
import { umText } from './widths.js';
import { widthOf } from './width_card.js';

const $ = (id) => document.getElementById(id);
// an area done is kept with this step; a file from the earlier three steps did it with all of these
const STEP = 'area', STEPS_BEFORE = ['lines', 'missed', 'junctions'];
// an area done: every one of these points across it, each way, lies in a box kept for it
const PROBES = 4;
// a junction's picture, as wide as the box, and no narrower than this
const MIN_PX = 160;

// tools: the open area's cogwheel and Skip, for its row; work: what is done in it, under its row
// n: the areas across the field each way, the shell's Areas menu's (req/shell/ground-truth/areas)
let V = null, keys = null, T = null, n = null, st = null, items = null, heard = () => {}, tools = null, work = null;
// step and key: the step and item asked, null for the first not answered; history: the items answered, for Back;
// adjust: µm the person stepped the current width; seen, slice, since: the Missed step's slices seen, the one shown and
// when the step opened; slab: the slices the view showed before it
const fresh = () => ({ area: null, submit: false, focused: true, dir: 0, step: null, key: null, history: [], adjust: 0, seen: null, slice: 0, since: 0, slab: null });
const STEPS = ['doubts', 'junctions', 'missed', 'vessels'];
const STEP_NAMES = { doubts: 'Doubts', junctions: 'Junctions', missed: 'Missed', vessels: 'Vessels' };
const STEP_UM = .25;

// ---------- the areas, in the order they are worked through: the shell's ----------
const size = (m) => [m.size_px[0] * m.um_per_px, m.size_px[1] * m.um_per_px];
const count = () => n * n;
const keyOf = (a) => `a${a}`;
// an area's box in µm, {x0, y0, x1, y1}
function areaBox(m, a) {
  const [W, H] = size(m), q = (v) => Math.round(v * 100) / 100, [x0, y0, x1, y1] = T.areas.box(a, W, H).map(q);
  return { x0, y0, x1, y1 };
}
// the area a point lies in; a curve running past the field's edge is in the area at that edge
function areaOf(m, p) {
  const [W, H] = size(m);
  return T.areas.areaAt(p.x / W, p.y / H);
}
// a box kept before the steps had names was an area checked for missed vessels
const stepOf = (g) => g.step || 'missed';
function covered(m, a, step) {
  const b = areaBox(m, a), gs = (m.reviewed_regions || []).filter((g) => g.x?.length === 2 && g.y?.length === 2 && stepOf(g) === step);
  if (!gs.length) return false;
  for (let i = 0; i < PROBES; i++) for (let j = 0; j < PROBES; j++) {
    const x = b.x0 + (b.x1 - b.x0) * (i + .5) / PROBES, y = b.y0 + (b.y1 - b.y0) * (j + .5) / PROBES;
    if (!gs.some((g) => x >= g.x[0] && x <= g.x[1] && y >= g.y[0] && y <= g.y[1])) return false;
  }
  return true;
}
const done = (m, a) => covered(m, a, STEP) || STEPS_BEFORE.every((s) => covered(m, a, s));
const areasDone = (m) => Array.from({ length: count() }, (_, a) => done(m, a)).filter(Boolean).length;
// the first area not done in the walk from area a on, a itself first; null when all are
function nextOpen(m, a) {
  for (let k = 0; k < count(); k++) { const b = (a + k) % count(); if (!done(m, b)) return b; }
  return null;
}

// ---------- the areas' items: their vessels and their junctions, each by where it lies ----------
const segId = (m, v) => m.segments[v.segments[0]].id;
function itemsOf(m) {
  const { vessels, junctions } = build(m);
  const js = junctions.map((j) => ({ ...j, key: `j${j.id}`, at: { x: j.x, y: j.y, z: j.z }, done: Mo.checkedJunction(m, j.id) || Mo.unclearJunction(m, j.id) }))
    .sort((p, q) => p.y - q.y || p.x - q.x);
  const vs = vessels.map((v) => ({ ...v, key: `v${segId(m, v)}`, at: v.path[v.path.length >> 1], said: Mo.widthOf(m, v.segments) }))
    .sort((p, q) => p.at.y - q.at.y || p.at.x - q.at.x);
  return { vessels: vs, junctions: js };
}
const junctionsIn = (m, a) => items.junctions.filter((j) => areaOf(m, j) === a);
const vesselsIn = (m, a) => items.vessels.filter((v) => areaOf(m, v.at) === a);
// each step's items in an area, each with whether it is answered; the Missed step has none
function stepItems(m, a, step) {
  if (step === 'doubts') return vesselsIn(m, a).filter((v) => v.proposed === 'candidate').map((v) => ({ ...v, answered: v.state !== 'candidate' }));
  if (step === 'junctions') return junctionsIn(m, a).map((j) => ({ ...j, answered: j.done }));
  if (step === 'vessels') return vesselsIn(m, a).filter((v) => v.proposed !== 'candidate' || v.state === 'accepted')
    .map((v) => ({ ...v, answered: v.state === 'rejected' || !!v.said }));
  return [];
}
const stepDone = (m, a, step) => (step === 'missed' ? covered(m, a, 'missed') : stepItems(m, a, step).every((x) => x.answered));
// the step the area is on: the one Back went to, else the first not done, else the last
const stepNow = (m, a) => st.step ?? STEPS.find((k) => !stepDone(m, a, k)) ?? 'vessels';

// ---------- moving through the areas ----------
// to: an area, or null for Submit
function go(to, dir = 1) {
  if (!MV.current()) return;
  st.area = to ?? st.area; st.submit = to == null;
  st.focused = to != null; st.dir = dir; st.step = null; st.key = null; st.history = []; st.adjust = 0;
  show(true);
}
const moveOn = () => { const m = MV.current(); go(nextOpen(m, (st.area + 1) % count())); };
// an area's row, or its square on the map: that area
function pick(key) { const a = +String(key).slice(1); if (String(key)[0] === 'a' && a >= 0 && a < count()) go(a); }
// Skip: the next area not done, leaving this one for later
function skip() { const m = MV.current(); if (!m || st.area == null) return; const to = nextOpen(m, (st.area + 1) % count()); go(to ?? st.area); }
function setGrid(k) {
  const m = MV.current(); n = k;
  if (!m) return;
  st.area = null;
  go(nextOpen(m, 0), 0);
}

// ---------- the answers ----------
// an answer given on the current item: its action done, the item kept for Back, and on to the next
function answered(action) {
  const m = MV.current(); if (!m || st.area == null) return;
  const step = stepNow(m, st.area), key = st.key ?? current(m)?.key;
  // the same answer again, after Back, sends nothing and moves on all the same
  if (action && !same(m, action)) MV.act(action);
  st.history.push({ step, key });
  st.step = null; st.key = null; st.adjust = 0; st.dir = 1;
  show(false);
}
// whether an answer is the one the model already holds
function same(m, a) {
  const at = (id) => m.segments.find((x) => x.id === id);
  if (a.type === 'set-width') { const w = at(a.segments[0])?.width; return !!w && w.how === a.width.how && (w.um ?? null) === (a.width.um ?? null); }
  if (a.type === 'decide') return a.segments.every((id) => at(id)?.state === a.verdict);
  if (a.type === 'check-junction') return Mo.checkedJunction(m, a.node) === a.on;
  if (a.type === 'unclear-junction') return Mo.unclearJunction(m, a.node) === a.on;
  return false;
}
function back() {
  const last = st.history.pop(); if (!last) return;
  st.step = last.step; st.key = last.key; st.adjust = 0; st.dir = -1;
  show(false);
}
// the step's own button: Nothing else missing in the Missed step, Area done once every vessel is answered
function stepButton() {
  const m = MV.current(); if (!m || st.area == null) return;
  const step = stepNow(m, st.area), box = areaBox(m, st.area), slices = [0, m.slices - 1];
  if (step === 'missed') {
    if (!missedReady(m)) return;
    const seconds = Math.round((performance.now() - st.since) / 1000);
    if (MV.act({ type: 'missed-checked', area: st.area, box, slices, seen: st.seen.size, seconds })) { st.history.push({ step, key: null }); st.step = null; show(false); }
    return;
  }
  if (step === 'vessels' && STEPS.every((k) => stepDone(m, st.area, k)) && MV.act({ type: 'area-done', area: st.area, box, slices })) moveOn();
}
const ids = (m, v) => v.segments.map((i) => m.segments[i].id);
function current(m) {
  const list = stepItems(m, st.area, stepNow(m, st.area));
  return list.find((x) => x.key === st.key) ?? list.find((x) => !x.answered) ?? null;
}

// ---------- the Missed step: the slices one at a time ----------
const sliceCount = () => V.meta?.shape?.[0] ?? MV.current()?.slices ?? 1;
const missedReady = () => !!st.seen && st.seen.size >= sliceCount();
function showSlice(k) {
  const Z = sliceCount(); st.slice = Math.min(Math.max(k, 0), Z - 1); st.seen.add(st.slice);
  V.S.z0 = V.S.z1 = st.slice; V.redraw(); show(false);
}
// entered or left: the view shows one slice while the step is on, and the slices it showed before once it is left
function missedView(on) {
  const mcv = document.getElementById('mcv');
  if (on && !st.seen) {
    st.slab = [V.S.z0, V.S.z1]; st.seen = new Set(); st.since = performance.now();
    st.slice = 0; st.seen.add(0); V.S.z0 = V.S.z1 = 0; V.redraw();
  } else if (!on && st.seen) {
    const [z0, z1] = st.slab ?? [0, sliceCount() - 1];
    V.S.z0 = z0; V.S.z1 = z1; st.seen = null; st.slab = null; V.redraw();
  }
  mcv?.classList.toggle('dim', !!on);
  MV.everyDepth(on);
}

// ---------- the box's cards ----------
let HINT = '';
const label = (b, text) => { if (b.firstChild?.nodeType === 3) { if (b.firstChild.textContent.trim() !== text) b.firstChild.textContent = text; } else b.prepend(text); };
const button = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.onclick = fn; return b; };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const boxPx = () => Math.max(MIN_PX, Math.round($('gt-tasks').clientWidth || 280));
function verdicts(...bs) { const acts = el('div', 'verdict'); acts.append(...bs); return acts; }

function doubtCard(m, v) {
  const card = el('div', 'task-card'), cv = document.createElement('canvas'), px = boxPx();
  card.dataset.key = v.key; cv.style.width = cv.style.height = px + 'px';
  requestAnimationFrame(() => vesselPicture(cv, m, v, px));
  const keep = button('Keep', () => answered({ type: 'decide', segments: ids(m, v), verdict: 'accepted' }), 'yes');
  const reject = button('Reject', () => answered({ type: 'decide', segments: ids(m, v), verdict: 'rejected' }), 'no');
  keep.title = 'A vessel: keep it in the model'; reject.title = 'Not a vessel: leave it out';
  card.append(cv, el('p', 'note', `Low confidence · ${v.length.toFixed(0)} µm`), verdicts(keep, reject));
  return card;
}

function junctionCard(m, j) {
  const card = el('div', 'task-card'), px = Math.floor(boxPx() / 2) - 3, pics = el('div', 'pics');
  card.dataset.key = j.key;
  const arms = junctionArms(m, j);
  for (const byDepth of [false, true]) {
    const wrap = el('div', 'pic'), cv = document.createElement('canvas');
    cv.style.width = cv.style.height = px + 'px';
    requestAnimationFrame(() => junctionPicture(cv, m, j, px, byDepth));
    wrap.append(cv);
    if (byDepth) for (const a of arms) {
      const t = el('span', 'arm-z', `${a.z_um.toFixed(0)} µm`);
      t.style.left = `${(a.at[0] * 100).toFixed(1)}%`; t.style.top = `${(a.at[1] * 100).toFixed(1)}%`;
      wrap.append(t);
    }
    pics.append(wrap);
  }
  const yes = button('Junction', () => answered({ type: 'check-junction', node: j.id, on: true }), 'yes');
  const no = button('They cross', () => answered({ type: 'split-junction', node: j.id, zScale: V.S.zs }), 'no');
  const unclear = button("Can't tell", () => answered({ type: 'unclear-junction', node: j.id, on: true }), 'unclear');
  yes.title = 'Three or more vessels really meet here'; no.title = 'The vessels only pass each other at different depths: split them';
  unclear.title = 'Neither can be told: kept apart and left out of the score';
  card.append(pics, el('p', 'note', 'Grey, and coloured by depth: red the first slice, blue the last. Each arm\'s depth where it leaves.'), verdicts(yes, no, unclear));
  return card;
}

function missedCard() {
  const card = el('div', 'task-card'), Z = sliceCount();
  card.dataset.key = 'missed';
  const prev = button('‹ Slice', () => showSlice(st.slice - 1)), next = button('Slice ›', () => showSlice(st.slice + 1));
  prev.id = 'slice-prev'; next.id = 'slice-next'; prev.disabled = st.slice <= 0; next.disabled = st.slice >= Z - 1;
  const seen = el('p', 'note', `Slice ${st.slice + 1} of ${Z} · ${st.seen.size} of ${Z} seen`); seen.id = 'slices-seen';
  card.append(el('p', null, 'Look over the area for vessels the algorithm missed, one slice at a time. Right-click the image where one runs to draw it.'),
    seen, verdicts(prev, next));
  return card;
}

// a vessel's width card: straightened, its brightness across it, the width at half height beside the algorithm's
const widths = new Map();
function widthCard(m, v) {
  const card = el('div', 'task-card'), P = V.pixels(), px = boxPx();
  card.dataset.key = v.key;
  const key = `${v.key}:${v.path.map((p) => `${p.x},${p.y},${p.z}`).join(';')}`;
  const w = P && (widths.get(key) ?? (widths.set(key, widthOf(P, m, v)), widths.get(key)));
  if (!w) { card.append(el('p', 'note', 'The stack is not loaded yet.')); return card; }
  // the strip, true to scale, as wide as the box
  const strip = document.createElement('canvas'); strip.className = 'strip';
  strip.width = w.strip.w; strip.height = w.strip.h;
  const sorted = Array.from(w.strip.values).sort((a, b) => a - b), lo = sorted[Math.floor(sorted.length * .01)], hi = Math.max(sorted[Math.floor(sorted.length * .997)], lo + 1);
  const c = strip.getContext('2d'), img = c.createImageData(w.strip.w, w.strip.h);
  w.strip.values.forEach((x, i) => { const g = Math.round(Math.min(Math.max((x - lo) / (hi - lo), 0), 1) * 255); img.data.set([g, g, g, 255], 4 * i); });
  c.putImageData(img, 0, 0);
  strip.style.width = px + 'px'; strip.style.height = Math.max(36, Math.min(140, Math.round(px * w.strip.h / w.strip.w))) + 'px';
  const base = w.measured ?? v.width ?? null, now = base != null ? Math.max(STEP_UM, base + st.adjust) : null;
  card.append(strip, profile(w, now, px));
  const facts = el('p', 'facts');
  const said = v.said && v.said.um ? ` · said ${umText(v.said.um)}` : v.said?.how === 'unclear' ? " · said can't tell" : '';
  const measured = el('span', null, w.measured != null ? `Half height ${umText(w.measured)}` : w.secondPeak ? 'Profile has a second peak' : 'No clear edges');
  measured.id = 'w-measured'; if (w.measured != null) measured.dataset.um = w.measured.toFixed(3);
  const est = el('span', null, v.width != null ? ` · algorithm ${umText(v.width)}` : ' · drawn by you'); est.id = 'w-estimate'; if (v.width != null) est.dataset.um = v.width.toFixed(3);
  facts.append(measured, est, said);
  if (w.measured != null && v.width != null && Math.abs(w.measured - v.width) / w.measured > .15) facts.append(el('strong', null, ' · more than 15% apart'));
  const width = el('p', 'w-now', now != null ? `Width ${umText(now)}` : 'Width ?'); width.id = 'w-um';
  const how = st.adjust ? 'nudge' : w.measured != null ? 'measured' : 'nudge';
  const agree = button(st.adjust ? 'Use this width' : 'Agree', () => now != null && answered({ type: 'set-width', segments: ids(m, v), width: { um: +now.toFixed(3), how } }), 'yes');
  agree.disabled = now == null;
  const not = button('Not a vessel', () => answered(v.proposed ? { type: 'decide', segments: ids(m, v), verdict: 'rejected' } : { type: 'delete-segment', segments: ids(m, v) }), 'no');
  const unclear = button("Can't tell", () => answered({ type: 'set-width', segments: ids(m, v), width: { how: 'unclear' } }), 'unclear');
  const narrower = button('−', () => { st.adjust -= STEP_UM; show(false); }), wider = button('+', () => { st.adjust += STEP_UM; show(false); });
  const reset = button('Reset', () => { st.adjust = 0; show(false); });
  narrower.id = 'w-narrower'; wider.id = 'w-wider'; reset.id = 'w-reset'; reset.disabled = !st.adjust; narrower.disabled = now == null || now <= STEP_UM; wider.disabled = now == null;
  narrower.title = '0.25 µm narrower'; wider.title = '0.25 µm wider'; reset.title = 'The width at half height again';
  const steps = el('div', 'verdict steps'); steps.append(narrower, wider, reset);
  card.append(facts, width, verdicts(agree, not, unclear), steps);
  return card;
}
// the brightness across the vessel, µm ticks, half its height, and the edges of the width now
function profile(w, now, px) {
  const NS = 'http://www.w3.org/2000/svg', W = px, H = 110, s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('class', 'profile'); s.style.width = W + 'px'; s.style.height = H + 'px';
  const o = w.offsets, lo = w.floor, hi = Math.max(w.top, lo + 1);
  const x = (u) => 6 + (u - o[0]) / (o.at(-1) - o[0]) * (W - 12), y = (val) => H - 18 - Math.min(Math.max((val - lo) / (hi - lo), -.05), 1.05) * (H - 28);
  const add = (tag, at, text) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (text != null) e.textContent = text; s.append(e); return e; };
  for (let u = Math.ceil(o[0]); u <= o.at(-1); u++) { add('line', { x1: x(u), x2: x(u), y1: H - 18, y2: H - 13, class: 'tick' }); if (u % 2 === 0) add('text', { x: x(u), y: H - 3, 'text-anchor': 'middle' }, u); }
  add('line', { x1: 6, x2: W - 6, y1: y(w.half), y2: y(w.half), class: 'half' });
  add('text', { x: 8, y: y(w.half) - 3 }, 'half height');
  add('polyline', { points: w.profile.map((v, k) => `${x(o[k])},${y(v)}`).join(' '), class: 'curve' });
  if (now != null) {
    const mid = w.edges ? (w.edges[0] + w.edges[1]) / 2 : 0;
    for (const e of [mid - now / 2, mid + now / 2]) add('line', { x1: x(e), x2: x(e), y1: 4, y2: H - 18, class: 'edge' });
  }
  return s;
}

// how far an area has got: its items answered in every step, its look for what was missed, and itself once done
function progress(m, a) {
  const d = done(m, a);
  let did = 0, of = 2;
  for (const k of ['doubts', 'junctions', 'vessels']) { const l = stepItems(m, a, k); of += l.length; did += l.filter((x) => x.answered).length; }
  did += (covered(m, a, 'missed') ? 1 : 0) + (d ? 1 : 0);
  return { did: d ? of : did, of, done: d };
}
// the stack flattened through every slice, each pixel its brightest and coloured at that depth as the image box paints
// it, at w × h: kept per stack, since a pass through every slice is too slow to make on every change
const flats = new WeakMap();
function flatten(vol, w, h) {
  const key = `${w}x${h}`, kept = flats.get(vol);
  if (kept?.key === key) return kept;
  const [Z, Y, X] = V.meta.shape, n = X * Y, top = new Float64Array(w * h).fill(-1), depth = new Uint16Array(w * h);
  const span = (c, len, of) => [Math.floor((c * of) / len), Math.max(Math.floor(((c + 1) * of) / len), Math.floor((c * of) / len) + 1)];
  for (let cy = 0; cy < h; cy++) {
    const [y0, y1] = span(cy, h, Y);
    for (let cx = 0; cx < w; cx++) {
      const [x0, x1] = span(cx, w, X), o = cy * w + cx;
      let mv = -1, mz = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) for (let z = 0; z < Z; z++) { const v = vol[z * n + y * X + x]; if (v > mv) { mv = v; mz = z; } }
      top[o] = mv; depth[o] = mz;
    }
  }
  const f = { key, top, depth, lut: null, img: null };
  flats.set(vol, f);
  return f;
}
// the colours the image box paints, told apart by a few of them: the flattened stack is coloured again only when they move
const lutKey = () => [0, 64, 128, 255, 4095].flatMap((v) => [0, .5, 1].map((z) => V.lut2d(v, z).join())).join(';');
function underMap(body) {
  const cv = $('gt-mini-image'), vol = V.meta && V.volume();
  if (!vol) { cv.width = cv.height = 1; return; }
  const [Z, Y, X] = V.meta.shape, px = Math.round(body.clientWidth * (window.devicePixelRatio || 1)) || X;
  const w = Math.max(1, Math.min(X, px)), h = Math.max(1, Math.round((w * Y) / X)), f = flatten(vol, w, h), lut = lutKey();
  if (f.lut === lut && cv.width === w && cv.height === h) return;
  const c = (cv.width = w, cv.height = h, cv.getContext('2d')), img = c.createImageData(w, h), d = img.data;
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = V.lut2d(f.top[i], f.depth[i] / Math.max(Z - 1, 1));
    d[4 * i] = r; d[4 * i + 1] = g; d[4 * i + 2] = b; d[4 * i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  f.lut = lut;
}
// the areas as a map floating over the view while tagging, as the field is laid out, over the stack flattened: each
// done, partly judged or not started, the current one marked; a click opens it
function map(m, on) {
  const el = $('gt-mini'); el.hidden = !on;
  if (!on) return;
  const body = $('gt-mini-areas'), [W, H] = size(m);
  body.style.aspectRatio = `${W} / ${H}`;
  T.areas.map(body, { now: st.submit ? null : st.area, pick: go, state(a) {
    const p = progress(m, a);
    return { mark: p.done ? 'done' : p.did ? 'part' : '', title: `Area ${a + 1}: ${p.done ? 'done' : p.did ? `${p.did} of ${p.of} answers given` : 'not started'}` };
  } });
  underMap(body);
}
// the current junction's options, under the cogwheel
function options(j) {
  const out = [];
  const item = (label, fn) => { const b = button(label, () => { $('task-menu').open = false; fn(); }); b.className = 'item'; out.push(b); };
  if (j) {
    item('Look at it from the side', () => MV.lookAt(j.id));
    if (j.done) item('Take back the verdict', () => MV.act({ type: 'check-junction', node: j.id, on: false }));
  }
  $('task-opts').replaceChildren(...out);
  $('task-menu').hidden = !out.length;
}
const rows = () => Array.from({ length: count() }, (_, a) => ({ key: keyOf(a), name: `Area ${a + 1}`, title: 'Every line, point and junction in the area right' }));

// tagging started: the walk's first area not done, from the one it was on; stopped: the whole stack as viewed
function tagged(on) {
  const m = MV.current();
  MV.tagging(on);
  if (!m) return;
  if (on) {
    const to = nextOpen(m, st.area ?? 0);
    st.area = to ?? st.area; st.submit = to == null; st.step = null; st.key = null; st.focused = to != null;
  }
  show(true);
}
// moved: the main view turns to what the task now shows
function show(moved) {
  const m = MV.current(), on = T.tagging();
  $('vm-tasks').hidden = !m; $('vm-focus').hidden = !m || !on;
  // rows made anew for another grid take what was on the open one with them
  $('vm-tasks').append(tools, work);
  T.list(m ? rows() : null);
  if (!m) { missedView(false); keys?.report({ tagging: on, area: false }); MV.mark(null, null); MV.focusArea(null); map(null, false); return; }
  items = itemsOf(m);
  for (let a = 0; a < count(); a++) { const p = progress(m, a); T.count(keyOf(a), p.did, p.of, p.done, ''); }
  const open = on && !st.submit && st.area != null;
  const li = T.open(open ? keyOf(st.area) : 'submit');
  if (open) { li.querySelector('.task-head').append(tools); li.querySelector('.task-body').append(work); }
  tools.hidden = work.hidden = !open;
  map(m, on);
  const step = open ? stepNow(m, st.area) : null, item = open ? current(m) : null;
  if (item) st.key = item.key;
  missedView(open && step === 'missed' && !stepDone(m, st.area, 'missed'));
  // the step's head: which step, how far it has come
  if (open) {
    const list = stepItems(m, st.area, step), k = STEPS.indexOf(step) + 1;
    const said = step === 'missed' ? (stepDone(m, st.area, 'missed') ? 'done' : `${st.seen?.size ?? 0} of ${sliceCount()} slices seen`)
      : list.length ? `${list.filter((x) => x.answered).length} of ${list.length} answered` : 'none here';
    $('step-head').textContent = `Step ${k} of 4 · ${STEP_NAMES[step]} · ${said}`;
    $('step-head').hidden = false;
    $('task-back').disabled = !st.history.length;
  } else $('step-head').hidden = true;
  // the step's own button: shown in the Missed step and once every vessel is answered
  const allDone = open && STEPS.every((k) => stepDone(m, st.area, k));
  const own = open && ((step === 'missed' && !stepDone(m, st.area, 'missed')) || (step === 'vessels' && !item));
  $('area-ok').hidden = !own;
  if (own && step === 'missed') {
    label($('area-ok'), 'Nothing else missing'); $('area-ok').disabled = !missedReady();
    $('area-ok').title = missedReady() ? 'Every slice seen and nothing else missing here: on to the vessels' : `Step through every slice first (, and .): ${st.seen?.size ?? 0} of ${sliceCount()} seen`;
  } else if (own) {
    label($('area-ok'), 'Area done'); $('area-ok').disabled = !allDone;
    $('area-ok').title = allDone ? 'Every step here answered: on to the next area' : 'A step before this one is not done yet';
  }
  work.querySelector('.hint').textContent = open ? { doubts: 'Is each faint line a vessel?', junctions: 'Do the vessels meet here, or only pass each other at different depths?',
    missed: 'What did the algorithm miss here?', vessels: item ? 'How wide is this vessel?' : 'Every vessel here has an answer.' }[step] : HINT;
  $('junctions-note').textContent = ''; $('widths-note').textContent = '';
  options(step === 'junctions' ? item : null);
  const was = $('task-card').firstElementChild;
  const card_ = !open ? null : step === 'missed' ? (stepDone(m, st.area, 'missed') ? null : missedCard()) : !item ? null
    : step === 'doubts' ? doubtCard(m, item) : step === 'junctions' ? junctionCard(m, item) : widthCard(m, item);
  $('task-card').replaceChildren(...(card_ ? [card_] : []));
  if (was && card_ && was.dataset.key !== card_.dataset.key && st.dir) slideIn(was, card_, st.dir);
  st.dir = 0;
  const box = open ? areaBox(m, st.area) : null;
  if (!on) { MV.mark(null, null); if (MV.focusedArea()) MV.focusArea(null); keys?.report({ tagging: on, area: open }); heard(); return; }
  MV.mark(item ? (step === 'junctions' ? { node: item.id } : { segments: item.segments }) : null, box);
  // the area alone in the main view, or the whole stack once it is left
  const focus = st.focused && box, f = MV.focusedArea();
  if (focus && (moved || !f || JSON.stringify(f.box) !== JSON.stringify(box))) MV.focusArea(box);
  else if (!focus && f) MV.focusArea(null);
  MV.widthsStep(false);
  $('vm-focus').textContent = focus ? 'Back to image' : 'Back to task';
  $('vm-focus').title = focus ? 'The whole stack, as the Show menu sets it' : 'The task again: its area alone';
  $('vm-focus').disabled = !box;
  keys?.report({ tagging: on, area: open });
  heard();
}
// the next junction's card slides in over the last one's, which slides out the other way
function slideIn(was, next, dir) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $('task-stage').querySelectorAll('.leaving').forEach((e) => e.remove());
  const out = document.createElement('div'); out.className = 'leaving'; out.setAttribute('aria-hidden', 'true'); out.inert = true;
  out.append(was); $('task-stage').append(out);
  const t = { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' };
  out.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 60}%)`, opacity: 0 }], t).finished.then(() => out.remove(), () => out.remove());
  next.animate([{ transform: `translateX(${dir * 60}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], t);
}

// What is still open, for Submit Ground Truth's checklist and the status bar's step; null with no model.
export function open() {
  const m = MV.current(); if (!m || !items) return null;
  const left = count() - areasDone(m);
  return [{ level: 'warn', grade: true, ok: !left, text: left ? `Areas: ${left} of ${count()} left` : 'Areas: every one done' }];
}

// view: the shell's 3D view; tasks: the shell's list of them; changed() hears every redraw of the tasks; submit() sends them;
// actions: the shell's keys, which press the tasks' buttons while an area is open (the study's declared actions)
export function init(view, tasks, changed, submit, actions) {
  V = view; keys = actions; T = tasks; n = T.areas.count(); tools = $('task-tools'); work = $('task-now');
  T.list([], { pick, submit, tagging: tagged });
  T.list(null); st = fresh(); items = null; heard = changed || (() => {});
  T.areas.on(setGrid);
  // annotating from scratch starts before there is a model: the walk opens at its first area once the first one arrives
  let had = false;
  MV.onChange((m) => {
    if (!m) { st = fresh(); items = null; }
    const first = !!m && !had;
    had = !!m;
    if (first && T.tagging()) return tagged(true);
    show(false);
  });
  // a junction of the area clicked on the view, in the Junctions step, becomes the one to judge
  MV.onPick((h) => {
    const m = MV.current();
    if (!items || !MV.focusedArea() || st.area == null || h.node == null || stepNow(m, st.area) !== 'junctions') return false;
    const j = junctionsIn(m, st.area).find((x) => x.id === h.node);
    if (!j) return false;
    st.key = j.key; show(false);
    return true;
  });
  HINT = work.querySelector('.hint').textContent;
  $('task-skip').onclick = skip;
  $('task-back').onclick = back;
  $('area-ok').onclick = stepButton;
  $('vm-focus').onclick = () => { if (st.area == null) return; st.focused = !st.focused; show(true); };
}
// for the study's page tests, which drive it from outside
export const inspect = () => {
  const m = MV.current(), open = !!m && !!items && st.area != null && !st.submit;
  const step = open ? stepNow(m, st.area) : null;
  return { area: st.submit ? null : st.area, grid: n, focused: !!MV.focusedArea(), box: st.area != null && m ? areaBox(m, st.area) : null,
    step, key: open ? current(m)?.key ?? null : null, items: open ? stepItems(m, st.area, step).length : 0,
    seen: st.seen?.size ?? null, slices: m ? sliceCount() : null,
    junctions: open ? junctionsIn(m, st.area).map((j) => ({ key: j.key, done: j.done })) : [] };
};
