// The page's shell: it runs the study the address names (/<id>, the default at the bare address), and knows
// none of them; the header's switcher offers the ones the build lists and swaps one in without a reload. What it gives a study, as shell in mount(shell): loading images (from the
// computer or the remote store), Python (the study's own, run in worker.js), the viewer the study asks for,
// the page's state its controls are drawn from (page: get, set, watch(key, fn, {signal})), the status line and the busy screen, the steps whose button shines (step(key, done) for the study's own), the algorithm chosen among the study's own (algorithm: ready, key, title, on(fn)), the switch to its item view (views), the ground-truth tasks listed in the left bar (tasks), the keys of the actions its study.json declares (actions: handle, report) and the boxes' titles (boxDone(box, summary) once a box's task is done), a Markdown outline as HTML (outline(text)), every drag the study makes (drag, so Escape cancels it: req/shell/drag/escape), notices, the user's saved settings, downloads and ground-truth
// submission; and around them the theme, the left bar, foldable boxes, the resources dialog (storage, memory,
// network and CPU) and the version history. The page is the shell of two addresses: the study's own, and Study Setup
// (setup.html, which loads setup.js, which attaches Data Management, data_mode.js, to the shell); the shell lends setup.js
// what that needs in `lent`, and calls what it attached back.
//
// The study's hooks, all optional, returned from mount: ready(info) once its Python is loaded;
// opening(name, source) when an image starts to load; opened(meta) once it is shown; result(action,
// meta, bytes, echo) for each call; error() when Python failed; settled() a promise for the study's own
// work still running, holds(message) while a result is not the last of its kind, and idle() once a held
// button is free again; painter, a preview
// painter for an image's bytes as they arrive; showImage() when the shell brings the image back into
// view; stored(key), what one of the study's browser keys holds, for the Storage tab:
// {group: "settings", what} or {group: "images", image, what}, null for a key not its own; memory(), the
// study's own large holdings for the Memory tab, [{name, what, size}]; and the viewer's hooks (viewer2d.js).
// A listener a study adds outside its own panels takes shell.signal, which ends it when the study leaves.
"use strict";
import { drag, dragging } from "./drag.js";
import { viewer as viewer2d, MINIMAP, closesOnLeave } from "./viewer2d.js";
import { every, within, after } from "./pacing.js";
import { work } from "./pending.js";
import { viewer3d } from "./viewer3d.js";
import { pageState } from "./page_state.js";
import { account, SIGNED_IN, SIGNED_IN_LABEL } from "./account.js";
import { remote } from "./drive.js";
import { networkCalls } from "./network_calls.js";
import { members, offers, released } from "./members.js";
import { STAGES, LIGHT, WHAT, NEXT, stageAllows as allows, stageOf, gates, lines as stageLines } from "./stages.js";
import { settingsDialog } from "./settings_dialog.js";
import { offline, APP_ASKED, markOffline, CONNECTION, holdOwns } from "./offline.js";
import { welcome, WELCOME } from "./welcome.js";
import { guide } from "./guide.js";
import { actionLog, ACTIONS } from "./action_log.js";
import { identify, verdict } from "./browsers.js";
import { problemUrl, ACTIONS_QUOTED, ERRORS_QUOTED } from "./problem_report.js";
import { dialogMotion } from "./dialog_motion.js";
import { foldMotion } from "./fold_motion.js";
import { focusReturn } from "./focus_return.js";
import { truthTagger, LOCAL_GT } from "./truth_tagger.js";
import { truthHistory } from "./truth_history.js";
import { truthDrafts } from "./truth_drafts.js";
import { isHidden } from "./tags.js";
import { subfolderName, marksOf } from "./truth_folders.js";
import { studyPlace } from "./study_root.js";
import { openImage, inOrder } from "./image_open.js";
import { CORE, PYODIDE, NOT_HERE, packagesOf } from "./python_files.js";
import { asLoaded } from "./as_loaded.js";
import { actions } from "./actions.js";
import { summaryBox } from "./summary_box.js";
import { imageKeeping, IMAGES, IMAGE_NAME, IMAGE_STUDY, HOLDS, THUMBS_CACHE, FOLDER_PREVIEWS, IMAGE_AT } from "./image_keeping.js";
import { imageDialog, REMOTE_LINK, REMOTE_LINKS, THUMBS, STUDY_INDEX, LISTINGS, THROTTLE } from "./image_dialog.js";
import { loadBox, RECENT, LOCAL_RECENT } from "./load_box.js";
import { analysisBox, OUTBOX } from "./analysis_box.js";
import { statusResources } from "./status_resources.js";

const $ = (s) => document.querySelector(s);
// whether this is Study Setup's page (req/setup/page), which shows the study as the one whose root its owner may write, online only
const SETUP = document.documentElement.dataset.page === "setup";
// the status line with nothing under way: Study Setup has no Load to ask for
const READY = SETUP ? "Ready." : "Ready. Load an image.";
// what Study Setup's own script (setup.js) attached: the study's folders and what is set on them; the study's own page has none
const attached = [];
const data = {
  signedIn: () => attached.forEach((d) => d.signedIn?.()), open: (on) => attached.forEach((d) => d.open?.(on)),
  opened: () => attached.forEach((d) => d.opened?.()), mount: (m) => attached.forEach((d) => d.mount?.(m)),
  stageChanged: () => attached.forEach((d) => d.stageChanged?.()),
  get on() { return attached.some((d) => d.on); },
};
export const attach = (d) => { attached.push(d); };
// what the user does here, kept on this device for a problem report (req/shell/report/action-log)
const log = actionLog();
log.watch();
// image3d is the 2D viewer of a stack's flattened planes with a 3D view beside it, sharing the one 2D viewer
const VIEWERS = { image2d: viewer2d, image3d: (shell) => viewer3d(shell, viewers.image2d ||= viewer2d(shell)) };
const DEFAULT_STUDY = "viewer";
// the browser keys the shell saves under; their names predate studies, and a user's saved state lives in them
const THEME = "nor-theme"; // "dark" | "light"; absent = follow the system
const BARS = "nor-bars-v1"; // {left}: the left bar's width in pixels (a right bar's, or whether it was collapsed, from before they went, is ignored)
// "on" | "off": whether an image downloaded from the remote store is kept on this device
const AUTO_SAVE = "nor-drive-autosave";
// Auto-save images (req/shell/drive/kept-images): an image downloaded from the remote store is kept on this device
const autoSave = () => readJSON(AUTO_SAVE, "on") !== "off";
// a tagger's ground-truth draft of an image, by study, image name and SHA-256 (req/shell/ground-truth/draft)
const GT_DRAFT = "gt-draft|";
// the images this device saved an extraction of, {study: [SHA-256]}, for the Load dialog to say which are yours (req/shell/extractions/marks-shown)
const GT_SAVED = "nor-gt-saved";
const TIPS = "nor-tips-closed"; // [tip id]: the tips the user closed, never shown again
const MOTION = "nor-motion"; // false: the user turned the page's animations off
const UNLOAD_PYTHON = "nor-unload-python"; // true: Python is shut down as each of a study's runs ends
const RESOURCES = "nor-resources"; // the status bar's disk, memory, network and CPU: "auto" | "open"; anything else = "auto"
const SEEN_VERSION = "nor-seen-version"; // the site version the user last saw, to tell them what changed since
const MEMORY_TIP = "nor-memory-tip-off"; // true: the user asked never to see the low-memory popup again
// the page's memory with a study's Python loaded (studies/nor/lab/browser/MEMORY.md), and the device
// memory below which it asks the user to free some: browsers say only how much a computer has in all, never
// how much is free
const PAGE_GB = 1, LOW_GB = 4;
// what Chrome holds for the tab beyond what a page can read: the compiled code of Python and its packages, and the
// browser's own share; measured once as Chrome's private memory for the tab against the readable total (2026-10-07)
const UNREAD_MB = 190;
// the repo the site's issues are opened on: a problem report, a new study's request
const REPO = "missingbulb/RaunTruth";
// the issue form a proposal for a new study is written on
const STUDY_REQUEST = "new-study.yml";
// the calls to other servers in flight, shown in the status bar (req/shell/status-bar/calls)
const calls = networkCalls({ bar: $("#sb-calls"), servers: {
  store: { name: remote.label, logo: `<svg viewBox="0 0 24 21"><use href="#${remote.logo.id}"/></svg>` },
  python: { name: "jsDelivr", logo: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 1.5 14 4.7v6.6L8 14.5 2 11.3V4.7Z"/><path d="M2 4.7 8 8l6-3.3M8 8v6.5"/></svg>' },
  site: { name: "rauntruth.com", logo: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c2.3 2.2 2.3 10.2 0 12.4M8 1.8c-2.3 2.2-2.3 10.2 0 12.4"/></svg>' },
}, say: (text, err) => status(text, err) });
// signing in (req/shell/account/sign-in): these settings follow the user to every device, in their own account's storage; the rest stay with this one
const FOLLOWS = [THEME, TIPS, SEEN_VERSION, MEMORY_TIP, REMOTE_LINK, REMOTE_LINKS, THUMBS, RECENT, MOTION, RESOURCES];
const signIn = account({
  keys: FOLLOWS,
  watched: (sending) => calls.begin("store", "your settings", { sending }),
  owed: (what) => work.begin(what),
  guide: guide($("#guide-dlg")),
  menu: $("#user-menu"),
  applied: () => reapply(),
  // after the page's own start, which this may run during
  changed: () => queueMicrotask(async () => {
    data.signedIn(); if (manifest) { storeRoles = await readRoles(); setStage(await readStage()); }
    showAccess(); readMembers().then(drawStudies); remoteHint();
  }),
});
// signed in, the remote store is read as the user (req/shell/drive/credentials)
remote.use(signIn);
remote.watched((sending) => calls.begin("store", "", { sending }));
// Python and its packages coming in, from when its thread starts until it says it is ready or fails
let pythonComing = null;
function pythonLoads(on, failed) {
  $("#spin").classList.toggle("on", on);
  if (on) pythonComing ||= calls.begin("python", "Python and its packages");
  else if (pythonComing) { pythonComing(failed ? new Error("Python did not load") : undefined); pythonComing = null; }
}
const remoteHint = () => { $("#remote-hint").textContent = remote.words.hint(signIn.signedIn()); };
// the remote store's name, words and logo, where the page shows them
$("#logos").insertAdjacentHTML("afterbegin", remote.logo.symbol);
$("#load-remote").title = $("#load-remote").ariaLabel = `Open from ${remote.label}`;
$("#load-original").title = `Open the image itself, not its preview: from this device when it is kept here, else from ${remote.label}`;
$("#remote-title").textContent = "Open Image";
$("#remote-link").placeholder = remote.words.placeholder;
$("#remote-throttle-say").textContent = remote.words.throttled;

// the study on show's root in the remote store: its settings, the folders Load browses, the roles the store gives
const place = studyPlace(remote, () => manifest);
// what the store lets the signed-in user write in the study on show (req/shell/data/roles), read as the study comes in
let storeRoles = { manager: false, tagger: false };
// While the sign-in's token has run out, or the store does not answer, they are the ones it last gave this user here,
// marked as such: stale until the next renewal reads them again, failed when it was asked and did not say
async function readRoles() {
  if (setupOffline()) return { manager: false, tagger: false };
  const name = "roles:" + manifest.id, last = () => signIn.learned(name) || { manager: false, tagger: false };
  if (signIn.signedIn() && !signIn.token()) return { ...last(), stale: true };
  try {
    const got = await place.roles();
    signIn.learn(name, got);
    return got;
  } catch (e) {
    console.warn("roles not read:", e);
    return { ...last(), failed: true };
  }
}
const truth = truthTagger({ account: signIn, remote, place,
  image: () => (st.img ? { name: st.fileName, sha256: st.sha, source: st.source } : null), on: () => !!manifest && makesTruth(), may: () => maySave() });

function readJSON(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function writeJSON(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: lasts for this page only */ }
  signIn.changed(key);
}
const sizeText = (n) => (!n ? "0 KB" : n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : n < 2 ** 30 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 2 ** 30).toFixed(1)} GB`);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// the page's state: the shell's fields below, and whatever the study keeps beside them
const st = { worker: null, H: 0, W: 0, um: null, umY: null, img: null, plain: null, zoom: 2, fileName: "", sha: "", source: null, heap: 0, files: 0,
  ready: false, readyInfo: null, held: null, kept: null, busySince: 0, peeked: false, peek: null };
// What the shell's controls are drawn from (page_state.js): image, the image open ({name, source, W, H, um, umY,
// info, planes, channels, Z, spacing}: Z slices, spacing µm between them or null) or null; opening, the one being read ({name}) or null; and the viewer's own fields.
const page = pageState({ image: null, opening: null });
// what a study leaving leaves of the state: the shell's own fields, each as the page loaded, but for Python's thread and
// what it measures, which stay
const SHELL_STATE = new Set(Object.keys(st)), ST_LOADED = { ...st }, PYTHON_STATE = ["worker", "heap", "files", "busySince"];
// what a study leaving puts back as the page loaded: the parts of the page an image or a study changes, the holds
// offline puts on a control kept
const asStarted = asLoaded(["#busy", "#notice", "#load", "#switch"].map((s) => $(s)), holdOwns);
// and what is out of view read again, which putting a class back forgets
function restoreLoaded() {
  const out = [...document.querySelectorAll(".offscreen")];
  asStarted();
  for (const el of out) { inView.unobserve(el); inView.observe(el); }
}
const { moveThumbs, saveThumb, keptIds, savedImage, picture, saveImage, idOf, thumbUrl, keptPreviews, folderPreviews, know, turning, imageUrl } = imageKeeping({ st, diskBar, readJSON, writeJSON, throttle: () => throttle(), get view() { return view; }, get throttled() { return throttled; }, get manifest() { return manifest; } });
let study = {}, view = null, manifest = null, base = "";
// the study's Python as one hash, as the worker said when the study came up; null where it could not tell
let studyCode = null;

// ---------- status ----------
// said: the last thing the page said, {text, err}; loading: what the remote files dialog's thumbnails say while they
// load, in its place unless that was an error (req/shell/drive/dialog)
let said = null, loading = "";
const say = () => {
  const s = $("#status"); said ||= { text: s.textContent, err: false };
  s.textContent = loading && !said.err ? loading : said.text; s.classList.toggle("err", said.err);
};
function status(text, err) {
  said = { text, err: !!err }; say();
  if (err) log.add(text, "error");
  if (st.busySince) $("#busy-text").textContent = text;
  if (err) busy(false);
}
// the spinner and elapsed time shown while Python loads or works. look "scan": work over an image shows a
// photocopier's light sweeping across it instead of the spinner; "peek": the image painting as it arrives
// stays in view, the text in a pill below it
function busy(on, text, look) {
  st.busySince = on ? st.busySince || Date.now() : 0;
  $("#spin").classList.toggle("on", on); $("#busy").hidden = !on;
  $("#busy").classList.toggle("scan", on && look === "scan"); $("#busy").classList.toggle("peek", on && look === "peek");
  if (!on) return;
  $("#busy-text").textContent = text || $("#status").textContent;
}
// a study's own work: over an image the light sweeps it, whatever the study is doing (req/shell/waiting/visible)
const studyBusy = (on, text) => busy(on, text, st.img ? "scan" : null);
// the memory the tab holds: Python's (the bulk, and it never shrinks), its files and, in Chrome and Edge, the
// page's own scripts, plus an estimate of what a page cannot read
function statusBar() {
  const { js, total } = memoryNow(), gb = navigator.deviceMemory, el = $("#sb-memory");
  showNumber(el, total == null ? "" : `${mbOf(total)} MB`);
  el.classList.toggle("warn", !!gb && total > gb * 2 ** 30 / 4);
  el.title = total == null ? "" : `Python ${mbOf(st.heap)} MB, its files ${mbOf(st.files)} MB` + (js ? `, the page ${mbOf(js)} MB` : "") +
    `, and an estimated ${UNREAD_MB} MB for Python's compiled code and the browser. Click for more.`;
  if (tabOn("memory")) ramList();
}
function memoryNow() {
  const js = performance.memory?.usedJSHeapSize;
  return { js, total: st.heap == null ? null : st.heap + st.files + (js || 0) + UNREAD_MB * 2 ** 20 };
}
const mbOf = (n) => Math.round(n / 2 ** 20);

