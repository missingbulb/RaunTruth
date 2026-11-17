// Drives the vascular study's GT actions in a GT stage (req/vascular/model/correct, req/vascular/model/ground-truth) in headless
// Chromium against a stand-in worker (stand_in.mjs), as a Ground Truth Tagger: a point dragged is one action at its drop and none
// while it moves or when Escape cancels it; Undo and Redo are the shell's; the file keeps the ids and has no clock; Save Draft, a
// reload and Load draft bring the model back without Execute; and the edits kept in this browser before Edit History are offered
// once as a base. Exits 1 on a failed check, 2 when it cannot run.
//   node studies/vascular/tests/vessel_gt_actions_driver.mjs STUDIES
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { offSite } from "../../../web-tests/off_site.mjs";
import { ENGINE, LAUNCH } from "../../../web-tests/engine.mjs";
import { asTagger } from "../../../web-tests/tagger.mjs";
import { serve, drawnStack } from "./stand_in.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { until } from "../../../web-tests/page_until.mjs";
import { oldKey } from "../web/old_edits.js";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..", "..", "..");
const [studies] = process.argv.slice(2);
const model = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cd31_frontal_x20_r_1_slices1-12.vessels.json"), "utf8"));
const site = await serve(repo, studies, model, "GT");

const browser = await pw[ENGINE].launch(LAUNCH);
let failed = false;
const check = (ok, what) => { if (!ok) { failed = true; console.error("FAILED: " + what); } else console.log("ok: " + what); };
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
await asTagger(ctx);
await ctx.route(offSite(site.origin), (r) => r.abort());
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
await standInDrive(ctx);
const page = await ctx.newPage();
page.on("pageerror", (e) => { failed = true; console.error("page error: " + e.message); });
page.setDefaultTimeout(10000);

const doc = () => page.evaluate(() => window.vascular.model().model);
// the actions made, none of them saved yet: the count beside Undo
const count = async () => +(/\d+/.exec(await page.textContent("#gt-unsaved"))?.[0] ?? 0);
const nodeOf = async (id) => (await doc()).nodes.find((n) => n.id === id) ?? (await doc()).edges.flatMap((e) => e.via).find((n) => n.id === id);
const stack = { name: model.source, mimeType: "image/tiff", buffer: drawnStack(model) };
const [W, H] = [model.size_px[0] * model.um_per_px, model.size_px[1] * model.um_per_px];
const execute = async () => { await page.click("#vm-run"); await page.waitForFunction(() => !$("#vm-review").hidden); };
const opened = async () => { await openFromDrive(page, stack); await page.waitForFunction(() => !$("#vm-run").disabled); await page.evaluate(() => { $("#notice").hidden = true; }); };

