// Walks the shell's states (req/checks/shell-states) in a browser, against the stand-in Google of stand_in_drive.mjs
// serving ROOT: each path of EXPECT (shell-states.GENERATED.json) opens its study as its root says, takes its
// actions one after another, and at every state reads each element as shown, disabled, folded or gone, against what
// the rules expect; after its last state, the first path of each study and root goes to another study and back, each
// page then compared with a fresh load of its address (req/shell/study/switch-in-place). Every difference is reported, then the run fails. Optional RENDERS: a directory for a picture of
// every state, arrows pointing at the elements that changed there, and an index.html of them all (req/checks/shell-states/renders).
// SHARD, i/n, walks the paths whose place in EXPECT is i modulo n, so n runs side by side walk them all.
// STACK is the z-stack a path loads with its stack action; ANSWERS' files[study] may name a study's own image and stack, and names the large image of the large action. Exits 1 on a difference, 2 when it cannot run.
//   node web-tests/shell_states_driver.mjs ANSWERS STUDIES ROOT IMAGE STACK EXPECT SHARD [RENDERS]
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { standIn } from "./stand_in_drive.mjs";
import { studies as studiesOf } from "./fakes/studies.mjs";
import { snapshot, differ } from "./page_snapshot.mjs";
import { frames } from "./page_frames.mjs";
import { idle, orMissed } from "./page_until.mjs";
import { STEP } from "./deadlines.mjs";
import { read } from "./page_elements.mjs";
import { openImage } from "./setup_page.mjs";
import { fromScratch, loadStored } from "./annotating.mjs";
import { personFile } from "../web/truth_folders.js";

const [answers, studies, rootDir, image, stack, expectFile, shard, renders] = process.argv.slice(2);
const { w, FILES, GT, drive, settings: SETTINGS, studyFile, viewOnly, open, dataManagement, check, done } = await standIn({ answers, studies, rootDir });
// whether the study has one step with a button, which Start's Run presses for the user (req/shell/analysis/start)
const oneRun = (study) => JSON.parse(fs.readFileSync(new URL(`../studies/${study}/study.json`, import.meta.url), "utf8")).phases.filter((p) => p.button).length === 1;
const { elements: trees, paths: every } = JSON.parse(fs.readFileSync(expectFile, "utf8"));
const [part, parts] = shard.split("/").map(Number);
const paths = [...every.entries()].filter(([k]) => k % parts === part);
// the first path of each study and root goes away and back after its last state (req/shell/study/switch-in-place),
// chosen from every path so a shard walks what the whole walk would
const SWITCHERS = new Set([...new Map(every.map((p, k) => [`${p.study} ${p.root}`, k]).reverse()).values()]);
// the files each study's paths load, where ANSWERS names its own
const FILES_OF = JSON.parse(fs.readFileSync(answers, "utf8")).files ?? {};
// who is signed in, but for the study's owner, whom Drive lets write its root: someone who may save to its extractions folder alone
const OTHER = "someone@example.com";

// each image of the study's Drive folder has an Analysis File there, the owner's, marked GT, from before any page opens: read as
// the image opens, it is what Load offers
for (const image of FILES.filter((f) => !f.folder && /\.(png|jpe?g|tiff?)$/i.test(f.name))) {
  const sha = createHash("sha256").update(image.bytes).digest("hex"), sub = `${image.name.replace(/\.[^.]*$/, "")}__${sha.slice(0, 8)}`;
  const file = w.of(GT.extractions).folder(sub).holds({ name: await personFile("owner@acme.example"), bytes: Buffer.from(JSON.stringify({ created: "2026-11-01T10:00:00Z", tagger: "owner@acme.example",
    labels: [{ threshold: 100, count: 7 }], marks: [{ id: "m1", x: 12, y: 12 }, { id: "m2", x: 40, y: 30 }], checked: true })) });
  studyFile({ marks: { ...(JSON.parse(drive.files.find((f) => f.id === SETTINGS.id).bytes.toString()).marks || {}), [sha]: { gt: { file: file.id, by: "owner@acme.example" } } } });
}
const ready = (page) => page.waitForFunction(() => /^(Ready|Image loaded|Counted)/.test(document.querySelector("#status").textContent));
// done: the page settled, its drawers and fades over (a spinner going round never ends, so it is left out)
const settled = async (page) => {
  // nothing of the page's own work under way: its store's and Python's calls, its folders' listing
  await idle(page);
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")
    && document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity));
  // and the disk's count, which the page makes once it is ready and the Storage item waits for; one that never comes
  // is reported as the item not showing
  await orMissed(page.waitForFunction(() => document.querySelector("#sb-disk .v")?.textContent !== "", null, { timeout: 5000 }));
  // and the frame after them drawn
  await frames(page);
};
// an image open, nothing working on it, and the button of the study's first step ready for it
const opened = (button) => !!shellForTests.page.get("image") && document.querySelector("#busy").hidden
  && (!button || document.querySelector(button)?.disabled !== true);
