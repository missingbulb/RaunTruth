// The page's motions as they happen, for a test asking whether one is on, started and finished, never how it looks on
// the way. record(ctx) before the page loads. View transitions: begun(page) counts them; moved(page, since, group)
// waits for one begun since then that moved the group named (a name, or a pattern) and finished. CSS transitions and
// animations: played(page) counts them; ran(page, since, wants) waits for each want, a { name, left } with either
// left out, to be matched by one begun since then and ended. Each gives what it found, missing: true when it did not.
// Motions a script starts (Element.animate): scripted(page) counts them; animated(page, since, sel, name) waits for
// one begun since then on what sel names, animating the property named, to end, and gives what it found as ran does.
// atRest(page, selector) waits until nothing animates the element, for a check that measures it.

// what the motion was doing, for a check that timed out waiting on it: whether a view transition is under way, what
// is animating, and whether the page still draws frames at all
export const motion = (page) => page.evaluate(() => new Promise((done) => {
  const state = (frames) => ({
    transition: !!document.activeViewTransition, frames,
    animations: document.getAnimations().map((a) => `${a.effect?.target?.id || a.effect?.target?.getAttribute?.("class") || "?"}${a.effect?.pseudoElement || ""} ${a.playState} ${Math.round(a.currentTime ?? -1)}`),
  });
  requestAnimationFrame(() => done(state(true)));
  setTimeout(() => done(state(false)), 1000); // bounds a hang: a page drawing no frame for a second has stalled
})).then((x) => JSON.stringify(x), (e) => "the page does not answer: " + e.message);

export const record = (ctx) => ctx.addInitScript(() => {
  window.viewTransitions = [];
  const start = Document.prototype.startViewTransition;
  if (start) Document.prototype.startViewTransition = function (...a) {
    const t = start.apply(this, a), v = { groups: [], finished: false };
    window.viewTransitions.push(v);
    t.ready.then(() => { v.groups = document.getAnimations().map((x) => x.effect?.pseudoElement?.match(/^::view-transition-group\((.+)\)$/)?.[1]).filter(Boolean); },
      (e) => { v.cut = e.name; });
    t.finished.finally(() => { v.finished = true; });
    return t;
  };
  // a CSS transition or animation, by its property or name and whether it is in the left bar
  window.cssMotions = [];
  const begin = (name) => (e) => window.cssMotions.push({ name: e[name], left: !!e.target.closest?.("#left"), target: e.target, ended: false });
  const end = (name) => (e) => { const m = window.cssMotions.findLast((x) => x.target === e.target && x.name === e[name] && !x.ended); if (m) m.ended = true; };
  addEventListener("transitionrun", begin("propertyName"), true);
  addEventListener("animationstart", begin("animationName"), true);
  for (const t of ["transitionend", "transitioncancel"]) addEventListener(t, end("propertyName"), true);
  for (const t of ["animationend", "animationcancel"]) addEventListener(t, end("animationName"), true);
  // a motion a script starts, by the properties its keyframes move
  window.scriptMotions = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, ...rest) {
    const a = animate.call(this, frames, ...rest), list = Array.isArray(frames) ? frames : [frames];
    const m = { names: [...new Set(list.flatMap((f) => Object.keys(f).filter((k) => !["offset", "easing", "composite"].includes(k))))], target: this, ended: false };
    window.scriptMotions.push(m);
    a.addEventListener("finish", () => { m.ended = true; });
    a.addEventListener("cancel", () => { m.cancelled = true; });
    return a;
  };
});

// a stall is a failure, a slow machine is not
const WAIT = 15000;
export const begun = (page) => page.evaluate(() => window.viewTransitions.length);
export const moved = (page, since, group) => page.waitForFunction(([n, g]) => {
  const is = (name) => (g.startsWith("/") ? new RegExp(g.slice(1, -1)).test(name) : name === g);
  return window.viewTransitions.slice(n).find((v) => v.finished && v.groups.some(is)) || false;
}, [since, String(group)], { timeout: WAIT }).then((h) => h.jsonValue(),
  async () => ({ missing: true, begun: await page.evaluate((n) => window.viewTransitions.slice(n), since), motion: await motion(page) }));

export const played = (page) => page.evaluate(() => window.cssMotions.length);
export const ran = (page, since, wants) => page.waitForFunction(([n, ws]) => {
  const all = window.cssMotions.slice(n);
  return ws.every((w) => all.some((x) => x.ended && Object.entries(w).every(([k, v]) => x[k] === v)));
}, [since, wants], { timeout: WAIT }).then(() => ({}),
  async () => ({ missing: true, played: await page.evaluate((n) => window.cssMotions.slice(n).map(({ name, left, ended }) => ({ name, left, ended })), since) }));

export const scripted = (page) => page.evaluate(() => window.scriptMotions.length);
export const animated = (page, since, selector, name) => page.waitForFunction(([n, sel, name]) =>
  window.scriptMotions.slice(n).some((m) => m.ended && m.names.includes(name) && m.target.matches?.(sel)), [since, selector, name], { timeout: WAIT }).then(() => ({}),
  async () => ({ missing: true, played: await page.evaluate(([n, sel]) => window.scriptMotions.slice(n).filter((m) => m.target.matches?.(sel)).map(({ names, ended, cancelled }) => ({ names, ended, cancelled })), [since, selector]) }));

// a motion on an element begins a frame after what starts it, so one still frame is not yet rest; three in a row are
export const atRest = (page, selector) => page.waitForFunction((sel) => {
  const e = document.querySelector(sel), still = (window.atRestFrames ||= {});
  still[sel] = e.getAnimations().length ? 0 : (still[sel] || 0) + 1;
  if (still[sel] < 3) return false;
  delete still[sel]; return true;
}, selector, { polling: "raf" });
