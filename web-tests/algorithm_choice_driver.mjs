// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from ANSWERS
// (tests/test_study_runs.py) and counting one pixel more for the "from" algorithm, and checks the study's algorithm
// (req/shell/processing/algorithms, req/shell/analysis/start): Start runs the one the study's list marks default, whatever
// its place in the list, with no dialog and no list of algorithms on the page; a fold in the Analysis box says how it works
// and how well it did, with its stamp (req/shell/processing/stamp) and, folded within, how the study scores
// (req/shell/processing/scoring); a list marking no default runs nothing and says so; and a study with no algorithms shows
// no fold. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/algorithm_choice_driver.mjs ANSWERS IMAGE.png STUDIES
import { fromScratch, defaultIs } from "./annotating.mjs";
import { EARLY } from "./early_messages.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { tagger } from "./tagger.mjs";
import { pw, launch, mustHold } from "./harness.mjs";
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

w.site.withGoogle();
w.studies.fromThisComputer("fixture");
const own = (rel) => JSON.parse(fs.readFileSync(path.join(repo, "studies", "fixture", rel), "utf8"));
const LIST = own("web/algorithms.json"), [first, second] = LIST, listed = own("web/algorithm_metrics.json"), SCORING = listed.scoring;
if (first.default !== true || LIST.length < 2) { console.error("the fixture's list must mark its first of several algorithms default for this driver"); await done(2); }

// the page of a device, the image open and Start pressed: the analysis run
const started = async (device) => {
  const page = await device.opens("fixture");
  await page.setInputFiles("#file", image);
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Image loaded") && document.querySelector("#fx-count")?.disabled === false);
  await fromScratch(page, "#fx-count");
  await page.waitForFunction(() => /pixels/.test(document.querySelector("#fx-result")?.textContent));
  return page;
};
const seen = (page) => page.evaluate(() => {
  const fold = document.querySelector("#algorithm-pick"), note = document.querySelector("#algorithm-note");
  return { shown: fold.checkVisibility(), open: fold.open, inBox: !!document.querySelector("#processing-box #algorithm-pick"), summary: fold.querySelector(":scope > summary").textContent,
    lists: document.querySelectorAll("#algorithm, select[aria-label=Algorithm]").length + [...document.querySelectorAll("option")].filter((o) => /above/.test(o.textContent)).length, dialog: !!document.querySelector("dialog[open]"), left: document.querySelector("#left").textContent,
    items: [...note.querySelectorAll("li")].map((l) => l.firstChild.textContent), bold: note.querySelector("strong")?.textContent || "", last: note.lastElementChild?.textContent || "",
    result: document.querySelector("#fx-result").textContent };
});

let page = await started(w.device().signedInAs(tagger(w)));
let s = await seen(page);
const once = s.result;
mustHold(!s.dialog && once.includes(first.title), "Start opens no dialog and runs the algorithm the study's list marks default", s);
mustHold(s.lists === 0 && !s.left.includes(second.title), "the page lists no algorithms and names no other one", { lists: s.lists });
mustHold(s.shown && s.inBox && !s.open && s.summary === "How the analysis works", "the Analysis box has a fold, How the analysis works, shut", s);
await page.click("#algorithm-pick > summary");
s = await seen(page);
mustHold(s.open && s.items.join("|") === "Count every pixel brighter than the threshold|none equal to it", "opened, it gives the algorithm's steps as a nested list", s);
mustHold(s.bold === `It shows precision of 0.90 and recall of 0.80 ${listed.measured}` && s.last.endsWith(`(${listed.versions[first.key].note})`),
  "... ending in bold with its precision and recall, its note beside it", s);
mustHold(await page.evaluate(() => document.querySelector("#algorithm-stamp").hidden), "a score with no stamp (Develop) shows none");

