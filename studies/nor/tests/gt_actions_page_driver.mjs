// Drives the page (web/) in headless Chromium with the stand-in worker of the memory test and checks the NoR Finder's GT actions
// (req/nor/candidates/remembered): a thumbs down takes a candidate out and Ctrl+Z brings it back, a length end dragged and
// dropped is one GT action and Escape records none, an added NoR keeps its id, the checked areas are actions, none of it is
// written to the browser's per-file keys, Save Draft keeps it and Load draft brings it back with no Find Candidates (each
// candidate drawn from its box, no outline), what the five older keys held is offered once after Find Candidates, recorded as GT
// actions at the click and forgotten when a draft holds it, and Edit History's ring is drawn round the row's candidate in the study's colour.
//   node tests/gt_actions_page_driver.mjs ANSWERS IMAGE
import { fromScratch } from "../../../web-tests/annotating.mjs";
import { EARLY } from "../../../web-tests/early_messages.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { asTagger } from "../../../web-tests/tagger.mjs";
import { localStudy } from "../../../web-tests/local_study.mjs";
import { pw, launch } from "../../../web-tests/harness.mjs";
import { serveSite } from "../../../web-tests/site_server.mjs";
import { STEP } from "../../../web-tests/deadlines.mjs";
import { storedDrafts, seedDrafts, seedKeys } from "../../../web-tests/device_storage.mjs";

const [answers, image] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

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
const { origin, server } = await serveSite({
  "/web/worker.js": () => EARLY + STAND_IN,
  "/web/answers/": { dir: answers },
});

const browser = await launch(pw);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, more) => { if (!ok) { console.error("FAILED: " + what, more === undefined ? "" : JSON.stringify(more)); await done(1); } console.log("ok: " + what); };
const study = JSON.parse(fs.readFileSync(path.join(repo, "studies/nor/study.json"), "utf8"));

