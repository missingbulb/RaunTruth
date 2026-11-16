// Drives the vascular study's page in a GT stage in headless Chromium against the stand-in worker (stand_in.mjs), on a
// stack drawn here with vessels of known widths: req/vascular/truth/widths. In an open area W shows the widths look,
// the area in the stack's own pixels (finer than the 3D view's binned voxels), each vessel's width as two rims and a
// number in µm, magenta while it is the estimate, amber once set, dotted grey for "cannot"; I held shows the image
// alone; resting on a vessel opens a lens; a drag from wall to wall sets a width, − and + nudge it, U says it cannot
// be told, Backspace puts back the estimate; Area is right waits for a drawn vessel's width and marks the rest looked
// at; the export carries each width and still names the estimates unchecked. Exits 1 on a failed check, 2 when it
// cannot run.
//   node studies/vascular/tests/vessel_widths_driver.mjs STUDIES [SHOTS_DIR]
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { writeTiff } from "../../../web/split.js";
import { offSite } from "../../../web-tests/off_site.mjs";
import { ENGINE, LAUNCH } from "../../../web-tests/engine.mjs";
import { asTagger } from "../../../web-tests/tagger.mjs";
import { serve } from "./stand_in.mjs";
import { standInDrive, openFromDrive } from "../../../web-tests/drive_open.mjs";
import { frames as framesOf } from "../../../web-tests/page_frames.mjs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch {
  try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch { console.error("no playwright: npm i -g playwright"); process.exit(2); }
}
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
const site = await serve(repo, studies, model, "GT");

const browser = await pw[ENGINE].launch(LAUNCH);
let failed = false;
const check = (ok, what) => { if (!ok) { failed = true; console.error("FAILED: " + what); } else console.log("ok: " + what); };
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
await asTagger(ctx);
await ctx.route(offSite(site.origin), (r) => r.abort());
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
await standInDrive(ctx);
const page = await ctx.newPage();
page.on("pageerror", (e) => { failed = true; console.error("page error: " + e.message); });
page.setDefaultTimeout(15000);

