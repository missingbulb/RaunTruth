// The NoR Finder's GT actions: pure functions the shell's action log replays, with no page and no clock (the time an action
// carries is its own, `at`). A candidate is named by its id, which the model and the file keep: the finder's are c1, c2, …
// and a candidate that stands at the same place when the finder runs again keeps its id; a NoR the tagger adds has an id of
// its own kind, u1, u2, …, that no later one reuses. So an action means the same candidate after the file is read again or
// the finder runs again.
//
// A run's output is {image: {name, sha256, width, height, um_per_px, location}, finder, finder_settings, filters, numbered, cands: [{id, i, n, x, y, bb, lines, m, fail}]}:
// the candidates the page numbers, with no pixel masks. The model is
// {meta, cands, deleted, added: [{id, lines, approved?}], checked: [box], nextC, nextU}; a candidate carries `approved` once
// approved and `edited` ({length, red, width}, those the tagger moved); a rejected one is in `deleted`. A box is
// [x0, y0, x1, y1] in whole image pixels, x1 and y1 not in it; `checked` covers the pixels checked for missed NoRs.

export const FORMAT = "norfinder-ground-truth/4";
const OLD_FORMAT = "norfinder-ground-truth/2", AREAS_FORMAT = "norfinder-ground-truth/3";
// the areas each way a /3 file's `grid` names when it names none, and an action checking an area before checks named their box
const OLD_GRID = 10;

const GONE = { skip: "its candidate is gone" }, SAME = { skip: "nothing to change" }, TAKEN = { skip: "its id is taken" };
const NO_LINES = { skip: "it has no lines" };
const isSkip = (r) => !!r && typeof r === "object" && "skip" in r;

const number = (id) => +String(id).slice(1);
const largest = (list, kind) => list.reduce((n, c) => (c.id[0] === kind ? Math.max(n, number(c.id)) : n), 0);
const place = (c) => `${Math.round(c.x)},${Math.round(c.y)}`;
const copyLines = (L) => (L ? Object.fromEntries(Object.entries(L).map(([k, seg]) => [k, seg.map((p) => [...p])])) : L);
const byRun = (a, b) => a.i - b.i;

// ---------- a run's model ----------
// The output with an id on every candidate: counting from the model before it, a candidate whose rounded place is that of
// one of its candidates, kept or rejected, takes its id; the rest take the next ones, which no earlier run gave.
export function identify(output, previous) {
  const free = new Map();
  for (const c of [...(previous?.cands ?? []), ...(previous?.deleted ?? [])]) free.set(place(c), [...(free.get(place(c)) ?? []), c.id]);
  let next = previous?.nextC ?? 1;
  const cands = output.cands.map((c) => {
    const own = free.get(place(c))?.shift();
    return { ...c, id: own ?? `c${next++}` };
  });
  return { ...output, cands };
}

// The algorithm's output as a model. An output whose candidates have ids keeps them (the page stamps them as the run is
// recorded, so that the history the lab reads has them); one without is given them against the model before.
export function start(output, previous) {
  const given = output.cands.length > 0 && output.cands.every((c) => c.id != null);
  const { cands } = given ? output : identify(output, previous);
  const { cands: _, ...rest } = output;
  const meta = { ...rest, size: [rest.image.width, rest.image.height] };
  const fresh = cands.map(({ id, i, n, x, y, bb, lines, m, fail }) => ({ id, i, n, x, y, bb: [...bb], ...(lines ? { lines: copyLines(lines), m: { ...m } } : {}), fail: fail ?? null }));
  return {
    meta, ...carried(previous, fresh), nextC: Math.max(previous?.nextC ?? 1, largest(cands, "c") + 1),
  };
}

