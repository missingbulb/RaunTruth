// Drives the page (web/) in headless Chromium with a stand-in worker that answers from ANSWERS, a folder
// of real results written by tests/test_memory.py, and checks that opening IMAGE and finding over and over leaves the page holding no more JavaScript heap, array buffers, DOM nodes or
// event listeners. Prints what it measured; exits 1 on growth, 2 when it cannot run.
// THROTTLE=n slows its CPU n times over, as a slow test machine is.
//   node tests/memory_page_driver.mjs ANSWERS IMAGE
import { EARLY } from "../../../web-tests/early_messages.mjs";
import fs from "node:fs";
import path from "node:path";
import { ENGINE } from "../../../web-tests/engine.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { pw, launch } from "../../../web-tests/harness.mjs";
import { world } from "../../../web-tests/world.mjs";
import { serveSite } from "../../../web-tests/site_server.mjs";
import { detached, grown } from "./detached_nodes.mjs";

const [answers, image] = process.argv.slice(2);

// answers every request the way web/worker.js does, from the folder served at answers/
const STAND_IN = `
const A = await (await fetch("answers/answers.json")).json();
const bin = async (n) => new Uint8Array(await (await fetch("answers/" + n)).arrayBuffer());
let finder;
postMessage({ type: "ready", info: {}, secs: 0 });
onmessage = async ({ data: m }) => {
  if (m.type === "open") {
    postMessage({ type: "held", secs: 0 });
  } else if (m.type === "call" && m.action === "run") {
    finder = m.args.algorithm; const seg = await bin("seg_" + finder + ".bin");
    postMessage({ type: "result", action: "run", meta: A.detected[finder], bytes: seg, secs: 0 }, [seg.buffer]);
  } else if (m.type === "call") {
    // the page asks Python for nothing but a run (req/nor/find/nors-only)
    postMessage({ type: "error", text: "the page asked Python for " + m.action + ", not a run" });
  }
};`;

const { origin, server } = await serveSite({ "/web/worker.js": EARLY + STAND_IN, "/web/answers/": { dir: answers } });

// Chromium running its bytecode alone, and keeping it: its compilers, and its flushing of bytecode left idle, add and
// drop tens of kilobytes over the first hundred rounds, which would hide the few a round keeps
const browser = await launch(pw, ENGINE === "chromium" ? { args: ["--js-flags=--no-sparkplug --no-maglev --no-turbofan --no-flush-bytecode"] } : {});
const fail = async (why) => { console.error(why); await browser.close(); server.close(); process.exit(1); };
// a device whose welcome popup is not answered yet
const device = world(browser, origin).device().welcomed(null), ctx = await device.context();
await standInDrive(ctx);
// each worker the page makes is told as it is made, so its first answer is heard however soon it comes
await ctx.addInitScript(() => {
  const Made = window.Worker;
  window.Worker = class extends Made { constructor(...args) { super(...args); window.dispatchEvent(new CustomEvent("worker-made", { detail: this })); } };
});
const page = await ctx.newPage();
page.on("pageerror", (e) => fail("page error: " + e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Performance.enable");
if (process.env.THROTTLE) await cdp.send("Emulation.setCPUThrottlingRate", { rate: +process.env.THROTTLE });

// resolves with the worker's next message of this type, or answer to this action (the page's own handler still gets it)
// the worker's next answer to an action, Python starting with the first (req/shell/python/on-run)
const next = (action) => page.evaluate((action) => new Promise((ok) => {
  const hook = (w) => {
    const h = (e) => { if (e.data.type === "result" && e.data.action === action) { w.removeEventListener("message", h); ok(); } };
    w.addEventListener("message", h);
  };
  if (st.worker) hook(st.worker); else window.addEventListener("worker-made", (e) => hook(e.detail), { once: true });
}), action);
const settled = () => page.waitForFunction(() => !st.running && $("#busy").hidden);

let opened = 0;
const slide = fs.readFileSync(image);
async function open() {
  // two images by turns, each the same file on Drive every time, so the image selector lists the same two
  const name = `corner ${(++opened % 2) + 1}.tif`;
  await openFromDrive(page, { name, mimeType: "image/tiff", buffer: slide });
  await page.waitForFunction((n) => shellForTests.page.get("image")?.name === n, name);
  await settled();
}
// finding, twice over
async function find() {
  for (let k = 0; k < 2; k++) {
    const done = next("run");
    await page.evaluate(() => $("#find").click());
    await done; await settled();
  }
}

// what the page holds once garbage is collected; usedSize is the JavaScript heap, backingStorageSize
// the array buffers outside it (the image, the segments)
async function measure() {
  // The status bar's numbers hold a node or more for each character of their last change, and the network's
  // changes every second as its rate falls: written plain, and measured again whenever one changed meanwhile, the
  // count is the same whatever they last read.
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  // the page's frames done first, which a slow machine can still be drawing when the work itself has settled
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 100))))); // waits on purpose (no event): the memory count settles after the page's last frames; being reworked on #932
  // An attribute is a node of its own once something reads it as one, as Playwright does with every attribute of an
  // element it writes into an action's log, and the page adds attributes as it goes (a class the first time an
  // animation is seen off screen): each one in the document is read here, made a node whoever read it before, and
  // left out of the count, which is then the same whichever elements Playwright described and whatever state the
  // page's attributes are in.
  const attributes = () => page.evaluate(() => {
    let n = 0;
    for (const e of document.querySelectorAll("*")) { for (let i = 0; i < e.attributes.length; i++) void e.attributes[i]; n += e.attributes.length; }
    return n;
  });
  for (let tries = 0; ; tries++) {
    await page.evaluate(() => { for (const v of document.querySelectorAll("#statusbar .sb-item .v")) v.textContent = v.textContent; });
    const attrs = await attributes();
    // A node and its listeners leave the counts only when a collection's sweep reaches them, which on a slow
    // machine can trail the collection: collected again until two readings agree, garbage still unswept keeps
    // falling and a node something holds stays.
    let perf = await collected(), sweeps = 1;
    for (let was = null; sweeps < 10 && !(was && perf.Nodes === was.Nodes && perf.JSEventListeners === was.JSEventListeners); sweeps++) {
      was = perf; perf = await collected();
    }
    const h = await cdp.send("Runtime.getHeapUsage");
    // one that changed without rolling, "12%" to "2%", is still its characters a node each
    const rolled = await page.evaluate(() => [...document.querySelectorAll("#statusbar .sb-item .v")].some((v) => v.children.length || v.childNodes.length > 1));
    if ((rolled || (await attributes()) !== attrs) && tries < 10) continue;
    return { heap: h.usedSize, buffers: h.backingStorageSize, nodes: perf.Nodes - attrs, listeners: perf.JSEventListeners, sweeps, where: await where() };
  }
}
// the page's counts after a collection; twice, as DOM nodes freed by the first are swept only after it
async function collected() {
  await cdp.send("HeapProfiler.collectGarbage"); await page.waitForTimeout(50); await cdp.send("HeapProfiler.collectGarbage"); // waits on purpose (no event): the page runs between the two collections, so the second sweeps what the first freed
  return Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
}
// the nodes in the document, by the nearest ancestor with an id, and how many that is in all
const where = () => page.evaluate(() => {
  const by = {}, walk = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
  let all = 1; // the document itself
  for (let x = walk.nextNode(); x; x = walk.nextNode()) {
    all++;
    const e = (x.nodeType === 1 ? x : x.parentElement)?.closest("[id]"), k = e ? "#" + e.id : "(no id)";
    by[k] = (by[k] || 0) + 1;
  }
  return { by, all };
});
const KB = 1024;
// a round keeps a kilobyte or so; a warning the page writes keeps what it hands the console, an error's stack four
// kilobytes an open, and the image alone is a quarter of a megabyte
const ROUNDS = +(process.env.ROUNDS || 8);
const LIMITS = { heap: 24 * KB, buffers: 64 * KB, nodes: 0, listeners: 0 };
// The heap, the buffers and the listeners are read every EVERY rounds, and judged by the median growth between
// readings, as over ROUNDS: what the page keeps each round is in every interval, where a step it takes once, a cache
// filling or code compiled on a busy machine, two listeners now and then, is in one, and moves the median nothing.
// Nodes, whose growth is then traced to where it went, are judged over all the rounds.
const EVERY = 2, SLOPED = ["heap", "buffers", "listeners"];
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

