// Marks (req/setup/marks): Study Setup's box for the image chosen, listing the image's extractions, each with GT and Official to mark
// or unmark it. A mark names the extraction's file by its id in the store, so it follows that file's latest content; an image holds one
// GT mark and one official mark, and marking another replaces the first. The marks are kept in the study file (study_root.js).
"use strict";
import * as tf from "./truth_folders.js";
import { writeMarks } from "./study_root.js";
import { work } from "./pending.js";
import { asLoaded } from "./as_loaded.js";
import { holdOwns } from "./offline.js";

const KINDS = [["gt", "GT", "the ground truth the lab scores against"], ["official", "Official", "the Analysis File the study's numbers count"]];

// $: the page's selector; reader, writer, place: the store's reads and writes and the study's place in it; data: Data Management
// (marked() draws the folder on show with the marks written); allows(action): whether the stage opens it, the buttons being there only while
// it opens marking (req/shell/study/stage); calls: the page's network calls, which the list is a place of (req/setup/loading)
export function setupMarks({ $, reader, writer, place, data, allows, calls }) {
  const box = $("#marks-box"), list = $("#marks-list"), msg = $("#marks-msg");
  // the box as the page loaded, put back when the study leaves
  const asStarted = asLoaded([$("#marks-box")], holdOwns);
  let image = null, epoch = 0;
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle("err", !!err); };
  const when = (iso) => (iso ? new Date(iso).toLocaleString() : "");

  // who made the extraction, as its file says: null for a batch run's, which names none
  async function authorOf(row) {
    if (row.run) return null;
    const doc = JSON.parse(await reader.text(row.id));
    return typeof doc?.tagger === "string" ? doc.tagger : null;
  }

  const draw = work.counting("the image's extractions drawn", () => paint());

  async function mark(row, kind) {
    if (!allows("mark")) return;
    const sha = image.sha, on = row.marks.includes(kind), word = kind === "gt" ? "GT" : "official";
    for (const b of list.querySelectorAll("button")) b.disabled = true;
    let said = null;
    try {
      const by = on ? null : await authorOf(row);
      await writeMarks({ reader, writer, root: place.root(), changes: [{ sha, kind, mark: on ? null : { file: row.id, by } }] });
      await data.marked();
      said = [on ? `Took the ${word} mark off.` : `Marked ${word}.`];
    } catch (e) { said = [e.message || String(e), true]; }
    await draw();
    say(...said);
  }

  async function paint() {
    const mine = ++epoch, img = image;
    list.replaceChildren();
    if (!img) { box.hidden = true; return; }
    box.hidden = false;
    $("#marks-for").textContent = img.name;
    if (!img.sha) return say("The store does not say this image's SHA-256, which a mark is kept under.", true);
    say("");
    const slot = calls.fill(list, "store", `${img.name}'s Analysis Files`);
    let rows;
    try {
      const s = await place.settings({ fresh: true }), folder = tf.folderOf(s);
      if (!folder) { slot.done(); return say("Set up Analysis Files first: the files marked are kept in their folder."); }
      const files = await tf.files(reader, folder, { name: img.name, sha256: img.sha });
      rows = tf.rows({ files, marks: tf.marksOf(s.marks, img.sha), key: null, member: true });
    } catch (e) { slot.failed(e); return mine === epoch && say("The image's Analysis Files could not be read: " + (e.message || e), true); }
    if (mine !== epoch || !slot.done()) return;
    if (!rows.length) return say("No Analysis File of this image yet.");
    list.replaceChildren(...rows.map((row) => {
      const el = Object.assign(document.createElement("div"), { className: "mark-row" });
      el.setAttribute("role", "listitem"); el.dataset.id = row.id;
      el.innerHTML = `<span class="mark-label"></span>`;
      el.querySelector(".mark-label").textContent = [row.label, when(row.modified)].filter(Boolean).join(" · ");
      for (const [kind, word, title] of allows("mark") ? KINDS : []) {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "mark-" + kind, textContent: word });
        b.dataset.kind = kind; b.dataset.needsNetwork = ""; b.setAttribute("aria-pressed", String(row.marks.includes(kind)));
        b.title = row.marks.includes(kind) ? `Take off the ${word} mark` : `Mark it ${word}: ${title}`;
        b.onclick = () => work.during(mark(row, kind), "a mark written");
        el.append(b);
      }
      return el;
    }));
    say("");
  }

  return {
    // an image chosen in Data Management, or nothing
    chose(kind, info) {
      image = kind === "image" ? info : null;
      draw();
    },
    // the stage changed, by a promotion or a move back: the buttons are drawn, or taken away
    stageChanged() { if (image) draw(); },
    leave() { image = null; ++epoch; asStarted(); },
  };
}
