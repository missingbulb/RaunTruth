// Runs a study's root (web/study_root.js) under Node against an in-memory store, case by case, and prints each
// case's outcome as one JSON object for test_study_root.py to judge.
//   node web-tests/study_root_driver.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sr = await import(path.join(repo, "web", "study_root.js"));

// an in-memory store: the reader's calls (all, text) and the writer's (folder, create, replace, share), each counted
function memory() {
  let n = 0;
  const files = [], calls = [];
  const add = (f) => { const g = { id: "id" + n++, ...f }; files.push(g); return g; };
  const reader = {
    all: async (parent) => { calls.push(["all", parent]); return files.filter((f) => f.parent === parent && !f.trashed).map((f) => ({ id: f.id, name: f.name, folder: !!f.folder })); },
    text: async (id) => { calls.push(["text", id]); return files.find((f) => f.id === id).body; },
  };
  const writer = {
    folder: async (parent, name) => { calls.push(["folder", name]); return add({ parent, name, folder: true }).id; },
    create: async (parent, name, blob) => { calls.push(["create", name]); return { id: add({ parent, name, body: await blob.text(), ours: true }).id }; },
    replace: async (id, blob) => { calls.push(["replace", files.find((f) => f.id === id).name]); files.find((f) => f.id === id).body = await blob.text(); return { id }; },
    share: async (id) => { calls.push(["share", files.find((f) => f.id === id).name]); },
    trash: async (id) => { calls.push(["trash", files.find((f) => f.id === id).name]); files.find((f) => f.id === id).trashed = true; },
    ours: async (id) => !!files.find((f) => f.id === id)?.ours,
  };
  return { files, calls, add, reader, writer };
}
const AT = new Date("2026-11-07T10:00:00Z");
const out = {};

// a root with only its data folder: found by name, nothing set up
{
  const m = memory(); m.add({ parent: "ROOT", name: "Data", folder: true });
  const s = await sr.read(m.reader, "ROOT", { fresh: true });
  out.bare = { data: !!s.data, extractions: s.extractions, set: s.set, calls: m.calls.length };
}

// set up: the one Extractions folder made, shared to view by link, the study file naming it; read back from the file
{
  const m = memory(); const data = m.add({ parent: "ROOT", name: "Data", folder: true });
  const s = await sr.setup({ reader: m.reader, writer: m.writer, root: "ROOT", by: "dm@acme.example", at: AT });
  const file = m.files.find((f) => f.name === sr.SETTINGS);
  const doc = JSON.parse(file.body);
  const again = await sr.read(m.reader, "ROOT", { fresh: true });
  out.setup = { writes: m.calls.filter(([k]) => k !== "all" && k !== "text"), doc: { ...doc, extractions: !!doc.extractions, data: doc.data === data.id },
    readBack: again.extractions === s.extractions && again.data === data.id && again.set };
  // run again: nothing made twice, the file rewritten
  const before = m.files.filter((f) => f.folder).length;
  m.calls.length = 0;
  await sr.setup({ reader: m.reader, writer: m.writer, root: "ROOT", by: "dm@acme.example", at: AT });
  out.rerun = { folders: m.files.filter((f) => f.folder).length - before, writes: m.calls.filter(([k]) => k !== "all" && k !== "text") };
}

// a folder made by hand, no study file: found by name, any case
{
  const m = memory(); m.add({ parent: "ROOT", name: "data", folder: true });
  const e = m.add({ parent: "ROOT", name: "EXTRACTIONS", folder: true });
  m.add({ parent: "ROOT", name: "GT curated", folder: true });
  const s = await sr.read(m.reader, "ROOT", { fresh: true });
  out.byName = { extractions: s.extractions === e.id, set: s.set, old: "curated" in s || "submissions" in s };
}

