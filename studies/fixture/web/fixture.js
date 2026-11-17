// The fixture study's page: the shell's two algorithms, a threshold, a Count button, the count, and the counted pixels drawn over
// the image; the count and its marks are its ground truth, kept as GT actions (gt_actions.js), and checking the count is right
// its one task. Everything the page draws of that comes from the shell's log, through shell.gt.on.
export function mount(shell) {
  const $ = shell.$, NS = "http://www.w3.org/2000/svg", RING = "#ffd400";
  let selected = null, mask = null, lastTruthDoc = null;
  const model = () => shell.gt.model();

  const submit = () => {
    const name = shell.state.fileName.replace(/\.[^.]*$/, "");
    shell.submitTruth({ count: model() ? 1 : 0, file: name + "_gt.json", items: [], empty: "Count first." });
  };
  // its one task, checking the count, open once there is one and the tagger tags
  const task = (m) => {
    const done = !!m?.checked;
    shell.tasks.count("check", done ? 1 : 0, 1);
    shell.tasks.ready(!!m, m ? (done ? "done" : "todo") : undefined);
    $("#fx-check").hidden = $("#fx-marks-tools").hidden = !m;
    const body = shell.tasks.open(m ? "check" : null)?.querySelector(".task-body");
    if (body) body.append($("#fx-check"), $("#fx-marks-tools"));
  };
  const pick = (key) => { if (model()) shell.tasks.open(key).querySelector(".task-body").append($("#fx-check"), $("#fx-marks-tools")); };
  shell.tasks.list([{ key: "check", name: "Count checked", title: "Whether the count is right" }], { submit, pick, tagging: () => task(model()) });

  // its progress on the image, the count, is kept nowhere but the page
  shell.clearable("count", () => {});

  // the layer's two groups: the counted pixels of this visit's Count, and a ring per mark
  const groups = () => {
    const g = shell.viewer.layer("fx");
    let masks = g.querySelector("#fx-masks"), marks = g.querySelector("#fx-marks");
    if (!masks) { masks = document.createElementNS(NS, "g"); masks.id = "fx-masks"; marks = document.createElementNS(NS, "g"); marks.id = "fx-marks"; g.append(masks, marks); }
    return { masks, marks };
  };
  const ring = (m) => {
    const c = document.createElementNS(NS, "circle");
    c.dataset.mark = m.id; c.setAttribute("cx", m.x); c.setAttribute("cy", m.y); c.setAttribute("r", 3);
    c.setAttribute("fill", "none"); c.setAttribute("stroke", RING); c.setAttribute("stroke-width", m.id === selected ? 2 : 1);
    return c;
  };
  const drawMarks = (m) => groups().marks.replaceChildren(...(m?.marks ?? []).map(ring));
  const drawMask = () => {
    const { W } = shell.state;
    if (!mask) return groups().masks.replaceChildren();
    let d = "";
    for (let i = 0; i < mask.length; i++) if (mask[i]) d += `M${i % W} ${Math.floor(i / W)}h1v1h-1z`;
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); p.setAttribute("fill", "rgba(255, 0, 200, 0.4)"); p.id = "fx-mask";
    groups().masks.replaceChildren(p);
  };

  function render(m, why) {
    if (why === "open" || why === "load") { mask = null; selected = null; }
    if (m && selected && !m.marks.some((k) => k.id === selected)) selected = null;
    $("#fx-done").checked = !!m?.checked;
    $("#fx-del").disabled = !m || !selected;
    $("#fx-add").disabled = !m;
    task(m);
    drawMask(); drawMarks(m);
    if (!m) {
      $("#fx-count").disabled = false; shell.views.count(null);
      $("#fx-result").textContent = $("#fx-sum").textContent = $("#fx-item").textContent = "Nothing counted yet."; shell.summary.set(null);
      return;
    }
    $("#fx-result").textContent = $("#fx-sum").textContent = $("#fx-item").textContent = `${m.count} pixels ${shell.algorithm.title} the threshold`;
    shell.views.count(1);
    shell.summary.set({ over: "the whole image", rows: [
      { measurement: "Pixels above the threshold", unit: "pixels", value: m.count },
      { measurement: "Threshold", unit: "grey level", value: m.threshold }] });
    shell.step("count", true, `${m.count} pixels above ${m.threshold}`);
    shell.boxDone($("#fx-box"), `Counted at ${m.threshold}`);
  }
  shell.gt.on(render, shell.signal);

  $("#fx-count").onclick = () => {
    shell.busy(true, "Counting…");
    shell.call("count", { algorithm: shell.algorithm.key, threshold: +$("#fx-threshold").value });
  };
  $("#fx-done").onchange = () => { if (!shell.gt.act({ type: "check", on: $("#fx-done").checked })) render(model(), "act"); };
  $("#fx-add").onclick = () => {
    const { W, H } = shell.state, m = model();
    selected = null;
    if (!shell.gt.act({ type: "add-mark", mark: "m" + m.next, to: [Math.round(W / 2), Math.round(H / 2)] })) render(model(), "act");
  };
  $("#fx-del").onclick = () => { if (selected && !shell.gt.act({ type: "delete-mark", mark: selected })) render(model(), "act"); };
  const select = (id) => { selected = id; render(model(), "act"); };

  // the mark a pointer is over, in the image's pixels
  const markAt = (e) => {
    const [x, y] = shell.viewer.toImage(e), reach = Math.max(4, 6 / shell.state.zoom);
    let best = null, near = reach;
    for (const k of model()?.marks ?? []) { const d = Math.hypot(k.x - x, k.y - y); if (d <= near) { best = k; near = d; } }
    return best;
  };
  $("#scroller").addEventListener("pointerdown", (e) => {
    const m = e.button === 0 && shell.tasks.tagging() ? markAt(e) : null;
    if (!m) return;
    e.preventDefault();
    select(m.id);
    shell.drag($("#scroller"), e, {
      move: (ev) => { const c = $(`#fx-marks circle[data-mark="${m.id}"]`), [x, y] = shell.viewer.toImage(ev); c?.setAttribute("cx", x); c?.setAttribute("cy", y); },
      drop: (ev) => {
        const [x, y] = shell.viewer.toImage(ev), to = [Math.round(x), Math.round(y)];
        if ((to[0] !== m.x || to[1] !== m.y) && shell.gt.act({ type: "move-mark", mark: m.id, to })) return;
        drawMarks(model());
      },
      cancel: () => drawMarks(model()),
    });
  }, { signal: shell.signal });

  window.fixture = { model, truth: () => lastTruthDoc };
  return {
    pickAt: (e) => markAt(e)?.id ?? null,
    pick: (id) => select(id),
    // the curated ground truth's final result: the count, and no task
    showTruth(doc) {
      lastTruthDoc = doc;
      const c = doc.labels?.[0];
      $("#fx-result").textContent = c ? `Ground truth: ${c.count} pixels above ${c.threshold}` : "Ground truth: nothing counted";
      return c ? `${c.count} pixels counted` : "nothing counted";
    },
    result(action, meta, bytes) {
      shell.busy(false);
      const { W, H } = shell.state, sum = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let i = 0; i < bytes.length; i++) if (bytes[i]) {
        const x = i % W, y = Math.floor(i / W), q = (x >= W / 2 ? 1 : 0) + (y >= H / 2 ? 2 : 0);
        sum[q][0] += x; sum[q][1] += y; sum[q][2]++;
      }
      const spots = sum.filter((s) => s[2]).map((s) => [Math.round(s[0] / s[2]), Math.round(s[1] / s[2])]);
      mask = bytes;
      shell.gt.ran({ algorithm: { key: shell.algorithm.key, params: { threshold: +$("#fx-threshold").value } },
        output: { threshold: +$("#fx-threshold").value, count: meta.count, spots } });
      shell.status("Counted.");
    },
  };
}
