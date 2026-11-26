// The Data Management drivers' Drive and the page that reaches it: on the Drive fake, the folder ROOT (the files of a
// directory on disk, and its subdirectories as subfolders) shared with anyone with the link, read by the site's key and
// the signed-in user's token alike; the site approved for ROOT alone, and for the folders and files the page makes; the
// fixture study given ROOT as its root; a stand-in worker answering ANSWERS
// (tests/test_study_runs.py), which keeps the last file it was handed as self.lastOpen (the page reads and shows
// images itself), and answers the calls of a study ANSWERS' live names from that study's own Python (study_calls.py). Exits 2 when it cannot run.
import { EARLY } from "./early_messages.mjs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { repoFile } from "./repo_file.mjs";

import { cutShort } from "./page_errors.mjs";
import { pw, launch } from "./harness.mjs";
import { world } from "./world.mjs";
import { SCOPES } from "./fakes/google_sign_in.mjs";
import { studies as studiesOf } from "./fakes/studies.mjs";

// uploaded(file): each file the page creates or replaces, {name, bytes}; editHistory: its pages open with the Edit History window
// shown; members: emails Drive's sharing lets read ROOT
// (and what it holds, until a folder has readers of its own), which then no longer shares it with anyone with the link
// rooted: see inList below; pageError(e): what a page's uncaught error does, in place of ending the run
export async function standIn({ answers, studies, rootDir, uploaded = () => {}, gt = true, members, rooted: inList = false, pageError, editHistory = false }) {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const EMAIL = "tester@example.com";
  const STAND_IN = `
  const A = await (await fetch("answers.json")).json();
  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  let id = new URL(self.location.href).searchParams.get("study");
  postMessage({ type: "ready", info: A.ready[id], heap: 0, files: 0, code: "standin0" });
  onmessage = async ({ data: m }) => {
    if (m.type === "study") { id = m.id; postMessage({ type: "ready", info: A.ready[id], heap: 0, files: 0, code: "standin0" }); }
    else if (m.type === "open") {
      self.lastOpen = { name: m.name, bytes: new Uint8Array(m.bytes) };
      postMessage({ type: "held" });
    }
    // a study ANSWERS names as live answers from its own Python, on the file it was handed last
    else if (m.type === "call" && A.live?.includes(id)) try {
      let s = ""; for (let k = 0; k < self.lastOpen.bytes.length; k += 32768) s += String.fromCharCode(...self.lastOpen.bytes.subarray(k, k + 32768));
      const r = await (await fetch("/py", { method: "POST", body: JSON.stringify({ id, name: self.lastOpen.name, bytes: btoa(s), action: m.action, args: m.args, damaged: m.damaged }) })).json();
      if (r.error) throw new Error(r.error);
      const b = r.bytes == null ? null : bytes(r.bytes);
      postMessage({ type: "result", action: m.action, meta: r.meta, bytes: b, echo: m.echo }, b ? [b.buffer] : []);
    } catch (e) { postMessage({ type: "error", text: String(e.message || e) }); }
    else if (m.type === "call") { const b = bytes(A.mask); postMessage({ type: "result", action: m.action, meta: A.count, bytes: b, echo: m.echo }, [b.buffer]); }
  };`;
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
  // the studies' own Python, for the live studies' calls: one request a line, answered in turn
  // python.hold = () => promise: an answer of the study's Python kept back until the promise settles (held.mjs)
  const python = { hold: () => null };
  let py = null;
  const waiting = [];
  const ask = (body) => new Promise((ok) => {
    if (!py) {
      py = spawn("python3", [path.join(repo, "web-tests", "study_calls.py")], { stdio: ["pipe", "pipe", "inherit"] });
      let buf = "";
      py.stdout.on("data", (d) => { buf += d; for (let n; (n = buf.indexOf("\n")) >= 0; buf = buf.slice(n + 1)) waiting.shift()(buf.slice(0, n)); });
    }
    waiting.push(ok); py.stdin.write(body.replace(/\n/g, " ") + "\n");
  });
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
    const send = (type, body) => { r.writeHead(200, { "content-type": type }); r.end(body); };
    if (u === "/py" && q.method === "POST") {
      const chunks = [];
      q.on("data", (c) => chunks.push(c)).on("end", async () => { const said = await ask(Buffer.concat(chunks).toString()); await python.hold(); send("application/json", said); });
      return;
    }
    if (u === "/web/worker.js") return send("text/javascript", EARLY + STAND_IN);
    if (u === "/web/vendor/wheels.json") return send("application/json", "[]");
    const f = u === "/web/answers.json" ? answers : repoFile(repo, u);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const browser = await launch(pw), w = world(browser, origin), { drive, google } = w;
  const tester = w.user(EMAIL).named("Tester");
  drive.uploaded = uploaded;

  // the Drive fake, ROOT its folder: {id, name, parent, folder, bytes, mine, props, modified}; Drive's clock moves a
  // second each write
  const FILES = drive.files;
  const root = w.folder("Study folder one", { id: "dmrootfolder00000001" }).public(), ROOT = root.id;
  const add = (dir, folder) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) add(p, folder.folder(name)); else folder.holds({ name, bytes: fs.readFileSync(p) });
    }
  };
  add(rootDir, root);
  if (members) root.readableBy(...members);
  const SUB = FILES.find((f) => f.folder && f.parent === ROOT)?.id ?? null;
  // gt: the study set up, its study file in ROOT, the page's own as its set-up wrote it, naming the extractions folder kept outside ROOT,
  // which Drive's sharing lets anyone signed in write to (req/shell/data/roles)
  const GT = {};
  if (gt) {
    GT.extractions = w.folder("Extractions", { in: "elsewhere", id: "dmextractions0000000001" }).writableByAnyone().id;
    root.saysStudy({ data: null, extractions: GT.extractions }, { id: "dmsettings00000000001" });
  }
  const settings = root.studyFile();
  // the study file's keys changed, as the owner's Study Setup would have written them (the marks, the stage), the rest kept
  const studyFile = (changes) => root.saysStudy(changes);
  // the folders Drive lets the user only view
  const viewOnly = drive.viewOnly;
  // the folders shared with the signed-in user alone, not "Anyone with the link": the site's key reads neither them nor what they hold
  const hidden = drive.hidden;
  // who Drive's sharing lets write to ROOT, which makes them its study manager (req/shell/data/roles)
  tester.manages(ROOT);
  const writers = drive.writers.get(ROOT);
  // the folders the page shared with anyone with the link, every write it made, Drive's own small pictures it asked
  // for, and the files replaced keeping the version they replace forever
  const sharedOut = drive.shared, writes = drive.writes, thumbs = drive.thumbs, keptForever = drive.keptForever;

  // the deploy with a Google key and client; the fixture study, and every other study with a root, given ROOT as its
  // root, and the list of studies the test's own
  w.site.withGoogle();
  for (const id of fs.readdirSync(path.join(repo, "studies"))) {
    const json = path.join(repo, "studies", id, "study.json");
    if (fs.existsSync(json) && JSON.parse(fs.readFileSync(json, "utf8")).root) w.studies.rootedAt(id, ROOT);
  }
  w.studies.rootedAt("fixture", ROOT);
  if (studies) w.studies.editList(() => JSON.parse(fs.readFileSync(studies, "utf8")));
  // inList: the list of studies names ROOT as each rooted study's root, so that Drive's sharing of it decides who is a member (shell/study/members)
  // (the fixture, which the build leaves out of the list as unlisted, is put in it rooted)
  if (inList) w.studies.editList((list) => (Array.isArray(list) ? [...list.map((m) => (m.root ? { ...m, root: ROOT } : m)), ...(list.some((m) => m.id === "fixture") ? [] : [{ id: "fixture", title: "Fixture", stage: "Develop", root: ROOT }])] : list));

  const close = async () => { await browser.close(); server.close(); py?.kill(); };
  const done = async (code) => { await close(); process.exit(code); };
  const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); } console.log("ok: " + what); };
  // a page or a check gone wrong ends the run

  // scopes: what the signed-in user's token may do, in place of all the site asks; email: who is signed in, in place
  // of the study's study manager; seed: browser keys kept before the page opens, over the sign-in and the welcome
  // popup's answer; id: the study opened, the fixture unless named; study: what its study.json says otherwise for this
  // page (its stage, say); scale: the screen's pixels per CSS pixel; prepare(ctx): routes of a driver's own, taking
  // precedence over these; keepSettings: the settings an earlier visit saved to Drive, kept; viewport: the window's
  // size; name: the signed-in user's; until: when their token runs out, in place of an hour on; learned: what the
  // page last learned from Google for them, kept with the sign-in; welcome: the welcome
  // popup not yet answered, as on a first visit; setup: the study's Study Setup page, not the study; at: an address
  // opened in place of the study's own, its caller waiting for what it shows
  async function open(signedIn, { scopes, email, seed = {}, id = "fixture", study, prepare, scale = 1, keepSettings = false,
    viewport, name = "Tester", until, learned, welcome = false, setup = false, at } = {}) {
    // each visit a user whose Drive holds no settings of the site's yet, unless keepSettings: what an earlier visit saved
    if (!keepSettings) for (const { owner } of [...google.settings]) google.savedSettings(owner, null);
    const device = w.device().with({ deviceScaleFactor: scale, ...(viewport ? { viewport } : {}) }).keeps(seed);
    if (editHistory) device.withEditHistoryShown();
    const who = (email && email !== EMAIL) || name !== tester.name ? { email: email || EMAIL, name, scopes: SCOPES } : tester;
    if (signedIn && !("nor-google-sign-in" in seed)) device.signedInAs(who, { scopes, learned, ...(until ? { tokenLeft: until - Date.now() } : {}) });
    // the welcome popup answered before, and remembered (req/shell/account/welcome), unless a first visit
    device.welcomed(welcome || "nor-welcome" in seed ? null : signedIn ? "google" : "anonymous");
    const ctx = await device.context();
    if (study) studiesOf(ctx).edit(id, (m) => ({ ...m, ...study }));
    if (prepare) await prepare(ctx);
    const page = await ctx.newPage();
    page.on("pageerror", async (e) => { if (cutShort(e)) return; if (pageError) return pageError(e); console.error("page error: " + e.message); await done(1); });
    if (at) return device.visits(at.slice(origin.length), { until: "none" });
    return setup ? device.opensSetup(id) : device.opens(id);
  }


  // Study Setup (req/setup/page) opened (on) from the avatar's menu of the study, or left for the study again, the page then showing it
  async function dataManagement(page, on = true) {
    await page.click("#user-menu summary");
    await page.waitForSelector("#open-setup:not([hidden])");
    const now = await page.evaluate(() => document.documentElement.dataset.page === "setup");
    if (now === on) return void (await page.click("#user-menu summary"));
    // the item opens Study Setup in a new page, which a driver that goes on in this one reaches by its address; leaving stays in the page
    if (on) { const to = await page.evaluate(() => document.querySelector("#open-setup").href); await page.goto(to); }
    else await Promise.all([page.waitForNavigation(), page.click("#open-setup")]);
    await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
    if (on) await page.waitForFunction(() => document.documentElement.dataset.mode === "data");
  }

  return { w, root, drive, google, python, ROOT, FILES, SUB, GT, settings, studyFile, hidden, writers, writes, keptForever, viewOnly, sharedOut, thumbs, open, dataManagement, check, done, close, origin, EMAIL };
}