try {
  await page.goto(site.origin + "/web/vascular");
  await page.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  await opened();
  await execute();
  await page.click("#gt-start");
  await page.selectOption("#area-grid", "2");
  const ids = (await doc()).edges.flatMap((e) => e.segment_ids);
  check(ids.length > 0 && new Set(ids).size === ids.length && (await doc()).edges.every((e) => e.segment_ids.length === e.via.length + 1), `every segment has an id of its own, an edge naming one per segment: ${ids.length} segments`);

  // a handle in the first area, dragged
  const cv = await page.evaluate(() => { const r = $("#mcv").getBoundingClientRect(); return [r.left, r.top]; });
  const { points } = await page.evaluate(() => window.vascular.model());
  const node = (await doc()).nodes.find((n) => points[n.id] && n.x > W * 0.1 && n.x < W * 0.4 && n.y > H * 0.1 && n.y < H * 0.4);
  const [px, py] = points[node.id];
  const before = JSON.stringify(await doc());
  check((await count()) === 0, "no action yet");
  await page.mouse.move(cv[0] + px, cv[1] + py); await page.mouse.down(); await page.mouse.move(cv[0] + px + 25, cv[1] + py + 15, { steps: 5 });
  const during = await nodeOf(node.id);
  check((during.x !== node.x || during.y !== node.y) && (await count()) === 0, `while the point is dragged it is shown moved and the log holds nothing: (${node.x.toFixed(1)}, ${node.y.toFixed(1)}) → (${during.x.toFixed(1)}, ${during.y.toFixed(1)})`);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  check(JSON.stringify(await doc()) === before && (await count()) === 0 && (await page.textContent("#gt-unsaved")) === "", "a drag cancelled with Escape leaves the model and the log as they were");
  await page.mouse.move(cv[0] + px, cv[1] + py); await page.mouse.down(); await page.mouse.move(cv[0] + px + 25, cv[1] + py + 15, { steps: 5 });
  await page.mouse.move(cv[0] + px + 30, cv[1] + py + 18, { steps: 3 }); await page.mouse.up();
  const after = await nodeOf(node.id);
  check((await count()) === 1 && (after.x !== node.x || after.y !== node.y) && after.z === node.z, `a drop is exactly one action: ${await count()} action, the point at (${after.x.toFixed(1)}, ${after.y.toFixed(1)})`);
  await page.click("#gt-undo");
  check(JSON.stringify(await doc()) === before && (await count()) === 0, "the shell's Undo puts the point back");
  await page.click("#gt-redo");
  check((await nodeOf(node.id)).x === after.x && (await count()) === 1, "and its Redo moves it again");

  // the file: every id kept, no clock, the log with it
  await page.click("#gt-submit");
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-export").disabled);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#gt-export")]);
  const out = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  await page.click("#gt-close");
  const move = out.history.actions.find((a) => a.type === "move-node");
  check(out.edges.every((e) => e.segment_ids?.length === e.via.length + 1 && e.via.every((p) => Number.isInteger(p.id))) && out.status === "corrected" && !("corrected_at" in out) && !("corrections" in out),
    "the file carries each segment's and curve point's id, and no clock and no count of corrections");
  check(out.history.replay === "verified" && move?.node === node.id && move.to.x === after.x, `its history replays to it, and names the point by its id: ${JSON.stringify(move && { node: move.node })}`);

  // Save Draft, a reload and Load draft: the model is back and nothing runs
  await page.click("#gt-save-draft");
  await until(page, () => $("#gt-unsaved").hidden);
  const saved = JSON.stringify(await doc());
  await page.reload();
  await page.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  await opened();
  await page.waitForFunction(() => !$("#gt-offers").hidden);
  check(await page.evaluate(() => !!window.vascular.model().model === false && !$("#gt-load-draft").hidden), "after the reload the draft is offered and no model is shown: Execute has not run");
  await page.click("#gt-load-draft");
  await page.waitForFunction(() => !!window.vascular.model().model);
  check(JSON.stringify(await doc()) === saved && (await page.textContent("#status")).includes("verified") && await page.evaluate(() => !$("#vm-review").hidden), "Load draft brings the model back with its replay verified, and no Execute");

  // the edits kept before Edit History: offered once, as a base, forgotten when a draft holds them
  const run = await doc();
  const meta = { ...model, algorithm: run.algorithm, asked: run.asked };
  const key = oldKey(meta);
  const candidate = run.edges.findIndex((e) => e.state === "candidate");
  const earlier = { ...run, edges: run.edges.map((e, k) => (k === candidate ? { ...e, state: "accepted" } : e)) };
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [key, { edits: 2, model: earlier }]);
  await page.reload();
  await page.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  await opened();
  await execute();
  await page.waitForFunction(() => !$("#gt-load-legacy").hidden);
  const accepted = async () => (await doc()).edges.filter((e) => e.state === "accepted").length;
  const had = await accepted();
  const offered = await page.evaluate(() => ({ text: $("#gt-load-legacy").textContent.trim(), title: $("#gt-load-legacy").title }));
  check(/^Load earlier edits/.test(offered.text) && /2 actions/.test(offered.title) && await page.evaluate((k) => localStorage.getItem(k) !== null, key),
    `the old store is offered once Execute has run: ${JSON.stringify(offered)}`);
  check(had === run.edges.filter((e) => e.state === "accepted").length, "and is not loaded unasked");
  await page.click("#gt-load-legacy");
  check((await accepted()) === had + 1 && (await count()) === 2 && await page.evaluate((k) => localStorage.getItem(k) !== null, key),
    "Load earlier edits makes them the base, counted as unsaved, the old key still there");
  page.once("dialog", (d) => d.accept());
  await page.click("#gt-save-draft");
  await until(page, () => $("#gt-unsaved").hidden);
  check(await page.evaluate((k) => localStorage.getItem(k) === null, key), "Save Draft keeps the base and only then forgets the old key");
} catch (e) {
  failed = true; console.error(e);
}
await browser.close(); site.close();
process.exit(failed ? 1 : 0);
