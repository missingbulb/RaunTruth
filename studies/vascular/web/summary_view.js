// The Summary box: what the vessel model adds up to over the tissue the shell's mask outlines (summary.js); the mask is
// lassoed on the stack seen from straight above and runs through every slice (req/shell/summary/mask).
import { summarize, nearestVessel } from './summary.js';

const fmt = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');

let V, shell, model = () => null, mask = [], timer = 0, last = null;
const $ = (id) => document.getElementById(id);

export function init(view, sh, current) {
  V = view; shell = sh; model = current;
  V.onSpacing(later, shell.signal);
  // the shell's outlines are in the image's pixels; the model's, in µm
  const read = () => { const um = shell.page.get('image')?.um || 1; mask = shell.mask.polygons().map((p) => p.map(([x, y]) => [x * um, y * um])); later(); };
  shell.mask.on(read, shell.signal);
  read();
}

export function changed() { later(); }
export const inspect = () => ({ mask, summary: last });

// ---------- the numbers, once a frame however many changes come in it ----------
function later() { if (!timer) timer = requestAnimationFrame(() => { timer = 0; render(); }); }
function render() {
  const m = model(), box = $('vm-summary');
  if (!m) { last = null; box.replaceChildren(); shell.summary.set(null); return; }
  const s = { ...summarize(m, { mask, zStepUm: V.S.zs }), nearest: nearestVessel(m, { mask, zStepUm: V.S.zs }) };
  last = { ...s, branchLength: strip(s.branchLength), diameter: strip(s.diameter), tortuosity: strip(s.tortuosity), nearest: strip(s.nearest), masked: mask.length };
  const where = mask.length ? `inside the mask (${mask.length} area${mask.length === 1 ? '' : 's'})` : 'over the whole field';
  shell.summary.set({ over: `${mask.length ? `a mask of ${mask.length} area${mask.length === 1 ? '' : 's'}` : 'the whole field'}${m.excluded_regions?.length ? ', damaged areas left out' : ''}`, rows: rows(s) });
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
// the summary as the shell's Download Summary saves it: a row per measurement, a distribution with its statistics
const dist = (measurement, unit, st) => ({ measurement, unit, n: st.n, mean: st.mean, sd: st.sd, median: st.med, min: st.min, max: st.max });
const rows = (s) => [
  { measurement: 'Tissue volume', unit: 'mm³', value: s.tissueMm3 },
  { measurement: 'Vascular volume fraction', unit: '%', value: 100 * s.volumeFraction },
  { measurement: 'Vessel length density', unit: 'mm/mm³', value: s.lengthDensity },
  { measurement: 'Vessel length', unit: 'µm', value: s.lengthUm },
  { measurement: 'Branch point density', unit: 'per mm³', value: s.branchPointDensity },
  { measurement: 'Junctions', unit: 'count', value: s.junctions },
  { measurement: 'Branch density', unit: 'per mm³', value: s.branchDensity },
  { measurement: 'Branches', unit: 'count', value: s.branches },
  dist('Branch length, junction to junction', 'µm', s.branchLength),
  dist('Vessel diameter', 'µm', s.diameter),
  dist('Vessel tortuosity', 'length ÷ end-to-end', s.tortuosity),
  dist('Nearest-vessel distance', 'µm', s.nearest),
];

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
