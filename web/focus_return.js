// req/shell/dialogs/focus-returns: when a modal dialog or a menu closes, the keyboard goes back to the control that
// opened it; where that control is gone or hidden by then, to the one that leads back to it.
const SINCE_CLICK_MS = 1000;
const PRESSABLE = "button, a, summary, input, select, [role=button], [role=menuitem], [role=tab]";

// what finds an element again once a redraw has replaced it: its place among the look-alikes under its nearest
// ancestor with an id
function trace(el) {
  const root = el.parentElement?.closest("[id]") || document.body;
  const same = (x) => x.localName === el.localName && x.className === el.className && x.textContent === el.textContent;
  return { root, same, at: [...root.querySelectorAll(el.localName)].filter(same).indexOf(el) };
}

const usable = (el) => el?.isConnected && !el.disabled && el.checkVisibility?.({ visibilityProperty: true }) !== false && !el.closest("[inert]");

function target(opener) {
  if (usable(opener.el)) return opener.el;
  const menu = opener.el.closest?.("details.menu");
  if (menu?.isConnected && usable(menu.querySelector(":scope > summary"))) return menu.querySelector(":scope > summary");
  if (opener.el.id && usable(document.getElementById(opener.el.id))) return document.getElementById(opener.el.id);
  const { root, same, at } = opener.trace;
  const found = root.isConnected ? [...root.querySelectorAll(opener.el.localName)].filter(same) : [];
  return usable(found[at]) ? found[at] : found.find(usable);
}

export function focusReturn() {
  let pressed = null, at = 0, last = null;
  const openers = new WeakMap();

  document.addEventListener("click", (e) => {
    const el = e.target.closest?.(PRESSABLE);
    pressed = el ? { el, trace: trace(el) } : null;
    at = performance.now();
  }, true);
  document.addEventListener("focusin", (e) => {
    if (!e.target.closest?.("dialog:modal")) last = { el: e.target, trace: trace(e.target) };
  });

  new MutationObserver((changes) => {
    for (const c of changes) {
      const d = c.target;
      if (d.localName !== "dialog" || c.oldValue !== null || !d.open || !d.matches(":modal")) continue;
      const from = pressed && !d.contains(pressed.el) && performance.now() - at <= SINCE_CLICK_MS ? pressed : last;
      if (from && !d.contains(from.el)) openers.set(d, from);
      pressed = null;
    }
  }).observe(document.body, { subtree: true, attributeFilter: ["open"], attributeOldValue: true });

  // the browser puts focus back itself when it can; what it could not (the opener hidden, replaced) is done here
  document.addEventListener("close", (e) => {
    const from = openers.get(e.target);
    openers.delete(e.target);
    const now = document.activeElement;
    if (!from || (now && now !== document.body && !e.target.contains(now))) return;
    target(from)?.focus();
  }, true);

  // a menu closing with the keyboard inside it, by Escape or a choice, leaves it on the menu's own button
  document.addEventListener("keydown", (e) => {
    const menu = e.key === "Escape" && !e.defaultPrevented && e.target.closest?.("details.menu[open]");
    if (menu) { menu.open = false; menu.querySelector(":scope > summary")?.focus(); }
  });
  document.addEventListener("toggle", (e) => {
    const menu = e.target;
    if (!menu.matches?.("details.menu") || menu.open || !menu.contains(document.activeElement) || document.activeElement.localName === "summary") return;
    menu.querySelector(":scope > summary")?.focus();
  }, true);
}
