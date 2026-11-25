// The Open Image dialog (req/shell/drive/dialog, req/shell/load/study-images): the study's folders or its index's images in groups, or a pasted
// link; each row's thumbnail, tags and standing; the folders as last listed and the images kept here, offline (req/shell/drive/offline-listing);
// and the wait once the store throttles the site's downloads (req/shell/drive/throttle). It needs of the shell the study on show and its place
// in the store, the settings' storage, what opens an image's bytes, the recent images and the viewer.
"use strict";
import { remote } from "./drive.js";
import { every } from "./pacing.js";
import { asLoaded } from "./as_loaded.js";
import { holdOwns, markOffline, CONNECTION } from "./offline.js";
import { storedPart } from "./vsi.js";
import { IMAGES, IMAGE_PATH, IMAGE_NAME, IMAGE_STUDY, HOLDS } from "./image_keeping.js";
import { PREVIEWS } from "./previews.js";
import { isHidden, groupsOf } from "./tags.js";
import { shape, holds } from "./stack.js";
import { isTiff } from "./accepts.js";

// the last remote link pasted, in any study
export const REMOTE_LINK = "nor-drive-link";
// {study id: the last remote link pasted in that study}
export const REMOTE_LINKS = "nor-drive-links";
// "on" | "off": whether the remote files dialog shows thumbnails
export const THUMBS = "nor-drive-thumbs";
// when the wait after the store throttled the site's downloads ends, in ms
export const THROTTLE = "nor-drive-throttled-until";
// {folder id: {at, items: [{id, name, folder, size, created, sha}]}}: each folder as the remote files dialog last listed it, created in ms
export const LISTINGS = "nor-drive-listings";
// {study root id: {at, index}}: each study's index as Load last read it, for working offline (req/shell/load/study-images)
export const STUDY_INDEX = "nor-study-index";

