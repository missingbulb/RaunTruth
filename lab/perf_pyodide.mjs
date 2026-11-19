// The page's side of the speed pass (perf.py is the raw-Python side): one version of a study run on one image in
// Pyodide, the page's runtime, with the packages and wheels the study's study.json names, the image opened with the
// study's read and the version run as the page's bridge runs it. One process per run, so the WebAssembly heap it
// reports is that run's own; the heap only grows, so its size after the run is the run's peak.
//   node lab/perf_pyodide.mjs STUDY IMAGE VERSION [STUDY_DIR]
// STUDY_DIR (default studies/STUDY) may be another checkout of the study, so a pass can run the code before it and
// after it on the same image. Pyodide is the page tests' (npm i --prefix web-tests pyodide@314.0.7).
// Prints one JSON line: seconds to read and to run, the heap (MB) after boot, after reading and after the run, and
// the answer's signature as perf.py takes it.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..");
const [sid, image, version, dir = path.join(repo, "studies", sid)] = process.argv.slice(2);
if (!version) { console.error("usage: node lab/perf_pyodide.mjs STUDY IMAGE VERSION [STUDY_DIR]"); process.exit(2); }
const require = createRequire(path.join(repo, "web-tests", "driver.mjs"));
const { loadPyodide } = await import(pathToFileURL(require.resolve("pyodide/pyodide.mjs")).href);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "study.json"), "utf8"));
const py = await loadPyodide();
await py.loadPackage(manifest.python.packages, { messageCallback: () => {} });
if (manifest.python.wheels?.length) {
  await py.loadPackage("micropip", { messageCallback: () => {} });
  await py.pyimport("micropip").install(manifest.python.wheels);
}
const heap = () => Math.round(py._module.HEAPU8.length / 2 ** 20);
const mount = (at, root) => { py.FS.mkdirTree(at); py.FS.mount(py.FS.filesystems.NODEFS, { root: path.resolve(root) }, at); };
mount("/study", dir); mount("/image", path.dirname(path.resolve(image))); mount("/lab", here);
py.runPython(`import sys; sys.path[:0] = ['/study/' + d.rstrip('/') for d in ${JSON.stringify(manifest.python.paths)}]`);
py.runPython(`import ${manifest.python.entry} as study, time, json`);
const booted = heap();
const read = py.runPython(`t = time.perf_counter(); image = study.read('/image/${path.basename(image)}'); time.perf_counter() - t`);
const afterRead = heap();
const ran = py.runPython(`t = time.perf_counter(); answer = study.VERSIONS['${version}'](image); time.perf_counter() - t`);
const afterRun = heap();
// perf.py's own signature, so the two sides of a pass compare
const signature = py.runPython("sys.path.insert(0, '/lab'); from perf import signature; signature(answer)");
console.log(JSON.stringify({ study: sid, version, image: path.basename(image), read_s: +read.toFixed(2), run_s: +ran.toFixed(2),
  heap_boot_mb: booted, heap_read_mb: afterRead, heap_peak_mb: afterRun, signature }));
