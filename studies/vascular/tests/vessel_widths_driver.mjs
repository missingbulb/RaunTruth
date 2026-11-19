// Drives the vascular study's page in a GT stage in headless Chromium against the stand-in worker (stand_in.mjs), on a
// stack drawn here with vessels of known widths: req/vascular/truth/widths. An area's junctions done, Area is right opens
// its widths step: the area in the stack's own pixels (finer than the 3D view's binned voxels), each vessel's width as
// two rims and a number in µm, magenta while it is the estimate, amber once set; the number keys mean one thing at any
// time: 2 the grey picture alone, 3 the widths beside the model, 4 the area in colour in 3D, the selection kept; resting on a vessel opens a lens; clicking a vessel selects it and a drag sets
// nothing; − and + on the box or the keys step the selected vessel's width, Reset puts back the estimate; These widths
// look right waits for a drawn vessel's width, marks the rest looked at and does the area; the export carries each
// width and still names the estimates unchecked. Exits 1 on a failed check, 2 when it cannot run.
//   node studies/vascular/tests/vessel_widths_driver.mjs STUDIES [SHOTS_DIR]
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { writeTiff } from "../../../web/tiff_file.js";

import { asTagger } from "../../../web-tests/tagger.mjs";
import { serve, atStage, legend, legendKeys } from "./stand_in.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { frames as framesOf } from "../../../web-tests/page_frames.mjs";
import { pw, launch, check } from "../../../web-tests/harness.mjs";
import { orMissed } from "../../../web-tests/page_until.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, "..", "..", "..");
const [studies, shots] = process.argv.slice(2);

// The stack: 1300 pixels square at 0.55 µm, wider than the 3D view draws unbinned, six slices. Three straight vessels
// across the first area of 4 × 4 (0 to 178.75 µm each way): at y = 40 µm 5 µm wide whose estimate says 3, at y = 90 µm
// 4 µm wide whose estimate says 4, and at y = 140 µm one the person drew, with no width; and a patch of one-pixel
// stripes, which only the stack's own pixels show.
const UM = 0.55, SIDE = 1300, Z = 6, FOCUS = 2;
const VESSELS = [{ y: 40, true: 5, r: 1.5 }, { y: 90, true: 4, r: 2 }, { y: 140, true: 3, r: null }];
const X0 = 20, X1 = 150, STRIPES = { x0: 158, x1: 176, y0: 8, y1: 26 };
function stack() {
  const n = SIDE * SIDE, planes = [];
  for (let z = 0; z < Z; z++) {
    const p = new Uint8Array(n).fill(12), near = Math.abs(z - FOCUS) <= 1;
    for (let y = 0; y < SIDE; y++) for (let x = 0; x < SIDE; x++) {
      const ux = (x + .5) * UM, uy = (y + .5) * UM;
      if (ux >= X0 && ux <= X1) for (const v of VESSELS) if (Math.abs(uy - v.y) <= v.true / 2) p[y * SIDE + x] = near ? 220 : 60;
      if (ux >= STRIPES.x0 && ux <= STRIPES.x1 && uy >= STRIPES.y0 && uy <= STRIPES.y1 && x % 2 === 0) p[y * SIDE + x] = 240;
    }
    planes.push(p);
  }
  const res = [1e6, Math.round(UM * 1e6)];
  return Buffer.from(writeTiff({ w: SIDE, h: SIDE, bps: 1, planes, xres: res, yres: res, description: `ImageJ=1.54f\nimages=${Z}\nslices=${Z}\nunit=micron\n` }));
}
// the model the stand-in's Execute answers with: the three vessels as edges through a curve point each
const model = {
  format: "vessel-model/2", status: "draft", source: "acme-widths.tif", slices: Z, size_px: [SIDE, SIDE], um_per_px: UM, z_step_um: 1,
  nodes: VESSELS.flatMap((v, k) => [{ id: 2 * k + 1, x: X0, y: v.y, z: FOCUS, ...(v.r && { r: v.r }) }, { id: 2 * k + 2, x: X1, y: v.y, z: FOCUS, ...(v.r && { r: v.r }) }]),
  edges: VESSELS.map((v, k) => ({ id: k + 1, a: 2 * k + 1, b: 2 * k + 2, state: "vessel", ...(v.r ? { proposed: "vessel", confidence: .9, r_a: v.r, r_b: v.r, taper_known: false } : { drawn: true }),
    via: [{ x: (X0 + X1) / 2, y: v.y, z: FOCUS, ...(v.r && { r: v.r }) }] })),
  reviewed_regions: [],
};
const site = await serve(studies, model);

