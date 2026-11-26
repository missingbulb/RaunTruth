// Drives the Edit History window (req/shell/ground-truth/history, req/shell/ground-truth/clear) in headless Chromium on the
// fixture study, against the stand-in Google of stand_in_drive.mjs, annotating: where it floats and how big it
// is, its rows (newest on top, the current one dotted, undone ones above it), a click on a row, folded runs, a day rule, a
// long list drawn by what is in view, a hover's ring and a click's pan, its switch, Clear all history and a draft whose
// history did not replay. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/gt_history_window_driver.mjs ANSWERS STUDIES ROOT
import { fromScratch } from "./annotating.mjs";
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { until } from "./page_until.mjs";
import { kit } from "./gt_history_kit.mjs";
import { replay } from "../web/truth_actions.js";
import * as fixture from "../studies/fixture/web/gt_actions.js";

const [answers, studies, rootDir] = process.argv.slice(2);
const drive = await standIn({ answers, studies, rootDir });
const { FILES, GT, open, check, done } = drive;
const png = FILES.find((f) => /\.png$/.test(f.name));
const sha = createHash("sha256").update(png.bytes).digest("hex");
const { openImage, tagger, openKept, model, marks, counted, label, dragMark, moved, records, ask } = kit({ drive, png });
// the window opened by its button, for a page that goes on to look at it
const shown = async (page) => { if (await page.isHidden("#edit-history")) await page.click("#history-btn"); };

const rowsOf = (page) => page.evaluate(() => [...document.querySelectorAll("#eh-list > li")].map((li) => ({ cls: li.className, text: li.querySelector(".what")?.textContent ?? li.textContent, when: li.querySelector(".when")?.textContent ?? "", go: li.dataset.go ?? null })));
const real = (rows) => rows.filter((r) => !/\b(day|spacer)\b/.test(r.cls));
const click = (page, text) => page.evaluate((t) => { [...document.querySelectorAll("#eh-list > li")].find((li) => li.textContent.includes(t)).click(); }, text);
const box = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const settle = (page) => until(page, () => !document.activeViewTransition);

// a draft record as the page would write it: the log in force, the study's document of its replay (or the one given) and
// when it was saved
const draft = (actions, doc) => ({ study: "fixture", sha256: sha, name: png.name, saved: new Date().toISOString(), log: actions,
  model: doc ?? fixture.document(replay(fixture, actions).model), replay: "verified" });
const yesterday = (h, m, s = 0) => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(h, m, s, 0); return d.toISOString(); };
const head = (at) => [{ type: "open", at, image: { name: png.name, sha256: sha, width: 80, height: 60 }, study: "fixture" },
  { type: "run", at, algorithm: { key: "fixture", params: { threshold: 128 } }, output: { threshold: 128, count: 400, spots: [[27, 27], [60, 37]] } }];
const loaded = async (page) => { await until(page, () => !$("#gt-offers").hidden); await page.click("#gt-load-draft"); await until(page, () => $("#gt-offers").hidden && !!window.fixture.model()); };

// where it floats and how big it is
let page = await open(true);
await openImage(page);
await check(await page.isHidden("#edit-history") && await page.isHidden("#history-btn"), "before an analysis starts there is no run: the window is not shown, nor its button");
await fromScratch(page, "#fx-count");
await counted(page);
await settle(page);
await check(await page.isHidden("#edit-history") && await page.isVisible("#history-btn") && await page.getAttribute("#history-btn", "aria-pressed") === "false",
  "once the image has a run its button shows, up, and the window stays closed until it is pressed");
await page.click("#history-btn");
await check(await page.isVisible("#edit-history"), "pressed, the window shows");
const [saveBtn, submitBtn] = [await box(page, "#gt-save-draft"), await box(page, "#gt-submit")];
await check(saveBtn.r <= submitBtn.l && Math.abs(submitBtn.h - saveBtn.h) < 1 && Math.abs(submitBtn.t - saveBtn.t) < 1, "Save Draft sits beside Save, each on one line", { saveBtn, submitBtn });
const geo = async () => {
  const [w, v, vars] = [await box(page, "#edit-history"), await box(page, "#image-view"), await page.evaluate(() => { const c = getComputedStyle(document.documentElement); return parseFloat(c.getPropertyValue("--mm-width")); })];
  return { right: v.r - w.r, bottom: v.b - w.b, w: w.w, h: w.h, expectW: vars * 1.4, expectH: Math.min((vars + 24) * 2.5, v.b - v.t - 24) };
};
let g = await geo();
await check(g.right === 12 && g.bottom === 12 && Math.abs(g.w - g.expectW) < 0.5 && Math.abs(g.h - g.expectH) < 0.5 && g.h === 560, "it floats at the image's bottom right, 12 px in, 1.4 times the minimap's width and 2.5 times its height", g);
await page.setViewportSize({ width: 1400, height: 520 });
await settle(page);
g = await geo();
await check(g.h < 560 && Math.abs(g.h - g.expectH) < 0.5 && g.bottom === 12, "in a shorter view it is never taller than the view less its margins", g);
await page.setViewportSize({ width: 1400, height: 900 });

