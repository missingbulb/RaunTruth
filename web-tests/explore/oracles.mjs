// What a step changed, and the checks of it (explore.mjs). change(before, after, outside) names each category the step
// changed (effects.json says what they are) and what changed among the controls; ORACLES, each a check of one step
// {i, action, family, before, after, change, heard, settled, writes, popups, shell, previous}, gives its findings,
// each {class: bug | gap | call, oracle, sig, what}: sig, the same finding wherever it recurs.

const glob = (pattern, category) => pattern.endsWith("*") ? category.startsWith(pattern.slice(0, -1)) : pattern === category;
const differ = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

// outside: what the fakes and the browser saw during the step, {writes, settings, asked, popups, downloads, dialogs, reads}
export function change(before, after, outside) {
  const cats = new Set(), add = (c) => cats.add(c);
  if (before.url !== after.url) add("url");
  for (const k of new Set([...Object.keys(before.html), ...Object.keys(after.html)])) if (before.html[k] !== after.html[k]) add("html." + k);
  for (const c of new Set([...before.classes, ...after.classes])) if (before.classes.includes(c) !== after.classes.includes(c)) add("class." + c);
  for (const k of new Set([...Object.keys(before.storage), ...Object.keys(after.storage)])) if (before.storage[k] !== after.storage[k]) add("storage." + k);
  if (differ(before.dialogs, after.dialogs) || outside.dialogs.length) add("dialog");
  if (differ(before.open, after.open)) add("open");
  for (const [kind] of outside.writes) add("drive." + kind);
  if (outside.settings.length) add("settings");
  if (outside.asked.length) add("signin");
  if (outside.downloads.length) add("download");
  if (outside.popups.length) add("popup");
  const was = new Map(before.controls.map((c) => [c.key, c])), is = new Map(after.controls.map((c) => [c.key, c]));
  const controls = {
    added: [...is.keys()].filter((k) => !was.has(k)), removed: [...was.keys()].filter((k) => !is.has(k)),
    changed: [...is.keys()].filter((k) => was.has(k) && ["text", "disabled", "pressed", "value"].some((f) => was.get(k)[f] !== is.get(k)[f])),
  };
  return { categories: [...cats].sort(), controls, status: before.status !== after.status ? [before.status, after.status] : null,
    notice: before.notice !== after.notice ? after.notice : undefined };
}

const nothingChanged = (s) => !s.change.categories.filter((c) => !(s.always || []).includes(c)).length && !s.change.controls.added.length && !s.change.controls.removed.length
  && !s.change.controls.changed.length && !s.change.status && s.change.notice === undefined && !s.reads && !s.heard.length
  && s.before.focus.key === s.after.focus.key;

// a message as its kind of message, the parts that differ between two of its kind taken out
const shape = (line) => line.split("\n")[0].replace(/https?:\/\/[^\s)]+/g, "<url>").replace(/\b[\w-]*\d[\w-]*\b/g, "#").slice(0, 160);
const where = (a) => a.kind === "event" ? `the ${a.event} event` : a.kind === "key" ? `pressing ${a.press}` : `${a.kind} on ${a.key}${a.text ? ` ("${a.text}")` : ""}`;

