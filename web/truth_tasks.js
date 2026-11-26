// The study's Analysis Tasks in the shell's Analysis box (req/shell/ground-truth/tasks): under the box's header a strip of
// their progress, a bar of one part per task and a counter per task; under the runner the open task's row, and Upload last. The study says what its tasks are and how far each has
// got; how a task is worked through stays the study's, which puts what it needs on the open task's row. A task is open
// only while the user annotates, from the choice that enters annotation mode to its end (req/shell/annotate/choice).
"use strict";
import * as Areas from "./gt_areas.js";
import { areaMap } from "./gt_area_map.js";

// started(): whether the study's first step is done; until it is, Submit stays off whatever the study says; heardBy(on):
// the shell's own listener, told as the study is each time tagging starts or stops
export function truthTasks({ $, icon, started, heardBy }) {
  let pick = null, submit = null, heard = null, untick = null, wants = false, on = false;
  // the areas each way the study's walk takes, null for a study not walked by areas; who hears each change of it
  let n = null, moved = [];
  $("#gt-areas").replaceChildren(...Areas.COUNTS.map((k) => new Option(k === 1 ? "The whole field" : `${k} × ${k}`, String(k))));
  $("#gt-areas").onchange = (e) => { n = +e.target.value; for (const fn of moved) fn(n); };
  const rows = () => [...$("#gt-tasks").children].filter((li) => li.dataset.task !== "submit");
  const counter = (key) => [...$("#gt-counters").children].find((b) => b.dataset.task === key);
  const row = (key) => rows().find((li) => li.dataset.task === key) || null;
  const part = (key) => [...$("#gt-bar").children].find((p) => p.dataset.task === key);
  const ico = $("#gt-submit .gt-ico");
  ico.innerHTML = ["done", "part", "todo"].map((n) => icon(n).replace("<svg ", `<svg class="${n}" `)).join("");

  $("#gt-submit").onclick = () => submit?.();
  $("#gt-tasks").addEventListener("click", (e) => {
    const t = e.target.closest("button.t, button.tick"), li = t?.closest("li");
    if (!li || li.parentElement !== $("#gt-tasks")) return;
    // a done task's tick takes it back where the study says how, else opens it again as its name does
    if (t.classList.contains("tick") && untick) return untick(li.dataset.task);
    pick?.(li.dataset.task);
  });
  $("#gt-counters").addEventListener("click", (e) => { const b = e.target.closest("button[data-task]"); if (b) pick?.(b.dataset.task); });
  $("#gt-bar").addEventListener("click", (e) => { const p = e.target.closest("span[data-task]"); if (p) pick?.(p.dataset.task); });
  // Upload's tooltip: what the study says is left to do, else the tasks still open, by name
  let said = "";
  function retitle() {
    const open = [...$("#gt-bar").children].filter((p) => !row(p.dataset.task)?.classList.contains("done")).map((p) => p.title);
    if (!said && !$("#gt-bar").children.length) return $("#gt-submit").removeAttribute("title");
    $("#gt-submit").title = said || (open.length ? `Still open: ${open.join(", ")}` : "Upload your analysis to the study");
  }
  function tagged(now) {
    if (!now) for (const el of [...rows(), ...$("#gt-counters").children, ...$("#gt-bar").children]) el.classList.remove("now");
  }

  const api = {
    // tasks: [{key, name, title}] in the order they are done, or null to show none for now; hooks: {pick(key), submit(),
    // tagging(on), untick(key)}, tagging heard each time tagging starts or stops, untick how the study takes a done task back. The same tasks again keep their rows, and what the
    // study put on them.
    list(tasks, hooks = {}) {
      pick = hooks.pick || pick; submit = hooks.submit || submit; heard = hooks.tagging || heard; untick = hooks.untick || untick;
      if (!tasks) api.tagging(false);
      $("#gt-list").hidden = !tasks;
      if (!tasks || rows().map((li) => li.dataset.task).join() === tasks.map((t) => t.key).join()) return;
      for (const li of rows()) li.remove();
      $("#gt-bar").replaceChildren(); $("#gt-counters").replaceChildren();
      for (const t of tasks) {
        const li = document.createElement("li");
        li.dataset.task = t.key;
        li.innerHTML = `<div class="task-head"><button class="tick" type="button" role="checkbox" aria-checked="true" title="Done. Press to open it again"></button><button class="t" type="button"><span class="n"></span> </button></div><div class="task-body"></div>`;
        const b = li.querySelector(".t");
        b.append(t.name);
        if (t.title) b.title = t.title;
        $('#gt-tasks > li[data-task="submit"]').before(li);
        const c = Object.assign(document.createElement("button"), { type: "button", innerHTML: `<span class="n"></span> ` });
        c.dataset.task = t.key; c.hidden = true; c.append(t.name, Object.assign(document.createElement("span"), { className: "tick", ariaHidden: "true" }));
        if (t.title) c.title = t.title;
        $("#gt-counters").append(c);
        const p = document.createElement("span");
        p.dataset.task = t.key; p.title = t.name;
        $("#gt-bar").append(p);
      }
      api.ready(false);
    },
    // how far a task has got: did of all, done once every one is (or as the study says); did null while not known,
    // of null for a task with no total, which shows its count alone and is done when the study says; shown, when given,
    // what the row says in the count's place, "" for nothing, the bar's part still did of all
    count(key, did, of, done = did != null && of > 0 && did >= of, shown) {
      const li = row(key), p = part(key);
      if (!li) return;
      const says = shown ?? (did == null ? "" : of == null ? String(did) : `${did}/${of}`), c = counter(key);
      li.querySelector(".n").textContent = c.querySelector(".n").textContent = says;
      // a task that says no count is its bar part alone, done or not
      c.hidden = !says; li.classList.toggle("bare", !says);
      li.classList.toggle("done", !!done); c.classList.toggle("done", !!done);
      retitle();
      const whole = of == null ? 1 : Math.max(of, 1), part_ = of == null ? (done ? 1 : 0) : did != null && of ? Math.min(did / of, 1) : 0;
      p.style.flexGrow = did == null ? 1 : whole; p.style.setProperty("--done", did == null ? 0 : part_);
    },
    // the open task, its name in bold: its row, for the study to put its item and tools on; null for none, and
    // always null while the user is not annotating
    open(key) {
      if (!on) key = null;
      for (const el of [...rows(), ...$("#gt-counters").children, ...$("#gt-bar").children]) el.classList.toggle("now", el.dataset.task === key);
      return key == null ? null : row(key);
    },
    // whether the user annotates now; with a value, annotation started or ended, the study told when it changes
    tagging(now) {
      if (now === undefined) return on;
      now = !!now;
      if (now === on) return on;
      on = now; tagged(on); heardBy?.(on); heard?.(on);
      return on;
    },
    row,
    // the areas the study's ground truth is walked through (req/shell/ground-truth/areas): count(), the areas each way now,
    // null for a study not walked by areas; on(fn), fn(count) heard each time the tagger chooses another; place(a), areaAt(fx,
    // fy) and box(a, W, H), as gt_areas.js, at the count now; map(body, {state(a), now, pick(a)}) draws them
    areas: {
      count: () => n,
      on(fn) { moved.push(fn); },
      place: (a) => Areas.place(a, n),
      areaAt: (fx, fy) => Areas.areaAt(fx, fy, n),
      box: (a, W, H) => Areas.box(a, n, W, H),
      // the areas drawn as a map into body, an element of the study's own (req/shell/ground-truth/area-map)
      map: (body, how) => areaMap(body, { ...how, n }),
    },
    // the study arriving: start, the count it starts at from its study.json, or none
    mount(start) {
      n = start ?? null; moved = [];
      $("#gt-areas-row").hidden = n == null;
      if (n != null) $("#gt-areas").value = String(n);
    },
    // whether Submit can be pressed, whether the ground truth is done, partly done or not started where known, and
    // what is left to do as its tooltip
    ready(on, state, title) {
      const b = $("#gt-submit");
      wants = !!on; b.disabled = !wants || !started();
      if (state) b.dataset.state = state; else delete b.dataset.state;
      said = title || ""; retitle();
    },
    // the study's steps moved: Submit follows its first one
    stepped() { $("#gt-submit").disabled = !wants || !started(); },
    // the study leaving: its tasks go
    leave() {
      api.tagging(false);
      pick = submit = heard = untick = null; n = null; moved = []; $("#gt-areas-row").hidden = true; $("#gt-areas").selectedIndex = 0;
      for (const li of rows()) li.remove();
      $("#gt-bar").replaceChildren(); $("#gt-counters").replaceChildren(); $("#gt-list").hidden = true; api.ready(false);
    },
  };
  return api;
}