const browser = await launch(pw);
atStage(browser, "GT");
let failed = false;
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
await asTagger(ctx);
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
await standInDrive(ctx);
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

const look = () => page.evaluate(() => window.vascular.model().widths);
const doc = () => page.evaluate(() => window.vascular.model().model);
const frames = () => framesOf(page);
// the model canvas's pixel at a place on it, [r, g, b]
const pixel = (x, y) => page.evaluate(([x, y]) => { const c = document.querySelector("#mcv"), k = c.width / c.clientWidth;
  return [...testCopy(c).getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data].slice(0, 3); }, [x, y]);
const MAGENTA = ([r, g, b]) => r > 180 && b > 150 && g < 140, AMBER = ([r, g, b]) => r > 180 && g > 110 && b < 90;
const near = (rgb, want) => rgb && want(rgb);
// a vessel of the look by its line's y in µm
const vesselAt = (w, y) => w.vessels.find((v) => Math.abs(v.mid.y - y) < 1);
const edgeAt = (d, y) => d.edges.find((e) => Math.abs(e.via[0].y - y) < 1);
let box = null, cx = 0, cy = 0;
// µm in the look to the page's pixels
const screen = (x, y, w) => [cx + w.rect[0] + (x - w.box.x0) / (w.box.x1 - w.box.x0) * (w.rect[2] - w.rect[0]), cy + w.rect[1] + (y - w.box.y0) / (w.box.y1 - w.box.y0) * (w.rect[3] - w.rect[1])];

