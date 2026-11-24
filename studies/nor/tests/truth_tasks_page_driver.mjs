// Drives the page (web/) in headless Chromium with the stand-in worker of the layout test, answering from
// real results (ANSWERS, written by tests/test_memory.py), and checks the ground-truth tasks: in a GT study
// Ground Truth Tasks takes Summary's place and the image is the only view (req/nor/truth/tasks,
// req/shell/views/second); the tasks are one walk through the image's areas, with Back and Skip
// (req/nor/truth/order); the image marks what is reviewed, under a task-named Show menu (req/nor/truth/marks,
// req/nor/show-menu); while tagging a key gives each button's answer (req/nor/truth/keys); the summary's mask
// waits for the summary (req/nor/summary/mask); in a Review study the summary is back. Prints what it saw; exits 1
// on a failure, 2 when it cannot run.
//   node tests/truth_tasks_page_driver.mjs ANSWERS IMAGE
import { annotateIfAsked } from "../../../web-tests/annotating.mjs";
import { EARLY } from "../../../web-tests/early_messages.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { TAGGER } from "../../../web-tests/tagger.mjs";
import { world } from "../../../web-tests/world.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { legend, legendRows, keepStudyKeyListeners, studyTakes } from "../../../web-tests/keys_legend.mjs";
import { pw, launch } from "../../../web-tests/harness.mjs";
import { serveSite } from "../../../web-tests/site_server.mjs";

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

const browser = await launch(pw), w = world(browser, origin);
// ground truth is made by someone the store lets save it (req/shell/annotate/no-save)
w.site.withGoogle();
const tagger = w.user(TAGGER).named("Acme Tagger").annotates("nor");
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const fail = async (what, seen) => { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); };
const check = async (ok, what, seen) => { console.log((ok ? "ok    " : "FAIL  ") + what); if (!ok) await fail(what, seen); };

// a summary mask the user lassoed on this image before, in the Viewer
const MASKED = [[[0, 0], [60, 0], [60, 60], [0, 60]]];
// the pictures off the site the page asked for
const pictures = [];
// stage: the study's as served, in place of the committed one; more: other keys of its study.json, the same way
async function open(stage, more = {}) {
  tagger.savedSettings(null);
  const device = w.device().signedInAs(tagger).with({ viewport: { width: 1200, height: 700 } }).withStudy("nor", { ...(stage ? { stage } : {}), ...more })
    .keeps({ ["nor-mask-v1:" + path.basename(image)]: JSON.stringify(MASKED) });
  const ctx = await device.context();
  await keepStudyKeyListeners(ctx);
  await standInDrive(ctx);
  ctx.on("request", (q) => { if (q.resourceType() === "image" && !q.url().startsWith(origin) && /^https?:/.test(q.url())) pictures.push(q.url()); });
  const page = await device.opens("nor", { until: "none" });
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  await openFromDrive(page, image);
  await page.waitForFunction(() => !document.querySelector("#find").disabled);
  await annotateIfAsked(page, "#find");
  await page.waitForFunction(() => st.passes && $("#busy").hidden);
  await page.evaluate(() => { $("#notice").hidden = true; });
  return page;
}
const shown = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden"; }, sel);

// ---- a GT study: the tasks in the left bar, the image alone in the main area ----
let page = await open();
await check(await shown(page, "#tasks-box") && await shown(page, "#summary-box"), "Ground Truth Tasks is in the left bar, beside Summary, the image carrying a model");
await check(!(await shown(page, "#switch")), "no view switch over the image");
// req/shell/study/article: the study's article, a link in the header that opens apart from the page
const article = await page.$eval("#article-link", (a) => ({ shown: a.getClientRects().length > 0, href: a.href, target: a.target, rel: a.rel, text: a.textContent.trim() }));
await check(article.shown && article.href === "https://docs.google.com/document/d/1bv3iQPHhjCzYWPgaxIca8qeHcz1cdgII0L1uc7PhdbU/edit?tab=t.0" && article.target === "_blank" && /noopener/.test(article.rel) && article.text === "Article",
  "the header links to the study's article, opening in a tab of its own", article);
const tasks = await page.$$eval("#gt-tasks > li:not([data-task=edits])", (li) => li.map((l) => l.dataset.task));
await check(JSON.stringify(tasks) === JSON.stringify(["pass", "missed", "submit"]), "the tasks in order: the finalists, the missed NoRs, Submit", tasks);
await check(await page.$eval("#gt-submit", (b) => !!b.closest('#gt-tasks > li[data-task="submit"]')), "Save is the last task");

