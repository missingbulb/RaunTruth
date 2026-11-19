// A page test's server for the site, on a free port of this machine: each address the test answers itself, else the
// repo's own file at that address as the site serves it (repo_file.mjs), each typed by its extension.
//   const { origin, server } = await serveSite({
//     "/web/worker.js": "",                          a body
//     "/web/config.js": () => body,                  a body made as the request comes
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
  const dirs = Object.entries(answers).filter(([u, a]) => u.endsWith("/") && a?.dir);
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(new URL(q.url, "http://x").pathname), a = answers[u];
    if (typeof a === "string" || typeof a === "function") {
      r.writeHead(200, { "content-type": typeOf(u) });
      return r.end(typeof a === "function" ? a(q) : a);
    }
    const under = dirs.find(([d]) => u.startsWith(d));
    const f = a?.file ?? (under ? path.join(under[1].dir, u.slice(under[0].length)) : repoFile(REPO, u));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": typeOf(f) }); fs.createReadStream(f).pipe(r);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { origin: `http://127.0.0.1:${server.address().port}`, server };
}
