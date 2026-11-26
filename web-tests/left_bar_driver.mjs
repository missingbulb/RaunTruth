// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from
// ANSWERS (tests/test_study_runs.py), and checks the left bar's drawers: Load, Analysis and Summary, always there, stacked
// with no gap, with no number and no check, the open ones marked, Data Management's own drawers not among them; one
// waiting for the stage before it folded to its title and inert, opening as that stage ends; Load folding once an image
// is in; a title alone on a folded one; and another image, or Unload, starting over. Exits 1 on a failed check, 2 when
// it cannot run.
//   node web-tests/left_bar_driver.mjs ANSWERS IMAGE.png STUDIES
import { fromScratch } from "./annotating.mjs";
import { EARLY } from "./early_messages.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { tagger } from "./tagger.mjs";
import { record, begun, moved } from "./page_motions.mjs";
import { pw, launch } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";

const [answers, image, studies] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
postMessage({ type: "ready", info: A.ready.fixture });
onmessage = ({ data: m }) => {
  if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images }, [images.buffer]); }
  else if (m.type === "call") { const b = bytes(A.mask); postMessage({ type: "result", action: m.action, meta: A.count, bytes: b, echo: m.echo }, [b.buffer]); }
};`;
const { origin, server } = await serveSite({
  "/web/worker.js": () => EARLY + STAND_IN,
  "/web/vendor/wheels.json": "[]",
  "/web/answers.json": { file: answers },
  "/web/studies.json": { file: studies },
});

const browser = await launch(pw), w = world(browser, origin);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); } console.log("ok: " + what); };

w.site.withGoogle();
w.studies.fromThisComputer("fixture");
const device = w.device().signedInAs(tagger(w)).withEditHistoryShown();
await record(await device.context());
const page = await device.opens("fixture");

// the left bar's drawers as the user sees them: the title, open or folded by any of its contents shown or not, and
// "waits" for one that is inert; the drawers on show: Data Management's own are not, out of it
const bar = () => page.evaluate(() => [...document.querySelectorAll("#left > .box.foldable")].filter((b) => b.checkVisibility()).map((b) => {
  const body = [...b.children].filter((c) => !c.matches(".sec-head, .gt-access, slot-here")), h = b.querySelector(".sec-head h2");
  return `${h.textContent.trim()} ${body.some((c) => c.offsetParent) ? "open" : "folded"}${h.getAttribute("aria-disabled") === "true" ? " waits" : ""}`;
}));
// what a drawer's header row shows beside its title
const beside = (k) => page.evaluate((i) => [...[...document.querySelectorAll("#left > .box.foldable")].filter((b) => b.checkVisibility())[i].querySelectorAll(":scope > .sec-head > :not(h2)")]
  .filter((e) => e.checkVisibility()).map((e) => e.id), k);
const boxes = async (want, what) => { const b = await bar(); await check(b.join("|") === want.join("|"), what, b); };
// a drawer slides open or shut: read once it has
const title = async (k) => { await page.locator("#left > .box.foldable:visible > .sec-head h2").nth(k).click(); await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")); };
// the status line is cleared first, so the wait is for this image's load, not the last one's
const loadImage = async () => {
  await page.evaluate(() => { document.querySelector("#status").textContent = ""; });
  await page.setInputFiles("#file", image);
  await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded." && document.querySelector("#fx-count")?.disabled === false);
};
const name = path.basename(image);

// drawers, not boxes: each touches the one above it
const gaps = await page.evaluate(() => { const r = [...document.querySelectorAll("#left > .box.foldable")].filter((b) => b.checkVisibility()).map((b) => b.getBoundingClientRect());
  return r.slice(1).map((x, k) => Math.round(x.top - r[k].bottom)); });
await check(gaps.every((g) => g <= 0), "the drawers stack with no gap between them", gaps);
const bars = () => page.evaluate(() => [...document.querySelectorAll("#left > .box.foldable")].filter((b) => b.checkVisibility()).map((b) => getComputedStyle(b).boxShadow !== "none"));

const marks = await page.evaluate(() => document.querySelectorAll("#left .step-mark, #left .sec-head h2 img, #left .sec-head h2 canvas").length);
await boxes(["Image open", "Analysis folded waits", "Summary folded waits"], "before an image the three drawers are there: Image open, Analysis and Summary folded to their titles, waiting");
await check(marks === 0, "no drawer carries a number, a check or a picture beside its title", marks);
await check((await bars()).join() === "true,false,false", "the open drawer, and only it, carries the accent bar", await bars());
// a waiting drawer is inert: a click on it, or Enter on its title, opens nothing
await page.locator("#left > .box.foldable:visible > .sec-head").nth(1).click();
await page.locator("#left > .box.foldable:visible > .sec-head").nth(2).click();
await page.evaluate(() => document.querySelector("#summary-box h2").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
await boxes(["Image open", "Analysis folded waits", "Summary folded waits"], "a waiting drawer does not open when pressed");
await loadImage();
await boxes(["Image folded", "Analysis open", "Summary folded waits"], "an image open: Image folds to its title alone, Analysis opens, Summary still waits");
await check((await beside(0)).length === 0, "the folded Load drawer shows nothing beside its title", await beside(0));
// a drawer slides open or shut, and the drawers below slide to their new places: the slide starts and ends
const before = await begun(page);
await title(0);
// where the browser has the view transitions it takes; elsewhere the drawers change at once
const slides = await page.evaluate(() => !!document.startViewTransition && CSS.supports("view-transition-group", "contain"));
const slid = slides ? await moved(page, before, /^drawer-/) : null;
await check(!slides || (!slid.missing && slid.groups.filter((g) => g.startsWith("drawer-")).length >= 2), slides ? "a drawer slides open, and the drawers below it slide down" : "a browser without the view transitions the slide takes: the drawers change at once", slid);
await boxes(["Image open", "Analysis open", "Summary folded waits"], "its title opens a folded drawer");
await check((await beside(0)).join() === "unload", "open, the Load drawer's header carries unload image", await beside(0));
await title(0);
await boxes(["Image folded", "Analysis open", "Summary folded waits"], "and folds it again");
// a folded drawer opens from anywhere on it, not only its title: a click at the far end of its row; an open one folds
// only from its title
const rowEnd = async (k) => { const r = await page.locator("#left > .box.foldable:visible > .sec-head").nth(k).boundingBox();
  await page.mouse.click(r.x + r.width - 4, r.y + r.height / 2); await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")); };
await rowEnd(0);
await boxes(["Image open", "Analysis open", "Summary folded waits"], "a click anywhere on a folded drawer opens it");
await title(0);
await title(1);
await boxes(["Image folded", "Analysis folded", "Summary folded waits"], "a drawer no longer waiting folds from its title");
await rowEnd(1);
await boxes(["Image folded", "Analysis open", "Summary folded waits"], "and opens again");
// Start, Run: the study's runner and its tasks are parts of the one Analysis drawer, and Summary opens with the model
await fromScratch(page, "#fx-count");
await page.waitForFunction(() => /pixels/.test(document.querySelector("#fx-result").textContent));
await boxes(["Image folded", "Analysis open", "Summary open"], "the algorithm run: Analysis stays open and Summary, the image carrying a model, opens");
const parts = await page.evaluate(() => ({ runner: document.querySelector("#fx-count").closest(".box").id, tasks: document.querySelector("#gt-tasks").closest(".box").id,
  title: document.querySelector("#tasks-title").checkVisibility() && document.querySelector("#tasks-title").textContent.trim(), drawers: document.querySelectorAll("#left > .box.foldable").length }));
await check(parts.runner === "analysis-box" && parts.tasks === "analysis-box" && parts.title === "Analysis Tasks" && parts.drawers === 3,
  "the study's runner and its tasks, titled Analysis Tasks, are in the Analysis drawer: the bar has three drawers and no more", parts);
// the tasks split by purpose (req/shell/ground-truth/tasks): progress a strip under the header, the open task alone under the
// runner, Undo and Redo in the image's toolbar, the unsaved count beside Upload
const split = await page.evaluate(() => {
  const q = (sel) => document.querySelector(sel), top = (sel) => q(sel).getBoundingClientRect().top;
  return { strip: !!q("#gt-strip")?.checkVisibility() && q("#gt-strip").previousElementSibling === q("#analysis-box > .sec-head"),
    holds: ["#tasks-title", "#gt-areas-row", "#gt-bar", "#gt-counters"].filter((sel) => !q("#gt-strip")?.contains(q(sel))),
    counters: [...document.querySelectorAll("#gt-counters > button")].map((b) => b.textContent.trim().replace(/\s+/g, " ")),
    aboveRunner: !!q("#gt-strip") && top("#gt-strip") < top("#fx-count"),
    rows: [...document.querySelectorAll("#gt-tasks > li")].filter((li) => li.checkVisibility()).map((li) => li.dataset.task),
    tools: [q("#history-btn").nextElementSibling?.id, q("#history-btn").nextElementSibling?.nextElementSibling?.id], toolsShown: !!q("#gt-undo").checkVisibility() && !!q("#gt-redo").checkVisibility(),
    keys: [q("#gt-undo").title, q("#gt-redo").title], unsavedBy: q("#gt-unsaved").closest("li")?.dataset.task };
});
await check(split.strip && !split.holds.length && split.aboveRunner, "the tasks' progress is a strip directly under the Analysis header, above the runner: the title, the Areas menu, the bar and the counters", split);
await check(split.counters.join() === "0/1 Count checked", "each task is a counter in the strip", split.counters);
await check(split.rows.join() === "check,submit", "under the runner the open task alone is drawn, and Upload's row last", split.rows);
await check(split.tools.join() === "gt-undo,gt-redo" && split.toolsShown && /Ctrl\+Z/.test(split.keys[0]) && /Ctrl\+Y/.test(split.keys[1]) && split.unsavedBy === "submit",
  "Undo and Redo are tool buttons after Edit History's, each naming its key, and the unsaved count stands in Upload's row", split);
await check((await beside(1)).join() === "annotate-clear,analysis-dl" && (await beside(2)).join() === "summary-dl", "the Analysis header carries reset analysis and Download Analysis, the Summary header Download Summary",
  { analysis: await beside(1), summary: await beside(2) });
// the header's controls sit at its far edge, the title at its near one (row-indicators-edges)
const edges = await page.evaluate(() => { const h = document.querySelector("#analysis-box > .sec-head").getBoundingClientRect(), t = document.querySelector("#analysis-box h2").getBoundingClientRect(),
  d = document.querySelector("#analysis-dl").getBoundingClientRect(); return { title: Math.round(t.left - h.left), icon: Math.round(h.right - d.right) }; });
await check(edges.title <= 14 && edges.icon <= 14, "the title at the header's near edge, the download icon at its far one", edges);
await loadImage();
await boxes(["Image folded", "Analysis open", "Summary folded waits"], "another image starts over: Summary waits again");
await title(0); await page.click("#unload");
await page.waitForFunction(() => document.querySelector("#unload").hidden && [...document.querySelectorAll("#left > .box.foldable")].filter((b) => b.checkVisibility()).length === 3);
await boxes(["Image open", "Analysis folded waits", "Summary folded waits"], "Unload: every drawer waits again, as at first");

// req/shell/left-bar/static: the bar stays open, with no chevron, no Steps label or strip, and the gutter only resizes it
const left = () => page.evaluate(() => Math.round(document.querySelector("#left").getBoundingClientRect().width));
const settled = () => page.waitForFunction(() => !document.getAnimations().some((a) => a.transitionProperty === "grid-template-columns"));
const gone = await page.evaluate(() => ({ parts: ["#left-collapse", "#left-strip", "#left-head", "#left-expand", "#left-marks"].filter((s) => document.querySelector(s)),
  steps: [...document.querySelectorAll("#left *")].filter((e) => e.children.length === 0 && e.textContent.trim() === "Steps").length }));
await check(!gone.parts.length && !gone.steps, "the left bar has no chevron, no Steps label and no strip", gone);
const gutter = await page.evaluate(() => ({ w: Math.round(document.querySelector("#gutter-left").getBoundingClientRect().width), holds: document.querySelector("#gutter-left").children.length }));
await check(gutter.holds === 0 && gutter.w <= 12, "the gutter holds no tab, only the resize handle", gutter);
const drag = async (to) => { const g = await page.locator("#gutter-left").boundingBox(); await page.mouse.move(g.x + g.width / 2, g.y + 100); await page.mouse.down();
  for (const x of to) await page.mouse.move(x, g.y + 100, { steps: 4 }); await page.mouse.up(); await settled(); };
const barLeft = await page.evaluate(() => Math.round(document.querySelector("#left").getBoundingClientRect().left));
await drag([barLeft + 150, barLeft + 20]);
await check((await left()) >= 190, "dragging the gutter to the edge stops at the bar's narrowest, never collapsing it", await left());
await drag([barLeft + 280]);
await check(Math.abs((await left()) - 280) <= 14, "and it drags wider again", await left());
// a drag moves the columns with the pointer, the image view beside them too: no motion lags behind it
{
  const g = await page.locator("#gutter-left").boundingBox(), y = g.y + 100;
  await page.mouse.move(g.x + g.width / 2, y); await page.mouse.down();
  await page.mouse.move(barLeft + 340, y);
  const mid = await page.evaluate(() => ({ w: Math.round(document.querySelector("#left").getBoundingClientRect().width),
    moving: document.getAnimations().filter((a) => a.transitionProperty === "grid-template-columns").length }));
  await page.mouse.up();
  await check(!mid.moving && Math.abs(mid.w - 340) <= 14, "mid-drag the bar is already where the pointer is, with nothing animating", mid);
}
await done(0);
