// Drives req/setup/sharing-check and req/setup/people in headless Chromium against the stand-in Google of stand_in_drive.mjs
// serving ROOT, with the fake Drive's permissions seeded per case: Study Setup reads the study's sharing, lists each
// correction its stage needs, and changes one item's sharing only when the owner presses that correction's Fix and confirms.
// Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/setup_sharing_driver.mjs ANSWERS STUDIES ROOT
import { standIn } from "./stand_in_drive.mjs";
import { expecting } from "./harness.mjs";

const [answers, studies, rootDir] = process.argv.slice(2);
const { w, root: studyRoot, drive, open, check, done, ROOT, GT, studyFile, EMAIL } = await standIn({ answers, studies, rootDir });
const Y = "y@example.com", Z = "z@example.com";

// the root's Data and Previews folders, as a study keeps them, its study file, the page's own, and the extractions folder
const dataFolder = studyRoot.folder("Data"), previewsFolder = studyRoot.folder("Previews"), PREVIEWS = previewsFolder.id;
const study = w.of(studyRoot.studyFile()), extractions = w.of(GT.extractions);
const link = (id) => `https://drive.google.com/drive/folders/${id}?usp=sharing`;

// the sharing as a case needs it: root "named" (its members alone) or "link"; the link-readable items public or private; who writes the
// extractions folder; the study file's stage, none for a study as it is today; the tester the root's manager throughout
const seed = ({ root = "named", others = "public", members = [EMAIL, Y], writers = [Y], stage } = {}) => {
  studyRoot.namesNoOne().writableBy(EMAIL);
  if (root === "link") studyRoot.public(); else studyRoot.readableBy(...members);
  for (const item of [dataFolder, previewsFolder, study]) if (others === "public") item.public(); else item.private();
  extractions.namesNoOne().writableBy(...writers);
  drive.refuseSharing = false;
  studyFile({ stage });
};
const settled = (page, was = 0) => page.waitForFunction((n) => $("#sharing-box").dataset.state === "done" && +$("#sharing-box").dataset.checks > n, was);
const checks = (page) => page.evaluate(() => +$("#sharing-box").dataset.checks);
const shown = (page) => page.evaluate(() => ({
  state: $("#sharing-state").textContent,
  corrections: [...document.querySelectorAll("#sharing-corrections .sharing-correction")].map((li) => ({
    item: li.querySelector(".sharing-item").textContent, change: li.querySelector(".sharing-change").textContent,
    where: li.querySelector("a.sharing-where")?.href ?? null, pictures: li.querySelectorAll("img").length,
    fix: !!li.querySelector("button.sharing-fix"), refused: li.querySelector(".sharing-refused")?.textContent ?? null })),
}));
const permissionWrites = () => drive.writes.filter((w) => w[0] === "share" || w[0] === "unshare");
const opened = async (seeds) => { seed(seeds); const page = await open(true, { setup: true }); await settled(page); return page; };
const recheck = async (page) => { const n = await checks(page); await page.click("#sharing-recheck"); await settled(page, n); };

// a Develop root shared by link: one correction, naming the root; the pictures and the link to its sharing dialog with it
let page = await opened({ root: "link" });
let s = await shown(page);
await check(s.corrections.length === 1 && /root/i.test(s.corrections[0].item) && s.corrections[0].change === "Make it shared with named people only",
  "a Develop root shared by link: one correction, naming the root, Make it shared with named people only", s);
await check(s.corrections[0].where === link(ROOT) && s.corrections[0].pictures >= 1 && s.corrections[0].fix, "it holds a link to the root's sharing dialog, a picture and a Fix button", s.corrections[0]);
await page.context().close();

// the Previews folder not readable by link: one correction, naming it
page = await opened({ others: "public" });
previewsFolder.private();
await recheck(page);
s = await shown(page);
await check(s.corrections.length === 1 && /Previews/.test(s.corrections[0].item) && s.corrections[0].change === "Share it by link" && s.corrections[0].where === link(PREVIEWS),
  "Previews not readable by link: one correction naming it, with the link to its sharing dialog", s);
await page.context().close();

// the study file not readable by link, and the extractions folder written by no one: two corrections, the second with nothing the site can fix
page = await opened({ writers: [] });
study.private();
await recheck(page);
s = await shown(page);
await check(s.corrections.length === 2 && /study file/i.test(s.corrections[1].item) && s.corrections[1].where === `https://drive.google.com/file/d/${study.id}/view?usp=sharing`
  && /Extractions/.test(s.corrections[0].item) && !s.corrections[0].fix && s.corrections[0].where === link(GT.extractions),
  "an unreadable study file and an extractions folder no one may write: each its correction, the extractions one with no Fix", s);
await page.context().close();

// everything right
page = await opened();
s = await shown(page);
await check(s.corrections.length === 0 && /Sharing is as this stage needs/.test(s.state), "everything right: Sharing is as this stage needs, and no correction", s);

// People: who holds which of the three shares
await page.context().close();
seed({ members: [Z, Y], writers: [Y] });
page = await open(true, { setup: true });
await settled(page);
const people = await page.evaluate(() => ({
  rows: Object.fromEntries([...document.querySelectorAll("#people-list [data-email]")].map((li) => [li.dataset.email, [...li.querySelectorAll(".holds")].map((x) => x.textContent)])),
  links: [...document.querySelectorAll("#people-list a")].map((a) => a.href) }));
await check(JSON.stringify(Object.entries(people.rows).sort()) === JSON.stringify([[EMAIL, ["sees", "manages"]], [Y, ["sees", "annotates"]], [Z, ["sees"]]].sort()),
  "People lists each member with the shares they hold: sees, annotates, manages", people.rows);
