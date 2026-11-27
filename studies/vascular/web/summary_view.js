// The Summary box: what the vessel model adds up to over the tissue the shell's mask outlines, at three levels - the
// whole image (summary.js), each sub-network and each branch (networks.js) - as numbers and as pictures. The mask is
// lassoed on the stack seen from straight above and runs through every slice (req/shell/summary/mask).
import { summarize, nearestVessel } from './summary.js';
import { networks } from './networks.js';

const fmt = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const pct = (v, d = 0) => (Number.isFinite(v) ? `${fmt(100 * v, d)}%` : '–');
// the sub-networks drawn in a colour of their own; the rest share one
const COLOURED = 3;
const tone = (id) => (id <= COLOURED ? `c${id}` : 'c0');

let V, shell, model = () => null, mask = [], damaged = [], timer = 0, last = null, net = null, near = null;
// what a person chose in the box, kept across redraws: the table's order, the sub-network picked, the distance asked of
let sortBy = 'lengthUm', sortDown = true, picked = null, farUm = 30;
const $ = (id) => document.getElementById(id);

export function init(view, sh, current) {
  V = view; shell = sh; model = current;
  V.onSpacing(later, shell.signal);
  // the shell's outlines are in the image's pixels; the model's, in µm
  const read = () => {
    const um = shell.page.get('image')?.um || 1, toUm = (p) => p.map(([x, y]) => [x * um, y * um]);
    // the image's damaged areas, whatever model is shown (req/vascular/model/damaged)
    mask = shell.mask.polygons().map(toUm); damaged = shell.mask.damaged().map(toUm); later();
  };
  shell.mask.on(read, shell.signal);
  read();
  const box = $('vm-summary');
  box.addEventListener('click', clicked);
  box.addEventListener('input', (e) => { if (e.target.id === 'vm-far') { farUm = Math.max(0, +e.target.value || 0); farLine(); } });
  box.addEventListener('pointerover', (e) => { const c = e.target.closest('[data-c]'); focus(c ? +c.dataset.c : picked); });
  box.addEventListener('pointerleave', () => focus(picked));
}

export function changed() { later(); }
export const inspect = () => ({ mask, summary: last, networks: net && { ...net, components: net.components.map(({ branchList: _b, longestPath: _p, ...c }) => c) } });

