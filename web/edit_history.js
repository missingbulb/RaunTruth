// The Edit History window (req/shell/ground-truth/history): the action log of the image open as a list floating over the
// image, newest on top, a dot at the current state, what was undone above it; a click goes to a row and a hover rings
// its item on the image. It reads the log and the study's `describe` and `where` and changes nothing but the log's place,
// through the session's goto. Its switch in Ground Truth Tasks is remembered on this device.
"use strict";

// "on" | "off": whether the window shows, on by default
export const GT_HISTORY = "nor-gt-history";

const pad = (n) => String(n).padStart(2, "0");
const clock = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const isUser = (a) => a.type !== "open" && a.type !== "run" && a.type !== "base";
const dayOf = (iso) => { const d = new Date(iso); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const DAY = 86400000;
// the rows' heights are fixed, so a long list can be drawn by what is in view
const ROW = 26, RULE = 22, MANY = 1000;

function dayName(day, today) {
  if (day === today) return "Today";
  if (day === today - DAY) return "Yesterday";
  return new Date(day).toLocaleDateString(undefined, { day: "numeric", month: "short", year: new Date(day).getFullYear() === new Date(today).getFullYear() ? undefined : "numeric" });
}

// log(): the session's action log, or null; study(): the study's actions module, or null; viewer(): the viewer, for the
// ring; shown(): whether the tagger tags now and the image has a run or a base; goto(n) and clearAll(): the session's;
// readJSON and writeJSON: the shell's storage
export function editHistory({ $, log, study, viewer, shown, goto, clearAll, readJSON, writeJSON }) {
  const win = $("#edit-history"), list = $("#eh-list");
  let switchedOn = readJSON(GT_HISTORY, "on") !== "off";
  const unfolded = new Set();
  let built = [], windowed = false;

  const text = (a, count) => {
    const m = log(), s = study();
    try { return s?.describe?.(a, count, m.model) || a.type; } catch { return a.type; }
  };

  // the rows, newest first: [{kind: "row" | "rule" | "mark", cls, what, when, title, go, at, dot, fold}]; go is the number of
  // actions in force when the row is clicked, at the action whose item hover rings
  function rows() {
    const lg = log();
    const acts = lg.actions, undone = lg.undone, skipped = lg.skipped, floor = lg.floor, dead = lg.dead, cur = acts.length - 1;
    const seq = [...acts, ...undone];
    const out = [];
    const classes = (i) => [i > cur ? "undone" : "", i === cur ? "here" : "", i <= floor ? "floor" : "", i < dead ? "dead" : "", skipped.has(i) ? "skipped" : ""].filter(Boolean);
    const one = (i, extra = {}) => {
      const a = seq[i];
      const row = { kind: "row", i, a, cls: classes(i), when: clock(a.at), at: a.at, go: i + 1 > floor ? i + 1 : null, dot: i === cur };
      if (a.type === "open") { row.what = "Image opened"; row.go = null; }
      else if (a.type === "run") { const d = text(a, 1); row.what = d && d !== "run" ? `Algorithm ran: ${d}` : "Algorithm ran"; }
      else if (a.type === "base") {
        const f = a.from || {};
        row.what = f.note ? `Ground truth from ${f.note}, no history`
          : f.tagger || f.created ? `Ground truth by ${[f.tagger, f.created && f.created.replace("T", " ").slice(0, 16)].filter(Boolean).join(", ")}, no history` : "Ground truth as stored, no history";
        row.title = row.what;
      } else {
        row.what = text(a, 1);
        if (skipped.has(i)) { row.title = `didn't carry over: ${skipped.get(i)}`; row.what += " (didn't carry over)"; }
      }
      if (i < dead) { row.go = null; row.title = "earlier history, not replayable in this version"; }
      return Object.assign(row, extra);
    };
    // the actions in force that fold: consecutive, of one type, taken whole by the current run's replay
    const foldable = (i) => i > Math.max(floor, dead) && i <= cur && isUser(seq[i]) && !skipped.has(i);
    const items = []; // in time order
    for (let i = 0; i < seq.length; i++) {
      if (foldable(i)) {
        let j = i;
        while (j + 1 <= cur && foldable(j + 1) && seq[j + 1].type === seq[i].type) j++;
        if (j > i) { items.push({ group: [i, j] }); i = j; continue; }
      }
      items.push({ i });
    }
    const flat = [];
    for (const it of items.reverse()) {
      if (it.i !== undefined) { flat.push(one(it.i)); continue; }
      const [a, b] = it.group, key = `${seq[a].type}@${seq[a].at}`, n = b - a + 1;
      const first = clock(seq[a].at), last = clock(seq[b].at);
      const head = { kind: "row", key, group: true, open: unfolded.has(key), i: b, a: seq[b], cls: ["group", ...(b === cur ? ["here"] : [])], dot: b === cur && !unfolded.has(key),
        what: text(seq[b], n), when: first === last ? first : `${first}–${last}`, at: seq[b].at, go: b + 1 };
      if (head.open) { head.cls = ["group"]; flat.push(head); for (let k = b; k >= a; k--) flat.push(one(k, { cls: ["member", ...(k === cur ? ["here"] : [])], dot: k === cur })); }
      else flat.push(head);
    }
    // rules between days, and a grey line where an earlier history was set aside
    const today = dayOf(new Date().toISOString());
    let day = null, first = true;
    for (const r of flat) {
      const d = r.at ? dayOf(r.at) : day;
      if (r.at && (d !== day) && !r.cls.includes("member") && (d !== today || !first)) { out.push({ kind: "rule", cls: ["day"], what: dayName(d, today) }); }
      if (r.at && !r.cls.includes("member")) { day = d; first = false; }
      out.push(r);
      if (r.a?.type === "base" && r.i === dead && seq.slice(0, dead).some((x) => x.type !== "open"))
        out.push({ kind: "mark", cls: ["mark"], what: "Earlier history, not replayable in this version" });
    }
    return out;
  }

  const li = (r) => {
    const el = document.createElement("li");
    el.className = r.cls.join(" ");
    if (r.kind === "rule" || r.kind === "mark") { el.textContent = r.what; return el; }
    if (r.i !== undefined) el.dataset.i = r.i;
    if (r.go != null) { el.dataset.go = r.go; el.tabIndex = 0; el.classList.add("go"); }
    if (r.title) el.title = r.title;
    const dot = document.createElement("span"); dot.className = "dot"; dot.textContent = r.dot ? "●" : "";
    const what = document.createElement("span"); what.className = "what"; what.textContent = r.what;
    const when = document.createElement("span"); when.className = "when"; when.textContent = r.when;
    if (r.group) {
      const chev = document.createElement("button");
      chev.type = "button"; chev.className = "eh-fold"; chev.dataset.key = r.key; chev.setAttribute("aria-expanded", String(r.open));
      chev.setAttribute("aria-label", r.open ? "Fold these actions" : "Unfold these actions"); chev.textContent = r.open ? "▾" : "▸";
      el.append(dot, chev, what, when);
    } else el.append(dot, what, when);
    return el;
  };

  // the rows in view, with a spacer for each stretch not drawn; the current row always drawn, where it is, so it pins to
  // the edge of the list while the list is scrolled away from it
  function draw() {
    const heights = built.map((r) => (r.kind === "rule" ? RULE : ROW));
    const total = heights.reduce((a, b) => a + b, 0);
    windowed = built.length > MANY;
    if (!windowed) { list.replaceChildren(...built.map(li)); return; }
    const top = list.scrollTop, bottom = top + (list.clientHeight || 400);
    let y = 0; const keep = new Set();
    built.forEach((r, k) => { if (y + heights[k] >= top - 4 * ROW && y <= bottom + 4 * ROW) keep.add(k); if (r.cls.includes("here")) keep.add(k); y += heights[k]; });
    const out = []; let gap = 0;
    const spacer = () => { if (gap) { const s = document.createElement("li"); s.className = "spacer"; s.style.height = `${gap}px`; out.push(s); gap = 0; } };
    built.forEach((r, k) => { if (keep.has(k)) { spacer(); out.push(li(r)); } else gap += heights[k]; });
    spacer();
    list.replaceChildren(...out);
    list.dataset.total = String(total);
  }

  function paint() {
    const lg = log(), on = shown();
    win.hidden = !on || !switchedOn;
    $("#gt-history-row").hidden = !on;
    $("#gt-history-on").checked = switchedOn;
    if (!on || !lg) { built = []; list.replaceChildren(); $("#eh-count").textContent = ""; viewer()?.ring?.(null); return; }
    $("#eh-count").textContent = `· ${lg.count}`;
    if (win.hidden) return;
    built = rows();
    draw();
  }

  const setSwitch = (on) => { switchedOn = on; writeJSON(GT_HISTORY, on ? "on" : "off"); paint(); };
  $("#gt-history-on").onchange = (e) => setSwitch(e.target.checked);
  $("#eh-close").onclick = () => setSwitch(false);
  $("#eh-clear").onclick = () => clearAll();
  list.addEventListener("scroll", () => { if (windowed) draw(); });

  const rowOf = (e) => e.target.closest?.("#eh-list > li");
  const boxOf = (el) => {
    const lg = log(), s = study(), a = [...lg.actions, ...lg.undone][+el?.dataset.i];
    if (!a || a.type === "open" || a.type === "run" || a.type === "base") return null;
    try { return s?.where?.(a, lg.model) ?? null; } catch { return null; }
  };
  const OFF = "Off screen — click to go there";
  list.addEventListener("mouseover", (e) => {
    const el = rowOf(e), box = el ? boxOf(el) : null, off = !!box && viewer()?.inView && !viewer().inView(box);
    if (el && off && el.title !== OFF) { el.dataset.was = el.title; el.title = OFF; }
    else if (el && !off && el.title === OFF) { el.title = el.dataset.was ?? ""; delete el.dataset.was; }
    viewer()?.ring?.(off ? null : box);
  });
  list.addEventListener("mouseleave", () => viewer()?.ring?.(null));
  list.addEventListener("click", (e) => {
    const chev = e.target.closest?.(".eh-fold");
    if (chev) { const k = chev.dataset.key; if (unfolded.has(k)) unfolded.delete(k); else unfolded.add(k); built = rows(); draw(); return; }
    const el = rowOf(e);
    if (!el || el.dataset.go === undefined) return;
    goto(+el.dataset.go);
    viewer()?.ring?.(boxOf(el), { pan: true });
  });
  list.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("#eh-list > li.go")) { e.preventDefault(); e.target.click(); } });

  return { paint };
}
