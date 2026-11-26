// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from
// ANSWERS (tests/test_study_runs.py), and checks the zoom each image opens at: LARGE, larger than the view, whole in
// it; SMALL, smaller than the view, at 100% and centred; and LARGE again, after zooming in, whole in the view again.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/image_fit_driver.mjs ANSWERS STUDIES LARGE.png SMALL.png
import { EARLY } from "./early_messages.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { pw, launch } from "./harness.mjs";
import { world } from "./world.mjs";
import { serveSite } from "./site_server.mjs";

const [answers, studies, large, small] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
postMessage({ type: "ready", info: A.ready.fixture });
onmessage = ({ data: m }) => { if (m.type === "open") postMessage({ type: "held" }); };`;
const { origin, server } = await serveSite({
  "/web/worker.js": () => EARLY + STAND_IN,
  "/web/answers.json": { file: answers },
  "/web/studies.json": { file: studies },
});

const browser = await launch(pw), w = world(browser, origin);
w.studies.fromThisComputer("fixture");
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); } console.log("ok: " + what); };

const page = await w.device().with({ deviceScaleFactor: 1 }).opens("fixture");
async function open(file) {
  await page.evaluate(() => { document.querySelector("#status").textContent = ""; });
  await page.setInputFiles("#file", file);
  await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");
  return page.evaluate(() => {
    const v = document.querySelector("#scroller").getBoundingClientRect(), b = document.querySelector("#base").getBoundingClientRect();
    return { zoom: st.zoom, W: st.W, H: st.H, left: b.left - v.left, right: v.right - b.right, top: b.top - v.top, bottom: v.bottom - b.bottom,
      fitsW: document.querySelector("#scroller").clientWidth, fitsH: document.querySelector("#scroller").clientHeight };
  });
}
const whole = (o) => o.zoom < 1 && o.W * o.zoom <= o.fitsW + 0.5 && o.H * o.zoom <= o.fitsH + 0.5 &&
  (Math.abs(o.W * o.zoom - o.fitsW) < 1 || Math.abs(o.H * o.zoom - o.fitsH) < 1);

const big = await open(large);
await check(whole(big), "an image larger than the view opens shrunk to fit it", big);
const little = await open(small);
await check(little.zoom === 1 && Math.abs(little.left - little.right) <= 1 && Math.abs(little.top - little.bottom) <= 1,
  "an image smaller than the view opens at 100%, centred", little);
for (let k = 0; k < 3; k++) await page.click("#zoom-in");
const again = await open(large);
await check(whole(again), "the next image opens fitted, whatever the last was zoomed to", again);

await done(0);
