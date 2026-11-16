// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from ANSWERS
// (tests/test_study_runs.py), its study.json served declaring two actions that mirror the 2D viewer's Ruler and Grid
// buttons, and checks req/shell/image/keys: the key presses the button, only while it is shown and on, with exactly
// its modifiers, once per press, never while typing in a field or with a menu open; the keys legend at the image's
// bottom left lists only the actions that act, a toggle's row filled blue while its button is on and a held key's
// while it is held; and each button carries its key.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/keys_driver.mjs ANSWERS IMAGE.png STUDIES
import { EARLY } from "./early_messages.mjs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { repoFile } from "./repo_file.mjs";
import { offSite } from "./off_site.mjs";
import { ENGINE, LAUNCH } from "./engine.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const [answers, image, studies] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
postMessage({ type: "ready", info: A.ready.fixture, heap: 0, files: 0 });
onmessage = ({ data: m }) => {
  if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images }, [images.buffer]); }
};`;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(EARLY + STAND_IN); }
  if (u === "/web/vendor/wheels.json") { r.writeHead(200, { "content-type": "application/json" }); return r.end("[]"); }
  const f = u === "/web/answers.json" ? answers : u === "/web/studies.json" ? studies : repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await pw[ENGINE].launch(LAUNCH);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
let failed = false;
const check = (ok, what, seen) => { if (!ok) { failed = true; console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); } else console.log("ok: " + what); };

const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
// the fixture as one loading from this computer, declaring two actions of the shell's own buttons
await ctx.route("**/studies/fixture/study.json", async (route) => {
  const r = await route.fetch(), m = await r.json();
  m.files.from = ["local"];
  m.actions = [
    { id: "ruler", label: "Ruler", keys: ["KeyR"], kind: "toggle", control: "#ruler-btn" },
    { id: "grid", label: "Grid", keys: ["Alt+KeyG"], kind: "toggle", control: "#grid-btn" },
  ];
  await route.fulfill({ response: r, body: JSON.stringify(m), contentType: "application/json" });
});
await ctx.route(offSite(origin), (r) => r.abort());
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
const page = await ctx.newPage();
page.on("pageerror", (e) => { failed = true; console.error("page error: " + e.message); });
page.setDefaultTimeout(10000);

const BLUE = /^rgba?\(\s*\d{1,2},\s*\d+,\s*2\d\d(,\s*1)?\)$/;
const legend = () => page.evaluate((blue) => {
  const box = document.querySelector(".keys-legend"), v = $("#image-view").getBoundingClientRect();
  const rows = [...(box?.querySelectorAll(".key-chip") || [])].filter((b) => b.checkVisibility()).map((b) => {
    const k = b.nextElementSibling, r = b.getBoundingClientRect(), kr = k.getBoundingClientRect();
    return { label: b.textContent.trim(), key: k.textContent.trim(), lit: new RegExp(blue).test(getComputedStyle(b).backgroundColor),
      faded: Number(getComputedStyle(k).opacity) < 1, beside: kr.left >= r.right && kr.left - r.right < 16,
      corner: r.left - v.left < 24 && v.bottom - r.bottom < 40 };
  });
  return rows;
}, BLUE.source);
const ruler = () => page.evaluate(() => $("#ruler-btn").getAttribute("aria-pressed") === "true");
const grid = () => page.evaluate(() => $("#grid-btn").getAttribute("aria-pressed") === "true");
// a key pressed where the page hears it, on the element given or the page: whether the page kept it to itself
const press = (code, { on = null, repeat = false, altKey = false, ctrlKey = false } = {}) => page.evaluate(({ code, on, repeat, altKey, ctrlKey }) => {
  const e = new KeyboardEvent("keydown", { code, key: code.replace(/^Key/, "").toLowerCase(), repeat, altKey, ctrlKey, bubbles: true, cancelable: true });
  (on ? document.querySelector(on) : document.body).dispatchEvent(e);
  document.body.dispatchEvent(new KeyboardEvent("keyup", { code, key: e.key, bubbles: true }));
  return e.defaultPrevented;
}, { code, on, repeat, altKey, ctrlKey });

try {
  await page.goto(origin + "/web/fixture");
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
  // no image: the Ruler and Grid buttons are off, so their keys do nothing and the legend lists neither
  check((await legend()).length === 0, "with the buttons off the legend lists nothing", await legend());
  check(!(await press("KeyR")) && !(await ruler()), "R does nothing while the Ruler button is off");

  await page.setInputFiles("#file", image);
  await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");
  let rows = await legend();
  check(rows.map((r) => `${r.label} ${r.key}`).join(", ") === "Ruler R, Grid Alt+G" && rows.every((r) => r.faded && r.beside && r.corner && !r.lit),
    "the legend lists the actions that act, in the study's order, at the image's bottom left, each key faded beside its label", rows);
  const hint = await page.evaluate(() => ({ text: $("#ruler-btn kbd")?.textContent, keys: $("#ruler-btn").getAttribute("aria-keyshortcuts") }));
  check(hint.text === "R" && hint.keys === "R", "the Ruler button carries its key", hint);

  check(await press("KeyR") && (await ruler()) && (await legend())[0].lit, "R presses Ruler, kept from the page, its row filled blue while it is on");
  check(!(await press("KeyR", { repeat: true })) && (await ruler()), "R held down presses it once");
  check(!(await press("KeyR", { ctrlKey: true })) && (await ruler()), "Ctrl+R is not R");
  check(!(await press("KeyR", { on: "#fx-threshold" })) && (await ruler()), "R in a field does nothing");
  await page.evaluate(() => { const m = document.querySelector("details.menu"); m.hidden = false; m.open = true; });
  check(!(await press("KeyR")) && (await ruler()), "R with a menu open does nothing");
  await page.evaluate(() => { document.querySelector("details.menu").open = false; });
  check(await press("KeyR") && !(await ruler()) && !(await legend())[0].lit, "R again lets Ruler go, its row grey again");

  check(!(await press("KeyG")) && !(await grid()), "G alone is not Alt+G");
  check(await press("KeyG", { altKey: true }) && (await grid()), "Alt+G presses Grid");


  // a key held fills its row blue until let go
  await page.keyboard.down("r");
  const held = (await legend())[0].lit;
  await page.keyboard.up("r");
  await page.keyboard.press("r");
  check(held, "a key held fills its row blue");

  // clicking a row does what its key does
  await page.click(".keys-legend .key-chip");
  check(await ruler(), "clicking the Ruler row presses Ruler");
  await page.click(".keys-legend .key-chip");

  // a control off takes its row away
  await page.evaluate(() => { $("#ruler-btn").disabled = true; return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  rows = await legend();
  check(rows.map((r) => r.key).join() === "Alt+G", "a control turned off takes its row out of the legend", rows);
} catch (e) {
  failed = true; console.error(e);
}
await done(failed ? 1 : 0);
