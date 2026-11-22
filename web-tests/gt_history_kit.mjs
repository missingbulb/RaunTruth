// What the GT history drivers share: the fixture study opened in annotation mode on the stand-in Drive, marks counted and
// dragged, the device's drafts read, a page opened on a device keeping some, and a question the page asks answered.
import { until } from "./page_until.mjs";
import { fromScratch } from "./annotating.mjs";
import { storedDrafts, seedDrafts } from "./device_storage.mjs";

export function kit({ drive, png }) {
  const { open } = drive;
  const ready = (page) => page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
  const openImage = async (page) => {
    await page.click("#load-remote");
    await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
    await page.dblclick(`#remote-list .item[data-id="${png.id}"]`);
    await page.waitForFunction((n) => st.fileName === n && !$("#fx-count").disabled, png.name);
  };
  // the image open, then annotation from scratch chosen for it (req/shell/annotate/choice)
  const tagger = async (page) => { await openImage(page); await fromScratch(page, "#fx-count"); };
  // a tagger's page in a fresh context, the image open, on a device keeping those drafts and browser keys
  const openKept = async ({ drafts = [], seed = {} } = {}) => { const page = await open(true, { seed, prepare: (ctx) => seedDrafts(ctx, drafts) }); await tagger(page); return page; };
  const model = (page) => page.evaluate(() => window.fixture.model());
  const marks = async (page) => JSON.stringify((await model(page))?.marks ?? null);
  const counted = async (page) => { await page.click("#fx-count"); await until(page, () => !!window.fixture.model()); };
  const label = (page) => page.evaluate(() => ({ hidden: $("#gt-unsaved").hidden, text: $("#gt-unsaved").textContent }));
  const center = (page, id) => page.evaluate((id) => { const r = document.querySelector(`#fx-marks circle[data-mark="${id}"]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, id);
  // a mark pressed, moved by (dx, dy) screen pixels and, unless held, let go
  const dragMark = async (page, id, dx, dy, { hold = false } = {}) => {
    const [x, y] = await center(page, id);
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + dx / 2, y + dy / 2); await page.mouse.move(x + dx, y + dy);
    if (!hold) await page.mouse.up();
  };
  const moved = async (page, id, dx, dy) => {
    const before = await marks(page);
    await dragMark(page, id, dx, dy);
    await until(page, (b) => JSON.stringify(window.fixture.model().marks) !== b, before);
  };
  const records = storedDrafts;

  // a question the page asks, answered as told; its text
  const ask = async (page, accept, act) => {
    const asked = page.waitForEvent("dialog");
    const acting = act();
    const dlg = await asked, text = dlg.message();
    await (accept ? dlg.accept() : dlg.dismiss());
    await acting;
    return text;
  };
  return { ready, openImage, tagger, openKept, model, marks, counted, label, center, dragMark, moved, records, ask };
}
