// A persona's session with the page (nor-finder's exploring-the-ui skill): the explorer's walk (explore.mjs) with its
// steps taken one command at a time by someone looking at the page, a model playing a user or a designer, in place of
// the seeded draw. The world, the fakes, the settling and the checks after each step are the walk's own. What a
// command prints is what a person at the screen has: what is on it and what can be done, by number, never the page's
// ids. A step is said before it is taken and judged after it: act refuses without --expect, and the next act refuses
// until saw has said how the last one went.
//   node web-tests/explore/session.mjs start --world annotator [--out DIR] [--persona user] [--person "..."] [--goal "..."] [--plant style:CSS]
//       boots the world and prints the first look and DIR/page, the command a persona drives the session with:
//   DIR/page look                                   a screenshot, and what can be used, numbered
//   DIR/page act N --expect "..." [--choose "option"] [--at 0.5,0.5 [--to 0.8,0.8]] [--file png] [--confirm]
//   DIR/page type N "text" [--enter] --expect "..."
//   DIR/page key K [--on N] --expect "..."          a key, anywhere or on a slider
//   DIR/page hover N --expect "..."
//   DIR/page back --expect "..."  |  reload --expect "..."
//   DIR/page saw --as-expected yes|partly|no "what happened"
//   DIR/page note "..."                             a hesitation, or a remark on what is on the screen
//   DIR/page styles                                 how each visible control looks, alike ones together, the odd ones named
//   DIR/page end                                    writes DIR/session.json and DIR/session.md, beside the walk's steps.json
//   node web-tests/explore/session.mjs goals --world annotator     the world's person and their goals
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./explore.mjs";
import { look } from "./page_look.mjs";
import { kindOf, leavesTheApp } from "./actions.mjs";

const ME = fileURLToPath(import.meta.url), HERE = path.dirname(ME);
const VERDICTS = ["yes", "partly", "no"];
// the sample a file picker is given, as a person would call it
const SAMPLES = { png: "a small grey picture", tif: "a two-channel microscope image", stack: "a z-stack", photo: "a photo", large: "a large scan", broken: "a file cut short" };
// the most frames of one action a contact sheet shows
const SHEET = 12;
// a session nobody ends closes itself after this long without a command
const IDLE = 30 * 60e3;

