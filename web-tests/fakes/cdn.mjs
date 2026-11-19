// jsDelivr, as the page tests' fake of it: a package's file from web-tests/node_modules, where page_libraries.py
// installs each library the page loads at the version it pins, and Pyodide's from the Pyodide installed there. A
// file of any other version, or one not installed, is not found, as a mistyped path on jsDelivr is. A CommonJS file
// asked for as /+esm comes as jsDelivr makes it, a module whose default export is what the file exports.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CDN = "https://cdn.jsdelivr.net/";
const MODULES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "node_modules");
const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".wasm": "application/wasm", ".txt": "text/plain", ".whl": "application/zip", ".zip": "application/zip" };
const cors = { "access-control-allow-origin": "*" };

const version = (name) => { try { return JSON.parse(fs.readFileSync(path.join(MODULES, name, "package.json"))).version; } catch { return null; } };

// the installed file a jsDelivr address names, or null
export function local(href) {
  const u = href.slice(CDN.length).replace(/[?#].*$/, "");
  const npm = u.match(/^npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.*)$/);
  if (npm) return version(npm[1]) === npm[2] ? path.join(MODULES, npm[1], npm[3].replace(/\/\+esm$/, "")) : null;
  const py = u.match(/^pyodide\/v([^/]+)\/full\/(.+)$/);
  if (py) return version("pyodide") === py[1] ? path.join(MODULES, "pyodide", py[2]) : null;
  return null;
}

// a file a test hands the fake under a jsDelivr address, for what no installed package holds (a word list, a model)
const extra = new WeakMap();
export const cdnFile = (ctx, href, body, contentType) => { (extra.get(ctx) || extra.set(ctx, new Map()).get(ctx)).set(href, { body, contentType }); };

export async function fakeCdn(ctx) {
  await ctx.route(CDN + "**", (route) => {
    const href = route.request().url(), made = extra.get(ctx)?.get(href);
    if (made) return route.fulfill({ status: 200, headers: cors, contentType: made.contentType, body: made.body });
    const f = local(href);
    if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, headers: cors, body: "" });
    const body = fs.readFileSync(f), esm = /\/\+esm(\?|$)/.test(href);
    if (esm && !/^\s*export\b/m.test(body.toString())) {
      return route.fulfill({ status: 200, headers: cors, contentType: "text/javascript",
        body: `var module = { exports: {} }, exports = module.exports;\n${body}\nexport default module.exports;\n` });
    }
    return route.fulfill({ status: 200, headers: cors, contentType: esm ? "text/javascript" : TYPES[path.extname(f)] || "application/octet-stream", body });
  });
}
