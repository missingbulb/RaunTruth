// Drives the 3D viewer (web/viewer3d.js) in headless Chromium, in the vascular study (viewer image3d), on a drawn
// stack the page reads itself: two channels, the first a bright tube climbing through depth and a
// second one level across it, the second a blob. Checks req/shell/viewer-3d: a stack opens on the 3D view, which draws it; the
// channel rows drive it (hiding a channel or raising its black point darkens it); the toolbar's right holds Look from's
// four buttons in a row beside Zoom, and the image box a row for the slices shown and their spacing and, per channel, Colour by depth; Side turns the view; a sideways scroll turns the picture about the line of sight; a drag turns on past
// looking straight across; the Panning label, at the bottom left with a faded "shift" beside it, toggles panning, shift holds it on, and it is stored nowhere; the depth slab hides slices; the spacing's tooltip says where it came from; no 2D/3D switch
// anywhere. And req/shell/image-viewer: the Image Viewer
// opens a stack in 3D and a flat image (a .png here) in 2D, and keeps its Image box open once either has loaded.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/viewer3d_driver.mjs [SHOT.png]
import { writeTiff } from "../web/tiff_file.js";
import { EARLY } from "./early_messages.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ENGINE, SOFTWARE_3D } from "./engine.mjs";
import { standInDrive, openFromDrive } from "./drive_open.mjs";
import { frames, viewDrawn } from "./page_frames.mjs";
import { pw, launch, check, siteOf } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { STEP } from "./deadlines.mjs";

const [shot] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// the drawn stack, a CD31 channel of a climbing tube and a level one and a DAPI blob, written as a two-channel ImageJ
// hyperstack, DAPI first as the study's originals have it (STACK), and its CD31 flattened as a one-page file (FLAT)
const W = 96, H = 80, Z = 12, n = W * H;
const cd31 = new Uint8Array(Z * n), dapi = new Uint8Array(Z * n);
for (let z = 0; z < Z; z++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = z * n + y * W + x;
  const t = x / (W - 1), climb = Math.hypot(y - (10 + t * 60), z - t * (Z - 1));
  const level = Math.hypot(y - (H - 1 - (x / (W - 1)) * 60), z - 2);
  cd31[i] = Math.max(climb < 2.5 ? 230 : 0, level < 2.5 ? 200 : 0, 8);
  dapi[i] = Math.hypot(x - 70, y - 20, z - 6) < 6 ? 180 : 4;
}
const planes = [];
for (let z = 0; z < Z; z++) for (const c of [dapi, cd31]) planes.push(c.subarray(z * n, (z + 1) * n));
const STACK = Buffer.from(writeTiff({ w: W, h: H, bps: 1, planes, xres: [1, 1], yres: [1, 1],
  description: `ImageJ=1.54f\nimages=${2 * Z}\nchannels=2\nslices=${Z}\nhyperstack=true\nunit=micron\n` }));
const flat = new Uint8Array(n);
for (let z = 0; z < Z; z++) for (let i = 0; i < n; i++) flat[i] = Math.max(flat[i], cd31[z * n + i]);
const FLAT = Buffer.from(writeTiff({ w: W, h: H, bps: 1, planes: [flat] }));
// the stand-in: every study is ready at once
const STAND_IN = `
postMessage({ type: "ready", info: {} });
onmessage = ({ data: m }) => {
  if (m.type === "study") postMessage({ type: "ready", info: {} });
  else if (m.type === "open") postMessage({ type: "held" });
};`;
const { origin, server } = await serveSite({
  "/web/worker.js": () => EARLY + STAND_IN,
  "/web/vendor/wheels.json": "[]",
});

const browser = await launch(pw);
// the drawn stack's levels shown as drawn, so a check can name the colour a voxel gives
siteOf(browser).studies.edit("vascular", (m) => ({ ...m, view: { ...m.view, stretch: false } }));
let failed = false;
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...SOFTWARE_3D });
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
await standInDrive(ctx);
const page = await ctx.newPage();
page.setDefaultTimeout(STEP);

