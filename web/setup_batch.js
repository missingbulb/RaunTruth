// Batch run (req/setup/batch): Study Setup's box over the folder chosen. The owner chooses a study algorithm and the images, and each
// gets an extraction in the study's extractions folder, the file named for the algorithm and the study's code version
// (truth_folders.js runFile); an image that already has one is skipped, so a batch stopped for any reason goes on from where it was.
// The run itself is the shell's (shell.js batchRunner): the study's first step, pressed as the main app's user presses it.
"use strict";
import * as tf from "./truth_folders.js";
import { writeMarks } from "./study_root.js";
import { work } from "./pending.js";
import { asLoaded } from "./as_loaded.js";
import { holdOwns } from "./offline.js";

// $: the page's selector; runner: the shell's; remote: the store; reader, writer, place: its reads and writes and the study's place in it;
// account: the sign-in; data: Data Management (marked() draws the folder on show with the marks written); status: the page's line
export function setupBatch({ $, runner, remote, account, reader, writer, place, data, status }) {
  const box = $("#batch-box"), pick = $("#batch-algorithm"), go = $("#batch-run"), all = $("#batch-all"), official = $("#batch-official"), msg = $("#batch-msg"), items = $("#folder-items");
  // the folder on show, {id, name, images: [{id, name, sha, folder}]}; the ids of the images chosen; the batch under way (its abort);
  // the images the last batch reached, {sha, name, file}, which Mark this batch official marks
  // the box as the page loaded, put back when the study leaves
  const asStarted = asLoaded([$("#batch-box")], holdOwns);
  let folder = null, chosen = new Set(), running = null, reached = [], algorithms = null, listing = null, setUp = false;
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle("err", !!err); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  async function listed() {
    listing ||= runner.list().then((l) => {
      algorithms = l;
      pick.replaceChildren(...l.map((a) => new Option(a.title, a.key)));
    }, (e) => { listing = null; say("The study's algorithms could not be listed: " + (e.message || e), true); });
    return listing;
  }

  async function paint() {
    const mine = folder;
    if (mine && runner.able) await listed();
    if (folder !== mine) return;
    // a read the store does not answer (a token run out) leaves what was last read
    const s = await place.settings().catch(() => undefined);
    if (s !== undefined) setUp = !!s?.extractions;
    const shown = !!folder && runner.able && !!algorithms?.length && setUp;
    box.hidden = !shown;
    if (!shown) return;
    $("#batch-for").textContent = `${folder.name}: ${plural(chosen.size, "image")} chosen.`;
    go.textContent = running ? "Stop" : "Run";
    go.disabled = !running && !chosen.size;
    go.title = running ? "Stop after the image being run" : chosen.size ? "Run the chosen algorithm on each chosen image" : "Choose the images to run it on";
    pick.disabled = !!running; all.disabled = !!running || !folder.images.length;
    for (const b of items.querySelectorAll(".pick")) b.disabled = !!running;
    official.hidden = !reached.length; official.disabled = !!running;
    official.title = `Mark each of the ${plural(reached.length, "image")} this batch reached official`;
  }

  const draw = work.counting("the batch box drawn", paint);

  // the checkboxes of the folder's cells, and the ones this keeps chosen
  const sync = () => { for (const b of items.querySelectorAll(".pick")) b.checked = chosen.has(b.dataset.id); };
  items.addEventListener("change", (e) => {
    const b = e.target.closest?.(".pick");
    if (!b) return;
    if (b.checked) chosen.add(b.dataset.id); else chosen.delete(b.dataset.id);
    draw();
  });
  all.onclick = () => {
    if (chosen.size === folder.images.length) chosen.clear(); else chosen = new Set(folder.images.map((i) => i.id));
    sync(); draw();
  };

  // the token has run out, or the store said so: the batch waits for the next click, which renews it
  const ranOut = (e) => e?.status === 401 || /sign-in has run out|refused the token/i.test(e?.message || "");

  async function run() {
    const images = folder.images.filter((i) => chosen.has(i.id)), algorithm = pick.value, stop = new AbortController();
    running = stop; reached = []; say(""); draw();
    let made = 0, skipped = 0;
    try {
      await account.forRead();
      const extractions = tf.folderOf(await place.settings({ fresh: true }));
      if (!extractions) throw new Error("Set up extractions first: a batch's files are kept in the extractions folder.");
      const code = await runner.version(), version = code ? String(code).slice(0, 8) : "unknown";
      for (const [k, im] of images.entries()) {
        if (stop.signal.aborted) break;
        if (!im.sha) throw new Error(`The store does not say ${im.name}'s SHA-256, which its extraction is kept under.`);
        const image = { name: im.name, sha256: im.sha };
        const had = (await tf.files(reader, extractions, image)).find((f) => f.name === tf.runFile(algorithm, version));
        if (had) { reached.push({ sha: im.sha, name: im.name, file: had.id }); skipped++; continue; }
        if (!account.token()) throw new Error("Your sign-in has run out: click again to renew it");
        say(`Running ${k + 1} of ${images.length}: ${im.name}…`);
        status(`Batch run: ${im.name}, ${k + 1} of ${images.length}…`);
        const doc = await runner.run(remote.source(im.id, { name: im.name, folder: im.folder }), algorithm, stop.signal);
        const saved = await tf.saveRun({ reader, writer, folder: extractions, image, algorithm, version, doc });
        reached.push({ sha: im.sha, name: im.name, file: saved.id }); made++;
      }
      const done = `${plural(made, "image")} run${skipped ? `, ${plural(skipped, "image")} already had it` : ""}.`;
      say(stop.signal.aborted ? `Stopped: ${done}` : `Done: ${done}`);
      status("Batch run over.");
    } catch (e) {
      if (e?.status === 401) account.refused();
      const ran = `${plural(made, "image")} run${skipped ? `, ${plural(skipped, "image")} already had it` : ""}`;
      say(ranOut(e) ? `Your sign-in ran out: the batch is held (${ran}). Click Run to go on from here.` : `The batch stopped: ${e.message || e} (${ran}). Click Run to try again from there.`, !ranOut(e));
      status("Batch run held.");
    } finally {
      running = null;
      if (made) await data.marked();
      draw();
    }
  }
  go.onclick = () => { if (running) { running.abort(); say("Stopping after this image…"); } else if (folder && chosen.size) work.during(run(), "a batch run"); };

  official.onclick = () => work.during(markBatch(), "a batch marked official");
  async function markBatch() {
    official.disabled = true;
    try {
      await writeMarks({ reader, writer, root: place.root(), changes: reached.map((r) => ({ sha: r.sha, kind: "official", mark: { file: r.file, by: null } })) });
      say(`Marked ${plural(reached.length, "image")} official.`);
      await data.marked();
    } catch (e) { say(e.message || String(e), true); }
    draw();
  }

  return {
    busy: () => !!running,
    // a folder chosen in Data Management, with its images; or nothing
    chose(kind, info) {
      if (kind === "folder") { folder = info; chosen = new Set([...chosen].filter((id) => info.images.some((i) => i.id === id))); sync(); } else folder = null;
      draw();
    },
    leave() { running?.abort(); running = null; folder = null; chosen = new Set(); reached = []; algorithms = null; listing = null; setUp = false; asStarted(); },
  };
}
