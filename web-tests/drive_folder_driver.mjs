// Drives the Google Drive dialog (web/) in headless Chromium, in three studies: a stand-in fixture whose
// study.json names a Drive folder, the NoR study with the folder its own study.json names, and the Image Viewer,
// which names none. Checks req/shell/drive/dialog: a study's dialog lists its own folder, whatever link was pasted
// elsewhere; the Image Viewer's opens on the link last pasted in it.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_folder_driver.mjs
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { pressDrive, pickRecent } from "./drive_open.mjs";
import { pw, launch, check } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";
import { orMissed } from "./page_until.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const folder = (id) => `https://drive.google.com/drive/folders/${id}`;
const FIXTURE_FOLDER = folder("fixturefolder0000001"), PASTED = folder("pastedfolder00000001");
const NOR_FOLDER = JSON.parse(fs.readFileSync(path.join(repo, "studies", "nor", "study.json"), "utf8")).root;
const { origin, server } = await serveSite({ "/web/worker.js": "" });

const browser = await launch(pw), w = world(browser, origin);
// the deploy with a Google key
w.site.withoutGoogleClient();
w.studies.rootedAt("fixture", FIXTURE_FOLDER.split("/").pop());
let failed = false;
// on the Drive fake every folder is empty: what the dialog opens on is what is checked, not what it lists; listed,
// the folders listed since the test cleared them
const drive = w.drive;
for (const link of [FIXTURE_FOLDER, PASTED]) drive.folder({ id: link.split("/").pop(), name: "A folder", access: "public" });
let listedFrom = 0;
const listed = () => drive.calls.slice(listedFrom).filter((c) => c.kind === "list").map((c) => c.parent);
// resolves at the next folder the dialog lists
const nextListing = () => drive.next((c) => c.kind === "list");
// one device's page, taken to each study's address in turn
const page = await w.device().opens("fixture", { until: "title" });
const visit = async (study) => {
  await page.goto(`${origin}/web/${study ?? ""}`);
  await page.waitForFunction(() => window.$ && $("#title").textContent);
};

// what the Drive dialog opens on, in this study (none: the Image Viewer): the link in its field where it takes one,
// else the link of the folder it lists
const opensOn = async (study) => {
  await visit(study);
  listedFrom = drive.calls.length;
  const listing = nextListing();
  await pressDrive(page);
  await page.waitForFunction(() => $("#remote-dlg").open);
  // the dialog has opened on something: a folder it lists, or the link in its field
  await Promise.race([listing, orMissed(page.waitForFunction(() => window.$ && $("#remote-link")?.checkVisibility() && $("#remote-link").value))]);
  const link = (await page.isVisible("#remote-link")) ? await page.inputValue("#remote-link") : listed().length ? folder(listed().at(-1)) : "";
  await page.click("#remote-dlg button[value=close]");
  return link;
};
const paste = async (study, link) => {
  await visit(study);
  await pressDrive(page);
  await page.fill("#remote-link", link); await page.click("#remote-go");
  await page.waitForFunction(() => !$("#remote-msg").textContent.includes("Reading"));
  await page.click("#remote-dlg button[value=close]");
};

try {
  check(/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]{10,}$/.test(NOR_FOLDER || ""), `the NoR study names its Drive root: ${NOR_FOLDER}`);
  let at = await opensOn("fixture");
  check(at === FIXTURE_FOLDER, `a study's dialog lists the root its study.json names, while the root names no data folder: ${at}`);
  at = await opensOn("nor");
  check(at === NOR_FOLDER, `each study its own: ${at}`);

  // a link pasted in the Image Viewer
  await paste(undefined, PASTED);
  at = await opensOn();
  check(at === PASTED, `the Image Viewer's dialog opens on the link last pasted there: ${at}`);
  at = await opensOn("fixture");
  check(at === FIXTURE_FOLDER, `a link pasted elsewhere leaves a study's folder: ${at}`);
  check(!(await page.evaluate(() => { $("#load-remote").click(); return $("#remote-link").checkVisibility(); })), "and a study's dialog has no link to paste");
} catch (e) {
  failed = true; console.error(e);
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