// the Memory tab: what holds the tab's memory, the image and the study's results within the page's share
function ramList() {
  const { js, total } = memoryNow(), gb = navigator.deviceMemory;
  const image = Object.values(st.img || {}).reduce((a, c) => a + (c?.byteLength || 0), 0);
  const within = [...(st.img ? [["The image", `${st.W} × ${st.H} px, each colour layer`, image, true]] : []),
    ...(study.memory?.() || []).map((r) => [r.name, r.what, r.size, true])];
  const rows = [
    ["Python", "Its memory as far as it has grown", st.heap],
    ["Python's files", "Python's library, its packages and the study's code", st.files],
    ["The page", js == null ? "Only Chrome and Edge say it" : "Its scripts and what they hold" + (within.length ? ", the indented rows among it" : ""), js],
    ...within,
    ["Compiled code and the browser", "An estimate: a page cannot read it", UNREAD_MB * 2 ** 20],
  ];
  $("#ram-total").textContent = total == null ? "Python is still loading." : `This tab holds about ${mbOf(total)} MB` + (gb ? ` of this computer's ${gb} GB.` : ".");
  $("#ram-list").replaceChildren(...rows.map(([name, what, size, within]) => entry(name, what, size == null ? "–" : sizeText(size), within)));
}
// a row of a tab: a name, what it is beneath, and a size
function entry(name, what, size, within) {
  const row = document.createElement("div"); row.className = "entry" + (within ? " within" : "");
  row.innerHTML = '<span class="label"><span class="name"></span><span class="what"></span></span><span class="size"></span>';
  row.querySelector(".name").textContent = name; row.querySelector(".what").textContent = what; row.querySelector(".size").textContent = size;
  return row;
}
$("#sb-memory").onclick = () => usage("memory");

// the disk: what the site keeps on this device, as Manage storage counts it
async function diskBar() {
  let got;
  // what the site keeps can change while it is counted (a cache entry deleted between listing and reading it):
  // the bar keeps its last count until the next one
  try { got = await inventory(); } catch (e) { return console.warn("what the site keeps could not be counted:", e); }
  const { sections, settings, overhead } = got;
  showDisk(sections.reduce((a, x) => a + x.entries.reduce((b, e) => b + e.size, 0), settings + overhead));
}
const showDisk = (n) => showNumber($("#sb-disk"), sizeText(n));
$("#sb-disk").onclick = () => usage("storage");

const { showNumber, tabOn, usage, cpu, net, showResources } = statusResources({ $, storageTab, ramList, readJSON, RESOURCES, writeJSON, memoryNow, still, sizeText, entry });
// ---------- animations: on unless the user turned them off in the CPU tab, or asks the system for reduced motion ----------
// Off, the stylesheet stops every animation and transition but the spinners'; motion the page starts itself asks still()
const motion = $("#motion");
const showMotion = () => {
  let kept = null;
  try { kept = localStorage.getItem(MOTION); } catch { /* no storage */ }
  motion.checked = kept !== "false";
  document.documentElement.dataset.motion = motion.checked ? "on" : "off";
};
showMotion();
motion.onchange = () => { writeJSON(MOTION, motion.checked); showMotion(); };
function still() { return !motion.checked || matchMedia("(prefers-reduced-motion: reduce)").matches; }
// ---------- Python after a run: kept loaded for the next, unless the user trades the speed for the memory ----------
const unloading = $("#unload-python");
const showUnloading = () => { unloading.checked = readJSON(UNLOAD_PYTHON, false) === true; };
showUnloading();
unloading.onchange = () => { writeJSON(UNLOAD_PYTHON, unloading.checked); unloadIfDone(); };
dialogMotion(still);
foldMotion();
focusReturn();

$("#sb-net").onclick = () => usage("network");
$("#sb-cpu").onclick = () => usage("cpu");

// ---------- the study's stage and steps ----------
// What the stage opens (req/shell/study/stage): the one table of stages.js read for the study on show, whose stage is its study file's
// once that is read (readStage), its study.json's until then, and none for a study outside the model.
const stageAllows = (action) => !!manifest && allows(manifest.stage, action);
// the stage read from the study file, which the study.json's stage stands in for where the file names none or cannot be read: from the
// minute's copy, or fresh; the one the account last read stands in while the store does not answer. A visitor who never signs in reads
// it too, by the site's key, since the file is shared by link. A study with no stage keeps none.
async function readStage({ fresh = false } = {}) {
  if (!manifest || manifest.stage == null) return manifest?.stage ?? null;
  const name = "stage:" + manifest.id;
  let file = null;
  if (remote.ready && (!signIn.signedIn() || signIn.token()) && place.root() && !setupOffline() && !document.documentElement.classList.contains("offline")) {
    try {
      file = await place.settings({ fresh });
      if (file && STAGES.includes(file.stage) && signIn.signedIn()) signIn.learn(name, file.stage);
    } catch (e) { if (!e?.noAccess) console.warn("the study's stage was not read:", e); }
  }
  const last = signIn.learned(name);
  return stageOf(file || (STAGES.includes(last) ? { stage: last } : null), manifest);
}
// the study's stage changed, by Study Setup's promotion or a read: what follows from it is drawn again
function setStage(stage) {
  if (!manifest || manifest.stage == null || manifest.stage === stage || !STAGES.includes(stage)) return;
  manifest.stage = stage;
  showStage(); showBoxes(); drawAnnotate(); data.stageChanged();
}
function showStage() {
  if (manifest.stage) document.documentElement.dataset.stage = manifest.stage; else delete document.documentElement.dataset.stage;
  const tag = $(`#study-list a[data-id="${manifest.id}"] .stage-tag`);
  if (tag) stageTag(tag, manifest.stage);
}
// a study's stage in the switcher: a small label bordered in the stage's colour; a study with none leaves it empty
function stageTag(tag, stage) {
  tag.textContent = stage || ""; tag.dataset.stage = stage || ""; tag.dataset.light = LIGHT[stage] || "";
}
// the stages, the given one highlighted and those before it crossed out, with what moves a study on from it; for the study on show also
// what the page measures of the gate and a line for each action open to this user (shell/study/stage-popup)
function fillStages(stage, id) {
  const now = STAGES.indexOf(stage);
  $("#stage-list").replaceChildren(...STAGES.map((name, k) => {
    const li = document.createElement("li"); li.className = k < now ? "past" : k === now ? "now" : "";
    li.innerHTML = `<span class="dot" data-light="${LIGHT[name]}"></span><span class="name">${name}</span><span class="what">${esc(WHAT[name])}</span>`;
    return li;
  }));
  $("#stage-next").textContent = NEXT[stage] || "";
  $("#stage-gates").replaceChildren(); $("#stage-actions").replaceChildren();
  if (manifest?.id === id) fillStageLines(stage, id);
}
// what the page measures of the study's gate: how many images its index lists for this user, and how many of them carry a GT and an
// official mark; null where the study file or its index cannot be read
async function stageFacts() {
  try {
    const s = await place.settings();
    if (!s?.index) return null;
    const images = s.index.images.filter((im) => storeRoles.manager || !isHidden(im.tags || [], s.hide));
    const marked = (k) => images.filter((im) => !!marksOf(s.marks, im.sha)[k]?.file).length;
    return { images: images.length, gt: marked("gt"), official: marked("official") };
  } catch (e) { console.warn("the study's gate was not measured:", e); return null; }
}
async function fillStageLines(stage, id) {
  const facts = await stageFacts();
  if (manifest?.id !== id || manifest.stage !== stage) return;
  const item = (text, action) => {
    const li = Object.assign(document.createElement("li"), { textContent: text });
    if (action) li.dataset.action = action;
    return li;
  };
  $("#stage-gates").replaceChildren(...gates(stage, facts).map((t) => item(t)));
  $("#stage-actions").replaceChildren(...stageLines(stage, { save: maySave(), manage: mayManage() }, facts).map(([action, text]) => item(text, action)));
}
// the stages pop up beside the switcher while a study's stage label is hovered, about that study
const stagePop = $("#stage-pop"), stageClose = closesOnLeave(stagePop, () => stagePop.matches(":hover"));
function stageHover(tag) {
  tag.addEventListener("mouseenter", () => {
    if (!tag.dataset.stage) return;
    stageClose.stay();
    fillStages(tag.dataset.stage, tag.closest("a").dataset.id);
    const menu = $("#study-menu .pop").getBoundingClientRect(), row = tag.closest("a").getBoundingClientRect();
    if (!stagePop.matches(":popover-open")) stagePop.showPopover();
    stagePop.style.left = Math.max(8, Math.min(menu.right + 8, innerWidth - stagePop.offsetWidth - 8)) + "px";
    stagePop.style.top = Math.max(8, Math.min(row.top - 12, innerHeight - stagePop.offsetHeight - 8)) + "px";
  });
  tag.addEventListener("mouseleave", stageClose.leave);
}
stagePop.addEventListener("mouseenter", stageClose.stay);
stagePop.addEventListener("mouseleave", stageClose.leave);

// ---------- annotating (req/shell/annotate/choice) ----------
// After an image loads the user chooses how to get annotations on it. Annotation mode is on from the choice that enters it
// until the image goes: the study is mounted afresh in it, on the same image, as it was for a role of its own once, and
// route says how it began: "scratch" | "local" | "stored". resume holds a choice made until the study has the image again:
// {then()} what to do once it has.
let annotating = false, route = null, resume = null;
// the annotation of the store shown read-only, {label, doc, counts}, or null, and what the store's list of them held when last asked
let viewing = null, storeList = null;
// the extraction the annotation being made was edited from, its file's id, which Save records (req/shell/extractions/list)
let editBase = null;
const makesTruth = () => !!manifest && stageAllows("annotate") && annotating;
// whether the store lets this user save ground truth to the study, as far as last read
const maySave = () => signIn.signedIn() && storeRoles.tagger;
const mayManage = () => signIn.signedIn() && storeRoles.manager && remote.ready;
// the user's access, or the study's roots, changed: what they may do shows again, the annotation mode kept
function showAccess() {
  if (!manifest) return;
  const manage = mayManage() && !setupOffline();
  const link = $("#open-setup");
  link.hidden = !manage;
  // Study Setup opens in a page of its own, and says so; leaving it stays in this one
  link.querySelector(".word").textContent = SETUP ? "Leave Study Setup…" : "Study Setup…";
  link.querySelector(".new-page").toggleAttribute("hidden", SETUP);
  if (SETUP) { link.removeAttribute("target"); link.removeAttribute("rel"); } else { link.target = "_blank"; link.rel = "noopener"; }
  link.setAttribute("href", SETUP ? studyAddress(manifest.id) : `setup?study=${encodeURIComponent(manifest.id)}`);
  if (SETUP) { setupLive ||= manage; data.open(manage); setupNote(manage); }
  $("#gt-submit").hidden = !maySave();
  truth.draw();
  wantList();
  drawAnnotate();
}
// Study Setup, entered from the avatar's menu by those the store lets write the study's root (req/setup/page): the click renews a token
// run out, as the store's reads do. It opens in a page of its own: the link's own doing while the token lasts; with the token run out
// the page is opened empty within the click and sent to Study Setup once the sign-in has answered, so that it reads with the new token.
// Leaving it waits for the sign-in's answer
$("#open-setup").onclick = (e) => {
  if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!SETUP) {
    $("#user-menu").open = false;
    if (signIn.token()) { signIn.forRead().catch(() => {}); return; }
    e.preventDefault();
    const tab = window.open("", "_blank"), to = new URL($("#open-setup").getAttribute("href"), location.href).href;
    const send = () => { if (!tab) return location.assign(to); tab.opener = null; tab.location.replace(to); };
    signIn.forRead().then(send, send);
    return;
  }
  e.preventDefault(); $("#user-menu").open = false;
  const go = () => location.assign($("#open-setup").href);
  signIn.forRead().then(go, go);
};
// Study Setup works online only: opened offline it says so and asks the store nothing; once its folders were on show, the network
// going leaves them as they are, their controls waiting for it as the page's do everywhere
let setupLive = false;
const setupOffline = () => SETUP && !setupLive && document.documentElement.classList.contains("offline");
// what Study Setup says in place of its folders, to whom it is not for or while it cannot reach the store
function setupNote(manage) {
  const note = $("#setup-note");
  const says = setupOffline() ? "Study Setup needs the internet: you are offline."
    : manage ? "" : !signIn.signedIn() ? `Study Setup is for those who may write this study's folder in ${remote.short}: sign in with an account that may.`
    : `Study Setup is for those who may write this study's folder in ${remote.short}, and this account may not.`;
  note.textContent = says; note.hidden = !says;
}

