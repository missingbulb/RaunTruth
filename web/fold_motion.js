// req/shell/dialogs/close-as-opened, where the engine cannot move a height to a part's own (auto): the stylesheet
// still fades a fold and keeps it displayed while it goes, and this draws its height out and in, with the stylesheet's
// own height transition, so that wherever that transition is off (animations off, reduced motion, a box folding) the
// height changes at once here too.
const FOLDS = "[data-fold], #gt-tasks .task-body";

export function foldMotion() {
  if (CSS.supports("interpolate-size", "allow-keywords")) return;
  // the height each fold was last laid out at: once its hidden is set the stylesheet has already put it at 0
  const last = new WeakMap(), runs = new WeakMap();
  const sizes = new ResizeObserver((seen) => { for (const s of seen) if (!runs.has(s.target)) last.set(s.target, getComputedStyle(s.target).height); });
  const watch = (root) => {
    if (root.matches?.(FOLDS)) sizes.observe(root);
    for (const f of root.querySelectorAll?.(FOLDS) || []) sizes.observe(f);
  };
  watch(document);

  function fold(f) {
    const run = runs.get(f), from = run ? getComputedStyle(f).height : last.get(f) ?? "0px";
    run?.cancel();
    const style = getComputedStyle(f), to = style.height, timing = heightTiming(style);
    if (!timing || from === to || !from.endsWith("px") || !to.endsWith("px")) return;
    const a = f.animate({ height: [from, to] }, timing);
    runs.set(f, a);
    const over = () => {
      if (runs.get(f) !== a) return;
      runs.delete(f);
      last.set(f, getComputedStyle(f).height);
    };
    a.onfinish = a.oncancel = over;
  }

  new MutationObserver((changes) => {
    const moved = new Set();
    for (const c of changes) {
      if (c.type === "childList") { for (const n of c.addedNodes) watch(n); continue; }
      const t = c.target;
      if (c.attributeName === "hidden" && t.matches("[data-fold]")) moved.add(t);
      else if (c.attributeName === "class" && t.matches("#gt-tasks li") && t.classList.contains("now") !== /(^|\s)now(\s|$)/.test(c.oldValue || "")) {
        const body = t.querySelector(":scope > .task-body");
        if (body) moved.add(body);
      }
    }
    for (const f of moved) fold(f);
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class"], attributeOldValue: true });
}

// the duration, delay and easing of the height transition a computed style asks for, or null for none
function heightTiming(style) {
  const list = (v) => v.split(/,(?![^(]*\))/).map((x) => x.trim());
  const props = list(style.transitionProperty), i = props.findIndex((p) => p === "height" || p === "all");
  if (i < 0) return null;
  const at = (v) => { const l = list(v); return l[i % l.length]; };
  const ms = (v) => parseFloat(v) * (v.endsWith("ms") ? 1 : 1000);
  const duration = ms(at(style.transitionDuration));
  return duration > 0 ? { duration, delay: ms(at(style.transitionDelay)), easing: at(style.transitionTimingFunction) } : null;
}
