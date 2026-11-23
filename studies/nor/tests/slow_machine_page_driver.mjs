// Drives the page (web/) in headless Chromium with a stand-in worker that answers from ANSWERS (written by
// tests/test_memory.py), each answer late as on a slow computer, and checks req/shell/waiting/slow-computers's kindness to slow computers:
// a button whose action takes a while is held, with a spinner, until the action is done; the low-memory popup
// shows on a computer reporting little memory and not on one with plenty, stays away once the user asks, and
// shows whenever the page runs out of memory; the status bar shows the memory in use. Optional SHOTS: a directory for screenshots.
// Exits 1 on a failed check, 2 when it cannot run.
//   node tests/slow_machine_page_driver.mjs ANSWERS IMAGE [SHOTS]
import { EARLY } from "../../../web-tests/early_messages.mjs";
import { repoFile } from "../../../web-tests/repo_file.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { asTagger } from "../../../web-tests/tagger.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { pw, launch, expecting, siteOf } from "../../../web-tests/harness.mjs";
import { localStudy } from "../../../web-tests/local_study.mjs";
import { idle } from "../../../web-tests/page_until.mjs";
import { held as holding } from "../../../web-tests/held.mjs";
import { STEP } from "../../../web-tests/deadlines.mjs";

const [answers, image, shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LATE = 600; // ms each answer takes

const STAND_IN = `
const A = await (await fetch("answers/answers.json")).json();
const bin = async (n) => new Uint8Array(await (await fetch("answers/" + n)).arrayBuffer());
const late = () => new Promise((ok) => setTimeout(ok, ${LATE})); // waits on purpose (a slow computer): it stands in for a slow computer's Python
let finder, runs = 0;
postMessage({ type: "ready", info: {}, secs: 0, heap: 300 * 2 ** 20, files: 80 * 2 ** 20 });
onmessage = async ({ data: m }) => {
  await late();
  if (m.type === "open") {
    postMessage({ type: "held", secs: 0 });
  } else if (m.type === "call" && m.action === "run") {
    if (++runs === 3) return postMessage({ type: "error", text: "MemoryError" });
    finder = m.args.algorithm; const seg = await bin("seg_" + finder + ".bin");
    postMessage({ type: "result", action: "run", meta: A.detected[finder], bytes: seg, secs: 0 }, [seg.buffer]);
  } else if (m.type === "call") {
    // the page asks Python for nothing but a run (req/nor/find/nors-only)
    postMessage({ type: "error", text: "the page asked Python for " + m.action + ", not a run" });
  }
};`;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(EARLY + STAND_IN); }
  // the page's own reading of an image, slow as on a slow computer
  if (u === "/web/image_open.js") {
    r.writeHead(200, { "content-type": "text/javascript" });
    return r.end(`import * as real from "./image_open.real.js"; export * from "./image_open.real.js";
export const openImage = async (...a) => { await new Promise((ok) => setTimeout(ok, ${LATE})); return real.openImage(...a); };`); // waits on purpose (a slow computer): it stands in for a slow computer reading the image
  }
  if (u === "/studies/nor/web/nor.js" && !q.headers["x-late"]) {
    // the study's code comes after its algorithm list, so the page has listed them before its own start has run
    return setTimeout(() => { q.headers["x-late"] = "1"; server.emit("request", q, r); }, LATE); // waits on purpose (a slow computer): it stands in for a slow computer fetching the study's code
  }
  const f = u === "/web/image_open.real.js" ? path.join(repo, "web", "image_open.js")
    : u.startsWith("/web/answers/") ? path.join(answers, u.slice("/web/answers/".length)) : repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await launch(pw);
// driven in a Review study, outside ground truth
siteOf(browser).studies.edit("nor", (m) => ({ ...m, stage: "Review" }));
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what) => { if (!ok) { console.error("FAILED: " + what); await done(1); } console.log("ok: " + what); };
const shot = async (page, name, sel) => { if (shots) await (sel ? page.locator(sel) : page).screenshot({ path: path.join(shots, name + ".png") }); };

// the page's own start has run: the study mounted, the status bar filled and the low-memory popup asked for; the
// algorithm list, fetched without the page waiting on it, can be ready before it
const started = (page) => page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false
  && document.querySelector("#status").textContent === "Ready. Load an image.");
