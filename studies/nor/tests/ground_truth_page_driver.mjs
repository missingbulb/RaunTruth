// Drives the page (web/) in headless Chromium with a stand-in worker that answers from ANSWERS (written by
// tests/test_memory.py) and checks the ground-truth workflow: a local image warns that its ground truth cannot
// be sent; a right click adds a NoR, with measuring lines to correct on its task's card, glowing on the image
// until the user decides; the measuring ends drag freely and keep the NoR on one axis; the
// Ground truth button's colour follows the verdicts (red while an added NoR waits for one) and opens a popup that
// names what is missing; the file holds only the candidates voted on, the added NoR once approved; for an image
// from Google Drive (a stand-in Drive API), for a tagger who never approved the site for the submissions folder,
// Submit stays off and says why (web-tests/test_gt_drive_page.py submits to them). In a PreGT
// study, where the summary is (req/nor/layout), it checks the summary mask: lassoed areas,
// combined by exclusive or, limit the summary and the CSVs but not the ground truth. And the study's steps in the status bar: Run algorithm shines with Find Candidates until the finder has run
// with the settings chosen, then Review all items until every finalist has a verdict. Exits 1 on a failed check, 2
// when it cannot run.
//   node tests/ground_truth_page_driver.mjs ANSWERS IMAGE
import { EARLY } from "../../../web-tests/early_messages.mjs";
import { repoFile } from "../../../web-tests/repo_file.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { asTagger } from "../../../web-tests/tagger.mjs";
import { localStudy } from "../../../web-tests/local_study.mjs";
import { pw, launch, googleOf } from "../../../web-tests/harness.mjs";
import { STEP } from "../../../web-tests/deadlines.mjs";

const [answers, image] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DRIVE_ID = "FAKEDRIVEID1234567890ab";

const STAND_IN = `
const A = await (await fetch("answers/answers.json")).json();
const bin = async (n) => new Uint8Array(await (await fetch("answers/" + n)).arrayBuffer());
let finder;
postMessage({ type: "ready", info: { finders: A.finders, about: A.about }, secs: 0 });
onmessage = async ({ data: m }) => {
  if (m.type === "open") {
    postMessage({ type: "held", secs: 0 });
  } else if (m.type === "call" && m.action === "run") {
    finder = m.args.algorithm; const seg = await bin("seg_" + finder + ".bin");
    postMessage({ type: "result", action: "run", meta: A.detected[finder], bytes: seg, secs: 0 }, [seg.buffer]);
  } else if (m.type === "call" && m.action === "refilter") {
    postMessage({ type: "result", action: "refilter", meta: A.filtered[finder][0], echo: m.echo, ms: 0 });
  }
};`;

let stage = null; // the study's stage as served; null: as committed
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (u === "/web/worker.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(EARLY + STAND_IN); }
  if (u === "/studies/nor/study.json" && stage) {
    r.writeHead(200, { "content-type": "application/json" });
    return r.end(JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(repo, u))), stage }));
  }
  const f = u.startsWith("/web/answers/") ? path.join(answers, u.slice("/web/answers/".length)) : repoFile(repo, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await launch(pw);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what) => { if (!ok) { console.error("FAILED: " + what); await done(1); } console.log("ok: " + what); };
const bytes = fs.readFileSync(image);
// the image on the Drive fake, in the study's own folder
googleOf(browser).drive.file({ id: DRIVE_ID, name: "corner.tif", mimeType: "image/tiff", bytes,
  parent: JSON.parse(fs.readFileSync(path.join(repo, "studies", "nor", "study.json"), "utf8")).root.split("/").pop() });

async function open(drive) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  await asTagger(ctx);
  await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
  // a local image: NoR Finder loads from Drive alone, the shell's handling of a local image kept tested on it
  if (!drive) await localStudy(ctx, "nor");
  const page = await ctx.newPage();
  page.setDefaultTimeout(STEP);
  await page.goto(origin + "/web/index.html?study=nor");
  await page.waitForFunction(() => document.querySelector("#algorithm")?.disabled === false);
  if (drive) {
    await page.click("#load-remote");
    await page.dblclick(`#remote-list .item[data-id="${DRIVE_ID}"]`);
  } else {
    await page.setInputFiles("#file", image);
  }
  await page.waitForFunction(() => !document.querySelector("#find").disabled);
  return { ctx, page };
}

