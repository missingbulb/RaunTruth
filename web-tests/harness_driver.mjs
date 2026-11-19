// Drives one case of the harness itself (req/checks/clean-console) on a page of its own, which writes what CASE
// names: a warning nobody declared, one declared, a declaration nothing answers, an uncaught error, a request
// leaving the machine, a library from jsDelivr, a test's setup reading storage, Google's Drive and sign-in, the fakes while offline. Prints what the page saw; the harness decides the exit.
//   node web-tests/harness_driver.mjs CASE
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { launch, expecting } from "./harness.mjs";
import { googleDrive } from "./fakes/google_drive.mjs";
import { signIn } from "./fakes/google_sign_in.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const [which] = process.argv.slice(2);
const server = http.createServer((q, r) => { r.writeHead(200, { "content-type": "text/html" }); r.end("<!doctype html><title>harness</title>"); });
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}/`;
const browser = await launch(pw);
const page = await browser.newPage();
await page.goto(origin);
const warn = () => page.evaluate(() => console.warn("the thing went wrong"));
const CASES = {
  undeclared: warn,
  declared: () => expecting(/went wrong/, warn),
  unanswered: () => expecting(/went wrong/, async () => {}),
  uncaught: () => page.evaluate(() => { setTimeout(() => { throw new Error("thrown by the page"); }); return new Promise((ok) => setTimeout(ok, 50)); }), // waits on purpose (no event): the page's own throw, a task after
  offsite: async () => console.log(await page.evaluate(() => fetch("https://acme.example/x").then((r) => "reached " + r.status, () => "turned away"))),
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
};
try { await CASES[which](); } finally { await browser.close(); server.close(); }