// The ground truth of the model before, put onto a run's candidates: a decision or an edit goes to the candidate with the
// same id, else the one at the same place; an added NoR and what is checked stand as they were. What the run has no
// candidate for is listed in `dropped`, by id, and left out.
function carried(previous, cands) {
  const none = { cands, deleted: [], added: [], checked: [], nextU: 1 };
  if (!previous) return none;
  const byId = new Map(cands.map((c) => [c.id, c])), byPlace = new Map(cands.map((c) => [place(c), c])), taken = new Set();
  const rejected = new Set(previous.deleted.map((c) => c.id)), dropped = [], gone = [];
  const now = new Map(cands.map((c) => [c.id, c]));
  for (const p of [...previous.cands, ...previous.deleted]) {
    if (!rejected.has(p.id) && !p.approved && !p.edited) continue;
    const hit = [byId.get(p.id), byPlace.get(place(p))].find((c) => c && !taken.has(c.id));
    if (!hit) { dropped.push(p.id); continue; }
    taken.add(hit.id);
    now.set(hit.id, { ...hit, ...(p.approved ? { approved: true } : {}), ...(p.edited ? { edited: copyLines(p.edited) } : {}) });
    if (rejected.has(p.id)) gone.push(hit.id);
  }
  const all = cands.map((c) => now.get(c.id));
  return { cands: all.filter((c) => !gone.includes(c.id)), deleted: all.filter((c) => gone.includes(c.id)).map(without), added: previous.added.map((a) => ({ ...a, lines: copyLines(a.lines) })),
    checked: previous.checked.map((b) => [...b]), nextU: Math.max(previous.nextU ?? 1, largest(previous.added, "u") + 1), ...(dropped.length ? { dropped } : {}) };
}

// the file of an image on which no finder has run, with no candidate: what the log starts from when a NoR is added before Find Candidates
export const blank = (image, meta = {}) => document(start({ image, finder: null, finder_settings: {}, filters: {}, numbered: 0, ...meta, cands: [] }));

// ---------- the model and its file ----------
// the file: the model's candidates that remain, the added NoRs and what is checked, no clock in it
export function document(model) {
  const { image, size, finder, finder_settings, filters, numbered } = model.meta;
  return {
    format: FORMAT, image, size, finder, finder_settings, filters, numbered,
    candidates: model.cands.map((c) => ({ ...c })), added: model.added.map((a) => ({ ...a })), checked: model.checked.map((b) => [...b]),
    next: { c: model.nextC, u: model.nextU },
  };
}

const dist = ([[a, b], [c, d]]) => Math.hypot(c - a, d - b);
const boxOf = (lines) => { const pts = Object.values(lines).flat(); return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]; };

// the file read again. A /2 file lists its marked candidates as labels: those marked right are the model's approved
// candidates and added NoRs, and the model has no more of them.
export function load(doc) {
  if (doc.format === OLD_FORMAT) {
    let c = 0, u = 0;
    const cands = [], deleted = [], added = [];
    for (const L of doc.labels ?? []) {
      const right = L.label === 1;
      if (L.kind === "missing") { if (right) added.push({ id: `u${++u}`, lines: copyLines(L.lines), approved: true }); continue; }
      if (!right && L.label !== 0) continue;
      const lines = copyLines(L.lines);
      ++c;
      // the lines a /2 file holds are the tagger's own: they stand over the finder's
      (right ? cands : deleted).push({ id: `c${c}`, i: c - 1, n: typeof L.id === "number" ? L.id : c, x: L.x, y: L.y, bb: lines ? boxOf(lines).map(Math.round) : [L.x - 8, L.y - 8, L.x + 8, L.y + 8],
        ...(lines ? { lines, m: { length: dist(lines.length), red_length: dist(lines.red), width: dist(lines.width) }, edited: copyLines(lines) } : {}), fail: null, ...(right ? { approved: true } : {}) });
    }
    const { name, sha256, width, height, um_per_px, location } = doc.image ?? {};
    return { meta: { image: { name, sha256, width, height, um_per_px, location }, size: [width, height], finder: doc.finder ?? null, finder_settings: doc.finder_settings ?? {}, filters: doc.filters ?? {},
      numbered: cands.length + deleted.length }, cands, deleted, added, checked: [], nextC: c + 1, nextU: u + 1 };
  }
  const { format, candidates, added, areas, grid, checked, next, ...meta } = doc;
  const cands = candidates.map((c) => ({ ...c, bb: [...c.bb], ...(c.lines ? { lines: copyLines(c.lines) } : {}) })).sort(byRun);
  // a /3 file's checked areas, each an area of its grid
  const boxes = format === AREAS_FORMAT ? (areas ?? []).map((a) => areaPixels(a, meta.image?.width ?? meta.size[0], meta.image?.height ?? meta.size[1], grid ?? OLD_GRID)) : checked ?? [];
  return { meta, cands, deleted: [], added: (added ?? []).map((a) => ({ ...a, lines: copyLines(a.lines) })), checked: boxes.map((b) => [...b]),
    nextC: Math.max(next?.c ?? 1, largest(cands, "c") + 1), nextU: Math.max(next?.u ?? 1, largest(added ?? [], "u") + 1) };
}

