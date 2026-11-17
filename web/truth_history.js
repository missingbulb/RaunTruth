// The tagger's session of GT actions on the image open (req/shell/ground-truth/history): the log and its model live in
// the page while the tagger works, the GT box's Undo, Redo and Save Draft controls drive it, and a draft on this device
// is offered back by Load draft. The study reaches it as shell.gt. The log itself, and what replays it, are
// truth_actions.js; the drafts' storage is truth_drafts.js; the Edit History window is edit_history.js.
"use strict";
import { actionLog, check, pack, bare, HISTORY_FORMAT } from "./truth_actions.js";
import { editHistory } from "./edit_history.js";

const pad = (n) => String(n).padStart(2, "0");
const clock = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const isUser = (a) => a.type !== "open" && a.type !== "run" && a.type !== "base";
const nameOfCount = (n) => `${n} action${n === 1 ? "" : "s"}`;
const sig = (a) => `${a.type}@${a.at}`;

// image(): {name, sha256, width, height} of the image open, null while none; studyId(): the study on show;
// makesTruth(): whether the tagger tags now; dragging(): whether a drag is under way; keys: the viewer's actions
// (add(spec)); drafts: truth_drafts.js's store; status and notice: the page's say; confirmBox: its question to the user;
// viewer(): the viewer, which rings an item; remoteLabel(): the remote store's name; readJSON and writeJSON: the shell's storage
export function truthHistory({ $, drafts, keys, dragging, status, notice, confirmBox = (t) => confirm(t), image, studyId, makesTruth, viewer, remoteLabel, readJSON, writeJSON }) {
  let module = null, log = null, replayState = "verified";
  // what the device's draft of the image open held when last seen, the saved time of the one this visit loaded or saved,
  // and the actions in force then
  let stored = null, lastSaved = null, savedSigs = [], opening = 0;
  // an old store the study hands over (api.legacy): {model, count, from, forget}, and whether the log holds it as its base now
  let old = null, oldTaken = false;
  const listeners = new Set();
  const rooted = () => !!log && active().some((a) => a.type === "run" || a.type === "base");

  const notify = (model, why) => { for (const l of [...listeners]) l.fn(model, why); };
  const active = () => (log ? log.actions : []);
  const userCount = (list) => list.filter(isUser).length;
  // the actions in force that differ from those last saved or loaded: those saved and no longer in force, and those in force
  // and not saved, only the tagger's own counted
  const unsaved = () => {
    const now = active();
    let k = 0;
    while (k < now.length && k < savedSigs.length && sig(now[k]) === savedSigs[k]) k++;
    const tail = savedSigs.slice(k), fresh = now.slice(k);
    const runs = (list) => list.filter((x) => /^(run|base)@/.test(typeof x === "string" ? x : sig(x))).length;
    // once something was saved, a run or base after it is a change to it, and a run is counted once however many it replaced
    const kept = savedSigs.some((x) => /^(run|base)@/.test(x)) ? Math.max(runs(fresh), runs(tail)) : 0;
    return userCount(fresh) + tail.filter((x) => !/^(open|run|base)@/.test(x)).length + kept + (oldTaken ? old.count : 0);
  };
  const markSaved = (when) => { lastSaved = when; savedSigs = active().map(sig); };
  const describe = (a) => (module?.describe ? module.describe(a, 1, log.model) : a.type);

  function paint() {
    const on = rooted();
    $("#gt-edits").hidden = !on;
    const undo = $("#gt-undo"), redo = $("#gt-redo"), n = on ? unsaved() : 0;
    undo.disabled = !on || !log.canUndo; redo.disabled = !on || !log.canRedo;
    undo.title = !undo.disabled ? `Undo: ${describe(active().at(-1))}` : "Nothing to undo";
    redo.title = !redo.disabled ? `Redo: ${describe(log.undone[0])}` : "Nothing to redo";
    $("#gt-unsaved").hidden = !n; $("#gt-unsaved").textContent = n ? `· ${n} unsaved` : "";
    $("#gt-save-draft").disabled = !on || !n;
    const offer = $("#gt-load-draft"), offered = !!stored && stored.saved !== lastSaved, earlier = on && !!old && !oldTaken;
    $("#gt-offers").hidden = !offered && !earlier;
    offer.hidden = !offered;
    if (offered) offer.textContent = `Load draft · saved ${clock(stored.saved)}, ${nameOfCount(userCount(stored.log))}`;
    $("#gt-load-legacy").hidden = !earlier;
    if (earlier) $("#gt-load-legacy").title = `${old.said ? `${nameOfCount(old.said)}, ` : ""}${old.from}`;
    editWindow?.paint();
  }

  const editWindow = editHistory({ $, log: () => log, study: () => module, viewer, shown: () => rooted() && makesTruth(),
    goto: (n) => session.api.goto(n), clearAll: () => clearAll(), readJSON, writeJSON });

  const mutated = (why) => { paint(); notify(log.model, why); };

  async function save({ ask = true } = {}) {
    const img = image();
    if (!module || !log || !img?.sha256 || log.model === null) return false;
    const fail = (e) => { notice(`The draft could not be saved: ${e?.message || e}`); return false; };
    let existing;
    try { existing = await drafts.get(studyId(), img.sha256); } catch (e) { return fail(e); }
    if (ask && existing && existing.saved !== lastSaved
      && !confirmBox(`Replace the draft saved at ${clock(existing.saved)}, with ${nameOfCount(userCount(existing.log))}?`)) return false;
    const record = { study: studyId(), sha256: img.sha256, name: img.name, saved: new Date().toISOString(),
      log: await pack(active()), model: module.document(log.model), replay: replayState };
    try { await drafts.put(record); } catch (e) { return fail(e); }
    stored = record; markSaved(record.saved);
    keepOld();
    paint();
    status(`Draft saved: ${nameOfCount(userCount(record.log))}.`);
    return true;
  }

  // the old store is let go once a draft holds its base
  function keepOld() {
    if (!old || !oldTaken) return;
    const { forget } = old;
    old = null; oldTaken = false;
    try { forget?.(); } catch (e) { console.warn("shell.gt.legacy: the old store was not forgotten:", e); }
  }

  async function load(record) {
    if (!module || !log) return false;
    if (unsaved() > 0 && !confirmBox(`Loading the draft replaces your ${unsaved()} unsaved action${unsaved() === 1 ? "" : "s"}. Load it?`)) return false;
    const { replay, actions, error } = await check(module, record.log, record.model);
    log.load(actions);
    replayState = replay; markSaved(record.saved); oldTaken = false;
    status(replay === "verified" ? `Draft loaded: replay verified, ${nameOfCount(userCount(actions))}.`
      : replay === "none" ? "Draft loaded as a base: it held no history."
        : `Draft loaded as a base: its history did not replay to what was saved${error ? ` (${error})` : ""}.`, replay === "mismatch");
    mutated("load");
    return true;
  }

  async function clearAll() {
    const img = image();
    if (!log || !img) return;
    if (!confirmBox(`Clear all history on ${img.name}? This forgets your draft of this image on this device and goes back to the algorithm's output; anything you submitted stays in ${remoteLabel()}.`)) return;
    try { if (img.sha256) await drafts.delete(studyId(), img.sha256); } catch (e) { notice(`The draft could not be cleared: ${e?.message || e}`); return; }
    log.clear();
    stored = null; replayState = "verified"; markSaved(null);
    status("History cleared: back to the algorithm's output.");
    mutated("clear");
  }

  const session = {
    // the controls and the window drawn again, as the role or the image changed what shows
    paint,
    mount(m) {
      module = m; log = m ? actionLog(m) : null; replayState = "verified";
      stored = null; lastSaved = null; savedSigs = []; old = null; oldTaken = false;
      paint();
    },
    leave() { module = null; log = null; stored = null; lastSaved = null; savedSigs = []; old = null; oldTaken = false; listeners.clear(); paint(); },
    // the image is open: the log starts with it, and a draft of it on this device is looked up; true when one is to offer
    async opened() {
      const mine = ++opening, img = image();
      if (!module || !img) { stored = null; paint(); return false; }
      log.open({ name: img.name, sha256: img.sha256, width: img.width, height: img.height }, studyId());
      replayState = "verified"; stored = null; markSaved(null); old = null; oldTaken = false;
      paint(); notify(null, "open");
      if (!img.sha256) return false;
      try { stored = await drafts.get(studyId(), img.sha256); } catch (e) { console.warn("the draft was not looked up:", e); status(`The draft of this image on this device could not be read: ${e?.message || e}`, true); }
      if (mine !== opening) return false;
      paint();
      return !!stored;
    },
    // whether the image open may be left: actions not yet saved are asked about first
    leaving(what) {
      const n = makesTruth() ? unsaved() : 0;
      return !n || confirmBox(`Your ${n} unsaved action${n === 1 ? "" : "s"} on ${image()?.name || "this image"} will be lost${what ? ` if you ${what}` : ""}. Go on?`);
    },
    undo() { if (log?.undo()) mutated("undo"); },
    redo() { if (log?.redo()) mutated("redo"); },
    save, load,
    unsaved,
    // whether the study keeps its ground truth as GT actions
    on: () => !!log,
    // the file the tagger submits or exports: the study's document of the model, and the log that made it
    async fileDoc() {
      const doc = module.document(log.model), { replay } = await check(module, active(), doc);
      return { ...doc, history: { format: HISTORY_FORMAT, replay, actions: await pack(active()) } };
    },
    api: {
      act(action) {
        if (!log) { console.warn("shell.gt.act: this study keeps no GT actions"); return null; }
        let r;
        try { r = log.act(action); } catch (e) { console.warn("shell.gt.act:", e.message); return null; }
        if (r.skip) { console.warn("a GT action was not recorded:", r.skip); return null; }
        mutated("act");
        return r.model;
      },
      ran(run) {
        if (!log) return;
        log.ran(run); mutated("run");
        const left = log.model?.dropped?.length ?? 0;
        if (left) status(`This run has no item for ${left} earlier decision${left === 1 ? "" : "s"} or edit${left === 1 ? "" : "s"}, which ${left === 1 ? "was" : "were"} left out.`, true);
      },
      model: () => log?.model ?? null,
      document: () => (log?.model ? module.document(log.model) : null),
      count: () => log?.count ?? 0,
      // fn(model, why) after each change, why one of open, run, act, undo, redo, goto, load, clear; until signal ends it
      on(fn, signal) {
        const l = { fn };
        listeners.add(l);
        signal?.addEventListener("abort", () => listeners.delete(l));
      },
      // a document from before the log, taken as the log's base
      base(doc, from) {
        if (!log) return;
        log.load([...active(), { type: "base", at: new Date().toISOString(), model: bare(doc), from: from ?? {} }]);
        mutated("load");
      },
      // what the study kept of the tagger's edits before it kept GT actions, offered as Load earlier edits: {model: the study's
      // document, count: how many edits it holds, from: what to call it, forget(): removes the old store, which the shell calls
      // once a draft holds it}, or {actions, from, forget} where the store is the GT actions it implies; null withdraws the offer
      legacy(offer) {
        if (!log) return;
        const from = String(offer?.from ?? "an earlier store");
        old = offer?.actions?.length ? { actions: offer.actions, said: offer.actions.length, count: 0, from, forget: offer.forget }
          : offer?.model ? { model: offer.model, said: offer.count ?? 1, count: offer.count ?? 1, from, forget: offer.forget } : null;
        oldTaken = false;
        paint();
      },
      goto(n) { if (log) { log.goto(n); mutated("goto"); } },
      clear() { if (log) { log.clear(); mutated("clear"); } },
    },
  };

  // the old store's GT actions recorded on the model as it stands, each the tagger's own from now; one that does not fit is left out
  const takeActions = () => {
    let n = 0;
    for (const a of old.actions) {
      try { if (!log.act({ ...a, at: undefined }).skip) n++; } catch (e) { console.warn("shell.gt.legacy:", e.message); }
    }
    if (!n) { status(`None of the earlier edits fits what is here now: ${old.from}.`, true); return; }
    oldTaken = true;
    status(`Earlier edits loaded, ${nameOfCount(n)}: ${old.from}.`);
    mutated("act");
  };
  // the old store taken as the log's base, after asking when actions are not saved
  const takeOld = () => {
    if (!log || !old || oldTaken) return;
    if (old.actions) return takeActions();
    if (unsaved() > 0 && !confirmBox(`Loading the earlier edits replaces your ${unsaved()} unsaved action${unsaved() === 1 ? "" : "s"}. Load them?`)) return;
    log.load([...active(), { type: "base", at: new Date().toISOString(), model: bare(old.model), from: { note: old.from } }]);
    oldTaken = true; replayState = "verified"; markSaved(null);
    status(`Earlier edits loaded as a base: ${old.from}.`);
    mutated("load");
  };
  $("#gt-load-legacy").onclick = takeOld;
  $("#gt-undo").onclick = () => session.undo();
  $("#gt-redo").onclick = () => session.redo();
  $("#gt-save-draft").onclick = () => save();
  $("#gt-load-draft").onclick = () => { if (stored) load(stored); };
  const spec = (id, label, codes, control, hint) => ({ id, label, keys: codes, kind: "press", legend: false, control, hint, active: () => !dragging() });
  keys.add(spec("gt-undo", "Undo", ["Ctrl+KeyZ", "Meta+KeyZ"], "#gt-undo"));
  // Ctrl+Y is the one its button says, the shortest of the three
  keys.add(spec("gt-redo", "Redo", ["Ctrl+Shift+KeyZ", "Meta+Shift+KeyZ", "Ctrl+KeyY"], "#gt-redo", "Ctrl+Y"));
  addEventListener("beforeunload", (e) => { if (makesTruth() && unsaved() > 0) { e.preventDefault(); e.returnValue = ""; } });
  return session;
}