// the status bar's steps, the one to do now marked *, and what shines
const crumbs = (page) => page.evaluate(() => [...document.querySelectorAll("#sb-steps .crumb")].map((c) => c.textContent + (c.classList.contains("now") ? "*" : "")).join(" › ")
  + " | " + [...document.querySelectorAll(".shine")].map((e) => "#" + e.id).sort().join());
// a held button (busy with its action) has finished
const idle = (page) => page.waitForFunction(() => !document.querySelector("button.working"));

// the middle of the view, as a point on the screen and on the image
// the middle of the part of the image in view, which a wide view may leave room beside
const middle = (page) => page.evaluate(() => {
  const v = $("#scroller").getBoundingClientRect(), b = $("#base").getBoundingClientRect();
  const sx = (Math.max(v.left, b.left) + Math.min(v.right, b.right)) / 2, sy = (Math.max(v.top, b.top) + Math.min(v.bottom, b.bottom)) / 2;
  return { sx, sy, x: (sx - b.left) / st.zoom, y: (sy - b.top) / st.zoom };
});

// the state the Ground truth button shows: the one icon on display beside its text
const gtColour = (page) => page.$eval("#gt-submit", (b) => {
  const on = [...b.querySelectorAll(".gt-ico svg")].filter((v) => getComputedStyle(v).display !== "none");
  return on.length === 1 ? on[0].getAttribute("class") : `${on.length} icons`;
});
// the task card's handle for one end of a measuring line, as a point on the screen
const handle = async (page, k, j) => {
  const h = page.locator(`#task-card .handle[data-k="${k}"][data-j="${j}"]`);
  await h.scrollIntoViewIfNeeded(); // the right bar may be scrolled down to the downloads
  const b = await h.boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
};
async function drag(page, [x, y], dx, dy) {
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 }); await page.mouse.up();
}
// the same drag with Escape pressed before the release (req/shell/drag/escape); during() sees it under way
async function escapedDrag(page, [x, y], dx, dy, during) {
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  const seen = await during();
  await page.keyboard.press("Escape"); await page.mouse.move(x + dx + 10, y + dy + 10, { steps: 2 }); await page.mouse.up();
  return seen;
}
// how far the four ends of a candidate's length and red lines are from one straight line, in pixels
const offAxis = (L) => {
  const [A, B] = L.length, n = Math.hypot(B[0] - A[0], B[1] - A[1]);
  return Math.max(...L.red.map((p) => Math.abs((B[0] - A[0]) * (A[1] - p[1]) - (A[0] - p[0]) * (B[1] - A[1])) / n));
};

