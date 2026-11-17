// The fixture study's GT actions: pure functions the shell's action log replays, with no page and no clock.
// A run's output is {threshold, count, spots: [[x, y], …]}; the model keeps a mark per spot, found again by place. A mark
// the tagger moved or added, or one a loaded file held, is `edited`; one of those the next run has no spot near is `dropped`.

const MATCH = 2;
const idNumber = (id) => +String(id).slice(1);

export function start(output, previous) {
  const free = new Map((previous?.marks ?? []).map((m) => [m.id, m]));
  let next = previous?.next ?? 1;
  const marks = output.spots.map(([x, y]) => {
    let best = null, near = MATCH;
    for (const m of free.values()) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= near) { best = m; near = d; }
    }
    if (best) free.delete(best.id);
    return { id: best ? best.id : "m" + next++, x, y };
  });
  if (!previous) next = marks.length + 1;
  const dropped = [...free.values()].filter((m) => previous.edited?.includes(m.id)).map((m) => m.id);
  return { threshold: output.threshold, count: output.count, marks, checked: false, next, edited: [], ...(dropped.length ? { dropped } : {}) };
}

const GONE = { skip: "its mark is gone" };

export function run(model, a) {
  const has = (id) => model.marks.some((m) => m.id === id);
  const edited = (id) => (model.edited?.includes(id) ? model.edited : [...(model.edited ?? []), id]);
  switch (a.type) {
    case "move-mark":
      return has(a.mark) ? { ...model, edited: edited(a.mark), marks: model.marks.map((m) => (m.id === a.mark ? { id: m.id, x: a.to[0], y: a.to[1] } : m)) } : GONE;
    case "add-mark":
      return a.mark === "m" + model.next && !has(a.mark)
        ? { ...model, edited: edited(a.mark), marks: [...model.marks, { id: a.mark, x: a.to[0], y: a.to[1] }], next: model.next + 1 }
        : { skip: "its id is taken" };
    case "delete-mark":
      return has(a.mark) ? { ...model, edited: (model.edited ?? []).filter((id) => id !== a.mark), marks: model.marks.filter((m) => m.id !== a.mark) } : GONE;
    case "check":
      return { ...model, checked: !!a.on };
    default:
      return { skip: "not an action of this study" };
  }
}

export function describe(a, count = 1) {
  switch (a.type) {
    case "run": return `threshold ${a.output.threshold} · ${a.output.count} pixels`;
    case "move-mark": return count > 1 ? `Moved ${count} marks` : `Moved mark ${a.mark}`;
    case "add-mark": return `Added mark ${a.mark}`;
    case "delete-mark": return `Deleted mark ${a.mark}`;
    case "check": return a.on ? "Count checked" : "Count unchecked";
    default: return a.type;
  }
}

export function where(a, model) {
  let at = null;
  if (a.type === "move-mark") at = a.to;
  else if (a.type === "add-mark" || a.type === "delete-mark") { const m = model.marks.find((k) => k.id === a.mark); at = m && [m.x, m.y]; }
  return at ? [at[0] - 3, at[1] - 3, at[0] + 3, at[1] + 3] : null;
}

export function document(model) {
  return { labels: [{ threshold: model.threshold, count: model.count }], marks: model.marks.map(({ id, x, y }) => ({ id, x, y })), checked: model.checked };
}

export function load(doc) {
  const marks = (doc.marks ?? []).map(({ id, x, y }) => ({ id, x, y }));
  return { threshold: doc.labels?.[0]?.threshold, count: doc.labels?.[0]?.count, marks, checked: !!doc.checked, edited: marks.map((m) => m.id),
    next: marks.reduce((n, m) => Math.max(n, idNumber(m.id) + 1), 1) };
}
