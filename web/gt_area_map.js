// The areas of a ground-truth walk drawn as a map (req/shell/ground-truth/area-map): a button per area, laid out as the
// field is cut, each done, partly done or not started, the walk's own marked; a click picks one.
"use strict";

// body: the element the buttons fill; n: the areas each way; state(a): {mark: "done" | "part" | "", title} of area a;
// now: the walk's own area, or null; pick(a): heard on a click
export function areaMap(body, { n, state, now, pick }) {
  body.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  const cells = [];
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
    const a = r * n + (r % 2 ? n - 1 - k : k), s = state(a), b = document.createElement("button");
    b.type = "button"; b.dataset.area = a; b.className = s.mark || "";
    if (a === now) b.classList.add("now");
    b.title = s.title; b.setAttribute("aria-label", s.title);
    b.onclick = () => pick(a);
    cells.push(b);
  }
  body.replaceChildren(...cells);
}