await check(people.links.includes(link(ROOT)) && people.links.includes(link(GT.extractions)), "and links to the sharing dialog of the root and of the extractions folder", people.links);

// the promotion to Review with the root still members-only: the correction appears; the share seeded and Check again pressed, it clears
studyFile({ stage: "Review" });
await recheck(page);
s = await shown(page);
await check(s.corrections.length === 1 && s.corrections[0].change === "Share the root by link", "promoted to Review with the root members-only: the correction Share the root by link appears", s);
studyRoot.public();
await recheck(page);
s = await shown(page);
await check(s.corrections.length === 0 && /Sharing is as this stage needs/.test(s.state), "the root shared and Check again pressed: it clears", s);
await check(permissionWrites().length === 0 && drive.shared.length === 0 && drive.unshared.length === 0, "through every case so far the log holds no change of sharing");
await check(drive.calls.some((c) => /\/permissions/.test(c.url)) && drive.calls.filter((c) => /\/permissions/.test(c.url)).every((c) => c.method === "GET"), "only permission reads", drive.calls.filter((c) => /\/permissions/.test(c.url)).map((c) => c.method));
await page.context().close();

// Fix, then Cancel: nothing is written
page = await opened({ stage: "Review" });
await page.click("#sharing-corrections .sharing-fix");
await page.waitForSelector("#sharing-corrections .sharing-confirm");
const asks = await page.evaluate(() => document.querySelector("#sharing-corrections .sharing-confirm").textContent);
await check(/anyone with the link/i.test(asks), "Fix asks to confirm, saying what will change", asks);
await page.click("#sharing-corrections .sharing-confirm-cancel");
s = await shown(page);
await check(permissionWrites().length === 0 && s.corrections.length === 1 && s.corrections[0].fix, "Cancel writes nothing, and the correction keeps its Fix", s);

// Fix, then Confirm: exactly one permission write, on the root, and the correction clears
const n = await checks(page);
await page.click("#sharing-corrections .sharing-fix");
await page.click("#sharing-corrections .sharing-confirm-go");
await settled(page, n);
s = await shown(page);
await check(JSON.stringify(permissionWrites()) === JSON.stringify([["share", "Study folder one"]]) && drive.shared[0][1].type === "anyone", "Fix then Confirm: exactly one permission write, on the root", permissionWrites());
await check(s.corrections.length === 0 && /Sharing is as this stage needs/.test(s.state), "and the correction clears", s);
await page.context().close();

// the same for a root to make members-only: the link permission is removed
page = await opened({ root: "link" });
const m = await checks(page);
await page.click("#sharing-corrections .sharing-fix");
await page.click("#sharing-corrections .sharing-confirm-go");
await settled(page, m);
s = await shown(page);
await check(JSON.stringify(drive.unshared) === JSON.stringify([["Study folder one", "anyoneWithLink"]]) && permissionWrites().length === 2, "Fix on a root shared by link removes that link permission, one write", drive.unshared);
await check(s.corrections.length === 0, "and the correction clears", s);
await page.context().close();

// anyone with the link may edit the extractions folder: a correction taking that off, not a writer; Fix removes that one permission, then a link that reads is offered
page = await opened({ writers: [EMAIL] });
extractions.public();
drive.linkEdit.add(GT.extractions);
await recheck(page);
s = await shown(page);
await check(s.corrections.length === 1 && /Extractions/.test(s.corrections[0].item) && s.corrections[0].change === "Take off the link's edit access" && s.corrections[0].fix,
  "anyone with the link may edit the extractions folder: one correction, with a Fix", s);
const q = await checks(page), wrote = permissionWrites().length;
await page.click("#sharing-corrections .sharing-fix");
await check(/no longer edit/i.test(await page.textContent("#sharing-corrections .sharing-confirm p")) && permissionWrites().length === wrote, "Fix asks to confirm, saying the link will no longer edit, and writes nothing yet");
await page.click("#sharing-corrections .sharing-confirm-go");
await settled(page, q);
s = await shown(page);
await check(JSON.stringify(drive.unshared.at(-1)) === JSON.stringify(["Extractions", "anyoneWithLink"]) && permissionWrites().length === wrote + 1, "Confirm: exactly one permission write, taking off that link permission", drive.unshared);
await check(s.corrections.length === 1 && s.corrections[0].change === "Share it by link", "and the link that reads is offered next, as its own correction", s);
extractions.public();
await page.context().close();

// Drive refuses the change (403): that correction drops its Fix and keeps its link and its pictures, with a line saying to change it there; the other keeps its Fix
page = await opened({ stage: "Review" });
previewsFolder.private();
await recheck(page);
const before = permissionWrites().length;
drive.refuseSharing = true;
const k = await checks(page);
await page.click("#sharing-corrections .sharing-correction:first-child .sharing-fix");
await expecting(/403/, async () => {
  await page.click("#sharing-corrections .sharing-confirm-go");
  await settled(page, k);
});
s = await shown(page);
const [root, previews] = s.corrections;
await check(s.corrections.length === 2 && /root/i.test(root.item) && !root.fix && root.where === link(ROOT) && root.pictures >= 1 && /change it/i.test(root.refused ?? ""),
  "Drive refusing the change: the root's correction drops its Fix, keeps its link and pictures and says to change it there", root);
await check(previews.fix && previews.refused === null, "the other correction keeps its Fix", previews);
await check(permissionWrites().length === before, "and nothing was changed", permissionWrites());
await recheck(page);
s = await shown(page);
await check(!s.corrections[0].fix && /change it/i.test(s.corrections[0].refused ?? ""), "Check again keeps the refused correction without its Fix", s.corrections[0]);
await done(0);
