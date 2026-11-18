// Drives web/bridge.js in Pyodide under Node with the fixture study's own Python, which the bridge knows
// nothing of: a PNG's own bytes read by the study's read, and one of its versions run on it, must come back as the
// study answered them (the page reads and shows the image itself). Then a study made up here, acme: a version that
// asks the page for a service and goes on with its answer, and a stage run on the last answer, which stays in Python.
// Exits 1 on a wrong answer, 2 when it cannot run. Run by tests/test_study_runs.py.
//   node web-tests/study_bridge_driver.mjs IMAGE.png
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.join(here, "..");
const require = createRequire(import.meta.url);
let entry;
try { entry = require.resolve("pyodide/pyodide.mjs", { paths: [here] }); } catch {
  console.error("no pyodide: python3 web-tests/page_libraries.py"); process.exit(2);
}
const { loadPyodide } = await import(pathToFileURL(entry).href);
const { bridge } = await import(pathToFileURL(path.join(repo, "web", "bridge.js")).href);
const study = JSON.parse(fs.readFileSync(path.join(repo, "studies", "fixture", "study.json"), "utf8"));

const py = await loadPyodide();
await py.loadPackage(study.python.packages);
py.FS.mkdirTree("/py");
py.FS.writeFile("/py/fixture.py", fs.readFileSync(path.join(repo, "studies", "fixture", study.python.paths[0], study.python.entry + ".py"), "utf8"));
py.runPython(`import sys, json, importlib; sys.path.insert(0, '/py'); study = importlib.import_module('${study.python.entry}')`);

let out = [];
let answer = bridge(py, (m) => out.push(m), study.progress);
const ask = async (m) => { out = []; await answer(m); return out; };
const problems = [];
const png = fs.readFileSync(process.argv[2]);
const opened = await ask({ type: "open", name: "squares.png", bytes: png.buffer.slice(png.byteOffset, png.byteOffset + png.length) });
if (!opened.some((m) => m.type === "progress" && m.text === study.progress.open)) problems.push("no progress from the study's own text while opening");
if (!opened.some((m) => m.type === "held") || opened.some((m) => m.type === "opened")) problems.push(`open: ${JSON.stringify(opened.map((m) => m.type))}`);
const r = (await ask({ type: "call", action: "run", args: { algorithm: "above", threshold: 128 }, echo: 7 })).find((m) => m.type === "result");
// two squares above 128: 10 x 10 and 15 x 20
if (!r || r.action !== "run" || r.echo !== 7 || r.meta.count !== 400 || r.bytes.length !== 80 * 60 || r.bytes.reduce((a, b) => a + b, 0) !== 400
    || JSON.stringify(r.meta.above) !== JSON.stringify({ $bytes: [0, 80 * 60], dtype: "uint8", shape: [80 * 60] }))
  problems.push(`run: ${JSON.stringify(r && { action: r.action, echo: r.echo, meta: r.meta })}`);
console.log(`held, counted ${r?.meta.count}`);

// acme: its one version asks the page to read the image's size aloud, twice, and answers with what it heard
py.FS.writeFile("/py/acme.py", `
def read(path):
    return open(path, 'rb').read()

def asks(image, times=2):
    heard = []
    for i in range(times):
        heard.append((yield ('say', len(image), i)))
    return dict(heard=heard)

def tally(image, answer, plus=0):
    return dict(heard=len(answer['heard']) + plus)

VERSIONS = {'asks': asks}
STAGES = {'tally': tally}
`);
py.runPython("study = importlib.import_module('acme')");
answer = bridge(py, (m) => {
  out.push(m);
  // the page's part: each request answered as it comes, while the version waits
  if (m.type === "ask") setTimeout(() => answer.reply({ value: { said: `${m.service} ${m.meta[0]} #${m.meta[1]}` } }));
}, {});
await ask({ type: "open", name: "a.bin", bytes: new Uint8Array([1, 2, 3]).buffer });
const asked = await ask({ type: "call", action: "run", args: { algorithm: "asks" }, echo: 1 });
const heard = asked.find((m) => m.type === "result")?.meta.heard;
if (asked.filter((m) => m.type === "ask").length !== 2 || JSON.stringify(heard) !== JSON.stringify([{ said: "say 3 #0" }, { said: "say 3 #1" }]))
  problems.push(`a version asking for a service: ${JSON.stringify(asked.map((m) => [m.type, m.meta]))}`);
const tallied = (await ask({ type: "call", action: "tally", args: { plus: 1 }, echo: 2 })).find((m) => m.type === "result");
if (tallied?.meta.heard !== 3) problems.push(`a stage on the last answer: ${JSON.stringify(tallied?.meta)}`);
console.log(`asked twice, tallied ${tallied?.meta.heard}`);
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
