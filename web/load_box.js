// The Load box of the left bar (req/shell/load/from, req/shell/load/selector, req/shell/image/file-info): the controls an image is opened with,
// from this computer or the remote store; the selector of the images opened lately, each with its age and its standing in the study; the
// open image's tags and what its file says; and the unload link on the box's header. It needs of the shell the study on show, the page's
// state, the settings' storage, what opens an image's bytes, the Open Image dialog and the study's steps.
"use strict";
import { BLOB } from "./file_fields.js";
import { remote } from "./drive.js";
import { LISTINGS } from "./image_dialog.js";
import { CONNECTION } from "./offline.js";

// [{id, name, path, study, at}], newest first: images opened from the remote store, path their folders under the link, study the one it was opened in, at when it was last opened (ms; absent for one kept before that was)
export const RECENT = "nor-drive-recent";
export const LOCAL_RECENT = "nor-local-recent"; // [{id, name, study, at}], newest first: files opened from this computer, each the browser's reference to it kept in FILE_HANDLES under id; on this device only
const FILE_HANDLES = "nor-file-handles-v1"; // the IndexedDB database of those references

export function loadBox(shell) {
  const { $, readJSON, page, st, peek, status, signIn, restudyHeld, closeTip, writeJSON, truth, standing, notice, esc, drawSteps, keptIds } = shell;
  // what the file says about the image ([label, text] rows); null clears it
  // the details (req/shell/image/file-info): the fields pinned, then every other field the file carries, folded
  function fileInfo(rows, more = []) {
    const item = (tag, text) => Object.assign(document.createElement(tag), { textContent: text });
    const list = (r) => r.flatMap(([k, v]) => [item("dt", k), Object.assign(item("dd", v), v === BLOB ? { className: "unsaid", title: "Binary data, which the file holds and the page does not spell out" } : {})]);
    $("#file-info").replaceChildren(...list(rows || []));
    $("#file-more-list").replaceChildren(...list(rows ? more : []));
    $("#file-more-n").textContent = rows ? String(more.length) : "";
    $("#file-more").hidden = !rows || !more.length; $("#file-more").open = false;
    $("#file-box").classList.toggle("empty", !rows);
    if (!rows) $("#file-box").open = false;
  }
  // where the study opens images from (req/shell/load/from): Load at the box's foot for this computer alone; else the
  // image selector on its top line, with the computer's button where it opens local files and the remote store's button
  const fromRemote = () => remote.study(shell.manifest).opens;
  const fromLocal = () => !!shell.manifest?.files.from.includes("local");
  // the browser keeps a reference to a file a page chose only where the page chooses it itself (Chrome and Edge)
  const remembersFiles = () => typeof window.showOpenFilePicker === "function";
  const RECENT_KEEP = 30;
  // the images opened lately in the study on show (req/shell/load/selector): from the remote store, and where it opens local
  // files and the browser can keep a reference to them, from this computer; newest first
  const recentHere = (list) => list.filter((r) => r.study === shell.manifest?.id);
  function recentAll() {
    const local = fromLocal() && remembersFiles() ? recentHere(readJSON(LOCAL_RECENT, [])).map((r) => ({ ...r, local: true })) : [];
    return [...recentHere(readJSON(RECENT, [])), ...local].sort((a, b) => (b.at ?? -Infinity) - (a.at ?? -Infinity)).slice(0, RECENT_KEEP);
  }
  // the control the Load image step points at, and the one held while an image opens
  const loadButton = () => (!fromRemote() ? "#load-main" : recentAll().length ? "#image-pick" : fromLocal() ? "#load-main" : "#load-remote");
  const loadHolder = () => $(fromRemote() ? "#image-pick" : "#load-main");
  function placeLoad() {
    $("#load").toggleAttribute("data-remote", fromRemote()); $("#load").toggleAttribute("data-local", fromLocal());
    // moved only when it is not already in place, so the keyboard on Load stays there
    if (fromRemote()) { if ($("#file-tags").previousElementSibling !== $("#load")) $("#file-tags").before($("#load")); }
    else if ($("#image-foot").firstElementChild !== $("#load")) $("#image-foot").prepend($("#load"));
  }
  // the Image box draws from the page's state: the image's name, its tags in the study and what its file says, the
  // control to load with filled until an image is open and plain after, and Unload once one is
  function imageBox() {
    const opening = page.get("opening"), im = page.get("image"), name = opening?.name || im?.name, remoteOn = fromRemote();
    $("#file-name").textContent = remoteOn && name ? "Details" : name || ""; $("#file-box").hidden = !name;
    fileInfo(opening ? null : im?.info || null, im?.more || []);
    const tagged = page.get("tags"), tags = !opening && im && tagged && tagged.of === st.source?.id ? tagged.tags : [];
    $("#file-tags").replaceChildren(...tags.map((t) => Object.assign(document.createElement("span"), { className: "tag-chip", textContent: t })));
    $("#file-tags").hidden = !tags.length;
    $("#load").classList.toggle("done", !!im); $("#unload").hidden = !im;
    const listed = remoteOn && recentAll().length > 0;
    $("#image-pick .pick-name").textContent = name || (listed ? "Recently Opened" : "No image opened here yet");
    $("#image-pick").classList.toggle("dim", !name);
    $("#image-pick").classList.toggle("primary", !im && listed); $("#load-remote").classList.toggle("primary", !im && !listed && !fromLocal());
    $("#load-main").classList.toggle("primary", !remoteOn || (!im && !listed));
    $("#load-original").hidden = im?.source?.kind !== "preview";
  }
  page.watch("image", imageBox); page.watch("opening", imageBox); page.watch("tags", imageBox);

  $("#file").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const bytes = await f.arrayBuffer(); peek()(bytes, bytes.byteLength);
    shell.openBytes(f.name, bytes, { kind: "local" }); e.target.value = "";
  };
  // a file from this computer: through the browser's own picker where it keeps a reference to the file, so the file
  // opens again from the recents (req/shell/load/selector); else through the file chooser
  $("#load-main").onclick = async () => {
    if (!remembersFiles() || !fromRemote()) return $("#file").click();
    let handle;
    try { [handle] = await showOpenFilePicker({ types: [{ description: "Images", accept: { "image/*": shell.manifest.files.accept.split(",") } }] }); } catch (e) {
      if (e.name !== "AbortError") status("Error: " + (e.message || e), true);
      return;
    }
    openLocal(handle);
  };
  $("#load-remote").onclick = () => { signIn.renew(); shell.openRemote(); };
  $("#image-pick").addEventListener("click", () => signIn.renew());

  // Unload: no image open, the study starting over as one that has just come in
  $("#unload").onclick = () => {
    if (!st.img || loadHolder().classList.contains("working") || !shell.gtSession.leaving("unload it")) return;
    // the link goes with the image: the keyboard it held is handed to the box's Load
    restudyHeld(false).then(() => { if (document.activeElement === document.body) $("#load-main").focus({ preventScroll: true }); });
  };

  // the selector is what the recent-files tip asks the user to open; opened, its selected image has the focus, so
  // Enter opens it, the arrows move between them and Escape closes it
  $("#image-menu").addEventListener("toggle", () => {
    if (!$("#image-menu").open) return;
    closeTip("recent-files");
    greyRecents(); markRecentTruth();
    const rows = [...$("#recent").querySelectorAll(".recent")];
    (rows.find((b) => b.getAttribute("aria-selected") === "true") || rows[0])?.focus();
  });
  $("#image-menu").addEventListener("keydown", (e) => {
    const rows = [...$("#recent").querySelectorAll(".recent:not(:disabled)")], at = rows.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); $("#image-menu").open = false; $("#image-pick").focus(); }
    else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && rows.length) {
      e.preventDefault(); rows[(at + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length].focus();
    }
  });

  // the images opened from the remote store lately in the study on show, in the image selector; a remote id names one file wherever
  // it is, so two of one name stay apart; one kept from before recents had a study belongs to none. openRecent is the remote files dialog's, which opens the copy kept on this device when there is one.
  function remember(id, name, path) {
    const study = shell.manifest.id, rest = readJSON(RECENT, []).filter((r) => r.study && !(r.id === id && r.study === study));
    const mine = [{ id, name, path, study, at: Date.now() }, ...rest.filter((r) => r.study === study)].slice(0, RECENT_KEEP);
    writeJSON(RECENT, [...mine, ...rest.filter((r) => r.study !== study)]);
    showRecent();
  }
  // the SHA-256 of an image the recents list, which names its ground truth's subfolder
  function noteSha(id, sha) {
    const all = readJSON(RECENT, []), r = all.find((x) => x.id === id && x.study === shell.manifest.id);
    if (r && r.sha !== sha) { r.sha = sha; writeJSON(RECENT, all); }
  }
  // the recents' extraction tags, as the remote files dialog's (req/shell/extractions/marks-shown); an image whose SHA-256
  // this device never learned carries none
  async function markRecentTruth() {
    if (shell.offlineCopy.offline() || !fromRemote()) return;
    const shas = Object.fromEntries(Object.values(readJSON(LISTINGS)).flatMap((l) => l.items || []).filter((f) => f.sha).map((f) => [f.id, f.sha]));
    for (const r of recentHere(readJSON(RECENT, []))) if (r.sha) shas[r.id] = r.sha;
    let map, marks;
    try { [map, marks] = await Promise.all([truth.status(), truth.marks()]); } catch (e) { console.warn("extractions not read:", e); return; }
    for (const r of recentAll()) {
      if (r.local || !shas[r.id]) continue;
      shell.putTruthTag($("#recent").querySelector(`.recent[data-id="${r.id}"]:not([data-local]) .gt-tag`), standing(map, marks, r.name, shas[r.id]));
    }
  }
  // the browser's references to files from this computer, by id, in IndexedDB: what a page cannot keep anywhere else
  function handles(mode, act) {
    return new Promise((ok, bad) => {
      const q = indexedDB.open(FILE_HANDLES, 1);
      q.onupgradeneeded = () => q.result.createObjectStore("files");
      q.onerror = () => bad(q.error);
      q.onsuccess = () => {
        const t = q.result.transaction("files", mode), r = act(t.objectStore("files"));
        t.oncomplete = () => { q.result.close(); ok(r?.result); }; t.onerror = () => { q.result.close(); bad(t.error); };
      };
    });
  }
  // a file opened from this computer, by the browser's reference to it: one entry however often it is opened, the
  // references the recents no longer list let go
  async function openLocal(handle, known) {
    let file;
    try {
      if ((await handle.queryPermission({ mode: "read" })) !== "granted" && (await handle.requestPermission({ mode: "read" })) !== "granted")
        return notice(`${handle.name} was not opened: the browser was not allowed to read it again.`);
      file = await handle.getFile();
    } catch (e) {
      return notice(`${handle.name} could not be opened: it may have been moved or deleted. (${e.message || e})`);
    }
    const bytes = await file.arrayBuffer();
    let id = known;
    try {
      if (!id) for (const r of recentHere(readJSON(LOCAL_RECENT, []))) {
        const h = await handles("readonly", (s) => s.get(r.id));
        if (h && (await h.isSameEntry(handle))) { id = r.id; break; }
      }
      id ||= crypto.randomUUID();
      const study = shell.manifest.id, rest = readJSON(LOCAL_RECENT, []).filter((r) => !(r.id === id && r.study === study));
      const list = [{ id, name: file.name, study, at: Date.now() }, ...rest].filter((r, k, all) => all.filter((x) => x.study === r.study).indexOf(r) < RECENT_KEEP);
      writeJSON(LOCAL_RECENT, list);
      const keep = new Set(list.map((r) => r.id));
      await handles("readwrite", (s) => { s.put(handle, id); s.getAllKeys().onsuccess = (e) => e.target.result.forEach((k) => keep.has(k) || s.delete(k)); });
    } catch (e) { console.warn("this file is not kept among the recent ones:", e); }
    showRecent();
    peek()(bytes, bytes.byteLength);
    shell.openBytes(file.name, bytes, { kind: "local" });
  }
  async function openLocalRecent(r) {
    const h = await handles("readonly", (s) => s.get(r.id)).catch(() => null);
    if (!h) return notice(`${r.name} is no longer known to this browser: open it again with the computer's button.`);
    openLocal(h, r.id);
  }
  // how long since an image was last opened, "<1h", "3h", "6d", "2mo" or "1y"; "" when that is not known
  function ago(at) {
    if (at == null) return "";
    const h = (Date.now() - at) / 3600000, d = h / 24;
    return h < 1 ? "<1h" : h < 24 ? `${Math.floor(h)}h` : d < 30 ? `${Math.floor(d)}d` : d < 365 ? `${Math.floor(d / 30)}mo` : `${Math.floor(d / 365)}y`;
  }

  const agoTag = (at) => (at == null ? "" : `<span class="age" title="Opened ${esc(new Date(at).toLocaleString())}">${ago(at)}</span>`);
  function showRecent() {
    const list = recentAll(), box = $("#recent"), open = page.get("image")?.source;
    const on = remote.owns(open) && list.some((r) => r.id === open.id) ? open.id : list[0]?.id;
    box.replaceChildren(...list.map((r) => {
      const b = document.createElement("button"), where = r.local ? "This computer" : ["Data", ...(r.path || [])].join(" / ");
      b.type = "button"; b.className = "item recent"; b.title = `${where} / ${r.name}`; b.dataset.id = r.id; if (r.local) b.dataset.local = "";
      b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(r.id === on));
      const logo = r.local ? "computer-logo" : remote.logo.id;
      b.innerHTML = `<svg class="${logo}" aria-hidden="true"><use href="#${logo}"/></svg><span class="what"><span class="name">${esc(r.name)}</span><span class="where">${esc(where)}</span></span>${r.local ? "" : '<span class="gt-tag"></span>'}${agoTag(r.at)}`;
      b.onclick = () => { $("#image-menu").open = false; r.local ? openLocalRecent(r) : shell.openRecent(r); };
      return b;
    }));
    const how = fromLocal() ? "the buttons at the right open one" : `${remote.short}'s button, at the right, opens one`;
    if (!list.length) box.append(Object.assign(document.createElement("p"), { className: "hint", textContent: `No image opened here yet: ${how}.` }));
    imageBox();
    const s = shell.steps.find((p) => p.key === "load");
    if (s && s.button !== loadButton()) { s.button = loadButton(); drawSteps(); }
  }
  // offline, an image not kept on this device opens nothing, and is greyed
  async function greyRecents() {
    const off = shell.offlineCopy.offline(), kept = off ? await keptIds() : null;
    for (const b of $("#recent").querySelectorAll(".recent")) b.disabled = off && !b.hasAttribute("data-local") && !kept.has(b.dataset.id);
  }
  page.watch("image", () => showRecent());
  addEventListener(CONNECTION, () => greyRecents());
  return { loadButton, loadHolder, noteSha, remember, recentHere, agoTag, showRecent, placeLoad };
}
