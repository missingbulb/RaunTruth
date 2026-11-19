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

// ---------- a book's text, field by field ----------
// the fields a spine's text is set in, in the order the task shows them and its text joins them; a field with no text
// is absent, never ""
export const FIELDS = ["title", "author", "publisher", "volume", "library"];
const NAMES = { title: "a title", author: "an author", publisher: "a publisher", volume: "a volume", library: "a library mark" };
const only = (f) => Object.fromEntries(FIELDS.filter((k) => f?.[k]).map((k) => [k, f[k]]));
export const joined = (f) => FIELDS.map((k) => f[k]).filter(Boolean).join(" / ");
// a book, an output's or a file's, from before the fields has its text as its title
const fieldsOf = (b) => only(b.fields ?? { title: b.text ?? "" });
const titleAlone = (f) => Object.keys(f).every((k) => k === "title");
const boxes = (r) => Object.fromEntries(FIELDS.filter((k) => r?.[k]).map((k) => [k, [...r[k]]]));
const empty = (o) => !Object.keys(o).length;
// a book with these fields, its text theirs joined and typed when any field is the tagger's
const withFields = (b, fields, typedFields = b.typedFields, regions = b.regions) => ({ ...b, fields: only(fields), text: joined(only(fields)),
  typedFields, typed: !empty(typedFields), regions: boxes(regions) });

const number = (id) => +id.slice(1);
const largest = (books, kind) => books.reduce((n, b) => (b.id[0] === kind ? Math.max(n, number(b.id)) : n), 0);
const copy = (corners) => corners.map((p) => [...p]);
const near = (p, q) => p.every((c, i) => Math.abs(c - q[i]) <= MATCH_PX);

// ---------- a run's model ----------
// The finder's and the reader's output as a model. With the model of the run before it, a book whose four corners are each
// within MATCH_PX of one of its books' (as it stands, or as the finder proposed it, for a book the tagger has moved) takes
// that book's id; the rest take ids above both runs' largest. The tagger's work in the model before is carried over: see `carried`.
export function start(output, previous) {
  const free = new Map((previous?.books ?? []).filter((b) => b.id[0] === "b").map((b) => [b.id, b]));
  let top = Math.max(previous?.next ? previous.next - 1 : 0, 0);
  const fits = (p, b) => [p.corners, p.proposed?.corners].some((c) => c && c.every((q, i) => near(q, b.corners[i])));
  const claimed = output.books.map((b) => {
    for (const [id, p] of free) if (fits(p, b)) { free.delete(id); return id; }
    return null;
  });
  top = Math.max(top, ...claimed.filter(Boolean).map(number), 0);
  const books = output.books.map((b, i) => withFields({
    id: claimed[i] ?? `b${++top}`, corners: copy(b.corners), view: b.view, turn: b.turn ?? 0, turnSet: false,
    confidence: b.confidence ?? null, reader: b.reader ?? output.reader ?? null, source: "found", verdict: null,
    proposed: { corners: copy(b.corners), text: joined(fieldsOf(b)), fields: fieldsOf(b) } }, fieldsOf(b), {}, b.regions));
  return { image: output.image, W: output.W, H: output.H, reader: output.reader ?? null, ...carried(previous, books), next: top + 1 };
}

// whether the tagger did anything to a book of the model before
const moved = (p) => !!p.proposed && JSON.stringify(p.corners) !== JSON.stringify(p.proposed.corners);
const worked = (p) => p.verdict != null || p.typed || p.turnSet || moved(p);

// the fields the tagger typed in p, put over the reader's in b
function typedOnto(b, p) {
  const fields = { ...b.fields }, regions = { ...b.regions }, typedFields = { ...b.typedFields };
  for (const k of Object.keys(p.typedFields ?? {})) {
    if (p.fields?.[k]) fields[k] = p.fields[k]; else delete fields[k];
    if (p.regions?.[k]) regions[k] = p.regions[k]; else delete regions[k];
    typedFields[k] = true;
  }
  return withFields(b, fields, typedFields, regions);
}

