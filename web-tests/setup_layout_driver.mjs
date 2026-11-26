// Drives req/setup/aspects, req/setup/image, req/setup/loading and req/shell/status-bar/calls in headless Chromium against the
// stand-in Google of stand_in_drive.mjs serving ROOT: Study Setup's own layout (the stages across the top, the rail of aspects, no
// viewer or left bar on show), an image opened in a dialog, a place emptied and marked loading while the store is read, a late
// answer painting nothing, and the store's calls shown in the status bar. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_layout_driver.mjs ANSWERS STUDIES ROOT [SHOTS]
import { atRest } from "./page_motions.mjs";
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { idle } from "./page_until.mjs";
import { held } from "./held.mjs";
import { expecting } from "./harness.mjs";

const [answers, studies, rootDir, shots] = process.argv.slice(2);
const { drive, open, check, done } = await standIn({ answers, studies, rootDir });
const shot = (page, name) => shots && page.screenshot({ path: path.join(shots, name + ".png") });
// a shot for a person to look at has two device pixels to a CSS pixel
const SHARP = shots ? { scale: 2 } : {};
const folders = (page) => page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length === 2);
const seen = (page, sel) => page.evaluate((sel) => !!document.querySelector(sel)?.checkVisibility({ visibilityProperty: true }), sel);
const cells = (page) => page.evaluate(() => [...document.querySelectorAll("#folder-items .cell .name")].map((n) => n.textContent));
const chip = (page) => page.evaluate(() => { const c = document.querySelector('#sb-calls [data-server="store"]'); return c ? { text: c.textContent.trim(), turning: c.classList.contains("on"), logo: !!c.querySelector("svg") } : null; });
// the listing of a folder's own files, kept back until released
const holdListing = (id) => { const h = held(); drive.hold = (call) => (call.kind === "list" && call.parent === id ? h.hold() : null); return h; };

// the study's own page: its menu item opens Study Setup in a new page, and says so
let page = await open(true, SHARP);
await page.click("#user-menu summary");
await page.waitForSelector("#open-setup:not([hidden])");
await shot(page, "0-menu");
const item = await page.evaluate(() => { const a = $("#open-setup"); return [a.target, a.rel, !!a.querySelector("svg.new-page"), a.lastElementChild?.matches("svg.new-page")]; });
await check(item[0] === "_blank" && /noopener/.test(item[1]) && item[2] && item[3], "Study Setup… opens in a new page and carries the new-page icon at its end", item);
// a call to the store shows in the status bar while it is in flight, here too
const listing = held();
drive.hold = (call) => (call.kind === "list" ? listing.hold() : null);
await page.keyboard.press("Escape");
await page.click("#load-remote");
await listing.asked;
await page.waitForFunction(() => document.querySelector('#sb-calls [data-server="store"]'));
const main = await chip(page);
await check(main?.turning && main.logo && /^Loading from Google Drive/.test(main.text), "on the study's page, a call to the store shows its logo turning in the status bar", main);
drive.hold = () => null; listing.release();
await page.waitForFunction(() => !document.querySelector("#sb-calls [data-server]"));
await check(true, "and it goes once the store has answered");
await page.context().close();

// Study Setup: the default layout
// the images Study Setup lists are the kinds the study opens: here TIFFs, a PNG and a JPEG
const KINDS = { files: { from: ["drive"], accept: ".png,.tif,.tiff,.jpg", empty: "Load an image." } };
page = await open(true, { setup: true, study: KINDS, ...SHARP });
await folders(page);
await idle(page);
const layout = await page.evaluate(() => ({
  rail: [...document.querySelectorAll("#setup-rail button")].map((b) => [b.textContent.trim(), b.getAttribute("aria-pressed")]),
  stages: [...document.querySelectorAll("#stage-steps > li")].map((li) => [li.dataset.stage, li.dataset.state, li.getAttribute("aria-current")]),
}));
await check(layout.rail.map((r) => r[0]).join() === "Images,Ground Truth,Literature,People,Results" && layout.rail.map((r) => r[1]).join() === "true,false,false,false,false",
  "the rail lists the study's aspects, Images chosen", layout.rail);
await check(layout.stages.map((s) => s[0]).join() === "Setup,Develop,Analyze,Review,Public" && layout.stages.filter((s) => s[2] === "step").length === 1,
  "the five stages run across the top, one of them the current", layout.stages);
const at = layout.stages.findIndex((s) => s[2] === "step");
await check(layout.stages.slice(0, at).every((s) => s[1] === "done") && layout.stages.slice(at + 1).every((s) => s[1] === "ahead"), "those before it done, those after it ahead", layout.stages);
const acts = await page.evaluate(() => [...document.querySelectorAll("#stage-steps > li")].map((li) => li.querySelector("button:not([hidden])")?.textContent.trim() || ""));
await check(acts.filter(Boolean).length === (at > 0 ? 1 : 0) + (at < 4 ? 1 : 0) && (at === 4 || /^Promote to /.test(acts[at + 1])) && (at === 0 || /^Move back to /.test(acts[at - 1])),
  "promoting is the next stage's action and moving back the one before's", acts);
