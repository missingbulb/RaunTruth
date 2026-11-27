// Drives the vascular study's GT actions in a GT stage (req/vascular/model/correct, req/vascular/model/ground-truth) in headless
// Chromium against a stand-in worker (stand_in.mjs), annotating: a point dragged is one action at its drop and none
// while it moves or when Escape cancels it; Undo and Redo are the shell's; the file keeps the ids and has no clock; Save Draft, and
// Load draft in a page opened afresh, bring the model back without Execute; and the edits kept in this browser before Edit History are offered
// once as a base. Exits 1 on a failed check, 2 when it cannot run.
//   node studies/vascular/tests/vessel_gt_actions_driver.mjs STUDIES
import { fromScratch } from "../../../web-tests/annotating.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { SOFTWARE_3D } from "../../../web-tests/engine.mjs";
import { serve, atStage, taggersDevice, drawnStack, STACK_PX } from "./stand_in.mjs";
import { openFromDrive } from "../../../web-tests/drive_open.mjs";
import { until } from "../../../web-tests/page_until.mjs";
import { viewDrawn } from "../../../web-tests/page_frames.mjs";
import { oldKey } from "../web/old_edits.js";
import { pw, launch, check } from "../../../web-tests/harness.mjs";
import { world } from "../../../web-tests/world.mjs";
import { storedDrafts } from "../../../web-tests/device_storage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..", "..", "..");
const [studies] = process.argv.slice(2);
const model = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cd31_frontal_x20_r_1_slices1-12.vessels.json"), "utf8"));
// the model in the pixels of the stack the stand-in draws, so that a place in the image's pixels is one place in both
model.um_per_px *= model.size_px[0] / STACK_PX; model.size_px = [STACK_PX, STACK_PX];
const site = await serve(studies, model);

const browser = await launch(pw), w = world(browser, site.origin);
// the deploy with a Google key, the page offering no sign-in
w.site.withoutGoogleClient();
atStage(browser, "Develop");
let failed = false;
let device, page;
// a page of a device of its own, ready; drafts, keys: what the device keeps before it opens
async function open({ drafts = [], keys = {} } = {}) {
  device = taggersDevice(w).withEditHistoryShown().with({ ...SOFTWARE_3D, acceptDownloads: true }).keepsDrafts(drafts).keeps(keys);
  page = await device.opens("vascular");
}

const doc = () => page.evaluate(() => window.vascular.model().model);
// the actions made, none of them saved yet: the count beside Undo
const count = async () => +(/\d+/.exec(await page.textContent("#gt-unsaved"))?.[0] ?? 0);
const nodeOf = async (id) => (await doc()).nodes.find((n) => n.id === id) ?? (await doc()).edges.flatMap((e) => e.via).find((n) => n.id === id);
const stack = { name: model.source, mimeType: "image/tiff", buffer: drawnStack(model) };
const [W, H] = [model.size_px[0] * model.um_per_px, model.size_px[1] * model.um_per_px];
// Execute has run: Start's Run pressed it
const execute = () => page.waitForFunction(() => !$("#vm-review").hidden);
// the stack opened and, unless told not to, an analysis started on it, its algorithm run
const opened = async (start = true) => { await openFromDrive(page, stack); await page.waitForFunction(() => !$("#vm-run").disabled); if (start) await fromScratch(page, "#vm-run"); await page.evaluate(() => { $("#notice").hidden = true; }); };

