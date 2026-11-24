// Drives the page (web/) in headless Chromium on the fixture study, with a stand-in worker answering from
// ANSWERS (tests/test_study_runs.py), and checks the status bar: no stage in it, the study's stage a bordered label
// on its row in the switcher, whose popup lists the stages; no breadcrumbs of the steps, the button of the step to do now shining and
// nothing else; a new image starting over; a Review study with no Save step;
// the second view's switch reading Tasks with what is left while the study makes ground truth, Items otherwise;
// a Public study with no Save step; switching study in place bringing its own stage and steps; the disk, memory, network and CPU as grey icons and
// numbers, each opening its own tab of one dialog, each rolling its changed characters to a new value, the CPU and
// the network flashing on a sharp rise and rolling nothing when reduced motion is asked for; a separator between every two items; no question-mark pointer; the four folded into one icon at first, unfolded by hovering it but not by going offline,
// a network over 250 KB/s for 5 s or a tab over 1 GB, at once with animations off, folding back 5 to 10 s after, or set always open or hidden.
// Optional SHOTS: a directory for screenshots. Exits 1 on a failed check, 2 when it cannot run.
//   node web-tests/status_bar_driver.mjs ANSWERS IMAGE.png STUDIES [SHOTS]
import { fromScratch } from "./annotating.mjs";
import { EARLY } from "./early_messages.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { tagger } from "./tagger.mjs";
import { standInDrive } from "./drive_open.mjs";
import { pw, launch, expecting, NETWORK_GONE } from "./harness.mjs";
import { serveSite } from "./site_server.mjs";
import { orMissed } from "./page_until.mjs";
import { world } from "./world.mjs";
import { STEP } from "./deadlines.mjs";


const [answers, image, studies, shots] = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MB = 2 ** 20;
const BIG = 6 * MB; // a download fast enough to flash the network

// the fixture's answers, each saying how much memory Python holds and how long it has worked as the real worker
// does; memory: what Python holds in use after a collection. A count keeps Python working for WORK ms, told once it
// is done, so the CPU rises in one step, and grows Python's memory by 10 MB.
const WORK = 1500;
const STAND_IN = `
const A = await (await fetch("answers.json")).json();
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
let ms = 0, heap = ${60 * MB};
const mem = () => ({ heap, files: ${20 * MB}, busy: { ms, since: null } });
const work = (n) => { postMessage({ type: "progress", text: "Counting…", ...mem() }); const t = Date.now(); while (Date.now() - t < n); ms += n; heap += ${10 * MB}; };
const first = new URL(location.href).searchParams.get("study");
if (A.ready[first]) postMessage({ type: "ready", info: A.ready[first], ...mem() });
onmessage = ({ data: m }) => {
  if (m.type === "study") postMessage({ type: "ready", info: A.ready[m.id], ...mem() });
  else if (m.type === "open") { const images = bytes(A.images); postMessage({ type: "opened", meta: A.opened, images, ...mem() }, [images.buffer]); }
  else if (m.type === "call") { work(${WORK}); const b = bytes(A.mask); postMessage({ type: "result", action: m.action, meta: A.count, bytes: b, echo: m.echo, ...mem() }, [b.buffer]); }
};`;
let stage = null; // the fixture's stage as served; null: as committed
const bytes = (n) => ({ type: "application/octet-stream", headers: { "cache-control": "no-store" }, body: Buffer.alloc(n) });
const { origin, server } = await serveSite({
  "/web/worker.js": EARLY + STAND_IN,
  "/some/": (q, u) => bytes(Number(u.slice(6)) * 1024),
  "/big": () => bytes(BIG),
  "/web/vendor/wheels.json": "[]",
  "/web/answers.json": { file: answers },
});

const browser = await launch(pw), w = world(browser, origin);
w.site.withGoogle();
w.studies.fromThisComputer("fixture");
// the fixture at the stage the test sets, and listed, as the build lists no fixture, so its row in the switcher carries it
w.studies.edit("fixture", (m) => (stage ? { ...m, stage } : m));
w.studies.editList(() => {
  const fixture = JSON.parse(fs.readFileSync(path.join(repo, "studies/fixture/study.json")));
  return [...JSON.parse(fs.readFileSync(studies)), { id: fixture.id, title: fixture.title, stage: stage || fixture.stage }];
});
const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
const check = async (ok, what, seen) => { if (!ok) { console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); await done(1); } console.log("ok: " + what); };
const shot = async (page, name) => { if (shots) await page.locator("#statusbar").screenshot({ path: path.join(shots, name + ".png") }); };

// mode: the resources block's setting the visit starts with, unless the page has kept another; none: the page's own
// each two neighbouring items on show: [left, right, has a bar between, should have one]. The resources block counts
// as the items within it, the four only while unfolded and the icon only while it shows; none goes between the four.
const bars = (page) => page.evaluate(() => {
  const clip = document.querySelector("#sb-res-items").getBoundingClientRect().width;
  const four = (e) => e.matches("#sb-res-items > *");
  const shown = [...document.querySelectorAll("#statusbar > *")].flatMap((e) => (e.id === "sb-res" ? [...e.querySelectorAll("#sb-res-items > *, #sb-res-icon")] : [e]))
    .filter((e) => e.getBoundingClientRect().width >= 1 && !e.matches(".grow, #whats-new") && (clip > 0 || !four(e)));
  return shown.slice(1).map((b, k) => { const a = shown[k];
    return [a.id, b.id, getComputedStyle(a).borderRightWidth === "1px" || getComputedStyle(b).borderLeftWidth === "1px", !(four(a) && (four(b) || b.id === "sb-res-icon"))]; });
});

