// An area's widths step of the ground-truth tasks (req/vascular/truth/widths): the area in the stack's own pixels,
// every slice flattened, grey, from straight above, each vessel's one width drawn as two rims and written in µm. A click
// selects a vessel, and the person's word on it is a step narrower or wider or the estimate put back. Resting the
// pointer on a vessel opens a lens on it at its own depth, with the brightness across it. While away the area shows in
// 3D, as the model's view draws it, the selection kept.
import * as Mo from './model.js';

// magenta: the algorithm's estimate, a colour the grey picture never carries; amber: set by the person; grey dotted:
// it cannot be told, as a file from before may say
const ESTIMATE = '#ff4fd8', SET = '#ffb020', CANNOT = '#a8a8a8', CROSS = '#4fd1d9';
const RIM_PX = 2;
// the rims stop this short of each end, where a vessel meets a junction or fades into a tip
const END_UM = 2;
// a step, and how near the pointer must be to a vessel's line, beyond its rims, to pick it
const STEP_UM = .25, PICK_PX = 8;
// how long the pointer rests before the lens opens; the lens: screen pixels per pixel of the stack, pixels each way,
// slices either side of the vessel's own, how far from the pointer, and its profile's height
const REST_MS = 300, LENS_K = 8, LENS_HALF = 17, LENS_SLICES = 1, LENS_GAP = 35, PROFILE_PX = 72;
// how many samples along each segment of a vessel's curve
const SAMPLES = 8;
// the grey picture runs from this share of the area's pixels to this one
const LO_Q = .01, HI_Q = .997;

const today = () => new Date().toISOString().slice(0, 10);
// a width as the step and the box write it: to the hundredth, a whole tenth with one place
export const umText = (um) => `${um.toFixed(2).replace(/0$/, '')} µm`;

