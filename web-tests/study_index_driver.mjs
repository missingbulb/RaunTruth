// Drives a study's listed folders, its study index, its tags and hiding (req/shell/data/folders, req/shell/data/index,
// req/shell/data/tags, req/shell/data/hidden, req/shell/load/study-images, req/shell/data/damaged,
// req/shell/data/area-of-interest) in headless Chromium on the fixture study, against the stand-in Google of
// stand_in_drive.mjs serving ROOT: a Data folder the study file names, a subfolder in it, and an Other folder.
// Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/study_index_driver.mjs ANSWERS STUDIES ROOT [SHOTS]
import { standIn } from "./stand_in_drive.mjs";
import { frames } from "./page_frames.mjs";
import { idle, orMissed } from "./page_until.mjs";
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
  await orMissed(page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === "running"), null, { timeout: 5000 }));
  await frames(page);
  await page.locator(sel).screenshot({ path: path.join(shots, name) });
};
const studyFile = () => JSON.parse(settings.bytes.toString());
const names = (ix) => ix.images.map((i) => [i.name, i.path.join(" / ")]);
const settled = (page) => orMissed(page.waitForFunction(() => !document.querySelector("#data-tree.busy") && /^Study index/.test(document.querySelector("#data-index").textContent), null, { timeout: 10000 }));

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
await orMissed(page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 3, null, { timeout: 10000 }));
const listed = await page.evaluate(() => [...document.querySelectorAll("#remote-list > *")].map((e) => (e.classList.contains("group") ? "# " + e.querySelector(".group-name").textContent : e.querySelector(".name").textContent)));
await check(JSON.stringify(listed) === JSON.stringify(["# Data", "acme.png", "# Data / sub", "beta.png", "# Elsewhere", "delta.png"]), "Load study images lists the index's images, a group per folder", listed);
await shoot("#remote-dlg", "load-study-images.png");
const reads = writes.length;
await page.dblclick('#remote-list .item:has(.name:text-is("beta.png"))');
await orMissed(page.waitForFunction(() => st.fileName === "beta.png", null, { timeout: 10000 }));
await check(await page.evaluate(() => st.fileName === "beta.png") && writes.length === reads, "an image chosen there opens", await page.evaluate(() => st.fileName));

// offline, the index kept on this device lists the same groups; only an image kept here opens
await page.context().setOffline(true);
await page.waitForFunction(() => document.documentElement.classList.contains("offline"));
await page.evaluate(() => document.querySelector("#load-remote").click());
await orMissed(page.waitForFunction(() => document.querySelector("#remote-dlg").open && document.querySelectorAll("#remote-list .item").length === 3 && document.querySelectorAll("#remote-list .item:disabled").length > 0, null, { timeout: 10000 }));
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
const indexed = (n) => orMissed(page.waitForFunction((n) => /^Study index/.test(document.querySelector("#data-index").textContent), n, { timeout: 10000 }).then(() => frames(page)));
const tagIt = async (text) => { await page.fill("#tags-add", text); await page.press("#tags-add", "Enter"); await idle(page); };
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
await orMissed(page.waitForFunction(() => /Description saved/.test(document.querySelector("#tags-msg").textContent), null, { timeout: 10000 }));
await indexed();
await idle(page);
await check(imageOf(indexes.at(-1), "acme.png")?.description === "First slide", "an image's description goes into the index", imageOf(indexes.at(-1), "acme.png"));
await chooseImage("Elsewhere", "delta.png");
await tagIt("damaged-slide");
await page.selectOption("#study-group", "group");
await idle(page);
await page.fill("#study-hide-add", "damaged-slide"); await page.press("#study-hide-add", "Enter");
await idle(page);
await check(studyFile().group === "group" && JSON.stringify(studyFile().hide) === JSON.stringify(["damaged-slide"]) && studyFile().folders.length === 2,
  "Study images writes the grouping tag and the hiding rule into the study file, the folders kept", studyFile());
await check(indexes.at(-1).group === "group" && JSON.stringify(indexes.at(-1).hide) === JSON.stringify(["damaged-slide"]), "and the index carries them", { group: indexes.at(-1).group, hide: indexes.at(-1).hide });
await check(/1 image hidden/.test(await page.textContent("#study-hide-count")), "Study images says how many images its rules hide", await page.textContent("#study-hide-count"));
// the Study Manager's Load: grouped by the tag, the hidden image there, marked
await page.evaluate(() => document.querySelector("#load-remote").click());
await orMissed(page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 3, null, { timeout: 10000 }));
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
await orMissed(page.waitForFunction(() => document.querySelectorAll("#remote-list .item").length === 2, null, { timeout: 10000 }));
const viewerRows = await rows();
await check(JSON.stringify(viewerRows) === JSON.stringify(["# group: sick", "beta.png | group:sick", "# group: wild-type", "acme.png | First slide | group:wild-type"]),
  "a viewer's Load leaves the hidden image out", viewerRows);