// What the tagger did in the model before, put onto a run's books: a verdict, typed fields, a turn and moved corners go to
// the book with the same id; a book the tagger added and none missed stand as they were. A book the run does not have, on
// which the tagger had done something, is listed in `dropped` by id and left out.
function carried(previous, found) {
  const none = { books: found, noneMissed: false, added: 0 };
  if (!previous) return none;
  const now = new Map(found.map((b) => [b.id, b])), dropped = [], added = [];
  for (const p of previous.books) {
    if (p.source === "missed") { added.push({ ...p, corners: copy(p.corners), proposed: null }); continue; }
    const hit = now.get(p.id);
    if (!hit) { if (worked(p)) dropped.push(p.id); continue; }
    if (!worked(p)) continue;
    now.set(p.id, { ...typedOnto(hit, p), verdict: p.verdict ?? null, ...(p.turnSet ? { turn: p.turn, turnSet: true } : {}),
      ...(moved(p) ? { corners: copy(p.corners), view: p.view } : {}) });
  }
  return { books: [...found.map((b) => now.get(b.id)), ...added], noneMissed: !!previous.noneMissed, added: Math.max(previous.added ?? 0, largest(previous.books, "u")),
    ...(dropped.length ? { dropped } : {}) };
}

// ---------- the model and its file ----------
// the file: every book in the order they stand, with its id and its verdict (right, or null while it is not decided). A
// book whose text is a title alone is written as before the fields, its text the title
const fieldsKept = (f) => (titleAlone(f) ? {} : { fields: { ...f } });
export function document(model) {
  return { image: model.image, W: model.W, H: model.H, reader: model.reader,
    books: inPlace(model.books).map((b) => ({ id: b.id, source: b.source, verdict: b.verdict, corners: copy(b.corners), turn: b.turn || 0, text: b.text ?? "",
      ...fieldsKept(fieldsOf(b)), ...(empty(boxes(b.regions)) ? {} : { regions: boxes(b.regions) }),
      ...(b.proposed ? { proposed: { corners: copy(b.proposed.corners), text: b.proposed.text, ...fieldsKept(fieldsOf(b.proposed)) } } : {}) })),
    none_missed: model.noneMissed, next: { b: model.next, u: model.added + 1 } };
}

// the file of a photo on which no book is found: what the log starts from when a book is added before the finder has run
export const blank = ({ image, W, H, reader }) => ({ image, W, H, reader: reader ?? null, books: [], none_missed: false, next: { b: 1, u: 1 } });

