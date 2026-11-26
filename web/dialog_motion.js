// req/shell/dialogs/open-from-button: every modal dialog on the page, the shell's and a study's, grows out of the
// button whose click opened it. A dialog opening this long after the last click was opened by something else.
const SINCE_CLICK_MS = 1000;
const GROW = { duration: 200, easing: "cubic-bezier(.2, .8, .2, 1)" };

export function dialogMotion(still) {
  let pressed = null, at = 0;
  document.addEventListener("click", (e) => {
    pressed = e.target.closest?.("button, a, summary, [role=button], [role=menuitem], [role=tab]") || null;
    at = performance.now();
  }, true);

  // req/shell/dialogs/close-as-opened: where each dialog grew from, which the stylesheet sends it back to as it closes. Kept in a
  // sheet of the page's own, so that a dialog's own attributes say nothing of how it was opened
  const sheet = new CSSStyleSheet(), came = new Map(), acted = new Set();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  const write = () => sheet.replaceSync([...[...came].map(([id, t]) => `#${CSS.escape(id)} { --grew-from: ${t}; }`),
    ...[...acted].map((id) => `#${CSS.escape(id)}, #${CSS.escape(id)}::backdrop { transition: none; }`)].join("\n"));
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

  new MutationObserver((changes) => {
    for (const c of changes) if (c.target.localName === "dialog" && !c.oldValue && c.target.open && c.target.matches(":modal")) grow(c.target);
  }).observe(document.body, { subtree: true, attributeFilter: ["open"], attributeOldValue: true });
}
