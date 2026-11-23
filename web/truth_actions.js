// The GT action log: an image's ground truth as an ordered list of GT actions, replayed by the study's pure functions
// (start, run, document, load), undone and redone one at a time. No page, no clock of its own.

export const HISTORY_FORMAT = "rauntruth-gt-history/1";
export const SHELL_KEYS = ["history", "created", "tagger", "image", "accepted", "base"];

// the version a run action records, {site, code}: the site's version and the study's algorithm code hash, either null where
// the page could not tell. A run from a file written before has none: its label says so, and nothing is guessed.
export const versionLabel = (a) => {
  if (a?.type !== "run") return "";
  const v = a.version;
  if (!v || typeof v !== "object") return "version unknown";
  return [v.site ? `site ${v.site}` : "", v.code ? `code ${String(v.code).slice(0, 8)}` : ""].filter(Boolean).join(", ") || "version unknown";
};
export const bare = (doc) => Object.fromEntries(Object.entries(doc).filter(([k]) => !SHELL_KEYS.includes(k)));

export function canonical(v) {
  const sort = (x) => {
    if (Array.isArray(x)) return x.map(sort);
    if (x && typeof x === "object") return Object.fromEntries(Object.keys(x).sort().filter((k) => x[k] !== undefined).map((k) => [k, sort(x[k])]));
    return x;
  };
  return JSON.stringify(sort(v));
}

