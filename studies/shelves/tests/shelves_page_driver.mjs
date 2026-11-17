// Drives the Bookshelf Reader's page in headless Chromium against stand-ins: a worker that answers Find books with three
// books and straightens each into a crop as big as its box, and a Tesseract that reads each crop as "Title <w>x<h>",
// surest when the crop is wider than tall. Checks req/shelves/books/find (the books drawn), req/shelves/read/readers
// (each read at the turn that reads across, the reader kept), req/shelves/matcher/export (the matcher's file),
// req/shelves/truth/task (one book at a time in the order the books stand, Back and Next, a book picked on the photo
// whatever its verdict, its title ready to retype, a book marked not a book or deleted gone from the photo, a corner dragged past the photo, a book flipped, books added and
// deleted from the right-click menu, a missed book drawn, what is approved cut out of the photo, Submit's export, the
// draft kept and loaded after a reload, every change one GT action in the shell's log), req/shelves/truth/keys (the verdicts from the
// keyboard), req/shell/image/toolbar (no ruler or grid on a photo) and
// req/shell/waiting/visible (the light sweeping the photo while the study works). The real
// engines' readings are test_reading.py's. Exits 1 on a failed check, 2 when it cannot run.
//   node studies/shelves/tests/shelves_page_driver.mjs STUDIES
import { noisePng } from "../../../web-tests/png_fixture.mjs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { repoFile } from "../../../web-tests/repo_file.mjs";
import { offSite } from "../../../web-tests/off_site.mjs";
import { ENGINE, LAUNCH } from "../../../web-tests/engine.mjs";
import { asTagger } from "../../../web-tests/tagger.mjs";
import { legendRows, keepStudyKeyListeners, studyTakes } from "../../../web-tests/keys_legend.mjs";
import { prepare, seed } from "./reader_stand_in.mjs";
import { frames as framesOf } from "../../../web-tests/page_frames.mjs";
import { until } from "../../../web-tests/page_until.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const repo = path.resolve(import.meta.dirname, "..", "..", ".."), [studies] = process.argv.slice(2);
const W = 400, H = 300;
// two standing spines and a cover, clockwise from the top left; the finder lists the second spine first
const BOOKS = [
  { corners: [[60, 40], [95, 40], [95, 280], [60, 280]], view: "spine" },
  { corners: [[10, 20], [50, 20], [50, 280], [10, 280]], view: "spine" },
  { corners: [[120, 100], [300, 100], [300, 280], [120, 280]], view: "cover" },
];
const WORKER = `
const W = ${W}, H = ${H}, BOOKS = ${JSON.stringify(BOOKS)};
postMessage({ type: "ready", info: {} });
const size = (c) => [Math.round(Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1])), Math.round(Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1]))];
onmessage = ({ data: m }) => {
  if (m.type === "study") postMessage({ type: "ready", info: {} });
  else if (m.type === "open") postMessage({ type: "held" });
  else if (m.type === "call" && m.action === "view") {
    // the photo as the text finder reads it: 64×32, RGB
    const bytes = new Uint8Array(64 * 32 * 3).fill(120);
    postMessage({ type: "result", action: "view", meta: { width: 64, height: 32 }, bytes }, [bytes.buffer]);
  }
  // a text map of any other size than the view's is no map of it: no books then
  // the edge-only finder takes no text map and finds the first two books; a text map handed it, none
  else if (m.type === "call" && m.action === "find") postMessage({ type: "result", action: "find", bytes: null,
    meta: { books: m.args.algorithm === "r5" ? (m.args.text ? [] : BOOKS.slice(0, 2))
      : !m.args.text || (m.args.text.width === 64 && m.args.text.height === 32 && atob(m.args.text.data).length === 64 * 32) ? BOOKS : [] } });
  else if (m.type === "call" && m.action === "straighten") {
    const sizes = m.args.corners.map(size), bytes = new Uint8Array(sizes.reduce((a, [w, h]) => a + w * h * 4, 0)).fill(200);
    postMessage({ type: "result", action: "straighten", meta: { sizes }, bytes }, [bytes.buffer]);
  }
};`;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  const send = (type, body) => { r.writeHead(200, { "content-type": type }); r.end(body); };
  if (u === "/web/worker.js") return send("text/javascript", WORKER);
  if (u === "/web/vendor/wheels.json") return send("application/json", "[]");
  // the study shown to the stand-in tagger's account, as it is to its owner's (req/shell/study/visibility)
  if (u === "/studies/shelves/study.json") return send("application/json", JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(repo, u), "utf8")), visibility: { accounts: ["tagger@acme.example"] } }));
  const f = u === "/web/studies.json" ? studies : repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await pw[ENGINE].launch(LAUNCH);
let failed = false;
const check = (ok, what, seen) => { if (!ok) { failed = true; console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); } else console.log("ok: " + what); };