// its rows: the count, newest on top, the current one dotted, what was undone above it until a new action
const runMarks = await marks(page);
await moved(page, "m1", 12, 12);
await page.evaluate(() => $("#fx-add").click());
await moved(page, "m2", -10, 8);
let rows = real(await rowsOf(page));
const title = await page.textContent("#eh-count");
await check(title.trim() === "· 3" && /Moved mark m2/.test(rows[0].text) && /here/.test(rows[0].cls) && /Added mark m3/.test(rows[1].text) && /Moved mark m1/.test(rows[2].text)
  && /^Algorithm ran: threshold 128/.test(rows[3].text) && rows[4].text === "Image opened" && rows.length === 5, "newest on top, the current row dotted, the run and the image's opening at the foot, the count in the title", { title, rows });
await check((await page.textContent("#eh-list .here .dot")) === "●", "the dot marks the current row");
await page.click("#gt-undo"); await page.click("#gt-undo");
rows = real(await rowsOf(page));
await check(/undone/.test(rows[0].cls) && /undone/.test(rows[1].cls) && /here/.test(rows[2].cls) && /Moved mark m1/.test(rows[2].text) && rows.length === 5,
  "after two undos the two undone rows sit above the dot", rows);
const ink = (sel) => page.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return { line: c.textDecorationLine, colour: c.color }; }, sel);
const [struck, plain] = [await ink("#eh-list li.undone .what"), await ink("#eh-list li.here .what")];
await check(struck.line === "line-through" && struck.colour !== plain.colour && plain.line === "none", "an undone row is struck through and dimmed, the current one neither", { struck, plain });
await check(/^Undo: Moved mark m1/.test(await page.getAttribute("#gt-undo", "title")), "Undo's tooltip names what it will undo", await page.getAttribute("#gt-undo", "title"));
await page.evaluate(() => $("#fx-done").click());
await until(page, () => !document.querySelector("#eh-list .undone"));
rows = real(await rowsOf(page));
await check(rows.length === 4 && /Count checked/.test(rows[0].text), "a new action takes the undone rows away", rows);

// a click on a row goes to it; the run's row is back to the algorithm's output; the image's opening is no row to go to
await click(page, "Moved mark m1");
await until(page, () => !!document.querySelector("#eh-list .undone"));
rows = real(await rowsOf(page));
await check(/here/.test(rows.find((r) => /Moved mark m1/.test(r.text)).cls) && rows.filter((r) => /undone/.test(r.cls)).length === 1, "a click on a row goes to it, the later row now undone", rows);
await click(page, "Algorithm ran");
await until(page, () => document.querySelectorAll("#eh-list .undone").length === 2);
await check((await marks(page)) === runMarks && (await model(page)).checked === false, "the run's row goes back to the algorithm's output", await model(page));
const before = await marks(page);
await click(page, "Image opened");
rows = real(await rowsOf(page));
await check((await marks(page)) === before && rows.at(-1).go === null && !/\bgo\b/.test(rows.at(-1).cls), "the image's opening is no row to go to", rows.at(-1));
await click(page, "Count checked");
await until(page, () => !document.querySelector("#eh-list .undone"));
rows = real(await rowsOf(page));
await check(/here/.test(rows[0].cls) && /Count checked/.test(rows[0].text) && (await model(page)).checked === true && (await marks(page)) !== runMarks, "a click on an undone row goes forward to it, what was undone done again", rows);
await page.context().close();

