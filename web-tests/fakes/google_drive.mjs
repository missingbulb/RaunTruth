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
//   drive.readers                                      per item, who Drive's sharing lets read it (a Set of emails),
//     its contents too; sharing adds up, so an item is read by everyone named on it or on any folder above it. Where
//     none is named along the way, any signed-in user reads what the link does not reach. An item shared with
//     anyone with the link is read by all; the writers read too. drive.writers, unlike readers, is the nearest set
//     alone, not a union
//   drive.refuseSharing = false;                       true: a change of an item's sharing (adding or deleting a permission) is
//     refused 403 insufficientFilePermissions, as Drive refuses a sign-in whose scope does not reach the item
//   drive.outage = null | "throttled" | "down" | "details" | "writes";   downloads refused as Google throttles a site (a failed
//     request), nothing answering, the files' details alone not answering, or what the page writes alone not answering
//   drive.checksums = false;                           no SHA-256 for any file, as Drive gives none for some
//   drive.hold = (call) => promise;                    an answer kept back until the promise settles, as a test
//     holds one (held.mjs) to make it slower than the user
//   drive.uploaded = (file) => {};                     each file the page creates or replaces, once it has
//   drive.linkEdit   ids of the items whose link permission lets anyone edit, not only read
//   drive.calls, drive.writes, drive.thumbs, drive.shared, drive.unshared, drive.keptForever   what the page asked
//     (a call of a batch request is logged on its own, batched: true, and the request itself as kind "batch")
//   a file the page replaces keeps the version it had, as Drive does: file.revisions, each {id, bytes, modifiedTime,
//     keepForever}; files/<id>/revisions lists those and the current one last and read back at files/<id>/revisions/<id>?alt=media. Permissions
//     are listed from drive.readers, drive.writers and the link's access, added and deleted at files/<id>/permissions
//   drive.next(predicate)                              the next call matching it, once it is answered
//   drive.inflight                                     how many calls are being answered now
//   drive.offered                                      files the remote files dialog lists in whichever folder it shows
//     (its listings alone, which ask for thumbnails), as a test hands the user a file to open
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORS, holderIn, parts, signInIn } from "./google_sign_in.mjs";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const API = /^https:\/\/www\.googleapis\.com\/((upload\/)?drive\/v3\/files|batch\/drive\/v3)/;
const BATCH = "/batch/drive/v3";
const STATUS = { 200: "OK", 204: "No Content", 206: "Partial Content", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable" };
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
    return root ? [{ id: root, name: s.title || id }] : [];
  } catch { return []; }
});

const fakes = new WeakMap();
export const googleDrive = (ctx) => fakes.get(ctx);