// ---------- what is checked ----------
// An area of a grid as a /3 file and an action before checks named their box meant it: rows of areas top to bottom, each
// the way back from the last, a pixel in the area its column and row fall in; its box in whole pixels.
function areaPixels(area, W, H, grid) {
  const r = Math.floor(area / grid), k = r % 2 ? grid - 1 - (area % grid) : area % grid, e = (v, L) => Math.ceil((v * L) / grid);
  return [e(k, W), e(r, H), e(k + 1, W), e(r + 1, H)];
}
const boxOfCheck = (a, m) => a.box ?? areaPixels(a.area, ...m.meta.size, m.meta.grid ?? OLD_GRID);
// the boxes cut along every edge any of them has, the pieces each [x0, y0, x1, y1]: f(piece) for each, until one says true
function pieces(boxes, b, f) {
  const xs = [...new Set([b[0], b[2], ...boxes.flatMap((q) => [q[0], q[2]]).filter((v) => v > b[0] && v < b[2])])].sort((p, q) => p - q);
  const ys = [...new Set([b[1], b[3], ...boxes.flatMap((q) => [q[1], q[3]]).filter((v) => v > b[1] && v < b[3])])].sort((p, q) => p - q);
  for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < ys.length; j++) if (f([xs[i], ys[j], xs[i + 1], ys[j + 1]])) return true;
  return false;
}
const inside = (q, x, y) => x >= q[0] && x < q[2] && y >= q[1] && y < q[3];
// whether every pixel of box b is in one of the boxes
export function covered(boxes, b) {
  if (b[2] <= b[0] || b[3] <= b[1]) return true;
  return !pieces(boxes, b, (p) => !boxes.some((q) => inside(q, (p[0] + p[2]) / 2, (p[1] + p[3]) / 2)));
}
const meets = (q, b) => q[0] < b[2] && b[0] < q[2] && q[1] < b[3] && b[1] < q[3];
// the boxes with box b's pixels taken out of them
function takeOut(boxes, b) {
  return boxes.flatMap((q) => {
    if (!meets(q, b)) return [q];
    const [x0, y0, x1, y1] = q, cx0 = Math.max(x0, b[0]), cx1 = Math.min(x1, b[2]), cy0 = Math.max(y0, b[1]), cy1 = Math.min(y1, b[3]);
    return [[x0, y0, x1, cy0], [x0, cy1, x1, y1], [x0, cy0, cx0, cy1], [cx1, cy0, x1, cy1]].filter((p) => p[2] > p[0] && p[3] > p[1]);
  });
}

// ---------- an action done ----------
// level lines centred on a place that the tagger adds a NoR at are the page's to make; an added NoR's own are its lines
const finder = (m, id) => {
  const k = m.cands.findIndex((c) => c.id === id);
  if (k >= 0) return { cand: m.cands[k], where: "cands", k };
  const d = m.deleted.findIndex((c) => c.id === id);
  return d >= 0 ? { cand: m.deleted[d], where: "deleted", k: d } : null;
};
const addedAt = (m, id) => m.added.findIndex((a) => a.id === id);
const swap = (list, k, c) => list.map((x, j) => (j === k ? c : x));
const without = ({ approved: _a, ...rest }) => rest;

// a finder's candidate put back among those that remain, with `change` applied
function restored(m, id, change) {
  const f = finder(m, id);
  if (f.where === "cands") return { ...m, cands: swap(m.cands, f.k, change(f.cand)) };
  return { ...m, deleted: m.deleted.filter((c) => c.id !== id), cands: [...m.cands, change(f.cand)].sort(byRun) };
}

