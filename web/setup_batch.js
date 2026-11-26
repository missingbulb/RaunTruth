// The images selected and what is done to them together (req/setup/batch): on Study Setup's Images, each image of the folder on show
// has a checkbox, and a selection shows a bar of actions. Run analysis gives each selected image an Analysis File in the study's
// Analysis folder, made by the study's default algorithm and named for it and the study's code version (truth_folders.js runFile); an
// image that already has one is skipped, so a run stopped for any reason goes on from where it was. The run itself is the shell's
// (shell.js batchRunner): the study's first step, pressed as the main app's user presses it. Hide and Request GT are Data
// Management's, asked of it for the selection.
"use strict";
import * as tf from "./truth_folders.js";
import { writeMarks } from "./study_root.js";
import { work } from "./pending.js";
import { asLoaded } from "./as_loaded.js";
import { holdOwns } from "./offline.js";

// $: the page's selector; runner: the shell's; remote: the store; reader, writer, place: its reads and writes and the study's place in it;
// account: the sign-in; data: Data Management ({marked() draws the folder on show with the marks written, hide(images) and
// requestTruth(images) its own writes for the selection}); status: the page's line; calls: the page's calls to other servers;
// allows(action): what the study's stage opens; measured(doc): the study's measures of an Analysis File's document, [{title, value}]
export function setupBatch({ $, runner, remote, account, reader, writer, place, data, status, calls, allows, measured }) {
  const bar = $("#batch-bar"), go = $("#batch-run"), all = $("#batch-all"), official = $("#batch-official"), msg = $("#batch-msg"), items = $("#folder-items");
  const hide = $("#batch-hide"), request = $("#batch-gt"), list = $("#batch-results");
  // the bar and the list as the page loaded, put back when the study leaves
  const asStarted = asLoaded([bar, list, $("#batch-select"), msg], holdOwns);
  // the folder on show, {id, name, images: [{id, name, sha, folder}]}; the ids of the images selected; the run under way (its abort);
  // the images the last run reached, {sha, name, file}, which Mark official marks, and whether it has; what the run found of each,
  // [{name, text}]; the study's default algorithm's key, once listed
  let folder = null, chosen = new Set(), running = null, reached = [], marked = false, found = [], algorithm = null, listing = null, setUp = false, acting = false, shownId = null;
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle("err", !!err); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  async function listed() {
    listing ||= runner.list().then((l) => { algorithm = l.find((a) => a.default === true)?.key ?? null; },
      (e) => { listing = null; say("The study's algorithm could not be read: " + (e.message || e), true); });
    return listing;
  }

  async function paint() {
    const mine = folder;
    if (mine && runner.able) await listed();
    if (folder !== mine) return;
    // a read the store does not answer (a token run out) leaves what was last read; with no folder on show nothing is asked
    const s = folder ? await place.settings().catch(() => undefined) : undefined;
    if (folder !== mine) return;
    if (s !== undefined) setUp = !!s?.extractions;
    const n = folder?.images.length || 0, busy = !!running || acting;
    $("#batch-select").hidden = !folder;
    $("#batch-for").textContent = folder ? `${chosen.size} of ${n} selected` : "";
    all.checked = n > 0 && chosen.size === n; all.indeterminate = chosen.size > 0 && chosen.size < n; all.disabled = busy || !n;
    bar.hidden = !folder || !(chosen.size || running || reached.length);
    const runs = runner.able && !!algorithm && setUp, edits = allows("setup-data");
    go.hidden = !runs;
    go.textContent = running ? "Stop" : "Run analysis";
    go.disabled = (!running && !chosen.size) || acting;
    go.title = running ? "Stop after the image being run" : "Run the study's analysis on each selected image";
    hide.hidden = request.hidden = !edits;
    hide.disabled = request.disabled = busy || !chosen.size;
    for (const b of items.querySelectorAll(".pick")) b.disabled = busy;
    official.hidden = !reached.length; official.disabled = busy;
    official.textContent = marked ? "Official ✓ · Undo" : "Mark official";
    official.title = marked ? `Take the official mark off the ${plural(reached.length, "image")} the run reached` : `Mark each of the ${plural(reached.length, "image")} the run reached official`;
    list.hidden = !found.length;
    list.replaceChildren(...found.map((f) => Object.assign(document.createElement("li"), { textContent: `${f.name} · ${f.text}` })));
  }

  const draw = work.counting("the selection's actions drawn", paint);

  // the checkboxes of the folder's cells, and the ones this keeps selected
  const sync = () => { for (const b of items.querySelectorAll(".pick")) b.checked = chosen.has(b.dataset.id); };
  items.addEventListener("change", (e) => {
    const b = e.target.closest?.(".pick");
    if (!b) return;
    if (b.checked) chosen.add(b.dataset.id); else chosen.delete(b.dataset.id);
    draw();
  });
  all.onchange = () => {
    if (!folder) return;
    chosen = all.checked ? new Set(folder.images.map((i) => i.id)) : new Set();
    sync(); draw();
  };
  const selection = () => folder.images.filter((i) => chosen.has(i.id));

  // the token has run out, or the store said so: the run waits for the next click, which renews it
  const ranOut = (e) => e?.status === 401 || /sign-in has run out|refused the token/i.test(e?.message || "");
  const resultOf = (doc) => measured(doc).filter((m) => m.value != null).map((m) => `${m.title}: ${m.value}`).join(", ") || "run";

  async function run() {
    const images = selection(), stop = new AbortController();
    running = stop; reached = []; marked = false; found = []; say(""); draw();
    let made = 0, skipped = 0;
    const ran = () => `${plural(made, "image")} run${skipped ? `, ${plural(skipped, "image")} already had it` : ""}`;
    try {
      await account.forRead();
      const extractions = tf.folderOf(await place.settings({ fresh: true }));
      if (!extractions) throw new Error("Set up Analysis Files first: a run's files are kept in their folder.");
      const code = await runner.version(), version = code ? String(code).slice(0, 8) : "unknown";
      for (const [k, im] of images.entries()) {
        if (stop.signal.aborted) break;
        if (!im.sha) throw new Error(`The store does not say ${im.name}'s SHA-256, which its Analysis File is kept under.`);
        const image = { name: im.name, sha256: im.sha };
        const had = (await tf.files(reader, extractions, image)).find((f) => f.name === tf.runFile(algorithm, version));
        if (had) { reached.push({ sha: im.sha, name: im.name, file: had.id }); found.push({ name: im.name, text: "already had one" }); skipped++; draw(); continue; }
        if (!account.token()) throw new Error("Your sign-in has run out: click again to renew it");
        say(`Running ${k + 1} of ${images.length}: ${im.name}…`);
        status(`Running the analysis: ${im.name}, ${k + 1} of ${images.length}…`);
        const doc = await runner.run(remote.source(im.id, { name: im.name, folder: im.folder }), algorithm, stop.signal);
        const saved = await tf.saveRun({ reader, writer, folder: extractions, image, algorithm, version, doc });
        reached.push({ sha: im.sha, name: im.name, file: saved.id }); found.push({ name: im.name, text: resultOf(doc) }); made++; draw();
      }
      const them = reached.length === 1 ? "it" : "them";
      say(`${stop.signal.aborted ? "Stopped" : "Done"}: ${ran()}.${reached.length ? ` Mark ${them} official to see ${them} in Results.` : ""}`);
      status(made ? `The run is over: saved ${plural(made, "Analysis File")} to the study.` : "The run is over: nothing new to save.");
    } catch (e) {
      if (e?.status === 401) account.refused();
      say(ranOut(e) ? `Your sign-in ran out: the run is held (${ran()}). Click Run analysis to go on from here.` : `The run stopped: ${e.message || e} (${ran()}). Click Run analysis to try again from there.`, !ranOut(e));
      status("The run is held.");
    } finally {
      running = null;
      if (made) await data.marked();
      draw();
    }
  }
  go.onclick = () => { if (running) { running.abort(); say("Stopping after this image…"); } else if (folder && chosen.size) work.during(run(), "a run over the selected images"); };

  // the images the run reached marked official, or the marks taken off again: one write either way
  official.onclick = () => work.during(mark(!marked), "the run's images marked official, or unmarked");
  async function mark(on) {
    acting = true; draw();
    const n = plural(reached.length, "image");
    try {
      await calls.saving("store", on ? `Marked ${n} official in the study.` : `Took the official mark off ${n} in the study.`,
        () => writeMarks({ reader, writer, root: place.root(), changes: reached.map((r) => ({ sha: r.sha, kind: "official", mark: on ? { file: r.file, by: null } : null })) }));
      marked = on;
      say(on ? `Marked ${n} official.` : `Took the official mark off ${n}.`);
      await data.marked();
    } catch (e) { say(e.message || String(e), true); }
    acting = false; draw();
  }

  // Data Management's own write for the selection, which is then let go
  const act = (what, name) => work.during((async () => {
    if (!folder || !chosen.size || running || acting) return;
    acting = true; draw();
    try { await what(selection()); chosen = new Set(); sync(); say(""); } catch (e) { say(e.message || String(e), true); }
    acting = false; draw();
  })(), name);
  hide.onclick = () => act(data.hide, "the selected images hidden");
  request.onclick = () => act(data.requestTruth, "ground truth requested for the selected images");

  return {
    busy: () => !!running,
    // how many images the last run reached that are not marked official
    unmarked: () => (marked ? 0 : reached.length),
    // a folder chosen in Data Management, with its images; an image chosen in it, which leaves the folder's selection as it is; or nothing
    chose(kind, info) {
      if (kind === "image") return;
      if (kind === "folder") {
        // another folder than the one last on show: what the run found there is not this one's
        if (shownId !== info.id) { reached = []; marked = false; found = []; say(""); }
        folder = info; shownId = info.id; chosen = new Set([...chosen].filter((id) => info.images.some((i) => i.id === id))); sync();
      } else folder = null;
      draw();
    },
    // the stage changed: what it opens of the actions
    stageChanged: () => draw(),
    leave() { running?.abort(); running = null; folder = null; chosen = new Set(); reached = []; marked = false; found = []; algorithm = null; listing = null; setUp = false; acting = false; shownId = null; asStarted(); },
  };
}