// clock: the page's clock made one the test can move past a wait on the page's own timers; it runs as the real one does;
// seed: browser keys kept before the page opens
async function open(study, mode, clock, seed = {}) {
  const device = w.device().with({ acceptDownloads: true }).signedInAs(tagger(w))
    .keeps({ ...(mode ? { "nor-resources": JSON.stringify(mode) } : {}), ...seed });
  const ctx = await device.context();
  if (clock) await ctx.clock.install();
  await standInDrive(ctx);
  // what each of the four numbers did: rolled (each changed character wrapped to roll, the rolled ones' animations
  // as computed), and flashed
  await ctx.addInitScript(() => {
    window.seen = {};
    addEventListener("DOMContentLoaded", () => {
      for (const id of ["sb-disk", "sb-memory", "sb-net", "sb-cpu"]) {
        const e = document.getElementById(id), s = (window.seen[id] = { rolled: 0, anim: [], spiked: false });
        new MutationObserver(() => {
          const r = e.querySelectorAll(".v .roll > span");
          if (r.length) { s.rolled++; s.anim.push(getComputedStyle(r[0]).animationName); s.text = e.querySelector(".v").textContent; }
          if (e.classList.contains("spike")) s.spiked = true;
        }).observe(e, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
      }
    });
  });
  return { ctx, page: await device.opens(study || undefined) };
}
// the one button that shines, that of the step to do now, or none once every step is done (req/shell/steps)
const shining = (page) => page.evaluate(() => [...document.querySelectorAll(".shine")].map((e) => "#" + e.id).sort());
const shines = async (page, want) => {
  await orMissed(page.waitForFunction((w) => [...document.querySelectorAll(".shine")].map((e) => "#" + e.id).sort().join() === w, want.join()));
  const now = await shining(page);
  await check(now.join() === want.join(), `shining: ${want.join() || "nothing"}`, now);
  await check(!(await page.$("#sb-steps, #statusbar .crumb")), "and the status bar holds no breadcrumbs");
};
// the stage: not in the status bar, but a bordered label on the open study's row in the switcher
const stageIs = async (page, stage) => {
  const s = await page.evaluate(() => {
    const id = document.querySelector("#study-list a[aria-current=page]")?.dataset.id;
    const t = document.querySelector(`#study-list a[data-id="${id}"] .stage-tag`);
    return { bar: !!document.querySelector("#statusbar #sb-stage, #statusbar svg .housing"), label: t?.textContent || null, page: document.documentElement.dataset.stage ?? null };
  });
  await check(!s.bar && s.label === stage && s.page === stage, stage ? `the stage, ${stage}, is the open study's label in the switcher, and not in the status bar` : "a study with no stage shows none, in the switcher or the status bar", s);
};
// hovering a study's stage label in the switcher lists the stages, that study's own highlighted
const hoverStage = async (page, id) => {
  if (!(await page.evaluate(() => document.querySelector("#study-menu").open))) await page.click("#study-menu summary");
  await page.hover(`#study-list a[data-id="${id}"] .stage-tag`);
  await page.waitForFunction(() => document.querySelector("#stage-pop").matches(":popover-open"));
  return page.evaluate(() => [...document.querySelectorAll("#stage-list li")].map((li) => ({
    name: li.querySelector(".name").textContent, now: li.classList.contains("now"), crossed: getComputedStyle(li.querySelector(".name")).textDecorationLine,
  })));
};
// the one dialog, open on a tab
const tabIs = async (page, tab) => {
  await page.waitForFunction((t) => document.querySelector("#usage-dlg").open && document.querySelector(`#usage-dlg [role=tab][data-tab=${t}]`).getAttribute("aria-selected") === "true"
    && !document.querySelector(`#usage-dlg [role=tabpanel][data-tab=${t}]`).hidden, tab);
  const title = await page.evaluate(() => { const d = document.querySelector("#usage-dlg"), h = document.getElementById(d.getAttribute("aria-labelledby")); return h && d.contains(h) && h.textContent; });
  await check(title === "Resource Usage", `the dialog is open on ${tab}, titled Resource Usage`, title);
};
// the shell's switch to the item view: first in the toolbar, what it reads, whether it can be pressed
const switchIs = async (page, want, on, what) => {
  await orMissed(page.waitForFunction((w) => document.querySelector("#switch")?.textContent.replace(/\s+/g, " ").trim() === w, want));
  const s = await page.evaluate(() => { const b = document.querySelector("#switch"); return b && { text: b.textContent.replace(/\s+/g, " ").trim(), on: !b.disabled, shown: !!b.offsetParent, first: b === document.querySelector(".toolbar").firstElementChild }; });
  await check(s && s.text === want && s.on === on && s.shown && s.first, `the switch, first in the toolbar, reads "${want}"${on ? "" : ", off"}${what ? ": " + what : ""}`, s);
};
const loadImage = async (page) => { await page.setInputFiles("#file", image); await page.waitForFunction(() => !!window.shellForTests?.page.get("image") && document.querySelector("#busy").hidden && document.querySelector("#fx-count")?.disabled === false); };
// Start, and Run in its dialog: the study's Count runs
const count = async (page) => { await fromScratch(page, "#fx-count"); await page.waitForFunction(() => /pixels/.test(document.querySelector("#fx-result").textContent)); };

// ---- a Develop study: Load image, its Count, Save; the resources block always open, as it was before it could fold ----
{
  const { ctx, page } = await open("fixture", "open");
  await stageIs(page, "Develop");
  // hovering the stage lists the stages, its own highlighted and the ones before it crossed out
  const stages = await hoverStage(page, "fixture");
  await check(stages.map((x) => x.name).join() === "Setup,Develop,Analyze,Review,Public" && stages[1].now && stages.filter((x) => x.now).length === 1,
    "the stage's popup lists Setup, Develop, Analyze, Review and Public, Develop highlighted", stages);
  await check(stages[0].crossed === "line-through" && stages.slice(1).every((x) => x.crossed === "none"), "the stage before it is crossed out", stages);
  await check(/next|move on/i.test(await page.textContent("#stage-pop")), "and says what moves the study on", await page.textContent("#stage-pop"));
  const beside = await page.evaluate(() => document.querySelector("#stage-pop").getBoundingClientRect().left - document.querySelector("#study-menu .pop").getBoundingClientRect().right);
  await check(beside >= 0, "and opens beside the switcher, not over it", beside);
  if (shots) await page.screenshot({ path: path.join(shots, "0-stages.png") });
  await page.mouse.move(1300, 100);
  await page.waitForFunction(() => !document.querySelector("#stage-pop").matches(":popover-open"));
  await page.keyboard.press("Escape");
  await page.evaluate(() => { document.querySelector("#study-menu").open = false; });
  await shines(page, ["#load-main"]);
  await shot(page, "1-start");
  // req/shell/waiting/visible: the waiting overlay's big spinner shows while Python loads or works, and gives way
  // to the sweeping light over an image (scan) or to the image painting in (peek)
  const looks = await page.evaluate(() => {
    const b = document.querySelector("#busy"), s = b.querySelector(".spin.big"), was = b.hidden, seen = {};
    b.hidden = false;
    for (const look of ["", "scan", "peek"]) {
      b.classList.remove("scan", "peek"); if (look) b.classList.add(look);
      seen[look || "plain"] = { spinner: getComputedStyle(s).display !== "none" && getComputedStyle(s).visibility === "visible", light: getComputedStyle(b.querySelector("#scan-light")).display !== "none" };
    }
    b.classList.remove("scan", "peek"); b.hidden = was;
    return seen;
  });
  await check(looks.plain.spinner && !looks.plain.light, "waiting shows the big spinner", looks.plain);
  await check(!looks.scan.spinner && looks.scan.light, "work over an image shows the sweeping light, not the spinner", looks.scan);
  await check(!looks.peek.spinner && !looks.peek.light, "an image painting in shows neither", looks.peek);
  // a held button keeps its own small spinner wherever it sits
  const held = await page.evaluate(() => {
    const t = document.createElement("button"); t.className = "working"; t.disabled = true; t.textContent = "x"; document.body.append(t);
    const a = getComputedStyle(t, "::after").animationName; t.remove(); return a;
  });
  await check(held === "spin", "a working button turns a small spinner after its label", held);
  // the right side: from the edge, version, CPU, network, memory, disk; each but the version a grey icon and its number
  const ITEMS = ["#sb-disk", "#sb-memory", "#sb-net", "#sb-cpu", "#sb-version"];
  await page.waitForFunction(() => /\d/.test(document.querySelector("#sb-disk").textContent));
  const right = await page.evaluate((ids) => ids.map((id) => {
    const e = document.querySelector(id), cs = getComputedStyle(e), svg = e.querySelector("svg");
    const grey = svg && getComputedStyle(svg).color.match(/\d+/g).slice(0, 3).map(Number);
    return { id, right: e.getBoundingClientRect().right, box: cs.borderTopWidth + " " + cs.backgroundColor, text: e.textContent, grey: grey && Math.max(...grey) - Math.min(...grey) };
  }), ITEMS);
  await check(right.every((e, k) => k === 0 || right[k - 1].right < e.right) && right[4].right > 1300, "disk, memory, network, CPU and version sit at the right, version at the edge", right);
  await check(right.every((e) => e.box === "0px rgba(0, 0, 0, 0)"), "none has a box", right);
  await check(right.slice(0, 4).every((e) => e.grey !== null && e.grey <= 12), "the four before the version each have a grey icon", right);
  await check(/^\d+(\.\d)? (KB|MB|GB)$/.test(right[0].text), 'the disk reads "1.4 MB", with no word', right[0].text);
  await check(/^\d+ MB$/.test(right[1].text), 'the memory reads "253 MB", with no word', right[1].text);
  await check(/^\d+(\.\d)? (KB|MB|GB)\/s$/.test(right[2].text), 'the network reads "1.2 MB/s"', right[2].text);
  await check(/^\d+%$/.test(right[3].text), 'the CPU reads "12%"', right[3].text);
  const left = await page.evaluate(() => document.querySelector("#sb-now").getBoundingClientRect().left);
  await check(left < 40, "what the page is doing, from the left", left);
  // a mild bar between every two items on show, but the four resources
  const seps = await bars(page);
  await check(seps.length >= 5 && seps.every((x) => x[2] === x[3]), "a vertical bar between every two items on show, none between the four resources", seps);
  // an item that can be clicked reads as a button under the pointer
  const edge = (sel) => page.evaluate((s) => getComputedStyle(document.querySelector(s), "::after").borderTopColor, sel);
  const plain = await edge("#sb-version");
  await page.hover("#sb-version");
  await page.waitForFunction((was) => { const c = getComputedStyle(document.querySelector("#sb-version"), "::after"); return c.borderTopColor !== was && !document.querySelector("#sb-version").getAnimations({ subtree: true }).length; }, plain).catch(() => {});
  await shot(page, "1-hovered");
  const hovered = await edge("#sb-version"), fade = await page.evaluate(() => getComputedStyle(document.querySelector("#sb-version"), "::after").transitionDuration);
  await check(/, 0\)$/.test(plain) && !/, 0\)$/.test(hovered) && parseFloat(fade) > 0 && parseFloat(fade) <= 0.2, "hovering a clickable item fades a button's border in around it, quickly", { plain, hovered, fade });
  await check(await page.evaluate(() => getComputedStyle(document.querySelector("#sb-now"), "::after").content === "none"), "what cannot be clicked gets no border");
  await page.mouse.move(700, 300);
  const pointers = await page.evaluate(() => [...document.querySelectorAll("#statusbar, #statusbar *")].map((e) => getComputedStyle(e).cursor).filter((c) => c === "help"));
  await check(!pointers.length, "nothing in the status bar shows a question-mark pointer", pointers);

  await loadImage(page);
  await shines(page, ["#annotate-scratch"]);
  await count(page);
  await check(await page.evaluate(() => document.querySelector("#switch").hidden), "while the user annotates there is no item view and no switch to one");
  // Python worked about WORK ms of the last two seconds
  await orMissed(page.waitForFunction(() => parseInt(document.querySelector("#sb-cpu").textContent) >= 30, null, { timeout: STEP }));
  await check(parseInt(await page.textContent("#sb-cpu")) >= 30, "the CPU shows Python at work", await page.textContent("#sb-cpu"));
  await orMissed(page.waitForFunction(() => window.seen["sb-cpu"].spiked, null, { timeout: STEP }));
  const cpuSeen = await page.evaluate(() => ({ ...window.seen["sb-cpu"], color: getComputedStyle(document.querySelector("#sb-cpu svg")).color,
    warn: getComputedStyle(document.documentElement).getPropertyValue("--warn") }));
  await check(cpuSeen.spiked, "the CPU's sharp rise flashes it", cpuSeen);
  await check(cpuSeen.rolled > 0 && cpuSeen.anim.every((a) => a === "roll") && /^\d+%$/.test(cpuSeen.text), "the CPU rolls its changed digits, reading its number all the while", cpuSeen);
  await orMissed(page.waitForFunction(() => !document.querySelector("#sb-cpu").classList.contains("spike"), null, { timeout: 6000 }));
  await check(!(await page.evaluate(() => document.querySelector("#sb-cpu").classList.contains("spike"))), "and the flash fades after a few seconds");
  await shines(page, ["#gt-submit"]);
  // the tasks in the shell's list (req/shell/ground-truth/tasks): a row each, a bar part each, Submit last
  const list = async () => page.evaluate(() => {
    const rows = [...document.querySelectorAll("#gt-tasks > li:not([data-task=edits])")], part = document.querySelector('#gt-bar > span[data-task="check"]'), s = document.querySelector("#gt-submit");
    return { rows: rows.map((li) => (li.querySelector(".t") || li.querySelector("#gt-submit")).textContent.trim()), last: rows.at(-1).contains(s),
      open: rows[0].classList.contains("now"), done: rows[0].classList.contains("done"), tick: getComputedStyle(rows[0].querySelector(".tick")).display !== "none",
      body: !!document.querySelector("#fx-done").offsetParent && rows[0].querySelector(".task-body").contains(document.querySelector("#fx-done")),
      filled: +part.style.getPropertyValue("--done"), submit: !s.disabled, state: s.dataset.state || "" };
  });
  const l0 = await list();
  await check(l0.rows.join() === "0/1 Count checked,Upload" && l0.last && l0.submit && l0.state === "todo",
    "the study's task is a row, 0 of 1 done, and Upload, on, is the last", l0);
  await check(l0.open, "annotating, the study's task is open (req/shell/ground-truth/tagging)", l0);
  const lt = await list();
  await check(lt.open && lt.body && !lt.done && !lt.tick && lt.filled === 0, "the open task holds what the study puts under it, its bar part empty", lt);
  await page.check("#fx-done");
  const l1 = await list();
  await check(l1.rows[0] === "1/1 Count checked" && l1.done && l1.tick && !l1.open && l1.filled === 1 && l1.state === "done",
    "a done task counts, gets its check, fills its bar part, and Submit says the ground truth is done", l1);
  await shot(page, "2-submit");
  await page.click("#gt-submit");
  await page.waitForFunction(() => document.querySelector("#gt-dlg").open);
  await page.click("#gt-close");
  const download = page.waitForEvent("download");
  await page.click("#analysis-dl");
  await download;
  await shines(page, []);
  await shot(page, "3-done");
  // another image starts over, after the question about the actions not yet saved (req/shell/ground-truth/save-draft)
  page.once("dialog", (d) => d.accept());
  await loadImage(page);
  await shines(page, ["#annotate-scratch"]);

  // the memory opens its tab of the one dialog, with no Run GC and no essay on Python's memory
  await page.click("#sb-memory");
  await tabIs(page, "memory");
  const rows = await page.evaluate(() => [...document.querySelectorAll("#ram-list .entry .name")].map((n) => n.textContent));
  await check(["Python", "Python's files", "The image"].every((n) => rows.includes(n)), "the Memory tab lists what holds it", rows);
  await check(!/reserved for its next use/.test(await page.textContent("#usage-dlg")), "with no explanation of Python's memory");
  const gc = await page.evaluate(() => [...document.querySelectorAll("#usage-dlg button")].filter((x) => /GC|garbage/i.test(x.textContent)).length);
  await check(gc === 0, "and no Run GC button", gc);
  if (shots) await page.screenshot({ path: path.join(shots, "4-memory.png") });
  // the tabs look alike: the total, then rows of a name, what it is and a size, in the same type
  const look = (tab) => page.evaluate((t) => {
    const p = document.querySelector(`#usage-dlg [role=tabpanel][data-tab=${t}]`), cs = (x) => x && getComputedStyle(x);
    return { total: !!p.querySelector(".total")?.textContent, name: cs(p.querySelector(".entry .name")).fontSize, size: cs(p.querySelector(".entry .size")).fontSize + " " + cs(p.querySelector(".entry .size")).color,
      what: cs(p.querySelector(".entry .what"))?.fontSize };
  }, tab);
  const memLook = await look("memory");
  // switching tabs leaves the dialog as it is: each tab, as it shows, the same box
  const boxes = [];
  for (const t of ["storage", "network", "cpu", "memory"]) {
    await page.click(`#usage-dlg [role=tab][data-tab=${t}]`);
    for (let k = 0; k < 3; k++) { boxes.push(await page.evaluate(() => { const r = document.querySelector("#usage-dlg").getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(); })); await page.waitForTimeout(150); } // waits on purpose (no event): samples the box over the tab's first redraws
  }
  await check(new Set(boxes).size === 1, "switching tabs leaves the dialog the same size and place", [...new Set(boxes)]);
  // the network tab, by its tab: the page's files, Python and Google Drive, adding up to the status bar's
  await page.click("#usage-dlg [role=tab][data-tab=network]");
  await tabIs(page, "network");
  const net = await page.evaluate(() => [...document.querySelectorAll("#net-list .entry .name")].map((n) => n.textContent));
  await check(["The page", "Python", "Google Drive"].every((n) => net.includes(n)), "the Network tab splits what was downloaded", net);
  const netTotal = await page.textContent("#net-total");
  await check(/downloading \d+(\.\d)? (KB|MB|GB)\/s/.test(netTotal) && /downloaded \d+(\.\d)? (KB|MB|GB) since/.test(netTotal), "it gives the speed and the total", netTotal);
  if (shots) await page.screenshot({ path: path.join(shots, "5-network.png") });
  const netLook = await look("network");
  await page.click("#usage-dlg [role=tab][data-tab=cpu]");
  await tabIs(page, "cpu");
  const cpu = await page.evaluate(() => [...document.querySelectorAll("#cpu-list .entry .name")].map((n) => n.textContent));
  await check(["The page", "Python"].every((n) => cpu.includes(n)), "the CPU tab splits the page's thread from Python's", cpu);
  if (shots) await page.screenshot({ path: path.join(shots, "6-cpu.png") });
  const cpuLook = await look("cpu");
  await page.keyboard.press("Escape");

  // the disk opens the Storage tab, whose total it shows, counting what was kept since
  // code no study uses, which the Shared section lists as one record
  await page.evaluate(async () => (await caches.open("third-party-v1")).put(new URL("vendor/acme-0-py3-none-any.whl", location.href).href, new Response(new Uint8Array(300000))));
  await page.click("#sb-disk");
  await tabIs(page, "storage");
  await page.waitForFunction(() => /keeps/.test(document.querySelector("#storage-total").textContent));
  const total = (await page.textContent("#storage-total")).match(/keeps (.+?) on/)[1];
  await check((await page.textContent("#sb-disk")) === total, "the disk is the Storage tab's total", [total, await page.textContent("#sb-disk")]);
  for (const g of await page.$$("#storage-list .group > summary")) await g.click();
  if (shots) await page.screenshot({ path: path.join(shots, "7-storage.png") });
  const storeLook = await look("storage");
  await page.keyboard.press("Escape");
  // a fast download flashes the network; every one of the four has rolled to a new value by now
  await page.evaluate((u) => fetch(u, { cache: "no-store" }).then((r) => r.arrayBuffer()), origin + "/big");
  await orMissed(page.waitForFunction(() => window.seen["sb-net"].spiked, null, { timeout: STEP }));
  const all = await page.evaluate(() => window.seen);
  await check(all["sb-net"].spiked, "a fast download flashes the network", all["sb-net"]);
  await check(Object.values(all).every((x) => x.rolled > 0 && x.anim.every((a) => a === "roll")), "the disk, memory, network and CPU each rolled to a new value", all);
  // with reduced motion asked for, a new value changes without rolling
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = all["sb-net"].rolled;
  await page.evaluate((u) => fetch(u, { cache: "no-store" }).then((r) => r.arrayBuffer()), origin + "/big");
  await orMissed(page.waitForFunction((n) => window.seen["sb-net"].rolled > n, before, { timeout: STEP }));
  const calm = await page.evaluate(() => window.seen["sb-net"]);
  await check(calm.rolled > before && calm.anim.slice(-1)[0] === "none", "with reduced motion asked for, it changes without rolling", calm);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // the CPU tab's Animations checkbox, checked at first, turns every animation off but the spinners'
  await page.click("#sb-cpu"); await tabIs(page, "cpu");
  await check(await page.isChecked("#motion"), "the CPU tab's Animations checkbox is checked at first");
  // each of the tab's two checkboxes explained in a line of its own under it
  const explained = await page.evaluate(() => ["#motion", "#unload-python"].map((sel) => {
    const box = document.querySelector(sel), hint = box.closest("[role=tabpanel] > *").querySelector(".hint");
    return { sel, text: hint?.textContent.trim() ?? "", below: !!hint && hint.getBoundingClientRect().top >= box.getBoundingClientRect().bottom };
  }));
  await check(explained.every((e) => e.text && e.below), "Animations and Unload Python after each run each carry an explanation under the checkbox", explained);
  await page.uncheck("#motion"); await page.keyboard.press("Escape");
  await check(await page.evaluate(() => JSON.parse(localStorage.getItem("nor-motion"))) === false, "unchecked, it is kept for the next visit");
  const still = await page.evaluate(() => {
    const cs = (sel, pseudo) => getComputedStyle(document.querySelector(sel), pseudo);
    const b = document.createElement("button"); b.className = "shine"; document.body.append(b);
    const out = { shine: getComputedStyle(b, "::after").animationName, gt: cs("#sb-cpu svg").transitionDuration, spin: cs(".spin").animationName,
      sweep: getComputedStyle(b, "::after").display, halo: getComputedStyle(b).boxShadow };
    b.className = "working"; b.disabled = true; out.working = getComputedStyle(b, "::after").animationName; b.remove();
    return out;
  });
  await check(still.shine === "none" && still.gt === "0s", "nothing shines or fades", still);
  await check(still.sweep === "none" && still.halo === "none", "a button that would shine looks plain: no light frozen on it, no halo", still);
  {
    // a device no one is signed in on: the setting is its own, with no Drive of the tagger's to sync it from
    const seeded = w.device().keeps({ "nor-motion": "false" });
    const kept = await (await seeded.opens("fixture", { until: "title" })).evaluate(() => ({ box: document.querySelector("#motion").checked, motion: document.documentElement.dataset.motion }));
    await check(!kept.box && kept.motion === "off", "a page opened with the animations turned off opens with them off", kept);
    await seeded.close();
  }
  await check(still.spin === "spin" && still.working === "spin", "but a spinner still turns", still);
  await page.waitForFunction(() => !document.querySelector("#sb-net").classList.contains("spike"), null, { timeout: 6000 });
  const net0 = await page.evaluate(() => { const s = window.seen["sb-net"]; s.spiked = false; return s.rolled; });
  await page.evaluate((u) => fetch(u, { cache: "no-store" }).then((r) => r.arrayBuffer()), origin + "/big");
  await orMissed(page.waitForFunction((n) => window.seen["sb-net"].rolled > n, net0, { timeout: STEP }));
  // the number written, and whatever it does about it over
  await page.waitForFunction(() => !document.querySelector("#sb-net").getAnimations({ subtree: true }).length);
  const quiet = await page.evaluate(() => window.seen["sb-net"]);
  await check(quiet.rolled > net0 && quiet.anim.slice(-1)[0] === "none" && !quiet.spiked, "a fast download neither rolls nor flashes the network", quiet);
  const alike = (a, b) => a.total && b.total && a.name === b.name && a.size === b.size && (!a.what || !b.what || a.what === b.what);
  await check([memLook, netLook, cpuLook].every((l) => alike(l, storeLook) && alike(l, memLook)), "the four tabs look alike", [storeLook, memLook, netLook, cpuLook]);
  await ctx.close();
}

