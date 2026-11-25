// Data Management (req/shell/data/damaged, req/shell/data/area-of-interest, req/shell/data/mode, req/shell/data/drive-access, req/shell/data/folder,
// req/shell/data/update-previews, req/shell/data/preview-images, req/shell/ground-truth/setup): Study Setup's
// folders and images (setup.js, req/setup/aspects), for a signed-in user the store lets write to the study's root: its listed folders
// (req/shell/data/folders) as a tree, the root's other folders under it to add, and the study index written from them
// (req/shell/data/index); a folder chosen fills the grid with its images and the side with their sums, and its actions; an image
// chosen is read from its preview. The tree's head asks for the folders' access, and it writes only
// files it creates.
"use strict";
import { PREVIEWS } from "./previews.js";
import { makePreview, buildPreviews } from "./previews_writer.js";
import { writeTiff } from "./tiff_file.js";
import { readImage } from "./image_open.js";
import { CONNECTION, holdOwns } from "./offline.js";
import { asLoaded } from "./as_loaded.js";
import { work } from "./pending.js";
import { accepts, isTiff } from "./accepts.js";
import * as tf from "./truth_folders.js";
import { SETTINGS as SETTINGS_NAME, setup as setUp, previewsFolder, previewsName, setFolders, setStudy, writeStudyData, readTags, writeTags } from "./study_root.js";
import { parseTag, addTag, effective, isHidden, multiNames, FOLDER } from "./tags.js";

const MAX_FOLDERS = 200;
// what each access means beside a folder
const ACCESS = {
  write: ["Writable", "This site may add files here for you."],
  view: ["View only", "The store lets you only view this folder: ask its owner for edit access."],
  unpermitted: ["No permission", "You did not let this site add files for you: sign out, then sign in again and tick that box."],
  unknown: ["Checking…", "Your sign-in is being renewed."],
};

// a preview as an ImageJ TIFF a study's Python opens: a flat image's three colour planes, a stack's slices
export function previewTiff(e, pages) {
  const { W, H } = pages[0];
  if (e.kind !== "stack") {
    const rgb = pages[0].data, planes = [0, 1, 2].map((j) => Uint8Array.from({ length: W * H }, (_, i) => rgb[i * 3 + j]));
    return writeTiff({ w: W, h: H, bps: 1, planes, description: "ImageJ=1.11a\nimages=3\nchannels=3\nmode=composite\n" }).buffer;
  }
  const [Z, C] = e.volume, spacing = e.spacing ? (e.spacing * e.slices) / Z : null;
  return writeTiff({ w: W, h: H, bps: 1, planes: pages.map((p) => p.data),
    description: `ImageJ=1.11a\nimages=${Z * C}\nchannels=${C}\nslices=${Z}\nhyperstack=true\nmode=composite\n${spacing ? `spacing=${spacing}\nunit=micron\n` : ""}` }).buffer;
}

