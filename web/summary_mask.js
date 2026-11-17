// The summary's mask (req/shell/summary/mask): areas lassoed on the image, combined by exclusive or, that limit what the
// study's summary counts. The shell draws, keeps and shows it; the study reads its outlines and decides what lies
// inside. Only a study whose study.json says it can count inside a mask (summary.mask) is offered it. On a flat image the
// lasso is drawn on the image; on a stack shown in 3D, on the stack seen from straight above, through every slice.
// Outlines are [[x, y], ...] in the image's pixels.
const svgEl = (tag, attrs) => { const n = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

// whether x, y lies inside one polygon: a ray from it crosses the border an odd number of times
export function inPolygon(poly, x, y) {
  let k = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) k = !k;
  }
  return k;
}
// whether x, y lies inside the mask, the areas combined by exclusive or; everywhere is inside no mask
export const insideMask = (mask, x, y) => !mask.length || mask.reduce((k, p) => k !== inPolygon(p, x, y), false);

// whether any two areas overlap or one holds another: only then is the inside tinted, to show the holes
function complex(mask) {
  const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const crosses = ([a, b], [c, d]) => side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
  const edges = (p) => p.map((q, i) => [q, p[(i + 1) % p.length]]);
  for (let i = 0; i < mask.length; i++) for (let j = i + 1; j < mask.length; j++) {
    const A = mask[i], B = mask[j];
    if (inPolygon(B, ...A[0]) || inPolygon(A, ...B[0])) return true;
    const eb = edges(B);
    if (edges(A).some((e) => eb.some((f) => crosses(e, f)))) return true;
  }
  return false;
}

