// Google Drive, as the page tests' fake of it: one Drive of folders and files for a browser's every context, as a
// person's Drive is the same on each of their devices, answering the Drive API the way Drive does, its file picker,
// and the small pictures it serves for files. Each study's own folder (study.json's root) is there from the start,
// empty and shared with anyone with the link. The settings file in the user's app folder is the sign-in fake's.
//   const drive = googleDrive(ctx);
//   drive.folder({ id, name, parent, access: "public" | "private" });   access: who reads it, the site's key or
//     the signed-in user's token alone; a file or folder takes its folder's unless it says
//   drive.file({ id, name, parent, bytes, mimeType, createdTime, also });   also: other folders it is in, as Drive has
//     let a file sit in several; drive.files: every item, a test may change it
//     ({id, name, parent, folder, bytes, mine, props, modified}); drive.get(id)
//   drive.approved, drive.viewOnly                     the folders the site was approved for (its picker), and the
//     folders Drive's sharing lets the user only view
//   drive.writers                                      per folder, who Drive's sharing lets add to it (a Set of
//     emails), in place of the site's approval; drive.hidden: folders shared with the user alone
//   drive.outage = null | "throttled" | "down" | "details";   downloads refused as Google throttles a site (a failed
//     request), nothing answering, or the files' details alone not answering
//   drive.checksums = false;                           no SHA-256 for any file, as Drive gives none for some
//   drive.hold = (call) => promise;                    an answer kept back until the promise settles, as a test
//     holds one (held.mjs) to make it slower than the user
//   drive.uploaded = (file) => {};                     each file the page creates or replaces, once it has
//   drive.pick = "picked" | "cancel" | (ids) => promise   what the picker answers once the page shows it
//   drive.calls, drive.writes, drive.thumbs, drive.shared, drive.keptForever   what the page asked
//   drive.next(predicate)                              the next call matching it, once it is answered
//   drive.inflight                                     how many calls are being answered now
//   drive.offered                                      files the remote files dialog lists in whichever folder it shows
//     (its listings alone, which ask for thumbnails), as a test hands the user a file to open
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORS, bearer, holder, json, multipart } from "./google_sign_in.mjs";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const API = /^https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\/files/;
const THUMB = "https://lh3.googleusercontent.com/drive-thumb/";
const PICKER = "https://apis.google.com/js/api.js";
const FOLDER = "application/vnd.google-apps.folder";
const TYPES = { ".tif": "image/tiff", ".tiff": "image/tiff", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".bmp": "image/bmp", ".json": "application/json", ".vsi": "application/octet-stream" };
const notFound = (route) => json(route, 404, { error: { code: 404, message: "File not found" } });
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

// the studies' own folders, as their study.json files name them
const ROOTS = fs.readdirSync(path.join(REPO, "studies")).flatMap((id) => {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(REPO, "studies", id, "study.json"), "utf8"));
    const root = (s.root || "").match(/\/folders\/([\w-]+)/)?.[1];
    return root ? [{ id: root, name: s.title || id }] : [];
  } catch { return []; }
});

// the picker's script: the folders it was shown, and a pick of them, through this fake
const PICKER_SCRIPT = `(() => {
  // a builder whose every method it does not name returns the builder itself
  const chain = () => { const p = new Proxy({}, { get: (t, k) => k in t ? t[k] : () => p }); return p; };
  let ids = [], done = null;
  window.gapi = { load: (name, ok) => ok() };
  window.google = window.google || {};
  window.google.picker = {
    Action: { PICKED: "picked", CANCEL: "cancel" }, DocsViewMode: { LIST: "list" }, Feature: { MULTISELECT_ENABLED: "multi" },
    DocsView: function () { const v = chain(); v.setFileIds = (s) => { ids = s.split(","); return v; }; return v; },
    PickerBuilder: function () {
      const b = chain();
      b.setCallback = (f) => { done = f; return b; };
      b.build = () => ({ setVisible: () => window.__fakePicker(ids).then((a) => done && done({ action: a })) });
      return b;
    },
  };
})();`;

const fakes = new WeakMap();
export const googleDrive = (ctx) => fakes.get(ctx);