// req/nor/truth/order: one walk through the areas, the rows of areas back and forth; in each its finalists, the NoRs
// added there, each top to bottom, and last the area's check
const area = (c, W, H, n = 10) => { const r = Math.min(n - 1, Math.floor((c.cy / H) * n)), k = Math.min(n - 1, Math.floor((c.cx / W) * n)); return r * n + (r % 2 ? n - 1 - k : k); };
const walk = () => page.evaluate(() => nor.walk().map((x) => ({ key: x.key, a: x.a, t: x.t, cy: x.c?.cy, cx: x.c?.cx })));
let W = await walk();
const [IW, IH] = await page.evaluate(() => [st.W, st.H]);
{
  const rank = { pass: 0, missed: 1 };
  const bad = W.findIndex((x, k) => {
    if (x.cy != null && area(x, IW, IH) !== x.a) return true;
    const p = W[k - 1]; if (!p) return false;
    if (p.a !== x.a) return p.key !== "a:" + p.a || p.a > x.a; // an area ends with its check, and the next follows
    return p.key.startsWith("a:") || rank[p.t] > rank[x.t] || (p.t === x.t && p.cy > x.cy);
  });
  const areas = W.filter((x) => x.key.startsWith("a:")).length, cands = new Set(W.filter((x) => x.cy != null).map((x) => x.a)).size;
  await check(bad < 0 && areas === 100 && cands > 1 && W.filter((x) => x.t === "pass").length > 2,
    `one walk through the 100 areas, ${cands} of them holding candidates: finalists, added, then the area's check`, bad < 0 ? undefined : W.slice(Math.max(0, bad - 2), bad + 2));
}
const P = W.filter((x) => x.t === "pass").length;
const isDone = (x) => page.evaluate((key) => nor.walk().find((y) => y.key === key)?.done, x.key);
// the walk's next item not done after key
const nextOpen = async (key) => {
  const xs = await page.evaluate(() => nor.walk().map((x) => ({ key: x.key, done: x.done }))), k = xs.findIndex((x) => x.key === key);
  return [...xs.slice(k + 1), ...xs.slice(0, Math.max(k, 0))].find((x) => !x.done)?.key ?? null;
};

const now = () => page.evaluate(() => ({ cur: st.cur, task: st.task, sel: st.sel, card: document.querySelector("#task-card .card")?.dataset.i,
  rows: [...document.querySelectorAll("#gt-tasks > li:not([data-task=edits])")].map((l) => l.querySelector(".task-head").textContent.replace(/\s+/g, " ").trim()),
  open: document.querySelector("#gt-tasks > li.now")?.dataset.task, back: !$("#task-back").disabled,
  bar: [...document.querySelectorAll("#gt-bar > span")].map((b) => ({ grow: +getComputedStyle(b).flexGrow, fill: +b.style.getPropertyValue("--done") })) }));
// an area's rectangle in whole pixels, [x, y, w, h]: a pixel is in the area its column and row fall in
const rectOf = (a, n = 10) => { const r = Math.floor(a / n), k = r % 2 ? n - 1 - (a % n) : a % n, e = (v, L) => Math.ceil(v * L / n); return [e(k, IW), e(r, IH), e(k + 1, IW) - e(k, IW), e(r + 1, IH) - e(r, IH)]; };
const same = (p, q) => !!p && !!q && p.every((v, k) => Math.abs(v - q[k]) < 1e-6);
// req/shell/ground-truth/tagging: found, annotating, the walk is open at its first item
const ring = () => page.$eval("#overlay .ring", (r) => ({ shown: r.style.display !== "none" && getComputedStyle(r).display !== "none", stroke: getComputedStyle(r).stroke })).catch(() => ({ shown: false }));
const frame = () => page.evaluate(() => { const f = document.querySelector("#overlay .area-frame"); return f && f.style.display !== "none" && getComputedStyle(f).display !== "none" ? ["x", "y", "width", "height"].map((k) => +f.getAttribute(k)) : null; });
const cutShown = () => page.evaluate(() => { const g = document.querySelector("#overlay .done-mask"); return !!g && getComputedStyle(g).display !== "none"; });
const tagRows = () => page.evaluate(() => ["show-gt-cut", "show-gt-frame"].map((id) => $("#" + id).disabled));
let s = await now();
await check(W[0].cy != null, "the walk's first step is a candidate's, so a card opens with it", W[0]);
await check(await page.evaluate(() => !document.querySelector("#gt-start")), "there is no Start GT tagging: annotating is the walk");
await check(s.cur === W[0].key && !s.back && s.open === W[0].t && (W[0].cy == null || (await ring()).shown) && same(await frame(), rectOf(W[0].a)),
  "found, annotating opens the walk's first item in its framed area (ringed when it is a candidate), with nothing to go back to", s);
await check(!(await tagRows()).some(Boolean), "and the Show menu's Cut out and Frame rows are on", await tagRows());
await check(s.rows[0].startsWith(`0/${P} Finalists`), "the rows count the tasks", s.rows);
// one row per task, each counting once, never saying "review"
await check(s.rows[0].startsWith(`0/${P} Finalists`) && s.rows[1].startsWith("0/100 Areas") && /Save/.test(s.rows[2])
  && !s.rows.some((r) => /review/i.test(r)) && await page.$$eval("#tasks-box", (b) => !/\d+ of \d+/.test(b[0].textContent)), "one row per task: 0/N Finalists, 0/100 Areas, Submit", s.rows);
