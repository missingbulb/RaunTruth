// The explorer: the page played with, at random but as a person would, in a world of worlds/ on the tests' fakes,
// before a feature is handed over (nor-finder's exploring-the-ui skill). Each step it reads what a person could do
// (actions.mjs), does one, waits for the page to settle, takes stock (page_look.mjs), and checks what changed
// (oracles.mjs, by effects.json, the shell-states rules through shell_oracle.py); a run writes steps.json,
// summary.md and screenshots to its folder (report.mjs). The same world, seed and arguments walk the same steps.
//   node web-tests/explore/explore.mjs --world owner --seed 3 --steps 150 [--focus '#gt-save-draft,gt-'] [--focus-diff origin/main]
//       [--out DIR] [--plant 'throw:#zoom-in'] [--plant write:3]
//   node web-tests/explore/explore.mjs --replay DIR/steps.json [--upto N] [--out DIR2]   its steps again, exactly
//   node web-tests/explore/explore.mjs --shrink DIR/steps.json --finding SIG             the fewest of its steps that still find it
// --world: a name in worlds/, or a world file's path; --focus: parts of controls' keys, ancestors' ids, texts,
// families or events, weighted up; --focus-diff: the ids that the web/ and studies' web/ lines changed since a
// commit name, added to the focus. Exits 0 when the walk found nothing, 1 when it found something, 2 when it cannot run.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listen, expecting, NETWORK_GONE } from "../harness.mjs";
import { idle } from "../page_until.mjs";
import { frames, viewDrawn } from "../page_frames.mjs";
import { read } from "../page_elements.mjs";
import { STEP } from "../deadlines.mjs";
import { boot } from "./world.mjs";
import { look } from "./page_look.mjs";
import { possible, choose, perform, seeded, sig, family, leavesTheApp } from "./actions.mjs";
import { bookkeeping, change, ORACLES } from "./oracles.mjs";
import { write } from "./report.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.join(HERE, "..", "..");
const EFFECTS = JSON.parse(fs.readFileSync(path.join(HERE, "effects.json"), "utf8"));

const args = (() => {
  const a = { plant: [] }, argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, ""), v = argv[i + 1];
    if (k === "plant") { a.plant.push(v); i++; } else if (k === "quiet") a.quiet = true; else { a[k] = v; i++; }
  }
  return a;
})();
const say = (...m) => { if (!args.quiet) console.log(...m); };

// the world file a name or a path names
const worldFile = (w) => (fs.existsSync(w) ? path.resolve(w) : path.join(HERE, "worlds", `${w}.json`));

