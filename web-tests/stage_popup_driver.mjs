// Drives shell/study/stage-popup in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving
// ROOT: hovering the study's stage label in the switcher lists the five stages, the gate conditions the page measures for this stage,
// and one line per action open to this user: with twelve images in the study's index and no GT mark, an annotator is told "Analyse:
// 12 images still need it", someone the store lets save nothing is not, and a stage that closes annotating drops the line.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/stage_popup_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { idle } from "./page_until.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { GT, ROOT, studyFile, viewOnly, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const OTHER = "someone@example.com";

// twelve images in the study's index, none with a GT mark
const images = Array.from({ length: 12 }, (_, k) => ({ id: "ix" + String(k).padStart(18, "0"), name: `slide${k + 1}.tif`, folder: ROOT, path: ["Study folder one"], size: 1000, sha: String(k).padStart(2, "0").repeat(32), tags: [] }));
const index = { built_by: "owner@acme.example", built_at: "2026-11-20T10:00:00Z", folders: [{ id: ROOT, name: "Study folder one" }], images };

const hover = async (page) => {
  await page.click("#study-menu summary");
  await page.hover('#study-list a[data-id="fixture"] .stage-tag');
  await page.waitForFunction(() => document.querySelector("#stage-pop").matches(":popover-open") && document.querySelector("#stage-actions li"));
  await idle(page);
  return page.evaluate(() => ({
    stages: [...document.querySelectorAll("#stage-list .name")].map((n) => n.textContent),
    now: [...document.querySelectorAll("#stage-list li.now .name")].map((n) => n.textContent),
    gates: [...document.querySelectorAll("#stage-gates li")].map((n) => n.textContent.trim()),
    lines: [...document.querySelectorAll("#stage-actions li")].map((n) => n.textContent.trim()) }));
};

// an annotator in Develop
studyFile({ stage: "Develop", index });
let page = await open(true, { email: OTHER });
let pop = await hover(page);
await check(pop.stages.join() === "Setup,Develop,Analyze,Review,Public" && pop.now.join() === "Develop", "the popup lists the five stages, Develop highlighted", pop);
await check(pop.lines.includes("Analyse: 12 images still need it"), "an annotator is told how many images still need a GT mark", pop.lines);
await check(pop.gates.some((g) => /0 of 12 images have a GT mark/.test(g)), "and the gate's condition is measured: 0 of 12 images have a GT mark", pop.gates);
await check(pop.lines.some((l) => /own images/i.test(l)), "the own-images line is there for them", pop.lines);
await page.context().close();

// someone the store lets save nothing: no Analyse line
viewOnly.add(GT.extractions);
page = await open(true, { email: OTHER });
pop = await hover(page);
await check(!pop.lines.some((l) => /^Analyse/.test(l)) && pop.lines.some((l) => /own images/i.test(l)), "someone who may not save has no Analyse line, and keeps the lines every visitor has", pop.lines);
await page.context().close();
viewOnly.delete(GT.extractions);

// Review closes annotating: the line goes for the annotator too
studyFile({ stage: "Review", index });
page = await open(true, { email: OTHER });
pop = await hover(page);
await check(pop.now.join() === "Review" && !pop.lines.some((l) => /^Analyse/.test(l)), "in Review the popup marks Review and has no Analyse line", pop);
await page.context().close();
await done(0);