// the bar, a part per task as long as the task, filled as far as done
await check(s.bar.length === 2 && s.bar[0].grow === P && s.bar[1].grow === 100 && s.bar.every((b) => b.fill === 0), "the bar has a part per task, as long as the task", s.bar);

// clicking a task goes to its next item along the walk, after the one open
await page.click('#gt-tasks > li[data-task="pass"] .task-head .t');
const first = [...W.slice(1), W[0]].find((x) => x.t === "pass");
s = await now();
await check(s.cur === first.key && s.card === first.key.slice(2) && s.open === "pass", "clicking Finalists goes to the walk's next finalist, its row open", s);
// once the card it slid in over has gone
await page.waitForFunction(() => !document.querySelector("#task-stage .leaving"));
await check(await page.$$eval("#tasks-box .card", (c) => c.length) === 1, "one card at a time");
// the open row carries the cogwheel, Back and Skip; the card is the crop and big thumbs under it
const look = await page.evaluate(() => {
  const r = (e) => e.getBoundingClientRect(), d = $("#task-card .card"), crop = r(d.querySelector(".crop canvas")), up = r(d.querySelector(".verdict .up"));
  const head = document.querySelector("#gt-tasks > li.now .task-head");
  const box = r($("#gt-tasks")), down = r(d.querySelector(".verdict .down"));
  return { share: crop.width / box.width, under: up.top >= crop.bottom - 1 && Math.abs(up.top - down.top) < 1 && down.left > up.left, big: up.width >= 60 && up.height >= 36,
    head: !!d.querySelector(".head, .num, .state, .goto"), ticks: [...document.querySelectorAll("#gt-tasks > li:not(.done) .tick")].filter((t) => t.offsetParent).length,
    cog: !!head.querySelector("#card-menu summary svg") && !$("#card-menu summary").textContent.trim() && !$("#card-menu").open,
    skip: head.contains($("#task-skip")) && /skip/i.test($("#task-skip").textContent), back: head.contains($("#task-back")) && /back/i.test($("#task-back").textContent) };
});
await check(look.share >= 0.97 && look.under && look.big && !look.head && !look.ticks && look.cog && look.skip && look.back,
  "the open row has the cogwheel, Back and Skip; the crop takes the box's width, big thumbs side by side under it, no number or go-to, no marks on tasks not done", look);
await page.click("#card-menu summary");
await check(await page.evaluate(() => { const p = $("#card-menu .pop"), r = p.getBoundingClientRect(); return getComputedStyle(p).position === "absolute" && r.height > 40 && !!$("#opt-borders").offsetParent; }),
  "the cogwheel opens the options as a popup");
await page.click("#card-menu summary");