async function open(ctx) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(STEP);
  await page.goto(origin + "/web/index.html?study=nor");
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  await loadImage(page);
  return page;
}
async function loadImage(page) {
  await page.setInputFiles("#file", image);
  await page.waitForFunction(() => !document.querySelector("#find").disabled);
  await fromScratch(page, "#find");
}
// drafts, keys: what the device keeps before the page opens
async function newContext({ drafts = [], keys = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await asTagger(ctx);
  await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
  await localStudy(ctx, "nor");
  await seedDrafts(ctx, drafts);
  await seedKeys(ctx, keys);
  return ctx;
}
const unfold = async (page, box) => { await page.evaluate((b) => { const e = $(b); if (e.classList.contains("folded")) e.querySelector(".sec-head h2").click(); }, box); await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")); };
async function find(page) {
  await unfold(page, "#processing-box");
  await page.click("#find");
  await page.waitForFunction(() => st.passes && $("#busy").hidden && !document.querySelector("button.working"));
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
const userActions = (log) => log.filter((a) => !["open", "run", "base"].includes(a.type)).length;
// Save Draft pressed: the device's one draft as the page stored it, and the page's own document and count of GT actions then
async function saveDraft(page) {
  const doc = await page.evaluate(() => nor.document()), name = await page.evaluate(() => st.fileName), actions = await unsaved(page);
  await page.click("#gt-save-draft");
  await page.waitForFunction(() => $("#gt-unsaved").hidden);
  return { stored: await storedDrafts(page), doc, name, actions };
}
// a page opened afresh on a device keeping that draft, the image opened, and the draft offered
async function openWithDraft(drafts) {
  const ctx = await newContext({ drafts });
  const page = await open(ctx);
  await page.waitForFunction(() => !$("#gt-load-draft").hidden);
  return { ctx, page };
}
const settle = (page) => page.waitForFunction(() => !document.activeViewTransition && !document.querySelector("button.working"));

try {
  let ctx = await newContext();
  let page = await open(ctx);
  await find(page);
  await unfold(page, "#tasks-box");
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
  await check(await unsaved(page) === before && !(await page.evaluate(() => st.edits.size)) && !/^Moved/.test((await rows(page))[0]),
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
  await check((await rows(page))[0] === `Approved #${t}` && await unsaved(page) === before + 2, "a thumbs up is one GT action", [await rows(page), await unsaved(page)]);
  await page.click("#task-back");
  await settle(page);
  // the action holds the lines that moved and no other: a width end moves the width alone
  await drag(page, await handle(page, "width", 1), 0, 6);
  await settle(page);
  await check((await rows(page))[0] === `Moved the width line of #${t}` && await unsaved(page) === before + 3, "a width end dropped is one GT action, of the width line alone", [await rows(page), await unsaved(page)]);
  await page.click("#task-card .reset-lines");
  await check((await rows(page))[0] === "Changed lines 2 times" && await page.evaluate((i) => !st.edits.has(i) || st.edits.get(i).approved && Object.keys(st.edits.get(i)).length === 1, target) && await unsaved(page) === before + 4, "Reset measurements is one GT action, which Edit History folds with the move before it, both of one candidate", [await rows(page), await unsaved(page)]);

  // an area checked
  const area = await page.evaluate(() => { const x = nor.walk().find((y) => y.key.startsWith("a:")); nor.goTo(x.key); return x.a; });
  await settle(page);
  await page.click("#area-ok");
  await check((await rows(page))[0] === `No missed NoRs in area ${area + 1}` && await page.evaluate((a) => st.areas.has(a), area) && await unsaved(page) === before + 5, "No missed NoRs here is one GT action", [await rows(page), await unsaved(page)]);

  // an added NoR has an id of its own kind, and the next is never the id of one removed
  const mid = await page.evaluate(() => { const v = $("#scroller").getBoundingClientRect(), b = $("#base").getBoundingClientRect(); return [(Math.max(v.left, b.left) + Math.min(v.right, b.right)) / 2, (Math.max(v.top, b.top) + Math.min(v.bottom, b.bottom)) / 2]; });
  const addAt = async () => { await page.mouse.click(...mid, { button: "right" }); await page.click('#point-menu [role="menuitem"]'); await settle(page); };
  await addAt();
  await check(await page.evaluate(() => st.added.map((a) => a.id).join()) === "u1" && /^Added a NoR at \d+, \d+$/.test((await rows(page))[0]), `a NoR is added as u1: "${(await rows(page))[0]}"`, await rows(page));
  await check(await unsaved(page) === before + 6, "in one GT action", await unsaved(page));
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
  const ring = await page.evaluate(() => { const g = document.querySelector('#overlay g[data-layer="ring"]'), line = getComputedStyle(g.lastElementChild), under = getComputedStyle(g.firstElementChild);
    return { box: g.dataset.box.split(",").map(Number), stroke: line.stroke, casing: under.stroke, over: parseFloat(under.strokeWidth) - parseFloat(line.strokeWidth), solid: +under.strokeOpacity }; });
  const wanted = await page.evaluate((i) => nor.candOf(i).bb, target);
  await check(JSON.stringify(ring.box) === JSON.stringify(wanted) && ring.stroke === "rgb(0, 255, 150)", `hovering the row of an approval rings its candidate's box in the study's colour: ${JSON.stringify(ring)}`, { wanted });
  await check(ring.casing === "rgb(0, 0, 0)" && ring.over >= 3 && ring.solid >= .7, "on a dark casing wider than it, so it reads over the image's own green", ring);
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

  // Save Draft stores the image's draft on the device; a page opened with it there: Load draft brings it all back with no Find Candidates
  const kept = await read(page);
  let draft = await saveDraft(page);
  const [rec] = draft.stored;
  await check(draft.stored.length === 1 && rec.study === "nor" && rec.name === draft.name && rec.sha256 === draft.doc.image.sha256 && JSON.stringify(rec.model) === JSON.stringify(draft.doc)
    && userActions(rec.log) === draft.actions && draft.actions > 0,
    `Save Draft stores the image's draft on the device: the page's document of the work and its ${draft.actions} GT actions`, { stored: draft.stored.map((r) => [r.study, r.name, userActions(r.log)]), actions: draft.actions });
  await ctx.close();
  ({ ctx, page } = await openWithDraft(draft.stored));
  await check((await read(page)).forced.length === 0 && await page.evaluate(() => !st.meta), "a draft is offered and not loaded unasked: no candidate is shown before it", await read(page));
  await unfold(page, "#tasks-box");
  await page.click("#gt-load-draft");
  await page.waitForFunction(() => st.meta?.drafted);
  const back = await read(page);
  await check(JSON.stringify(back) === JSON.stringify({ ...kept, count: 0 }) || JSON.stringify([back.forced, back.edits, back.added, back.areas]) === JSON.stringify([kept.forced, kept.edits, kept.added, kept.areas]),
    "Load draft brings back the votes, the lengths, the added NoRs and the checked areas", { back, kept });
  const drawn = await page.evaluate(() => ({ groups: document.querySelectorAll("#overlay > g[data-i] .hit").length, outlines: [...document.querySelectorAll("#overlay > g[data-i] path")].filter((p) => p.getAttribute("d")).length, find: $("#find").disabled,
    rows: [...document.querySelectorAll("#gt-tasks > li:not([data-task=edits]) .t")].map((x) => x.textContent.trim()).slice(0, 3) }));
  await check(drawn.groups === total && drawn.outlines === 0 && !drawn.find, "each candidate is drawn from its box, with no outline, and Find Candidates is on", drawn);
  await settle(page);
  await page.click("#find");
  await page.waitForFunction(() => st.passes && $("#busy").hidden && !document.querySelector("button.working") && !st.meta.drafted);
  const again = await read(page);
  await check(JSON.stringify([again.forced, again.edits, again.added, again.areas]) === JSON.stringify([kept.forced, kept.edits, kept.added, kept.areas]) && await page.evaluate(() => [...document.querySelectorAll("#overlay > g[data-i] path")].some((p) => p.getAttribute("d"))),
    "Find Candidates again keeps every id by place, so the votes and lengths stay, and the outlines are drawn", { again, kept });

  // a draft loaded over another finder's candidates takes the page's place whole: no vote lands on a candidate that is not its own
  page.on("dialog", (d) => d.accept());
  draft = await saveDraft(page);
  const saved = await page.evaluate(() => ({ finder: st.meta.finder, places: [...nor.model().cands, ...nor.model().deleted].map((c) => `${Math.round(c.x)},${Math.round(c.y)}`).sort() }));
  await check(draft.stored.length === 1 && JSON.stringify(draft.stored[0].model) === JSON.stringify(draft.doc) && draft.stored[0].model.finder === saved.finder,
    `Save Draft again replaces the device's draft with the work on ${saved.finder}'s candidates`, draft.stored.map((r) => r.model.finder));
  await ctx.close();
  ({ ctx, page } = await openWithDraft(draft.stored));
  const other = await page.evaluate((f) => { const a = $("#algorithm"), o = [...a.options].find((x) => x.value !== f && ["tl", "rf"].includes(x.value)); a.value = o.value; a.dispatchEvent(new Event("change", { bubbles: true })); return o.value; }, saved.finder);
  await find(page);
  const others = await page.evaluate(() => st.order.map((c) => `${Math.round(c.cx)},${Math.round(c.cy)}`).sort());
  await check(other !== saved.finder && JSON.stringify(others) !== JSON.stringify(saved.places), `another finder, ${other}, finds other candidates than ${saved.finder} did`, { others: others.length, saved: saved.places.length });
  await unfold(page, "#tasks-box");
  await page.click("#gt-load-draft");
  await page.waitForFunction(() => st.meta?.drafted);
  const taken = await page.evaluate(() => ({ places: st.order.map((c) => `${Math.round(c.cx)},${Math.round(c.cy)}`).sort(), finder: st.meta.finder,
    votes: [...st.forced.keys()].every((i) => [...nor.model().cands, ...nor.model().deleted].some((c) => c.i === i && Math.round(c.x) === Math.round(st.cands[i].cx) && Math.round(c.y) === Math.round(st.cands[i].cy))) }));
  await check(JSON.stringify(taken.places) === JSON.stringify(saved.places) && taken.finder === saved.finder && taken.votes && JSON.stringify((await read(page)).forced) === JSON.stringify(kept.forced),
    "Load draft then shows the draft's candidates, each vote on its own, and none of the other finder's", { taken: taken.places.length, votes: taken.votes });
  await ctx.close();

  // what the five older keys held: offered once after Find Candidates, as a draft, and forgotten when a draft holds it
  let ctx2 = await newContext();
  page = await open(ctx2);
  await find(page);
  const seen = await page.evaluate(() => ({ name: st.fileName, finder: st.meta.finder, order: st.order.slice(0, 4).map((c) => [Math.round(c.cx), Math.round(c.cy)]), line: nor.linesOf(st.order[2]) }));
  const old = {
    marks: { [seen.order[0].join()]: "in", [seen.order[1].join()]: "out" },
    edits: { [seen.order[2].join()]: { length: seen.line.length.map((p) => [p[0] + 1, p[1] + 1]) }, [seen.order[0].join()]: { approved: true } },
    added: [{ lines: { length: [[10, 10], [20, 10]], red: [[12, 10], [18, 10]], width: [[15, 8], [15, 12]] }, verdict: "in" }, { lines: { length: [[30, 30], [40, 30]], red: [[32, 30], [38, 30]], width: [[35, 28], [35, 32]] }, verdict: "out" }],
    areas: [3, 7] };
  await ctx2.close();
  ctx2 = await newContext({ keys: {
    [`nor-marks-v1:${seen.name}|${seen.finder}`]: JSON.stringify(old.marks), [`nor-edits-v1:${seen.name}|${seen.finder}`]: JSON.stringify(old.edits),
    [`nor-added-v1:${seen.name}`]: JSON.stringify(old.added), [`nor-areas-v1:${seen.name}`]: JSON.stringify(old.areas) } });
  page = await open(ctx2);
  await unfold(page, "#tasks-box");
  await check(await page.evaluate(() => $("#gt-load-legacy").hidden), "what the older keys hold is not offered before Find Candidates has run");
  await find(page);
  await page.waitForFunction(() => !$("#gt-load-legacy").hidden);
  const offer = await page.evaluate(() => ({ text: $("#gt-load-legacy").textContent.trim(), title: $("#gt-load-legacy").title }));
  await check(/^Load earlier edits/.test(offer.text) && /your earlier work in this browser/.test(offer.title) && (await read(page)).forced.length === 0 && (await keys(page)).length === 4,
    "it is offered once, not loaded unasked, its keys kept", { offer, keys: await keys(page) });
  await check(/7 actions/.test(offer.title), "saying how many GT actions it makes", offer);
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
  // Find Candidates again: what was loaded stays, by id
  await find(page);
  const after = await read(page);
  await check(JSON.stringify(after) === JSON.stringify(got) && await page.evaluate(() => nor.model().deleted.length) === 1, "Find Candidates after it runs again and keeps every earlier vote, length, added NoR and area", { after, got });
  await page.click("#gt-undo");
  await page.click("#gt-undo");
  await check(JSON.stringify((await read(page)).areas) === "[3]", "and Undo takes back the last of them alone", await read(page));
  await page.click("#gt-save-draft");
  await page.waitForFunction(() => $("#gt-unsaved").hidden);
  await check((await keys(page)).every((k) => k.startsWith("gt-draft|")), "Save Draft keeps it and only then forgets the old keys", await keys(page));
  await ctx2.close();

  // a /2 file read as a draft with no log is a base; Find Candidates after it keeps its votes, rejections, added NoR and lengths
  let ctx3 = await newContext();
  page = await open(ctx3);
  await find(page);
  const file = await page.evaluate(() => {
    const [a, b] = st.order, info = nor.imageInfo(), lab = (c, label) => ({ id: nor.numOf(c), x: c.cx, y: c.cy, label, source: "user", lines: nor.linesOf(c) });
    return { format: "norfinder-ground-truth/2", image: info, finder: st.meta.finder, finder_settings: {}, filters: { values: {}, off: [] },
      labels: [lab(a, 1), lab(b, 0), { id: 99, kind: "missing", x: 40, y: 40, label: 1, source: "user", radius_px: 12, lines: { length: [[30, 40], [50, 40]], red: [[34, 40], [46, 40]], width: [[40, 36], [40, 44]] } }],
      first: [a.i, b.i] };
  });
  // the file kept as this device's draft of the image, with no history, and loaded in a page opened afresh
  const asDraft = async (f) => {
    await ctx3.close();
    ({ ctx: ctx3, page } = await openWithDraft([{ study: "nor", sha256: f.image.sha256, name: f.image.name, saved: new Date().toISOString(), log: [], model: f, replay: "none" }]));
    await unfold(page, "#tasks-box");
    await page.click("#gt-load-draft");
    await page.waitForFunction(() => st.meta?.drafted);
  };
  await asDraft(file);
  const loaded = await read(page);
  await check(loaded.forced.length === 2 && JSON.stringify(loaded.forced.map(([, v]) => v).sort()) === JSON.stringify(["in", "out"]) && JSON.stringify(loaded.added) === JSON.stringify([["u1", "in"]]),
    "a /2 file read as a draft brings its approval, its rejection and its added NoR", loaded);
  await find(page);
  const kept2 = await read(page), lm2 = await page.evaluate(() => nor.model());
  const places = lm2.cands.filter((c) => c.approved).concat(lm2.deleted).map((c) => `${Math.round(c.x)},${Math.round(c.y)}`);
  await check(JSON.stringify(kept2.forced.map(([, v]) => v).sort()) === JSON.stringify(["in", "out"]) && JSON.stringify(kept2.added) === JSON.stringify(loaded.added) && lm2.deleted.length === 1 && lm2.cands.filter((c) => c.approved).length === 1
    && JSON.stringify(places) === JSON.stringify(file.labels.slice(0, 2).map((l) => `${Math.round(l.x)},${Math.round(l.y)}`)) && !(await page.evaluate(() => $("#status").textContent)).includes("left out"),
    "Find Candidates after it keeps the votes, the rejection and the added NoR: the loaded work is carried onto the new candidates", { loaded, kept2, deleted: lm2.deleted.length });
  // a vote the file holds where the finder finds nothing has no candidate to go to: the run says so, and nothing the page
  // says after the run takes that away
  await asDraft({ ...file, labels: [...file.labels, { id: 98, x: 3, y: 3, label: 1, source: "user", lines: null }] });
  await find(page);
  const leftOut = await page.evaluate(() => $("#status").textContent);
  await check(/no item for 1 earlier decision or edit, which was left out/.test(leftOut), "a vote with no candidate in the run is left out, and the status line says so", leftOut);
  await ctx3.close();
  await done(0);
} catch (e) { console.error(e); await done(1); }
