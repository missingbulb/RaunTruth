// Drives the page (web/) in headless Chromium with the stand-in worker of the memory test and checks the NoR Finder's GT actions
// (req/nor/candidates/remembered): a thumbs down takes a candidate out and Ctrl+Z brings it back, a length end dragged and
// dropped is one GT action and Escape records none, an added NoR keeps its id, the checked areas are actions, none of it is
// written to the browser's per-file keys, Save Draft keeps it and Load draft brings it back with no Find Candidates (each
// candidate drawn from its box, no outline), what the five older keys held is offered once after Find Candidates, recorded as GT
// actions at the click and forgotten when a draft holds it, and Edit History's ring is drawn round the row's candidate in the study's colour.
//   node tests/gt_actions_page_driver.mjs ANSWERS IMAGE
import { EARLY } from "../../../web-tests/early_messages.mjs";
import { repoFile } from "../../../web-tests/repo_file.mjs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { offSite } from "../../../web-tests/off_site.mjs";
import { ENGINE, LAUNCH } from "../../../web-tests/engine.mjs";
import { asTagger } from "../../../web-tests/tagger.mjs";
import { localStudy } from "../../../web-tests/local_study.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const [answers, image] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const STAND_IN = `
const A = await (await fetch("answers/answers.json")).json();
const bin = async (n) => new Uint8Array(await (await fetch("answers/" + n)).arrayBuffer());
let finder;
postMessage({ type: "ready", info: { finders: A.finders, about: A.about }, secs: 0 });
onmessage = async ({ data: m }) => {
  if (m.type === "open") {
    postMessage({ type: "held", secs: 0 });
  } else if (m.type === "call" && m.action === "detect") {
    finder = m.args.finder; const seg = await bin("seg_" + finder + ".bin");
    postMessage({ type: "result", action: "detect", meta: A.detected[finder], bytes: seg, secs: 0 }, [seg.buffer]);
  } else if (m.type === "call" && m.action === "refilter") {
    postMessage({ type: "result", action: "refilter", meta: A.filtered[finder][0], echo: m.echo, ms: 0 });
  }
};`;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(EARLY + STAND_IN); }
  const f = u.startsWith("/web/answers/") ? path.join(answers, u.slice("/web/answers/".length)) : repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await pw[ENGINE].launch(LAUNCH);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, more) => { if (!ok) { console.error("FAILED: " + what, more === undefined ? "" : JSON.stringify(more)); await done(1); } console.log("ok: " + what); };
const study = JSON.parse(fs.readFileSync(path.join(repo, "studies/nor/study.json"), "utf8"));

async function open(ctx) {
  const page = await ctx.newPage();
  page.on("pageerror", async (e) => { console.error("page error: " + e.message); await done(1); });
  page.setDefaultTimeout(10000);
  await page.goto(origin + "/web/index.html?study=nor");
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  await loadImage(page);
  return page;
}
async function loadImage(page) {
  await page.setInputFiles("#file", image);
  await page.waitForFunction(() => !document.querySelector("#find").disabled);
}
async function newContext(init) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await asTagger(ctx, { apiKey: "test-key" });
  await ctx.route(offSite(origin), (r) => r.abort());
  await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
  await localStudy(ctx, "nor");
  return ctx;
}
const unfold = async (page, box) => { await page.evaluate((b) => { const e = $(b); if (e.classList.contains("folded")) e.querySelector(".sec-head h2").click(); }, box); await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")); };
async function find(page) {
  await unfold(page, "#processing-box");
  await page.click("#find");
  await page.waitForFunction(() => st.alone && $("#busy").hidden && !document.querySelector("button.working"));
}
// the log as Edit History words it, newest first, the actions not yet saved, and what the page reads of the model
const rows = (page) => page.$$eval("#eh-list .what", (h) => h.map((x) => x.textContent.trim()));
const unsaved = (page) => page.evaluate(() => +(/\d+/.exec($("#gt-unsaved").textContent)?.[0] ?? 0));
const read = (page) => page.evaluate(() => ({ forced: [...st.forced].sort((a, b) => a[0] - b[0]), edits: [...st.edits.keys()].sort((a, b) => a - b), added: st.added.map((a) => [a.id, a.verdict]), areas: [...st.areas].sort((a, b) => a - b),
  count: shellForTests.page ? 0 : 0 }));
const keys = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => /^nor-(marks|edits|added|missing|areas)-/.test(k) || k.startsWith("gt-draft|")));
const handle = async (page, k, j) => {
  const h = page.locator(`#task-card .handle[data-k="${k}"][data-j="${j}"]`);
  await h.scrollIntoViewIfNeeded();
  const b = await h.boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
};
async function drag(page, [x, y], dx, dy, escape = false) {
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  if (escape) { await page.keyboard.press("Escape"); await page.mouse.move(x + dx + 10, y + dy + 10, { steps: 2 }); }
  await page.mouse.up();
}
const settle = (page) => page.waitForFunction(() => !document.activeViewTransition && !document.querySelector("button.working"));