// ---------- the image and the item view ----------
// A study with an item view gets the switch between it and the image (req/shell/views/second), on once the study
// has counted its items: count(total), null until it has any; on(fn) hears the view now shown, "image" or "items".
// While the study makes ground truth there is none, its tasks being in the left bar.
const itemsView = () => { const v = $("#items-view"); return v && !makesTruth() && !truthShown ? v : null; };
const views = {
  now: "image", total: null, heard: [],
  show(v) {
    views.now = v; $("#tip").hidden = true;
    $("#image-view").hidden = v !== "image"; if ($("#items-view")) $("#items-view").hidden = v !== "items" || !itemsView();
    $("#view").dataset.view = v; views.draw();
    for (const fn of views.heard) fn(v);
  },
  on(fn) { views.heard.push(fn); lifetime.signal.addEventListener("abort", () => views.heard.splice(views.heard.indexOf(fn), 1)); },
  count(total) { views.total = total ?? null; views.draw(); },
  draw() {
    const b = $("#switch");
    b.disabled = views.total === null; b.hidden = !itemsView() || b.disabled;
    b.querySelector(".name").textContent = views.now === "items" ? "Image" : "Items";
    b.querySelector(".count").textContent = views.now === "items" || views.total === null ? "" : String(views.total);
  },
  mount() {
    slow($("#switch"));
    views.total = null; views.show("image");
  },
};
$("#switch").onclick = () => views.show(views.now === "image" ? "items" : "image");
// The study's steps, in order, in one state that the shining button is drawn from (req/shell/steps):
// [{key, name, button, done}]. Load image and Save are the shell's, the study's own come from its
// study.json; the step to do now is the first not done.
let steps = [], shone = [];
const stepsWatch = new MutationObserver(() => drawSteps());
function makeSteps() {
  steps = [{ key: "load", name: "Load image", button: loadButton() }, ...manifest.phases,
    ...(makesTruth() ? [{ key: "submit", name: "Upload", button: "#gt-submit" }] : [])]
    .map((p) => ({ ...p, done: false }));
  // a step's button shines only while it can be pressed
  stepsWatch.disconnect();
  for (const p of steps) if (p.button && $(p.button)) {
    stepsWatch.observe($(p.button), { attributes: true, attributeFilter: ["disabled", "hidden"] });
  }
  drawSteps();
  tasks.stepped();
}
// a step done or not
function step(key, done) {
  const p = steps.find((x) => x.key === key);
  if (!p) return;
  if (done && !p.done) {
    log.add(`Step done: ${p.name}`);
    if (key === "load") foldLoad();
  }
  p.done = !!done;
  drawSteps();
  tasks.stepped();
}
function drawSteps() {
  const now = steps.findIndex((p) => !p.done);
  // the button lit last time may belong to no step now: the study switched, or the step's button changed
  for (const b of shone.splice(0)) b.classList.remove("shine");
  steps.forEach((p, k) => {
    // a step of the study's whose button waits behind Start: Start is what to press now
    const own = p.button && $(p.button), b = own && $("#processing-box").hidden && $("#processing-box").contains(own) && !$("#annotate-box").hidden ? ($("#annotate-local").hidden ? $("#annotate-scratch") : $("#annotate-local")) : own;
    if (b && k === now && !b.disabled && !b.hidden) { b.classList.add("shine"); shone.push(b); }
  });
}

// ---------- buttons whose action takes a while: disabled, with a small spinner, until the action is done ----------
// the worker's next message of a kind ("opened", or "result:<action>"), or its error
const waiting = {};
const kindOf = (m) => (m.type === "result" ? "result:" + m.action : m.type);
const until = (kind) => new Promise((ok, bad) => (waiting[kind] ||= []).push({ ok, bad }));
// a wait that working() takes up a frame later: its failure counted as handled from the start, so the study leaving
// within that frame is no uncaught error
const taken = (p) => { p.catch(() => {}); return p; };
function settle(m) {
  if (m.type === "error") for (const w of Object.values(waiting)) w.splice(0).forEach((x) => x.bad(new Error(m.text)));
  else if (waiting[kindOf(m)] && !study.holds?.(m)) waiting[kindOf(m)].splice(0).forEach((x) => x.ok(m));
}
// a frame after the button is disabled, so it shows before the work holds the page
const painted = () => new Promise((ok) => requestAnimationFrame(() => after(0, ok)));
// a button's action, counted as the page's work from the press until it is done
function working(btn, action) {
  if (btn.classList.contains("working")) return;
  return work.during(holding(btn, action), `#${btn.id} at work`);
}
async function holding(btn, action) {
  btn.classList.add("working"); btn.disabled = true;
  // whatever the page redraws meanwhile, the button stays held until the action is done
  const hold = new MutationObserver(() => { if (!btn.disabled) btn.disabled = true; });
  hold.observe(btn, { attributes: true, attributeFilter: ["disabled"] });
  try {
    await painted(); await action();
    await study.settled?.();
  } catch (e) {
    // the study leaving ends the wait on purpose: nothing went wrong
    if (!e?.cancelled) console.warn(e);
  } finally {
    hold.disconnect(); btn.classList.remove("working"); btn.disabled = false; study.idle?.();
  }
}
// once only: the shell's own buttons outlive a study, so a study slowing one again on its next mount would hold
// it from inside its own hold, and the click would do nothing
const slow = (btn) => {
  if (btn.onclick?.slow) return;
  const act = btn.onclick; btn.onclick = Object.assign((e) => working(btn, () => act.call(btn, e)), { slow: true });
};

// ---------- Python ----------
async function start() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
      // the same worker for the app's address with no slash, which its own scope stops short of, so it opens offline too
      const app = new URL(".", new URL("sw.js", location.href)).pathname.replace(/\/$/, "");
      navigator.serviceWorker.register("sw.js", { scope: app }).catch((e) => console.info(`no service worker at ${app}:`, e.message));
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        // first visit: wait for the cache to take control so the downloads below are kept
        await within(3000, new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true })));
      }
    } catch (e) { console.warn("no cache for third-party files:", e); }
    offlineCopy.keepSite().then(diskBar, (e) => console.warn("no copy of the site for offline:", e));
  }
  status(READY); statusBar(); diskBar();
  moveThumbs().catch((e) => console.warn("the thumbnails kept before could not be moved:", e));
  keepPython();
  if (navigator.deviceMemory <= LOW_GB) memoryTip();
}
// Python's own files and the study's packages kept on this device while the page is open, those not there yet, one
// after another and below everything else, so the first Run only starts Python (req/shell/python/on-run)
async function keepPython() {
  // a study with no step to run never starts Python
  if (!manifest?.phases?.length || !("caches" in self)) return;
  const id = manifest.id, python = manifest.python;
  delete st.unkept;
  try {
    const [lock, vendored] = await Promise.all([fetch(PYODIDE + "pyodide-lock.json", { priority: "low" }), fetch("vendor/wheels.json")].map(async (r) => (await r).json()));
    const urls = [...CORE, ...packagesOf(python, lock, vendored, new URL("vendor/", location.href).href).map((w) => w.url)];
    for (const u of urls) {
      if (manifest?.id !== id || st.worker) return;
      if (!(await caches.match(u))) await (await fetch(u, { priority: "low" })).arrayBuffer();
    }
    if (st.notHere) { st.notHere = false; status(READY); }
  } catch (e) {
    // with no network, the study says it cannot run here yet; the network back, its files are kept then
    if (manifest?.id === id && !st.worker) st.unkept = true;
    if (st.unkept && offlineCopy.offline()) notHere();
    else console.warn("Python's files are not kept yet:", e);
  }
}
const notHere = () => { st.notHere = true; status(NOT_HERE); };
// Python's thread, on the study the address names, in place of any before it
function pythonWorker() {
  st.worker?.terminate();
  for (const asked of pyCalls.splice(0)) asked.end();
  st.heap = null; // Python's memory, unknown until it says (Python not started holds none)
  st.worker = new Worker("worker.js?study=" + encodeURIComponent(studyOf(location)), { type: "module" });
  st.worker.onmessage = (e) => onWorker(e.data);
  st.worker.onerror = (e) => onWorker({ type: "error", text: e.message || "Python stopped." });
}
// The study owner's areas of the image opened from the study's store (req/shell/data/damaged,
// req/shell/data/area-of-interest) and its tags (req/shell/image/file-info), from its study index, the one kept on
// this device offline; none for a preview, whose pixels are not the image's, or an image the index does not hold
async function studyAreas(source) {
  if (!source?.id || source.kind === "preview" || !remote.owns(source) || !place.root()) return;
  let ix = readJSON(STUDY_INDEX)[place.root()]?.index || null;
  if (!offlineCopy.offline()) ix = await place.index().catch(() => ix);
  const im = ix?.images?.find((i) => i.id === source.id);
  if (st.source !== source || !im) return;
  page.set({ tags: { of: source.id, tags: im.tags || [] } });
  summaryMasks.areas({ damaged: im.damaged || [], interest: im.interest || [] });
}
// one of the study's Python actions; its answer reaches the study's result hook. Python starts with the first, and is
// handed the image's file as it is stored before any (req/shell/python/file-bytes)
function call(action, args, echo) {
  if (!st.worker) { pythonLoads(true); pythonWorker(); }
  if (st.kept && st.held !== st.kept) {
    const bytes = st.kept.bytes.slice(0);
    st.worker.postMessage({ type: "open", name: st.kept.name, bytes }, [bytes]);
    st.held = st.kept;
  }
  // the study owner's damaged areas of the image, for the study's Python to leave out (req/shell/data/damaged)
  pyCalls.push({ end: work.begin(`Python ${action}`), left: false });
  st.worker.postMessage({ type: "call", action, args, echo, damaged: summaryMasks.api.damaged() });
}

// Python started, and its code version known: the ones waiting on it, {ok, bad}
const started = [];
function pythonReady() {
  if (st.ready) return Promise.resolve();
  if (!st.worker) { pythonLoads(true); pythonWorker(); }
  return new Promise((ok, bad) => started.push({ ok, bad }));
}
// the run a batch waits on, ended by this when Python answers it with an error
let runFailed = null;

// ---------- the low-memory popup: on a computer with little memory, and whenever the page runs out of it ----------
const OUT_OF_MEMORY = /MemoryError|out of memory|Memory\.grow|allocation failed|Maximum memory|OOM/i;
function memoryTip(ranOut) {
  if (!ranOut && readJSON(MEMORY_TIP, false)) return;
  const mac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform);
  $("#memory-mod").textContent = mac ? "⌘" : "Ctrl";
  $("#memory-why").textContent = ranOut
    ? "The page ran out of memory. Please close other tabs and apps, then reload the page."
    : `This computer has ${navigator.deviceMemory} GB of memory and this page needs about ${PAGE_GB} GB. ` +
      "Please close other tabs and apps, so it does not slow down or stop.";
  $("#memory-never").hidden = !!ranOut; $("#memory-off").checked = false;
  if (!$("#memory-dlg").open) $("#memory-dlg").showModal();
}
$("#memory-off").onchange = () => writeJSON(MEMORY_TIP, $("#memory-off").checked);

// Python's calls on their way, each ended by its answer, its error, or Python stopped; left: asked by a study the
// person has since left, whose answer is nobody's, even once they are back in that study
const pyCalls = [];
function onWorker(m) {
  const asked = m.type === "result" || m.type === "error" ? pyCalls.shift() : null;
  asked?.end();
  if (asked?.left) { statusBar(); return ended(m); }
  if (m.heap != null) { st.heap = m.heap; st.files = m.files || 0; }
  if (m.busy) cpu.py = m.busy;
  if (m.net != null) net.worker = m.net;
  // a late answer for a study that has left, or a word from one still coming in
  if (m.study && m.study !== manifest?.id) { statusBar(); return ended(m); }
  // the page opens images itself (req/shell/image/open): Python only holds the file
  if (m.type === "opened") return statusBar();
  handle(m); settle(m); statusBar(); ended(m);
}
const ended = (m) => (m.type === "result" || m.type === "error") && unloadIfDone();
// Python shut down once nothing is asked of it, when the user chose to (req/shell/resources-dialog/unload-python): its
// memory freed, and the next call starts it again and hands it the image again
function unloadIfDone() {
  if (!unloading.checked || !st.worker || pyCalls.length) return;
  st.worker.terminate(); pythonLoads(false);
  Object.assign(st, { worker: null, held: null, ready: false, heap: null, files: 0 });
  statusBar();
}
function handle(m) {
  if (m.type === "progress") status(m.text);
  else if (m.type === "error") {
    // the request that failed is over: its button can be pressed again
    study.error?.();
    if (!st.ready) { st.failed = true; pythonLoads(false, true); }
    for (const w of started.splice(0)) w.bad(new Error(m.text));
    runFailed?.(new Error(m.text));
    // what being offline stops is said plainly: the online icon already says why (req/shell/offline/default)
    if (m.offline) status(m.text); else status("Error: " + m.text, true);
    if (OUT_OF_MEMORY.test(m.text)) memoryTip(true);
  } else if (m.type === "ready") {
    st.ready = true; st.readyInfo = m.info; studyCode = m.code ?? null; pythonLoads(false);
    for (const w of started.splice(0)) w.ok();
    study.ready?.(m.info); statusBar(); diskBar();
  } else if (m.type === "result") {
    study.result?.(m.action, m.meta, m.bytes, m.echo);
  } else if (m.type === "ask") {
    // a version asking for a service only the page has: the study answers it ({meta, bytes}), and the version goes on
    const worker = st.worker, reply = (r) => worker?.postMessage(r, r.bytes ? [r.bytes.buffer] : []);
    Promise.resolve().then(() => study.serve(m.service, m.meta, m.bytes))
      .then((r) => reply({ type: "reply", value: r?.meta ?? null, bytes: r?.bytes ?? null }),
        (e) => reply({ type: "reply", error: String(e?.message || e) }));
  }
}
// the image the page has read, shown: in the page's state, the viewer, the steps and the study
function imageOpened(m) {
  st.um = m.meta.um; st.umY = m.meta.um_y;
  page.set({ opening: null, image: { name: st.fileName, source: st.source, W: m.meta.W, H: m.meta.H, um: st.um, umY: st.umY,
    info: m.meta.info, more: m.meta.more || [], planes: m.images, channels: m.meta.channels || null, Z: m.meta.Z || 1, spacing: m.meta.spacing ?? null } });
  busy(false); statusBar();
  showImage();
  const from = remote.owns(st.source) ? remote.label : st.source?.kind === "preview" ? `its preview in ${remote.label}` : "this computer";
  step("load", true);
  log.add(`Opened an image from ${from}, ${m.meta.W} × ${m.meta.H} px, ${m.meta.Z || 1} slice(s)`);
  status(SETUP ? READY : "Image loaded."); // the study's opened hook says what comes next, if anything
  summaryMasks.opened(); studyAreas(st.source); data.opened();
  study.opened?.(m.meta);
  // annotation mode lasts as long as the image: this one is in it only when the choice that entered it brought it here
  const resumed = resume; resume = null;
  if (!resumed) { annotating = false; route = null; editBase = null; }
  viewing = null; storeList = null; storeRows = new Map(); listing++;
  if (resumed) tasks.tagging(true);
  showBoxes();
  if (!resumed) { listedFor = null; wantList(); }
  // a draft of the image on this device is offered with the tasks, Load draft in view (req/shell/ground-truth/draft-offer)
  gtSession.opened().then(async () => {
    if (resumed) await resumed.then?.();
    drawAnnotate();
    // the choice just made took the focus with it: it goes to what is left of the box
    if (resumed && document.activeElement === document.body) $("#analysis-box h2").focus({ preventScroll: true });
  });
  truth.paint(); drawAnnotate(); drawWaiting();
  if (st.source && st.source.kind === "local" && makesTruth()) notice(LOCAL_GT(remote));
  if (remote.owns(st.source) && st.pictured !== st.source.id) saveThumb(st.source.id, st.fileName);
}