// a study file naming the folder by id wins over the names, so a renamed folder still counts
{
  const m = memory(); m.add({ parent: "ROOT", name: "Data", folder: true });
  const renamed = m.add({ parent: "ROOT", name: "Old GT", folder: true });
  m.add({ parent: "ROOT", name: "Extractions", folder: true });
  m.add({ parent: "ROOT", name: sr.SETTINGS, body: JSON.stringify({ format: sr.FORMAT, data: null, extractions: renamed.id }) });
  const s = await sr.read(m.reader, "ROOT", { fresh: true });
  out.byFile = { extractions: s.extractions === renamed.id, set: s.set };
}

// the root's Previews folder (req/shell/drive/previews): found by name, made once when missing, a data folder's file
// named by its id
{
  const m = memory(); m.add({ parent: "ROOT", name: "Data", folder: true });
  const none = (await sr.read(m.reader, "ROOT", { fresh: true })).previews;
  const made = await sr.previewsFolder({ reader: m.reader, writer: m.writer, root: "ROOT" });
  const again = await sr.previewsFolder({ reader: m.reader, writer: m.writer, root: "ROOT" });
  out.previews = { none, made: made === again, folders: m.calls.filter(([k]) => k === "folder"), found: (await sr.read(m.reader, "ROOT", { fresh: true })).previews === made,
    name: sr.previewsName("1AbCdataFolderId") };
}

// read twice within the minute: one listing; fresh reads again
{
  const m = memory(); m.add({ parent: "R2", name: "Data", folder: true });
  await sr.read(m.reader, "R2"); await sr.read(m.reader, "R2");
  const cached = m.calls.length;
  await sr.read(m.reader, "R2", { fresh: true });
  out.cache = { cached, fresh: m.calls.length - cached };
}

// the study's listed folders (req/shell/data/folders): the data folder, else the root, while the study file names none;
// Add and Remove write them into the study file, every other key kept; a study file made by hand is left alone
{
  const m = memory(); const data = m.add({ parent: "ROOT", name: "Data", folder: true }), other = m.add({ parent: "ROOT", name: "Other", folder: true });
  const implicit = (await sr.read(m.reader, "ROOT", { fresh: true })).folders;
  const bare = memory();
  const rootOnly = (await sr.read(bare.reader, "BARE", { fresh: true })).folders;
  await sr.setup({ reader: m.reader, writer: m.writer, root: "ROOT", by: "dm@acme.example", at: AT });
  m.calls.length = 0;
  const s = await sr.setFolders({ reader: m.reader, writer: m.writer, root: "ROOT", folders: [data.id, other.id] });
  const doc = JSON.parse(m.files.find((f) => f.name === sr.SETTINGS).body);
  await sr.setup({ reader: m.reader, writer: m.writer, root: "ROOT", by: "sm@acme.example", at: AT });
  const kept = (await sr.read(m.reader, "ROOT", { fresh: true })).folders;
  const fresh = memory(); const d2 = fresh.add({ parent: "R3", name: "Data", folder: true });
  await sr.setFolders({ reader: fresh.reader, writer: fresh.writer, root: "R3", folders: [d2.id] });
  const made = JSON.parse(fresh.files.find((f) => f.name === sr.SETTINGS).body);
  const hand = memory(); hand.add({ parent: "R4", name: sr.SETTINGS, body: JSON.stringify({ format: sr.FORMAT, data: null }) });
  let refused = null;
  try { await sr.setFolders({ reader: hand.reader, writer: hand.writer, root: "R4", folders: ["x"] }); } catch (e) { refused = /not made by this page/.test(e.message); }
  out.folders = { implicit: implicit.length === 1 && implicit[0] === data.id, rootOnly: rootOnly.length === 1 && rootOnly[0] === "BARE",
    writes: m.calls.filter(([k]) => k !== "all" && k !== "text").slice(0, 1), listed: s.folders.length === 2 && s.folders[1] === other.id,
    keysKept: !!doc.extractions && doc.set_by === "dm@acme.example", afterSetup: kept.length === 2,
    made: { format: made.format, folders: made.folders.length }, refused, handWrites: hand.calls.filter(([k]) => k !== "all" && k !== "text").length };
}

