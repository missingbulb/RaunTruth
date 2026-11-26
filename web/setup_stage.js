// Stage (req/setup/promote): the study's five stages across the top of Study Setup, the current one selected. The owner promotes the
// study through the next stage's action and moves it back through the one before's; the
// stage is one key of the study file (study_root.js setStudy), and promoting is always the owner's act, however the page measures the
// gate. Before Review a button lists the images whose extractions are newer than their GT, which the owner may want to mark first, and so
// does promoting to Review, once, before it asks to confirm, since that freezes marking and data (stages.js). Nothing else reads them.
"use strict";
import * as tf from "./truth_folders.js";
import { setStudy } from "./study_root.js";
import { work } from "./pending.js";
import { asLoaded } from "./as_loaded.js";
import { holdOwns } from "./offline.js";
import { STAGES, WHAT, NEXT, LIGHT, next, before, frozen } from "./stages.js";

const READ_AT_ONCE = 6;

// $: the page's selector; reader, writer, place: the store's reads and writes and the study's place in it; changed(stage): told once the
// stage is written, for what follows from it to be drawn again
export function setupStage({ $, reader, writer, place, changed, calls }) {
  const box = $("#stage-box"), dlg = $("#stage-freeze-dlg"), msg = $("#stage-msg"), steps = $("#stage-steps");
  steps.replaceChildren(...STAGES.map((name) => {
    const li = document.createElement("li");
    li.dataset.stage = name; li.dataset.light = LIGHT[name];
    li.innerHTML = '<span class="stage-name"></span><span class="stage-say"></span><button type="button" class="stage-act" data-needs-network hidden></button>';
    li.querySelector(".stage-name").textContent = name;
    return li;
  }));
  // the box as the page loaded, put back when the study leaves
  const asStarted = asLoaded([box], holdOwns);
  let manifest = null, epoch = 0, busy = false;
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle("err", !!err); };
  const stage = () => (manifest && STAGES.includes(manifest.stage) ? manifest.stage : null);

  // The images whose GT mark names an extraction that another, unmarked one of the image is newer than: [{name}], read from the study
  // file's marks and index and the images' extractions
  async function newerThanGT() {
    const s = await place.settings({ fresh: true }), folder = tf.folderOf(s);
    if (!s || !folder) return [];
    const byHash = new Map((s.index?.images || []).filter((i) => i.sha).map((i) => [i.sha, i]));
    const marked = Object.entries(s.marks || {}).filter(([sha, m]) => m?.gt?.file && byHash.has(sha));
    const out = [];
    for (let k = 0; k < marked.length; k += READ_AT_ONCE) {
      const got = await Promise.all(marked.slice(k, k + READ_AT_ONCE).map(async ([sha, m]) => {
        const im = byHash.get(sha), files = await tf.files(reader, folder, { name: im.name, sha256: sha });
        const gt = files.find((f) => f.id === m.gt.file), taken = new Set([m.gt?.file, m.official?.file]);
        return gt && files.some((f) => !taken.has(f.id) && String(f.modified) > String(gt.modified)) ? { name: im.name } : null;
      }));
      out.push(...got.filter(Boolean));
    }
    return out;
  }
  const listed = (ul, items) => ul.replaceChildren(...items.map((i) => {
    const li = Object.assign(document.createElement("li"), { textContent: i.name });
    li.dataset.name = i.name;
    return li;
  }));

  function draw() {
    const now = stage();
    if (!now) return asStarted();
    box.hidden = false;
    box.classList.toggle("busy", busy);
    $("#stage-what").textContent = `${now}: ${WHAT[now]} ${NEXT[now]}`;
    const at = STAGES.indexOf(now), up = next(now), back = before(now);
    for (const [k, li] of [...steps.children].entries()) {
      const state = k < at ? "done" : k === at ? "now" : "ahead", b = li.querySelector(".stage-act"), act = li.dataset.stage === up ? "up" : li.dataset.stage === back ? "back" : null;
      li.dataset.state = state;
      if (state === "now") li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      li.querySelector(".stage-say").textContent = state === "done" ? "done" : state === "now" ? "current" : "";
      b.hidden = !act; b.disabled = busy;
      if (act) b.id = "stage-" + act; else b.removeAttribute("id");
      b.textContent = act === "up" ? (up === "Review" ? "Promote to Review…" : `Promote to ${up}`) : act === "back" ? `Move back to ${back}` : "";
    }
    $("#stage-find").disabled = busy;
    // the list is of before Review: from there on marking is closed
    $("#stage-find").hidden = frozen(now);
    if (frozen(now)) shown([]);
  }

  // the list of newer extractions: one listing per GT-marked image, read on the owner's press and on promoting to Review, never otherwise
  const shown = (l, asked) => { listed($("#stage-newer"), l); $("#stage-newer-box").hidden = !l.length && !asked; $("#stage-newer-none").hidden = !!l.length; };
  async function find() {
    busy = true; draw(); say("");
    const mine = epoch, now = stage();
    try {
      const l = await calls.during("store", "the Analysis Files newer than their GT", newerThanGT);
      if (mine === epoch && stage() === now) shown(l, true);
    } catch (e) { console.warn("the extractions newer than their GT were not listed:", e); say("The Analysis Files could not be listed.", true); }
    busy = false; draw();
  }
  $("#stage-find").onclick = () => work.during(find(), "the images with newer extractions were listed");

  async function write(to) {
    busy = true; draw(); say("");
    try {
      const s = await setStudy({ reader, writer, root: place.root(), changes: { stage: to } });
      busy = false;
      changed(STAGES.includes(s.stage) ? s.stage : to);
      say(`The study is in ${to}.`);
    } catch (e) { busy = false; say(e.message || String(e), true); }
    draw();
  }

  async function promote() {
    const to = next(stage());
    if (!to) return;
    if (to !== "Review") return write(to);
    let l = [];
    try { l = await newerThanGT(); } catch (e) { console.warn("the extractions newer than their GT were not listed:", e); }
    listed($("#stage-freeze-newer"), l); $("#stage-freeze-newer-box").hidden = !l.length;
    dlg.showModal();
  }
  steps.onclick = (e) => {
    const b = e.target.closest(".stage-act");
    if (b?.id === "stage-up") work.during(promote(), "the study's stage changed");
    else if (b?.id === "stage-back") { const to = before(stage()); if (to) work.during(write(to), "the study's stage changed"); }
  };
  $("#stage-freeze-cancel").onclick = () => dlg.close();
  $("#stage-freeze").onclick = () => { dlg.close(); work.during(write("Review"), "the study's stage changed"); };

  return {
    // a study comes in: its stage, from the page's read of the study file
    mount(m) { epoch++; manifest = m; busy = false; say(""); shown([]); draw(); },
    // the stage changed from outside this box (the page read it again)
    stageChanged() { epoch++; shown([]); draw(); },
    // Study Setup opened for someone the store lets write the root, or not: only then is the store asked
    open() {},
    signedIn() {},
    opened() {},
    leave() { epoch++; manifest = null; asStarted(); },
    get on() { return false; },
  };
}
