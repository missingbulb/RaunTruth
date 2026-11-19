// The keyboard's actions (req/shell/image/keys): what a study declares in its study.json's `actions`, and what a
// viewer adds of its own, wired to the keys here, each listed in the keys legend at the image's bottom left while it
// acts. A study hands over only its handlers and the states its actions wait on.
import { fault } from "./log.js";

// how the legend writes a key the declaration names by its place
const NAMES = { Space: "Space", Backspace: "⌫", Enter: "Enter", NumpadEnter: "Enter", Escape: "Esc", Minus: "−", Equal: "=",
  ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", ShiftLeft: "shift", ShiftRight: "shift" };
// each modifier: what the event says of it, and the keys that are it
const MODS = { Ctrl: ["ctrlKey", /^Control/], Alt: ["altKey", /^Alt/], Shift: ["shiftKey", /^Shift/], Meta: ["metaKey", /^Meta/] };
const nameOf = (code) => NAMES[code] || code.replace(/^(Key|Digit|Numpad)/, "");
// "Alt+ArrowLeft" → {code: "ArrowLeft", mods: ["Alt"]}
function parse(key) { const parts = key.split("+"), code = parts.pop(); return { code, mods: parts }; }
const hintOf = (keys) => { const { code, mods } = parse(keys[0]); return [...mods, nameOf(code)].join("+"); };
// the modifiers held with the key, those it is itself aside, exactly those it names
function matches({ code, mods }, e) {
  if (e.code !== code) return false;
  return Object.entries(MODS).every(([m, [held, is]]) => is.test(code) || !!e[held] === mods.includes(m));
}
const FIELD = 'input, select, textarea, [contenteditable=""], [contenteditable="true"]';
// a menu, a popover, a dialog or a context menu open takes the keys
const busy = () => !!document.querySelector("dialog[open], details.menu[open], :popover-open")
  || [...document.querySelectorAll('[role="menu"]:not([hidden])')].some((m) => m.checkVisibility());
const shown = (el) => !!el && !el.disabled && el.checkVisibility() && !el.closest("[inert]");

// legend: the element the rows go into
export function actions(legend) {
  const html = (tag, props) => Object.assign(document.createElement(tag), props);
  // every action now: {spec, keys, codes, order, row, label, hint, active(), on(), control(), held: its key went down
  // and it acted}; down: the codes held now, typed in no field
  const list = [];
  let handlers = {}, state = {}, painting = 0;
  const down = new Set();
  // a declared condition, "name" or "!name", over the states reported
  const holds = (c) => (c[0] === "!" ? !state[c.slice(1)] : !!state[c]);
  // every action says whether it is a state of the view, listed in the legend, or not, its key only on its control
  function add(spec, order, signal) {
    if (typeof spec.legend !== "boolean") return fault(`the action ${spec.id} says nothing of the legend: give it legend true or false`);
    const keys = spec.keys.map(parse);
    const a = { spec, keys, order, codes: keys.map((k) => k.code), held: false };
    a.control = () => (typeof spec.control === "string" ? document.querySelector(spec.control) : null);
    a.active = () => (typeof spec.active === "function" ? spec.active() : (spec.when || []).every(holds)) && (!spec.control || shown(a.control()));
    a.on = () => {
      if (typeof spec.on === "function") return !!spec.on();
      if (typeof spec.on === "string") return !!state[spec.on];
      const c = a.control();
      return spec.kind === "toggle" && !!c && (c.getAttribute("aria-pressed") === "true" || !!c.checked);
    };
    a.label = html("button", { type: "button", className: "key-chip", textContent: spec.label, title: spec.title || "" });
    a.label.id = order === Infinity ? spec.id : `key-${spec.id}`;
    a.label.onclick = () => { act(a, "click"); paint(); };
    a.hint = html("span", { className: "key-hint", textContent: spec.hint || hintOf(spec.keys) });
    a.row = html("div", { className: "key-row" }); a.row.append(a.label, a.hint);
    list.push(a); list.sort((x, y) => x.order - y.order);
    legend.append(...list.filter((x) => x.spec.legend).map((x) => x.row));
    signal?.addEventListener("abort", () => { list.splice(list.indexOf(a), 1); a.row.remove(); a.control()?.querySelector(":scope > kbd.key-on")?.remove(); });
    paint();
    return a;
  }
  // a viewer's own action carries its handler; a study's is handed over by id
  const handlerOf = (a) => a.spec.handler || handlers[a.spec.id];
  // what an action does: phase "press" as its key goes down (a hold's "down"), "up" as a hold's is let go, "click" on its row
  function act(a, phase, e) {
    const fn = handlerOf(a), c = a.control();
    if (fn) return fn(phase, { event: e, control: c });
    if (c && phase !== "up") c.click();
  }
  // every row shown or not, filled or not, and each control carrying its key
  function paint() {
    for (const a of list) {
      const on = a.active();
      if (a.row.hidden === on) a.row.hidden = !on;
      const pressed = String(on && a.on());
      if (a.spec.kind !== "press" && a.label.getAttribute("aria-pressed") !== pressed) a.label.setAttribute("aria-pressed", pressed);
      a.label.classList.toggle("held", on && a.codes.some((c) => down.has(c)));
      const c = a.control();
      if (c && !c.querySelector(":scope > kbd.key-on")) {
        const k = html("kbd", { className: "key-on", textContent: a.spec.hint || hintOf(a.spec.keys) });
        k.setAttribute("aria-hidden", "true"); c.append(" ", k); c.setAttribute("aria-keyshortcuts", a.spec.keys[0].replace(/(^|\+)(Key|Digit)/g, "$1"));
      }
    }
  }
  // the page changes under the actions: once a frame at most, their rows and controls follow
  const later = () => { if (!painting) painting = requestAnimationFrame(() => { painting = 0; paint(); }); };
  new MutationObserver(later).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "hidden", "aria-pressed", "open", "class"] });

  addEventListener("keydown", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t?.closest(FIELD)) down.add(e.code);
    const a = !e.isComposing && e.keyCode !== 229 && list.find((x) => x.spec.wired !== false && x.keys.some((k) => matches(k, e)) && x.active());
    if (a && !e.repeat && !busy() && !(t?.closest(FIELD) && !(a.spec.inField && t.closest(a.spec.inField)))
      && !(a.spec.ownControl && t !== document.body && t?.closest("button, a[href], summary, [role=button]"))) {
      e.preventDefault();
      a.held = true;
      act(a, a.spec.kind === "hold" ? "down" : "press", e);
    } else if (e.repeat && list.some((x) => x.held && x.codes.includes(e.code))) e.preventDefault();
    paint();
  });
  addEventListener("keyup", (e) => {
    down.delete(e.code);
    for (const a of list) if (a.held && a.codes.includes(e.code)) { a.held = false; if (a.spec.kind === "hold") act(a, "up", e); }
    paint();
  });
  addEventListener("blur", () => {
    down.clear();
    for (const a of list) if (a.held) { a.held = false; if (a.spec.kind === "hold") act(a, "up"); }
    paint();
  });

  return {
    // a viewer's own action, its handler with it, below every study's, until signal ends it
    add: (spec, signal) => add(spec, Infinity, signal),
    // a study's declared actions, until signal (the study's) ends them
    mount(declared, signal) {
      handlers = {}; state = {};
      (declared || []).forEach((spec, k) => add(spec, k, signal));
      signal.addEventListener("abort", () => { handlers = {}; state = {}; paint(); });
    },
    // for the study: its handlers by action id, and its states as they change
    api: {
      handle(fns) { handlers = { ...handlers, ...fns }; paint(); },
      report(s) { state = { ...state, ...s }; paint(); },
    },
    refresh: paint,
  };
}
