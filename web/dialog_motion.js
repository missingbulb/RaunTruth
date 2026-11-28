// req/shell/dialogs/open-from-button: every modal dialog on the page, the shell's and a study's, grows out of the
// button whose click opened it. A dialog opening this long after the last click was opened by something else.
const SINCE_CLICK_MS = 1000;
const GROW = { duration: 200, easing: "cubic-bezier(.2, .8, .2, 1)" };
// req/shell/dialogs/close-as-opened on an engine that keeps a closed dialog neither in the top layer (no overlay) nor
// displayed (Firefox transitions no display, WebKit none on a dialog leaving the top layer): the dialog is held laid
// out where it stood, untouchable, until the stylesheet's own closing transitions end, the same motion as elsewhere
const HOLDS_ITSELF = CSS.supports("overlay", "auto");
const SHOWN_WHILE_GOING = "display: block; position: fixed; inset-block: 0; overflow: auto; z-index: 2147483647;"
  + " max-width: calc(100% - 6px - 2em); max-height: calc(100% - 6px - 2em); pointer-events: none;";

export function dialogMotion(still) {
  let pressed = null, at = 0;
  document.addEventListener("click", (e) => {
    pressed = e.target.closest?.("button, a, summary, [role=button], [role=menuitem], [role=tab]") || null;
    at = performance.now();
  }, true);

  // req/shell/dialogs/close-as-opened: where each dialog grew from, which the stylesheet sends it back to as it closes. Kept in a
  // sheet of the page's own, so that a dialog's own attributes say nothing of how it was opened
  const sheet = new CSSStyleSheet(), came = new Map(), acted = new Set(), going = new Map();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  const write = () => sheet.replaceSync([...[...came].map(([id, t]) => `#${CSS.escape(id)} { --grew-from: ${t}; }`),
    ...[...acted].map((id) => `#${CSS.escape(id)}, #${CSS.escape(id)}::backdrop { transition: none; }`),
    ...[...going.keys()].map((id) => `#${CSS.escape(id)}:not([open]) { ${SHOWN_WHILE_GOING} }
      @starting-style { #${CSS.escape(id)}:not([open]) { opacity: 1; transform: none; } }`)].join("\n"));
  function back(d, from) {
    if (!d.id) return;
    if (from) came.set(d.id, from); else came.delete(d.id);
    acted.delete(d.id);
    write();
  }
  // a dialog whose own action was pressed goes at once: what the action started is what the page shows next, and its
  // work would hold a closing motion half way
  document.addEventListener("click", (e) => {
    const d = e.target.closest?.("dialog[open]");
    const b = d?.id && e.target.closest("button.primary");
    if (b && b.value !== "close" && !/^(Close|Cancel|OK)$/.test(b.textContent.trim()) && !acted.has(d.id)) { acted.add(d.id); write(); }
  }, true);

  function grow(d) {
    const from = pressed;
    pressed = null;
    back(d, null);
    if (!from?.isConnected || d.contains(from) || performance.now() - at > SINCE_CLICK_MS || still()) return;
    // measured just before the first paint, once what the opener fills in at once is in
    requestAnimationFrame(() => d.open && start(d, from));
  }

  function start(d, from) {
    const b = from.getBoundingClientRect(), r = d.getBoundingClientRect();
    if (!b.width || !b.height || !r.width || !r.height) return;
    const dx = b.left + b.width / 2 - (r.left + r.width / 2), dy = b.top + b.height / 2 - (r.top + r.height / 2);
    back(d, `translate(${dx}px, ${dy}px) scale(${b.width / r.width}, ${b.height / r.height})`);
    d.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${b.width / r.width}, ${b.height / r.height})`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ], GROW);
    try { d.animate([{ opacity: 0 }, { opacity: 1 }], { ...GROW, pseudoElement: "::backdrop" }); } catch { /* a browser that cannot animate the backdrop darkens it at once */ }
  }

  function hold(d) {
    const mine = {};
    going.set(d.id, mine);
    write();
    const over = () => { if (going.get(d.id) !== mine) return; going.delete(d.id); write(); };
    const motions = d.getAnimations();
    if (!motions.length) return over();
    Promise.allSettled(motions.map((a) => a.finished)).then(over);
  }

  const modal = new WeakSet();
  new MutationObserver((changes) => {
    for (const c of changes) {
      const d = c.target;
      if (d.localName !== "dialog") continue;
      if (c.oldValue === null && d.open && d.matches(":modal")) { modal.add(d); grow(d); }
      else if (c.oldValue !== null && !d.open && modal.has(d)) { modal.delete(d); if (d.id && !HOLDS_ITSELF) hold(d); }
    }
  }).observe(document.body, { subtree: true, attributeFilter: ["open"], attributeOldValue: true });
}
