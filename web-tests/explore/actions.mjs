// What a person could do next, and doing it (explore.mjs). The page's own controls, read by page_look.mjs: each
// visible, enabled, reachable one inside the open modal dialog if there is one, as what a person does with its kind
// (a click, typing into a field, a slider's keys, a choice of a list, a click or a drag on the image); keys pressed
// anywhere; and the world's events (world.mjs). Each is weighted: never tried yet, up; brought up by the last step,
// up; in a focus area, up; one that
// destroys or discards, down; and drawn from a seeded random number, so a seed gives the same walk.
import { STEP } from "../deadlines.mjs";

// a control that does not answer a click within this is not clickable now: the next step tries something else
const QUICK = STEP / 4;
const TEXTS = ["", "a", "Test tag", "  spaces around  ", "ünïcödé ✓ 日本", "x".repeat(200), "https://drive.google.com/drive/folders/doesnotexist0000001",
  "0", "-1", "<b>bold</b>"];
const KEYS = ["Escape", "Tab", "Enter", "z", "Control+z", "Control+Shift+z", "+", "-", "0", "ArrowLeft", "ArrowRight", " "];
const RANGE_KEYS = ["ArrowRight", "ArrowLeft", "Home", "End", "PageUp", "PageDown"];
const FILES = ["png", "tif", "stack", "photo", "large", "broken"];
const DESTROYS = /delete|clear|remove|discard|unload|trash|sign out|reset|unshare|stop sharing|forget/i;
// the events' weights against a control's 1, before the world's own
const EVENT_WEIGHTS = { offline: 0.15, online: 1.5, reload: 0.15, back: 0.08, expireToken: 0.1, signedOutElsewhere: 0.04, googleAnswers: 0.05,
  driveAdded: 0.08, driveRemoved: 0.04, driveRenamed: 0.04, accessRemoved: 0.03, switchStudy: 0.08 };

// a seeded generator of numbers in [0, 1): the same seed, the same numbers (mulberry32)
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const kindOf = (c) => {
  if (c.tag === "canvas") return ["canvas", "drag"];
  if (c.tag === "textarea" || (c.tag === "input" && ["", "text", "search", "url", "email", "number", "tel"].includes(c.type))) return ["fill"];
  if (c.type === "range") return ["range"];
  if (c.tag === "select") return c.options?.length ? ["select"] : [];
  if (c.type === "file") return ["file"];
  if (c.tag === "input" && !["checkbox", "radio", "button", "submit", "reset", "color"].includes(c.type)) return [];
  return ["click"];
};

// a link to a page of the site that is not the app (its privacy policy, say): checked that it leads somewhere, never
// followed, the walk staying in the app
export const leavesTheApp = (c) => !!c.href && !c.external && !c.download && /^https?:$/.test(new URL(c.href).protocol) && !new URL(c.href).pathname.startsWith("/web/");

// the action's signature, which tells one tried before from one never tried
export const sig = (a) => a.kind === "event" ? "event " + a.event : a.kind === "key" ? "key " + a.press : `${a.kind} ${a.key}`;

// matches: whether an action falls in one of the focus terms (a part of a control's key, an ancestor's id, its text,
// its family, an event's name)
const matches = (focus, a, c) => focus.some((t) => (a.key || "").includes(t) || (a.event || "") === t || (a.family || "") === t
  || (c && (c.ids.some((id) => "#" + id === t || id === t) || c.text.toLowerCase().includes(t.toLowerCase()))));

export function family(effects, a, c) {
  for (const f of effects.families) {
    const m = f.match;
    if (m.key && !new RegExp(m.key).test(a.key || "")) continue;
    if (m.text && !new RegExp(m.text, "i").test(c?.text || "")) continue;
    if (m.within && !(c?.ids || []).some((id) => new RegExp(m.within).test(id))) continue;
    if (m.kind && !new RegExp(m.kind).test(a.kind)) continue;
    if (m.event && !new RegExp(m.event).test(a.event || "")) continue;
    if (!m.event && a.kind === "event") continue;
    return f;
  }
  return effects.families.at(-1);
}

