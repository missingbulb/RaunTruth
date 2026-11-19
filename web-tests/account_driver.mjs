// Drives the page (web/) in headless Chromium against the fakes of Google's sign-in script, its account details
// and the Drive API's app folder, and checks req/shell/account/sign-in: a visitor who never signs in loads nothing from Google; signing
// in asks Google for the user's name, email and picture and the app's own Drive folder, nothing else of their
// Drive; the first sign-in starts the user's settings file from this device's settings that follow the user, not
// the ones that stay; a change is saved; a second device signing in takes the file's settings, the theme at once,
// and keeps its own left bar; a reload within the hour syncs with no click; once the token has run out a click
// that needs nothing from Google opens nothing, while changing a setting or opening Load's dropdown renews it in
// that click, silently, and syncs; signing out
// keeps this device's settings and saves nothing more; a site with no Google client offers no sign-in; and the
// page reaches no address but these.
// Optional SHOTS: a directory for screenshots.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/account_driver.mjs [SHOTS]
import { repoFile } from "./repo_file.mjs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { isDeepStrictEqual as same } from "node:util";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { cutShort } from "./page_errors.mjs";
import { launch, googleOf, siteOf, expecting } from "./harness.mjs";
import { orMissed, untilHeard } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const [shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CLIENT = "acme-client.apps.googleusercontent.com";
const GSI = "https://accounts.google.com/gsi/client";
let origin;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(""); }
  const f = repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
origin = `http://127.0.0.1:${server.address().port}`;

const browser = await launch(pw);
// the deploy with a Google key and client
const site = siteOf(browser).settings;
site.env = { GOOGLE_API_KEY: "stand-in", GOOGLE_CLIENT_ID: CLIENT };
// the sign-in fake's account; settings(): the user's settings file in their Drive's app folder, which a test changes to
// play another device; seen(): every request the page made to Google
const { drive, signIn: google } = googleOf(browser);
google.account = { sub: "1001", name: "Ada Lovelace", email: "ada@acme.example", picture: origin + "/web/logo.svg" };
const settings = () => google.settings[0] || null;
const file = () => (settings() ? JSON.parse(settings().body) : null);
const seen = () => [...google.calls, ...drive.calls.map((c) => `${c.method} ${c.url}`)];
let failed = false;
const check = (ok, what) => { if (!ok) { failed = true; console.error("FAILED: " + what); } else console.log("ok: " + what); };
// what Google holds changes only as a request reaches it: a wait on it looks again at each one
const until = async (fn, ms = 5000) => !!(await untilHeard(fn, () => Promise.race([google.next(), drive.next()]), { timeout: ms }));
// a page showing something, within ms
const shows = (page, fn, arg, ms = 5000) => orMissed(page.waitForFunction(fn, arg, { timeout: ms }));
// whether the page asked for Google's script, which it does by appending the script's element in the handler that
// wants it: there once that action returns, before any request reaches the route
const askedGoogle = (page) => page.evaluate((src) => !!document.querySelector(`script[src="${src}"]`), GSI);
// the calls the page has made to Google's APIs, counted as it makes them
const googleCalls = (page) => page.evaluate(() => window.googleCalls);