// ---------- loading ----------
const { loadButton, loadHolder, noteSha, remember, recentHere, agoTag, showRecent, placeLoad } = loadBox({ $, readJSON, page, st, peek, status, signIn, restudyHeld, closeTip, writeJSON, truth, standing, notice, esc, drawSteps, keptIds,
  get manifest() { return manifest; }, get openBytes() { return openBytes; }, get openRemote() { return openRemote; },
  get gtSession() { return gtSession; }, get offlineCopy() { return offlineCopy; }, get putTruthTag() { return putTruthTag; },
  get openRecent() { return openRecent; }, get steps() { return steps; } });
// source: where the image came from, {kind: "local"} or the remote store's source of it
const openBytes = (name, bytes, source) => work.during(openNow(name, bytes, source), `opening ${name}`);
async function openNow(name, bytes, source) {
  // an image chosen while the study is still coming in opens into it, once it is in
  await work.during(studyIn.catch(() => {}), "waiting for the study");
  if (st.img && !gtSession.leaving("open another image")) return;
  // another image asks again how to get annotations: the study comes in afresh, out of annotation mode
  if (annotating && !resume) { annotating = false; route = null; viewing = null; editBase = null; await restudy(false); }
  const opened = taken(until("opened")); working(loadHolder(), () => opened);
  st.fileName = name; st.source = source;
  for (const p of steps) p.done = false;
  drawSteps();
  // the file as it came, for Python at a Run (a copy is handed over then) and the problem report
  const kept = st.kept = { name, source, bytes };
  tasks.tagging(false);
  summaryCsv.clear(); summaryMasks.left();
  study.opening?.(name, source);
  st.sha = await sha256(bytes);
  if (remote.owns(source)) noteSha(source.id, st.sha);
  page.set({ opening: { name } }); statusBar();
  view.clear();
  busy(true, "Reading the image…", st.peeked && "peek");
  let im;
  try { im = inOrder(await openImage(bytes, manifest.view || {}), study.order); } catch (e) {
    busy(false); page.set({ opening: null });
    return onWorker({ type: "error", text: `${name} could not be read: ${e.message || e}` });
  }
  if (st.kept !== kept) return; // another image came meanwhile, or none is open
  const images = im.images;
  const meta = { W: im.W, H: im.H, Z: im.Z, um: im.um, um_y: im.umY, spacing: im.spacing, info: im.info, more: im.more, channels: im.channels };
  imageOpened({ type: "opened", meta, images }); settle({ type: "opened", meta }); statusBar();
}
async function sha256(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// a painter for the image's bytes as they arrive, shown until the page's own drawing replaces it; the study's,
// when it has one
function peek() {
  st.peeked = false;
  return study.painter ? view.preview(study.painter) : () => false;
}
// a setting from before each study loaded from one place (req/shell/load/from)
try { localStorage.removeItem("nor-load-source"); localStorage.removeItem("nor-role"); } catch { /* nothing kept */ }
// no image open, and Python, if it holds it, letting it go
function dropImage() {
  if (st.held && st.worker) st.worker.postMessage({ type: "close" });
  Object.assign(st, { kept: null, held: null, fileName: "", source: null, sha: "", um: null, umY: null });
  page.set({ image: null, opening: null });
  viewing = null; storeList = null; listing++;
}
// the study mounted again in place, Python kept; again: the image open, opened again in it
function restudy(again = true) {
  if (!again) { annotating = false; route = null; resume = null; editBase = null; }
  return swapping = swapping.then(async () => {
    // no study came in before this turn: there is none to mount again
    if (!manifest) return;
    const { ready, readyInfo } = st, id = manifest.id, image = again && st.img ? st.kept : null;
    dropImage();
    leaveStudy();
    try { await mountStudy(id); } catch (e) { return status("Error: " + (e.message || e), true); }
    if (ready) { st.ready = true; st.readyInfo = readyInfo; study.ready?.(readyInfo); }
    statusBar(); status(READY);
    if (image) await openBytes(image.name, image.bytes, image.source);
  });
}
// The study mounted again, on the image open or (again false) with none, the page held on screen as it is until it is back
// (req/shell/annotate/held): the browser keeps showing what it showed while the change is made, where it can
function restudyHeld(again = true) {
  if (!document.startViewTransition) return restudy(again);
  const root = document.documentElement;
  root.dataset.held = "";
  let mounted;
  const t = document.startViewTransition(() => (mounted = restudy(again)));
  t.ready.catch(() => {}); // the browser giving the hold up shows the page as it then is: only the hold is lost
  t.finished.finally(() => { delete root.dataset.held; });
  return t.updateCallbackDone.then(() => mounted, () => mounted);
}

// a tip: a bubble below its anchor, pointing at it, until the user closes it, after which it never shows again
function tip(id, anchor, text) {
  if (readJSON(TIPS, []).includes(id)) return;
  let t = document.querySelector(`.tip-bubble[data-tip="${id}"]`);
  if (!t) {
    t = Object.assign(document.createElement("div"), { className: "tip-bubble" });
    t.dataset.tip = id; t.setAttribute("role", "status");
    t.innerHTML = `<span></span><button type="button" class="x" aria-label="Close">×</button>`;
    t.querySelector(".x").onclick = () => closeTip(id);
    document.body.append(t);
  }
  t.querySelector("span").textContent = text;
  anchor.style.anchorName = "--tip-" + id; t.style.setProperty("--anchor", "--tip-" + id);
}
function closeTip(id) {
  const t = document.querySelector(`.tip-bubble[data-tip="${id}"]`);
  if (!t) return;
  t.remove(); writeJSON(TIPS, [...new Set([...readJSON(TIPS, []), id])]);
}

// what the study's extractions say of an image, {needed, marks: {gt, official}, saved}, or null where they say nothing: from the
// extractions folder's listing, the study file's marks and this device's record of what it saved
const savedHere = () => { const l = readJSON(GT_SAVED, {})[manifest?.id]; return new Set(Array.isArray(l) ? l : []); };
const noteSaved = (sha) => {
  const all = readJSON(GT_SAVED, {}), l = new Set(Array.isArray(all[manifest.id]) ? all[manifest.id] : []);
  if (!l.has(sha)) writeJSON(GT_SAVED, { ...all, [manifest.id]: [...l, sha] });
};
function standing(map, marks, name, sha) {
  const g = { needed: map.get(subfolderName(name, sha))?.needed || null, marks: marksOf(marks, sha), saved: savedHere().has(sha) };
  return g.needed || g.saved || g.marks.gt || g.marks.official ? g : null;
}
// an image's tag, [text, title, state], from its standing: yours (saved, GT, official), what another's marked, else GT wanted
function truthTag(g) {
  if (!g) return [];
  const me = signIn.email()?.toLowerCase(), ours = (m) => !!m?.file && !!me && m.by?.toLowerCase() === me, theirs = (m) => !!m?.file && !ours(m);
  const mine = ours(g.marks.official) ? "official" : ours(g.marks.gt) ? "GT" : g.saved ? "saved" : null;
  const others = [["gt", "GT"], ["official", "official"]].filter(([k]) => theirs(g.marks[k])).map(([, t]) => t);
  const parts = [...(mine ? [`yours: ${mine}`] : []), ...others.map((t) => `${t} marked`)];
  if (parts.length) return [parts.join(" · "), "What the study's Analysis Files of this image say, yours first", mine === "saved" && !others.length ? "saved" : "marked"];
  return g.needed ? ["GT wanted", "A study owner marked it as needing ground truth", "wanted"] : [];
}
const putTruthTag = (tag, g) => {
  const [text, title, state] = truthTag(g);
  if (tag && text) Object.assign(tag, { textContent: text, title }).dataset.state = state;
};

const { throttle, throttled, openRemote, openRecent, remoteLeft, remoteDialog } = imageDialog({ $, readJSON, writeJSON, savedImage, sha256, peek, remember, picture, tip, openBytes, busy, autoSave, saveImage, page, showImage, idOf, sizeText, esc,
  thumbUrl, keptIds, recentHere, RECENT, place, keptPreviews, folderPreviews, agoTag, data, truth, standing, putTruthTag, signIn, say, know, turning,
  get manifest() { return manifest; }, get offlineCopy() { return offlineCopy; }, get view() { return view; }, get loading() { return loading; },
  set loading(v) { loading = v; }, get base() { return base; } });

const bytesOf = (k) => 2 * (k.length + (localStorage.getItem(k) || "").length); // UTF-16

// ---------- the user: whoever opened the page on this device, and what the site keeps here ----------
// what each of the shell's own setting keys holds, in the user's words
const OWN_SETTINGS = {
  [THEME]: "Theme", [BARS]: "Left bar width", [REMOTE_LINK]: `Last ${remote.label} link`, [REMOTE_LINKS]: `Last ${remote.label} link in each study`,
  [THUMBS]: `Show thumbnails in the ${remote.short} dialog`, [AUTO_SAVE]: `Auto-save images from ${remote.label}`, [RECENT]: `Recent images from ${remote.label}`, [LOCAL_RECENT]: "Recent files from this computer", [LISTINGS]: `${remote.label} folders as last listed, for working offline`, [STUDY_INDEX]: "Each study's index of its images as last read, for working offline", [HOLDS]: `What each ${remote.short} image holds (2D or 3D)`, [THROTTLE]: `Wait after ${remote.short} downloads were throttled`, [TIPS]: "Tips you closed", [SEEN_VERSION]: "Version you saw last", [MEMORY_TIP]: "Low-memory popup turned off", [SIGNED_IN]: SIGNED_IN_LABEL, [MINIMAP]: "Minimap: shown or not, and how see-through", [OUTBOX]: `Annotations waiting to be saved to ${remote.label}`, [GT_SAVED]: `The images you saved an annotation of in each study`, [MOTION]: "Animations turned off", [UNLOAD_PYTHON]: "Unload Python after each run", [RESOURCES]: "The status bar's disk, memory, network and CPU: auto-hiding or always open", [APP_ASKED]: "Asked for the site as an app", [WELCOME]: "Sign in or go on anonymously, as answered on opening the page", [ACTIONS]: "Your last actions here, for a problem report",
};
// What the site keeps, by what it takes to work offline (req/shell/storage/manage): a section per study, then what they share; settings
// apart, which Settings keeps (req/shell/account/settings), and with them what nobody names. An entry: {kind, name, what, size, del, held, ask}, del
// absent for what cannot go alone. Kinds in a section's order:
const KINDS = ["site", "python", "code", "image", "thumb", "selections", "other"];
const SHARED_ABOUT = "The site itself, so it opens offline; Python itself; and the packages two studies or more use.";
// a package's name from its wheel's file name
const packageOf = (url) => decodeURIComponent(url.split("/").pop()).split("-")[0].replace(/_/g, "-");
// [{id, title, about, mark, entries}], what the settings take apart from them, and the rest
async function inventory() {
  const drop = (...keys) => keys.forEach((k) => { try { localStorage.removeItem(k); } catch { /* nothing kept */ } });
  const studies = await offlineCopy.studyFiles().catch((e) => { console.warn("the studies could not be read:", e); return []; });
  const live = await offlineCopy.available().catch(() => new Set());
  const sections = studies.map((s) => ({ id: "study:" + s.id, study: s.id, title: s.title, mark: live.has(s.id), folders: !!s.manifest.root, entries: [] }));
  const shared = { id: "shared", title: "Shared", about: SHARED_ABOUT, entries: [] };
  // a study's own, else the study on show's: kept before images were told apart by study
  const sectionOf = (id) => sections.find((x) => x.study === id) || sections.find((x) => x.study === manifest?.id) || shared;
  // each section's thumbnails and its folders' previews, one record
  const thumbsOf = new Map(), thumb = (x, size, del, preview) => {
    const t = thumbsOf.get(x) || { pics: 0, previews: 0, size: 0, dels: [] };
    t[preview ? "previews" : "pics"]++; t.size += size; t.dels.push(del); thumbsOf.set(x, t);
  };
  const unused = { size: 0, dels: [] };
  // the study each remote image belongs to: the one it was kept in, else the one it was last opened in
  const studyOf = {};
  for (const r of readJSON(RECENT, [])) if (r.study && !(r.id in studyOf)) studyOf[r.id] = r.study;
  let settings = 0, overhead = 0, keys = [];
  try { keys = Object.keys(localStorage); } catch { /* no storage */ }
  const stores = window.caches ? await Promise.all((await caches.keys()).map(async (n) => ({ name: n, cache: await caches.open(n) }))) : [];
  const images = stores.find((c) => c.name === IMAGES);
  if (images) for (const q of await images.cache.keys()) { const kept = (await images.cache.match(q))?.headers.get(IMAGE_STUDY); if (kept) studyOf[idOf(q.url)] = kept; }

  const selections = new Map();
  for (const k of keys) {
    if (OWN_SETTINGS[k]) { settings += bytesOf(k); continue; }
    const masked = summaryMasks.keyOf(k);
    if (masked) {
      if (masked.study === manifest?.id) {
        const im = selections.get(masked.image) || { name: masked.image, whats: new Set(), keys: [], size: 0 };
        im.whats.add("summary mask"); im.keys.push(k); im.size += bytesOf(k); selections.set(masked.image, im);
      } else sectionOf(masked.study).entries.push({ kind: "selections", name: masked.image, what: "Your selections: summary mask", size: bytesOf(k), del: () => drop(k), held: true, ask: true });
      continue;
    }
    if (k.startsWith(GT_DRAFT)) {
      const rest = k.slice(GT_DRAFT.length), id = rest.slice(0, rest.indexOf("|")), name = rest.slice(id.length + 1, rest.lastIndexOf("|"));
      if (id === manifest?.id) {
        const im = selections.get(name) || { name, whats: new Set(), keys: [], size: 0 };
        im.whats.add("ground-truth draft"); im.keys.push(k); im.size += bytesOf(k); selections.set(name, im);
      } else sectionOf(id).entries.push({ kind: "selections", name, what: "Your selections: ground-truth draft", size: bytesOf(k), del: () => drop(k), held: true, ask: true });
      continue;
    }
    const s = study.stored?.(k);
    if (s && s.group === "images") {
      const im = selections.get(s.image) || { name: s.image, whats: new Set(), keys: [], size: 0 };
      im.whats.add(s.what); im.keys.push(k); im.size += bytesOf(k); selections.set(s.image, im);
    } else if (s) settings += bytesOf(k);
    else overhead += bytesOf(k);
  }
  // a draft of ground truth kept in IndexedDB joins its image's selections, in its study's section (req/shell/ground-truth/save-draft)
  let kept = [];
  try { kept = await gtDrafts.all(); } catch (e) { console.warn("the ground-truth drafts could not be read:", e); }
  for (const r of kept) {
    const size = JSON.stringify(r).length, del = () => gtDrafts.delete(r.study, r.sha256);
    if (r.study === manifest?.id) {
      const im = selections.get(r.name) || { name: r.name, whats: new Set(), keys: [], size: 0 };
      im.whats.add("ground-truth draft"); im.size += size; (im.dels ||= []).push(del); selections.set(r.name, im);
    } else sectionOf(r.study).entries.push({ kind: "selections", name: r.name, what: "Your selections: ground-truth draft", size, del, held: true, ask: true });
  }
  for (const im of selections.values()) sectionOf(manifest?.id).entries.push({ kind: "selections", name: im.name, what: "Your selections: " + [...im.whats].join(", "), size: im.size,
    del: () => { drop(...im.keys); return Promise.all((im.dels || []).map((f) => f())); }, held: true, ask: true });

  // the packages: whose they are; Python itself, the lock naming its packages and the build's vendored list, shared
  const users = new Map();
  for (const s of studies) for (const u of s.python) users.set(u, [...(users.get(u) || []), s]);
  const itself = new Set(offlineCopy.core), python = { size: 0, dels: [] };
  const code = {}, site = { size: 0, files: 0, del: null };
  for (const { name: c, cache } of stores) {
    for (const req of await cache.keys()) {
      // one dropped since the keys were read, as the thumbnails beyond the latest hundred are, is gone
      const res = await cache.match(req);
      if (!res) continue;
      const u = new URL(req.url), size = (await res.blob()).size, del = () => cache.delete(req);
      if (c === offlineCopy.siteCache()) {
        const id = u.pathname.match(/\/studies\/([\w-]+)\//)?.[1];
        if (id && sections.some((x) => x.study === id)) code[id] = (code[id] || 0) + size;
        else { site.size += size; site.files++; }
        site.del = () => caches.delete(c);
        continue;
      }
      if (c === THUMBS_CACHE) {
        thumb(sectionOf(studyOf[idOf(req.url)]), size, del);
        continue;
      }
      if (c === FOLDER_PREVIEWS) {
        thumb(sectionOf(res.headers.get(IMAGE_STUDY)), size, del, true);
        continue;
      }
      if (c === IMAGES) {
        const at = Number(res.headers.get(IMAGE_AT)), id = idOf(req.url);
        sectionOf(studyOf[id]).entries.push({ kind: "image", name: decodeURIComponent(res.headers.get(IMAGE_NAME) || id), size, del,
          what: `Image from ${remote.label}` + (at ? " · saved " + new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "") });
        continue;
      }
      if (itself.has(req.url) || u.pathname.endsWith("/vendor/wheels.json")) { python.size += size; python.dels.push(del); continue; }
      const who = users.get(req.url) || [];
      const entry = { kind: "python", name: packageOf(req.url), size, del };
      if (who.length === 1) sectionOf(who[0].id).entries.push({ ...entry, what: "Python package" });
      else if (who.length) shared.entries.push({ ...entry, what: "Python package, used by " + who.map((x) => x.title).join(", ") });
      else { unused.size += size; unused.dels.push(del); }
    }
  }
  for (const x of sections) if (code[x.study]) x.entries.push({ kind: "code", name: "Its pages and code", what: "Part of the site's copy, kept whole with it", size: code[x.study] });
  for (const [x, t] of thumbsOf) {
    const what = [t.pics && `${t.pics} ${t.pics === 1 ? "image" : "images"}`, t.previews && `${t.previews} ${t.previews === 1 ? "folder's" : "folders'"} previews`].filter(Boolean).join(", ");
    x.entries.push({ kind: "thumb", name: "Thumbnails", what: `Small pictures for the ${remote.label} dialog: ${what}`, size: t.size, del: () => Promise.all(t.dels.map((d) => d())) });
  }
  if (unused.dels.length) shared.entries.push({ kind: "other", name: "Older code", what: `${unused.dels.length} files no study uses now`, size: unused.size, del: () => Promise.all(unused.dels.map((d) => d())) });
  if (python.dels.length) shared.entries.push({ kind: "python", name: "Python itself", what: "Every study runs on it", size: python.size, del: () => Promise.all(python.dels.map((d) => d())) });
  if (site.files) shared.entries.push({ kind: "site", name: "The site itself", what: `${site.files} files, so it opens offline; deleting it deletes every study's pages too`, size: site.size + Object.values(code).reduce((a, b) => a + b, 0), del: site.del, held: true });
  const all = [...sections, shared];
  for (const x of all) x.entries.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.name.localeCompare(b.name));
  return { sections: all, settings, overhead };
}
// the Storage tab; fresh: just opened, every section folded, where a redraw after a deletion keeps what the user unfolded
function storageTab(fresh) { return work.during(listStorage(fresh), "the storage listing"); }
async function listStorage(fresh) {
  const list = $("#storage-list"), open = new Set(fresh ? [] : [...list.querySelectorAll(".group[open]")].map((g) => g.dataset.group));
  if (fresh) { list.textContent = "Reading what this device keeps…"; $("#storage-total").textContent = ""; }
  const { sections, settings, overhead } = await inventory();
  const held = () => { $("#storage-reload").hidden = false; $("#storage-msg").textContent = "The page still holds what you deleted until it reloads."; };
  const act = async (items, ask) => {
    if (ask && !confirm(ask)) return;
    for (const e of items) await e.del();
    if (items.some((e) => e.held)) held();
    storageTab(false);
  };
  let total = settings + overhead;
  const heading = (text) => Object.assign(document.createElement("h3"), { className: "storage-head", textContent: text });
  list.replaceChildren(...sections.flatMap((x, k) => {
    const items = x.entries, size = items.reduce((a, e) => a + e.size, 0), gone = items.filter((e) => e.del);
    total += size;
    const box = document.createElement("details"); box.className = "group"; box.dataset.group = x.id; box.open = open.has(x.id);
    box.innerHTML = `<summary><span class="title">${esc(x.title)}</span><span class="count">${items.length ? `${items.length} · ${sizeText(size)}` : x.study ? "Nothing of its own" : "Nothing kept"}</span></summary>`;
    if (x.mark) markOffline(box.querySelector(".title"), "study", true);
    // a study not available offline offers to make it so; one with a remote folder, to keep more of its images
    if (x.study && (!x.mark || x.folders)) {
      const make = Object.assign(document.createElement("button"), { type: "button", className: "link make-offline", textContent: "Make Available Offline" });
      make.onclick = (e) => { e.preventDefault(); offlineCopy.makeAvailable(x.study, () => storageTab(false)); };
      box.firstChild.append(make);
    }
    if (gone.length) {
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "link clear", textContent: "Clear cache" });
      const ask = x.study ? `Delete everything kept for ${x.title} on this device? What other studies use stays, and so do its pages, kept with the site.`
        : `Delete all ${gone.length} of "${x.title}" from this device?`;
      clear.onclick = (e) => { e.preventDefault(); act(gone, ask); };
      box.firstChild.append(clear);
    }
    const needs = x.folders ? "its Python and at least one of its images" : "its Python";
    const about = x.about || (x.mark ? `Available offline: ${needs} ${x.folders ? "are" : "is"} on this device.` : `Not available offline yet: it needs ${needs} on this device.`);
    box.append(Object.assign(document.createElement("p"), { className: "hint", textContent: about }));
    for (const e of items) {
      const row = document.createElement("div"); row.className = "entry"; row.dataset.name = e.name; row.dataset.kind = e.kind;
      row.innerHTML = `<span class="label"><span class="name"></span>${e.what ? '<span class="what"></span>' : ""}</span><span class="size">${sizeText(e.size)}</span>` +
        (e.del ? `<button type="button" class="del" title="Delete from this device" aria-label="Delete ${esc(e.name)} from this device">×</button>` : `<span class="del-none"></span>`);
      row.querySelector(".name").textContent = e.name;
      if (e.what) row.querySelector(".what").textContent = e.what;
      if (e.del) row.querySelector(".del").onclick = () => act([e], e.ask && `Delete everything kept for ${e.name}?`);
      box.append(row);
    }
    if (!x.study) return [heading("Shared"), box];
    return k === 0 ? [heading("Studies"), box] : [box];
  }));
  const est = await navigator.storage?.estimate?.().catch(() => null);
  showDisk(total);
  const link = Object.assign(document.createElement("button"), { type: "button", className: "link", id: "storage-settings", textContent: "Settings" });
  link.onclick = () => { $("#usage-dlg").close(); $("#open-settings").click(); };
  $("#storage-total").replaceChildren(`This site keeps ${sizeText(total)} on this device, ${sizeText(settings)} of it settings, which `, link, " clears" +
    (est?.quota ? `; the browser allows it up to ${sizeText(est.quota)}.` : "."));
  $("#storage-cache").textContent = "Not counted here: Python's files, about 50 MB, which the browser keeps in its own cache for 30 days. " +
    "The site can neither measure nor clear that cache; the browser's own \"clear browsing data\" for cached files does.";
}
// the menu's avatar lies over the header's: a click on it closes the menu, as one on the header's would
$("#who-avatar").onclick = () => { $("#user-menu").open = false; };
$("#manage-storage").onclick = () => { $("#user-menu").open = false; usage("storage"); };

