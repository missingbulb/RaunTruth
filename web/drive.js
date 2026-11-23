// Everything the page knows of Google Drive, behind one storage-neutral interface, `remote`: the rest of the page
// opens, lists and writes "the remote store" and never learns it is Drive. Google answers a page on another site only
// through the Drive API (its plain download link refuses any request a browser marks cross-site), and every read
// carries one credential (req/shell/drive/credentials): signed in, the user's own token alone, reaching whatever their
// account can see; signed out, the site's API key (NOR_CONFIG.google.apiKey, written into config.js at deploy),
// reaching what is shared as "Anyone with the link". Writes (req/shell/data/drive-access) go only to a study's own
// folders, with Google's per-file permission: the page only creates files, each marked as its own, and changes or
// trashes only the files so marked; the one other write is an item's link sharing, on the owner's press of Fix in Study
// Setup's sharing check (req/setup/sharing-check). Reading keeps nothing: a file goes to the study
// like one loaded from the computer.
"use strict";
import { accepts, isTiff } from "./accepts.js";
import { isVsi, pairBytes } from "./vsi.js";
import { work } from "./pending.js";

const GOOGLE = (window.NOR_CONFIG && window.NOR_CONFIG.google) || {};
// what a study's image from Drive is, as its source records it on this device and in the documents it writes
const KIND = "drive";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";
// the private property every file the page creates carries, which only this site's own reads see
const MINE = { rauntruth: "made" };
const THROTTLING = "Google is throttling this site's downloads";
const RUN_OUT = "Your Google sign-in has run out: click again to renew it";
// Drive's batch endpoint, and the calls it takes in one request
const BATCH = "https://www.googleapis.com/batch/drive/v3", BATCH_CALLS = 100;

// The bodies of Drive's uploads, written out as bytes, not a FormData or a Blob: Playwright's WebKit hands a page test
// a FormData or Blob body with its parts empty, where bytes arrive whole.
const encode = (t) => new TextEncoder().encode(t);
// A multipart upload (uploadType=multipart, documented as multipart/related): the file's details, then the file, in one
// request. details: the file's metadata; file: a string or a Blob; type: the file's content type. {headers, body}.
export async function multipart(details, file, type) {
  const cut = "rauntruth-" + Math.random().toString(36).slice(2);
  const head = encode(`--${cut}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(details)}\r\n--${cut}\r\nContent-Type: ${type}\r\n\r\n`);
  const content = typeof file === "string" ? encode(file) : new Uint8Array(await file.arrayBuffer());
  const tail = encode(`\r\n--${cut}--\r\n`);
  const body = new Uint8Array(head.length + content.length + tail.length);
  body.set(head, 0); body.set(content, head.length); body.set(tail, head.length + content.length);
  return { headers: { "content-type": `multipart/related; boundary=${cut}` }, body: body.buffer };
}
// A media upload (uploadType=media): the file's content alone, a Blob. {headers, body}.
const media = async (blob) => ({ headers: { "content-type": blob.type || "application/octet-stream" }, body: await blob.arrayBuffer() });

