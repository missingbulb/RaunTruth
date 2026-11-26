// The Ground Truth Tasks, in the left bar while the study makes ground truth: the stack's areas, a row each, then
// Submit. An area is open only while the owner annotates (req/shell/annotate/choice); then the main view shows
// it alone (model_view.js), its lines, points and junctions corrected there in one pass, each of its junctions judged
// in the box; Area is right then opens its widths step, and These widths look right does it. Back to image shows the whole stack and Back to task the area again; the
// areas float as a map over the view meanwhile. Every verdict is an edit of the model, so it is undone, saved and
// submitted with the rest.
import * as Mo from './model.js';
import * as MV from './model_view.js';
import { build, junctionPicture } from './items.js';
import { umText } from './widths.js';

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
// widths: the open area is in its widths step
const fresh = () => ({ area: null, submit: false, junction: null, focused: true, dir: 0, widths: false });

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
function itemsOf(m) {
  const { vessels, junctions } = build(m);
  const js = junctions.map((j) => ({ ...j, key: `j${j.id}`, at: { x: j.x, y: j.y, z: j.z }, done: Mo.checkedJunction(m, j.id) }))
    .sort((p, q) => p.y - q.y || p.x - q.x);
  return { vessels: vessels.map((v) => ({ ...v, at: v.path[v.path.length >> 1], said: Mo.widthOf(m, v.segments) })), junctions: js };
}
const junctionsIn = (m, a) => items.junctions.filter((j) => areaOf(m, j) === a);
const vesselsIn = (m, a) => items.vessels.filter((v) => areaOf(m, v.at) === a && Mo.live(v));
// the vessels the person drew in an area that still have no width set by hand, nor said in a file from before to be one
// that cannot be told (req/vascular/truth/widths)
const drawnWithout = (m, a) => vesselsIn(m, a).filter((v) => !v.proposed && !Mo.measured(v.said) && v.said?.how !== 'cannot');

