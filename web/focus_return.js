// req/shell/dialogs/focus-returns: when a modal dialog or a menu closes, the keyboard goes back to the control that
// opened it; where that control is gone or hidden by then, to the one that leads back to it.
// req/shell/dialogs/focus-kept: when the control holding the keyboard is redrawn, hidden or disabled, the keyboard goes
// to the one in its place, else the nearest one still there, never the page's body.
import { after } from "./pacing.js";
import { work } from "./pending.js";

// a control disabled with the keyboard on it gets it back when enabled again this soon, as one disabled while the page is
// busy is, unless the keyboard has moved on since
const SINCE_CLICK_MS = 1000, FOCUS_KEPT = 30, COMES_BACK_MS = 10000;
const PRESSABLE = "button, a, summary, input, select, [role=button], [role=menuitem], [role=tab]";
// what a click can give the keyboard to; a click on anything else leaves it on the body, by the person's choice
const TAKES = "button, a[href], summary, input, select, textarea, label, [tabindex], [contenteditable]";
const FOCUSABLE = "button, a[href], summary, input, select, textarea, [tabindex]:not([tabindex='-1']), [contenteditable]";

// what finds an element again once a redraw has replaced it: its place among the look-alikes under its nearest
// ancestor with an id; it holds the page's elements weakly, so what a redraw removed is not kept alive by it
function remembered(el) {
  const root = el.parentElement?.closest("[id]") || document.body;
  const { localName, className, textContent } = el;
  const same = (x) => x.localName === localName && x.className === className && x.textContent === textContent;
  const scopes = [];
  for (let up = root; up; up = up.parentElement?.closest("[id]")) scopes.push(new WeakRef(up));
  if (root !== document.body) scopes.push(new WeakRef(document.body));
  const dialog = el.closest("dialog");
  return { ref: new WeakRef(el), root: new WeakRef(root), scopes, dialog: dialog && new WeakRef(dialog), localName, id: el.id, same,
    at: [...root.querySelectorAll(localName)].filter(same).indexOf(el) };
}

// an element outside an open modal dialog takes no focus, though nothing marks it inert
const blocked = (el) => { const modal = document.querySelector("dialog:modal"); return !!modal && !modal.contains(el); };
// there to take the keyboard but for being disabled
// (a dialog closing with a motion is still drawn, but takes no focus once it is no longer open)
const present = (el) => el?.isConnected && el.checkVisibility?.({ visibilityProperty: true }) !== false && !el.closest("[inert]") && !blocked(el)
  && el.closest("dialog")?.open !== false;
const usable = (el) => present(el) && !el.disabled;

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

// a control still there in the nearest box around where el was (its box, the box around that, out to the page): the
// box's primary action, else its first
function nearby(el) {
  for (const ref of el.scopes) {
    const scope = ref.deref();
    if (!scope?.isConnected || (scope !== document.body && !usable(scope))) continue;
    const found = [...scope.querySelectorAll(FOCUSABLE)].filter(usable);
    if (found.length) return found.find((f) => f.classList.contains("primary")) || found[0];
  }
  return null;
}

export function focusReturn() {
  let pressed = null, at = 0, kept = null;
  const focused = [];
  const openers = new WeakMap();

  // the keyboard fallen to the body, or left on a control that went: to its replacement, else to its dialog's
  // opener, else to the nearest control still there
  let displaced = null; // {from, to, at}: the keyboard moved off a control only disabled, while it has not moved on
  const keep = () => {
    const now = document.activeElement;
    if (displaced && (now !== displaced.to || performance.now() - displaced.at > COMES_BACK_MS)) displaced = null;
    if (displaced) {
      const back = target(displaced.from);
      if (back) { displaced = null; back.focus(); return; }
    }
    if ((now && now !== document.body && usable(now)) || !kept) return;
    // a control still in its place, the keyboard taken off it (a blur, a press that gives the keyboard to nothing):
    // left on the body
    if (!kept.moved && usable(kept.ref.deref())) { kept = null; return; }
    const el = kept.ref.deref(), dialog = kept.dialog?.deref(), from = dialog && !dialog.open && openers.get(dialog);
    const to = target(kept) || (from && target(from)) || nearby(kept);
    if (!to) return;
    const was = kept;
    to.focus();
    if (el?.disabled && present(el)) displaced = { from: was, to, at: performance.now() };
  };
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest?.(TAKES)) kept = null; }, true);
  document.addEventListener("focusout", (e) => {
    if (e.relatedTarget) return;
    const end = work.begin("a look at where the keyboard fell");
    after(0, () => { end(); keep(); });
  });
  new MutationObserver((changes) => {
    const el = kept?.ref.deref();
    if (el && changes.some((c) => [...c.removedNodes].some((n) => n.contains(el)))) kept.moved = true;
    keep();
  }).observe(document.body, { subtree: true, childList: true, attributes: true,
    attributeFilter: ["hidden", "disabled", "class", "style", "open", "inert"] });

  document.addEventListener("click", (e) => {
    const el = e.target.closest?.(PRESSABLE);
    pressed = el ? remembered(el) : null;
    at = performance.now();
  }, true);
  document.addEventListener("focusin", (e) => {
    kept = remembered(e.target);
    focused.push(kept);
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
