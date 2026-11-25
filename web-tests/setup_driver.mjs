// Drives req/setup/page in headless Chromium against the stand-in Google of stand_in_drive.mjs serving ROOT: Study Setup
// is the site page /setup?study=<id>, opened from the avatar's menu by those Drive lets write the study's root, online
// only; the study's own page keeps nothing of it. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { idle } from "./page_until.mjs";
import { expecting, NETWORK_GONE } from "./harness.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { drive, open, check, done } = await standIn({ answers, studies, rootDir });
const T = "t@example.com";

// the owner, on the study's own page: its menu offers Study Setup, and the page holds nothing of Data Management
let page = await open(true);
await check(await page.evaluate(() => !document.querySelector('[id^="data-"], #open-data, #folder-view, #folder-box, #tags-box, #gt-setup, #gt-box')),
  "the study's page has none of Data Management's elements in its DOM");
await page.click("#user-menu summary");
await page.waitForSelector("#open-setup:not([hidden])");
const item = await page.evaluate(() => [$("#open-setup").textContent.trim(), $("#open-setup").getAttribute("href")]);
await check(item[0] === "Study Setup…" && item[1] === "setup?study=fixture", "the avatar's menu holds Study Setup…, pointing at the setup page of this study", item);
const here = page.url();
const [setup] = await Promise.all([page.waitForEvent("popup"), page.click("#open-setup")]);
await check(page.url() === here, "it opens in a new page, the study's own staying where it was", page.url());
page = setup;
await page.waitForFunction(() => document.querySelector("#status")?.textContent.startsWith("Ready"));
await check(await page.evaluate(() => location.pathname === "/web/setup" && location.search === "?study=fixture"), "it opens /setup?study=fixture", await page.evaluate(() => location.href));
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length === 2);
await check(await page.evaluate(() => document.documentElement.dataset.mode === "data" && !$("#data-col").hidden), "the setup page shows the study's folders");
await check(await page.evaluate(() => $("#title").textContent !== "" && document.title !== ""), "under the study's own title");
await page.context().close();

// someone Drive does not let write the root: no item in the menu, and the setup page, reached by its address, says whom it is for
page = await open(true, { email: T });
await idle(page);
await page.click("#user-menu summary");
await check(await page.evaluate(() => !$("#open-setup") || $("#open-setup").hidden), "someone who may not write the root is offered no Study Setup");
await page.context().close();
page = await open(true, { email: T, setup: true });
await idle(page);
const note = await page.evaluate(() => [$("#data-col").hidden, $("#setup-note").hidden, $("#setup-note").textContent]);
await check(note[0] && !note[1] && /may write/.test(note[2]), "and its address says it is for those who may write the root", note);
await page.context().close();

// offline: it says it needs the internet and asks Drive nothing
const was = drive.calls.length;
page = await open(true, { setup: true, prepare: (ctx) => ctx.addInitScript(() => { window.down = true; Object.defineProperty(Navigator.prototype, "onLine", { get: () => !window.down }); }) });
await idle(page);
const off = await page.evaluate(() => [$("#data-col").hidden, $("#setup-note").hidden, $("#setup-note").textContent]);
await check(off[0] && !off[1] && /needs the internet/i.test(off[2]), "offline, the page says Study Setup needs the internet", off);
await check(drive.calls.length === was, "and it makes no Drive call", drive.calls.slice(was).map((c) => [c.kind, c.id]));
// the network back: the page reads the study's folders, as one opened with it does
await page.evaluate(() => { window.down = false; window.dispatchEvent(new Event("online")); });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length === 2 && $("#setup-note").hidden);
await check(await page.evaluate(() => !$("#data-col").hidden), "once the network is back, the page shows the study's folders");
await page.context().close();

// the network gone and back while the folders are on show: they stay on show
page = await open(true, { setup: true });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length === 2);
await expecting(NETWORK_GONE, async () => {
  await page.context().setOffline(true);
  await page.waitForFunction(() => document.documentElement.classList.contains("offline"));
  await page.context().setOffline(false);
  await page.waitForFunction(() => !document.documentElement.classList.contains("offline"));
  await idle(page);
}, { maybe: true });
const stays = await page.evaluate(() => [document.documentElement.dataset.mode, $("#data-col").hidden, $("#open-setup").hidden]);
await check(stays[0] === "data" && !stays[1] && !stays[2], "the network gone and back, Study Setup still shows the folders and its way out", stays);
await done(0);
