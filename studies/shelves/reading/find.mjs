// The Bookshelf Reader's finder in the sandbox: the books of one photo found as the page finds them, the page's own text
// finder over Python's view of the photo, its map handed to the finder, with the same engine builds as read.mjs.
//   npm ci --prefix studies/shelves/reading
//   node studies/shelves/reading/find.mjs PHOTO OUT.json [VERSION]
// OUT.json: {image, books: [{corners}]}, which lab/grade.py takes as --found. VERSION: a finder of web/algorithms.json,
// the page's first if none; the text finder runs only for one its entry says reads text.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { reader } from "../web/reading.js";

const [image, out, asked] = process.argv.slice(2);
const here = import.meta.dirname, require = createRequire(path.join(here, "package.json"));
const study = JSON.parse(fs.readFileSync(path.join(here, "..", "study.json"), "utf8"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide();
await py.loadPackage(study.python.packages, { messageCallback: () => {} });
for (const dir of study.python.paths) for (const f of fs.readdirSync(path.join(here, "..", dir)).filter((f) => f.endsWith(".py")))
  py.FS.writeFile("/home/pyodide/" + f, fs.readFileSync(path.join(here, "..", dir, f)));
py.FS.writeFile("/home/pyodide/photo" + path.extname(image), fs.readFileSync(image));
py.runPython(`import json, shelves; session = shelves.Session('photo${path.extname(image)}')`);

const assets = path.join(here, "node_modules", "@gutenye", "ocr-models", "assets");
const r = reader({
  Tesseract: async () => require("tesseract.js"), ort: async () => require("onnxruntime-web"), langPath: path.join(here, "..", "web", "tessdata"), tesseract: {},
  model: async (name) => fs.readFileSync(path.join(assets, name)), keys: async () => fs.readFileSync(path.join(assets, "ppocr_keys_v1.txt"), "utf8"), words: async () => "",
});
const listed = JSON.parse(fs.readFileSync(path.join(here, "..", "web", "algorithms.json"), "utf8"));
const version = asked ? listed.find((a) => a.key === asked) : listed[0];
if (!version) throw new Error(`no finder ${asked} in web/algorithms.json`);
py.globals.set("version", version.key);
py.globals.set("text", "");
if (version.reads_text) {
  const [vm, vb] = py.runPython("session.call('view', {})").toJs();
  const { width, height } = JSON.parse(vm);
  py.globals.set("text", JSON.stringify(await r.textMap({ width, height, data: vb })));
}
const books = JSON.parse(py.runPython("session.call('find', dict(algorithm=version, text=json.loads(text) if text else None))[0]")).books;
await r.close();
const doc = JSON.stringify({ image: path.basename(image), books });
if (out) fs.writeFileSync(out, doc); else console.log(doc);
