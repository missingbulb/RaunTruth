// Drives the tree's Approve this site… (web/data_mode.js, web/drive.js) in headless Chromium, against the Google fakes
// as stand_in_drive.mjs sets them up, serving ROOT, for a study manager whose token lasts but was never given Drive's per-file
// permission: the click first opens the guide to Google's screens, its Open Google's window asks Google for the
// permission, and once Google gives it every folder Drive's sharing lets the user add to is writable, no folder picked.
// Checks req/shell/data/drive-access and req/shell/account/consent-guide. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_approve_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { orMissed } from "./page_until.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { google, writes, open, role, check, done } = await standIn({ answers, studies, rootDir });
const DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";

const page = await open(true, { scopes: "openid email profile https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.readonly" });
const pickers = [];
page.on("request", (r) => { if (new URL(r.url()).host === "apis.google.com") pickers.push(r.url()); });
const access = () => page.evaluate(() => [...document.querySelectorAll("#data-tree .tree-folder")].map((f) => f.querySelector(":scope > .row .access").textContent));
await role(page, "Study Manager");
await page.waitForFunction(() => !$("#data-approve").hidden);
await check(await page.textContent("#data-approve") === "Approve this site…", "with no per-file permission, the tree's head offers to approve the site", await page.textContent("#data-approve"));
await check((await access()).every((a) => a === "Not approved"), "and every folder reads as not approved", await access());
await page.click("#data-approve");
const g = await page.waitForSelector("#guide-dlg[open]", { timeout: 3000 }).then(() => page.evaluate(() => ({ text: $("#guide-dlg").textContent,
  shots: $("#guide-dlg").querySelectorAll("img").length })), () => null);
if (g) g.asked = google.asked.filter((o) => o.scope?.includes(DRIVE_FILE)).length;
await check(!!g && g.asked === 0, "Approve this site… first opens the guide to Google's screens, asking Google nothing yet", g);
await check(!!g && /unsafe/.test(g.text) && /specific Google Drive files/.test(g.text) && !/click Select\b/.test(g.text) && g.shots >= 3,
  "it shows the unverified-app steps and the per-file box to tick, and no picker", g);
await page.click("#guide-go");
await check(await orMissed(page.waitForFunction(() => !$("#guide-dlg").open, null, { timeout: 5000 })), "Google answering closes the guide");
const asked = google.asked.find((o) => o.scope?.includes(DRIVE_FILE))?.scope ?? null;
await check(!!asked && asked.split(" ").includes(DRIVE_FILE), "Approve this site… asks Google for the per-file permission", asked);
await check(await orMissed(page.waitForFunction(() => $("#data-approve").hidden && [...document.querySelectorAll("#data-tree .tree-folder .access")].every((a) => a.textContent === "Writable"), null, { timeout: 5000 })),
  "then every folder the user may add to is writable, and nothing more is offered", await access());
await check(await orMissed(page.waitForFunction(() => /written now/.test($("#data-index").textContent), null, { timeout: 5000 })) && writes.some(([k, name]) => k === "create" && name === "rauntruth-index.json"),
  "the study index, held until the site was approved, is written then", writes);
await check(!pickers.length, "Google's picker is never loaded", pickers);
await done(0);