export function imageDialog(shell) {
  const { $, readJSON, writeJSON, savedImage, sha256, peek, remember, picture, tip, openBytes, busy, autoSave, saveImage, page, showImage, idOf, sizeText, esc,
    thumbUrl, keptIds, recentHere, RECENT, place, keptPreviews, folderPreviews, agoTag, data, truth, standing, putTruthTag, signIn, say, know, turning } = shell;
  // the study's own remote folders, which its dialog browses alone; a study naming none (the Image Viewer) takes a pasted
  // link instead (req/shell/drive/dialog)
  const studyFolders = () => (remote.study(shell.manifest).root ? [remote.study(shell.manifest).root] : []);
  // the link the remote files dialog opened on: listing it is not pasting it
  let remoteFrom = "", remoteOpened = () => {}, remoteLeft = () => {};
  function openRemote() {
    $("#image-menu").open = false;
    const pastes = !studyFolders().length;
    $("#remote-dlg").classList.toggle("folders", !pastes);
    remoteFrom = $("#remote-link").value = pastes ? readJSON(REMOTE_LINKS)[shell.manifest.id] || readJSON(REMOTE_LINK, "") : "";
    $("#remote-dlg").showModal(); if (pastes) $("#remote-link").select();
    holdRemote();
    remoteOpened();
  }

  let openRecent = () => {}, showKept = () => {};
  const UNREACHED = "The internet cannot be reached, and this image is not kept on this device.";

  // once the store throttles the site's downloads the remote files dialog waits WAIT, with a notice and a countdown, and
  // calls the remote store for nothing; the end is kept in the browser, so a reload does not cut it short. waitEnded is the
  // dialog's, which lists its link again.
  const WAIT = 15 * 60000;
  let ticker = 0, waitEnded = () => {};
  const throttled = () => readJSON(THROTTLE, 0) > Date.now();
  function holdRemote() {
    const on = throttled(), left = Math.max(0, readJSON(THROTTLE, 0) - Date.now()), two = (n) => String(n).padStart(2, "0");
    $("#remote-throttle").hidden = !on; $("#remote-dlg").classList.toggle("throttled", on);
    $("#remote-link").disabled = $("#remote-go").disabled = on;
    if (on) $("#remote-open").disabled = true;
    $("#remote-clock").textContent = `${two(Math.floor(left / 60000))}:${two(Math.floor(left / 1000) % 60)}`;
    if (on && !ticker) ticker = every(1000, holdRemote, { whenHidden: true });
    if (!on && ticker) {
      ticker(); ticker = 0;
      try { localStorage.removeItem(THROTTLE); } catch { /* nothing kept */ }
      waitEnded();
    }
  }
  function throttle() { writeJSON(THROTTLE, Date.now() + WAIT); holdRemote(); }

  // the remote files dialog: a pasted file link loads at once; a folder link lists its images and subfolders, where a
  // click selects and Open (or a double click) opens the selection
  function remoteDialog() {
    const msg = (t, err) => { const m = $("#remote-msg"); m.textContent = m.title = t; m.classList.toggle("err", !!err); };
    // keptOn: the dialog lists the images kept here, offline, in place of a remote folder
    let trail = [], chosen = null, listing = 0, keptOn = false;
    // what browsing changes in the dialog, as the page loaded; its choices (thumbnails, auto-save) are the user's and stay
    const asStarted = asLoaded(["#remote-path", "#remote-list", "#remote-msg", "#remote-open"].map((s) => $(s)), holdOwns);
    // the study leaving: what the dialog was browsing goes with it
    remoteLeft = () => { groupsSeen?.disconnect(); thumbs.stop(); trail = []; chosen = null; keptOn = false; listing++; asStarted(); $("#remote-dlg").classList.remove("folders"); };
    // path: the folders the image is in under the link it was opened from; sha: its SHA-256 as the listing gave
    // it (null when the store gave none), undefined when not yet asked; recent: whether it was chosen from the recents.
    // A recent image opens from its kept copy; one chosen from the remote store does only once its SHA-256 matches the store's.
    const take = async (id, name, path, sha, recent) => {
      thumbs.stop();
      const kept = await savedImage(id);
      if (kept && !recent && sha === undefined && !throttled()) sha = await remote.checksum(id).catch(() => null);
      // offline, a copy kept here is the only one to be had
      if (kept && (recent || shell.offlineCopy.offline() || (sha && sha === (await sha256(storedPart(kept.bytes)))))) {
        $("#remote-dlg").close(); msg("");
        peek()(kept.bytes, kept.bytes.byteLength); remember(id, kept.name, path); picture(id, kept.name, kept.bytes);
        if (!recent) tip("recent-files", $("#image-pick"), "To load recent files click here");
        return openBytes(kept.name, kept.bytes, remote.source(id));
      }
      if (throttled()) { if (!$("#remote-dlg").open) $("#remote-dlg").showModal(); return holdRemote(); }
      msg("Downloading " + (name || "the image") + "…");
      const mb = (n) => (n / 1048576).toFixed(1);
      let push, what;
      try {
        const f = await remote.file(id, name, (n) => {
          what = n; $("#remote-dlg").close(); msg(""); push = peek(); busy(true, `Downloading ${n}…`, "peek");
        }, (buf, got, total) => {
          push(buf, got);
          $("#busy-text").textContent = `Downloading ${what} · ${mb(got)}${total ? " of " + mb(total) : ""} MB`;
        });
        if (f.folder) { trail = [f]; return show(); }
        if (autoSave()) saveImage(id, f.name, f.bytes, { path, study: shell.manifest.id });
        remember(id, f.name, path); picture(id, f.name, f.bytes);
        openBytes(f.name, f.bytes, remote.source(id));
      } catch (err) {
        busy(false); if (!$("#remote-dlg").open) $("#remote-dlg").showModal();
        // what the download had painted goes: the image open before, or none
        if (push) page.get("image") ? showImage() : shell.view.clear();
        if (err.throttled) { msg(""); return throttle(); }
        msg(err instanceof TypeError || shell.offlineCopy.offline() ? UNREACHED : err.message || String(err), true);
      }
    };
    const choose = (f, b) => {
      chosen = f; $("#remote-open").disabled = !f;
      $("#remote-list").querySelectorAll(".item").forEach((e) => e.setAttribute("aria-selected", e === b));
    };
    // where an image is: the folders under the one it was opened from, the study's own list of folders no folder
    const enter = (f) => (f.folder ? (trail.push(f), show()) : f.kept ? take(f.id, f.name, f.path, undefined, true)
      : take(f.id, f.name, f.path ? f.path.slice(1) : trail.filter((t) => !t.roots).slice(1).map((t) => t.name), f.sha));
    // offline, in place of a remote folder: the images kept on this device, the study's own first (req/shell/offline/default)
    showKept = async () => {
      keptOn = true; thumbs.stop(); trail = []; choose(null);
      $("#remote-path").textContent = "You are offline: the images kept on this device"; $("#remote-list").replaceChildren();
      const kept = [];
      try {
        const c = await caches.open(IMAGES);
        for (const q of await c.keys()) {
          const r = await c.match(q), path = r.headers.get(IMAGE_PATH);
          kept.push({ id: idOf(q.url), name: decodeURIComponent(r.headers.get(IMAGE_NAME) || ""),
            path: path ? JSON.parse(decodeURIComponent(path)) : [], study: r.headers.get(IMAGE_STUDY), size: (await r.blob()).size, kept: true });
        }
      } catch (e) { console.warn("cannot read the images kept here:", e); }
      kept.sort((a, b) => (b.study === shell.manifest.id) - (a.study === shell.manifest.id) || a.name.localeCompare(b.name));
      msg(kept.length ? "" : "No image is kept here: Make Available Offline, in Manage storage, keeps a study's.");
      for (const f of kept) {
        const b = document.createElement("button"); b.type = "button"; b.className = "item"; b.setAttribute("aria-selected", "false");
        const meta = [sizeText(f.size), [remote.label, ...f.path].join(" / ")].join(" · ");
        b.innerHTML = `<span class="pic"></span><span class="name">${esc(f.name)}</span><span class="kept"></span><span class="shape">${esc(readJSON(HOLDS)[f.id] || "")}</span><span class="meta">${esc(meta)}</span>`;
        markOffline(b.querySelector(".kept"), "image", true);
        const pic = await thumbUrl(f.id);
        if (pic) b.querySelector(".pic").append(Object.assign(new Image(), { alt: "", src: pic, onload: () => URL.revokeObjectURL(pic), onerror: () => URL.revokeObjectURL(pic) }));
        b.onclick = () => choose(f, b);
        b.ondblclick = () => enter(f);
        b.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); enter(f); } };
        $("#remote-list").append(b);
      }
    };
    openRecent = (r) => take(r.id, r.name, r.path || [], undefined, true);
    // the studies whose index is kept on this device, the latest read first
    const KEEP_INDEXES = 5;
    // the folders as last listed, kept on this device so the dialog opens offline too (req/shell/drive/offline-listing),
    // the latest KEEP_LISTINGS of them; created in ms, size and sha null where the store gave none
    const KEEP_LISTINGS = 50;
    const keptListing = (id) => readJSON(LISTINGS)[id]?.items.map((f) => ({ ...f, created: f.created == null ? null : new Date(f.created) })) || null;
    const keepListing = (id, all, name) => {
      const items = all.map((f) => ({ id: f.id, name: f.name, folder: f.folder, size: f.size, created: f.created ? f.created.getTime() : null, sha: f.sha }));
      const latest = Object.entries({ ...readJSON(LISTINGS), [id]: { at: Date.now(), name, items } }).sort((x, y) => y[1].at - x[1].at).slice(0, KEEP_LISTINGS);
      writeJSON(LISTINGS, Object.fromEntries(latest));
    };
    // a folder's rows; offline, an image not kept here and a folder never listed are greyed and open nothing; seen: the
    // ids the folder held when last listed here, an image not among them new, or null when it was never listed
    const draw = async (at, all, off, asked, seen = null) => {
      const kept = await keptIds();
      if (asked !== listing) return;
      const beside = all.find((f) => !f.folder && f.name === PREVIEWS), items = all.filter((f) => f !== beside);
      const opened = Object.fromEntries(recentHere(readJSON(RECENT, [])).map((r) => [r.id, r.at])), listings = readJSON(LISTINGS);
      $("#remote-list").replaceChildren(); choose(null); thumbs.reset();
      // a study with a root keeps each folder's previews in the root's Previews folder; one with none, beside its images
      thumbs.cover((async () => {
        const file = place.root() ? await place.previewsOf(at.id) : beside;
        return file === undefined ? keptPreviews(at) : file ? folderPreviews(at, file) : null;
      })());
      msg(items.length ? "" : "No TIFF or PNG images here.");
      for (const f of items) row(f, { kept, opened, listings, off, seen });
      if (!off) markTruth(items, asked);
    };
    // one row of the list, appended: a folder or an image; seen as draw takes it
    const row = (f, { kept, opened, listings, off, seen = null }) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "item" + (f.folder ? " folder" : "");
      b.setAttribute("aria-selected", "false");
      const meta = f.size == null ? "" : sizeText(f.size);
      const added = f.created ? `Added to ${remote.label} on ${f.created.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : `When it was added to ${remote.label} is not known`;
      const fresh = !f.folder && seen && !seen.has(f.id) ? `<span class="new" title="${esc(added)}">new</span>` : "";
      // what only some rows show sits inward, what every image shows at the row's edge
      // an index row's description under its name, its tags and whether it is hidden inward (req/shell/load/study-images)
      const label = `<span class="label"><span class="name">${esc(f.name)}</span>${f.description ? `<span class="desc">${esc(f.description)}</span>` : ""}</span>`;
      const tags = (f.hidden ? '<span class="tag-chip hidden-mark" title="Hidden from viewers and taggers by the study\'s hiding rules">hidden</span>' : "")
        + (f.tags || []).map((t) => `<span class="tag-chip">${esc(t)}</span>`).join("");
      b.innerHTML = `<span class="pic"></span>${label}${fresh}${f.folder ? "" : agoTag(opened[f.id])}${tags ? `<span class="tags">${tags}</span>` : ""}<span class="gt-tag"></span><span class="kept"></span><span class="shape">${esc(readJSON(HOLDS)[f.id] || "")}</span><span class="meta">${esc(meta)}</span>`;
      if (!f.folder) { b.dataset.id = f.id; markOffline(b.querySelector(".kept"), "image", kept.has(f.id)); }
      if (off && (f.folder ? !listings[f.id] : !kept.has(f.id))) {
        b.disabled = true; b.title = f.folder ? "Not listed on this device yet: it needs the internet." : "Not kept on this device: it needs the internet.";
      }
      b.onclick = () => choose(f, b);
      b.ondblclick = () => enter(f);
      b.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); enter(f); } };
      const list = $("#remote-list");
      list.append(b);
      if (!f.folder) thumbs.watch(b.querySelector(".pic"), f, list.childElementCount - 1);
    };
    // Load study images (req/shell/load/study-images): the study index's images in groups, by folder or by the
    // multi-value tag the study names, less those its rules hide but to a study owner; each folder's previews file read
    // once one of its images scrolls into view
    let groupsSeen = null;
    const unfolded = new Set();
    const showIndex = async (ix, off) => {
      keptOn = false; trail = [{ index: true, name: "" }];
      const asked = ++listing, kept = await keptIds();
      if (asked !== listing) return;
      $("#remote-path").replaceChildren();
      $("#remote-list").replaceChildren(); choose(null); thumbs.reset();
      groupsSeen?.disconnect();
      const manager = data.on, hide = ix.hide || [];
      const images = ix.images.map((im) => ({ ...im, hidden: isHidden(im.tags || [], hide) })).filter((im) => manager || !im.hidden);
      const groups = groupsOf(images, ix.group);
      // a folder's previews read once one of its images is in view
      const covers = new Map(), starts = new Map(), dirOf = new Map();
      const coverOf = (dir) => {
        if (!covers.has(dir)) covers.set(dir, new Promise((ok) => starts.set(dir, ok)).then(async () => {
          const at = { id: dir }, file = off ? undefined : await place.previewsOf(dir);
          return file === undefined ? keptPreviews(at) : file ? folderPreviews(at, file) : null;
        }).catch(() => null));
        return covers.get(dir);
      };
      groupsSeen = new IntersectionObserver((seen) => { for (const e of seen) if (e.isIntersecting) { starts.get(dirOf.get(e.target))?.(); groupsSeen.unobserve(e.target); } }, { root: $("#remote-list") });
      thumbs.cover((f) => coverOf(f.dir));
      const opened = Object.fromEntries(recentHere(readJSON(RECENT, [])).map((r) => [r.id, r.at])), listings = readJSON(LISTINGS), items = [];
      msg(groups.length ? "" : "No images in the study's index.");
      for (const g of groups) {
        // a group folded until its head is clicked, and as it was left while the page lives; a lone group open
        const head = Object.assign(document.createElement("button"), { type: "button", className: "group" }), rows = [];
        head.innerHTML = `<svg class="chev" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg><svg class="folder-icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M1.5 4.2c0-.7.5-1.2 1.2-1.2h3.1l1.4 1.5h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2H2.7c-.7 0-1.2-.5-1.2-1.2Z"/></svg><span class="group-name">${esc(g.label)}</span><span class="group-count">(${g.items.length})</span>`;
        const unfold = (on) => { head.setAttribute("aria-expanded", String(on)); for (const r of rows) r.hidden = !on; };
        head.onclick = () => { const on = head.getAttribute("aria-expanded") !== "true"; if (on) unfolded.add(g.label); else unfolded.delete(g.label); unfold(on); thumbs.later(); };
        $("#remote-list").append(head);
        for (const im of g.items) {
          const f = { id: im.id, name: im.name, folder: false, size: im.size, sha: im.sha, created: null, dir: im.folder, path: im.path,
            tags: im.tags || [], description: im.description || "", hidden: im.hidden };
          coverOf(f.dir);
          row(f, { kept, opened, listings, off }); items.push(f);
          const el = $("#remote-list").lastElementChild;
          dirOf.set(el, f.dir); groupsSeen.observe(el); rows.push(el);
        }
        unfold(groups.length === 1 || unfolded.has(g.label));
      }
      if (!off) markTruth(items, asked);
    };
    // which images have an extraction of yours saved, or marked GT or official, and which another's marked; one line of the popup counts them
    const markTruth = async (items, asked) => {
      let map, marks;
      try { [map, marks] = await Promise.all([truth.status(), truth.marks()]); } catch (e) { console.warn("extractions not read:", e); return; }
      if (asked !== listing) return;
      const count = { saved: 0, gt: 0, official: 0, other: 0 };
      for (const f of items) {
        const g = !f.folder && f.sha && standing(map, marks, f.name, f.sha), tag = $("#remote-list").querySelector(`.item[data-id="${f.id}"] .gt-tag`);
        if (!g || !tag) continue;
        putTruthTag(tag, g);
        const me = signIn.email()?.toLowerCase(), ours = (m) => !!m?.file && !!me && m.by?.toLowerCase() === me;
        if (ours(g.marks.official)) count.official++; else if (ours(g.marks.gt)) count.gt++; else if (g.saved) count.saved++;
        if ([g.marks.gt, g.marks.official].some((m) => m?.file && !ours(m))) count.other++;
      }
      const line = [count.saved && `${count.saved} saved`, count.gt && `${count.gt} GT`, count.official && `${count.official} official`].filter(Boolean).join(", ");
      const says = [line && `Yours: ${line}.`, count.other && `${count.other} with another's marked.`].filter(Boolean).join(" ");
      if (says && items.length) msg(says);
    };
    // the study's own folders to choose from, by name (req/shell/drive/dialog)
    const showRoots = async () => {
      keptOn = false;
      const off = shell.offlineCopy.offline(), listings = readJSON(LISTINGS), asked = ++listing;
      $("#remote-path").textContent = trail[0].name;
      const roots = studyFolders().map((id) => ({ id, name: listings[id]?.name || "Folder", folder: true }));
      await draw(trail[0], roots, off, asked);
      if (off) return;
      const named = await Promise.all(roots.map((f) => (listings[f.id]?.name ? f : remote.name(f.id).then((name) => ({ ...f, name }), () => f))));
      if (named.some((f, k) => f.name !== roots[k].name)) await draw(trail[0], named, false, asked);
    };
    const show = async () => {
      groupsSeen?.disconnect();
      if (trail[trail.length - 1].roots) return showRoots();
      keptOn = false;
      const at = trail[trail.length - 1], off = shell.offlineCopy.offline(), before = keptListing(at.id);
      $("#remote-path").innerHTML = trail.map((t, k) => `<button type="button" class="link" data-k="${k}">${esc(t.name)}</button>`).join(" / ");
      $("#remote-path").querySelectorAll("button").forEach((b) => (b.onclick = () => { trail = trail.slice(0, +b.dataset.k + 1); show(); }));
      $("#remote-path").scrollLeft = $("#remote-path").scrollWidth;
      // a listing the user has moved on from by the time it arrives is dropped
      const asked = ++listing;
      $("#remote-list").replaceChildren(); choose(null); thumbs.reset();
      if (before) await draw(at, before, off, asked);
      if (off) { if (!before && asked === listing) msg("This folder is not listed on this device yet: it needs the internet.", true); return; }
      if (!before) msg("Reading the folder…");
      try {
        const all = await remote.list(at.id, shell.manifest.files.accept);
        if (asked !== listing) return;
        keepListing(at.id, all, at.unnamed ? readJSON(LISTINGS)[at.id]?.name : at.name);
        // what the store says now takes the kept listing's place, redrawn only where it differs
        if (!before || JSON.stringify(keptListing(at.id)) !== JSON.stringify(before)) await draw(at, all, false, asked, before && new Set(before.map((f) => f.id)));
      } catch (err) {
        if (asked !== listing) return;
        if (err.throttled) throttle(); else if (!before) msg(err.message || String(err), true);
      }
    };
    // each image's thumbnail: the one saved when it was last opened here, else the study's ready-made one,
    // fetched for the rows in view and the next AHEAD, in order, as the user scrolls; never read from the remote store,
    // which refuses a burst of reads and then the image itself. One fetched stays for the page's life. A TIFF's
    // row also says what the file holds, read once from the file's first HEAD bytes for the same rows. Progress
    // shows beside the checkbox and in the status bar.
    const thumbs = (() => {
      const made = new Map(), AT_ONCE = 4, AHEAD = 10, HEAD = 65536;
      // rows: the listing's image rows that await a ready-made thumbnail or what the file holds, in the list's
      // order, each {at, row, f, thumb, holds, asked, done}, at its place in the list; epoch: which listing they
      // belong to; dir: the study on show's ready-made thumbnails
      // asked, done and bytes count the thumbnails, which the note beside the checkbox reports; a header read for
      // what a file holds is not one
      let ctl = new AbortController(), running = 0, rows = [], epoch = 0, ready, frame = 0, asked = 0, done = 0, bytes = 0, dir = null;
      const put = (pic, url, own) => {
        const i = new Image(); i.alt = "";
        if (own) i.addEventListener("load", () => URL.revokeObjectURL(url), { once: true }), i.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
        i.src = url; pic.replaceChildren(i);
      };
      const tell = () => {
        const t = asked ? `${done} of ${asked} · ${sizeText(bytes)}` : "";
        shell.loading = running && t ? "Thumbnails " + t : ""; say();
      };
      // the rows from the first in view to AHEAD past the last, that no fetch has been started for
      const wanted = () => {
        const list = $("#remote-list"), items = [...list.children].filter((e) => !e.hidden);
        if (!$("#remote-dlg").open || readJSON(THUMBS, "on") === "off" || throttled() || !items.length) return [];
        const box = list.getBoundingClientRect();
        let first = 0, last = items.length - 1;
        for (let hi = last; first < hi; ) { const m = (first + hi) >> 1; if (items[m].getBoundingClientRect().bottom > box.top) hi = m; else first = m + 1; }
        for (last = first; last + 1 < items.length && items[last + 1].getBoundingClientRect().top < box.bottom; ) last++;
        const near = new Set(items.slice(first, last + AHEAD + 1));
        return rows.filter((r) => !r.asked && near.has(r.row));
      };
      const next = () => {
        frame = 0;
        for (const want = wanted(); running < AT_ONCE && want.length; ) {
          const r = want.shift(), signal = ctl.signal;
          r.asked = true; running++; if (r.thumb) asked++;
          job(r, signal).catch((e) => { if (e.throttled) throttle(); })
            .finally(() => { if (signal.aborted) return; r.done = true; running--; if (r.thumb) done++; tell(); next(); });
        }
        tell();
      };
      const job = async (r, signal) => {
        if (r.thumb) {
          const res = await fetch(`${dir}${r.f.id}.jpg`, { signal }), b = res.ok ? await res.blob() : null;
          if (b && !signal.aborted) { bytes += b.size; made.set(r.f.id, URL.createObjectURL(b)); put(r.row.querySelector(".pic"), made.get(r.f.id)); }
        }
        if (r.holds) {
          const buf = await remote.head(r.f.id, HEAD, signal);
          if (signal.aborted) return;
          r.row.querySelector(".shape").textContent = know(r.f.id, shape(buf));
        }
      };
      const later = () => { frame = frame || requestAnimationFrame(next); };
      // fetches in flight are dropped, and their rows fetched again when next wanted
      const stop = () => {
        ctl.abort(); ctl = new AbortController(); running = asked = done = bytes = 0;
        for (const r of rows) if (!r.done) r.asked = false;
        tell();
      };
      const reset = () => {
        stop(); rows = []; epoch++; covered = Promise.resolve(null);
        const own = remote.study(shell.manifest).thumbs ? shell.base + remote.study(shell.manifest).thumbs : null;
        if (own !== dir) { dir = own; ready = null; }
        ready = ready || (dir ? fetch(dir + "index.json").then((r) => r.json()).then((ids) => new Set(ids)).catch(() => new Set()) : Promise.resolve(new Set()));
      };
      // the folder's previews file, once read, or for a list of several folders the image's folder's, by a function of
      // the image; an image it covers is shown from it with no read of its own
      let covered = Promise.resolve(null);
      const cover = (p) => { covered = p || Promise.resolve(null); };
      const fromPreviews = async (pic, e, pv) => {
        const row = pic.closest(".item");
        if (isTiff(e.name)) row.querySelector(".shape").textContent = holds({ images: 1, slices: e.slices, channels: e.channels });
        put(pic, await pv.picture(e));
        if (e.kind === "stack") turning(row, pic, pv.volume(e));
      };
      const watch = async (pic, f, at) => {
        const of = epoch, pv = await (typeof covered === "function" ? covered(f) : covered), e = pv?.entry(f.name, f.sha);
        if (of !== epoch) return;
        if (e) return fromPreviews(pic, e, pv);
        const saved = made.get(f.id) ? "" : await thumbUrl(f.id);
        if (of !== epoch) { if (saved) URL.revokeObjectURL(saved); return; }
        const url = made.get(f.id) || saved || f.preview;
        if (url) put(pic, url, !!saved);
        const holds = isTiff(f.name) && remote.ready && !shell.offlineCopy.offline() && !(f.id in readJSON(HOLDS)), thumb = !url && (await ready).has(f.id);
        if (of !== epoch || !(thumb || holds)) return;
        rows.push({ at, row: pic.closest(".item"), f, thumb, holds, asked: false, done: false }); later();
      };
      $("#remote-list").addEventListener("scroll", later, { passive: true });
      $("#remote-dlg").addEventListener("close", stop);
      return { reset, watch, stop, later, cover };
    })();
    $("#remote-open").onclick = () => chosen && enter(chosen);
    if (!remote.ready) {
      const d = $("#load-remote");
      d.disabled = true; d.title = remote.words.unready;
    }
    // offline, a folder link opens on the folder as last listed, and anything else on the images kept here
    const open = async () => {
      // a study's own folders: straight into the one, else a list of them
      const roots = studyFolders().length ? await place.dataFolders() : [];
      if (roots.length) {
        // the index as read now, kept for working offline; offline, the one kept
        const off = shell.offlineCopy.offline(), top = place.root(), keptIx = readJSON(STUDY_INDEX)[top]?.index || null;
        let ix = keptIx;
        if (!off) {
          try {
            ix = await place.index();
            const rest = Object.entries(readJSON(STUDY_INDEX)).filter(([k]) => k !== top).sort((a, b) => b[1].at - a[1].at).slice(0, KEEP_INDEXES - 1);
            // the folders and images alone: who built it stays in the store
            writeJSON(STUDY_INDEX, Object.fromEntries(ix ? [[top, { at: Date.now(), index: { folders: ix.folders, images: ix.images, group: ix.group ?? null, hide: ix.hide ?? [] } }], ...rest] : rest));
          } catch (e) { if (!e?.noAccess) console.warn("the study index was not read:", e); }
        }
        if (ix?.images.length) return showIndex(ix, off);
      }
      if (roots.length) {
        if (shell.offlineCopy.offline() && !roots.some((id) => keptListing(id))) return showKept();
        keptOn = false; $("#remote-list").replaceChildren(); choose(null); msg("");
        const name = readJSON(LISTINGS)[roots[0]]?.name || (shell.offlineCopy.offline() ? null : await remote.name(roots[0]).catch(() => null));
        trail = roots.length === 1 ? [{ id: roots[0], name: name || "Folder" }] : [{ roots: true, name: "The study's folders" }];
        return show();
      }
      const link = $("#remote-link").value, ref = remote.parse(link);
      if (shell.offlineCopy.offline() && !(ref?.kind === "folder" && keptListing(ref.id))) return showKept();
      keptOn = false;
      $("#remote-list").replaceChildren(); $("#remote-path").replaceChildren(); choose(null);
      if (!ref) return msg(remote.words.notLink, true);
      if (link !== remoteFrom) { writeJSON(REMOTE_LINK, link); writeJSON(REMOTE_LINKS, { ...readJSON(REMOTE_LINKS), [shell.manifest.id]: link }); remoteFrom = link; }
      if (ref.kind === "file") return take(ref.id, undefined, []);
      // a pasted folder's name is not asked of the remote store: "Folder" stands in, and is not kept as its name
      trail = [{ id: ref.id, name: "Folder", unnamed: true }]; show();
    };
    $("#remote-go").onclick = open;
    waitEnded = () => { if ($("#remote-dlg").open) open(); };
    // the dialog opened: offline on what is kept here, online on its folder link read afresh
    remoteOpened = () => {
      if (shell.offlineCopy.offline()) return open();
      if (!throttled() && (studyFolders().length || remote.parse($("#remote-link").value)?.kind === "folder")) open();
    };
    // the open dialog follows the network: once it goes, the folder on show greyed where it cannot open (or the
    // images kept here); once it is back, the folder read afresh
    addEventListener(CONNECTION, (e) => {
      if (!$("#remote-dlg").open) return;
      if (!e.detail.online) { if (keptOn) return; return trail.length && keptListing(trail[trail.length - 1].id) ? show() : showKept(); }
      if (trail.length && !keptOn) return show();
      if (remote.parse($("#remote-link").value)) return open();
      keptOn = false; $("#remote-path").replaceChildren(); $("#remote-list").replaceChildren(); msg("");
    });
    holdRemote();
    $("#remote-link").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); open(); } });
  }
  return { throttle, throttled, openRemote, openRecent: (...a) => openRecent(...a), remoteLeft: (...a) => remoteLeft(...a), remoteDialog };
}