// the settings kept on this device only, the shell's and the study on show's, each {key, label, size}; who is signed
// in is Sign out's to forget
function deviceSettings() {
  let keys = [];
  try { keys = Object.keys(localStorage); } catch { /* no storage */ }
  return keys.map((k) => {
    const label = OWN_SETTINGS[k] && !FOLLOWS.includes(k) && k !== SIGNED_IN && k !== AUTO_SAVE ? OWN_SETTINGS[k] : !OWN_SETTINGS[k] && study.stored?.(k)?.group === "settings" ? study.stored(k).what : null;
    return label && { key: k, label, size: sizeText(bytesOf(k)) };
  }).filter(Boolean).sort((a, b) => a.label.localeCompare(b.label));
}
// Settings (req/shell/account/settings): the settings that follow the user, as the shell keeps them, and those kept on this device only
const settings = settingsDialog({
  dialog: $("#settings-dlg"),
  fields: () => [
    { key: THEME, label: "Theme", kind: "choice", raw: true, fallback: "", options: [["", "Follow the system"], ["dark", "Dark"], ["light", "Light"]] },
    { key: THUMBS, label: `Show thumbnails in the ${remote.label} dialog`, kind: "toggle", on: "on", off: "off", fallback: "on" },
    { key: MEMORY_TIP, label: "Show the low-memory popup", kind: "toggle", on: false, off: true, fallback: false },
    { key: REMOTE_LINK, label: `Last ${remote.label} link`, kind: "text" },
    { key: REMOTE_LINKS, label: `Last ${remote.label} link in each study`, kind: "map" },
    { key: TIPS, label: "Tips you have seen (clear one to see it again)", kind: "set" },
    { key: RECENT, label: `Recent images from ${remote.label} (clear one to drop it)`, kind: "list", name: (r) => (r.study ? `${r.study}: ` : "") + (r.path?.length ? `${r.path.join("/")}/` : "") + r.name },
    { key: MOTION, label: "Animations", kind: "toggle", on: true, off: false, fallback: true },
    { key: UNLOAD_PYTHON, label: "Unload Python after each run", kind: "toggle", on: true, off: false, fallback: false },
    { key: RESOURCES, label: "Autohide the status bar's disk, memory, network and CPU", kind: "toggle", on: "auto", off: "open", fallback: "auto" },
    { key: SEEN_VERSION, label: "Version you saw last", kind: "text" },
    { key: AUTO_SAVE, label: `Auto-save images from ${remote.label}, on this device`, kind: "toggle", on: "on", off: "off", fallback: "on" },
    { key: "device-only", label: "Kept on this device only", kind: "device", entries: deviceSettings },
  ],
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => {
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode: this page only */ }
    signIn.changed(k);
  },
  where: () => signIn.kept(),
  saved: () => { reapply(); status("Saved your settings."); },
  cleared: () => { reapply(); status("Cleared what this device alone kept."); },
});
// the settings that follow the user, drawn again once the account's or the Settings dialog's have replaced this device's
function reapply() {
  let t = null;
  try { t = localStorage.getItem(THEME); } catch { /* no storage */ }
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  showMotion(); showUnloading(); showResources(); showRecent(); showAccess();
}
$("#open-settings").onclick = () => { $("#user-menu").open = false; settings.open(); };
$("#storage-reload").onclick = () => location.reload();
$("#usage-dlg").addEventListener("close", () => { $("#storage-msg").textContent = ""; });

