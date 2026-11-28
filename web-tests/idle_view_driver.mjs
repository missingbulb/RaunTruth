// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker, and checks the page before
// an image (req/shell/image/idle, req/shell/load/from): from the first paint, the study's file held back, the
// viewer's tools are greyed out, the Minimap button is not there, there is no Grid, and the empty view holds one plug
// for the project and no instruction; once the study's file is read, the Image box takes the study's form with Drive
// still held; and a menu in the toolbar is greyed out whole until an image opens, and usable once one has.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/idle_view_driver.mjs ANSWERS IMAGE.png STUDIES
import { EARLY } from "./early_messages.mjs";
import { pw, launch, check } from "./harness.mjs";
import { world } from "./world.mjs";
import { serveSite, AS_SERVED } from "./site_server.mjs";
import { held } from "./held.mjs";
import { orMissed } from "./page_until.mjs";

const [answers, image, studies] = process.argv.slice(2);

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
postMessage({ type: "ready", info: A.ready.fixture, heap: 0, files: 0 });
onmessage = ({ data: m }) => {
  if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images }, [images.buffer]); }
};`;
const studyFile = held();
const { origin, server } = await serveSite({
  "/web/worker.js": EARLY + STAND_IN,
  "/web/answers.json": { file: answers },
  "/web/studies.json": { file: studies },
  "/studies/fixture/study.json": async () => { await studyFile.hold(); return AS_SERVED; },
});

const browser = await launch(pw), w = world(browser, origin);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
// the fixture opening from this computer and from Drive, as the Image Viewer does
w.studies.edit("fixture", (m) => ({ ...m, files: { ...m.files, from: ["local", "drive"] } }));
const tagger = w.tagger("fixture");
// Drive answers nothing until the test lets it
const drive = held();
w.drive.hold = () => drive.hold();
const device = w.device().signedInAs(tagger);

const page = await device.opens("fixture", { until: "none" });
await studyFile.asked;

// before the study has arrived
const idle = () => page.evaluate(() => ({
  tools: ["#ruler-btn", "#zoom-in", "#zoom-out"].map((s) => document.querySelector(s).disabled),
  minimap: !document.querySelector("#minimap-btn")?.checkVisibility(),
  grid: !!document.querySelector("#grid-btn, #grid-pop, #grid"),
  middle: document.querySelector("#empty").innerText.trim(),
  link: document.querySelector("#empty a")?.href ?? null,
  load: document.querySelector("#load").checkVisibility({ visibilityProperty: true }),
}));
let at = await idle();
check(at.tools.every(Boolean), "before the study arrives, the Ruler and Zoom are greyed out: " + JSON.stringify(at.tools));
check(at.minimap, "before the study arrives, no Minimap button shows");
check(!at.load, "before the study arrives, the Image box shows no controls to load with, which only the study's form gives");
check(!at.grid, "the viewer has no Grid");
check(at.middle && !/Python|Load /.test(at.middle), "the empty view holds a plug, no instruction or word about Python: " + at.middle);
check(at.middle.split("\n").length === 1, "the plug is one line: " + at.middle);

// the study's file read, Drive still silent: the Image box has the study's form, Drive's
studyFile.release();
const formed = await orMissed(page.waitForFunction(() => document.querySelector("#load")?.hasAttribute("data-remote"), null, { timeout: 5000 }));
check(formed, "the Image box takes the study's form (Google Drive) before Drive answers");
check(await page.evaluate(() => document.querySelector("#file").accept) === ".png", "the file chooser takes the study's types before Drive answers");
drive.release();
w.drive.hold = () => null;
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));

// the plugs: one of a few, chosen afresh on each visit, a link in one going to the project on GitHub
const seen = new Set([at.middle]), links = new Set(at.link ? [at.link] : []);
for (let k = 0; k < 20 && (seen.size < 2 || !links.size); k++) {
  await page.reload(); // visits again on purpose (a reload is the subject): the plug is chosen afresh on each visit
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
  const again = await idle(); seen.add(again.middle); if (again.link) links.add(again.link);
}
check(seen.size > 1, "the plug is chosen afresh on each visit", [...seen]);
check(links.size && [...links].every((h) => h === "https://github.com/missingbulb/RaunTruth"), "a plug's link goes to the project on GitHub", [...links]);

// a menu in the toolbar (the fixture's Show) is greyed out whole while no image is open: a click on it opens nothing
const menu = async () => {
  const sum = page.locator("#fx-show summary"), r = await sum.boundingBox();
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  const got = await page.evaluate(() => { const m = document.querySelector("#fx-show"); return { open: m.open, greyed: m.getAttribute("aria-disabled") === "true" }; });
  await page.evaluate(() => { document.querySelector("#fx-show").open = false; });
  return got;
};
let m = await menu();
check(!m.open && m.greyed, "with no image, a toolbar menu is greyed out and a click on it opens nothing", m);
await page.setInputFiles("#file", image);
await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded.");
m = await menu();
check(m.open && !m.greyed, "with an image open, the toolbar menu opens", m);
at = await idle();
check(!at.tools.some(Boolean), "with an image open, the Ruler and Zoom are usable", at.tools);

await done(0);
