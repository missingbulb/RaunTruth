// An analysis started the way a person does (req/shell/annotate/choice, req/shell/analysis/start): once an image has loaded,
// the Analysis box's Start; where the stage lets the user annotate, the study opens afresh on the same image in annotation
// mode; the study's first step is pressed for the user, with the study's default algorithm, and has run.
//   await fromScratch(page);                        returns once that run is done and the page is not busy
//   await fromScratch(page, "#bs-find", { run: false });   a study of several steps, whose runner Start opens without pressing
//   await defaultIs(context, "nor", "rf");          before the page opens: the study's list marks that algorithm default
//   await loadStored(page, key);                    Load, and in its dialog the Analysis File with that key, read-only
//   await leaveAnnotating(page);                    reset analysis, confirmed
// Where the study has a first step's button (a selector), the wait includes it being usable again.
// Each wait includes the hold on the page, kept while the study comes in again, being over: until then the page takes no press.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The study's own list served with another of its algorithms marked default: the page offers no choice of algorithm, so a
// test of a study's other algorithm on the page has the study say it is the default. list: the list to start from, where
// the test serves one of its own
export async function defaultIs(context, study, key, list = JSON.parse(fs.readFileSync(path.join(REPO, "studies", study, "web", "algorithms.json"), "utf8"))) {
  if (!list.some((a) => a.key === key)) throw new Error(`${study} lists no algorithm "${key}"`);
  const body = JSON.stringify(list.map(({ default: _, ...a }) => (a.key === key ? { ...a, default: true } : a)));
  await context.route(`**/studies/${study}/web/algorithms.json`, (route) => route.fulfill({ contentType: "application/json", body }));
}

export async function fromScratch(page, button, { run = true } = {}) {
  await page.waitForFunction(() => !!document.querySelector("#annotate-scratch")?.checkVisibility() && !document.querySelector("#busy").checkVisibility())
    .catch(async (e) => { throw new Error(e.message.split("\n")[0] + "; the page: " + await page.evaluate(() => JSON.stringify({ box: !!document.querySelector("#annotate-box")?.checkVisibility(), busy: !document.querySelector("#busy").hidden,
      status: document.querySelector("#status").textContent, stage: document.documentElement.dataset.stage, image: !!window.shellForTests?.page.get("image") }))); });
  await page.click("#annotate-scratch");
  await page.waitForFunction(([b, r]) => {
    const steps = window.shellForTests.steps, first = steps[1];
    return !!window.shellForTests.page.get("image") && document.querySelector("#busy").hidden && !document.documentElement.hasAttribute("data-held")
      && !!document.querySelector("#processing-box")?.checkVisibility() && (!first || first.done || !r) && (!b || document.querySelector(b)?.disabled === false);
  }, [button, run]);
}

// an Analysis File of the store loaded read-only, as a person does: Load once it is on, the file chosen in its dialog (the one
// with that key, or the first), and Load there
export async function loadStored(page, key) {
  await page.waitForFunction(() => !!document.querySelector("#annotate-load")?.checkVisibility() && !document.querySelector("#annotate-load").disabled);
  await page.click("#annotate-load");
  await page.click(key ? `#annotate-list button[data-key="${key}"]` : "#annotate-list button[data-key]");
  await page.click("#load-go");
}

export async function leaveAnnotating(page) {
  page.once("dialog", (d) => d.accept());
  await page.click("#annotate-clear");
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-annotating") && !document.documentElement.hasAttribute("data-held") && !!window.shellForTests.page.get("image") && document.querySelector("#busy").hidden);
}

// the image open and an analysis started on it: for a test that works a study whatever its stage
export async function annotateIfAsked(page, button) {
  await page.waitForFunction(() => !!window.shellForTests?.page.get("image") && document.querySelector("#busy").hidden);
  if (await page.evaluate(() => !!document.querySelector("#annotate-scratch")?.checkVisibility())) await fromScratch(page, button);
}
