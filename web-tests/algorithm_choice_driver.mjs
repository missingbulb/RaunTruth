// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from ANSWERS
// (tests/test_study_runs.py) and counting one pixel more for the "from" algorithm, and checks the study's algorithms
// atop its Processing box (req/shell/processing/algorithms): the list its study.json names, the first chosen, each
// with its icon, title and precision and recall where measured; how the chosen one works and how well it did; the
// study running the one chosen; a (?) beside the list opening how the study scores (req/shell/processing/scoring); and a
// study with no algorithms showing none. Exits 1 on a failed check, 2 when it
// cannot run.
//   node web-tests/algorithm_choice_driver.mjs ANSWERS IMAGE.png STUDIES
import { fromScratch } from "./annotating.mjs";
import { EARLY } from "./early_messages.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { tagger } from "./tagger.mjs";
import { pw, launch } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { world } from "./world.mjs";

const [answers, image, studies] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
postMessage({ type: "ready", info: A.ready.fixture });
onmessage = ({ data: m }) => {
  if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images }, [images.buffer]); }
  else if (m.type === "call") { const b = bytes(A.mask); postMessage({ type: "result", action: m.action, meta: { ...A.count, count: A.count.count + (m.args.algorithm === "from" ? 1 : 0) }, bytes: b, echo: m.echo }, [b.buffer]); }
};`;
const { origin, server } = await serveSite({
  "/web/worker.js": () => EARLY + STAND_IN,
  "/web/vendor/wheels.json": "[]",
  "/web/answers.json": { file: answers },
  "/web/studies.json": { file: studies },
});

const browser = await launch(pw), w = world(browser, origin);
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); } console.log("ok: " + what); };

w.site.withGoogle();
w.studies.fromThisComputer("fixture");
let page = await w.device().signedInAs(tagger(w)).opens("fixture");

const own = (rel) => JSON.parse(fs.readFileSync(path.join(repo, "studies", "fixture", rel), "utf8"));
const [first, second] = own("web/algorithms.json"), listed = own("web/algorithm_metrics.json"), SCORING = listed.scoring;
await page.waitForFunction(() => !document.querySelector("#algorithm").disabled);
const seen = () => page.evaluate(() => {
  const sel = document.querySelector("#algorithm"), note = document.querySelector("#algorithm-note"), box = document.querySelector("#processing-box");
  return { options: [...sel.options].map((o) => [o.value, o.textContent]), value: sel.value, tip: sel.title,
    top: box.querySelector(":scope > :not(.sec-head)") === document.querySelector("#algorithm-pick"), shown: !document.querySelector("#algorithm-pick").hidden,
    about: document.querySelector("#algorithm-about summary").textContent, items: [...note.querySelectorAll("li")].map((l) => l.firstChild.textContent),
    bold: note.querySelector("strong")?.textContent || "", last: note.lastElementChild?.textContent || "" };
});
let s = await seen();
await check(s.shown && s.top, "the study's algorithms are the first thing in its Processing box", s);
await check(JSON.stringify(s.options) === JSON.stringify([[first.key, `${first.icon} ${first.title} (P\u00a0.90\u00a0·\u00a0R\u00a0.80)`], [second.key, `${second.icon} ${second.title}`]]),
  "each algorithm is listed with its icon and title, its precision and recall where measured", s.options);
await check(s.value === first.key, "the first in the study's list is chosen at first", s.value);
await check(s.tip === `Precision (P) and recall (R) of each algorithm ${listed.measured}`, "the list's tooltip says what they were measured on", s.tip);
await check(s.about === `How the ${first.title} algorithm works` && s.items.join("|") === "Count every pixel brighter than the threshold|none equal to it",
  "How the algorithm works gives the chosen one's steps as a nested list", s);
await check(s.bold === `Above algorithm shows precision of 0.90 and recall of 0.80 ${listed.measured}` && s.last.endsWith(`(${listed.versions[first.key].note})`),
  "... ending in bold with its precision and recall, its note beside it", s);

await check(await page.evaluate(() => document.querySelector("#algorithm-stamp").hidden), "a score with no stamp (Develop) shows none", await seen());

// a study from Review on: its metrics carry a stamp for each version, and the score shows it (req/shell/processing/stamp)
const STAMP = { version: first.key, dataset_sha256: "0123456789abcdef".repeat(4), frozen: "2026-11-23", commit: "c0ffee1234567890c0ffee1234567890c0ffee12" };
await page.context().close();
const reviewed = w.device().signedInAs(tagger(w));
(await reviewed.context()).route("**/algorithm_metrics.json", (route) => route.fulfill({ contentType: "application/json",
  body: JSON.stringify({ ...listed, versions: { ...listed.versions, [first.key]: { ...listed.versions[first.key], stamp: STAMP } } }) }));
page = await reviewed.opens("fixture");
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready") && !document.querySelector("#algorithm").disabled);
const stamped = () => page.evaluate(() => { const el = document.querySelector("#algorithm-stamp"); return el && { shown: !el.hidden, text: el.textContent, link: el.querySelector("a")?.href ?? null, outsideFold: !document.querySelector("#algorithm-about").contains(el) }; });
let st = await stamped();
await check(st?.shown && st.outsideFold && st.text.includes("2026-11-23") && st.text.includes(first.key) && st.text.includes("01234567") && !st.text.includes("0123456789abcdef0123"),
  "from Review on the chosen algorithm's score shows its version, its data set's short SHA and the freeze date", st);
await check(st.link === `https://github.com/missingbulb/RaunTruth/commit/${STAMP.commit}`, "... and a link to the ground truth's commit on GitHub", st);
await page.evaluate((k) => { const sel = document.querySelector("#algorithm"); sel.value = k; sel.dispatchEvent(new Event("change")); }, second.key);
await check(!(await stamped())?.shown, "an algorithm with no stamped score shows none", await stamped());
await reviewed.close();
page = await w.device().signedInAs(tagger(w)).opens("fixture");
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready") && !document.querySelector("#algorithm").disabled);