function parse(argv) {
  const flags = {}, words = [];
  const lone = new Set(["enter", "confirm"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { words.push(a); continue; }
    const k = a.slice(2);
    if (lone.has(k)) flags[k] = true;
    else if (k === "plant") (flags.plant ||= []).push(argv[++i]);
    else flags[k] = argv[++i];
  }
  return { flags, words };
}

const worldFile = (w) => (fs.existsSync(w) ? path.resolve(w) : path.join(HERE, "worlds", `${w}.json`));
const readWorld = (w) => ({ name: path.basename(worldFile(w), ".json"), ...JSON.parse(fs.readFileSync(worldFile(w), "utf8")) });
const sheet = (job) => {
  const r = spawnSync("python3", [path.join(HERE, "sheet.py")], { input: JSON.stringify(job), encoding: "utf8" });
  if (r.status !== 0) console.error("no picture: " + r.stderr.trim().split("\n").at(-1));
  return r.status === 0;
};

// ---------- what a person sees of each control ----------

// each control the walk's look found, by its key, as a person would describe it: its words, where it is, how it stands
const describe = (page, keys) => page.evaluate((keys) => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const heading = (box) => {
    if (!box) return "";
    const named = box.getAttribute("aria-labelledby");
    const h = (named && document.getElementById(named)) || box.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > summary, :scope > legend, :scope > * > h1, :scope > * > h2, :scope > * > h3");
    return clean(box.getAttribute("aria-label") || h?.innerText).slice(0, 50);
  };
  return keys.map((key) => {
    const el = document.querySelector(key);
    if (!el) return null;
    const r = el.getBoundingClientRect(), tag = el.tagName, type = el.type || "", role = el.getAttribute("role") || "";
    let where = "";
    for (let box = el.parentElement?.closest("dialog, [role=dialog], section, aside, header, footer, nav, form, fieldset, details"); box && !where; box = box.parentElement?.closest("dialog, [role=dialog], section, aside, header, footer, nav, form, fieldset, details")) {
      where = heading(box);
      if (!where && box.tagName === "HEADER") where = "the top bar";
      if (!where && box.tagName === "FOOTER") where = "the bottom bar";
    }
    const label = el.labels?.[0] ? clean(el.labels[0].innerText) : "";
    const kind = tag === "CANVAS" ? "picture" : tag === "A" ? "link" : tag === "SELECT" ? "list" : tag === "TEXTAREA" ? "field"
      : tag === "SUMMARY" ? "fold" : role === "tab" ? "tab" : /^(option|menuitem|treeitem)/.test(role) ? "row"
        : tag === "INPUT" ? ({ checkbox: "checkbox", radio: "choice", range: "slider", color: "colour", file: "file" }[type] || (/^(button|submit|reset)$/.test(type) ? "button" : "field")) : "button";
    const state = [];
    if (kind === "checkbox" || kind === "choice") state.push(el.checked ? "ticked" : "not ticked");
    if (el.getAttribute("aria-pressed")) state.push(el.getAttribute("aria-pressed") === "true" ? "pressed in" : "not pressed in");
    if (el.getAttribute("aria-selected") === "true") state.push("selected");
    if (el.getAttribute("aria-expanded")) state.push(el.getAttribute("aria-expanded") === "true" ? "open" : "closed");
    if (tag === "SUMMARY") state.push(el.parentElement.open ? "open" : "closed");
    if (kind === "field") state.push(el.value ? `holds "${clean(el.value).slice(0, 40)}"` : el.placeholder ? `empty, hint "${clean(el.placeholder).slice(0, 40)}"` : "empty");
    if (kind === "slider") state.push(`at ${el.value} of ${el.min || 0} to ${el.max || 100}`);
    if (kind === "list") state.push(`now "${clean(el.selectedOptions[0]?.text)}"`);
    const tipOn = el.title ? el : el.closest("[title]");
    return {
      key, kind, where, state,
      text: clean(tag === "SELECT" || tag === "INPUT" || tag === "CANVAS" ? "" : el.innerText).slice(0, 70),
      name: clean(el.getAttribute("aria-label") || label).slice(0, 70),
      tip: clean(tipOn?.title).slice(0, 140),
      choices: tag === "SELECT" ? [...el.options].filter((o) => !o.disabled).map((o) => ({ label: clean(o.text), value: o.value })) : null,
      x: r.left, y: r.top, w: r.width, h: r.height,
    };
  });
}, keys);

// the words a person would name a control by: what is written on it, else what it is read out as, else its tooltip's start
const wordsOf = (d) => d.text || d.name || (d.kind === "picture" ? "" : d.tip.split(/[.:]/)[0]);
// a control showing no words (an icon) is said so, with the name a screen reader or its tooltip gives it
const WORDED = new Set(["field", "list", "slider", "checkbox", "choice", "colour", "file"]);
const called = (d) => (d.kind === "picture" ? "the picture" : d.text || WORDED.has(d.kind) ? `${d.kind}${wordsOf(d) ? ` "${wordsOf(d)}"` : " with no label"}`
  : `icon ${d.kind} showing no words${wordsOf(d) ? `, named "${wordsOf(d)}"` : ""}`);
const line = (d) => {
  const extra = [];
  if (d.where === wordsOf(d)) d = { ...d, where: "" };
  if (d.text && d.name && d.name !== d.text) extra.push(`read out as "${d.name}"`);
  if (d.tip && d.tip !== wordsOf(d)) extra.push(`tooltip "${d.tip}"`);
  if (d.state.length) extra.push(d.state.join(", "));
  if (d.choices) extra.push(`choices: ${d.choices.map((c) => `"${c.label}"`).join(", ")}`);
  if (d.kind === "picture") extra.push("click or drag on it");
  return `${called(d)}${extra.length ? ` (${extra.join("; ")})` : ""}${d.where ? `  [in: ${d.where}]` : ""}`;
};

// ---------- how the visible controls look, for the designer ----------

