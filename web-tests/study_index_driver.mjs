// Drives a study's listed folders and its study index (req/shell/data/folders, req/shell/data/index,
// req/shell/load/study-images) in headless Chromium on the fixture study, against the stand-in Google of
// stand_in_drive.mjs serving ROOT: a Data folder the study file names, a subfolder in it, and an Other folder.
// Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/study_index_driver.mjs ANSWERS STUDIES ROOT [SHOTS]
import { standIn } from "./stand_in_drive.mjs";
import { frames } from "./page_frames.mjs";
import path from "node:path";

const [answers, studies, rootDir, shots] = process.argv.slice(2);
const indexes = [];
const { ROOT, FILES, hidden, writes, open, role, check, done } = await standIn({ answers, studies, rootDir,
  uploaded: (f) => { if (f.name === "rauntruth-index.json") indexes.push(JSON.parse(f.bytes.toString())); } });
const idOf = (name) => FILES.find((f) => f.name === name).id;
// the study file names the Data folder, and is the page's own, as one its Set up wrote
const settings = FILES.find((f) => f.name === "rauntruth-study.json");
settings.mine = true;
settings.bytes = Buffer.from(JSON.stringify({ ...JSON.parse(settings.bytes.toString()), data: idOf("Data") }));
// a folder elsewhere in Drive, shared with the study manager alone
FILES.push({ id: "dmelsewhere000000001", name: "Elsewhere", parent: "someone", folder: true, bytes: null, mine: false, props: {}, modified: "2026-11-05T07:00:00Z" },
  { id: "dmelsewherefile00001", name: "delta.png", parent: "dmelsewhere000000001", folder: false, bytes: FILES.find((f) => f.name === "acme.png").bytes, mine: false, props: {}, modified: "2026-11-05T07:00:00Z" });
hidden.add("dmelsewhere000000001");
const studyFile = () => JSON.parse(settings.bytes.toString());
const names = (ix) => ix.images.map((i) => [i.name, i.path.join(" / ")]);
const settled = (page) => page.waitForFunction(() => !document.querySelector("#data-tree.busy") && /^Study index/.test(document.querySelector("#data-index").textContent), null, { timeout: 10000 }).catch(() => {});

let page = await open(true);
await role(page, "Study Manager");
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length === 2);
await settled(page);
await check(indexes.length === 1 && JSON.stringify(names(indexes[0])) === JSON.stringify([["acme.png", "Data"], ["beta.png", "Data / sub"]])
  && indexes[0].built_by === "tester@example.com" && JSON.stringify(indexes[0].folders) === JSON.stringify([{ id: idOf("Data"), name: "Data" }]),
  "entering Data Management writes the index: the listed folder's images, with their paths", indexes.map(names));
const tree = () => page.evaluate(() => ({
  listed: [...document.querySelectorAll("#data-tree > .tree-folder")].map((f) => f.querySelector(":scope > .row .name").textContent),
  unlisted: [...document.querySelectorAll("#data-unlisted .unlisted-folder .name")].map((n) => n.textContent) }));
await check(JSON.stringify(await tree()) === JSON.stringify({ listed: ["Data"], unlisted: ["Other"] }), "the tree shows the listed folder, and the root's other folder as not in the study", await tree());

await page.click('#data-unlisted .unlisted-folder:has-text("Other") .add');
await page.waitForFunction(() => document.querySelectorAll("#data-tree > .tree-folder").length === 2);
await settled(page);
await check(JSON.stringify(studyFile().folders) === JSON.stringify([idOf("Data"), idOf("Other")]) && studyFile().review === true && !!studyFile().curated,
  "Add to study writes the folder into the study file, every other key kept", studyFile());
await check(indexes.length === 2 && names(indexes[1]).some(([n, p]) => n === "gamma.png" && p === "Other"), "and the index again, with its images", indexes.map(names));

await page.fill("#data-add-link", "https://drive.google.com/drive/folders/dmelsewhere000000001");
await page.click("#data-add");
await page.waitForFunction(() => document.querySelectorAll("#data-tree > .tree-folder").length === 3);
await settled(page);
await check(studyFile().folders.includes("dmelsewhere000000001"), "a pasted folder link adds that folder", studyFile());
if (shots) await page.locator("#data-col").screenshot({ path: path.join(shots, "data-management.png") });
await check(/Anyone with the link/.test(await page.textContent("#data-msg")), "and the page says a viewer cannot read it, not being shared as Anyone with the link", await page.textContent("#data-msg"));

await page.evaluate(() => [...document.querySelectorAll("#data-tree > .tree-folder")].find((f) => f.querySelector(":scope > .row .name").textContent === "Other").querySelector(":scope > .row .unlist").click());
await page.waitForFunction(() => document.querySelectorAll("#data-tree > .tree-folder").length === 2);
await settled(page);
await check(JSON.stringify(studyFile().folders) === JSON.stringify([idOf("Data"), "dmelsewhere000000001"]), "Remove from study takes it out of the study file", studyFile());
const last = indexes.at(-1);
await check(!names(last).some(([n]) => n === "gamma.png") && names(last).some(([n, p]) => n === "delta.png" && p === "Elsewhere"), "and out of the index", names(last));

// nothing changed: going back into Data Management writes no index
const before = indexes.length;
await role(page, "Viewer");
await role(page, "Study Manager");
await page.waitForFunction(() => document.querySelectorAll("#data-tree > .tree-folder").length === 2);
await settled(page);
await frames(page);
await check(indexes.length === before, "an index the same as the one there is not written again", indexes.length - before);
await page.context().close();

// a viewer's Load: the index's images, grouped by folder, the listed folders' order kept
page = await open(false);
await page.click("#load-remote");
await page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 3, null, { timeout: 10000 }).catch(() => {});
const listed = await page.evaluate(() => [...document.querySelectorAll("#remote-list > *")].map((e) => (e.classList.contains("group") ? "# " + e.querySelector(".group-name").textContent : e.querySelector(".name").textContent)));
await check(JSON.stringify(listed) === JSON.stringify(["# Data", "acme.png", "# Data / sub", "beta.png", "# Elsewhere", "delta.png"]), "Load study images lists the index's images, a group per folder", listed);
if (shots) await page.locator("#remote-dlg").screenshot({ path: path.join(shots, "load-study-images.png") });
const reads = writes.length;
await page.dblclick('#remote-list .item:has(.name:text-is("beta.png"))');
await page.waitForFunction(() => st.fileName === "beta.png", null, { timeout: 10000 }).catch(() => {});
await check(await page.evaluate(() => st.fileName === "beta.png") && writes.length === reads, "an image chosen there opens", await page.evaluate(() => st.fileName));

// offline, the index kept on this device lists the same groups; only an image kept here opens
await page.context().setOffline(true);
await page.waitForFunction(() => document.documentElement.classList.contains("offline"));
await page.evaluate(() => document.querySelector("#load-remote").click());
await page.waitForFunction(() => document.querySelector("#remote-dlg").open && document.querySelectorAll("#remote-list .item").length === 3, null, { timeout: 10000 }).catch(() => {});
const offline = await page.evaluate(() => [...document.querySelectorAll("#remote-list > *")].map((e) => (e.classList.contains("group") ? "# " + e.querySelector(".group-name").textContent : `${e.querySelector(".name").textContent}${e.disabled ? " (greyed)" : ""}`)));
await check(JSON.stringify(offline) === JSON.stringify(["# Data", "acme.png (greyed)", "# Data / sub", "beta.png", "# Elsewhere", "delta.png (greyed)"]),
  "offline, the kept index lists the same groups, an image not kept here greyed", offline);
await done(0);