// ---------- moving through the areas ----------
// to: an area, or null for Submit
function go(to, dir = 1) {
  if (!MV.current()) return;
  st.area = to ?? st.area; st.submit = to == null;
  st.junction = null; st.focused = to != null; st.dir = dir; st.widths = false;
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

// ---------- the verdicts ----------
// Area is right: the area's widths step, or with no vessel there the area done
function areaRight() {
  const m = MV.current(); if (!m || st.area == null) return;
  if (st.widths) return widthsRight();
  if (junctionsIn(m, st.area).some((j) => !j.done)) return;
  if (!vesselsIn(m, st.area).length) return widthsRight();
  st.widths = true; st.junction = null; show(false);
}
// These widths look right: the area done, each vessel whose middle lies in it, confident ones accepted, low-confidence
// ones not kept declined, and each one's width the person said nothing of looked at (never measured), all one GT action
// (gt_actions.js); it waits while a vessel the person drew there has no width
function widthsRight() {
  const m = MV.current(); if (!m || st.area == null || drawnWithout(m, st.area).length) return;
  if (MV.act({ type: 'widths-right', area: st.area, box: areaBox(m, st.area), slices: [0, m.slices - 1] })) moveOn();
}
function verdict(j, v) {
  MV.act(v === 'cross' ? { type: 'split-junction', node: j.id, zScale: V.S.zs } : { type: 'check-junction', node: j.id, on: true });
  st.junction = null; st.dir = 1; show(false);
}

// ---------- drawing the box and the map ----------
// the junctions step's hint, as the page writes it
let HINT = '';
// a button's words, its key kept beside them
const label = (b, text) => { if (b.firstChild?.nodeType === 3) { if (b.firstChild.textContent.trim() !== text) b.firstChild.textContent = text; } else b.prepend(text); };
const button = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.onclick = fn; return b; };
function card(m, j) {
  const el = document.createElement('div'), cv = document.createElement('canvas'), acts = document.createElement('div');
  el.className = 'task-card'; el.dataset.key = j.key; acts.className = 'verdict';
  const px = Math.max(MIN_PX, Math.round($('gt-tasks').clientWidth || 280));
  cv.style.width = cv.style.height = px + 'px';
  acts.append(button('Junction', () => verdict(j, 'right'), 'yes'), button('They cross', () => verdict(j, 'cross'), 'no'));
  acts.firstChild.title = 'Three or more vessels really meet here'; acts.lastChild.title = 'The vessels only pass each other at different depths: split them';
  requestAnimationFrame(() => junctionPicture(cv, m, j, px));
  el.append(cv, acts);
  return el;
}
// the widths step's selected vessel: its width, a step narrower or wider, and the estimate again; or a word to select one
function widthCard() {
  const el = document.createElement('div'), v = MV.selectedWidth();
  el.id = 'w-card'; el.className = 'task-card';
  if (!v) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Click a vessel to select it.'; el.append(p); return el; }
  el.dataset.key = `v${v.n}`;
  const head = document.createElement('p'), um = document.createElement('strong'), how = document.createElement('span'), acts = document.createElement('div');
  head.className = 'w-head'; head.append(`Vessel ${v.n} `, um, ' ', how);
  um.id = 'w-um'; um.textContent = v.um != null ? umText(v.um) : '?';
  how.className = 'note'; how.textContent = { set: 'set by you', estimate: "the algorithm's estimate", cannot: 'could not be told', none: 'no width yet' }[v.kind];
  acts.className = 'verdict';
  const narrower = button('−', () => MV.stepWidth(-1)), wider = button('+', () => MV.stepWidth(1)), reset = button('Reset', () => MV.resetWidth());
  narrower.id = 'w-narrower'; wider.id = 'w-wider'; reset.id = 'w-reset';
  narrower.title = '0.25 µm narrower'; wider.title = '0.25 µm wider'; reset.title = "The algorithm's estimate again";
  reset.disabled = !['set', 'cannot'].includes(v.kind);
  acts.append(narrower, wider, reset);
  el.append(head, acts);
  return el;
}
// how far an area has got: its junctions judged, and itself once done
function progress(m, a) {
  const js = junctionsIn(m, a), d = done(m, a);
  return { did: js.filter((j) => j.done).length + (d ? 1 : 0), of: js.length + 1, done: d };
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
    return { mark: p.done ? 'done' : p.did ? 'part' : '', title: `Area ${a + 1}: ${p.done ? 'done' : p.did ? `${p.did} of ${p.of - 1} junctions judged` : 'not started'}` };
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
    st.area = to ?? st.area; st.submit = to == null; st.junction = null; st.focused = to != null;
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
  if (!m) { keys?.report({ tagging: on, area: false }); MV.mark(null, null); MV.focusArea(null); map(null, false); return; }
  items = itemsOf(m);
  for (let a = 0; a < count(); a++) { const p = progress(m, a); T.count(keyOf(a), p.did, p.of, p.done, ''); }
  const open = on && !st.submit && st.area != null;
  const li = T.open(open ? keyOf(st.area) : 'submit');
  if (open) { li.querySelector('.task-head').append(tools); li.querySelector('.task-body').append(work); }
  tools.hidden = work.hidden = !open;
  map(m, on);
  // the area's junction to judge, the current one or its first without a verdict
  const js = open ? junctionsIn(m, st.area) : [];
  let j = js.find((x) => x.id === st.junction) || js.find((x) => !x.done) || null;
  st.junction = j?.id ?? null;
  const widths = open && st.widths;
  if (!widths) work.querySelector('.hint').textContent = HINT;
  if (open && !widths) {
    const left = js.filter((x) => !x.done).length;
    $('junctions-note').textContent = !js.length ? 'No junctions in this area.' : left ? `${js.length - left + 1} of ${js.length} junctions here` : `All ${js.length} junctions here judged.`;
    $('widths-note').textContent = '';
    label($('area-ok'), 'Area is right');
    $('area-ok').disabled = left > 0;
    $('area-ok').title = left ? `${left} junction${left === 1 ? '' : 's'} here still to judge` : "Every line, point and junction here is right: on to the area's widths";
  } else if (widths) {
    j = null;
    work.querySelector('.hint').textContent = 'Click a vessel to select it, then make it narrower or wider. Hold 4 to see the area in colour in 3D.';
    $('junctions-note').textContent = '';
    const bare = drawnWithout(m, st.area).length;
    $('widths-note').textContent = bare ? `${bare} vessel${bare === 1 ? '' : 's'} you drew here still need${bare === 1 ? 's' : ''} a width.` : '';
    label($('area-ok'), 'These widths look right');
    $('area-ok').disabled = bare > 0;
    $('area-ok').title = bare ? `${bare} vessel${bare === 1 ? '' : 's'} you drew here without a width`
      : 'Every width here is right: on to the next area; a width you did not set is kept as looked at, not measured';
  } else j = null;
  options(j);
  const was = $('task-card').firstElementChild, card_ = j ? card(m, j) : widths ? widthCard() : null;
  $('task-card').replaceChildren(...(card_ ? [card_] : []));
  if (was && card_ && was.dataset.key !== card_.dataset.key && st.dir) slideIn(was, card_, st.dir);
  st.dir = 0;
  const box = open ? areaBox(m, st.area) : null;
  if (!on) { MV.mark(null, null); if (MV.focusedArea()) MV.focusArea(null); keys?.report({ tagging: on, area: open }); heard(); return; }
  MV.mark(j ? { node: j.id } : null, box);
  // the area alone in the main view, or the whole stack once it is left
  const focus = st.focused && box, f = MV.focusedArea();
  if (focus && (moved || !f || JSON.stringify(f.box) !== JSON.stringify(box))) MV.focusArea(box);
  else if (!focus && f) MV.focusArea(null);
  MV.widthsStep(focus && widths);
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
  // a junction of the area clicked on the view becomes the one to judge
  MV.onPick((h) => {
    const m = MV.current();
    if (!items || !MV.focusedArea() || st.area == null || h.node == null) return false;
    const j = junctionsIn(m, st.area).find((x) => x.id === h.node);
    if (!j) return false;
    st.junction = j.id; show(false);
    return true;
  });
  HINT = work.querySelector('.hint').textContent;
  MV.onWidthPick(() => show(false));
  $('task-skip').onclick = skip;
  $('area-ok').onclick = areaRight;
  $('vm-focus').onclick = () => { if (st.area == null) return; st.focused = !st.focused; show(true); };
}
// for the study's page tests, which drive it from outside
export const inspect = () => {
  const m = MV.current();
  return { area: st.submit ? null : st.area, grid: n, widths: st.widths, focused: !!MV.focusedArea(), box: st.area != null && m ? areaBox(m, st.area) : null,
    key: st.junction != null ? `j${st.junction}` : null, junctions: m && items && st.area != null ? junctionsIn(m, st.area).map((j) => ({ key: j.key, done: j.done })) : [] };
};
