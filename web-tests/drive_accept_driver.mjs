// Drives the remote files dialog in headless Chromium against a Drive fake's folder holding images of several
// kinds. Checks req/shell/drive/dialog: a folder lists its subfolders and the images the study on show opens, by its
// study.json's files.accept: Bookshelf Reader's photos (JPEG, WebP, BMP, PNG, TIFF), the Image Viewer's TIFF and PNG
// alone, neither a kind it cannot open.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_accept_driver.mjs
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { pressDrive } from "./drive_open.mjs";
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Bookshelf Reader's own folder, which its dialog lists, the one the Image Viewer is handed too
const FOLDER = JSON.parse(fs.readFileSync(path.join(repo, "studies", "shelves", "study.json"), "utf8")).root.split("/").pop();
const NAMES = ["a.jpg", "b.JPEG", "c.webp", "d.bmp", "e.png", "f.tif", "g.heic", "h.pdf"];
const { origin, server } = await serveSite({ "/web/worker.js": "" });

const browser = await launch(pw), w = world(browser, origin);
// the deploy with a Google key
w.site.withoutGoogleClient();
let failed = false;
const folder = `https://drive.google.com/drive/folders/${FOLDER}`;
// the Drive fake's folder: a subfolder, and a file of each kind, none of whose bytes is read
const { drive } = w;
drive.folder({ id: "acmesub", name: "sub", parent: FOLDER });
NAMES.forEach((name, k) => drive.file({ id: "acmefile" + k, name, parent: FOLDER, bytes: Buffer.alloc(100), mimeType: "application/octet-stream" }));

// what the dialog lists for the folder in the study at this address; paste: the folder's link, where the dialog takes one
async function listed(id, paste) {
  // the study's own folder becomes the fake's, and the study is shown to anyone
  w.studies.edit(id, (m) => {
    if (m.files.folders) m.files.folders = [folder];
    // shown to everyone, so the page opens it signed out
    m.visibility = "listed";
  });
  const device = w.device(), page = await device.opens(id, { until: "title" });
  await pressDrive(page);
  await page.waitForFunction(() => $("#remote-dlg").open);
  if (paste) { await page.fill("#remote-link", folder); await page.click("#remote-go"); }
  await page.waitForFunction(() => $("#remote-list .item")).catch(async (e) => { console.error("dialog: " + (await page.evaluate(() => [$("#title").textContent, $("#remote-dlg").className, $("#remote-msg").textContent, $("#remote-path").textContent].join(" | ")))); throw e; });
  const names = await page.$$eval("#remote-list .item .name", (rows) => rows.map((r) => r.textContent).sort());
  await device.close();
  return names;
}

const shelves = await listed("shelves", false);
check(JSON.stringify(shelves) === JSON.stringify(["a.jpg", "b.JPEG", "c.webp", "d.bmp", "e.png", "f.tif", "g.heic", "sub"]),
  "Bookshelf Reader lists its subfolders and every photo it opens: JPEG, WebP, BMP, PNG, TIFF and HEIC, no PDF", shelves);
const viewer = await listed("viewer", true);
check(JSON.stringify(viewer) === JSON.stringify(["e.png", "f.tif", "sub"]), "the Image Viewer lists its subfolders, TIFF and PNG alone", viewer);

await browser.close(); server.close();
process.exit(failed ? 1 : 0);
