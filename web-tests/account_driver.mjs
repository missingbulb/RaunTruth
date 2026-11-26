// Drives the page (web/) in headless Chromium against the fakes of Google's sign-in script, its account details
// and the Drive API's app folder, and checks req/shell/account/sign-in: a visitor who never signs in loads nothing from Google; signing
// in asks Google for the user's name, email and picture and the app's own Drive folder, nothing else of their
// Drive; the first sign-in starts the user's settings file from this device's settings that follow the user, not
// the ones that stay; a change is saved; a second device signing in takes the file's settings, the theme at once,
// and keeps its own left bar; a page opened within the hour syncs with no click; once the token has run out a click
// that needs nothing from Google opens nothing, while changing a setting or opening Load's dropdown renews it in
// that click, silently, and syncs; signing out
// keeps this device's settings and saves nothing more; a site with no Google client offers no sign-in; and the
// page reaches no address but these.
// Optional SHOTS: a directory for screenshots.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/account_driver.mjs [SHOTS]
import { repoFile } from "./repo_file.mjs";
import { isDeepStrictEqual as same } from "node:util";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { cutShort } from "./page_errors.mjs";
import { pw, launch, check } from "./harness.mjs";
import { CLIENT_ID as CLIENT } from "./fakes/site_settings.mjs";
import { world } from "./world.mjs";
import { orMissed, untilHeard, idle } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";
import { frames } from "./page_frames.mjs";

const [shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const browser = await launch(pw), w = world(browser, origin);
w.site.withGoogle();
// the user Google's window signs in; settings(): their settings file in their Drive's app folder, which savedSettings
// changes to play another device; seen(): every request the page made to Google
const { drive, google } = w;
const ada = w.user("ada@acme.example").named("Ada Lovelace").pictured(origin + "/web/logo.svg");
const settings = () => google.settings[0] || null;
const file = () => (settings() ? JSON.parse(settings().body) : null);
const seen = () => [...google.calls, ...drive.calls.map((c) => `${c.method} ${c.url}`)];
let failed = false;
// what Google holds changes only as a request reaches it: a wait on it looks again at each one
const until = async (fn, ms = STEP) => !!(await untilHeard(fn, () => Promise.race([google.next(), drive.next()]), { timeout: ms }));
// a page showing something, within ms
const shows = (page, fn, arg, ms = STEP) => orMissed(page.waitForFunction(fn, arg, { timeout: ms }));
// whether the page asked for Google's script, which it does by appending the script's element in the handler that
// wants it: there once that action returns, before any request reaches the route
const askedGoogle = (page) => page.evaluate((src) => !!document.querySelector(`script[src="${src}"]`), GSI);
// the calls the page has made to Google's APIs, counted as it makes them
const googleCalls = (page) => page.evaluate(() => window.googleCalls);

const outside = []; // every address outside the page's own the browser was asked for
// a World device, opened on the fixture
async function device(dev) {
  const ctx = await dev.context();
  ctx.on("request", (q) => { if (!q.url().startsWith(origin)) outside.push(new URL(q.url()).origin + new URL(q.url()).pathname); });
  await ctx.addInitScript(() => {
    window.googleCalls = 0;
    const fetchNow = window.fetch;
    window.fetch = function (u, ...rest) { if (/googleapis\.com\//.test(String(u?.url ?? u))) window.googleCalls++; return fetchNow.call(this, u, ...rest); };
  });
  // the device opens the fixture on this tab, heard from the start
  (await ctx.newPage()).on("pageerror", (e) => { if (cutShort(e)) return; failed = true; console.error("page error: " + e.message); });
  return { ctx, dev, page: await dev.opens("fixture", { until: "title" }) };
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
// the sign-in the page keeps on this device
const signedIn = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("nor-google-sign-in")));
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name + ".png"), clip: { x: 1000, y: 0, width: 400, height: 260 } }); };