const looks = (page, keys) => page.evaluate((keys) => keys.map((key) => {
  const el = document.querySelector(key);
  if (!el || el.tagName === "CANVAS") return null;
  const s = getComputedStyle(el), r = el.getBoundingClientRect(), px = (v) => Math.round(parseFloat(v) || 0);
  const words = (el.innerText || "").trim().split(/\s+/).filter(Boolean).length;
  return {
    key, words,
    look: {
      height: Math.round(r.height), "padding left": px(s.paddingLeft), "padding top": px(s.paddingTop), "corner radius": px(s.borderTopLeftRadius),
      border: px(s.borderTopWidth) ? `${px(s.borderTopWidth)}px ${s.borderTopColor}` : "none", "font size": px(s.fontSize), "font weight": s.fontWeight,
      "text colour": s.color, background: s.backgroundColor,
    },
  };
}), keys);

// the kinds' controls gathered by look: the commonest look of each kind, and each control that departs from it with how
function styleReport(described, looked) {
  const by = new Map();
  for (const d of described) {
    const l = looked.find((x) => x && x.key === d.key);
    if (!l) continue;
    (by.get(d.kind) || by.set(d.kind, []).get(d.kind)).push({ d, ...l });
  }
  const out = [];
  for (const [kind, all] of by) {
    const groups = new Map();
    for (const c of all) { const sig = JSON.stringify(c.look); (groups.get(sig) || groups.set(sig, []).get(sig)).push(c); }
    const sorted = [...groups.values()].sort((a, b) => b.length - a.length);
    const names = (g) => g.slice(0, 4).map((c) => called(c.d)).join(", ") + (g.length > 4 ? `, and ${g.length - 4} more` : "");
    const apart = (g, u) => Object.entries(g[0].look).filter(([k, v]) => u[0].look[k] !== v);
    out.push(`${kind}: ${all.length} on show, in ${sorted.length} look(s).`);
    for (const [k, g] of sorted.entries()) {
      // the look shared by more controls that this one is nearest to: one or two differences from it is an odd one out
      const larger = sorted.filter((u) => u.length > g.length).sort((a, b) => apart(g, a).length - apart(g, b).length)[0];
      if (!k || !larger) { out.push(`  a look shared by ${g.length}: ${names(g)}`, `    ${Object.entries(g[0].look).map(([p, v]) => `${p} ${v}`).join(", ")}`); continue; }
      const differs = apart(g, larger);
      out.push(`  ${differs.length <= 2 ? "ODD ONE OUT" : "another look"} (${g.length}): ${names(g)}`,
        `    unlike ${names(larger)} in: ${differs.map(([p, v]) => `${p} ${v} (theirs ${larger[0].look[p]})`).join(", ")}`);
    }
    const wordy = WORDED.has(kind) ? [] : all.filter((c) => c.words > 4);
    if (wordy.length) out.push(`  more than four words: ${wordy.map((c) => `${called(c.d)} (${c.words})`).join(", ")}`);
  }
  return out.join("\n");
}

// ---------- the server: the walk, waiting on commands ----------

