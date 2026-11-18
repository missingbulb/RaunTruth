// Drives a study's listed folders, its study index, its tags and hiding (req/shell/data/folders, req/shell/data/index,
// req/shell/data/tags, req/shell/data/hidden, req/shell/load/study-images) in headless Chromium on the fixture study, against the stand-in Google of
// stand_in_drive.mjs serving ROOT: a Data folder the study file names, a subfolder in it, and an Other folder.
// Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/study_index_driver.mjs ANSWERS STUDIES ROOT [SHOTS]
import { standIn } from "./stand_in_drive.mjs";
import { frames } from "./page_frames.mjs";
import path from "node:path";

const [answers, studies, rootDir, shots] = process.argv.slice(2);
const indexes = [], tagFiles = [];
const { ROOT, FILES, hidden, writes, open, role, check, done } = await standIn({ answers, studies, rootDir,
  uploaded: (f) => {
    if (f.name === "rauntruth-index.json") indexes.push(JSON.parse(f.bytes.toString()));
    if (f.name === "rauntruth-tags.json") tagFiles.push(JSON.parse(f.bytes.toString()));
  } });
const idOf = (name) => FILES.find((f) => f.name === name).id;
// the study file names the Data folder, and is the page's own, as one its Set up wrote
const settings = FILES.find((f) => f.name === "rauntruth-study.json");
settings.mine = true;
settings.bytes = Buffer.from(JSON.stringify({ ...JSON.parse(settings.bytes.toString()), data: idOf("Data") }));
// a folder elsewhere in Drive, shared with the study manager alone
FILES.push({ id: "dmelsewhere000000001", name: "Elsewhere", parent: "someone", folder: true, bytes: null, mine: false, props: {}, modified: "2026-11-05T07:00:00Z" },
  { id: "dmelsewherefile00001", name: "delta.png", parent: "dmelsewhere000000001", folder: false, bytes: FILES.find((f) => f.name === "acme.png").bytes, mine: false, props: {}, modified: "2026-11-05T07:00:00Z" });
hidden.add("dmelsewhere000000001");
// a screenshot once nothing on the page is still moving
const shoot = async (sel, name) => {
  if (!shots) return;
  await page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === "running"), null, { timeout: 5000 }).catch(() => {});
  await frames(page);
  await page.locator(sel).screenshot({ path: path.join(shots, name) });
};
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
await shoot("#data-col", "data-management.png");
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
await shoot("#remote-dlg", "load-study-images.png");
const reads = writes.length;
await page.dblclick('#remote-list .item:has(.name:text-is("beta.png"))');
await page.waitForFunction(() => st.fileName === "beta.png", null, { timeout: 10000 }).catch(() => {});
await check(await page.evaluate(() => st.fileName === "beta.png") && writes.length === reads, "an image chosen there opens", await page.evaluate(() => st.fileName));

// offline, the index kept on this device lists the same groups; only an image kept here opens
await page.context().setOffline(true);
await page.waitForFunction(() => document.documentElement.classList.contains("offline"));
await page.evaluate(() => document.querySelector("#load-remote").click());
await page.waitForFunction(() => document.querySelector("#remote-dlg").open && document.querySelectorAll("#remote-list .item").length === 3 && document.querySelectorAll("#remote-list .item:disabled").length > 0, null, { timeout: 10000 }).catch(() => {});
const offline = await page.evaluate(() => [...document.querySelectorAll("#remote-list > *")].map((e) => (e.classList.contains("group") ? "# " + e.querySelector(".group-name").textContent : `${e.querySelector(".name").textContent}${e.disabled ? " (greyed)" : ""}`)));
await check(JSON.stringify(offline) === JSON.stringify(["# Data", "acme.png (greyed)", "# Data / sub", "beta.png", "# Elsewhere", "delta.png (greyed)"]),
  "offline, the kept index lists the same groups, an image not kept here greyed", offline);
await page.context().close();