export async function sha256(doc) {
  const bytes = new TextEncoder().encode(canonical(bare(doc)));
  return [...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const through = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
const toBase64 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const isPacked = (o) => o && typeof o === "object" && typeof o.deflate === "string";

export const pack = (actions) => Promise.all(actions.map(async (a) => (a.type !== "run" || isPacked(a.output) ? a
  : { ...a, output: { deflate: toBase64(await through(new TextEncoder().encode(JSON.stringify(a.output)), new CompressionStream("deflate"))) } })));

export const unpack = (actions) => Promise.all(actions.map(async (a) => (a.type !== "run" || !isPacked(a.output) ? a
  : { ...a, output: JSON.parse(new TextDecoder().decode(await through(fromBase64(a.output.deflate), new DecompressionStream("deflate")))) })));

const isSkip = (r) => r && typeof r === "object" && Object.hasOwn(r, "skip");
const isUser = (a) => a.type !== "open" && a.type !== "run" && a.type !== "base";
const initial = () => ({ model: null, prev: null, carried: [], skipped: new Map(), dead: -1 });
const copy = (s) => ({ ...s, carried: s.carried.slice(), skipped: new Map(s.skipped) });

// `result` is study.run's answer when the caller already has it
function step(study, s, a, i, result) {
  if (a.type === "open") return;
  if (a.type === "base") {
    s.model = s.prev = study.load(a.model);
    s.carried = []; s.skipped = new Map(); s.dead = i;
  } else if (a.type === "run") {
    s.prev = s.model = study.start(a.output, s.prev);
    for (const c of s.carried) {
      const r = study.run(s.model, c.a);
      if (isSkip(r)) s.skipped.set(c.i, r.skip);
      else { s.model = r; s.skipped.delete(c.i); }
    }
  } else if (s.model === null) {
    s.skipped.set(i, "no run yet");
  } else {
    const r = result ?? study.run(s.model, a);
    if (isSkip(r)) s.skipped.set(i, r.skip); else s.model = r;
    s.carried.push({ i, a });
  }
}

const lastBase = (actions, upto) => { for (let i = upto - 1; i >= 0; i--) if (actions[i].type === "base") return i; return 0; };

export function replay(study, actions, upto = actions.length) {
  const s = initial();
  for (let i = lastBase(actions, upto); i < upto; i++) step(study, s, actions[i], i);
  return { model: s.model, skipped: s.skipped, dead: s.dead };
}

// what the study's model right after the run at actions[i] lists as dropped, by id: the edits a base held that the run had no
// item for (req/shell/ground-truth/history-carry); none for a row that is no run
export function leftOut(study, actions, i) {
  if (actions[i]?.type !== "run") return [];
  try { return replay(study, actions, i + 1).model?.dropped ?? []; } catch { return []; }
}

export async function check(study, actions, stored, { now = () => new Date().toISOString() } = {}) {
  const asBase = () => ({ type: "base", at: now(), model: bare(stored), from: { tagger: stored.tagger, created: stored.created } });
  if (!actions?.length) return { replay: "none", actions: [asBase()] };
  let plain = actions, error;
  try {
    plain = await unpack(actions);
    const { model } = replay(study, plain);
    if (model && await sha256(study.document(model)) === await sha256(stored)) return { replay: "verified", actions: plain };
  } catch (e) { error = String(e); }
  return { replay: "mismatch", actions: [...plain, asBase()], ...(error && { error }) };
}

const EVERY = 25;

export function actionLog(study, { now = () => new Date().toISOString() } = {}) {
  let actions = [], undone = [], cur = initial();
  const snaps = new Map();

  const snap = () => { if (actions.length % EVERY === 0) snaps.set(actions.length, copy(cur)); };
  const rebuild = () => {
    const base = lastBase(actions, actions.length);
    let from = 0;
    for (const k of snaps.keys()) if (k <= actions.length && k > from && k > base) from = k;
    cur = from ? copy(snaps.get(from)) : initial();
    for (let i = from || base; i < actions.length; i++) { step(study, cur, actions[i], i); if ((i + 1) % EVERY === 0) snaps.set(i + 1, copy(cur)); }
  };
  // a snapshot of a state still on the redo list stays valid; one a new action diverges from does not
  const diverge = () => { undone = []; for (const k of [...snaps.keys()]) if (k > actions.length) snaps.delete(k); };
  const reset = (list) => { actions = list; undone = []; snaps.clear(); rebuild(); };
  const firstRoot = () => actions.findIndex((a) => a.type === "run" || a.type === "base");
  const lastBaseAt = () => actions.findLastIndex((x) => x.type === "base");
  const floor = () => Math.max(firstRoot(), lastBaseAt());
  const append = (a) => { actions.push(a); step(study, cur, a, actions.length - 1); snap(); };

  return {
    get actions() { return actions.slice(); },
    get undone() { return undone.slice(); },
    get model() { return cur.model; },
    get skipped() { return new Map(cur.skipped); },
    get dead() { return cur.dead; },
    get floor() { return floor(); },
    get count() { return actions.filter((a, i) => isUser(a) && i > cur.dead).length; },
    get canUndo() { return floor() >= 0 && actions.length - 1 > floor(); },
    get canRedo() { return undone.length > 0; },
    open(image, studyId) { reset([{ type: "open", at: now(), image, study: studyId }]); },
    ran({ algorithm, output, version }) {
      const entry = { type: "run", at: now(), algorithm, output, ...(version ? { version } : {}) };
      if (actions.length && actions[actions.length - 1].type === "run") { actions.pop(); rebuild(); }
      diverge();
      append(entry);
    },
    act(action) {
      if (cur.model === null) throw new Error("a GT action needs a run or a base first");
      if (action.at !== undefined && typeof action.at !== "string") throw new Error("a GT action's `at` is its time: name a place otherwise");
      const a = { ...action, at: action.at ?? now() };
      const r = study.run(cur.model, a);
      if (isSkip(r)) return { skip: r.skip };
      diverge();
      actions.push(a);
      step(study, cur, a, actions.length - 1, r);
      snap();
      return { model: r };
    },
    undo() {
      if (!this.canUndo) return null;
      const a = actions.pop();
      undone.unshift(a);
      rebuild();
      return a;
    },
    redo() {
      const a = undone.shift();
      if (!a) return null;
      append(a);
      return a;
    },
    goto(n) {
      if (floor() < 0) return;
      const all = actions.concat(undone);
      const k = Math.min(Math.max(n, floor() + 1), all.length);
      actions = all.slice(0, k); undone = all.slice(k);
      rebuild();
    },
    clear() {
      const keep = actions.filter((a, i) => i === 0 && a.type === "open");
      const root = actions.findLast((a) => a.type === "run" || a.type === "base");
      reset(root ? [...keep, root] : keep);
    },
    load(list) { reset(list.slice()); },
  };
}
