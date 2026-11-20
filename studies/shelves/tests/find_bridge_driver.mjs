// Drives web/bridge.js in Pyodide under Node with the Bookshelf Reader's own Python and only the packages its
// study.json names (web/python_files.js, as the worker picks them): Python opens a photo, and each version's one run
// (Find books) answers with its books and their titles, every engine it asks for answered by the page's own services
// (web/reading.js) on stand-in engines: a text finder that finds no text, a Tesseract that reads "Title"; then the
// tagger's straightening and the labelling of its readers' text, stages on the photo.
// Exits 1 on a wrong answer, 2 when it cannot run (no pyodide, or Pyodide's packages cannot be downloaded).
//   node studies/shelves/tests/find_bridge_driver.mjs PHOTO
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import "../../../web-tests/cdn_from_node_modules.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..", "..", "..");
const require = createRequire(path.join(repo, "web-tests", "driver.mjs"));
let entry;
try { entry = require.resolve("pyodide/pyodide.mjs"); } catch { console.error("no pyodide: npm i --prefix web-tests pyodide@314.0.7"); process.exit(2); }
const { loadPyodide } = await import(pathToFileURL(entry).href);
const { bridge } = await import(pathToFileURL(path.join(repo, "web", "bridge.js")).href);
const { PYODIDE, packagesOf } = await import(pathToFileURL(path.join(repo, "web", "python_files.js")).href);
const { engineSet, services } = await import(pathToFileURL(path.join(repo, "studies", "shelves", "web", "reading.js")).href);
const [photo] = process.argv.slice(2);
const studyDir = path.join(repo, "studies", "shelves"), study = JSON.parse(fs.readFileSync(path.join(studyDir, "study.json"), "utf8"));

const py = await loadPyodide();
const lock = JSON.parse(fs.readFileSync(path.join(path.dirname(entry), "pyodide-lock.json"), "utf8"));
const site = py.runPython("import sysconfig; sysconfig.get_path('purelib')");
// the study's packages and nothing they might pull in: a module missing from the list fails here as on the page
for (const w of packagesOf({ ...study.python, wheels: [] }, lock, [], PYODIDE)) {
  let buf;
  try { const r = await fetch(w.url); if (!r.ok) throw new Error(`HTTP ${r.status}`); buf = new Uint8Array(await r.arrayBuffer()); }
  catch (e) { console.error(`cannot download ${w.url}: ${e.message}`); process.exit(2); }
  py.unpackArchive(buf, "wheel", { extractDir: site });
}
await py.loadPackage([]);
py.FS.mkdirTree("/py");
for (const d of study.python.paths) for (const f of fs.readdirSync(path.join(studyDir, d))) if (f.endsWith(".py")) py.FS.writeFile("/py/" + f, new Uint8Array(fs.readFileSync(path.join(studyDir, d, f))));
py.runPython(`import sys, json, importlib; sys.path.insert(0, '/py'); study = importlib.import_module('${study.python.entry}')`);

const problems = [];
const asked = {};
const served = services(engineSet({
  ort: async () => ({ env: { wasm: {} }, Tensor: class { constructor(type, data, dims) { Object.assign(this, { type, data, dims }); } },
    InferenceSession: { create: async () => ({ inputNames: ["x"], outputNames: ["y"],
      run: async (feeds) => { const [, , h, w] = feeds.x.dims; return { y: { data: new Float32Array(h * w) } }; } }) } }),
  model: async () => new Uint8Array(8),
  Tesseract: async () => ({ createWorker: async () => ({ setParameters: async () => {}, recognize: async () => ({ data: { text: "Title\n", confidence: 50 } }), terminate: async () => {} }) }),
  words: async () => "את 100\nלא 90\n",
}));
let out = [];
const answer = bridge(py, (m) => {
  out.push(m);
  if (m.type === "ask") {
    asked[m.service] = (asked[m.service] || 0) + 1;
    served.serve(m.service, m.meta, m.bytes).then((r) => answer.reply({ value: r.meta, bytes: r.bytes }), (e) => answer.reply({ error: String(e.message || e) }));
  }
}, study.progress);
const ask = async (m) => { out = []; try { await answer(m); } catch (e) { problems.push(`${m.type}: ${String(e.message || e).split("\n")[0]}`); } return out; };
const bytes = fs.readFileSync(photo), name = path.basename(photo);
if (!(await ask({ type: "open", name, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) })).some((m) => m.type === "held")) problems.push(`${name} is not held`);
else {
  // every version the page offers, then the text-guided one with the whole-crop reader, which reads every book
  const runs = JSON.parse(fs.readFileSync(path.join(studyDir, study.algorithms.list), "utf8")).map((a) => ({ algorithm: a.key }));
  for (const args of [...runs, { algorithm: runs[0].algorithm, reader: "tesseract" }]) {
    for (const k in asked) delete asked[k];
    const r = (await ask({ type: "call", action: "run", args: { ...args }, echo: 1 })).find((m) => m.type === "result");
    const got = r?.meta?.books;
    if (!Array.isArray(got) || !got.length || !got.every((b) => b.corners.length === 4 && typeof b.title === "string" && [0, 1, 2, 3].includes(b.turn)))
      problems.push(`run ${JSON.stringify(args)}: ${JSON.stringify(r?.meta)?.slice(0, 300)}`);
    else if (args.reader === "tesseract" && !(got.every((b) => b.title === "Title") && asked.tesseract === 2 * got.length))
      problems.push(`the whole-crop reader reads every book at both its turns: ${JSON.stringify([got.map((b) => b.title), asked])}`);
    else if (!args.reader && asked.det !== (args.algorithm === "r5" ? got.length * 2 : 1 + got.length * 2))
      problems.push(`${args.algorithm}: the text finder once over the photo where it reads text, then once per book at each turn: ${JSON.stringify(asked)}`);
    else console.log(`${name}, ${JSON.stringify(args)}: ${got.length} books, asked ${JSON.stringify(asked)}`);
    if (got?.length && !args.reader) {
      const s = (await ask({ type: "call", action: "straighten", args: { corners: got.map((b) => b.corners) }, echo: 2 })).find((m) => m.type === "result");
      if (s?.meta?.crops?.length !== got.length || s.meta.crops.some((c) => c.shape[2] !== 4)) problems.push(`straighten: ${JSON.stringify(s?.meta)?.slice(0, 200)}`);
      // the tagger's readers' text read into fields by the same Python (req/shelves/read/fields)
      const l = (await ask({ type: "call", action: "label", args: { texts: ["פרנק הרברט / חולית", ""], library_seen: false }, echo: 3 })).find((m) => m.type === "result");
      const [one, none] = l?.meta?.books ?? [];
      if (one?.fields?.author !== "פרנק הרברט" || one?.fields?.title !== "חולית" || Object.keys(none?.fields ?? { x: 1 }).length) problems.push(`label: ${JSON.stringify(l?.meta)}`);
    }
  }
}
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