// the folder's z-stack previewed (z), or its first image that is not
const previewOf = async (page, z) => {
  // the stand-in Drive is shared by every path: an earlier one may have made the previews already
  if (!(await page.isDisabled("#update-previews"))) {
    await page.click("#update-previews");
    await page.waitForFunction(() => /previews? made/.test(document.querySelector("#folder-msg").textContent), null, { timeout: 30000 });
  }
  await page.click("#data-tree .tree-folder .count");
  await page.waitForFunction(() => document.querySelectorAll("#data-tree .tree-image .pic img").length > 0);
  await page.locator("#data-tree .tree-image").filter(z ? { hasText: path.basename(stack) } : { hasNotText: path.basename(stack) }).first().click();
  await page.waitForFunction(() => shellForTests.page.get("image")?.source.kind === "preview" && !document.querySelector("#load-original").hidden);
};
const ACTIONS = {
  async load(page, first, files) {
    await page.setInputFiles("#file", files.image ?? image);
    await page.waitForFunction(opened, first?.button);
  },
  // an image larger than the view
  async large(page, first, files) {
    await page.setInputFiles("#file", files.large);
    await page.waitForFunction(opened, first?.button);
  },
  // the stack shown in 3D, the 2D view stepped aside
  async stack(page, first, files) {
    await page.setInputFiles("#file", files.stack ?? stack);
    await page.waitForFunction(() => document.querySelector("#view").hasAttribute("data-v3"));
    await page.waitForFunction(opened, first?.button);
  },
  // the study's first step run, and the step done: by Start and Run where nothing was started yet, which shows the runner and, in
  // a study of one step, presses it; else its button pressed
  async count(page, first, files, study) {
    const started = await page.evaluate(() => !document.querySelector("#processing-box").hidden);
    if (!started) await fromScratch(page, first.button, { run: oneRun(study) });
    if (started || !oneRun(study)) await page.click(first.button);
    await page.waitForFunction((k) => shellForTests.steps.find((p) => p.key === k)?.done, first.key, { timeout: 60000 });
  },
  async items(page) {
    await page.click("#switch");
    await page.waitForFunction(() => document.querySelector("#view").dataset.view === "items");
  },
  async image(page) {
    await page.click("#switch");
    await page.waitForFunction(() => document.querySelector("#view").dataset.view === "image");
  },
  // annotation mode (req/shell/annotate/choice): the study opens afresh on the same image in it
  async scratch(page, first, files, study) { await fromScratch(page, first?.button, { run: oneRun(study) }); },
  async local(page, first) {
    await page.click("#annotate-local");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && !!window.fixture?.model());
    await page.waitForFunction(() => document.querySelector("#busy").hidden);
  },
  // the image's Analysis File marked GT on Drive, read-only
  async viewdrive(page) {
    await loadStored(page);
    await page.waitForFunction(() => /^Showing/.test(document.querySelector("#annotate-say").textContent.trim()));
  },
  async edit(page) {
    await page.click("#annotate-edit");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-annotating") && window.fixture?.model()?.marks.length === 2 && document.querySelector("#busy").hidden);
  },
  // a mark added and the draft kept on this device
  async draft(page) {
    await page.click("#fx-add");
    await page.click("#gt-save-draft");
    await page.waitForFunction(() => document.querySelector("#gt-unsaved").hidden);
  },
  async folder(page) {
    await page.click("#data-tree .tree-folder .name");
    await page.waitForFunction(() => document.querySelectorAll("#folder-items .cell").length > 0);
  },
  async preview(page) { await previewOf(page, 0); },
  // the folder's z-stack previewed
  async zpreview(page) { await previewOf(page, 1); },
  async offline(page) {
    await page.context().setOffline(true);
    await page.waitForFunction(() => document.documentElement.classList.contains("offline"));
  },
  async online(page) {
    await page.context().setOffline(false);
    await page.waitForFunction(() => !document.documentElement.classList.contains("offline"));
  },
  async unload(page) {
    await page.evaluate(() => document.querySelector("#unload").click());
    await page.waitForFunction(() => !shellForTests.page.get("image") && document.querySelector("#busy").hidden);
  },
  // the first image of the study's Drive folder
  async drive(page, first) {
    await page.evaluate(() => document.querySelector("#load-remote").click());
    await page.waitForFunction(() => document.querySelector("#remote-dlg").open && document.querySelector("#remote-list .item"));
    // the study's folder opened, where the dialog lists the folders first
    if (!(await page.$("#remote-list .item:not(.folder)"))) await page.dblclick("#remote-list .item.folder");
    await page.waitForFunction(() => document.querySelector("#remote-list .item:not(.folder)"));
    await page.dblclick("#remote-list .item:not(.folder)");
    await page.waitForFunction(() => !document.querySelector("#remote-dlg").open);
    await page.waitForFunction(opened, first?.button);
  },
  async data(page) {
    await dataManagement(page, true);
    await page.waitForFunction(() => document.querySelector("#data-col").checkVisibility());
  },
  async leave(page) { await dataManagement(page, false); },
  // to the Image Viewer and Back, the study opening afresh
  async restudy(page, first) {
    await page.evaluate(() => { window.panelsBefore = document.querySelector("[data-study-panel]"); window.pathBefore = location.pathname; });
    await page.click("#study-menu summary");
    await page.click('#study-list a[data-id="viewer"]');
    await page.waitForFunction(() => location.pathname !== window.pathBefore && !document.querySelector("[data-study-panel]")
      && document.querySelector("#busy").hidden && /^(Ready|Image loaded)/.test(document.querySelector("#status").textContent));
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("[data-study-panel]") && document.querySelector("[data-study-panel]") !== window.panelsBefore);
    await page.waitForFunction(() => /^(Ready|Image loaded)/.test(document.querySelector("#status").textContent));
  },
  async ok(page) {
    await page.click("#notice-ok");
    await page.waitForFunction(() => document.querySelector("#notice").hidden);
  },
  // in until the image no longer fits, its minimap shown
  async zoom(page) {
    for (let k = 0; k < 12 && !(await page.isVisible("#minimap")); k++) await page.click("#zoom-in");
    await page.waitForFunction(() => document.querySelector("#minimap").checkVisibility());
  },
  // on Study Setup, in the image's dialog, shut again once the image itself is open
  async original(page) {
    await openImage(page);
    await page.click("#load-original");
    await page.waitForFunction(() => shellForTests.page.get("image")?.source.kind === "drive");
    await page.click("#image-close");
  },
};