for (const sel of ["#view", "#left", "#image-box", ".toolbar"]) await check(!(await seen(page, sel)), `nothing of the viewer or the left bar is on show: ${sel}`);
await check((await seen(page, "#data-tree")) && !(await seen(page, "#sharing-box")) && !(await seen(page, "#batch-bar")) && !(await seen(page, "#results-box")), "Images shows the folders and none of the other aspects");
await shot(page, "1-opens");
if (shots && at < 4) {
  await page.hover("#stage-up"); await shot(page, "1-promote-hovered"); await page.mouse.move(0, 0);
  await page.click("#stage-up"); await page.waitForFunction(() => document.querySelector("#stage-change-dlg, #stage-freeze-dlg[open]")?.open || document.querySelector("#stage-freeze-dlg").open);
  await shot(page, "1-promote-asked"); await page.keyboard.press("Escape");
}

// a folder chosen: its place emptied and marked loading while the store is read, the call in the status bar
const [top, sub] = await page.evaluate(() => [...document.querySelectorAll("#data-tree .tree-folder")].map((f) => f.dataset.id));
const name = (id) => `#data-tree .tree-folder[data-id="${id}"] > .row .name`;
await page.click(name(top));
await page.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length > 1);
await idle(page);
const first = await cells(page);
let h = holdListing(sub);
await page.click(name(sub));
await h.asked;
const waiting = await page.evaluate(() => ({ cells: document.querySelectorAll("#folder-items .cell").length, wait: document.querySelector("#folder-items .net-wait")?.textContent.trim() || null,
  busy: $("#folder-items").getAttribute("aria-busy"), sums: document.querySelectorAll("#folder-summary dd").length, title: $("#folder-title").textContent }));
await check(waiting.cells === 0 && /Loading sub's images from Google Drive/.test(waiting.wait || "") && waiting.busy === "true" && waiting.sums === 0 && waiting.title === "sub",
  "another folder chosen, the grid and the sums drop the folder before at once and say what is loading", waiting);
const during = await chip(page);
await check(during?.turning && /^Loading from Google Drive: sub's images/.test(during.text), "the status bar names the store and what is read from it, its logo turning", during);
await shot(page, "2-loading");
drive.hold = () => null; h.release();
await page.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length === 1 && !document.querySelector("#folder-items .net-wait"));
await idle(page);
await check((await cells(page)).join() === "c.png" && !(await chip(page)) && (await page.evaluate(() => !$("#folder-items").hasAttribute("aria-busy"))), "its images drawn, the place and the status bar say no more of it", [await cells(page), await chip(page)]);

// a tag added to the folder: while the store takes the write the status bar says it is saving, not loading
{
  const w = held();
  drive.hold = (call) => (call.kind === "write" ? w.hold() : null);
  await page.fill("#tags-add", "acme-tag");
  await page.click("#tags-add-go");
  await w.asked;
  const saving = await chip(page);
  await check(/^Saving to Google Drive/.test(saving?.text || ""), "while a tag is written the status bar says Saving to the store", saving);
  await check(!/^Saved the tag/.test(await page.textContent("#status")), "while the store still holds the write, the status line does not say the tag is saved", await page.textContent("#status"));
  drive.hold = () => null; w.release();
  await idle(page);
  await check(await page.textContent("#status") === "Saved the tag acme-tag to the study.", "once the write is taken the status line says the tag, as it was kept, is saved to the study", await page.textContent("#status"));
  const onTiles = await page.evaluate(() => [...document.querySelectorAll("#folder-items .cell")].map((c) => [...c.querySelectorAll(".tag-chip.inherited")].map((t) => t.textContent).join()));
  await check(onTiles.length === 1 && onTiles[0] === "acme-tag", "and the folder's images show it at once, with no reading of the folder again", onTiles);
  await shot(page, "6-tag-saved");
  // a write the store refuses is said not to be saved
  drive.outage = "writes";
  await page.fill("#tags-add", "acme-refused");
  await expecting(/./, async () => { await page.click("#tags-add-go"); await idle(page); }, { maybe: true });
  await check(/^Not saved to Google Drive: /.test(await page.textContent("#status")), "a write the store refuses is said not to be saved", await page.textContent("#status"));
  drive.outage = null;
}

