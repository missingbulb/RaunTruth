// Drives the tree's Approve folders… (web/data_mode.js, web/drive.js) in headless Chromium, against the Google fakes
// as stand_in_drive.mjs sets them up, serving ROOT, for a study manager whose token lasts but was never given Drive's per-file
// permission: the click first opens the guide to Google's screens, its Open Google's window asks Google for the
// permission, then shows Google's picker on the study's folders, the guide aside under it until the picker answers.
// Checks req/shell/data/drive-access and req/shell/account/consent-guide. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/drive_approve_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { drive, google, ROOT, SUB, GT, open, role, check, done } = await standIn({ answers, studies, rootDir });
const DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
// the picker answers once the test picks; shown: the folders it was opened on, once it is
let pick, opened;
const shownNow = new Promise((ok) => { opened = ok; });
drive.pick = (ids) => { opened(ids.join(",")); return new Promise((ok) => { pick = () => ok("picked"); }); };

const page = await open(true, { scopes: "openid email profile https://www.googleapis.com/auth/drive.appdata" });
await role(page, "Study Manager");
await page.waitForFunction(() => !$("#data-approve").hidden);
await check(await page.textContent("#data-approve") === "Approve 4 folders…", "with no per-file permission, the tree offers every folder, the ground-truth ones too", await page.textContent("#data-approve"));
await page.click("#data-approve");
const g = await page.waitForSelector("#guide-dlg[open]", { timeout: 3000 }).then(() => page.evaluate(() => ({ text: $("#guide-dlg").textContent,
  shots: $("#guide-dlg").querySelectorAll("img").length })), () => null);
if (g) g.asked = google.asked.filter((o) => o.scope?.includes(DRIVE_FILE)).length;
await check(!!g && g.asked === 0, "Approve folders… first opens the guide to Google's screens, asking Google nothing yet", g);
await check(!!g && /unsafe/.test(g.text) && /Select/.test(g.text) && g.shots >= 3, "it shows the unverified-app steps, the per-file box to tick and the picker's Select", g);
await page.click("#guide-go");
await page.waitForFunction(() => document.querySelector("#guide-dlg")?.open && !document.querySelector("#guide-dlg").matches(":modal"), null, { timeout: 5000 }).catch(() => {});
const asked = google.asked.find((o) => o.scope?.includes(DRIVE_FILE))?.scope ?? null;
await check(!!asked && asked.split(" ").includes(DRIVE_FILE), "Approve folders… asks Google for the per-file permission", asked);
const shown = await Promise.race([shownNow, page.waitForTimeout(5000).then(() => null)]); // waits on purpose: bounds a picker that never opens
await check(shown === [ROOT, SUB, GT.curated, GT.submissions].join(","), "then Google's picker shows just the study's folders", shown);
const aside = await page.evaluate(() => ({ open: $("#guide-dlg").open, modal: $("#guide-dlg").matches(":modal"), left: $("#guide-dlg").getBoundingClientRect().left }));
await check(aside.open && !aside.modal && aside.left < 40, "over the picker, the guide stays, aside at the page's left edge and not over it", aside);
pick?.();
await check(await page.waitForFunction(() => !$("#guide-dlg").open, null, { timeout: 5000 }).then(() => true, () => false), "the picker answering closes the guide");
await done(0);