export const ORACLES = {
  // universal invariants
  uncaught(s) {
    return s.heard.filter((m) => /^uncaught: |^crash: /.test(m.line)).map((m) => ({ class: "bug", sig: `uncaught ${s.action.key || s.action.event || s.action.press} ${shape(m.line)}`,
      what: `${where(s.action)} threw: ${m.line.split("\n")[0]}` }));
  },
  console(s) {
    return s.heard.filter((m) => !m.expected && !m.allowed && /^(warning|error): /.test(m.line)).map((m) => ({ class: "bug", sig: "console " + shape(m.line),
      what: `the page said, unexpected, after ${where(s.action)}: ${m.line.split("\n")[0]}` }));
  },
  leftTheMachine(s) {
    // a link the page opens in a tab of its own goes where the fakes do not: the explorer closes the tab
    return s.heard.filter((m) => /^request: left this machine/.test(m.line) && !s.popups.length)
      .map((m) => ({ class: "bug", sig: "left " + shape(m.line), what: `a request left the fakes after ${where(s.action)}: ${m.line}` }));
  },
  driveWrites(s) {
    const want = s.family.writes ?? 0, n = s.writes.length;
    const ok = want === "any" || (Array.isArray(want) ? n >= want[0] && n <= want[1] : n === want);
    if (ok) return [];
    // a file an earlier step that writes wrote, written again: a write held back and made late, the owner's to judge
    const late = want === 0 && s.writes.every(([, name]) => s.written?.has(name));
    if (late) return [{ class: "call", sig: `late write ${s.family.family} ${s.writes.map((w) => w[1]).join(" ")}`,
      what: `Drive took ${s.writes.map((w) => w.join(" ")).join(", ")} after ${where(s.action)}, a file an earlier step wrote: a write held back until now?` }];
    const what = want === 0 ? `Drive took ${n} write(s) (${s.writes.map((w) => w.join(" ")).join(", ")}) after ${where(s.action)}, which implies none`
      : `Drive took ${n} write(s) after ${where(s.action)}, where its family (${s.family.family}) makes ${JSON.stringify(want)}`;
    return [{ class: "bug", sig: `writes ${s.family.family} ${s.action.key || s.action.event || ""} ${n}`, what }];
  },
  // a control a person clicks and a dialog they close keep the keyboard somewhere: not lost to the page's body
  focusKept(s) {
    if (!["click", "key"].includes(s.action.kind) || !s.after.focus.body || s.before.focus.body) return [];
    const gone = !s.after.controls.some((c) => c.key === s.before.focus.key), closed = s.before.dialogs.some((d) => !s.after.dialogs.includes(d));
    if (!gone && !closed) return [];
    return [{ class: "gap", sig: `focus lost ${s.before.focus.key}`, what: `focus fell to the page's body after ${where(s.action)}: ${closed ? "a dialog closed" : "the focused control went"} (${s.before.focus.key})` }];
  },
  overflow(s) {
    if (!s.after.overflow || (s.before.overflow && s.before.overflow.past[0] === s.after.overflow.past[0])) return [];
    return [{ class: "bug", sig: `overflow ${s.width} ${s.after.overflow.past[0]}`,
      what: `the page scrolls sideways at ${s.width}px wide, by ${s.after.overflow.by}px, after ${where(s.action)}: ${s.after.overflow.past.join(", ")} past the edge` }];
  },
  linksLead(s) {
    return (s.deadLinks || []).map((l) => ({ class: "bug", sig: "dead link " + l.path, what: `the link "${l.text}" (${l.key}) leads to ${l.path}, which the site does not serve` }));
  },
  // a step a person takes inside the app that leaves them on a page that is not it
  stayInTheApp(s) {
    if (!s.before.app || s.after.app || s.action.kind === "event") return [];
    return [{ class: "call", sig: `left the app ${s.action.key || s.action.press}`, what: `${where(s.action)} left the app for ${s.after.url} (${s.after.title || "no title"})` }];
  },
  settles(s) {
    return s.settled === true ? [] : [{ class: "call", sig: `unsettled ${s.family.family}`, what: `the page had not settled after ${where(s.action)}: ${s.settled}` }];
  },
  // shell-states expectations: what the unreviewed harness's rules say each element shows here
  shellStates(s) {
    const wrong = new Set((s.shell?.wrong || []).map((e) => e.name));
    // the outermost of what is wrong together: a box gone takes what is in it with it
    return (s.shell?.wrong || []).filter((e) => !e.path.some((p) => wrong.has(p))).map((e) => ({ class: e.approval === "owner" ? "bug" : "call", sig: `shell ${s.after.study} ${e.name} ${e.expect} ${e.seen}`,
      what: `${e.name} (${e.select}) is ${e.seen}, where shell-states.json's ${e.approval} case (${e.req}) says ${e.expect}; vars ${JSON.stringify(s.shell.vars)}` }));
  },
  // action-effect checks, as effects.json declares them
  mustChange(s) {
    return (s.family.must || []).filter((m) => !s.change.categories.some((c) => glob(m, c)))
      .map((m) => ({ class: "bug", sig: `must ${s.family.family} ${m}`, what: `${where(s.action)} did not change ${m}, which its family (${s.family.family}) must` }));
  },
  unexpectedChange(s) {
    const allowed = [...(s.family.must || []), ...(s.family.may || []), ...(s.always || [])];
    const odd = s.change.categories.filter((c) => !c.startsWith("drive.") && !allowed.some((p) => glob(p, c)));
    return odd.length ? [{ class: "call", sig: `unexplained ${s.family.family} ${odd.join(" ")}`,
      what: `${where(s.action)} changed ${odd.join(", ")}, which its family (${s.family.family}) does not declare: review it` }] : [];
  },
  reverts(s) {
    if (!s.family.reverts || !s.previous) return [];
    const keys = (st) => st.controls.filter((c) => !/gt-undo|gt-redo|eh-|sb-|unsaved/.test(c.key)).map((c) => `${c.key} ${c.pressed} ${c.value}`).sort();
    const was = keys(s.previous.before), is = keys(s.after);
    const lost = was.filter((k) => !is.includes(k)), more = is.filter((k) => !was.includes(k));
    if (!lost.length && !more.length) return [];
    return [{ class: "call", sig: `reverts ${s.family.family}`, what: `${where(s.action)} did not put back what ${where(s.previous.action)} changed: missing ${lost.slice(0, 4).join("; ")}; extra ${more.slice(0, 4).join("; ")}` }];
  },
  // a button that answers a click with nothing a person can see
  answers(s) {
    if (s.action.kind !== "click" || !s.control || s.control.tag !== "button" || !nothingChanged(s)) return [];
    return [{ class: "gap", sig: `dead ${s.action.key}`, what: `${where(s.action)} changed nothing a person can see` }];
  },
};
