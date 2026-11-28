// Drives the vascular study's page in a GT stage in headless Chromium against the stand-in worker (stand_in.mjs), on a
// stack drawn here with vessels of known widths: req/vascular/truth/tasks, req/vascular/truth/widths and
// req/vascular/truth/keys. The first area's four steps one after another, each answered by its keys: a faint vessel
// rejected (J), a junction nobody can tell (Q), the slices stepped (, and .) until Nothing else missing turns on (Space),
// then each vessel's width: agreed at half height (F), stepped and agreed (+, F), can't tell (Q), a drawn vessel
// not a vessel (J), Back (B) to one answered before; Area done (Space) moves on, and the export carries every answer.
// Exits 1 on a failed check, 2 when it cannot run.
//   node studies/vascular/tests/vessel_steps_driver.mjs STUDIES [SHOTS_DIR]
import { fromScratch } from "../../../web-tests/annotating.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { serve, atStage, taggersDevice } from "./stand_in.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { frames as framesOf } from "../../../web-tests/page_frames.mjs";
import { pw, launch, check } from "../../../web-tests/harness.mjs";
import { world } from "../../../web-tests/world.mjs";
import { image } from "../../../web-tests/images.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [studies, shots] = process.argv.slice(2);

// The stack: 1300 pixels square at 0.55 µm, six slices; everything lies in the first area of 4 × 4 (0 to 178.75 µm
// each way). Three straight vessels from x = 20 to 110 µm: at y = 40 µm 5 µm wide, whose estimate says 3, at y = 90 µm
// 4 µm wide, at y = 140 µm 3 µm wide, one the person drew. From the first vessel's end at (110, 40) two branches 3 µm
// wide run to (150, 15) and (150, 65), so its end is a junction of three; and a faint vessel from (40, 115) to
// (100, 115), low-confidence.
const UM = 0.55, SIDE = 1300, Z = 6, FOCUS = 2;
const LINES = [
  { a: [20, 40], b: [110, 40], w: 5, r: 1.5 }, { a: [20, 90], b: [110, 90], w: 4, r: 2 }, { a: [20, 140], b: [110, 140], w: 3, drawn: true },
  { a: [110, 40], b: [150, 15], w: 3, r: 1.5 }, { a: [110, 40], b: [150, 65], w: 3, r: 1.5 }, { a: [40, 115], b: [100, 115], w: 3, r: 1.5, faint: true },
];
const distance = ([px, py], { a: [ax, ay], b: [bx, by] }) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const stack = (name) => image.tiff(name, { width: SIDE, height: SIDE, planes: Z, bps: 1, resolution: Array(2).fill([1e6, Math.round(UM * 1e6)]),
  description: `ImageJ=1.54f\nimages=${Z}\nslices=${Z}\nunit=micron\n`,
  value(z, x, y) {
    const p = [(x + .5) * UM, (y + .5) * UM];
    const on = LINES.find((l) => distance(p, l) <= l.w / 2);
    if (!on) return 12;
    return Math.abs(z - FOCUS) <= 1 ? (on.faint ? 90 : 220) : 30;
  } });
// the model the stand-in's Execute answers with: a point per end, the junction's shared
const at = new Map(), node = (p) => { const k = p.join(); if (!at.has(k)) at.set(k, { id: at.size + 1, x: p[0], y: p[1], z: FOCUS }); return at.get(k).id; };
const model = {
  format: "vessel-model/2", status: "draft", source: "acme-steps.tif", slices: Z, size_px: [SIDE, SIDE], um_per_px: UM, z_step_um: 1,
  edges: LINES.map((l, k) => ({ id: k + 1, a: node(l.a), b: node(l.b), via: [],
    ...(l.drawn ? { state: "vessel", drawn: true } : { state: l.faint ? "candidate" : "vessel", proposed: l.faint ? "candidate" : "vessel", confidence: l.faint ? .3 : .9, r_a: l.r, r_b: l.r, taper_known: false }) })),
  reviewed_regions: [],
};
model.nodes = [...at.values()].map((n) => ({ ...n, r: 1.5 }));
const JUNCTION = node([110, 40]);
const site = await serve(studies, model);

const browser = await launch(pw), w = world(browser, site.origin);
atStage(browser, "Develop");
let failed = false;
const device = taggersDevice(w).with({ deviceScaleFactor: 1, acceptDownloads: true });
await standInDrive(await device.context());
let page;