// $: the page's lookup; viewer(): the viewer on show; image(): the image open ({W, H, Z}); study(): its study.json;
// shows(): whether the summary shows now; drag, readJSON, writeJSON and views: the shell's
export function summaryMask({ $, viewer, image, fileName, study, shows, drag, readJSON, writeJSON, views }) {
  let mask = [], key = null, lasso = null, over3d = null, listening = false;
  const heard = [];
  const offered = () => study()?.summary?.mask === true;
  const three = () => viewer()?.three;
  const stack = () => (image()?.Z || 1) > 1 && !!three() && !three().stage.hidden;
  const stage = () => (stack() ? three().stage : viewer().scroller);
  const at = (e) => (stack() ? three().toImage(e) : viewer().toImage(e));

  function controls() {
    const on = offered();
    $("#mask-row").hidden = !on;
    $("#mask-add").disabled = !on || !image();
    $("#mask-clear").hidden = !mask.length;
  }
  function changed() { controls(); draw(); for (const fn of heard) fn(mask); }
  function set(next) { mask = next; if (key) writeJSON(key, mask); changed(); }

  // ---------- drawing: on the flat image in its own pixels, over the 3D view following it as it turns ----------
  function draw() {
    const v = viewer(); if (!v) return;
    // the layer only while there is something to draw on it: a page with no mask is as it was
    v.overlay?.querySelector(':scope > g[data-layer="summary-mask"]')?.remove();
    over3d?.replaceChildren();
    const live = lasso?.pts;
    if (!image() || (!mask.length && !live) || (!shows() && !live)) return;
    if (stack()) {
      if (!over3d) over3d = svgEl("svg", { id: "mask-3d" });
      if (!listening) { listening = true; three().onDraw(draw); }
      if (over3d.parentNode !== three().stage) three().stage.append(over3d);
      const screen = (p) => p.map((q) => three().toScreen(...q));
      const path = (pts, closed) => { const q = screen(pts); return q.every(Boolean) ? "M" + q.map((v) => v.join(" ")).join("L") + (closed ? "Z" : "") : ""; };
      const marks = svgEl("g", { class: "mask-marks" });
      if (mask.length && complex(mask)) marks.append(svgEl("path", { class: "fill", d: mask.map((p) => path(p, true)).join(""), "fill-rule": "evenodd" }));
      for (const p of mask) { const d = path(p, true); marks.append(svgEl("path", { class: "edge under", d }), svgEl("path", { class: "edge", d })); }
      if (live) marks.append(svgEl("path", { class: "lasso-live", d: path(live, false) }));
      over3d.append(marks);
      return;
    }
    const g = v.layer("summary-mask"), d = (p) => "M" + p.map((q) => q.join(" ")).join("L") + "Z";
    const marks = svgEl("g", { class: "mask-marks" });
    if (mask.length && complex(mask)) marks.append(svgEl("path", { class: "fill", d: mask.map(d).join(""), "fill-rule": "evenodd" }));
    for (const p of mask) marks.append(svgEl("path", { class: "edge under", d: d(p) }), svgEl("path", { class: "edge", d: d(p) }));
    g.append(marks);
    if (live) g.append(svgEl("polyline", { class: "lasso-live", points: live.map((q) => q.join(",")).join(" ") }));
  }

  // ---------- Add mask: the whole image in view, from straight above on a stack, then a lasso by dragging ----------
  function start() {
    if (!offered() || !image()) return;
    views?.show("image");
    if (stack()) {
      const S = three().S;
      lasso = { pts: null, was: { rot: S.rot, held: S.held } };
      Object.assign(S, { rot: three().facing(0, 0), held: true }); three().redraw();
    } else { lasso = { pts: null }; viewer().fit(); }
    stage().classList.add("lassoing"); $("#lasso-hint").hidden = false;
  }
  function end() {
    if (!lasso) return;
    if (lasso.was && three()) { Object.assign(three().S, lasso.was); three().redraw(); }
    for (const el of [three()?.stage, viewer()?.scroller]) el?.classList.remove("lassoing");
    lasso = null; $("#lasso-hint").hidden = true; draw();
  }
  // before the viewer's own: a press while the lasso is armed draws it rather than pans or turns the view
  addEventListener("pointerdown", (e) => {
    if (!lasso || e.button !== 0 || !e.target.closest("#v3-stage, #stage, #scroller")) return;
    const p = at(e); if (!p) return;
    e.preventDefault(); e.stopImmediatePropagation();
    lasso.pts = [p];
    drag(stage(), e, {
      move(ev) {
        if (!lasso) return;
        const q = at(ev), last = lasso.pts[lasso.pts.length - 1];
        if (!q || Math.hypot(q[0] - last[0], q[1] - last[1]) < 0.5) return;
        lasso.pts.push(q.map((v) => Math.round(v * 10) / 10)); draw();
      },
      drop() {
        const im = image(), pts = (lasso?.pts || []).map(([x, y]) => [Math.min(Math.max(x, 0), im.W), Math.min(Math.max(y, 0), im.H)]);
        const area = Math.abs(pts.reduce((a, [x, y], i) => { const [p, q] = pts[(i + 1) % pts.length]; return a + x * q - p * y; }, 0)) / 2;
        end();
        // a lasso a few pixels across is a slip, not an area
        if (pts.length >= 3 && area >= 25) set([...mask, pts]);
      },
      cancel: end,
    });
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lasso && !lasso.pts) end(); });
  $("#mask-add").onclick = start;
  $("#mask-clear").onclick = () => set([]);

  return {
    // what the study reads: the outlines, whether a point is inside, and a listener for every change until signal ends it
    api: {
      polygons: () => mask.map((p) => p.map((q) => [...q])),
      inside: (x, y) => insideMask(mask, x, y),
      on(fn, signal) { heard.push(fn); signal?.addEventListener("abort", () => heard.splice(heard.indexOf(fn), 1)); },
    },
    // an image opened: its own mask, as this device kept it for this study
    opened() { end(); key = offered() && fileName() ? `${study().id}-mask-v1:${fileName()}` : null; mask = key ? readJSON(key, []) : []; changed(); },
    // the study left, or the summary came or went
    left() { end(); key = null; mask = []; controls(); over3d?.remove(); over3d = null; },
    redraw: () => { controls(); draw(); },
    // a stored key that is a summary mask: the study it is kept for and the image's name, else null
    keyOf(k) { const m = /^([a-z0-9-]+)-mask-v1:(.*)$/.exec(k); return m && { study: m[1], image: m[2] }; },
  };
}