// every action possible now, each {action, weight}, in a fixed order
export function possible(now, { events, world, focus, tried, effects, fresh = new Set() }) {
  const out = [];
  for (const c of now.controls) {
    if (c.disabled || !c.inScope || !c.reachable || (c.external && !c.download) || leavesTheApp(c)) continue;
    for (const kind of kindOf(c)) {
      const a = { kind, key: c.key, text: c.text };
      a.family = family(effects, a, c).family;
      let w = kind === "drag" ? 0.5 : 1;
      if (DESTROYS.test(c.text)) w *= 0.6;
      // what the last step brought up (a menu's items, a dialog's buttons): a person mostly goes on with it
      if (fresh.has(c.key)) w *= 4;
      out.push({ action: a, weight: w, control: c });
    }
  }
  for (const [name, e] of Object.entries(events)) {
    if (!e.when(now.vars)) continue;
    const a = { kind: "event", event: name };
    a.family = family(effects, a).family;
    out.push({ action: a, weight: (EVENT_WEIGHTS[name] ?? 0.05) * (world.events?.[name] ?? 1) });
  }
  for (const press of KEYS) {
    const a = { kind: "key", press };
    a.family = family(effects, a).family;
    out.push({ action: a, weight: 0.04 });
  }
  for (const p of out) {
    const t = tried.get(sig(p.action)) || 0;
    p.weight *= t ? 1 / Math.sqrt(t + 1) : 3;
    if (focus.length && matches(focus, p.action, p.control)) p.weight *= 5;
  }
  return out.sort((x, y) => (sig(x.action) < sig(y.action) ? -1 : sig(x.action) > sig(y.action) ? 1 : 0));
}

// one of them, by weight; and what doing it needs drawn (the text typed, where on the image, the file a chooser
// takes, whether a confirm is accepted), all in the action, so a replay does just that again
export function choose(options, rnd) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = rnd() * total, pick = options.at(-1);
  for (const o of options) { if ((r -= o.weight) < 0) { pick = o; break; } }
  const a = { ...pick.action };
  if (a.kind === "fill") { a.value = TEXTS[Math.floor(rnd() * TEXTS.length)]; a.enter = rnd() < 0.5; }
  if (a.kind === "range") a.press = RANGE_KEYS[Math.floor(rnd() * RANGE_KEYS.length)];
  if (a.kind === "select") a.value = pick.control.options[Math.floor(rnd() * pick.control.options.length)];
  if (a.kind === "canvas" || a.kind === "drag") a.at = [rnd(), rnd()].map((v) => Math.round(v * 1000) / 1000);
  if (a.kind === "drag") a.to = [rnd(), rnd()].map((v) => Math.round(v * 1000) / 1000);
  if (a.kind === "event") a.n = Math.floor(rnd() * 1000);
  a.file = FILES[Math.floor(rnd() * FILES.length)];
  a.confirm = rnd() < 0.5;
  return a;
}

export const destroys = (a) => DESTROYS.test(a.text || "");

// the action done on the page; an event gives what it says it did
export async function perform(w, a, files) {
  const page = w.page, at = a.key ? page.locator(a.key).first() : null;
  switch (a.kind) {
    case "click": return void await at.click({ timeout: QUICK });
    case "fill":
      await at.fill(a.value, { timeout: QUICK });
      if (a.enter) await at.press("Enter", { timeout: QUICK });
      return;
    case "range": await at.focus({ timeout: QUICK }); return void await at.press(a.press, { timeout: QUICK });
    case "select": return void await at.selectOption(a.value, { timeout: QUICK });
    case "file": return void await at.setInputFiles(files[a.file], { timeout: QUICK });
    case "canvas": case "drag": {
      await at.scrollIntoViewIfNeeded({ timeout: QUICK });
      const b = await at.boundingBox();
      if (!b) throw new Error("the canvas went before it could be clicked");
      const [x, y] = [b.x + a.at[0] * b.width, b.y + a.at[1] * b.height];
      if (a.kind === "canvas") return void await page.mouse.click(x, y);
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(b.x + a.to[0] * b.width, b.y + a.to[1] * b.height, { steps: 6 });
      return void await page.mouse.up();
    }
    case "hover": return void await at.hover({ timeout: QUICK });
    case "key": return void await page.keyboard.press(a.press);
    case "event": return await w.events[a.event].run(a.n);
  }
  throw new Error("no such kind of action: " + a.kind);
}