// ---------- the numbers, once a frame however many changes come in it ----------
function later() { if (!timer) timer = requestAnimationFrame(() => { timer = 0; render(); }); }
function render() {
  const m = model(), box = $('vm-summary');
  if (!m) { last = net = near = null; box.replaceChildren(); shell.summary.set(null); return; }
  const o = { mask, damaged, zStepUm: V.S.zs };
  const s = { ...summarize(m, o), nearest: nearestVessel(m, o) };
  net = networks(m, o); near = s.nearest;
  if (picked && !net.components.some((c) => c.id === picked)) picked = null;
  last = { ...s, branchLength: strip(s.branchLength), diameter: strip(s.diameter), tortuosity: strip(s.tortuosity), nearest: strip(s.nearest), masked: mask.length };
  const where = mask.length ? `inside the mask (${mask.length} area${mask.length === 1 ? '' : 's'})` : 'over the whole field';
  const dmg = m.excluded_regions?.length || damaged.length ? ', damaged areas left out' : '';
  shell.summary.set({ over: `${mask.length ? `a mask of ${mask.length} area${mask.length === 1 ? '' : 's'}` : 'the whole field'}${dmg}`, rows: rows(s, net) });
  const C = net.components, big = C[0], border = C.filter((c) => c.touchesBorder).length;
  box.innerHTML = `<p class="note">Confirmed vessels ${where}${dmg}: ${fmt(s.tissueMm3 * 1e9 / 1e6, 2)} × 10⁶ µm³ of tissue, all ${m.slices} slices at ${fmt(V.S.zs, 2)} µm.</p>
    <h4>Whole image</h4>
    <div class="vm-tiles">
      ${tile('Vascular volume fraction', pct(s.volumeFraction, 2), '', 'the model\'s tubes, πr² along each vessel')}
      ${tile('Vessel length density', fmt(s.lengthDensity, 0), 'mm/mm³', `${fmt(s.lengthUm / 1000, 2)} mm in all`)}
      ${tile('Junction density', fmt(s.junctionDensity, 0), '/mm³', `${s.junctions} junctions · ${fmt(s.junctionsPerMm, 1)} per mm of vessel`)}
      ${tile('Branch density', fmt(s.branchDensity, 0), '/mm³', `${s.branches} branches`)}
      ${tile('Mean branch length', fmt(s.branchLength.mean), 'µm', `junction to junction, n ${s.branchLength.n}`)}
      ${tile('Sub-networks', String(C.length), '', big ? `the largest holds ${pct(big.share)} of the length · ${border} touch the border` : 'none')}
    </div>
    <h4>Sub-networks <span class="dim">connected inside the imaged volume</span></h4>
    ${C.length ? `${map(m)}${shares(C)}<div class="vm-table-wrap">${table(C)}</div>
    ${hist('Longest shortest path per sub-network, µm', stats(C.map((c) => c.longestPathUm)), { d: 0, unit: 'sub-networks' })}` : '<p class="dim">No confirmed vessels to group.</p>'}
    <h4>Junctions and branching</h4>
    ${degreeChart(net.degrees)}
    ${hist('3D branching angle between branches at a junction, °', net.angles, { d: 0, lo: 0, hi: 180, bins: 18, unit: 'pairs' })}
    <h4>Per branch</h4>
    ${hist('Branch length, junction to junction, µm', s.branchLength)}${hist('Vessel diameter, µm', s.diameter)}${hist('Vessel tortuosity (length ÷ end-to-end)', s.tortuosity, { d: 2 })}
    <h4>Tissue to the nearest vessel</h4>
    ${hist(`Nearest-vessel distance, to the nearest wall, µm, from tissue points ${fmt(s.nearest.spacingUm)} µm apart`, s.nearest, { marks: [['median', s.nearest.med], ['90th', s.nearest.p90], ['95th', s.nearest.p95]], unit: 'points' })}
    <p class="vm-far">Tissue farther than <input id="vm-far" type="number" min="0" step="5" value="${farUm}"> µm from a vessel: <b id="vm-far-out"></b></p>
    ${heat(net.grid)}
    <p class="vm-downloads">Download <button type="button" class="link" data-dl="networks">Sub-networks CSV</button> · <button type="button" class="link" data-dl="branches">Branches CSV</button></p>`;
  farLine(); focus(picked);
}
const strip = ({ v: _v, beyond: _b, ...rest }) => rest;
const stats = (xs) => { const v = xs.filter(Number.isFinite).sort((a, b) => a - b), n = v.length; if (!n) return { n, v }; const mean = v.reduce((a, b) => a + b, 0) / n; return { n, v, mean, sd: Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1)), med: n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2, min: v[0], max: v[n - 1] }; };

function farLine() {
  const out = $('vm-far-out'); if (!out || !near) return;
  out.textContent = near.n ? `${pct(near.beyond(farUm), 1)} of it` : '–';
}

function clicked(e) {
  const h = e.target.closest('th[data-sort]');
  if (h) { const k = h.dataset.sort; sortDown = sortBy === k ? !sortDown : true; sortBy = k; $('vm-net-table').outerHTML = table(net.components); focus(picked); return; }
  const dl = e.target.closest('[data-dl]');
  if (dl) { download(dl.dataset.dl); return; }
  const c = e.target.closest('[data-c]');
  if (c) { picked = picked === +c.dataset.c ? null : +c.dataset.c; focus(picked); }
}