function makeDrive() {
  let n = 0, clock = Date.parse("2026-11-05T08:00:00Z");
  const tick = () => new Date(clock += 1000).toISOString();
  const drive = {
    files: [], viewOnly: new Set(), writers: new Map(), readers: new Map(), hidden: new Set(), offered: new Set(), waiting: [], tick,
    get: (id) => drive.files.find((f) => f.id === id),
    outage: null, refuseSharing: false, checksums: true, hold: () => null, uploaded: () => {},
    linkEdit: new Set(), calls: [], writes: [], thumbs: [], shared: [], unshared: [], keptForever: [], inflight: 0,
    folder({ id = `fakefolder${String(++n).padStart(10, "0")}`, name, parent = null, access, mine = false } = {}) {
      const f = { id, name, parent, folder: true, access, mine, props: {}, revisions: [], createdTime: tick(), modified: tick() };
      drive.files.push(f);
      return f;
    },
    file({ id = `fakefile${String(++n).padStart(12, "0")}`, name, parent = null, bytes = Buffer.alloc(0), mimeType, access, mine = false, createdTime, also } = {}) {
      const f = { id, name, parent, also, folder: false, mimeType, bytes: Buffer.from(bytes), access, mine, props: {}, revisions: [], createdTime: createdTime || tick(), modified: tick() };
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
  // the set a map holds for an item or the nearest folder above it, or null
  const nearest = (map, f) => {
    for (let g = f; g; g = drive.get(g.parent)) if (map.has(g.id)) return map.get(g.id);
    return null;
  };
  // everyone named a reader on an item or any folder above it, or null where none is
  const readersOf = (f) => {
    let all = null;
    for (let g = f; g; g = drive.get(g.parent)) if (drive.readers.has(g.id)) all = new Set([...(all ?? []), ...drive.readers.get(g.id)]);
    return all;
  };
  // whether the account reads g: the link reaches it; or the account is among the readers along the way or the
  // nearest writers; or no readers are named along the way, and any signed-in user reads
  const reads = (g, who) => {
    if (!g) return false;
    if (access(g) === "public") return true;
    if (!who) return false;
    const readers = readersOf(g);
    return !readers || readers.has(who.email) || !!nearest(drive.writers, g)?.has(who.email);
  };
  // whether the account may change an item's sharing: it made it, or Drive's sharing names it a writer
  const manages = (g, who) => !!who && (!!g.mine || !!nearest(drive.writers, g)?.has(who.email));
  // the permissions an item has, as Drive lists them: the link's, then each reader and writer, a writer once
  const permissions = (g, fields) => {
    const want = (k) => fields.includes("*") || fields.includes(k);
    const one = (p) => Object.fromEntries(Object.entries({ kind: "drive#permission", id: p.id, type: p.type, role: p.role, emailAddress: p.emailAddress })
      .filter(([k, v]) => v !== undefined && (["kind", "id", "type", "role"].includes(k) || want(k))));
    const nearestWriters = nearest(drive.writers, g);
    const writers = nearestWriters instanceof Set ? [...nearestWriters] : [], readers = [...(readersOf(g) ?? [])].filter((e) => !writers.includes(e));
    return [...(access(g) === "public" ? [{ id: "anyoneWithLink", type: "anyone", role: drive.linkEdit.has(g.id) ? "writer" : "reader" }] : []),
      ...readers.map((e) => ({ id: "user-" + e, type: "user", role: "reader", emailAddress: e })),
      ...writers.map((e) => ({ id: "user-" + e, type: "user", role: "writer", emailAddress: e }))].map(one);
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
    if (call.kind === "batch") return batch(req);
    const f = drive.get(call.id);
    const sees = (g) => reads(g, who);
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
      f.revisions.push({ id: String(f.revisions.length + 1), bytes: f.bytes, modifiedTime: f.modified, keepForever: !!f.keepsHead });
      f.keepsHead = u.searchParams.get("keepRevisionForever") === "true";
      f.bytes = req.body || Buffer.alloc(0); f.modified = tick(); drive.writes.push(["replace", f.name]); drive.uploaded(f);
      if (u.searchParams.get("keepRevisionForever") === "true") drive.keptForever.push(f.name);
      return json(200, { id: f.id });
    }
    if (drive.refuseSharing && (method === "POST" || method === "DELETE") && /\/permissions(\/[^/]+)?$/.test(u.pathname)) {
      return json(403, { error: { code: 403, message: "The user does not have sufficient permissions for this file.", errors: [{ reason: "insufficientFilePermissions" }] } });
    }
    if (method === "POST" && u.pathname.endsWith("/permissions")) {
      const on = drive.get(decodeURIComponent(u.pathname.split("/").at(-2)));
      if (!on || !manages(on, who)) return notFound();
      const p = JSON.parse(req.body.toString());
      drive.shared.push([on.name, p]); drive.writes.push(["share", on.name]);
      if (p.type === "user" && p.emailAddress) {
        const [map, held] = p.role === "writer" ? [drive.writers, nearest(drive.writers, on)] : [drive.readers, drive.readers.get(on.id)];
        map.set(on.id, new Set([...(held ?? []), p.emailAddress]));
        return json(200, { kind: "drive#permission", id: "user-" + p.emailAddress, type: "user", role: p.role });
      }
      on.access = "public";
      return json(200, { id: "anyoneWithLink" });
    }
    if (method === "DELETE" && /\/permissions\/[^/]+$/.test(u.pathname)) {
      const on = f, pid = decodeURIComponent(u.pathname.split("/").at(-1));
      if (!on || !manages(on, who)) return notFound();
      const email = pid.startsWith("user-") ? pid.slice(5) : null;
      const own = drive.readers.get(on.id), writers = nearest(drive.writers, on);
      if (email ? !own?.has(email) && !writers?.has(email) : !(pid === "anyoneWithLink" && access(on) === "public")) return notFound();
      if (email) { own?.delete(email); if (writers?.has(email)) drive.writers.set(on.id, new Set([...writers].filter((e) => e !== email))); }
      else { on.access = "private"; drive.linkEdit.delete(on.id); }
      drive.unshared.push([on.name, pid]); drive.writes.push(["unshare", on.name]);
      return { status: 204, headers: CORS, contentType: "application/json", body: "" };
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
    if (method === "GET" && /\/permissions$/.test(u.pathname)) return json(200, { kind: "drive#permissionList", permissions: permissions(f, fields) });
    const rev = u.pathname.match(/\/revisions(?:\/([^/]+))?$/);
    if (rev) {
      if (!who) return notFound();
      const one = (v) => ({ kind: "drive#revision", id: v.id, mimeType: type(f), modifiedTime: v.modifiedTime, size: String(v.bytes.length), keepForever: v.keepForever });
      const all = [...f.revisions, { id: String(f.revisions.length + 1), bytes: f.bytes, modifiedTime: f.modified, keepForever: !!f.keepsHead }];
      if (!rev[1]) return json(200, { kind: "drive#revisionList", revisions: all.map(one) });
      const v = all.find((r) => r.id === decodeURIComponent(rev[1]));
      if (!v) return notFound();
      return u.searchParams.get("alt") === "media" ? { status: 200, headers: { ...CORS, "content-length": String(v.bytes.length) }, contentType: type(f), body: v.bytes } : json(200, one(v));
    }
    if (fields.includes("capabilities")) {
      // what the user's Drive sharing lets them do in a folder, whichever permissions the site holds
      if (!who) return notFound();
      return json(200, { id: f.id, capabilities: { canAddChildren: adds(f.id, who) } });
    }
    if (fields.includes("appProperties")) return json(200, { id: f.id, ...(f.mine && who ? { appProperties: { rauntruth: "made" } } : {}) });
    // with no fields asked, Drive answers the few it always gives
    if (call.kind !== "download") return json(200, fields ? meta(f, fields) : { id: f.id, name: f.name, mimeType: type(f) });
    const range = call.range?.match(/^bytes=(\d+)-(\d+)$/);
    const body = range ? f.bytes.subarray(+range[1], +range[2] + 1) : f.bytes;
    return { status: range ? 206 : 200, headers: { ...CORS, "content-length": String(body.length) }, contentType: type(f), body };
  }

  // a batch request: each part a call of its own, answered for the account and key the request carries, and the
  // answers sent back as parts in the order asked, each under the response id of its own
  async function batch(req) {
    const outer = new URL(req.url), boundary = (req.headers["content-type"] || "").match(/boundary="?([^";]+)"?/)?.[1];
    if (req.method !== "POST" || !boundary) return json(400, { error: { code: 400, message: "Invalid batch request" } });
    const out = [];
    for (const chunk of req.body.toString("utf8").split("--" + boundary).slice(1)) {
      if (chunk.startsWith("--")) break;
      const [head, message] = chunk.replace(/^\r?\n/, "").split(/\r?\n\r?\n(.*)/s);
      const [lines, body] = message.split(/\r?\n\r?\n(.*)/s);
      const [method, target] = lines.split(/\r?\n/)[0].split(" ");
      const headers = { ...req.headers };
      delete headers["content-type"];
      for (const l of lines.split(/\r?\n/).slice(1)) { const [k, ...v] = l.split(":"); headers[k.trim().toLowerCase()] = v.join(":").trim(); }
      const url = new URL(outer.origin + target);
      if (!url.searchParams.has("key") && outer.searchParams.has("key")) url.searchParams.set("key", outer.searchParams.get("key"));
      const got = (await respond({ method, url: url.href, headers, body: body?.trim() ? Buffer.from(body.replace(/\r?\n$/, "")) : null, batched: true })) || { status: 503, body: "" };
      const id = head.match(/Content-ID:\s*<?(?:response-)?([^>\r\n]+)>?/i)?.[1];
      const text = got.body == null ? "" : String(got.body);
      out.push(`--batch_fake\r\nContent-Type: application/http\r\n${id ? `Content-ID: <response-${id}>\r\n` : ""}\r\n`
        + `HTTP/1.1 ${got.status} ${STATUS[got.status] || ""}\r\n${got.contentType ? `Content-Type: ${got.contentType}; charset=UTF-8\r\n` : ""}Content-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}\r\n`);
    }
    return { status: 200, headers: CORS, contentType: "multipart/mixed; boundary=batch_fake", body: out.join("") + "--batch_fake--\r\n" };
  }

  const respond = async function (req) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return { status: 204, headers: CORS };
    const id = decodeURIComponent(u.pathname.match(/\/files\/([^/]+)/)?.[1] || "");
    const call = {
      method: req.method, url: req.url, id: id || null, fields: u.searchParams.get("fields") || "", range: req.headers.range || null,
      batched: !!req.batched, key: u.searchParams.get("key"), token: (req.headers.authorization || "").match(/^Bearer (.+)$/)?.[1] ?? null,
      parent: (u.searchParams.get("q") || "").match(/'([^']+)' in parents/)?.[1] || null,
    };
    call.kind = u.pathname === BATCH ? "batch" : req.method !== "GET" ? "write" : !id ? "list" : u.searchParams.get("alt") === "media" ? (call.range ? "piece" : "download") : "details";
    if (call.kind === "piece") call.kind = "download", call.piece = true;
    drive.calls.push(call); drive.inflight++;
    await drive.hold(call);
    try {
      // Google's refusal of a throttled download lacks the header that lets the page read it: a failed request
      if (drive.outage === "down" || (drive.outage === "writes" && call.kind === "write") || (drive.outage === "throttled" && call.kind === "download") || (drive.outage === "details" && call.kind === "details")) return null;
      return await answer(req, call);
    } finally {
      drive.inflight--;
      for (const w of [...waiting]) if (w.match(call)) { waiting.splice(waiting.indexOf(w), 1); w.ok(call); }
    }
  };
  return respond;
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
