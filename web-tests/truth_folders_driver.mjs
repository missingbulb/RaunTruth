// Runs the extractions folder (web/truth_folders.js) under Node against an in-memory Drive, case by case, and
// prints each case's outcome as one JSON object for test_truth_folders.py to judge.
//   node web-tests/truth_folders_driver.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tf = await import(path.join(repo, "web", "truth_folders.js"));

// an in-memory Drive: the public reader's calls (all, text) and the signed-in writer's (create, folder, replace)
function memoryDrive() {
  let n = 0, clock = Date.parse("2026-11-05T10:00:00Z");
  const files = [], lists = [];
  const add = (f) => { const g = { id: "id" + n++, properties: {}, modified: new Date(clock += 1000).toISOString(), ...f }; files.push(g); return g; };
  const reader = {
    all: async (parent) => (lists.push(parent), files.filter((f) => f.parent === parent && !f.trashed))
      .map((f) => ({ id: f.id, name: f.name, folder: !!f.folder, modified: f.modified, properties: { ...f.properties } })),
    text: async (id) => files.find((f) => f.id === id).body,
  };
  const writes = [];
  const writer = {
    folder: async (parent, name) => { writes.push(["folder", name]); return add({ parent, name, folder: true }).id; },
    create: async (parent, name, blob) => { writes.push(["create", name]); return { id: add({ parent, name, body: await blob.text() }).id }; },
    replace: async (id, blob, opts) => {
      const f = files.find((g) => g.id === id);
      writes.push(["replace", f.name, !!opts?.keepForever]); f.body = await blob.text(); f.modified = new Date(clock += 1000).toISOString(); return { id };
    },
  };
  return { files, reader, writer, writes, add, lists };
}

const out = {};
const JANE = await tf.personFile("jane@lab.org"), key = tf.personKey;
const doc = (who, created, n = 1) => ({ format: "norfinder-ground-truth/2", created, tagger: who,
  image: { name: "slide3_s2.tif", sha256: "a1b2c3d4" + "0".repeat(56) }, labels: Array(n).fill({ label: 1 }) });
const IMG = { name: "slide3_s2.tif", sha256: "a1b2c3d4" + "0".repeat(56) };

out.names = { sub: tf.subfolderName(IMG.name, IMG.sha256), file: await tf.personFile("Jane@Lab.org"), run: tf.runFile("count", "1.2.3") };
out.folder = { named: tf.folderOf({ extractions: "EXTRACTIONS01", curated: "OLD" }), none: tf.folderOf(null), unset: tf.folderOf({ data: "D" }) };

// saving: the subfolder made once, the person's own file replaced keeping the old version, another person's file beside it
{
  const d = memoryDrive();
  const put = (email, created, n) => tf.save({ reader: d.reader, writer: d.writer, folder: "EXT", image: IMG, email, doc: doc(email, created, n) });
  await put("jane@lab.org", "2026-11-05T10:00:00Z", 1);
  await put("jane@lab.org", "2026-11-05T11:00:00Z", 2);
  await put("bob@lab.org", "2026-11-05T12:00:00Z", 3);
  const listed = await tf.files(d.reader, "EXT", IMG);
  out.save = { writes: d.writes, subfolders: d.files.filter((f) => f.folder).length, files: listed.map((f) => [f.name, f.by, f.run]),
    janeBody: JSON.parse(d.files.find((f) => f.name === JANE).body).labels.length };
}

// a listing passes over what is no extraction, and reads a batch run's name as its algorithm and version
{
  const d = memoryDrive(), sub = d.add({ parent: "EXT", name: tf.subfolderName(IMG.name, IMG.sha256), folder: true });
  d.add({ parent: sub.id, name: await tf.personFile("new@x.org"), body: "{}" });
  d.add({ parent: sub.id, name: tf.runFile("find_nodes", "0.11121.154+ab12"), body: "{}" });
  d.add({ parent: sub.id, name: "notes.txt", body: "not an extraction" });
  d.add({ parent: sub.id, name: "x_nested.json", folder: true });
  const listed = await tf.files(d.reader, "EXT", IMG);
  out.listing = { names: listed.map((f) => f.name), run: listed.find((f) => f.run)?.run, by: listed.find((f) => f.by)?.by,
    other: await tf.files(d.reader, "EXT", { name: "other.tif", sha256: "f".repeat(64) }) };
}

