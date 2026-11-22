// A study's extractions in the remote store (req/shell/extractions/file, req/shell/extractions/save, req/shell/extractions/list): one
// `extractions` folder under the study's root, one subfolder per image and in it one file per author, a person's own or a
// batch run's. Reading goes through `reader` (the public folders, no sign-in: all(folder) as [{id, name, folder, modified,
// properties}], text(id)); writing through `writer` (the signed-in user's: folder(parent, name), create(parent, name, blob),
// replace(id, blob, {keepForever})).
"use strict";

const stem = (name) => name.replace(/\.[^.]*$/, "");

// the image's subfolder: its stem and the first 8 hex of its SHA-256
export const subfolderName = (name, sha) => `${stem(name)}__${sha.slice(0, 8)}`;
// the empty file in the extractions folder marking the image as needing ground truth
const NEEDED = ".needs_gt";
export const neededName = (name, sha) => subfolderName(name, sha) + NEEDED;
// a person's key: the first 16 hex of the SHA-256 of their lower-cased email, so a listing of the link-shared folder names
// no one (the email stays inside the file)
export async function personKey(email) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
// a person's file in the image's subfolder, and a batch run's: the algorithm's key and the version that ran it
export const personFile = async (email) => `x_${await personKey(email)}.json`;
export const runFile = (algorithm, version) => `run_${algorithm}__${version}.json`;
const PERSON = /^x_([0-9a-f]{16})\.json$/, RUN = /^run_(.+?)__(.+)\.json$/;

// the folder the study's extractions are in, from its root's study file (study_root.js read), null while it has none
export const folderOf = (settings) => settings?.extractions || null;

async function subfolder(reader, folder, image) {
  const name = subfolderName(image.name, image.sha256);
  return (await reader.all(folder)).find((f) => f.folder && f.name === name) || null;
}
// an extraction file as the listing gives it, {id, name, modified, by, run}: by the person's key (personKey), or null for a batch run's;
// run {algorithm, version} for a batch run's, else null. A file that is neither is passed over.
const entry = (f) => {
  const p = PERSON.exec(f.name), r = RUN.exec(f.name);
  if (f.folder || !(p || r)) return null;
  return { id: f.id, name: f.name, modified: f.modified, by: p ? p[1] : null, run: p ? null : { algorithm: r[1], version: r[2] } };
};

// [{id, name, modified, by, run}] the image's extractions in folder, from two listings and no file read
export async function files(reader, folder, image) {
  const sub = await subfolder(reader, folder, image);
  return sub ? (await reader.all(sub.id)).map(entry).filter(Boolean) : [];
}

// the person's own extraction of the image, as files() lists it, or null
export async function own(reader, folder, image, email) {
  const mine = await personFile(email);
  return (await files(reader, folder, image)).find((f) => f.name === mine) || null;
}

// An image's extractions as the list shows them, [{id, modified, label, group, marks}], mine first, then the marked
// (GT before official), then the others, which the list folds. files: files(); marks: the study file's marks for the image,
// {gt: {file}, official: {file}} (marksOf); key: who looks (personKey), or null; member: whether they may read the study's
// root. Each is labelled by algorithm version or "by hand", never by a person; someone who is not a member is listed only
// the marked.
export function rows({ files, marks, key, member }) {
  const me = key || null, tags = (f) => ["gt", "official"].filter((k) => marks?.[k]?.file === f.id);
  const how = (f) => (f.run ? `${f.run.algorithm} ${f.run.version}` : "by hand");
  const out = files.map((f) => {
    const t = tags(f), mine = !!me && f.by === me;
    const words = [mine ? "Yours" : how(f), ...t.map((k) => (k === "gt" ? "GT" : "official"))];
    return { id: f.id, modified: f.modified, mine, marks: t, label: words.join(" · "), group: mine ? "mine" : t.length ? "marked" : "other" };
  });
  const order = { mine: 0, marked: 1, other: 2 };
  const shown = member ? out : out.filter((r) => r.marks.length);
  return shown.sort((a, b) => order[a.group] - order[b.group] || (b.marks.includes("gt") - a.marks.includes("gt")) || String(b.modified).localeCompare(String(a.modified)));
}

// the study file's marks for one image, by its SHA-256: {gt, official}, each {file} or absent
export const marksOf = (marks, sha) => (sha && marks && typeof marks[sha] === "object" ? marks[sha] : {});

// Map(subfolder name -> {held, needed}) over every image the extractions folder holds a subfolder for, or a marker of, from its one
// listing; held when it has the subfolder, needed the id of the image's Needs GT marker when it has one
export async function held({ all }, folder) {
  const listed = await all(folder), out = new Map();
  for (const f of listed) if (f.folder) out.set(f.name, { held: true });
  for (const f of listed) if (!f.folder && f.name.endsWith(NEEDED)) {
    const name = f.name.slice(0, -NEEDED.length);
    out.set(name, { ...(out.get(name) || {}), needed: f.id });
  }
  return out;
}

// the image marked as needing ground truth: its empty marker created in the extractions folder
export function markNeeded({ writer, folder, image }) {
  return writer.create(folder, neededName(image.name, image.sha256), new Blob([], { type: "text/plain" }));
}

// the subfolder for the image in folder, made when it has none: its id
async function ensure(reader, writer, folder, image) {
  return (await subfolder(reader, folder, image))?.id ?? (await writer.folder(folder, subfolderName(image.name, image.sha256)));
}

// the person's document written as their one extraction of the image in folder, replacing their own and keeping Drive's old
// revision; the file's id
export async function save({ reader, writer, folder, image, email, doc }) {
  const sub = await ensure(reader, writer, folder, image), name = await personFile(email);
  const blob = new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" });
  const there = (await reader.all(sub)).find((f) => !f.folder && f.name === name);
  return there ? writer.replace(there.id, blob, { keepForever: true }) : writer.create(sub, name, blob);
}

// the batch run's document written as its extraction of the image in folder, the file runFile(algorithm, version) names, replacing
// a file of that name; the file's id
export async function saveRun({ reader, writer, folder, image, algorithm, version, doc }) {
  const sub = await ensure(reader, writer, folder, image), name = runFile(algorithm, version);
  const blob = new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" });
  const there = (await reader.all(sub)).find((f) => !f.folder && f.name === name);
  return there ? writer.replace(there.id, blob) : writer.create(sub, name, blob);
}
