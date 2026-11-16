// The Summary box: what the vessel model adds up to over the tissue a mask outlines (summary.js), and the mask itself,
// areas lassoed on the stack seen from straight above, each running through every slice, combined by exclusive or.
import { summarize, nearestVessel } from './summary.js';

const MASK = 'vascular-mask-v1:'; // + file name: [[[x, y]...]...], the lassoed areas in µm from the image's top left
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const write = (k, v) => { try { if (v.length) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch { /* no storage: the mask lasts for this page */ } };
const svgEl = (tag, attrs) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const fmt = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');

let V, shell, model = () => null, mask = [], name = null, lasso = null, over = null, timer = 0, last = null;
const $ = (id) => document.getElementById(id);
// µm per pixel of the image open, the pixels the view's pointer reads
const pxUm = () => shell.page.get('image')?.um || 1;

export function init(view, sh, current) {
  V = view; shell = sh; model = current;
  $('mask-add').onclick = start;
  $('mask-clear').onclick = () => set([]);
  over = svgEl('svg', { id: 'vm-mask' });
  V.stage.append(over);
  V.onDraw(draw, shell.signal);
  V.onSpacing(later, shell.signal);
  addEventListener('pointerdown', down, { capture: true, signal: shell.signal });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lasso) end(); }, { signal: shell.signal });
  shell.signal.addEventListener('abort', () => over.remove());
}

// a stack opened: its own mask, as this browser last kept it
export function opened(fileName) { end(); name = fileName; mask = read(MASK + name); last = null; changed(); }
export function changed() { $('mask-add').disabled = !model(); $('mask-clear').hidden = !mask.length; draw(); later(); }
export const inspect = () => ({ mask, summary: last, lassoing: !!lasso });

function set(next) { mask = next; if (name) write(MASK + name, mask); changed(); }

// Add mask: the stack from straight above, the view held still, then a lasso drawn by dragging; Esc draws nothing
function start() {
  if (!model()) return;
  lasso = { was: { rot: V.S.rot, held: V.S.held }, pts: null };
  Object.assign(V.S, { rot: V.facing(0, 0), held: true });
  V.stage.classList.add('lassoing'); $('mask-hint').hidden = false;
  V.redraw();
}
function end() {
  if (!lasso) return;
  Object.assign(V.S, lasso.was); lasso = null;
  V.stage.classList.remove('lassoing'); $('mask-hint').hidden = true;
  V.redraw();
}
function down(e) {
  if (!lasso || e.button !== 0 || !e.target.closest('#v3-stage')) return;
  const at = V.toImage(e); if (!at) return;
  e.preventDefault(); e.stopImmediatePropagation();
  lasso.pts = [at.map((v) => v * pxUm())];
  shell.drag(V.stage, e, {
    move(ev) { ev.stopImmediatePropagation(); const p = V.toImage(ev); if (p && lasso) { lasso.pts.push(p.map((v) => Math.round(v * pxUm() * 100) / 100)); draw(); } },
    drop(ev) {
      ev?.stopImmediatePropagation?.();
      const m = model(), pts = lasso?.pts || [];
      end();
      if (!m || pts.length < 3) return draw();
      const W = m.size_px[0] * m.um_per_px, H = m.size_px[1] * m.um_per_px, cl = pts.map(([x, y]) => [Math.min(Math.max(x, 0), W), Math.min(Math.max(y, 0), H)]);
      const area = Math.abs(cl.reduce((a, [x, y], i) => { const [p, q] = cl[(i + 1) % cl.length]; return a + x * q - p * y; }, 0)) / 2;
      // a lasso smaller than a capillary's footprint is a slip, not an area
      if (area >= 25) set([...mask, cl]); else draw();
    },
    cancel: end,
  });
}

// the mask's borders over the 3D view, following it as it turns and zooms, and the lasso being drawn
function draw() {
  if (!over) return;
  over.replaceChildren();
  const shape = (cls, pts, closed) => {
    const q = pts.map(([x, y]) => V.toScreen(x / pxUm(), y / pxUm()));
    if (!q.every(Boolean)) return;
    const d = 'M' + q.map((v) => v.join(' ')).join('L') + (closed ? 'Z' : '');
    over.append(svgEl('path', { class: cls + ' under', d }), svgEl('path', { class: cls, d }));
  };
  if (model()) for (const p of mask) shape('edge', p, true);
  if (lasso?.pts) shape('live', lasso.pts, false);
}

