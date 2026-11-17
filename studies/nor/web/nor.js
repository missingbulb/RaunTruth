// The NoR Finder study's page: a finder proposes candidates once, then the filters judge them live, and the
// user's verdicts, lengths, added NoRs and mask become the summary, the CSVs and the ground truth. All
// detection and filtering is the study's Python (detection/interactive.py); this module draws, keeps the
// user's settings, decisions and measurements, and asks Python to refilter. It runs in the shell's page
// (web/shell.js), which hands it the services below.
import "./peek.js";
import * as N from "./gt_actions.js";
import { oldMarks } from "./old_marks.js";

export function mount(shell) {
  const { $, status, busy, slow, until, readJSON, writeJSON, esc, saveFile } = shell, st = shell.state;
  // a listener outside the study's own panels lasts only while the study is on show
  const here = { signal: shell.signal };
  const SVGNS = "http://www.w3.org/2000/svg";
  const STORE = "nor-filter-settings-v1"; // {values: {param: number}, off: [filter key]}; only what the user changed
  const SHOW = "nor-show-v1"; // the image view's Show menu
  const SORT = "nor-sort-v1"; // the item views' Sort menu, one per view: {pass, fail}
  const CARDS = "nor-cards-v3"; // the item views' Options menu, one per view: {pass: {...}, fail: {...}}, only what the user changed
  // while the study makes ground truth its tasks are in the left bar, one candidate at a time, and the image is the only view
  const TRUTH = shell.makesTruth;
  // the tagger tags now: the walk's item is ringed, its area framed and what is done cut out only then
  // (req/shell/ground-truth/tagging)
  const tagging = () => TRUTH && shell.tasks.tagging();
  // the image cut into GRID × GRID areas, each task's candidates taken area by area so the review fills one area after another
  const GRID = N.GRID;
  // an added NoR counts as found when a candidate lies within this distance of its middle: about half a
  // NoR's length on the lab's slide (median 26 px)
  const MISSING_RADIUS = 12;
  const MISSING_COLOUR = "#ffd400"; // yellow: none of the image's own colours
  // a new NoR's lines before any finder has run: the lab slide's median finalist (px)
  const TYPICAL = { length: 25, red_length: 10, width: 4.6 };
  // where ground truth is submitted: an issue with this label, which the repo's daily intake reads
  const MEASURES = [
    ["length", "length", true], ["red_length", "red length", true], ["width", "width", true],
    ["red_over_length", "red / length", false], ["length_over_width", "length / width", false],
  ];
  const BY_YOU = "rejected by you";
  // the gt keys switch the markings of the ground-truth tasks (req/nor/truth/marks)
  const SHOW_DEFAULTS = { pass: true, fails: true, nums: true, letters: true, lines: true, passW: 1, passC: "#ff69c8", failW: 1, failC: "#008cff",
    gtPass: true, gtFails: true, gtAdded: true, gtCut: true, gtFrame: true };
  // each item view opens with its own options: the finalists with everything needed to check and adjust
  // lengths, the rejected with just the NoR's borders and more context around it
  const CARD_DEFAULTS = {
    pass: { pad: 4, align: true, borders: true, bars: true, lenImg: true, lenCard: false, adjust: true },
    fail: { pad: 10, align: false, borders: true, bars: false, lenImg: false, lenCard: false, adjust: false },
  };

  // the study's part of the page's state, beside the shell's (shell.state)
  Object.assign(st, {
    meta: null, seg: null, cands: [],
    fails: [], alone: null, forced: new Map(), edits: new Map(), defaults: {}, values: {}, off: new Set(),
    about: {}, detectValues: {}, lastRun: null, filtersFor: null, seq: 0, inflight: false, pending: false,
    added: [], mask: [], areas: new Set(), area: null, task: null, cur: undefined, back: [], numbers: new Map(), order: [], sel: null, tab: "pass",
    show: { ...SHOW_DEFAULTS, ...readJSON(SHOW) }, opt: readOpts(), sort: { pass: "number", fail: "number", ...readJSON(SORT) }, crops: new Map(),
  });

  function readOpts() {
    const saved = readJSON(CARDS);
    // the rejected are never turned level, whatever an older page saved
    return { pass: { ...CARD_DEFAULTS.pass, ...saved.pass }, fail: { ...CARD_DEFAULTS.fail, ...saved.fail, align: false } };
  }
  // the options a candidate's card is drawn with: those of the view it is listed in
  // (a task's card, finalist or rejected alike: the finalists', so a rejected one can be measured before it is approved)
  const optsOf = (c) => st.opt[TRUTH || result(c.i) === null ? "pass" : "fail"];
  // the task that reviews a candidate: the filters' word on it, whatever the user said
  const groupOf = (c) => (c.added ? "missed" : (st.fails[c.i] ?? null) === null ? "pass" : "fail");

  // what each of the study's browser keys holds, for the shell's Manage storage dialog
  const SETTINGS = { [STORE]: "Filter settings", [SHOW]: "Show menu of the image view", [SORT]: "Sort menus of the item views", [CARDS]: "Options menus of the item views" };
  const stored = (key) => (SETTINGS[key] ? { group: "settings", what: SETTINGS[key] } : null);

  // ---------- saved filter settings ----------
  const loadSaved = () => readJSON(STORE, { values: {}, off: [] });
  function save() {
    const values = {};
    for (const [k, v] of Object.entries(st.values)) if (v !== st.defaults[k]) values[k] = v;
    writeJSON(STORE, { values, off: [...st.off] });
    markPreset();
  }

  // ---------- filter presets: each finder's precision and recall on the ground truth (detection/finder_metrics.py) ----------
  const PRESETS = { precise: "Precise", balanced: "Balanced", recalling: "Recalling" };
  // never settles once the study has left: what waited on it would reach for panels that are gone
  const quality = fetch(new URL("finder_metrics.json", import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((q) => (here.signal.aborted ? new Promise(() => {}) : q));
  const two = (x) => x.toFixed(2).replace(/^0/, "");
  const pr = (r) => `P\u00a0${two(r.precision)}\u00a0·\u00a0R\u00a0${two(r.recall)}`; // one unbroken pair
  async function buildPresets() {
    const q = await quality, box = $("#presets"), per = q && q.finders[st.filtersFor] && q.finders[st.filtersFor].filtered;
    box.hidden = !per; if (!per) return;
    const real = q.images.reduce((a, im) => a + im.real, 0), not = q.images.reduce((a, im) => a + im.not_nor, 0);
    box.title = `After the filters: precision (P) and recall (R) on ${real} real and ${not} not-NoR marked spots in ${q.images.length} image${q.images.length > 1 ? "s" : ""}`;
    box.replaceChildren(...Object.entries(PRESETS).filter(([k]) => per[k]).map(([k, name]) => {
      const b = document.createElement("button"); b.type = "button"; b.dataset.preset = k;
      b.innerHTML = `${name}<small>${pr(per[k])}</small>`;
      b.onclick = () => { st.values = { ...st.defaults, ...per[k].values }; st.off.clear(); showFilterValues(); save(); refilter(); };
      slow(b); return b;
    }));
    markPreset();
  }
  // a preset is lit while the filters hold exactly its values
  function markPreset() {
    quality.then((q) => {
      const per = q && q.finders[st.filtersFor] && q.finders[st.filtersFor].filtered;
      if (!per) return;
      for (const b of $("#presets").children) {
        const v = per[b.dataset.preset].values;
        b.classList.toggle("on", !st.off.size && Object.keys(v).every((k) => st.values[k] === v[k]));
      }
    });
  }

  // ---------- the tagger's work: GT actions, which the page draws (req/shell/ground-truth/history) ----------
  // The shell's log holds the decisions, the lengths moved, the NoRs added and the areas checked, as GT actions on candidates named
  // by id (gt_actions.js). The page reads them as st.forced (a candidate's index -> "in" | "out"), st.edits (-> {length, red, width,
  // approved}), st.added ([{id, lines, verdict}]) and st.areas, which sync() derives from the log's model after every change.
  const act = (action) => shell.gt.act(action);
  // the user's word on a candidate: "approve" (a NoR, with the lengths shown), "reject" (not one: it is taken out of the candidates
  // that remain), or null (back to the filters' word)
  function decide(i, d) {
    const c = candOf(i);
    if (c) act({ type: d === "approve" ? "approve" : d === "reject" ? "delete" : "undecide", cand: c.id });
  }
  const imageInfo = () => {
    const src = st.source || { kind: "local" };
    return { name: st.fileName, sha256: st.sha, width: st.W, height: st.H, um_per_px: st.um || null, location: shell.remote.owns(src) ? shell.remote.locate(src) : { source: "local" } };
  };
  // the model's candidates as the page's, with no outline: its masks are not in the log (the run's output holds none)
  function adopt(m) {
    const all = [...m.cands, ...m.deleted];
    st.meta = { finder: m.meta.finder, drafted: true }; st.seg = null; st.alone = null; st.crops = new Map(); st.cands = []; st.fails = [];
    for (const c of all) {
      st.cands[c.i] = { i: c.i, id: c.id, cx: c.x, cy: c.y, bb: c.bb, fail0: null, x0: 0, y0: 0, h: 0, w: 0, blk: [], ...(c.lines ? { lines: c.lines, m: c.m } : {}) };
      st.fails[c.i] = c.fail ?? null;
    }
    st.order = [...all].sort((a, b) => a.n - b.n).map((c) => st.cands[c.i]);
    st.numbers = new Map(all.map((c) => [c.i, c.n]));
    st.sel = null; st.task = null; st.cur = undefined; st.back = []; st.runOverrides = m.meta.finder_settings || {};
    if (st.about?.[m.meta.finder]) st.reasons = st.about[m.meta.finder].reasons;
    for (const id of ["#filters", "#presets"]) $(id).inert = true;
    buildOverlay();
    shell.statusBar();
  }
  // whether the page's candidates are those the model holds: each by its id at its place, and none the model does not know
  const spot = (x, y) => `${Math.round(x)},${Math.round(y)}`;
  const aligned = (m) => {
    const all = [...m.cands, ...m.deleted];
    return all.length === st.order.length && all.every((c) => st.cands[c.i]?.id === c.id && spot(st.cands[c.i].cx, st.cands[c.i].cy) === spot(c.x, c.y));
  };
  // the filters as the log's run had them, in the dials; true when that moved one
  function followFilters(m) {
    const f = m.meta.filters;
    if (!f?.values || st.filtersFor !== m.meta.finder || !st.defaults) return false;
    const values = { ...st.defaults, ...f.values }, off = new Set(f.off || []);
    if (JSON.stringify([values, [...off]]) === JSON.stringify([st.values, [...st.off]])) return false;
    st.values = values; st.off = off; showFilterValues(); save();
    return true;
  }
  // the run recorded last for this detection, by what it holds of the filters' word: a fresh one only when that moves
  let recorded = null;
  const filtersKey = (fails, values, off) => JSON.stringify([fails, values, off]);
  const modelKey = (m) => filtersKey([...m.cands, ...m.deleted].sort((a, b) => a.i - b.i).map((c) => c.fail ?? null), m.meta.filters?.values, m.meta.filters?.off);
  // the model's word on the page: what the tagger decided, measured, added and checked
  function sync(m, why) {
    if (!m) { st.forced = new Map(); st.edits = new Map(); st.added = []; st.areas = new Set(); recorded = null; return; }
    if (!aligned(m)) adopt(m);
    if (why !== "act" && why !== "run") recorded = modelKey(m);
    const was = st.edits;
    st.forced = new Map(); st.edits = new Map();
    for (const c of m.cands) {
      if (c.approved) st.forced.set(c.i, "in");
      const e = { ...c.edited, ...(c.approved ? { approved: true } : {}) };
      if (Object.keys(e).length) st.edits.set(c.i, e);
    }
    for (const c of m.deleted) { st.forced.set(c.i, "out"); if (c.edited) st.edits.set(c.i, { ...c.edited }); }
    for (const c of [...m.cands, ...m.deleted]) st.fails[c.i] = c.fail ?? null;
    st.added = m.added.map((a) => ({ id: a.id, lines: a.lines, verdict: a.approved ? "in" : null }));
    st.areas = new Set(m.areas);
    if (isAdded(st.sel) && !candOf(st.sel)) st.sel = null;
    const refilterToo = why !== "act" && why !== "run" && followFilters(m);
    for (const c of st.order) if (JSON.stringify(was.get(c.i)) !== JSON.stringify(st.edits.get(c.i)) && c.lineEl) drawLines(c);
    drawAdded(); drawReveal();
    if (st.meta) render();
    if (refilterToo && st.meta && !st.meta.drafted) refilter();
  }
  shell.gt.on(sync, shell.signal);

  // the run, as the log keeps it: the numbered candidates, each with its place, box, lines and the filters' word on it
  function outputOf() {
    const cands = [...st.order].sort((a, b) => a.i - b.i).map((c) => ({ i: c.i, n: st.numbers.get(c.i), x: c.cx, y: c.cy, bb: c.bb, ...(c.lines ? { lines: c.lines, m: c.m } : {}), fail: st.fails[c.i] ?? null }));
    return { image: imageInfo(), finder: st.meta.finder, finder_settings: st.runOverrides || {}, filters: { values: { ...st.values }, off: [...st.off] }, grid: GRID, numbered: cands.length, cands };
  }
  // Recorded once the filters' word on the candidates is known after a detection, and again when a later answer moves it
  function recordRun() {
    if (!st.meta || st.meta.drafted) return;
    const out = outputOf(), key = filtersKey(out.cands.map((c) => c.fail), out.filters.values, out.filters.off);
    if (key === recorded) return;
    const first = recorded === null;
    recorded = key;
    const output = N.identify(out, shell.gt.model());
    for (const c of output.cands) st.cands[c.i].id = c.id;
    shell.gt.ran({ algorithm: { key: st.meta.finder, params: st.runOverrides || {} }, output });
    if (first) shell.gt.legacy(oldMarks(readJSON, { name: st.fileName, finder: st.meta.finder, output, typical: (x, y) => typicalLines(x, y) }));
  }
  // the log's first entry where no finder has run: the image alone, with no candidate
  function rooted() {
    if (shell.gt.model()) return true;
    shell.gt.base(N.blank(imageInfo(), { finder: shell.algorithm.key }), { note: "the image alone, before Find Candidates" });
    return !!shell.gt.model();
  }
  function edit(c, lines) { act({ type: "set-lines", cand: c.id, lines }); }

  const fmt = (v, d = 2) => (v == null || !isFinite(v) ? "–" : Number(v).toFixed(d));

  function detect() {
    const finder = shell.algorithm.key, overrides = detectOverrides(finder);
    st.running = runKey(); st.runOverrides = overrides; $("#find").disabled = true;
    busy(true, "Finding candidates…");
    shell.call("detect", { finder, overrides });
  }

  function refilter() {
    if (!st.meta || st.meta.drafted) return;
    if (st.inflight) { st.pending = true; return; }
    st.inflight = true;
    shell.call("refilter", { spec: { values: st.values, off: [...st.off] } }, ++st.seq);
  }


  // ---------- candidates ----------
  // Pixel-edge outlines of one segment value inside a candidate's block, as SVG path data in image coordinates.
  function outline(c, blk, val) {
    const { h, w, x0, y0 } = c; let d = "";
    const at = (y, x) => (y >= 0 && y < h && x >= 0 && x < w ? blk[y * w + x] : 0);
    const isv = val === 2 ? (v) => v === 2 || v === 3 : (v) => v === val;
    for (let y = 0; y <= h; y++) { // horizontal edges between rows y-1 and y
      let run = -1;
      for (let x = 0; x <= w; x++) {
        const e = x < w && isv(at(y - 1, x)) !== isv(at(y, x));
        if (e && run < 0) run = x;
        if (!e && run >= 0) { d += `M${x0 + run} ${y0 + y}h${x - run}`; run = -1; }
      }
    }
    for (let x = 0; x <= w; x++) { // vertical edges between columns x-1 and x
      let run = -1;
      for (let y = 0; y <= h; y++) {
        const e = y < h && isv(at(y, x - 1)) !== isv(at(y, x));
        if (e && run < 0) run = y;
        if (!e && run >= 0) { d += `M${x0 + x} ${y0 + run}v${y - run}`; run = -1; }
      }
    }
    return d;
  }

  function onDetected(meta, seg) {
    st.meta = meta; st.seg = seg; st.crops = new Map(); st.sel = null; st.alone = null; st.task = null; st.cur = undefined; st.back = [];
    st.forced = new Map(); st.edits = new Map(); recorded = null;
    for (const id of ["#filters", "#presets"]) $(id).inert = false;
    if (st.filtersFor !== meta.finder) useFilters(meta.finder);
    st.cands = meta.cands.map((c) => {
      const blk = seg.subarray(c.off, c.off + c.h * c.w);
      let ty0 = c.h, tx0 = c.w, ty1 = -1, tx1 = -1;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (blk[y * c.w + x]) {
        if (y < ty0) ty0 = y; if (y > ty1) ty1 = y; if (x < tx0) tx0 = x; if (x > tx1) tx1 = x;
      }
      return { ...c, blk, bb: [c.x0 + tx0, c.y0 + ty0, c.x0 + tx1 + 1, c.y0 + ty1 + 1] };
    });
    // one number per candidate for as long as this detection lasts, top to bottom, whatever the filters do
    st.order = st.cands.filter((c) => c.bb[2] > c.bb[0] && (c.fail0 === null || st.reasons[c.fail0]))
      .sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    st.numbers = new Map(st.order.map((c, k) => [c.i, k + 1]));
    buildOverlay(); drawAdded();
    refilter();
  }

  const el = (tag, attrs = {}) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  function buildOverlay() {
    // its own drawing goes; the shell's layers (the summary's mask) stay
    const svg = $("#overlay"); for (const n of [...svg.children]) if (!n.matches?.("g[data-layer]")) n.remove();
    svg.setAttribute("viewBox", `0 0 ${st.W} ${st.H}`);
    const frag = document.createDocumentFragment();
    for (const c of st.order) {
      const g = el("g", { "data-i": c.i });
      g.append(el("path", { class: "red", d: outline(c, c.blk, 1) }), el("path", { d: outline(c, c.blk, 2) }));
      c.lineEl = el("g", { class: "lines" }); g.append(c.lineEl);
      const t = el("text", { x: c.bb[2] + 0.5, y: c.bb[1] });
      const num = el("tspan", { class: "num" }), let_ = el("tspan", { class: "let", "font-weight": "bold" });
      num.textContent = st.numbers.get(c.i); t.append(num, let_); g.append(t);
      const [a, b, cc, d] = c.bb; g.append(el("rect", { class: "hit", x: a, y: b, width: cc - a, height: d - b }));
      c.el = g; c.text = t; frag.append(g); drawLines(c);
    }
    st.ring = el("circle", { class: "ring" }); st.ring.style.display = "none";
    frag.append(st.ring);
    svg.append(frag);
  }

  // the measuring lines as the user left them: their own length and red lines, else the finder's
  function linesOf(c) {
    if (c.added) return c.lines;
    if (!c.lines) return null;
    const e = st.edits.get(c.i) || {};
    return { ...c.lines, length: e.length || c.lines.length, red: e.red || c.lines.red, width: e.width || c.lines.width };
  }
  function drawLines(c) {
    const L = linesOf(c); c.lineEl.replaceChildren();
    if (!L) return;
    for (const [k, cls] of [["length", ""], ["width", ""], ["red", "r"]]) {
      const [[x1, y1], [x2, y2]] = L[k];
      c.lineEl.append(el("line", { x1, y1, x2, y2, ...(cls ? { class: cls } : {}) }));
    }
  }

  // ---------- added candidates: NoRs the user added where the finder proposed none ----------
  // Each has measuring lines the user corrects on its card, and lists first among the finalists until it is removed. Until the
  // user gives a verdict, a glowing circle marks it on the image. It has an id of its own kind, u1, u2, …, that stays its own.
  // level lines centred on (x, y), as long and wide as this image's finalists' medians
  function typicalLines(x, y) {
    const med = (k) => { const s = stats((st.passes || []).filter((c) => !c.added).map((c) => c.m && c.m[k])); return s.n ? s.med : TYPICAL[k]; };
    const len = med("length"), red = Math.min(len - 2, med("red_length")), w = med("width");
    const level = (a) => [[x - a / 2, y], [x + a / 2, y]];
    return { length: level(len), red: level(red), width: [[x, y - w / 2], [x, y + w / 2]] };
  }
  // an added NoR as a candidate: "u1", "u2", ... in place of a finder's index
  const isAdded = (i) => typeof i === "string";
  function addedCand(k) {
    const a = st.added[k]; if (!a) return null;
    const L = a.lines, pts = [...L.length, ...L.red, ...L.width], [[p, q], [r, t]] = L.length;
    const m = { length: dist(L.length), red_length: dist(L.red), width: dist(L.width) };
    m.red_over_length = m.red_length / m.length; m.length_over_width = m.length / m.width;
    return { i: a.id, id: a.id, k, added: true, lines: L, cx: (p + r) / 2, cy: (q + t) / 2, m, x0: 0, y0: 0, h: 0, w: 0, blk: [],
      bb: [Math.min(...pts.map((v) => v[0])), Math.min(...pts.map((v) => v[1])), Math.max(...pts.map((v) => v[0])), Math.max(...pts.map((v) => v[1]))] };
  }
  const candOf = (i) => (i == null ? null : isAdded(i) ? addedCand(st.added.findIndex((a) => a.id === i)) : st.cands[i]);
  const addedCands = () => st.added.map((_, k) => addedCand(k));
  // a candidate's one number: the finder's top to bottom, then the added NoRs in the order added
  const numOf = (c) => (c.added ? st.order.length + c.k + 1 : st.numbers.get(c.i));
  const nameOf = (c) => "#" + numOf(c);
  function addAdded(x, y) {
    if (!rooted()) return;
    const id = N.nextAdded(shell.gt.model()), r1 = (v) => Math.round(v * 10) / 10, to = [r1(x), r1(y)];
    if (!act({ type: "add", cand: id, to, lines: typicalLines(...to) })) return;
    st.sel = id;
    if (tagging() && st.meta) goTo("c:" + st.sel);
  }
  // thumbing an added NoR down removes it, as its card's Remove does
  function removeAdded(k) {
    const id = st.added[k]?.id;
    if (id == null) return;
    if (st.sel === id) st.sel = null;
    act({ type: "delete", cand: id });
  }
  const radiusOf = (c) => Math.max(MISSING_RADIUS, dist(c.lines.length) / 2 + 4);
  // on the image: the lines, and until the user decides, the circle, glowing
  function drawAdded() {
    const svg = $("#overlay"); svg.querySelector(".added-marks")?.remove();
    gtButton();
    if (!st.W) return;
    svg.setAttribute("viewBox", `0 0 ${st.W} ${st.H}`);
    const g = el("g", { class: "added-marks" });
    for (const c of addedCands()) {
      const v = st.added[c.k].verdict, a = el("g", { "data-i": c.i, class: "added" + (TRUTH ? " " + reviewed(v) : "") });
      const t = el("text", { x: c.cx + radiusOf(c) + 1, y: c.cy - radiusOf(c) }); t.textContent = numOf(c);
      if (!v) a.append(el("circle", { class: "glow", cx: c.cx, cy: c.cy, r: radiusOf(c) }));
      const lines = el("g", { class: "lines" });
      for (const [k, cls] of [["length", ""], ["width", ""], ["red", "r"]]) {
        const [[x1, y1], [x2, y2]] = c.lines[k]; lines.append(el("line", { x1, y1, x2, y2, ...(cls ? { class: cls } : {}) }));
      }
      a.append(lines, t, el("circle", { class: "hit", cx: c.cx, cy: c.cy, r: radiusOf(c) }));
      g.append(a);
    }
    svg.append(g);
    if (st.view === "items" && st.meta) renderList();
    renderTasks();
  }
  // right-clicking the image offers to add a NoR there, or to remove the added one under the pointer
  {
    const menu = $("#ctx");
    const close = () => { menu.hidden = true; };
    $("#scroller").addEventListener("contextmenu", (e) => {
      if (!st.img) return;
      const [x, y] = shell.viewer.toImage(e);
      if (x < 0 || y < 0 || x > st.W || y > st.H) return;
      e.preventDefault();
      const k = addedCands().findIndex((c) => Math.hypot(c.cx - x, c.cy - y) <= radiusOf(c));
      const b = menu.querySelector("button");
      b.textContent = k < 0 ? "Add a NoR Here" : `Remove Added NoR #${numOf(addedCand(k))}`;
      b.onclick = () => { close(); k < 0 ? addAdded(x, y) : removeAdded(k); };
      menu.hidden = false;
      menu.style.left = Math.min(e.clientX, innerWidth - menu.offsetWidth - 4) + "px";
      menu.style.top = Math.min(e.clientY, innerHeight - menu.offsetHeight - 4) + "px";
      b.focus();
    }, here);
    document.addEventListener("pointerdown", (e) => { if (!menu.contains(e.target)) close(); }, here);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); }, here);
    $("#scroller").addEventListener("scroll", close, here);
  }

  // the result shown for candidate i: null = pass, else a failure reason
  function result(i) {
    if (isAdded(i)) return null;
    const f = st.forced.get(i);
    if (f === "in") return null;
    if (f === "out") return BY_YOU;
    return st.fails[i];
  }
  const reasonOf = (k) => (k === BY_YOU ? { letter: "X", color: [255, 255, 255], title: "By you", text: "Rejected by you" } : st.reasons[k]);
  const colour = (k) => `rgb(${reasonOf(k).color})`;
  // every reason a rejected candidate has: the finder's own, or each filter that rejects it by itself
  function whyAll(c) {
    const r = result(c.i);
    if (r === BY_YOU || r === null) return r === null ? [] : [BY_YOU];
    if (c.fail0) return [c.fail0];
    const all = (st.alone && st.alone.fails[c.i]) || [];
    const on = all.filter((k) => !st.off.has(k));
    return on.length ? on : [r];
  }

  // ---------- measurements ----------
  const unitName = () => (st.um ? "µm" : "px");
  const dist = ([[a, b], [c, d]]) => Math.hypot(c - a, d - b);
  // the numbers behind the table, in pixels, with the user's lengths where they set them
  function measuresPx(c) {
    if (!c.m) return {};
    const e = st.edits.get(c.i) || {}, m = { ...c.m };
    if (e.length) m.length = dist(e.length);
    if (e.red) m.red_length = dist(e.red);
    if (e.width) m.width = dist(e.width);
    if (e.length || e.red || e.width) { m.red_over_length = m.red_length / m.length; m.length_over_width = m.length / m.width; }
    return m;
  }
  function measures(c) {
    const f = st.um || 1, m = measuresPx(c);
    return MEASURES.map(([k, label, scaled]) => [label + (scaled ? ` (${unitName()})` : ""), m[k] == null ? null : scaled ? m[k] * f : m[k]]);
  }
  const measured = (c) => { if (c.added) return "adjusted"; const e = st.edits.get(c.i) || {}; return e.length || e.red || e.width ? "adjusted" : e.approved ? "approved" : null; };

  // ---------- controls ----------
  // a small ? beside a setting; hovering or focusing it shows what the setting does
  const helpIcon = (name) => {
    const t = st.help && st.help[name];
    return t ? `<span class="help" tabindex="0" role="note" aria-label="${esc(t)}" data-help="${esc(t)}">?</span>` : "";
  };
  function paramRange(name, v) {
    if (/opposite|axis_dev|deg|cone/.test(name)) return [0, 180, 1];
    if (v < 1) return [0, 1, 0.01];
    const max = Math.ceil(v * 3); return [0, max, Number.isInteger(v) ? 1 : max / 300];
  }
  // one setting's control, the same for the finder and the filters: its name, and for a number a slider
  // and a box; away from our value it is marked, with our value as a tick on the slider that puts it back
  function dial(name, def, value, onset) {
    const kind = typeof def === "boolean" ? "bool" : typeof def === "number" ? "number" : "text";
    const p = document.createElement("div"); p.className = "param " + kind; p.dataset.name = name;
    let slider = "";
    if (kind === "number") {
      const [lo, hi, step] = paramRange(name, def), at = Math.min(1, Math.max(0, (def - lo) / (hi - lo)));
      slider = `<div class="slide"><input type="range" min="${lo}" max="${hi}" step="${step}"><button type="button" class="ours" style="--at:${at}"
        title="Ours: ${def}. Click to go back to it" aria-label="Back to ours, ${def}"></button></div>`;
    }
    const box = kind === "bool" ? '<input type="checkbox">' : kind === "number" ? '<input type="number" step="any" class="box">' : '<input type="text" class="box">';
    p.innerHTML = `<span class="name">${name} ${helpIcon(name)}</span>${slider}${box}`;
    const range = p.querySelector('input[type="range"]'), inp = p.querySelector(".box, input[type=checkbox]");
    p.set = (v) => {
      if (kind === "bool") inp.checked = v; else inp.value = kind === "text" ? JSON.stringify(v) : v;
      if (range) range.value = v;
      p.classList.toggle("changed", JSON.stringify(v) !== JSON.stringify(def));
    };
    const take = (raw) => {
      let v;
      try { v = kind === "bool" ? raw : kind === "number" ? parseFloat(raw) : JSON.parse(raw); } catch { return; }
      if (kind === "number" && !isFinite(v)) return;
      if (range) range.value = v; if (kind === "number" && document.activeElement !== inp) inp.value = v;
      p.classList.toggle("changed", JSON.stringify(v) !== JSON.stringify(def));
      onset(v);
    };
    inp.oninput = inp.onchange = () => take(kind === "bool" ? inp.checked : inp.value);
    if (range) range.oninput = () => { inp.value = range.value; take(range.value); };
    if (range) p.querySelector(".ours").onclick = () => { p.set(def); onset(def); };
    p.set(value);
    return p;
  }
  // the filters and their values for a finder: our numbers, overlaid with what this browser saved
  function useFilters(finder) {
    const about = st.about[finder], saved = loadSaved();
    st.filtersFor = finder; st.filters = about.filters; st.reasons = about.reasons;
    st.defaults = {}; st.values = {};
    for (const f of about.filters) for (const [k, v] of Object.entries(f.params)) st.defaults[k] = v;
    for (const k in st.defaults) st.values[k] = k in saved.values ? saved.values[k] : st.defaults[k];
    st.off = new Set(saved.off.filter((k) => about.filters.some((f) => f.key === k)));
    buildFilters(); buildPresets();
  }

  function buildFilters() {
    const box = $("#filters"); box.innerHTML = "";
    for (const f of st.filters) {
      const d = document.createElement("div"); d.className = "filter"; d.dataset.key = f.key;
      d.innerHTML = `<label class="top"><input type="checkbox" ${st.off.has(f.key) ? "" : "checked"}>
        <span class="badge" style="--c:${colour(f.key)}">${f.letter}</span><span class="title">${esc(f.title)}</span>
        <span class="n" title="X (Y): what this filter rejects&#10;X: candidates that pass every other filter that is on and fail only this one, so switching it off lets them through.&#10;Y: every candidate that fails this filter, whatever the others say."></span></label><div class="desc">${esc(f.text)}</div>`;
      d.querySelector("input").onchange = (e) => {
        e.target.checked ? st.off.delete(f.key) : st.off.add(f.key); d.classList.toggle("off", !e.target.checked); save(); refilter();
      };
      d.classList.toggle("off", st.off.has(f.key));
      for (const name of Object.keys(f.params)) {
        d.append(dial(name, st.defaults[name], st.values[name], (v) => {
          st.values[name] = v;
          document.querySelectorAll(`#filters .param[data-name="${name}"]`).forEach((o) => { if (!o.contains(document.activeElement)) o.set(v); });
          save(); refilter();
        }));
      }
      box.append(d);
    }
  }
  // the filters already on show take st.values and st.off as they are, nothing rebuilt
  function showFilterValues() {
    for (const d of $("#filters").children) {
      const on = !st.off.has(d.dataset.key);
      d.querySelector(".top input").checked = on; d.classList.toggle("off", !on);
    }
    for (const p of document.querySelectorAll("#filters .param")) p.set(st.values[p.dataset.name]);
  }

  // the finder's settings: its main ones on show, every one under Advanced; both edit the same values
  function buildDetect() {
    const finder = shell.algorithm.key, about = st.about[finder];
    const defs = about.detection_params, vals = (st.detectValues[finder] ||= { ...defs });
    const row = (k) => dial(k, defs[k], vals[k], (v) => {
      vals[k] = v;
      document.querySelectorAll(`#main-params .param[data-name="${k}"], #detect-params .param[data-name="${k}"]`).forEach((o) => { if (!o.contains(document.activeElement)) o.set(v); });
      updateFind();
    });
    $("#main-params").replaceChildren(...about.main_params.map(row));
    $("#detect-params").replaceChildren(...Object.keys(defs).map(row));
    updateFind();
  }

  function detectOverrides(finder) {
    const o = {}, defs = st.about[finder].detection_params;
    for (const [k, v] of Object.entries(st.detectValues[finder] || {})) if (JSON.stringify(v) !== JSON.stringify(defs[k])) o[k] = v;
    return o;
  }
  const runKey = () => JSON.stringify([shell.algorithm.key, detectOverrides(shell.algorithm.key)]);
  function updateFind() {
    const finder = shell.algorithm.key; if (!st.about?.[finder]) return;
    const o = detectOverrides(finder);
    $("#reset-detect").disabled = !Object.keys(o).length;
    $("#find").disabled = !st.img || !!st.running;
    steps();
  }
  // the study's steps in the status bar: Run algorithm is done while the image was searched with the finder and
  // settings now chosen (Find Candidates shines until then), Review all items while the Submit Ground Truth button
  // says the ground truth is complete, so the crumb never moves on while the button says it cannot
  function steps() {
    const ran = !!st.meta && runKey() === st.lastRun, finalists = (st.passes || []).filter((c) => !c.added);
    const name = shell.algorithm.title;
    shell.step("find", ran, ran ? `${name}: ${st.order.length} candidates, ${finalists.length} finalists` : st.lastRun ? "The finder or its settings changed since the last run." : "");
    shell.boxDone($("#finder-box"), ran ? `${name} executed` : null);
    const gt = gtState(), left = gt.items.filter((t) => t.grade && !t.ok).map((t) => t.text + ".");
    shell.step("review", ran && gt.state === "done", left.length ? left.join(" ") : "Every finalist has your verdict.");
  }

  // ---------- drawing ----------
  function render() {
    const passes = [], rejects = [];
    for (const c of st.order) {
      const r = result(c.i), cls = r === null ? "pass" : "fail";
      c.el.setAttribute("class", cls + (st.forced.has(c.i) ? " forced" : "") + (TRUTH ? " " + reviewed(st.forced.get(c.i)) : ""));
      const let_ = c.text.lastChild;
      if (r === null) { let_.textContent = ""; passes.push(c); }
      else { const R = reasonOf(r); let_.textContent = R.letter; let_.setAttribute("fill", `rgb(${R.color})`); rejects.push(c); }
    }
    for (const c of addedCands()) (result(c.i) === null ? passes : rejects).push(c);
    st.passes = passes; st.rejects = rejects;
    document.querySelectorAll(".filter").forEach((d) => {
      const k = d.dataset.key;
      d.querySelector(".n").innerHTML = st.alone ? `${THUMB} ${st.alone.only[k] ?? 0} (${st.alone.counts[k] ?? 0})` : "";
    });
    $("#n-pass").textContent = passes.length; $("#n-fail").textContent = rejects.length;
    if (st.view === "items") renderList();
    renderSummary(); renderSelected(); placeRing(); downloads(true); renderTasks();
  }

  // ---------- cards: one per candidate, in the item views and as the selection ----------
  // The crop, turned so the NoR lies level when "align to horizon" is on, with its outlines, bars and
  // length handles drawn over it. Cached until the options or the candidate's lengths change.
  function crop(c, size) {
    const o = optsOf(c), key = JSON.stringify([size, o, (c.added ? c.lines : st.edits.get(c.i)) || null, st.show.passC, st.show.failC, result(c.i) === null]);
    const hit = st.crops.get(c.i + "|" + size);
    if (hit && hit.key === key) return hit.node;
    const L = linesOf(c), pad = o.pad;
    let th = 0, cx = (c.bb[0] + c.bb[2]) / 2, cy = (c.bb[1] + c.bb[3]) / 2;
    if (L) {
      const [[a, b], [p, q]] = L.length; cx = (a + p) / 2; cy = (b + q) / 2;
      if (o.align) { th = Math.atan2(q - b, p - a); if (Math.cos(th) < 0) th += Math.PI; }
    }
    const ax = [Math.cos(th), Math.sin(th)], nv = [-Math.sin(th), Math.cos(th)];
    const toUV = ([x, y]) => [(x - cx) * ax[0] + (y - cy) * ax[1], (x - cx) * nv[0] + (y - cy) * nv[1]];
    const toXY = ([u, v]) => [cx + u * ax[0] + v * nv[0], cy + u * ax[1] + v * nv[1]];
    // extent: every pixel of the candidate, and its lines
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    const take = (p) => { const [u, v] = toUV(p); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); };
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.blk[y * c.w + x]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) take([c.x0 + x + dx, c.y0 + y + dy]);
    if (!c.blk.length) for (const p of [[c.bb[0], c.bb[1]], [c.bb[2], c.bb[1]], [c.bb[0], c.bb[3]], [c.bb[2], c.bb[3]]]) take(p);
    if (L) for (const k of ["length", "red", "width"]) L[k].forEach(take);
    u0 -= pad; u1 += pad; v0 -= pad; v1 += pad;
    const uw = u1 - u0, vw = v1 - v0, s = Math.max(2, Math.min(size / 10, size / Math.max(uw, vw))), dpr = devicePixelRatio || 1;
    const cv = document.createElement("canvas"); cv.width = Math.round(uw * s * dpr); cv.height = Math.round(vw * s * dpr);
    cv.style.width = uw * s + "px";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0); ctx.translate(-u0, -v0);
    ctx.transform(ax[0], nv[0], ax[1], nv[1], 0, 0); ctx.translate(-cx, -cy);
    const R = Math.ceil(Math.hypot(uw, vw) / 2) + 2, sx = Math.max(0, Math.floor(cx - R)), sy = Math.max(0, Math.floor(cy - R));
    const sw = Math.min(st.W, Math.ceil(cx + R)) - sx, sh = Math.min(st.H, Math.ceil(cy + R)) - sy;
    ctx.drawImage(st.plain, sx, sy, sw, sh, sx, sy, sw, sh);
    if (o.borders) {
      ctx.lineWidth = 1 / s; ctx.strokeStyle = result(c.i) === null ? st.show.passC : st.show.failC;
      for (const [val, alpha] of [[1, 0.5], [2, 0.7]]) { ctx.globalAlpha = alpha; ctx.stroke(new Path2D(outline(c, c.blk, val))); }
      ctx.globalAlpha = 1;
    }
    const node = document.createElement("div"); node.className = "crop"; node.append(cv);
    if (L && (o.bars || o.lenImg || o.adjust)) node.append(cropMarks(c, L, { s, u0, v0, uw, vw, toUV, toXY, ax }));
    st.crops.set(c.i + "|" + size, { key, node }); return node;
  }

  // The measuring lines after a handle (line k, end j) is dragged to P. The two green ends and the two red
  // ends stay on one straight axis, in order and at least a pixel apart. A red end only slides along it. A
  // green end turns the axis, through P, about the other green end, and every other point keeps its
  // distance from that end.
  // A width end sets where along the axis the width is measured and, mirrored across the axis, how wide.
  function dragLines(L, k, j, P) {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    const at = (o, u, s) => [o[0] + s * u[0], o[1] + s * u[1]], unit = (a) => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n]; };
    const mid = ([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const [A, B] = L.length, u = unit(sub(B, A)), n = [-u[1], u[0]], len = Math.hypot(...sub(B, A));
    const wc = mid(L.width), hw = Math.hypot(...sub(L.width[1], L.width[0])) / 2, side = Math.sign(dot(sub(L.width[0], wc), n)) || 1;
    if (k === "width") {
      const s = Math.max(0, Math.min(len, dot(sub(P, A), u))), off = dot(sub(P, A), n), c = at(A, u, s);
      const w = Math.max(0.5, Math.abs(off)), sg = Math.sign(off) || 1, out = [at(c, n, sg * w), at(c, n, -sg * w)];
      return { ...L, width: j === 0 ? out : [out[1], out[0]] };
    }
    // the turning end, and the distance of each point from it along the axis
    const piv = k === "length" ? 1 - j : dot(sub(L.red[j], A), u) < len / 2 ? 1 : 0;
    const O = L.length[piv], v = unit(sub(L.length[1 - piv], O)), d = (p) => dot(sub(p, O), v);
    const pts = [["length", 1 - piv, len], ["red", 0, d(L.red[0])], ["red", 1, d(L.red[1])]].sort((a, b) => a[2] - b[2]);
    const me = pts.findIndex(([kk, jj]) => kk === k && jj === j);
    const lo = me > 0 ? pts[me - 1][2] + 1 : 1, hi = me < pts.length - 1 ? pts[me + 1][2] - 1 : Infinity;
    const nv = k === "red" ? v : unit(sub(P, O)), nn = [-nv[1] * Math.sign(dot(n, [-v[1], v[0]])), nv[0] * Math.sign(dot(n, [-v[1], v[0]]))];
    pts[me][2] = Math.max(lo, Math.min(hi, k === "red" ? d(P) : Math.hypot(...sub(P, O))));
    const out = { length: [[...A], [...B]], red: [[...L.red[0]], [...L.red[1]]] };
    for (const [kk, jj, s] of pts) out[kk][jj] = at(O, nv, s);
    out.length[piv] = [...O];
    const far = pts.find(([kk]) => kk === "length")[2], ws = Math.max(0, Math.min(far, d(wc))), c = at(O, nv, ws);
    return { ...L, ...out, width: [at(c, nn, side * hw), at(c, nn, -side * hw)] };
  }

  // bars, length labels and draggable ends over a crop, in its own turned coordinates
  function cropMarks(c, L, g) {
    const o = optsOf(c), f = st.um || 1, svg = el("svg", { class: "marks", viewBox: `${g.u0} ${g.v0} ${g.uw} ${g.vw}`, width: g.uw * g.s, height: g.vw * g.s });
    const px = 1 / g.s, line = (k, cls) => { const [[a, b], [p, q]] = L[k].map(g.toUV); return el("line", { x1: a, y1: b, x2: p, y2: q, class: cls }); };
    const draw = () => {
      svg.replaceChildren();
      if (o.bars) svg.append(line("length", "bar"), line("width", "bar"), line("red", "bar r"));
      if (o.lenImg) {
        for (const [k, cls, dy] of [["length", "", -5], ["red", "r", 11]]) {
          const [[a, b], [p, q]] = L[k].map(g.toUV), t = el("text", { x: (a + p) / 2, y: Math.min(b, q) + dy * px, class: cls, "font-size": 10 * px, "stroke-width": 2 * px });
          t.textContent = fmt(dist(L[k]) * f, 1); svg.append(t);
        }
      }
      if (o.adjust && (TRUTH || result(c.i) === null)) for (const k of ["length", "red", "width"]) L[k].forEach((p, j) => {
        const [u, v] = g.toUV(p), h = el("circle", { cx: u, cy: v, r: 4 * px, class: "handle" + (k === "red" ? " r" : k === "width" ? " w" : ""), "stroke-width": px });
        h.dataset.k = k; h.dataset.j = j; svg.append(h);
      });
    };
    draw();
    // a handle goes wherever it is dragged; the result is kept in image coordinates
    svg.addEventListener("pointerdown", (e) => {
      const h = e.target.closest(".handle"); if (!h) return;
      e.preventDefault(); e.stopPropagation();
      const k = h.dataset.k, j = +h.dataset.j, from = L;
      const move = (ev) => {
        const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const q = pt.matrixTransform(svg.getScreenCTM().inverse());
        L = dragLines(from, k, j, g.toXY([q.x, q.y])); draw();
      };
      const drop = () => {
        if (L === from) return;
        // only the lines that moved are the action's
        const r2 = (seg) => seg.map((p) => p.map((v) => Math.round(v * 100) / 100)), moved = {};
        for (const k of ["length", "red", "width"]) if (JSON.stringify(r2(L[k])) !== JSON.stringify(r2(from[k]))) moved[k] = r2(L[k]);
        if (Object.keys(moved).length) edit(c, moved);
      };
      shell.drag(svg, e, { move, drop, cancel: () => { L = from; draw(); } });
    });
    return svg;
  }

  // thumbs up and down (paths from Lucide, ISC licence): the user's own verdict on a candidate
  const THUMB = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`;
  // user-plus (Lucide, ISC licence): a NoR the user added
  const ADD_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>`;
  // settings (Lucide, ISC licence)
  const COG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const GOTO = `<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" class="dot"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></svg>`;
  function card(c, where) {
    const r = result(c.i), f = verdictOf(c), d = document.createElement("div");
    d.className = "card " + (r === null ? "pass" : "fail") + (f === "in" ? " approved" : f === "out" ? " byyou" : "") + (c.added ? " added" : "") +
      (where === "list" && c.i === st.sel ? " selected" : "");
    d.dataset.i = c.i;
    const state = r === null ? "Finalist" : "Rejected";
    const num = c.added ? `<span class="num added" title="Added by you" aria-label="Added by you, #${numOf(c)}">${ADD_ICON}#${numOf(c)}</span>` : `<span class="num">#${numOf(c)}</span>`;
    d.innerHTML = `<div class="head">${num}<span class="state">${state}</span>
      <span class="verdict" role="group" aria-label="Your verdict"></span></div>`;
    const acts = d.querySelector(".verdict");
    const btn = (cls, on, title, fn) => {
      const b = document.createElement("button"); b.type = "button"; b.className = cls + (on ? " on" : ""); b.innerHTML = THUMB;
      b.title = title; b.setAttribute("aria-label", title); b.setAttribute("aria-pressed", on);
      // on a task's card, a verdict moves on to the task's next candidate
      b.onclick = (e) => { e.stopPropagation(); st.sel = c.i; fn(); if (where === "task" && verdictOf(c)) moveOn(); }; acts.append(b);
    };
    const say = (v) => decide(c.i, v);
    btn("up", f === "in", f === "in" ? "You said this is a NoR. Click to undo" : "A NoR: keep it, with its lengths as shown (saved as ground truth)",
      () => say(f === "in" ? null : "approve"));
    btn("down", f === "out", f === "out" ? "You said this is not a NoR. Click to let the filters decide again" : c.added ? "Not a NoR: remove it" : "Not a NoR: reject it (saved as ground truth)",
      () => say(f === "out" ? null : "reject"));
    if (c.added) {
      acts.insertAdjacentHTML("beforeend", `<button type="button" class="remove" title="Remove this NoR you added" aria-label="Remove this NoR you added">×</button>`);
      acts.lastChild.onclick = (e) => { e.stopPropagation(); removeAdded(c.k); };
    }
    if (where === "list") {
      d.onclick = () => select(c.i);
      d.ondblclick = (e) => { if (!e.target.closest("button, .handle")) { getSelection().removeAllRanges(); show(); } };
    }
    const wrap = document.createElement("div"); wrap.className = "crop-wrap";
    // a task's crop takes the box's whole width
    wrap.append(crop(c, where === "list" ? 170 : where === "task" ? Math.max(160, Math.round($("#gt-tasks").clientWidth || 280)) : 320));
    const show = () => { select(c.i); showView("image"); focusOn(c); };
    if (where !== "task") {
      wrap.insertAdjacentHTML("beforeend", `<button class="goto" title="Show it on the image" aria-label="Show it on the image">${GOTO}</button>`);
      wrap.querySelector(".goto").onclick = show;
    }
    d.append(wrap);
    const e = st.edits.get(c.i) || {};
    // on a task's card, the task says what is measured: a button alone puts the finder's lengths back
    if (e.length || e.red || e.width) {
      d.insertAdjacentHTML("beforeend", where === "task" ? `<button class="link reset-lines" type="button">Reset measurements</button>`
        : `<div class="tag">Lengths adjusted <button class="link">reset</button></div>`);
      d.querySelector(".reset-lines, .tag button").onclick = () => edit(c, null);
    }
    // a task's card: the crop, the thumbs under it; no number or state
    if (where === "task") {
      const row = document.createElement("div"), side = document.createElement("div");
      row.className = "task-row"; side.className = "side"; side.append(acts);
      d.querySelector(".head").remove(); row.append(wrap, side); d.prepend(row); d.classList.add("task");
    }
    if (r !== null) d.insertAdjacentHTML("beforeend", `<div class="why">${whyAll(c).map((k) => `<span><b class="lt" style="--c:${colour(k)}">${reasonOf(k).letter}</b> ${esc(reasonOf(k).title)}</span>`).join("")}</div>`);
    if (optsOf(c).lenCard && c.m) {
      const t = document.createElement("table");
      t.innerHTML = measures(c).map(([l, v]) => `<tr><td>${l}</td><td>${fmt(v)}</td></tr>`).join("");
      d.append(t);
    }
    return d;
  }

  // ---------- the item views' order ----------
  const SORTS = [["number", "By number"], ["verified-first", "Verified first"], ["verified-last", "Verified last"], ["filters", "Most filters first", "fail"]];
  const verified = (c) => !!verdictOf(c);
  // the cards of the view on show, in its chosen order; ties go by number
  function listed() {
    const items = [...((st.tab === "pass" ? st.passes : st.rejects) || [])], how = st.sort[st.tab];
    const key = how === "verified-first" ? (c) => -verified(c) : how === "verified-last" ? (c) => +verified(c) : how === "filters" ? (c) => -whyAll(c).length : () => 0;
    return items.map((c) => [key(c), numOf(c), c]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, , c]) => c);
  }
  function showSort() {
    const s = $("#sort");
    s.replaceChildren(...SORTS.filter(([, , only]) => !only || only === st.tab).map(([v, t]) => new Option(t, v)));
    s.value = st.sort[st.tab];
    if (!s.value) s.value = st.sort[st.tab] = "number";
  }
  $("#sort").onchange = () => { st.sort[st.tab] = $("#sort").value; writeJSON(SORT, st.sort); if (st.meta) renderList(); };
  showSort();

  // Every card takes its place in the list at once, but as an empty outline the height its card last had;
  // those in view and two rows past it are drawn, each batch the observer reports in one go, as scrolling
  // brings them near. Cards drawn a moment ago near the view are drawn at once when the list is redrawn.
  const lazy = { seen: null, near: new Set(), tall: new Map(), of: new WeakMap() };
  function renderList() {
    lazy.seen?.disconnect();
    const items = listed(), near = lazy.near; lazy.near = new Set();
    if (!items.length) {
      $("#list").innerHTML = `<p class="dim">${st.tab === "pass" ? "No finalists. Right-click the image to add a NoR the finder missed." : "Nothing rejected."}</p>`;
      return;
    }
    const known = [...lazy.tall.values()], guess = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 230;
    const gap = parseFloat(getComputedStyle($("#list")).rowGap) || 0;
    lazy.seen = new IntersectionObserver(drawNear, { root: $("#items-view"), rootMargin: `${Math.round(2 * (guess + gap))}px 0px` });
    const nodes = items.map((c) => {
      if (near.has(String(c.i))) return card(c, "list");
      const d = document.createElement("div");
      d.className = "card stub" + (c.i === st.sel ? " selected" : ""); d.dataset.i = c.i;
      d.style.height = (lazy.tall.get(String(c.i)) ?? guess) + "px"; lazy.of.set(d, c);
      return d;
    });
    $("#list").replaceChildren(...nodes);
    for (const d of nodes) lazy.seen.observe(d);
  }
  function drawNear(entries) {
    const made = [];
    for (const e of entries) {
      const i = e.target.dataset.i;
      if (!e.isIntersecting) { lazy.near.delete(i); continue; }
      lazy.near.add(i);
      const c = lazy.of.get(e.target);
      if (!c || !e.target.isConnected) continue;
      const d = card(c, "list");
      lazy.seen.unobserve(e.target); e.target.replaceWith(d); lazy.seen.observe(d); made.push(d);
    }
    for (const d of made) lazy.tall.set(d.dataset.i, d.offsetHeight);
  }

  // ---------- selection ----------
  function select(i) {
    st.sel = i; renderSelected(); placeRing();
    document.querySelectorAll("#list .card").forEach((d) => d.classList.toggle("selected", d.dataset.i === String(i)));
  }
  // in the item views, the selected candidate's card is brought into sight, on the tab that lists it
  function revealSelected(block) {
    if (st.sel == null || !st.meta || !candOf(st.sel)) return;
    const t = result(st.sel) === null ? "pass" : "fail";
    if (t !== st.tab) { setTab(t); renderList(); }
    const d = $(`#list .card[data-i="${st.sel}"]`);
    if (d) d.scrollIntoView({ block, behavior: block === "center" ? "auto" : "smooth" });
  }
  // the selected candidate's card over the image's corner, shown only while one is selected, its previous and
  // next buttons over the bottom of its crop
  function renderSelected() {
    const c = TRUTH ? null : candOf(st.sel);
    $("#selected-box").hidden = !c;
    $("#selected-box").append($("#sel-step")); // out of the card it is in before that card goes
    $("#selected").replaceChildren(...(c ? [card(c, "selected")] : []));
    if (c) $("#selected .crop-wrap").append($("#sel-step"));
    $("#sel-prev").disabled = $("#sel-next").disabled = !st.order.length && !st.added.length;
  }
  function placeRing() {
    if (!st.ring) return;
    const c = TRUTH && !tagging() ? null : candOf(st.sel);
    st.ring.style.display = c ? "" : "none";
    if (!c) return;
    const [a, b, cc, d] = c.bb;
    st.ring.setAttribute("cx", (a + cc) / 2); st.ring.setAttribute("cy", (b + d) / 2);
    st.ring.setAttribute("r", Math.hypot(cc - a, d - b) / 2 + 4 / st.zoom);
  }
  // the next candidate by number among those on show
  // (in the item views: among the cards on show)
  function step(dir) {
    if (TRUTH) return tagging() && (dir > 0 ? $("#task-skip").click() : $("#task-back").click());
    const list = st.view === "items" ? listed()
      : [...addedCands(), ...st.order].filter((c) => (result(c.i) === null ? st.show.pass : st.show.fails));
    if (!list.length) return;
    const k = list.findIndex((c) => c.i === st.sel);
    const c = list[k < 0 ? (dir > 0 ? 0 : list.length - 1) : (k + dir + list.length) % list.length];
    select(c.i); if (st.view === "image") focusOn(c); else revealSelected("nearest");
  }
  $("#sel-prev").onclick = () => step(-1);
  $("#sel-next").onclick = () => step(1);

  function stats(xs) {
    const v = xs.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b), n = v.length;
    if (!n) return { n };
    const mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1));
    const med = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
    return { n, mean, sd, med, min: v[0], max: v[n - 1], v };
  }

  // a histogram with a count axis, the mean as a line and one SD either side of it as a band
  function hist(label, s) {
    const W = 300, H = 70, L = 24, T = 6, bins = 20;
    if (!s.n) return "";
    const lo = s.min, hi = s.max === s.min ? s.min + 1 : s.max, cnt = new Array(bins).fill(0);
    for (const x of s.v) cnt[Math.min(bins - 1, Math.floor(((x - lo) / (hi - lo)) * bins))]++;
    const top = Math.max(...cnt), bw = W / bins, X = (v) => L + Math.min(W, Math.max(0, ((v - lo) / (hi - lo)) * W)), Y = (c) => T + H - (c / top) * H;
    const ticks = [...new Set([0, Math.round(top / 2), top])];
    const axis = ticks.map((t) => `<line class="grid" x1="${L}" x2="${L + W}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L - 4}" y="${Y(t) + 3}" text-anchor="end">${t}</text>`).join("");
    const bars = cnt.map((c, k) => `<rect class="bar" x="${L + k * bw + 0.5}" y="${Y(c)}" width="${bw - 1}" height="${T + H - Y(c)}"><title>${c}</title></rect>`).join("");
    const sd = s.sd || 0, band = `<rect class="sd" x="${X(s.mean - sd)}" y="${T}" width="${X(s.mean + sd) - X(s.mean - sd)}" height="${H}"/>`;
    return `<div class="hist"><div>${label}: mean <b>${fmt(s.mean)}</b> ± ${fmt(sd)} SD, n ${s.n}</div><svg viewBox="0 0 ${L + W + 2} ${T + H + 14}">
      ${axis}${band}<g>${bars}</g><line class="mean" x1="${X(s.mean)}" x2="${X(s.mean)}" y1="${T}" y2="${T + H}"/>
      <text x="${L}" y="${T + H + 12}">${fmt(lo)}</text><text x="${L + W}" y="${T + H + 12}" text-anchor="end">${fmt(hi)}</text></svg></div>`;
  }

  function summaryRows(passes) {
    return MEASURES.map((_, k) => [measures(passes[0] || { m: {} })[k][0], stats(passes.map((c) => measures(c)[k][1]))]);
  }
  // what the summary and the CSVs count: the finalists and the rejected whose centre is inside the mask
  function counted() {
    const passes = st.passes.filter(inMask), counts = {};
    for (const c of st.rejects) if (inMask(c)) { const r = result(c.i); counts[r] = (counts[r] || 0) + 1; }
    return { passes, counts };
  }
  function renderSummary() {
    if (!st.passes) return;
    const { passes, counts } = counted(), rows = summaryRows(passes);
    st.counts = counts;
    const scale = st.um ? `Pixel size: ${st.um.toFixed(4)} µm.` : "No scale in the file, so lengths are in pixels.";
    const D = density(passes.length);
    $("#summary").classList.remove("dim");
    $("#summary").innerHTML = `<div>${passes.length} NoRs${st.mask.length ? " inside the mask" : ""}. ${scale}</div>
      <div class="density">Density: <b>${fmt(D.value, 0)}</b> ${D.unit} (${passes.length} in ${fmt(D.area, 4)} ${D.areaUnit})</div>
      <div class="hists">${rows.map(([l, s]) => hist(l, s)).join("")}</div>`;
    // the summary as the shell's Download Summary saves it (req/shell/summary/download)
    shell.summary.set({ over: st.mask.length ? `a mask of ${st.mask.length} lassoed area${st.mask.length === 1 ? "" : "s"}` : "the whole image", rows: [
      { measurement: "Finalists", unit: "count", value: passes.length },
      { measurement: "Density", unit: D.unit, value: D.value },
      { measurement: "Area counted", unit: D.areaUnit, value: D.area },
      ...rows.map(([, s], k) => ({ measurement: MEASURES[k][1], unit: MEASURES[k][2] ? unitName() : "ratio", n: s.n, mean: s.mean, sd: s.sd, median: s.med, min: s.min, max: s.max })),
      ...Object.entries(counts).map(([k, n]) => ({ measurement: `Rejected: ${reasonOf(k).letter} ${reasonOf(k).title}`, unit: "count", value: n }))] });
  }

  // ---------- downloads ----------
  function downloads(on) {
    $("#dl-cands").disabled = !on || !st.meta;
    if (!on) shell.summary.set(null);
    gtButton();
  }
  const base = () => st.fileName.replace(/\.[^.]+$/, "") || "nors";
  const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const csv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\n");
  $("#dl-cands").onclick = () => {
    const u = st.um ? "um" : "px";
    const head = ["n", "x_px", "y_px", "status", "reason", "rejected_by", "decision", "lengths", ...MEASURES.map(([k, , s]) => (s ? `${k}_${u}` : k))];
    const rows = [...addedCands(), ...st.order].filter(inMask).map((c) => {
      const r = result(c.i), f = verdictOf(c);
      return [numOf(c), fmt(c.cx, 1), fmt(c.cy, 1), r === null ? "finalist" : "rejected", r === null ? "" : reasonOf(r).title,
        whyAll(c).map((k) => reasonOf(k).letter).join(" "), { in: "approved", out: "rejected by you" }[f] || (c.added ? "added by you" : ""), measured(c) || "",
        ...measures(c).map(([, v]) => fmt(v, 3))];
    });
    saveFile(base() + "_candidates.csv", csv([head, ...rows]), "text/csv");
  };
  // How finished the user's ground truth is, as a checklist of every issue it can have, each resolved or not
  // (the graded ones set the button's state):
  // "done" when every finalist has a verdict, "part" when some candidates have one but a finalist does not,
  // "todo" when none has one yet or an added NoR still waits for one
  function gtState() {
    const verdict = verdictOf;
    const waiting = st.added.filter((a) => !a.verdict).length, voted = st.forced.size + st.added.length - waiting;
    const finalists = TRUTH ? taskItems("pass") : (st.passes || []).filter((c) => !c.added), open = finalists.filter((c) => !verdict(c)).length;
    const rejected = TRUTH ? taskItems("fail") : [], left = rejected.filter((c) => !verdict(c)).length;
    const local = !shell.remote.owns(st.source), s = (n) => (n === 1 ? "" : "s");
    // instructions to the user, crossed out once done; the added NoRs show only when there are any
    const items = [
      st.added.length && { level: "error", grade: true, ok: !waiting, text: waiting ? `Approve or reject the ${waiting} NoR${s(waiting)} you added` : "Approve or reject the NoRs you added" },
      { level: "error", grade: true, ok: voted > 0, text: "Vote on at least one candidate" },
      { level: "warn", grade: true, ok: voted > 0 && !open, text: open ? `Vote on every finalist: ${open} of ${finalists.length} have no vote and won't be exported` : "Vote on every finalist" },
      TRUTH && { level: "warn", grade: true, ok: voted > 0 && !left, text: left ? `Vote on every rejected candidate: ${left} of ${rejected.length} have no vote and won't be exported` : "Vote on every rejected candidate" },
      TRUTH && { level: "warn", grade: true, ok: st.areas.size === AREAS, text: st.areas.size === AREAS ? "Check every area for missed NoRs" : `Check every area for missed NoRs: ${AREAS - st.areas.size} of ${AREAS} left` },
      { level: "warn", ok: !local, text: `Only images from ${shell.remote.label} can be submitted` },
    ].filter(Boolean);
    return { state: !voted || waiting ? "todo" : open || left || (TRUTH && st.areas.size < AREAS) ? "part" : "done", items };
  }
  function gtButton() {
    const { state, items } = gtState(), open = items.filter((t) => t.grade && !t.ok);
    // the items: every finalist and every NoR the user added
    shell.views.count(st.meta ? (st.passes || []).filter((c) => !c.added).length + addedCands().length : null);
    shell.tasks.ready(!!st.img, st.img ? state : undefined,
      (open.length ? open.map((t) => t.text + ".").join(" ") : TRUTH ? "Every task is done." : "Every finalist has your verdict.") + " Click to export or submit.");
    steps();
  }
  // The file Submit Ground Truth gives is the shell's: the log's model as gt_actions.js's document, with the history that made it. What it
  // marks, for the popup: each candidate approved or rejected, each added NoR approved. A candidate nobody voted on is ambiguous and
  // is only listed.
  const submit = () => {
    const m = shell.gt.model(), count = m ? m.cands.filter((c) => c.approved).length + m.deleted.length + m.added.filter((a) => a.approved).length : 0;
    shell.submitTruth({ count, file: base() + "_ground_truth.json", items: gtState().items,
      empty: "Vote on candidates with the thumbs, or right-click the image to add a NoR the finder missed." });
  };


  // ---------- the ground-truth tasks: in the left bar, one item at a time, area by area ----------
  // The finalists, the rejected, the image's areas checked for missed NoRs, then Submit. The open task shows its
  // current item; a verdict moves on to the next with none. What is done is cut out of the image.
  const TASKS = ["pass", "fail", "missed", "submit"];
  const AREAS = GRID * GRID;
  const verdictOf = (c) => (c.added ? st.added.find((a) => a.id === c.id)?.verdict : st.forced.get(c.i));
  const reviewed = (v) => (v === "in" ? "yes" : v === "out" ? "no" : "todo");
  // the image's areas by their place in the walk: rows of areas top to bottom, each the way back from the
  // last, so the next area always borders the one before
  function areaOf(c) {
    const r = Math.min(GRID - 1, Math.floor((c.cy / st.H) * GRID)), k = Math.min(GRID - 1, Math.floor((c.cx / st.W) * GRID));
    return r * GRID + (r % 2 ? GRID - 1 - k : k);
  }
  // an area's rectangle on the image: [x, y, w, h]
  function areaRect(a) {
    const r = Math.floor(a / GRID), k = r % 2 ? GRID - 1 - (a % GRID) : a % GRID, w = st.W / GRID, h = st.H / GRID;
    return [k * w, r * h, w, h];
  }
  // The tasks as one walk, area by area, so a whole region of the image is done before the next: in each area
  // its finalists, its rejected, the NoRs added there, each top to bottom, and last the area's check.
  // Each step: {key, a, t, c (a candidate's), done}; key "c:<candidate>" or "a:<area>".
  function walk() {
    if (!st.passes) return [];
    const by = Array.from({ length: AREAS }, () => ({ pass: [], fail: [], missed: [] }));
    for (const c of [...st.order, ...addedCands()]) by[areaOf(c)][groupOf(c)].push(c);
    const out = [];
    by.forEach((g, a) => {
      for (const t of ["pass", "fail", "missed"]) {
        for (const c of g[t].sort((x, y) => x.cy - y.cy || x.cx - y.cx)) out.push({ key: "c:" + c.i, a, t, c, done: !!verdictOf(c) });
      }
      out.push({ key: "a:" + a, a, t: "missed", done: st.areas.has(a) });
    });
    return out;
  }
  function taskItems(t) {
    if (t === "missed") return addedCands();
    return walk().filter((x) => x.c && x.t === t).map((x) => x.c);
  }
  // an added NoR in area a with no verdict yet: the area waits for it
  const waitingIn = (a) => addedCands().find((c) => !verdictOf(c) && areaOf(c) === a);
  // an area is done once every candidate in it is decided and it is checked for missed NoRs
  const areaDone = (a, w) => st.areas.has(a) && w.every((x) => x.a !== a || x.done);
  const taskDone = (t) => t !== "submit" && !!st.passes && taskItems(t).every(verdictOf) && (t !== "missed" || st.areas.size === AREAS);
  // the walk's next step not done after key (from the start when key is null), else null
  function nextOpen(key, w = walk(), t = null) {
    const k = w.findIndex((x) => x.key === key);
    return [...w.slice(k + 1), ...w.slice(0, Math.max(k, 0))].find((x) => !x.done && x.key !== key && (!t || x.t === t)) || null;
  }
  // The step the user is on, st.cur, and the ones they were on before it, st.back, newest last. Going to a step
  // sets the candidate on the card (st.sel), its task (st.task) and its area (st.area); none left: Submit.
  function goTo(key, { dir = 1, remember = true } = {}) {
    const w = walk(), x = key && w.find((y) => y.key === key);
    if (remember && st.cur && st.cur !== (x ? x.key : null)) st.back.push(st.cur);
    const was = st.area;
    st.cur = x ? x.key : null; st.taskDir = dir;
    st.task = x ? x.t : "submit"; st.sel = x && x.c ? x.c.i : null; st.area = x ? x.a : null;
    renderTasks(); placeRing();
    // entering an area frames it; inside one, the image pans to the candidate only when it is out of the middle
    frameArea(st.area != null && (st.area !== was || !x.c));
    if (x && x.c && st.area === was) bringIntoView(x.c);
  }
  const goStep = (x, o) => goTo(x ? x.key : null, o);
  // a candidate picked on the image becomes the current one, in its task
  const takeUp = (c) => goTo("c:" + c.i);
  // after a verdict, or Skip: the walk's next step not done
  const moveOn = () => goStep(nextOpen(st.cur));
  // clicking a task: its next step not done along the walk, else its first
  function goTask(t) {
    if (t === "submit") return;
    const w = walk();
    goStep(nextOpen(st.cur, w, t) || w.find((x) => x.t === t));
  }
  $("#task-skip").onclick = () => { const x = nextOpen(st.cur); if (x) goStep(x); };
  // Back skips a step that is gone (an added NoR removed)
  $("#task-back").onclick = () => {
    const w = walk();
    while (st.back.length) { const k = st.back.pop(); if (w.some((x) => x.key === k)) return goTo(k, { dir: -1, remember: false }); }
    renderTasks();
  };
  $("#area-ok").onclick = () => {
    if (st.area == null) return;
    act({ type: "check-area", area: st.area, on: true });
    moveOn();
  };
  // the image pans to the candidate only when it is out of the middle of the view
  function bringIntoView(c) {
    const sc = $("#scroller"), x = c.cx * st.zoom - sc.clientWidth / 2 - sc.scrollLeft, y = c.cy * st.zoom - sc.clientHeight / 2 - sc.scrollTop;
    if (Math.abs(x) > sc.clientWidth * 0.35 || Math.abs(y) > sc.clientHeight * 0.35) focusOn(c);
  }
  // the area the walk is in, framed on the image; brought into view, zoomed in to fill much of the view when it is
  // small there
  function frameArea(go) {
    const svg = $("#overlay"); let f = svg.querySelector(".area-frame");
    const on = tagging() && st.area != null && !!st.W;
    if (!on) { if (f) f.style.display = "none"; return; }
    if (!f) { f = el("rect", { class: "area-frame" }); svg.append(f); }
    const [x, y, w, h] = areaRect(st.area);
    for (const [k, v] of Object.entries({ x, y, width: w, height: h })) f.setAttribute(k, v);
    f.style.display = ""; svg.append(f);
    if (!go) return;
    const sc = $("#scroller"), fit = 0.6 * Math.min(sc.clientWidth / w, sc.clientHeight / h);
    if (st.zoom < fit * 0.6) shell.viewer.setZoom(Math.min(fit, 8));
    shell.viewer.focus(x + w / 2, y + h / 2);
  }
  // What is done, cut out of the image by the viewer: the rectangle around each decided candidate's pixels, two pixels
  // wider each way, and each area done.
  function drawReveal() {
    if (!TRUTH || !st.W) return;
    const holes = [], w = walk();
    for (const c of st.order) if (st.forced.get(c.i)) holes.push([c.bb[0] - 2, c.bb[1] - 2, c.bb[2] - c.bb[0] + 4, c.bb[3] - c.bb[1] + 4]);
    for (const c of addedCands()) if (verdictOf(c)) { const r = radiusOf(c); holes.push([c.cx - r, c.cy - r, 2 * r, 2 * r]); }
    for (const a of st.areas) if (areaDone(a, w)) holes.push(areaRect(a));
    shell.viewer.doneMask(holes.map(([x, y, width, height]) => [[x, y], [x + width, y], [x + width, y + height], [x, y + height]]));
  }
  // the keys (req/nor/truth/keys, req/shell/image/keys), wired by the shell from study.json's actions: it presses the
  // open item's buttons itself; the Show menu's views are switched here, and the states the keys wait on told as
  // they change
  const VIEW_KEYS = { "show-pass": "show-gt-pass", "show-fails": "show-gt-fails", "show-added": "show-gt-added", "show-cut": "show-gt-cut", "show-frame": "show-gt-frame" };
  shell.actions.handle(Object.fromEntries(Object.entries(VIEW_KEYS).map(([a, id]) => [a, (phase) => {
    if (phase === "up") return;
    const b = $("#" + id); b.checked = !b.checked; b.oninput();
  }])));
  function tellKeys() {
    const v = st.show || {};
    shell.actions.report({ tagging: tagging(), step: !!st.cur, views: TRUTH && !!st.meta,
      gtPass: v.gtPass, gtFails: v.gtFails, gtAdded: v.gtAdded, gtCut: v.gtCut, gtFrame: v.gtFrame });
  }
  function renderTasks() {
    if (!TRUTH) return;
    const ready = !!st.meta && !!st.passes;
    // the walk starts at its first step not done
    if (ready && st.cur === undefined) {
      const x = nextOpen(null);
      st.cur = x ? x.key : null; st.task = x ? x.t : "submit"; st.sel = x && x.c ? x.c.i : null; st.area = x ? x.a : null;
      placeRing(); frameArea();
    }
    // a step gone (an added NoR removed): the walk goes on from its area's check
    if (ready && st.cur && !walk().some((x) => x.key === st.cur)) { st.cur = "a:" + st.area; st.sel = null; st.task = "missed"; }
    const lists = Object.fromEntries(TASKS.map((t) => [t, ready ? taskItems(t) : []]));
    // a row per task, counting what is done of it; the bar a part per task, as long as it and filled as far as done
    const count = { pass: lists.pass.length, fail: lists.fail.length, missed: AREAS };
    const did = { pass: lists.pass.filter(verdictOf).length, fail: lists.fail.filter(verdictOf).length, missed: st.areas.size };
    for (const t of ["pass", "fail", "missed"]) shell.tasks.count(t, ready ? did[t] : null, count[t], ready && taskDone(t));
    // the open task: its tools on its row, and its item's card under it
    const li = shell.tasks.open(ready ? st.task : null), now = $("#task-now"), tools = $("#task-tools");
    const c = ready && tagging() && st.sel != null ? candOf(st.sel) : null;
    if (li && st.task !== "submit") {
      li.querySelector(".task-head").append(tools);
      (st.task === "missed" ? li.querySelector(".missed-slot") : li.querySelector(".task-body")).append(now);
    } else $("#nor-tasks").append(tools);
    tools.hidden = !li || st.task === "submit";
    // the area's check: its words and button only on the area's own step
    const checking = !!st.cur && st.cur.startsWith("a:");
    $("#area-check").hidden = !checking;
    $("#card-menu").hidden = !c;
    $("#task-skip").disabled = !ready || !nextOpen(st.cur);
    $("#task-back").disabled = !st.back.length;
    $("#area-ok").disabled = st.area == null || !!waitingIn(st.area);
    now.hidden = !c;
    const was = $("#task-card .card"), fresh = c ? card(c, "task") : null;
    $("#task-card").replaceChildren(...(fresh ? [fresh] : []));
    if (was && fresh && was.dataset.i !== fresh.dataset.i) slideIn(was, fresh, st.taskDir || 1);
    st.taskDir = 0;
    drawReveal();
    tellKeys();
  }
  // the next item's card slides in over the last one's, which slides out the other way
  function slideIn(was, fresh, dir) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    $("#task-stage").querySelectorAll(".leaving").forEach((e) => e.remove());
    const out = document.createElement("div"); out.className = "leaving"; out.setAttribute("aria-hidden", "true"); out.inert = true;
    out.append(was); $("#task-stage").append(out);
    const t = { duration: 220, easing: "cubic-bezier(.2,.7,.3,1)" };
    out.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-dir * 60}%)`, opacity: 0 }], t).finished.then(() => out.remove(), () => out.remove());
    fresh.animate([{ transform: `translateX(${dir * 60}%)`, opacity: 0 }, { transform: "none", opacity: 1 }], t);
  }
  if (TRUTH) {
    $("#card-menu").open = false; $("#task-back").before($("#card-menu"));
    $("#overlay").classList.add("gt"); shell.signal.addEventListener("abort", () => $("#overlay").classList.remove("gt"));
    shell.tasks.list([{ key: "pass", name: "Finalists" }, { key: "fail", name: "Rejected" },
      { key: "missed", name: "Areas", title: "The image's areas, each checked for NoRs the finder missed" }],
    { submit, pick: (t) => { if (st.meta) goTask(t); }, tagging: (on) => {
      for (const id of ["#show-gt-cut", "#show-gt-frame"]) $(id).disabled = !on;
      tellKeys();
      if (!st.meta || !st.passes) return;
      // started, the walk opens where it is, its area framed and brought into view; stopped, the image is as viewed
      renderTasks(); placeRing(); frameArea(on && st.area != null);
      if (on && st.sel != null && candOf(st.sel)) bringIntoView(candOf(st.sel));
    } });
    for (const id of ["#show-gt-cut", "#show-gt-frame"]) $(id).disabled = true;
    shell.tasks.row("missed").querySelector(".task-body").append($("#nor-tasks .missed-slot"), $("#area-check"));
  }

  // ---------- the summary mask: the shell's (req/shell/summary/mask), a candidate counted where its centre lies ----------
  const inMask = (c) => shell.mask.inside(c.cx, c.cy);
  shell.mask.on(() => { st.mask = shell.mask.polygons(); renderSummary(); }, shell.signal);
  // the area the summary counts over, in pixels: the whole image, or the mask's pixels (filled by exclusive or,
  // as inMask tests a point), counted once per mask
  function countedArea() {
    if (!st.mask.length) return st.W * st.H;
    const key = JSON.stringify(st.mask);
    if (st.maskArea && st.maskArea.key === key) return st.maskArea.px;
    const cv = new OffscreenCanvas(st.W, st.H), ctx = cv.getContext("2d"), path = new Path2D();
    for (const p of st.mask) { path.moveTo(...p[0]); for (const q of p.slice(1)) path.lineTo(...q); path.closePath(); }
    ctx.fill(path, "evenodd");
    const a = ctx.getImageData(0, 0, st.W, st.H).data; let px = 0;
    for (let i = 3; i < a.length; i += 4) if (a[i] >= 128) px++;
    st.maskArea = { key, px };
    return px;
  }
  // finalists per square millimetre (the unit the literature counts nodes in); per million pixels without a scale
  function density(n) {
    const px = countedArea();
    return st.um ? { value: px ? n / (px * st.um * st.um * 1e-6) : null, unit: "per mm²", area: px * st.um * st.um * 1e-6, areaUnit: "mm²" }
      : { value: px ? n / (px * 1e-6) : null, unit: "per million px²", area: px * 1e-6, areaUnit: "million px²" };
  }
  // ---------- the image view ----------
  const focusOn = (c) => shell.viewer.focus(c.cx, c.cy);
  function candAt(e) {
    const g = e.target.closest && e.target.closest("g[data-i]");
    return g ? candOf(g.dataset.i[0] === "u" ? g.dataset.i : +g.dataset.i) : null;
  }
  function tip(e) {
    const c = candAt(e), t = $("#tip");
    if (!c || $("#scroller").classList.contains("dragging")) { t.hidden = true; return; }
    const r = result(c.i);
    let s = `${nameOf(c)} ` + (c.added ? "added by you, " : "") + (r === null ? "finalist" : `rejected: ${whyAll(c).map((k) => `${reasonOf(k).letter} ${reasonOf(k).title}`).join(", ")}`);
    if (c.m) s += "\n" + measures(c).slice(0, 3).map(([l, v]) => `${l}: ${fmt(v)}`).join("\n");
    t.textContent = s; t.hidden = false;
    t.style.left = Math.min(e.clientX + 14, innerWidth - 330) + "px"; t.style.top = e.clientY + 14 + "px";
  }
  $("#overlay").addEventListener("mousemove", tip, here);
  $("#overlay").addEventListener("mouseleave", () => ($("#tip").hidden = true), here);

  shell.algorithm.on((k) => { if (!st.about) return; buildDetect(); if (!st.meta) useFilters(k); });
  $("#find").onclick = detect;
  $("#reset-detect").onclick = () => { const f = shell.algorithm.key; st.detectValues[f] = { ...st.about[f].detection_params }; buildDetect(); };

  // ---------- the Show and Options menus, remembered in this browser ----------
  function applyShow() {
    const s = st.show, o = $("#overlay");
    // while the study makes ground truth the menu switches the tasks' own markings
    if (TRUTH) {
      for (const [k, cls] of [["gtPass", "no-gt-pass"], ["gtFails", "no-gt-fails"], ["gtAdded", "no-gt-added"], ["gtCut", "no-gt-cut"], ["gtFrame", "no-gt-frame"]]) o.classList.toggle(cls, !s[k]);
      return;
    }
    for (const [k, cls] of [["pass", "no-pass"], ["fails", "no-fails"], ["nums", "no-nums"], ["letters", "no-letters"], ["lines", "no-lines"]]) o.classList.toggle(cls, !s[k]);
    for (const [k, v] of [["--pass-c", s.passC], ["--fail-c", s.failC], ["--pass-w", s.passW + "px"], ["--fail-w", s.failW + "px"]]) o.style.setProperty(k, v);
  }
  {
    for (const e of document.querySelectorAll("#show-menu .for-gt")) e.hidden = !TRUTH;
    for (const e of document.querySelectorAll("#show-menu .for-view")) e.hidden = TRUTH;
    const bind = { "show-gt-pass": "gtPass", "show-gt-fails": "gtFails", "show-gt-added": "gtAdded", "show-gt-cut": "gtCut", "show-gt-frame": "gtFrame", "show-pass": "pass", "show-fails": "fails", "show-nums": "nums", "show-letters": "letters", "show-lines": "lines", "pass-w": "passW", "pass-c": "passC", "fail-w": "failW", "fail-c": "failC" };
    for (const [id, k] of Object.entries(bind)) {
      const inp = $("#" + id);
      inp.type === "checkbox" ? (inp.checked = st.show[k]) : (inp.value = st.show[k]);
      inp.oninput = () => {
        st.show[k] = inp.type === "checkbox" ? inp.checked : inp.type === "range" ? +inp.value : inp.value;
        writeJSON(SHOW, st.show); applyShow(); tellKeys(); if (/C$/.test(k) && st.meta) { st.crops.clear(); if (st.view === "items") renderList(); renderSelected(); }
      };
    }
    applyShow();
    const opts = { "opt-align": "align", "opt-borders": "borders", "opt-bars": "bars", "opt-len-img": "lenImg", "opt-len-card": "lenCard", "opt-adjust": "adjust" };
    const changed = () => {
      const diff = (t) => Object.fromEntries(Object.entries(st.opt[t]).filter(([k, v]) => v !== CARD_DEFAULTS[t][k]));
      writeJSON(CARDS, { pass: diff("pass"), fail: diff("fail") });
      if (st.meta) { if (st.view === "items") renderList(); renderSelected(); }
    };
    for (const [id, k] of Object.entries(opts)) { const inp = $("#" + id); inp.onchange = () => { st.opt[st.tab][k] = inp.checked; changed(); }; }
    // an empty box puts the view's own padding back
    const pad = $("#opt-pad");
    pad.oninput = () => { const v = parseInt(pad.value, 10); st.opt[st.tab].pad = isFinite(v) && v >= 0 ? v : CARD_DEFAULTS[st.tab].pad; changed(); };
    // the menu shows the options of the view on show
    st.showOpts = () => {
      for (const [id, k] of Object.entries(opts)) $("#" + id).checked = st.opt[st.tab][k];
      if (document.activeElement !== pad) pad.value = st.opt[st.tab].pad;
      pad.placeholder = CARD_DEFAULTS[st.tab].pad;
      $("#opt-align").parentElement.hidden = st.tab === "fail";
      // a task's cards share one set of options, and keep the order of the walk
      $("#sort").parentElement.hidden = TRUTH;
      const what = TRUTH ? "Card options" : (st.tab === "pass" ? "Finalist" : "Rejected") + " options", sum = $("#card-menu summary");
      // a task's options open from a cogwheel
      if (TRUTH) { sum.innerHTML = COG; sum.title = what; sum.setAttribute("aria-label", what); } else sum.textContent = what;
    };
    st.showOpts();
  }
  for (const [id, t] of [["#tab-pass", "pass"], ["#tab-fail", "fail"]]) $(id).onclick = () => {
    if (st.tab !== t) setTab(t); renderList();
  };
  function setTab(t) {
    st.tab = t; $("#tab-pass").classList.toggle("on", t === "pass"); $("#tab-fail").classList.toggle("on", t === "fail"); st.showOpts(); showSort();
  }

  // ---------- views ----------
  // the shell's switch shows the view; the cards are built only while the item view shows
  const showView = (v) => shell.views.show(v);
  st.view = shell.views.now;
  shell.views.on((v) => {
    st.view = v;
    if (v === "items" && st.meta) { renderList(); revealSelected("center"); }
    if (v === "image") { lazy.seen?.disconnect(); lazy.near.clear(); $("#list").replaceChildren(); shell.viewer.minimapView(); }
  });

  // the Edit History window yields to the selected candidate's card at the top right: how much of that corner the card holds, and the gap under it
  {
    const box = $("#selected-box"), view = $("#view");
    const hold = () => view.style.setProperty("--eh-yield", box.hidden ? "0px" : `${box.offsetHeight + 12}px`);
    const watch = new ResizeObserver(hold);
    watch.observe(box); hold();
    shell.signal.addEventListener("abort", () => { watch.disconnect(); view.style.removeProperty("--eh-yield"); if (!view.getAttribute("style")) view.removeAttribute("style"); });
  }

  // for the study's page tests, which drive it from outside
  window.nor = { taskItems, walk, goTo, focusOn, model: () => shell.gt.model(), document: () => shell.gt.document(), imageInfo, candOf, addedCands, linesOf, showView, decide, numOf, whyAll, result, summaryRows, inMask, fmt, card };

  // the buttons whose action can take a while on a slow computer
  for (const id of ["#find", "#tab-pass", "#tab-fail", "#dl-cands"]) slow($(id));

  // each finder's controls, as detection/finder_list.py lists them, so they never wait for Python; the finder itself
  // is chosen above them, in the shell's list
  Promise.all([fetch(new URL("finders.GENERATED.json", import.meta.url)).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }), shell.algorithm.ready])
    .then(([info]) => {
      if (shell.signal.aborted || !shell.algorithm.key) return;
      st.about = info.about; st.help = Object.values(info.about)[0].help;
      buildDetect(); useFilters(shell.algorithm.key);
    }, (e) => shell.status(`The finders could not be listed: ${e.message || e}`, true));
  // the file's channels in the study's order, Nav, Caspr, DAPI (data/README.md): Caspr the one the file displays
  // green, DAPI the other with the larger blobs, Nav the rest; none for a file not shaped so
  function order(im) {
    if (im.channels.length !== 3) return [];
    const green = im.channels.map((c) => { const v = [1, 3, 5].map((i) => parseInt((c.colour || "#000000").slice(i, i + 2), 16)); return v.indexOf(Math.max(...v)) === 1 && Math.max(...v) > 0; });
    if (green.filter(Boolean).length !== 1) return [];
    const caspr = green.indexOf(true), others = [0, 1, 2].filter((k) => k !== caspr);
    const n = Math.ceil(im.H / 3), area = (k) => NorPeek.blobArea(Float32Array.from(im.raw[k][0].subarray(0, im.W * n)), im.W, n);
    const [a, b] = others.map(area), dapi = a >= b ? others[0] : others[1], nav = a >= b ? others[1] : others[0];
    return [nav, caspr, dapi];
  }

  // ---------- what the shell asks of the study ----------
  return {
    painter: (canvas, shown, onSize) => NorPeek.painter(canvas, shown, onSize),
    order,
    opening(name) {
      st.added = []; st.forced = new Map(); st.edits = new Map(); st.fails = []; st.mask = []; st.areas = new Set(); st.task = null; st.area = null; st.cur = undefined; st.back = []; st.meta = null; st.lastRun = null; st.cands = []; st.order = []; st.passes = st.rejects = null; st.sel = null; st.ring = null; st.crops = new Map();
      $("#list").replaceChildren(); $("#summary").textContent = "No candidates yet.";
      downloads(false); renderSelected(); renderTasks();
    },
    // a curated ground truth's final results (req/shell/ground-truth/view): each NoR it marks, ringed, numbered as in its
    // file, and none of the tasks' marks (no areas, no rejected candidates, nothing blacked out). A /3 file's NoRs are its approved
    // candidates and added NoRs; a /2 file's, its labels marked right, and what it judged not NoRs
    showTruth(doc) {
      const svg = $("#overlay");
      svg.querySelector(".truth-marks")?.remove();
      svg.setAttribute("viewBox", `0 0 ${st.W} ${st.H}`);
      const g = el("g", { class: "truth-marks" });
      let nors, added, not = null;
      if (doc.format === N.FORMAT) {
        const m = N.load(doc);
        nors = [...m.cands.filter((c) => c.approved).map((c) => ({ id: c.n, x: c.x, y: c.y })),
          ...m.added.filter((a) => a.approved).map((a) => { const [[p, q], [r, t]] = a.lines.length; return { id: N.numberOf(m, a.id), x: (p + r) / 2, y: (q + t) / 2, added: true }; })];
        added = nors.filter((x) => x.added).length;
      } else {
        const labels = doc.labels || [];
        nors = labels.filter((x) => x.label === 1).map((L) => ({ id: L.id, x: L.x, y: L.y, r: L.radius_px, added: L.kind === "missing" }));
        added = nors.filter((x) => x.added).length; not = labels.filter((x) => x.label === 0).length;
      }
      for (const L of nors) {
        const r = L.r || MISSING_RADIUS, t = el("text", { x: L.x + r + 1, y: L.y - r });
        t.textContent = L.id ?? "";
        g.append(el("circle", { cx: L.x, cy: L.y, r }), t);
      }
      svg.append(g);
      return `${nors.length} NoR${nors.length === 1 ? "" : "s"} (${added} added by hand)${not == null ? "" : `, ${not} candidate${not === 1 ? "" : "s"} judged not NoRs`}`;
    },
    opened() {
      updateFind(); drawAdded();
      status("Image loaded. Press Find Candidates.");
    },
    result(action, meta, bytes, seq) {
      if (action === "detect") {
        busy(false);
        st.lastRun = st.running; st.running = null;
        onDetected(meta, bytes); shell.statusBar(); updateFind();
        status(meta.exact_refilter ? "Done." : "This finder picks between alternatives using the filters, so after a filter change press Find Candidates again for its exact result.");
      } else if (action === "refilter") {
        st.inflight = false;
        if (seq === st.seq) { st.fails = meta.fails; st.alone = meta.alone; recordRun(); shell.statusBar(); render(); }
        if (st.pending) { st.pending = false; refilter(); }
      }
    },
    error() { st.running = null; st.inflight = st.pending = false; updateFind(); },
    // a button held for a finder run, or a refilter, is held until that is done
    async settled() {
      if (st.running) await until("result:detect");
      if (st.inflight) await until("result:refilter");
    },
    // a refilter counts as done once none is queued behind it
    holds: (m) => m.type === "result" && m.action === "refilter" && st.inflight,
    idle: updateFind,
    showImage: () => showView("image"),
    pickAt: candAt,
    pick: (c) => (TRUTH ? c && tagging() && takeUp(c) : select(c && st.sel !== c.i ? c.i : null)),
    open: (c) => (TRUTH ? tagging() && takeUp(c) : (select(c.i), showView("items"))),
    step,
    zoomed: placeRing,
    stored,
    memory: () => (st.seg ? [{ name: "The candidates", what: `${st.cands.length} candidates' outlines`, size: st.seg.byteLength }] : []),
  };
}
