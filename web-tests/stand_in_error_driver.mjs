// Drives a study's Python failing on the image it was handed (a TIFF of two channels where NoR wants three), on the stand-in
// worker answering from the study's own Python: the failure reaches the page as the real worker's does, as an error
// message, so the page says it, the button is pressed again, and nothing goes uncaught. Exits 1 on a failed check,
// 2 when it cannot run.
//   node web-tests/stand_in_error_driver.mjs ANSWERS STUDIES ROOT TWO_CHANNELS.tif
import { standIn } from "./stand_in_drive.mjs";
import { STEP } from "./deadlines.mjs";

const [answers, studies, rootDir, image] = process.argv.slice(2);
const errors = [];
const drive = await standIn({ answers, studies, rootDir, pageError: (e) => errors.push(e.message) });
const { open, check, done } = drive;
const page = await open(true, { id: "nor" });
await page.setInputFiles("#file", image);
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Image loaded"));
await page.click("#sb-find");
await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Error:"), null, { timeout: STEP });
await page.waitForFunction(() => !document.querySelector("#sb-find").classList.contains("working"), null, { timeout: STEP });
await check(/3-channel/.test(await page.textContent("#status")), "Python's failure on the image is said on the status line", await page.textContent("#status"));
await check(!errors.length, "... and nothing went uncaught", errors);
await check(!(await page.evaluate(() => document.querySelector("#sb-find").classList.contains("working"))), "... and the run's button is not left held");
await done(0);
