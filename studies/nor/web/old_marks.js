// What this study kept in the browser's own storage before it kept GT actions, in five kinds of key. The shell offers it once
// (shell.gt.legacy) as the GT actions it implies, and the keys are forgotten when a draft holds them.
//   nor-marks-v1:<file name>|<finder>  {"x,y": "in" | "out"}: the tagger's keepers and removals, by a candidate's rounded place
//   nor-edits-v1:<file name>|<finder>  {"x,y": {length, red, width, approved}}: the measurements, the lines as segments
//   nor-added-v1:<file name>           [{lines, verdict: "in" | "out" | null}]: the NoRs the tagger added
//   nor-missing-v1:<file name>         [[x, y]]: what an older page kept in place of the added NoRs
//   nor-areas-v1:<file name>           [area]: the areas checked for missed NoRs
import * as N from "./gt_actions.js";

const MARKS = "nor-marks-v1:", EDITS = "nor-edits-v1:", ADDED = "nor-added-v1:", MISSING = "nor-missing-v1:", AREAS = "nor-areas-v1:";
const LINES = ["length", "red", "width"];
const isSegment = (s) => Array.isArray(s) && s.length === 2 && s.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
const isLines = (L) => !!L && LINES.every((k) => isSegment(L[k]));
const place = (c) => `${Math.round(c.x)},${Math.round(c.y)}`;

// {actions, from, forget} for shell.gt.legacy: the GT actions those keys imply on the run's candidates (the model of `output`,
// whose candidates have ids), the old decisions found again by place, a thumbs down a delete; null when they imply none.
// `typical(x, y)` makes the lines of an added NoR the older page kept as a place alone.
export function oldMarks(readJSON, { name, finder, output, typical }) {
  const keys = { marks: MARKS + name + "|" + finder, edits: EDITS + name + "|" + finder, added: ADDED + name, missing: MISSING + name, areas: AREAS + name };
  const got = Object.fromEntries(Object.entries(keys).map(([k, key]) => [k, readJSON(key, null)]));
  const kept = Object.entries(keys).filter(([k]) => got[k] != null).map(([, key]) => key);
  let m = N.start(output);
  const actions = [];
  const did = (action) => { const r = N.run(m, action); if (!("skip" in r)) { m = r; actions.push(action); } };
  const at = new Map(m.cands.map((c) => [place(c), c.id]));
  const marks = got.marks && !Array.isArray(got.marks) ? got.marks : {}, edits = got.edits && !Array.isArray(got.edits) ? got.edits : {};
  for (const [pos, e] of Object.entries(edits)) {
    const cand = at.get(pos);
    if (!cand || !e || typeof e !== "object") continue;
    const lines = Object.fromEntries(LINES.filter((k) => isSegment(e[k])).map((k) => [k, e[k]]));
    if (Object.keys(lines).length) did({ type: "set-lines", cand, lines });
    if (e.approved && marks[pos] !== "out") did({ type: "approve", cand });
  }
  for (const [pos, v] of Object.entries(marks)) {
    const cand = at.get(pos);
    if (cand && (v === "in" || v === "out")) did({ type: v === "in" ? "approve" : "delete", cand });
  }
  const added = Array.isArray(got.added) ? got.added : (Array.isArray(got.missing) ? got.missing : []).map(([x, y]) => ({ lines: typical(x, y), verdict: null }));
  for (const a of added) {
    // one thumbed down is removed, as it is now
    if (!isLines(a?.lines) || a.verdict === "out") continue;
    const cand = N.nextAdded(m), [[p, q], [r, t]] = a.lines.length;
    did({ type: "add", cand, to: [(p + r) / 2, (q + t) / 2], lines: a.lines });
    if (a.verdict === "in") did({ type: "approve", cand });
  }
  for (const area of Array.isArray(got.areas) ? got.areas : []) if (Number.isInteger(area) && area >= 0 && area < N.GRID * N.GRID) did({ type: "check-area", area, on: true });
  if (!actions.length) return null;
  return { actions, from: "your earlier work in this browser",
    forget: () => { for (const key of kept) try { localStorage.removeItem(key); } catch { /* no storage */ } } };
}