try {
  const ctx = await newContext();
  let page = await open(ctx);
  await find(page);
  await unfold(page, "#tasks-box");
  await page.click("#gt-start");
  await settle(page);
  const total = await page.evaluate(() => st.order.length);
  await check((await rows(page)).join() === `Algorithm ran: ${total} candidates,Image opened` && await unsaved(page) === 0,
    "Find Candidates is the log's run: Edit History says it, and no GT action is yet unsaved", await rows(page));

  // a thumbs down takes the candidate out of those that remain; Ctrl+Z brings it back
  const first = await page.evaluate(() => st.sel);
  const n = await page.evaluate((i) => nor.numOf(nor.candOf(i)), first);
  await page.click("#task-card .verdict .down");
  await settle(page);
  let s = await read(page);
  const m1 = await page.evaluate(() => nor.model());
  await check(s.forced.some(([i, v]) => i === first && v === "out") && m1.deleted.length === 1 && !m1.cands.some((c) => c.i === first) && (await rows(page))[0] === `Deleted #${n}` && await unsaved(page) === 1,
    `thumbs down is one GT action, "Deleted #${n}", and the candidate is no longer among those that remain`, [s, await rows(page)]);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Control+z");
  s = await read(page);
  await check(!s.forced.length && (await page.evaluate(() => nor.model().deleted.length)) === 0 && await unsaved(page) === 0, "Ctrl+Z brings the candidate back", s);
  await page.keyboard.press("Control+y");
  s = await read(page);
  await check(s.forced.length === 1 && await unsaved(page) === 1, "and Ctrl+Y does it again", s);
  await page.click("#gt-undo");
  await page.click('#gt-tasks > li[data-task="pass"] .task-head .t');
  await settle(page);

  // a length end dragged and let go is one GT action; Escape in the middle of it records none
  const target = await page.evaluate(() => st.sel);
  const before = await unsaved(page);
  const at = await handle(page, "length", 1);
  await drag(page, at, 0, -30, true);
  await settle(page);
  await check(await unsaved(page) === before && !(await page.evaluate(() => st.edits.size)) && (await rows(page))[0] !== "Moved the lines of #" + n,
    "Escape in the middle of a drag records nothing", [await rows(page), await unsaved(page)]);
  await drag(page, await handle(page, "length", 1), 0, -30);
  await settle(page);
  const t = await page.evaluate((i) => nor.numOf(nor.candOf(i)), target);
  await check(await unsaved(page) === before + 1 && (await rows(page))[0] === `Moved the lines of #${t}` && await page.evaluate((i) => st.edits.has(i), target),
    `the drop is one GT action: "${(await rows(page))[0]}"`, [await rows(page), await unsaved(page)]);
  await page.click("#gt-undo");
  await check(await page.evaluate((i) => !st.edits.has(i), target) && !(await page.$("#task-card .reset-lines")), "Undo puts the finder's lines back");
  await page.click("#gt-redo");
  // an approval, then Reset measurements
  await page.click("#task-card .verdict .up");
  await settle(page);
  await check((await rows(page))[0] === `Approved #${t}`, "a thumbs up is one GT action", await rows(page));
  await page.click("#task-back");
  await settle(page);
  await page.click("#task-card .reset-lines");
  await check((await rows(page))[0] === `Reset the lines of #${t}` && await page.evaluate((i) => !st.edits.has(i) || st.edits.get(i).approved && Object.keys(st.edits.get(i)).length === 1, target), "Reset measurements is one GT action", await rows(page));

  // an area checked
  const area = await page.evaluate(() => { const x = nor.walk().find((y) => y.key.startsWith("a:")); nor.goTo(x.key); return x.a; });
  await settle(page);
  await page.click("#area-ok");
  await check((await rows(page))[0] === `No missed NoRs in area ${area + 1}` && await page.evaluate((a) => st.areas.has(a), area), "No missed NoRs here is one GT action", await rows(page));

  // an added NoR has an id of its own kind, and the next is never the id of one removed
  const mid = await page.evaluate(() => { const v = $("#scroller").getBoundingClientRect(), b = $("#base").getBoundingClientRect(); return [(Math.max(v.left, b.left) + Math.min(v.right, b.right)) / 2, (Math.max(v.top, b.top) + Math.min(v.bottom, b.bottom)) / 2]; });
  const addAt = async () => { await page.mouse.click(...mid, { button: "right" }); await page.click("#ctx button"); await settle(page); };
  await addAt();
  await check(await page.evaluate(() => st.added.map((a) => a.id).join()) === "u1" && /^Added a NoR at \d+, \d+$/.test((await rows(page))[0]), `a NoR is added as u1: "${(await rows(page))[0]}"`, await rows(page));
  await page.click("#task-card .verdict .down");
  await settle(page);
  await check(await page.evaluate(() => st.added.length) === 0 && (await rows(page))[0] === "Deleted an added NoR", "thumbing an added NoR down removes it", await rows(page));
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Control+z");
  await check(await page.evaluate(() => st.added.map((a) => a.id).join()) === "u1", "and Ctrl+Z brings it back");
  await page.keyboard.press("Control+Shift+z");
  await addAt();
  await check(await page.evaluate(() => st.added.map((a) => a.id).join()) === "u2", "the next one added is u2: an id removed is not given again", await page.evaluate(() => st.added.map((a) => a.id)));
  await page.click("#task-card .verdict .up");
  await settle(page);
  await check((await keys(page)).length === 0, "none of it is kept in the browser's per-file keys, nor in a draft of the study's own", await keys(page));

  // Edit History's ring: round the candidate of the row hovered, in the study's colour
  const ringColour = await page.evaluate(() => getComputedStyle($("#view")).getPropertyValue("--gt-ring").trim());
  await check(ringColour === study.groundTruth.ring, `the ring's colour is the study's: ${ringColour}`);
  const rowAt = await page.evaluate((word) => { const li = [...document.querySelectorAll("#eh-list > li")].find((l) => l.textContent.includes(word)); li.scrollIntoView({ block: "nearest" }); const r = li.getBoundingClientRect(); return [r.left + 20, r.top + r.height / 2]; }, `Approved #${t}`);
  await page.mouse.move(...rowAt);
  await page.waitForFunction(() => document.querySelector('#overlay g[data-layer="ring"] *'));
  const ring = await page.evaluate(() => { const g = document.querySelector('#overlay g[data-layer="ring"]'); return { box: g.dataset.box.split(",").map(Number), stroke: getComputedStyle(g.firstElementChild).stroke }; });
  const wanted = await page.evaluate((i) => nor.candOf(i).bb, target);
  await check(JSON.stringify(ring.box) === JSON.stringify(wanted) && ring.stroke === "rgb(0, 255, 150)", `hovering the row of an approval rings its candidate's box in the study's colour: ${JSON.stringify(ring)}`, { wanted });
  await page.mouse.move(5, 5);

  // the window yields to the selected candidate's card at the top right, which shows only outside tagging: forced on here to see it
  const clear = await page.evaluate(() => {
    const win = $("#edit-history").getBoundingClientRect(), before = win.height;
    $("#selected-box").hidden = false; $("#selected").replaceChildren(nor.card(nor.candOf(st.order[0].i), "selected"));
    return before;
  });
  await page.waitForFunction(() => getComputedStyle($("#view")).getPropertyValue("--eh-yield") !== "0px" && getComputedStyle($("#view")).getPropertyValue("--eh-yield") !== "");
  const yielded = await page.evaluate(() => { const w = $("#edit-history").getBoundingClientRect(), c = $("#selected-box").getBoundingClientRect(), v = $("#view").getBoundingClientRect(); return { winTop: w.top, boxBottom: c.bottom, winBottom: w.bottom, viewBottom: v.bottom, height: w.height }; });
  await check(yielded.winTop >= yielded.boxBottom && yielded.height < clear && yielded.winBottom <= yielded.viewBottom, "Edit History's top yields to the selected candidate's card at the top right", { yielded, clear });
  await page.evaluate(() => { $("#selected-box").hidden = true; $("#selected").replaceChildren(); });
  await page.waitForFunction((h) => $("#edit-history").getBoundingClientRect().height === h, clear);

  // Save Draft, a reload and the image opened again: Load draft brings it all back with no Find Candidates
  const kept = await read(page);
  await page.click("#gt-save-draft");
  await page.waitForFunction(() => $("#gt-unsaved").hidden);
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  await loadImage(page);
  await page.waitForFunction(() => !$("#gt-load-draft").hidden);
  await check((await read(page)).forced.length === 0 && await page.evaluate(() => !st.meta), "a draft is offered and not loaded unasked: no candidate is shown before it", await read(page));
  await unfold(page, "#tasks-box");
  await page.click("#gt-load-draft");
  await page.waitForFunction(() => st.meta?.drafted);
  const back = await read(page);
  await check(JSON.stringify(back) === JSON.stringify({ ...kept, count: 0 }) || JSON.stringify([back.forced, back.edits, back.added, back.areas]) === JSON.stringify([kept.forced, kept.edits, kept.added, kept.areas]),
    "Load draft brings back the votes, the lengths, the added NoRs and the checked areas", { back, kept });
  const drawn = await page.evaluate(() => ({ groups: document.querySelectorAll("#overlay > g[data-i] .hit").length, outlines: [...document.querySelectorAll("#overlay > g[data-i] path")].filter((p) => p.getAttribute("d")).length, find: $("#find").disabled,
    filtersInert: $("#filters").inert, rows: [...document.querySelectorAll("#gt-tasks > li:not([data-task=edits]) .t")].map((x) => x.textContent.trim()).slice(0, 3) }));
  await check(drawn.groups === total && drawn.outlines === 0 && !drawn.find && drawn.filtersInert, "each candidate is drawn from its box, with no outline, Find Candidates is on and the filters wait for it", drawn);
  await page.click("#gt-start");
  await settle(page);
  await page.click("#find");
  await page.waitForFunction(() => st.alone && $("#busy").hidden && !document.querySelector("button.working") && !st.meta.drafted);
  const again = await read(page);
  await check(JSON.stringify([again.forced, again.edits, again.added, again.areas]) === JSON.stringify([kept.forced, kept.edits, kept.added, kept.areas]) && await page.evaluate(() => [...document.querySelectorAll("#overlay > g[data-i] path")].some((p) => p.getAttribute("d"))),
    "Find Candidates again keeps every id by place, so the votes and lengths stay, and the outlines are drawn", { again, kept });
  await ctx.close();

  // what the five older keys held: offered once after Find Candidates, as a draft, and forgotten when a draft holds it
  const ctx2 = await newContext();
  page = await open(ctx2);
  await find(page);
  const seen = await page.evaluate(() => ({ name: st.fileName, finder: st.meta.finder, order: st.order.slice(0, 4).map((c) => [Math.round(c.cx), Math.round(c.cy)]), line: nor.linesOf(st.order[2]) }));
  const old = {
    marks: { [seen.order[0].join()]: "in", [seen.order[1].join()]: "out" },
    edits: { [seen.order[2].join()]: { length: seen.line.length.map((p) => [p[0] + 1, p[1] + 1]) }, [seen.order[0].join()]: { approved: true } },
    added: [{ lines: { length: [[10, 10], [20, 10]], red: [[12, 10], [18, 10]], width: [[15, 8], [15, 12]] }, verdict: "in" }, { lines: { length: [[30, 30], [40, 30]], red: [[32, 30], [38, 30]], width: [[35, 28], [35, 32]] }, verdict: "out" }],
    areas: [3, 7] };
  await page.evaluate(([s, o]) => {
    localStorage.setItem(`nor-marks-v1:${s.name}|${s.finder}`, JSON.stringify(o.marks)); localStorage.setItem(`nor-edits-v1:${s.name}|${s.finder}`, JSON.stringify(o.edits));
    localStorage.setItem(`nor-added-v1:${s.name}`, JSON.stringify(o.added)); localStorage.setItem(`nor-areas-v1:${s.name}`, JSON.stringify(o.areas));
  }, [seen, old]);
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  await loadImage(page);
  await unfold(page, "#tasks-box");
  await check(await page.evaluate(() => $("#gt-load-legacy").hidden), "what the older keys hold is not offered before Find Candidates has run");
  await find(page);
  await page.waitForFunction(() => !$("#gt-load-legacy").hidden);
  const offer = await page.evaluate(() => ({ text: $("#gt-load-legacy").textContent.trim(), title: $("#gt-load-legacy").title }));
  await check(/^Load earlier edits/.test(offer.text) && /your earlier work in this browser/.test(offer.title) && (await read(page)).forced.length === 0 && (await keys(page)).length === 4,
    "it is offered once, not loaded unasked, its keys kept", { offer, keys: await keys(page) });
  await check(/7 actions/.test(offer.title), "saying how many GT actions it makes", offer);
  await page.click("#gt-start");
  await settle(page);
  await page.click("#gt-load-legacy");
  await page.waitForFunction(() => st.areas.size === 2);
  const got = await read(page), lm = await page.evaluate(() => nor.model()), lrows = await rows(page);
  await check(JSON.stringify(got.forced.map(([, v]) => v).sort()) === JSON.stringify(["in", "out"]) && got.edits.length === 2 && JSON.stringify(got.added) === JSON.stringify([["u1", "in"]]) && JSON.stringify(got.areas) === "[3,7]",
    "Load earlier edits brings the votes, the lengths, the added NoR approved (the one thumbed down is gone) and the areas", got);
  await check(lm.deleted.length === 1 && Math.round(lm.deleted[0].x) === seen.order[1][0] && await unsaved(page) === 7 && lrows.some((r) => /^Deleted #\d+$/.test(r)) && !lrows.some((r) => /^Ground truth/.test(r))
    && await page.evaluate(() => st.order.length === nor.model().cands.length + nor.model().deleted.length),
    "each as a GT action of the log, the old thumbs down a delete of its candidate, and no candidate out of the model", { lrows, deleted: lm.deleted.map((c) => c.id) });
  await check((await keys(page)).length === 4, "the old keys are kept until a draft holds them", await keys(page));
  // a filter moved is a run again: what was loaded stays, by id
  const ran = await page.evaluate(() => nor.model().meta.filters.off.length);
  await page.evaluate(() => { const c = document.querySelector("#filters .filter input[type=checkbox]"); c.checked = !c.checked; c.dispatchEvent(new Event("change")); });
  await page.waitForFunction((n) => nor.model().meta.filters.off.length !== n, ran);
  const after = await read(page);
  await check(JSON.stringify(after) === JSON.stringify(got) && await page.evaluate(() => nor.model().deleted.length) === 1, "a filter switched after it runs again and keeps every earlier vote, length, added NoR and area", { after, got });
  await page.click("#gt-undo");
  await page.click("#gt-undo");
  await check(JSON.stringify((await read(page)).areas) === "[3]", "and Undo takes back the last of them alone", await read(page));
  await page.click("#gt-save-draft");
  await page.waitForFunction(() => $("#gt-unsaved").hidden);
  await check((await keys(page)).every((k) => k.startsWith("gt-draft|")), "Save Draft keeps it and only then forgets the old keys", await keys(page));
  await ctx2.close();
  await done(0);
} catch (e) { console.error(e); await done(1); }
