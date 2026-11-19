// A study's tags (req/shell/data/tags, req/shell/data/hidden, req/shell/load/study-images): what a tag may be, a
// multi-value tag's one value, the tags a folder gives the images under it, the images a study hides, and the groups
// Load study images lists them in. A tag is a word ("damaged-slide") or a multi-value tag's value ("group:sick").
"use strict";

const WORD = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// the name the page gives every image's folder path, which no tag may take
export const FOLDER = "folder";

// {tag} for text that reads as a tag, written as the page keeps it, else {error}
export function parseTag(text) {
  const s = String(text).trim().toLowerCase().replace(/\s+/g, "-"), parts = s.split(":");
  if (!s) return { error: "Type a tag." };
  if (parts.length > 2) return { error: "A tag has at most one colon: name:value." };
  if (!parts.every((p) => WORD.test(p))) return { error: "A tag is words of letters and digits joined by hyphens, like damaged-slide or group:wild-type." };
  if (parts[0] === FOLDER) return { error: `"${FOLDER}" is the page's own tag, given to every image.` };
  return { tag: s };
}

// a multi-value tag's name, null for a word
export const nameOf = (tag) => (tag.includes(":") ? tag.slice(0, tag.indexOf(":")) : null);

// tags with tag added: a multi-value tag's other value replaced, a tag held once; sorted
export function addTag(tags, tag) {
  const name = nameOf(tag);
  return [...new Set([...tags.filter((t) => !name || nameOf(t) !== name), tag])].sort();
}

// The tags an image carries: its own, over those of the folders holding it (inherited, nearest first), each nearer
// one's value of a multi-value tag winning; sorted
export function effective(own, inherited = []) {
  let tags = [];
  for (const layer of [...inherited].reverse()) for (const t of layer) tags = addTag(tags, t);
  for (const t of own) tags = addTag(tags, t);
  return tags;
}

// whether hide's rules hide an image carrying tags: a rule names a tag, a value, or a multi-value tag's every value
export const isHidden = (tags, hide = []) => hide.some((r) => tags.includes(r) || (!r.includes(":") && tags.some((t) => nameOf(t) === r)));

// the multi-value tags the images carry, by name, sorted
export const multiNames = (images) => [...new Set(images.flatMap((i) => (i.tags || []).map(nameOf).filter(Boolean)))].sort();

// [{label, folder, items}] the images in groups: by folder (by null or FOLDER), a group per folder headed by its path,
// in the images' order; by a multi-value tag, a group per value, sorted, then those with none
export function groupsOf(images, by) {
  const groups = new Map();
  const put = (key, label, folder, im) => { if (!groups.has(key)) groups.set(key, { label, folder, items: [] }); groups.get(key).items.push(im); };
  if (!by || by === FOLDER) {
    for (const im of images) put(im.folder, im.path.join(" / "), im.folder, im);
    return [...groups.values()];
  }
  const none = [];
  for (const im of images) {
    const t = (im.tags || []).find((x) => nameOf(x) === by);
    if (t) put(t, `${by}: ${t.slice(by.length + 1)}`, null, im); else none.push(im);
  }
  const out = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, g]) => g);
  return none.length ? [...out, { label: `No ${by}`, folder: null, items: none }] : out;
}
