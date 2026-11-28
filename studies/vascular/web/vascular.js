// The vascular study's page: the stack in the shell's 3D viewer; Processing runs an extraction algorithm in the page's
// Python and opens the vessel model it draws over the stack or beside it, to correct (model_view.js); while the study
// makes ground truth its tasks are in the left bar (tasks.js), and outside it the model's junctions and vessels are
// cards (items.js). The corrected model is sent as ground truth.
import * as MV from "./model_view.js";
import * as items from "./items.js";
import * as tasks from "./tasks.js";
import * as summary from "./summary_view.js";
import { order } from "./channel_order.js";
import { oldEdits } from "./old_edits.js";

export function mount(shell) {
  const { $ } = shell, V = shell.viewer.three, truth = shell.makesTruth;
  let algorithms = [], ran = null, running = null, zStep = null;
  MV.init(V, shell.signal, truth, shell.actions, shell.gt);
  shell.signal.addEventListener("abort", () => MV.leave());
  shell.views.on((v) => { items.visibleNow(v === "items"); if (v === "image") V.redraw(); });
  items.init(V, () => shell.views.show("image"), shell.views.count);
  if (truth) tasks.init(V, shell.tasks, steps, submit, shell.actions, () => shell.viewer.levels());
  // the summary and its mask show only while the study does not make ground truth
  else summary.init(V, shell, MV.current);

  // ---------- Processing: Execute, with the algorithm chosen above it (the shell's) ----------
  const chosen = () => algorithms.find((a) => a.key === shell.algorithm.key);
  const canRun = () => { $("#vm-run").disabled = !algorithms.length || !shell.page.get("image") || !!running; };
  shell.algorithm.on(() => steps());
  $("#vm-run").onclick = () => {
    const a = chosen(), im = shell.page.get("image"); if (!a || !im) return;
    running = a.key; zStep = V.S.zsFrom ? V.S.zs : null; canRun();
    shell.busy(true, `Drawing the vessel model with ${a.title}…`);
    shell.call("run", { algorithm: a.key, source: shell.state.fileName, z_step: zStep });
  };

  // ---------- the study's steps ----------
  function steps() {
    const m = MV.current();
    shell.step("find", !!m && (!ran || ran === shell.algorithm.key));
    const open = truth && tasks.open();
    shell.step("review", !!m && (!truth || (!!open && open.every((t) => t.ok))));
  }
  MV.onChange((m) => { if (truth) shell.tasks.ready(!!m); else summary.changed(); if (!m) ran = null; steps(); });

  function submit() {
    const gt = MV.truth();
    if (!gt) return;
    shell.submitTruth({ count: gt.edits, items: truth ? tasks.open() : gt.items,
      empty: "Correct the model first: approve or decline a vessel, judge a junction, do an area or draw a missed vessel." });
  }
  // a stack already open when the study comes in (a switch from another study)
  if (shell.page.get("image")) MV.stackOpened();
  // act: a GT action from a page test; base: a document taken as the log's base
  window.vascular = { tasks: tasks.inspect, model: MV.inspect, summary: summary.inspect, act: (a) => shell.gt.act(a), base: (doc) => shell.gt.base(doc, { note: "a test" }) };

  shell.algorithm.ready.then((list) => { algorithms = list; canRun(); });

  return {
    order,
    opening() { ran = null; MV.stackOpened(); canRun(); },
    opened() { canRun(); shell.status(truth ? "Stack loaded. Press Execute to draw its vessel model." : "Stack loaded. Press Start to draw its vessel model."); },
    result(action, meta) {
      if (action !== "run") return;
      shell.busy(false);
      ran = running; running = null;
      // said before the run is recorded: what the run could not carry over is then the line that stands
      shell.status(`The vessel model is drawn: ${meta.edges.length} vessels, in ${meta.score?.seconds ?? "?"} s.`);
      shell.gt.ran({ algorithm: { key: ran, params: { z_step: zStep } }, output: meta });
      shell.gt.legacy(oldEdits(meta));
      canRun(); steps();
    },
    // a curated ground truth's final results (req/shell/ground-truth/view): the corrected model drawn as a model is,
    // with none of the tasks' marks
    showTruth(doc) {
      MV.drawn(JSON.stringify(doc), "curated ground truth");
      const m = MV.current();
      steps();
      return m ? `${m.segments.length} vessel segments` : "a vessel model that could not be read";
    },
    error() { if (running) { running = null; shell.busy(false); canRun(); } },
    async settled() { if (running) await shell.until("result:run"); },
  };
}