// a box folded with the steps (req/shell/tools/ruler), opened by its title as the user would
const unfold = async (page, box) => { await page.evaluate((b) => { const e = $(b); if (e.classList.contains("folded")) e.querySelector(".sec-head h2").click(); }, box); await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")); };
async function markAndVote(page) {
  await unfold(page, "#processing-box");
  await page.click("#find");
  await page.waitForFunction(() => st.alone && $("#busy").hidden);
  const ran = await crumbs(page);
  await check(ran === "Load image › Run algorithm › Review all items* | #sb-review", `once it has run, Review all items is: ${ran}`);
  await check(await gtColour(page) === "todo", "with no verdict the Ground truth button is red");
  // the filters rejecting every finalist, with nothing voted on: the crumb waits on what the button waits on;
  // their answer lands, is read and is taken back in one turn of the page, so no real answer interleaves
  const none = await page.evaluate(() => {
    const land = (fails) => st.worker.onmessage({ data: { type: "result", action: "refilter", meta: { fails, alone: st.alone }, echo: st.seq } });
    const kept = st.fails, why = Object.values(kept).find((f) => f !== null), all = JSON.parse(JSON.stringify(kept));
    for (const k of Object.keys(all)) all[k] = why;
    land(all);
    const seen = { finalists: st.passes.filter((c) => !c.added).length, button: $("#gt-submit").dataset.state,
      crumbs: [...document.querySelectorAll("#sb-steps .crumb")].map((c) => c.textContent + (c.classList.contains("now") ? "*" : "")).join(" › ") };
    land(kept);
    return seen;
  });
  await check(none.finalists === 0 && none.button === "todo" && none.crumbs === "Load image › Run algorithm › Review all items*",
    `every finalist filtered out and none voted on: the button stays red and Review all items stays the step to do: ${JSON.stringify(none)}`);
  // the walk opens once tagging starts (req/shell/ground-truth/tagging), framing its first area; the view is put back
  // as it was, the whole image, once it rests, since a scroll closes the menu a right click opens
  const rest = () => page.waitForFunction(() => {
    const sc = $("#scroller"), at = [sc.scrollLeft, sc.scrollTop, st.zoom].join();
    window.still = window.lastAt === at ? (window.still || 0) + 1 : 0; window.lastAt = at;
    return window.still >= 5;
  }, null, { polling: "raf" });
  const was = await page.evaluate(() => ({ zoom: st.zoom, x: $("#scroller").scrollLeft, y: $("#scroller").scrollTop }));
  await page.click("#gt-start");
  await rest();
  await page.evaluate((w) => { shellForTests.viewer.setZoom(w.zoom); $("#scroller").scrollTo({ left: w.x, top: w.y, behavior: "instant" }); }, was);
  await rest();
  const m = await middle(page);
  await page.mouse.click(m.sx, m.sy, { button: "right" });
  await check(await page.isVisible("#ctx") && (await page.textContent("#ctx button")) === "Add a NoR Here", "a right click on the image offers Add a NoR Here");
  await page.click("#ctx button");
  const added = await page.evaluate(() => ({ sel: st.sel, c: nor.candOf(st.sel) }));
  await check(added.sel === "u1" && Math.hypot(added.c.cx - m.x, added.c.cy - m.y) < 1, `the added NoR is centred where clicked and selected (${added.c.cx}, ${added.c.cy})`);
  await check(await page.$$eval("#overlay .added .glow", (c) => c.length) === 1, "it glows on the image");
  await check(await page.$$eval("#task-card .card.added", (c) => c.length) === 1 && await page.$$eval("#task-card .handle", (h) => h.length) === 6,
    "its task's card shows it with six handles");
  // a green end dragged off the axis turns it; the red ends follow onto the new axis
  await drag(page, await handle(page, "length", 1), 0, -40);
  let L = await page.evaluate(() => nor.candOf("u1").lines);
  await check(Math.abs(L.length[1][1] - L.length[0][1]) > 3 && offAxis(L) < 0.05, `a dragged green end turns the axis, the red ends staying on it (${offAxis(L).toFixed(3)} px off)`);
  // a width end sets the width
  const w0 = await page.evaluate(() => nor.candOf("u1").m.width);
  await drag(page, await handle(page, "width", 0), 0, -25);
  const w1 = await page.evaluate(() => nor.candOf("u1").m.width);
  await check(w1 > w0 + 1, `a dragged width end widens the NoR (${w0.toFixed(1)} to ${w1.toFixed(1)} px)`);
  // Escape in the middle of a handle's drag puts it back, and the NoR keeps its lines
  {
    const lines = () => page.evaluate(() => JSON.stringify(nor.candOf("u1").lines)), kept = await lines(), at = await handle(page, "width", 0);
    const mid = await escapedDrag(page, at, 0, -25, () => handle(page, "width", 0));
    const back = await handle(page, "width", 0);
    await check(Math.abs(mid[1] - at[1]) > 10 && Math.hypot(back[0] - at[0], back[1] - at[1]) < 1 && await lines() === kept,
      "Escape mid-drag puts a handle back where it was, the NoR's lines unchanged", { at, mid, back });
  }
  // with another candidate voted on, only the added NoR keeps the button red
  await page.evaluate(() => nor.decide(st.order[0].i, "approve"));
  const waiting = await page.$eval("#gt-submit", (b) => ({ state: b.dataset.state, why: b.title }));
  await page.evaluate(() => nor.decide(st.order[0].i, null));
  await check(waiting.state === "todo" && /Approve or reject the 1 NoR you added/.test(waiting.why), `an added NoR without a verdict keeps the button red: "${waiting.why}"`);
  await page.click("#task-card .verdict .up");
  await check(await page.$$eval("#overlay .added .glow", (c) => c.length) === 0, "approving it stops the glow");
  // in the finalists' task, a thumbs up on the first candidate, a thumbs down on the third; the second, skipped, stays undecided
  await page.click('#gt-tasks > li[data-task="pass"] .task-head .t');
  await page.click("#task-card .verdict .up");
  await page.click("#task-skip");
  // a found candidate's red end dragged off the axis only slides along it: the green ends stay put
  L = await page.evaluate(() => nor.linesOf(nor.candOf(st.sel)));
  if (L) {
    await drag(page, await handle(page, "red", 0), 15, 20);
    const M = await page.evaluate(() => nor.linesOf(nor.candOf(st.sel)));
    const moved = Math.hypot(M.red[0][0] - L.red[0][0], M.red[0][1] - L.red[0][1]);
    await check(offAxis(M) < 0.05 && JSON.stringify(M.length) === JSON.stringify(L.length) && moved > 0.5,
      `a red end dragged off the axis slides along it (${moved.toFixed(1)} px), the green ends unmoved (${offAxis(M).toFixed(3)} px off)`);
  }
  await page.click("#task-card .verdict .down");
  await check(await gtColour(page) === "part", "with some verdicts but a finalist left the button is orange");
  return page.evaluate(() => ({ undecided: st.order.length - st.forced.size }));
}

// the popup the Ground truth button opens: its text, and the file its Export button downloads
async function popup(page) {
  // Submit Ground Truth is the last of the tasks (req/nor/truth/tasks)
  await page.click("#gt-submit");
  await check(await page.isVisible("#gt-dlg"), "the Ground truth button opens its popup");
  // a checklist of every issue, the resolved ones crossed out: what is still open
  const items = await page.$$eval("#gt-problems li", (li) => li.map((l) => ({ ok: l.classList.contains("ok"), struck: getComputedStyle(l.querySelector("span")).textDecorationLine, text: l.textContent })));
  const has = await page.evaluate(() => ({ added: st.added.length > 0 }));
  await check(items.length === 5 + has.added && items.every((t) => (t.struck === "line-through") === t.ok),
    `the popup lists every issue that applies, crossing out the resolved ones (${items.filter((t) => t.ok).length} of ${items.length})`);
  const line = (re) => items.find((t) => re.test(t.text));
  await check(!!line(/you added/) === has.added && !line(/mask/),
    `the added NoRs are listed only when there are some, and the summary's mask never (${items.map((t) => t.text).join(" | ")})`);
  return items.filter((t) => !t.ok).map((t) => t.text).join(" | ");
}
// which of the popup's buttons is blue: the next step
const blue = (page) => page.$$eval("#gt-dlg button.primary", (b) => b.map((x) => x.id).join());
async function download(page) {
  const said = await popup(page);
  await check(await blue(page) === "gt-export", "the popup opens with Export file blue");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#gt-export")]);
  return { said, name: dl.suggestedFilename(), gt: JSON.parse(fs.readFileSync(await dl.path(), "utf8")), after: await blue(page) };
}
const csvRows = async (page, id) => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(id)]);
  return fs.readFileSync(await dl.path(), "utf8").trim().split("\n").slice(1);
};