// arrows over the page, each from a little above and left of its element to its edge; a dashed one where an element
// was before it went; red where the page is not what the rules say
const ARROW = "#ff7a00", WRONG = "#e00000";
const arrows = (page, marks) => page.evaluate(([marks, ARROW, WRONG]) => {
  const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
  svg.id = "state-arrows";
  Object.assign(svg.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 2147483647 });
  svg.innerHTML = `<defs>${[ARROW, WRONG].map((c, i) => `<marker id="tip${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}</defs>`;
  const W = innerWidth, H = innerHeight;
  for (const { box, wrong, was } of marks) {
    const tx = box.x + Math.min(box.w / 2, 24), ty = box.y + Math.min(box.h / 2, 12);
    const sx = Math.max(8, Math.min(W - 8, tx + (tx > W / 2 ? -70 : 70))), sy = Math.max(8, Math.min(H - 8, ty + (ty > 60 ? -45 : 45)));
    const c = wrong ? WRONG : ARROW, line = document.createElementNS(ns, "line");
    Object.entries({ x1: sx, y1: sy, x2: tx, y2: ty, stroke: c, "stroke-width": 3, "marker-end": `url(#tip${wrong ? 1 : 0})`,
      ...(was ? { "stroke-dasharray": "6 4" } : {}) }).forEach(([k, v]) => line.setAttribute(k, v));
    const halo = line.cloneNode(); halo.setAttribute("stroke", "white"); halo.setAttribute("stroke-width", 6); halo.removeAttribute("marker-end");
    svg.append(halo, line);
  }
  document.body.append(svg);
}, [marks, ARROW, WRONG]);
const unarrow = (page) => page.evaluate(() => document.querySelector("#state-arrows")?.remove());