// ctx: what the shell lends it, named below where it is used
export function dataMode(ctx) {
  const { $, esc, remote, account, place, sizeText, calls } = ctx;
  const sd = remote.writer(account);
  // the study's extractions folder (req/shell/extractions/save), read with no sign-in and written by the user
  const reader = place.reader;
  const writer = { folder: sd.folder, create: sd.create, replace: sd.replace, share: sd.share, ours: sd.ours };
  // gt: {extractions}; gtNodes: that folder with its access, outside the tree; marks: the study file's, by image SHA-256
  let gt = { extractions: null }, gtNodes = [], marks = {};
  const root = document.documentElement;
  // the study's folders, by id: {id, name, parent, files, folders (ids), access, el}; roots their ids
  // unlisted: the root's folders no listed folder is, [{id, name}]
  let unlisted = [];
  // the tags file (req/shell/data/tags) and the study file's grouping and hiding (req/shell/data/hidden), as last read
  let tagsDoc = { images: {}, folders: {} }, look = { group: null, hide: [] };
  let nodes = new Map(), roots = [], manifest = null, who = null, epoch = 0, loaded = null, chosen = null, layout = "grid";
  // the folder whose images the grid shows, by id
  let gridOf = null;
  const on = () => root.dataset.mode === "data";
  // whether the stage still lets the owner change the study's data (req/shell/study/stage): closed in Review and Public, where every
  // control that writes is gone and nothing here writes the study
  const editable = () => ctx.stageAllows("setup-data");
  const showFrozen = () => root.toggleAttribute("data-frozen", !!manifest && !editable());
  // the study's extractions folder is not its data: the tree leaves it out
  // the root's Previews folder, left out of the tree like the extractions folder
  let previewsId = null;
  const isTruth = (id) => id === gt.extractions || id === previewsId;
  const offline = () => root.classList.contains("offline");
  const msg = (el, text, err) => { el.textContent = text; el.classList.toggle("err", !!err); };
  // what a study's folders change on the page, as it loaded: put back when another study comes in
  const asStarted = asLoaded(["#data-body", "#folder-box", "#folder-view", "#tags-box", "#areas", "#image-panel", "#truth-panel", "#sharing-box"].map((s) => $(s)), holdOwns);

  // ---------- the folders and their access ----------
  // every folder under the study's own, listed with every file in it; once per study
  function load() {
    if (loaded) return loaded;
    if (offline()) { msg($("#data-msg"), "You are offline: the study's folders can be read once you are back online."); return Promise.resolve(); }
    msg($("#data-msg"), "");
    const of = epoch, slot = calls.fill($("#data-tree"), "store", "the study's folders");
    return (loaded = work.during((async () => { try {
      // the root's study file names the data folder and the extractions folder
      const s = await place.settings({ fresh: true }).catch((e) => { msg($("#data-msg"), e.message || String(e), true); return null; });
      if (of !== epoch) return;
      const top = place.root();
      roots = top ? (s?.folders || [s?.data || top]) : [];
      look = { group: s?.group || null, hide: s?.hide || [] };
      if (top) try { tagsDoc = await readTags(reader, top); } catch (e) { console.warn("the tags file was not read:", e); tagsDoc = { images: {}, folders: {}, unread: true }; }
      if (of !== epoch) return;
      gt = { extractions: tf.folderOf(s) }; marks = s?.marks || {}; previewsId = s?.previews || null;
      gtNodes = gt.extractions ? [{ id: gt.extractions, name: "Analysis Files", access: null }] : [];
      drawSetup(s); drawTruthBox(null); truthStatus();
      const queue = roots.map((id) => ({ id, parent: null, name: null }));
      while (queue.length && nodes.size < MAX_FOLDERS) {
        const at = queue.shift();
        if (nodes.has(at.id)) continue;
        let all;
        try { all = await remote.all(at.id, { pictures: true }); } catch (e) { if (of !== epoch) return; all = []; at.error = e.message || String(e); }
        if (of !== epoch) return;
        const node = { id: at.id, name: at.name || "Study folder", parent: at.parent, error: at.error || null, files: all.filter((f) => !f.folder),
          folders: all.filter((f) => f.folder && !isTruth(f.id)).map((f) => f.id), access: null, el: null };
        nodes.set(at.id, node);
        for (const f of all) if (f.folder && !isTruth(f.id)) queue.push({ id: f.id, parent: at.id, name: f.name });
      }
      // a study folder's own name, which its listing does not give
      await Promise.all(roots.map(async (id) => {
        try { const n = nodes.get(id), r = await remote.name(id); if (n && r) n.name = r; } catch { /* keeps "Study folder" */ }
      }));
      // the root's own folders that no listed folder is, to add (the root listed holds them all)
      unlisted = [];
      if (top && !roots.includes(top)) {
        try { unlisted = (await remote.all(top)).filter((f) => f.folder && !roots.includes(f.id) && !isTruth(f.id)).map((f) => ({ id: f.id, name: f.name })); } catch (e) { console.warn("the root's folders were not listed:", e); }
        if (of !== epoch) return;
      }
      await checkAccess();
      slot.done();
      await index(of, nodes.size >= MAX_FOLDERS);
    } finally { slot.done(); } })(), "the study's folders listed"));
  }
  async function checkAccess() {
    await Promise.all([...nodes.values(), ...gtNodes].map(async (n) => {
      try { n.access = (await sd.access(n.id)) || "unknown"; } catch (e) { console.warn("access not read:", e); n.access = "unknown"; }
    }));
    drawTree();
  }

  // ---------- the study's listed folders and its index (req/shell/data/folders, req/shell/data/index) ----------
  // every image of the listed folders, in their order, each folder's images then its subfolders', with its path
  function indexOf() {
    const images = [];
    // inherited: the tags of the folders holding the image, nearest first
    const walk = (id, path, inherited) => {
      const n = nodes.get(id);
      if (!n) return;
      const here = [...path, n.name], held = [folderTags(id), ...inherited];
      for (const f of imagesOf(n)) {
        const own = tagsDoc.images[f.id] || {};
        images.push({ id: f.id, name: f.name, folder: n.id, path: here, size: f.size, sha: f.sha, modified: f.modified,
          tags: effective(own.tags || [], held), ...(own.description ? { description: own.description } : {}),
          ...(own.damaged?.length ? { damaged: own.damaged } : {}), ...(own.interest?.length ? { interest: own.interest } : {}) });
      }
      for (const c of n.folders) walk(c, here, held);
    };
    for (const id of roots) walk(id, [], []);
    return { folders: roots.map((id) => ({ id, name: nodes.get(id)?.name || "Folder" })), images, group: look.group, hide: look.hide };
  }
  // why the index cannot be written now, or null; never from a listing cut short or one a folder failed in
  const indexBlocked = (cut) => {
    if (cut || [...nodes.values()].some((n) => n.error)) return "Study index: not written, as not every folder could be listed.";
    if (tagsDoc.unread) return "Study index: not written, as the tags could not be read.";
    if (["view", "unpermitted"].includes(nodes.get(place.root())?.access)) return "Study index: not written, as this site may not add files to the study's root for you.";
    return null;
  };
  // what writing the index came to, as the Study index line says it
  function indexSaid(done, ix) {
    place.forgetIndex(); drawStudySet(ix); ctx.setup?.indexed();
    const n = ix.images.length === 1 ? "1 image" : `${ix.images.length} images`;
    msg($("#data-index"), done === "not ours" ? `Study index: ${SETTINGS_NAME} in the study's root was not made by this page, so the page leaves it alone. Delete it in ${remote.label} to let the page manage it.`
      : `Study index: ${n}, ${done === "same" ? "up to date" : "written now"}.`, done === "not ours");
  }
  // the index written when it differs from the one there
  async function index(of, cut) {
    const top = place.root(), say = (t, err) => msg($("#data-index"), t, err);
    if (!top || of !== epoch || !editable()) return;
    const why = indexBlocked(cut);
    if (why) return say(why, true);
    const ix = indexOf();
    try {
      const done = await writeStudyData({ reader, writer, root: top, index: ix, by: account.email() });
      if (of === epoch) indexSaid(done, ix);
    } catch (e) { if (of === epoch) say("Study index: not written: " + (e.message || e), true); }
  }
  // ---------- tags, descriptions, grouping and hiding (req/shell/data/tags, req/shell/data/hidden) ----------
  const folderTags = (id) => tagsDoc.folders[id]?.tags || [];
  // [{tags, from}] the tags the folders holding the chosen folder or image give it, nearest first
  const inheritedOf = (folderId, self) => {
    const out = [];
    for (let n = nodes.get(folderId), first = true; n; n = nodes.get(n.parent), first = false) {
      if (!(self && first)) out.push({ tags: folderTags(n.id), from: n.name });
      if (roots.includes(n.id)) break;
    }
    return out;
  };
  // the tags and the index written after an edit; what the edit said, or why it was not saved
  // line: the status line's sentence once the change is in the study file
  const saveTags = work.counting("tags saved", async (next, line, said) => {
    const top = place.root(), was = tagsDoc;
    if (!top || offline() || !editable()) return;
    tagsDoc = next; drawTags();
    // the tags and the index are one write of the study file
    const of = epoch, why = indexBlocked(false), ix = why ? null : indexOf();
    let done;
    try {
      done = await calls.saving("store", line, async () => {
        const r = why ? void (await writeTags({ reader, writer, root: top, doc: next })) : await writeStudyData({ reader, writer, root: top, tags: next, index: ix, by: account.email() });
        if (r === "not ours") throw new Error(`${SETTINGS_NAME} in the study's root was not made by this page, so the page leaves it alone. Delete it in ${remote.label} to let the page manage it.`);
        return r;
      });
    } catch (e) { tagsDoc = was; drawTags(); return msg($("#tags-msg"), e.message || String(e), true); }
    msg($("#tags-msg"), said || "");
    if (of !== epoch) return;
    if (why) msg($("#data-index"), why, true); else indexSaid(done, ix);
  });
  // the Tags box: the chosen folder's or image's own tags, those its folders give it dimmed, and an image's description
  function drawTags() {
    const box = $("#tags-box"), c = chosen;
    box.hidden = !c || !on();
    if (box.hidden) return;
    const image = c.kind === "image", own = (image ? tagsDoc.images[c.id]?.tags : folderTags(c.id)) || [];
    const n = nodes.get(image ? c.folder : c.id), name = image ? (n?.files.find((f) => f.id === c.id)?.name || "This image") : n?.name || "This folder";
    $("#tags-for").textContent = image ? `Image ${name}` : `Folder ${name}: its tags apply to every image in it`;
    const chip = (t, from) => {
      const b = Object.assign(document.createElement("span"), { className: "tag-chip" + (from ? " inherited" : "") });
      b.textContent = t; b.dataset.tag = t;
      if (from) b.title = `From the folder ${from}`;
      else {
        const x = Object.assign(document.createElement("button"), { type: "button", className: "untag", title: `Take ${t} off`, textContent: "×" });
        x.dataset.needsNetwork = ""; x.onclick = () => untag(t); b.append(x);
      }
      return b;
    };
    const given = inheritedOf(image ? c.folder : c.id, !image).flatMap((l) => l.tags.filter((t) => !own.includes(t)).map((t) => chip(t, l.from)));
    $("#tags-list").replaceChildren(...own.map((t) => chip(t)), ...given);
    $("#tags-desc-row").hidden = !image;
    if (image && document.activeElement !== $("#tags-desc")) $("#tags-desc").value = tagsDoc.images[c.id]?.description || "";
    drawAreas();
  }
  // the image's damaged areas and area of interest, marked on the image itself, never on its preview
  function drawAreas() {
    const c = chosen, image = c?.kind === "image", open = image && ctx.originalOpen(c.id), own = image ? tagsDoc.images[c.id] || {} : {};
    $("#areas").hidden = !image;
    if (!image) return;
    const n = (k, one) => (own[k]?.length ? (own[k].length === 1 ? `1 ${one}` : `${own[k].length} ${one}s`) : "none");
    $("#areas-damaged-count").textContent = n("damaged", "damaged area");
    $("#areas-interest-count").textContent = n("interest", "area");
    for (const [k, b] of [["damaged", "#areas-damaged-mark"], ["interest", "#areas-interest-mark"]]) {
      $(b).disabled = !open; $(b).title = open ? "" : "Load Original first: areas are marked on the image itself, not its preview";
      $(b.replace("mark", "clear")).hidden = !own[k]?.length;
    }
    $("#areas-hint").hidden = open;
  }
  const areasOf = (id) => ({ damaged: tagsDoc.images[id]?.damaged || [], interest: tagsDoc.images[id]?.interest || [] });
  function markArea(k) {
    const c = chosen;
    if (c?.kind !== "image" || !ctx.originalOpen(c.id) || !editable()) return;
    ctx.lasso((pts) => {
      if (chosen?.id !== c.id) return;
      const next = withImage(tagsDoc, c.id, { [k]: [...(tagsDoc.images[c.id]?.[k] || []), pts] });
      ctx.areasOf(c.id, { damaged: next.images[c.id]?.damaged || [], interest: next.images[c.id]?.interest || [] });
      saveTags(next, k === "damaged" ? "Saved the damaged area to the study." : "Saved the area of interest to the study.", k === "damaged" ? "Damaged area marked." : "Area of interest marked.");
    }, k === "damaged" ? "Drag around the damaged area · Esc cancels" : "Drag around the area of interest · Esc cancels");
  }
  function clearAreas(k) {
    const c = chosen;
    if (c?.kind !== "image" || !editable()) return;
    const next = withImage(tagsDoc, c.id, { [k]: [] });
    ctx.areasOf(c.id, { damaged: next.images[c.id]?.damaged || [], interest: next.images[c.id]?.interest || [] });
    saveTags(next, k === "damaged" ? "Removed the damaged areas from the study." : "Removed the area of interest from the study.");
  }
  $("#areas-damaged-mark").onclick = () => markArea("damaged");
  $("#areas-interest-mark").onclick = () => markArea("interest");
  $("#areas-damaged-clear").onclick = () => clearAreas("damaged");
  $("#areas-interest-clear").onclick = () => clearAreas("interest");
  const withImage = (doc, id, change) => {
    const was = doc.images[id] || {}, next = { ...was, ...change };
    for (const k of ["tags", "damaged", "interest"]) if (!next[k]?.length) delete next[k];
    if (!next.description) delete next.description;
    const images = { ...doc.images };
    if (Object.keys(next).length) images[id] = next; else delete images[id];
    return { ...doc, images };
  };
  const withFolder = (doc, id, tags) => {
    const folders = { ...doc.folders };
    if (tags.length) folders[id] = { tags }; else delete folders[id];
    return { ...doc, folders };
  };
  function tag() {
    const c = chosen, got = parseTag($("#tags-add").value);
    if (!c) return;
    if (got.error) return msg($("#tags-msg"), got.error, true);
    $("#tags-add").value = "";
    if (c.kind === "image") saveTags(withImage(tagsDoc, c.id, { tags: addTag(tagsDoc.images[c.id]?.tags || [], got.tag) }), "Saved the tag to the study.");
    else saveTags(withFolder(tagsDoc, c.id, addTag(folderTags(c.id), got.tag)), "Saved the tag to the study.");
  }
  function untag(t) {
    const c = chosen;
    if (!c) return;
    if (c.kind === "image") saveTags(withImage(tagsDoc, c.id, { tags: (tagsDoc.images[c.id]?.tags || []).filter((x) => x !== t) }), "Removed the tag from the study.");
    else saveTags(withFolder(tagsDoc, c.id, folderTags(c.id).filter((x) => x !== t)), "Removed the tag from the study.");
  }
  $("#tags-add-go").onclick = tag;
  $("#tags-add").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); tag(); } };
  $("#tags-desc").onchange = () => {
    const c = chosen, text = $("#tags-desc").value.trim();
    if (c?.kind !== "image" || text === (tagsDoc.images[c.id]?.description || "")) return;
    saveTags(withImage(tagsDoc, c.id, { description: text }), "Saved the description to the study.", "Description saved.");
  };
  // Study images: how Load groups the study's images, and which tags hide one
  function drawStudySet(ix) {
    $("#study-set").hidden = !place.root();
    const names = multiNames(ix?.images || []), sel = $("#study-group");
    const want = [FOLDER, ...new Set([...names, ...(look.group && look.group !== FOLDER ? [look.group] : [])])];
    sel.replaceChildren(...want.map((v) => Object.assign(document.createElement("option"), { value: v, textContent: v })));
    sel.value = look.group || FOLDER;
    $("#study-hide-list").replaceChildren(...look.hide.map((t) => {
      const b = Object.assign(document.createElement("span"), { className: "tag-chip" }); b.textContent = t; b.dataset.tag = t;
      const x = Object.assign(document.createElement("button"), { type: "button", className: "untag", title: `Stop hiding images tagged ${t}`, textContent: "×" });
      x.dataset.needsNetwork = ""; x.onclick = () => setLook({ hide: look.hide.filter((h) => h !== t) }); b.append(x);
      return b;
    }));
    const hidden = (ix?.images || []).filter((i) => isHidden(i.tags || [], look.hide)).length;
    $("#study-hide-count").textContent = look.hide.length ? `${hidden === 1 ? "1 image" : hidden + " images"} hidden from viewers and taggers.` : "";
  }
  const setLook = work.counting("the study set saved", async (change) => {
    const top = place.root();
    if (!top || offline() || !editable()) return;
    try {
      const s = await calls.saving("store", "group" in change ? "Saved the grouping to the study." : "Saved the hide rule to the study.", () => setStudy({ reader, writer, root: top, changes: change }));
      look = { group: s.group, hide: s.hide };
    }
    catch (e) { return msg($("#study-msg"), e.message || String(e), true); }
    msg($("#study-msg"), "");
    await index(epoch);
  });
  $("#study-group").onchange = () => setLook({ group: $("#study-group").value === FOLDER ? null : $("#study-group").value });
  const hideAdd = () => {
    const got = parseTag($("#study-hide-add").value);
    if (got.error) return msg($("#study-msg"), got.error, true);
    $("#study-hide-add").value = "";
    if (!look.hide.includes(got.tag)) setLook({ hide: [...look.hide, got.tag] });
  };
  $("#study-hide-go").onclick = hideAdd;
  $("#study-hide-add").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); hideAdd(); } };

  // the listed folders changed in the study file, the tree read again, and anything to say after
  const setListed = work.counting("the study's folders changed", async (next, said = "") => {
    const top = place.root();
    if (!top || offline() || !editable()) return;
    $("#data-tree").classList.add("busy");
    try { await calls.saving("store", "Saved the study's folders.", () => setFolders({ reader, writer, root: top, folders: next })); }
    catch (e) { $("#data-tree").classList.remove("busy"); return msg($("#data-msg"), e.message || String(e), true); }
    nodes = new Map(); loaded = null; chosen = null; gridOf = null; roots = next; msg($("#data-index"), "");
    await load();
    $("#data-tree").classList.remove("busy");
    if (said) msg($("#data-msg"), said);
  });
  async function addLink() {
    if (!editable()) return;
    const ref = remote.parse($("#data-add-link").value || "");
    if (ref?.kind !== "folder") return msg($("#data-msg"), "Paste the link of a folder.", true);
    if (roots.includes(ref.id)) return msg($("#data-msg"), "That folder is in the study already.");
    let open = null;
    try { open = await remote.publicly(ref.id); } catch { open = null; }
    $("#data-add-link").value = "";
    await setListed([...roots, ref.id], open === false ? `Added. It is not shared as "Anyone with the link", so a viewer cannot read its images: share it so in ${remote.label}.` : "");
  }
  $("#data-add").onclick = addLink;
  $("#data-add-link").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } };


  // ---------- Set up extractions (req/shell/ground-truth/setup) ----------
  // offered while the study file names no extractions folder, and nudged while the root has none at all
  const gtStudy = () => !!manifest && manifest.stage != null;
  function drawSetup(s) {
    const b = $("#gt-setup");
    b.hidden = !gtStudy() || !place.root() || !!s?.set;
    b.classList.toggle("nudge", !gt.extractions);
    b.title = gt.extractions ? "Name the study's Analysis Files folder in its study file" : "Make the study's Analysis Files folder in its root";
  }
  $("#gt-setup").onclick = () => { msg($("#setup-msg"), ""); $("#setup-dlg").showModal(); };
  $("#setup-cancel").onclick = () => $("#setup-dlg").close();
  $("#setup-go").onclick = async () => {
    const say = (text, err) => msg($("#setup-msg"), text, err), top = place.root();
    for (const x of document.querySelectorAll("#setup-dlg button")) x.disabled = true;
    try {
      if ((await sd.access(top)) !== "write") throw new Error("This site may not write to the study's root for you.");
      say("Making the Analysis Files folder…");
      await calls.saving("store", "Set up the study's Analysis Files folder.", () => setUp({ reader, writer, root: top, by: account.email() }));
      $("#setup-dlg").close();
      msg($("#data-msg"), "Analysis Files set up: one folder, named Extractions, in the root, shared with anyone with the link to view.");
      nodes = new Map(); loaded = null; chosen = null; await load();
    } catch (e) { say(e.message || String(e), true); }
    for (const x of document.querySelectorAll("#setup-dlg button")) x.disabled = false;
  };

  // ---------- the Extractions box: where annotations are saved, and how many images have one ----------
  function drawTruthBox(gts) {
    const box = $("#gt-box");
    box.hidden = !gt.extractions || !gtStudy();
    if (box.hidden) return;
    $("#gt-mode").textContent = "Everyone's uploaded Analysis Files of the study's images are kept in its Analysis Files folder, one file per person for each image.";
    if (!gts) { $("#gt-counts").textContent = "Reading…"; return; }
    const held = [...gts.values()].filter((g) => g.held).length, gtMarked = Object.values(marks).filter((m) => m?.gt?.file).length;
    const images = (k) => `${k} image${k === 1 ? "" : "s"}`;
    $("#gt-counts").textContent = [held ? `${images(held)} ${held === 1 ? "has" : "have"} an Analysis File.` : "No image has an Analysis File yet.",
      gtMarked ? `${images(gtMarked)} ${gtMarked === 1 ? "has" : "have"} a GT mark.` : ""].filter(Boolean).join(" ");
  }

  // ---------- the tree ----------
  // a folder's images, the kinds the study opens
  const imagesOf = (n) => {
    const opens = accepts(manifest.files.accept);
    return n.files.filter((f) => opens(f.name) && f.name !== PREVIEWS);
  };
  function drawTree() {
    if (!on()) return;
    const make = (id) => {
      const n = nodes.get(id);
      if (!n) return document.createDocumentFragment();
      const el = n.el ||= Object.assign(document.createElement("div"), { className: "tree-folder" });
      el.dataset.id = id; el.setAttribute("role", "treeitem"); el.setAttribute("aria-expanded", "true");
      const ims = imagesOf(n), a = ACCESS[n.access || "unknown"];
      if (!el.firstChild) {
        el.innerHTML = `<div class="row"><button type="button" class="name"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1.75 2.5h4l1.5 1.5h7a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-.75.75h-12.5a.75.75 0 0 1-.75-.75v-10a.75.75 0 0 1 .75-.75Z"/></svg><span></span></button><span class="access"></span><button type="button" class="count" aria-expanded="false"></button></div><div class="tree-images" role="group" hidden></div><div class="tree-children" role="group"></div>`;
        el.querySelector(".name").onclick = () => chooseFolder(n);
        el.querySelector(".count").onclick = (e) => { e.stopPropagation(); toggleImages(n); };
      }
      el.querySelector(".name span").textContent = n.name;
      const acc = el.querySelector(".access");
      acc.dataset.access = n.access || "unknown"; acc.textContent = a[0]; acc.title = n.error ? "The store did not list it: " + n.error : a[1];
      const count = el.querySelector(".count");
      count.textContent = ims.length === 1 ? "1 image" : `${ims.length} images`; count.disabled = !ims.length;
      el.classList.toggle("chosen", chosen?.kind === "folder" && chosen.id === id);
      el.querySelector(".tree-children").replaceChildren(...n.folders.map(make));
      return el;
    };
    $("#data-tree").replaceChildren(...roots.map((id) => {
      const el = make(id), row = el.querySelector?.(":scope > .row");
      if (row && !row.querySelector(".unlist")) {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "unlist", title: "Remove from study: take this folder out of the study's folders" });
        b.setAttribute("aria-label", "Remove from study");
        b.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
        b.dataset.needsNetwork = "";
        b.onclick = (e) => { e.stopPropagation(); setListed(roots.filter((r) => r !== id)); };
        row.querySelector(".name").after(b);
      }
      return el;
    }));
    drawTags();
    $("#data-unlisted").hidden = !unlisted.length;
    $("#data-unlisted-list").replaceChildren(...unlisted.map((f) => {
      const d = Object.assign(document.createElement("div"), { className: "unlisted-folder" });
      d.innerHTML = `<span class="name"></span><button type="button" class="link add" data-needs-network>Add to study</button>`;
      d.querySelector(".name").textContent = f.name;
      d.querySelector(".add").onclick = () => setListed([...roots, f.id]);
      return d;
    }));
  }
  // a folder's images, each with a small preview, folded under it until its count is clicked
  async function toggleImages(n) {
    const box = n.el.querySelector(".tree-images"), b = n.el.querySelector(".count");
    box.hidden = !box.hidden; b.setAttribute("aria-expanded", String(!box.hidden));
    if (box.hidden || box.childElementCount) return;
    const pv = await previewsOf(n);
    box.replaceChildren(...imagesOf(n).map((f) => {
      const row = document.createElement("button");
      row.type = "button"; row.className = "tree-image"; row.dataset.id = f.id; row.setAttribute("role", "treeitem");
      row.innerHTML = `<span class="pic"></span><span class="name">${esc(f.name)}</span>`;
      row.onclick = () => chooseImage(n, f);
      picture(row.querySelector(".pic"), pv, f);
      return row;
    }));
  }

  // ---------- a folder's previews and sums ----------
  // the folder's previews file in the root's Previews folder (req/shell/drive/previews), null for none, undefined unknown
  // fresh: read past the minute's copy, as choosing a folder does
  const previewsFile = (n, fresh = false) => place.previewsOf(n.id, { fresh });
  const previewsOf = async (n, fresh = false) => { const f = await previewsFile(n, fresh); return f ? ctx.folderPreviews(n, f) : null; };
  // a TIFF's from the previews file, a photo's the store's own
  async function picture(pic, pv, f) {
    const e = pv?.entry(f.name, f.sha);
    let src = isTiff(f.name) ? null : f.preview;
    if (e) try { src = await pv.picture(e); } catch (err) { console.warn(`${f.name}'s preview could not be read:`, err); }
    if (!src) { pic.classList.add("none"); return; }
    const i = new Image(); i.alt = ""; i.src = src; pic.replaceChildren(i);
  }
  // each image's state in the folder: {f, entry, shown, stale, extracted, truth, marker (its Needs GT marker's id)}, shown
  // whether it has a preview, its entry's or the store's, extracted whether the extractions folder holds a subfolder of it
  // (truth_folders.js held), truth whether the study file marks an extraction of it GT
  function states(n, pv, gts) {
    return imagesOf(n).map((f) => {
      const entry = pv?.entry(f.name, f.sha) || null, g = (f.sha && gts.get(tf.subfolderName(f.name, f.sha))) || {};
      return { f, entry, shown: !!entry || (!isTiff(f.name) && !!f.preview), stale: !entry && isTiff(f.name) && !!pv?.index.images.some((e) => e.name === f.name),
        extracted: !!g.held, truth: !!tf.marksOf(marks, f.sha).gt?.file, official: !!tf.marksOf(marks, f.sha).official?.file, marker: g.needed || null };
    });
  }
  // a TIFF that Update previews makes a preview for
  const unpreviewed = (s) => isTiff(s.f.name) && !s.entry;
  // what the extractions folder holds of every image, an empty Map while the study names none
  async function truthStatus() {
    if (!gt.extractions) return new Map();
    try { const gts = await tf.held(reader, gt.extractions); drawTruthBox(gts); return gts; } catch (e) {
      msg($("#folder-msg"), "The Analysis Files folder could not be read: " + (e.message || e), true);
      $("#gt-counts").textContent = "The Analysis Files folder could not be read."; return new Map();
    }
  }

  async function chooseFolder(n) {
    if (ctx.setup?.busy()) return ctx.status("A batch run is under way: choose a folder or image once it is over.");
    ctx.setup?.chose(null);
    chosen = { kind: "folder", id: n.id }; root.dataset.sel = "folder"; ctx.relabel();
    drawTree(); ctx.showFolder(true); drawImagePanel();
    $("#folder-name").textContent = n.name; $("#folder-title").textContent = n.name;
    msg($("#folder-msg"), "");
    gridOf = n.id;
    const of = epoch, slot = calls.fill($("#folder-items"), "store", `${n.name}'s images`, { also: [$("#folder-summary")] });
    let pv, gts;
    try {
      // read again: the folder may have changed in the store since
      try { n.files = (await remote.all(n.id, { pictures: true })).filter((f) => !f.folder); } catch (e) { msg($("#folder-msg"), e.message || String(e), true); }
      if (of !== epoch || chosen?.id !== n.id || !slot.current) return void slot.superseded();
      if (n.el) n.el.querySelector(".tree-images").replaceChildren();
      drawTree();
      [pv, gts] = await Promise.all([previewsOf(n, true), truthStatus()]);
    } catch (e) { slot.failed(e); throw e; }
    if (of !== epoch || chosen?.id !== n.id || !slot.current) return void slot.superseded();
    slot.done();
    const all = states(n, pv, gts), count = (p) => all.filter(p).length;
    const rows = [["images", "Images", all.length], ["previews", "With a preview", count((s) => s.shown)], ["stale", "Preview out of date", count((s) => s.stale)],
      ["extracted", "With an Analysis File", count((s) => s.extracted)], ["truth", "With ground truth", count((s) => s.truth)], ["missing", "Marked as needing it", count((s) => s.marker)]];
    $("#folder-summary").replaceChildren(...rows.flatMap(([k, label, v]) => {
      const dt = Object.assign(document.createElement("dt"), { textContent: label }), dd = Object.assign(document.createElement("dd"), { textContent: String(v) });
      dd.dataset.k = k; return [dt, dd];
    }));
    const todo = count(unpreviewed);
    $("#update-previews").disabled = !todo || n.access !== "write";
    $("#update-previews").title = !todo ? `Every TIFF has an up-to-date preview; ${remote.label} pictures the photos` : n.access !== "write" ? ACCESS[n.access || "unknown"][1] : `Make the ${todo} missing or out-of-date previews`;
    drawItems(n, all, pv);
    ctx.setup?.chose("folder", { id: n.id, name: n.name, images: all.map((s) => ({ id: s.f.id, name: s.f.name, sha: s.f.sha, folder: n.id })) });
  }

  // the folder's images in the main area, a grid of previews or a list
  function drawItems(n, all, pv) {
    $("#folder-items").dataset.layout = layout;
    $("#folder-items").replaceChildren(...all.map((s, k) => {
      const cell = document.createElement("div");
      cell.className = "cell"; cell.dataset.id = s.f.id; cell.tabIndex = 0;
      if (k < 60) cell.style.viewTransitionName = "cell-" + k;
      const tag = s.shown ? "" : s.stale ? "Preview out of date" : "No preview";
      cell.innerHTML = `<span class="pic"></span><span class="name">${esc(s.f.name)}</span><span class="meta">${esc(s.f.size == null ? "" : sizeText(s.f.size))}</span>` +
        `<span class="tags">${tag ? `<span class="tag warn">${tag}</span>` : ""}${s.extracted ? '<span class="tag">Analysis File</span>' : ""}${s.truth ? '<span class="tag yes">Ground truth</span>' : ""}${s.official ? '<span class="tag yes">Official</span>' : ""}</span>` +
        `<button type="button" class="mark-gt" data-needs-network aria-pressed="${!!s.marker}">Needs GT</button>` +
        `<input type="checkbox" class="pick" data-needs-network data-id="${esc(s.f.id)}" aria-label="Choose ${esc(s.f.name)} for a batch run" title="Choose it for a batch run">`;
      cell.onclick = (e) => { if (!e.target.closest(".mark-gt, .pick")) chooseImage(n, s.f, true); };
      cell.onkeydown = (e) => { if (e.key === "Enter" && e.target === cell) chooseImage(n, s.f, true); };
      const mark = cell.querySelector(".mark-gt");
      const access = gtNodes.find((g) => g.id === gt.extractions)?.access;
      const why = !gt.extractions ? "Set up Analysis Files first: the mark is kept in their folder"
        : ["view", "unpermitted"].includes(access) ? "The mark is kept in the Analysis Files folder: " + ACCESS[access][1]
        : !s.f.sha ? "The store does not say this image's SHA-256, which names its mark" : s.truth ? "It has ground truth" : "";
      mark.disabled = !!why; mark.title = why || "Mark it as needing ground truth: a file in the Analysis Files folder";
      mark.onclick = () => markTruth(n, s, mark);
      picture(cell.querySelector(".pic"), pv, s.f);
      return cell;
    }));
    drawImagePanel();
  }
  const setLayout = (l) => {
    layout = l;
    for (const b of document.querySelectorAll("#folder-layout button")) b.setAttribute("aria-pressed", String(b.dataset.layout === l));
    const go = () => { $("#folder-items").dataset.layout = l; };
    if (ctx.still() || !document.startViewTransition) return go();
    root.dataset.cells = ""; const t = document.startViewTransition(go);
    t.ready.catch(() => {}); t.finished.finally(() => delete root.dataset.cells);
  };
  for (const b of document.querySelectorAll("#folder-layout button")) b.onclick = () => setLayout(b.dataset.layout);

  // the folder again, after the page wrote into it
  const relist = (n) => chooseFolder(n);

  // ---------- the folder's actions ----------
  async function markTruth(n, s, b) {
    if (!editable()) return;
    b.disabled = true;
    try {
      if (!s.marker) await calls.saving("store", `Marked ${s.f.name} as needing ground truth.`, () => tf.markNeeded({ writer, folder: gt.extractions, image: { name: s.f.name, sha256: s.f.sha } }));
      else if (await sd.ours(s.marker)) await calls.saving("store", `${s.f.name} is no longer marked as needing ground truth.`, () => sd.trash(s.marker));
      else throw new Error("Someone else marked it; whoever adds its ground truth drops the marker.");
      await relist(n);
    } catch (e) { msg($("#folder-msg"), e.message || String(e), true); b.disabled = false; }
  }
  $("#update-previews").onclick = () => ctx.working($("#update-previews"), async () => {
    const n = nodes.get(chosen?.id);
    if (!n || !editable()) return;
    const say = (t, err) => msg($("#folder-msg"), t, err);
    try {
      const f = await previewsFile(n, true);
      if (f === undefined) return say(`The study's Previews folder could not be read from ${remote.label}. Try again.`, true);
      if (f && !(await sd.ours(f.id))) return say(`This folder's previews file, ${f.name} in the study's Previews folder, was not made by this page, so the page leaves it alone. Delete it in ${remote.label} to let the page make and update it.`, true);
      const pv = f ? await ctx.folderPreviews(n, f) : null, all = states(n, pv, new Map()), kept = [], made = [];
      for (const s of all) if (s.entry) kept.push({ entry: s.entry, pages: await pv.pages(s.entry) });
      const todo = all.filter(unpreviewed);
      for (const [k, s] of todo.entries()) {
        say(`Making previews: ${k + 1} of ${todo.length}, ${s.f.name}…`);
        const got = (await ctx.savedImage(s.f.id)) || (await remote.file(s.f.id, s.f.name));
        const src = await readImage(got.bytes), spacing = src.ij?.spacing ? +src.ij.spacing : null;
        made.push({ name: s.f.name, sha256: await ctx.sha256(got.bytes), ...(await makePreview(src, spacing)) });
      }
      say(`Saving the previews to ${remote.label}…`);
      const blob = new Blob([await buildPreviews(kept, made)], { type: "image/tiff" });
      await calls.saving("store", `Saved ${n.name}'s previews to ${remote.label}.`, async () => (f ? sd.replace(f.id, blob) : sd.create(await previewsFolder({ reader, writer, root: place.root() }), previewsName(n.id), blob)));
      place.forgetPreviews();
      await relist(n);
      say(`${made.length} preview${made.length === 1 ? "" : "s"} made, ${kept.length} kept.`);
    } catch (e) {
      if (e.throttled) ctx.throttle();
      say(e.message || String(e), true);
    }
  });

  // ---------- an image: its preview first ----------
  // the image chosen, beside the grid: its name, its cell outlined, and Open image… once it is read (req/setup/image)
  function drawImagePanel(name) {
    const image = chosen?.kind === "image";
    $("#image-panel").hidden = !image;
    if (name != null) $("#image-panel-name").textContent = name;
    $("#image-open").disabled = !image || ctx.imageOpen()?.id !== chosen.id;
    for (const c of $("#folder-items").querySelectorAll(".cell")) c.classList.toggle("chosen", image && c.dataset.id === chosen.id);
  }
  // fromGrid: chosen in the grid, which then stays; chosen in the tree, the grid steps aside
  async function chooseImage(n, f, fromGrid = false) {
    if (ctx.setup?.busy()) return ctx.status("A batch run is under way: choose a folder or image once it is over.");
    ctx.setup?.chose("image", { id: f.id, name: f.name, sha: f.sha, folder: n.id });
    chosen = { kind: "image", id: f.id, folder: n.id }; root.dataset.sel = "image"; ctx.relabel();
    drawTree(); ctx.showFolder(fromGrid && gridOf === n.id); drawImagePanel(f.name);
    const pv = await previewsOf(n), e = pv?.entry(f.name, f.sha), source = remote.source(f.id, { name: f.name, folder: n.id });
    if (!e) { ctx.status(isTiff(f.name) ? `${f.name} has no preview yet: opening the image itself.` : `Opening ${f.name} itself.`); return ctx.loadOriginal(source); }
    let pages;
    try { pages = await pv.pages(e); } catch (err) {
      console.warn(`${f.name}'s preview could not be read:`, err);
      ctx.status(`${f.name}'s preview could not be read: opening the image itself.`); return ctx.loadOriginal(source);
    }
    ctx.openPreview(f.name.replace(/\.[^.]*$/, "") + ".preview.tif", previewTiff(e, pages), { ...source, kind: "preview" });
  }


  // ---------- entering and leaving ----------
  function enter(open) {
    if (open === on()) return;
    const go = () => {
      if (open) root.dataset.mode = "data"; else { delete root.dataset.mode; delete root.dataset.sel; chosen = null; gridOf = null; ctx.showFolder(false); drawImagePanel(); }
      ctx.modeChanged(open);
    };
    poof(open);
    go();
    if (open) { drawTree(); load(); }
  }
  // Load vanishes in a puff on the way in, and comes back on the way out
  function poof(open) {
    const l = $("#load");
    l.classList.remove("poof", "unpoof");
    if (!open) { if (l.classList.contains("gone") && !ctx.still()) { void l.offsetWidth; l.classList.add("unpoof"); } l.classList.remove("gone"); return; }
    if (ctx.still()) return l.classList.add("gone");
    void l.offsetWidth;
    l.classList.add("poof");
    // gone once the puff is over, whether it ran out, was cut short or (WebKit, at times) never started
    Promise.all(l.getAnimations().map((x) => x.finished.catch(() => {}))).then(() => { l.classList.remove("poof"); if (on()) l.classList.add("gone"); });
  }
  // the network back: the folders read afresh, if they could not be read before
  addEventListener(CONNECTION, (e) => {
    if (!e.detail.online || !on() || nodes.size) return;
    loaded = null; load();
  });

  return {
    // an image opened: whether the Tags box may mark its areas
    opened() { if (on()) { drawTags(); drawImagePanel(); } },
    // a study comes in (or the user signs in or out): who may do what in it
    mount(m) {
      // the same study again, for the same person (Unload): the mode and the tree stay as they were
      if (manifest && m.id === manifest.id && account.email() === who) { manifest = m; ctx.showFolder(chosen?.kind === "folder"); return; }
      epoch++; manifest = m; who = account.email(); nodes = new Map(); loaded = null; chosen = null; gridOf = null;
      showFrozen();
      ctx.setup?.leave();
      if (on()) enter(false);
      asStarted();
      roots = []; unlisted = []; tagsDoc = { images: {}, folders: {} }; look = { group: null, hide: [] }; gt = { extractions: null }; gtNodes = []; marks = {};
      $("#gt-setup").hidden = true; $("#gt-box").hidden = true;
      $("#data-tree").replaceChildren(); msg($("#data-msg"), ""); msg($("#data-index"), ""); $("#data-unlisted").hidden = true; $("#tags-box").hidden = true; $("#study-set").hidden = true;
    },
    // the study file's marks written (req/setup/marks): read again, the folder on show drawn with them
    async marked() {
      const s = await place.settings().catch(() => null);
      if (s) marks = s.marks || {};
      ctx.setup?.indexed();
      const n = chosen && nodes.get(chosen.kind === "folder" ? chosen.id : chosen.folder);
      truthStatus();
      if (chosen?.kind === "folder" && n) relist(n);
    },
    // the stage changed, by a promotion or a move back: what it opens and closes of the data shows at once
    stageChanged() { showFrozen(); drawTree(); drawTags(); },
    // whoever is signed in may have changed: the study's roles again, if so
    signedIn() { if (manifest && account.email() !== who) this.mount(manifest); },
    // Study Setup's page opened for someone the store lets write the root, or not
    open(on) { $("#data-col").hidden = !on; enter(on); },
    get on() { return on(); },
  };
}