// ---------- downloads and ground truth ----------
function saveFile(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  after(1000, () => URL.revokeObjectURL(a.href));
  calls.downloaded(name);
}
// the shell's icons, by name, as SVG markup: done, part, todo
const icon = (name) => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${$(`#icons .${name}`).innerHTML}</svg>`;
const { drawAnnotate, wantList, tasks, drawWaiting, algorithms, runsFirst, drawDownloads, ownFile, submitTruth } = analysisBox({ $, icon, outline, status, REPO, views, signIn, st, truth, stageAllows, data, showBoxes, log, restudyHeld, page, makesTruth, drawSteps, notice, readJSON,
  writeJSON, noteSaved, savedHere, esc, maySave, readStage, step, working, saveFile, get manifest() { return manifest; }, get steps() { return steps; },
  get view() { return view; }, get truthShown() { return truthShown; }, set truthShown(v) { truthShown = v; }, get memberIds() { return memberIds; },
  get listedReady() { return listedReady; }, get listing() { return listing; }, set listing(v) { listing = v; }, get listedFor() { return listedFor; },
  set listedFor(v) { listedFor = v; }, get storeList() { return storeList; }, set storeList(v) { storeList = v; }, get storeRows() { return storeRows; },
  set storeRows(v) { storeRows = v; }, get annotating() { return annotating; }, set annotating(v) { annotating = v; }, get study() { return study; },
  get viewing() { return viewing; }, set viewing(v) { viewing = v; }, get route() { return route; }, set route(v) { route = v; },
  get resume() { return resume; }, set resume(v) { resume = v; }, get lifetime() { return lifetime; }, get gtSession() { return gtSession; },
  get editBase() { return editBase; }, set editBase(v) { editBase = v; }, get studyTables() { return studyTables; } });
// whether the open image shows an Analysis File of the store read-only (req/shell/annotate/choice), which takes the place of the
// Items view
let truthShown = false;
// listedFor: what the store has said of the image open, by its SHA-256: sub, its subfolder's id or null for none, once its
// opening asked; mine, the user's own file there or null, once a listing read it; a save, or another opening, lets it go
let storeRows = new Map(), listing = 0, listedFor = null;
// the tables a study offers beside the analysis (req/shell/extractions/save): [{key, label, suffix, head(), rows()}], read as one is saved
let studyTables = [];

// ---------- problems: a report of what went wrong, from the status bar's icon or the avatar's menu, and whether the
// page supports this browser (req/shell/report/bug, req/shell/browsers/supported). The verdict is null until browsers.json
// is read: unknown, and the icon stays the plain one.
const thisBrowser = identify(navigator.userAgent, navigator.maxTouchPoints);
let browserVerdict = null, fullVersion = null;
calls.during("site", "the supported browsers", () => fetch(new URL("browsers.json", import.meta.url))).then((r) => r.json()).then(({ supported }) => {
  browserVerdict = verdict(thisBrowser, supported);
  if (browserVerdict.ok) return;
  const b = $("#sb-report");
  b.classList.add("unsupported"); b.setAttribute("aria-label", "Unsupported browser");
  b.title = `${browserVerdict.why} Click to report a problem.`;
}).catch((e) => console.warn("the list of supported browsers could not be read:", e));
// Chromium browsers give their full version only when asked, and the report is opened within the click, so asked now
const BRANDS = { Chrome: "Google Chrome", Edge: "Microsoft Edge", Opera: "Opera" };
navigator.userAgentData?.getHighEntropyValues(["fullVersionList"])
  .then((v) => { fullVersion = v.fullVersionList?.find((b) => b.brand === BRANDS[thisBrowser.name])?.version || null; }, () => {});
function browserText() {
  const name = thisBrowser.name || "An unknown browser", unsupported = browserVerdict && !browserVerdict.ok ? ", not supported" : "";
  return `${name} ${fullVersion || thisBrowser.version || ""} on ${thisBrowser.os}${unsupported} (${navigator.userAgent})`;
}
// the page's state as a report quotes it: never the image's name
function pageNow() {
  const im = page.get("image"), from = (s) => (remote.owns(s) ? remote.label : "this computer");
  return [
    ["Site version", VERSION],
    ["Study", manifest ? `${manifest.title} (${manifest.id}), stage ${manifest.stage ?? "none"}` : "none open"],
    ["Python", st.ready ? "ready" : st.worker ? "loading" : "not started"],
    ["Steps", steps.map((p) => p.name + (p.done ? " (done)" : "")).join(" → ") || "none"],
    ["Image", im ? `from ${from(im.source)}, ${im.W} × ${im.H} px, ${im.channels?.length ?? "?"} channel(s), ${im.Z} slice(s)` : page.get("opening") ? "opening" : "none open"],
    ["View", `${views.now}, ${manifest?.viewer || "no viewer"}`],
    ["Online", navigator.onLine ? "yes" : "no"],
    ["Signed in", $("#sign-out").hidden ? "no" : "yes"],
    ["Window", `${innerWidth} × ${innerHeight}, pixel ratio ${devicePixelRatio}`],
    ["Memory", navigator.deviceMemory ? `about ${navigator.deviceMemory} GB` : "not said by this browser"],
  ];
}
// the report says first where it goes: a public issue on GitHub, which needs an account there (req/shell/report/bug). It is
// made as it is asked for, so the actions it quotes end with the asking
let reporting = null;
function reportProblem() {
  $("#user-menu").open = false;
  reporting = problemUrl({ repo: REPO, browser: { text: browserText(), supported: browserVerdict?.ok !== false }, state: pageNow(),
    actions: log.last(ACTIONS_QUOTED, "action"), errors: log.last(ERRORS_QUOTED, "error") });
  $("#report-dlg").showModal();
}
$("#report-cancel").onclick = () => $("#report-dlg").close();
$("#report-go").onclick = () => { $("#report-dlg").close(); window.open(reporting, "_blank", "noopener"); };
$("#sb-report").onclick = reportProblem;
$("#report-problem").onclick = reportProblem;

// ---------- notices: a short message, at the top of the view ----------
function notice(text, { signOut = false } = {}) {
  $("#notice-text").textContent = text; $("#notice").hidden = false;
  $("#notice-sign-out").hidden = !signOut;
  $("#notice-ok").focus();
}
$("#notice-ok").onclick = () => { $("#notice").hidden = true; };
$("#notice-sign-out").onclick = () => { $("#notice").hidden = true; $("#sign-out").click(); };

// ---------- the left bar's boxes ----------
// Load, Analysis and Summary (req/shell/left-bar/folding): a box waits, folded to its title and inert, until the stage before it
// is done, opens as that ends, and between those stays as the user left it; Load folds once an image is in.
const boxes = () => document.querySelectorAll(".box.foldable");
const waits = (b) => (b.id === "analysis-box" ? !page.get("image") : b.id === "summary-box" ? !page.get("image") || !hasModel() : false);
function drawBoxes() {
  for (const b of boxes()) {
    const w = waits(b), was = b.classList.contains("waits");
    if (w) b.classList.add("folded"); else if (was) b.classList.remove("folded");
    b.classList.toggle("waits", w);
    const h = b.querySelector(":scope > .sec-head h2");
    h.setAttribute("aria-disabled", String(w)); h.tabIndex = w ? -1 : 0;
  }
}
function unfoldFirst() { boxes().forEach((b) => b.classList.toggle("folded", waits(b))); drawBoxes(); }
// an image just in: the Load box folds, but for a preview, Load Original being what comes next, and a study with no step after it
function foldLoad() {
  if (!SETUP && st.source?.kind !== "preview" && steps.length > 1) $("#image-box").classList.add("folded");
}
// a Markdown outline drawn as HTML: paragraphs split by blank lines, "- " or "1. " items nested by their indent
function outline(text) {
  const out = document.createDocumentFragment();
  for (const para of text.split(/\n\s*\n/)) {
    const lists = []; // the open lists, outermost first: {indent, el}
    for (const line of para.split("\n").filter((l) => l.trim())) {
      const m = line.match(/^(\s*)(-|\d+\.)\s+(.*)$/);
      if (!m) { const p = document.createElement("p"); p.textContent = line.trim(); out.append(p); lists.length = 0; continue; }
      const indent = m[1].length, tag = m[2] === "-" ? "UL" : "OL";
      while (lists.length && lists.at(-1).indent > indent) lists.pop();
      if (lists.length && lists.at(-1).indent === indent && lists.at(-1).el.tagName !== tag) lists.pop();
      if (!lists.length || lists.at(-1).indent < indent) {
        const el = document.createElement(tag);
        (lists.length ? lists.at(-1).el.lastElementChild : out).append(el);
        lists.push({ indent, el });
      }
      const li = document.createElement("li"); li.textContent = m[3]; lists.at(-1).el.append(li);
    }
  }
  return out;
}
// A drawer opening or folding slides, and those below it slide to their new places: the stylesheet's motion, each
// drawer a shape of its own, clipped to the left bar, so a browser that cannot clip one changes them at once
function slide(change) {
  if (still() || !document.startViewTransition || !CSS.supports("view-transition-group", "contain")) return change();
  const root = document.documentElement, all = [...document.querySelectorAll("#left > .box")];
  all.forEach((b, k) => { b.style.viewTransitionName = "drawer-" + k; });
  root.dataset.drawers = "";
  const t = document.startViewTransition(change);
  t.ready.catch(() => {}); // cut short, the drawers have still moved: only the motion is lost
  t.finished.finally(() => { all.forEach((b) => { b.style.viewTransitionName = ""; }); delete root.dataset.drawers; });
}
function foldable() {
  document.querySelectorAll(".box.foldable > .sec-head h2").forEach((h) => {
    h.tabIndex = 0; h.setAttribute("role", "button");
    const box = h.closest(".box"), flip = () => { if (!box.classList.contains("waits")) slide(() => box.classList.toggle("folded")); };
    // folded, the whole drawer opens it; open, only its title folds it
    box.onclick = (e) => { if (box.classList.contains("folded") || h.contains(e.target)) flip(); };
    h.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
  });
  unfoldFirst();
}
// the empty view's word for the project, one of these chosen on each visit (req/shell/image/idle): text, and the words
// of it that link to the project on GitHub
const PLUGS = [
  ["Did you Star this project on GitHub yet?", "Star this project on GitHub"],
  ["Have you told your supervisor, colleagues, friends and, most importantly, family about RaunTruth?"],
  ["RaunTruth is open source. Star it on GitHub so the next lab finds it too.", "Star it on GitHub"],
  ["Found it useful? Tell the colleague at the next bench."],
];
{
  const [text, linked] = PLUGS[Math.floor(Math.random() * PLUGS.length)], at = linked ? text.indexOf(linked) : -1, p = $("#plug");
  if (at < 0) p.textContent = text;
  else p.append(text.slice(0, at), Object.assign(document.createElement("a"), { href: `https://github.com/${REPO}`, target: "_blank", rel: "noopener", textContent: linked }), text.slice(at + linked.length));
}
// a menu a study puts in the toolbar is greyed out whole while no image is open (req/shell/image/idle)
// and one a study moves out of it is its own again
function toolbarMenus() {
  for (const m of document.querySelectorAll("#view .toolbar details.menu, details.menu[aria-disabled]")) {
    const off = !page.get("image") && !!m.closest("#view .toolbar");
    m.inert = off; if (off) { m.setAttribute("aria-disabled", "true"); m.open = false; } else m.removeAttribute("aria-disabled");
  }
}
page.watch("image", toolbarMenus);
// the image back in view, from whichever of the study's views is on show
function showImage() { study.showImage?.(); view.minimapView(); }

// ---------- the left bar and theme ----------
// the left bar takes the width it is dragged to, never narrower than its narrowest; a double click puts it back.
// It stays open (req/shell/left-bar/static).
{
  const lay = $("#layout"), saved = readJSON(BARS), g = $("#gutter-left"), bar = $("#left");
  const MIN = 200;
  const set = (w) => {
    if (w == null) { lay.style.removeProperty("--lw"); return; }
    lay.style.setProperty("--lw", Math.round(Math.max(MIN, Math.min(w, innerWidth * 0.4))) + "px");
  };
  set(saved.left);
  g.addEventListener("pointerdown", (e) => {
    const was = saved.left, over = () => document.body.classList.remove("resizing");
    document.body.classList.add("resizing");
    drag(g, e, {
      move: (ev) => { saved.left = Math.max(MIN, ev.clientX - bar.getBoundingClientRect().left); set(saved.left); view?.minimapView(); },
      drop: () => { over(); writeJSON(BARS, saved); },
      cancel: () => { over(); if (was == null) delete saved.left; else saved.left = was; set(saved.left); view?.minimapView(); },
    });
  });
  g.addEventListener("dblclick", () => { delete saved.left; set(null); writeJSON(BARS, saved); view?.minimapView(); });
}

function theme() {
  const set = document.documentElement.dataset.theme;
  return set || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}
$("#theme").onclick = () => {
  const t = theme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME, t); } catch { /* private mode: lasts for this page only */ }
  signIn.changed(THEME);
};
// a dropdown closes when the user clicks anywhere else
document.addEventListener("click", (e) => { document.querySelectorAll("details.menu[open]").forEach((m) => { if (!m.contains(e.target)) m.open = false; }); });