function makeDrive() {
  let n = 0, clock = Date.parse("2026-11-05T08:00:00Z");
  const tick = () => new Date(clock += 1000).toISOString();
  const drive = {
    files: [], approved: new Set(), viewOnly: new Set(), writers: new Map(), hidden: new Set(), offered: new Set(), waiting: [], tick,
    get: (id) => drive.files.find((f) => f.id === id),
    outage: null, checksums: true, hold: () => null, uploaded: () => {},
    calls: [], writes: [], thumbs: [], shared: [], keptForever: [], inflight: 0,
    // the picker's answer once shown: "picked" approves what it was shown, "cancel" nothing; or (ids) => a promise of
    // one, for a test that answers when it is ready
    pick: "picked",
    folder({ id = `fakefolder${String(++n).padStart(10, "0")}`, name, parent = null, access, mine = false } = {}) {
      const f = { id, name, parent, folder: true, access, mine, props: {}, createdTime: tick(), modified: tick() };
      drive.files.push(f);
      return f;
    },
    file({ id = `fakefile${String(++n).padStart(12, "0")}`, name, parent = null, bytes = Buffer.alloc(0), mimeType, access, mine = false, createdTime, also } = {}) {
      const f = { id, name, parent, also, folder: false, mimeType, bytes: Buffer.from(bytes), access, mine, props: {}, createdTime: createdTime || tick(), modified: tick() };
      drive.files.push(f);
      return f;
    },
    next: (match = () => true) => new Promise((ok) => drive.waiting.push({ match, ok })),
  };
  for (const r of ROOTS) drive.folder({ ...r, access: "public" });
  return drive;
}

// a browser's Drive, made on first need
export const driveIn = (world) => (world.drive ||= makeDrive());

