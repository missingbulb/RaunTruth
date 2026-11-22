// Google Drive, as the page tests' fake of it: one Drive of folders and files for a browser's every context, as a
// person's Drive is the same on each of their devices, answering the Drive API the way Drive does, and the small pictures it serves for files. Each study's own folder (study.json's root) is there from the start,
// empty and shared with anyone with the link. The settings file in the user's app folder is the sign-in fake's.
// A test under Node, with no browser, has the same Drive answer Node's fetch (google_drive_under_node.mjs).
//   const drive = googleDrive(ctx);
//   drive.folder({ id, name, parent, access: "public" | "private" });   access: who reads it, the site's key or
//     the signed-in user's token alone; a file or folder takes its folder's unless it says
//   drive.file({ id, name, parent, bytes, mimeType, createdTime, also });   also: other folders it is in, as Drive has
//     let a file sit in several; drive.files: every item, a test may change it
//     ({id, name, parent, folder, bytes, mine, props, modified}); drive.get(id)
//   drive.viewOnly                                     the folders Drive's sharing lets the user only view
//   drive.writers                                      per folder, who Drive's sharing lets add to it (a Set of
//     emails), its subfolders too; a folder no writers reach lets anyone add; drive.hidden: folders shared with
//     the user alone
//   drive.outage = null | "throttled" | "down" | "details";   downloads refused as Google throttles a site (a failed
//     request), nothing answering, or the files' details alone not answering
//   drive.checksums = false;                           no SHA-256 for any file, as Drive gives none for some
//   drive.hold = (call) => promise;                    an answer kept back until the promise settles, as a test
//     holds one (held.mjs) to make it slower than the user
//   drive.uploaded = (file) => {};                     each file the page creates or replaces, once it has
//   drive.calls, drive.writes, drive.thumbs, drive.shared, drive.keptForever   what the page asked
//   drive.next(predicate)                              the next call matching it, once it is answered
//   drive.inflight                                     how many calls are being answered now
//   drive.offered                                      files the remote files dialog lists in whichever folder it shows
//     (its listings alone, which ask for thumbnails), as a test hands the user a file to open
//   drive.rootOf(study)                                the study's own folder, as its study.json names it
//   drive.writableBy(folder, ...emails)                Drive's sharing lets them add to it; writableByAnyone(folder):
//     anyone signed in; viewableOnly(folder): the user may only view it; sharedWithUserAlone(folder): not "Anyone with the
//     link", so the site's key reads neither it nor what it holds
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORS, holderIn, parts, signInIn } from "./google_sign_in.mjs";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const API = /^https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\/files/;
const THUMB = "https://lh3.googleusercontent.com/drive-thumb/";
const FOLDER = "application/vnd.google-apps.folder";
const TYPES = { ".tif": "image/tiff", ".tiff": "image/tiff", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".bmp": "image/bmp", ".json": "application/json", ".vsi": "application/octet-stream" };
// an answer, as a request to Drive gets one: {status, headers, contentType, body}
const json = (status, body) => ({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
const notFound = () => json(404, { error: { code: 404, message: "File not found" } });
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

// the studies' own folders, as their study.json files name them
const ROOTS = fs.readdirSync(path.join(REPO, "studies")).flatMap((id) => {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(REPO, "studies", id, "study.json"), "utf8"));
    const root = (s.root || "").match(/\/folders\/([\w-]+)/)?.[1];
    return root ? [{ id: root, name: s.title || id, study: id }] : [];
  } catch { return []; }
});

const fakes = new WeakMap();
export const googleDrive = (ctx) => fakes.get(ctx);

function makeDrive() {
  let n = 0, clock = Date.parse("2026-11-05T08:00:00Z");
  const tick = () => new Date(clock += 1000).toISOString();
  const drive = {
    files: [], viewOnly: new Set(), writers: new Map(), hidden: new Set(), offered: new Set(), waiting: [], tick,
    get: (id) => drive.files.find((f) => f.id === id),
    outage: null, checksums: true, hold: () => null, uploaded: () => {},
    calls: [], writes: [], thumbs: [], shared: [], keptForever: [], inflight: 0,
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
    rootOf: (study) => drive.get(ROOTS.find((r) => r.study === study)?.id),
    writableBy(folder, ...emails) {
      const id = folder.id ?? folder, now = drive.writers.get(id);
      drive.writers.set(id, new Set([...(now instanceof Set ? now : []), ...emails]));
      return folder;
    },
    writableByAnyone(folder) { drive.writers.set(folder.id ?? folder, { has: () => true }); return folder; },
    viewableOnly(folder) { drive.viewOnly.add(folder.id ?? folder); return folder; },
    sharedWithUserAlone(folder) { drive.hidden.add(folder.id ?? folder); return folder; },
  };
  for (const r of ROOTS) drive.folder({ ...r, access: "public" });
  return drive;
}

