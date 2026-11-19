// The Data Management drivers' Drive and the page that reaches it: on the Drive fake, the folder ROOT (the files of a
// directory on disk, and its subdirectories as subfolders) shared with anyone with the link, read by the site's key and
// the signed-in user's token alike; the site approved for ROOT alone, and for the folders and files the page makes; the
// fixture study given ROOT as its root; a stand-in worker answering ANSWERS
// (tests/test_study_runs.py), which keeps the last file it was handed as self.lastOpen (the page reads and shows
// images itself), and answers the calls of a study ANSWERS' live names from that study's own Python (study_calls.py). Exits 2 when it cannot run.
import { EARLY } from "./early_messages.mjs";
import { createRequire } from "node:module";
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { repoFile } from "./repo_file.mjs";

import { cutShort } from "./page_errors.mjs";
import { launch, googleOf } from "./harness.mjs";

// uploaded(file): each file the page creates or replaces, {name, bytes}
export async function standIn({ answers, studies, rootDir, uploaded = () => {}, gt = true }) {
  const require = createRequire(import.meta.url);
  let pw;
  try { pw = require("playwright"); } catch {
    try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
  }
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const ROOT = "dmrootfolder00000001", EMAIL = "tester@example.com";

  // the Drive fake, ROOT its folder: {id, name, parent, folder, bytes, mine, props, modified}; Drive's clock moves a
  // second each write
  const browser = await launch(pw), { drive, signIn: google } = googleOf(browser);
  google.account = { sub: "1002", name: "Tester", email: EMAIL, picture: null };
  drive.uploaded = uploaded;
  const FILES = drive.files;
  let next = 0;
  drive.folder({ id: ROOT, name: "Study folder one", access: "public" });
  const add = (dir, parent) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, name), folder = fs.statSync(p).isDirectory(), id = folder ? "dmsubfolder" + String(next++).padStart(9, "0") : "dmfile" + String(next++).padStart(14, "0");
      if (folder) { drive.folder({ id, name, parent }); add(p, id); } else drive.file({ id, name, parent, bytes: fs.readFileSync(p) });
    }
  };
  add(rootDir, ROOT);
  const SUB = FILES.find((f) => f.folder && f.parent === ROOT)?.id ?? null;
  // gt: the study set up with review, its settings file in ROOT naming two ground-truth folders kept outside ROOT,
  // which Drive's sharing lets anyone signed in write to (req/shell/data/roles)
  const GT = { curated: "dmgtcurated000000000001", submissions: "dmgtsubmissions0000001" };
  const anyone = { has: () => true };
  if (gt) {
    for (const [id, name] of [[GT.curated, "GT curated"], [GT.submissions, "GT submissions"]]) { drive.folder({ id, name, parent: "elsewhere" }); drive.writers.set(id, anyone); }
    drive.file({ id: "dmsettings00000000001", name: "rauntruth-study.json", parent: ROOT,
      bytes: Buffer.from(JSON.stringify({ format: "rauntruth-study/1", data: null, curated: GT.curated, submissions: GT.submissions, review: true })) });
  }
  // the folders the site was approved for, and those of them Drive lets the user only view
  const approved = drive.approved, viewOnly = drive.viewOnly;
  approved.add(ROOT);
  // the folders shared with the signed-in user alone, not "Anyone with the link": the site's key reads neither them nor what they hold
  const hidden = drive.hidden;
  // who Drive's sharing lets write to ROOT, which makes them its study manager (req/shell/data/roles)
  const writers = new Set([EMAIL]);
  drive.writers.set(ROOT, writers);
  // the folders the page shared with anyone with the link, every write it made, Drive's own small pictures it asked
  // for, and the files replaced keeping the version they replace forever
  const sharedOut = drive.shared, writes = drive.writes, thumbs = drive.thumbs, keptForever = drive.keptForever;

  const rooted = (m) => (m.root ? { ...m, root: `https://drive.google.com/drive/folders/${ROOT}` } : m);
  const fixture = JSON.parse(fs.readFileSync(path.join(repo, "studies", "fixture", "study.json"), "utf8"));
  fixture.root = `https://drive.google.com/drive/folders/${ROOT}`;
  const STAND_IN = `
  const A = await (await fetch("answers.json")).json();
  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  let id = new URL(self.location.href).searchParams.get("study");
  postMessage({ type: "ready", info: A.ready[id], heap: 0, files: 0 });
  onmessage = async ({ data: m }) => {
    if (m.type === "study") { id = m.id; postMessage({ type: "ready", info: A.ready[id], heap: 0, files: 0 }); }
    else if (m.type === "open") {
      self.lastOpen = { name: m.name, bytes: new Uint8Array(m.bytes) };
      postMessage({ type: "held" });
    }
    // a study ANSWERS names as live answers from its own Python, on the file it was handed last
    else if (m.type === "call" && A.live?.includes(id)) {
      let s = ""; for (let k = 0; k < self.lastOpen.bytes.length; k += 32768) s += String.fromCharCode(...self.lastOpen.bytes.subarray(k, k + 32768));
      const r = await (await fetch("/py", { method: "POST", body: JSON.stringify({ id, name: self.lastOpen.name, bytes: btoa(s), action: m.action, args: m.args, damaged: m.damaged }) })).json();
      if (r.error) throw new Error(r.error);
      const b = r.bytes == null ? null : bytes(r.bytes);
      postMessage({ type: "result", action: m.action, meta: r.meta, bytes: b, echo: m.echo }, b ? [b.buffer] : []);
    }
    else if (m.type === "call") { const b = bytes(A.mask); postMessage({ type: "result", action: m.action, meta: A.count, bytes: b, echo: m.echo }, [b.buffer]); }
  };`;
  const CONFIG = `window.NOR_CONFIG = { google: { apiKey: "stand-in", clientId: "123456-stand.apps.googleusercontent.com" } };`;
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
  // the studies' own Python, for the live studies' calls: one request a line, answered in turn
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
  // how many of the live studies' calls are on their way: to Python, or back to the page
  let calls = 0;
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
    const send = (type, body) => { r.writeHead(200, { "content-type": type }); r.end(body); };
    if (u === "/py" && q.method === "POST") {
      const chunks = [];
      calls++;
      q.on("data", (c) => chunks.push(c)).on("end", async () => { send("application/json", await ask(Buffer.concat(chunks).toString())); setTimeout(() => calls--, 200); }); // waits on purpose: the answer's way back to the page, until the page says when it is idle
      return;
    }
    if (u === "/web/worker.js") return send("text/javascript", EARLY + STAND_IN);
    if (u === "/web/config.js") return send("text/javascript", CONFIG);
    if (u === "/web/vendor/wheels.json") return send("application/json", "[]");
    if (u === "/studies/fixture/study.json") return send("application/json", JSON.stringify(fixture));
    // every other study with a root has ROOT as its root here
    const named = u.match(/^\/studies\/([\w-]+)\/study\.json$/);
    if (named) return send("application/json", JSON.stringify(rooted(JSON.parse(fs.readFileSync(path.join(repo, "studies", named[1], "study.json"), "utf8")))));
    const f = u === "/web/answers.json" ? answers : u === "/web/studies.json" ? studies : repoFile(repo, u);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const done = async (code) => { await browser.close(); server.close(); py?.kill(); process.exit(code); };
  const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); } console.log("ok: " + what); };
  // a page or a check gone wrong ends the run

  const SCOPES = "openid email profile https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file";
  // scopes: what the signed-in user's token may do, in place of SCOPES; email: who is signed in, in place of the
  // study's study manager; seed: browser keys kept before the page opens; id: the study opened, the fixture unless
  // named; study: what its study.json says otherwise for this page (its stage, say); scale: the screen's pixels per CSS pixel; prepare(ctx): routes of a
  // driver's own, taking precedence over these; keepSettings: the settings an earlier visit saved to Drive, kept
  async function open(signedIn, { scopes, email, seed = {}, id = "fixture", study, prepare, scale = 1, keepSettings = false } = {}) {
    // each visit a user whose Drive holds no settings of the site's yet, unless keepSettings: what an earlier visit saved
    if (!keepSettings) google.settings.length = 0;
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: scale });
    const own = id === "fixture" ? fixture : rooted(JSON.parse(fs.readFileSync(path.join(repo, "studies", id, "study.json"), "utf8")));
    if (study) await ctx.route(`**/studies/${id}/study.json`, (r) => r.fulfill({ json: { ...own, ...study } }));
    if (prepare) await prepare(ctx);
    // the welcome popup answered before, and remembered (req/shell/account/welcome); seeded once a tab, so a reload
    // keeps what the page itself wrote since
    await ctx.addInitScript(([who, seed]) => {
      delete Navigator.prototype.serviceWorker;
      if (sessionStorage.getItem("primed")) return;
      sessionStorage.setItem("primed", "1");
      if (who) localStorage.setItem("nor-google-sign-in", JSON.stringify(who));
      localStorage.setItem("nor-welcome", JSON.stringify({ choice: who ? "google" : "anonymous", remember: true }));
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
    }, [signedIn ? google.signedIn({ email: email || EMAIL, name: "Tester", scopes: scopes || SCOPES }) : null, seed]);
    const page = await ctx.newPage();
    page.on("pageerror", async (e) => { if (cutShort(e)) return; console.error("page error: " + e.message); await done(1); });
    page.setDefaultTimeout(10000);
    await page.goto(origin + "/web/" + id);
    await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
    return page;
  }


  // the role menu's choice (req/shell/account/role), the page then showing it
  async function role(page, name) {
    await page.click("#role-menu summary");
    await page.click(`#role-list .item:text-is("${name}")`);
    await page.waitForFunction((n) => document.querySelector("#role-name").textContent.trim() === n, name);
  }

  return { drive, google, ROOT, FILES, SUB, GT, hidden, writers, writes, keptForever, approved, viewOnly, sharedOut, thumbs, open, role, check, done, origin, calls: () => calls };
}
