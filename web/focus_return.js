// req/shell/dialogs/focus-returns: when a modal dialog or a menu closes, the keyboard goes back to the control that
// opened it; where that control is gone or hidden by then, to the one that leads back to it.
// req/shell/dialogs/focus-kept: when the control holding the keyboard is redrawn, hidden or disabled, the keyboard goes
// to the one in its place, else the nearest one still there, never the page's body.
const SINCE_CLICK_MS = 1000, FOCUS_KEPT = 30;
const PRESSABLE = "button, a, summary, input, select, [role=button], [role=menuitem], [role=tab]";
// what a click can give the keyboard to; a click on anything else leaves it on the body, by the person's choice
const TAKES = PRESSABLE + ", textarea, label, [tabindex], [contenteditable]";
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
const usable = (el) => el?.isConnected && !el.disabled && el.checkVisibility?.({ visibilityProperty: true }) !== false && !el.closest("[inert]") && !blocked(el);

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

// the first control still there in the nearest box around where el was: its box, the box around that, out to the page
function nearby(el) {
  for (const ref of el.scopes) {
    const scope = ref.deref();
    if (!scope?.isConnected || (scope !== document.body && !usable(scope))) continue;
    const found = [...scope.querySelectorAll(FOCUSABLE)].find(usable);
    if (found) return found;
  }
  return null;
}

export function focusReturn() {
  let pressed = null, at = 0, kept = null;
  const focused = [];
  const openers = new WeakMap();

  // the keyboard fallen to the body, or left on a control that went: to its replacement, else to its dialog's
  // opener, else to the nearest control still there
  const keep = () => {
    const now = document.activeElement;
    if ((now && now !== document.body && usable(now)) || !kept) return;
    const dialog = kept.dialog?.deref(), from = dialog && !dialog.open && openers.get(dialog);
    (target(kept) || (from && target(from)) || nearby(kept))?.focus();
  };
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest?.(TAKES)) kept = null; }, true);
  document.addEventListener("focusout", (e) => { if (!e.relatedTarget) setTimeout(keep); });
  new MutationObserver(keep).observe(document.body, { subtree: true, childList: true, attributes: true,
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
