// The browser every page test drives. Each context it opens answers the outside systems the page reaches with the
// fakes in fakes/, turns away every other request that would leave this machine, and watches what the page and the
// browser write as warnings and errors: one the test did not declare with expecting() fails the run as it exits
// (req/checks/clean-console).
//   const browser = await launch(pw);                 in place of pw[ENGINE].launch(LAUNCH)
//   const ctx = await keptContext(pw, options);       a context that keeps what the page stores across a reload
//   const { drive, signIn } = googleOf(browser);      the browser's Google, to set up before a context opens
//   await expecting(/could not be read/, async () => { ...the case that makes the page say so... });
//   await expecting(/ERR_INTERNET_DISCONNECTED/, async () => { ... }, { maybe: true });   one that may come or not
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ENGINE, LAUNCH } from "./engine.mjs";
import { FAKES } from "./fakes/index.mjs";
import { COPY } from "./page_pixels.mjs";
import { driveIn } from "./fakes/google_drive.mjs";
import { signInIn } from "./fakes/google_sign_in.mjs";

const unexpected = [];
// the patterns declared by the cases running now, each with how many messages it matched
const declared = new Set();
// Expected in every run, the one message no test or page can avoid: with no GPU, headless Chromium composites in
// software and reads each frame of a WebGL canvas back, which its GL driver notes as a stall; a browser with a GPU
// does not, and nothing the page or a test does changes it.
declared.add({ pattern: /^warning: \[\.WebGL-\w+\]GL Driver Message \(OpenGL, Performance, [\w_]+, High\): GPU stall due to ReadPixels/, seen: 0 });

function said(kind, text, where) {
  const line = `${kind}: ${text}${where ? ` (${where})` : ""}`;
  for (const d of declared) if (d.pattern.test(line)) { d.seen++; return; }
  unexpected.push(line);
  // as it comes, among the test's own lines, so the case it came in is plain
  console.log("not expected: " + line);
}

// an address off this machine
const offSite = (u) => /^https?:/.test(u.href) && !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(u.href);

// a test's setup in the page, run on the site's own pages and never on the blank one each new page starts on, whose
// storage the browser refuses
function onSitePages(target) {
  const add = target.addInitScript.bind(target);
  target.addInitScript = (script, arg) => typeof script !== "function" ? add(script, arg)
    : add(`if (/^https?:$/.test(location.protocol)) (${script})(${arg === undefined ? "" : JSON.stringify(arg)});`);
}

// the outside systems' fakes, after a catch-all that turns away every other request leaving this machine: a route
// set later is asked first, so a test's own routes come before the fakes, and the fakes before the catch-all
// world: the outside systems' state a browser's contexts share, one Google for all of them as for a person's devices
async function install(ctx, world) {
  onSitePages(ctx);
  // offline as its test sets it: a route answers whatever the browser's network says, so the fakes answer nothing then
  let offline = false;
  const setOffline = ctx.setOffline.bind(ctx);
  ctx.setOffline = (on) => { offline = on; return setOffline(on); };
  const newPage = ctx.newPage.bind(ctx);
  ctx.newPage = async () => { const page = await newPage(); onSitePages(page); return page; };
  await ctx.route(offSite, (r) => { said("request", "left this machine: " + r.request().url()); return r.abort(); });
  for (const fake of FAKES) await fake(ctx, world);
  await ctx.route(offSite, (r) => (offline ? r.abort("internetdisconnected") : r.fallback()));
  await ctx.addInitScript(COPY);
  ctx.on("console", (m) => {
    if (m.type() !== "warning" && m.type() !== "error") return;
    const where = m.location()?.url;
    said(m.type(), m.text(), where && !m.text().includes(where) ? where : "");
  });
  ctx.on("weberror", (e) => said("uncaught", String(e.error()?.message ?? e.error()), e.page()?.url()));
  return ctx;
}

export async function launch(pw, options = {}) {
  const browser = await pw[ENGINE].launch({ ...LAUNCH, ...options }), world = {};
  worlds.set(browser, world);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (o) => install(await newContext(o), world);
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

// Playwright's WebKit empties the cache storage of a throwaway context on every reload, where Safari keeps it, so a
// test of what the page keeps on this device needs a profile of its own
export const keptContext = async (pw, options) =>
  install(await pw[ENGINE].launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "kept-")), { ...LAUNCH, ...options }), {});

// Runs during(), the case that makes the page warn or err: the messages matching pattern meanwhile are expected, and
// none matching it fails the case, unless maybe: for one that comes only when work in the background is under way as
// the case acts (a download the network's going cuts short). A loose pattern, a word or two, so a rewording leaves the
// test as it is.
export async function expecting(pattern, during, { maybe = false } = {}) {
  const d = { pattern, seen: 0 };
  declared.add(d);
  let result;
  try { result = await during(); } finally { declared.delete(d); }
  if (!d.seen && !maybe) throw new Error(`expected a warning or error matching ${pattern}, and none came`);
  return result;
}

process.on("exit", (code) => {
  if (!unexpected.length) return;
  process.stderr.write(`\n${unexpected.length} warning(s) or error(s) no case expected:\n` + [...new Set(unexpected)].map((l) => "  " + l).join("\n") + "\n");
  if (code === 0) process.exitCode = 1;
});
