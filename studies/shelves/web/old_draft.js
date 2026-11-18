// The draft this study kept in the browser's own storage before it kept GT actions, under the key the shell made of the study,
// the photo's name and its hash: {books, noneMissed, open}. The shell offers it once (shell.gt.legacy), as a base, and the key
// is forgotten when a draft holds it.

// {model, count, from, forget} for shell.gt.legacy, the model being the study's document: the books the draft held (a book
// marked wrong, which a draft kept before Not a book took a box away held still, is no book), the finder's with the ids b1, b2, …
// and the tagger's own with u1, u2, …; null when there is no draft
export function oldDraft(readJSON, { name, sha, image, W, H, reader }) {
  const key = `gt-draft|shelves|${name}|${sha}`;
  const d = readJSON(key, null);
  if (!d || !Array.isArray(d.books)) return null;
  const kept = d.books.filter((b) => b.verdict !== "wrong" && Array.isArray(b.corners));
  let found = 0, added = 0;
  const books = kept.map((b) => ({ id: b.source === "missed" ? `u${++added}` : `b${++found}`, source: b.source ?? "found", verdict: b.verdict ?? null, corners: b.corners,
    turn: b.turn || 0, text: b.text ?? "", ...(b.proposed ? { proposed: { corners: b.proposed.corners, text: b.proposed.text } } : {}) }));
  return { model: { image, W, H, reader, books, none_missed: !!d.noneMissed }, count: Math.max(1, kept.filter((b) => b.verdict).length),
    from: "a draft kept before Edit History", forget: () => { try { localStorage.removeItem(key); } catch { /* no storage */ } } };
}