export const remote = (() => {
  const key = GOOGLE.apiKey || "";
  const API = "https://www.googleapis.com/drive/v3/files";
  // the bytes Drive's answers have brought, for the status bar's network: Google does not let a page read their size
  let received = 0;
  // the sign-in (account.js), once the page hands it over: {signedIn(), forRead(), refused()}
  let signIn = null;
  const signedIn = () => !!signIn?.signedIn();
  const get = async (url, init = {}) => {
    const u = new URL(url), mine = signedIn();
    if (mine) {
      const token = await signIn.forRead();
      if (!token) throw new Error(RUN_OUT);
      init = { ...init, headers: { ...init.headers, authorization: "Bearer " + token } };
    } else u.searchParams.set("key", key);
    u.searchParams.set("supportsAllDrives", "true");
    if (u.searchParams.has("q")) u.searchParams.set("includeItemsFromAllDrives", "true");
    const r = await fetch(u, init);
    if (mine && r.status === 401) signIn.refused();
    return r.body ? new Response(r.body.pipeThrough(new TransformStream({ transform(c, out) { received += c.byteLength; out.enqueue(c); } })), r) : r;
  };

  // {kind: "file" | "folder", id} from any Drive link; a bare id is looked up
  function parse(link) {
    const s = link.trim();
    let m = s.match(/\/folders\/([\w-]{10,})/);
    if (m) return { kind: "folder", id: m[1] };
    m = s.match(/\/file\/d\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{20,})$/);
    return m ? { kind: "file", id: m[1] } : null;
  }

  const need = () => { if (!key && !signedIn()) throw new Error("this site has no Google API key yet (issue #234)"); };
  const refused = (r, what) => Object.assign(new Error(signedIn()
    ? r.status === 404 ? `Your Google account cannot see this ${what}` : `Drive refused the ${what} (${r.status}) to your Google account`
    : r.status === 400 ? `Google refused this site's API key (${r.status})`
      : `Drive refused the ${what} (${r.status}): is it shared as "Anyone with the link"? Signed in, you can open any your account can see`),
    // the store's own answer, and whether it is the one given to an account that may not read it, which is no failure of the page's
    { status: r.status, noAccess: r.status === 403 || r.status === 404 });

  // Google answers a burst of downloads by refusing the site's for a while, without the header that lets a page
  // read the refusal: a download that fails while the file's details still answer is that, an Error with
  // throttled set
  const throttled = () => Object.assign(new Error(THROTTLING), { throttled: true });
  async function download(id, init = {}) {
    const at = `${API}/${encodeURIComponent(id)}`;
    let r;
    try { r = await get(`${at}?alt=media`, init); } catch (e) {
      if (e.name !== "AbortError" && (await get(`${at}?fields=id`, { signal: init.signal }).then((d) => d.ok, () => false))) throw throttled();
      throw e;
    }
    if (r.status === 403 && /rateLimitExceeded|downloadQuotaExceeded/.test(await r.clone().text())) throw throttled();
    if (!r.ok) throw refused(r, "file");
    return r;
  }

  // onStart(name) runs once the download begins and onChunk(buffer, got, total) as each piece arrives,
  // the bytes so far at the start of buffer; total is null when Drive does not say
  async function file(id, name, onStart, onChunk) {
    need();
    if (pairs.has(id)) return pair(id, name || pairs.get(id).name, onStart);
    const at = `${API}/${encodeURIComponent(id)}`;
    if (!name) {
      const r = await get(`${at}?fields=name,mimeType`);
      if (!r.ok) throw refused(r, "file");
      const f = await r.json();
      if (f.mimeType === "application/vnd.google-apps.folder") return { folder: true, id, name: f.name };
      name = f.name;
    }
    const r = await download(id);
    if (onStart) onStart(name);
    const total = +r.headers.get("content-length") || null;
    if (!onChunk || !r.body) return { name, bytes: await r.arrayBuffer() };
    let buf = new ArrayBuffer(total || 1 << 20), got = 0;
    for (const reader = r.body.getReader(); ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      if (got + value.length > buf.byteLength) {
        const more = new ArrayBuffer(Math.max(2 * buf.byteLength, got + value.length));
        new Uint8Array(more).set(new Uint8Array(buf, 0, got)); buf = more;
      }
      new Uint8Array(buf, got).set(value); got += value.length;
      onChunk(buf, got, total);
    }
    return { name, bytes: got === buf.byteLength ? buf : buf.slice(0, got) };
  }

  // the first n bytes of a file, as an ArrayBuffer
  async function head(id, n, signal) {
    need();
    return (await download(id, { headers: { Range: `bytes=0-${n - 1}` }, signal })).arrayBuffer();
  }

  // a file's SHA-256 as Drive gives it, null when it gives none
  async function checksum(id) {
    need();
    const r = await get(`${API}/${encodeURIComponent(id)}?fields=sha256Checksum`);
    if (!r.ok) throw refused(r, "file");
    return (await r.json()).sha256Checksum || null;
  }

  // [{id, name, folder, size, created, preview, sha}] in a folder: its subfolders and the files whose extension accept
  // names, a study's files.accept (".tif,.tiff,.png"); size in bytes (null for a folder), created a Date, preview the link of Drive's own small
  // picture of the file or null, served for every image but a TIFF (Drive draws a multi-channel TIFF grey, and a TIFF
  // may be a stack, which the page pictures in 3D), sha its SHA-256 or null when Drive gives none
  const driveThumb = (f) => (f.thumbnailLink && !isTiff(f.name) ? f.thumbnailLink : null);
  async function list(id, accept) {
    need();
    const opens = accepts(accept);
    const q = encodeURIComponent(`'${id}' in parents and trashed = false`);
    const r = await get(`${API}?q=${q}&fields=files(id,name,mimeType,size,createdTime,thumbnailLink,sha256Checksum)&pageSize=1000&orderBy=folder,name`);
    if (!r.ok) throw refused(r, "folder");
    const all = (await r.json()).files
      .map((f) => ({ id: f.id, name: f.name, folder: f.mimeType === "application/vnd.google-apps.folder",
        size: f.size == null ? null : +f.size, created: f.createdTime ? new Date(f.createdTime) : null,
        preview: driveThumb(f), sha: f.sha256Checksum || null }))
      .filter((f) => f.folder || opens(f.name));
    // a cellSens image is one row: its .vsi, its _<name>_ folder not listed (req/shell/image/cellsens); its size is
    // the pixels', unknown until its folder is read
    const held = new Set();
    for (const f of all) {
      const folder = !f.folder && isVsi(f.name) && all.find((g) => g.folder && g.name === `_${f.name.replace(/\.vsi$/i, "")}_`);
      if (!folder) continue;
      pairs.set(f.id, { name: f.name, folder: folder.id });
      held.add(folder.id); f.size = null;
    }
    return all.filter((f) => !held.has(f.id));
  }

  // the cellSens images listed so far, by their .vsi's id: {name, folder} (req/shell/image/cellsens)
  const pairs = new Map();
  // a folder's one entry named name, whatever its kind
  async function child(folder, name) {
    const q = encodeURIComponent(`'${folder}' in parents and trashed = false`);
    const r = await get(`${API}?q=${q}&fields=files(id,name)&pageSize=1000`);
    if (!r.ok) throw refused(r, "folder");
    const f = (await r.json()).files.find((x) => x.name === name);
    if (!f) throw new Error(`${name} is missing from this cellSens image's folder.`);
    return f.id;
  }
  // a cellSens image as one file: its .vsi, then its folder's stack1 and the .ets in it, the three reads its .vsi
  // adds, zipped together
  async function pair(id, name, onStart) {
    const at = pairs.get(id), vsi = await download(id);
    if (onStart) onStart(name);
    const ets = await download(await child(await child(at.folder, "stack1"), "frame_t_0.ets"));
    return { name, bytes: (await pairBytes(name, new Uint8Array(await vsi.arrayBuffer()), new Uint8Array(await ets.arrayBuffer()))).buffer };
  }

  // [{id, name, folder, size, sha, modified, properties, preview}] every file and folder in a folder, whatever its kind,
  // every page of them; modified Drive's time of its last change, properties its public ones; preview, with pictures,
  // as list gives it, else null
  async function all(id, { pictures = false } = {}) {
    need();
    const q = encodeURIComponent(`'${id}' in parents and trashed = false`), out = [];
    for (let page = ""; ; ) {
      const r = await get(`${API}?q=${q}&fields=nextPageToken,files(id,name,mimeType,size,sha256Checksum,modifiedTime,properties${pictures ? ",thumbnailLink" : ""})&pageSize=1000&orderBy=folder,name${page && "&pageToken=" + page}`);
      if (!r.ok) throw refused(r, "folder");
      const got = await r.json();
      out.push(...got.files.map((f) => ({ id: f.id, name: f.name, folder: f.mimeType === "application/vnd.google-apps.folder",
        size: f.size == null ? null : +f.size, sha: f.sha256Checksum || null, modified: f.modifiedTime || null, properties: f.properties || {}, preview: driveThumb(f) })));
      if (!(page = got.nextPageToken)) return out;
    }
  }

  // whether the signed-in user may add files to folder id, as Drive answers their token: true, false, or null when
  // nobody is signed in or Drive does not say (req/shell/data/roles)
  async function canWrite(id) {
    if (!signedIn()) return null;
    const r = await get(`${API}/${encodeURIComponent(id)}?fields=capabilities(canAddChildren)&supportsAllDrives=true`);
    if (r.status === 404 || r.status === 403) return false;
    if (!r.ok) return null;
    return !!(await r.json()).capabilities?.canAddChildren;
  }

  // whether the site's key alone reads a file or a folder, as one shared "Anyone with the link" is read: true, false,
  // or null when the site has no key to ask with (req/shell/data/folders)
  async function publicly(id) {
    if (!key) return null;
    const r = await fetch(`${API}/${encodeURIComponent(id)}?fields=id&supportsAllDrives=true&key=${encodeURIComponent(key)}`);
    if (r.status === 404 || r.status === 403) return false;
    return r.ok ? true : null;
  }

  // Several reads in one request, to Drive's batch endpoint: calls are paths under /drive/v3/, such as "files/<id>?fields=id",
  // each answered as it would be alone; the HTTP status of each, in order (null for one the answer lacks). A batch holds
  // 100 calls at most, so a longer list goes in more than one request.
  async function batch(calls) {
    need();
    const out = [];
    for (let at = 0; at < calls.length; at += BATCH_CALLS) {
      const cut = "rauntruth-" + Math.random().toString(36).slice(2), part = calls.slice(at, at + BATCH_CALLS);
      const body = part.map((c, k) => `--${cut}\r\nContent-Type: application/http\r\nContent-ID: <item${k}>\r\n\r\nGET /drive/v3/${c}${c.includes("?") ? "&" : "?"}supportsAllDrives=true HTTP/1.1\r\n\r\n`).join("") + `--${cut}--`;
      const r = await get(BATCH, { method: "POST", headers: { "content-type": `multipart/mixed; boundary=${cut}` }, body: encode(body) });
      if (!r.ok) throw refused(r, "batch request");
      const answered = (await r.text()).split(/^--[^\r\n]*/m).filter((p) => /HTTP\/1\.1 \d+/.test(p));
      const status = new Map(answered.map((p, k) => [p.match(/Content-ID:\s*<?response-item(\d+)>?/i)?.[1] ?? String(k), +p.match(/HTTP\/1\.1 (\d+)/)[1]]));
      for (let k = 0; k < part.length; k++) out.push(status.get(String(k)) ?? null);
    }
    return out;
  }

  // who an item is shared with, as Drive lists it (req/setup/people): [{id, type, role, emailAddress, name}], an Error with
  // status set where Drive does not let the signed-in account read it
  async function permissions(id) {
    need();
    const out = [];
    for (let page = ""; ;) {
      const r = await get(`${API}/${encodeURIComponent(id)}/permissions?fields=${encodeURIComponent("nextPageToken,permissions(id,type,role,emailAddress,displayName)")}&pageSize=100${page}`);
      if (!r.ok) throw Object.assign(refused(r, "sharing"), { status: r.status });
      const got = await r.json();
      out.push(...(got.permissions || []).map((p) => ({ id: p.id, type: p.type, role: p.role, emailAddress: p.emailAddress, name: p.displayName })));
      if (!got.nextPageToken) return out;
      page = "&pageToken=" + encodeURIComponent(got.nextPageToken);
    }
  }

  // a file's or a folder's name
  async function name(id) {
    need();
    const r = await get(`${API}/${encodeURIComponent(id)}?fields=name`);
    if (!r.ok) throw refused(r, "folder");
    return (await r.json()).name;
  }


  // The writer for a study's own folders, for a signed-in user: account the sign-in (account.js)
  function writer(account) {
    // a live token, renewed in the user's click where it has run out, else an Error asking for another click
    const token = async () => {
      const t = await account.forRead();
      if (t) return t;
      throw new Error(RUN_OUT);
    };
    // Google's answer, or an Error with Google's own words for a refusal
    async function google(url, init = {}) {
      const r = await fetch(url, { ...init, headers: { ...init.headers, authorization: "Bearer " + await token() } });
      if (r.ok) return r;
      let why = "";
      try { why = (await r.json()).error?.message || ""; } catch { /* no words */ }
      throw Object.assign(new Error(`Google refused (${r.status})${why ? ": " + why : ""}`), { status: r.status });
    }
    return work.counted({
      // "write", "view" (Drive gives the user no more than a view), "unpermitted" (the sign-in holds no per-file
      // permission, its box unticked), or null when it cannot tell now (no live token)
      async access(id) {
        if (!account.writes()) return "unpermitted";
        if (!account.token()) return null;
        try {
          const f = await (await google(`${API}/${encodeURIComponent(id)}?fields=id,capabilities(canAddChildren)&supportsAllDrives=true`)).json();
          return f.capabilities?.canAddChildren ? "write" : "view";
        } catch (e) {
          if (e.status === 404 || e.status === 403) return "view";
          throw e;
        }
      },
      // a new file in folder parent: its id
      async create(parent, name, blob) {
        const upload = await multipart({ name, parents: [parent], appProperties: MINE }, blob, blob.type || "application/octet-stream");
        return (await (await google(`${UPLOAD}?uploadType=multipart&fields=id,sha256Checksum&supportsAllDrives=true`, { method: "POST", ...upload })).json());
      },
      // a new folder in folder parent, the page's own: its id
      async folder(parent, name) {
        return (await (await google(`${API}?fields=id&supportsAllDrives=true`, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent], appProperties: MINE }) })).json()).id;
      },
      // whether the page made the file, and so may change it
      async ours(id) {
        try {
          const f = await (await google(`${API}/${encodeURIComponent(id)}?fields=appProperties&supportsAllDrives=true`)).json();
          return f.appProperties?.rauntruth === MINE.rauntruth;
        } catch (e) { if (e.status === 404 || e.status === 403) return false; throw e; }
      },
      // new bytes for a file the page made; keepForever: Drive keeps the version replaced for good, not for its 30 days
      async replace(id, blob, { keepForever = false } = {}) {
        return (await (await google(`${UPLOAD}/${encodeURIComponent(id)}?uploadType=media&fields=id,sha256Checksum&supportsAllDrives=true${keepForever ? "&keepRevisionForever=true" : ""}`, { method: "PATCH", ...(await media(blob)) })).json());
      },
      // public properties set on a file the page made, which a reader with no sign-in sees too
      async mark(id, properties) {
        await google(`${API}/${encodeURIComponent(id)}?supportsAllDrives=true`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ properties }) });
      },
      // a folder the page made, shared with anyone with its link to view (req/shell/ground-truth/setup)
      async share(id) {
        await google(`${API}/${encodeURIComponent(id)}/permissions?supportsAllDrives=true`, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "anyone", role: "reader" }) });
      },
      // an item's link permission taken off, only when the owner pressed Fix and confirmed (req/setup/sharing-check)
      async unshare(id, permissionId) {
        await google(`${API}/${encodeURIComponent(id)}/permissions/${encodeURIComponent(permissionId)}?supportsAllDrives=true`, { method: "DELETE" });
      },
      // a file the page made, to Drive's bin
      async trash(id) {
        await google(`${API}/${encodeURIComponent(id)}?supportsAllDrives=true`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) });
      },
    }, ["access", "create", "folder", "ours", "replace", "mark", "share", "unshare", "trash"], "store write");
  }

  // the parts of a study's study.json that name Drive: whether its images open from the store, its root folder's id
  // (null for none), and the path of its ready-made thumbnails (driveThumbs) or null
  const study = (m) => {
    const r = m?.root ? parse(m.root) : null;
    return { opens: !!m?.files?.from?.includes(KIND), root: r?.kind === "folder" ? r.id : null, thumbs: m?.driveThumbs || null };
  };

  return work.counted({
    // what the page calls the store, in full and short
    label: "Google Drive", short: "Drive",
    // the store's logo, an SVG <symbol> the page's sprite takes in, of this id
    logo: { id: "remote-logo", symbol: '<symbol id="remote-logo" viewBox="0 0 24 21"><path fill="#0f9d58" d="M8 0l4 7-8 14-4-7z"/><path fill="#ffba00" d="M8 0h8l8 14h-8z"/><path fill="#4285f4" d="M8 14h16l-4 7H4z"/></symbol>' },
    // the words the page shows about the store
    words: {
      hint: (signed) => (signed ? "Paste the link of an image or a folder your Google account can see."
        : 'Paste the link of an image or a folder shared as "Anyone with the link".'),
      placeholder: "https://drive.google.com/…",
      notLink: "That does not look like a Google Drive link.",
      unready: "Needs this site's Google API key (issue #234)",
      noKey: "needs this site's Google API key",
      throttling: THROTTLING,
      throttled: THROTTLING + ". Try again in 15 minutes.",
    },
    // where a person changes an item's sharing in the store themselves, and the words and pictures of doing it there
    sharing: {
      link: (kind, id) => (kind === "file" ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/view?usp=sharing`
        : `https://drive.google.com/drive/folders/${encodeURIComponent(id)}?usp=sharing`),
      check: "Check its sharing in Drive",
      open: "Open its sharing in Drive",
      refused: "Drive did not let this sign-in change it: change it there, with the link above and the picture.",
      pictures: { link: ["sharing-link.svg", "Drive's Share dialog: General access set to Anyone with the link, as Viewer"],
        named: ["sharing-named.svg", "Drive's Share dialog: General access set to Restricted, the named people kept"],
        editor: ["sharing-editor.svg", "Drive's Share dialog: a person's email added as an Editor"] },
    },
    use: (s) => { signIn = s; }, signedIn, parse, file, head, checksum, list, all, batch, name, permissions, publicly, canWrite, writer, study,
    ready: !!key, received: () => received,
    // an image from the store, as a source records it; whether a source is one
    source: (id, more = {}) => ({ kind: KIND, id, ...more }),
    owns: (src) => src?.kind === KIND,
    // what a document records of where an image from the store is: the id field it carries, and its full location
    cite: (src) => ({ drive_id: src.id }),
    locate: (src) => ({ source: KIND, drive_id: src.id, url: `https://drive.google.com/file/d/${src.id}/view` }),
  }, ["file", "head", "checksum", "list", "all", "batch", "name", "permissions", "publicly", "canWrite"], "store read");
})();
