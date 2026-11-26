// Drives Data Management (web/data_mode.js, web/drive.js, web/account.js) in headless Chromium, against the Google fakes
// as stand_in_drive.mjs sets them up, serving ROOT, for a study manager whose token is from before sign-in asked for
// Drive's per-file permission: the first click on a Drive control renews it, Google asked for the permission too, and
// the folders Drive's sharing lets the user add to are writable, none picked or approved; a sign-in whose permission
// Google does not give reads every folder as No permission, saying how to give it. Checks req/shell/data/drive-access and
// req/shell/account/sign-in. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_write_permission_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { orMissed } from "./page_until.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { google, writes, open, dataManagement, check, done } = await standIn({ answers, studies, rootDir });
const DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
const BEFORE = "openid email profile https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.readonly";

// the tree's folders and what each reads, once every one has been read
const access = (page, all) => orMissed(page.waitForFunction((all) => {
  const a = [...document.querySelectorAll("#data-tree .tree-folder")].map((f) => f.querySelector(":scope > .row .access")?.textContent);
  return a.length && a.every((x) => x === all) && a;
}, all, { timeout: 5000 })).then((h) => h && h.jsonValue());

let page = await open(true, { scopes: BEFORE });
const pickers = [];
page.on("request", (r) => { if (new URL(r.url()).host === "apis.google.com") pickers.push(r.url()); });
await dataManagement(page);
const asked = google.asked.map((o) => o.scope).find((s) => s?.split(" ").includes(DRIVE_FILE)) ?? null;
await check(!!asked, "a token from before is renewed on the click opening Data Management, Google asked for the per-file permission too", google.asked);
const writable = await access(page, "Writable");
await check(!!writable, "then every folder the user may add to is writable, none of them picked", writable);
await check(await page.evaluate(() => !document.querySelector("#data-approve, .gt-approve")), "nothing offers to approve the site or its folders");
await check(!pickers.length, "Google's picker is never loaded", pickers);
await page.context().close();

// Google gives the token without the per-file permission, its box left unticked
google.withhold = [DRIVE_FILE];
writes.length = 0;
page = await open(true, { scopes: BEFORE });
await dataManagement(page);
const viewOnly = await access(page, "No permission");
await check(!!viewOnly, "a sign-in without the per-file permission reads every folder as No permission", viewOnly);
const why = await page.getAttribute("#data-tree .tree-folder .access", "title");
await check(/sign out/i.test(why || "") && /tick/i.test(why || "") && !/owner/.test(why || ""), "saying to sign in again ticking the box, not to ask the folder's owner", why);
await check(await orMissed(page.waitForFunction(() => /not written/.test($("#data-index").textContent), null, { timeout: 5000 })) && !writes.length,
  "and writes nothing, saying the study index was not written", writes);
const after = google.asked.length;
await page.click("#user-menu summary"); await page.click("#who-avatar");
await check(google.asked.length === after, "and a later click asks Google nothing more", google.asked.length - after);
await done(0);