async function serve(flags) {
  const worldPath = worldFile(flags.world), world = readWorld(flags.world), out = path.resolve(flags.out);
  const seenDir = path.join(out, "seen");
  fs.mkdirSync(seenDir, { recursive: true });
  const log = { persona: flags.persona || null, person: flags.person || null, goal: flags.goal || null, world: world.name, about: world.about,
    started: new Date().toISOString(), steps: [], notes: [] };
  let page, cdp, shown = null, looksTaken = 0, awaiting = null, current = null, ended = false;
  // the walk waiting for the step's action, and the command waiting for the step it asked to be done
  let give = null, stepDone = null, ready, isReady;
  const wait = () => { ready = new Promise((ok) => { isReady = ok; }); };
  wait();
  let chosen = [];
  // the page's own names for its parts, and everything the persona was shown: a name of the first kind in the
  // persona's words that it was never shown is knowledge from beyond the screen
  const pageIds = new Set();
  let printed = "";
  const beyondTheScreen = (words) => {
    const said = words.toLowerCase(), out = said.match(/#[a-z][\w-]*/g) || [];
    for (const id of pageIds) if (/[-_]/.test(id) && said.includes(id) && !printed.includes(id) && !printed.includes(id.replace(/[-_]/g, " "))) out.push(id);
    return [...new Set(out)];
  };

  const motions = () => page.evaluate(() => ({ css: (window.cssMotions || []).map((m) => m.name), scripted: [...(window.scriptedMotions || [])], views: (window.viewTransitions || []).length }))
    .catch((e) => { console.error("motions unread: " + e.message.split("\n")[0]); return { css: [], scripted: [], views: 0 }; });
  // what a list recorded in the page gained since it was read before; all of it where the page was loaded anew meanwhile
  const since = (now, was) => (now.length >= was.length ? now.slice(was.length) : now);

  const driver = {
    async opened(o) {
      page = o.page;
      cdp = await page.context().newCDPSession(page);
      page.on("filechooser", () => chosen.push(SAMPLES[current?.action.file || "png"]));
    },
    next: () => new Promise((ok) => { give = ok; isReady(); }),
    async around(go) {
      const frames = [];
      let first;
      const got = new Promise((ok) => { first = ok; });
      const onFrame = (f) => {
        frames.push({ data: f.data, at: f.metadata.timestamp * 1000 });
        first();
        cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch((e) => console.error("frame not acknowledged: " + e.message));
      };
      cdp.on("Page.screencastFrame", onFrame);
      const was = await motions();
      let cast = true;
      await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, maxWidth: 760, maxHeight: 520, everyNthFrame: 1 }).catch((e) => { cast = false; console.error("no frames: " + e.message); });
      // the frame before the action, which the browser sends once the cast starts
      if (cast) await Promise.race([got, new Promise((ok) => setTimeout(ok, 1000))]); // bounds a hang: a browser that sends no first frame
      const t0 = Date.now();
      const settled = await go();
      const took = Date.now() - t0;
      if (cast) await cdp.send("Page.stopScreencast").catch((e) => console.error("frames not stopped: " + e.message));
      cdp.off("Page.screencastFrame", onFrame);
      const now = await motions();
      current.happened = { took, frames: frames.map((f) => ({ data: f.data, ms: Math.max(0, Math.round(f.at - t0)) })), css: [...since(now.css, was.css), ...since(now.scripted, was.scripted)],
        views: now.views >= was.views ? now.views - was.views : now.views };
      return settled;
    },
    async done({ error, settled, findings, seen, change }) {
      const h = current.happened || { took: 0, frames: [], css: [], views: 0 };
      const distinct = h.frames.filter((f, k) => k === 0 || f.data !== h.frames[k - 1].data);
      const picked = distinct.length <= SHEET ? distinct : Array.from({ length: SHEET }, (_, k) => distinct[Math.round(k * (distinct.length - 1) / (SHEET - 1))]);
      let sheetFile = null;
      if (picked.length > 1) {
        const dir = path.join(seenDir, `step-${String(current.i + 1).padStart(3, "0")}-frames`);
        fs.mkdirSync(dir, { recursive: true });
        const files = picked.map((f, k) => { const file = path.join(dir, `${String(k).padStart(2, "0")}.jpg`); fs.writeFileSync(file, Buffer.from(f.data, "base64")); return { file, ms: f.ms }; });
        sheetFile = path.join(seenDir, `step-${String(current.i + 1).padStart(3, "0")}-motion.png`);
        if (!sheet({ sheet: { frames: files, out: sheetFile } })) sheetFile = null;
      }
      const count = (names) => [...names.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map())].map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)).join(", ");
      current.happened = { ms: h.took, changedFor: distinct.length > 1 ? distinct.at(-1).ms : 0, frames: distinct.length, sheet: sheetFile,
        motions: count(h.css), viewTransitions: h.views, error: error || null, settled, popups: seen.popups, downloads: seen.downloads, dialogs: seen.dialogs,
        pickedFiles: chosen, changed: change.categories };
      current.qa = findings.map((f) => ({ class: f.class, what: f.what, oracle: f.oracle, sig: f.sig }));
      chosen = [];
      stepDone();
    },
  };

  async function see() {
    await ready;
    const now = await look(page);
    const usable = now.controls.filter((c) => !c.disabled && c.inScope && c.reachable && kindOf(c).length && !(c.external && !c.download) && !leavesTheApp(c));
    const out = now.controls.filter((c) => !c.disabled && c.inScope && c.reachable && ((c.external && !c.download) || leavesTheApp(c)));
    const grey = now.controls.filter((c) => c.disabled && c.inScope);
    const all = await describe(page, [...usable, ...out, ...grey].map((c) => c.key));
    const of = (c) => all.find((d) => d && d.key === c.key);
    const numbered = usable.map((c) => ({ c, d: of(c) })).filter((x) => x.d).sort((a, b) => (Math.abs(a.d.y - b.d.y) > 6 ? a.d.y - b.d.y : a.d.x - b.d.x)).map((x, k) => ({ n: k + 1, ...x }));
    const id = String(++looksTaken).padStart(3, "0"), shot = path.join(seenDir, `look-${id}.png`), marked = path.join(seenDir, `look-${id}-numbered.png`);
    await page.screenshot({ path: shot });
    const scale = await page.evaluate(() => devicePixelRatio);
    const hasMarks = sheet({ numbered: { image: shot, out: marked, marks: numbered.map(({ n, d }) => ({ n, x: d.x * scale, y: d.y * scale, w: d.w * scale, h: d.h * scale })) } });
    const dialog = await page.evaluate(() => {
      const d = [...document.querySelectorAll("dialog[open]")].filter((x) => x.matches(":modal")).at(-1);
      return d ? (d.querySelector("h1, h2, h3")?.innerText || d.getAttribute("aria-label") || "").trim() || "(untitled)" : null;
    });
    const lines = [`Screenshot: ${shot}${hasMarks ? `\nThe same with each number drawn on what it names: ${marked}` : ""}`,
      `Browser tab's title: ${now.title}`];
    if (!now.app) lines.push("This is not the app any more: the browser shows another page. `back` returns to the app.");
    if (now.status) lines.push(`Status line at the bottom: "${now.status}"`);
    if (now.notice) lines.push(`A notice over the page: "${now.notice}"`);
    if (dialog) lines.push(`A dialog is open, "${dialog}": only what is in it can be used until it closes.`);
    lines.push("", numbered.length ? "You can use:" : "Nothing on the page can be used right now.", ...numbered.map(({ n, d }) => `  ${n}. ${line(d)}`));
    if (grey.length) lines.push("", "Greyed out, cannot be used now:", ...grey.map(of).filter(Boolean).map((d) => `  - ${line(d)}`));
    if (out.length) lines.push("", "Links that leave the app, not followed in this session:", ...out.map(of).filter(Boolean).map((d) => `  - ${line(d)}`));
    shown = { numbered, shot, marked: hasMarks ? marked : null, text: lines.join("\n") };
    for (const id of await page.evaluate(() => [...document.querySelectorAll("[id]")].map((e) => e.id))) pageIds.add(id.toLowerCase());
    printed += "\n" + shown.text.toLowerCase();
    fs.writeFileSync(path.join(seenDir, `look-${id}.txt`), shown.text + "\n");
    return shown;
  }

  const refuse = (text) => ({ code: 2, text: "Refused: " + text });
  const control = (n) => shown?.numbered.find((x) => x.n === Number(n));

  async function step(action, did, expect) {
    if (!expect || !String(expect).trim()) return refuse("say what you expect to happen first, with --expect \"...\"; then the action is taken.");
    if (awaiting) return refuse(`first say how the last action went: saw --as-expected yes|partly|no "<what happened>" (the last action: ${awaiting.did}; you expected: ${awaiting.expectation}).`);
    await ready;
    current = { i: log.steps.length, did, expectation: String(expect).trim(), before: shown ? { shot: shown.shot, numbered: shown.marked, listing: shown.text } : null, action, verdict: null, notes: [] };
    log.steps.push(current);
    awaiting = current;
    const finished = new Promise((ok) => { stepDone = ok; });
    wait();
    give(action);
    await finished;
    const h = current.happened, lines = [`Done: ${did}.`];
    if (h.error) lines.push("The page did not take it: what you aimed at did not answer (it may be covered, gone or not usable).");
    lines.push(`The page was still again after ${h.ms} ms.` + (h.frames > 1 ? ` The screen went on changing for about ${h.changedFor} ms: its ${h.frames} frames, in order, are in ${h.sheet || "(no picture could be made)"}`
      : " Nothing on the screen changed that a frame caught."));
    // what each animation is called is the stylesheet's word for it: a designer's to read, never a user's
    lines.push(h.motions || h.viewTransitions ? (log.persona === "user" ? "The page animated the change."
      : `Animations the page started: ${[h.motions, h.viewTransitions ? `${h.viewTransitions} whole-view transition(s)` : ""].filter(Boolean).join("; ")}.`)
      : `The page started no animation or transition${h.frames > 2 ? ": what changed over those frames arrived in steps, unanimated" : ""}.`);
    for (const f of h.pickedFiles) lines.push(`The computer's file picker opened, and ${f} was chosen for you.`);
    for (const d of h.downloads) lines.push(`A file was downloaded: ${d}`);
    for (const p of h.popups) lines.push(`A new browser tab opened (${p}) and was closed again for this session.`);
    for (const d of h.dialogs) lines.push(`The browser itself asked or said: ${d} (answered ${action.confirm ? "OK" : "Cancel"}).`);
    const after = await see();
    current.after = { shot: after.shot, numbered: after.marked, listing: after.text };
    lines.push("", "Now say whether that is what you expected:  saw --as-expected yes|partly|no \"<what happened, in your words>\"", "", "--- the page now ---", after.text);
    return { code: 0, text: lines.join("\n") };
  }

  const point = (s) => { const [x, y] = String(s).split(",").map(Number); return [x, y].every((v) => v >= 0 && v <= 1) ? [x, y] : null; };
  const commands = {
    look: async () => ({ code: 0, text: (await see()).text }),
    async act({ flags, words }) {
      const x = control(words[0]);
      if (!x) return refuse(`there is no number ${words[0]} in the last look; look again.`);
      const kinds = kindOf(x.c), base = { key: x.c.key, text: x.c.text, file: flags.file in SAMPLES ? flags.file : "png", confirm: !!flags.confirm };
      if (kinds[0] === "fill") return refuse("that is a field: type into it with  type N \"text\" --expect \"...\"");
      if (kinds[0] === "range") return refuse("that is a slider: move it with  key ArrowRight --on N --expect \"...\"  (ArrowLeft, Home, End too)");
      if (kinds[0] === "select") {
        const c = x.d.choices.find((o) => o.label === flags.choose);
        if (!c) return refuse(`that is a list: choose one of its choices with --choose "...": ${x.d.choices.map((o) => `"${o.label}"`).join(", ")}`);
        return step({ ...base, kind: "select", value: c.value }, `chose "${c.label}" in ${called(x.d)}`, flags.expect);
      }
      if (kinds[0] === "canvas") {
        const at = point(flags.at ?? "0.5,0.5"), to = flags.to ? point(flags.to) : null;
        if (!at || (flags.to && !to)) return refuse("a place on the picture is two numbers from 0 to 1, across then down: --at 0.3,0.6");
        return step({ ...base, kind: to ? "drag" : "canvas", at, ...(to ? { to } : {}) }, to ? `dragged on the picture from ${at} to ${to}` : `clicked the picture at ${at}`, flags.expect);
      }
      if (kinds[0] === "file") return step({ ...base, kind: "file" }, `gave ${called(x.d)} ${SAMPLES[base.file]}`, flags.expect);
      return step({ ...base, kind: "click" }, `pressed ${called(x.d)}`, flags.expect);
    },
    async type({ flags, words }) {
      const x = control(words[0]);
      if (!x) return refuse(`there is no number ${words[0]} in the last look; look again.`);
      if (kindOf(x.c)[0] !== "fill") return refuse("that is not a field to type into.");
      return step({ kind: "fill", key: x.c.key, text: x.c.text, value: words[1] ?? "", enter: !!flags.enter }, `typed "${words[1] ?? ""}" into ${called(x.d)}${flags.enter ? " and pressed Enter" : ""}`, flags.expect);
    },
    async key({ flags, words }) {
      if (!words[0]) return refuse("name the key: key Escape --expect \"...\"");
      if (flags.on === undefined) return step({ kind: "key", press: words[0] }, `pressed the ${words[0]} key`, flags.expect);
      const x = control(flags.on);
      if (!x || kindOf(x.c)[0] !== "range") return refuse("--on takes the number of a slider from the last look.");
      return step({ kind: "range", key: x.c.key, text: x.c.text, press: words[0] }, `pressed ${words[0]} on ${called(x.d)}`, flags.expect);
    },
    async hover({ flags, words }) {
      const x = control(words[0]);
      if (!x) return refuse(`there is no number ${words[0]} in the last look; look again.`);
      return step({ kind: "hover", key: x.c.key, text: x.c.text }, `moved the pointer over ${called(x.d)}`, flags.expect);
    },
    back: ({ flags }) => step({ kind: "event", event: "returnToApp" }, "went back to the app", flags.expect),
    reload: ({ flags }) => step({ kind: "event", event: "reload" }, "reloaded the page", flags.expect),
    async saw({ flags, words }) {
      if (!awaiting) return refuse("there is no action waiting to be judged; act first.");
      if (!VERDICTS.includes(flags["as-expected"])) return refuse("say --as-expected yes, partly or no.");
      if (!words[0]?.trim()) return refuse("say what happened, in your words, after the flags.");
      awaiting.verdict = { asExpected: flags["as-expected"], words: words.join(" ") };
      awaiting = null;
      return { code: 0, text: "Noted." };
    },
    async note({ words }) {
      if (!words[0]?.trim()) return refuse("say what you noticed.");
      (current && !current.verdict ? current.notes : log.notes).push({ after: log.steps.length - 1, words: words.join(" ") });
      return { code: 0, text: "Noted." };
    },
    async styles() {
      const now = await see();
      const d = now.numbered.map((x) => x.d);
      return { code: 0, text: `How the controls on show look (screenshot: ${now.shot}).\n` + styleReport(d, await looks(page, d.map((x) => x.key))) };
    },
    async end() {
      ended = true;
      await ready;
      give(null);
      const run = await walking;
      const mismatches = log.steps.filter((s) => s.verdict && s.verdict.asExpected !== "yes");
      log.beyondTheScreen = log.steps.flatMap((s) => beyondTheScreen([s.expectation, s.verdict?.words || "", ...s.notes.map((n) => n.words)].join(" ")).map((word) => ({ step: s.i + 1, word })));
      Object.assign(log, { ended: new Date().toISOString(), qa: { steps: path.join(out, "steps.json"), summary: path.join(out, "summary.md"), findings: run.findings.length } });
      fs.writeFileSync(path.join(out, "session.json"), JSON.stringify(log, null, 1) + "\n");
      const md = [`# Session: ${log.persona || "a persona"} in ${log.world}`, "", ...(log.person ? [`Who: ${log.person}`, ""] : []), ...(log.goal ? [`Goal: ${log.goal}`, ""] : []),
        `${log.steps.length} steps; ${mismatches.length} went otherwise than expected; ${log.steps.filter((s) => !s.verdict).length} left unjudged; the walk's own checks found ${run.findings.length} thing(s) ([summary.md](summary.md)).`, ""];
      for (const s of log.steps) {
        md.push(`## ${s.i + 1}. ${s.did}`, "", `- expected: ${s.expectation}`, `- as expected: ${s.verdict ? `**${s.verdict.asExpected}**: ${s.verdict.words}` : "never said"}`,
          `- took ${s.happened.ms} ms; ${s.happened.frames > 1 ? `the screen changed for ${s.happened.changedFor} ms` : "no change a frame caught"}; motion: ${s.happened.motions || "none"}${s.happened.sheet ? `; [frames](${path.relative(out, s.happened.sheet)})` : ""}`,
          `- before: ${s.before ? `[screenshot](${path.relative(out, s.before.shot)})` : "not looked at"}; after: [screenshot](${path.relative(out, s.after.shot)})`);
        for (const n of s.notes) md.push(`- note: ${n.words}`);
        for (const f of s.qa) md.push(`- the walk's check, ${f.class}: ${f.what}`);
        md.push("");
      }
      if (log.beyondTheScreen.length) md.push("## Words only the code has", "", "The persona used the page's own names for its parts, which nothing it was shown says: it read more than the screen.", "",
        ...log.beyondTheScreen.map((l) => `- step ${l.step}: ${l.word}`), "");
      if (log.notes.length) md.push("## Notes", "", ...log.notes.map((n) => `- after step ${n.after + 1}: ${n.words}`), "");
      fs.writeFileSync(path.join(out, "session.md"), md.filter((l) => l !== null).join("\n"));
      return { code: 0, text: `Session ended: ${log.steps.length} steps, ${mismatches.length} otherwise than expected.\n${path.join(out, "session.md")}\n${path.join(out, "session.json")}`, close: true };
    },
  };

  // one command at a time, in the order they came
  let queue = Promise.resolve(), idle;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      queue = queue.then(async () => {
        clearTimeout(idle);
        let answer;
        try {
          const { cmd, flags: f, words } = JSON.parse(body);
          answer = ended ? refuse("the session has ended.") : commands[cmd] ? await commands[cmd]({ flags: f, words }) : refuse(`no such command: ${cmd}. look, act, type, key, hover, back, reload, saw, note, styles, end.`);
        } catch (e) {
          console.error(e);
          answer = { code: 1, text: "The session failed on that: " + String(e.message ?? e).split("\n")[0] };
        }
        res.end(JSON.stringify(answer));
        if (answer.close) server.close(() => process.exit(0));
        else idle = setTimeout(() => commands.end().then(() => process.exit(0)), IDLE); // bounds a hang: a session nobody ends
      });
    });
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  fs.writeFileSync(path.join(out, "port"), String(server.address().port));
  const walking = walk({ world, worldPath, seed: 0, budget: Infinity, focus: [], plants: flags.plant || [], out, driver, scale: 2 });
  walking.catch((e) => { console.error(e); process.send?.({ failed: String(e.message ?? e) }); process.exit(1); });
  await ready;
  process.send?.({ ready: true });
}