// the 3D view's picture as it is now: mean red, green and blue (0-255), and how many pixels are lit
const picture = async () => { await viewDrawn(page); return pictureNow(); };
const pictureNow = () => page.evaluate(() => {
  const gl = document.querySelector("#v3-gl"), c = document.createElement("canvas");
  c.width = gl.width; c.height = gl.height;
  const g = c.getContext("2d"); g.drawImage(gl, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let r = 0, gr = 0, b = 0, lit = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]; gr += d[i + 1]; b += d[i + 2];
    if (d[i] + d[i + 1] + d[i + 2] > 60) { const x = (i / 4) % c.width, y = Math.floor(i / 4 / c.width); lit++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
  }
  const n = d.length / 4, mx = sx / lit, my = sy / lit;
  // the direction of the lit pixels' long axis on the screen, radians
  const axis = 0.5 * Math.atan2(2 * (sxy / lit - mx * my), sxx / lit - mx * mx - (syy / lit - my * my));
  return { r: r / n, g: gr / n, b: b / n, lit, sum: (r + gr + b) / n, axis };
});
const show = (k, on) => page.evaluate(([k, on]) => { const b = document.querySelector("#show-" + k); b.checked = on; b.dispatchEvent(new Event("change", { bubbles: true })); }, [k, on]);
const level = async (k, which, v) => page.evaluate(([k, which, v]) => {
  const s = document.querySelectorAll("#channels .channel")[k].querySelector("." + which); s.value = v; s.dispatchEvent(new Event("input", { bubbles: true }));
}, [k, which, v]);

