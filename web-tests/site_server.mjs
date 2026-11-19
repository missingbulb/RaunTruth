// A page test's server for the site, on a free port of this machine: each address the test answers itself, else the
// repo's own file at that address as the site serves it (repo_file.mjs), typed by its extension. An address ending in
// "/" answers every address under it.
//   const { origin, server } = await serveSite({
//     "/web/worker.js": "",                          a body
//     "/web/config.js": (q, u) => body,              made as the request comes: a body, { type, headers, body }, or
//                                                    nothing for a 404
//     "/web/answers.json": { file: answers },        a file of the test's
//     "/web/answers/": { dir: answers },             each address under it, from the test's folder
//   });
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoFile } from "./repo_file.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".wasm": "application/wasm",
  ".zip": "application/zip",
};
const typeOf = (f) => TYPES[path.extname(f)] || "application/octet-stream";

export async function serveSite(answers = {}) {
  const under = Object.keys(answers).filter((a) => a.endsWith("/"));
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
    const at = u in answers ? u : under.find((a) => u.startsWith(a)), a = at === undefined ? undefined : answers[at];
    const none = () => { r.writeHead(404); r.end(); };
    if (a?.dir || a?.file || a === undefined) {
      const f = a?.file ?? (a?.dir ? path.join(a.dir, u.slice(at.length)) : repoFile(REPO, u));
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return none();
      r.writeHead(200, { "content-type": typeOf(f) }); return void fs.createReadStream(f).pipe(r);
    }
    const got = typeof a === "function" ? a(q, u) : a;
    if (got == null) return none();
    const { type = typeOf(u), headers = {}, body } = typeof got === "string" || Buffer.isBuffer(got) ? { body: got } : got;
    r.writeHead(200, { "content-type": type, ...headers }); r.end(body);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { origin: `http://127.0.0.1:${server.address().port}`, server };
}