// runs of one type fold into one row, unfolded by its chevron; Undo still takes one action
page = await open(true);
await tagger(page);
await shown(page);
await counted(page);
await moved(page, "m1", 12, 12); await moved(page, "m2", 10, 10); await moved(page, "m1", -6, -6);
rows = real(await rowsOf(page));
await check(rows.length === 3 && rows[0].text === "Moved 3 marks" && /here/.test(rows[0].cls) && /^\d\d:\d\d(–\d\d:\d\d)?$/.test(rows[0].when), "three moves in a row fold into one row, with its count and its time", rows);
await page.click("#eh-list .eh-fold");
rows = real(await rowsOf(page));
await check(rows.filter((r) => /member/.test(r.cls)).length === 3 && rows.filter((r) => /here/.test(r.cls)).length === 1, "its chevron unfolds the three, one of them current", rows);
await page.click("#eh-list .eh-fold");
await page.keyboard.press("Control+KeyZ");
rows = real(await rowsOf(page));
await check(rows[0].text === "Moved mark m1" && /undone/.test(rows[0].cls) && rows[1].text === "Moved 2 marks" && /here/.test(rows[1].cls), "Ctrl+Z takes one action off the folded row, leaving two", rows);
await page.keyboard.press("Control+KeyZ"); await page.keyboard.press("Control+KeyZ");
rows = real(await rowsOf(page));
await check(rows.filter((r) => /undone/.test(r.cls) && /^Moved mark/.test(r.text)).length === 3 && !rows.some((r) => /Moved \d marks/.test(r.text)), "what was undone is never folded: each action has its own row", rows);
await page.context().close();

// a draft from yesterday: a day rule, and a fold's span of time
const old = [...head(yesterday(12, 0)), ...[0, 5, 10, 20].map((m, k) => ({ type: "move-mark", at: yesterday(12, m + 1), mark: "m1", to: [30 + k, 30] })), { type: "check", at: yesterday(12, 40), on: true }];
page = await openKept({ drafts: [draft(old)] });
await shown(page);
await loaded(page);
rows = await rowsOf(page);
const fold = rows.find((r) => /Moved 4 marks/.test(r.text));
await check(rows[0].cls.includes("day") && rows[0].text === "Yesterday" && /^\d\d:\d\d–\d\d:\d\d$/.test(fold?.when ?? ""), "a draft from yesterday shows a Yesterday rule, and a fold shows its span of time", { rows, fold });
await page.evaluate(() => $("#fx-add").click());
await until(page, () => window.fixture.model().marks.length === 3);
rows = await rowsOf(page);
await check(rows[0].text.startsWith("Added mark") && rows[1].text === "Yesterday", "a sitting today is told from yesterday's by the rule", rows.slice(0, 3));
await page.context().close();

// a long draft: only the rows in view are drawn, the current one pinned to the edge of the list
const long = [...head(yesterday(8, 0))];
for (let k = 0; k < 1500; k++) long.push(k % 2 ? { type: "check", at: yesterday(9, Math.floor(k / 60), k % 60), on: k % 4 === 1 } : { type: "move-mark", at: yesterday(9, Math.floor(k / 60), k % 60), mark: "m1", to: [20 + (k % 50), 20] });
page = await openKept({ drafts: [draft(long)] });
await shown(page);
await loaded(page);
const drawn = () => page.evaluate(() => ({ li: document.querySelectorAll("#eh-list > li").length, here: !!document.querySelector("#eh-list > li.here"), top: document.querySelector("#eh-list").scrollTop }));
let d = await drawn();
await check(d.li < 200 && d.here, "a draft of 1,500 actions draws fewer than 200 rows, the current one among them", d);
for (const to of [5000, 15000, 30000]) {
  await page.evaluate((y) => { document.querySelector("#eh-list").scrollTop = y; }, to);
  await until(page, (y) => Math.abs(document.querySelector("#eh-list").scrollTop - y) < 2, to);
  await until(page, () => document.querySelector("#eh-list > li.here") && document.querySelectorAll("#eh-list > li").length < 200);
  const inView = await page.evaluate(() => { const l = document.querySelector("#eh-list").getBoundingClientRect(), h = document.querySelector("#eh-list > li.here").getBoundingClientRect(); return h.top >= l.top - 1 && h.bottom <= l.bottom + 1; });
  const n = (await drawn()).li;
  await check(inView && n < 200, `scrolled to ${to}, the current row stays at the list's edge and fewer than 200 rows are drawn`, { inView, n });
}
await page.context().close();