const scoring = () => page.evaluate(() => {
  const fold = document.querySelector("#scoring-fold"), note = document.querySelector("#scoring-note");
  return { shown: fold.checkVisibility(), within: !!document.querySelector("#algorithm-pick #scoring-fold"), summary: fold.querySelector("summary").textContent, open: fold.open,
    said: note.checkVisibility(), items: [...note.querySelectorAll("li")].map((l) => l.firstChild.textContent) };
});
let q = await scoring();
mustHold(q.shown && q.within && q.summary === "How precision and recall are scored" && !q.open && !q.said, "within it a second fold, How precision and recall are scored, shut", q);
await page.click("#scoring-fold > summary"); q = await scoring();
mustHold(q.open && q.said && q.items.join("|") === SCORING.split("\n").map((l) => l.replace(/^- /, "")).join("|"), "opened, it shows how the study scores, as its outline", q);
await page.context().close();

// the default is the one the list marks, not the first: the same list with its second marked
const other = w.device().signedInAs(tagger(w));
await defaultIs(await other.context(), "fixture", second.key);
page = await started(other);
s = await seen(page);
mustHold(parseInt(s.result) === parseInt(once) + 1 && s.result.includes(second.title), "a list marking its second algorithm default has the page run that one", [once, s.result]);
await page.click("#algorithm-pick > summary");
s = await seen(page);
mustHold(s.items.length === 1 && !s.bold, "how it works is its own, with no precision and recall it never had", s);
await other.close();

// a list that marks none: nothing runs, and the page says whose error it is
const none = w.device().signedInAs(tagger(w));
(await none.context()).route("**/studies/fixture/web/algorithms.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(LIST.map(({ default: _, ...a }) => a)) }));
page = await none.opens("fixture");
await page.setInputFiles("#file", image);
await page.waitForFunction(() => !!document.querySelector("#annotate-scratch")?.checkVisibility() && document.querySelector("#busy").hidden);
await page.click("#annotate-scratch");
await page.waitForFunction(() => /names no default algorithm/.test(document.querySelector("#status").textContent));
mustHold(await page.evaluate(() => !/pixels/.test(document.querySelector("#fx-result")?.textContent || "") && !document.documentElement.hasAttribute("data-annotating")),
  "a list marking no algorithm default: Start runs nothing and the status line says the study names no default", await page.textContent("#status"));
await none.close();

// a study from Review on: its metrics carry a stamp for each version, and the fold shows the default's (req/shell/processing/stamp)
const STAMP = { version: first.key, dataset_sha256: "0123456789abcdef".repeat(4), frozen: "2026-11-23", commit: "c0ffee1234567890c0ffee1234567890c0ffee12" };
const reviewed = w.device().signedInAs(tagger(w));
(await reviewed.context()).route("**/algorithm_metrics.json", (route) => route.fulfill({ contentType: "application/json",
  body: JSON.stringify({ ...listed, versions: { ...listed.versions, [first.key]: { ...listed.versions[first.key], stamp: STAMP } } }) }));
page = await started(reviewed);
await page.click("#algorithm-pick > summary");
const st = await page.evaluate(() => { const el = document.querySelector("#algorithm-stamp"); return { shown: el.checkVisibility(), text: el.textContent, link: el.querySelector("a")?.href ?? null }; });
mustHold(st.shown && st.text.includes("2026-11-23") && st.text.includes(first.key) && st.text.includes("01234567") && !st.text.includes("0123456789abcdef0123"),
  "from Review on the fold shows the score's version, its data set's short SHA and the freeze date", st);
mustHold(st.link === `https://github.com/missingbulb/RaunTruth/commit/${STAMP.commit}`, "... and a link to the ground truth's commit on GitHub", st);

await reviewed.visits("/web/viewer", { in: page });
mustHold(await page.evaluate(() => document.querySelector("#algorithm-pick").hidden && !document.querySelector("#scoring-fold").checkVisibility()), "a study offering no algorithms has no such fold");
await done(0);