export async function fakeGoogleDrive(ctx, world) {
  const drive = driveIn(world), tick = drive.tick, waiting = drive.waiting;
  fakes.set(ctx, drive);

  // who reads an item: the access it says, or its folder's, public at the top
  const access = (f) => {
    for (let g = f; g; g = drive.get(g.parent)) { if (drive.hidden.has(g.id)) return "private"; if (g.access) return g.access; }
    return "public";
  };
  const writable = (id) => drive.approved.has(id) || !!drive.get(id)?.mine;
  const type = (f) => f.folder ? FOLDER : f.mimeType || TYPES[path.extname(f.name).toLowerCase()] || "application/octet-stream";
  const meta = (f, fields) => ({
    id: f.id, name: f.name, mimeType: type(f), createdTime: f.createdTime || f.modified, modifiedTime: f.modified, properties: { ...f.props },
    ...(f.folder ? {} : { size: String(f.bytes.length) }),
    ...(!f.folder && drive.checksums && fields.includes("sha256Checksum") ? { sha256Checksum: sha(f.bytes) } : {}),
    ...(!f.folder && fields.includes("thumbnailLink") ? { thumbnailLink: THUMB + f.id } : {}),
  });

  async function answer(route, call) {
    const req = route.request(), u = new URL(req.url()), method = req.method(), fields = call.fields;
    const token = call.token, who = token ? holder(ctx, token) : null;
    if (token && !who) return json(route, 401, { error: { code: 401, message: "Invalid Credentials" } });
    if (!token && !call.key) return json(route, 403, { error: { code: 403, message: "The request is missing a valid API key." } });
    const f = drive.get(call.id);
    const sees = (g) => !!g && (who || access(g) === "public");
    if (call.kind === "list") {
      if (!sees(drive.get(call.parent))) return notFound(route);
      const offered = fields.includes("thumbnailLink") ? [...drive.offered].map((id) => drive.get(id)).filter(Boolean) : [];
      return json(route, 200, { files: drive.files.filter((g) => g.parent === call.parent || g.also?.includes(call.parent)).concat(offered).map((g) => meta(g, fields)) });
    }
    if (u.pathname.startsWith("/upload/")) {
      if (!who) return json(route, 401, { error: { code: 401, message: "Login Required" } });
      if (method === "POST") {
        const { metadata, bytes } = multipart(req);
        if (!writable(metadata.parents?.[0])) return json(route, 403, { error: { code: 403, message: "The user has not granted the app write access to the folder" } });
        const g = drive.file({ name: metadata.name, parent: metadata.parents[0], bytes, mimeType: metadata.mimeType, mine: metadata.appProperties?.rauntruth === "made" });
        drive.writes.push(["create", g.name]); drive.uploaded(g);
        return json(route, 200, { id: g.id, sha256Checksum: sha(bytes) });
      }
      if (!f?.mine) return notFound(route);
      f.bytes = req.postDataBuffer() || Buffer.alloc(0); f.modified = tick(); drive.writes.push(["replace", f.name]); drive.uploaded(f);
      if (u.searchParams.get("keepRevisionForever") === "true") drive.keptForever.push(f.name);
      return json(route, 200, { id: f.id });
    }
    if (method === "POST" && u.pathname.endsWith("/permissions")) {
      const on = drive.get(decodeURIComponent(u.pathname.split("/").at(-2)));
      if (!who || !on?.mine) return notFound(route);
      drive.shared.push([on.name, JSON.parse(req.postData())]); drive.writes.push(["share", on.name]);
      return json(route, 200, { id: "anyoneWithLink" });
    }
    if (method === "POST") {
      const m = JSON.parse(req.postData() || "{}");
      if (!who || !writable(m.parents?.[0])) return json(route, 403, { error: { code: 403, message: "The user has not granted the app write access to the folder" } });
      const g = drive.folder({ name: m.name, parent: m.parents[0], mine: m.appProperties?.rauntruth === "made" });
      drive.writes.push(["folder", g.name]);
      return json(route, 200, { id: g.id });
    }
    if (method === "PATCH") {
      if (!who || !f?.mine) return notFound(route);
      const body = JSON.parse(req.postData() || "{}");
      if (body.properties) { Object.assign(f.props, body.properties); drive.writes.push(["mark", f.name]); }
      else if (body.trashed) { drive.files.splice(drive.files.indexOf(f), 1); drive.writes.push(["trash", f.name]); }
      return json(route, 200, { id: f.id });
    }
    if (!sees(f)) return notFound(route);
    if (fields.includes("capabilities")) {
      // what the user's Drive sharing lets them do in a folder; a token that may touch only the files the site was
      // approved for (drive.file) hears of no other folder, as the page reads it (not approved)
      const writer = !!who && !drive.viewOnly.has(f.id) && (f.mine || (drive.writers.has(f.id) ? drive.writers.get(f.id).has(who.email) : drive.approved.has(f.id)));
      if (!who || (/\bdrive\.file\b/.test(who.scopes) && !writable(f.id) && !drive.writers.get(f.id)?.has(who.email))) return notFound(route);
      return json(route, 200, { id: f.id, capabilities: { canAddChildren: writer } });
    }
    if (fields.includes("appProperties")) return f.mine && who ? json(route, 200, { id: f.id, appProperties: { rauntruth: "made" } }) : notFound(route);
    // with no fields asked, Drive answers the few it always gives
    if (call.kind !== "download") return json(route, 200, fields ? meta(f, fields) : { id: f.id, name: f.name, mimeType: type(f) });
    const range = call.range?.match(/^bytes=(\d+)-(\d+)$/);
    const body = range ? f.bytes.subarray(+range[1], +range[2] + 1) : f.bytes;
    return route.fulfill({ status: range ? 206 : 200, headers: { ...CORS, "content-length": String(body.length) }, contentType: type(f), body });
  }

  await ctx.route((u) => API.test(u.href), async (route) => {
    const req = route.request(), u = new URL(req.url());
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const id = decodeURIComponent(u.pathname.match(/\/files\/([^/]+)/)?.[1] || "");
    const call = {
      method: req.method(), url: req.url(), id: id || null, fields: u.searchParams.get("fields") || "", range: req.headers().range || null,
      key: u.searchParams.get("key"), token: bearer(req),
      parent: (u.searchParams.get("q") || "").match(/'([^']+)' in parents/)?.[1] || null,
    };
    call.kind = req.method() !== "GET" ? "write" : !id ? "list" : u.searchParams.get("alt") === "media" ? (call.range ? "piece" : "download") : "details";
    if (call.kind === "piece") call.kind = "download", call.piece = true;
    drive.calls.push(call); drive.inflight++;
    await drive.hold(call);
    try {
      // Google's refusal of a throttled download lacks the header that lets the page read it: a failed request
      if (drive.outage === "down" || (drive.outage === "throttled" && call.kind === "download") || (drive.outage === "details" && call.kind === "details")) return await route.abort("failed");
      return await answer(route, call);
    } finally {
      drive.inflight--;
      for (const w of [...waiting]) if (w.match(call)) { waiting.splice(waiting.indexOf(w), 1); w.ok(call); }
    }
  });
  await ctx.route(THUMB + "*", (route) => {
    drive.thumbs.push(drive.get(route.request().url().slice(THUMB.length))?.name);
    return route.fulfill({ status: 200, headers: CORS, contentType: "image/jpeg", path: path.join(REPO, "web", "poster.jpg") });
  });
  await ctx.exposeBinding("__fakePicker", async (_, ids) => {
    const answer = typeof drive.pick === "function" ? await drive.pick(ids) : drive.pick;
    if (answer === "picked") for (const id of ids) drive.approved.add(id);
    return answer;
  });
  await ctx.route(PICKER, (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: PICKER_SCRIPT }));
}