// drags a closed lasso through the image points given as fractions of its width and height
async function lasso(page, pts) {
  await page.click("#mask-add");
  const box = await page.evaluate(() => { const b = $("#base").getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; });
  const at = ([fx, fy]) => [box.l + fx * box.w, box.t + fy * box.h];
  await page.mouse.move(...at(pts[0])); await page.mouse.down();
  for (const p of [...pts.slice(1), pts[0]]) await page.mouse.move(...at(p), { steps: 6 });
  await page.mouse.up();
}

async function mask(page) {
  const passes = await page.evaluate(() => st.passes.length);
  // a lasso cancelled by Escape before it is let go draws no mask
  {
    const masked = await page.evaluate(() => st.mask.length);
    await page.click("#mask-add");
    const box = await page.evaluate(() => { const b = $("#base").getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; });
    const live = await escapedDrag(page, [box.l + box.w * 0.2, box.t + box.h * 0.2], box.w * 0.5, box.h * 0.5, async () => {
      await page.mouse.move(box.l + box.w * 0.2, box.t + box.h * 0.7, { steps: 4 });
      return page.evaluate(() => !!$("#overlay .lasso-live"));
    });
    const after = await page.evaluate(() => ({ mask: st.mask.length, lassoing: $("#scroller").classList.contains("lassoing"), line: !!$("#overlay .lasso-live") }));
    await check(live && after.mask === masked && !after.lassoing && !after.line, "Escape mid-lasso draws no mask and ends the lasso", { live, masked, after });
  }
  await lasso(page, [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]]);
  const fit = await page.evaluate(() => ({ w: st.W * st.zoom, h: st.H * st.zoom, sw: $("#scroller").clientWidth, sh: $("#scroller").clientHeight }));
  await check(fit.w <= fit.sw + 1 && fit.h <= fit.sh + 1, `Add mask shows the whole image (${JSON.stringify(fit)})`);
  // what the summary should count: the finalists whose centre lies in the middle square
  const inside = (page) => page.evaluate(() => [...nor.addedCands(), ...st.order].filter((c) => {
    const x = c.cx / st.W, y = c.cy / st.H, mid = x > 0.25 && x < 0.75 && y > 0.25 && y < 0.75, hole = x > 0.4 && x < 0.6 && y > 0.4 && y < 0.6;
    return st.mask.length > 1 ? mid && !hole : mid;
  }).map((c) => [c.i, nor.result(c.i) === null]));
  let want = await inside(page);
  const head = () => page.textContent("#summary > div");
  await check(want.length > 0 && want.length < (await page.evaluate(() => st.order.length)), `the lasso holds some candidates and not others (${want.length})`);
  await check((await head()).startsWith(`${want.filter(([, p]) => p).length} NoRs inside the mask`) && passes > want.filter(([, p]) => p).length,
    `the summary counts only the finalists inside the mask: "${await head()}"`);
  await check(await page.isVisible("#mask-clear"), "Clear mask shows while a mask is on");
  await check(await page.$$eval("#overlay .mask-marks .edge:not(.under)", (e) => e.length) === 1 && !(await page.$("#overlay .mask-marks .fill")),
    "one area is drawn as its border only");
  await check((await csvRows(page, "#dl-cands")).length === want.length, "the Candidates CSV holds only the candidates inside the mask");
  // density: the finalists inside over the lassoed square's area, a quarter of the image, per mm²
  const n = want.filter(([, p]) => p).length, sq = await page.evaluate(() => 0.25 * st.W * st.H * st.um * st.um * 1e-6);
  // the shell's Download Summary (req/shell/summary/download): measurement, unit and value in its fourth to sixth columns
  const dens = (await csvRows(page, "#summary-dl")).map((r) => r.split(",")).find((r) => r[3] === "Density" && r[4] === "per mm²");
  const got = dens && parseFloat(dens[5]);
  await check(got && Math.abs(got / (n / sq) - 1) < 0.05, `the Summary CSV gives the finalists' density inside the mask (${got} vs ${(n / sq).toFixed(0)} per mm²)`);
  await check((await page.textContent("#summary .density")).includes(Math.round(got).toString()), `the summary shows the density: "${await page.textContent("#summary .density")}"`);
  // a second lasso inside the first cuts a hole
  await lasso(page, [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]]);
  want = await inside(page);
  await check((await head()).startsWith(`${want.filter(([, p]) => p).length} NoRs inside the mask`), `a lasso inside the mask cuts a hole: "${await head()}"`);
  await check(await page.$$eval("#overlay .mask-marks .edge:not(.under)", (e) => e.length) === 2 && !!(await page.$("#overlay .mask-marks .fill")),
    "a shape inside a shape is tinted inside");
}

