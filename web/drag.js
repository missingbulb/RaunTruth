// Every drag on the page (req/shell/drag/escape): from a press to its release the pointer is the drag's alone,
// and Escape before the release cancels it. drag(el, down, {move, drop, cancel}) holds the pointer `down` pressed
// on `el`: move(e) hears each move, drop(e) the release, cancel() a pointercancel or an Escape, and puts back what
// the drag changed. After an Escape the rest of that press, its moves, its release and the click it would make,
// reaches no one, nor does the Escape itself. Once a held pointer moves, a label at the page's bottom center says
// so (req/shell/drag/hint) until no drag is left.
//
// These listeners are on the window, capturing, and added when the page first imports this module, ahead of the
// page's own: they hear each event before any other listener can.
import { after } from "./pacing.js";

const live = new Map(); // pointerId → {el, move, drop, cancel, x, y, moved}
const cancelled = new Set(); // pointers whose press was cancelled and is not yet let go
let eatClick = false;

let label = null;
function hint() {
  const on = [...live.values()].some((d) => d.moved);
  if (on && !label) {
    label = document.createElement("div");
    label.id = "drag-hint";
    label.textContent = "Hit 'esc' to cancel";
    document.body.append(label);
  }
  if (label) label.hidden = !on;
}

const hush = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
function end(id) {
  const d = live.get(id);
  live.delete(id);
  hint();
  if (d.el.hasPointerCapture?.(id)) d.el.releasePointerCapture(id);
  return d;
}

addEventListener("pointermove", (e) => {
  if (cancelled.has(e.pointerId)) return hush(e);
  const d = live.get(e.pointerId);
  if (!d) return;
  if (!d.moved && (e.clientX !== d.x || e.clientY !== d.y)) { d.moved = true; hint(); }
  d.move?.(e);
}, true);
addEventListener("pointerup", (e) => {
  if (cancelled.delete(e.pointerId)) {
    hush(e);
    // the click this release makes comes in the same task
    eatClick = true; after(0, () => { eatClick = false; });
    return;
  }
  if (live.has(e.pointerId)) end(e.pointerId).drop?.(e);
}, true);
addEventListener("pointercancel", (e) => {
  cancelled.delete(e.pointerId);
  if (live.has(e.pointerId)) end(e.pointerId).cancel?.();
}, true);
addEventListener("click", (e) => { if (eatClick) { eatClick = false; hush(e); } }, true);
addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !live.size) return;
  hush(e);
  for (const id of [...live.keys()]) { cancelled.add(id); end(id).cancel?.(); }
}, true);

export function drag(el, down, { move, drop, cancel } = {}) {
  if (live.has(down.pointerId)) end(down.pointerId);
  el.setPointerCapture(down.pointerId);
  live.set(down.pointerId, { el, move, drop, cancel, x: down.clientX, y: down.clientY, moved: false });
}
