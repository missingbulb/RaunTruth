// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from ANSWERS
// (tests/test_study_runs.py), and checks what the shell does at a point of the image for every study: the right-click
// menu of the study's items there, opened at the pointer with its first item focused, closed by an item, Escape, a
// press off it and the user's wheel, and left open by a glide of the page's own (req/shell/image/menu); and a box
// framed, the zoom changed only when more than half again too far in or out, at most 800%, the box's middle glided to
// the view's middle (req/shell/image/frame). Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/image_point_driver.mjs ANSWERS IMAGE.png STUDIES
import { EARLY } from "./early_messages.mjs";

import { localStudy } from "./local_study.mjs";
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { STEP } from "./deadlines.mjs";

const [answers, image, studies] = process.argv.slice(2);

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
postMessage({ type: "ready", info: A.ready.fixture, heap: 0, files: 0 });
onmessage = async ({ data: m }) => {
  if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images }, [images.buffer]); }
};`;
const { origin, server } = await serveSite({
  "/web/worker.js": EARLY + STAND_IN,
  "/web/answers.json": { file: answers },
  "/web/studies.json": { file: studies },
});

const browser = await launch(pw);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };

// a small window, so the fixture's small image overflows the view once zoomed in
const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
await localStudy(ctx, "fixture");
await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
const page = await ctx.newPage();
page.setDefaultTimeout(STEP);
await page.goto(origin + "/web/fixture");
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
await page.setInputFiles("#file", image);
await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");

// the view at rest: its scroll and zoom unmoved for five frames running
const rest = () => page.waitForFunction(() => {
  const sc = $("#scroller"), at = [sc.scrollLeft, sc.scrollTop, st.zoom].join();
  window.still = window.lastAt === at ? (window.still || 0) + 1 : 0; window.lastAt = at;
  return window.still >= 5;
}, null, { polling: "raf" });
const view = () => page.evaluate(() => { const sc = $("#scroller"); return { zoom: st.zoom, x: sc.scrollLeft, y: sc.scrollTop }; });
const menu = () => page.evaluate(() => {
  const m = document.querySelector("#point-menu"), r = m?.getBoundingClientRect();
  return m && { shown: !m.hidden && m.checkVisibility(), role: m.getAttribute("role"), items: [...m.querySelectorAll('[role="menuitem"]')].map((b) => b.textContent),
    focused: document.activeElement?.closest?.("#point-menu") === m, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
});
// the screen point of an image point
const screen = (x, y) => page.evaluate(([x, y]) => { const b = $("#base").getBoundingClientRect(); return [b.left + x * st.zoom, b.top + y * st.zoom]; }, [x, y]);
const noted = () => page.textContent("#status");

// ---------- the menu ----------
await page.evaluate(() => { shellForTests.viewer.setZoom(4); $("#scroller").scrollTo({ left: 0, top: 0, behavior: "instant" }); });
await rest();
let [sx, sy] = await screen(20, 15);
await page.mouse.click(sx, sy, { button: "right" });
let m = await menu();
check(m?.shown && m.role === "menu" && m.items.join() === "Note this point", "a right click on the image opens the shell's menu of the study's items there", m);
check(m?.focused && Math.abs(m.left - sx) <= 2 && Math.abs(m.top - sy) <= 2, "at the pointer, its first item focused", [m, sx, sy]);
await page.keyboard.press("Escape");
check(!(await menu()).shown, "Escape closes it");

await page.mouse.click(sx, sy, { button: "right" });
await page.mouse.click(5, 5);
check(!(await menu()).shown && !/Noted/.test(await noted()), "a press off it closes it, and nothing is done");

await page.mouse.click(sx, sy, { button: "right" });
await page.mouse.wheel(0, 40);
await page.waitForFunction(() => document.querySelector("#point-menu").hidden, null, { timeout: 2000 }).catch(() => {});
check(!(await menu()).shown, "the user's wheel over the image closes it");
await rest();

// near the window's corner it opens wholly inside the window
await page.evaluate(() => { shellForTests.viewer.setZoom(16); $("#scroller").scrollTo({ left: 0, top: 0, behavior: "instant" }); });
await rest();
const corner = await page.evaluate(() => { const v = $("#scroller").getBoundingClientRect(); return [v.right - 3, v.bottom - 3]; });
await page.mouse.click(...corner, { button: "right" });
m = await menu();
check(m?.shown && m.right <= 900 && m.bottom <= 640, "near the window's corner it opens inside the window", m);
await page.keyboard.press("Escape");

// the page's own glide, under way when the right click lands, leaves the menu open, and its item acts on the point clicked
await page.evaluate(() => $("#scroller").scrollTo({ left: 0, top: 0, behavior: "instant" }));
await rest();
[sx, sy] = await screen(20, 15);
await page.evaluate(() => shellForTests.viewer.focus(st.W, st.H));
await page.waitForFunction(() => $("#scroller").scrollTop > 0, null, { polling: "raf" });
await page.evaluate(() => addEventListener("contextmenu", (e) => { const [x, y] = shellForTests.viewer.toImage(e); window.clicked = `${Math.round(x)}, ${Math.round(y)}`; }, { capture: true, once: true }));
await page.mouse.click(sx, sy, { button: "right" });
const at = await page.evaluate(() => window.clicked);
await rest();
check((await menu()).shown, "a right click while the page glides the view keeps its menu open once the view rests");
await page.click('#point-menu [role="menuitem"]');
check(!(await menu()).shown, "choosing an item closes the menu");
check((await noted()) === "Noted " + at, `the item acts on the image point clicked (${at})`, await noted());

// a point the study offers nothing at opens no menu
await page.evaluate(() => { shellForTests.viewer.setZoom(1); });
await rest();
const off = await page.evaluate(() => { const b = $("#base").getBoundingClientRect(), v = $("#scroller").getBoundingClientRect(); return [Math.min(b.right + 20, v.right - 5), Math.min(b.bottom + 20, v.bottom - 5), b.right < v.right - 25]; });
if (check(off[2], "the whole image fits the view at 100%, with room beside it", off)) {
  await page.mouse.click(off[0], off[1], { button: "right" });
  check(!(await menu()).shown, "off the image, where the study offers nothing, no menu opens");
  await page.mouse.click(5, 5);
}

// ---------- framing ----------
const frame = (box, fill) => page.evaluate(([box, fill]) => shellForTests.viewer.frame(box, fill), [box, fill]);
// the zoom at which the box fills that much of the view, at most 800%
const fitOf = (box, fill) => page.evaluate(([[x0, y0, x1, y1], fill]) => { const sc = $("#scroller"); return Math.min(8, fill * Math.min(sc.clientWidth / (x1 - x0), sc.clientHeight / (y1 - y0))); }, [box, fill]);
const small = [10, 10, 20, 20];
await page.evaluate(() => shellForTests.viewer.setZoom(1));
await rest();
await frame(small, 0.6); await rest();
let v = await view();
check(v.zoom === 8, "a small box far too small in the view is zoomed in to, at most 800%", v);
const middle = await page.evaluate(([x, y]) => { const sc = $("#scroller"), b = $("#base").getBoundingClientRect(), r = sc.getBoundingClientRect();
  return { dx: b.left + x * st.zoom - (r.left + sc.clientWidth / 2), dy: b.top + y * st.zoom - (r.top + sc.clientHeight / 2), maxX: sc.scrollWidth - sc.clientWidth, maxY: sc.scrollHeight - sc.clientHeight, x: sc.scrollLeft, y: sc.scrollTop }; }, [15, 15]);
check((Math.abs(middle.dx) <= 1.5 || middle.x === 0 || middle.x >= middle.maxX - 1) && (Math.abs(middle.dy) <= 1.5 || middle.y === 0 || middle.y >= middle.maxY - 1),
  "and its middle glided to the view's middle, as near as the image's edges let it", middle);

const whole = [0, 0, 80, 60], fit = await fitOf(whole, 0.6);
for (const [z, moves, what] of [
  [fit * 1.5, false, "exactly half again too far in, the zoom is left as it is"],
  [fit / 1.5, false, "exactly half again too far out, the zoom is left as it is"],
  [fit * 1.2, false, "a zoom inside the band is left as it is"],
  [fit * 1.6, true, "more than half again too far in, it zooms out to the fill"],
  [fit / 1.6, true, "more than half again too far out, it zooms in to the fill"],
]) {
  await page.evaluate((z) => shellForTests.viewer.setZoom(z), z);
  await rest();
  const was = (await view()).zoom;
  await frame(whole, 0.6); await rest();
  v = await view();
  check(moves ? Math.abs(v.zoom - fit) < 1e-9 : v.zoom === was, what, { fit, was, now: v.zoom });
}
await done(0);