// ---- an image from this computer ----
{
  const { ctx, page } = await open(false);
  const warn = await page.isVisible("#notice") && (await page.textContent("#notice-text"));
  await check(warn && /local files/.test(warn) && warn.split(/\s+/).length <= 15, `a local image warns its ground truth cannot be sent: "${warn}"`);
  const where = await page.evaluate(() => { const n = $("#notice").getBoundingClientRect(), v = $("#view").getBoundingClientRect(); return { top: n.top - v.top, centre: (n.left + n.right) / 2 - (v.left + v.right) / 2 }; });
  await check(Math.abs(where.top - 56) <= 1 && Math.abs(where.centre) <= 1, `the warning sits at the top of the view, across its middle: ${JSON.stringify(where)}`);
  await page.click("#notice-ok");
  const before = await crumbs(page);
  await check(before === "Load image › Run algorithm* | #find,#sb-find", `with an image open, Run algorithm is the step to do: ${before}`);
  await page.click("#find");
  await page.waitForFunction(() => st.alone && $("#busy").hidden);
  const none = await popup(page);
  await check(/Vote on at least one/.test(none) && /thumbs/.test(await page.textContent("#gt-msg")) && await page.isDisabled("#gt-export"), `with nothing marked the popup says how to mark and exports nothing: "${none}"`);
  await page.click("#gt-close");
  const { undecided } = await markAndVote(page);
  const { said, gt, after } = await download(page);
  await check(after === "gt-close", `after the export of a local image, which cannot be sent, Close turns blue (${after})`);
  await check(/have no vote/.test(said), `the popup names the finalists left without a verdict: "${said}"`);
  // the file is the model (req/nor/downloads): the candidates that remain, listing each, the one approved marked; the added NoR with its
  // approval; the one rejected absent, and read from the history
  const total = await page.evaluate(() => st.order.length);
  const approved = gt.candidates.filter((c) => c.approved), miss = gt.added[0];
  await check(gt.format === "norfinder-ground-truth/4" && approved.length === 1 && gt.candidates.length === total - 1 && gt.added.length === 1 && miss.approved
    && gt.checked.length === 0 && undecided > 0 && !("labels" in gt),
    `the file lists the candidates that remain, one approved, the added NoR approved, the rejected one absent (${approved.length} approved of ${gt.candidates.length}; ${undecided} undecided are only listed)`);
  const kinds = gt.history.actions.map((a) => a.type), run = gt.history.actions.find((a) => a.type === "run");
  const out = await page.evaluate(async (o) => JSON.parse(await new Response(new Blob([Uint8Array.from(atob(o.deflate), (c) => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream("deflate"))).text()), run.output);
  const gone = out.cands.filter((c) => !gt.candidates.some((x) => x.id === c.id));
  await check(gt.history.format === "rauntruth-gt-history/1" && kinds[0] === "open" && kinds.includes("add") && kinds.includes("approve") && kinds.includes("delete")
    && gone.length === 1 && gt.history.actions.some((a) => a.type === "delete" && a.cand === gone[0].id) && out.cands.every((c) => /^c\d+$/.test(c.id) && !("blk" in c) && !("mask" in c)),
    `the history holds the run, with no masks, and the delete of the rejected candidate ${gone[0]?.id} (${kinds.join(", ")})`);
  await check(miss.id === "u1" && miss.lines.width && miss.lines.length && miss.lines.red, `an added NoR has its id and its lines (${miss.id})`);
  // one number per candidate, finalists and rejected alike, the added NoR after the found ones; the image,
  // the cards and the file all name a candidate by it
  const nums = await page.evaluate(() => {
    const cs = [...nor.addedCands(), ...st.order], on = (c) => $(`#overlay g[data-i="${c.i}"] text`).firstChild.textContent;
    return { found: st.order.length, image: cs.map(on), cards: cs.map((c) => [on(c), nor.card(c, "list").querySelector(".num").textContent]),
      at: Object.fromEntries(cs.map((c) => [on(c), [c.cx, c.cy]])) };
  });
  const all = Array.from({ length: nums.found + 1 }, (_, k) => String(k + 1));
  await check(JSON.stringify([...nums.image].sort()) === JSON.stringify([...all].sort()), `the image numbers every candidate once, 1 to ${nums.found}, the added NoR ${nums.found + 1}`);
  await check(nums.cards.every(([n, shown]) => shown === "#" + n), "each card shows its candidate's number");
  const mid = miss.lines.length[0].map((v, k) => (v + miss.lines.length[1][k]) / 2);
  await check(gt.candidates.every((c) => nums.at[c.n] && Math.hypot(nums.at[c.n][0] - c.x, nums.at[c.n][1] - c.y) < 1e-6) && Math.hypot(nums.at[nums.found + 1][0] - mid[0], nums.at[nums.found + 1][1] - mid[1]) < 1e-6,
    `the file names each candidate by its number on the image, the added NoR by ${nums.found + 1}`);
  await check(gt.image.location.source === "local", "the file says the image was local");
  await check(!("mask" in gt), "the file holds no mask");
  const send = await page.$eval("#gt-send", (b) => ({ off: b.disabled, why: b.title }));
  await check(send.off && /local files/.test(send.why), `Submit is off for a local image, and says why: "${send.why}"`);
  await page.click("#gt-close");
  await page.evaluate(() => st.order.filter((c) => !st.forced.has(c.i)).forEach((c) => nor.decide(c.i, "approve")));
  await check(await gtColour(page) === "part", "with every candidate voted on but the areas not checked the button is orange");
  await page.click('#gt-tasks > li[data-task="missed"] .task-head .t'); for (let k = 0; k < 100; k++) await page.click("#area-ok");
  await check(await gtColour(page) === "done", "with every task done the button is green");
  const all_ = await crumbs(page);
  await check(all_ === "Load image › Run algorithm › Review all items › Submit GT | ", `with every task done and the file exported, every step is done: ${all_}`);
  await page.selectOption("#algorithm", { index: 1 });
  const changed = await crumbs(page);
  await check(changed === "Load image › Run algorithm* | #find,#sb-find", `another finder makes Run algorithm the step to do again: ${changed}`);
  await ctx.close();
}

// ---- a PreGT study: the summary, its mask and CSVs ----
{
  stage = "PreGT";
  const { ctx, page } = await open(false);
  await page.evaluate(() => { $("#notice").hidden = true; });
  await page.click("#find");
  await page.waitForFunction(() => st.alone && $("#busy").hidden);
  await check(await page.isHidden("#gt-submit"), "a PreGT study has no Submit Ground Truth");
  const csvAt = await page.evaluate(() => {
    const box = $("#summary-box").getBoundingClientRect(), sum = $("#summary").getBoundingClientRect();
    return ["#dl-cands", "#summary-dl"].map((id) => { const b = $(id).getBoundingClientRect(); return b.top >= sum.bottom && b.bottom <= box.bottom; });
  });
  await check(!/Rejected/.test(await page.textContent("#summary")), "the summary lists no filter reasons");
  const hists = await page.evaluate(() => {
    const ss = nor.summaryRows(st.passes.filter(nor.inMask)).map(([, s]) => s);
    return [...document.querySelectorAll("#summary .hist")].map((h, k) => {
      const line = h.querySelector(".mean"), x = +line.getAttribute("x1"), b = h.querySelectorAll(".bar");
      const at = (i) => +b[i].getAttribute("x"), lo = at(0), hi = at(b.length - 1) + +b[0].getAttribute("width");
      return { said: h.firstElementChild.textContent.includes(nor.fmt(ss[k].mean)), where: Math.abs((x - lo) / (hi - lo) - (ss[k].mean - ss[k].min) / (ss[k].max - ss[k].min)) < 0.02,
        axis: [...h.querySelectorAll("text")].some((t) => t.textContent === String(Math.max(...[...b].map((r) => +r.textContent)))) };
    });
  });
  await check(!(await page.$("#summary table")) && hists.length >= 3 && hists.every((h) => h.said && h.where && h.axis),
    `each histogram names its mean, draws it where it falls and has a count axis, and no table repeats them (${JSON.stringify(hists)})`);
  await check(csvAt.every(Boolean), `both CSV buttons sit at the bottom of the Summary box (${csvAt})`);
  await page.mouse.click(...(await (async () => { const m = await middle(page); return [m.sx, m.sy]; })()), { button: "right" });
  await page.click("#ctx button");
  await mask(page);
  const gt = await page.evaluate(() => nor.document());
  await check(gt.candidates.every((c) => !c.approved) && gt.added.every((a) => !a.approved) && !("mask" in gt), "the ground truth ignores the mask");
  const all = await page.evaluate(() => Array.from({ length: st.order.length + st.added.length }, (_, k) => String(k + 1)));
  await page.click("#mask-clear");
  await check(await page.evaluate(() => !st.mask.length) && await page.isHidden("#mask-clear") && !(await page.$("#overlay .mask-marks .edge")), "Clear mask removes the mask");
  const ns = (await csvRows(page, "#dl-cands")).map((r) => r.split(",")[0]);
  await check(ns.length === all.length && new Set(ns).size === ns.length && ns.every((n) => all.includes(n)), "the Candidates CSV names each candidate by its number");
  await ctx.close();
  stage = null;
}

// ---- an image from Google Drive ----
{
  const { ctx, page } = await open(true);
  await check(await page.isHidden("#notice"), "a Drive image shows no warning");
  await markAndVote(page);
  const { said, name, gt, after } = await download(page);
  await check(after === "gt-close", `with Submit off, Close turns blue after the export (${after})`);
  await check(!/mask/i.test(said), `with no mask the mask item is crossed out: "${said}"`);
  await check(gt.image.location.source === "drive" && gt.image.location.drive_id === DRIVE_ID, "the file names the image's Drive id");
  const send = await page.$eval("#gt-send", (b) => ({ off: b.disabled, why: b.title }));
  await check(send.off && /Not approved/.test(send.why), `with the site not approved for the submissions folder, Submit is off and says why: "${send.why}"`);
  await ctx.close();
}
await done(0);
