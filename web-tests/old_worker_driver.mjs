// Drives a browser that ran the app at the site's top, with its service worker registered there (OLD_SW, the
// worker as it was), then the built site (SITE), and checks req/shell/site/app-address: the first visit to / shows the landing page and
// ends that registration, and /app/ registers its own.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/old_worker_driver.mjs SITE OLD_SW
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { until, orMissed } from "./page_until.mjs";
import { pw, keptContext, check } from "./harness.mjs";
import { siteHeaders } from "./site_headers.mjs";
import { ENGINE, LAUNCH } from "./engine.mjs";

const [site, oldSw] = process.argv.slice(2);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
let before = true;
// before: the app at the top, registering the old worker; after: the built site, as Cloudflare serves it, with the
// headers its _headers file names
const HEADERS = siteHeaders(site);
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (before) {
    if (u === "/sw.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(fs.readFileSync(oldSw)); }
    if (u === "/") { r.writeHead(200, { "content-type": "text/html" }); return r.end('<title>the app at the top</title><script>navigator.serviceWorker.register("sw.js")</script>'); }
    r.writeHead(404); return r.end();
  }
  let f = path.join(site, u);
  if (u.endsWith("/")) f = path.join(f, "index.html");
  else if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", ...HEADERS[u] });
  fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

let failed = false;
const ctx = await keptContext(pw);
const page = ctx.pages()[0] || await ctx.newPage();
const scopes = () => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname));
try {
  await page.goto(origin + "/");
  await until(page, async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 15000 });
  await page.reload();
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), "before: the old worker controls the site's top");
  before = false;
  await page.goto(origin + "/");
  const title = await page.title();
  check(!!(await page.$('a[href="app/"]')), "after: / shows the landing page: " + title);
  await orMissed(until(page, async () => !(await navigator.serviceWorker.getRegistrations()).length));
  const left = await scopes();
  check(!left.length, "after: the old registration is gone: " + JSON.stringify(left));
  await page.goto(origin + "/app/");
  await orMissed(until(page, async () => (await navigator.serviceWorker.getRegistrations()).some((r) => new URL(r.scope).pathname === "/app/"), null, { timeout: 15000 }));
  // the app also registers its address with no slash (req/shell/offline/default), which may land before or after this
  const now = await scopes();
  check(now.includes("/app/") && now.every((s) => s === "/app/" || s === "/app"), "after: /app/ registers its own worker, none outside the app: " + JSON.stringify(now));
} catch (e) {
  failed = true; console.error("FAILED:", e.message);
} finally {
  await ctx.close(); server.close();
}
process.exit(failed ? 1 : 0);