// a browser's Drive, made on first need
export const driveIn = (world) => (world.drive ||= makeDrive());

// What a Drive answers a request of its API, whoever carries the request to it, a browser's route or Node's fetch:
// respond({method, url, headers, body}), headers lower-case and body a Buffer or null, gives {status, headers,
// contentType, body}, or null for a request that fails. google: the sign-in whose tokens it honours.
export function driveAnswers(drive, google) {
  const tick = drive.tick, waiting = drive.waiting;

  // who reads an item: the access it says, or its folder's, public at the top
  const access = (f) => {
    for (let g = f; g; g = drive.get(g.parent)) { if (drive.hidden.has(g.id)) return "private"; if (g.access) return g.access; }
    return "public";
  };
  // whether Drive's sharing lets who add to folder id: the nearest writers set on it or a folder above it, else anyone
  const adds = (id, who) => {
    if (!who || drive.viewOnly.has(id)) return false;
    for (let g = drive.get(id); g; g = drive.get(g.parent)) { if (g.mine) return true; if (drive.writers.has(g.id)) return drive.writers.get(g.id).has(who.email); }
    return true;
  };
  // the per-file permission (drive.file) lets the site create in any folder the user may add to, as real Drive does
  // (missingbulb/RaunTruth#1042)
  const writable = (id, who) => /\bdrive\.file\b/.test(who?.scopes || "") && adds(id, who);
  const type = (f) => f.folder ? FOLDER : f.mimeType || TYPES[path.extname(f.name).toLowerCase()] || "application/octet-stream";
  const meta = (f, fields) => ({
    id: f.id, name: f.name, mimeType: type(f), createdTime: f.createdTime || f.modified, modifiedTime: f.modified, properties: { ...f.props },
    ...(f.folder ? {} : { size: String(f.bytes.length) }),
    ...(!f.folder && drive.checksums && fields.includes("sha256Checksum") ? { sha256Checksum: sha(f.bytes) } : {}),
    ...(!f.folder && fields.includes("thumbnailLink") ? { thumbnailLink: THUMB + f.id } : {}),
  });

  async function answer(req, call) {
    const u = new URL(req.url), method = req.method, fields = call.fields;
    const token = call.token, who = token ? holderIn(google, token) : null;
    if (token && !who) return json(401, { error: { code: 401, message: "Invalid Credentials" } });
    if (!token && !call.key) return json(403, { error: { code: 403, message: "The request is missing a valid API key." } });
    const f = drive.get(call.id);
    const sees = (g) => !!g && (who || access(g) === "public");
    if (call.kind === "list") {
      if (!sees(drive.get(call.parent))) return notFound();
      const offered = fields.includes("thumbnailLink") ? [...drive.offered].map((id) => drive.get(id)).filter(Boolean) : [];
      return json(200, { files: drive.files.filter((g) => g.parent === call.parent || g.also?.includes(call.parent)).concat(offered).map((g) => meta(g, fields)) });
    }
    if (u.pathname.startsWith("/upload/")) {
      if (!who) return json(401, { error: { code: 401, message: "Login Required" } });
      if (method === "POST") {
        const { metadata, bytes } = parts(req.body, req.headers["content-type"]);
        if (!writable(metadata.parents?.[0], who)) return json(403, { error: { code: 403, message: "The user has not granted the app write access to the folder" } });
        const g = drive.file({ name: metadata.name, parent: metadata.parents[0], bytes, mimeType: metadata.mimeType, mine: metadata.appProperties?.rauntruth === "made" });
        drive.writes.push(["create", g.name]); drive.uploaded(g);
        return json(200, { id: g.id, sha256Checksum: sha(bytes) });
      }
      if (!f?.mine) return notFound();
      f.bytes = req.body || Buffer.alloc(0); f.modified = tick(); drive.writes.push(["replace", f.name]); drive.uploaded(f);
      if (u.searchParams.get("keepRevisionForever") === "true") drive.keptForever.push(f.name);
      return json(200, { id: f.id });
    }
    if (method === "POST" && u.pathname.endsWith("/permissions")) {
      const on = drive.get(decodeURIComponent(u.pathname.split("/").at(-2)));
      if (!who || !on?.mine) return notFound();
      drive.shared.push([on.name, JSON.parse(req.body.toString())]); drive.writes.push(["share", on.name]);
      return json(200, { id: "anyoneWithLink" });
    }
    if (method === "POST") {
      const m = JSON.parse(req.body?.toString() || "{}");
      if (!who || !writable(m.parents?.[0], who)) return json(403, { error: { code: 403, message: "The user has not granted the app write access to the folder" } });
      const g = drive.folder({ name: m.name, parent: m.parents[0], mine: m.appProperties?.rauntruth === "made" });
      drive.writes.push(["folder", g.name]);
      return json(200, { id: g.id });
    }
    if (method === "PATCH") {
      if (!who || !f?.mine) return notFound();
      const body = JSON.parse(req.body?.toString() || "{}");
      if (body.properties) { Object.assign(f.props, body.properties); drive.writes.push(["mark", f.name]); }
      else if (body.trashed) { drive.files.splice(drive.files.indexOf(f), 1); drive.writes.push(["trash", f.name]); }
      return json(200, { id: f.id });
    }
    if (!sees(f)) return notFound();
    if (fields.includes("capabilities")) {
      // what the user's Drive sharing lets them do in a folder, whichever permissions the site holds
      if (!who) return notFound();
      return json(200, { id: f.id, capabilities: { canAddChildren: adds(f.id, who) } });
    }
    if (fields.includes("appProperties")) return f.mine && who ? json(200, { id: f.id, appProperties: { rauntruth: "made" } }) : notFound();
    // with no fields asked, Drive answers the few it always gives
    if (call.kind !== "download") return json(200, fields ? meta(f, fields) : { id: f.id, name: f.name, mimeType: type(f) });
    const range = call.range?.match(/^bytes=(\d+)-(\d+)$/);
    const body = range ? f.bytes.subarray(+range[1], +range[2] + 1) : f.bytes;
    return { status: range ? 206 : 200, headers: { ...CORS, "content-length": String(body.length) }, contentType: type(f), body };
  }

  return async function respond(req) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return { status: 204, headers: CORS };
    const id = decodeURIComponent(u.pathname.match(/\/files\/([^/]+)/)?.[1] || "");
    const call = {
      method: req.method, url: req.url, id: id || null, fields: u.searchParams.get("fields") || "", range: req.headers.range || null,
      key: u.searchParams.get("key"), token: (req.headers.authorization || "").match(/^Bearer (.+)$/)?.[1] ?? null,
      parent: (u.searchParams.get("q") || "").match(/'([^']+)' in parents/)?.[1] || null,
    };
    call.kind = req.method !== "GET" ? "write" : !id ? "list" : u.searchParams.get("alt") === "media" ? (call.range ? "piece" : "download") : "details";
    if (call.kind === "piece") call.kind = "download", call.piece = true;
    drive.calls.push(call); drive.inflight++;
    await drive.hold(call);
    try {
      // Google's refusal of a throttled download lacks the header that lets the page read it: a failed request
      if (drive.outage === "down" || (drive.outage === "throttled" && call.kind === "download") || (drive.outage === "details" && call.kind === "details")) return null;
      return await answer(req, call);
    } finally {
      drive.inflight--;
      for (const w of [...waiting]) if (w.match(call)) { waiting.splice(waiting.indexOf(w), 1); w.ok(call); }
    }
  };
}

export async function fakeGoogleDrive(ctx, world, outside) {
  const drive = driveIn(world), respond = driveAnswers(drive, signInIn(world));
  fakes.set(ctx, drive);
  outside.route((u) => API.test(u.href), async (route) => {
    const req = route.request();
    const answer = await respond({ method: req.method(), url: req.url(), headers: req.headers(), body: req.postDataBuffer() });
    return answer ? route.fulfill(answer) : route.abort("failed");
  });
  outside.route(THUMB + "*", (route) => {
    drive.thumbs.push(drive.get(route.request().url().slice(THUMB.length))?.name);
    return route.fulfill({ status: 200, headers: CORS, contentType: "image/jpeg", path: path.join(REPO, "web", "poster.jpg") });
  });
}