await page.setInputFiles("#file", image);
await page.waitForFunction(() => document.querySelector("#status").textContent === "Image loaded." && document.querySelector("#fx-count")?.disabled === false);
await fromScratch(page, "#fx-count");
await check(await page.evaluate(() => document.querySelector("#algorithm").checkVisibility()), "an image open and annotation started from scratch, Processing opens with the list on show");
const scoring = () => page.evaluate(() => {
  const q = document.querySelector("#scoring-help"), note = document.querySelector("#scoring-note"), sel = document.querySelector("#algorithm");
  const a = sel.getBoundingClientRect(), b = q.getBoundingClientRect();
  return { shown: q.checkVisibility(), title: q.title, beside: b.left >= a.right && b.top < a.bottom && b.bottom > a.top,
    open: note.checkVisibility(), expanded: q.getAttribute("aria-expanded"), items: [...note.querySelectorAll("li")].map((l) => l.firstChild.textContent) };
});
let q = await scoring();
await check(q.shown && q.beside && q.title === "How precision and recall are scored", "a (?) beside the list, titled for the scoring", q);
await check(!q.open && q.expanded === "false", "... the scoring shut at first", q);
await page.click("#scoring-help"); q = await scoring();
await check(q.open && q.expanded === "true" && q.items.join("|") === SCORING.split("\n").map((l) => l.replace(/^- /, "")).join("|"),
  "a click on it shows how the study scores, as its outline", q);
await page.click("#scoring-help"); q = await scoring();
await check(!q.open && q.expanded === "false", "... and a second click shuts it", q);

await page.click("#fx-count");
await page.waitForFunction(() => /pixels/.test(document.querySelector("#fx-result").textContent));
const once = await page.evaluate(() => document.querySelector("#fx-result").textContent);
// Processing folds once counted: opened again from its title
await page.click("#processing-box .sec-head h2"); await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers"));
await page.selectOption("#algorithm", second.key);
s = await seen();
await check(s.about === `How the ${second.title} algorithm works` && !s.bold && s.items.length === 1, "another chosen: how it works is its own, with no precision and recall it never had", s);
await page.click("#fx-count");
await page.waitForFunction((was) => document.querySelector("#fx-result").textContent !== was, once);
const twice = await page.evaluate(() => document.querySelector("#fx-result").textContent);
await check(parseInt(twice) === parseInt(once) + 1 && twice.includes(second.title), "the study runs the algorithm chosen, and knows its title", [once, twice]);

await page.goto(origin + "/web/viewer");
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
await check(await page.evaluate(() => document.querySelector("#algorithm-pick").hidden), "a study offering no algorithms shows no list");
await check(await page.evaluate(() => !document.querySelector("#scoring-help").checkVisibility() && !document.querySelector("#scoring-note").checkVisibility()), "... and no (?)");
await done(0);