const outside = []; // every address outside the page's own the browser was asked for
async function device(seed) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  ctx.on("request", (q) => { if (!q.url().startsWith(origin)) outside.push(new URL(q.url()).origin + new URL(q.url()).pathname); });
  await ctx.addInitScript((seed) => {
    delete Navigator.prototype.serviceWorker;
    if (sessionStorage.getItem("primed")) return;
    sessionStorage.setItem("primed", "1");
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, seed);
  await ctx.addInitScript(() => {
    window.googleCalls = 0;
    const fetchNow = window.fetch;
    window.fetch = function (u, ...rest) { if (/googleapis\.com\//.test(String(u?.url ?? u))) window.googleCalls++; return fetchNow.call(this, u, ...rest); };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { if (cutShort(e)) return; failed = true; console.error("page error: " + e.message); });
  page.setDefaultTimeout(STEP);
  await page.goto(origin + "/web/fixture");
  await page.waitForFunction(() => document.querySelector("#title").textContent);
  return { ctx, page };
}
// no one signed in here, a sign-in first opens the guide to Google's screens (req/shell/account/consent-guide): on through it
const throughGuide = async (page) => { await page.waitForSelector("#guide-dlg[open]"); await page.click("#guide-go"); };
const signInVia = async (page) => {
  await page.click("#user-menu summary");
  await page.click("#sign-in");
  await throughGuide(page);
  // a sign-in that never finishes says how far it got
  await page.waitForFunction(() => !document.querySelector("#sign-out").hidden).catch(async (e) => {
    const state = await page.evaluate(() => ({ asked: window.tokenClient?.asked?.length ?? "no token client", calls: window.googleCalls, status: document.querySelector("#status")?.textContent }))
      .then((x) => JSON.stringify(x), (x) => "the page does not answer: " + x.message);
    console.error(`FAILED: signing in never finished: ${state}; Google saw ${JSON.stringify(seen().slice(-6))}`);
    throw e;
  });
};
const local = (page, k) => page.evaluate((k) => localStorage.getItem(k), k);
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name + ".png"), clip: { x: 1000, y: 0, width: 400, height: 260 } }); };

