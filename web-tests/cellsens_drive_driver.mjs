// Drives the page (web/) in headless Chromium on the fixture study, made to open cellSens images, against the
// Google fakes as stand_in_drive.mjs sets them up, serving ROOT, which holds one cellSens pair: scan.vsi and its folder
// _scan_/stack1/frame_t_0.ets. Checks req/shell/image/cellsens: the Google Drive dialog lists the pair as one image row
// and not its folder, and opening that row shows the image whole, its slices and its channels.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/cellsens_drive_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { pressDrive } from "./drive_open.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { open, check, done } = await standIn({ answers, studies, rootDir });
const page = await open(false, { study: { files: { from: ["drive"], accept: ".vsi,.tif,.tiff" } } });

await pressDrive(page);
await page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length > 0);
const rows = await page.$$eval("#remote-list .item .name", (e) => e.map((x) => x.textContent));
check(rows.length === 1 && rows[0] === "scan.vsi", `the dialog lists the pair as one image row, not its folder (${JSON.stringify(rows)})`);

await page.dblclick("#remote-list .item");
const im = await page.waitForFunction(() => {
  const i = shellForTests.page.get("image");
  return i && { W: i.W, H: i.H, Z: i.Z, spacing: i.spacing, names: (i.channels || []).map((c) => c.name) };
}, null, { timeout: 30000 }).then((h) => h.jsonValue(), () => null);
check(im && im.W === 32 && im.H === 32 && im.Z === 3, `the pair opens whole, 32 × 32 px and 3 slices (${JSON.stringify(im)})`);
check(im && im.spacing === 1 && im.names.join() === "DAPI,Iba1", `with its z-step and its channels' names (${JSON.stringify(im)})`);
await done();
