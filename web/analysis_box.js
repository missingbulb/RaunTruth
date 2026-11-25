// The Analysis box of the left bar (req/shell/annotate/choice, req/shell/analysis/start, req/shell/extractions/list, req/shell/extractions/save,
// req/shell/ground-truth/tasks): Start and its dialog of the study's algorithms, Load and its dialog of the store's Analysis Files of the image,
// one shown read-only, the Analysis Tasks, reset analysis, the Upload dialog with the saves waiting for the network, and Download Analysis on
// the box's header. The shell owns the mode (annotating, its route, what is on view) and hands it here with the study and the image on show,
// the sign-in and the store, the study's steps and what mounts the study again.
"use strict";
import { truthTasks } from "./truth_tasks.js";
import { algorithmChoice } from "./algorithm_choice.js";
import { remote } from "./drive.js";
import { annotateChoice } from "./annotate_choice.js";
import { frozen } from "./stages.js";
import { cell as csvCell } from "./summary_download.js";

// the saves the store did not take, waiting on this device for the next click online (req/shell/annotate/survives)
export const OUTBOX = "nor-gt-outbox";

export function analysisBox(shell) {
  const { $, icon, outline, status, REPO, views, signIn, st, truth, stageAllows, data, showBoxes, log, restudyHeld, page, makesTruth, drawSteps, notice, readJSON,
    writeJSON, noteSaved, esc, maySave, readStage, step, working, saveFile } = shell;
  // the study's ground-truth tasks in the left bar (req/shell/ground-truth/tasks)
  const tasks = truthTasks({ $, icon, started: () => { const first = shell.manifest?.phases[0]?.key; return !first || !!shell.steps.find((p) => p.key === first)?.done; },
    heardBy: (on) => shell.view?.tagged?.(on) });

  const algorithms = algorithmChoice({ $, outline, status, repo: REPO });

  function showingTruth(on) {
    shell.truthShown = on;
    if (on) views.show("image");
    views.draw();
  }
  // Whether the user may read the study's root, as the studies' list last said: the list shows who made each extraction to them, and to
  // someone who is not one only the marked, by algorithm version or by hand (req/shell/extractions/outsiders). Not known counts as not.
  const isMember = () => !!shell.manifest && signIn.signedIn() && !!shell.memberIds?.includes(shell.manifest.id);
  // The extractions of the image open that the store holds (req/shell/extractions/list), mine, then the marked, then the others, each
  // {key, label, detail, group, read() -> {doc, label}}; and the user's own file among them, null for none
  async function storeAnnotations(fresh, sub) {
    const img = { name: st.fileName, sha256: st.sha };
    if (!remote.owns(st.source) || !st.sha) return { rows: [], mine: null };
    if (signIn.signedIn()) await shell.listedReady;
    const { rows, mine } = await truth.list(img, { member: isMember(), fresh, sub });
    return { mine, rows: rows.map(rowOf) };
  }
  function rowOf(r) {
    return ({ key: r.id, label: r.label, group: r.group, detail: r.modified ? new Date(r.modified).toLocaleString() : "",
      read: async () => ({ doc: await truth.read(r.id), id: r.id, label: r.mine ? "your Analysis File" : `the Analysis File ${r.label}` }) });
  }

  // Load's press: the image's subfolder listed, the study file read again for its marks
  async function listAnnotations() {
    const mine = ++shell.listing, sha = st.sha, sub = shell.listedFor?.sha === sha ? shell.listedFor.sub : null;
    shell.storeList = { busy: true }; drawAnnotate();
    let rows, own;
    try { ({ rows, mine: own } = await storeAnnotations(true, sub)); } catch (e) {
      console.warn("the Analysis Files were not listed:", e);
      if (mine === shell.listing) { shell.storeList = { failed: `The Analysis Files of this image could not be listed: ${e.message || e}` }; drawAnnotate(); }
      return;
    }
    if (mine !== shell.listing) return;
    shell.listedFor = { sha, sub, mine: own };
    shell.storeRows = new Map(rows.map((r) => [r.key, r]));
    shell.storeList = { rows }; drawAnnotate();
  }
  // the user's own Analysis File of the image open, or null: from what a listing read, else one listing of the subfolder its opening found
  function ownFile() {
    const l = shell.listedFor;
    if (l?.sha !== st.sha) return truth.mine();
    if (l.mine !== undefined || !l.sub) return Promise.resolve(l.mine ?? null);
    return truth.mineIn(l.sub).then((m) => { l.mine = m; return m; });
  }
  // why the store cannot be asked for the image's Analysis Files, "" where it can
  const listHeld = () => (!remote.owns(st.source) ? `Only an image from ${remote.label} has Analysis Files there.`
    : document.documentElement.classList.contains("offline") ? "Needs the internet: you are offline." : "");
  // Whether the store has Analysis Files of the image, asked as it opens (req/shell/extractions/list), so that Load is on only
  // where it has: one request, signed in and online. Signed out the store is asked at Load's press, as it was.
  async function wantList() {
    if (!shell.manifest || !stageAllows("annotate") || data.on || !st.img || !st.sha || shell.annotating || shell.storeList || listHeld() || !signIn.signedIn()) return;
    const mine = ++shell.listing, sha = st.sha;
    shell.storeList = { busy: true }; drawAnnotate();
    let sub;
    try { sub = await truth.holds({ name: st.fileName, sha256: sha }); } catch (e) {
      console.warn("the store was not asked for the image's Analysis Files:", e);
      if (mine === shell.listing) { shell.storeList = { failed: `The Analysis Files of this image could not be looked up: ${e.message || e}` }; drawAnnotate(); }
      return;
    }
    if (mine !== shell.listing) return;
    shell.listedFor = { sha, sub };
    shell.storeList = sub ? { sub } : { rows: [] }; drawAnnotate();
  }
  // a stored annotation drawn read-only through the study's showTruth, its final results alone
  async function viewAnnotation(key) {
    const row = shell.storeRows.get(key), mine = shell.listing;
    if (!row) return;
    let got;
    try { got = await row.read(); } catch (e) { return status(`The Analysis File could not be read: ${e.message || e}`, true); }
    if (mine !== shell.listing || shell.annotating || !st.img) return;
    const { history: _, ...plain } = got.doc;
    const counts = shell.study.showTruth ? shell.study.showTruth(plain) : "";
    shell.viewing = { label: got.label, doc: got.doc, id: got.id, counts };
    showingTruth(true); showBoxes(); drawAnnotate();
    log.add(`Loaded ${got.label}, read-only`);
  }
  // annotation mode entered: the study mounted again on the same image, in it; then() runs once the image is open
  function enterAnnotating(how, then) {
    if (!st.img || shell.annotating) return;
    shell.annotating = true; shell.route = how; shell.resume = { then };
    log.add(`Chose to analyse ${how === "scratch" ? "from the start" : how === "local" ? "from this device's work" : "from an Analysis File of the store"}`);
    restudyHeld();
  }
  // Start (req/shell/analysis/start): the study's algorithms in a dialog, where it names any and has a first step to press; Run
  // starts the analysis with the one chosen, pressing that step for the user where it is the study's one step with a button: a
  // study of several such steps is worked through its runner, which Run opens
  const runsFirst = () => !!shell.manifest?.algorithms && !!shell.manifest.phases[0]?.button;
  const oneRun = () => shell.manifest.phases.filter((p) => p.button).length === 1;
  function startAnalysis() {
    if (!st.img || shell.annotating) return;
    if (!runsFirst()) return beginAnalysis();
    $("#start-dlg").showModal();
  }
  $("#start-cancel").onclick = () => $("#start-dlg").close();
  $("#start-run").onclick = () => { $("#start-dlg").close(); beginAnalysis(); };
  function beginAnalysis() {
    const key = algorithms.api.key;
    const run = async () => {
      if (!runsFirst()) return;
      await algorithms.api.ready; algorithms.api.choose(key);
      $("#algorithm-ran").textContent = algorithms.api.title ? `Algorithm: ${algorithms.api.title}` : ""; $("#algorithm-ran").hidden = !algorithms.api.title;
      if (oneRun()) pressWhenAble($(shell.manifest.phases[0].button));
    };
    if (stageAllows("annotate")) return enterAnnotating("scratch", run);
    shell.route = "scratch"; log.add("Started an analysis");
    showBoxes(); drawAnnotate(); run();
  }
  // a button pressed for the user as soon as it can be, while the study on show stays
  function pressWhenAble(b) {
    const press = () => { if (b.disabled) return false; b.click(); return true; };
    if (press()) return;
    const watch = new MutationObserver(() => { if (press()) watch.disconnect(); });
    watch.observe(b, { attributes: true, attributeFilter: ["disabled"] });
    shell.lifetime.signal.addEventListener("abort", () => watch.disconnect());
  }
  const choice = annotateChoice({ $, remote,
    start: () => startAnalysis(),
    local: () => enterAnnotating("local", () => shell.gtSession.loadDraft()),
    load: () => { signIn.renew(); if (!shell.storeList?.rows) listAnnotations(); },
    pick: (key) => viewAnnotation(key),
    edit: () => { const v = shell.viewing; if (v) { shell.editBase = v.id; enterAnnotating("stored", () => shell.gtSession.loadDocument(v.doc, "Analysis File")); } },
    clear: () => clearAnnotations() });
  // the boxes that follow whether an image is open
  page.watch("image", () => { showBoxes(); drawAnnotate(); });
  // the choice drawn from where things stand
  function drawAnnotate() {
    document.documentElement.toggleAttribute("data-annotating", !!shell.manifest && makesTruth());
    const loads = !!shell.manifest && stageAllows("annotate");
    const shown = !!shell.manifest && (loads || runsFirst()) && !!page.get("image") && !data.on;
    const says = { local: "From the work kept on this device.", stored: `From ${remote.short}'s Analysis File${shell.viewing ? `: ${shell.viewing.label}` : ""}.` };
    choice.draw({ shown, annotating: shell.annotating, loads, say: says[shell.route] || "", draft: shown && loads && !shell.annotating ? shell.gtSession.draft() : null,
      list: shell.storeList, why: shown && loads ? listHeld() : "", asks: !signIn.signedIn(), viewing: shell.viewing && `Showing ${shell.viewing.label}, read-only${shell.viewing.counts ? `: ${shell.viewing.counts}` : "."}` });
    drawSteps();
  }
  // reset analysis: the page back to just after the image loaded, this device's draft of it let go and the store untouched
  async function clearAnnotations() {
    if (!shell.annotating || !st.img) return;
    const n = shell.gtSession.unsaved();
    if (!confirm(`Reset the analysis of ${st.fileName}? ${n ? `Your ${n} unsaved action${n === 1 ? "" : "s"} will be lost. ` : ""}This device's draft of it is discarded; ${remote.label} is not touched.`)) return;
    try { await shell.gtSession.discard(); } catch (e) { return notice(`The draft could not be cleared: ${e?.message || e}`); }
    shell.annotating = false; shell.route = null; shell.viewing = null; shell.storeList = null; shell.editBase = null;
    log.add("Reset the analysis of the image");
    restudyHeld();
  }

  // Saves that could not reach the store, kept on this device until a click finds it back: [{study, sha256, name, source, doc, base}]
  // (req/shell/annotate/survives)
  const outbox = () => { const l = readJSON(OUTBOX, []); return Array.isArray(l) ? l : []; };
  const unsentCount = () => outbox().length;
  function drawWaiting() {
    const n = unsentCount();
    $("#gt-waiting").hidden = !n;
    $("#gt-waiting").textContent = n ? `${n} image${n === 1 ? "" : "s"} waiting to upload: they go with your next click online.` : "";
  }
  function queueSave(entry) {
    writeJSON(OUTBOX, [...outbox().filter((w) => !(w.study === entry.study && w.sha256 === entry.sha256)), entry]);
    drawWaiting();
  }
  let sending = false;
  // the waiting saves of the study on show, tried in the user's click, which a token run out needs to be renewed
  async function sendWaiting() {
    if (sending || !shell.manifest || !unsentCount() || document.documentElement.classList.contains("offline") || !signIn.signedIn()) return;
    sending = true;
    try {
      for (const w of outbox().filter((x) => x.study === shell.manifest.id)) {
        try { await truth.save(w.doc, { name: w.name, sha256: w.sha256, source: w.source }, w.base); } catch (e) { console.warn("a waiting save did not go:", e); break; }
        noteSaved(w.sha256);
        writeJSON(OUTBOX, outbox().filter((x) => !(x.study === w.study && x.sha256 === w.sha256)));
        drawWaiting();
        shell.listedFor = null;
        log.add(`Uploaded the waiting analysis of ${w.name}`);
      }
    } finally { sending = false; }
  }
  document.addEventListener("click", () => { sendWaiting(); });

  // The Upload dialog (req/shell/extractions/save): a checklist of what is still open, and Upload, which writes the person's
  // Analysis File of the image to the study's extractions folder, replacing their own. gt: {doc, count, items: [{level, ok, text}],
  // empty}, count how many of its marks the document holds, nothing to send at 0.
  function submitTruth(gt) {
    if (!makesTruth()) return;
    const n = gt.count, send = $("#gt-send"), why = () => truth.blocked();
    $("#gt-problems").replaceChildren(...gt.items.map((t) => {
      const li = document.createElement("li"); li.className = t.ok ? "ok" : t.level;
      li.innerHTML = icon(t.ok ? "done" : t.level === "error" ? "todo" : "part") + `<span>${esc(t.text)}</span>`;
      return li;
    }));
    $("#gt-msg").textContent = n ? why() : gt.empty;
    send.hidden = !maySave();
    send.disabled = !n || !!why() || !maySave(); send.title = why();
    const done = (is) => { $("#gt-close").textContent = is ? "Close" : "Cancel"; $("#gt-close").classList.toggle("primary", is); send.classList.toggle("primary", !is); };
    done(false);
    // a study with GT actions saves the model's document with its history
    const docOf = () => (shell.gtSession.on() ? shell.gtSession.fileDoc() : gt.doc);
    send.onclick = async () => {
      send.disabled = true; $("#gt-msg").textContent = "Uploading…";
      const doc = await docOf(), image = { name: st.fileName, sha256: st.sha, source: st.source };
      try {
        await truth.save(doc, image, shell.editBase);
        noteSaved(image.sha256); shell.listedFor = null;
        if (shell.gtSession.on()) { shell.gtSession.submitted(); await shell.gtSession.save({ ask: false }); }
        // a session begun before the owner froze the study saves still, and the Analysis File is said not to count (req/setup/promote)
        const late = frozen(await readStage({ fresh: true }));
        $("#gt-msg").textContent = `Uploaded to the study's Analysis Files, as your analysis of ${st.fileName}${late ? ", after the freeze, not counted" : ""}.`;
        step("submit", true);
        log.add(late ? "Uploaded the analysis, after the freeze: not counted" : "Uploaded the analysis");
        done(true);
      } catch (e) {
        // the store refusing is final; a sign-in run out, or no network, is not: the save waits on this device for the next click
        if (!e.status) {
          queueSave({ study: shell.manifest.id, ...image, doc, base: shell.editBase });
          if (shell.gtSession.on()) { shell.gtSession.submitted(); await shell.gtSession.save({ ask: false }); }
          $("#gt-msg").textContent = `${remote.label} could not be reached, so the analysis of ${st.fileName} waits on this device and goes with your next click online.`;
          step("submit", true);
          log.add("The analysis waits to be uploaded");
          return done(true);
        }
        $("#gt-msg").textContent = `It was not uploaded: ${e.message || e}. Download Analysis, on the Analysis box, keeps a copy.`;
        send.disabled = false;
      }
    };
    $("#gt-dlg").showModal();
  }
  // Download Analysis, on the Analysis box's header: the model's document with its history, as a file; where nothing can be
  // uploaded, by this user or of this image, that is the last step
  const imageStem = () => st.fileName.replace(/\.[^.]*$/, "");

  const downloadsNow = () => [
    ...(shell.gtSession.on() && !!shell.gtSession.api.model() && st.img ? [{ key: "analysis", label: "Analysis (JSON)", save: () => working($("#analysis-dl"), saveAnalysis) }] : []),
    ...(st.img ? shell.studyTables : []).map((t) => ({ key: t.key, label: t.label, save() {
      saveFile(imageStem() + t.suffix, [t.head(), ...t.rows()].map((r) => r.map(csvCell).join(",")).join("\n"), "text/csv");
      log.add(`Downloaded ${t.label}`);
    } }))];
  const dlMenu = $("#analysis-dl-menu");
  function shutDownloads() { dlMenu.hidden = true; dlMenu.replaceChildren(); $("#analysis-dl").setAttribute("aria-expanded", "false"); }
  function drawDownloads() {
    $("#analysis-dl").hidden = !downloadsNow().length;
    if ($("#analysis-dl").hidden) shutDownloads();
  }
  $("#analysis-dl").onclick = () => {
    const all = downloadsNow();
    if (all.length < 2 || !dlMenu.hidden) { shutDownloads(); if (all.length === 1) all[0].save(); return; }
    dlMenu.replaceChildren(...all.map((d) => {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "item", textContent: d.label });
      b.setAttribute("role", "menuitem"); b.dataset.key = d.key;
      b.onclick = () => { shutDownloads(); d.save(); };
      return b;
    }));
    dlMenu.hidden = false; $("#analysis-dl").setAttribute("aria-expanded", "true");
    dlMenu.firstElementChild.focus();
  };
  document.addEventListener("pointerdown", (e) => { if (!dlMenu.hidden && !e.target.closest("#analysis-dl-menu, #analysis-dl")) shutDownloads(); });
  dlMenu.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); shutDownloads(); $("#analysis-dl").focus(); } });
  async function saveAnalysis() {
    if (!shell.gtSession.on() || !st.img) return;
    saveFile(imageStem() + "_analysis.json", JSON.stringify(await shell.gtSession.fileDoc(), null, 1), "application/json");
    log.add("Downloaded the analysis");
    if (makesTruth() && (!maySave() || truth.blocked())) step("submit", true);
  }
  $("#gt-close").onclick = () => $("#gt-dlg").close();

  return { drawAnnotate, wantList, tasks, drawWaiting, algorithms, runsFirst, drawDownloads, ownFile, submitTruth };
}
