// req/shell/dialogs/focus-returns: when a modal dialog or a menu closes, the keyboard goes back to the control that
// opened it; where that control is gone or hidden by then, to the one that leads back to it.
import { after } from "./pacing.js";

const SINCE_CLICK_MS = 1000, REDRAW_MS = 1500, FOCUS_KEPT = 30;
const PRESSABLE = "button, a, summary, input, select, [role=button], [role=menuitem], [role=tab]";

// what finds an element again once a redraw has replaced it: its place among the look-alikes under its nearest
// ancestor with an id; it holds the page's elements weakly, so what a redraw removed is not kept alive by it
function remembered(el) {
  const root = el.parentElement?.closest("[id]") || document.body;
  const { localName, className, textContent } = el;
  const same = (x) => x.localName === localName && x.className === className && x.textContent === textContent;
  return { ref: new WeakRef(el), root: new WeakRef(root), localName, id: el.id, same, at: [...root.querySelectorAll(localName)].filter(same).indexOf(el) };
}

const usable = (el) => el?.isConnected && !el.disabled && el.checkVisibility?.({ visibilityProperty: true }) !== false && !el.closest("[inert]");

function target(opener) {
  const el = opener.ref.deref();
  if (usable(el)) return el;
  const menu = el?.closest?.("details.menu");
  if (menu?.isConnected && usable(menu.querySelector(":scope > summary"))) return menu.querySelector(":scope > summary");
  if (opener.id && usable(document.getElementById(opener.id))) return document.getElementById(opener.id);
  const root = opener.root.deref();
  const found = root?.isConnected ? [...root.querySelectorAll(opener.localName)].filter(opener.same) : [];
  return usable(found[opener.at]) ? found[opener.at] : found.find(usable);
}

export function focusReturn() {
  let pressed = null, at = 0;
  const focused = [];
  const openers = new WeakMap();

  document.addEventListener("click", (e) => {
    const el = e.target.closest?.(PRESSABLE);
    pressed = el ? remembered(el) : null;
    at = performance.now();
  }, true);
  document.addEventListener("focusin", (e) => {
    focused.push(remembered(e.target));
    if (focused.length > FOCUS_KEPT) focused.shift();
  });

  new MutationObserver((changes) => {
    for (const c of changes) {
      const d = c.target;
      if (d.localName !== "dialog" || c.oldValue !== null || !d.open || !d.matches(":modal")) continue;
      const from = pressed && !d.contains(pressed.ref.deref() ?? null) && performance.now() - at <= SINCE_CLICK_MS ? pressed : focused.findLast((f) => f.ref.deref() && !d.contains(f.ref.deref()));
      if (from) openers.set(d, from);
      pressed = null;
    }
  }).observe(document.body, { subtree: true, attributeFilter: ["open"], attributeOldValue: true });

  // the browser puts focus back itself when it can; what it could not (the opener hidden, replaced) is done here
  document.addEventListener("close", (e) => {
    const from = openers.get(e.target);
    openers.delete(e.target);
    if (!from) return;
    const now = document.activeElement;
    if (!now || now === document.body || e.target.contains(now)) target(from)?.focus();
    // the opener's own list may redraw once the dialog's owner has heard it close: while that settles, a focus the redraw drops is put back
    const watch = new MutationObserver(() => { if (!document.activeElement || document.activeElement === document.body) target(from)?.focus(); });
    watch.observe(document.body, { childList: true, subtree: true });
    after(REDRAW_MS, () => watch.disconnect());
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
