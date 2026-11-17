// The Bookshelf Reader's GT actions: pure functions the shell's action log replays, with no page and no clock (the time an
// action carries is its own, `at`). A book is named by its id, which the model and the file keep and the tagger never sees,
// so an action means the same book after the file is read again or the finder runs again. The finder's books are b1, b2, …;
// a book the tagger adds has an id of its own kind, u1, u2, …, so that finding again never gives two books one id.

const MATCH_PX = 3;
const GONE = { skip: "its book is gone" }, SAME = { skip: "nothing to change" }, THERE = { skip: "it is already there" };
const isSkip = (r) => !!r && typeof r === "object" && "skip" in r;

// corners clockwise from the one nearest the photo's top left
export function clockwise(pts) {
  const cx = pts.reduce((a, p) => a + p[0], 0) / 4, cy = pts.reduce((a, p) => a + p[1], 0) / 4;
  const round = [...pts].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  const first = round.reduce((k, p, i) => (p[0] + p[1] < round[k][0] + round[k][1] ? i : k), 0);
  return [...round.slice(first), ...round.slice(0, first)].map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}
// a box as tall as it is wide or wider is a cover, a taller one a spine
export const shape = (corners) => { const [a, b, , d] = corners; return Math.hypot(d[0] - a[0], d[1] - a[1]) > Math.hypot(b[0] - a[0], b[1] - a[1]) ? "spine" : "cover"; };

// the books in the order they stand on the photo: shelf by shelf from the top, each shelf left to right. A book is on
// the shelf of the first book there while the two overlap in height by half the shorter's
export function inPlace(list) {
  const span = (b) => { const ys = b.corners.map((p) => p[1]); return [Math.min(...ys), Math.max(...ys)]; };
  const mid = (b, k) => b.corners.reduce((a, p) => a + p[k], 0) / 4;
  const rows = [];
  for (const b of [...list].sort((a, c) => mid(a, 1) - mid(c, 1))) {
    const [t, f] = span(b), row = rows.find((r) => Math.min(f, r.f) - Math.max(t, r.t) > 0.5 * Math.min(f - t, r.f - r.t));
    if (row) row.books.push(b); else rows.push({ t, f, books: [b] });
  }
  return rows.flatMap((r) => r.books.sort((a, c) => mid(a, 0) - mid(c, 0)));
}

const number = (id) => +id.slice(1);
const largest = (books, kind) => books.reduce((n, b) => (b.id[0] === kind ? Math.max(n, number(b.id)) : n), 0);
const copy = (corners) => corners.map((p) => [...p]);
const near = (p, q) => p.every((c, i) => Math.abs(c - q[i]) <= MATCH_PX);

// ---------- a run's model ----------
// The finder's and the reader's output as a model. With the model of the run before it, a book whose four corners are each
// within MATCH_PX of one of its books' takes that book's id; the rest take ids above both runs' largest.
export function start(output, previous) {
  const free = new Map((previous?.books ?? []).filter((b) => b.id[0] === "b").map((b) => [b.id, b]));
  let top = Math.max(previous?.next ? previous.next - 1 : 0, 0);
  const claimed = output.books.map((b) => {
    for (const [id, p] of free) if (p.corners.every((c, i) => near(c, b.corners[i]))) { free.delete(id); return id; }
    return null;
  });
  top = Math.max(top, ...claimed.filter(Boolean).map(number), 0);
  const books = output.books.map((b, i) => ({
    id: claimed[i] ?? `b${++top}`, corners: copy(b.corners), view: b.view, turn: b.turn ?? 0, turnSet: false, text: b.text ?? "", typed: false,
    confidence: b.confidence ?? null, reader: b.reader ?? output.reader ?? null, source: "found", verdict: null,
    proposed: { corners: copy(b.corners), text: b.text ?? "" } }));
  return { image: output.image, W: output.W, H: output.H, reader: output.reader ?? null, books, noneMissed: false, next: top + 1, added: 0 };
}

// ---------- the model and its file ----------
// the file: every book in the order they stand, with its id and its verdict (right, or null while it is not decided)
export function document(model) {
  return { image: model.image, W: model.W, H: model.H, reader: model.reader,
    books: inPlace(model.books).map((b) => ({ id: b.id, source: b.source, verdict: b.verdict, corners: copy(b.corners), turn: b.turn || 0, text: b.text ?? "",
      ...(b.proposed ? { proposed: { corners: copy(b.proposed.corners), text: b.proposed.text } } : {}) })),
    none_missed: model.noneMissed };
}

