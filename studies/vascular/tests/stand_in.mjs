// The vascular page's test surface: a local server for the site, with a stand-in for the study's Python worker
// that offers two algorithms (their names, icons and steps as the study lists them; their precision and recall the
// lab's, from the study's own file), a drawn stack to open as many
// slices deep as the given model (drawnStack), and answers
// Execute with that model, the arguments it was asked with in its "asked" field; and the study at the stage asked for
// (atStage).
import { writeTiff } from "../../../web/tiff_file.js";
import { EARLY } from "../../../web-tests/early_messages.mjs";
import { serveSite } from "../../../web-tests/site_server.mjs";
import { siteOf } from "../../../web-tests/harness.mjs";

export const ALGORITHMS = [
  { key: "v5", name: "v5-no-short-islands", title: "island-free", icon: "🏝️", about: "- Start from the dead-end check's network\n- Drop every vessel shorter than 45 µm\n  - that touches no junction at either end" },
  { key: "v4", name: "v4-line-evidence", title: "dead-end check", icon: "🔍", about: "- Start from the bridges network\n- Drop a short dead end that is no line" },
];

// the side of the stack drawn, in pixels
export const STACK_PX = 120;
// a CD31 stack as many slices deep as the model and over the model's field, its signal a grid of bright lines nowhere
// near most of the model's vessels, as the TIFF a study's Drive folder would hold
export function drawnStack(model) {
  const W = STACK_PX, H = STACK_PX, Z = model.slices, n = W * H, planes = [];
  for (let z = 0; z < Z; z++) {
    const p = new Uint8Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p[y * W + x] = (x % 17 < 2 || y % 23 < 2) ? 240 : 10;
    planes.push(p);
  }
  const res = (um) => [1e6, Math.round(um * 1e6)];
  return Buffer.from(writeTiff({ w: W, h: H, bps: 1, planes, xres: res((model.um_per_px * model.size_px[0]) / W), yres: res((model.um_per_px * model.size_px[1]) / H),
    description: `ImageJ=1.54f\nimages=${Z}\nslices=${Z}\nunit=micron\n` }));
}

const standIn = (model) => `
const MODEL = ${JSON.stringify(model)}, info = {}, ALGORITHMS = ${JSON.stringify(ALGORITHMS)};
postMessage({ type: "ready", info });
onmessage = ({ data: m }) => {
  if (m.type === "study") postMessage({ type: "ready", info });
  else if (m.type === "open") postMessage({ type: "held" });
  else if (m.type === "call" && m.action === "run")
    postMessage({ type: "result", action: "run", meta: { ...MODEL, algorithm: ALGORITHMS.find((a) => a.key === m.args.algorithm).name, asked: m.args }, bytes: null });
};`;

// the server, on a free port: {origin, close()}
export async function serve(studies, model) {
  const { origin, server } = await serveSite({
    "/web/worker.js": EARLY + standIn(model),
    "/studies/vascular/web/algorithms.json": JSON.stringify(ALGORITHMS),
    "/web/vendor/wheels.json": "[]",
    "/web/studies.json": { file: studies },
  });
  return { origin, close: () => server.close() };
}
// the study as these tests serve it, at stage, and its drawn stack's levels shown as drawn
export const atStage = (browser, stage) => siteOf(browser).studies.edit("vascular", (m) => ({ ...m, stage, view: { ...m.view, stretch: false } }));

export { BLUE, legend, legendKeys } from "../../../web-tests/keys_legend.mjs";