const tasks = () => page.evaluate(() => window.vascular.tasks());
const doc = () => page.evaluate(() => window.vascular.model().model);
const frames = () => framesOf(page);
const button = () => page.evaluate(() => ({ text: $("#area-ok").firstChild.textContent.trim(), off: $("#area-ok").disabled, shown: !$("#area-ok").hidden }));
const edgeOf = (d, a, b) => d.edges.find((e) => (Math.hypot(d.nodes.find((n) => n.id === e.a).x - a[0], d.nodes.find((n) => n.id === e.a).y - a[1]) < 1
  && Math.hypot(d.nodes.find((n) => n.id === e.b).x - b[0], d.nodes.find((n) => n.id === e.b).y - b[1]) < 1)
  || (Math.hypot(d.nodes.find((n) => n.id === e.b).x - a[0], d.nodes.find((n) => n.id === e.b).y - a[1]) < 1
  && Math.hypot(d.nodes.find((n) => n.id === e.a).x - b[0], d.nodes.find((n) => n.id === e.a).y - b[1]) < 1));
const shot = async (name) => { if (shots) { await frames(); await page.screenshot({ path: path.join(shots, name) }); } };
const press = async (k) => { await page.keyboard.press(k); await frames(); };

try {
  page = await device.opens("vascular");
  page.setDefaultTimeout(15000);
  await openFromDrive(page, stack(model.source));
  await page.waitForFunction(() => !$("#vm-run").disabled);
  await fromScratch(page, "#vm-run");
  await page.evaluate(() => { $("#notice").hidden = true; });
  await page.waitForFunction(() => window.vascular.tasks().focused);
  // a click on the image where nothing is, so no button keeps the focus: Space presses a focused one (req/vascular/truth/keys)
  const [vx, vy] = await page.evaluate(() => { const r = $("#mcv").getBoundingClientRect(); return [r.left + 6, r.top + 6]; });
  await page.mouse.click(vx, vy);
  await frames();

  // 1. Doubts: the faint vessel, pictured; J rejects it and the step, its only item, is done
  let t = await tasks();
  check(t.area === 0 && t.step === "doubts" && t.items === 1 && !!t.key, `the area opens on its doubts, the one faint vessel: ${JSON.stringify(t)}`);
  check(await page.evaluate(() => !!$("#task-card canvas") && /Keep/.test($("#task-card .verdict .yes").textContent) && /Reject/.test($("#task-card .verdict .no").textContent)),
    "... pictured in the box, Keep and Reject under it");
  check(await page.evaluate(() => /Doubts/.test($("#step-head").textContent)), "the box says which step it is");
  await shot("step-doubts.png");
  await press("j");
  check(edgeOf(await doc(), [40, 115], [100, 115]).state === "rejected", "J rejects the faint vessel");

  // 2. Junctions: the junction of three, grey and coloured by depth, each arm's depth written; Q says can't tell
  t = await tasks();
  check(t.step === "junctions" && t.key === `j${JUNCTION}`, `with no doubt left the junctions come: ${JSON.stringify(t)}`);
  const card = await page.evaluate(() => ({ pictures: document.querySelectorAll("#task-card canvas").length, arms: document.querySelectorAll("#task-card .arm-z").length,
    can: /Can.t tell/.test($("#task-card .verdict").textContent) }));
  check(card.pictures === 2 && card.arms === 3 && card.can, `the junction is pictured twice, grey and by depth, its three arms' depths written, Can't tell offered: ${JSON.stringify(card)}`);
  await shot("step-junctions.png");
  await press("q");
  let d = await doc();
  check((d.unclear_junctions ?? []).includes(JUNCTION) && !(d.checked_junctions ?? []).includes(JUNCTION), "Q keeps the junction as one nobody can tell");

  // 3. Missed: the slices stepped one at a time; Nothing else missing only once every slice has been seen
  t = await tasks();
  let b = await button();
  check(t.step === "missed" && b.text === "Nothing else missing" && b.off && t.seen === 1 && t.slices === Z,
    `then the look for what was missed, its button off with one slice of ${Z} seen: ${JSON.stringify({ t, b })}`);
  const slab = () => page.evaluate(() => { const S = window.shellForTests.viewer.three.S; return [S.z0, S.z1]; });
  check(JSON.stringify(await slab()) === "[0,0]", `... the view showing one slice: ${await slab()}`);
  // the model's lines through every depth, dimmed, so what is traced shows beside what is not
  // (the 4 µm vessel lies at slice 2: its middle, on the model's canvas, while slice 0 shows)
  const lines = await page.evaluate((id) => {
    const c = $("#mcv"), k = c.width / c.clientWidth, [x, y] = window.vascular.model().points[id] ?? [NaN, NaN];
    const d = testCopy(c).getImageData(Math.floor(x * k) - 3, Math.floor(y * k) - 3, 7, 7).data;
    let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) lit++;
    return { dim: c.classList.contains("dim"), lit };
  }, node([20, 90]));
  check(lines.dim && lines.lit > 0, `... the model's lines still drawn, dimmed, at a depth the slice shown is not: ${JSON.stringify(lines)}`);
  await press("Space");
  check((await tasks()).step === "missed", "Space does nothing while the button is off");
  for (let k = 1; k < Z; k++) await press("Period");
  t = await tasks(); b = await button();
  check(t.seen === Z && !b.off && JSON.stringify(await slab()) === `[${Z - 1},${Z - 1}]`, `stepping through every slice turns the button on: ${JSON.stringify({ t, b })}`);
  await press("Comma");
  check(JSON.stringify(await slab()) === `[${Z - 2},${Z - 2}]`, "comma steps back a slice");
  await shot("step-missed.png");
  await press("Space");
  d = await doc();
  const missed = d.reviewed_regions.find((g) => g.step === "missed");
  check(!!missed && missed.slices_seen === Z && missed.seconds >= 0 && missed.area === 0, `Nothing else missing keeps the area's missed box with what was seen: ${JSON.stringify(missed)}`);
  check(JSON.stringify(await slab()) === `[0,${Z - 1}]`, `... and the view has every slice again: ${await slab()}`);

  // 4. Vessels: each live vessel of the area, its width at half height beside the algorithm's
  t = await tasks();
  check(t.step === "vessels" && t.items === 5, `then the vessels, each of the five left: ${JSON.stringify(t)}`);
  const seen = new Set();
  const widthCard = () => page.evaluate(() => ({ key: window.vascular.tasks().key, measured: +($("#w-measured")?.dataset.um ?? NaN), estimate: $("#w-estimate")?.dataset.um ?? null,
    profile: !!$("#task-card svg.profile"), strip: !!$("#task-card canvas.strip") }));
  let wc = await widthCard();
  check(wc.profile && wc.strip && Number.isFinite(wc.measured), `the vessel's card: straightened, its profile, its width at half height: ${JSON.stringify(wc)}`);
  await shot("step-vessels.png");
  // in the walk's order, each by its middle top to bottom: the upper branch F, the 5 µm vessel + and F, the lower branch
  // Q, the 4 µm vessel J, the drawn one F
  const answered = [];
  for (const keys of [["f"], ["Equal", "f"], ["q"], ["j"], ["f"]]) {
    wc = await widthCard();
    check(!seen.has(wc.key), `each vessel is asked once: ${wc.key}`);
    seen.add(wc.key); answered.push(wc);
    for (const key of keys) await press(key);
  }
  d = await doc();
  const upper = edgeOf(d, [110, 40], [150, 15]), wide = edgeOf(d, [20, 40], [110, 40]), lower = edgeOf(d, [110, 40], [150, 65]);
  const four = edgeOf(d, [20, 90], [110, 90]), drawn = edgeOf(d, [20, 140], [110, 140]);
  check(upper.width?.how === "measured" && Math.abs(upper.width.um - 3) <= .8, `F records the width at half height, near the true 3 µm: ${JSON.stringify(upper.width)}`);
  check(wide.width?.how === "nudge" && Math.abs(wide.width.um - (answered[1].measured + .25)) < 1e-6 && Math.abs(answered[1].measured - 5) <= .8,
    `+ then F records the half-height width, near the true 5 µm and not the estimate's 3, a step wider: ${JSON.stringify(wide.width)} from ${answered[1].measured}`);
  check(lower.width?.how === "unclear" && !("um" in lower.width), `Q records can't tell, with no µm: ${JSON.stringify(lower.width)}`);
  check(four.state === "rejected" && !four.width, `J declines the vessel: ${four.state}`);
  check(drawn.width?.how === "measured", `a vessel the person drew is asked too: ${JSON.stringify(drawn.width)}`);

  // Back: B returns to the vessel answered before
  t = await tasks(); b = await button();
  check(t.step === "vessels" && b.text === "Area done" && !b.off, `every vessel answered, Area done is on: ${JSON.stringify({ t, b })}`);
  await press("b");
  t = await tasks();
  check(t.key === answered[4].key, `B goes back to the vessel answered last: ${t.key} vs ${answered[4].key}`);
  await press("f");
  check((await button()).text === "Area done", "the same answer again moves on");

  // Area done: the area kept and the walk moves to the next one
  await press("Space");
  d = await doc(); t = await tasks();
  check(d.reviewed_regions.some((g) => g.step === "area" && g.area === 0) && t.area === 1, `Space does the area and opens the next: ${JSON.stringify({ area: t.area })}`);

  // the export carries every answer, and still names the algorithm's widths unchecked
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#analysis-dl")]);
  const out = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check((out.unclear_junctions ?? []).includes(JUNCTION) && out.reviewed_regions.some((g) => g.step === "missed") && out.edges.some((e) => e.width?.how === "measured")
    && ["r", "r_a", "r_b", "taper_known"].every((k) => out.unchecked?.includes(k)), "the export carries every answer, the estimates named unchecked");
  check(out.edges.every((x) => !x.width || !("um" in x.width) || x.width.um > 0), "no width is written as a zero");
} catch (err) {
  failed = true; console.error(err);
}
await browser.close(); site.close();
process.exit(failed ? 1 : 0);