// ---------- the version ----------
// the release stamps the version into the page's <meta name="version">; the status bar shows it
const VERSION = $("#site-version").title.replace(/^version /, "");
$("#sb-version").textContent = "v" + VERSION;
// every 5 minutes while the tab is shown, compare this page's version with the one now published; a newer one
// lights up the version box, which then reloads the page when clicked
{
  const v = $("#sb-version");
  const check = async () => {
    try {
      const html = await (await fetch(location.pathname, { cache: "no-store" })).text();
      const live = ((html.match(/id="site-version" title="version ([^"]*)"/) || [])[1]);
      if (!live || live === VERSION || v.classList.contains("stale")) return;
      v.classList.add("stale"); v.textContent = "Refresh for v" + live;
      v.title = `This page is v${VERSION}; v${live} is out. Click to refresh.`;
    } catch { /* offline: try again next time */ }
  };
  every(5 * 60 * 1000, check);
  addEventListener(CONNECTION, (e) => { if (e.detail.online) check(); });
}

// Version history: the version box opens it; after an update, a bubble points at the box
const build = (version) => Number(String(version).split(".").pop());
const releaseDay = (version) => { // the middle part is years since 2025, then month and day
  const m = String(version).split(".")[1]?.match(/^(\d+)(\d\d)(\d\d)$/);
  return m ? new Date(Date.UTC(2025 + Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
};
let historyLoad = null;
const loadHistory = () => historyLoad ||= calls.during("site", "the version history", () => fetch("version_history.json", { cache: "no-cache" }))
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
async function showHistory(since) {
  const list = $("#history-list");
  list.textContent = "Loading…";
  $("#history-dlg").showModal();
  let releases;
  try { releases = await loadHistory(); } catch { historyLoad = null; list.textContent = "The version history could not be loaded. Please try again later."; return; }
  list.replaceChildren();
  if (since) list.append(Object.assign(document.createElement("p"), { className: "since", textContent: `New since v${since}, the version you saw last:` }));
  for (const r of releases) {
    const sec = document.createElement("section"), h = document.createElement("h3"), ul = document.createElement("ul");
    h.append("v" + r.version);
    const day = releaseDay(r.version);
    if (day) h.append(Object.assign(document.createElement("span"), { className: "date", textContent: day.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) }));
    if (since && build(r.version) > build(since)) h.append(Object.assign(document.createElement("span"), { className: "tag", textContent: "New" }));
    for (const c of r.changes) ul.append(Object.assign(document.createElement("li"), { textContent: c }));
    sec.append(h, ul); list.append(sec);
  }
}
{
  const v = $("#sb-version"), bubble = $("#whats-new");
  const seen = readJSON(SEEN_VERSION, null);
  const dismiss = () => { bubble.hidden = true; writeJSON(SEEN_VERSION, VERSION); };
  v.onclick = () => {
    if (v.classList.contains("stale")) return location.reload();
    const since = bubble.hidden ? null : seen;
    if (!bubble.hidden) dismiss();
    showHistory(since);
  };
  $("#whats-new-open").onclick = () => { dismiss(); showHistory(seen); };
  $("#whats-new-x").onclick = dismiss;
  if (!seen) writeJSON(SEEN_VERSION, VERSION); // a first visit has nothing to compare with
  else if (seen !== VERSION && build(VERSION) > build(seen)) {
    // only an update that changed something the history names earns the bubble
    loadHistory().then((releases) => {
      if (!releases.some((r) => build(r.version) > build(seen))) return writeJSON(SEEN_VERSION, VERSION);
      $("#whats-new-open").textContent = `Click here to see what was updated since v${seen}.`;
      bubble.hidden = false;
    }).catch(() => { historyLoad = null; /* no history to point at: ask again on the next visit */ });
  }
}

// an animation out of view is paused: Chrome keeps drawing every frame for one scrolled out of sight
const inView = new IntersectionObserver((seen) => { for (const e of seen) e.target.classList.toggle("offscreen", !e.isIntersecting); });
document.addEventListener("animationstart", (e) => inView.observe(e.target));

// ---------- the study ----------
// The page's own folder: a study's address is its id there, the default study's the folder itself. An
// address from before paths, ?study=<id>, names the same study.
const HOME = new URL("./", import.meta.url).pathname;
function studyOf(loc) {
  if (SETUP) return new URLSearchParams(loc.search).get("study") || DEFAULT_STUDY;
  const rest = decodeURIComponent(loc.pathname.startsWith(HOME) ? loc.pathname.slice(HOME.length) : "").replace(/\.html$/, "");
  return (rest && rest !== "index" ? rest : new URLSearchParams(loc.search).get("study")) || DEFAULT_STUDY;
}
const studyAddress = (id) => (id === DEFAULT_STUDY ? HOME : HOME + encodeURIComponent(id));
// where a study is switched to: its own page, or on Study Setup's page its setup
const addressOf = (id) => (SETUP ? `${HOME}setup?study=${encodeURIComponent(id)}` : studyAddress(id));

// Who sees a study (shell/study/members): whoever the store lets read its root. The studies the build lists, each with its
// root's id (null for none), and the ids of those the signed-in user can read, asked of the store in one batch request per load; while the
// token has run out or the store does not answer, the ids it last gave this user, marked stale; null while none is known.
let listed = [], memberIds = null, memberStale = false, asking = null;
async function readMembers() {
  if (setupOffline()) return;
  if (!signIn.signedIn()) { asking = null; memberIds = null; memberStale = false; return; }
  const last = signIn.learned("members");
  if (!signIn.token()) { memberIds = last; memberStale = true; return; }
  if (!listed.some((s) => s.root)) return;
  const key = [signIn.email(), signIn.token(), ...listed.map((s) => s.root)].join();
  if (asking?.key !== key) {
    asking = { key, done: members(remote, listed).then((ids) => { signIn.learn("members", ids); memberIds = ids; memberStale = false; },
      (e) => { console.warn("who may open which study was not read:", e); memberIds = last; memberStale = true; }) };
  }
  await asking.done;
}
// The header's switcher, after GitHub's repository switcher: every study the build lists that the user may see, each a
// link to its address, found by typing; the arrow keys mark one, Enter opens it. A plain click swaps it in place.
let listFetched = Promise.resolve(), listedReady = Promise.resolve();
function studyMenu() {
  listFetched = (async () => {
    try { listed = await (await calls.during("site", "the list of studies", () => fetch(HOME + "studies.json", { cache: "no-cache" }))).json(); } catch (e) { console.warn("no list of studies:", e); }
  })();
  listedReady = (async () => { await listFetched; await readMembers(); drawStudies(); })().catch((e) => console.warn("the study list was not drawn:", e));
}
// why a study may not be opened here, or null: signed in, its root is not one the account can read; signed out, its root is members-only
async function refusal(m) {
  await listFetched;
  if (setupOffline()) return null;
  const root = listed.find((x) => x.id === m.id)?.root;
  if (!root || released(m.stage)) return null;
  if (signIn.signedIn()) {
    await listedReady;
    if (!memberIds) return null;
    return memberIds.includes(m.id) ? null : `${signIn.email()} cannot open this study: ${remote.short} does not let that account read it. Sign out to see what is open to everyone, or sign in with an account that can.`;
  }
  try { return (await remote.publicly(root)) === false ? "That study is not open right now." : null; } catch (e) { console.warn("whether the study is open was not asked:", e); return null; }
}
function drawStudies() {
  // the study on show is listed by its stage as the page reads it, the build's list holding its study.json's
  const shown = listed.find((s) => s.id === manifest?.id);
  if (shown && manifest.stage) shown.stage = manifest.stage;
  $("#study-stale").hidden = !(signIn.signedIn() && memberStale && memberIds);
  $("#study-stale").textContent = `The list is as ${remote.short} last said: it renews when you click and the sign-in lets the page ask again.`;
  $("#study-list").replaceChildren(...listed.filter((s) => offers(s, { signedIn: signIn.signedIn(), ids: memberIds })).map((s) => {
    const a = document.createElement("a");
    a.href = addressOf(s.id); a.dataset.id = s.id;
    a.innerHTML = `<span class="name"></span><span class="stage-tag"></span>`;
    a.querySelector(".name").textContent = s.title;
    a.prepend(...studyIcon(s.id, s.icon));
    const tag = a.querySelector(".stage-tag");
    stageTag(tag, s.stage); stageHover(tag);
    a.onclick = (e) => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); goTo(s.id);
    };
    a.onmouseenter = () => mark(a);
    return a;
  }));
  markCurrent();
  if (manifest) showStage();
}
const glyph = (n) => `<svg class="${n}-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${$(`#icons .${n}`).innerHTML}</svg>`;
// a study's own icon (its study.json's, relative to its folder), the generic one standing while it is missing or fails to load
function studyIcon(id, icon) {
  const generic = Object.assign(document.createElement("template"), { innerHTML: glyph("study") }).content.firstChild;
  if (!icon) return [generic];
  const img = Object.assign(new Image(16, 16), { className: "study-icon", alt: "", hidden: true });
  img.onload = () => { img.hidden = false; generic.setAttribute("hidden", ""); };
  img.onerror = () => img.remove();
  img.src = new URL(`../studies/${id}/${icon}`, location.origin + HOME).href;
  return [generic, img];
}
const rows = () => [...$("#study-list").children].filter((a) => !a.hidden);
function mark(a) { for (const r of $("#study-list").children) r.classList.toggle("active", r === a); }
function markCurrent() {
  for (const a of $("#study-list").children) {
    if (a.dataset.id === manifest?.id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
}
function filterStudies() {
  const q = $("#study-search").value.trim().toLowerCase();
  for (const a of $("#study-list").children) a.hidden = !!q && !a.querySelector(".name").textContent.toLowerCase().includes(q);
  $("#study-none").hidden = rows().length > 0;
  mark(rows().find((a) => a.hasAttribute("aria-current")) || rows()[0]);
}
$("#study-menu").addEventListener("toggle", () => {
  if (!$("#study-menu").open) { mark(null); if (stagePop.matches(":popover-open")) stagePop.hidePopover(); return; }
  offlineCopy.available().then((ids) => { for (const a of $("#study-list").children) markOffline(a, "study", ids.has(a.dataset.id)); }, () => {});
  $("#study-search").value = ""; filterStudies(); $("#study-search").focus();
});
$("#study-request").href = `https://github.com/${REPO}/issues/new?template=${STUDY_REQUEST}`;
$("#study-search").oninput = filterStudies;
$("#study-search").onkeydown = (e) => {
  const list = rows(), at = list.findIndex((a) => a.classList.contains("active"));
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (list.length) mark(list[(at + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length]);
  } else if (e.key === "Enter") {
    e.preventDefault(); const a = list[at] || list[0]; if (a) goTo(a.dataset.id);
  } else if (e.key === "Escape") {
    $("#study-menu").open = false; $("#study-menu summary").focus();
  }
};

// One study at a time: the one the address names. Switching pushes the new address and swaps the study in
// place; Back and Forward swap too. Swaps run one after another, each to wherever the address is by then.
let swapping = Promise.resolve();
function goTo(id) {
  $("#study-menu").open = false;
  if (studyOf(location) === id || !gtSession.leaving("choose another study")) return;
  history.pushState(null, "", addressOf(id));
  swap();
}
addEventListener("popstate", () => swap());
// the network back: a study whose Python could not load loads again, on a Python of its own, since a worker
// keeps a module it failed to download failed; and the storage it then kept shows
addEventListener(CONNECTION, (e) => {
  // the page's offline class follows this event, so what is asked of the store waits for it
  if (SETUP && e.detail.online && manifest) queueMicrotask(() => { readRoles().then((r) => { storeRoles = r; showAccess(); }); readMembers().then(drawStudies); });
  // the network gone: a file of Python's that failed before the page was told so failed for that, and the study says it
  if (!e.detail.online) { if (st.unkept && !st.worker) notHere(); return; }
  offlineCopy.keepSite().then(diskBar, () => {});
  if (!st.worker) keepPython();
  if (!st.failed || st.ready || !st.worker || !manifest) return;
  st.failed = false; status("Loading Python in the background…"); pythonLoads(true);
  pythonWorker();
});
function swap() {
  swapping = swapping.then(async () => {
    const id = studyOf(location), was = manifest?.id;
    if (id === was) return;
    // a study whose file cannot be read does not come in, and the one on show stays, at its own address
    let read;
    if (was) {
      try { if (!/^[\w-]+$/.test(id) || !(read = await calls.during("site", "the study", () => fetch(`../studies/${id}/study.json`))).ok) throw new Error(`no study "${id}"`); } catch (e) {
        history.replaceState(null, "", addressOf(was) + location.hash);
        return status("Error: " + (e.message || e), true);
      }
    }
    annotating = false; route = null; resume = null; editBase = null;
    dropImage();
    leaveStudy();
    try {
      await mountStudy(id, read);
    } catch (e) { return status("Error: " + (e.message || e), true); }
    status(READY);
    // Python, not started, starts on this study at its first Run; its files are kept meanwhile
    if (!st.worker) return keepPython();
    pythonLoads(true);
    st.worker.postMessage({ type: "study", id: manifest.id });
  });
}

// the study's panels, put into the shell's slots, and its stylesheet: what leaves with it
let lifetime = new AbortController(), mounted = [], css = null;
// its panels go into the shell's slots, its stylesheet beside the shell's, then its module mounts
// counted as the page's work until the study is in, its steps drawn
let studyIn = Promise.resolve();
// read: its study.json's answer, where the caller has it already
const mountStudy = (id, read) => (studyIn = work.during(mountNow(id, read), `study ${id} coming in`));
async function mountNow(id, read) {
  if (!/^[\w-]+$/.test(id)) throw new Error(`no study "${id}"`);
  base = `../studies/${id}/`;
  const r = read ?? await calls.during("site", "the study", () => fetch(base + "study.json"));
  if (!r.ok) throw new Error(`no study "${id}"`);
  manifest = await r.json();
  // what the study's file sets in the shell's own controls, drawn before the store is asked anything (req/shell/load/from)
  $("#file").accept = manifest.files.accept; placeLoad();
  const no = await refusal(manifest);
  if (no) {
    manifest = null;
    history.replaceState(null, "", addressOf(DEFAULT_STUDY));
    await mountNow(DEFAULT_STUDY);
    return notice(no, { signOut: signIn.signedIn() });
  }
  data.mount(manifest);
  storeRoles = await readRoles();
  manifest.stage = await readStage(); data.stageChanged();
  if (listed.find((s) => s.id === manifest.id)?.stage !== manifest.stage) drawStudies();
  document.title = SETUP ? `Study Setup · ${manifest.title}` : manifest.title; $("#title").textContent = manifest.title; $("#title-icon").replaceChildren(...studyIcon(id, manifest.icon)); markCurrent();
  // the study's article (req/shell/study/article)
  $("#article-link").hidden = !manifest.article; if (manifest.article) $("#article-link").href = manifest.article; else $("#article-link").removeAttribute("href");
  log.add(`Opened the study “${manifest.title}”`);
  $("#favicon").href = manifest.icon ? base + manifest.icon : new URL("icon.svg", import.meta.url).href;
  if (manifest.web.style) { css = document.createElement("link"); css.rel = "stylesheet"; css.href = base + manifest.web.style; document.head.append(css); }
  if (manifest.web.panels) {
    const panels = new DOMParser().parseFromString(await (await calls.during("site", "the study's panels", () => fetch(base + manifest.web.panels))).text(), "text/html");
    for (const t of panels.querySelectorAll("template[data-slot]")) {
      const nodes = [...document.importNode(t.content, true).childNodes];
      for (const n of nodes) if (n.nodeType === 1) n.dataset.studyPanel = "";
      $(`slot-here[data-slot-for="${t.dataset.slot}"]`).before(...nodes); mounted.push(...nodes);
    }
  }
  studyBoxes();
  unfoldFirst(); // before the first paint with them, so they do not fold in view
  view = viewers[manifest.viewer] ||= VIEWERS[manifest.viewer](shell);
  for (const v of new Set(Object.values(viewers))) v.active?.(v === view);
  view.channels(manifest.channels);
  views.mount();
  algorithms.mount(manifest, base, lifetime.signal);
  keys.mount(manifest.actions, lifetime.signal);
  gtSession.mount(manifest.groundTruth?.actions ? await import(base + manifest.groundTruth.actions) : null);
  // the Summary box follows whether the image carries a model
  gtSession.api.on(() => showBoxes(), lifetime.signal); showBoxes();
  tasks.mount(manifest.groundTruth?.areas);
  // the colour of Edit History's ring, where the study's image or marks carry the shell's
  if (manifest.groundTruth?.ring) $("#view").style.setProperty("--gt-ring", manifest.groundTruth.ring);
  const mod = await import(base + manifest.web.module);
  study = (await mod.mount(shell)) || {};
  toolbarMenus();
  view.use(study);
  showStage();
  truth.draw();
  makeSteps();
  foldable();
  showRecent();
  showAccess();
}
// What the study fills of the left bar's boxes (req/shell/left-bar/shells): in the Analysis box its processing, from Start on, and
// its Analysis Tasks, while the user annotates; the Summary box, which waits until the image carries a model. A box the study
// puts nothing in is not shown.
const STUDY_BOXES = { processing: "#processing-box", tasks: "#tasks-box", summary: "#summary-box" };
// whether the image open carries a model: the log's, one a store's Analysis File shows, or, for a study keeping no GT actions, always
const hasModel = () => !!viewing || !gtSession.on() || !!gtSession.api.model();
function showBoxes() {
  if (!manifest) return;
  const filled = (sel) => !!$(sel).querySelector("[data-study-panel]");
  $("#processing-box").hidden = !filled("#processing-box") || !page.get("image") || route !== "scratch";
  $("#tasks-box").hidden = !filled("#tasks-box") || !makesTruth();
  $("#summary-box").hidden = !filled("#summary-box");
  $("#analysis-box").hidden = !(filled("#processing-box") || filled("#tasks-box") || runsFirst() || stageAllows("annotate"));
  drawDownloads();
  drawBoxes(); drawSteps();
  summaryFollows();
}
function studyBoxes() { showBoxes(); summaryRedrawn(); gtSession.paint(); }
const viewers = {};
const { summaryCsv, summaryMasks, summaryFollows, summaryRedrawn } = summaryBox({ $, st, page, waits, saveFile, drag, readJSON, writeJSON, views,
  get manifest() { return manifest; }, get view() { return view; } });
// the keyboard's actions, the study's and the viewers', and their legend at the image's bottom left (req/shell/image/keys)
const keys = actions($("#image-view").appendChild(Object.assign(document.createElement("div"), { id: "keys-legend", className: "keys-legend" })));
// the tagger's GT actions on the image open, their Undo, Redo, Save Draft and Load draft (req/shell/ground-truth/history)
const gtDrafts = truthDrafts();
const gtSession = truthHistory({ $, drafts: gtDrafts, keys, dragging, status, notice, makesTruth, viewer: () => view, remoteLabel: () => remote.label, readJSON, writeJSON,
  image: () => (st.img ? { name: st.fileName, sha256: st.sha, width: st.W, height: st.H } : null), studyId: () => manifest?.id,
  // offline there is nothing to ask the store
  submission: () => (document.documentElement.classList.contains("offline") ? Promise.resolve(null)
    : ownFile()), readSubmission: (id) => truth.read(id),
  version: () => ({ site: VERSION || null, code: studyCode }), drawn: () => drawAnnotate(),
  // where the work on show now comes from, which the Analysis box says
  took: (from) => { if (annotating && (route === "local" || route === "stored")) { route = from; drawAnnotate(); } } });
// The study on show leaves: its panels, stylesheet, drawing, listeners and state go, and its Python's late
// answers are dropped.
function leaveStudy() {
  for (const asked of pyCalls) asked.left = true;
  // tagging ends while the study's panels are still there for it to put away
  tasks.tagging(false);
  lifetime.abort(); lifetime = new AbortController(); truthShown = false;
  truth.leave(); algorithms.leave(); summaryCsv.clear(); summaryMasks.left();
  for (const n of mounted.splice(0)) n.remove();
  for (const sel of Object.values(STUDY_BOXES)) $(sel).hidden = true;
  studyTables = []; drawDownloads();
  css?.remove(); css = null;
  $("#view").style.removeProperty("--gt-ring"); if (!$("#view").getAttribute("style")) $("#view").removeAttribute("style");
  study = {}; manifest = null; view?.use({}); view?.leave();
  for (const k of Object.keys(st)) if (!SHELL_STATE.has(k)) delete st[k];
  for (const k of SHELL_STATE) if (!PYTHON_STATE.includes(k)) st[k] = ST_LOADED[k];
  for (const w of Object.values(waiting)) w.splice(0).forEach((x) => x.bad(Object.assign(new Error("the study left"), { cancelled: true })));
  busy(false); $("#notice").hidden = true; $("#tip").hidden = true;
  $("#image-view").hidden = false; delete $("#view").dataset.view; $("#switch").hidden = true; views.now = "image";
  tasks.leave(); gtSession.leave(); remoteLeft();
  restoreLoaded();
}

const shell = {
  $, state: st, page, drag, still, status, busy: studyBusy, statusBar, step, notice, slow, until, call, readJSON, writeJSON, esc, saveFile, submitTruth, icon, remote,
  showImage, outline,
  // a stack shows as its slices flattened, with no 3D view (req/setup/image)
  flatOnly: SETUP,
  views: { show: (v) => views.show(v), on: (fn) => views.on(fn), count: (total) => views.count(total), get now() { return views.now; } },
  tasks, algorithm: algorithms.api,
  // the study's GT actions (req/shell/ground-truth/history): act(action), ran({algorithm, output}), model(), document(), count(), on(fn(model, why), signal)
  gt: gtSession.api,
  // the study's summary for Download Summary (req/shell/summary/download): set({over, rows}), or set(null)
  summary: summaryCsv.api,
  // the study's own tables offered by Download Analysis (req/shell/extractions/save): set([{key, label, suffix, head(), rows()}]), or set(null)
  tables: { set(list) { studyTables = Array.isArray(list) ? list : []; drawDownloads(); } },
  // the summary's mask (req/shell/summary/mask): polygons(), inside(x, y), on(fn, signal)
  mask: summaryMasks.api,
  // the study's declared actions (req/shell/image/keys): handle({id: fn(phase, {event, control})}), report({state: value});
  // add(spec), a viewer's own
  actions: { ...keys.api, add: keys.add, refresh: keys.refresh },
  get viewer() { return view; }, get study() { return manifest; }, get signal() { return lifetime.signal; }, get makesTruth() { return makesTruth(); },
};
const offlineCopy = offline({ $, esc, sizeText, remote, throttled, throttle, stored: () => diskBar(),
  kept: async (id) => !!(await caches.open(IMAGES).then((c) => c.match(imageUrl(id)), () => null)), keep: saveImage,
  // the studies at least one kept image was kept in
  keptIn: async () => {
    const c = await caches.open(IMAGES).catch(() => null), out = new Set();
    for (const q of c ? await c.keys() : []) { const s = (await c.match(q))?.headers.get(IMAGE_STUDY); if (s) out.add(s); }
    return out;
  } });
// What a batch run asks of the page (req/setup/batch): the study's first step run on one image as the main app runs it, and the
// document that makes, as a person's extraction would be, with no person's name on it. The rest of a batch is Study Setup's.
const batchRunner = {
  // whether the study can be run over its images: it keeps GT actions and has a first step to press
  get able() { return !!manifest && gtSession.on() && !!manifest.phases?.[0]?.button; },
  // the study's algorithms, once listed
  list: async () => { await algorithms.api.ready; return algorithms.api.list; },
  // Python started, and the study's code version as a run records it, null where Python did not tell
  async version() { await pythonReady(); return studyCode; },
  // the document of the study's first step run on the image `source` names, with algorithm chosen; signal ends the wait
  async run(source, algorithm, signal) {
    const step = manifest.phases[0], button = $(step.button);
    let name = source.name, bytes;
    const kept = await savedImage(source.id);
    if (kept) ({ name, bytes } = kept);
    else {
      if (throttled()) throw new Error(remote.words.throttled);
      try { ({ name, bytes } = await remote.file(source.id, source.name)); } catch (e) { if (e.throttled) throttle(); throw e; }
    }
    algorithms.api.choose(algorithm);
    await openBytes(name, bytes, source);
    if (page.get("image")?.source !== source) throw new Error(`${name} was not opened, so ${step.name} did not run on it.`);
    if (button.disabled) throw new Error(`${step.name} is not available on ${name}.`);
    const stop = new AbortController();
    const ended = new Promise((ok, bad) => {
      gtSession.api.on((_, why) => { if (why === "run") ok(); }, stop.signal);
      runFailed = bad;
      signal?.addEventListener("abort", () => bad(new Error("The batch was stopped.")), { once: true });
    });
    button.click();
    try { await ended; } finally { stop.abort(); runFailed = null; }
    return { ...(await gtSession.fileDoc()), created: new Date().toISOString(), image: { name, sha256: st.sha, ...remote.cite(source) } };
  },
};
// what Study Setup's script (setup.js) builds Data Management from (req/setup/data): the shell's sign-in, store, place, viewer
// and left bar, lent as they are
export const lent = {
  batchRunner, stageAllows, setStage, readStage, saveFile, calls,
  $, esc, sizeText, still, status, remote, account: signIn, place, working, sha256, savedImage, folderPreviews, throttle,
  page, views, summaryMasks, st, drawBoxes, loadOriginal, minimapView: () => view?.minimapView(),
  studyId: () => manifest?.id ?? null,
  // the image itself, by its id, is open
  originalOpen: (id) => !!st.source && st.source.id === id && st.source.kind !== "preview" && !!page.get("image"),
  openBytes: (name, bytes, source) => openBytes(name, bytes, source),
};
// the image itself, for the preview on show: the copy kept on this device, else downloaded from the remote store
async function loadOriginal(source) {
  if (!source?.id) return;
  const kept = await savedImage(source.id);
  const opened = remote.source(source.id, { name: source.name, folder: source.folder });
  if (kept) { peek()(kept.bytes, kept.bytes.byteLength); return openBytes(kept.name, kept.bytes, opened); }
  if (document.documentElement.classList.contains("offline")) return notice("This image is not kept on this device, and needs the internet: you are offline.");
  if (throttled()) return notice(remote.words.throttled);
  const mb = (n) => (n / 1048576).toFixed(1);
  let push;
  try {
    const f = await remote.file(source.id, source.name, (n) => { push = peek(); busy(true, `Downloading ${n}…`, "peek"); },
      (buf, got, total) => { push(buf, got); $("#busy-text").textContent = `Downloading ${source.name} · ${mb(got)}${total ? " of " + mb(total) : ""} MB`; });
    if (autoSave()) saveImage(source.id, f.name, f.bytes, { study: manifest.id });
    picture(source.id, f.name, f.bytes);
    openBytes(f.name, f.bytes, opened);
  } catch (e) {
    busy(false);
    if (e.throttled) throttle();
    status("Error: " + (e.message || e), true);
  }
}
$("#load-original").onclick = () => { signIn.renew(); loadOriginal(page.get("image")?.source); };

// the sign-in popup on opening the page (req/shell/account/welcome); the menu's Sign in and Sign out answer it too
const welcomed = welcome({ dialog: $("#welcome-dlg"), account: signIn, avatar: $("#user-menu summary"), tip });
$("#sign-in").addEventListener("click", () => { welcomed.chose(); closeTip("sign-in"); });
$("#sign-out").addEventListener("click", () => welcomed.forgot());
$("#user-menu").addEventListener("toggle", () => { if ($("#user-menu").open) closeTip("sign-in"); });
// for the page's tests, which drive it from outside
window.st = st; window.$ = $; window.shellForTests = { saveThumb, page, work, calls, mask: summaryMasks.api, get viewer() { return view; }, get steps() { return steps.map(({ key, name, done }) => ({ key, name, done })); } };

// an old address, ?study=<id> or index.html, becomes the study's own
if (!SETUP && (new URLSearchParams(location.search).has("study") || location.pathname.endsWith("/index.html"))) history.replaceState(null, "", addressOf(studyOf(location)) + location.hash);
studyMenu();
remoteDialog();
// the study the address names comes in as the first of the swaps: one asked for meanwhile waits until it is in
const first = mountStudy(studyOf(location));
swapping = first.catch(() => {});
first.then(start).catch((e) => status("Error: " + (e.message || e), true));