// hovering a row rings its item; a click pans there when it is out of view
page = await open(true);
await tagger(page);
await shown(page);
await counted(page);
await moved(page, "m2", 4, 4);
const m2 = (await model(page)).marks.find((m) => m.id === "m2");
const ringBox = () => page.evaluate(() => document.querySelector('#overlay g[data-layer="ring"]')?.dataset.box ?? null);
const hover = async (text) => { const r = await page.evaluate((t) => { const b = [...document.querySelectorAll("#eh-list > li")].find((li) => li.textContent.includes(t)).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, text); await page.mouse.move(r[0], r[1]); };
await hover("Moved mark m2");
await until(page, () => !!document.querySelector('#overlay g[data-layer="ring"]'));
await check((await ringBox()) === [m2.x - 3, m2.y - 3, m2.x + 3, m2.y + 3].join(","), "hovering a row rings its item on the image, in the image's pixels, as the study's where says", await ringBox());
// the ring as drawn on the screen, and the mark it is for
const drawnRing = await page.evaluate((id) => {
  const mid = (r) => [r.x + r.width / 2, r.y + r.height / 2];
  const rings = [...document.querySelectorAll('#overlay g[data-layer="ring"] ellipse')].map((e) => ({ r: e.getBoundingClientRect(), stroke: getComputedStyle(e).stroke, width: parseFloat(getComputedStyle(e).strokeWidth), scaled: e.getAttribute("vector-effect") !== "non-scaling-stroke" }));
  const m = document.querySelector(`#fx-marks circle[data-mark="${id}"]`).getBoundingClientRect(), line = rings.at(-1);
  return line ? { at: mid(line.r), mark: mid(m), wide: line.r.width, markWide: m.width, stroke: line.stroke, width: line.width, scaled: line.scaled } : null;
}, "m2");
await check(drawnRing && Math.abs(drawnRing.at[0] - drawnRing.mark[0]) < 1 && Math.abs(drawnRing.at[1] - drawnRing.mark[1]) < 1 && drawnRing.wide > drawnRing.markWide
  && drawnRing.stroke === "rgb(255, 212, 0)" && drawnRing.width >= 2 && !drawnRing.scaled, "the ring is drawn round the mark, wider than it, in a yellow line no zoom thins below two screen pixels", drawnRing);
await page.mouse.move(700, 300);
await until(page, () => !document.querySelector('#overlay g[data-layer="ring"]'));
await check(true, "the ring goes when the pointer leaves the list");
await page.setViewportSize({ width: 900, height: 700 });
await settle(page);
for (let k = 0; k < 12; k++) await page.click("#zoom-in");
await page.evaluate(() => { document.querySelector("#scroller").scrollLeft = 0; });
const scrolled = await page.evaluate(() => document.querySelector("#scroller").scrollLeft);
await page.evaluate(() => { document.querySelector("#scroller").scrollTop = 0; });
const mid = await page.evaluate((x) => { const s = document.querySelector("#scroller"), b = document.querySelector("#base").getBoundingClientRect(), r = s.getBoundingClientRect(); return b.left + x * st.zoom > r.right || b.left + x * st.zoom < r.left; }, m2.x);
await check(scrolled === 0 && mid, "zoomed in, the second mark is out of view");
await hover("Moved mark m2");
const offTitle = await page.evaluate(() => [...document.querySelectorAll("#eh-list > li")].find((li) => li.textContent.includes("Moved mark m2")).title);
await check(offTitle === "Off screen — click to go there" && (await ringBox()) === null, "hovering the row of an item out of view rings nothing, and its title says to click to go there", { offTitle, ring: await ringBox() });
await click(page, "Moved mark m2");
await until(page, () => { const s = document.querySelector("#scroller"), b = document.querySelector("#base").getBoundingClientRect(), r = s.getBoundingClientRect(); const x = b.left + 60 * st.zoom; return x >= r.left && x <= r.right; });
await check(true, "a click on its row pans to it");
await page.context().close();

// the switch, a button in the toolbar beside the minimap's: pressed while the window shows; pressing it hides the window; the choice
// lasts the visit, in the tab's own storage; ✕ hides it and lets the button up
page = await open(true);
await tagger(page);
await counted(page);
const pressed = () => page.getAttribute("#history-btn", "aria-pressed");
await check(await page.isHidden("#edit-history") && await pressed() === "false", "a page opened afresh has the window closed and the button up");
await page.click("#history-btn");
const place = await page.evaluate(() => ({ toolbar: !!$("#history-btn").closest("#view > .toolbar"), tool: $("#history-btn").classList.contains("tool"), icon: !!$("#history-btn svg") && !$("#history-btn").textContent.replace(/[123\s]/g, ""),
  afterMinimap: !!($("#minimap-btn").compareDocumentPosition($("#history-btn")) & Node.DOCUMENT_POSITION_FOLLOWING), box: !!document.querySelector("#left input[type=checkbox]#gt-history-on") }));
await check(place.toolbar && place.tool && place.icon && place.afterMinimap && !place.box && await page.isVisible("#edit-history") && await pressed() === "true",
  "Edit History's switch is an icon button among the toolbar's tools, after the minimap's, pressed while the window shows; the left bar has no checkbox for it", place);
const kept = await page.evaluate(() => [sessionStorage.getItem("nor-gt-history"), localStorage.getItem("nor-gt-history")]);
await check(kept[0] === "on" && kept[1] === null, "the choice is kept for the visit, in the tab's storage, and not on the device", kept);
await page.reload();
await tagger(page);
await counted(page);
await check(await page.isVisible("#edit-history") && await pressed() === "true", "the page loaded again in the same tab shows it still"); // second-visit-in-test: the visit's choice across a reload is the case
await page.click("#history-btn");
await check(await page.isHidden("#edit-history") && await pressed() === "false", "pressed again it hides the window and lets the button up");
await page.click("#history-btn");
await page.click("#eh-close");
await check(await page.isHidden("#edit-history") && await pressed() === "false", "its ✕ hides it and lets the button up");
await page.context().close();

// Clear all history: asks, naming the image, forgets the draft and goes back to the run
page = await open(true);
await tagger(page);
await shown(page);
await counted(page);
const runOf = await marks(page);
await moved(page, "m1", 12, 12);
await page.click("#gt-save-draft");
await until(page, () => $("#gt-unsaved").hidden);
await check((await records(page)).length === 1, "a draft is kept");
const asked = await ask(page, true, () => page.click("#eh-clear"));
await until(page, () => document.querySelectorAll("#eh-list > li").length === 2);
rows = await rowsOf(page);
await check(asked.includes(png.name) && /algorithm/.test(asked) && (await records(page)).length === 0 && rows.length === 2 && /^Algorithm ran/.test(rows[0].text) && rows[1].text === "Image opened"
  && (await marks(page)) === runOf, "Clear all history asks, naming the image, forgets the draft and goes back to the run: its row and the opening alone", { asked, rows });
await page.context().close();

// a later run that leaves an action's item behind greys the action
const carried = [...head(yesterday(12, 0)), { type: "move-mark", at: yesterday(12, 1), mark: "m2", to: [61, 38] },
  { type: "run", at: yesterday(12, 2), algorithm: { key: "fixture", params: { threshold: 200 } }, output: { threshold: 200, count: 150, spots: [[27, 27]] } }];
page = await openKept({ drafts: [draft(carried)] });
await shown(page);
await loaded(page);
rows = real(await rowsOf(page));
await check(rows.some((r) => /skipped/.test(r.cls) && /Moved mark m2 \(didn't carry over\)/.test(r.text)) && (await model(page)).marks.length === 1, "an action a later run could not carry over is greyed", rows);
await page.context().close();

// a draft whose history does not replay to its model: the stored model wins, the earlier rows are greyed
const log = [...head(yesterday(12, 0)), { type: "move-mark", at: yesterday(12, 1), mark: "m1", to: [30, 30] }];
page = await openKept({ drafts: [draft(log, { labels: [{ threshold: 99, count: 7 }], marks: [{ id: "m1", x: 1, y: 2 }], checked: true })] });
await shown(page);
await loaded(page);
await until(page, () => /did not replay/.test($("#status").textContent));
rows = await rowsOf(page);
const text = rows.map((r) => r.text);
await check(JSON.stringify((await model(page)).marks) === JSON.stringify([{ id: "m1", x: 1, y: 2 }]) && /^Ground truth/.test(text[0]) && text.includes("Earlier history, not replayable in this version")
  && rows.filter((r) => /dead/.test(r.cls)).length >= 2, "a draft whose log does not replay says so, the stored model wins, its earlier rows are greyed and set aside", { rows });
const opening = await page.evaluate(() => { const li = [...document.querySelectorAll("#eh-list > li")].find((l) => l.querySelector(".what")?.textContent === "Image opened"); return { cls: li.className, title: li.title }; });
await check(!/dead/.test(opening.cls) && opening.title === "", "the image's opening is not among the rows set aside: it was never history to replay", opening);
await ask(page, true, () => page.click("#eh-clear"));
await until(page, () => /History cleared/.test($("#status").textContent));
await check(/back to the stored ground truth/.test(await page.textContent("#status")) && JSON.stringify((await model(page)).marks) === JSON.stringify([{ id: "m1", x: 1, y: 2 }]),
  "Clear all history on it goes back to the stored ground truth, and says so", await page.textContent("#status"));
await page.context().close();
await done(0);