try {
  await page.goto(site.origin + "/web/vascular");
  await page.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  await openFromDrive(page, { name: model.source, mimeType: "image/tiff", buffer: stack() });
  await page.waitForFunction(() => !$("#vm-run").disabled);
  await page.evaluate(() => { $("#notice").hidden = true; });
  await page.click("#vm-run");
  await page.waitForFunction(() => !$("#vm-review").hidden);
  await page.click("#gt-start");
  await page.waitForFunction(() => window.vascular.tasks().focused);
  [cx, cy] = await page.evaluate(() => { const r = $("#mcv").getBoundingClientRect(); return [r.left, r.top]; });
  check(await look() == null, "an area opens with the lines over the stack, not its widths");
  // req/vascular/truth/keys: an area with no junction: no F, J or Space in the legend
  let keys = await legendKeys(page);
  check(keys === "1 2 3 4 shift", `in an area without junctions the keys legend lists the views and Panning: ${keys}`);
  const lit = async () => (await legend(page)).filter((r) => r.lit).map((r) => r.key).join(" ");
  // the 3D | 2D row: the half shown, and whether its key is held
  const twoD = () => page.evaluate(() => { const b = $("#key-swap"); return `${b.getAttribute("aria-pressed") === "true" ? "2D" : "3D"}${b.classList.contains("held") ? " held" : ""}`; });
  check(await lit() === "", `the area's own view, the lines over the stack, has no row of its own: ${await lit()}`);
  // 4 held in the junctions step: the area's widths, grey from straight above; let go, the lines over the stack again
  await page.keyboard.down("4"); await frames();
  const peekW = await look(), peekLit = await twoD();
  await page.keyboard.up("4"); await frames();
  check(!!peekW && peekW.vessels.length === 3 && peekLit === "2D held" && await look() == null && (await page.evaluate(() => window.vascular.model().view)) === "overlay",
    `4 held shows the area's widths, its row lit; let go, the area's own view again: ${peekLit}`);
  // W is no key any more
  await page.keyboard.press("w"); await frames();
  check(await look() == null, "W does nothing");

  // Area is right: the area's widths step, the area from above in the stack's own pixels, flattened, grey
  const okText = () => page.evaluate(() => $("#area-ok").firstChild.textContent.trim());
  check(await okText() === "Area is right", `the junctions done, the area's button is Area is right: ${await okText()}`);
  await page.click("#area-ok"); await frames();
  let w = await look();
  check(!!w && w.vessels.length === 3 && w.image && (await page.evaluate(() => window.vascular.model().view)) === "widths", `Area is right opens the area's widths, its three vessels: ${JSON.stringify(w && w.vessels.map((v) => v.label))}`);
  check(await okText() === "These widths look right" && (await page.evaluate(() => window.vascular.tasks().area)) === 0,
    `... in the same area, its button now These widths look right: ${await okText()}`);
  keys = await legendKeys(page);
  check(keys === "1 2 3 4 shift" && await lit() === "", `in the widths step the legend lists the same keys, the step's own view no row's: ${keys}, lit ${await lit()}`);
  const binned = await page.evaluate(() => window.shellForTests.viewer.three.meta.um_per_px);
  {
    // across the stripes, one pixel bright and the next dark: the step shows what the binned 3D view cannot
    const ys = (STRIPES.y0 + STRIPES.y1) / 2, xs = [];
    for (let k = 0; k < 8; k++) { const ux = (Math.ceil(STRIPES.x0 / UM) + 1 + k + .5) * UM; xs.push((await pixel(...screen(ux, ys, w).map((v, i) => v - (i ? cy : cx))))[0]); }
    const flips = xs.slice(1).filter((v, k) => (v > 128) !== (xs[k] > 128)).length;
    check(binned > UM * 1.5 && flips >= 6, `the step is the stack's own ${UM} µm pixels, not the 3D view's ${binned.toFixed(2)} µm voxels: across the stripes ${xs}`);
    const g = await pixel(...screen(55, 40, w).map((v, i) => v - (i ? cy : cx)));
    check(g[0] === g[1] && g[1] === g[2] && g[0] > 128, `... grey, the vessel bright: ${g}`);
  }
  const est = vesselAt(w, 40), even = vesselAt(w, 90), drawn = vesselAt(w, 140);
  check(est.kind === "estimate" && est.label === "3.0 µm" && even.label === "4.0 µm", `each vessel's one width in µm beside it, the estimate's: ${est.label}, ${even.label}`);
  check(drawn.kind === "none" && drawn.label === "?", `a vessel the person drew, with no width, shows "?": ${drawn.kind} ${drawn.label}`);
  {
    const [a, b] = est.rims, rgb = await pixel(...a);
    check(Math.abs(Math.abs(a[1] - b[1]) - 3 / (w.box.y1 - w.box.y0) * (w.rect[3] - w.rect[1])) < 1.5 && near(rgb, MAGENTA), `an unchecked estimate is two magenta rims its width apart: ${rgb}`);
    check(est.span[0] > screen(X0 + 1.5, 40, w)[0] - cx && est.span[1] < screen(X1 - 1.5, 40, w)[0] - cx, `... stopping short of the vessel's ends: ${est.span.map((v) => v.toFixed(0))}`);
  }
  // These widths look right waits for the vessel the person drew
  check(await page.evaluate(() => $("#area-ok").disabled) && /1 vessel you drew/.test(await page.evaluate(() => $("#widths-note").textContent)),
    `These widths look right waits for the width of the vessel the person drew, its line saying so: ${await page.evaluate(() => $("#widths-note").textContent)}`);

  // 2 held: the grey picture alone
  await page.keyboard.down("2"); await frames();
  const bare = await look(), rgbBare = await pixel(...est.rims[0]), greyLit = await lit();
  await page.keyboard.up("2"); await frames();
  check(bare.image && bare.marks === false && !near(rgbBare, MAGENTA) && (await look()).marks, `holding 2 shows the grey picture alone, letting go the rims again: ${rgbBare}`);
  check(greyLit === "2" && await lit() === "", `2 held fills its row of the legend blue, let go grey again: ${greyLit}`);
  // 3 held: the grey picture with the widths beside the model
  await page.keyboard.down("3"); await frames();
  const side = await page.evaluate(() => { const g = $("#wcv")?.getBoundingClientRect(), m = $("#mcv").getBoundingClientRect(), st = window.shellForTests.viewer.three.stage.getBoundingClientRect();
    return { view: window.vascular.model().view, widths: !!window.vascular.model().widths, g: g && g.width > 0 && Math.abs(g.left - st.left) < 2 && g.right <= m.left + 2, m: m.left > st.left + st.width / 3 }; });
  if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, "side.png") }); }
  await page.keyboard.up("3"); await frames();
  check(side.view === "wside" && side.widths && side.g && side.m && !(await page.evaluate(() => $("#wcv")?.isConnected)) && !!(await look()),
    `holding 3 shows the grey picture with the widths in the left half beside the model, letting go the step's view again: ${JSON.stringify(side)}`);

  // resting on a vessel opens the lens beside it, about three slices at its depth, the brightness across it
  const [ex, ey] = screen(70, 40, w);
  await page.mouse.move(ex, ey);
  await orMissed(page.waitForFunction(() => !!window.vascular.model().widths.lens));
  w = await look();
  check(!!w.lens && w.lens.vessel === est.n && w.lens.slices.join() === `${FOCUS - 1},${FOCUS + 1}` && w.lens.profile >= 20 && w.lens.half > 0,
    `resting on a vessel opens its lens, slices ${FOCUS}±1, the brightness across it with half its height: ${JSON.stringify(w.lens)}`);
  if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, "built-lens.png") }); }

  // nothing selected: the box asks for a vessel, with no − or +
  const card = () => page.evaluate(() => ({ text: $("#w-card")?.innerText.replace(/\s+/g, " ").trim() ?? null,
    buttons: ["#w-narrower", "#w-wider", "#w-reset"].map((s) => !!$(s)?.checkVisibility()), keys: ["#w-narrower", "#w-wider", "#w-reset"].map((s) => $(s)?.querySelector("kbd")?.textContent ?? null) }));
  let c = await card();
  check(w.selected == null && /click a vessel/i.test(c.text || "") && c.buttons.every((x) => !x), `nothing selected, the box asks for a click on a vessel: ${JSON.stringify(c)}`);
  await page.keyboard.press("+");
  check(!edgeAt(await doc(), 40).width, "+ with nothing selected sets nothing, the pointer's vessel neither");

  // a drag across a vessel sets nothing: it selects it
  const [ax, ay] = screen(85, 40 - 2.5, w), [bx, by] = screen(86, 40 + 2.5, w);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 6 }); await page.mouse.up();
  let e = edgeAt(await doc(), 40);
  w = await look(); c = await card();
  check(!e.width && w.selected === est.n, `a drag across a vessel sets no width, and selects it: ${JSON.stringify(e.width)} selected ${w.selected}`);
  check(/3\.0 µm/.test(c.text) && c.buttons.every(Boolean) && c.keys.join() === "−,+,⌫", `... the box shows its width with −, + and Reset, each carrying its key: ${JSON.stringify(c)}`);
  check(JSON.stringify((await page.evaluate(() => window.shellForTests.viewer.three.S.rot))) === JSON.stringify(await page.evaluate(() => window.shellForTests.viewer.three.facing(0, 0))), "... and the view never turns");

  // + steps the selected vessel, whatever is under the pointer; − on the box steps it back
  await page.mouse.move(...screen(60, 90, w)); await frames();
  await page.keyboard.press("+");
  e = edgeAt(await doc(), 40);
  check(e.width?.how === "nudge" && Math.abs(e.width.um - 3.25) < 1e-9 && !edgeAt(await doc(), 90).width && e.r_a === 1.5,
    `+ makes the selected vessel 0.25 µm wider than its estimate, not the one under the pointer, the estimate untouched: ${JSON.stringify(e.width)}`);
  w = await look();
  check(vesselAt(w, 40).kind === "set" && near(await pixel(...vesselAt(w, 40).rims[0]), AMBER) && /3\.3 µm|3\.25 µm/.test((await card()).text), `... drawn amber, the box saying so: ${(await card()).text}`);
  await page.click("#w-narrower"); await page.click("#w-narrower");
  e = edgeAt(await doc(), 40);
  check(Math.abs(e.width.um - 2.75) < 1e-9, `− on the box steps it narrower: ${JSON.stringify(e.width)}`);
  // Reset (⌫) puts back the estimate
  await page.keyboard.press("Backspace");
  check(!("width" in edgeAt(await doc(), 40)) && vesselAt(await look(), 40).kind === "estimate", "Reset puts back the estimate");

  // a click on another vessel selects it
  await page.mouse.click(...screen(60, 90, w));
  check((await look()).selected === even.n, `a click on another vessel selects it: ${(await look()).selected}`);
  await page.keyboard.press("-");
  check(Math.abs(edgeAt(await doc(), 90).width.um - 3.75) < 1e-9, "− steps it");

  // 4 held: the area in colour in 3D, the selection kept; V is no key
  await page.keyboard.press("v"); await frames();
  check((await page.evaluate(() => window.vascular.model().view)) === "widths", "V does nothing");
  await page.keyboard.down("4"); await frames();
  const in3d = await page.evaluate(() => window.vascular.model()), held3d = await page.evaluate(() => window.shellForTests.viewer.three.S.held), lit3d = await twoD();
  await page.keyboard.up("4"); await frames();
  const back = await look();
  check(in3d.view === "overlay" && in3d.widths == null && in3d.selected === even.n && !held3d && lit3d === "3D held",
    `holding 4 shows the area in colour in 3D, free to turn, the selection kept: ${JSON.stringify({ view: in3d.view, sel: in3d.selected, held3d, lit3d })}`);
  check(!!back && back.selected === even.n && JSON.stringify(await page.evaluate(() => window.shellForTests.viewer.three.S.rot)) === JSON.stringify(await page.evaluate(() => window.shellForTests.viewer.three.facing(0, 0))),
    "letting 4 go gives the flat view from straight above back, the selection kept");

  // the drawn vessel starts from the median of the others' widths: 3.0 (estimate) and 3.75 (set)
  await page.mouse.click(...screen(100, 140, w));
  await page.keyboard.press("+");
  e = edgeAt(await doc(), 140);
  check(e.width?.how === "nudge" && Math.abs(e.width.um - 3.625) < 1e-9, `+ on a drawn vessel starts from the median of the area's other widths: ${JSON.stringify(e.width)}`);
  // U is no key any more
  await page.keyboard.press("u");
  check(edgeAt(await doc(), 140).width.how === "nudge", "U does nothing");
  check(!(await page.evaluate(() => $("#area-ok").disabled)), "... and These widths look right is on");
  if (shots) { await page.mouse.move(cx + 5, cy + 5); await frames(); await page.screenshot({ path: path.join(shots, "built-widths.png") }); }

  // These widths look right: every width there the person did not set is looked at, and the area done
  await page.keyboard.press("Space"); await frames();
  const d = await doc();
  check(edgeAt(d, 40).width?.how === "looked" && !("um" in edgeAt(d, 40).width) && edgeAt(d, 90).width.how === "nudge" && edgeAt(d, 140).width.how === "nudge",
    `These widths look right marks the widths nobody set looked at, and keeps the ones set: ${[40, 90, 140].map((y) => JSON.stringify(edgeAt(d, y).width))}`);
  check(d.reviewed_regions?.length === 1 && (await page.evaluate(() => window.vascular.tasks().area)) === 1 && await look() == null && await okText() === "Area is right",
    "... does the area and moves on to the next, its junctions first");

  // the export carries each width, and still names the algorithm's unchecked
  await page.click("#gt-submit");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#gt-export")]);
  const out = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check(edgeAt(out, 90).width.um === 3.75 && edgeAt(out, 40).width.how === "looked" && ["r", "r_a", "r_b", "taper_known"].every((k) => out.unchecked?.includes(k)),
    `the export carries each width, the estimates still named unchecked: ${JSON.stringify(out.unchecked)}`);
  check(out.edges.every((x) => !x.width || !("um" in x.width) || x.width.um > 0), "no width is written as a zero");
} catch (err) {
  failed = true; console.error(err);
}
await browser.close(); site.close();
process.exit(failed ? 1 : 0);
