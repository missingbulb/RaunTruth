// Drives req/setup/results in headless Chromium on the fixture study, against the stand-in Google of stand_in_drive.mjs serving ROOT
// (three images): official marks seeded on two of them, one an algorithm's extraction and one a person's. Study Setup's Results box reads
// nothing until Show results is pressed; then it lists one row per image with an official mark (the image, the algorithm and version or
// "by hand", the study's measures) and the totals last; Download CSV saves the same rows from the page, asking nothing of the network.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_results_driver.mjs ANSWERS STUDIES ROOT
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { standIn } from "./stand_in_drive.mjs";
import { until, idle } from "./page_until.mjs";
import { personFile, runFile } from "../web/truth_folders.js";

const [answers, studies, rootDir] = process.argv.slice(2);
const { w, drive, GT, studyFile, open, check, done } = await standIn({ answers, studies, rootDir, rooted: true });
const Y = "y@lab.example";

const shaOf = (n) => createHash("sha256").update(fs.readFileSync(path.join(rootDir, n))).digest("hex");
const subOf = (name) => w.of(GT.extractions).folder(`${name.replace(/\.[^.]*$/, "")}__${shaOf(name).slice(0, 8)}`, { bySite: true });
const body = (name, extra, count) => Buffer.from(JSON.stringify({ created: "2026-11-01T10:00:00Z", image: { name, sha256: shaOf(name) }, labels: [{ threshold: 100, count }], marks: [{ id: "m1", x: 12, y: 12 }], checked: true, ...extra }));
// img1's official extraction is a batch run's of the algorithm `above` (it names no tagger and begins with that run); img2's is y's own; img3 has no official mark
const run1 = subOf("img1.png").holds({ name: runFile("above", "abcdef01"),
  bytes: body("img1.png", { history: { actions: [{ type: "run", algorithm: "above", version: { site: "1.0", code: "abcdef0123456789" }, output: {} }] } }, 7) }, { bySite: true });
const own2 = subOf("img2.png").holds({ name: await personFile(Y), bytes: body("img2.png", { tagger: Y }, 5) }, { bySite: true });
const own3 = subOf("img3.png").holds({ name: await personFile(Y), bytes: body("img3.png", { tagger: Y }, 9) }, { bySite: true });
studyFile({ stage: "Analyze", marks: { [shaOf("img1.png")]: { official: { file: run1.id, by: null } }, [shaOf("img2.png")]: { official: { file: own2.id, by: Y } },
  [shaOf("img3.png")]: { gt: { file: own3.id, by: Y } } } });
const official = new Set([run1.id, own2.id]);
const readsOf = (ids) => drive.calls.filter((c) => c.kind === "download" && ids.has(c.id));
const table = (page) => page.evaluate(() => ({
  rows: [...document.querySelectorAll("#results-scroll table tbody tr")].map((r) => [...r.cells].map((c) => c.textContent.trim())),
  head: [...document.querySelectorAll("#results-scroll table thead th")].map((c) => c.textContent.trim()),
  total: [...(document.querySelector("#results-scroll table tfoot tr")?.cells ?? [])].map((c) => c.textContent.trim()),
}));

const page = await open(true, { setup: true });
await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-folder").length >= 1);
await idle(page);
await check(await page.evaluate(() => document.querySelector("#results-box")?.checkVisibility() === true), "Study Setup has a Results box");
await check(await page.evaluate(() => document.querySelector("#results-show")?.textContent.trim()) === "Show results", "it offers a Show results button");
await check(await page.evaluate(() => !document.querySelector("#results-csv")?.checkVisibility()) && (await table(page)).rows.length === 0, "with nothing read yet there is no table and no download");
await check(readsOf(official).length === 0 && readsOf(new Set([own3.id])).length === 0, "opening Study Setup reads no extraction of an image's results", readsOf(official).map((c) => c.id));

await page.click("#results-show");
await page.waitForFunction(() => document.querySelectorAll("#results-scroll table tbody tr").length > 0 && !document.querySelector("#results-box").classList.contains("busy"));
let t = await table(page);
await check(JSON.stringify(t.head) === JSON.stringify(["Image", "Algorithm", "Pixels counted"]), "the table's columns are the image, the algorithm and the study's measures", t.head);
await check(JSON.stringify(t.rows) === JSON.stringify([["img1.png", "above abcdef01", "7"], ["img2.png", "by hand", "5"]]), "one row per image with an official mark, none for the image with only a GT mark", t.rows);
await check(JSON.stringify(t.total) === JSON.stringify(["Total (2 images)", "", "12"]), "the totals come last", t.total);
await check(readsOf(official).length === 2 && readsOf(new Set([own3.id])).length === 0, "the press read the two official extractions and nothing else", readsOf(new Set([own3.id])).length);

// the CSV is made on the page from those rows: no request goes out for it
const before = drive.calls.length, seen = [];
page.on("request", (r) => seen.push(r.url()));
const [download] = await Promise.all([page.waitForEvent("download"), page.click("#results-csv")]);
const csv = fs.readFileSync(await download.path(), "utf8");
await check(download.suggestedFilename() === "results.csv" || /results\.csv$/.test(download.suggestedFilename()), "Download CSV saves a file named for the results", download.suggestedFilename());
await check(csv === "Image,Algorithm,Pixels counted\nimg1.png,above abcdef01,7\nimg2.png,by hand,5\nTotal (2 images),,12\n", "the CSV holds the same rows and the totals", csv);
await check(drive.calls.length === before && !seen.some((u) => !u.startsWith("blob:")), "downloading it asks the network for nothing", seen);

// an official mark taken off: the next press lists one row fewer
studyFile({ marks: { [shaOf("img1.png")]: { official: { file: run1.id, by: null } } } });
await page.click("#results-show");
await until(page, () => document.querySelectorAll("#results-scroll table tbody tr").length === 1);
t = await table(page);
await check(JSON.stringify(t.rows) === JSON.stringify([["img1.png", "above abcdef01", "7"]]) && t.total[2] === "7", "a press reads the marks again: an image no longer marked official has no row", t);
await done(0);