// ---- the resources block: folded into one icon at first, opened by hovering it, by what needs watching, or always ----
{
  const { ctx, page } = await open("fixture", undefined, true);
  // from the right edge: the version, the report icon, the online icon, then the resources block, which unfolds leftward moving none
  const fixed = () => page.evaluate(() => ["#sb-res-icon", "#sb-online", "#sb-report", "#sb-version"].map((id) => Math.round(document.querySelector(id).getBoundingClientRect().left)));
  // open: the four items take their room, once the animation is over; folded, only the icon shows
  const block = () => page.evaluate(() => ({ items: Math.round(document.querySelector("#sb-res-items").getBoundingClientRect().width),
    icon: Math.round(document.querySelector("#sb-res-icon").getBoundingClientRect().width) }));
  const isOpen = async (want, what, ms = 1500) => {
    await orMissed(page.waitForFunction((w) => (document.querySelector("#sb-res-items").getBoundingClientRect().width > 150) === w, want, { timeout: ms }));
    // and its folding or unfolding over, whichever is under way: the four's and the icon's, which each run their own
    await page.waitForFunction(() => ["#sb-res-items", "#sb-res-icon"].every((id) => !document.querySelector(id).getAnimations().length));
    const b = await block();
    await check((b.items > 150) === want && (want || b.items === 0), what, b);
  };
  await isOpen(false, "on opening the page, the disk, memory, network and CPU are folded into one icon");
  await shot(page, "9-resources-folded");
  const folded = await bars(page);
  await check(folded.length >= 4 && folded.every((x) => x[2] === x[3]), "folded, a bar between every two items on show, the icon among them", folded);
  const before = await fixed();
  await check(before.every((x, k) => k === 0 || before[k - 1] < x), "the resources icon, the online icon, the report icon, then the version, toward the right edge", before);
  const look = await page.evaluate(() => { const s = getComputedStyle(document.querySelector("#sb-res-items")); return { property: s.transitionProperty, ms: parseFloat(s.transitionDuration) * 1000 }; });
  await check(/max-width|width|all/.test(look.property) && look.ms >= 150, "folding and unfolding is animated", look);
  await page.hover("#sb-res-icon");
  await isOpen(true, "hovering the icon unfolds the four as they look always open");
  await check((await block()).icon > 10 && await page.evaluate(() => document.querySelector("#sb-res-items").getBoundingClientRect().right <= document.querySelector("#sb-res-icon").getBoundingClientRect().left),
    "the icon staying, the four opening beside it", await block());
  await shot(page, "9-resources-unfolded");
  const unfolded = await bars(page);
  await check(unfolded.length && unfolded.every((x) => x[2] === x[3]), "unfolded, no bar between the four nor between them and their icon, one between all else", unfolded);
  const after = await fixed();
  await check(after.every((x, k) => x === before[k]), "unfolding moves neither the icon, the online icon, the report icon nor the version", { before, after });
  // too little room: what the page is doing and the four give way; the icons and version stay whole, none
  // overlapping the next, the resources icon inside its block
  await page.evaluate(() => { document.querySelector("#status").textContent = "Loading the study's Python packages, a long message that cannot fit"; });
  for (const width of [620, 520, 480]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => ["#sb-res-items", "#sb-res-icon"].every((id) => !document.querySelector(id).getAnimations().length));
    const squeezed = await page.evaluate(() => {
      const bar = document.querySelector("#statusbar").getBoundingClientRect(), box = (s) => document.querySelector(s).getBoundingClientRect();
      const whole = (e) => { const r = e.getBoundingClientRect(); return r.width >= e.scrollWidth - 1 && r.left >= bar.left && r.right <= bar.right; };
      const right = ["#sb-res-icon", "#sb-online", "#sb-report", "#sb-version"];
      return { right: right.filter((id) => !whole(document.querySelector(id))),
        overlap: right.slice(1).filter((id, k) => box(right[k]).right > box(id).left),
        outside: box("#sb-res-icon").right > box("#sb-res").right + 0.5,
        status: box("#sb-now").width < document.querySelector("#status").scrollWidth };
    });
    await check(!squeezed.right.length && !squeezed.overlap.length && !squeezed.outside && squeezed.status,
      `at ${width}px the status gives way, the right-hand items stay whole and apart`, squeezed);
    await shot(page, `11-squeezed-${width}`);
  }
  await page.setViewportSize({ width: 1400, height: 900 });
  await shot(page, "10-resources-hovered");
  await page.mouse.move(700, 300);
  await isOpen(false, "and they fold again once the pointer leaves");
  await check((await block()).icon > 10, "the icon coming back");
  await page.click("#sb-res-icon");
  await page.waitForFunction(() => document.querySelector("#usage-dlg").open);
  if (shots) await page.screenshot({ path: path.join(shots, "12-resources-setting.png") });
  const mode = await page.evaluate(() => { const b = document.querySelector("#res-mode"); return { type: b?.type, checked: b?.checked, label: b?.closest("label")?.textContent.trim(), row: !!b?.closest(".dlg-row.end"),
    left: b && b.closest("label").getBoundingClientRect().left - b.closest(".dlg-row").getBoundingClientRect().left, level: b && Math.abs(b.closest("label").getBoundingClientRect().bottom - [...b.closest(".dlg-row").querySelectorAll("button")].at(-1).getBoundingClientRect().bottom), selects: document.querySelectorAll("#usage-dlg .res-mode select").length }; });
  await check(mode.type === "checkbox" && mode.checked && mode.label === "Autohide in statusbar" && !mode.selects, "clicking the icon opens the resources dialog, whose one setting for the block is an Autohide in statusbar checkbox, checked", mode);
  await check(mode.row && mode.left < 2 && mode.level < 12, "it sits at the left of the dialog's bottom row, in line with its buttons", mode);
  await page.keyboard.press("Escape"); await page.mouse.move(700, 300);
  await isOpen(false, "closed, the block is folded again");

  // what opens it while auto-hiding, and folds it 5 to 10 seconds after it ends, on the page's clock moved on
  const foldsLater = async (what) => {
    await ctx.clock.fastForward(3000);
    await isOpen(true, `${what}: still open 3 s after it ends`, 100);
    await ctx.clock.fastForward(2000);
    await isOpen(true, `${what}: still open 5 s after it ends`, 100);
    await ctx.clock.fastForward(6000);
    await isOpen(false, `${what}: folded again 11 s after it ends`);
  };
  await page.evaluate(() => { window.st.heapWas = window.st.heap; window.st.heap = 1.2 * 2 ** 30; });
  await isOpen(true, "the tab holding over 1 GB opens it", 2500);
  await page.evaluate(() => { window.st.heap = window.st.heapWas; });
  await foldsLater("memory back under 1 GB");
  // downloading: kb KB each 250 ms of the page's clock, for ms of it, the clock moved on once the page can have counted each
  const download = async (kb, ms) => {
    for (let t = 0; t < ms; t += 250) {
      await page.evaluate(async (u) => {
        const counted = new Promise((ok) => { new PerformanceObserver((l, o) => { if (l.getEntries().some((e) => e.name === u)) { o.disconnect(); ok(); } }).observe({ type: "resource" }); });
        await fetch(u, { cache: "no-store" }).then((r) => r.arrayBuffer());
        await counted;
      }, origin + "/some/" + kb);
      await ctx.clock.runFor(250);
    }
  };
  await download(25, 8000);
  await isOpen(false, "about 100 KB/s for 8 s does not open it: under 250 KB/s", 100);
  await download(200, 2500);
  await isOpen(false, "the network over 250 KB/s for 2 s does not open it yet", 100);
  await download(200, 5500);
  await isOpen(true, "over 250 KB/s for more than 5 s opens it", 2500);
  await foldsLater("the network quiet again");
  // offline, what the page still asks of the network fails as it would, when it asks anything then
  await expecting(NETWORK_GONE, async () => {
    await ctx.setOffline(true);
    await ctx.clock.fastForward(3000);
    await isOpen(false, "going offline does not open it: the online icon says so", 100);
    await ctx.setOffline(false);
  }, { maybe: true });

  // with the page's animations off, it folds and unfolds at once
  // set and read at once, so a settings sync the network's return starts cannot set it back between
  const still = await page.evaluate(() => {
    document.documentElement.dataset.motion = "off";
    return getComputedStyle(document.querySelector("#sb-res-items")).transitionDuration;
  });
  await check(still.split(",").every((d) => parseFloat(d) === 0), "with Animations off, folding and unfolding is not animated", still);
  await page.evaluate(() => { document.documentElement.dataset.motion = "on"; });

  // always open: as before; kept for the next visit
  await page.click("#sb-res-icon"); await page.uncheck("#res-mode"); await page.keyboard.press("Escape"); await page.mouse.move(700, 300);
  await isOpen(true, "Autohide unchecked, the four show always");
  await check((await block()).icon > 10, "beside their icon");
  await check(await page.evaluate(() => JSON.parse(localStorage.getItem("nor-resources"))) === "open", "the choice is kept for the next visit");
  await page.click("#sb-disk"); await page.check("#res-mode"); await page.keyboard.press("Escape"); await page.mouse.move(700, 300);
  await isOpen(false, "checked again, they fold");
  await check(await page.evaluate(() => JSON.parse(localStorage.getItem("nor-resources"))) === "auto", "and auto-hiding is kept");
  // offline, what the page still asks of the network fails as it would, when it asks anything then
  await expecting(NETWORK_GONE, async () => {
    await ctx.setOffline(true);
    await isOpen(false, "going offline does not unfold them", 2500);
    await check(!(await page.$("#sb-res-icon .no-net")), "the icon carries no offline mark: the online icon says so");
    await shot(page, "11-resources-hidden-offline");
    await ctx.setOffline(false);
  }, { maybe: true });
  await ctx.close();
}
// a Hidden always kept from before the setting became one checkbox reads as auto-hiding
{
  const { ctx, page } = await open("fixture", "hidden");
  await page.hover("#sb-res-icon");
  await page.waitForFunction(() => document.querySelector("#sb-res-items").getBoundingClientRect().width > 50);
  await page.click("#sb-res-icon");
  await check(await page.isChecked("#res-mode"), "a kept Hidden always unfolds on hover and shows Autohide checked");
  await ctx.close();
}

