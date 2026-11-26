// An analysis started the way a person does (req/shell/annotate/choice, req/shell/analysis/start): once an image has loaded,
// the Analysis box's Start, the algorithm chosen in its dialog, and Run; where the stage lets the user annotate, the study opens
// afresh on the same image in annotation mode; the study's first step is pressed for the user and has run.
//   await fromScratch(page);                        returns once that run is done and the page is not busy
//   await fromScratch(page, "#fx-count", { algorithm: "below" });   the algorithm to choose in the dialog, by its key
//   await fromScratch(page, "#bs-find", { run: false });   a study of several steps, whose runner Run opens without pressing
//   await openStart(page);                          the Start dialog open, for a test of the dialog itself
//   await loadStored(page, key);                    Load, and in its dialog the Analysis File with that key, read-only
//   await leaveAnnotating(page);                    reset analysis, confirmed
// Where the study has a first step's button (a selector), the wait includes it being usable again.
// Each wait includes the hold on the page, kept while the study comes in again, being over: until then the page takes no press.
export async function openStart(page) {
  await page.waitForFunction(() => !!document.querySelector("#annotate-scratch")?.checkVisibility() && !document.querySelector("#busy").checkVisibility())
    .catch(async (e) => { throw new Error(e.message.split("\n")[0] + "; the page: " + await page.evaluate(() => JSON.stringify({ box: !!document.querySelector("#annotate-box")?.checkVisibility(), busy: !document.querySelector("#busy").hidden,
      status: document.querySelector("#status").textContent, stage: document.documentElement.dataset.stage, image: !!window.shellForTests?.page.get("image") }))); });
  await page.click("#annotate-scratch");
  return page.evaluate(() => document.querySelector("#start-dlg").open);
}

export async function fromScratch(page, button, { algorithm, run = true } = {}) {
  if (await openStart(page)) {
    await page.waitForFunction(() => document.querySelector("#algorithm").options.length > 0);
    if (algorithm) await page.selectOption("#algorithm", algorithm);
    await page.click("#start-run");
  }
  await page.waitForFunction(([b, r]) => {
    const steps = window.shellForTests.steps, first = steps[1];
    return !!window.shellForTests.page.get("image") && document.querySelector("#busy").hidden && !document.querySelector("#start-dlg").open && !document.documentElement.hasAttribute("data-held")
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
