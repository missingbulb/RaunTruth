// The browser every page test drives. Each context it opens answers the outside systems the page reaches with the
// fakes in fakes/, turns away every other request that would leave this machine, and watches what the page and the
// browser write as warnings and errors: one the test did not declare with expecting() fails the run as it exits
// (req/checks/clean-console).
//   const browser = await launch(pw);                 in place of pw[ENGINE].launch(LAUNCH)
//   const ctx = await keptContext(pw, options);       a context that keeps what the page stores across a reload
//   const { drive, signIn } = googleOf(browser);      the browser's Google, to set up before a context opens
//   const { settings, studies } = siteOf(browser);    the browser's deploy and studies, the same way
//   await expecting(/could not be read/, async () => { ...the case that makes the page say so... });
//   await expecting(/ERR_INTERNET_DISCONNECTED/, async () => { ... }, { maybe: true });   one that may come or not
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ENGINE, LAUNCH, BLOBS_READ_OFFLINE } from "./engine.mjs";
import { FAKES } from "./fakes/index.mjs";
import { COPY } from "./page_pixels.mjs";
import { driveIn } from "./fakes/google_drive.mjs";
import { signInIn } from "./fakes/google_sign_in.mjs";
import { settingsIn } from "./fakes/site_settings.mjs";
import { studiesIn } from "./fakes/studies.mjs";

// Playwright, installed beside the tests or globally: a run without it cannot start, and says so (exit 2). The global
// folder is looked for beside the Node running this before npm is asked for it: asking starts a process, in every test
export const pw = (() => {
  const require = createRequire(import.meta.url);
  const places = [
    () => "playwright",
    () => path.resolve(process.execPath, "../../lib/node_modules/playwright"),
    () => path.join(execSync("npm root -g").toString().trim(), "playwright"),
  ];
  for (const place of places) try { return require(place()); } catch { /* not there: the next place */ }
  console.error("no playwright: npm i -g playwright");
  process.exit(2);
})();