// seed: browser keys kept before the page opens
async function open(gb, seed = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await asTagger(ctx);
  await ctx.addInitScript((gb) => {
    delete Navigator.prototype.serviceWorker;
    Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => gb, configurable: true });
  }, gb);
  await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); }, seed);
  await standInDrive(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(STEP);
  await page.goto(origin + "/web/index.html?study=nor");
  await started(page);
  return { ctx, page };
}
const held = (page, id) => page.evaluate((id) => { const b = $(id); return b.disabled && b.classList.contains("working"); }, id);
// resolves once the worker's answer to this action has reached the page, after the page's own handler took it
// the worker's next answer to an action, Python starting with the first (req/shell/python/on-run)
const answered = (page, action) => page.evaluate((a) => new Promise((ok) => {
  const hook = () => {
    if (!st.worker) return requestAnimationFrame(hook);
    const w = st.worker, h = (e) => { if (e.data.type === "result" && e.data.action === a) { w.removeEventListener("message", h); ok(); } };
    w.addEventListener("message", h);
  };
  hook();
}), action);
const free = (page, id) => page.waitForFunction((id) => !$(id).classList.contains("working") && !$(id).disabled, id);
// a box folded with the steps (req/shell/tools/ruler), opened by its title as the user would
const unfold = async (page, box) => { await page.evaluate((b) => { const e = $(b); if (e.classList.contains("folded")) e.querySelector(".sec-head h2").click(); }, box); await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")); };

// ---- plenty of memory: no popup; slow buttons are held until their action is done ----
{
  const { ctx, page } = await open(8);
  await check(!(await page.evaluate(() => $("#memory-dlg").open)), "no memory popup on a computer with 8 GB");
  const mem = await page.textContent("#sb-memory");
  // before any Run, Python has not started (req/shell/python/on-run): the memory is the page's own
  await check(/^\d+ MB$/.test(mem) && parseInt(mem) > 0, `the status bar shows the memory in use: "${mem}"`);
  await shot(page, "status_memory", "#statusbar");
  // read in the page as the selector is taken and as it is let go, however long the test takes to ask
  const hold = page.evaluate(() => new Promise((ok) => {
    const b = $("#image-pick"), now = () => ({ held: b.disabled && b.classList.contains("working"), open: !!st.img });
    let taken;
    new MutationObserver((_, o) => {
      if (!taken) { if (b.classList.contains("working")) taken = now(); return; }
      if (!b.classList.contains("working")) { o.disconnect(); ok({ taken, let: now() }); }
    }).observe(b, { attributes: true, attributeFilter: ["class"] });
  }));
  await openFromDrive(page, image);
  const selector = await hold;
  await check(selector.taken.held && !selector.taken.open, "the image selector is held while the image opens");
  await check(!selector.let.held && selector.let.open, "the selector is free again once the image is open");
  await free(page, "#image-pick");
  const detected = answered(page, "run");
  await page.click("#find");
  await check(await held(page, "#find"), "Find Candidates is held at once, with its spinner");
  await shot(page, "find_working", ".row:has(#find)");
  await detected;
  await page.waitForFunction(() => !$("#find").classList.contains("working"), null, { timeout: 4 * LATE + 2000 });
  await check(await page.evaluate(() => st.meta && !!st.passes), "it lets go once the candidates are drawn");
  const playing = () => page.evaluate(() => $("#far").getAnimations({ subtree: true })[0].playState);
  await page.evaluate(() => $("#left").insertAdjacentHTML("beforeend", '<div style="height:3000px"></div><div id="far" class="shine">x</div>'));
  await page.waitForFunction(() => $("#far").classList.contains("offscreen"));
  await check(await playing() === "paused", "an animation scrolled out of view is paused");
  await page.evaluate(() => $("#far").scrollIntoView());
  await page.waitForFunction(() => !$("#far").classList.contains("offscreen"));
  await check(await playing() === "running", "and runs again once it is in view");
  await ctx.close();
}

// ---- little memory: the popup, until the user asks not to see it ----
{
  const { ctx, page } = await open(2);
  const why = await page.evaluate(() => $("#memory-dlg").open && $("#memory-why").textContent);
  await check(why && /2 GB/.test(why) && /close other tabs/.test(why), `a computer with 2 GB gets the popup: "${why}"`);
  await shot(page, "memory_popup");
  await shot(page, "memory_popup_box", "#memory-dlg");
  await page.check("#memory-off"); await page.click("#memory-dlg button.primary");
  const kept = await page.evaluate(() => localStorage.getItem("nor-memory-tip-off"));
  await check(kept === "true", `Don't show this again is kept: ${kept}`);
  await ctx.close();
}
{
  const { ctx, page } = await open(2, { "nor-memory-tip-off": "true" });
  await check(!(await page.evaluate(() => $("#memory-dlg").open)), "a page opened with the popup turned off does not show it");
  // running out of memory shows it anyway, without the opt-out
  await openFromDrive(page, image); await free(page, "#image-pick");
  // the stand-in's third run answers out of memory, which the page warns of
  await expecting(/MemoryError/, async () => {
    for (let k = 0; k < 3; k++) { await unfold(page, "#processing-box"); await page.click("#find"); await page.waitForFunction(() => !$("#find").classList.contains("working"), null, { timeout: 4 * LATE + 2000 }); }
  });
  const oom = await page.evaluate(() => $("#memory-dlg").open && $("#memory-never").hidden && $("#memory-why").textContent);
  await check(oom && /ran out of memory/.test(oom), `running out of memory shows it, whatever the user chose: "${oom}"`);
  await check(await page.evaluate(() => !$("#find").disabled), "Find Candidates is free again after the failure");
  await ctx.close();
}
// ---- an image opened before the study's code has come: once the study is in, the image is loaded and its first
// step is the one to do ----
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
  await localStudy(ctx, "nor");
  // the study's code held until the image has opened, or the page waits for the study to open it
  const code = holding();
  await ctx.route("**/studies/nor/web/nor.js", async (r) => { await code.hold(); await r.continue(); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(STEP);
  await page.goto(origin + "/web/index.html?study=nor");
  await code.asked;
  await page.waitForFunction(() => window.shellForTests && $("#file").onchange);
  await page.setInputFiles("#file", image);
  await page.waitForFunction(() => !!st.img || shellForTests.work.doing.includes("waiting for the study"), null, { timeout: 4 * LATE + 2000 });
  code.release();
  await idle(page, { timeout: 4 * LATE + 2000 });
  const steps = await page.evaluate(() => [...document.querySelectorAll("#sb-steps .crumb")].map((c) => c.textContent + (c.classList.contains("now") ? "*" : "")).join(" › "));
  await check(steps === "Load image › Run algorithm*" && await page.evaluate(() => !!st.img), `an image opened as the study came in is loaded, Run algorithm the step to do: ${steps}`);
  await ctx.close();
}
await done(0);
