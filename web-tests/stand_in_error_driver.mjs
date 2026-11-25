// Drives a study leaving while its run is on (no warning: the run was cut off by the person), and a study's Python failing on the image it was handed (a TIFF of two channels where NoR wants three), on the stand-in
// worker answering from the study's own Python: the failure reaches the page as the real worker's does, as an error
// message, so the page says it, the button is pressed again, and nothing goes uncaught. Exits 1 on a failed check,
// 2 when it cannot run.
//   node web-tests/stand_in_error_driver.mjs ANSWERS STUDIES ROOT TWO_CHANNELS.tif NOR.tif
import { standIn } from "./stand_in_drive.mjs";
import { expecting } from "./harness.mjs";
import { STEP } from "./deadlines.mjs";

const [answers, studies, rootDir, image, nor] = process.argv.slice(2);
const errors = [];
const drive = await standIn({ answers, studies, rootDir, pageError: (e) => errors.push(e.message) });
const { open, check, done } = drive;
const page = await open(true, { id: "nor" });
// the person goes to another study while the finder runs
await page.setInputFiles("#file", nor);
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Image loaded"));
// the run's button pressed wherever the page has it, before the choice of how to annotate shows its box
const press = () => page.evaluate(() => document.querySelector("#find").click());
await press();
await page.waitForFunction(() => st.running, null, { polling: "raf" });
await page.evaluate(() => document.querySelector('#study-list a[data-id="viewer"]').click());
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready") && !document.querySelector("#find")?.classList.contains("working"));
await check(!errors.length, "a study left while its run is on is no uncaught error", errors);
await page.evaluate(() => document.querySelector('#study-list a[data-id="nor"]').click());
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Ready"));
await page.setInputFiles("#file", image);
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Image loaded"));
// the button's wait warns of the failure when it still waits as the failure comes, and not when the failure came first
await expecting(/Traceback|3-channel/, async () => {
  await press();
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Error:"), null, { timeout: STEP });
  await page.waitForFunction(() => !document.querySelector("#find").classList.contains("working"), null, { timeout: STEP });
}, { maybe: true });
await check(/3-channel/.test(await page.textContent("#status")), "Python's failure on the image is said on the status line", await page.textContent("#status"));
await check(!errors.length, "... and nothing went uncaught", errors);
await check(!(await page.evaluate(() => document.querySelector("#find").classList.contains("working"))), "... and the run's button is not left held");
await done(0);