// ---- req/shell/status-bar/online: a Wi-Fi icon online, crossed out in red offline, opening where offline is set up ----
{
  const { ctx, page } = await open("fixture");
  const icon = () => page.evaluate(() => {
    const b = document.querySelector("#sb-online"), seen = (sel) => { const e = b.querySelector(sel); return !!e && e.getBoundingClientRect().width > 0; };
    return { on: seen(".on"), off: seen(".off"), title: b.title, colour: getComputedStyle(b.querySelector(".off")).color };
  });
  const on = await icon();
  await check(on.on && !on.off && /online/i.test(on.title) && /offline/i.test(on.title), "online, a Wi-Fi icon, its tooltip saying online and that it sets up offline", on);
  await check(!(await page.$("#statusbar .no-net")), "no other item in the status bar carries an offline mark");
  // offline, what the page still asks of the network fails as it would, when it asks anything then
  await expecting(NETWORK_GONE, async () => {
    await ctx.setOffline(true);
    await orMissed(page.waitForFunction(() => document.documentElement.classList.contains("offline"), null, { timeout: 40000 }));
    const off = await icon();
    const [r, g, bl] = off.colour.match(/\d+/g).map(Number);
    await check(!off.on && off.off && /offline/i.test(off.title) && !/^online/i.test(off.title), "offline, the Wi-Fi crossed out, its tooltip saying offline", off);
    await check(r > 150 && g < 120 && bl < 120, "in red", off.colour);
    await shot(page, "13-online-offline");
    await page.click("#sb-online");
    const tab = await page.evaluate(() => document.querySelector("#usage-dlg").open && document.querySelector("#usage-dlg").dataset.tab);
    await check(tab === "storage", "clicking it opens the Storage tab, where offline is set up", tab);
    // a clicked item is not left ringed when its dialog closes, by the keyboard or by the mouse
    const ringed = () => page.evaluate(() => [...document.querySelectorAll("#statusbar *")].filter((e) => {
      const cs = getComputedStyle(e);
      return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
    }).map((e) => e.id || e.className));
    await page.keyboard.press("Escape");
    await check(!(await ringed()).length, "closing its dialog with Escape leaves no ring in the status bar", await ringed());
    await page.click("#sb-online");
    await page.click('#usage-dlg button[value="close"]');
    await check(!(await ringed()).length, "closing it with its Close button leaves none either", await ringed());
    await ctx.setOffline(false);
  }, { maybe: true });
  await orMissed(page.waitForFunction(() => !document.documentElement.classList.contains("offline"), null, { timeout: 40000 }));
  const back = await icon();
  await check(back.on && !back.off, "back online, the Wi-Fi icon again", back);
  await ctx.close();
}

