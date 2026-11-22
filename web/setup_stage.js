// Stage (req/setup/promote): Study Setup's box for the study's stage. The owner promotes the study to the next stage and moves it back; the
// stage is one key of the study file (study_root.js setStudy), and promoting is always the owner's act, however the page measures the
// gate. Before Review the box lists the images whose extractions are newer than their GT, which the owner may want to mark first;
// promoting to Review asks to confirm, since it freezes marking and data (stages.js).
"use strict";
import * as tf from "./truth_folders.js";
import { setStudy } from "./study_root.js";
import { work } from "./pending.js";
import { asLoaded } from "./as_loaded.js";
import { holdOwns } from "./offline.js";
import { STAGES, WHAT, next, before, frozen } from "./stages.js";

const READ_AT_ONCE = 6;

// $: the page's selector; reader, writer, place: the store's reads and writes and the study's place in it; changed(stage): told once the
// stage is written, for what follows from it to be drawn again
export function setupStage({ $, reader, writer, place, changed }) {
  const box = $("#stage-box"), dlg = $("#stage-freeze-dlg"), msg = $("#stage-msg");
  // the box as the page loaded, put back when the study leaves
  const asStarted = asLoaded([box], holdOwns);
  let manifest = null, epoch = 0, busy = false, live = false;
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
    box.hidden = !now;
    if (!now) return;
    box.classList.toggle("busy", busy);
    $("#stage-now").textContent = now;
    $("#stage-what").textContent = WHAT[now];
    const up = next(now), back = before(now);
    $("#stage-up").hidden = !up; $("#stage-back").hidden = !back;
    if (up) $("#stage-up").textContent = up === "Review" ? "Promote to Review…" : `Promote to ${up}`;
    if (back) $("#stage-back").textContent = `Move back to ${back}`;
    for (const id of ["#stage-up", "#stage-back"]) $(id).disabled = busy;
    // the list is of before Review: from there on marking is closed
    $("#stage-newer-box").hidden = frozen(now);
    if (frozen(now)) { listed($("#stage-newer"), []); return; }
    if (!live || document.documentElement.classList.contains("offline")) return;
    const mine = epoch;
    newerThanGT().then((l) => { if (mine === epoch && stage() === now) { listed($("#stage-newer"), l); $("#stage-newer-box").hidden = !l.length; } },
      (e) => { console.warn("the extractions newer than their GT were not listed:", e); });
  }

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
  $("#stage-up").onclick = () => work.during(promote(), "the study's stage changed");
  $("#stage-back").onclick = () => { const to = before(stage()); if (to) work.during(write(to), "the study's stage changed"); };
  $("#stage-freeze-cancel").onclick = () => dlg.close();
  $("#stage-freeze").onclick = () => { dlg.close(); work.during(write("Review"), "the study's stage changed"); };

  return {
    // a study comes in: its stage, from the page's read of the study file
    mount(m) { epoch++; manifest = m; busy = false; say(""); draw(); },
    // the stage changed from outside this box (the page read it again)
    stageChanged() { epoch++; draw(); },
    // Study Setup opened for someone the store lets write the root, or not: only then is the store asked
    open(on) { const was = live; live = !!on; if (live && !was) draw(); },
    signedIn() {},
    opened() {},
    leave() { epoch++; manifest = null; asStarted(); },
    get on() { return false; },
  };
}