// ctx: {V, model(), apply(next), canvas, plane(x, y): [sx, sy] screen at the stack's middle depth, msg(text), chose(): a
// vessel selected}
export function widthsLook(ctx) {
  const { V } = ctx;
  // chosen: the selected vessel's number; away: the area shown in 3D for now
  let box = null, bare = false, away = false, hover = null, chosen = null, lens = null, timer = null, picture = null, vessels = null;

  // ---------- the area's vessels, each with its one width ----------
  function list() {
    const m = ctx.model();
    if (vessels?.m === m && vessels.box === box) return vessels.list;
    const out = [];
    Mo.edges(m).forEach((e, k) => {
      if (!Mo.live(e)) return;
      const path = e.segments.flatMap((i, j) => { const p = Mo.sampleSegment(m, i, SAMPLES); return (m.segments[i].a === e.ids[j] ? p : p.reverse()).slice(j ? 1 : 0); });
      if (!path.some((p) => p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1)) return;
      const rs = path.filter((p) => Number.isFinite(p.r)).map((p) => 2 * p.r);
      out.push({ n: k + 1, segs: e.segments, path, estimate: rs.length ? rs.reduce((a, b) => a + b) / rs.length : null, width: e.width ?? null, drawn: !e.proposed });
    });
    vessels = { m, box, list: out };
    return out;
  }
  // what is drawn of a vessel: its kind, the number beside it, and its rims as offsets from its line in µm
  function shape(v) {
    const w = v.width;
    if (Mo.measured(w)) return { kind: 'set', um: w.um, rims: w.walls ? wallOffsets(v, w.walls) : [-w.um / 2, w.um / 2] };
    if (w?.how === 'cannot') return { kind: 'cannot', um: null, rims: v.estimate != null ? [-v.estimate / 2, v.estimate / 2] : null };
    if (v.estimate != null) return { kind: 'estimate', um: v.estimate, rims: [-v.estimate / 2, v.estimate / 2] };
    return { kind: 'none', um: null, rims: null };
  }
  // the line's direction and its normal at point k of a vessel, in µm
  function frame(path, k) {
    const a = path[Math.max(k - 1, 0)], b = path[Math.min(k + 1, path.length - 1)], L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { t: [(b.x - a.x) / L, (b.y - a.y) / L], n: [-(b.y - a.y) / L, (b.x - a.x) / L] };
  }
  const nearestOnPath = (path, x, y) => { let best = 0, bd = Infinity; path.forEach((p, k) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k; } }); return best; };
  function wallOffsets(v, walls) {
    const mx = (walls[0][0] + walls[1][0]) / 2, my = (walls[0][1] + walls[1][1]) / 2, k = nearestOnPath(v.path, mx, my), c = v.path[k], { n } = frame(v.path, k);
    return walls.map(([x, y]) => (x - c.x) * n[0] + (y - c.y) * n[1]).sort((a, b) => a - b);
  }

  // ---------- µm and the screen, from straight above ----------
  function rect() { const [X0, Y0] = ctx.plane(box.x0, box.y0), [X1, Y1] = ctx.plane(box.x1, box.y1); return [X0, Y0, X1, Y1]; }
  const toScreen = (r, x, y) => [r[0] + (x - box.x0) / (box.x1 - box.x0) * (r[2] - r[0]), r[1] + (y - box.y0) / (box.y1 - box.y0) * (r[3] - r[1])];
  const pxPerUm = (r) => (r[2] - r[0]) / (box.x1 - box.x0);
  const at = (e) => { const b = ctx.canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };

  // the stack's own pixels per µm, each way
  function scale(P) { const m = ctx.model(); return [P.X / (m.size_px[0] * m.um_per_px), P.Y / (m.size_px[1] * m.um_per_px)]; }
  // the area flattened through every slice at the stack's own pixels, grey, kept until the area or the stack changes
  function flattened() {
    const P = V.pixels();
    if (!P) return null;
    if (picture?.data === P.data && picture.box === box) return picture;
    const [sx, sy] = scale(P), x0 = Math.max(0, Math.floor(box.x0 * sx)), y0 = Math.max(0, Math.floor(box.y0 * sy));
    const x1 = Math.min(P.X, Math.ceil(box.x1 * sx)), y1 = Math.min(P.Y, Math.ceil(box.y1 * sy)), w = x1 - x0, h = y1 - y0, n = P.X * P.Y;
    const top = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let mv = 0; const o = (y0 + y) * P.X + x0 + x;
      for (let z = 0; z < P.Z; z++) { const v = P.data[z * n + o]; if (v > mv) mv = v; }
      top[y * w + x] = mv;
    }
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    grey(cv, top);
    picture = { data: P.data, box, cv, um: [x0 / sx, y0 / sy, x1 / sx, y1 / sy] };
    return picture;
  }
  // values onto a canvas in grey, stretched from their low to their high quantile
  function grey(cv, vals) {
    const hist = new Uint32Array(256); for (const v of vals) hist[v]++;
    const q = (f) => { let s = 0; for (let i = 0; i < 256; i++) { s += hist[i]; if (s >= f * vals.length) return i; } return 255; };
    const lo = q(LO_Q), hi = Math.max(q(HI_Q), lo + 1), c = cv.getContext('2d'), img = c.createImageData(cv.width, cv.height), d = img.data;
    for (let i = 0; i < vals.length; i++) { const g = Math.round(Math.min(Math.max((vals[i] - lo) / (hi - lo), 0), 1) * 255); d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = g; d[4 * i + 3] = 255; }
    c.putImageData(img, 0, 0);
  }

  // ---------- drawing ----------
  // a vessel's rims on screen: each a line its offset out from the vessel's, stopping short of its ends
  function rims(v, s, r) {
    if (!s.rims) return null;
    const len = [0]; for (let k = 1; k < v.path.length; k++) len.push(len[k - 1] + Math.hypot(v.path[k].x - v.path[k - 1].x, v.path[k].y - v.path[k - 1].y));
    const L = len.at(-1), keep = v.path.map((_, k) => k).filter((k) => len[k] >= END_UM && len[k] <= L - END_UM);
    if (keep.length < 2) return null;
    return s.rims.map((off) => keep.map((k) => { const p = v.path[k], { n } = frame(v.path, k); return toScreen(r, p.x + n[0] * off, p.y + n[1] * off); }));
  }
  function label(v, s, r) {
    const k = v.path.length >> 1, p = v.path[k], { n } = frame(v.path, k), out = Math.max(...(s.rims || [0]).map(Math.abs)) * pxPerUm(r) + 13;
    const [x, y] = toScreen(r, p.x, p.y), dir = n[1] <= 0 ? 1 : -1;
    return { text: s.um != null ? umText(s.um) : '?', at: [x + n[0] * out * dir, y + n[1] * out * dir] };
  }
  function draw(c) {
    const W = ctx.canvas.clientWidth, H = ctx.canvas.clientHeight, r = rect();
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const pic = flattened();
    if (pic) {
      c.imageSmoothingEnabled = false;
      const [a, b] = toScreen(r, pic.um[0], pic.um[1]), [d, e] = toScreen(r, pic.um[2], pic.um[3]);
      c.drawImage(pic.cv, a, b, d - a, e - b);
    }
    if (bare) { drawLens(c, r); return; }
    c.lineCap = 'butt'; c.lineJoin = 'round';
    for (const v of list()) {
      const s = shape(v), lines = rims(v, s, r), colour = { set: SET, cannot: CANNOT, estimate: ESTIMATE, none: ESTIMATE }[s.kind];
      if (lines) {
        c.strokeStyle = colour; c.lineWidth = RIM_PX; c.setLineDash(s.kind === 'cannot' ? [2, 3] : []);
        for (const l of lines) { c.beginPath(); l.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
        c.setLineDash([]);
      }
      if (s.kind === 'none') {
        // a vessel the person drew with no width: its line alone
        c.strokeStyle = ESTIMATE; c.lineWidth = 1; c.beginPath(); v.path.forEach((p, k) => { const [x, y] = toScreen(r, p.x, p.y); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      }
      // where the person measured it
      if (s.kind === 'set' && v.width.walls) {
        const [p, q] = v.width.walls.map(([x, y]) => toScreen(r, x, y));
        c.strokeStyle = SET; c.lineWidth = 1.5; c.beginPath(); c.moveTo(...p); c.lineTo(...q); c.stroke();
      }
      const t = label(v, s, r);
      c.font = '11px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tw = c.measureText(t.text).width + 8;
      c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(t.at[0] - tw / 2, t.at[1] - 8, tw, 16);
      if (s.kind === 'set') { c.strokeStyle = SET; c.lineWidth = 1; c.strokeRect(t.at[0] - tw / 2 + .5, t.at[1] - 7.5, tw - 1, 15); }
      c.fillStyle = colour; c.fillText(t.text, t.at[0], t.at[1] + 1);
      if (chosen === v.n || hover?.v.n === v.n) {
        c.globalAlpha = chosen === v.n ? .9 : .5; c.strokeStyle = '#fff'; c.lineWidth = chosen === v.n ? 2 : 1;
        c.beginPath(); v.path.forEach((p, k) => { const [x, y] = toScreen(r, p.x, p.y); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.globalAlpha = 1;
      }
    }
    c.textAlign = 'start'; c.textBaseline = 'alphabetic';
    drawLens(c, r);
  }

  // ---------- the lens ----------
  // the stack's own pixels around point p of a vessel: the mean of its slice and the ones either side
  function lensOf(v, k) {
    const P = V.pixels(); if (!P) return null;
    const p = v.path[k], [sx, sy] = scale(P), cxp = Math.floor(p.x * sx), cyp = Math.floor(p.y * sy), zc = Math.min(Math.max(Math.round(p.z), 0), P.Z - 1);
    const z0 = Math.max(0, zc - LENS_SLICES), z1 = Math.min(P.Z - 1, zc + LENS_SLICES), side = 2 * LENS_HALF + 1, n = P.X * P.Y, vals = new Float32Array(side * side);
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const X = cxp - LENS_HALF + x, Y = cyp - LENS_HALF + y;
      if (X < 0 || Y < 0 || X >= P.X || Y >= P.Y) continue;
      let s = 0; for (let z = z0; z <= z1; z++) s += P.data[z * n + Y * P.X + X];
      vals[y * side + x] = s / (z1 - z0 + 1);
    }
    // the brightness across the vessel through p, a quarter of a pixel apart, read between pixels
    const { n: nr } = frame(v.path, k), fx = p.x * sx - (cxp - LENS_HALF) - .5, fy = p.y * sy - (cyp - LENS_HALF) - .5, profile = [];
    const read = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, w = y - j, g = (a, b) => (a < 0 || b < 0 || a >= side || b >= side ? 0 : vals[b * side + a]);
      return g(i, j) * (1 - u) * (1 - w) + g(i + 1, j) * u * (1 - w) + g(i, j + 1) * (1 - u) * w + g(i + 1, j + 1) * u * w; };
    for (let d = -LENS_HALF; d <= LENS_HALF; d += .25) profile.push(read(fx + nr[0] * d, fy + nr[1] * d));
    const lo = Math.min(...profile), hi = Math.max(...profile);
    const cv = document.createElement('canvas'); cv.width = cv.height = side;
    grey(cv, Uint8Array.from(vals, (x) => Math.round(x)));
    return { cv, z: [z0, z1], profile, half: (lo + hi) / 2, lo, hi, centre: [fx + .5, fy + .5], n: nr, umPerPx: 1 / sx };
  }
  function drawLens(c, r) {
    if (!lens) return;
    const v = list().find((x) => x.n === lens.v); if (!v) { lens = null; return; }
    const L = lens.data ??= lensOf(v, lens.k); if (!L) return;
    const side = (2 * LENS_HALF + 1) * LENS_K, W = ctx.canvas.clientWidth, H = ctx.canvas.clientHeight, [px, py] = lens.at;
    const x = px + LENS_GAP + side <= W ? px + LENS_GAP : Math.max(0, px - LENS_GAP - side), y = Math.min(Math.max(0, py - side / 2), Math.max(0, H - side - PROFILE_PX));
    c.imageSmoothingEnabled = false; c.drawImage(L.cv, x, y, side, side);
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, side - 1, side - 1);
    // the line across the vessel, dashed, and the walls drawn now as ticks on it
    const cx = x + L.centre[0] * LENS_K, cy = y + L.centre[1] * LENS_K, ext = LENS_HALF * LENS_K;
    c.setLineDash([5, 4]); c.strokeStyle = CROSS; c.beginPath(); c.moveTo(cx - L.n[0] * ext, cy - L.n[1] * ext); c.lineTo(cx + L.n[0] * ext, cy + L.n[1] * ext); c.stroke(); c.setLineDash([]);
    const s = shape(v);
    if (s.rims) {
      c.strokeStyle = s.kind === 'set' ? SET : s.kind === 'cannot' ? CANNOT : ESTIMATE; c.lineWidth = 2;
      for (const off of s.rims) {
        const d = off / L.umPerPx * LENS_K, tx = cx + L.n[0] * d, ty = cy + L.n[1] * d;
        c.beginPath(); c.moveTo(tx - L.n[1] * 8, ty + L.n[0] * 8); c.lineTo(tx + L.n[1] * 8, ty - L.n[0] * 8); c.stroke();
      }
    }
    // the brightness along that line under the lens, half its height dashed
    const top = y + side, span = Math.max(L.hi - L.lo, 1), yAt = (val) => top + PROFILE_PX - 6 - (val - L.lo) / span * (PROFILE_PX - 12);
    c.fillStyle = 'rgba(0,0,0,.85)'; c.fillRect(x, top, side, PROFILE_PX);
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath();
    L.profile.forEach((val, k) => { const X = x + k / (L.profile.length - 1) * side; k ? c.lineTo(X, yAt(val)) : c.moveTo(X, yAt(val)); }); c.stroke();
    c.setLineDash([4, 3]); c.strokeStyle = CROSS; c.lineWidth = 1; c.beginPath(); c.moveTo(x, yAt(L.half)); c.lineTo(x + side, yAt(L.half)); c.stroke(); c.setLineDash([]);
  }

  // ---------- the person's word ----------
  // the vessel under a place on screen, within its rims and a little beyond: {v, k}, k its nearest point
  function under(sx, sy) {
    const r = rect(), k = pxPerUm(r);
    let best = null, bd = Infinity;
    for (const v of list()) {
      const s = shape(v), reach = Math.max(...(s.rims || [0]).map(Math.abs)) * k + PICK_PX;
      v.path.forEach((p, j) => { const [x, y] = toScreen(r, p.x, p.y), d = Math.hypot(x - sx, y - sy); if (d < reach && d < bd) { bd = d; best = { v, k: j }; } });
    }
    return best;
  }
  const selected = () => list().find((v) => v.n === chosen) ?? null;
  function word(v, next, said) {
    if (!v || next === ctx.model()) return;
    ctx.apply(next); if (lens) lens.data = null;
    if (said) ctx.msg(said);
  }
  function move(e) {
    const [x, y] = at(e), h = under(x, y);
    hover = h;
    clearTimeout(timer);
    if (!h) { lens = null; return V.redraw(); }
    if (lens?.v === h.v.n) { lens = { v: h.v.n, k: h.k, at: [x, y] }; return V.redraw(); }
    lens = null;
    timer = setTimeout(() => { if (hover) { lens = { v: hover.v.n, k: hover.k, at: [x, y] }; V.redraw(); } }, REST_MS); // timed here: a study loads no shell module; the lens opens once the pointer has rested
    V.redraw();
  }
  // a press on a vessel selects it as it is let go, whatever the pointer did between; it sets nothing
  const still = { move() {}, up() {}, cancel() {} };
  function grab(e) {
    if (e.button !== 0) return still;
    const h = under(...at(e));
    if (!h) return still;
    return { move() {}, up() { if (chosen !== h.v.n) { chosen = h.v.n; ctx.chose(); } V.redraw(); }, cancel() {} };
  }
  // the image alone or the marks again; the selected vessel a step narrower (-1) or wider (1), from its width, else its
  // estimate, else, for a vessel the person drew, the median of the area's other widths; or its estimate again
  function setBare(on) { if (bare !== on) { bare = on; V.redraw(); } }
  function nudge(dir) {
    const v = selected(); if (!v) return;
    const others = list().filter((x) => x !== v).map((x) => shape(x).um).filter((u) => u > 0).sort((a, b) => a - b);
    const mid = others.length ? (others[(others.length - 1) >> 1] + others[others.length >> 1]) / 2 : null;
    word(v, Mo.nudge(ctx.model(), v.segs, dir * STEP_UM, v.estimate ?? mid, today()));
  }
  function reset() {
    const v = selected(), m = ctx.model();
    if (v && Mo.widthOf(m, v.segs)) word(v, Mo.setWidth(m, v.segs, null), `Vessel ${v.n}'s width is the estimate again.`);
  }

  return {
    // on: the flat view shows; open: the step is on the area, flat or away in 3D
    get on() { return !!box && !away; },
    get open() { return !!box; },
    // the step on the area box (µm), or off with null
    show(b) {
      box = b; bare = false; away = false; hover = null; chosen = null; lens = null; clearTimeout(timer);
      if (b) Object.assign(V.S, { rot: V.facing(0, 0), held: true }); else V.S.held = false;
      V.redraw();
    },
    // the area in 3D for now, or flat again, the selection kept; the caller frames the view
    away(on) { if (!box || away === on) return; away = on; hover = null; lens = null; clearTimeout(timer); V.redraw(); },
    // the selected vessel: its number, segments, width in µm and what that width is
    selected() { const v = box && selected(); if (!v) return null; const s = shape(v); return { n: v.n, segs: v.segs, um: s.um, kind: s.kind, drawn: v.drawn }; },
    draw, grab, move, bare: setBare, isBare: () => bare, nudge, reset,
    leave() { hover = null; clearTimeout(timer); if (lens) { lens = null; V.redraw(); } },
    inspect() {
      if (!box) return null;
      const r = rect();
      return { rect: r, box, image: !!flattened(), marks: !bare, flat: !away, selected: chosen,
        vessels: list().map((v) => {
          const s = shape(v), l = rims(v, s, r), t = label(v, s, r);
          return { n: v.n, mid: { x: v.path[v.path.length >> 1].x, y: v.path[v.path.length >> 1].y }, kind: s.kind, label: t.text, um: s.um,
            rims: l && l.map((q) => q[q.length >> 1]), span: l && [Math.min(...l[0].map((q) => q[0])), Math.max(...l[0].map((q) => q[0]))] };
        }),
        lens: lens ? (() => { const v = list().find((x) => x.n === lens.v), L = lens.data ?? (v && lensOf(v, lens.k)); return L ? { vessel: lens.v, slices: L.z, profile: L.profile.length, half: L.half } : null; })() : null };
    },
  };
}
