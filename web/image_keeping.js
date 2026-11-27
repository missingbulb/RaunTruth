// What the page keeps on this device of the images it opened from the remote store: each one's thumbnail and what its file holds
// (req/shell/drive/dialog), a folder's previews file (req/shell/drive/previews), and the images themselves while Auto-save images is on
// (req/shell/drive/kept-images). It needs of the shell its settings' storage, the viewer's picture of the image open, the study on show
// and the store's throttle.
"use strict";
import { holds, shape, stackPicture, drawVolume, TURN } from "./stack.js";
import { readPreviews } from "./previews.js";
import { remote } from "./drive.js";

// where thumbnails were kept before they moved to cache storage, which moves each found here over (req/shell/storage/manage):
// + remote id: a JPEG data URL of the image; [remote id], oldest first; {remote id: file name}
const LEGACY_THUMB = "nor-drive-thumb:";
const LEGACY_THUMBS = "nor-drive-thumbs-saved";
const LEGACY_THUMB_NAMES = "nor-drive-thumb-names";
// {remote id: what the file holds, "3D · 8 slices" or "" when it cannot tell}, oldest first
export const HOLDS = "nor-drive-holds";
// Cache Storage, + remote id: an image downloaded from the remote store, its file name (URI-encoded) and when it was saved
// in the headers
export const IMAGES = "nor-images-v1", IMAGE_NAME = "x-nor-name", IMAGE_AT = "x-nor-saved-at";
// and, for one kept since offline came, its folders under the study's link (a JSON list, URI-encoded) and the study
export const IMAGE_PATH = "x-nor-path", IMAGE_STUDY = "x-nor-study";
// Cache Storage, + remote folder id: the folder's rauntruth-previews.tiff, its SHA-256, the folder's name and the study it was read in in the headers
export const FOLDER_PREVIEWS = "nor-previews-v1", PREVIEWS_SHA = "x-nor-sha256";
// the paths each of those caches keeps its entries under, + remote id
const PREVIEWS_PATH = "drive-previews/";
const THUMB_PATH = "drive-thumb/";
// Cache Storage, + remote id: a JPEG of an image opened from the remote store, its file name (URI-encoded) and when it was saved in the headers
export const THUMBS_CACHE = "nor-thumbs-v1";
const CACHED_IMAGE_PATH = "drive-image/";