// req/nor/truth/marks: waiting, a faint outline and nothing else; decided, cut out of the image
const holes = () => page.evaluate(() => [...document.querySelectorAll("#done-mask-clip polygon")].map((p) => { const q = p.getAttribute("points").split(" ").map((v) => v.split(",").map(Number)), xs = q.map((v) => v[0]), ys = q.map((v) => v[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; }));
const mark = (i) => page.evaluate((i) => {
  const g = document.querySelector(`#overlay g[data-i="${i}"]`), out = g.querySelector("path:not(.red)"), cs = getComputedStyle(out);
  const c = nor.candOf(i), holes = [...document.querySelectorAll("#done-mask-clip polygon")].map((p) => { const q = p.getAttribute("points").split(" ").map((v) => v.split(",").map(Number)), xs = q.map((v) => v[0]), ys = q.map((v) => v[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; });
  const cut = holes.some(([x, y, w, h]) => x <= c.bb[0] - 2 + 1e-6 && y <= c.bb[1] - 2 + 1e-6 && x + w >= c.bb[2] + 2 - 1e-6 && y + h >= c.bb[3] + 2 - 1e-6);
  const seen = (e) => { for (; e && e.id !== "overlay"; e = e.parentElement) if (getComputedStyle(e).display === "none") return false; return true; };
  const shownLines = [...g.querySelectorAll(".lines line")].filter(seen);
  return { cls: g.getAttribute("class"), stroke: cs.stroke, opacity: +cs.strokeOpacity, width: cs.strokeWidth, outline: cs.display, num: getComputedStyle(g.querySelector(".num")).display, cut,
    cross: shownLines.length, red: shownLines.filter((l) => l.classList.contains("r")).length, glyphs: [...g.querySelectorAll("tspan")].filter(seen).length };
}, i);
const second = W.filter((x) => x.t === "pass")[1];
let m = await mark(+second.key.slice(2));
await check(/\btodo\b/.test(m.cls) && Math.abs(m.opacity - 0.8) < 0.01 && m.width === "1px" && !m.cut && m.num === "none" && m.stroke === "rgb(255, 255, 255)" && m.cross === 2 && !m.red && !m.glyphs,
  "a candidate waiting is a thin white outline, 80% opaque, with the cross of its length and width and no glyph", m);
// req/shell/ground-truth/area-map: while tagging the minimap shows the areas, the walk's own marked
const areaMap = () => page.evaluate(() => { const mm = $("#minimap"), b = [...mm.querySelectorAll(".mm-areas button")];
  return { shown: mm.checkVisibility(), title: mm.querySelector(".mm-title").textContent, cells: b.length, now: b.filter((x) => x.classList.contains("now")).map((x) => +x.dataset.area),
    done: b.filter((x) => x.classList.contains("done")).map((x) => +x.dataset.area) }; });
let am = await areaMap();
await check(am.shown && am.title === "Areas" && am.cells === 100 && am.now.length === 1 && am.now[0] === first.a && !am.done.length, "while tagging the minimap shows the 100 areas, the walk's own marked, none done", am);
const rung = await ring();
await check(rung.shown && rung.stroke === "rgb(255, 212, 0)", "the current candidate has a yellow ring", rung);
// the view come to rest where it was sent: the image's point x, y at its centre, or as near as the image's edge lets it
// the framed area wholly in view, and the scroll unmoved since the last frame: a right click then lands where the
// frame is; one that never comes says what it last saw: whether the view was still moving, and where the frame lay
const framedAtRest = () => page.waitForFunction(() => {
  const sc = $("#scroller"), v = sc.getBoundingClientRect(), f = $("#overlay .area-frame")?.getBoundingClientRect();
  const at = [sc.scrollLeft, sc.scrollTop].join(), still = window.lastScroll === at;
  window.lastScroll = at;
  const r = (b) => b && [b.left, b.top, b.right, b.bottom].map(Math.round);
  window.lastFraming = { scroll: at, still, view: r(v), frame: r(f), scrollSize: [sc.scrollWidth, sc.scrollHeight] };
  return still && f && f.left >= v.left && f.right <= v.right && f.top >= v.top && f.bottom <= v.bottom;
}, null, { polling: "raf" }).catch(async (e) => { throw new Error(`${e.message.split("\n")[0]}; last seen: ${JSON.stringify(await page.evaluate(() => window.lastFraming))}`); });
const viewAt = (x, y) => page.waitForFunction(([x, y]) => {
  const sc = $("#scroller"), v = sc.getBoundingClientRect(), p = new DOMPoint(x, y).matrixTransform($("#overlay").getScreenCTM());
  const there = (off, at, end) => Math.abs(off) <= 1.5 || (off < 0 && at <= 0) || (off > 0 && at >= end - 1);
  return there(p.x - (v.left + sc.clientLeft + sc.clientWidth / 2), sc.scrollLeft, sc.scrollWidth - sc.clientWidth)
    && there(p.y - (v.top + sc.clientTop + sc.clientHeight / 2), sc.scrollTop, sc.scrollHeight - sc.clientHeight);
}, [x, y]);
await check(same(await frame(), rectOf(first.a)), "the area the walk is in is framed", [await frame(), rectOf(first.a)]);
// req/nor/summary/mask: the mask shows with the summary, which shows beside the tasks while the image carries a model
await check(await page.evaluate(() => st.mask.length === 1 && !!document.querySelector("#overlay .mask-marks")), "the summary's mask is kept and drawn, the summary showing beside the tasks");

// req/nor/show-menu: the Show menu above the image, its rows named for the tasks' markings
await check(await shown(page, "#show-menu"), "the Show menu is above the image");
await page.click("#show-menu summary");
const rows = await page.$$eval("#show-menu .pop label", (l) => l.filter((x) => x.offsetParent).map((x) => x.textContent.trim()));
await check(JSON.stringify(rows) === JSON.stringify(["Finalists", "Added NoRs", "Cut out what is done", "Frame the area"]), "its rows: Finalists, Added NoRs, Cut out what is done, Frame the area", rows);
const toggle = (label) => page.locator("#show-menu .pop label:visible", { hasText: label }).locator("input").click();
const hidden = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].every((e) => getComputedStyle(e).display === "none"), sel);
await toggle("Frame the area");
await check(!(await frame()), "Frame the area off: no frame");
await toggle("Frame the area");
await toggle("Cut out what is done");
await check(await hidden("#overlay .done-mask"), "Cut out what is done off: the image whole");
await toggle("Cut out what is done");
await toggle("Finalists");
await check(await hidden(`#overlay g.pass.todo[data-i="${second.key.slice(2)}"]`), "Finalists off: no outline on a waiting finalist");
await toggle("Finalists");
await check(!(await hidden(`#overlay g.pass.todo[data-i="${second.key.slice(2)}"]`)) && await page.evaluate(() => JSON.parse(localStorage.getItem("nor-show-v1")).gtCut === true), "and back on, remembered");
await page.click("#show-menu summary");

// a verdict moves on along the walk, and cuts the reviewed one out
const i0 = +first.key.slice(2);
await page.click("#task-card .verdict .up");
s = await now();
let want = await nextOpen(first.key);
await check(s.cur === want && s.rows[0].startsWith(`1/${P} Finalists`) && s.bar[0].fill > 0 && s.back, "a thumbs up moves on to the walk's next item and fills the bar", { s, want });
m = await mark(i0);
await check(/\byes\b/.test(m.cls) && m.cut && m.outline === "none", "voted up, its area is cut out of the image", m);
// where it is cut out, black, and no picture behind it
const cut = await page.evaluate(() => { const g = document.querySelector("#overlay .done-mask"), bg = g?.querySelector(".done-bg"); return { pictures: g?.querySelectorAll("image").length, bg: bg && getComputedStyle(bg).fill, bgClip: bg?.getAttribute("clip-path"), w: +bg?.getAttribute("width") }; });
await check(cut.pictures === 0 && !pictures.length && /done-mask-clip/.test(cut.bgClip) && cut.bg === "rgb(0, 0, 0)" && cut.w === IW, "what is cut out shows black, over the whole image's width, and no picture is asked for", { ...cut, asked: pictures });
await page.click("#show-menu summary");
await toggle("Cut out what is done");
await check(await page.evaluate(() => !!document.querySelector("#overlay .done-mask")) && await hidden("#overlay .done-mask"), "with something cut out, Cut out what is done off: the image whole");
await toggle("Cut out what is done");
await page.click("#show-menu summary");
// Back: the item before, to change a verdict
await page.click("#task-back");
s = await now();
await check(s.cur === first.key && s.card === String(i0) && await page.$eval("#task-card .verdict .up", (b) => b.classList.contains("on")), "Back returns to the item before, showing its verdict", s);
await page.click("#task-card .verdict .down");
m = await mark(i0);
s = await now();
await check(/\bno\b/.test(m.cls) && m.cut && s.cur === want, "its verdict changed, voted down it is cut out too, and the walk goes on", { m, s });
// Skip: the walk's next item not done, with no verdict
const skipFrom = s.cur, slide = await page.evaluate(() => { $("#task-skip").click(); return { cur: st.cur, anims: $("#task-card").getAnimations({ subtree: true }).length, leaving: document.querySelectorAll("#task-stage .leaving").length, cards: document.querySelectorAll("#task-card .card").length }; });
want = await nextOpen(skipFrom);
await check(slide.cur === want && (!skipFrom.startsWith("c:") || !want.startsWith("c:") || (slide.anims > 0 && slide.leaving === 1 && slide.cards === 1)), "Skip slides the next item in over the last", { slide, want });
await check(!(await isDone({ key: skipFrom })), "and leaves the skipped one without a verdict");
await page.click("#task-back");
await check((await now()).cur === skipFrom, "Back returns to the skipped one");

// a task's card: turned level, with the bars and the adjusters; changed, it can be reset
await page.evaluate((k) => nor.goTo(k), W.filter((x) => x.t === "pass").at(-1).key);
const rcard = await page.evaluate(() => ({ bars: document.querySelectorAll("#task-card .marks .bar").length, handles: document.querySelectorAll("#task-card .handle").length, tag: !!document.querySelector("#task-card .tag"), reset: !!document.querySelector("#task-card .reset-lines") }));
await check(rcard.bars === 3 && rcard.handles === 6 && !rcard.tag && !rcard.reset, "a task's card has the measurement bars and the six adjusters", rcard);
{
  const h = page.locator('#task-card .handle[data-k="length"][data-j="1"]'); await h.scrollIntoViewIfNeeded();
  const b = await h.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 15, b.y + b.height / 2 - 10, { steps: 5 }); await page.mouse.up();
}
const changed = await page.evaluate(() => ({ edits: st.edits.has(st.sel), text: $("#task-card .card").textContent, reset: $("#task-card .reset-lines")?.textContent.trim() }));
await check(changed.edits && /^Reset measurements\b/.test(changed.reset) && !/Lengths adjusted/.test(changed.text), "its lengths changed, a Reset measurements button shows, and nothing else says so", changed);
await page.click("#task-card .reset-lines");
await check(await page.evaluate(() => !st.edits.has(st.sel) && !document.querySelector("#task-card .reset-lines")), "Reset measurements puts the finder's lengths back");

// a candidate clicked on the image becomes the current one; the Edit History window floats over the image's corner, where the candidate may be, so the
// tagger's own switch puts it away first
await page.evaluate(() => { if ($("#history-btn").getAttribute("aria-pressed") === "true") $("#history-btn").click(); });
const target = +W.filter((x) => x.t === "pass")[2].key.slice(2);
await page.evaluate((i) => nor.focusOn(nor.candOf(i)), target);
await viewAt(...await page.evaluate((i) => { const c = nor.candOf(i); return [c.cx, c.cy]; }, target));
const at = await page.evaluate((i) => { const r = document.querySelector(`#overlay g[data-i="${i}"] .hit`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, target);
await page.mouse.click(at.x, at.y);
s = await now();
await check(s.task === "pass" && s.sel === target && s.card === String(target), "a candidate clicked on the image is the current task's", s);
await check(!(await shown(page, "#selected-box")), "no card hovers over the image");

// an area done: every candidate in it decided, then its check; the whole area is cut out, and the walk enters the next.
// The area is one with a finalist near the image's middle, clear of what floats over the view's corners (the minimap)
const A = W.filter((x) => x.t === "pass").sort((p, q) => Math.hypot(p.cx - IW / 2, p.cy - IH / 2) - Math.hypot(q.cx - IW / 2, q.cy - IH / 2))[0].a, inA = W.filter((x) => x.a === A && x.key.startsWith("c:"));
await page.evaluate((ks) => { for (const k of ks.slice(1)) if (!st.forced.get(+k.slice(2))) nor.decide(+k.slice(2), "reject"); }, inA.map((x) => x.key));
await page.evaluate((k) => nor.goTo(k), inA[0].key);
await page.click("#task-card .verdict .up");
s = await now();
await check(s.cur === "a:" + A && s.task === "missed" && s.open === "missed" && same(await frame(), rectOf(A)) && !(await page.isDisabled("#area-ok")), "every candidate in the area decided, the walk comes to its check, the area framed", s);
await check(!(await holes()).some((h) => same(h, rectOf(A))), "the area is not cut out before it is checked");
// a NoR the finder missed, added in the area, waits for its verdict there; the view framing the area first comes to
// rest
await framedAtRest();
const fr = await page.$eval("#overlay .area-frame", (f) => { const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.click(fr.x, fr.y, { button: "right" });
await page.click('#point-menu [role="menuitem"]');
s = await now();
await check(s.cur === "c:u1" && s.card === "u1" && s.open === "missed" && await page.isDisabled("#area-ok"), "an added NoR is the current item, in the Areas task, and the area waits for it", s);
await page.click("#task-card .verdict .up");
s = await now();
await check(s.cur === "a:" + A, "its verdict given, the walk is back at the area's check", s);
// removed again, Back passes over it, once the view the verdict moved is at rest
// the NoR was added at the framed area's middle, wherever the view now has it
await framedAtRest();
const mid = await page.$eval("#overlay .area-frame", (f) => { const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.click(mid.x, mid.y, { button: "right" });
const offered = await page.textContent('#point-menu [role="menuitem"]');
const removed = /Remove/.test(offered) && await page.click('#point-menu [role="menuitem"]').then(() => true, () => false);
await check(/Remove/.test(offered) && removed, "a right click on the added NoR offers to remove it, and Remove removes it", offered);
await page.click("#task-back");
s = await now();
await check(s.cur !== null && s.cur !== "c:u1" && s.task !== "submit", "Back passes over an added NoR since removed", s);
await page.evaluate((k) => nor.goTo(k), "a:" + A);
await page.click("#area-ok");
s = await now();
await check((await holes()).some((h) => same(h, rectOf(A))) && s.rows[1].startsWith("1/100 Areas") && s.cur === await nextOpen("a:" + A),
  "No missed NoRs here cuts the whole area out and goes on to the walk's next item", s);
am = await areaMap();
await check(am.done.includes(A) && am.now[0] === await page.evaluate(() => st.area), "the area done is marked done on the minimap, the walk's next one current", am);
// a click on an area of the minimap opens it; the walk then goes back to where it was
{
  const was = await page.evaluate(() => st.cur), far = await page.evaluate(() => nor.walk().findLast((x) => !x.done).a);
  await page.click(`#minimap .mm-areas button[data-area="${far}"]`);
  await check(await page.evaluate(() => st.area) === far && same(await frame(), rectOf(far)) && (await areaMap()).now[0] === far, "clicking an area on the minimap opens it, framed", await now());
  await page.evaluate((k) => nor.goTo(k), was);
}

// req/shell/ground-truth/areas: the shell's Areas menu, NoR starting at 10 × 10; another count walks again from its first
// area not done, and a check stays on the pixels it covers
await check(await page.$eval("#gt-areas", (m) => m.value === "10" && m.options.length === 8 && !m.closest("[hidden]")), "the Areas menu shows, at NoR's 10 × 10");
await page.selectOption("#gt-areas", "2");
s = await now();
const W2 = await walk();
await check(s.rows[1].startsWith("0/4 Areas") && W2.filter((x) => x.key.startsWith("a:")).length === 4 && W2.every((x) => x.cy == null || area(x, IW, IH, 2) === x.a)
  && s.cur === await page.evaluate(() => nor.walk().find((x) => !x.done)?.key), "2 × 2: four areas, the candidates in the quarter they lie in, one area checked of 100 too little of any", s);
// the top right quarter, its candidates decided, checked under 2 × 2
await page.evaluate(() => { for (const x of nor.walk()) if (x.a === 1 && x.c && !x.done) nor.decide(x.c.i, "reject"); nor.goTo("a:1"); });
await page.click("#area-ok");
await page.selectOption("#gt-areas", "10");
s = await now();
const inQuarter = (a) => { const r = Math.floor(a / 10), k = r % 2 ? 9 - (a % 10) : a % 10; return r < 5 && k >= 5; };
const quarterWant = 25 + (inQuarter(A) ? 0 : 1);
await check(s.rows[1].startsWith(`${quarterWant}/100 Areas`) && (await holes()).some((h) => same(h, rectOf(A))),
  `back at 10 × 10, the quarter checked is its 25 areas, with the one checked before: ${quarterWant}`, s);

// everything decided and every area checked: Submit
await page.evaluate(() => { for (const x of nor.walk()) if (x.c && !x.done) nor.decide(x.c.i, "reject"); nor.goTo(nor.walk().find((x) => !x.done)?.key ?? null); });
for (let k = 0; k < 120 && await page.evaluate(() => st.task === "missed"); k++) await page.click("#area-ok");
s = await now();
await check(s.task === "submit" && s.rows[1] === "100/100 Areas" && (await page.$eval("#gt-submit", (b) => b.dataset.state)) === "done", "every task done: Submit, its icon a check", s);
await check(await page.$$eval('#gt-tasks > li[data-task="missed"], #gt-tasks > li[data-task="pass"]', (l) => l.every((x) => x.classList.contains("done"))), "every task is checked done");
await page.close();

// ---- req/nor/truth/keys: a key per button while tagging, read by its place on the keyboard ----
page = await open();
await page.evaluate(() => { document.activeElement?.blur(); window.addEventListener("keydown", (e) => { window.lastKey = e.defaultPrevented; }); });
// a key pressed as a person does, or as a layout or a held key sends it; true when the page took it
const key = async (code, o = {}) => {
  if (!o.as) { await page.keyboard.press(code); return page.evaluate(() => window.lastKey); }
  return page.evaluate(([code, o]) => { const e = new KeyboardEvent("keydown", { code, key: o.as, repeat: !!o.repeat, bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; }, [code, o]);
};
// the key a button shows at its end, while it is shown
const chip = (sel) => page.$eval(sel, (b) => b.offsetParent ? b.querySelector(":scope > kbd.key-on")?.textContent ?? null : null).catch(() => null);
// the legend's rows while tagging: the one view of the whole image, the NoRs over it shown or not, on 1; the Show menu's other rows
// have no row and no key; the buttons' keys on the buttons
const shownOn = (sel) => page.evaluate((s) => { const b = document.querySelector(s); return !!b && !b.disabled && b.checkVisibility(); }, sel);
const expectRows = async () => "NoRs 1";
const KEYS = ["KeyF", "KeyJ", "Space", "Backspace", "KeyS", "KeyR", "Digit1", "Digit2", "Digit3", "Digit4"].map((code) => ({ code }));
const verdictNow = (i) => page.evaluate((i) => st.forced.get(i) || null, i);
let took;
await page.evaluate(() => document.activeElement?.blur());
await page.evaluate((k) => nor.goTo(k), first.key);
const chips = { up: await chip("#task-card .verdict .up"), down: await chip("#task-card .verdict .down"), skip: await chip("#task-skip"), back: await chip("#task-back") };
await check(chips.up === "F" && chips.down === "J" && chips.skip === "S" && (chips.back === "⌫" || !(await shownOn("#task-back"))), "each button shows its key: F on the thumbs up, J on the thumbs down, S on Skip, ⌫ on Back", chips);
await check(await legendRows(page) === await expectRows(), "tagging a candidate, the legend lists NoRs alone, on 1, with F, J and S on their buttons", await legendRows(page));
const heard = await studyTakes(page, KEYS);
await check(heard.took.length === 0, "the study takes no shortcut key itself: the shell is the only one wiring them", heard);
s = await now();
took = await key("KeyF");
let s2 = await now();
await check(took && await verdictNow(i0) === "in" && s2.cur === await nextOpen(first.key) && s2.rows[0].startsWith(`1/${P} Finalists`), "F is the thumbs up: the item is a NoR and the walk moves on", s2);
// the next item: a finalist
const second2 = W.filter((x) => x.t === "pass").find((x) => x.key !== first.key), j2 = +second2.key.slice(2);
await page.evaluate((k) => nor.goTo(k), second2.key);
took = await key("KeyJ", { as: "ח", repeat: true });
await check(!took && await verdictNow(j2) === null && (await now()).cur === second2.key, "a key held down does not repeat its verdict", { took, verdict: await verdictNow(j2), cur: (await now()).cur, want: second2.key });
took = await key("KeyJ", { as: "ח" });
s2 = await now();
await check(took && await verdictNow(j2) === "out" && s2.cur !== second2.key, "J in a Hebrew layout is the thumbs down: not a NoR, and the walk moves on", s2);
took = await key("Backspace");
s2 = await now();
await check(took && s2.cur === second2.key && await page.$eval("#task-card .verdict .down", (b) => b.classList.contains("on")), "Backspace is Back: the item before, its verdict shown", s2);
await check(await legendRows(page) === await expectRows() && await chip("#task-back") === "⌫", "with an item behind, Back shows its key, off the legend", await legendRows(page));
took = await key("Alt+KeyS");
await check(!took && (await now()).cur === second2.key, "with Alt held, S does nothing");
await page.evaluate(() => { const f = document.createElement("input"); f.id = "typing"; document.body.append(f); f.focus(); });
took = await key("KeyS");
await check(!took && (await now()).cur === second2.key && await page.$eval("#typing", (f) => f.value) === "s", "typing in a field, S is a letter typed, not Skip");
await page.evaluate(() => document.querySelector("#typing").remove());
await page.click("#card-menu summary");
took = await key("KeyS");
await check(!took && (await now()).cur === second2.key, "with a menu open, S does nothing");
await page.click("#card-menu summary");
await page.evaluate(() => document.activeElement?.blur());
took = await key("KeyS");
s2 = await now();
await check(took && s2.cur === await nextOpen(second2.key) && await verdictNow(j2) === "out", "S is Skip: the walk's next item not done", s2);
// R: a finalist's measurements changed, put back
await page.evaluate((k) => nor.goTo(k), W.filter((x) => x.t === "pass").at(-1).key);
took = await key("KeyR");
await check(!took, "with nothing measured differently, R does nothing");
{
  const h = page.locator('#task-card .handle[data-k="length"][data-j="1"]'); await h.scrollIntoViewIfNeeded();
  const b = await h.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 15, b.y + b.height / 2 - 10, { steps: 5 }); await page.mouse.up();
}
const rChip = await chip("#task-card .reset-lines");
await check(await chip("#task-card .reset-lines") === "R" && await legendRows(page) === await expectRows(), "measured differently, Reset measurements shows its key, off the legend", await legendRows(page));
took = await key("KeyR");
await check(rChip === "R" && took && await page.evaluate(() => !st.edits.has(st.sel) && !document.querySelector("#task-card .reset-lines")), "R is Reset measurements, its chip R", rChip);
// Space: the area's check, even with a button focused
took = await key("Space");
await check(!took, "away from an area's check, Space does nothing of the page's");
const A2 = W.find((x) => x.key.startsWith("a:")).a;
await page.evaluate((k) => nor.goTo(k), "a:" + A2);
const okChip = await chip("#area-ok");
await check(await legendRows(page) === await expectRows() && await chip("#area-ok") === "Space", "on an area's check No missed NoRs here shows Space, off the legend", await legendRows(page));
took = await key("Space");
s2 = await now();
await check(okChip === "Space" && took && await page.evaluate((a) => st.areas.has(a), A2) && s2.cur === await nextOpen("a:" + A2),
  "Space is No missed NoRs here, the area checked and the walk on", { okChip, s2 });
// 1 shows and hides the NoRs over the image, the finalists and the added ones together, its legend row filled blue while it is
// held and while they show; 2, 3 and 4 switch nothing
const norsShown = () => page.evaluate(() => ({ pass: $("#show-gt-pass").checked, added: $("#show-gt-added").checked, off: $("#overlay").classList.contains("no-gt-pass") && $("#overlay").classList.contains("no-gt-added"),
  cut: $("#show-gt-cut").checked, frame: $("#show-gt-frame").checked }));
await page.keyboard.down("Digit1");
const heldRow = (await legend(page))[0], hid = await norsShown();
await page.keyboard.up("Digit1");
const offRow = (await legend(page))[0];
await check(!hid.pass && !hid.added && hid.off && heldRow.lit && !offRow.lit, "1 hides the NoRs, finalists and added alike: its row blue while 1 is held, grey once let go", { hid, heldRow, offRow });
for (const k of ["Digit2", "Digit3", "Digit4"]) await page.keyboard.press(k);
const others = await norsShown();
await check(others.cut && others.frame && !others.pass && !others.added, "2, 3 and 4 switch nothing: cutting out what is done and framing the area have no key", others);
await page.click("#key-show-nors");
const back = await norsShown();
await check(back.pass && back.added && !back.off && (await legend(page))[0].lit, "clicking its row shows the NoRs again, its row blue", back);
await page.close();

// ---- a Review study: the summary and its mask, the Show menu's viewing rows, no tasks and no item view ----
page = await open("Review", { article: null });
await check(!(await shown(page, "#article-link")), "a study naming no article shows no link to one");
await check(await shown(page, "#summary-box") && !(await shown(page, "#tasks-box")) && !(await shown(page, "#switch")) && await shown(page, "#show-menu"),
  "a Review study has its summary and its Show menu, no tasks and no switch to an item view");
await check(await page.evaluate(() => !!document.querySelector("#overlay .mask-marks .edge")), "the summary's mask is drawn with the summary");
await page.click("#show-menu summary");
const vrows = await page.$$eval("#show-menu .pop label", (l) => l.filter((x) => x.offsetParent).map((x) => x.textContent.trim()));
await check(JSON.stringify(vrows) === JSON.stringify(["Finalists", "Rejected by you", "candidate numbers", "measuring lines"]), "its rows: Finalists and the ones rejected by you, then the numbers and lines", vrows);
await done(0);