// the study index (req/shell/data/index) in the one study file: written when it differs from the one there, not when it is
// the same, and a study file made by hand left alone
{
  const m = memory();
  const index = { folders: [{ id: "F", name: "Data" }], images: [{ id: "I1", name: "a.png", folder: "F", path: ["Data"], size: 3, sha: "ab", modified: "2026-11-01T00:00:00Z" }] };
  const first = await sr.writeIndex({ reader: m.reader, writer: m.writer, root: "ROOT", index, by: "dm@acme.example", at: AT });
  const doc = JSON.parse(m.files.find((f) => f.name === sr.SETTINGS).body);
  const same = await sr.writeIndex({ reader: m.reader, writer: m.writer, root: "ROOT", index, by: "other@acme.example", at: new Date("2026-11-08T10:00:00Z") });
  const more = { ...index, images: [...index.images, { id: "I2", name: "b.png", folder: "F", path: ["Data"], size: 4, sha: "cd", modified: null }] };
  const changed = await sr.writeIndex({ reader: m.reader, writer: m.writer, root: "ROOT", index: more, by: "dm@acme.example", at: AT });
  const read = await sr.readIndex(m.reader, "ROOT");
  const hand = memory(); hand.add({ parent: "R5", name: sr.SETTINGS, body: "{}" });
  const handOut = await sr.writeIndex({ reader: hand.reader, writer: hand.writer, root: "R5", index, by: "dm@acme.example", at: AT });
  const none = await sr.readIndex(memory().reader, "R6");
  out.index = { first, same, changed, format: doc.format, by: doc.index.built_by, at: doc.index.built_at, images: read.images.length,
    files: m.files.map((f) => f.name),
    writes: m.calls.filter(([k]) => k === "create" || k === "replace"), hand: handOut, handWrites: hand.calls.filter(([k]) => k === "create" || k === "replace").length, none };
}

// the tags in the study file (req/shell/data/tags): read as empty while there are none, written with the index in one write, a
// study file made by hand left alone; the study file's grouping and hiding set beside its other keys (req/shell/data/hidden)
{
  const m = memory();
  const none = await sr.readTags(m.reader, "ROOT");
  const doc = { images: { I1: { tags: ["group:sick"], description: "First" } }, folders: { F: { tags: ["dim"] } } };
  const index = { folders: [{ id: "F", name: "Data" }], images: [{ id: "I1", name: "a.png", folder: "F", path: ["Data"], size: 3, sha: "ab", modified: null }] };
  await sr.writeTags({ reader: m.reader, writer: m.writer, root: "ROOT", doc });
  m.calls.length = 0;
  const both = await sr.writeStudyData({ reader: m.reader, writer: m.writer, root: "ROOT", tags: { ...doc, images: {} }, index, by: "dm@acme.example", at: AT });
  const oneWrite = m.calls.filter(([k]) => k === "create" || k === "replace");
  const back = await sr.readTags(m.reader, "ROOT");
  const readIndex = await sr.readIndex(m.reader, "ROOT");
  const hand = memory(); hand.add({ parent: "R7", name: sr.SETTINGS, body: "{}" });
  let refused = null;
  try { await sr.writeTags({ reader: hand.reader, writer: hand.writer, root: "R7", doc }); } catch (e) { refused = /not made by this page/.test(e.message); }
  const st = memory(); const d = st.add({ parent: "R8", name: "Data", folder: true });
  await sr.setFolders({ reader: st.reader, writer: st.writer, root: "R8", folders: [d.id] });
  const after = await sr.setStudy({ reader: st.reader, writer: st.writer, root: "R8", changes: { group: "group", hide: ["damaged-slide"] } });
  const file = JSON.parse(st.files.find((f) => f.name === sr.SETTINGS).body);
  out.tags = { none: { images: Object.keys(none.images).length, folders: Object.keys(none.folders).length },
    both, oneWrite, back: { images: Object.keys(back.images).length, folder: back.folders.F.tags }, indexImages: readIndex.images.length,
    files: m.files.map((f) => f.name),
    refused, handWrites: hand.calls.filter(([k]) => k === "create" || k === "replace").length,
    study: { group: file.group, hide: file.hide, folders: file.folders.length, readGroup: after.group, readHide: after.hide } };
}

