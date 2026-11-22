// A study's root folder in the remote store (req/shell/data/roles, req/shell/ground-truth/setup, shell/study/one-file):
// the one folder its study.json names, and the one study file in it, which holds the folders under it by id, the study
// index, the tags, the hide and grouping rules, the marks and the stage. Its marks are
// {<image's SHA-256>: {gt: {file, by}, official: {file, by}}}: the extraction file each mark names by its Drive id, and its
// author's email or null, one of each kind per image; a mark follows its file's latest content (shell/study/marks). A root with no study file has its folders
// found by name; one still holding the settings, index and tags files of before is read as it was and written back as
// one file by the next save. read() is cached a minute per root; every write reads the root afresh and merges into what
// it finds, as two managers may edit at once. reader: all(folder) as [{id, name, folder}], text(id); writer:
// folder(parent, name), create(parent, name, blob), replace(id, blob), share(id) (anyone with the link may view),
// ours(id), trash(id).
"use strict";

export const SETTINGS = "rauntruth-study.json";
export const FORMAT = "rauntruth-study/2";
// the files the study file replaced, read while a root still holds them
const OLD_INDEX = "rauntruth-index.json", OLD_INDEX_FORMAT = "rauntruth-index/1";
const OLD_TAGS = "rauntruth-tags.json", OLD_TAGS_FORMAT = "rauntruth-tags/1";
// the names a folder is found by, lower-cased, best first, while the study file does not name it
const NAMES = { data: ["data"], extractions: ["extractions"], previews: ["previews"] };
// the names setup() and previewsFolder() give the folders they make
const MADE = { extractions: "Extractions", previews: "Previews" };
const KEEP_MS = 60e3;
const known = new Map();

const byName = (items, names) => {
  for (const n of names) {
    const f = items.find((x) => x.folder && x.name.trim().toLowerCase() === n);
    if (f) return f.id;
  }
  return null;
};
const json = (doc) => new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" });
const parsed = async (reader, id) => { try { return JSON.parse(await reader.text(id)); } catch { return null; } };
// the study file's index section as the page uses it, null while there is none or it does not read as one
const indexOf = (d) => (Array.isArray(d?.folders) && Array.isArray(d?.images) ? { built_by: d.built_by ?? null, built_at: d.built_at ?? null, folders: d.folders, images: d.images } : null);
const tagsOf = (d) => ({ images: d?.images && typeof d.images === "object" ? d.images : {}, folders: d?.folders && typeof d.folders === "object" ? d.folders : {} });

// {root, data, extractions, previews, set, file, doc, folders, group, hide, stage, tags, marks, index, old}: the folders under root by id, each null while there is none; set whether the study file named them;
// file its id or null and doc what it holds; folders the listed folders (req/shell/data/folders), the data folder or
// else the root while the file names none; group and hide its grouping tag and hide rules; stage its stage or null;
// tags {images, folders} and marks {} as it holds them; index its study index {folders, images, built_by, built_at}
// or null; old the ids of the index and tags files of before still in the root, {index, tags}, whose contents stand in
// for sections the study file lacks. fresh: read past the minute's copy.
export async function read(reader, root, { fresh = false } = {}) {
  const kept = known.get(root);
  if (!fresh && kept && Date.now() - kept.at < KEEP_MS) return kept.value;
  const items = await reader.all(root), file = items.find((f) => !f.folder && f.name === SETTINGS) || null;
  const oldIndex = items.find((f) => !f.folder && f.name === OLD_INDEX) || null, oldTags = items.find((f) => !f.folder && f.name === OLD_TAGS) || null;
  const doc = file ? await parsed(reader, file.id) : null;
  // a section the study file lacks is the one the file of before held
  let index = indexOf(doc?.index), tags = doc?.tags ? tagsOf(doc.tags) : null;
  if (!index && oldIndex) { const d = await parsed(reader, oldIndex.id); if (d?.format === OLD_INDEX_FORMAT) index = indexOf(d); }
  if (!tags && oldTags) { const d = await parsed(reader, oldTags.id); if (d?.format === OLD_TAGS_FORMAT) tags = tagsOf(d); }
  // the file names a folder by id, wherever it now lives; the names count only where it names none
  const pick = (k) => doc?.[k] || byName(items, NAMES[k]);
  const data = pick("data"), listed = Array.isArray(doc?.folders) ? doc.folders.filter((id) => typeof id === "string") : null;
  const value = { root, data, extractions: pick("extractions"), previews: pick("previews"), set: !!doc?.extractions, file: file?.id ?? null,
    doc, folders: listed || [data || root], index, tags: tags || tagsOf(null), marks: doc?.marks && typeof doc.marks === "object" ? doc.marks : {},
    stage: typeof doc?.stage === "string" ? doc.stage : null, old: { index: oldIndex?.id ?? null, tags: oldTags?.id ?? null },
    group: typeof doc?.group === "string" ? doc.group : null, hide: Array.isArray(doc?.hide) ? doc.hide.filter((t) => typeof t === "string") : [] };
  known.set(root, { at: Date.now(), value });
  return value;
}

