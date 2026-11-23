// Opens an image in a study that opens from Google Drive (req/shell/load/from) the way a user does, through the
// Google Drive dialog, from the Drive fake: standInDrive(ctx) before the page loads gives the deploy a Google key,
// and openFromDrive puts each file it is handed at Drive's top, listed in whichever folder the
// dialog shows while it is being opened.
// openFromDrive(page, file) takes a path or {name, mimeType, buffer}, as setInputFiles does, the same name and bytes
// again being the same file on Drive; it pastes the file's link where the dialog takes one (req/shell/drive/dialog),
// else opens it from the study's first folder, and returns once it is downloading.
import fs from "node:fs";
import path from "node:path";
import { click } from "./page_click.mjs";
import { siteSettings } from "./fakes/site_settings.mjs";
import { world } from "./world.mjs";

// per context, the files handed over: {name, buffer, id}
const handed = new WeakMap();

export async function standInDrive(ctx) {
  handed.set(ctx, []);
  // the context's deploy given a Google key where it has none, which a deploy with no key never gave a client
  const settings = siteSettings(ctx);
  if (!settings.env?.GOOGLE_API_KEY) settings.withoutGoogleClient();
}

export async function openFromDrive(page, file) {
  const mine = handed.get(page.context()), w = world(page.context().browser()), drive = w.drive;
  if (!mine) throw new Error("openFromDrive needs standInDrive(context) first");
  const f = typeof file === "string"
    ? { name: path.basename(file), mimeType: /\.png$/i.test(file) ? "image/png" : "image/tiff", buffer: fs.readFileSync(file) }
    : { ...file, buffer: Buffer.from(file.bytes ?? file.buffer) };
  // the same file handed again is the same file on Drive
  const again = mine.find((g) => g.name === f.name && g.buffer.equals(f.buffer));
  if (again) f.id = again.id;
  else { f.id = w.file({ name: f.name, mimeType: f.mimeType, bytes: f.buffer }).id; mine.push(f); }
  drive.offered.add(f.id);
  try {
    // the Image box may be folded: the button is pressed where it is
    await page.evaluate(() => document.querySelector("#load-remote").click());
    await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
    if (await page.evaluate(() => document.querySelector("#remote-link").checkVisibility())) {
      await page.fill("#remote-link", `https://drive.google.com/file/d/${f.id}/view`);
      await page.click("#remote-go");
    } else {
      const row = `#remote-list .item[data-id="${f.id}"]`;
      // the study's folders listed to choose from: the first. The dialog may redraw meanwhile, moving into the
      // folder it opened last, so what is listed is read again until the file's row is there, a folder opened between
      // the readings, as many as a study's folders nest
      for (let opened = 0; opened <= 4; opened++) {
        // a string: a predicate's element would come back as a handle that keeps it alive
        const shown = await (await page.waitForFunction((r) => (document.querySelector(r) ? "row" : document.querySelector("#remote-list .item.folder:not(:disabled)") ? "folder" : ""), row)).jsonValue();
        if (shown === "row") break;
        await page.dblclick("#remote-list .item.folder", { timeout: 2000 }).catch(() => {});
      }
      await page.dblclick(row);
    }
    // the dialog closes once the download starts; a folder it listed first may have left an error showing meanwhile
    await page.waitForFunction(() => !document.querySelector("#remote-dlg").open, null, { timeout: 15000 })
      .catch(async () => { throw new Error("the Drive dialog did not open the file: " + (await page.textContent("#remote-msg"))); });
  } finally { drive.offered.delete(f.id); }
}

// the Image box opened, as a user opens it when it has folded after an image, then Drive's button pressed
export async function pressDrive(page) {
  await unfold(page);
  await click(page, "#load-remote");
}
// the image selector opened (the Image box opened first), and its nth image chosen, from 1; null leaves it open
export async function pickRecent(page, nth = 1) {
  await unfold(page);
  await click(page, "#image-pick");
  if (nth != null) await page.click(`#image-menu .recent:nth-child(${nth})`);
}
async function unfold(page) {
  // an image still opening folds the box as it finishes: wait for that before reading whether it is folded
  await page.waitForFunction(() => !window.shellForTests?.page.get("opening"));
  if (await page.evaluate(() => document.querySelector("#image-box").classList.contains("folded"))) {
    await page.click("#image-box");
    await page.waitForFunction(() => document.querySelector("#load").checkVisibility() && !document.documentElement.hasAttribute("data-drawers"));
  }
}
