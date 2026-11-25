// Drives req/setup/literature in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT:
// the owner's Study Setup lists the root's Literature folder only when the Literature aspect is chosen, in one listing, each paper a link
// into the store and paired with the site's summary of it by the name the summary gives or by their file names, the summaries no paper
// pairs with after them; and a root with no such folder says so, asking the store nothing. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_literature_driver.mjs ANSWERS STUDIES ROOT [SHOTS]
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { idle } from "./page_until.mjs";
import { held } from "./held.mjs";

const [answers, studies, rootDir, shots] = process.argv.slice(2);
const { w, root, drive, SUB, studyFile, open, check, done } = await standIn({ answers, studies, rootDir });
// the study's images are in a folder of their own, as a study's are: the tree lists that one, never the root's other folders
studyFile({ folders: [SUB] });
const rows = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel + " li")].map((li) => [...li.children].map((c) => c.textContent)), sel);
const listings = (id) => drive.calls.filter((c) => c.kind === "list" && c.parent === id).length;
const literature = async (page) => { await page.click('#setup-rail button[data-aspect="literature"]'); await page.waitForFunction(() => !document.querySelector("#literature-papers").hasAttribute("aria-busy")); await idle(page); };

// no Literature folder in the root
let page = await open(true, { setup: true, scale: shots ? 2 : 1 });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await idle(page);
let before = drive.calls.length;
await literature(page);
await check((await page.evaluate(() => $("#literature-msg").textContent)) === "The study's root has no Literature folder." && !(await rows(page, "#literature-papers")).length
  && !drive.calls.slice(before).some((c) => c.kind === "list"), "a root with no Literature folder says so, and no folder is listed for it", drive.calls.slice(before));
await page.context().close();

// the folder, and the site's summaries: one names its paper, one is alike by file name, one has no paper, and one paper has no summary
const folder = root.folder("Literature");
for (const name of ["Widgets, counted.pdf", "roe-1999-gears.pdf", "An unread paper.pdf"]) folder.holds({ name, bytes: Buffer.from("%PDF-1.4 " + name) });
w.studies.summarised("fixture", [
  { file: "doe-2021-widgets.md", title: "Doe 2021 — Widgets", paper: "widgets, counted.PDF" },
  { file: "roe-1999-gears.md", title: "Roe 1999 — Gears", paper: null },
  { file: "poe-2003-ravens.md", title: "Poe 2003 — Ravens", paper: "Ravens.pdf" },
]);
page = await open(true, { setup: true, scale: shots ? 2 : 1 });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await idle(page);
await check(listings(folder.id) === 0 && !(await rows(page, "#literature-papers")).length, "the Literature folder is not listed as the page opens", listings(folder.id));
// the listing kept back: the place is marked loading and the store's logo turns
const h = held();
drive.hold = (call) => (call.kind === "list" && call.parent === folder.id ? h.hold() : null);
await page.click('#setup-rail button[data-aspect="literature"]');
await h.asked;
const waiting = await page.evaluate(() => ({ busy: $("#literature-papers").getAttribute("aria-busy"), bar: !!$("#literature-papers [role=progressbar]"), chip: document.querySelector('#sb-calls [data-server="store"]')?.textContent.trim() }));
await check(waiting.busy === "true" && waiting.bar && /^Loading from Google Drive/.test(waiting.chip || ""), "while the folder is listed its place says so, and the store's logo turns in the status bar", waiting);
drive.hold = () => null; h.release();
await page.waitForFunction(() => !$("#literature-papers").hasAttribute("aria-busy"));
await idle(page);
const papers = await rows(page, "#literature-papers");
await check(JSON.stringify(papers) === JSON.stringify([["An unread paper.pdf", "no summary in the repo"], ["roe-1999-gears.pdf", "Roe 1999 — Gears", "summary"], ["Widgets, counted.pdf", "Doe 2021 — Widgets", "summary"]]),
  "its papers by name: one paired by the name its summary gives, one by the two file names, one with no summary", papers);
await check(listings(folder.id) === 1, "... from one listing of the folder", listings(folder.id));
const links = await page.evaluate(() => [...document.querySelectorAll("#literature-papers a")].map((a) => [a.href, a.target, a.rel]));
const ids = drive.calls.length && (await page.evaluate(() => [...document.querySelectorAll("#literature-papers a")].map((a) => a.href.match(/\/file\/d\/([^/]+)/)?.[1])));
await check(links.length === 3 && links.every(([href, target, rel]) => href.startsWith("https://drive.google.com/file/d/") && target === "_blank" && /noopener/.test(rel)) && new Set(ids).size === 3,
  "each a link that opens its own file in the store in a new page", links);
const alone = await rows(page, "#literature-summaries");
await check(!(await page.evaluate(() => $("#literature-orphans").hidden)) && JSON.stringify(alone) === JSON.stringify([["Poe 2003 — Ravens", "Ravens.pdf"]]), "the summary no paper pairs with is listed after them", alone);
if (shots) await page.screenshot({ path: path.join(shots, "literature.png") });
// chosen again, listed again, once
await page.click('#setup-rail button[data-aspect="images"]');
await literature(page);
await check(listings(folder.id) === 2 && (await rows(page, "#literature-papers")).length === 3, "chosen again, the folder is listed once more", listings(folder.id));
await done(0);