// the file read again; a file from before the books had ids lists the books marked right alone, and was submitted only
// once none was missed
export function load(doc) {
  const old = doc.books.some((b) => b.id == null);
  // a field unlike what was proposed for it, or on a book none proposed, is the tagger's
  const typedOf = (f, p) => Object.fromEntries(FIELDS.filter((k) => (p ? (f[k] ?? "") !== (p[k] ?? "") : !!f[k])).map((k) => [k, true]));
  const books = doc.books.map((b, i) => withFields({
    id: b.id ?? `b${i + 1}`, corners: copy(b.corners), view: shape(b.corners), turn: b.turn ?? 0, turnSet: true,
    confidence: null, reader: doc.reader ?? null, source: b.source, verdict: b.verdict ?? null,
    proposed: b.proposed ? { corners: copy(b.proposed.corners), text: b.proposed.text, fields: fieldsOf(b.proposed) } : null },
  fieldsOf(b), typedOf(fieldsOf(b), b.proposed ? fieldsOf(b.proposed) : null), b.regions));
  return { image: doc.image, W: doc.W, H: doc.H, reader: doc.reader ?? null, books, noneMissed: old ? true : !!doc.none_missed,
    next: Math.max(doc.next?.b ?? 1, largest(books, "b") + 1), added: Math.max((doc.next?.u ?? 1) - 1, largest(books, "u")) };
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

// the fields given set and marked the tagger's, the book unchanged when every one already is
function typed(b, given) {
  const ks = FIELDS.filter((k) => k in given);
  if (ks.every((k) => (b.fields[k] ?? "") === (given[k] ?? "") && b.typedFields[k])) return b;
  const fields = { ...b.fields }, typedFields = { ...b.typedFields };
  for (const k of ks) { fields[k] = given[k]; typedFields[k] = true; }
  return withFields(b, fields, typedFields);
}

function apply(m, a) {
  switch (a.type) {
    case "move-corners": {
      const corners = clockwise(a.corners);
      return edit(m, a.book, (b) => (JSON.stringify(b.corners) === JSON.stringify(corners) ? b : { ...b, corners, view: shape(corners) }));
    }
    case "flip": return edit(m, a.book, (b) => ({ ...b, turn: ((b.turn || 0) + 2) % 4, turnSet: true }));
    // a log kept before the fields sets the title alone
    case "set-text": return edit(m, a.book, (b) => typed(b, { title: a.text }));
    case "set-fields": return edit(m, a.book, (b) => typed(b, a.fields));
    case "swap-fields": return edit(m, a.book, (b) => {
      if (!b.fields[a.a] && !b.fields[a.b]) return b;
      const fields = { ...b.fields, [a.a]: b.fields[a.b], [a.b]: b.fields[a.a] }, regions = { ...b.regions, [a.a]: b.regions[a.b], [a.b]: b.regions[a.a] };
      return withFields(b, fields, { ...b.typedFields, [a.a]: true, [a.b]: true }, regions);
    });
    // Right on fields typed and not yet committed carries them: the two are one action
    case "approve": return edit(m, a.book, (b) => {
      const given = a.fields ?? (a.text !== undefined ? { title: a.text } : null), now = given ? typed(b, given) : b;
      return b.verdict === "right" && now === b ? b : { ...now, verdict: "right" };
    });
    case "read": return withReader(edit(m, a.book, (b) => {
      const said = fieldsOf(a), fields = { ...b.fields }, regions = { ...b.regions };
      for (const k of FIELDS) {
        if (b.typedFields[k]) continue;
        if (said[k]) fields[k] = said[k]; else delete fields[k];
        if (a.regions?.[k]) regions[k] = a.regions[k]; else delete regions[k];
      }
      const proposed = b.proposed ?? (b.source === "found" ? { corners: copy(b.corners), text: joined(said), fields: said } : null);
      const now = { ...withFields(b, fields, b.typedFields, regions), confidence: a.confidence ?? null, reader: a.reader, turn: a.turn ?? b.turn, proposed };
      return JSON.stringify(now) === JSON.stringify(b) ? b : now;
    }), a.reader);
    case "add": {
      if (m.books.some((b) => b.id === a.book)) return THERE;
      const corners = clockwise(a.corners);
      const b = withFields({ id: a.book, corners, view: shape(corners), turn: 0, turnSet: false, confidence: null, reader: null, source: "missed", verdict: null, proposed: null }, {}, {}, {});
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
    case "set-fields": {
      const ks = FIELDS.filter((k) => k in (a.fields ?? {}));
      if (count > 1) return `Set ${count} fields`;
      if (ks.length !== 1) return "Moved text between fields";
      return a.fields[ks[0]] ? `Set ${NAMES[ks[0]]}: ${a.fields[ks[0]]}` : `Cleared ${NAMES[ks[0]]}`;
    }
    case "swap-fields": {
      const [x, y] = [a.a, a.b].sort((p, q) => FIELDS.indexOf(p) - FIELDS.indexOf(q)).map((k) => NAMES[k].split(" ").slice(1).join(" "));
      return count === 1 ? `Swapped the ${x} and the ${y}` : `Swapped fields ${count} times`;
    }
    case "approve": {
      const t = a.fields ? joined(only(a.fields)) : a.text;
      return count === 1 ? (t ? `Approved a book: ${t}` : "Approved a book") : `Approved ${count} books`;
    }
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