// ---- the same study as Review: no ground truth to export ----
{
  stage = "Review";
  const { ctx, page } = await open("fixture");
  await stageIs(page, "Review");
  // another study's label speaks of that study
  const other = await hoverStage(page, "nor");
  await check(other[1]?.now && other.filter((x) => x.now).length === 1, "in a Review study, hovering NoR Finder's label highlights Develop, its own", other);
  // with animations off, leaving it closes it all the same
  const was = await page.evaluate(() => { const m = document.documentElement.dataset.motion; document.documentElement.dataset.motion = "off"; return m; });
  await page.mouse.move(1300, 100);
  const closed = await orMissed(page.waitForFunction(() => !document.querySelector("#stage-pop").matches(":popover-open"), null, { timeout: STEP }));
  await check(closed, "with animations off, the stage's popup closes once the pointer leaves it");
  await page.evaluate((m) => { document.documentElement.dataset.motion = m; }, was);
  await page.evaluate(() => { document.querySelector("#study-menu").open = false; });
  await loadImage(page);
  await check(await page.evaluate(() => document.querySelector("#switch").hidden), "the shell shows no switch until the study has counted its items");
  await count(page);
  await shines(page, []);
  await switchIs(page, "Items 1", true, "a Review study's item view shows what was found, how many");
  await page.click("#switch");
  await page.waitForFunction(() => !document.querySelector("#switch").classList.contains("working"));
  await check(await page.evaluate(() => !document.querySelector("#items-view").hidden && /pixels/.test(document.querySelector("#fx-item").textContent)),
    "pressing it shows the item view, its card what was found");
  await check(await page.evaluate(() => document.querySelector("#gt-submit").offsetParent === null), "and no Save");
  await ctx.close();
  stage = null;
}

// ---- the same study as Public: it only shows what it finds ----
{
  stage = "Public";
  const { ctx, page } = await open("fixture");
  await stageIs(page, "Public");
  await loadImage(page); await count(page);
  await shines(page, []);
  await switchIs(page, "Items 1", true, "its item view shows what was found, how many");
  await ctx.close();
  stage = null;
}

// ---- the Image Viewer: Load image alone ----
{
  const { ctx, page } = await open(null);
  await stageIs(page, null);
  await shines(page, ["#load-main"]);
  await page.setInputFiles("#file", image);
  await shines(page, []);
  // switching study in place: its stage and steps come with it, and it starts with no image open
  await page.click("#study-menu summary");
  await page.click("#study-list a >> text=NoR Finder");
  await page.waitForFunction(() => document.documentElement.dataset.stage === "Develop");
  // NoR Finder loads from Drive (req/shell/load/from): with no image opened there yet, Drive's button is the step's
  await shines(page, ["#load-remote"]);
  await ctx.close();
}
await done(0);
