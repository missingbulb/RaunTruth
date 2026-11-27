// Drives req/shell/controls/one-look in headless Chromium against the stand-in Google of stand_in_drive.mjs serving ROOT: the
// controls on show in several views of the study's page and of Study Setup, each kind held to one look for its place. A
// control's kind and place are read from what it is (a bordered button with words, one with an icon alone, a text field, a
// link, a dialog's bottom row), never from a list of ids. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/control_styles_driver.mjs ANSWERS STUDIES ROOT IMAGE [SHOTS]
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { openFromDrive } from "./drive_open.mjs";
import { fromScratch } from "./annotating.mjs";
import { atRest } from "./page_motions.mjs";
import { idle } from "./page_until.mjs";
import { aspect } from "./setup_page.mjs";

const [answers, studies, rootDir, image, shots] = process.argv.slice(2);
const { open, check, done } = await standIn({ answers, studies, rootDir });
const SHARP = shots ? { scale: 2 } : {};
const shot = (page, name) => shots && page.screenshot({ path: path.join(shots, name + ".png") });

// every control on show, by kind and place: {kind, place, name, height, width, radius, padding, background, colour, line}
const controls = (page) => page.evaluate(() => {
  const seen = (e) => e.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && e.getBoundingClientRect().width > 0;
  const top = [...document.querySelectorAll("dialog[open]")].filter((d) => d.matches(":modal")).pop();
  const scope = top || document;
  // rows of a list, tabs, the cells of a map, a rail's entries and the status bar's items are not buttons of a rank
  const ROWS = "[role=option], [role=tab], [role=listbox] *, [role=list] > *, [role=tree] *, nav *, #statusbar *, .mm-areas *, .mm-head *, #gt-counters *, #gt-bar *, .zoom *, .chip *, summary";
  // a bar, or a row among other things: the toolbar, a box's header, the stage band, an image's tile or row
  const place = (e) => (e.closest(".toolbar, .sec-head, #stage-steps, #folder-items") ? "bar" : e.closest("body > header") ? "header" : "panel");
  const words = (e) => (e.textContent || "").replace(/\s+/g, " ").trim();
  const out = [];
  for (const e of scope.querySelectorAll("button, input[type=text], input[type=search], input[type=number], input:not([type]), select, a[href]")) {
    if (!seen(e) || e.matches(ROWS) || e.closest("[data-list-rows]")) continue;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect(), bordered = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
    const kind = e.matches("a[href], button.link") ? "link" : e.matches("input, select") ? "field"
      : !bordered ? null : words(e) ? "button" : "icon";
    if (!kind) continue;
    out.push({ kind, place: place(e), name: words(e).slice(0, 30) || e.getAttribute("aria-label") || e.id, height: Math.round(r.height), width: Math.round(r.width),
      radius: cs.borderTopLeftRadius, padding: cs.paddingLeft, background: cs.backgroundColor, colour: cs.color, line: cs.textDecorationLine, size: cs.fontSize,
      capital: !/^[a-z]/.test(words(e)) });
  }
  // a dialog's bottom row: its buttons in order, and which is the primary
  const row = top && [...top.querySelectorAll(".dlg-row.end button")].filter(seen);
  return { out, row: row ? row.map((b) => [words(b), b.classList.contains("primary")]) : null };
});

const HEIGHT = { panel: 32, header: 32, bar: 28 };
let swept = 0;
const dialogs = [], unlike = [];
// every view is swept before the run fails, so that one run names all that is unlike
const same = (ok, what, seen) => { if (!ok) unlike.push(`${what}: ${JSON.stringify(seen)}`); };
// one view's controls held to the looks: where: the view's name, for the message
async function held(page, where) {
  await idle(page);
  const { out, row } = await controls(page);
  swept += out.length;
  const odd = (list) => list.map((c) => `${c.name} (${c.place}: ${c.height}×${c.width}, radius ${c.radius}, padding ${c.padding})`);
  const buttons = out.filter((c) => c.kind === "button"), icons = out.filter((c) => c.kind === "icon"), fields = out.filter((c) => c.kind === "field"), links = out.filter((c) => c.kind === "link");
  same(buttons.every((c) => c.height === HEIGHT[c.place]), `${where}: a button with words is 32 px tall in a panel or a dialog, 28 in a bar`, odd(buttons.filter((c) => c.height !== HEIGHT[c.place])));
  same(icons.every((c) => c.height === HEIGHT[c.place] && c.width === c.height && c.radius === icons[0].radius),
    `${where}: a button of an icon alone is a square of its place's height, every one with the same corners`, odd(icons.filter((c) => c.height !== HEIGHT[c.place] || c.width !== c.height || c.radius !== icons[0].radius)));
  same(new Set(fields.map((c) => [c.height, c.padding, c.background, c.radius].join())).size <= 1, `${where}: the text fields share one look`, odd(fields));
  same(new Set(links.map((c) => [c.colour, c.line].join())).size <= 1, `${where}: the links share one look`, links.map((c) => `${c.name}: ${c.colour} ${c.line}`));
  const lower = out.filter((c) => !c.capital && c.kind !== "field");
  same(!lower.length, `${where}: every control's words begin with a capital`, lower.map((c) => c.name));
  if (row) {
    dialogs.push(where);
    const primary = row.findIndex((b) => b[1]);
    same(primary < 0 || primary === row.length - 1, `${where}: the dialog's primary button is the last of its row`, row);
  }
  await shot(page, where.replace(/\W+/g, "-").toLowerCase());
}

// ---- the study's page ----
let page = await open(true, { ...SHARP });
await held(page, "no image");
await page.click("#load-remote");
await page.waitForFunction(() => document.querySelector("#remote-dlg").open && document.querySelector("#remote-list").childElementCount > 0);
await atRest(page, "#remote-dlg");
await held(page, "Open Image");
await page.keyboard.press("Escape");
await openFromDrive(page, image);
await held(page, "image open");
await fromScratch(page, "#fx-count");
await held(page, "after a run");
await page.evaluate(() => document.querySelector("#fx-done").click());
await page.waitForFunction(() => !document.querySelector("#gt-submit").disabled);
await page.click("#gt-submit");
await page.waitForFunction(() => document.querySelector("#gt-dlg").open);
await atRest(page, "#gt-dlg");
await held(page, "Upload Analysis");
await page.context().close();

// ---- Study Setup ----
// the images Study Setup lists are the kinds the study opens
page = await open(true, { setup: true, study: { files: { from: ["drive"], accept: ".png,.tif,.tiff,.jpg", empty: "Load an image." } }, ...SHARP });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length > 0);
await held(page, "Study Setup");
await page.click("#data-tree .tree-folder > .row .name");
await page.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length > 0);
await page.check("#batch-all");
await held(page, "Study Setup, a folder");
await aspect(page, "people");
await page.waitForFunction(() => document.querySelector('#setup-rail button[data-aspect="people"]').getAttribute("aria-pressed") === "true");
await held(page, "Study Setup, People");

// the sweep covered the views it names: their controls, and the dialogs among them
await check(!unlike.length, "the controls of a kind and place share one look", unlike);
await check(swept >= 60 && dialogs.length === 2, "the sweep held the controls of eight views, two of them dialogs", { swept, dialogs });
await done(0);
