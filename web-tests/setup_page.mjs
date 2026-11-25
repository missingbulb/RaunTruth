// Study Setup's page as its drivers reach it (req/setup/aspects, req/setup/image): an aspect chosen in the rail, the stage on
// show, and the image chosen opened in its dialog.
export const aspect = (page, word) => page.evaluate((w) => document.querySelector(`#setup-rail button[data-aspect="${w}"]`).click(), word);
export const stageNow = (page) => page.evaluate(() => document.querySelector("#stage-steps > li[aria-current] .stage-name")?.textContent.trim() ?? null);
// the image chosen, read, shown in its dialog
export async function openImage(page) {
  await page.waitForFunction(() => !document.querySelector("#image-open").disabled);
  if (!(await page.evaluate(() => document.querySelector("#image-dlg").open))) await page.click("#image-open");
  await page.waitForFunction(() => document.querySelector("#image-dlg").open && document.querySelector("#view").checkVisibility({ visibilityProperty: true }));
}
