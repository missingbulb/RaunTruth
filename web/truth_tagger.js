// The annotator's side of the study's extractions folder (truth_folders.js): the line in the study's ground-truth box
// (every `.gt-access` its panels hold) saying when the user may not save to it and how to get there
// (req/shell/annotate/no-save), Save (req/shell/extractions/save) and the list of an image's extractions (req/shell/extractions/list).
"use strict";
import { folderOf, save, held, files, rows, marksOf, own, personKey } from "./truth_folders.js";
import { asLoaded } from "./as_loaded.js";

const SAY = {
  signedout: "You are not signed in, so nothing here can be saved to the study. Sign in to save; you can download your work meanwhile.",
  nosave: "You may not save to this study. Ask the study owner for access; you can download your work meanwhile.",
  unset: "This study has not set up its Analysis Files folder yet, so nothing can be uploaded to it.",
  view: "View only: the store lets you only view the study's Analysis Files folder. Ask its owner for edit access.",
  unpermitted: "No permission: you did not let this site add files for you. Sign out, then sign in again and tick that box.",
  unknown: "Your sign-in ran out. Sign in again to save.",
};
export const LOCAL_GT = (remote) => `Only an image from ${remote.label} can be saved, not local files.`;

// account: the sign-in; remote: the remote store; place: the study's place in it (study_root.js studyPlace); image() the image open, {name, sha256, source} or null; on() whether the user makes ground truth now;
// may() whether the store lets this user save to the study's extractions folder, as far as last read
export function truthTagger({ account, remote, place, image, on, may }) {
  const sd = remote.writer(account);
  const reader = place.reader;
  const writer = { folder: sd.folder, create: sd.create, replace: sd.replace };
  // the access last read: "write" | "view" | "unpermitted" | "unset" | "unknown", or "signedout" | "nosave" for who may not
  // save at all; epoch: the draw a late answer belongs to
  let access = null, epoch = 0;
  // the access lines as the page loaded, put back when the study leaves
  const asStarted = asLoaded([...document.querySelectorAll("#left .gt-access")]);
  // the study's extractions folder and marks, from its root's study file
  const studyFile = (opts) => place.settings(opts).catch(() => null);
  const where = async () => folderOf(await studyFile());

  async function read() {
    const id = await where();
    if (!id) return "unset";
    try { return (await sd.access(id)) ?? "unknown"; } catch { return "unknown"; }
  }
  function paint() {
    for (const el of document.querySelectorAll("#left .gt-access")) {
      el.dataset.access = access || "";
      // a tagger who may write, or whose access is still being read, is told nothing
      el.hidden = !on() || !SAY[access];
      if (el.hidden) { el.replaceChildren(); continue; }
      el.innerHTML = `<span class="gt-say"></span>`;
      el.querySelector(".gt-say").textContent = SAY[access];
    }
  }
  // the line drawn again, its access read afresh
  async function draw() {
    const mine = ++epoch;
    access = null; paint();
    if (!on()) return;
    if (!may()) { access = account.signedIn() ? "nosave" : "signedout"; return paint(); }
    const got = await read();
    if (mine === epoch) { access = got; paint(); }
  }

  return {
    draw, paint,
    leave() { access = null; epoch++; asStarted(); },
    // Map(subfolder name -> {needed}) of the images the extractions folder holds a subfolder or a Needs GT marker for, from its
    // one listing; empty while the study has no folder
    async status() {
      const folder = await where();
      return folder ? held(reader, folder) : new Map();
    },
    // the study file's marks, {<image's SHA-256>: {gt, official}}, as read in the minute
    async marks() { return (await studyFile())?.marks || {}; },
    // the image's extractions as the list shows them (truth_folders.js rows), and the user's own among the files, whether the list
    // shows it or not, as files() gives it, or null: the study file read afresh unless told not to, for its marks follow the latest, then two listings
    // and no extraction read. member: whether the user may read the study's root, which the list's names and unmarked rows follow
    async list(img, { member, fresh = true }) {
      const file = await studyFile({ fresh }), folder = folderOf(file);
      if (!folder) return { rows: [], mine: null };
      const all = await files(reader, folder, img), key = account.email() ? await personKey(account.email()) : null, own = key && all.find((f) => f.by === key);
      return { rows: rows({ files: all, marks: marksOf(file?.marks, img.sha256), key, member }), mine: own || null };
    },
    // the user's own extraction of the image open, its entry as truth_folders.js files() gives it, or null: two listings and no
    // file read, for an image from the remote store only (req/shell/ground-truth/draft-offer)
    async mine() {
      const im = image(), email = account.email(), folder = im && email && remote.owns(im.source) && im.sha256 ? await where() : null;
      return folder ? own(reader, folder, im, email) : null;
    },
    // an extraction's file, read now and parsed: the one download
    async read(id) { return JSON.parse(await reader.text(id)); },
    // why Save is off for the image open, "" when it is on. A sign-in that ran out, or a store that did not answer, is no
    // reason: the save is tried and, failing, waits for the next click (req/shell/annotate/survives)
    blocked() {
      const im = image();
      if (!im || !remote.owns(im.source)) return LOCAL_GT(remote);
      if (access && access !== "write" && access !== "unknown") return SAY[access];
      return "";
    },
    // the study's document written to the extractions folder as this user's extraction of the image open, or for im, an image
    // {name, sha256, source} a save waiting on this device is for; base the id of the extraction it was edited from, which the
    // file records (req/shell/extractions/list)
    async save(doc, im = image(), base = null) {
      const email = account.email();
      const full = { ...doc, created: new Date().toISOString(), tagger: email, ...(base ? { base } : {}),
        image: { ...(doc.image && typeof doc.image === "object" ? doc.image : {}), name: im.name, sha256: im.sha256, ...remote.cite(im.source) } };
      await save({ reader, writer, folder: await where(), image: { name: im.name, sha256: im.sha256 }, email, doc: full });
      return full;
    },
  };
}