// a late answer: the folder chosen since keeps the place
h = holdListing(sub);
await page.click(name(top));
await page.waitForFunction((n) => document.querySelectorAll("#folder-items .cell").length === n, first.length);
await idle(page);
h = holdListing(sub);
await page.click(name(sub));
await h.asked;
drive.hold = () => null;
await page.click(name(top));
await page.waitForFunction((n) => document.querySelectorAll("#folder-items .cell").length === n, first.length);
h.release();
await idle(page);
const late = await page.evaluate(() => ({ title: $("#folder-title").textContent, dropped: shellForTests.calls.record.filter((r) => r.outcome === "superseded" && r.into === "folder-items").length }));
await check((await cells(page)).join() === first.join() && late.title !== "sub" && late.dropped >= 1, "an answer for a folder since left paints nothing, and the page records that it was dropped", [await cells(page), late]);
await shot(page, "3-folder");

// an image chosen: beside the grid, and in a dialog on Open image…
await page.click("#folder-items .cell");
await page.waitForFunction(() => !$("#image-panel").hidden && !$("#image-open").disabled);
await check((await seen(page, "#folder-items .cell.chosen")) && (await cells(page)).join() === first.join() && !(await seen(page, "#view")), "an image chosen is outlined in its grid, which stays, and no viewer shows", await cells(page));
const said = await page.evaluate(() => $("#status").textContent);
await check(said === "Ready.", "the status line asks for no image and tells of none loaded: the page has no Load", said);
await page.click("#image-open");
await page.waitForFunction(() => $("#image-dlg").open);
await check((await seen(page, "#view")) && (await seen(page, "#stage")) && (await seen(page, "#areas")), "Open image… shows it in a dialog, with its areas to mark");
await atRest(page, "#image-dlg");
const dialog = await page.evaluate(() => { const d = $("#image-dlg"), r = d.getBoundingClientRect(); return { modal: d.matches(":modal"), wide: r.width / innerWidth, tall: r.height / innerHeight }; });
await check(dialog.modal && dialog.wide > 0.9 && dialog.tall > 0.9, "... the page behind it held, and as large as the window allows", dialog);
const fills = await page.evaluate(() => $("#view").getBoundingClientRect().width / $("#image-dlg").getBoundingClientRect().width);
await check(fills > 0.9, "... the image's view as wide as the dialog", fills);
const bare = [];
for (const s of ["#left", "#channels", "#gutter-left", "#switch", "#history-btn"]) if (await seen(page, s)) bare.push(s);
await check(!bare.length && (await seen(page, ".toolbar .zoom")) && !(await seen(page, "#minimap-btn")), "... with the zoom and the image's tools, and no left bar, channel rows or study tools", bare);
await shot(page, "4-image");
// a notice raised meanwhile can be answered
await page.evaluate(() => { $("#notice-text").textContent = "A notice over the dialog."; $("#notice").hidden = false; });
await page.click("#notice-ok");
await check(!(await seen(page, "#notice")) && (await page.evaluate(() => $("#image-dlg").open)), "a notice raised while it is open shows over it and is answered there");
await page.keyboard.press("Escape");
await page.waitForFunction(() => !$("#image-dlg").open);
await check(!(await seen(page, "#view")), "Esc shuts it");
await page.click("#image-open");
await page.waitForFunction(() => $("#image-dlg").open);
await page.click("#image-close");
await check(!(await page.evaluate(() => $("#image-dlg").open)) && !(await seen(page, "#view")), "Close shuts it");

// the other aspects, one at a time
const aspect = async (word, shows, hides) => {
  await page.click(`#setup-rail button[data-aspect="${word}"]`);
  const got = { shows: [], hides: [] };
  for (const s of shows) got.shows.push(await seen(page, s));
  for (const s of hides) got.hides.push(await seen(page, s));
  await check(got.shows.every(Boolean) && !got.hides.some(Boolean) && (await page.evaluate((w) => document.querySelector(`#setup-rail button[data-aspect="${w}"]`).getAttribute("aria-pressed") === "true"
    && document.querySelectorAll('#setup-rail button[aria-pressed="true"]').length === 1, word)), `${word} shows its own panel alone`, got);
  await shot(page, "5-" + word);
};
await aspect("truth", ["#truth-panel"], ["#data-tree", "#folder-view", "#sharing-box", "#results-box"]);
await aspect("people", ["#sharing-box"], ["#data-tree", "#folder-view", "#truth-panel", "#results-box"]);
await aspect("results", ["#results-box"], ["#data-tree", "#folder-view", "#sharing-box", "#truth-panel"]);

// the page opened again starts from the default layout, whatever it showed
await page.reload(); // visits again on purpose (a reload is the subject): the layout a second visit opens on is the requirement
await folders(page);
await idle(page);
const again = await page.evaluate(() => [document.querySelector('#setup-rail button[aria-pressed="true"]')?.dataset.aspect, document.documentElement.dataset.sel || null, $("#folder-view").hidden]);
await check(again[0] === "images" && again[1] === null && again[2], "opened again, the page is back on Images with nothing chosen", again);
await done(0);
