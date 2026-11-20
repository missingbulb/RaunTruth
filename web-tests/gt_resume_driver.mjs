// Drives a Ground Truth Tagger's own submission in the stand-in Drive offered back on another device
// (req/shell/ground-truth/draft-offer): Load your submission, found from two listings as the image opens, its file read only on
// the click and checked as a draft is, one from before the log loaded as a base. Counts the calls the page makes to Drive.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/gt_resume_driver.mjs ANSWERS STUDIES ROOT
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { until, untilHeard } from "./page_until.mjs";
import { kit } from "./gt_history_kit.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const drive = await standIn({ answers, studies, rootDir });
const { FILES, GT, open, check, done } = drive;
const png = FILES.find((f) => /\.png$/.test(f.name));
const sub = `${png.name.replace(/\.[^.]*$/, "")}__${createHash("sha256").update(png.bytes).digest("hex").slice(0, 8)}`;
const { asTagger, model, marks, counted, moved, ask, label } = kit({ drive, png });
const GOOGLE = "https://www.googleapis.com/";

// the page's calls to Drive from now on, told apart: the folders it listed (by parent) and the files it downloaded
const watch = (page) => {
  const seen = { lists: [], reads: [], away: 0 };
  const back = (r) => { if (r.url().startsWith(GOOGLE)) seen.away--; };
  page.on("requestfinished", back); page.on("requestfailed", back);
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(GOOGLE)) return;
    seen.away++;
    const q = new URL(u).searchParams;
    if (q.get("q")) seen.lists.push(decodeURIComponent(q.get("q")).match(/'([^']+)' in parents/)?.[1]);
    // the image's own download is not a ground-truth file's
    else if (q.get("alt") === "media" && !u.includes(png.id)) seen.reads.push(decodeURIComponent(new URL(u).pathname.split("/").at(-1)));
  });
  return seen;
};
// the page has stopped asking for anything: what the Drive dialog lists and tags as it opens is over, nothing of it still
// on its way to Drive, so what is counted after is the image's opening alone
const quiet = async (page, seen) => {
  await untilHeard(() => seen.away === 0, () => new Promise((ok) => { page.once("requestfinished", ok); page.once("requestfailed", ok); }));
  await until(page, () => { const n = performance.getEntriesByType("resource").length, same = window.seen === n; window.seen = n; return same; });
};
// the image opened from the Drive dialog, the page's calls to Drive from the double click counted, and the look for the
// image's drafts and submission over
const openImage = async (page, seen) => {
  await page.click("#load-remote");
  await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
  await page.waitForSelector(`#remote-list .item[data-id="${png.id}"]`);
  await quiet(page, seen);
  seen.lists.length = 0; seen.reads.length = 0;
  await page.dblclick(`#remote-list .item[data-id="${png.id}"]`);
  await page.waitForFunction((n) => st.fileName === n && !$("#fx-count").disabled, png.name);
  await until(page, () => document.documentElement.dataset.gtLookup === "done");
};
const tagger = async (page) => { const seen = watch(page); await asTagger(page); await openImage(page, seen); return seen; };
const submit = async (page) => {
  await page.evaluate(() => $("#gt-submit").click());
  await page.waitForFunction(() => $("#gt-dlg").open && !$("#gt-send").disabled);
  await page.click("#gt-send");
  await page.waitForFunction(() => /Submitted|not submitted/.test($("#gt-msg").textContent));
  await page.click("#gt-close");
};
const offer = (page) => page.evaluate(() => ({ shown: !$("#gt-load-submission").hidden && !$("#gt-offers").hidden, text: $("#gt-load-submission").textContent.trim(), draft: !$("#gt-load-draft").hidden,
  above: $("#gt-offers").nextElementSibling?.id }));
const submitted = () => FILES.find((f) => f.parent === FILES.find((g) => g.folder && g.name === sub && g.parent === GT.submissions)?.id);
const rows = (page) => page.evaluate(() => [...document.querySelectorAll("#eh-list li")].map((li) => ({ text: li.textContent.trim(), cls: li.className })));
const undoAll = async (page) => { while (!(await page.isDisabled("#gt-undo"))) await page.click("#gt-undo"); };

// device A submits two moves; nothing was there to offer
let page = await open(true);
let seen = await tagger(page);
await check(!(await offer(page)).shown && JSON.stringify(seen.lists) === JSON.stringify([GT.submissions]), "with nothing submitted yet there is no offer, and the image's opening listed the submissions folder alone: it has no subfolder of the image's", { lists: seen.lists });
await counted(page);
await moved(page, "m1", 20, 14); await moved(page, "m2", -16, 10);
const edited = await marks(page);
await submit(page);
const file = submitted();
await check(!!file && file.name === "gt_tester@example.com.json", "the tagger's file is in the image's subfolder of the submissions folder", file?.name);
await check(!(await offer(page)).shown, "a submission made in this visit withdraws its offer");
await page.context().close();
const original = JSON.parse(file.bytes.toString());

// device B: another browser holds no draft of the image, but the submission is offered, from two listings
page = await open(true);
seen = await tagger(page);
const subFolder = FILES.find((f) => f.folder && f.name === sub && f.parent === GT.submissions);
let o = await offer(page);
await check(o.shown && !o.draft && o.above === "gt-list" && /^Load your submission · submitted \d{1,2} [A-Z][a-z]{2}, \d\d:\d\d$/.test(o.text),
  "another device is offered the tagger's own submission above Start GT tagging, with when it was submitted, and no draft of its own", o);
await check(JSON.stringify(seen.lists) === JSON.stringify([GT.submissions, subFolder.id]) && seen.reads.length === 0,
  "the image's opening made two listings, the submissions folder then the image's subfolder, and downloaded no file", seen);