function apply(m, a) {
  switch (a.type) {
    case "approve": {
      const k = addedAt(m, a.cand);
      if (k >= 0) return m.added[k].approved ? SAME : { ...m, added: swap(m.added, k, { ...m.added[k], approved: true }) };
      const f = finder(m, a.cand);
      if (!f) return GONE;
      return f.where === "cands" && f.cand.approved ? SAME : restored(m, a.cand, (c) => ({ ...c, approved: true }));
    }
    case "undecide": {
      const k = addedAt(m, a.cand);
      if (k >= 0) return m.added[k].approved ? { ...m, added: swap(m.added, k, without(m.added[k])) } : SAME;
      const f = finder(m, a.cand);
      if (!f) return GONE;
      return f.where === "cands" && !f.cand.approved ? SAME : restored(m, a.cand, without);
    }
    case "delete": {
      const k = addedAt(m, a.cand);
      if (k >= 0) return { ...m, added: m.added.filter((x) => x.id !== a.cand) };
      const f = finder(m, a.cand);
      if (!f) return GONE;
      if (f.where === "deleted") return SAME;
      return { ...m, cands: m.cands.filter((c) => c.id !== a.cand), deleted: [...m.deleted, without(f.cand)].sort(byRun) };
    }
    case "set-lines": {
      const k = addedAt(m, a.cand);
      if (k >= 0) {
        if (!a.lines) return NO_LINES;
        const lines = { ...m.added[k].lines, ...copyLines(a.lines) };
        return JSON.stringify(lines) === JSON.stringify(m.added[k].lines) ? SAME : { ...m, added: swap(m.added, k, { ...m.added[k], lines }) };
      }
      const f = finder(m, a.cand);
      if (!f) return GONE;
      if (!f.cand.lines) return NO_LINES;
      const { edited, ...rest } = f.cand;
      const now = a.lines ? { ...rest, edited: { ...edited, ...copyLines(a.lines) } } : rest;
      if (JSON.stringify(now) === JSON.stringify(f.cand)) return SAME;
      return { ...m, [f.where]: swap(m[f.where], f.k, now) };
    }
    case "add": {
      if (a.cand !== `u${m.nextU}`) return TAKEN;
      if (!a.lines) return NO_LINES;
      return { ...m, added: [...m.added, { id: a.cand, lines: copyLines(a.lines) }], nextU: m.nextU + 1 };
    }
    case "check-area": {
      const b = boxOfCheck(a, m);
      if (a.on) return covered(m.checked, b) ? SAME : { ...m, checked: [...m.checked, [...b]] };
      return m.checked.some((q) => meets(q, b)) ? { ...m, checked: takeOut(m.checked, b) } : SAME;
    }
    default: return { skip: "not an action of this study" };
  }
}

export function run(model, action) {
  const r = apply(model, action);
  return r === model ? SAME : r;
}

// whether the model's candidates, kept and rejected, are those of the page, [{i, id, x, y}]: each by its id at its place, and none more
export function holds(m, cands) {
  const all = [...m.cands, ...m.deleted], at = new Map(cands.map((c) => [c.i, c]));
  return all.length === cands.length && all.every((c) => at.get(c.i)?.id === c.id && place(at.get(c.i)) === place(c));
}

// the id the NoR added next is given
export const nextAdded = (m) => `u${m.nextU}`;

// ---------- how an action reads, and where it is ----------
// the number the tagger sees: the finder's candidates are numbered top to bottom, the added NoRs after them in the order added
export function numberOf(m, id) {
  const k = addedAt(m, id);
  if (k >= 0) return m.meta.numbered + k + 1;
  return finder(m, id)?.cand.n ?? null;
}
const LINE = { length: "length", red: "red length", width: "width" };
export function describe(a, count = 1, model = null) {
  const n = model && a.cand != null ? numberOf(model, a.cand) : null, who = n != null ? `#${n}` : String(a.cand ?? "")[0] === "u" ? "an added NoR" : "a candidate";
  const many = (one, more) => (count > 1 ? more : one);
  switch (a.type) {
    case "run": return `${a.output?.cands?.length ?? 0} candidates`;
    case "approve": return many(`Approved ${who}`, `Approved ${count} candidates`);
    case "undecide": return many(`Took back the verdict on ${who}`, `Took back ${count} verdicts`);
    case "delete": return many(`Deleted ${who}`, `Deleted ${count} candidates`);
    case "set-lines": {
      // the rows folded may be of one candidate
      if (count > 1) return `Changed lines ${count} times`;
      if (!a.lines) return `Reset the lines of ${who}`;
      const keys = Object.keys(a.lines);
      return keys.length === 1 ? `Moved the ${LINE[keys[0]]} line of ${who}` : `Moved the lines of ${who}`;
    }
    case "add": return many(`Added a NoR at ${Math.round(a.to[0])}, ${Math.round(a.to[1])}`, `Added ${count} NoRs`);
    case "check-area": return count > 1 ? `Judged ${count} areas` : a.on ? `No missed NoRs in area ${a.area + 1}` : `Took back no missed NoRs in area ${a.area + 1}`;
    default: return a.type;
  }
}

// the item's box in image pixels, [x0, y0, x1, y1], from the model as it stands: null when what it names is not there
export function where(a, m) {
  if (a.type === "check-area") return boxOfCheck(a, m);
  if (a.cand == null) return null;
  const k = addedAt(m, a.cand);
  if (k >= 0) return boxOf(m.added[k].lines);
  return finder(m, a.cand)?.cand.bb ?? null;
}
