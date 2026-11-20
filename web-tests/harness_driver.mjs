// Drives one case of the harness itself (req/checks/clean-console) on a page of its own, which writes what CASE
// names: a warning nobody declared, one declared, a declaration nothing answers, an uncaught error, a request
// leaving the machine, a library from jsDelivr, a test's setup reading storage, Google's Drive and sign-in, the fakes while offline, the
// deploy's variables, a study's edits, a test's own route answering what a fake does, and a wait in the page that
// holds or never does. Prints what the page saw; the harness decides the exit.
//   node web-tests/harness_driver.mjs CASE
import http from "node:http";
import path from "node:path";
import { pw, launch, expecting, siteOf, check } from "./harness.mjs";
import { googleDrive } from "./fakes/google_drive.mjs";
import { signIn } from "./fakes/google_sign_in.mjs";
import { until } from "./page_until.mjs";

const [which] = process.argv.slice(2);
const server = http.createServer((q, r) => {
  if (/study\.json$/.test(q.url)) { r.writeHead(200, { "content-type": "application/json" }); return r.end('{"id": "served"}'); }
  r.writeHead(200, { "content-type": "text/html" }); r.end("<!doctype html><title>harness</title>");
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}/`;
const browser = await launch(pw);
const page = await browser.newPage();
await page.goto(origin);
const warn = () => page.evaluate(() => console.warn("the thing went wrong"));
const got = (u) => page.evaluate((u) => fetch(u).then((r) => r.text()), u);
const CASES = {
  settings: async () => {
    console.log("unset: " + (await got("/web/config.js")).slice(0, 15));
    siteOf(browser).settings.env = { GOOGLE_API_KEY: "the-key", GOOGLE_CLIENT_ID: "the-client" };
    console.log("set: " + await got("/web/config.js"));
  },
  studies: async () => {
    siteOf(browser).studies.edit("acme", (m) => ({ ...m, stage: "PreGT" }));
    console.log("study: " + await got("/studies/acme/study.json") + " other: " + await got("/studies/other/study.json"));
  },
  ownroute: async () => {
    await page.route("**/web/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: "window.NOR_CONFIG = {};" }));
    console.log(await got("/web/config.js"));
  },
  // a failed check fails the run, whatever the test sets its exit code to
  failedcheck: async () => { check(true, "a check that held"); check(false, "a check that did not", { seen: 1 }); process.exitCode = 0; },
  undeclared: warn,
  declared: () => expecting(/went wrong/, warn),
  unanswered: () => expecting(/went wrong/, async () => {}),
  uncaught: () => page.evaluate(() => { setTimeout(() => { throw new Error("thrown by the page"); }); return new Promise((ok) => setTimeout(ok, 50)); }), // waits on purpose (no event): the page's own throw, a task after
  offsite: async () => console.log(await page.evaluate(() => fetch("https://acme.example/x").then((r) => "reached " + r.status, () => "turned away"))),
  // a worker's failed request leaves no line in the console of its own
  offsiteworker: async () => console.log(await page.evaluate(() => new Promise((ok) => {
    const w = new Worker(URL.createObjectURL(new Blob(['fetch("https://acme.example/x").then((r) => postMessage("reached " + r.status), () => postMessage("turned away"))'], { type: "text/javascript" })));
    w.onmessage = (e) => ok(e.data);
  }))),
  setup: async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript((v) => localStorage.setItem("seeded", v), "yes");
    const p = await ctx.newPage();
    await p.goto(origin);
    console.log("seeded " + await p.evaluate(() => localStorage.getItem("seeded")));
  },
  drive: async () => {
    const drive = googleDrive(page.context()), google = signIn(page.context());
    const open = drive.folder({ name: "Open", access: "public" }), closed = drive.folder({ name: "Closed", access: "private" });
    drive.file({ name: "a.png", parent: open.id, bytes: Buffer.from("png bytes") });
    drive.file({ name: "b.png", parent: closed.id, bytes: Buffer.from("secret") });
    const { token } = google.signedIn({ email: "ada@acme.example" });
    // the refusals asked for, as the browser reports each failed load
    const seen = await expecting(/status of 40[134]/, () => page.evaluate(async ([open, closed, token]) => {
      const API = "https://www.googleapis.com/drive/v3/files", q = (id) => "?q=" + encodeURIComponent(`'${id}' in parents and trashed = false`) + "&fields=files(id,name,sha256Checksum)";
      const status = async (url, init) => (await fetch(url, init)).status;
      const byKey = await (await fetch(API + q(open) + "&key=k")).json();
      const bytes = await (await fetch(`${API}/${byKey.files[0].id}?alt=media&key=k`, { headers: { range: "bytes=0-2" } })).text();
      return { listed: byKey.files.map((f) => f.name + (f.sha256Checksum ? "+sha" : "")), piece: bytes, closedByKey: await status(API + q(closed) + "&key=k"),
        closedByToken: await status(API + q(closed), { headers: { authorization: "Bearer " + token } }),
        stranger: await status(API + q(open), { headers: { authorization: "Bearer nobody" } }), nothing: await status(API + q(open)) };
    }, [open.id, closed.id, token]));
    console.log("drive " + JSON.stringify(seen));
  },
  signin: async () => {
    const google = signIn(page.context());
    const seen = await page.evaluate(async () => {
      await new Promise((ok) => document.head.append(Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", onload: ok })));
      const t = await new Promise((ok) => google.accounts.oauth2.initTokenClient({ client_id: "c", scope: "openid", callback: ok }).requestAccessToken({ prompt: "" }));
      const auth = { authorization: "Bearer " + t.access_token };
      const who = await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: auth })).json();
      const body = "--b\r\ncontent-type: application/json\r\n\r\n" + JSON.stringify({ name: "rauntruth-settings.json", parents: ["appDataFolder"] }) + "\r\n--b\r\ncontent-type: application/json\r\n\r\n{\"theme\":\"dark\"}\r\n--b--";
      await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", { method: "POST", headers: { ...auth, "content-type": "multipart/related; boundary=b" }, body });
      const list = await (await fetch("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=" + encodeURIComponent("name = 'rauntruth-settings.json'"), { headers: auth })).json();
      const kept = await (await fetch(`https://www.googleapis.com/drive/v3/files/${list.files[0].id}?alt=media`, { headers: auth })).text();
      return { email: who.email, kept };
    });
    console.log("signin " + JSON.stringify({ ...seen, asked: google.asked.length, loads: google.scriptLoads }));
  },
  offline: async () => {
    await page.context().setOffline(true);
    console.log(await page.evaluate(() => fetch("https://cdn.jsdelivr.net/npm/libheif-js@1.19.8/package.json").then(() => "reached", () => "unreachable")));
  },
  cdn: async () => console.log(await page.evaluate(() => fetch("https://cdn.jsdelivr.net/npm/libheif-js@1.19.8/package.json").then((r) => r.json()).then((j) => "served " + j.version))),
  untilgives: async () => {
    await page.evaluate(() => setTimeout(() => { window.answer = { n: 42 }; }, 200)); // waits on purpose (no event): the value comes after the wait starts
    console.log("gave " + JSON.stringify(await until(page, () => window.answer)));
  },
  untilthrows: async () => {
    try { await until(page, () => window.missing.field, null, { timeout: 300 }); } catch (e) { console.log(e.message); }
  },
};
try { await CASES[which](); } finally { await browser.close(); server.close(); }