// the ids the page's own lines changed since base: what a feature touched, to weight up
function focusFromDiff(base) {
  const diff = execFileSync("git", ["-C", REPO, "diff", "-U0", base, "--", "web", ...fs.readdirSync(path.join(REPO, "studies")).map((s) => `studies/${s}/web`)]).toString();
  const ids = new Set();
  for (const line of diff.split("\n")) {
    if (!/^[+-](?![+-])/.test(line)) continue;
    for (const m of line.matchAll(/\bid="([\w-]+)"|["'`]#([\w-]+)|getElementById\(["']([\w-]+)/g)) ids.add("#" + (m[1] || m[2] || m[3]));
  }
  return [...ids];
}

// the shell-states rules' answer for a state, from shell_oracle.py, one question at a time
function shellOracle() {
  const py = spawn("python3", [path.join(HERE, "shell_oracle.py")], { stdio: ["pipe", "pipe", "inherit"] });
  const waiting = [];
  let buf = "";
  py.stdout.on("data", (d) => { buf += d; for (let n; (n = buf.indexOf("\n")) >= 0; buf = buf.slice(n + 1)) waiting.shift()(JSON.parse(buf.slice(0, n))); });
  return { ask: (q) => new Promise((ok) => { waiting.push(ok); py.stdin.write(JSON.stringify(q) + "\n"); }), close: () => py.kill() };
}

// the page done with what the step set off: loaded, its own work over and drawn, its motions ended; true, or why not
async function settle(page) {
  try {
    await page.waitForLoadState("load", { timeout: STEP });
    await idle(page, { timeout: STEP });
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-drawers")
      && document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), null, { timeout: STEP });
    if (await page.evaluate(() => !!document.querySelector("#view")?.hasAttribute("data-v3"))) await viewDrawn(page);
    else await frames(page);
    return true;
  } catch (e) {
    return String(e.message ?? e).split("\n")[0];
  }
}

async function walk({ world, worldPath, seed, budget, focus, plants, out, replay }) {
  const started = Date.now();
  fs.mkdirSync(path.join(out, "shots"), { recursive: true });
  fs.mkdirSync(path.join(out, "owner"), { recursive: true });
  const prepared = JSON.parse(execFileSync("python3", [path.join(HERE, "prepare.py"), worldPath, path.join(out, "world")]).toString());
  const oracle = shellOracle();
  const elementsOf = JSON.parse(fs.readFileSync(path.join(HERE, "..", "shell-states.GENERATED.json"), "utf8")).elements;
  let heard = [];
  const stop = listen((m) => heard.push(m));
  // a page's uncaught error is heard as the harness says it
  const w = await boot(world, prepared, { plants, pageError: () => {} });
  const { page, ctx, drive, google } = w;
  const ROOT_REFUSED = new RegExp(`status of 404 .*%27${w.ROOT}%27`);
  const width = page.viewportSize().width;
  let action = null;
  const outside = () => ({ writes: [], settings: [], asked: [], popups: [], downloads: [], dialogs: [], reads: 0 });
  let seen = outside();
  page.on("dialog", (d) => { seen.dialogs.push(`${d.type()}: ${d.message()}`); (action?.confirm ? d.accept() : d.dismiss()).catch((e) => seen.dialogs.push("unanswered: " + e.message)); });
  page.on("filechooser", (fc) => fc.setFiles(prepared.files[action?.file || "png"]).catch((e) => seen.dialogs.push("chooser: " + e.message)));
  page.on("download", (d) => seen.downloads.push(d.suggestedFilename()));
  ctx.on("page", async (p) => {
    if (p === page) return;
    await p.waitForLoadState("domcontentloaded", { timeout: STEP / 4 }).catch((e) => seen.dialogs.push("popup: " + e.message));
    seen.popups.push(p.url());
    await p.close();
  });
  const rnd = seeded(seed), tried = new Map(), steps = [], findings = new Map();
  // the files steps that write have written
  const written = new Set();
  // the tabs the last step opened, whose leaving may be heard a step late
  let lastPopups = [];
  // how many tokens Google had issued when an event ended them: until it issues the page another, the page's calls
  // with the old one are refused, as Chromium's console says of each, and the page may say so too
  let tokensWhenEnded = null;
  // once the world has taken this person's access to the study's folder (the accessRemoved event), Drive answers every read of it
  // 404 and Chromium's console says so of each; the page says the folder cannot be seen
  let accessGone = false;
  const REFUSED = /status of 40[13] |Drive refused the [a-z ]+ \(40[13]\)|refused the token|Invalid Credentials|sign-in has run out/;
  // what the page says of Google's window answering otherwise than granting, while it does (the googleAnswers event)
  const DECLINED = /sign-in window|popup_failed_to_open|popup_closed|access_denied/;
  // each link out of the app the page shows, whether it leads somewhere, as the site serves a page at its address with
  // or without .html
  const leads = new Map();
  const deadLinks = async (now) => {
    const dead = [];
    for (const c of now.controls.filter(leavesTheApp)) {
      const p = new URL(c.href).pathname;
      if (!leads.has(p)) {
        const ok = async (q) => (await fetch(w.origin + q)).ok;
        leads.set(p, (await ok(p)) || (!/\.\w+$/.test(p) && (await ok(p + ".html"))));
        if (!leads.get(p)) dead.push({ key: c.key, text: c.text, path: p });
      }
    }
    return dead;
  };
  await settle(page);
  let before = await look(page);
  const allowed = [...EFFECTS.allow.map((a) => a.pattern), ...(world.allow || [])].map((p) => new RegExp(p));
  for (let i = 0; i < budget; i++) {
    const offered = possible(before, { events: w.events, world, focus, tried, effects: EFFECTS, fresh: new Set(steps.at(-1)?.change.controls.added || []) });
    if (replay) {
      action = { ...replay[i] };
    } else if (!before.app) {
      action = { kind: "event", event: "returnToApp" };
    } else {
      action = choose(offered, rnd);
    }
    const control = action.key ? before.controls.find((c) => c.key === action.key) : null;
    const fam = family(EFFECTS, action, control);
    action.family = fam.family;
    tried.set(sig(action), (tried.get(sig(action)) || 0) + 1);
    seen = outside();
    for (const m of heard) m.late = true;
    const marks = { calls: drive.calls.length, writes: drive.writes.length, gcalls: google.calls.length, asked: google.asked.length };
    const offline = !before.vars.online;
    let error = null, said;
    // what a person offline or in this world sees the page say is not a finding of its own
    const allow = new RegExp([...allowed.map((r) => r.source), NETWORK_GONE.source, "^(warning|error): .*(offline|ERR_INTERNET_DISCONNECTED)",
      ...(tokensWhenEnded !== null ? [REFUSED.source] : []), ...(google.answer !== "grant" ? [DECLINED.source] : []), ...(accessGone ? [ROOT_REFUSED.source] : [])].map((p) => `(?:${p})`).join("|"));
    const settled = await expecting(allow, async () => {
      try { said = await perform(w, action, prepared.files); } catch (e) { error = String(e.message ?? e).split("\n")[0]; }
      return settle(page);
    }, { maybe: true });
    if (["string", "number"].includes(typeof said)) action.said = said;
    if (action.event === "accessRemoved") accessGone = true;
    if (["expireToken", "signedOutElsewhere"].includes(action.event)) tokensWhenEnded = google.tokens.size;
    let after;
    try { after = await look(page); } catch (e) { error = (error ? error + "; " : "") + "the page could not be read: " + e.message.split("\n")[0]; after = before; }
    const nowOffline = !after.vars.online;
    seen.writes = drive.writes.slice(marks.writes);
    seen.settings = google.calls.slice(marks.gcalls).filter((c) => /^(POST|PATCH) /.test(c));
    seen.asked = google.asked.slice(marks.asked);
    seen.reads = drive.calls.length - marks.calls - seen.writes.length;
    const refusing = tokensWhenEnded !== null;
    if (refusing && google.tokens.size > tokensWhenEnded) tokensWhenEnded = null;
    for (const m of heard) if (!m.expected && (allowed.some((r) => r.test(m.line)) || ((offline || nowOffline) && NETWORK_GONE.test(m.line))
      || (accessGone && ROOT_REFUSED.test(m.line)) || (refusing && REFUSED.test(m.line)) || (google.answer !== "grant" && DECLINED.test(m.line)))) m.allowed = true;
    // the shell-states rules, for the vars the page shows, where it settled
    let shell = null;
    // a study the address names, which the page shows only once its file has come in (offline it cannot)
    const comesIn = (id) => after.title.endsWith(JSON.parse(fs.readFileSync(path.join(REPO, "studies", id, "study.json"), "utf8")).title);
    if (settled === true && after.app && after.study !== null && elementsOf[after.study || "viewer"] && comesIn(after.study || "viewer")) {
      const study = after.study || "viewer";
      const expect = await oracle.ask({ study, vars: after.vars });
      const now = await read(page, expect);
      // what the vars cannot say, left to the person's eye (effects.json's shellStates.unread)
      const unread = EFFECTS.shellStates.unread.filter((u) => Object.entries(u.html).every(([k, v]) => after.html[k] === v)).map((u) => u.under);
      // a box the person folded or unfolded themselves shows as they left it
      const foldedByHand = (e) => e.box && ["on", "folded"].includes(e.expect) && ["on", "folded"].includes(now[e.name].seen)
        && [...steps.map((t) => t.action), action].some((a) => a.key?.startsWith(e.select + " "));
      const byHand = new Set(expect.filter(foldedByHand).map((e) => e.name));
      // an element only a person's click on another shows, which the rules say is hidden
      const clicked = new Set([...steps.map((t) => t.action), action].filter((a) => a.kind === "click").map((a) => a.key));
      const opened = (e) => now[e.name].seen === "on" && EFFECTS.shellStates.openedBy.some((o) => o.select === e.select && clicked.has(o.by));
      const wrong = expect.filter((e) => now[e.name].seen !== e.expect && !byHand.has(e.name) && !opened(e) && !e.path.some((p) => byHand.has(p))
        && !unread.some((u) => e.name === u || e.path.includes(u)))
        .map((e) => ({ ...e, seen: now[e.name].seen }));
      shell = { vars: after.vars, checked: expect.length, wrong };
    }
    const s = { i, action, family: fam, before, after, control, change: change(before, after, seen), heard, settled, writes: seen.writes, popups: [...seen.popups, ...lastPopups],
      reads: seen.reads, shell, width,
      // while its token is refused, the page renews it in the person's next click, whatever the click was for
      always: [...EFFECTS.always, ...bookkeeping(EFFECTS, before, after, action), ...(refusing ? ["signin", "settings", "storage.nor-google-sign-in"] : [])], written, deadLinks: await deadLinks(after), previous: steps.length ? { ...steps.at(-1).full } : null };
    if (fam.writes !== 0) for (const [, name] of seen.writes) written.add(name);
    const found = [];
    for (const [name, check] of Object.entries(ORACLES)) for (const f of check(s)) found.push({ ...f, oracle: name });
    // a step that could not be done says nothing of the page but what it said meanwhile
    const real = error ? found.filter((f) => ["uncaught", "console", "leftTheMachine", "driveWrites"].includes(f.oracle)) : found;
    let shot = null, ownerShot = null;
    for (const f of real) {
      const had = findings.get(f.sig);
      if (had) { had.times++; had.steps.push(i); continue; }
      if (!shot) { shot = `shots/step-${String(i).padStart(3, "0")}.png`; await page.screenshot({ path: path.join(out, shot) }).catch((e) => { shot = null; error = "no screenshot: " + e.message; }); }
      if (f.class === "call" && !ownerShot) ownerShot = await ownerScreenshot(page, path.join(out, `owner/step-${String(i).padStart(3, "0")}.png`)) && `owner/step-${String(i).padStart(3, "0")}.png`;
      findings.set(f.sig, { ...f, step: i, times: 1, steps: [i], shot, ownerShot: f.class === "call" ? ownerShot : null });
      say(`  ${f.class}: ${f.what}`);
    }
    say(`${i} ${action.kind} ${action.key || action.event || action.press || ""}${error ? " (failed: " + error + ")" : ""} -> ${s.change.categories.join(" ")}`);
    steps.push({ i, action, offered: offered.map((o) => o.action.key || o.action.event).filter(Boolean), error, settled, change: s.change,
      writes: seen.writes, settings: seen.settings.length, asked: seen.asked.length, popups: seen.popups, downloads: seen.downloads, dialogs: seen.dialogs,
      heard: heard.map((m) => ({ line: m.line.slice(0, 400), expected: m.expected || !!m.allowed, late: !!m.late })), vars: after.vars,
      shell: shell && { checked: shell.checked, wrong: shell.wrong.map((e) => e.name) }, findings: real.map((f) => f.sig), full: { before, action, change: s.change } });
    heard = [];
    lastPopups = seen.popups;
    // what the run has found so far, readable while it goes on
    if (i % 25 === 24) write(out, { world: { name: world.name, path: worldPath, about: world.about }, seed, budget, focus, plants, seconds: (Date.now() - started) / 1000,
      command: "(under way)", replayOf: args.replay || null, out, steps: steps.map(({ full, ...t }) => t), findings: [...findings.values()], finalShot: "" });
    before = after;
    if (page.isClosed()) break;
  }
  const finalShot = "shots/final.png";
  await page.screenshot({ path: path.join(out, finalShot) }).catch((e) => console.error("no final screenshot: " + e.message));
  stop();
  oracle.close();
  await w.close();
  for (const s of steps) delete s.full;
  const run = { world: { name: world.name, path: worldPath, about: world.about }, seed, budget, focus, plants, seconds: (Date.now() - started) / 1000,
    command: process.argv.slice(1).map((a) => (/^[\w./:@=,#-]+$/.test(a) ? a : `'${a}'`)).join(" ").replace(/^\S*explore\.mjs/, "node web-tests/explore/explore.mjs"),
    replayOf: args.replay || null, out, steps, findings: [...findings.values()], finalShot };
  write(out, run);
  return run;
}

// a screenshot meant for the owner: two device pixels to a CSS pixel, the page's own scale put back after
async function ownerScreenshot(page, file) {
  try {
    const cdp = await page.context().newCDPSession(page), { width, height } = page.viewportSize();
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: false });
    await frames(page);
    fs.writeFileSync(file, Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    await cdp.detach();
    await frames(page);
    return true;
  } catch (e) {
    console.error("no owner screenshot: " + e.message.split("\n")[0]);
    return false;
  }
}

// the fewest of a run's steps that still find what it found: the steps up to the first finding of it, then as many
// as can go, half at a time, each try a replay of its own
function shrink(file, target) {
  const run = JSON.parse(fs.readFileSync(file, "utf8"));
  const f = run.findings.find((x) => x.sig === target) || run.findings[Number(target)];
  if (!f) throw new Error(`no finding ${target} in ${file}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shrink-"));
  let tries = 0;
  const fails = (actions) => {
    tries++;
    const at = path.join(dir, `try-${tries}`), plan = path.join(dir, `try-${tries}.json`);
    fs.writeFileSync(plan, JSON.stringify({ ...run, steps: actions.map((action, i) => ({ i, action })), findings: [] }));
    spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--replay", plan, "--out", at, "--quiet"], { stdio: "ignore" });
    console.log(`try ${tries}: ${actions.length} step(s)`);
    try { return JSON.parse(fs.readFileSync(path.join(at, "steps.json"), "utf8")).findings.some((x) => x.sig === f.sig); } catch { return false; }
  };
  let actions = run.steps.slice(0, f.step + 1).map((s) => s.action);
  if (!fails(actions)) { console.log(`not found again by its first ${actions.length} steps: ${f.sig}`); return null; }
  for (let chunk = Math.ceil(actions.length / 2); chunk >= 1 && tries < 40; chunk = Math.floor(chunk / 2)) {
    for (let at = 0; at + chunk < actions.length && tries < 40;) {
      const fewer = [...actions.slice(0, at), ...actions.slice(at + chunk)];
      if (fails(fewer)) actions = fewer; else at += chunk;
    }
  }
  const shrunk = file.replace(/\.json$/, "") + ".shrunk.json";
  fs.writeFileSync(shrunk, JSON.stringify({ ...run, steps: actions.map((action, i) => ({ i, action })), findings: [f] }, null, 1) + "\n");
  console.log(`${actions.length} step(s) still find it (${tries} tries): node web-tests/explore/explore.mjs --replay ${shrunk}`);
  return shrunk;
}

if (args.shrink) {
  process.exit(shrink(args.shrink, args.finding) ? 0 : 1);
}
let run;
if (args.replay) {
  const plan = JSON.parse(fs.readFileSync(args.replay, "utf8"));
  const steps = plan.steps.slice(0, args.upto === undefined ? undefined : Number(args.upto) + 1).map((s) => s.action);
  const world = { name: plan.world.name, ...JSON.parse(fs.readFileSync(plan.world.path, "utf8")) };
  const out = path.resolve(args.out || path.join(path.dirname(args.replay), "replay"));
  run = await walk({ world, worldPath: plan.world.path, seed: plan.seed, budget: steps.length, focus: plan.focus, plants: plan.plants, out, replay: steps });
} else {
  const worldPath = worldFile(args.world || "visitor"), name = path.basename(worldPath, ".json"), seed = Number(args.seed ?? 1);
  const world = { name, ...JSON.parse(fs.readFileSync(worldPath, "utf8")) };
  const focus = [...(args.focus ? args.focus.split(",").filter(Boolean) : []), ...(args["focus-diff"] ? focusFromDiff(args["focus-diff"]) : [])];
  const out = path.resolve(args.out || path.join(os.tmpdir(), "explore", `${name}-s${seed}`));
  run = await walk({ world, worldPath, seed, budget: Number(args.steps ?? 60), focus, plants: args.plant, out });
}
const by = (c) => run.findings.filter((f) => f.class === c).length;
console.log(`${run.steps.length} steps, ${by("bug")} bug(s), ${by("gap")} gap(s), ${by("call")} call(s): ${path.join(run.out, "summary.md")}`);
process.exit(run.findings.length ? 1 : 0);
