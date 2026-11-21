// A reading's text read into fields in the page, on its text alone: what fields.label does with a block whose place on
// the spine is unknown ({text}), for the tagger's readers. The finder's own labelling, with each line's place, stays
// the study's Python.

// Python's whitespace (str.isspace), which its \s, split() and strip() use
const WS = "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const S = `[${WS}]`, NS = `[^${WS}]`;
const FIELDS = ["title", "author", "publisher", "volume", "library"];
const SEPARATOR = new RegExp(`${S}+[/\\\\|•·∙.\\-–—]${S}+|(?<=[א-ת׳'".])${S}+[o0]${S}+(?=[א-ת])`, "gu");
const SLASH = new Set(["/", "\\"]);
const INITIAL = /^(?:[א-תA-Z][.׳'])+$/u;
const VOLUME_WORD = `(?:(?:חלק|כרך|ספר|מס')${S}+${NS}{1,4}|(?:vol\\.?|volume|part|book|no\\.?)${S}*${NS}{1,4})`;
const VOLUME = new RegExp(`^${VOLUME_WORD}$`, "iu");
const BARE = /^(?:[IVXLC]{1,5}|\p{Nd}{1,2}|[א-ת][׳']?|[A-Z])$/iu;
const VOLUME_TAIL = new RegExp(`^(.+?)${S}+(${VOLUME_WORD})$`, "iu");
const CODE = `[A-Za-zא-ת][A-Za-zא-ת.׳'"]{0,4}\\p{Nd}*`;
const CALL = new RegExp(`^\\p{Nd}{3}(?:\\.\\p{Nd}+(?:${S}+${CODE})?|${S}+${CODE})$`, "u");
const PUBLISHERS = [
  "עם עובד", "כתר", "ידיעות ספרים", "זמורה ביתן", "זמורה ביתן מודן", "מודן", "ספריית מעריב", "מועדון קוראי מעריב", "מעריב",
  "ידיעות אחרונות", "ספרי חמד", "כנרת", "הקיבוץ המאוחד", "ספריית פועלים", "שוקן", "אחיאסף", "עופרים", "אופוס",
  "הכורסא", "יבנה", "מסדה", "בבל", "חרגול", "אריה ניר", "כנרת זמורה ביתן", "מטר", "הד ארצי", "סטימצקי", "פוקט",
  "Penguin", "Vintage", "Bantam", "Tor", "Ace", "Del Rey", "Harper", "HarperCollins", "Random House", "Picador",
  "Faber", "Orbit", "Gollancz", "Signet", "Pocket Books", "Ballantine", "Scholastic", "Portfolio", "Pan", "Oxford",
];

const split = (t) => t.split(new RegExp(`${S}+`, "u")).filter(Boolean);
const strip = (t) => t.replace(new RegExp(`^${S}+|${S}+$`, "gu"), "");
const fold = (t) => t.toUpperCase().toLowerCase();
const words = (t) => split(t.normalize("NFKC").replace(/״/g, '"'));
const PUB_WORDS = PUBLISHERS.map(words).map((w, i) => [w, i]).sort((a, b) => b[0].length - a[0].length || a[1] - b[1]).map(([w]) => w);

// the text parted at its separators: [{text, cut: the separator before it, whole: no separator parted its line}]
function pieces(raw) {
  const text = split(raw).join(" "), parts = [];
  let start = 0, cut = null;
  for (const m of text.matchAll(SEPARATOR)) { parts.push([start, m.index, cut]); start = m.index + m[0].length; cut = strip(m[0]); }
  parts.push([start, text.length, cut]);
  return parts.map(([s, e, c]) => ({ text: strip(text.slice(s, e)), cut: c })).filter((p) => p.text);
}

// a piece whose end is a volume or a publisher, cut there: [the rest, the end] or null
function volumeTail(t) {
  const m = VOLUME_TAIL.exec(t);
  return m ? [m[1], m[2]] : null;
}
function publisherTail(t) {
  const w = words(t);
  for (const pub of PUB_WORDS) {
    if (w.length >= pub.length && w.slice(-pub.length).every((x, i) => fold(x) === fold(pub[i]))) return [w.slice(0, -pub.length).join(" "), w.slice(-pub.length).join(" ")];
  }
  return null;
}
const cutOff = (p, [rest, end], field) => (strip(rest) ? [{ ...p, text: rest, field: null }, { ...p, text: end, field }] : [{ ...p, text: end, field }]);

// {fields, regions} of one reading's text; with no place to read them from, regions is always empty, and a looser
// library mark, which needs the spine's ends, is never taken, whatever librarySeen says
export function label(text) {
  const ps = pieces(text), out = [];
  for (const p of ps) {
    let t;
    if (CALL.test(p.text)) out.push({ ...p, field: "library" });
    else if (ps.length > 1 && (VOLUME.test(p.text) || (BARE.test(p.text) && p.cut !== null))) out.push({ ...p, field: "volume" });
    else if ((t = volumeTail(p.text))) out.push(...cutOff(p, t, "volume"));
    else if ((t = publisherTail(p.text))) out.push(...cutOff(p, t, "publisher"));
    else out.push({ ...p, field: null });
  }
  const rest = out.filter((p) => p.field === null);
  if (rest.length > 1) {
    const slash = rest.findIndex((p) => SLASH.has(p.cut));
    const initial = rest.filter((p) => split(p.text).some((w) => INITIAL.test(w)));
    if (slash >= 0) for (const p of rest.slice(0, slash)) p.field = "author";
    else if (initial.length === 1) initial[0].field = "author";
  }
  const fields = {};
  for (const f of FIELDS) {
    const mine = out.filter((p) => (p.field ?? "title") === f && strip(p.text));
    if (mine.length) fields[f] = mine.map((p) => p.text).join(" ");
  }
  return { fields, regions: {} };
}