try {
  await page.goto(origin + "/web/vascular");
  await page.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  // the 3D view needs WebGL2, which a headless browser may lack: then only the rest is checked
  const gl3d = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  if (gl3d) {
    await openFromDrive(page, { name: "stack.tif", mimeType: "image/tiff", buffer: STACK });
    await page.waitForFunction(() => !$("#v3-stage").hidden);
    check(!(await page.$("#v3-switch, #v3-2d")) && await page.isHidden("#stage"), "a stack opens on the 3D view only, with no 2D/3D switch to flatten it");
    const tools = await page.evaluate(() => {
      const r = $(".toolbar #v3-reset"), zoom = $("#zoom-out").parentElement;
      const z = zoom.getBoundingClientRect(), g = r?.getBoundingClientRect();
      return {
        title: r?.title, label: r?.getAttribute("aria-label"), icon: !!r?.querySelector("svg"), text: r?.textContent.trim(),
        menu: !!document.querySelector("#v3-look, #v3-look-menu, [data-look]"),
        beside: !!g && g.right <= z.left && z.left - g.right < 24 && Math.abs((g.top + g.bottom) / 2 - (z.top + z.bottom) / 2) < 4,
        gone: ["#v3-render-btn", "#v3-depth", "#vm-depth", "#v3-slices-btn"].filter((s) => document.querySelector(s)),
        zoom: ["#zoom-in", "#zoom-out", "#zoom-label"].every((s) => $(s).offsetParent !== null),
      };
    });
    check(tools.title === "Reset view to top" && tools.label === "Reset view to top" && tools.icon && !tools.text && !tools.menu && tools.beside && !(await page.$("#v3-stage #v3-tools")),
      `beside Zoom one icon button, its tooltip Reset view to top, and no menu of views: ${JSON.stringify(tools)}`);
    check(!tools.gone.length, `the toolbar has no Render, Colour by depth or Slices tool: ${tools.gone}`);
    check(tools.zoom && await page.isVisible("#ruler-btn") && await page.isHidden("#grid-btn"), "Zoom and the Ruler stay in 3D, the other 2D tools step aside");
    const z0 = await page.textContent("#zoom-label");
    await page.click("#zoom-in");
    await picture();
    const z1 = await page.textContent("#zoom-label");
    check(parseInt(z1) > parseInt(z0), `Zoom in zooms the 3D view: ${z0} → ${z1}`);
    await page.click("#zoom-out");

    // the Ruler in 3D: a drag on the top slice shown, an orb of the reach while dragging, the ruler alone after
    const rulerNow = async () => { await viewDrawn(page); return rulerShown(); };
    const rulerShown = () => page.evaluate(() => {
      const svg = $("#v3-ruler"), orb = svg?.querySelector("circle.orb"), text = svg?.querySelector("text");
      return { orb: orb ? { r: +orb.getAttribute("r"), fill: getComputedStyle(orb).fill, opacity: +getComputedStyle(orb).fillOpacity } : null,
        line: !!svg?.querySelector("path.mark"), text: text?.textContent || null, pressed: $("#ruler-btn").getAttribute("aria-pressed"),
        from: window.shellForTests.viewer.three.ruler?.from || null };
    });
    const rotNow = () => page.evaluate(() => JSON.stringify(window.shellForTests.viewer.three.S.rot));
    const c3 = await page.evaluate(() => { const b = $("#v3-gl").getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    const rot0 = await rotNow();
    await page.click("#ruler-btn");
    await page.mouse.move(c3[0] - 40, c3[1]); await page.mouse.down();
    await page.mouse.move(c3[0] + 20, c3[1], { steps: 4 }); await page.mouse.move(c3[0] + 40, c3[1], { steps: 4 });
    const live = await rulerNow();
    const topZ = await page.evaluate(() => { const v = window.shellForTests.viewer.three, S = v.S, Zs = v.meta.shape[0]; return v.half[2] * (1 - (2 * S.z0) / Zs); });
    check(live.orb && Math.abs(live.orb.r - 80) < 8 && /rgb\(255, 255, 255\)|url\(/.test(live.orb.fill) && live.line && /^\d+(\.\d+)? µm$/.test(live.text || ""),
      `dragging the 3D ruler shows an orb of the reach, its radius the drag, with the distance in µm: ${JSON.stringify(live)}`);
    check(live.from && Math.abs(live.from[2] - topZ) < 1e-6, `the ruler's first point lies on the top slice shown: ${JSON.stringify(live.from)} vs z ${topZ}`);
    // the same drag read on the stack's middle depth, in its pixels of 1 µm: the top slice, a little nearer, reads a little less
    const midUm = await page.evaluate(([x0, x1, y]) => { const v = window.shellForTests.viewer.three, a = v.toImage({ clientX: x0, clientY: y }), b = v.toImage({ clientX: x1, clientY: y });
      return Math.hypot(b[0] - a[0], b[1] - a[1]); }, [c3[0] - 40, c3[0] + 40, c3[1]]);
    check(Math.abs(parseFloat(live.text) / midUm - 1) < 0.06, `the 3D ruler's distance is the stack's: ${live.text} for ${midUm.toFixed(1)} µm at middle depth`);
    await page.mouse.up();
    const down = await rulerNow();
    check(!down.orb && down.line && down.text === live.text && down.pressed === "true" && await rotNow() === rot0,
      `on release the ruler alone stays, and the drag did not turn the view: ${JSON.stringify(down)}`);
    await page.evaluate(() => { const v = window.shellForTests.viewer.three; v.S.rot = v.facing(0.5, -0.4); v.redraw(); });
    const turnedR = await rulerNow();
    check(turnedR.line && turnedR.text === down.text, `the ruler stays with its distance as the view turns: ${JSON.stringify(turnedR)}`);
    await page.click("#ruler-btn");
    const gone = await rulerNow();
    check(!gone.line && !gone.text && gone.pressed === "false", `pressing the Ruler again takes it away: ${JSON.stringify(gone)}`);
    // Escape mid-drag (req/shell/drag/escape) takes the orb and the ruler away, the ruler still armed, and the release
    // after it neither measures nor turns the view
    await page.click("#v3-reset");
    const rotE = await rotNow();
    await page.click("#ruler-btn");
    await page.mouse.move(c3[0] - 40, c3[1]); await page.mouse.down(); await page.mouse.move(c3[0] + 40, c3[1], { steps: 4 });
    await page.keyboard.press("Escape");
    const esc = await rulerNow();
    await page.mouse.move(c3[0] + 80, c3[1] + 30, { steps: 4 }); await page.mouse.up();
    const escUp = await rulerNow();
    check(!esc.orb && !esc.line && !escUp.orb && !escUp.line && escUp.pressed === "true" && await rotNow() === rotE,
      `Escape mid-drag takes the orb and the ruler away, the ruler still armed, the view unturned: ${JSON.stringify([esc, escUp])}`);
    await page.click("#ruler-btn");
    await page.click("#v3-reset");
    // a study's own canvas over the stack, in its camera, its drags taking every press: an armed ruler measures on it,
    // neither the study's drag nor the view's turn hears the press, and the ruler shows above that canvas
    await page.evaluate(() => {
      const v = window.shellForTests.viewer.three, el = document.createElement("canvas");
      el.id = "test-study-cv"; window.studyGrabs = 0;
      v.place(el); v.controls(el, () => { window.studyGrabs++; return { move() {}, up() {} }; });
    });
    const rotS = await rotNow();
    await page.click("#ruler-btn");
    await page.mouse.move(c3[0] - 40, c3[1]); await page.mouse.down(); await page.mouse.move(c3[0] + 40, c3[1], { steps: 4 }); await page.mouse.up();
    const onStudy = { ...(await rulerNow()), grabs: await page.evaluate(() => window.studyGrabs), turned: await rotNow() !== rotS,
      above: await page.evaluate(([x, y]) => {
        const svg = $("#v3-ruler"); svg.style.pointerEvents = "auto";
        const hit = document.elementFromPoint(x, y); svg.style.pointerEvents = "";
        return !!hit?.closest("#v3-ruler");
      }, c3) };
    check(onStudy.line && onStudy.text && !onStudy.grabs && !onStudy.turned && onStudy.above,
      `over a study's canvas the armed ruler measures, the study's drag and the view's turn never hear it, the ruler above: ${JSON.stringify(onStudy)}`);
    await page.mouse.move(c3[0] - 40, c3[1] + 30); await page.mouse.down(); await page.mouse.move(c3[0], c3[1] + 30, { steps: 4 }); await page.mouse.up();
    check(await page.evaluate(() => window.studyGrabs) === 1, "with the ruler down, the study's canvas takes its drags again");
    await page.click("#ruler-btn");
    await page.evaluate(() => window.shellForTests.viewer.three.place(null));
    await page.click("#v3-reset");
    const slicesRow = await page.evaluate(() => { const r = $("#channels .v3-slices"); return r && !!r.querySelector("#v3-z0") && !!r.querySelector("#v3-z1") && !!r.querySelector("#v3-zs"); });
    check(slicesRow, "the slices shown and their spacing are a row in the image box, under the channels' rows");
    // req/shell/viewer-3d: Colour by depth is each channel's, an icon tick on its own row beside its colour picker, with
    // no row under it; ticked, its colour picker is a palette picker, and two channels by depth take two palettes. The
    // study ticks CD31's from the start.
    if (await page.evaluate(() => $("#image-box").classList.contains("folded"))) { await page.click("#image-box"); await page.waitForFunction(() => !$("#image-box").classList.contains("folded")); }
    const depthRows = () => page.evaluate(() => [...document.querySelectorAll("#channels > .channel:not(.v3-slices)")].map((r) => {
      const tick = r.querySelector(".v3-tick"), pal = r.querySelector(".v3-palette");
      return { name: r.querySelector("label").textContent, tick: tick ? tick.checked : null, under: !!r.nextElementSibling?.matches(".v3-depth-row"),
        picker: pal ? pal.dataset.palette : r.querySelector("input[type=color]") ? "colour" : null, label: tick?.closest(".channel")?.textContent.includes("Colour by depth") };
    }));
    const dep0 = await depthRows();
    check(dep0.every((d) => !d.under && !d.label), `each channel's depth tick is on its own row, an icon with no words, no row under it: ${JSON.stringify(dep0)}`);
    // req/shell/viewer-3d: each row's picker sits at its right edge, its slider filling the room before it; the slices'
    // row carries no count beside its name; a palette picker is framed as the colour picker is
    const lay = await page.evaluate(() => {
      const box = $("#channels").getBoundingClientRect().right, rows = [...document.querySelectorAll("#channels > .channel")];
      const pal = $("#channels .v3-palette"), col = $("#channels input[type=color]");
      return { ends: rows.map((r) => Math.round(box - r.querySelector(".v3-palette, input[type=color], .v3-spin").getBoundingClientRect().right)),
        count: /\bof\b/.test($("#channels .v3-slices .ch-name").textContent),
        frame: [pal && getComputedStyle(pal).borderTopWidth, col && getComputedStyle(col).borderTopWidth] };
    });
    check(lay.ends.every((e) => Math.abs(e) <= 1) && !lay.count && lay.frame[0] === lay.frame[1],
      `pickers anchored right, no slice count, the palette framed as the colour picker: ${JSON.stringify(lay)}`);
    check(dep0.length === 2 && dep0[0].tick === true && !["colour", null].includes(dep0[0].picker) && dep0[1].tick === false && dep0[1].picker === "colour",
      `CD31 opens coloured by depth, its colour picker a palette picker, and DAPI in its colour, each with its own tick: ${JSON.stringify(dep0)}`);
    await page.check("#depth-1");
    const dep1 = await depthRows();
    check(dep1[1].tick && !["colour", null, dep1[0].picker].includes(dep1[1].picker), `ticking DAPI gives it a palette of its own, not CD31's: ${JSON.stringify(dep1)}`);
    const painted = await picture();
    await page.uncheck("#depth-0");
    const plain = await picture(), dep2 = await depthRows();
    check(dep2[0].picker === "colour" && (Math.abs(painted.r - plain.r) > 1 || Math.abs(painted.g - plain.g) > 1 || Math.abs(painted.b - plain.b) > 1),
      `unticking CD31 draws it in its colour again, its picker a colour picker: ${JSON.stringify([dep2, painted, plain])}`);
    await page.check("#depth-0");
    const palWas = (await depthRows())[0].picker, pic0 = await picture();
    await page.click("#channels .channel .v3-palette");
    const offer = await page.evaluate(() => [...document.querySelectorAll(".v3-palettes [data-palette]")].map((b) => ({ p: b.dataset.palette, off: b.disabled })));
    const taken = (await depthRows())[1].picker;
    check(offer.find((o) => o.p === taken)?.off && offer.filter((o) => o.off).length === 1, `CD31's picker offers every palette but DAPI's, ${taken}: ${JSON.stringify(offer)}`);
    const palNew = offer.find((o) => !o.off && o.p !== palWas).p;
    await page.click(`.v3-palettes [data-palette="${palNew}"]`);
    const pic1 = await picture(), palNow = (await depthRows())[0].picker;
    check(palNow === palNew && (Math.abs(pic1.r - pic0.r) > 0.3 || Math.abs(pic1.g - pic0.g) > 0.3 || Math.abs(pic1.b - pic0.b) > 0.3),
      `the palette picker chooses CD31's palette and repaints it: ${palWas} → ${palNow}, ${JSON.stringify([pic0, pic1])}`);
    await page.click("#channels .channel .v3-palette"); await page.click(`.v3-palettes [data-palette="${palWas}"]`);
    await page.uncheck("#depth-1");
    const rows = await page.evaluate(() => [...document.querySelectorAll("#channels > .channel:not(.v3-slices)")].map((r) => r.querySelector("label").textContent));
    check(rows.join() === "CD31,DAPI", `the channel rows are the stack's: ${rows}`);
    await level(0, "black", 0);
    const all = await picture();
    check(all.lit > 500, `the 3D view draws the stack: ${all.lit} lit pixels`);
    if (shot) await page.locator("#view").screenshot({ path: shot });

    await show(0, false);
    const noCd31 = await picture();
    check(noCd31.r < all.r * 0.5, `hiding CD31 takes its red out of the 3D view: red ${all.r.toFixed(1)} → ${noCd31.r.toFixed(1)}`);
    await show(0, true);
    await level(0, "black", 240);
    const dark = await picture();
    check(dark.r < all.r * 0.5, `raising CD31's black point darkens it in 3D: red ${all.r.toFixed(1)} → ${dark.r.toFixed(1)}`);
    await level(0, "black", 0);

    const top = await picture();
    const rot = () => page.evaluate(() => JSON.stringify(window.shellForTests.viewer.three.S.rot));
    const topRot = await rot();
    const gl0 = await page.locator("#v3-gl").boundingBox(), at = [gl0.x + gl0.width / 2, gl0.y + gl0.height / 2];
    await page.mouse.move(...at); await page.mouse.down(); await page.mouse.move(at[0] + 50, at[1] + 30, { steps: 5 }); await page.mouse.up();
    const dragged = await rot();
    await page.click("#v3-reset");
    check(dragged !== topRot && await rot() === topRot, "after a drag, Reset view to top puts the view back to looking straight down");

    const box = await page.locator("#v3-gl").boundingBox(), mid = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(...mid); await page.mouse.wheel(300, 0);
    const rolled = await picture(), turned = Math.abs(Math.atan2(Math.sin(2 * (rolled.axis - top.axis)), Math.cos(2 * (rolled.axis - top.axis))) / 2);
    check(turned > 0.4 && Math.abs(rolled.lit - top.lit) < top.lit * 0.1,
      `a sideways scroll turns the picture about the line of sight: its long axis turns ${turned.toFixed(2)} rad, ${top.lit} → ${rolled.lit} lit pixels`);
    await page.click("#v3-reset");
    await page.mouse.move(...mid); await page.mouse.down();
    await page.mouse.move(mid[0], mid[1] + Math.PI / 0.008, { steps: 20 }); await page.mouse.up();
    const under = await picture();
    check(Math.abs(under.lit - top.lit) < top.lit * 0.15,
      `dragging down by half a turn turns on past looking straight across, to the stack from beneath: ${top.lit} → ${under.lit} lit pixels`);
    await page.click("#v3-reset");

    // the Panning label: always at the bottom of the view, blue outlined while on, grey while off; a click toggles it,
    // shift holds it on until let go, back to what the label holds; and nothing of it is stored
    // (the action log, which records the clicks for a problem report, aside)
    const stored = () => page.evaluate(() => { const l = { ...localStorage }; delete l["nor-actions"]; return JSON.stringify([l, { ...sessionStorage }]); });
    const before = await stored();
    const label = () => page.evaluate(() => {
      const b = $("#v3-pan"), v = $("#v3-stage").getBoundingClientRect(), r = b?.getBoundingClientRect();
      return b && { text: b.textContent.trim(), on: b.getAttribute("aria-pressed") === "true", fill: getComputedStyle(b).backgroundColor, tip: b.title,
        shown: b.checkVisibility(), corner: r.bottom <= v.bottom && v.bottom - r.bottom < 24 && r.left >= v.left && r.left - v.left < 24 };
    });
    const drag = async () => {
      const at = () => page.evaluate(() => { const S = window.shellForTests.viewer.three.S; return JSON.stringify([S.rot, S.pivot]); });
      const [rot0, piv0] = JSON.parse(await at());
      await page.mouse.move(...mid); await page.mouse.down(); await page.mouse.move(mid[0] + 60, mid[1] + 40, { steps: 6 }); await page.mouse.up();
      const [rot1, piv1] = JSON.parse(await at());
      return { turned: JSON.stringify(rot0) !== JSON.stringify(rot1), panned: JSON.stringify(piv0) !== JSON.stringify(piv1) };
    };
    const off = await label();
    check(off && off.text === "Panning" && off.shown && off.corner && !off.on && /press shift to pan/i.test(off.tip),
      `a Panning label shows at the 3D view's bottom left, off, its tooltip saying to press Shift: ${JSON.stringify(off)}`);
    const key = await page.evaluate(() => {
      const b = $("#v3-pan").getBoundingClientRect(), k = $("#v3-pan").nextElementSibling, r = k?.getBoundingClientRect();
      return k && { text: k.textContent.trim(), shown: k.checkVisibility(), color: getComputedStyle(k).color, opacity: getComputedStyle(k).opacity,
        beside: r.left >= b.right && r.left - b.right < 16 && Math.abs((r.top + r.bottom) / 2 - (b.top + b.bottom) / 2) < 4 };
    });
    check(key && key.text === "shift" && key.shown && key.beside && (Number(key.opacity) < 1 || /^rgba\(.*, 0?\.\d+\)$/.test(key.color)),
      `a faded grey "shift" sits right beside the Panning label: ${JSON.stringify(key)}`);
    const d0 = await drag();
    check(d0.turned && !d0.panned, `with panning off a drag turns the view: ${JSON.stringify(d0)}`);
    await page.click("#v3-pan");
    const on = await label();
    check(on.on && on.fill !== off.fill && /^rgba?\(\s*\d{1,2},\s*\d+,\s*2\d\d(,\s*1)?\)$/.test(on.fill), `clicking the label turns panning on, filled blue: ${off.fill} → ${on.fill}`);
    const d1 = await drag();
    check(d1.panned && !d1.turned, `with panning on a drag pans: ${JSON.stringify(d1)}`);
    await page.keyboard.down("Shift"); await page.keyboard.up("Shift");
    check((await label()).on, "pressing and letting go of shift leaves panning on when it was on");
    await page.click("#v3-pan");
    check(!(await label()).on, "clicking the label again turns panning off");
    await page.keyboard.down("Shift");
    const held = await label(), d2 = await drag();
    check(held.on && d2.panned && !d2.turned, `holding shift turns panning on: ${JSON.stringify({ on: held.on, ...d2 })}`);
    await page.keyboard.up("Shift");
    const let_ = await label(), d3 = await drag();
    check(!let_.on && d3.turned && !d3.panned, `letting go of shift returns panning to off: ${JSON.stringify({ on: let_.on, ...d3 })}`);
    const after = await stored(); check(after === before, `the panning state is stored nowhere: ${before} → ${after}`);
    await page.click("#v3-reset");

    await page.evaluate(() => { const s = $("#v3-z1"); s.value = 0; s.dispatchEvent(new Event("input", { bubbles: true })); });
    const slab = await picture();
    check(slab.sum < top.sum * 0.6, `showing only the first slice hides the rest: brightness ${top.sum.toFixed(1)} → ${slab.sum.toFixed(1)}`);

    // req/shell/viewer-3d: who stated the spacing is the spacing's tooltip, and no text sits over the 3D view
    const said = await page.evaluate(() => ({ tip: $("#v3-zs").title, over: [...$("#v3-stage").querySelectorAll("p")].filter((e) => e.checkVisibility() && e.textContent.trim()).map((e) => e.textContent) }));
    check(/owner/i.test(said.tip) && !said.over.length, `the spacing's tooltip says who stated it, and no text is over the view: ${JSON.stringify(said)}`);
    // req/shell/viewer-3d: the spacing reads with its unit, "1 µm", and steps up and down from the keys and its arrows
    const zs = () => page.evaluate(() => $("#v3-zs").value);
    const zs0 = await zs();
    await page.focus("#v3-zs"); await page.keyboard.press("ArrowUp"); const zsUp = await zs();
    await page.click("#v3-zs-down"); const zsDown = await zs();
    await page.fill("#v3-zs", "2.5"); await page.keyboard.press("Enter"); const zsTyped = await zs();
    await page.fill("#v3-zs", zs0.replace(" µm", "")); await page.keyboard.press("Enter");
    check(/^\d+(\.\d+)? µm$/.test(zs0) && parseFloat(zsUp) > parseFloat(zs0) && zsDown === zs0 && zsTyped === "2.5 µm" && await zs() === zs0,
      `the spacing reads in µm and steps: ${JSON.stringify([zs0, zsUp, zsDown, zsTyped])}`);

    // req/shell/ground-truth/history: the Edit History window's ring sits over the stack at its middle depth, and not in the flat layer
    const ringed = await page.evaluate(([x, y]) => {
      const v = window.shellForTests.viewer; v.ring([x - 4, y - 4, x + 4, y + 4]);
      const el = document.querySelector("#v3-stage .v3-ring"), at = v.three.toScreen(x, y);
      return { shown: !el.hidden, left: parseFloat(el.style.left), top: parseFloat(el.style.top), at, flat: !!document.querySelector('#overlay g[data-layer="ring"]') };
    }, [40, 30]);
    check(ringed.shown && !ringed.flat && Math.abs(ringed.left - ringed.at[0]) < 0.5 && Math.abs(ringed.top - ringed.at[1]) < 0.5, `in the 3D view a ring is placed where the stack's middle depth shows the box: ${JSON.stringify(ringed)}`);
    check(await page.evaluate(() => { window.shellForTests.viewer.ring(null); return document.querySelector("#v3-stage .v3-ring").hidden; }), "and ring(null) takes it away");
  } else console.log(`not checked in this ${ENGINE}: the 3D view, which needs the WebGL2 it lacks`);

  // the Image Viewer, at the bare address: the viewer follows the image, and its one step leaves the Image box open
  await page.goto(origin + "/web/");
  await page.waitForFunction(() => window.$ && $("#title").textContent === "Image Viewer" && $("#status").textContent.startsWith("Ready"));
  const loaded = async (name) => {
    await page.setInputFiles("#file", { name, mimeType: "image/tiff", buffer: name.endsWith(".png") ? FLAT : STACK });
    await page.waitForFunction((name) => window.shellForTests.page.get("image")?.name === name && $("#status").textContent === "Image loaded.", name);
    await frames(page);
    return page.evaluate(() => ({ in3d: !!$("#v3-stage")?.checkVisibility(), flat: $("#stage").checkVisibility(), open: !$("#image-box").classList.contains("folded") }));
  };
  if (gl3d) {
    const stack = await loaded("stack.tif");
    check(stack.in3d && !stack.flat, `the Image Viewer opens a stack in 3D: ${JSON.stringify(stack)}`);
    check(stack.open, "the Image Viewer keeps its Image box open once a stack has loaded");
  }
  const png = await loaded("flat.png");
  check(!png.in3d && png.flat, `the Image Viewer opens a flat image in 2D: ${JSON.stringify(png)}`);
  check(!(await page.$("#channels .v3-slices")), "a flat image has no slices' row");
  check(png.open, "the Image Viewer keeps its Image box open once a flat image has loaded");

  await page.goto(origin + "/web/fixture");
  await page.waitForFunction(() => window.$ && $("#title").textContent === "Fixture");
  check(!(await page.$("#v3-switch")), "a 2D study has no 2D/3D switch");

  // a browser without WebGL2: the stack still opens, flattened, its volume there for the study to read
  const noGl = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await noGl.addInitScript(() => {
    delete Navigator.prototype.serviceWorker;
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...rest) { return kind === "webgl2" ? null : get.call(this, kind, ...rest); };
  });
  await standInDrive(noGl);
  const p2 = await noGl.newPage();
  p2.on("pageerror", (e) => { failed = true; console.error("page error, no WebGL2: " + e.message); });
  await p2.goto(origin + "/web/vascular");
  await p2.waitForFunction(() => window.$ && $("#status").textContent.startsWith("Ready"));
  await openFromDrive(p2, { name: "stack.tif", mimeType: "image/tiff", buffer: STACK });
  await p2.waitForFunction(() => window.shellForTests.page.get("image"));
  const seen = await p2.evaluate(() => ({ shape: window.shellForTests.viewer.three?.meta?.shape || null, flat: !$("#stage").hidden, switch: !!$("#v3-switch") }));
  check(seen.shape?.length === 3 && seen.flat && !seen.switch, `with no WebGL2 the stack opens flattened, with no 2D/3D switch, its volume there: ${JSON.stringify(seen)}`);
} catch (e) {
  failed = true; console.error(e);
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