try {
  await open();
  await opened();
  await execute();
  await page.selectOption("#gt-areas", "2");
  // the view moved to the area: where its handles are on screen is known once it has drawn there
  await viewDrawn(page);
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

  // Edit History over the stack, and its ring in the study's own colour, which the stack and the model do not carry
  const shown = await page.evaluate(() => { const w = $("#edit-history"), r = w.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + 8);
    return { v3: $("#view").dataset.v3 !== undefined, seen: !w.hidden && getComputedStyle(w).display !== "none" && r.width > 0 && r.height > 0, onTop: w.contains(top),
      rows: [...document.querySelectorAll("#eh-list .what")].map((x) => x.textContent) }; });
  check(shown.v3 && shown.seen && shown.onTop && shown.rows[0] === "Moved a point", `Edit History shows over the 3D view, the move its newest row: ${JSON.stringify(shown)}`);
  await page.hover("#eh-list li.go");
  await page.waitForFunction(() => !document.querySelector(".v3-ring").hidden);
  const ringed = await page.evaluate((id) => { const r = document.querySelector(".v3-ring"), b = r.getBoundingClientRect(), c = $("#mcv").getBoundingClientRect(), p = window.vascular.model().points[id];
    return { in3d: !r.hidden, colour: getComputedStyle(r).borderTopColor, off: Math.hypot(b.left + b.width / 2 - c.left - p[0], b.top + b.height / 2 - c.top - p[1]) }; }, node.id);
  check(ringed.in3d && ringed.colour === "rgb(0, 255, 0)" && ringed.off < 6, `the row's ring is drawn over the stack round the point moved, in the study's green: ${JSON.stringify(ringed)}`);
  await page.mouse.move(cv[0] + 5, cv[1] + 5);

  // a tip dropped on the next point of its own vessel cannot attach there: it has only moved, and the log says so
  const tipOf = await page.evaluate(([W, H]) => {
    const { model, points, kinds, at } = window.vascular.model(), r = $("#mcv").getBoundingClientRect();
    const inArea = (id) => at[id].x > W * 0.05 && at[id].x < W * 0.45 && at[id].y > H * 0.05 && at[id].y < H * 0.45;
    const inView = (p) => p && p[0] > 20 && p[1] > 20 && p[0] < r.width - 20 && p[1] < r.height - 20;
    const deg = new Map();
    for (const e of model.edges) for (const id of [e.a, e.b]) deg.set(id, (deg.get(id) || 0) + 1);
    for (const e of model.edges) for (const [tip, next] of [[e.a, e.via[0]?.id ?? e.b], [e.b, e.via.at(-1)?.id ?? e.a]]) {
      const p = points[tip], q = points[next];
      if (deg.get(tip) === 1 && e.state !== "rejected" && inArea(tip) && inArea(next) && inView(p) && inView(q) && Math.hypot(p[0] - q[0], p[1] - q[1]) > 12) return { tip, next, p, q, kinds: [kinds[tip], kinds[next]] };
    }
    return null;
  }, [W, H]);
  check(!!tipOf, `a tip with the next point of its vessel in view: ${JSON.stringify(tipOf)}`);
  if (tipOf) {
    const had = await count();
    await page.mouse.move(cv[0] + tipOf.p[0], cv[1] + tipOf.p[1]); await page.mouse.down();
    await page.mouse.move(cv[0] + (tipOf.p[0] + tipOf.q[0]) / 2, cv[1] + (tipOf.p[1] + tipOf.q[1]) / 2, { steps: 4 });
    await page.mouse.move(cv[0] + tipOf.q[0], cv[1] + tipOf.q[1], { steps: 4 }); await page.mouse.up();
    const title = await page.getAttribute("#gt-undo", "title");
    check((await count()) === had + 1 && title === "Undo: Moved a point (Ctrl+Z)", `a tip dropped on its vessel's next point is one move, not an attachment: ${title}`);
    await page.click("#gt-undo");
    check((await count()) === had, "and Undo takes it back");
  }

  // the file: every id kept, no clock, the log with it
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#analysis-dl")]);
  const out = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  const move = out.history.actions.find((a) => a.type === "move-node");
  check(out.edges.every((e) => e.segment_ids?.length === e.via.length + 1 && e.via.every((p) => Number.isInteger(p.id))) && out.status === "corrected" && !("corrected_at" in out) && !("corrections" in out),
    "the file carries each segment's and curve point's id, and no clock and no count of corrections");
  check(out.history.replay === "verified" && move?.node === node.id && move.to.x === after.x, `its history replays to it, and names the point by its id: ${JSON.stringify(move && { node: move.node })}`);

  // Save Draft stores the stack's draft on the device; a page opened with it there: Load draft brings the model back and nothing runs
  await page.click("#gt-save-draft");
  await until(page, () => $("#gt-unsaved").hidden);
  const saved = JSON.stringify(await doc());
  const drafts = await storedDrafts(page), { history: filed, ...file } = out;
  check(drafts.length === 1 && drafts[0].study === "vascular" && drafts[0].name === stack.name && JSON.stringify(drafts[0].model) === JSON.stringify(file)
    && JSON.stringify(drafts[0].log) === JSON.stringify(filed.actions), `Save Draft stores the stack's draft on the device: the model and the log of the file: ${JSON.stringify(drafts.map((d) => [d.study, d.name, d.log.length]))}`);
  await device.close();
  await open({ drafts });
  await opened(false);
  await page.waitForFunction(() => $("#annotate-local").checkVisibility());
  check(await page.evaluate(() => !!window.vascular.model().model === false), "a page opened with the draft there offers it, as Continue local work, and shows no model: Execute has not run");
  await page.click("#annotate-local");
  await page.waitForFunction(() => !!window.vascular.model().model);
  check(JSON.stringify(await doc()) === saved && (await page.textContent("#status")).includes("verified") && await page.evaluate(() => !$("#vm-review").hidden), "Load draft brings the model back with its replay verified, and no Execute");

  // the edits kept before Edit History: offered once, as a base, forgotten when a draft holds them
  const run = await doc();
  const meta = { ...model, algorithm: run.algorithm, asked: run.asked };
  const key = oldKey(meta);
  const candidate = run.edges.findIndex((e) => e.state === "candidate");
  const earlier = { ...run, edges: run.edges.map((e, k) => (k === candidate ? { ...e, state: "accepted" } : e)) };
  await device.close();
  await open({ drafts, keys: { [key]: JSON.stringify({ edits: 2, model: earlier }) } });
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