try {
  // device A: used before, never signed in; it answered the sign-in popup (req/shell/account/welcome) and closed its tip
  const a = await device(w.device().keeps({ "nor-theme": "dark", "nor-tips-closed": JSON.stringify(["recent-files", "sign-in"]), "nor-bars-v1": JSON.stringify({ left: 300 }) }));
  // the one read a visitor's page makes: the study's root, by the site's key, to read the study file's stage (a visitor's study file is link-shared)
  await a.page.waitForFunction(() => window.googleCalls >= 1);
  await idle(a.page);
  const reads = drive.calls.filter((c) => !c.token);
  check(google.scriptLoads === 0 && !(await askedGoogle(a.page)) && !outside.some((u) => /google/.test(u) && !/^https:\/\/www\.googleapis\.com\/drive\/v3\/files$/.test(u)),
    "a visitor who never signs in loads nothing from Google but the study's shared file", outside);
  check(drive.calls.length === reads.length && reads.length === 1 && reads[0].kind === "list" && reads[0].parent === w.studyFolder("fixture").id && reads[0].key,
    "and the one read it makes is the study's root listed by the site's key, for the study file's stage", drive.calls.map((c) => [c.kind, c.parent, c.id, !!c.key, !!c.token]));
  check(await a.page.textContent("#who-where") === "On this device, not signed in" && await a.page.isHidden("#sign-out"), "not signed in, the menu says so");
  await a.page.click("#user-menu summary");
  await a.page.waitForFunction(() => window.tokenClient);
  check(await a.page.isVisible("#sign-in") && await a.page.isVisible("#manage-storage"), "opening the menu offers Sign in with Google beside Manage storage");
  // req/shell/header: the avatar before the dark/light switch, and the menu's own avatar over the header's
  const head = await a.page.evaluate(() => {
    const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
    const pop = document.querySelector("#user-menu .pop").getBoundingClientRect();
    return { bar: box("#user-menu summary .avatar"), menu: box("#who-avatar .avatar"), theme: box("#theme"), row: document.querySelector("#who-avatar").closest(".who").contains(document.querySelector("#who-name")),
      inside: pop.left >= 0 && pop.right <= innerWidth && pop.top >= 0 };
  });
  check(head.bar[0] < head.theme[0], "the avatar comes before the dark/light switch, which is last", head);
  check(head.row && head.menu.join() === head.bar.join() && head.inside, "the menu's top row holds the avatar beside the name, at the header avatar's place and size", head);
  const asked = await a.page.evaluate(() => window.tokenClient);
  const drives = asked.scope.split(" ").filter((s) => /drive/.test(s)).sort();
  check(asked.client === CLIENT && JSON.stringify(drives) === JSON.stringify(["https://www.googleapis.com/auth/drive.appdata", "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.readonly"])
    && ["email", "profile"].every((s) => asked.scope.split(" ").includes(s)),
    "signing in asks for the user's name, email and picture, the app's own Drive folder, to read their Drive and to add files to it, no more of it", drives);
  await shot(a.page, "account_signed_out");
  await a.page.click("#sign-in");
  await throughGuide(a.page);
  await a.page.waitForFunction(() => !document.querySelector("#sign-out").hidden);
  check(await a.page.textContent("#who-name") === "Ada Lovelace" && await a.page.textContent("#who-where") === "ada@acme.example",
    "signed in, the menu names the user");
  check(await a.page.evaluate(() => document.querySelector("#user-menu summary .avatar").tagName === "IMG" && document.querySelector("#sign-in").hidden),
    "the avatar is the user's picture, and Sign in is gone");
  check(await a.page.evaluate(() => document.querySelector("#who-avatar .avatar").tagName === "IMG" && document.querySelector("#who-avatar .avatar").src === document.querySelector("#user-menu summary .avatar").src),
    "and the menu's avatar is the same picture");
  await shot(a.page, "account_signed_in");
  check(await until(() => file()?.["nor-theme"] === "dark"), "a first sign-in starts the user's settings file from this device's");
  check(same(settings().parents, ["appDataFolder"]), "the file is in the app's hidden folder in the user's Drive");
  check(file()["nor-tips-closed"] === JSON.stringify(["recent-files", "sign-in"]) && !("nor-bars-v1" in file()),
    "the file holds the settings that follow the user, not the left bar's width");
  await a.page.click("body", { position: { x: 700, y: 500 } });
  await a.page.click("#theme");
  check(await a.page.evaluate(() => shellForTests.work.pending > 0), "a setting's save waiting to go is work the page is doing",
    await a.page.evaluate(() => shellForTests.work.doing));
  await idle(a.page);
  check(file()?.["nor-theme"] === "light" && (await signedIn(a.page)).changed.length === 0,
    "and once the page is idle the save has reached the file and the page has taken its answer", { file: file()?.["nor-theme"], changed: (await signedIn(a.page)).changed });
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
  ada.savedSettings({ ...file(), "nor-tips-closed": JSON.stringify(["recent-files"]) });
  // animations turned off on another device
  ada.savedSettings({ ...file(), "nor-motion": "false" });

  // device B: its own theme and left bar
  let b = await device(w.device().keeps({ "nor-tips-closed": JSON.stringify(["sign-in"]), "nor-theme": "dark", "nor-bars-v1": JSON.stringify({ left: 400 }) }));
  check(await b.page.evaluate(() => document.documentElement.dataset.theme) === "dark", "a second device starts in its own theme");
  await signInVia(b.page);
  check(await shows(b.page, () => document.documentElement.dataset.theme === "light"), "signing in there brings the user's theme at once");
  check(await local(b.page, "nor-tips-closed") === JSON.stringify(["recent-files"]), "and the tips they closed elsewhere");
  check(await b.page.evaluate(() => document.documentElement.dataset.motion === "off" && !document.querySelector("#motion").checked),
    "and their animations turned off elsewhere, at once");
  check(await local(b.page, "nor-bars-v1") === JSON.stringify({ left: 400 }), "and leaves this device's left bar alone");
  check(file()["nor-theme"] === "light", "bringing the file's settings does not overwrite the file");

  const asks = await b.page.evaluate(() => window.tokenClient.asked.length);
  const kept = await b.page.evaluate(() => ({ ...localStorage }));
  const me = JSON.parse(kept["nor-google-sign-in"] || "null");
  check(me?.user?.email === "ada@acme.example" && !!me.token && me.until > Date.now() + 50 * 60000,
    "signing in keeps the user and Google's token for the hour", me && { ...me, token: !!me.token });
  await b.ctx.close();
  // another device changes the file; a page opened within the hour from what this device keeps takes it with no click
  ada.savedSettings({ ...file(), "nor-theme": "dark" });
  b = await device(w.device().welcomed(null).keeps(kept));
  check(await shows(b.page, () => !document.querySelector("#sign-out").hidden), "a page opened within the hour stays signed in");
  check(await shows(b.page, () => document.documentElement.dataset.theme === "dark"), "and syncs with no click");
  check(await b.page.evaluate(() => !window.tokenClient || window.tokenClient.asked.length === 0) && asks === 1, "and asks Google for no new token");

  // the hour is up: Google asks again only in a click that needs it, silently, for the same user
  const expire = async () => {
    // off the page first, to a file of the site's that runs none of its code: a sync still running on it would write
    // the sign-in back, an hour long, and a request still on its way would meet the revoked token
    const at = b.page.url();
    // and its own saves ended first: one cut short by leaving stays this device's to save, over what another wrote since
    await idle(b.page);
    await b.page.goto(origin + "/web/logo.svg");
    await b.dev.tokenRunsOut(b.page);
    // the page writes it again as it loads: a setting that changes with no click
    await b.page.evaluate(() => localStorage.removeItem("nor-seen-version"));
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

  ada.savedSettings({ ...file(), "nor-theme": "dark" }); // another device
  await expire();
  await b.page.click("#image-pick");
  check(await shows(b.page, () => document.documentElement.dataset.theme === "dark"), "opening the image selector renews the token and brings the file's settings");
  check(await until(() => typeof file()?.["nor-seen-version"] === "string" && file()["nor-theme"] === "dark"),
    "the setting this device changed meanwhile is saved beside the other device's, not over it");
  await b.page.keyboard.press("Escape");
  await b.page.mouse.click(700, 500);

  // signing out while a save is on its way to Drive: its answer, coming after, keeps nothing of the user who left and
  // says nothing (a change, and back, within the save's quiet: one save, of the setting as it stands)
  let release, reached;
  const held = new Promise((ok) => { release = ok; }), writing = new Promise((ok) => { reached = ok; });
  google.hold = () => { reached(); return held; };
  await b.page.click("#theme");
  await b.page.click("#theme");
  await Promise.race([writing, new Promise((ok) => setTimeout(ok, STEP))]); // bounds a hang: a save that never starts fails the checks below
  const saved = orMissed(b.page.waitForResponse((r) => /upload\/drive/.test(r.url()) && r.request().method() !== "GET", { timeout: STEP }));
  await b.page.click("#user-menu summary");
  await b.page.click("#sign-out");
  await b.page.waitForFunction(() => document.querySelector("#sign-out").hidden);
  release(); google.hold = () => null;
  check(await saved, "a save on its way as the user signs out is answered after", null);
  await frames(b.page);
  check(await local(b.page, "nor-google-sign-in") === null, "and its answer keeps nothing of the user who left");
  check(await b.page.textContent("#who-where") === "On this device, not signed in" && await b.page.evaluate(() => document.querySelector("#user-menu summary .avatar").tagName === "svg"),
    "signing out shows the device's own avatar again");
  check(await b.page.evaluate(() => document.querySelector("#who-avatar .avatar").tagName === "svg"), "in the menu too");
  check(await local(b.page, "nor-theme") === "dark" && await local(b.page, "nor-google-sign-in") === null, "and keeps this device's settings, forgetting the user and the token");
  await b.page.click("body", { position: { x: 700, y: 500 } });
  // signed out, a change starts no save, now or later: the sign-in record it would be kept in stays gone
  await b.page.click("#theme");
  check(file()["nor-theme"] === "dark" && await local(b.page, "nor-google-sign-in") === null, "a change after signing out is not saved to the user's file");
  {
    const left = await b.page.evaluate(() => ({ ...localStorage }));
    await b.ctx.close();
    const after = await device(w.device().welcomed(null).keeps(left));
    check(await after.page.isHidden("#sign-out") && await after.page.textContent("#who-where") === "On this device, not signed in",
      "a page opened after signing out stays signed out");
    await after.ctx.close();
  }

  // a site with no Google client
  w.site.withoutGoogleClient();
  const loads = google.scriptLoads;
  const c = await device(w.device().welcomed(null));
  await c.page.click("#user-menu summary");
  check(google.scriptLoads === loads && !(await askedGoogle(c.page)) && await c.page.isHidden("#sign-in") && await c.page.isVisible("#manage-storage"), "with no Google client, the menu offers no sign-in");
  await c.page.click("#open-settings");
  await c.page.waitForFunction(() => document.querySelector("#settings-dlg").open);
  check(/this device/.test(await c.page.textContent("#settings-where")), "not signed in, Settings says they are kept on this device only");
  await c.page.uncheck('#settings-dlg input[name="nor-drive-thumbs"]');
  await c.page.click("#settings-save");
  check(await shows(c.page, () => localStorage.getItem("nor-drive-thumbs") === JSON.stringify("off")), "and Save keeps them there");

  const services = new Set(outside);
  // the study's root, its listing and the user's write access on it, for the roles (req/shell/data/roles), and the listed studies' roots asked of Drive in one batch (shell/study/members)
  const ROOT = w.studyFolder("fixture").id;
  // and Python's own files, kept on this device ahead of the first Run (req/shell/python/on-run)
  const known = (u) => u === GSI || u === "https://openidconnect.googleapis.com/v1/userinfo" || u.startsWith("https://cdn.jsdelivr.net/pyodide/")
    || /^https:\/\/www\.googleapis\.com\/((upload\/)?drive\/v3\/files(\/appdatafile\d+)?|batch\/drive\/v3)$/.test(u) || u === `https://www.googleapis.com/drive/v3/files/${ROOT}`;
  check(services.size >= 4 && [...services].every(known), `the page reached only Google's sign-in script, account details, the Drive API and Python's files (${[...services].join(", ")})`);
  check(seen().filter((s) => /drive\/v3\/files(\?|$)/.test(s) && s.startsWith("GET")).every((s) => /spaces=appDataFolder/.test(s) || new RegExp(`'${ROOT}'[+ ]in[+ ]parents`).test(decodeURIComponent(s))),
    "every Drive listing it made looked only in the app's own folder, or the study's root for the roles");
} catch (e) {
  failed = true; console.error("FAILED: " + (e.stack || e));
} finally {
  await browser.close(); server.close();
}
process.exit(failed ? 1 : 0);