// tags (req/shell/data/tags): a folder's, an image's own value winning over it, a description, a tag refused; grouping
// and hiding set in Study images (req/shell/data/hidden)
page = await open(true);
await role(page, "Study Manager");
await page.waitForFunction(() => document.querySelectorAll("#data-tree > .tree-folder").length === 2);
await settled(page);
const imageOf = (ix, name) => ix.images.find((i) => i.name === name);
const indexed = (n) => page.waitForFunction((n) => /^Study index/.test(document.querySelector("#data-index").textContent), n, { timeout: 10000 }).then(() => frames(page)).catch(() => {});
const tagIt = async (text) => { const was = indexes.length; await page.fill("#tags-add", text); await page.press("#tags-add", "Enter"); await page.waitForFunction(() => true); for (let k = 0; k < 50 && indexes.length === was; k++) await frames(page); };
await page.evaluate(() => [...document.querySelectorAll("#data-tree > .tree-folder > .row .name")].find((b) => b.textContent === "Data").click());
await page.waitForFunction(() => /^Folder Data/.test(document.querySelector("#tags-for").textContent));
await tagIt("Group:Wild Type");
await check(JSON.stringify(tagFiles.at(-1)?.folders?.[idOf("Data")]) === JSON.stringify({ tags: ["group:wild-type"] }), "a folder's tag, written as the page keeps it, goes into the tags file", tagFiles.at(-1));
await check(JSON.stringify(imageOf(indexes.at(-1), "beta.png")?.tags) === JSON.stringify(["group:wild-type"]), "and onto every image under the folder in the index", imageOf(indexes.at(-1), "beta.png"));
const chooseImage = async (folder, name) => {
  await page.evaluate(([folder, name]) => {
    const f = [...document.querySelectorAll("#data-tree .tree-folder")].find((x) => x.querySelector(":scope > .row .name").textContent === folder);
    const imgs = f.querySelector(":scope > .tree-images");
    if (imgs.hidden) f.querySelector(":scope > .row .count").click();
  }, [folder, name]);
  await page.waitForSelector(`#data-tree .tree-image:has(.name:text-is("${name}"))`);
  await page.click(`#data-tree .tree-image:has(.name:text-is("${name}"))`);
  await page.waitForFunction((n) => document.querySelector("#tags-for").textContent === "Image " + n, name);
};
await chooseImage("sub", "beta.png");
const shownTags = () => page.evaluate(() => [...document.querySelectorAll("#tags-list .tag-chip")].map((c) => c.dataset.tag + (c.classList.contains("inherited") ? " (from " + c.title.replace("From the folder ", "") + ")" : "")));
await check(JSON.stringify(await shownTags()) === JSON.stringify(["group:wild-type (from Data)"]), "an image shows the tags its folders give it, dimmed, naming the folder", await shownTags());
await tagIt("group:sick");
await check(JSON.stringify(imageOf(indexes.at(-1), "beta.png")?.tags) === JSON.stringify(["group:sick"]), "an image's own value of a multi-value tag wins over its folder's", imageOf(indexes.at(-1), "beta.png"));
await shoot("#tags-box", "tags-box.png");
const before2 = tagFiles.length;
await page.fill("#tags-add", "folder:mine"); await page.press("#tags-add", "Enter"); await frames(page);
await check(tagFiles.length === before2 && /page's own tag/.test(await page.textContent("#tags-msg")), "a tag named folder is refused, saying why", await page.textContent("#tags-msg"));
await chooseImage("Data", "acme.png");
await page.fill("#tags-desc", "First slide"); await page.locator("#tags-desc").blur();
await page.waitForFunction(() => /Description saved/.test(document.querySelector("#tags-msg").textContent), null, { timeout: 10000 }).catch(() => {});
await indexed();
for (let k = 0; k < 50 && imageOf(indexes.at(-1), "acme.png")?.description !== "First slide"; k++) await frames(page);
await check(imageOf(indexes.at(-1), "acme.png")?.description === "First slide", "an image's description goes into the index", imageOf(indexes.at(-1), "acme.png"));
await chooseImage("Elsewhere", "delta.png");
await tagIt("damaged-slide");
const studyWrites = () => writes.filter(([, n]) => n === "rauntruth-study.json").length;
let sw = studyWrites();
await page.selectOption("#study-group", "group");
for (let k = 0; k < 50 && studyWrites() === sw; k++) await frames(page);
sw = studyWrites();
await page.fill("#study-hide-add", "damaged-slide"); await page.press("#study-hide-add", "Enter");
for (let k = 0; k < 50 && studyWrites() === sw; k++) await frames(page);
for (let k = 0; k < 50 && !(indexes.at(-1)?.hide || []).length; k++) await frames(page);
await check(studyFile().group === "group" && JSON.stringify(studyFile().hide) === JSON.stringify(["damaged-slide"]) && studyFile().folders.length === 2,
  "Study images writes the grouping tag and the hiding rule into the study file, the folders kept", studyFile());
await check(indexes.at(-1).group === "group" && JSON.stringify(indexes.at(-1).hide) === JSON.stringify(["damaged-slide"]), "and the index carries them", { group: indexes.at(-1).group, hide: indexes.at(-1).hide });
await check(/1 image hidden/.test(await page.textContent("#study-hide-count")), "Study images says how many images its rules hide", await page.textContent("#study-hide-count"));
// the Study Manager's Load: grouped by the tag, the hidden image there, marked
await page.evaluate(() => document.querySelector("#load-remote").click());
await page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 3, null, { timeout: 10000 }).catch(() => {});
const rows = () => page.evaluate(() => [...document.querySelectorAll("#remote-list > *")].map((e) => (e.classList.contains("group") ? "# " + e.querySelector(".group-name").textContent
  : [e.querySelector(".name").textContent, e.querySelector(".desc")?.textContent, [...e.querySelectorAll(".tags .tag-chip")].map((c) => c.textContent).join(" ")].filter(Boolean).join(" | "))));
await shoot("#study-set", "study-images.png");
const managerRows = await rows();
await shoot("#remote-dlg", "load-by-tag.png");
await check(JSON.stringify(managerRows) === JSON.stringify(["# group: sick", "beta.png | group:sick", "# group: wild-type", "acme.png | First slide | group:wild-type", "# No group", "delta.png | hidden damaged-slide"]),
  "a Study Manager's Load groups by the tag, the untagged last, a hidden image there and marked", managerRows);
await page.context().close();

// a viewer's: the hidden image left out
page = await open(false);
await page.click("#load-remote");
await page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 2, null, { timeout: 10000 }).catch(() => {});
const viewerRows = await rows();
await check(JSON.stringify(viewerRows) === JSON.stringify(["# group: sick", "beta.png | group:sick", "# group: wild-type", "acme.png | First slide | group:wild-type"]),
  "a viewer's Load leaves the hidden image out", viewerRows);
await done(0);