// ---------- the commands' client ----------

async function send(dir, body) {
  let port;
  try { port = fs.readFileSync(path.join(dir, "port"), "utf8"); } catch { console.error(`no session at ${dir}: start one first.`); process.exit(2); }
  let answer;
  try {
    answer = await (await fetch(`http://127.0.0.1:${port}/`, { method: "POST", body: JSON.stringify(body) })).json();
  } catch (e) {
    console.error(`the session at ${dir} does not answer (ended, or closed after being left idle): ${e.cause?.code || e.message}`);
    process.exit(2);
  }
  console.log(answer.text);
  process.exit(answer.code);
}

async function start(flags) {
  const world = readWorld(flags.world || "visitor");
  const out = path.resolve(flags.out || path.join(os.tmpdir(), "explore", `session-${world.name}-${Date.now().toString(36)}`));
  fs.mkdirSync(out, { recursive: true });
  const logFile = fs.openSync(path.join(out, "server.log"), "a");
  const pass = ["persona", "person", "goal"].flatMap((k) => (flags[k] ? [`--${k}`, flags[k]] : []));
  const child = spawn(process.execPath, [ME, "serve", "--world", worldFile(flags.world || "visitor"), "--out", out, ...pass, ...(flags.plant || []).flatMap((p) => ["--plant", p])],
    { detached: true, stdio: ["ignore", logFile, logFile, "ipc"] });
  const told = await new Promise((ok) => { child.once("message", ok); child.once("exit", (code) => ok({ failed: `the session's process ended (${code}); see ${path.join(out, "server.log")}` })); });
  if (!told.ready) { console.error(told.failed); process.exit(2); }
  child.disconnect();
  child.unref();
  const page = path.join(out, "page");
  fs.writeFileSync(page, `#!/bin/sh\nexec '${process.execPath}' '${ME}' --session '${out}' "$@"\n`, { mode: 0o755 });
  console.log(`Session ready. Drive it with: ${page} <command>\n`);
  await send(out, { cmd: "look", flags: {}, words: [] });
}

const { flags, words } = parse(process.argv.slice(2));
const cmd = words.shift();
if (cmd === "serve") await serve(flags);
else if (cmd === "start") await start(flags);
else if (cmd === "goals") {
  const w = readWorld(flags.world || "visitor"), g = w.goals;
  if (!g) { console.error(`the world ${w.name} names no person and goals.`); process.exit(2); }
  console.log(JSON.stringify({ world: w.name, ...g }, null, 1));
} else {
  const dir = flags.session || process.env.EXPLORE_SESSION;
  if (!cmd || !dir) { console.error("usage: session.mjs start --world NAME, then DIR/page look | act | type | key | hover | back | reload | saw | note | styles | end"); process.exit(2); }
  delete flags.session;
  await send(path.resolve(dir), { cmd, flags, words });
}