// one study file (shell/study/one-file): a root holding only it gives the folders, index, tags, marks and stage
{
  const m = memory(); const data = m.add({ parent: "ROOT", name: "Data", folder: true });
  m.add({ parent: "ROOT", name: sr.SETTINGS, ours: true, body: JSON.stringify({ format: sr.FORMAT, data: data.id, folders: [data.id], stage: "Review", group: "group", hide: ["x"],
    index: { built_by: "dm@acme.example", built_at: AT.toISOString(), folders: [{ id: data.id, name: "Data" }], images: [{ id: "I1", name: "a.png", folder: data.id, path: ["Data"] }] },
    tags: { images: { I1: { tags: ["group:sick"] } }, folders: {} }, marks: { I1: { gt: { file: "E1" } } } }) });
  const s = await sr.read(m.reader, "ROOT", { fresh: true });
  const ix = await sr.readIndex(m.reader, "ROOT"), tg = await sr.readTags(m.reader, "ROOT");
  out.oneFile = { stage: s.stage, folders: s.folders.length, index: ix.images.length, group: ix.group, hide: ix.hide, tags: tg.images.I1.tags, marks: s.marks.I1.gt.file, calls: m.calls.filter(([k]) => k === "text").length };
}

// a root still holding the three files of before is read once and written back as one file by the next manager save, the
// old two trashed only where the page made them
{
  const make = (oursOld) => {
    const m = memory(); const data = m.add({ parent: "ROOT", name: "Data", folder: true });
    m.add({ parent: "ROOT", name: sr.SETTINGS, ours: true, body: JSON.stringify({ format: "rauntruth-study/1", data: data.id, group: "group" }) });
    m.add({ parent: "ROOT", name: "rauntruth-index.json", ours: oursOld, body: JSON.stringify({ format: "rauntruth-index/1", built_by: "dm@acme.example", built_at: AT.toISOString(),
      folders: [{ id: data.id, name: "Data" }], images: [{ id: "I1", name: "a.png", folder: data.id, path: ["Data"] }] }) });
    m.add({ parent: "ROOT", name: "rauntruth-tags.json", ours: oursOld, body: JSON.stringify({ format: "rauntruth-tags/1", images: { I1: { tags: ["group:sick"] } }, folders: {} }) });
    return m;
  };
  const m = make(true);
  const s = await sr.read(m.reader, "ROOT", { fresh: true });
  const before = { index: (await sr.readIndex(m.reader, "ROOT")).images.length, tags: Object.keys((await sr.readTags(m.reader, "ROOT")).images), old: !!s.old.index && !!s.old.tags };
  m.calls.length = 0;
  await sr.setStudy({ reader: m.reader, writer: m.writer, root: "ROOT", changes: { stage: "Develop" } });
  const doc = JSON.parse(m.files.find((f) => f.name === sr.SETTINGS).body);
  const after = await sr.read(m.reader, "ROOT", { fresh: true });
  const hand = make(false);
  await sr.setStudy({ reader: hand.reader, writer: hand.writer, root: "ROOT", changes: { stage: "Develop" } });
  out.migration = { before, writes: m.calls.filter(([k]) => ["create", "replace", "trash"].includes(k)),
    one: { format: doc.format, index: doc.index.images.length, tags: Object.keys(doc.tags.images), stage: doc.stage, group: doc.group },
    after: { old: after.old, index: after.index.images.length, tags: Object.keys(after.tags.images) },
    hand: { trashes: hand.calls.filter(([k]) => k === "trash").length, files: hand.files.filter((f) => !f.trashed).map((f) => f.name).sort() } };
}

console.log(JSON.stringify(out));