try {
  // device A: used before, never signed in; it answered the sign-in popup (req/shell/account/welcome) and closed its tip
  const answered = { "nor-welcome": JSON.stringify({ choice: "anonymous", remember: true }) };
  const a = await device({ ...answered, "nor-theme": "dark", "nor-tips-closed": JSON.stringify(["recent-files", "sign-in"]), "nor-bars-v1": JSON.stringify({ left: 300 }) });
  check(google.scriptLoads === 0 && !(await askedGoogle(a.page)) && !outside.some((u) => /google/.test(u)), "a visitor who never signs in loads nothing from Google", outside);
  check(await a.page.textContent("#who-where") === "On this device, not signed in" && await a.page.isHidden("#sign-out"), "not signed in, the menu says so");
  await a.page.click("#user-menu summary");
  await a.page.waitForFunction(() => window.tokenClient);
  check(await a.page.isVisible("#sign-in") && await a.page.isVisible("#manage-storage"), "opening the menu offers Sign in with Google beside Manage storage");
  const asked = await a.page.evaluate(() => window.tokenClient);
  const drives = asked.scope.split(" ").filter((s) => /drive/.test(s)).sort();
  check(asked.client === CLIENT && JSON.stringify(drives) === JSON.stringify(["https://www.googleapis.com/auth/drive.appdata", "https://www.googleapis.com/auth/drive.readonly"])
    && ["email", "profile"].every((s) => asked.scope.split(" ").includes(s)),
    "signing in asks for the user's name, email and picture, the app's own Drive folder and to read their Drive, no more of it", drives);
  await shot(a.page, "account_signed_out");
  await a.page.click("#sign-in");
  await throughGuide(a.page);
  await a.page.waitForFunction(() => !document.querySelector("#sign-out").hidden);
  check(await a.page.textContent("#who-name") === "Ada Lovelace" && await a.page.textContent("#who-where") === "ada@acme.example",
    "signed in, the menu names the user");
  check(await a.page.evaluate(() => document.querySelector("#user-menu summary .avatar").tagName === "IMG" && document.querySelector("#sign-in").hidden),
    "the avatar is the user's picture, and Sign in is gone");
  await shot(a.page, "account_signed_in");
  check(await until(() => file()?.["nor-theme"] === "dark"), "a first sign-in starts the user's settings file from this device's");
  check(same(settings().parents, ["appDataFolder"]), "the file is in the app's hidden folder in the user's Drive");
  check(file()["nor-tips-closed"] === JSON.stringify(["recent-files", "sign-in"]) && !("nor-bars-v1" in file()),
    "the file holds the settings that follow the user, not the left bar's width");
  await a.page.click("body", { position: { x: 700, y: 500 } });
  await a.page.click("#theme");
  check(await until(() => file()?.["nor-theme"] === "light"), "switching to light while signed in saves it to the file");

  // req/shell/account/settings: Settings, from the avatar's menu
  const openSettings = async (page) => {
    await page.click("#user-menu summary");
    await page.click("#open-settings");
    await page.waitForFunction(() => document.querySelector("#settings-dlg").open);
  };
  await a.page.evaluate(() => localStorage.setItem("nor-drive-links", JSON.stringify({ nor: "https://drive.google.com/drive/folders/acmenor" })));
  await openSettings(a.page);
  const listed = await a.page.evaluate(() => {
    const d = document.querySelector("#settings-dlg"), v = (sel) => d.querySelector(sel);
    return { title: document.getElementById(d.getAttribute("aria-labelledby"))?.textContent, where: v("#settings-where").textContent,
      theme: v('select[name="nor-theme"]').value, tip: v('input[name="nor-tips-closed"][value="recent-files"]')?.checked,
      thumbs: v('input[name="nor-drive-thumbs"]')?.checked, memory: v('input[name="nor-memory-tip-off"]')?.checked,
      study: v('input[name="nor-drive-links"][data-study="nor"]')?.value, motion: v('input[name="nor-motion"]')?.checked, link: !!v('input[name="nor-drive-link"]'), seen: !!v('input[name="nor-seen-version"]') };
  });
  check(listed.title === "Settings" && /Google Drive/.test(listed.where), "Settings opens from the avatar's menu and says they are kept in the user's Google Drive", listed);
  check(listed.theme === "light" && listed.tip === true && listed.thumbs === true && listed.memory === true
    && listed.study === "https://drive.google.com/drive/folders/acmenor" && listed.motion === true && listed.link && listed.seen,
    "it lists every setting that follows the user, as this device holds it");
  if (shots) await a.page.locator("#settings-dlg").screenshot({ path: path.join(shots, "settings.png") });
  await a.page.selectOption('#settings-dlg select[name="nor-theme"]', "dark");
  await a.page.uncheck('#settings-dlg input[name="nor-tips-closed"][value="recent-files"]');
  await a.page.fill('#settings-dlg input[name="nor-drive-link"]', "https://drive.google.com/drive/folders/acmenew");
  await a.page.click("#settings-save");
  check(await until(() => file()?.["nor-theme"] === "dark" && file()["nor-tips-closed"] === JSON.stringify(["sign-in"])
    && file()["nor-drive-link"] === JSON.stringify("https://drive.google.com/drive/folders/acmenew")),
    "Save writes what changed and saves the user's settings file");
  check(await a.page.evaluate(() => document.documentElement.dataset.theme === "dark" && !document.querySelector("#settings-dlg").open), "the theme changes at once, and the dialog closes");
  await openSettings(a.page);
  await a.page.selectOption('#settings-dlg select[name="nor-theme"]', "light");
  // Cancel writes nothing, here or in a save waiting to run: the theme a save would carry is this device's own
  await a.page.click("#settings-cancel");
  check(await local(a.page, "nor-theme") === "dark" && file()["nor-theme"] === "dark", "Cancel changes nothing");
  await a.page.click("#theme"); // back to light, as the rest of this test expects
  await until(() => file()?.["nor-theme"] === "light");
  // a setting changed while the save before it is on its way is saved too: another tab, opened before it is,
  // keeps it rather than taking Drive's copy
  {
    const gates = [], writes = () => google.calls.filter((c) => /^PATCH /.test(c)).length, before = writes();
    google.hold = () => new Promise((ok) => gates.push(ok));
    await a.page.click("#theme");
    await until(() => writes() > before);
    // changed while that save is held, and saved after it, held too
    await a.page.click("#theme");
    await until(() => writes() > before + 1);
    gates.shift()();
    await until(() => file()?.["nor-theme"] === "dark");
    // opened from the page, as a user opens another tab, which starts from this one's session
    const [tab] = await Promise.all([a.ctx.waitForEvent("page"), a.page.evaluate(() => { window.open(location.href); })]);
    await tab.waitForFunction(() => document.querySelector("#sign-out")?.hidden === false);
    // its sync done: Drive's copy taken, or this device's change kept and saved
    await orMissed(Promise.race([tab.waitForFunction(() => document.documentElement.dataset.theme === "dark"), untilHeard(() => writes() > before + 2, () => google.next())]));
    check(await tab.evaluate(() => document.documentElement.dataset.theme) === "light", "a setting changed while the save before it was on its way stays, in another tab too");
    google.hold = () => null;
    for (const ok of gates.splice(0)) ok();
    await until(() => file()?.["nor-theme"] === "light");
    await tab.close();
  }
  // the tip closed again, as the rest of this test expects of the file
  settings().body = JSON.stringify({ ...file(), "nor-tips-closed": JSON.stringify(["recent-files"]) });
  // animations turned off on another device
  settings().body = JSON.stringify({ ...file(), "nor-motion": "false" });

  // device B: its own theme and left bar
  const b = await device({ ...answered, "nor-tips-closed": JSON.stringify(["sign-in"]), "nor-theme": "dark", "nor-bars-v1": JSON.stringify({ left: 400 }) });
  check(await b.page.evaluate(() => document.documentElement.dataset.theme) === "dark", "a second device starts in its own theme");
  await signInVia(b.page);
  check(await shows(b.page, () => document.documentElement.dataset.theme === "light"), "signing in there brings the user's theme at once");
  check(await local(b.page, "nor-tips-closed") === JSON.stringify(["recent-files"]), "and the tips they closed elsewhere");
  check(await b.page.evaluate(() => document.documentElement.dataset.motion === "off" && !document.querySelector("#motion").checked),
    "and their animations turned off elsewhere, at once");
  check(await local(b.page, "nor-bars-v1") === JSON.stringify({ left: 400 }), "and leaves this device's left bar alone");
  check(file()["nor-theme"] === "light", "bringing the file's settings does not overwrite the file");

  // another device changes the file; a reload within the hour takes it with no click
  settings().body = JSON.stringify({ ...file(), "nor-theme": "dark" });
  const asks = await b.page.evaluate(() => window.tokenClient.asked.length);
  await b.page.reload();
  await b.page.waitForFunction(() => !document.querySelector("#sign-out").hidden);
  check(await shows(b.page, () => document.documentElement.dataset.theme === "dark"), "a reload within the hour stays signed in and syncs with no click");
  check(await b.page.evaluate(() => !window.tokenClient || window.tokenClient.asked.length === 0) && asks === 1, "and asks Google for no new token");

  // the hour is up: Google asks again only in a click that needs it, silently, for the same user
  const expire = async () => {
    // off the page first: a sync still running on it would write the sign-in back, an hour long, and a request still
    // on its way would meet the revoked token
    const at = b.page.url();
    await expecting(/status of 404/, () => b.page.goto(origin + "/web/no-page-here"));
    google.revokeAll();
    await b.page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("nor-google-sign-in")); s.until = Date.now() - 1; localStorage.setItem("nor-google-sign-in", JSON.stringify(s));
      localStorage.removeItem("nor-seen-version"); // the page writes it again as it loads: a setting that changes with no click
    });
    await b.page.goto(at);
    await b.page.waitForFunction(() => !document.querySelector("#sign-out").hidden && window.tokenClient);
  };
  const askedNow = () => b.page.evaluate(() => window.tokenClient.asked.length);
  await expire();
  const before = seen().length;
  // to light, by a script, once the user activation a test's evaluate itself carries (5 s) is over
  await b.page.evaluate(() => setTimeout(() => document.querySelector("#theme").click(), 5500)); // waits on purpose (user activation): the browser's 5 s user activation lapses, which no clock moves
  await shows(b.page, () => document.documentElement.dataset.theme === "light", undefined, 10000);
  check(await local(b.page, "nor-theme") === "light" && await askedNow() === 0 && file()["nor-theme"] === "dark", "a change no user made asks Google for nothing");
  const calls = await googleCalls(b.page);
  await b.page.mouse.click(700, 500);
  check(await askedNow() === 0 && await googleCalls(b.page) === calls && seen().length === before, "with the token run out, neither the page's own writes nor a click that needs nothing from Google open anything or reach Drive");
  await b.page.click("#theme"); // back to dark
  await b.page.click("#theme"); // to light
  check(await until(() => file()?.["nor-theme"] === "light"), "changing a setting renews the token in that click and saves it");
  const renewal = (await b.page.evaluate(() => window.tokenClient.asked))[0];
  check(await askedNow() === 1 && renewal?.prompt === "" && renewal.login_hint === "ada@acme.example", "renewing asks Google once, silently, for the same user");

  settings().body = JSON.stringify({ ...file(), "nor-theme": "dark" }); // another device
  await expire();
  await b.page.click("#image-pick");
  check(await shows(b.page, () => document.documentElement.dataset.theme === "dark"), "opening the image selector renews the token and brings the file's settings");
  check(await until(() => typeof file()?.["nor-seen-version"] === "string" && file()["nor-theme"] === "dark"),
    "the setting this device changed meanwhile is saved beside the other device's, not over it");
  await b.page.keyboard.press("Escape");
  await b.page.mouse.click(700, 500);

  await b.page.click("#user-menu summary");
  await b.page.click("#sign-out");
  await b.page.waitForFunction(() => document.querySelector("#sign-out").hidden);
  check(await b.page.textContent("#who-where") === "On this device, not signed in" && await b.page.evaluate(() => document.querySelector("#user-menu summary .avatar").tagName === "svg"),
    "signing out shows the device's own avatar again");
  check(await local(b.page, "nor-theme") === "dark" && await local(b.page, "nor-google-sign-in") === null, "and keeps this device's settings, forgetting the user and the token");
  await b.page.click("body", { position: { x: 700, y: 500 } });
  // signed out, a change starts no save, now or later: the sign-in record it would be kept in stays gone
  await b.page.click("#theme");
  check(file()["nor-theme"] === "dark" && await local(b.page, "nor-google-sign-in") === null, "a change after signing out is not saved to the user's file");
  await b.page.reload();
  await b.page.waitForFunction(() => document.querySelector("#title").textContent);
  check(await b.page.isHidden("#sign-out"), "a reload after signing out stays signed out");

  // a site with no Google client
  site.env = { GOOGLE_API_KEY: "stand-in", GOOGLE_CLIENT_ID: "" };
  const loads = google.scriptLoads;
  const c = await device({});
  await c.page.click("#user-menu summary");
  check(google.scriptLoads === loads && !(await askedGoogle(c.page)) && await c.page.isHidden("#sign-in") && await c.page.isVisible("#manage-storage"), "with no Google client, the menu offers no sign-in");
  await c.page.click("#open-settings");
  await c.page.waitForFunction(() => document.querySelector("#settings-dlg").open);
  check(/this device/.test(await c.page.textContent("#settings-where")), "not signed in, Settings says they are kept on this device only");
  await c.page.uncheck('#settings-dlg input[name="nor-drive-thumbs"]');
  await c.page.click("#settings-save");
  check(await shows(c.page, () => localStorage.getItem("nor-drive-thumbs") === JSON.stringify("off")), "and Save keeps them there");

  const services = new Set(outside);
  // the study's root, its listing and the user's write access on it, for the roles (req/shell/data/roles)
  const ROOT = "fixturefolder00000001";
  // and Python's own files, kept on this device ahead of the first Run (req/shell/python/on-run)
  const known = (u) => u === GSI || u === "https://openidconnect.googleapis.com/v1/userinfo" || u.startsWith("https://cdn.jsdelivr.net/pyodide/")
    || /^https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\/files(\/appdatafile\d+|\/fixturefolder00000001)?$/.test(u);
  check(services.size >= 4 && [...services].every(known), `the page reached only Google's sign-in script, account details, the Drive API and Python's files (${[...services].join(", ")})`);
  check(seen().filter((s) => /drive\/v3\/files(\?|$)/.test(s) && s.startsWith("GET")).every((s) => /spaces=appDataFolder/.test(s) || new RegExp(`'${ROOT}'[+ ]in[+ ]parents`).test(decodeURIComponent(s))),
    "every Drive listing it made looked only in the app's own folder, or the study's root for the roles");
} catch (e) {
  failed = true; console.error("FAILED: " + (e.stack || e));
} finally {
  await browser.close(); server.close();
}
process.exit(failed ? 1 : 0);