// Away to another study and back, from a path's last state (req/shell/study/switch-in-place): each study then is
// the page a fresh load of its address shows, a browser started from the storage it kept. Back online first: offline,
// the switch waits for the network. opened: how the path's page was opened
const awayAndBack = async (page, p, opened) => {
  const where = `${p.study} · ${p.root} → ${p.actions.join(", ")}`;
  if (await page.evaluate(() => document.documentElement.classList.contains("offline"))) await ACTIONS.online(page);
  await settled(page);
  const home = page.url(), other = p.study === "viewer" ? "nor" : "viewer";
  await page.evaluate(() => { window.panelsBefore = document.querySelector("[data-study-panel]"); });
  await page.click("#study-menu summary");
  await page.click(`#study-list a[data-id="${other}"]`);
  await page.waitForFunction(() => document.querySelector("[data-study-panel]") !== window.panelsBefore);
  await ready(page); await settled(page);
  const there = await snapshot(page), away = page.url();
  // the study swapped back, not only the address: the page shows the one it left until its own has mounted
  await page.evaluate(() => { window.panelsBefore = document.querySelector("[data-study-panel]"); });
  await page.goBack();
  await page.waitForFunction((h) => location.href === h && document.querySelector("[data-study-panel]") !== window.panelsBefore, home);
  await ready(page); await settled(page);
  const back = await snapshot(page);
  // the fresh loads start from the storage the switched page left, not the path's seed
  const kept = await page.evaluate(() => ({ ...localStorage }));
  await page.close();
  for (const [url, switched, label] of [[away, there, `away at ${other}`], [home, back, "back"]]) {
    const fresh = await open(p.signedIn, { ...opened, seed: kept, at: url, keepSettings: true });
    await ready(fresh); await settled(fresh);
    // where the keyboard is belongs to the press that switched, not to the state: it is on the study menu's button after the choice
    for (const d of differ(switched, await snapshot(fresh)).filter((d) => !/: focus /.test(d))) differences.push(`${where}, ${label}, not as a fresh load: ${d}`);
    await fresh.context().close();
  }
};