// the file read again; a file from before the books had ids lists the books marked right alone, and was submitted only
// once none was missed
export function load(doc) {
  const old = doc.books.some((b) => b.id == null);
  const books = doc.books.map((b, i) => ({
    id: b.id ?? `b${i + 1}`, corners: copy(b.corners), view: shape(b.corners), turn: b.turn ?? 0, turnSet: true, text: b.text ?? "",
    typed: !!b.text && (!b.proposed || b.text !== b.proposed.text), confidence: null, reader: doc.reader ?? null, source: b.source,
    verdict: b.verdict ?? null, proposed: b.proposed ? { corners: copy(b.proposed.corners), text: b.proposed.text } : null }));
  return { image: doc.image, W: doc.W, H: doc.H, reader: doc.reader ?? null, books, noneMissed: old ? true : !!doc.none_missed,
    next: largest(books, "b") + 1, added: largest(books, "u") };
}

// ---------- an action done ----------
const edit = (m, id, fn) => {
  const i = m.books.findIndex((b) => b.id === id);
  if (i < 0) return GONE;
  const was = m.books[i], now = fn(was);
  if (now === was) return SAME;
  return { ...m, books: m.books.map((b, k) => (k === i ? now : b)) };
};

// the model's reader is the one that read last
const withReader = (r, reader) => (isSkip(r) || r.reader === reader ? r : { ...r, reader });

function apply(m, a) {
  switch (a.type) {
    case "move-corners": {
      const corners = clockwise(a.corners);
      return edit(m, a.book, (b) => (JSON.stringify(b.corners) === JSON.stringify(corners) ? b : { ...b, corners, view: shape(corners) }));
    }
    case "flip": return edit(m, a.book, (b) => ({ ...b, turn: ((b.turn || 0) + 2) % 4, turnSet: true }));
    case "set-text": return edit(m, a.book, (b) => (b.text === a.text && b.typed ? b : { ...b, text: a.text, typed: true }));
    case "approve": return edit(m, a.book, (b) => (b.verdict === "right" ? b : { ...b, verdict: "right" }));
    case "read": return withReader(edit(m, a.book, (b) => {
      const text = b.typed ? b.text : a.text;
      const proposed = b.proposed ?? (b.source === "found" ? { corners: copy(b.corners), text: a.text } : null);
      const now = { ...b, text, confidence: a.confidence ?? null, reader: a.reader, turn: a.turn ?? b.turn, proposed };
      return JSON.stringify(now) === JSON.stringify(b) ? b : now;
    }), a.reader);
    case "add": {
      if (m.books.some((b) => b.id === a.book)) return THERE;
      const corners = clockwise(a.corners);
      const b = { id: a.book, corners, view: shape(corners), turn: 0, turnSet: false, text: "", typed: false, confidence: null, reader: null, source: "missed", verdict: null, proposed: null };
      return { ...m, books: [...m.books, b], noneMissed: false, added: Math.max(m.added, number(a.book)) };
    }
    case "delete": return m.books.some((b) => b.id === a.book) ? { ...m, books: m.books.filter((b) => b.id !== a.book) } : GONE;
    case "none-missed": return m.noneMissed === !!a.on ? SAME : { ...m, noneMissed: !!a.on };
    default: return { skip: "not an action of this study" };
  }
}

export function run(model, action) {
  const r = apply(model, action);
  return r === model ? SAME : r;
}

// the id a book added next is given
export const nextAdded = (m) => `u${m.added + 1}`;

// ---------- how an action reads, and where it is ----------
const plural = (n, one, many) => (n === 1 ? one : many);
export function describe(a, count = 1) {
  switch (a.type) {
    case "run": return `${a.output?.books?.length ?? 0} books`;
    case "move-corners": return plural(count, "Moved a book's corner", `Moved ${count} books' corners`);
    case "flip": return plural(count, "Flipped a book", `Flipped ${count} books`);
    case "set-text": return count === 1 ? (a.text ? `Set a title: ${a.text}` : "Cleared a title") : `Set ${count} titles`;
    case "approve": return plural(count, "Approved a book", `Approved ${count} books`);
    case "add": return plural(count, "Added a missed book", `Added ${count} missed books`);
    case "delete": return plural(count, "Deleted a book", `Deleted ${count} books`);
    case "none-missed": return count > 1 ? `Judged none missed ${count} times` : a.on ? "Said no book was missed" : "Took back none missed";
    case "read": return plural(count, "Read a title again", `Read ${count} titles again`);
    default: return a.type;
  }
}

// the book's box in image pixels, [x0, y0, x1, y1], from the model as it stands: null when the book is not there
export function where(a, m) {
  if (a.book == null) return null;
  const b = m.books.find((x) => x.id === a.book);
  if (!b) return null;
  const xs = b.corners.map((p) => p[0]), ys = b.corners.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