await device.opens("nor");
await open(); await find();
// a reading first, kept by none: the first one's own reads make what the page holds for them from then on (the DOM's
// interfaces, the shapes of what they return), which would otherwise be in the first base
await measure();
const problems = [];
for (const [name, act] of Object.entries({ open, find })) {
  // the heap climbs by steps over the first eight or so opens, as the page's caches and compiled code fill, then holds
  for (let r = 0; r < 10; r++) await act();
  // what holds the nodes outside the document, read before the base so its own reading is in it
  const held = await detached(cdp), readings = [await measure()];
  let after;
  for (let r = 1; r <= ROUNDS; r++) {
    await act();
    if (r % EVERY) continue;
    // the last read after the same snapshot as the base, so work the last round left running has ended in both or neither
    if (r === ROUNDS) after = await detached(cdp);
    readings.push(await measure());
  }
  const base = readings[0], m = readings.at(-1);
  console.log(name.padEnd(5), Object.keys(LIMITS).map((k) => `${k} ${readings.map((x) => x[k]).join(" -> ")}`).join(", "), `(collections ${base.sweeps}, ${m.sweeps})`);
  for (const [k, lim] of Object.entries(LIMITS)) {
    const steps = readings.slice(1).map((x, i) => x[k] - readings[i][k]);
    const grew = SLOPED.includes(k) ? median(steps) * ROUNDS / EVERY : m[k] - base[k];
    if (grew > lim) problems.push(`${name}: ${k} grew by ${grew} over ${ROUNDS} rounds` + (SLOPED.includes(k) ? `, as the median of its growth every ${EVERY} (${steps.join(", ")})` : ""));
  }
  // where the nodes went, so a growth seen only on another machine says where to look
  if (m.nodes > base.nodes) {
    const a = base.where.by, b = m.where.by;
    const grew = Object.keys({ ...a, ...b }).filter((k) => (a[k] || 0) !== (b[k] || 0)).map((k) => `${k} ${a[k] || 0} -> ${b[k] || 0}`);
    problems.push(`${name}: in the document ${grew.join(", ") || "nothing changed"}; outside it ${base.nodes - base.where.all} -> ${m.nodes - m.where.all}`);
    // and, outside it, which nodes and what holds them
    if (m.nodes - m.where.all > base.nodes - base.where.all) for (const d of grown(held, after)) problems.push(`${name}: outside the document, ${d}`);
  }
}
await browser.close(); server.close();
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
