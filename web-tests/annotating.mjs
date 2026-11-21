// Annotation mode entered the way a person does (req/shell/annotate/choice): once an image has loaded, the left bar's Start
// annotating from scratch, the study opening afresh on the same image in annotation mode, its algorithm runner shown.
//   await fromScratch(page);         returns once the study has the image again and the page is not busy
//   await leaveAnnotating(page);      Clear all annotations from image, confirmed
// Where the study has a first step's button (a selector), the wait includes it being usable.
export async function fromScratch(page, button) {
  await page.waitForFunction(() => !!document.querySelector("#annotate-scratch")?.checkVisibility() && !document.querySelector("#busy").checkVisibility())
    .catch(async (e) => { throw new Error(e.message.split("\n")[0] + "; the page: " + await page.evaluate(() => JSON.stringify({ box: !!document.querySelector("#annotate-box")?.checkVisibility(), busy: !document.querySelector("#busy").hidden,
      status: document.querySelector("#status").textContent, stage: document.documentElement.dataset.stage, image: !!window.shellForTests?.page.get("image") }))); });
  await page.click("#annotate-scratch");
  await page.waitForFunction((b) => document.documentElement.hasAttribute("data-annotating") && !!window.shellForTests.page.get("image")
    && document.querySelector("#busy").hidden && (!b || document.querySelector(b)?.disabled === false), button);
}

export async function leaveAnnotating(page) {
  page.once("dialog", (d) => d.accept());
  await page.click("#annotate-clear");
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-annotating") && !!window.shellForTests.page.get("image") && document.querySelector("#busy").hidden);
}

// the image open and, where the page asks how to get annotations on it, from scratch chosen: for a test that works a study
// whatever its stage, which asks in some and not in others
export async function annotateIfAsked(page, button) {
  await page.waitForFunction(() => !!window.shellForTests?.page.get("image") && document.querySelector("#busy").hidden);
  if (await page.evaluate(() => !!document.querySelector("#annotate-box")?.checkVisibility())) await fromScratch(page, button);
}
