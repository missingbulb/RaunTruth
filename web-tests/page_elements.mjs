// Each of the shell-states elements ({name, select, control, box}) as the page shows it, and where it is: on, off,
// held, folded or gone, as dev/tools/build/shell_states.py names what an element shows (req/checks/shell-states).
//   const now = await read(page, elements);   {name: {seen, box}}
export const read = (page, elements) => page.evaluate((els) => Object.fromEntries(els.map((e) => {
  const el = document.querySelector(e.select);
  if (!el) return [e.name, { seen: "gone", box: null }];
  const shown = el.getClientRects().length > 0 && el.checkVisibility({ visibilityProperty: true });
  // held: what the page marks as needing the internet while offline (req/shell/offline/default)
  const held = el.getAttribute("aria-disabled") === "true" && el.dataset.onlineTitle !== undefined;
  const off = el.matches(":disabled") || (!held && el.getAttribute("aria-disabled") === "true");
  const seen = !shown ? "gone" : e.box && el.classList.contains("folded") ? "folded" : held ? "held" : e.control && off ? "off" : "on";
  const r = el.getBoundingClientRect();
  return [e.name, { seen, box: shown ? { x: r.x, y: r.y, w: r.width, h: r.height } : null }];
})), elements);