// one sub-network brought forward on the map and in the table, with its longest shortest path drawn over it
function focus(id) {
  const svg = $('vm-net-map'); if (!svg) return;
  svg.classList.toggle('focus', !!id);
  for (const g of svg.querySelectorAll('g[data-c]')) g.classList.toggle('on', +g.dataset.c === id);
  for (const r of document.querySelectorAll('#vm-net-table tr[data-c]')) { r.classList.toggle('on', +r.dataset.c === id); r.classList.toggle('picked', +r.dataset.c === picked); }
  const c = net.components.find((x) => x.id === id), path = svg.querySelector('.route');
  path.setAttribute('d', c?.longestPath.length ? 'M' + c.longestPath.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') : '');
  $('vm-net-caption').textContent = c ? `#${c.id}: ${fmt(c.lengthUm, 0)} µm of vessel (${pct(c.share, 1)}), ${c.junctions} junctions, ${c.tips} tips${c.borderTips ? ` (${c.borderTips} at the border)` : ''}; longest shortest path ${fmt(c.longestPathUm, 0)} µm, dashed; longest trail, no segment twice, ${c.trailExact ? '' : 'at least '}${fmt(c.longestTrailUm, 0)} µm` : 'Point at a sub-network, here or in the table, to see its longest shortest path; click to keep it.';
}

const tile = (label, value, unit, sub) => `<div class="vm-tile"><div class="k">${label}</div><div class="v"><b>${value}</b> ${unit}</div><div class="dim">${sub}</div></div>`;

// the counted network from straight above, each sub-network in its colour
function map(m) {
  const W = m.size_px[0] * m.um_per_px, H = m.size_px[1] * m.um_per_px;
  const gs = net.components.slice().reverse().map((c) => `<g data-c="${c.id}" class="${tone(c.id)}"><title>#${c.id}: ${fmt(c.lengthUm, 0)} µm, ${c.junctions} junctions</title>${c.branchList.map((b) => `<path d="M${b.path.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}"/>`).join('')}</g>`).join('');
  const outline = mask.map((p) => `<path class="mask" d="M${p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z"/>`).join('');
  return `<svg id="vm-net-map" class="vm-map" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" role="img" aria-label="The sub-networks from above">
    <rect class="field" x="0" y="0" width="${W.toFixed(1)}" height="${H.toFixed(1)}"/>${outline}${gs}<path class="route" d=""/></svg>
    <p id="vm-net-caption" class="dim vm-caption"></p>`;
}

// how the vessel length shares out between the sub-networks: one bar, the coloured ones and the rest
function shares(C) {
  const top = C.slice(0, COLOURED), rest = C.slice(COLOURED), restShare = rest.reduce((t, c) => t + c.share, 0);
  const parts = [...top.map((c) => ({ cls: tone(c.id), share: c.share, label: `#${c.id}`, id: c.id })), ...(rest.length ? [{ cls: 'c0', share: restShare, label: `${rest.length} more` }] : [])];
  const bar = parts.map((p) => `<span class="${p.cls}" style="flex-grow:${Math.max(p.share, 0.002)}"${p.id ? ` data-c="${p.id}"` : ''} title="${p.label}: ${pct(p.share, 1)} of the length"></span>`).join('');
  const legend = parts.map((p) => `<span${p.id ? ` data-c="${p.id}"` : ''}><i class="${p.cls}"></i>${p.label} ${pct(p.share, p.share < 0.1 ? 1 : 0)}</span>`).join('');
  return `<div class="vm-share-label dim">Share of the vessel length</div><div class="vm-share">${bar}</div><div class="vm-legend">${legend}</div>`;
}

const COLS = [
  ['id', '#', (c) => `<i class="${tone(c.id)}"></i>${c.id}`],
  ['lengthUm', 'Length µm', (c) => `${fmt(c.lengthUm, 0)} <span class="dim">${pct(c.share, c.share < 0.1 ? 1 : 0)}</span>`],
  ['junctions', 'Junct.', (c) => c.junctions],
  ['tips', 'Tips', (c) => `${c.tips}${c.borderTips ? ` <span class="dim">(${c.borderTips} at border)</span>` : ''}`],
  ['branches', 'Branches', (c) => c.branches],
  ['longestPathUm', 'Longest shortest path µm', (c) => fmt(c.longestPathUm, 0)],
  ['longestTrailUm', 'Longest trail µm', (c) => `${c.trailExact ? '' : '≥ '}${fmt(c.longestTrailUm, 0)}`],
  ['medBranch', 'Median branch µm', (c) => fmt(c.branchLength.med, 0)],
  ['medDiameter', 'Median ⌀ µm', (c) => fmt(c.diameter.med, 1)],
  ['meanTortuosity', 'Tortuosity', (c) => fmt(c.tortuosity.mean, 2)],
  ['junctionsPerMm', 'Junct./mm', (c) => fmt(c.junctionsPerMm, 1)],
  ['touchesBorder', 'Border', (c) => (c.touchesBorder ? (c.touchesSide ? 'side' : 'top/bottom') : '–')],
];
const key = (c, k) => ({ medBranch: c.branchLength.med, medDiameter: c.diameter.med, meanTortuosity: c.tortuosity.mean, touchesBorder: c.touchesBorder ? 1 : 0 })[k] ?? c[k];
function table(C) {
  const order = C.slice().sort((a, b) => { const x = key(a, sortBy), y = key(b, sortBy), u = Number.isFinite(x) ? x : -Infinity, w = Number.isFinite(y) ? y : -Infinity; return sortDown ? w - u : u - w; });
  return `<table id="vm-net-table" class="vm-table"><thead><tr>${COLS.map(([k, t]) => `<th data-sort="${k}"${k === sortBy ? ` class="sorted ${sortDown ? 'down' : 'up'}"` : ''}>${t}</th>`).join('')}</tr></thead>
    <tbody>${order.map((c) => `<tr data-c="${c.id}">${COLS.map(([, , f]) => `<td>${f(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

// how many confirmed vessels meet at each point: tips, points along a vessel, junctions of three and of four or more
function degreeChart(d) {
  const ks = [['1', 'tips'], ['2', 'along a vessel'], ['3', 'junctions'], ['4+', 'junctions']], top = Math.max(1, ...ks.map(([k]) => d[k]));
  const W = 300, H = 60, L = 6, T = 14, bw = W / ks.length;
  const bars = ks.map(([k, what], i) => { const h = (d[k] / top) * H, x = L + i * bw + 8; return `<rect class="bar${k === '2' ? ' quiet' : ''}" x="${x}" y="${T + H - h}" width="${bw - 16}" height="${Math.max(h, 0.5)}" rx="2"><title>${d[k]} points with ${k} vessel${k === '1' ? '' : 's'} (${what})</title></rect>
    <text x="${x + (bw - 16) / 2}" y="${T + H - h - 3}" text-anchor="middle" class="val">${d[k].toLocaleString('en-US')}</text>
    <text x="${x + (bw - 16) / 2}" y="${T + H + 12}" text-anchor="middle">${k}</text><text x="${x + (bw - 16) / 2}" y="${T + H + 23}" text-anchor="middle" class="dimt">${what}</text>`; }).join('');
  return `<div class="hist"><div>Node degree: vessels meeting at each of the model's points</div><svg viewBox="0 0 ${L + W + 2} ${T + H + 27}">${bars}<line class="grid" x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}"/></svg></div>`;
}

// Spatial heterogeneity: vessel length density in each cell of the grid from above, darker where denser
function heat(g) {
  const top = Math.max(1e-9, ...g.cells.map((c) => c.density || 0)), s = g.cellUm;
  const cells = g.cells.map((c) => (c.tissue > 0 ? `<rect x="${c.i * s}" y="${c.j * s}" width="${s}" height="${s}" class="cell${c.tissue < 0.5 ? ' part' : ''}" style="fill-opacity:${(0.06 + 0.94 * ((c.density || 0) / top)).toFixed(3)}"><title>${fmt(c.density, 0)} mm/mm³ (${fmt(c.lengthUm, 0)} µm of vessel)${c.tissue < 0.5 ? ', under half tissue: left out of the CV' : ''}</title></rect>` : '')).join('');
  return `<div class="hist"><div>Vessel length density in ${s} µm squares from above: CV <b>${fmt(g.cv, 2)}</b> <span class="dim">over ${g.density.n} squares at least half tissue, ${fmt(g.density.min, 0)}–${fmt(g.density.max, 0)} mm/mm³</span></div>
    <svg class="vm-heat" viewBox="0 0 ${g.nx * s} ${g.ny * s}">${cells}</svg>
    <div class="vm-scale"><span>0</span><i></i><span>${fmt(top, 0)} mm/mm³</span></div></div>`;
}

// a histogram with a count axis, the mean as a line and one SD either side of it as a band, or marks of its own
function hist(label, s, { d = 1, lo: lo0, hi: hi0, bins = 20, marks, unit = 'branches' } = {}) {
  const W = 300, H = 60, L = 30, T = 6;
  if (!s.n) return `<div class="hist"><div>${label}: none</div></div>`;
  const lo = lo0 ?? s.min, hi = hi0 ?? (s.max === s.min ? s.min + 1 : s.max), cnt = new Array(bins).fill(0);
  for (const x of s.v) cnt[Math.max(0, Math.min(bins - 1, Math.floor(((x - lo) / (hi - lo)) * bins)))]++;
  const top = Math.max(...cnt), bw = W / bins, X = (v) => L + Math.min(W, Math.max(0, ((v - lo) / (hi - lo)) * W)), Y = (c) => T + H - (c / top) * H;
  const ticks = [...new Set([0, top])].map((t) => `<line class="grid" x1="${L}" x2="${L + W}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L - 4}" y="${Y(t) + 3}" text-anchor="end">${t >= 1e4 ? Math.round(t / 1e3) + 'k' : t}</text>`).join('');
  const bars = cnt.map((c, k) => `<rect class="bar" x="${L + k * bw + 0.5}" y="${Y(c)}" width="${bw - 1}" height="${T + H - Y(c)}"><title>${c} ${unit}, ${fmt(lo + (k * (hi - lo)) / bins, d)}–${fmt(lo + ((k + 1) * (hi - lo)) / bins, d)}</title></rect>`).join('');
  const sd = s.sd || 0, mid = (lo + hi) / 2;
  // under the bars the SD band; over them the mean, or the marks asked for, each named
  const under = marks ? '' : `<rect class="sd" x="${X(s.mean - sd)}" y="${T}" width="${X(s.mean + sd) - X(s.mean - sd)}" height="${H}"/>`;
  const over = marks
    ? marks.map(([name, v], k) => `<line class="mark" x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${T + H}"/><text class="marktext" x="${X(v) + (v > mid ? -2 : 2)}" y="${T + 8 + 9 * k}" text-anchor="${v > mid ? 'end' : 'start'}">${name}</text>`).join('')
    : `<line class="mean" x1="${X(s.mean)}" x2="${X(s.mean)}" y1="${T}" y2="${T + H}"/>`;
  const head = marks ? `median <b>${fmt(s.med, d)}</b>, 90th ${fmt(s.p90, d)}, 95th ${fmt(s.p95, d)}, mean ${fmt(s.mean, d)}, n ${s.n.toLocaleString('en-US')}`
    : `mean <b>${fmt(s.mean, d)}</b> ± ${fmt(sd, d)} SD, median ${fmt(s.med, d)}, n ${s.n.toLocaleString('en-US')}`;
  return `<div class="hist"><div>${label}: ${head}</div><svg viewBox="0 0 ${L + W + 2} ${T + H + 14}">
    ${ticks}${under}<g>${bars}</g>${over}
    <text x="${L}" y="${T + H + 12}">${fmt(lo, d)}</text><text x="${L + W}" y="${T + H + 12}" text-anchor="end">${fmt(hi, d)}</text></svg></div>`;
}

// ---------- what is saved ----------
// the summary as the shell's Download Summary saves it: a row per measurement, a distribution with its statistics
const dist = (measurement, unit, st) => ({ measurement, unit, n: st.n, mean: st.mean, sd: st.sd, median: st.med, min: st.min, max: st.max });
const rows = (s, n) => [
  { measurement: 'Tissue volume', unit: 'mm³', value: s.tissueMm3 },
  { measurement: 'Vascular volume fraction', unit: '%', value: 100 * s.volumeFraction },
  { measurement: 'Vessel length density', unit: 'mm/mm³', value: s.lengthDensity },
  { measurement: 'Vessel length', unit: 'µm', value: s.lengthUm },
  { measurement: 'Junction density', unit: 'per mm³', value: s.junctionDensity },
  { measurement: 'Junction density', unit: 'per mm of vessel', value: s.junctionsPerMm },
  { measurement: 'Junctions', unit: 'count', value: s.junctions },
  { measurement: 'Branch density', unit: 'per mm³', value: s.branchDensity },
  { measurement: 'Branches', unit: 'count', value: s.branches },
  dist('Branch length, junction to junction', 'µm', s.branchLength),
  dist('Vessel diameter', 'µm', s.diameter),
  dist('Vessel tortuosity', 'length ÷ end-to-end', s.tortuosity),
  dist('Nearest-vessel distance', 'µm', s.nearest),
  { measurement: 'Nearest-vessel distance, 90th percentile', unit: 'µm', value: s.nearest.p90 },
  { measurement: 'Nearest-vessel distance, 95th percentile', unit: 'µm', value: s.nearest.p95 },
  { measurement: `Tissue farther than ${farUm} µm from a vessel`, unit: '%', value: s.nearest.n ? 100 * s.nearest.beyond(farUm) : null },
  { measurement: 'Sub-networks', unit: 'count', value: n.components.length },
  { measurement: 'Sub-networks touching the border', unit: 'count', value: n.components.filter((c) => c.touchesBorder).length },
  { measurement: 'Largest sub-network', unit: '% of vessel length', value: n.components.length ? 100 * n.components[0].share : null },
  dist('Sub-network length', 'µm', stats(n.components.map((c) => c.lengthUm))),
  dist('Longest shortest path per sub-network', 'µm', stats(n.components.map((c) => c.longestPathUm))),
  dist('Longest trail per sub-network', 'µm', stats(n.components.map((c) => c.longestTrailUm))),
  ...Object.entries(n.degrees).map(([k, v]) => ({ measurement: `Points where ${k} vessels meet`, unit: 'count', value: v })),
  dist('3D branching angle', '°', n.angles),
  { measurement: `Vessel length density CV over ${n.grid.cellUm} µm squares`, unit: 'ratio', value: n.grid.cv },
];

const csv = (cols, list) => [cols.map(([k]) => k).join(','), ...list.map((r) => cols.map(([, f]) => { const v = f(r); return v == null || (typeof v === 'number' && !Number.isFinite(v)) ? '' : typeof v === 'number' ? String(Number(v.toPrecision(6))) : /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v); }).join(','))].join('\n') + '\n';
function download(which) {
  const name = (shell.state?.fileName || model()?.source || 'image').replace(/\.[^.]*$/, '');
  if (which === 'networks') shell.saveFile(`${name}_subnetworks.csv`, csv([
    ['subnetwork', (c) => c.id], ['length_um', (c) => c.lengthUm], ['share_of_length', (c) => c.share], ['nodes', (c) => c.nodes],
    ['junctions', (c) => c.junctions], ['tips', (c) => c.tips], ['border_tips', (c) => c.borderTips], ['branches', (c) => c.branches],
    ['mean_branch_um', (c) => c.branchLength.mean], ['median_branch_um', (c) => c.branchLength.med],
    ['median_diameter_um', (c) => c.diameter.med], ['min_diameter_um', (c) => c.diameter.min], ['max_diameter_um', (c) => c.diameter.max],
    ['mean_tortuosity', (c) => c.tortuosity.mean], ['longest_shortest_path_um', (c) => c.longestPathUm],
    ['longest_trail_um', (c) => c.longestTrailUm], ['longest_trail_exact', (c) => (c.trailExact ? 'yes' : 'no, the longest found')],
    ['junctions_per_mm', (c) => c.junctionsPerMm], ['touches_border', (c) => (c.touchesBorder ? (c.touchesSide ? 'side' : 'top/bottom') : 'no')],
  ], net.components), 'text/csv');
  else shell.saveFile(`${name}_branches.csv`, csv([
    ['subnetwork', (b) => b.component], ['from_point', (b) => b.at[0]], ['to_point', (b) => b.at[1]], ['from_kind', (b) => b.ends[0]], ['to_kind', (b) => b.ends[1]],
    ['length_um', (b) => b.length], ['end_to_end_um', (b) => b.span], ['tortuosity', (b) => (b.span > 1 ? b.length / b.span : null)],
    ['diameter_um', (b) => b.diameter], ['mid_x_um', (b) => b.mid.x], ['mid_y_um', (b) => b.mid.y],
  ], net.branches), 'text/csv');
}