const unexpected = [];
// the patterns declared by the cases running now, each with how many messages it matched
const declared = new Set();
// Expected in every run, the one message no test or page can avoid: with no GPU, headless Chromium composites in
// software and reads each frame of a WebGL canvas back, which its GL driver notes as a stall; a browser with a GPU
// does not, and nothing the page or a test does changes it.
declared.add({ pattern: /^warning: \[\.WebGL-\w+\]GL Driver Message \(OpenGL, Performance, [\w_]+, High\): GPU stall due to ReadPixels/, seen: 0 });
if (ENGINE === "firefox") {
  // Firefox's advice on any page whose scroll listener moves an element: the minimap's outline of the part in view
  // follows the image's scrolling, which is what it is for: with that listener off, the advice is gone, and so is
  // the outline's following.
  declared.add({ pattern: /^warning: \[JavaScript Warning: "This site appears to use a scroll-linked positioning effect\./, seen: 0 });
  // Firefox's note on Pyodide's own WebAssembly, compiled with the older exception instructions: nothing of the
  // page's, and gone only when Pyodide's build changes.
  declared.add({ pattern: /^warning: \[JavaScript Warning: "The WebAssembly exception handling 'try' instruction is deprecated/, seen: 0 });
}

// what the page and the browser did lately, of every kind, kept to print beside a failure: a run that fails says
// what led up to it without being run again
const lately = [], LATELY = 60;
function note(line) {
  const text = line.length > 600 ? line.slice(0, 600) + " ..." : line, last = lately.at(-1);
  // the same thing again and again is one line, counted
  if (last?.text === text) return void last.times++;
  lately.push({ text, times: 1 });
  if (lately.length > LATELY) lately.shift();
}

// among the patterns in force (those declared when the message came, for one whose text took a moment to read);
// excused: one no case need declare, kept only among what happened lately, with why
function said(kind, text, where, among = declared, excused = "") {
  const line = `${kind}: ${text}${where ? ` (${where})` : ""}`;
  note(excused ? `${line} [${excused}]` : line);
  for (const d of among) if (d.pattern.test(line)) { d.seen++; return; }
  if (excused) return;
  unexpected.push(line);
  // as it comes, among the test's own lines, so the case it came in is plain
  console.log("not expected: " + line);
}

// One value the page handed console.warn or console.error, as text, read in the page: an Error with its name, message
// and stack, an object as JSON. Playwright's own text() gives these as "JSHandle@object" and "Error" in Firefox, which
// says nothing and matches no declared pattern.
const TEXT = (v) => {
  if (v && typeof v === "object" && typeof v.message === "string" && typeof v.name === "string") {
    const head = `${v.name}: ${v.message}`, stack = typeof v.stack === "string" ? v.stack : "";
    return !stack ? head : stack.includes(v.message) ? stack : head + "\n" + stack;
  }
  if (v && typeof v === "object") {
    try { const j = JSON.stringify(v); if (j && j !== "{}") return j; } catch { /* a cycle: its own string below */ }
  }
  return String(v);
};
// messages whose text is still being read from the page, each with what to say of it should the run end first
const reading = new Set();
const READ_MS = 3000;
function heard(m) {
  const where = m.location()?.url, among = [...declared], going = CUT && m.page() && leaving.has(m.page());
  const dark = !BLOBS_READ_OFFLINE && m.page() && offlineNow.has(m.page().context());
  // read: whether the text is the values' own, read from the page
  const say = (text, read) => said(m.type(), text, where && !text.includes(where) ? where : "", among,
    going && (CUT.test(text) || !read) ? "as its page was left" : dark && /Blob/.test(text) ? "a blob Playwright's offline refused" : "");
  const args = m.args();
  // the browser's own messages carry no values
  if (!args.length) return say(m.text(), true);
  const entry = { late: () => say(m.text(), false) };
  reading.add(entry);
  let timer;
  entry.done = Promise.race([
    Promise.all(args.map((a) => a.evaluate(TEXT))).then((parts) => parts.join(" ")),
    new Promise((ok) => { timer = setTimeout(() => ok(null), READ_MS); }),
  ]).catch(() => null).then((text) => {
    clearTimeout(timer);
    // said at the run's end already, or the page went before its values could be read: Playwright's text of it
    if (reading.delete(entry)) say(text ?? m.text(), text !== null);
  });
}
// every message heard so far, said: a case's declaration waits for these before it ends
const allHeard = () => Promise.all([...reading].map((e) => e.done));
// a browser or context closes only once what its pages said has been read from them
const closesHeard = (target) => { const close = target.close.bind(target); target.close = async (...a) => { await allHeard(); return close(...a); }; };

// Chromium's console says "Failed to load resource" of each load the server refused (a 404) and each that failed.
// Firefox's says nothing of the first and words the second as a cross-origin block; WebKit's says nothing of a
// request a test or a fake failed. So that a case declares a failed load once, in the same words on every engine,
// the harness says Chromium's line itself where the engine's console does not, from what Playwright saw of the network.
const SILENT = { firefox: { refused: true, failed: true }, webkit: { failed: true } }[ENGINE] || {};
// the engine's names for the failures a test or a fake makes, as Chromium names them
const NET = {
  NS_ERROR_FAILURE: "ERR_FAILED", NS_ERROR_OFFLINE: "ERR_INTERNET_DISCONNECTED",
  "Blocked by Web Inspector": "ERR_FAILED", "WebKit encountered an internal error": "ERR_INTERNET_DISCONNECTED",
};
// a request the page itself dropped by leaving, which no engine's console reports
const LEFT = /^NS_BINDING_ABORTED$|cancell?ed/i;
// Whether a worker made the request, as far as its headers say: one to the site's own address names the worker's
// script as where it came from. Chromium's console, as Playwright reads it, says nothing of a worker's failed load.
const byWorker = (q) => /\.m?js$/.test(q.headers().referer?.replace(/[?#].*$/, "") || "");
// the engine's own wording of a failed request, which the harness has said above as a failed load
if (ENGINE === "firefox") declared.add({ pattern: /^error: \[JavaScript Error: "Cross-Origin Request Blocked: .*\(Reason: CORS request did not succeed\)/, seen: 0 });
if (ENGINE === "webkit") declared.add({ pattern: /^error: Failed to load resource: WebKit encountered an internal error/, seen: 0 });
// the addresses a worker asked for: WebKit's console says a worker's refused load as it says the page's
const workerAsked = new Set();
const ofWorker = (m) => ENGINE === "webkit" && /^Failed to load resource/.test(m.text()) && workerAsked.has(m.location()?.url);

// an address off this machine
const offSite = (u) => /^https?:/.test(u.href) && !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(u.href);
// the site's own addresses a fake answers
const FAKED = /^\/(web\/config\.js|web\/studies\.json|studies\/[\w-]+\/study\.json)$/;

// a test's own routes, which may answer only what no fake does: one answering a fake's address is a second fake
function ownRoutes(target) {
  const route = target.route.bind(target);
  target.route = (url, handler, o) => route(url, (r, q) => {
    const u = new URL(r.request().url());
    if (offSite(u) || FAKED.test(u.pathname)) said("route", "a test answered what a fake answers: " + u.href);
    return handler(r, q);
  }, o);
}

// a test's setup in the page, run on the site's own pages and never on the blank one each new page starts on, whose
// storage the browser refuses
function onSitePages(target) {
  const add = target.addInitScript.bind(target);
  target.addInitScript = (script, arg) => typeof script !== "function" ? add(script, arg)
    : add(`if (/^https?:$/.test(location.protocol)) (${script})(${arg === undefined ? "" : JSON.stringify(arg)});`);
}

// A page being left (reloaded, sent elsewhere, closed) cuts the requests it had under way. Firefox fails each as it
// would a lost network, so the page's own handling of that failure runs and warns, in a document on its way out;
// Chromium settles none of them. What such a page writes of a cut request is its leaving, not a failure of the page's,
// and so is what Firefox itself writes of a module the page was still loading.
// WebKit does the same, in its own words.
const CUT = {
  firefox: /NetworkError when attempting to fetch resource|The operation was aborted|Loading failed for the module/,
  webkit: /Load failed|Context is stopped|due to access control checks|Blob loading failed|reading the Blob/,
}[ENGINE] || null;
// the pages on their way out: from the request that takes one elsewhere until its next document is read, or for good
const leaving = new WeakSet();
// the contexts closing, whose pages' and workers' requests the closing cuts
const closing = new WeakSet();
function leaves(ctx) {
  const shut = ctx.close.bind(ctx);
  ctx.close = (...a) => { closing.add(ctx); return shut(...a); };
  if (!CUT) return;
  const watch = (page) => {
    page.on("domcontentloaded", () => leaving.delete(page));
    for (const going of ["goto", "reload", "goBack", "goForward", "close"]) {
      const go = page[going].bind(page);
      page[going] = (...a) => { leaving.add(page); return go(...a); };
    }
  };
  ctx.pages().forEach(watch);
  ctx.on("page", watch);
  ctx.on("request", (q) => {
    let frame = null;
    try { frame = q.frame(); } catch { /* a worker's request, which takes no page anywhere */ }
    if (frame && q.isNavigationRequest() && !frame.parentFrame()) leaving.add(frame.page());
  });
  const close = ctx.close.bind(ctx);
  ctx.close = (...a) => { for (const page of ctx.pages()) leaving.add(page); return close(...a); };
}

// the contexts a test has taken offline: there, on an engine whose offline refuses the page its own blobs
// (engine.mjs), what the page writes of a blob it could not read is the harness's doing, not the page's
const offlineNow = new WeakSet();

// the outside systems' fakes, after a catch-all that turns away every other request leaving this machine: a route
// set later is asked first, so a test's own routes come before the fakes, and the fakes before the catch-all
// world: the outside systems' state a browser's contexts share, one Google for all of them as for a person's devices
async function install(ctx, world) {
  onSitePages(ctx); leaves(ctx); closesHeard(ctx);
  // offline as its test sets it: a route answers whatever the browser's network says, so the fakes answer nothing then
  let offline = false;
  const setOffline = ctx.setOffline.bind(ctx);
  ctx.setOffline = (on) => { offline = on; if (on) offlineNow.add(ctx); else offlineNow.delete(ctx); return setOffline(on); };
  const newPage = ctx.newPage.bind(ctx);
  ctx.newPage = async () => { const page = await newPage(); onSitePages(page); ownRoutes(page); return page; };
  await ctx.route(offSite, (r) => { said("request", "left this machine: " + r.request().url()); return r.abort(); });
  for (const fake of FAKES) await fake(ctx, world);
  await ctx.route(offSite, (r) => (offline ? r.abort("internetdisconnected") : r.fallback()));
  await ctx.addInitScript(COPY);
  ownRoutes(ctx);
  ctx.on("console", (m) => {
    if ((m.type() !== "warning" && m.type() !== "error") || ofWorker(m)) return note(`${m.type()}: ${m.text()}`);
    heard(m);
  });
  ctx.on("weberror", (e) => {
    const error = e.error(), message = String(error?.message ?? error);
    said("uncaught", error?.stack && !message.includes(error.stack) ? `${message}\n${error.stack}` : message, e.page()?.url(), declared,
      CUT?.test(message) && e.page() && leaving.has(e.page()) ? "as its page was left" : "");
  });
  ctx.on("request", (q) => { if (byWorker(q)) workerAsked.add(q.url()); });
  ctx.on("requestfailed", (q) => {
    const why = q.failure()?.errorText || "";
    note(`request failed: ${q.method()} ${q.url()}: ${why}`);
    // WebKit names every request a route turns away the same, the harness's own turning away while offline too
    const name = offlineNow.has(ctx) && NET[why] ? "ERR_INTERNET_DISCONNECTED" : NET[why] || why;
    if (SILENT.failed && !LEFT.test(why) && !byWorker(q) && !q.url().startsWith("blob:") && !closing.has(ctx)) said("error", `Failed to load resource: net::${name}`, q.url());
  });
  ctx.on("response", (r) => {
    if (r.status() < 400) return;
    note(`answered ${r.status()}: ${r.request().method()} ${r.url()}`);
    if (SILENT.refused && !byWorker(r.request())) said("error", `Failed to load resource: the server responded with a status of ${r.status()}`, r.url());
  });
  return ctx;
}

export async function launch(pw, options = {}) {
  const browser = await pw[ENGINE].launch({ ...LAUNCH, ...options }), world = {};
  worlds.set(browser, world);
  const newContext = browser.newContext.bind(browser);
  const opened = [];
  browser.newContext = async (o) => { const ctx = await install(await newContext(o), world); opened.push(ctx); return ctx; };
  closesHeard(browser);
  const shut = browser.close.bind(browser);
  browser.close = (...a) => { for (const ctx of opened) { closing.add(ctx); for (const page of ctx.pages()) leaving.add(page); } return shut(...a); };
  // a page of its own context, which closes with it, as Playwright's own newPage
  browser.newPage = async (o) => {
    const ctx = await browser.newContext(o), page = await ctx.newPage();
    page.once("close", () => ctx.close().catch(() => {}));
    return page;
  };
  return browser;
}

// a browser's Google, before any of its contexts opens: {drive, signIn}, the fakes' own (fakes/google_drive.mjs,
// fakes/google_sign_in.mjs)
const worlds = new WeakMap();
export const googleOf = (browser) => ({ drive: driveIn(worlds.get(browser)), signIn: signInIn(worlds.get(browser)) });
export const siteOf = (browser) => ({ settings: settingsIn(worlds.get(browser)), studies: studiesIn(worlds.get(browser)) });

// Playwright's WebKit empties the cache storage of a throwaway context on every reload, where Safari keeps it, so a
// test of what the page keeps on this device needs a profile of its own
export const keptContext = async (pw, options) =>
  install(await pw[ENGINE].launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "kept-")), { ...LAUNCH, ...options }), {});

// What the browser and the page say of a request the network does not carry, offline: the browser's line for the
// failed load, and the words each engine's fetch() rejects with, which the page's own warnings repeat.
export const NETWORK_GONE = /ERR_INTERNET_DISCONNECTED|Failed to fetch|NetworkError|Load failed/;

// Runs during(), the case that makes the page warn or err: the messages matching pattern meanwhile are expected, and
// none matching it fails the case, unless maybe: for one that comes only when work in the background is under way as
// the case acts (a download the network's going cuts short). A loose pattern, a word or two, so a rewording leaves the
// test as it is.
export async function expecting(pattern, during, { maybe = false } = {}) {
  const d = { pattern, seen: 0 };
  declared.add(d);
  let result;
  try { result = await during(); await allHeard(); } finally { declared.delete(d); }
  if (!d.seen && !maybe) throw new Error(`expected a warning or error matching ${pattern}, and none came`);
  return result;
}

// a test's check, said as it is made: "ok: what", or "FAILED: what" with what was seen instead, as JSON, when given; a
// failed one fails the run as it exits, whatever exit code the test sets. True when it held
let failedChecks = 0;
export function check(ok, what, seen) {
  if (ok) console.log("ok: " + what);
  else { failedChecks++; console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); }
  return !!ok;
}

process.on("exit", (code) => {
  for (const e of [...reading]) { reading.delete(e); e.late(); }
  if (failedChecks && code === 0) process.exitCode = 1;
  if (unexpected.length) {
    process.stderr.write(`\n${unexpected.length} warning(s) or error(s) no case expected:\n` + [...new Set(unexpected)].map((l) => "  " + l).join("\n") + "\n");
    if (code === 0) process.exitCode = 1;
  }
  if ((process.exitCode || code) && lately.length) {
    process.stderr.write(`\nthe last ${lately.length} things the page and the browser did before the run ended (${ENGINE}):\n` + lately.map((l) => "  " + l.text.replace(/\n/g, "\n    ") + (l.times > 1 ? ` (${l.times} times)` : "")).join("\n") + "\n");
  }
});