await page.context().close();

// the Study Manager's areas (req/shell/data/damaged, req/shell/data/area-of-interest): marked on the image itself, kept
// in the tags file and the index; a viewer sees both, the summary starts as the area of interest, Python is handed the
// damaged ones, and a mask of the viewer's own is warned of
const masked = { summary: { mask: true } };
// a lasso around the image's part from (x0, y0) to (x1, y1), in its pixels
const lasso = async (x0, y0, x1, y1) => {
  const pts = await page.evaluate(([x0, y0, x1, y1]) => {
    const r = $("#base").getBoundingClientRect(), at = (x, y) => [r.left + x * st.zoom, r.top + y * st.zoom];
    return [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)];
  }, [x0, y0, x1, y1]);
  await page.mouse.move(...pts[0]); await page.mouse.down();
  for (const p of [...pts.slice(1), pts[0]]) await page.mouse.move(...p, { steps: 6 });
  await page.mouse.up();
};
page = await open(true, { study: masked });
await role(page, "Study Manager");
await page.waitForFunction(() => document.querySelectorAll("#data-tree > .tree-folder").length === 2);
await settled(page);
await chooseImage("Data", "acme.png");
await orMissed(page.waitForFunction(() => st.fileName === "acme.png" && !$("#areas-damaged-mark").disabled, null, { timeout: 10000 }));
await check(await page.evaluate(() => !$("#areas-damaged-mark").disabled && !$("#areas-interest-mark").disabled), "with the image itself open, its areas can be marked");
await page.click("#areas-damaged-mark"); await lasso(4, 4, 20, 20);
await idle(page);
await page.click("#areas-interest-mark"); await lasso(2, 2, 60, 60);
await idle(page);
const acmeAreas = tagFiles.at(-1).images[idOf("acme.png")];
await check(acmeAreas?.damaged?.length === 1 && acmeAreas?.interest?.length === 1 && acmeAreas.description === "First slide",
  "a damaged area and the area of interest go into the tags file, the image's description kept", acmeAreas);
await check(imageOf(indexes.at(-1), "acme.png")?.damaged?.length === 1 && imageOf(indexes.at(-1), "acme.png")?.interest?.length === 1, "and into the index", imageOf(indexes.at(-1), "acme.png"));
await check(/1 damaged area/.test(await page.textContent("#areas-damaged-count")), "the Tags box counts the damaged areas", await page.textContent("#areas-damaged-count"));
await shoot("#tags-box", "areas-box.png");
await page.context().close();

page = await open(false, { study: masked, prepare: (c) => c.addInitScript(() => {
  window.posted = [];
  const send = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (m, t) { window.posted.push(m); return send.call(this, m, t); };
}) });
await page.click("#load-remote");
await page.waitForSelector('#remote-list .item:has(.name:text-is("acme.png"))');
await page.dblclick('#remote-list .item:has(.name:text-is("acme.png"))');
await orMissed(page.waitForFunction(() => st.fileName === "acme.png" && document.querySelector('#overlay g[data-layer="study-areas"] .interest'), null, { timeout: 10000 }));
const marks = await page.evaluate(() => ({ damaged: document.querySelectorAll('#overlay g[data-layer="study-areas"] .damaged').length, interest: document.querySelectorAll('#overlay g[data-layer="study-areas"] .interest:not(.under)').length }));
await check(marks.damaged === 1 && marks.interest === 1, "a viewer sees the damaged area marked and the area of interest outlined", marks);
await page.click("#fx-count");
await orMissed(page.waitForFunction(() => !$("#summary-box").hidden, null, { timeout: 10000 }));
const sent = await page.evaluate(() => window.posted.filter((m) => m.type === "call").at(-1)?.damaged);
await check(sent?.length === 1 && sent[0].length >= 4, "Python is handed the image's damaged areas with each call", sent);
const maskNow = () => page.evaluate(() => ({ n: window.shellForTests.mask.polygons().length, warned: !$("#mask-warning").hidden, middle: window.shellForTests.mask.inside(40, 40), damaged: window.shellForTests.mask.inside(10, 10), out: window.shellForTests.mask.inside(62, 62) }));
let m = await maskNow();
await check(m.n === 1 && !m.warned && m.middle && !m.damaged && !m.out, "the summary counts inside the area of interest, the damaged area left out, with no warning", m);
await shoot("#image-view", "viewer-areas.png");
await page.click("#mask-add"); await lasso(30, 30, 50, 50);
m = await maskNow();
await check(m.warned && /not set by the study/.test(await page.textContent("#mask-warning")), "a mask of the viewer's own is warned of at the view's bottom", [m, await page.textContent("#mask-warning")]);
await shoot("#image-view", "own-mask.png");
await page.click("#mask-clear");
m = await maskNow();
await check(m.n === 1 && !m.warned && m.middle, "Clear mask goes back to the study's area of interest", m);
await done(0);