await check((await model(page)) === null && !(await page.evaluate(() => $("#tasks-box").classList.contains("folded"))), "nothing is loaded unasked, and the box is open with the image");
seen.lists.length = 0; seen.reads.length = 0;
await page.click("#gt-load-submission");
await until(page, () => !!window.fixture.model());
await check((await marks(page)) === edited && JSON.stringify(seen.reads) === JSON.stringify([file.id]) && seen.lists.length === 0,
  "the click downloads the one file, lists nothing, and brings the submitted moves back", seen);
const status = await page.textContent("#status");
await check(/submission loaded: replay verified/.test(status) && (await offer(page)).shown === false, "the replay is verified, said on the status line, and the loaded submission is no longer offered", status);
await check((await label(page)).hidden, "what Drive holds is not unsaved");
await page.click("#gt-undo"); await page.click("#gt-undo");
await check(await page.isDisabled("#gt-undo") && (await marks(page)) !== edited, "Undo works down to the algorithm's run");
await page.click("#gt-redo"); await page.click("#gt-redo");
await check((await marks(page)) === edited, "and Redo brings it back");
// nothing is kept between openings: the same image again is two listings again
await page.evaluate(() => $("#unload").click());
await page.waitForFunction(() => !st.img);
seen.lists.length = 0; seen.reads.length = 0;
await openImage(page, seen);
await check(seen.lists.length === 2 && seen.reads.length === 0 && (await offer(page)).shown, "opened again, the image is listed twice again: nothing is cached", seen);
// loading over actions not yet made saved asks first
await counted(page);
await moved(page, "m1", 12, 12);
const mid = await marks(page);
const asked = await ask(page, false, () => page.click("#gt-load-submission"));
await check(/unsaved/.test(asked || "") && (await marks(page)) === mid, "Load your submission over an unsaved action asks first, and dismissing keeps the model", asked);
await page.context().close();

// a submission from before the log loads as a base with no history
const { history: _, ...plain } = original;
file.bytes = Buffer.from(JSON.stringify(plain));
page = await open(true);
await tagger(page);
await page.click("#gt-load-submission");
await until(page, () => !!window.fixture.model());
let list = await rows(page);
await check((await marks(page)) === edited && await page.isDisabled("#gt-undo") && /no history/.test(await page.textContent("#status")), "a file with no history loads as a base: its marks, no Undo, and the status line says it held no history", await page.textContent("#status"));
await check(list.some((r) => /Ground truth by tester@example\.com, .*, no history/.test(r.text)), "its Edit History row says whose it is, when, and no history", list);
await page.context().close();

// a run after a loaded base carries what it can and says what it could not: on the status line, and on the run's row
const far = { ...plain, marks: [{ id: "m1", x: 5, y: 55 }, { id: "m2", x: 75, y: 3 }] };
file.bytes = Buffer.from(JSON.stringify(far));
page = await open(true);
await tagger(page);
await page.click("#gt-load-submission");
await until(page, () => !!window.fixture.model());
await page.click("#fx-count");
await until(page, () => window.fixture.model().marks.some((m) => m.x > 8 && m.x < 22));
const said = await page.textContent("#status");
list = await rows(page);
const ran = await page.evaluate(() => [...document.querySelectorAll("#eh-list li")].find((li) => /Algorithm ran/.test(li.textContent))?.title);
await check(/no item for 2 earlier decisions or edits/.test(said) && list.some((r) => /Algorithm ran: .* · 2 not carried over/.test(r.text)) && /m1, m2/.test(ran || ""),
  "a run after a loaded base says on the status line and on its row how many edits it could not carry over, the row's tooltip naming them", { said, list, ran });
await page.context().close();

// a file whose model was altered after its history was written says mismatch, and the stored model is what loads
const altered = JSON.parse(JSON.stringify(original));
altered.marks[0].x += 9;
file.bytes = Buffer.from(JSON.stringify(altered));
page = await open(true);
await tagger(page);
await page.click("#gt-load-submission");
await until(page, () => !!window.fixture.model());
list = await rows(page);
await check(JSON.stringify((await model(page)).marks) === JSON.stringify(altered.marks.map((m) => ({ ...m }))) && /did not replay/.test(await page.textContent("#status")),
  "a file whose model was altered says its history did not replay, and the stored model is the one loaded", await page.textContent("#status"));
await check(list.some((r) => /Earlier history, not replayable/.test(r.text)), "its earlier history is set aside in the window", list);
await page.context().close();

// another tagger's file is not offered, and nobody but a tagger is looked up for
file.name = "gt_someone@else.org.json"; file.bytes = Buffer.from(JSON.stringify(original));
page = await open(true);
seen = await tagger(page);
await check(!(await offer(page)).shown && seen.lists.length === 2 && seen.reads.length === 0, "another tagger's file is not the tagger's: no offer, and still no file read", { lists: seen.lists, reads: seen.reads });
await page.context().close();
file.name = "gt_tester@example.com.json";
page = await open(true);
seen = watch(page);
await page.click("#load-remote");
await page.waitForFunction(() => document.querySelector("#remote-dlg").open);
await page.waitForSelector(`#remote-list .item[data-id="${png.id}"]`);
await quiet(page, seen);
seen.lists.length = 0;
await page.dblclick(`#remote-list .item[data-id="${png.id}"]`);
await page.waitForFunction((n) => st.fileName === n && !$("#fx-count").disabled, png.name);
await until(page, () => document.documentElement.dataset.gtLookup === "done");
await check(!seen.lists.includes(GT.submissions) && !seen.lists.includes(subFolder.id) && !(await offer(page)).shown, "outside the tagger role the submissions folder is not listed at all", seen.lists);
await page.context().close();
await done(0);