// The study file as it is written: what it holds, the sections of the files of before folded in, in the one format.
const whole = (was) => {
  const doc = { ...(was.doc || {}), format: FORMAT };
  if (was.index) doc.index = was.index;
  if (was.doc?.tags || was.old.tags) doc.tags = was.tags;
  return doc;
};

// The study file written once from what change makes of what the root holds now: read afresh, change(doc, was) returning
// the document to write (or changing it in place), a new file when the root has none, then the index and tags files of
// before trashed where the page made them. guard: a study file the page did not make is left alone. Returns read()'s
// answer afresh.
async function save({ reader, writer, root, change, guard = true }) {
  const was = await read(reader, root, { fresh: true });
  if (guard && was.file && !(await writer.ours(was.file))) throw new Error(`The study file, ${SETTINGS} in the study's root, was not made by this page, so the page leaves it alone. Delete it to let the page manage it.`);
  const doc = change(whole(was), was) || {};
  if (was.file) await writer.replace(was.file, json(doc)); else await writer.create(root, SETTINGS, json(doc));
  for (const id of [was.old.index, was.old.tags]) {
    if (!id) continue;
    try { if (await writer.ours(id)) await writer.trash(id); } catch (e) { console.warn("a file of before the one study file was not trashed:", e); }
  }
  known.delete(root);
  return read(reader, root, { fresh: true });
}

// The study's Extractions folder made where missing, shared to view by link, and the study file written naming it. by: who set it
// up; at: when. Returns read()'s answer afresh.
export async function setup({ reader, writer, root, by, at = new Date() }) {
  const was = await read(reader, root, { fresh: true });
  const extractions = was.extractions || await writer.folder(root, MADE.extractions);
  await writer.share(extractions);
  return save({ reader, writer, root, guard: false,
    change: (d) => ({ ...d, data: was.data, extractions, set_by: by, set_at: at.toISOString() }) });
}

// The study file's keys in changes written, every other key it holds kept; a new file when the root has none. A study
// file the page did not make is left alone. writer.ours(id): whether the page made the file. Returns read()'s answer
// afresh.
export const setStudy = ({ reader, writer, root, changes }) => save({ reader, writer, root, change: (d) => ({ ...d, ...changes }) });

// The listed folders written into the study file (req/shell/data/folders)
export const setFolders = ({ reader, writer, root, folders }) => setStudy({ reader, writer, root, changes: { folders: [...new Set(folders)] } });

// The tags in the study file (req/shell/data/tags): {format, images: {id: {tags, description}}, folders: {id: {tags}}},
// empty while there are none, from the read of the minute
export async function readTags(reader, root) {
  const t = (await read(reader, root)).tags;
  return { format: OLD_TAGS_FORMAT, images: t.images, folders: t.folders };
}

// The tags written into the study file from doc ({images, folders}), with the study index too where index is given
// ({folders, images}; by: whose page built it, at: when): one write. "written" when anything differs from the file,
// "same" when nothing does, "not ours" when the study file there is not the page's.
export async function writeStudyData({ reader, writer, root, tags, index, by, at = new Date() }) {
  const was = await read(reader, root, { fresh: true });
  if (was.file && !(await writer.ours(was.file))) return "not ours";
  const held = (d) => JSON.stringify({ folders: d.folders, images: d.images, group: d.group ?? null, hide: d.hide ?? [] });
  const sameIndex = !index || (was.index && held({ ...was.index, group: was.group, hide: was.hide }) === held(index));
  const sameTags = !tags || (!was.old.tags && was.doc?.tags && JSON.stringify(tagsOf(was.doc.tags)) === JSON.stringify(tagsOf(tags)));
  if (sameIndex && sameTags && !was.old.index && !was.old.tags && was.doc?.format === FORMAT) return "same";
  await save({ reader, writer, root, change: (d) => ({ ...d,
    ...(tags ? { tags: { images: tags.images, folders: tags.folders } } : {}),
    ...(index ? { index: { built_by: by, built_at: at.toISOString(), folders: index.folders, images: index.images } } : {}) }) });
  return "written";
}