const look = () => page.evaluate(() => window.vascular.model().widths);
const doc = () => page.evaluate(() => window.vascular.model().model);
const frames = () => framesOf(page);
// the model canvas's pixel at a place on it, [r, g, b]
const pixel = (x, y) => page.evaluate(([x, y]) => { const c = document.querySelector("#mcv"), k = c.width / c.clientWidth;
  return [...c.getContext("2d").getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data].slice(0, 3); }, [x, y]);
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
  await page.waitForFunction(() => !$("#model-on").hidden);
  await page.click("#gt-start");
  await page.waitForFunction(() => window.vascular.tasks().focused);
  [cx, cy] = await page.evaluate(() => { const r = $("#mcv").getBoundingClientRect(); return [r.left, r.top]; });
  check(await look() == null, "an area opens with the lines over the stack, not the widths look");

  // W: the widths look, the area from above in the stack's own pixels, flattened, grey
  await page.keyboard.press("w"); await frames();
  let w = await look();
  check(!!w && w.vessels.length === 3 && w.image, `W shows the widths look over the area's three vessels: ${JSON.stringify(w && w.vessels.map((v) => v.label))}`);
  const binned = await page.evaluate(() => window.shellForTests.viewer.three.meta.um_per_px);
  {
    // across the stripes, one pixel bright and the next dark: the look shows what the binned 3D view cannot
    const ys = (STRIPES.y0 + STRIPES.y1) / 2, xs = [];
    for (let k = 0; k < 8; k++) { const ux = (Math.ceil(STRIPES.x0 / UM) + 1 + k + .5) * UM; xs.push((await pixel(...screen(ux, ys, w).map((v, i) => v - (i ? cy : cx))))[0]); }
    const flips = xs.slice(1).filter((v, k) => (v > 128) !== (xs[k] > 128)).length;
    check(binned > UM * 1.5 && flips >= 6, `the look is the stack's own ${UM} µm pixels, not the 3D view's ${binned.toFixed(2)} µm voxels: across the stripes ${xs}`);
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

  // I held: the image alone
  await page.keyboard.down("i"); await frames();
  const bare = await look(), rgbBare = await pixel(...est.rims[0]);
  await page.keyboard.up("i"); await frames();
  check(bare.image && bare.marks === false && !near(rgbBare, MAGENTA) && (await look()).marks, `holding I shows the image alone, letting go the rims again: ${rgbBare}`);

  // resting on a vessel opens the lens beside it, about three slices at its depth, the brightness across it
  const [ex, ey] = screen(70, 40, w);
  await page.mouse.move(ex, ey);
  await page.waitForFunction(() => !!window.vascular.model().widths.lens).catch(() => {});
  w = await look();
  check(!!w.lens && w.lens.vessel === est.n && w.lens.slices.join() === `${FOCUS - 1},${FOCUS + 1}` && w.lens.profile >= 20 && w.lens.half > 0,
    `resting on a vessel opens its lens, slices ${FOCUS}±1, the brightness across it with half its height: ${JSON.stringify(w.lens)}`);
  if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, "built-lens.png") }); }

  // a drag from wall to wall sets its width, kept as the walls
  const [ax, ay] = screen(85, 40 - 2.5, w), [bx, by] = screen(86, 40 + 2.5, w);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 6 }); await page.mouse.up();
  let e = edgeAt(await doc(), 40);
  check(e.width?.how === "walls" && Math.abs(e.width.um - 5) < .4 && e.width.walls?.length === 2 && e.r_a === 1.5 && e.r_b === 1.5,
    `a drag from one wall to the other sets the width, its walls kept, the estimate untouched: ${JSON.stringify(e.width)} r_a ${e.r_a}`);
  w = await look();
  const set = vesselAt(w, 40);
  check(set.kind === "set" && set.label === `${e.width.um.toFixed(1)} µm` && near(await pixel(...set.rims[0]), AMBER), `... drawn amber, at the walls measured: ${set.label} ${await pixel(...set.rims[0])}`);
  check(JSON.stringify((await page.evaluate(() => window.shellForTests.viewer.three.S.rot))) === JSON.stringify(await page.evaluate(() => window.shellForTests.viewer.three.facing(0, 0))), "... and the look never turns");

  // + and − step the width under the pointer a quarter of a µm, from the estimate
  await page.mouse.move(...screen(60, 90, w)); await frames();
  await page.keyboard.press("+");
  e = edgeAt(await doc(), 90);
  check(e.width?.how === "nudge" && Math.abs(e.width.um - 4.25) < 1e-9, `+ makes the vessel under the pointer 0.25 µm wider than its estimate: ${JSON.stringify(e.width)}`);
  await page.keyboard.press("-"); await page.keyboard.press("-");
  e = edgeAt(await doc(), 90);
  check(e.width?.how === "nudge" && Math.abs(e.width.um - 3.75) < 1e-9, `− steps it narrower: ${JSON.stringify(e.width)}`);

  // Area is right waits for the vessel the person drew
  check(await page.evaluate(() => $("#area-ok").disabled) && /1 vessel you drew/.test(await page.evaluate(() => $("#widths-note").textContent)),
    `Area is right waits for the width of the vessel the person drew, its line saying so: ${await page.evaluate(() => $("#widths-note").textContent)}`);
  await page.mouse.move(...screen(100, 140, w)); await frames();
  await page.keyboard.press("u");
  e = edgeAt(await doc(), 140);
  w = await look();
  check(e.width?.how === "cannot" && !("um" in e.width) && vesselAt(w, 140).kind === "cannot" && vesselAt(w, 140).label === "?", `U says the width cannot be told: ${JSON.stringify(e.width)}`);
  check(!(await page.evaluate(() => $("#area-ok").disabled)), "... and Area is right is on again");

  // Backspace puts back the estimate
  await page.mouse.move(...screen(110, 40, w)); await frames();
  await page.keyboard.press("Backspace");
  e = edgeAt(await doc(), 40);
  check(!("width" in e) && vesselAt(await look(), 40).kind === "estimate", `Backspace puts back the estimate: ${JSON.stringify(e.width)}`);
  if (shots) { await page.mouse.move(...screen(60, 90, w)); await page.keyboard.press("+"); await page.keyboard.press("-"); await page.mouse.move(cx + 5, cy + 5); await frames(); await page.screenshot({ path: path.join(shots, "built-widths.png") }); }

  // W again: the lines over the stack
  await page.keyboard.press("w"); await frames();
  check(await look() == null, "W again leaves the widths look");

  // Area is right: every width there the person did not set or mark is looked at
  await page.click("#area-ok");
  const d = await doc();
  check(edgeAt(d, 40).width?.how === "looked" && !("um" in edgeAt(d, 40).width) && edgeAt(d, 90).width.how === "nudge" && edgeAt(d, 140).width.how === "cannot",
    `Area is right marks the widths nobody set looked at, and keeps the ones set: ${[40, 90, 140].map((y) => JSON.stringify(edgeAt(d, y).width))}`);

  // the export carries each width, and still names the algorithm's unchecked
  await page.click("#gt-submit");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#gt-export")]);
  const out = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check(edgeAt(out, 90).width.um === 3.75 && edgeAt(out, 40).width.how === "looked" && ["r", "r_a", "r_b", "taper_known"].every((k) => out.unchecked?.includes(k)),
    `the export carries each width, the estimates still named unchecked: ${JSON.stringify(out.unchecked)}`);
  check(out.edges.every((x) => !x.width || x.width.how !== "walls" || x.width.um > 0), "no width is written as a zero");
} catch (err) {
  failed = true; console.error(err);
}
await browser.close(); site.close();
process.exit(failed ? 1 : 0);