// ---------- the numbers, once a frame however many changes come in it ----------
function later() { if (!timer) timer = requestAnimationFrame(() => { timer = 0; render(); }); }
function render() {
  const m = model(), box = $('vm-summary');
  if (!m) { last = null; box.replaceChildren(); return; }
  const s = { ...summarize(m, { mask, zStepUm: V.S.zs }), nearest: nearestVessel(m, { mask, zStepUm: V.S.zs }) };
  last = { ...s, branchLength: strip(s.branchLength), diameter: strip(s.diameter), tortuosity: strip(s.tortuosity), nearest: strip(s.nearest), masked: mask.length };
  const where = mask.length ? `inside the mask (${mask.length} area${mask.length === 1 ? '' : 's'})` : 'over the whole field';
  const dmg = m.excluded_regions?.length ? ', damaged areas left out' : '';
  box.innerHTML = `<p class="note">Confirmed vessels ${where}${dmg}: ${fmt(s.tissueMm3 * 1e9 / 1e6, 2)} × 10⁶ µm³ of tissue, all ${m.slices} slices at ${fmt(V.S.zs, 2)} µm.</p>
    <dl class="vm-metrics">
      <dt>Vascular volume fraction</dt><dd><b>${fmt(100 * s.volumeFraction, 2)}%</b> <span class="dim">the model's tubes, πr² along each vessel</span></dd>
      <dt>Vessel length density</dt><dd><b>${fmt(s.lengthDensity, 0)}</b> mm/mm³ <span class="dim">${fmt(s.lengthUm / 1000, 2)} mm in all</span></dd>
      <dt>Branch point density</dt><dd><b>${fmt(s.branchPointDensity, 0)}</b> /mm³ <span class="dim">${s.junctions} junctions</span></dd>
      <dt>Branch density</dt><dd><b>${fmt(s.branchDensity, 0)}</b> /mm³ <span class="dim">${s.branches} branches</span></dd>
      <dt>Mean branch length</dt><dd><b>${fmt(s.branchLength.mean)}</b> µm <span class="dim">junction to junction, n ${s.branchLength.n}</span></dd>
    </dl>
    <div class="hists">${hist('Mean branch length, µm', s.branchLength)}${hist('Vessel diameter, µm', s.diameter)}${hist('Vessel tortuosity (length ÷ end-to-end)', s.tortuosity, 2)}${hist(`Nearest-vessel distance, µm, from tissue points ${fmt(s.nearest.spacingUm)} µm apart`, s.nearest)}</div>`;
}
const strip = ({ v: _v, ...rest }) => rest;

// a histogram with a count axis, the mean as a line and one SD either side of it as a band
function hist(label, s, d = 1) {
  const W = 300, H = 60, L = 30, T = 6, bins = 20;
  if (!s.n) return `<div class="hist"><div>${label}: none</div></div>`;
  const lo = s.min, hi = s.max === s.min ? s.min + 1 : s.max, cnt = new Array(bins).fill(0);
  for (const x of s.v) cnt[Math.min(bins - 1, Math.floor(((x - lo) / (hi - lo)) * bins))]++;
  const top = Math.max(...cnt), bw = W / bins, X = (v) => L + Math.min(W, Math.max(0, ((v - lo) / (hi - lo)) * W)), Y = (c) => T + H - (c / top) * H;
  const ticks = [...new Set([0, top])].map((t) => `<line class="grid" x1="${L}" x2="${L + W}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L - 4}" y="${Y(t) + 3}" text-anchor="end">${t >= 1e4 ? Math.round(t / 1e3) + 'k' : t}</text>`).join('');
  const bars = cnt.map((c, k) => `<rect class="bar" x="${L + k * bw + 0.5}" y="${Y(c)}" width="${bw - 1}" height="${T + H - Y(c)}"><title>${c}</title></rect>`).join('');
  const sd = s.sd || 0, band = `<rect class="sd" x="${X(s.mean - sd)}" y="${T}" width="${X(s.mean + sd) - X(s.mean - sd)}" height="${H}"/>`;
  return `<div class="hist"><div>${label}: mean <b>${fmt(s.mean, d)}</b> ± ${fmt(sd, d)} SD, median ${fmt(s.med, d)}, n ${s.n.toLocaleString('en-US')}</div><svg viewBox="0 0 ${L + W + 2} ${T + H + 14}">
    ${ticks}${band}<g>${bars}</g><line class="mean" x1="${X(s.mean)}" x2="${X(s.mean)}" y1="${T}" y2="${T + H}"/>
    <text x="${L}" y="${T + H + 12}">${fmt(lo, d)}</text><text x="${L + W}" y="${T + H + 12}" text-anchor="end">${fmt(hi, d)}</text></svg></div>`;
}