const PNG = noisePng(W, H);
async function load(page, name = "shelf.png") {
  await page.setInputFiles("#file", { name, mimeType: "image/png", buffer: PNG });
  await page.waitForFunction(() => !$("#bs-find").disabled);
  await page.evaluate(() => { $("#notice").hidden = true; });
}
async function open(role, seed = {}, finder = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  await keepStudyKeyListeners(ctx);
  await asTagger(ctx);
  await ctx.route(offSite(origin), (r) => r.abort());
  await prepare(ctx, finder);
  await ctx.addInitScript(([role, seed]) => {
    delete Navigator.prototype.serviceWorker; localStorage.setItem("nor-role", role);
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, [role, seed]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { failed = true; console.error("page error: " + e.message); });
  page.setDefaultTimeout(10000);
  // the questions the shell asks before it replaces a draft or leaves actions unsaved are answered yes
  page.on("dialog", (d) => d.accept());
  await page.goto(origin + "/web/shelves");
  await page.waitForFunction(() => window.$ && /^Ready/.test($("#status").textContent));
  await load(page);
  const found = await page.evaluate(() => $("#bs-found").textContent);
  check(found === "", "before Find books, the box says nothing of books not found yet", found);
  return page;
}
const saved = async (page, click) => { const [d] = await Promise.all([page.waitForEvent("download"), page.click(click)]); return { name: d.suggestedFilename(), doc: JSON.parse(fs.readFileSync(await d.path(), "utf8")) }; };
const books = (page) => page.$$eval('#overlay g[data-layer="bs"] g.bs-book', (gs) => gs.map((g) => g.getAttribute("class")));
const KEPT = seed;

try {
  // a viewer: the books found and read, and the file for the matcher
  let page = await open("viewer", KEPT);
  check(await page.evaluate(() => $("#bs-reader").value) === "tesseract" && await page.$$eval("#bs-reader option", (o) => o.length) === 3,
    "the three readers are offered, the one last chosen kept");
  await page.evaluate(() => { window.looks = []; new MutationObserver(() => { if (!$("#busy").hidden) looks.push($("#busy").className); }).observe($("#busy"), { attributes: true }); });
  await page.click("#bs-find");
  await page.waitForFunction(() => $("#status").textContent.startsWith("Titles read"));
  const looks = await page.evaluate(() => looks);
  check(looks.length && looks.every((c) => c.includes("scan")),
    "while the study works, the shell sweeps its light over the photo, without the study asking (req/shell/waiting/visible)", looks);
  const lines = await page.$eval('#overlay g.bs-book .over', (p) => { const s = getComputedStyle(p); return { effect: s.vectorEffect, width: parseFloat(s.strokeWidth) }; });
  check(lines.effect === "non-scaling-stroke" && lines.width >= 2, "a book's outline keeps its screen width at any zoom, thick enough to see", lines);
  const drawn = await books(page);
  check(drawn.length === 3 && drawn.filter((c) => c.includes("cover")).length === 1, "Find books draws each book on the photo, the cover marked as one", drawn);
  const found = () => page.evaluate(() => [...document.querySelectorAll("[data-help]")].map((e) => e.dataset.help).find((h) => /books found/.test(h)) || "");
  check(await page.evaluate(() => window.textRuns) === 1 && !/without the text finder/.test(await found()),
    "Find books runs the text finder over Python's view of the photo and hands the finder its map", [await page.evaluate(() => window.textRuns), await found()]);
  const titles = await page.$$eval("#bs-list li", (l) => l.map((x) => x.textContent));
  // a tall spine reads across once turned a quarter, so its crop is read as its height by its width
  check(titles.join() === "Title 240x35,Title 260x40,Title 180x180", "each book is read at the turn that reads across, listed in the order found", titles);
  check(await page.evaluate(() => $("#tasks-box").hidden && !$("#summary-box").hidden), "a viewer has no ground-truth box: Summary lists the titles");
  check(await page.evaluate(() => !document.querySelector("#bs-continue") && !$("#gt-continue").checkVisibility()), "a viewer is offered no ground truth to continue");
  check(await page.evaluate(() => ["#ruler-btn", "#grid-btn"].every((s) => getComputedStyle($(s)).display === "none") && getComputedStyle($("#zoom-in")).display !== "none"),
    "a photo has no ruler or grid in the toolbar, its zoom kept (req/shell/image/toolbar)");
  check(await page.evaluate(() => $("#channels").children.length === 0), "a photo shows no channel rows (req/shell/channels/rows)");
  const m = await saved(page, "#bs-export");
  const [m1, m2, m3] = m.doc.books;
  check(m.name === "shelf_books.json" && m.doc.books.length === 3 && m1.id === 1 && m1.text === "Title 240x35" && m1.confidence === 0.9 && m1.reader === "tesseract"
    && m3.view === "cover" && m2.corners.length === 4 && m.doc.W === W,
  "Download for the matcher saves each book's id, view, text, confidence, reader and corners", m);

  // req/shelves/summary: how many books, and each one's text, saved through the shell's Download Summary
  const csv = async () => { const [d] = await Promise.all([page.waitForEvent("download"), page.click("#summary-dl")]);
    // a cell is quoted when it holds a comma, a quote doubled inside it
    const cells = (r) => [...r.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)].map(([, c]) => (c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c));
    return fs.readFileSync(await d.path(), "utf8").trim().split("\n").slice(1).map(cells); };
  const count = () => page.textContent("#bs-count");
  let summaryRows = await csv();
  check((await count()) === "3 books: 2 spines, 1 covers." && summaryRows[0][3] === "Books" && summaryRows[0][5] === "3" && summaryRows.length === 6
    && summaryRows[3][3] === "Book 1 (spine)" && summaryRows[3][5] === "Title 240x35", "Summary counts the books and the CSV lists each one's text", [await count(), summaryRows]);
  // req/shell/summary/mask: a lasso over part of the first book alone keeps that book and no other
  const first = await page.evaluate(() => {
    const q = document.querySelector('#overlay g[data-layer="bs"] g.bs-book polygon.over').getAttribute("points").split(" ").map((v) => v.split(",").map(Number));
    const r = $("#base").getBoundingClientRect(), xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // the box's left half, a little wider than the box at its top and bottom: partly inside, partly out
    const at = (x, y) => [r.left + x * st.zoom, r.top + y * st.zoom];
    return [at(x0 - 4, y0 + 4), at((x0 + x1) / 2, y0 + 4), at((x0 + x1) / 2, y1 - 4), at(x0 - 4, y1 - 4)];
  });
  await page.click("#mask-add");
  await page.mouse.move(...first[0]); await page.mouse.down();
  for (const p of [...first.slice(1), first[0]]) await page.mouse.move(...p, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => /inside the mask/.test($("#bs-count").textContent));
  summaryRows = await csv();
  const inside = await saved(page, "#bs-export");
  check((await count()) === "1 book inside the mask: 1 spines, 0 covers." && await page.$$eval("#bs-list li", (l) => l.map((x) => x.value).join()) === "1"
    && summaryRows[0][5] === "1" && /books partly inside counted/.test(summaryRows[0][2]) && inside.doc.books.map((b) => b.id).join() === "1",
  "with a mask over part of the first book, the summary, its CSV and the matcher's file hold that book alone", [await count(), summaryRows, inside.doc.books.map((b) => b.id)]);
  await page.click("#mask-clear");
  check((await count()) === "3 books: 2 spines, 1 covers.", "Clear mask counts every book again", await count());

  // req/shelves/books/versions: the finders offered, the text-guided one first, the edge-only one finding without the
  // text finder
  const listed = await page.$$eval("#algorithm option", (o) => o.map((x) => [x.value, x.textContent]));
  check(listed.map(([k]) => k).join() === "r9,r8,r5" && listed.every(([, t]) => /\(P\u00a0\.\d+\u00a0·\u00a0R\u00a0\.\d+\)$/.test(t)),
    "three finders are offered, the text-guided one first, each with its precision and recall", listed);
  await page.click("#processing-box .sec-head h2");
  await page.selectOption("#algorithm", "r5");
  await page.click("#bs-find");
  await page.waitForFunction(() => $("#status").textContent.startsWith("Titles read") && $("#bs-list").children.length === 2);
  check((await books(page)).length === 2 && await page.evaluate(() => window.textRuns) === 1 && /^edge-only: 2 books found\n/.test(await found()),
    "the edge-only finder runs without the text finder, and its step names it", [await page.evaluate(() => window.textRuns), await found()]);
  await page.context().close();

  // the text finder out of reach: the books are found without it, and Find says so
  page = await open("viewer", KEPT, { textFinder: false });
  await page.click("#bs-find");
  await page.waitForFunction(() => $("#status").textContent.startsWith("Titles read"));
  const without = await page.evaluate(() => [...document.querySelectorAll("[data-help]")].map((e) => e.dataset.help).find((h) => /books found/.test(h)) || "");
  check((await books(page)).length === 3 && /without the text finder/.test(without), "with the text finder out of reach, Find books finds without it and says so", without);
  await page.context().close();

  // the box's one tagging button: Start GT tagging, Stop tagging while tagging; Continue GT tagging is gone, a draft
  // being brought back by Load draft (req/shell/ground-truth/draft-offer)
  const offered = (page) => page.evaluate(() => ["#gt-start", "#gt-continue"].filter((s) => !$(s).hidden).map((s) => $(s).textContent.trim()).join());
  const rowsOf = (page) => page.$$eval("#gt-tasks > li:not([data-task=edits]) .t", (h) => h.map((x) => x.textContent.trim()));
  // the GT actions made, newest first, as Edit History words them, and how many of them are not yet saved
  const history = (page) => page.$$eval("#eh-list .what", (h) => h.map((x) => x.textContent.trim()));
  const unsaved = (page) => page.evaluate(() => +(/\d+/.exec($("#gt-unsaved").textContent)?.[0] ?? 0));
  const valueOf = (page) => page.evaluate(() => $(".bs-item input")?.value);

  // a tagger taking books off the photo: Not a book and Delete this book leave nothing behind on it
  page = await open("tagger", KEPT);
  check(await offered(page) === "Start GT tagging", "with no draft kept, the box offers Start GT tagging alone", await offered(page));
  await page.click("#bs-find");
  await page.waitForFunction(() => $("#status").textContent.startsWith("Titles read"));
  check(await offered(page) === "Start GT tagging", "the books found, Start GT tagging is still the one offered", await offered(page));
  await page.click("#gt-start");
  check(await offered(page) === "Stop tagging", "while tagging, Stop tagging alone: no Continue beside it", await offered(page));
  check(await unsaved(page) === 0 && (await history(page)).join() === "Algorithm ran: 3 books,Image opened", "Find books and its first reading are one run in the log, no action yet", await history(page));
  await page.click('.bs-verdicts [data-do="wrong"]');
  check((await books(page)).length === 2 && (await rowsOf(page))[0] === "0/2 Books" && await valueOf(page) === "Title 240x35",
    "Not a book takes the box off the photo and out of the walk, and moves on", [await books(page), await rowsOf(page)]);
  await page.click('.bs-tools [data-do="back"]');
  check(await valueOf(page) === "Title 180x180", "Back no longer finds the book marked not a book", await valueOf(page));
  const toScreenOf = (page, x, y) => page.evaluate(([x, y]) => { const r = $("#base").getBoundingClientRect(); return [r.left + x * st.zoom, r.top + y * st.zoom]; }, [x, y]);
  await page.mouse.click(...(await toScreenOf(page, 77, 200)), { button: "right" });
  await page.click('#bs-menu [data-do="delete"]');
  check((await books(page)).length === 1 && (await rowsOf(page))[0] === "0/1 Books" && !(await page.$$eval("#overlay g.bs-book.wrong", (g) => g.length)),
    "Delete this book takes a found book off the photo too, nothing left faint", [await books(page), await rowsOf(page)]);
  check((await history(page)).slice(0, 2).join() === "Deleted 2 books,Algorithm ran: 3 books" && await unsaved(page) === 2,
    "Not a book and Delete this book are one GT action each, Edit History folding the two deletions", [await history(page), await unsaved(page)]);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Control+z");
  check((await books(page)).length === 2 && (await rowsOf(page))[0] === "0/2 Books", "Ctrl+Z brings back the book deleted last", [await books(page), await rowsOf(page)]);
  await page.click("#gt-undo");
  check((await books(page)).length === 3 && (await rowsOf(page))[0] === "0/3 Books" && await unsaved(page) === 0, "and Undo the one marked not a book", [await books(page), await rowsOf(page)]);
  await page.click("#gt-start");
  check(await offered(page) === "Start GT tagging", "tagging stopped, Start GT tagging alone is offered: there is no Continue", await offered(page));
  await page.context().close();

  // req/shelves/truth/keys: the verdicts from the keyboard, the title's text box keeping its letters
  page = await open("tagger", KEPT);
  await page.click("#bs-find");
  await page.waitForFunction(() => $("#status").textContent.startsWith("Titles read"));
  // a key pressed where the page has the focus, and whether the page took it
  const press = (spec) => page.evaluate((spec) => {
    const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...spec });
    (document.activeElement || document.body).dispatchEvent(e);
    return e.defaultPrevented;
  }, spec);
  const ENTER = { key: "Enter", code: "Enter" };
  check(!(await press(ENTER)), "out of tagging, Enter is left to the page");
  // req/shell/image/keys: the legend lists the view's states alone, of which the study has none
  check(await legendRows(page) === "", "out of tagging the keys legend is empty", await legendRows(page));
  await page.click("#gt-start");
  await page.waitForFunction(() => document.activeElement === $(".bs-item input"));
  check(await legendRows(page) === "", "a book open, the legend stays empty, each key on its button", await legendRows(page));
  const KEYS = [{ code: "Enter" }, { code: "ArrowLeft", altKey: true }, { code: "ArrowRight", altKey: true }, { code: "ArrowUp", ctrlKey: true }, { code: "Backspace", ctrlKey: true }];
  const heard = await studyTakes(page, KEYS);
  check(heard.listeners >= 1 && heard.took.length === 0, "the study takes no shortcut key itself: the shell is the only one wiring them", heard);
  const hints = await page.evaluate(() => Object.fromEntries(["right", "wrong", "flip", "back", "next"].map((k) => [k, $(`.bs-item [data-do="${k}"] kbd`)?.textContent])));
  check(hints.right === "Enter" && hints.wrong === "Ctrl+Backspace" && hints.flip === "Ctrl+↑" && hints.back === "Alt+←" && hints.next === "Alt+→",
    "each button shows its key", hints);
  const confirm = () => page.evaluate(() => { const p = $(".bs-item .bs-confirm"); return p && !p.hidden ? p.textContent : ""; });
  check(await press({ ...ENTER, isComposing: true }) === false && (await rowsOf(page))[0] === "0/3 Books" && await confirm() === "",
    "an Enter ending a word being composed approves nothing", await rowsOf(page));
  await page.keyboard.press("Enter");
  check((await rowsOf(page))[0] === "0/3 Books" && await valueOf(page) === "Title 260x40" && /^Left as read: Enter again if it is exactly right/.test(await confirm()),
    "Enter on a title left as the reader read it approves nothing yet, and says so", [await rowsOf(page), await confirm()]);
  await page.keyboard.press("Enter");
  check((await rowsOf(page))[0] === "1/3 Books" && await valueOf(page) === "Title 240x35" && await confirm() === "",
    "a second Enter approves it as read and moves on, as Right does", [await rowsOf(page), await valueOf(page)]);
  await page.waitForFunction(() => document.activeElement === $(".bs-item input"));
  check(await unsaved(page) === 1, "the verdict is one GT action", await history(page));
  await page.keyboard.type("Dune");
  check(await unsaved(page) === 1, "a title typed is no GT action a key: nothing is recorded while the field is typed in", await history(page));
  await page.keyboard.press("Enter");
  check((await rowsOf(page))[0] === "2/3 Books" && await valueOf(page) === "Title 180x180", "Enter on a title typed approves it at once", await rowsOf(page));
  check((await history(page)).slice(0, 3).join() === "Approved a book,Set a title: Dune,Approved a book",
    "Enter committed the title as one GT action, then the verdict", await history(page));
  await page.keyboard.press("Alt+ArrowLeft");
  check(await valueOf(page) === "Dune", "Alt+← is Back", await valueOf(page));
  await page.fill(".bs-item input", "Dune II");
  check(await unsaved(page) === 3, "a title filled in is still no GT action", await history(page));
  await page.keyboard.press("Alt+ArrowRight");
  check(await unsaved(page) === 4 && (await history(page))[0] === "Set a title: Dune II", "going to another book commits the title: one GT action", await history(page));
  await page.keyboard.press("Alt+ArrowLeft");
  await page.keyboard.down("Alt"); await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowRight"); await page.keyboard.up("ArrowRight"); await page.keyboard.up("Alt");
  check(await valueOf(page) === "Title 180x180", "Alt+→ is Next, and held down it moves one book", await valueOf(page));
  const reads0 = await page.evaluate(() => tess.reads);
  await page.keyboard.press("Control+ArrowUp");
  await page.waitForFunction((n) => tess.reads > n && $("#status").textContent === "Book read again.", reads0);
  check(await page.evaluate((n) => tess.reads - n, reads0) === 1, "Ctrl+↑ is Flip");
  await page.evaluate(() => { $('.bs-item [data-do="wrong"]').disabled = true; });
  check(!(await press({ key: "Backspace", code: "Backspace", ctrlKey: true })) && (await books(page)).length === 3, "a key does nothing while its button is off");
  await page.evaluate(() => { $('.bs-item [data-do="wrong"]').disabled = false; });
  await page.keyboard.press("Control+Backspace");
  check((await books(page)).length === 2 && (await rowsOf(page))[0] === "2/2 Books", "Ctrl+Backspace is Not a book", [await books(page), await rowsOf(page)]);
  check(!(await press({ key: "a", code: "KeyA", ctrlKey: true })), "a key the task does not use is left to the page");
  await page.context().close();

  // a tagger: one book at a time, in the order the books stand, the missed ones added, then Submit
  page = await open("tagger", KEPT);
  await page.click("#bs-find");
  await page.waitForFunction(() => $("#status").textContent.startsWith("Titles read"));
  const rows = () => rowsOf(page);
  check((await rows()).join() === "0/3 Books" && await page.evaluate(() => $("#summary-box").hidden && !$("#tasks-box").hidden),
    "Ground Truth Tasks has one task, Books, found and missed alike, and Summary is not shown", await rows());
  check(await page.evaluate(() => !/finder found/.test($("#tasks-box").textContent)), "the tasks box carries no instructions of its own");
  check(await page.evaluate(() => !document.querySelector(".bs-item") && !document.querySelector("#gt-tasks > li.now")), "no book is open until Start GT tagging (req/shell/ground-truth/tagging)");
  await page.click("#gt-start");
  const value = () => page.evaluate(() => $(".bs-item input")?.value);
  const isSelected = () => { const t = $(".bs-item input"); return document.activeElement === t && t.selectionStart === 0 && t.selectionEnd === t.value.length && t.value.length > 0; };
  const selected = () => page.evaluate(isSelected);
  // a few frames' grace for the box to take focus, bounded so a miss fails at once rather than hanging
  const settledSelected = () => page.waitForFunction(isSelected, null, { timeout: 2000 }).then(() => true, () => false);
  const titleState = () => page.evaluate(() => [document.activeElement?.tagName, $(".bs-item input")?.selectionStart, $(".bs-item input")?.selectionEnd]);
  check(await value() === "Title 260x40" && await page.$$eval(".bs-item canvas", (c) => c[0].width) === 260,
    "the walk starts at the leftmost book, not the finder's first, upright with what the reader read", await value());
  await page.waitForFunction(() => document.activeElement === $(".bs-item input"));
  check(await selected(), "the open book's title is focused with all its text selected, ready to retype");
  check(await page.evaluate(() => !document.querySelector(".bs-item [data-view], .bs-item [data-lang], .bs-item [data-do='turn']")),
    "the task asks no spine or cover, no language and no quarter turn: Flip alone");
  // the stand-in worker's crops are flat grey: a picture with the photo's noise in it is drawn by the page itself
  check(await page.$eval(".bs-item canvas", (c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; return new Set(Array.from(d.filter((_, i) => i % 4 === 0))).size > 10; }),
    "the book's picture is drawn by the page from the photo it shows, not by Python");
  // flipped upside down: drawn so, and read again at that turn alone, in both languages
  const reads = await page.evaluate(() => tess.reads);
  await page.click('.bs-item [data-do="flip"]');
  await page.waitForFunction((n) => tess.reads > n && $("#status").textContent === "Book read again.", reads);
  check(await page.evaluate((n) => tess.reads - n, reads) === 1 && await page.evaluate(() => tess.langs.every((l) => l === "heb+eng")),
    "Flip turns the book upside down and reads it again at that turn alone, in Hebrew and English", await page.evaluate(() => tess.langs));
  await page.fill(".bs-item input", "הארי פוטר");
  const cut = () => page.$$eval("#overlay .done-mask polygon", (p) => p.length);
  const cutShown = () => page.evaluate(() => { const g = document.querySelector("#overlay .done-mask"); return !!g && getComputedStyle(g).display !== "none"; });
  await page.click('.bs-verdicts [data-do="right"]');
  check((await rows())[0] === "1/3 Books" && await value() === "Title 240x35", "a verdict moves on to the next book along the shelf", [await rows(), await value()]);
  check(await cut() === 1 && await cutShown(), "the approved book is cut out of the photo while tagging", await cut());
  await page.click('.bs-tools [data-do="back"]');
  check((await rows())[0] === "1/3 Books" && await value() === "הארי פוטר" && await page.$eval('.bs-verdicts [data-do="right"]', (b) => b.getAttribute("aria-pressed")) === "true",
    "Back goes to the book left of this one, its verdict kept and shown", await rows());
  await page.click('.bs-verdicts [data-do="right"]');
  check((await rows())[0] === "1/3 Books" && await value() === "Title 240x35", "a verdict given again there moves on to the next book still open", await value());
  await page.click('.bs-verdicts [data-do="right"]');
  check((await rows())[0] === "2/3 Books" && await value() === "Title 180x180" && await cut() === 2, "the next verdict moves on along the shelf");
  await page.click('.bs-tools [data-do="next"]');
  check(await value() === "הארי פוטר", "Next goes to the next book along the shelves, round to the first", await value());
  check(!(await selected()), "an approved book's title is not selected for retyping");
  // the cover picked on the photo, and a book already approved picked there too
  const toScreen = (x, y) => page.evaluate(([x, y]) => { const r = $("#base").getBoundingClientRect(); return [r.left + x * st.zoom, r.top + y * st.zoom]; }, [x, y]);
  const viewOf = () => page.evaluate(() => [st.zoom, $("#scroller").scrollLeft, $("#scroller").scrollTop]);
  // the page's next n frames drawn, by when a smooth scroll begun has moved the view
  const frames = (n) => framesOf(page, n);
  // the view still for a frame, a smooth scroll that framed the last book over
  const settled = async () => {
    for (let at = null, n = 0; n < 300; n++) {
      const now = await viewOf();
      if (at && now[1] === at[1] && now[2] === at[2]) return;
      at = now; await framesOf(page);
    }
  };
  // zoomed in, the cover's left edge alone in view, at the view's right
  await settled();
  for (let i = 0; i < 4; i++) await page.click("#zoom-in");
  await page.evaluate(() => { const sc = $("#scroller"); sc.scrollLeft = 130 * st.zoom - sc.clientWidth + 40; sc.scrollTop = 190 * st.zoom - sc.clientHeight / 2; });
  await settled(); await frames(1);
  const viewBefore = await viewOf();
  await page.evaluate(() => { window.scrolls = 0; $("#scroller").addEventListener("scroll", () => window.scrolls++); });
  await page.mouse.click(...(await toScreen(125, 190)));
  check(await value() === "Title 180x180", "clicking a book on the photo opens it in the task", await value());
  await frames(3);
  check(await page.evaluate(() => window.scrolls) === 0, "a book clicked on the photo, partly in view, starts no scroll", await page.evaluate(() => window.scrolls));
  check(JSON.stringify(await viewOf()) === JSON.stringify(viewBefore), "a book clicked on the photo, partly in view, leaves the view where it was", [viewBefore, await viewOf()]);
  await page.waitForFunction(() => document.activeElement === $(".bs-item input"));
  check(await selected(), "a book picked on the photo, not yet approved, has its title selected to retype");
  for (let i = 0; i < 4; i++) await page.click("#zoom-out");
  await page.mouse.click(...(await toScreen(77, 200)));
  check(await value() === "Title 240x35", "a book already approved opens from the photo too", await value());
  await page.mouse.click(...(await toScreen(210, 190)));
  // the cover's top-right corner dragged 120 px to the right, past the photo's edge, the photo zoomed in so it could
  // pan: the picture follows while dragging, the book is straightened and read again with the photo never covered,
  // and the photo stays where it was (req/shell/image/minimap)
  for (let i = 0; i < 3; i++) await page.click("#zoom-in");
  await page.evaluate(() => { const sc = $("#scroller"); sc.scrollLeft = 300 * st.zoom - sc.clientWidth / 2; sc.scrollTop = 100 * st.zoom - sc.clientHeight / 2; });
  const scrolled = () => page.evaluate(() => [$("#scroller").scrollLeft, $("#scroller").scrollTop]);
  const before = await scrolled();
  const knob = await page.$$eval("#overlay .bs-corner", (cs) => { const r = cs[1].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  const zoom = await page.evaluate(() => st.zoom);
  // Escape in the middle of a corner's drag puts the corner back, the book read as it was (req/shell/drag/escape)
  {
    const corners = () => page.evaluate(() => JSON.stringify([...document.querySelectorAll("#overlay .bs-corner")].map((c) => [c.getAttribute("cx"), c.getAttribute("cy")])));
    const kept = await corners(), read = await page.$eval(".bs-item input", (i) => i.value), logged = await history(page);
    await page.mouse.move(...knob); await page.mouse.down(); await page.mouse.move(knob[0] + 60 * zoom, knob[1], { steps: 6 });
    const mid = await corners();
    await page.keyboard.press("Escape"); await page.mouse.move(knob[0] + 80 * zoom, knob[1], { steps: 2 }); await page.mouse.up();
    check(mid !== kept && await corners() === kept && await page.$eval(".bs-item input", (i) => i.value) === read && (await history(page)).join() === logged.join(),
      "Escape mid-drag puts a corner back where it was, the book unchanged and no GT action made", { kept, mid, after: await corners() });
  }
  await page.evaluate(() => { window.covered = !$("#busy").hidden; new MutationObserver(() => { if (!$("#busy").hidden) covered = true; }).observe($("#busy"), { attributes: true }); });
  await page.mouse.move(...knob); await page.mouse.down(); await page.mouse.move(knob[0] + 120 * zoom, knob[1], { steps: 6 });
  const live = await page.$eval(".bs-item canvas", (c) => c.width);
  check(live === 240, "the book's picture follows the corner while it is dragged", live);
  await page.mouse.up();
  const after = await scrolled();
  check(before[0] > 0 && after.join() === before.join(), "dragging a corner moves the corner alone, never the photo under it", { before, after });
  await page.waitForFunction(() => $(".bs-item input")?.value === "Title 300x180");
  check((await history(page)).slice(0, 2).join() === "Read a title again,Moved a book's corner",
    "a corner dropped is one GT action, and the reading that follows it is another, carrying its answer", await history(page));
  check(!(await page.evaluate(() => covered)), "a corner dragged on the photo re-straightens and re-reads the book, the photo never covered");
  // a row of Edit History hovered rings its book on the photo, in a colour the book's own outline and corners are not drawn in
  await page.hover("#eh-list li.go");
  await page.waitForFunction(() => !!document.querySelector('#overlay g[data-layer="ring"]')?.dataset.box);
  const ringed = await page.evaluate(() => { const g = document.querySelector('#overlay g[data-layer="ring"]'); return { box: g.dataset.box, colour: getComputedStyle(g.querySelector("ellipse")).stroke }; });
  check(ringed.box === "120,100,420,280" && ringed.colour === "rgb(255, 0, 255)", "a row's hover rings the book it is about, in the study's own colour, round the corners as dragged", ringed);
  await page.mouse.move(5, 5);
  for (let i = 0; i < 3; i++) await page.click("#zoom-out");
  await page.click('.bs-verdicts [data-do="right"]');
  check((await rows())[0] === "3/3 Books" && await page.evaluate(() => $("#gt-submit").disabled && !!document.querySelector('[data-do="none"]')),
    "every book decided, the task asks for the missed ones before Submit", await rows());
  // right-click on the photo: a book added where no box is, sized as the books found, and one deleted from inside it
  // Edit History floats over the photo's right side, where the next clicks are: it is switched off
  await page.uncheck("#gt-history-on");
  await page.mouse.click(...(await toScreen(390, 250)), { button: "right" });
  check(await page.$$eval("#bs-menu:not([hidden]) button:not([hidden])", (b) => b.map((x) => x.dataset.do).join()) === "add", "right-click off every book offers only Add a book");
  await page.click('#bs-menu [data-do="add"]');
  await page.waitForFunction(() => $(".bs-item input")?.value === "Title 240x40");
  check((await books(page)).length === 4 && (await rows())[0] === "3/4 Books", "Add a book here boxes a book at the click, sized as the books found, and reads it as one more book", await rows());
  check(await settledSelected(), "a book added here opens with its title focused and all its text selected, to retype", await titleState());
  await page.mouse.click(...(await toScreen(390, 250)), { button: "right" });
  await page.click('#bs-menu [data-do="delete"]');
  check((await books(page)).length === 3 && (await rows())[0] === "3/3 Books", "Delete this book takes an added book away", await rows());
  // a book can be added over a box already drawn: a box the finder drew over two books hides one of them
  await page.mouse.click(...(await toScreen(30, 150)), { button: "right" });
  check(await page.$$eval("#bs-menu:not([hidden]) button:not([hidden])", (b) => b.map((x) => x.dataset.do).join()) === "add,flip,delete", "right-click on a book offers Add a book too, with Flip and Delete");
  await page.keyboard.press("Escape");
  await page.click('[data-do="draw"]');
  for (const [x, y] of [[330, 60], [380, 60], [380, 280], [330, 280]]) await page.mouse.click(...(await toScreen(x, y)));
  await page.waitForFunction(() => $(".bs-item input")?.value === "Title 220x50");
  check((await rows())[0] === "3/4 Books", "Draw a book takes four corners on the photo, and the book drawn is one more book to review", await rows());
  check(await settledSelected(), "a book drawn opens with its title focused and all its text selected, to retype", await titleState());
  await page.click('.bs-verdicts [data-do="right"]');
  await page.click('[data-do="none"]');
  check((await rows()).join() === "4/4 Books" && !(await page.evaluate(() => $("#gt-submit").disabled)), "None missed ends the task, and Submit opens", await rows());
  await page.click("#gt-start");
  check(!(await cutShown()), "out of tagging the photo is whole again");
  await page.click("#gt-start");
  await page.click("#gt-submit");
  const gt = await saved(page, "#gt-export");
  const [b1, b2, b3, b4] = gt.doc.books;
  check(gt.name === "shelf_books_gt.json" && gt.doc.books.length === 4 && !("view" in b1) && b1.text === "הארי פוטר" && b1.turn === 3 && b1.proposed.text === "Title 260x40"
    && !("view" in b1.proposed) && b2.verdict === "right" && b3.corners[1][0] === 420 && b3.proposed.corners[1][0] === 300 && b4.source === "missed" && b4.corners[0].join() === "330,60" && !b4.proposed,
  "Submit's file carries each book in the order they stand: its verdict, corners (past the photo's edge where dragged there), turn and text, and what the finder and the reader proposed", gt.doc);
  check(gt.doc.books.map((b) => b.id).join() === "b2,b1,b3,u2" && gt.doc.none_missed === true && gt.doc.books.every((b) => b.verdict === "right"),
    "each book carries its id, the finder's b1, b2, b3 and the tagger's own kind, u1 taken by the book added and deleted again; none missed is in the file", gt.doc.books.map((b) => b.id));
  const kinds = gt.doc.history.actions.map((a) => a.type);
  check(gt.doc.history.replay === "verified" && kinds[0] === "open" && kinds[1] === "run" && kinds.includes("move-corners") && kinds.includes("flip") && kinds.includes("add") && kinds.includes("delete")
    && kinds.includes("none-missed") && kinds.includes("read") && !kinds.includes("set-text-per-key"), "the file's history replays to it, every GT action in order", kinds);
  const typedOnce = gt.doc.history.actions.filter((a) => a.type === "set-text" && a.text.startsWith("הארי"));
  check(typedOnce.length === 1, "the Hebrew title filled in is one set-text, whatever the keys it took", typedOnce.length);
  // Save Draft, the page reloaded, the photo opened again: Load draft brings every book back, without finding again
  await page.click("#gt-close");
  await page.click("#gt-save-draft");
  await until(page, () => $("#gt-unsaved").hidden);
  await page.reload();
  await page.waitForFunction(() => window.$ && /^Ready/.test($("#status").textContent));
  await load(page);
  check(await offered(page) === "Start GT tagging" && await page.evaluate(() => !$("#gt-load-draft").hidden && getComputedStyle($("#gt-continue")).display === "none"),
    "with a draft kept for the photo, Load draft is offered and Start GT tagging is the one tagging button", await offered(page));
  check((await books(page)).length === 0, "and no book is shown before it is loaded: Find books has not run");
  await page.click("#gt-load-draft");
  await page.waitForFunction(() => $("#gt-tasks > li:not([data-task=edits]) .t")?.textContent.includes("4/4"));
  check((await rows()).join() === "4/4 Books" && (await books(page)).length === 4 && await page.evaluate(() => !$("#gt-submit").disabled),
    "Load draft brings back every book, verdict and title, with no Find books", await rows());
  await page.click("#gt-start");
  await page.click("#gt-submit");
  const back = await saved(page, "#gt-export");
  check(JSON.stringify(back.doc.books) === JSON.stringify(gt.doc.books) && back.doc.history.replay === "verified" && back.doc.history.actions.length === gt.doc.history.actions.length,
    "the file made from the loaded draft is the file made before, books and log", back.doc.books);
  await page.click("#gt-close");
  await page.click("#user-menu summary"); await page.click("#manage-storage");
  await page.waitForFunction(() => $("#usage-dlg").open && !/Reading/.test($("#storage-list").textContent));
  const kept = await page.$$eval('#storage-list .entry[data-kind="selections"]', (es) => es.map((e) => [e.querySelector(".name").textContent, e.querySelector(".what").textContent]));
  check(kept.length === 1 && kept[0][0] === "shelf.png" && /ground-truth draft/.test(kept[0][1]), "Manage storage lists the draft under its photo", kept);
  await page.keyboard.press("Escape");
  await load(page, "other.png");
  check(await page.evaluate(() => $("#gt-load-draft").hidden), "another photo has no draft to load", await offered(page));
  await page.context().close();

  // a draft kept before Edit History, under its own key: offered once after Find books, as a base, and forgotten once a draft holds it
  page = await open("tagger", KEPT);
  const key = await page.evaluate(() => "gt-draft|shelves|" + st.fileName + "|" + st.sha);
  const old = { books: [{ corners: BOOKS[1].corners, view: "spine", text: "Old title", confidence: .9, reader: "tesseract", turn: 3, turnSet: false, typed: true, source: "found", verdict: "right",
    proposed: { corners: BOOKS[1].corners, text: "Title 260x40" } }, { corners: BOOKS[0].corners, view: "spine", text: "Title 240x35", reader: "tesseract", turn: 3, source: "found", verdict: null,
    proposed: { corners: BOOKS[0].corners, text: "Title 240x35" } }], noneMissed: false, open: 0 };
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [key, old]);
  await page.reload();
  await page.waitForFunction(() => window.$ && /^Ready/.test($("#status").textContent));
  await load(page);
  check(await page.evaluate(() => $("#gt-load-legacy").hidden) && await offered(page) === "Start GT tagging", "a draft kept before Edit History is not offered before Find books has run, nor as Continue GT tagging");
  await page.click("#bs-find");
  await page.waitForFunction(() => $("#status").textContent.startsWith("Titles read") && !$("#gt-load-legacy").hidden);
  const earlier = await page.evaluate(() => ({ text: $("#gt-load-legacy").textContent.trim(), title: $("#gt-load-legacy").title }));
  check(/^Load earlier edits/.test(earlier.text) && /a draft kept before Edit History/.test(earlier.title) && await page.evaluate((k) => localStorage.getItem(k) !== null, key),
    "the old draft is offered once, its key kept", earlier);
  check((await rowsOf(page))[0] === "0/3 Books", "and not loaded unasked", await rowsOf(page));
  await page.click("#gt-load-legacy");
  check((await rowsOf(page))[0] === "1/2 Books" && (await history(page))[0].startsWith("Ground truth from a draft kept before Edit History"),
    "Load earlier edits makes it the base: the books it held, one of them decided", [await rowsOf(page), await history(page)]);
  await page.click("#gt-save-draft");
  await until(page, () => $("#gt-unsaved").hidden);
  check(await page.evaluate((k) => localStorage.getItem(k) === null, key), "Save Draft keeps the base, and only then forgets the old key");
  await page.context().close();
} catch (e) { failed = true; console.error(e); }
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