// The tags written from doc, the study file replaced or made; one the page did not make is left alone
export async function writeTags({ reader, writer, root, doc }) {
  if (await writeStudyData({ reader, writer, root, tags: doc }) === "not ours") {
    throw new Error(`The study file, ${SETTINGS} in the study's root, was not made by this page, so the page leaves it alone. Delete it to let the page manage it.`);
  }
}

// The study index in the study file (req/shell/data/index), {folders, images, group, hide}, or null while there is none
export async function readIndex(reader, root) {
  const s = await read(reader, root);
  return s.index ? { ...s.index, group: s.group, hide: s.hide } : null;
}

// The study index written from index ({folders, images}): "written" when it differs from the one there, "same" when it
// does not, "not ours" when the study file there is not the page's. by: whose page built it; at: when.
export const writeIndex = ({ reader, writer, root, index, by, at }) => writeStudyData({ reader, writer, root, index, by, at });

// a data folder's previews file, in the root's Previews folder, named by the data folder's id
export const previewsName = (folder) => `${folder}.tiff`;

// the root's Previews folder, made when it has none: its id
export async function previewsFolder({ reader, writer, root }) {
  const was = await read(reader, root, { fresh: true });
  if (was.previews) return was.previews;
  const id = await writer.folder(root, MADE.previews);
  known.delete(root);
  return id;
}

// The study on show's place in the remote store, for the page: remote the store, manifest() the study.
// Its reads are the store's own, as the signed-in user where anyone is (req/shell/drive/credentials).
export function studyPlace(remote, manifest) {
  const reader = { all: (id) => remote.all(id), text: async (id) => new TextDecoder().decode((await remote.file(id, SETTINGS)).bytes) };
  const root = () => remote.study(manifest()).root;
  const settings = async ({ fresh = false } = {}) => (root() ? read(reader, root(), { fresh }) : null);
  // the Previews folder's listing, once a minute at most: {at, folder, items}
  let previews = null;
  return {
    reader, root, settings,
    // the store's entry for a data folder's previews file, null for none, undefined when the store could not say;
    // fresh: read past the minute's copy
    async previewsOf(folder, { fresh = false } = {}) {
      try {
        const s = await settings({ fresh });
        if (!s?.previews) return null;
        if (fresh || !previews || previews.folder !== s.previews || Date.now() - previews.at >= KEEP_MS) previews = { at: Date.now(), folder: s.previews, items: await reader.all(s.previews) };
        return previews.items.find((f) => !f.folder && f.name === previewsName(folder)) || null;
      } catch (e) { console.warn("the study's previews could not be listed:", e); return undefined; }
    },
    // what was written into the root or its Previews folder, read afresh next time
    forgetPreviews() { previews = null; if (root()) known.delete(root()); },
    // the folders Load browses: the listed folders (req/shell/data/folders); [] for a study with no root
    async dataFolders() {
      if (!root()) return [];
      try { return (await settings()).folders; } catch { return [root()]; }
    },
    // the study index (req/shell/data/index), from the study file's read of the minute; null for none or a study with no root
    async index() {
      if (!root()) return null;
      return readIndex(reader, root());
    },
    // what was written into the study file, read afresh next time
    forgetIndex() { if (root()) known.delete(root()); },
    // {manager, tagger}: whether the store lets the signed-in user write to the root and to the extractions folder
    // (req/shell/data/roles); both false for nobody signed in or a study with no root
    async roles() {
      if (!root() || !remote.signedIn()) return { manager: false, tagger: false };
      const s = await settings().catch(() => null);
      const [manager, tagger] = await Promise.all([remote.canWrite(root()), s?.extractions ? remote.canWrite(s.extractions) : false]);
      return { manager: !!manager, tagger: !!tagger };
    },
  };
}
