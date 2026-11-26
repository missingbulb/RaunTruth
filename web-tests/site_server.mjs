// A page test's server for the site, on a free port of this machine: each address the test answers itself, else the
// site's own file at that address. An address ending in "/" answers every address under it, the longest such one
// first. The site's files are the repo's as the site serves them (repo_file.mjs), or, built: a release's folder as
// the host serves it.
//   const { origin, server } = await serveSite({
//     "/web/worker.js": "",                          a body
//     "/web/config.js": (q, u) => body,              made as the request comes: a body, { type, headers, status,
//                                                    body }, { file }, AS_SERVED for the site's own file, CUT for
//                                                    a connection cut, nothing for a 404, or a promise of one
//     "/web/answers.json": { file: answers },        a file of the test's
//     "/web/answers/": { dir: answers },             each address under it, from the test's folder
//   }, { built: SITE });
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoFile } from "./repo_file.mjs";
import { siteHeaders } from "./site_headers.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".wasm": "application/wasm",
  ".zip": "application/zip", ".whl": "application/zip", ".webmanifest": "application/manifest+json",
};
const typeOf = (f) => TYPES[path.extname(f)] || "application/octet-stream";
export const AS_SERVED = Symbol("the site's own file"), CUT = Symbol("the connection cut");

// As the host serves a release: /<name> is <name>.html, a folder its index.html, a folder's address with no slash
// redirected to it with one and a file's with one to it without, the headers _headers names added; and a study's
// address in the app the app's page, as repo_file.mjs serves the repo's.
function released(site) {
  const headers = siteHeaders(site);
  return (u, search) => {
    const at = path.join(site, u), folder = fs.existsSync(at) && fs.statSync(at).isDirectory();
    if (folder !== u.endsWith("/") && (folder || fs.existsSync(at.replace(/\/$/, "") + ".html") || /^\/app\/[\w-]+\/$/.test(u)))
      return { status: 307, headers: { location: (folder ? u + "/" : u.replace(/\/$/, "")) + search } };
    let f = at;
    if (u.endsWith("/")) f = path.join(f, "index.html");
    else if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
    else if (/^\/app\/[\w-]+$/.test(u) && fs.existsSync(path.join(site, "studies", u.slice(5), "study.json"))) f = path.join(site, "app", "index.html");
    return { file: f, headers: headers[u] || {} };
  };
}

export async function serveSite(answers = {}, { built } = {}) {
  const under = Object.keys(answers).filter((a) => a.endsWith("/")).sort((a, b) => b.length - a.length);
  const own = built ? released(built) : (u) => ({ file: repoFile(REPO, u), headers: {} });
  const server = http.createServer(async (q, r) => {
    const url = new URL(q.url, "http://x"), u = decodeURIComponent(url.pathname);
    const at = u in answers ? u : under.find((a) => u.startsWith(a)), a = at === undefined ? undefined : answers[at];
    const none = () => { r.writeHead(404); r.end(); };
    const file = (f, headers = {}) => {
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return none();
      r.writeHead(200, { "content-type": typeOf(f), "content-length": fs.statSync(f).size, ...headers });
      if (q.method === "HEAD") return r.end();
      fs.createReadStream(f).pipe(r);
    };
    const site = () => {
      const s = own(u, url.search);
      if (s.status) { r.writeHead(s.status, s.headers); return r.end(); }
      file(s.file, s.headers);
    };
    if (a === undefined) return site();
    if (a.file) return file(a.file);
    if (a.dir) return file(path.join(a.dir, u.slice(at.length)));
    const got = await (typeof a === "function" ? a(q, u) : a);
    if (got === AS_SERVED) return site();
    if (got === CUT) return void q.socket.destroy();
    if (got == null) return none();
    if (got.file) return file(got.file, got.headers);
    const { type = typeOf(u), headers = {}, status = 200, body } = typeof got === "string" || Buffer.isBuffer(got) ? { body: got } : got;
    r.writeHead(status, { "content-type": type, ...headers }); r.end(body);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { origin: `http://127.0.0.1:${server.address().port}`, server };
}