// a file of the name before x_, gt_<email>.json, read as that person's; passed over once they also have an x_ file
{
  const d = memoryDrive(), sub = d.add({ parent: "EXT", name: tf.subfolderName(IMG.name, IMG.sha256), folder: true });
  d.add({ parent: sub.id, name: "gt_Old@X.org.json", body: "{}" });
  const alone = await tf.files(d.reader, "EXT", IMG), own = await tf.own(d.reader, "EXT", IMG, "old@x.org");
  d.add({ parent: sub.id, name: await tf.personFile("old@x.org"), body: "{}" });
  const both = await tf.files(d.reader, "EXT", IMG), ownBoth = await tf.own(d.reader, "EXT", IMG, "old@x.org");
  out.older = { alone: alone.map((f) => [f.name, f.by]), own: own?.name ?? null, key: await tf.personKey("old@x.org"),
    both: both.map((f) => f.name), ownBoth: ownBoth?.name ?? null, sub: sub.id,
    inSub: (await tf.filesIn(d.reader, sub.id)).map((f) => f.name) };
}

// the person's own file, found from the two listings alone: the extractions folder, then the image's subfolder; nothing read
{
  const d = memoryDrive(), reads = [], text = d.reader.text;
  d.reader.text = async (id) => (reads.push(id), text(id));
  const sub = d.add({ parent: "EXT", name: tf.subfolderName(IMG.name, IMG.sha256), folder: true });
  d.add({ parent: sub.id, name: await tf.personFile("bob@lab.org"), body: "{}" });
  d.lists.length = 0;
  const nobody = await tf.own(d.reader, "EXT", IMG, "jane@lab.org");
  d.add({ parent: sub.id, name: JANE, body: "{}" });
  d.lists.length = 0;
  const mine = await tf.own(d.reader, "EXT", IMG, "Jane@Lab.org");
  const listed = [...d.lists];
  out.own = { nobody, mine: mine && { name: mine.name, hasId: !!mine.id, hasTime: !!mine.modified }, listed, subId: sub.id, reads };
}

// the list: mine, then marked, then the others, each labelled; a member sees who made each, an outsider only the marked
{
  const f = (id, by, run) => ({ id, name: by ? "x_" + by + ".json" : tf.runFile(run[0], run[1]), modified: `2026-11-05T10:0${id.length}:00Z`, by, run: run ? { algorithm: run[0], version: run[1] } : null });
  const files = [f("A", await key("jane@lab.org")), f("B", await key("yael@lab.org")), f("C", null, ["count", "1.2"]), f("D", await key("dan@lab.org")), f("E", null, ["count", "1.3"])];
  const marks = { gt: { file: "B" }, official: { file: "C" } };
  const view = (r) => r.map((x) => [x.label, x.group, x.marks]);
  out.list = {
    member: view(tf.rows({ files, marks, key: await key("Jane@lab.org"), member: true })),
    memberNames: JSON.stringify(tf.rows({ files, marks, key: await key("Jane@lab.org"), member: true })),
    outsider: view(tf.rows({ files, marks, key: null, member: false })),
    outsiderNames: JSON.stringify(tf.rows({ files, marks, key: null, member: false })),
    signedInNonMember: view(tf.rows({ files, marks, key: await key("dan@lab.org"), member: false })),
    mineMarked: view(tf.rows({ files, marks: { gt: { file: "A" } }, key: await key("jane@lab.org"), member: true })).slice(0, 1),
    staleMark: view(tf.rows({ files, marks: { gt: { file: "gone" } }, key: null, member: false })),
    marksOf: [tf.marksOf({ abc: { gt: { file: "B" } } }, "abc"), tf.marksOf({}, "abc"), tf.marksOf(null, "abc")],
  };
}

// needing ground truth: a marker in the extractions folder named as the image's subfolder, read from the folder's one listing;
// two images of one name marked apart
{
  const d = memoryDrive();
  const A = { name: "a.jpg", sha256: "1".repeat(64) }, B = { name: "b.jpg", sha256: "2".repeat(64) };
  const D1 = { name: "dup.jpg", sha256: "3".repeat(64) }, D2 = { name: "dup.jpg", sha256: "4".repeat(64) };
  for (const x of [A, B, D1]) await tf.markNeeded({ writer: d.writer, folder: "EXT", image: x });
  d.add({ parent: "EXT", name: tf.subfolderName(B.name, B.sha256), folder: true });
  d.lists.length = 0;
  const s = await tf.held(d.reader, "EXT"), listed = [...d.lists];
  const pick = (x) => s.get(tf.subfolderName(x.name, x.sha256)) ?? null;
  const id = (x) => d.files.find((f) => f.name === tf.neededName(x.name, x.sha256))?.id ?? null;
  out.needed = { name: tf.neededName(A.name, A.sha256), writes: d.writes, parents: [...new Set(d.files.filter((f) => !f.folder).map((f) => f.parent))],
    a: pick(A), aId: id(A), b: pick(B), bId: id(B), d1: pick(D1), d1Id: id(D1), d2: pick(D2), listed };
}

console.log(JSON.stringify(out));
