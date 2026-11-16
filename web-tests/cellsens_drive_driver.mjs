// Drives the page (web/) in headless Chromium on the fixture study, made to open cellSens images, against the
// stand-in Google of stand_in_drive.mjs serving ROOT, which holds one cellSens pair: scan.vsi and its folder
// _scan_/stack1/frame_t_0.ets. Checks req/shell/image/cellsens: the Google Drive dialog lists the pair as one image row
// and not its folder, and opening that row shows the image whole, its slices and its channels.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/cellsens_drive_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { pressDrive } from "./drive_open.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// jsDelivr's OpenJPEG, served from web-tests/node_modules: its /+esm wrapper stood in for by the package's own file
// with the export the wrapper adds
const OPENJPEG = "https://cdn.jsdelivr.net/npm/@cornerstonejs/codec-openjpeg@1.3.6/dist/";
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "node_modules", "@cornerstonejs", "codec-openjpeg", "dist");
if (!fs.existsSync(dist)) { console.error("no OpenJPEG: npm i --prefix web-tests @cornerstonejs/codec-openjpeg@1.3.6"); process.exit(2); }
const openjpeg = (ctx) => ctx.route(OPENJPEG + "**", (r) => {
  const file = new URL(r.request().url()).pathname.split("/dist/")[1].replace(/\/\+esm$/, "");
  const body = fs.readFileSync(path.join(dist, file));
  return r.request().url().endsWith("/+esm")
    ? r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "text/javascript", body: body + "\nexport default OpenJPEGWASM;\n" })
    : r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "application/wasm", body });
});

const [answers, studies, rootDir] = process.argv.slice(2);
const { open, check, done } = await standIn({ answers, studies, rootDir });
const page = await open(false, { study: { files: { from: ["drive"], accept: ".vsi,.tif,.tiff" } }, prepare: openjpeg });

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