const differences = [];
const index = [];
if (renders) fs.mkdirSync(renders, { recursive: true });
const walk = async (k, p) => {
  const elements = trees[p.study];
  // each path finds the folder as it started: no previews made by an earlier one
  const made = new Set(FILES.filter((f) => f.folder && f.name === "Previews").map((f) => f.id));
  for (let i = FILES.length - 1; i >= 0; i--) if (made.has(FILES[i].id) || made.has(FILES[i].parent)) FILES.splice(i, 1);
  const { phases, files } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "studies", p.study, "study.json"), "utf8"));
  // Data Management lists the kinds a study opens: the fixture, opening PNGs alone, is given the folder's TIFFs too
  const opens = p.study === "fixture" ? { files: { ...files, accept: files.accept + ",.tif,.tiff" } } : {};
  // what the study's states.json says stands in for what its page reaches off the site, and the keys that choose it
  const { standIn: own } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "studies", p.study, "states.json"), "utf8"));
  const stood = own ? await import(path.join(import.meta.dirname, "..", "studies", p.study, own)) : {};
  // signed in, but the store lets them only view the extractions folder
  if (p.signedIn && !p.maySave) viewOnly.add(GT.extractions); else viewOnly.delete(GT.extractions);
  const opened = {
    id: p.study, study: { stage: p.stage, ...opens }, ...(/owner/.test(p.root) ? {} : { email: OTHER }),
    // signed out, the switcher offers the released studies and those with no root alone (shell/study/members): NoR Finder is listed as one with none, for the switch away and back
    seed: { ...stood.seed },
    // the list names the stage the path sets, as the study's own file does
    prepare: async (ctx) => {
      await stood.prepare?.(ctx);
      studiesOf(ctx).editList((list) => list.map((s) => (s.id === p.study ? { ...s, stage: p.stage } : !p.signedIn && s.id === "nor" ? { ...s, root: null } : s)));
    },
  };
  const page = await open(p.signedIn, opened);
  await page.waitForFunction((s) => (document.documentElement.dataset.stage ?? null) === s, p.stage);
  await ready(page);
  let before = null;
  const shots = [];
  for (const [i, s] of p.states.entries()) {
    if (i > 0) await ACTIONS[p.actions[i - 1]](page, phases[0], FILES_OF[p.study] ?? {}, p.study).catch(async (e) => {
      for (const d of differences) console.error("DIFFERENT: " + d);
      console.error(`${p.study} · ${p.root}: ${p.actions[i - 1]} did not finish: ${e.message.split("\n")[0]}; status: ${await page.textContent("#status")}; at ${page.url()}`);
      await done(1);
    });
    await settled(page);
    const now = await read(page, elements);
    const wrong = new Set();
    for (const e of elements) {
      const want = s.expect[e.name];
      if (want !== null && now[e.name].seen !== want) { wrong.add(e.name); differences.push(`${p.study} · ${p.root} → ${s.label}: ${e.name} is ${now[e.name].seen}, the rules say ${want}`); }
    }
    if (renders) {
      // what changed here; on the first state, with nothing before it, what shows folded or disabled
      const marks = [];
      for (const e of elements) {
        const changed = before ? before[e.name].seen !== now[e.name].seen : ["off", "folded"].includes(now[e.name].seen);
        if (!changed && !wrong.has(e.name)) continue;
        // only the outermost of what changed together: a box going takes what is in it with it
        const up = e.parent && elements.find((x) => x.name === e.parent);
        if (up && !wrong.has(e.name) && before && before[up.name].seen !== now[up.name].seen) continue;
        if (now[e.name].box) marks.push({ box: now[e.name].box, wrong: wrong.has(e.name) });
        else if (before?.[e.name].box) marks.push({ box: before[e.name].box, wrong: wrong.has(e.name), was: true });
      }
      await arrows(page, marks);
      const file = `${String(k + 1).padStart(2, "0")}-${i}-${s.label.replace(/[^A-Za-z]+/g, "-").toLowerCase().replace(/^-|-$/g, "")}.png`;
      await page.screenshot({ path: path.join(renders, file) });
      await unarrow(page);
      shots.push({ file, label: s.label, wrong: [...wrong] });
    }
    before = now;
  }
  index.push({ root: `${p.study} · ${p.root}`, shots });
  if (SWITCHERS.has(k)) await awayAndBack(page, p, opened);
  await page.context().close();
};
for (const [k, p] of paths) await walk(k, p);

if (renders) {
  const esc = (t) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  fs.writeFileSync(path.join(renders, "index.html"), `<!doctype html><meta charset="utf-8"><title>Shell states</title>
<style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}h2{margin:24px 0 8px}.row{display:flex;gap:12px;overflow-x:auto}
figure{margin:0;flex:0 0 auto}img{width:560px;border:1px solid #ccc}figcaption{margin:4px 0}.wrong{color:#c00}</style>
<h1>Shell states</h1><p>Each row is one path, one picture per state: the arrows point at what changed there, dashed where something went; red, where the page is not what the rules say.</p>
${index.map((r) => `<h2>${esc(r.root)}</h2><div class="row">${r.shots.map((s) => `<figure><a href="${s.file}"><img src="${s.file}" alt="${esc(r.root + ", " + s.label)}"></a><figcaption>${esc(s.label)}${s.wrong.length ? ` <span class="wrong">${esc(s.wrong.join(", "))}</span>` : ""}</figcaption></figure>`).join("")}</div>`).join("\n")}`);
}
for (const d of differences) console.error("DIFFERENT: " + d);
await check(!differences.length, `every element in every state is what the rules say (${paths.reduce((n, [, p]) => n + p.states.length, 0)} states on ${paths.length} paths, shard ${shard})`, differences.length);
await done(0);