export function imageKeeping(shell) {
  const { st, diskBar, readJSON, writeJSON, throttle } = shell;
  // the open image's thumbnail, every colour on show, for the remote files dialog to show next time without a download;
  // shrunk and brightened as the studies' ready-made ones are, and only the latest few hundred are kept
  function saveThumb(id, name) {
    const SIDE = 96, GAIN = 2;
    const full = shell.view.picture();
    const k = SIDE / Math.max(st.W, st.H), c = document.createElement("canvas");
    c.width = Math.round(st.W * k); c.height = Math.round(st.H * k);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(full, 0, 0, c.width, c.height);
    const small = x.getImageData(0, 0, c.width, c.height), p = small.data, v = [];
    for (let j = 0; j < p.length; j += 4) v.push(p[j], p[j + 1], p[j + 2]);
    v.sort((a, b) => a - b);
    const gain = Math.min(GAIN, 255 / Math.max(1, v[Math.floor(0.995 * (v.length - 1))]));
    for (let j = 0; j < p.length; j += 4) { p[j] *= gain; p[j + 1] *= gain; p[j + 2] *= gain; }
    x.putImageData(small, 0, 0);
    return keepThumb(id, name, c.toDataURL("image/jpeg", 0.85));
  }
  const thumbUrlOf = (id) => new URL(THUMB_PATH + encodeURIComponent(id), location.href).href;
  // the thumbnail kept for a remote image, as an object URL to revoke once shown; "" when none is kept
  async function thumbUrl(id) {
    try {
      const kept = await (await caches.open(THUMBS_CACHE)).match(thumbUrlOf(id));
      return kept ? URL.createObjectURL(await kept.blob()) : "";
    } catch { return ""; }
  }
  // when each thumbnail was saved: strictly increasing, so the latest are told apart within one millisecond
  let thumbClock = 0;
  // a thumbnail for the remote files dialog to show from now on; only the latest KEEP are kept. Returns whether it was kept.
  async function keepThumb(id, name, url) {
    const KEEP = 100;
    let kept = false;
    try {
      const cache = await caches.open(THUMBS_CACHE), blob = await (await fetch(url)).blob();
      thumbClock = Math.max(Date.now(), thumbClock + 1);
      await cache.put(thumbUrlOf(id), new Response(blob, { headers: { "content-type": "image/jpeg", [IMAGE_NAME]: encodeURIComponent(name), [IMAGE_AT]: String(thumbClock) } }));
      kept = true;
      const all = await Promise.all((await cache.keys()).map(async (q) => ({ q, at: Number((await cache.match(q))?.headers.get(IMAGE_AT)) || 0 })));
      all.sort((x, y) => x.at - y.at);
      for (const old of all.slice(0, Math.max(0, all.length - KEEP))) await cache.delete(old.q);
    } catch (e) { console.warn("the thumbnail could not be kept:", e); }
    diskBar();
    return kept;
  }
  // thumbnails an earlier page kept in the settings' storage move to the cache: each key goes once its picture is kept
  // there or holds none, and the two lists once no picture is left behind
  async function moveThumbs() {
    let keys = [];
    try { keys = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_THUMB)); } catch { return; }
    const names = readJSON(LEGACY_THUMB_NAMES), saved = readJSON(LEGACY_THUMBS, []), order = Array.isArray(saved) ? saved : [];
    const rank = (k) => order.indexOf(k.slice(LEGACY_THUMB.length));
    const done = [LEGACY_THUMBS, LEGACY_THUMB_NAMES];
    let behind = 0;
    for (const k of keys.sort((a, b) => rank(a) - rank(b))) {
      const id = k.slice(LEGACY_THUMB.length), url = readJSON(k, "");
      const picture = typeof url === "string" && url.startsWith("data:image/");
      if (picture && !(await keepThumb(id, names[id] || "", url))) behind++;
      else done.unshift(k);
    }
    for (const k of behind ? done.slice(0, -2) : done) try { localStorage.removeItem(k); } catch { /* nothing kept */ }
  }

  // what each remote file holds, remembered so it is read once; the latest KEEP. Returns its words for the row.
  function know(id, s) {
    const KEEP = 1000, said = holds(s), all = readJSON(HOLDS);
    delete all[id]; all[id] = said;
    const ids = Object.keys(all);
    for (const old of ids.slice(0, Math.max(0, ids.length - KEEP))) delete all[old];
    writeJSON(HOLDS, all);
    return said;
  }
  // a remote image about to open: what it holds is remembered, and a stack's 3D thumbnail is saved at once, drawn
  // from the bytes in hand; a flat image's waits until it shows
  // the µm between a stack's slices the study states, for a file that does not record it
  const studySpacing = () => shell.manifest?.view?.spacing || null;
  function picture(id, name, bytes) {
    const s = shape(bytes);
    know(id, s); st.pictured = null;
    const url = s && s.slices > 1 && stackPicture(bytes, s, studySpacing());
    if (url) { keepThumb(id, name, url); st.pictured = id; }
  }

  const keptPreviewsUrl = (folder) => new URL(PREVIEWS_PATH + encodeURIComponent(folder.id), location.href).href;
  // a folder's previews file (req/shell/drive/previews), read: the copy kept on this device while the store gives the
  // file the same SHA-256, else downloaded and kept; null when there is none to read
  async function folderPreviews(folder, f) {
    const url = keptPreviewsUrl(folder);
    try {
      const cache = await caches.open(FOLDER_PREVIEWS), kept = await cache.match(url);
      if (kept && f.sha && kept.headers.get(PREVIEWS_SHA) === f.sha) return readPreviews(await kept.arrayBuffer(), studySpacing());
      if (shell.throttled()) return null;
      const got = await remote.file(f.id, f.name);
      await cache.put(url, new Response(new Blob([got.bytes]), { headers: { [PREVIEWS_SHA]: f.sha || "", [IMAGE_NAME]: encodeURIComponent(folder.name), [IMAGE_STUDY]: shell.manifest?.id || "" } }));
      diskBar();
      return readPreviews(got.bytes, studySpacing());
    } catch (e) {
      if (e.throttled) throttle();
      else console.warn("no previews for this folder:", e);
      return null;
    }
  }
  // the copy of a folder's previews kept on this device, while the store cannot say which file is current (offline)
  async function keptPreviews(folder) {
    try { const kept = await (await caches.open(FOLDER_PREVIEWS)).match(keptPreviewsUrl(folder)); return kept ? readPreviews(await kept.arrayBuffer(), studySpacing()) : null; } catch { return null; }
  }
  // a stack's row turns its volume while the pointer is over it, and shows its still again after
  function turning(row, pic, volume) {
    let frame = 0, still = null;
    row.addEventListener("mouseenter", async () => {
      const v = await volume, start = performance.now();
      still = still || pic.firstChild;
      const spin = (now) => {
        const cv = drawVolume(v, TURN + ((now - start) / 1000) * (Math.PI / 2));
        cv.className = "turning"; pic.replaceChildren(cv);
        frame = requestAnimationFrame(spin);
      };
      cancelAnimationFrame(frame); frame = requestAnimationFrame(spin);
    });
    row.addEventListener("mouseleave", () => { cancelAnimationFrame(frame); if (still) pic.replaceChildren(still); });
  }

  // images downloaded from the remote store, kept on this device while Auto-save images is on
  const imageUrl = (id) => new URL(CACHED_IMAGE_PATH + encodeURIComponent(id), location.href).href;
  const idOf = (url) => decodeURIComponent(new URL(url).pathname.split("/").pop());
  // the remote ids of the images kept here
  async function keptIds() {
    try { return new Set((await (await caches.open(IMAGES)).keys()).map((q) => idOf(q.url))); } catch { return new Set(); }
  }
  async function savedImage(id) {
    try {
      const r = await (await caches.open(IMAGES)).match(imageUrl(id));
      return r ? { name: decodeURIComponent(r.headers.get(IMAGE_NAME)), bytes: await r.arrayBuffer() } : null;
    } catch { return null; }
  }
  // copies the bytes at once, before the caller hands them to Python
  // where: {path, study}, the folders it is in under the study's link and the study it was kept in
  async function saveImage(id, name, bytes, where = {}) {
    const body = new Blob([bytes]);
    const headers = { [IMAGE_NAME]: encodeURIComponent(name), [IMAGE_AT]: String(Date.now()), [IMAGE_PATH]: encodeURIComponent(JSON.stringify(where.path || [])), [IMAGE_STUDY]: where.study || "" };
    try {
      await (await caches.open(IMAGES)).put(imageUrl(id), new Response(body, { headers }));
    } catch (e) { console.warn("image not saved:", e); }
    diskBar();
  }
  return { moveThumbs, saveThumb, keptIds, savedImage, picture, saveImage, idOf, thumbUrl, keptPreviews, folderPreviews, know, turning, imageUrl };
}
