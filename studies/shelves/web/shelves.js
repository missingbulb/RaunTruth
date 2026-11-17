// The Bookshelf Reader's page: the books found on a photo of shelves, each a four-cornered box with its view (spine or
// cover) and the title read from it, and, while ground truth is made, one task that takes each book in turn, in the
// order they stand, its corners, its turn and its text set right, and adds the books the finder missed.
import { reader, rotate, READERS, MODELS, WORDS } from "./reading.js";
import { clockwise, shape, inPlace, nextAdded } from "./gt_actions.js";
import { oldDraft } from "./old_draft.js";

const CDN = "https://cdn.jsdelivr.net/npm/";
const TESSERACT = CDN + "tesseract.js@7.0.0/dist/", CORE = CDN + "tesseract.js-core@7.0.0", ORT = CDN + "onnxruntime-web@1.31.1/dist/";
const MODEL_FILES = CDN + "@gutenye/ocr-models@1.4.2/assets/";
const READER = "shelves-reader"; // the reader last chosen, by its key in READERS
const SVG = "http://www.w3.org/2000/svg";

// the engines, from the pinned builds the sandbox runs too (studies/shelves/reading/package.json)
function engines() {
  const bytes = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return new Uint8Array(await r.arrayBuffer()); };
  return {
    Tesseract: () => import(TESSERACT + "tesseract.esm.min.js").then((m) => m.default),
    ort: () => import(ORT + "ort.wasm.min.mjs").then((o) => { o.env.wasm.wasmPaths = ORT; return o; }), langPath: new URL("tessdata", import.meta.url).href,
    tesseract: { workerPath: TESSERACT + "worker.min.js", corePath: CORE },
    model: (name) => bytes(MODEL_FILES + name), keys: async () => new TextDecoder().decode(await bytes(MODEL_FILES + MODELS.keys)),
    words: async () => (await Promise.all([WORDS.list, new URL(WORDS.names, import.meta.url).href].map(async (u) => new TextDecoder().decode(await bytes(u))))).join("\n"),
  };
}

// the longest side of a book's picture in the task, in its pixels
const PICTURE = 640;

// the homography taking four points onto four others, as a 3×3 matrix by rows
function homography(from, to) {
  const A = [];
  from.forEach(([x, y], i) => {
    const [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let c = 0; c < 8; c++) {
    let r = c;
    for (let k = c + 1; k < 8; k++) if (Math.abs(A[k][c]) > Math.abs(A[r][c])) r = k;
    [A[c], A[r]] = [A[r], A[c]];
    for (let k = 0; k < 8; k++) if (k !== c) { const f = A[k][c] / A[c][c]; for (let j = c; j < 9; j++) A[k][j] -= f * A[c][j]; }
  }
  return [...A.map((row, i) => row[8] / A[i][i]), 1];
}
// the photo as the viewer shows it (a canvas of the image's size), through a book's corners into an upright picture
// as wide as its top and bottom edges and as tall as its sides, on average, at most PICTURE long; black off the photo
export function picture(photo, corners) {
  const side = (a, b) => Math.hypot(corners[a][0] - corners[b][0], corners[a][1] - corners[b][1]);
  const w0 = Math.max(1, (side(0, 1) + side(3, 2)) / 2), h0 = Math.max(1, (side(0, 3) + side(1, 2)) / 2), s = Math.min(1, PICTURE / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s)), out = new Uint8ClampedArray(w * h * 4);
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const x1 = Math.min(photo.width, Math.ceil(Math.max(...xs))), y1 = Math.min(photo.height, Math.ceil(Math.max(...ys)));
  if (x1 <= x0 || y1 <= y0) return { width: w, height: h, data: out };
  // only the part of the photo under the box, shrunk as the picture is, read back
  const rw = Math.max(1, Math.round((x1 - x0) * s)), rh = Math.max(1, Math.round((y1 - y0) * s));
  const part = new OffscreenCanvas(rw, rh), ctx = part.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(photo, x0, y0, x1 - x0, y1 - y0, 0, 0, rw, rh);
  const src = ctx.getImageData(0, 0, rw, rh).data, fx = rw / (x1 - x0), fy = rh / (y1 - y0);
  const M = homography([[0, 0], [w, 0], [w, h], [0, h]], corners), W = photo.width, H = photo.height;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x + 0.5, Y = y + 0.5, d = M[6] * X + M[7] * Y + M[8];
    const px = (M[0] * X + M[1] * Y + M[2]) / d, py = (M[3] * X + M[4] * Y + M[5]) / d;
    if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const sx = Math.min(rw - 1, Math.floor((px - x0) * fx)), sy = Math.min(rh - 1, Math.floor((py - y0) * fy));
    if (sx < 0 || sy < 0) continue;
    const a = (sy * rw + sx) * 4, b = (y * w + x) * 4;
    out[b] = src[a]; out[b + 1] = src[a + 1]; out[b + 2] = src[a + 2];
  }
  return { width: w, height: h, data: out };
}

function inside([x, y], poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) yes = !yes;
  }
  return yes;
}

export function mount(shell) {
  const $ = shell.$, st = shell.state, here = { signal: shell.signal };
  // books: the model's books (shell.gt), each {id, corners, view, text, confidence, reader, turn, source: "found" | "missed",
  // verdict: null | "right", proposed: what the finder and the reader said, kept for scoring, turnSet: the tagger set the turn,
  // typed: the tagger typed its text}; the model is the log's, and the page draws what it hands over
  // curId: the book open in the task; asked: the book whose title, left as read, one Enter has asked to approve as it is;
  // pending: the title typed in the field and not yet committed, {id, value}
  // raw: the finder's books as found and read, what the log's run is made of
  // found: whether books were found (or drafted) on the photo open, for the summary to count
  let books = [], curId = null, drawing = null, drag = null, opened = false, selectFor = null, asked = null, found = false, pending = null, raw = null;
  // what the page keeps of a book beside the model: whether it is being read again, and which reading is the latest
  const reads = new Map();
  const readOf = (id) => reads.get(id) ?? reads.set(id, { gen: 0, reading: false }).get(id);
  let ocr = null;
  const truth = () => shell.makesTruth;
  // the tagger tags now: a book is open, framed and its corners dragged only then (req/shell/ground-truth/tagging)
  const tagging = () => truth() && shell.tasks.tagging();
  const byId = (id) => books.find((b) => b.id === id) ?? null;
  // a book as it shows now: its corners where a drag has them, which the log does not hold until the drop
  const live = (b) => (b && drag?.id === b.id ? { ...b, corners: drag.corners } : b);
  const cur = () => live(byId(curId));
  const noneMissed = () => !!shell.gt.model()?.noneMissed;
  // one task: every book, found or added, decided, and none left missed
  if (truth()) shell.tasks.list([{ key: "books", name: "Books", title: "Every book on the photo, each checked, the missed ones added" }], { submit, pick: () => { if (!curId) next(null); else draw(); },
    tagging: (on) => { if (!on) { commitTitle(); draw(); } else if (curId) show(curId); else next(); } });
  const ocrNow = () => (ocr ||= reader(engines()));

  const choice = $("#bs-reader");
  choice.replaceChildren(...Object.entries(READERS).map(([k, name]) => Object.assign(document.createElement("option"), { value: k, textContent: name })));
  choice.value = shell.readJSON(READER, "lines") in READERS ? shell.readJSON(READER, "lines") : "lines";
  choice.onchange = () => shell.writeJSON(READER, choice.value);

  // ---------- the model: every change of the books is a GT action (req/shell/ground-truth/history) ----------
  const act = (action) => shell.gt.act(action);
  // the title typed and not yet committed is one GT action, when it is: not one a key
  let quiet = false;
  function commitTitle() {
    if (!pending) return;
    const { id, value } = pending;
    pending = null;
    const b = byId(id);
    if (!b || value === b.text) return;
    // the field keeps the focus and the buttons their place while it is committed
    quiet = true;
    try { act({ type: "set-text", book: id, text: value }); } finally { quiet = false; }
  }
  // Right pressed with the pointer takes the field's focus before its click lands: the title typed waits for that click,
  // and goes with the verdict as one GT action; let go anywhere else, it is committed as the field left is
  let rightDown = false;
  const released = (e) => { if (!rightDown) return; rightDown = false; if (!e.target.closest?.('.bs-item [data-do="right"]')) commitTitle(); };
  document.addEventListener("pointerup", released, here); document.addEventListener("pointercancel", released, here);
  shell.gt.on((m, why) => {
    books = m ? m.books : [];
    if (m) found = true;
    if (curId !== null && !byId(curId)) curId = null;
    if (why === "open") return;
    if (why !== "act" && why !== "run") { pending = null; asked = null; }
    if (why === "load") {
      shell.step("find", true, `${books.length} books drafted`); shell.boxDone($("#bs-box"), `${books.length} books`);
      shell.step("read", true, `${books.filter((b) => b.text).length} of ${books.length} titles`);
    }
    if (quiet) { drawBoxes(); list(); tasks(false); return; }
    draw();
  }, shell.signal);

  // a draft kept before Edit History, offered once with the base the log makes of it
  function legacy() {
    if (!truth()) return;
    shell.gt.legacy(oldDraft(shell.readJSON, { name: st.fileName, sha: st.sha, image: st.fileName, W: st.W, H: st.H, reader: choice.value }));
  }

  // ---------- Python: finding and straightening ----------
  // why the last Find ran without the text finder, or null when it ran with it
  let textless = null;
  // the photo's text, as the finder takes it: the text finder run on Python's own view of the photo
  async function textOf() {
    const run = python.then(async () => {
      const done = shell.until("result:view");
      shell.call("view", {});
      const m = await done;
      return { width: m.meta.width, height: m.meta.height, data: m.bytes };
    });
    python = run.catch(() => {});
    return ocrNow().textMap(await run);
  }
  $("#bs-find").onclick = async () => {
    const list = await shell.algorithm.ready, algorithm = shell.algorithm.key, reads = list.find((a) => a.key === algorithm)?.reads_text;
    let text = null; textless = null;
    if (reads) {
      shell.busy(true, "Finding the text…");
      try { text = await textOf(); } catch (e) { textless = String(e.message || e); console.warn("Find books without the text finder:", e); }
    }
    const done = shell.until("result:find");
    shell.busy(true, "Finding the books…"); shell.call("find", text ? { algorithm, text } : { algorithm });
    await done;
    await readAll();
  };
  $("#bs-read").onclick = () => readAll();
  shell.slow($("#bs-find")); shell.slow($("#bs-read"));

  // the crops the reader reads, straightened by the study's Python from the photo's file, one request at a time
  let python = Promise.resolve();
  function straighten(list) {
    const run = python.then(async () => {
      const done = shell.until("result:straighten");
      shell.call("straighten", { corners: list.map((b) => b.corners) });
      const m = await done;
      let at = 0;
      return m.meta.sizes.map(([width, height]) => { const data = new Uint8ClampedArray(m.bytes.buffer, m.bytes.byteOffset + at, width * height * 4); at += width * height * 4; return { width, height, data }; });
    });
    python = run.catch(() => {});
    return run;
  }
  // each book in list straightened and read by the reader chosen, its answer set on it
  async function readSome(list) {
    if (!list.length) return;
    const how = choice.value;
    shell.busy(true, "Straightening each book…");
    const got = await straighten(list);
    const r = ocrNow();
    for (const [i, b] of list.entries()) {
      shell.busy(true, `Reading ${i + 1} of ${list.length} with ${READERS[how]}…`);
      Object.assign(b, await r.read(got[i], how), { reader: how });
    }
    shell.busy(false);
  }
  // the finder's books read, and the run they make recorded in the log: the algorithm's whole output, not the tagger's work
  async function readAll() {
    if (!raw) return;
    await readSome(raw);
    shell.step("read", true, `${raw.filter((b) => b.text).length} of ${raw.length} titles read with ${READERS[choice.value]}`);
    shell.status("Titles read.");
    shell.gt.ran({ algorithm: { key: shell.algorithm.key }, output: { image: st.fileName, W: st.W, H: st.H, reader: choice.value,
      books: raw.map((b) => ({ corners: b.corners, view: b.view, turn: b.turn ?? 0, text: b.text ?? "", confidence: b.confidence ?? null, reader: b.reader ?? choice.value })) } });
    legacy();
    if (tagging() && curId === null) next();
    draw();
  }
  // one book read again while it is tagged, the photo left in view: at the turn the tagger set; a later reading of
  // the same book replaces one still under way. The answer that lands is one GT action, carrying it
  async function reread(id) {
    const u = readOf(id), gen = ++u.gen, how = choice.value;
    u.reading = true; draw(); shell.status("Reading the book again…");
    try {
      const was = byId(id);
      if (!was) return;
      const [crop] = await straighten([was]);
      if (gen !== u.gen) return;
      const at = byId(id);
      if (!at) return;
      const r = await ocrNow().read(crop, how, { turn: at.turnSet ? at.turn : null });
      if (gen !== u.gen) return;
      const b = byId(id);
      if (!b) return;
      // an added book's first title, read after it opened, is selected to retype as a found one's is
      if (!b.text && !b.typed && id === curId && b.verdict !== "right") selectFor = id;
      act({ type: "read", book: id, text: r.text, confidence: r.confidence, reader: how, ...(r.turn != null ? { turn: r.turn } : {}) });
      shell.status("Book read again.");
    } finally { if (gen === u.gen) { u.reading = false; draw(); } }
  }

  // ---------- drawing on the photo ----------
  const layer = () => shell.viewer.layer("bs");
  const el = (tag, attrs) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  function drawBoxes() {
    const g = layer(), pts = (b) => b.corners.map((p) => p.join(",")).join(" ");
    g.replaceChildren(...books.map((b) => {
      b = live(b);
      const k = el("g", { class: `bs-book ${b.view}${b.id === curId && (tagging() || !truth()) ? " current" : ""}${b.verdict ? " done" : ""}` });
      k.append(el("polygon", { class: "under", points: pts(b) }), el("polygon", { class: "over", points: pts(b) }));
      return k;
    }));
    if (curId && byId(curId) && tagging()) g.append(...cur().corners.map((p, i) => el("circle", { class: "bs-corner", cx: p[0], cy: p[1], r: 7 / st.zoom, "data-corner": i })));
    if (drawing?.pts.length) g.append(el("polyline", { class: "bs-book current", points: drawing.pts.map((p) => p.join(",")).join(" "), fill: "none", stroke: "#ffd400" }));
    // what is approved, cut out of the photo by the viewer while the tagger tags
    if (truth()) shell.viewer.doneMask?.(books.filter((b) => b.verdict === "right").map((b) => b.corners));
  }
  function draw(rebuild = true) { drawBoxes(); list(); tasks(rebuild); }

  // the summary's mask (req/shell/summary/mask): a book counts when any part of its box lies inside it
  const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const crosses = ([a, b], [c, d]) => side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
  const edgesOf = (p) => p.map((q, i) => [q, p[(i + 1) % p.length]]);
  function inMask(b) {
    const mask = shell.mask.polygons();
    if (!mask.length) return true;
    const c = b.corners, mid = [c.reduce((t, p) => t + p[0], 0) / 4, c.reduce((t, p) => t + p[1], 0) / 4];
    const probes = [...c, mid, ...edgesOf(c).map(([p, q]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])];
    if (probes.some(([x, y]) => shell.mask.inside(x, y))) return true;
    // a border of the mask crossing the box: the box lies on both sides of it, one of them inside
    const box = edgesOf(c);
    if (mask.some((p) => edgesOf(p).some((e) => box.some((f) => crosses(e, f))))) return true;
    // an area of the mask wholly inside the box
    const inBox = ([x, y]) => edgesOf(c).every(([p, q]) => side(p, q, [x, y]) === side(c[0], c[1], c[2]) || side(p, q, [x, y]) === 0);
    return mask.some((p) => inBox(p[0]));
  }
  shell.mask.on(() => list(), shell.signal);

  // the titles, outside ground truth: what the summary counts and the matcher is sent, inside the mask
  function list() {
    $("#bs-found").textContent = books.length ? `${books.length} books: ${books.filter((b) => b.view === "spine").length} spines, ${books.filter((b) => b.view === "cover").length} covers.` : "";
    $("#bs-read").disabled = !raw?.length;
    if (truth()) return;
    const shown = books.filter(inMask), masked = shell.mask.polygons().length > 0;
    $("#bs-count").textContent = found ? `${shown.length} book${shown.length === 1 ? "" : "s"}${masked ? " inside the mask" : ""}: ${shown.filter((b) => b.view === "spine").length} spines, ${shown.filter((b) => b.view === "cover").length} covers.` : "";
    $("#bs-export").disabled = !shown.length;
    // the summary as the shell's Download Summary saves it (req/shell/summary/download): the counts, then each book's text
    shell.summary.set(found ? { over: masked ? `a mask of ${shell.mask.polygons().length} area${shell.mask.polygons().length === 1 ? "" : "s"}, books partly inside counted` : "the whole photo", rows: [
      { measurement: "Books", unit: "count", value: shown.length },
      { measurement: "Spines", unit: "count", value: shown.filter((b) => b.view === "spine").length },
      { measurement: "Covers", unit: "count", value: shown.filter((b) => b.view === "cover").length },
      ...shown.map((b) => ({ measurement: `Book ${books.indexOf(b) + 1} (${b.view})`, unit: "text", value: b.text ?? "" }))] } : null);
    $("#bs-list").replaceChildren(...shown.map((b) => {
      const li = document.createElement("li"); li.className = b.id === curId ? "current" : ""; li.value = books.indexOf(b) + 1;
      li.innerHTML = `<span class="bs-text" dir="auto"></span>`; li.querySelector(".bs-text").textContent = b.text || "";
      li.title = `${b.view}${b.confidence != null ? `, ${Math.round(b.confidence * 100)}% sure` : ""}`;
      li.onclick = () => { curId = b.id; focus(b); draw(); };
      return li;
    }));
  }
  $("#bs-export").onclick = () => {
    const name = st.fileName.replace(/\.[^.]*$/, "");
    shell.saveFile(name + "_books.json", JSON.stringify(matcherDoc(), null, 1), "application/json");
  };
  // what the database matcher is sent: each book's text, where it is, and how sure the reading is
  const matcherDoc = () => ({ image: st.fileName, W: st.W, H: st.H,
    books: books.map((b, i) => ({ b, i })).filter(({ b }) => inMask(b)).map(({ b, i }) => ({ id: i + 1, view: b.view, text: b.text ?? "", confidence: b.confidence ?? null, reader: b.reader ?? null, corners: b.corners })) });
  // the book framed in the view: zoomed to fill most of it, unless already close to that, and in its middle
  function focus(b) {
    const xs = b.corners.map((p) => p[0]), ys = b.corners.map((p) => p[1]), sc = $("#scroller");
    const w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1;
    const fit = Math.min(8, 0.7 * Math.min(sc.clientWidth / w, sc.clientHeight / h));
    if (st.zoom > fit * 1.5 || st.zoom < fit / 1.5) shell.viewer.setZoom(fit);
    shell.viewer.focus((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  }
  // any part of the book's box on the screen
  function inView(b) {
    const v = $("#scroller").getBoundingClientRect(), r = $("#base").getBoundingClientRect();
    const xs = b.corners.map((p) => r.left + p[0] * st.zoom), ys = b.corners.map((p) => r.top + p[1] * st.zoom);
    return Math.max(...xs) > v.left && Math.min(...xs) < v.right && Math.max(...ys) > v.top && Math.min(...ys) < v.bottom;
  }

  // ---------- the ground truth: every book in the order they stand, then the missed ones, then Submit ----------
  const walk = () => inPlace(books);
  const open = () => books.filter((b) => !b.verdict);
  // a book made the open one: a title not yet approved is selected, to retype
  function show(id, keepView = false) {
    commitTitle();
    const b = id ? byId(id) : null;
    curId = b ? b.id : null; asked = null; selectFor = b && b.verdict !== "right" ? b.id : null;
    if (b && !keepView) focus(b);
    draw();
  }
  // the next book still open along the shelves after the one with this id, round to the first; none once every book is decided
  function next(afterId = curId) {
    const all = walk(), from = all.findIndex((b) => b.id === afterId);
    show([...all.slice(from + 1), ...all.slice(0, from + 1)].find((b) => !b.verdict)?.id ?? null);
  }
  // Back and Next: the book beside this one along the shelves, whatever its verdict
  function step(by) {
    const all = walk();
    if (!all.length) return;
    const at = curId ? all.findIndex((b) => b.id === curId) : by > 0 ? -1 : 0;
    show(all[(at + by + all.length) % all.length].id);
  }
  function verdict(v) {
    if (!curId) return;
    if (v === "wrong") return remove(curId);
    // the title typed and not yet committed goes with the approval
    const b = byId(curId), typed = pending?.id === curId && pending.value !== b.text ? { text: pending.value } : {};
    pending = null;
    act({ type: "approve", book: curId, ...typed });
    next();
  }
  function tasks(rebuild = true) {
    if (!truth()) return;
    const all = books, decided = all.length - open().length;
    shell.tasks.count("books", decided, all.length, all.length > 0 && !open().length && noneMissed());
    if (rebuild) {
      const row = shell.tasks.row("books")?.querySelector(".task-body");
      // the title being typed keeps its place while the book is drawn again
      const typing = document.activeElement?.closest?.(".bs-item input") ? { s: document.activeElement.selectionStart, e: document.activeElement.selectionEnd } : null;
      row?.replaceChildren();
      const now = shell.tasks.open(tagging() ? "books" : null);
      if (now) {
        const box = curId && byId(curId) ? item(cur()) : missedTools();
        now.querySelector(".task-body").append(box);
        const t = box.querySelector("input");
        // kept until a box still on the page takes it: the book may be drawn again before the next frame
        if (t && selectFor === curId) requestAnimationFrame(() => { if (t.isConnected && selectFor === curId) { selectFor = null; t.focus({ preventScroll: true }); t.select(); } });
        else if (t && typing) { t.focus({ preventScroll: true }); t.setSelectionRange(typing.s, typing.e); }
      }
    }
    shell.tasks.ready(!!(all.length && !open().length && noneMissed()));
    shell.actions.report({ tagging: tagging(), book: !!curId, drawing: !!drawing });
  }
  // the book's picture in the task, drawn here from the photo the viewer shows, at the book's turn
  function paint(cv, b) {
    if (!st.plain) { cv.hidden = true; return; }
    const up = rotate(picture(st.plain, b.corners), b.turn || 0);
    cv.width = up.width; cv.height = up.height; cv.getContext("2d").putImageData(new ImageData(up.data, up.width, up.height), 0, 0);
  }
  let painting = 0;
  const repaint = () => {
    cancelAnimationFrame(painting);
    painting = requestAnimationFrame(() => { const cv = document.querySelector(".bs-item canvas"), b = cur(); if (cv && b) paint(cv, b); });
  };
  function flip(id) { commitTitle(); if (act({ type: "flip", book: id })) reread(id); }
  // the title typed counts as typed before it is committed
  const typedNow = (b) => b.typed || pending?.id === b.id;
  // the book on show: its picture, Flip, its text and the verdict
  function item(b) {
    const box = document.createElement("div"); box.className = "bs-item";
    box.innerHTML = `<div class="bs-tools"><a data-do="back">Back</a><a data-do="next">Next</a></div><canvas></canvas>
      <div class="bs-row"><button type="button" data-do="flip" title="Turn the picture upside down">Flip</button></div>
      <input type="text" dir="auto" placeholder="The title, as printed" aria-label="Title"><p class="bs-reading dim" hidden>Reading again…</p>
      <p class="bs-confirm hint" role="status" hidden>Left as read: Enter again if it is exactly right</p>
      <div class="bs-verdicts"><button type="button" class="primary" data-do="right">Right</button><button type="button" data-do="wrong">Not a book</button></div>`;
    paint(box.querySelector("canvas"), b);
    box.querySelector('[data-do="flip"]').onclick = () => flip(b.id);
    box.querySelector(".bs-reading").hidden = !readOf(b.id).reading;
    box.querySelector(".bs-confirm").hidden = asked !== b.id;
    const t = box.querySelector("input"); t.value = pending?.id === b.id ? pending.value : b.text || "";
    t.oninput = () => { pending = { id: b.id, value: t.value }; asked = null; box.querySelector(".bs-confirm").hidden = true; };
    t.onblur = () => { if (!rightDown) commitTitle(); };
    for (const v of ["right", "wrong"]) {
      const k = box.querySelector(`[data-do="${v}"]`);
      k.setAttribute("aria-pressed", String(b.verdict === v)); k.onclick = () => verdict(v);
      if (v === "right") k.onpointerdown = () => { rightDown = true; };
    }
    box.querySelector('[data-do="next"]').onclick = () => step(1);
    box.querySelector('[data-do="back"]').onclick = () => step(-1);
    return box;
  }
  function missedTools() {
    const box = document.createElement("div");
    box.innerHTML = `<p class="hint">Right-click the photo where a book was missed: Add a book here.</p>
      <div class="bs-verdicts"><button type="button" data-do="draw">Draw a book</button><button type="button" data-do="none">${noneMissed() ? "Done" : "None missed"}</button></div>`;
    box.querySelector('[data-do="draw"]').onclick = startDrawing;
    box.querySelector('[data-do="none"]').onclick = () => { commitTitle(); act({ type: "none-missed", on: true }); };
    return box;
  }
  function startDrawing() {
    drawing = { pts: [] };
    $("#scroller").classList.add("bs-drawing"); $("#bs-draw-hint").hidden = false; draw();
  }
  function endDrawing() { drawing = null; $("#scroller").classList.remove("bs-drawing"); $("#bs-draw-hint").hidden = true; draw(); }
  // a book the finder missed: one more book on the photo, open now and read
  function added(corners) {
    const m = shell.gt.model();
    if (!m) { shell.status("Find books first, then add the ones it missed."); return; }
    commitTitle();
    const id = nextAdded(m);
    if (!act({ type: "add", book: id, corners })) return;
    show(id); reread(id);
  }
  function drew(pts) { endDrawing(); added(pts); }
  // a book added at a point of the photo: upright, as wide and as tall as the books kept so far, in the middle
  function addAt([x, y]) {
    const side = (b, i, j) => Math.hypot(b.corners[i][0] - b.corners[j][0], b.corners[i][1] - b.corners[j][1]);
    const median = (v) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
    const w = books.length ? median(books.map((b) => side(b, 0, 1))) : st.W / 15, h = books.length ? median(books.map((b) => side(b, 0, 3))) : st.H / 3;
    added(clockwise([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]]));
  }
  // a book taken off the photo and out of the walk, found or added alike: Not a book, or Delete this book
  function remove(id) {
    const all = walk(), after = all[all.findIndex((b) => b.id === id) - 1]?.id ?? null, wasOpen = curId === id;
    pending = pending?.id === id ? null : pending;
    commitTitle();
    if (!act({ type: "delete", book: id })) return;
    if (wasOpen) return next(after);
    draw();
  }
  function submit() {
    commitTitle();
    const name = st.fileName.replace(/\.[^.]*$/, ""), kept = books.filter((b) => b.verdict === "right");
    const items = [{ ok: true, text: `${books.filter((b) => b.source === "found" && b.verdict === "right").length} books the finder proposed kept` },
      { ok: true, text: `${books.filter((b) => b.source === "missed" && b.verdict === "right").length} missed books added` },
      ...(kept.some((b) => !b.text) ? [{ ok: false, level: "warning", text: `${kept.filter((b) => !b.text).length} books with no title typed` }] : [])];
    shell.submitTruth({ count: kept.length, file: name + "_books_gt.json", items, empty: "No book marked right yet." });
  }

  // ---------- the right-click menu: a book added anywhere, a book flipped or deleted ----------
  const menu = $("#bs-menu");
  let menuAt = null;
  // the book under a point: of several, the last drawn
  const bookAt = (p) => books.findLast((b) => inside(p, b.corners)) || null;
  const hideMenu = () => { menu.hidden = true; menuAt = null; };
  $("#scroller").addEventListener("contextmenu", (e) => {
    if (!opened || !tagging() || drawing) return;
    e.preventDefault();
    const p = at(e), b = bookAt(p), r = $("#image-view").getBoundingClientRect();
    menuAt = { p, b };
    // a box drawn over two books hides one of them: a book may be added on a box too
    for (const k of ["flip", "delete"]) menu.querySelector(`[data-do="${k}"]`).hidden = !b;
    Object.assign(menu.style, { left: e.clientX - r.left + "px", top: e.clientY - r.top + "px" });
    menu.hidden = false;
  }, here);
  menu.onclick = (e) => {
    const k = e.target.closest("button")?.dataset.do, m = menuAt;
    hideMenu();
    if (!m || !k) return;
    if (k === "add") addAt(m.p);
    if (k === "delete") remove(m.b.id);
    if (k === "flip") { show(m.b.id); flip(m.b.id); }
  };
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !menu.contains(e.target)) hideMenu(); }, { ...here, capture: true });

  // ---------- the pointer: dragging the current book's corners, drawing a missed one ----------
  const sc = $("#scroller"), at = (e) => shell.viewer.toImage(e);
  // a corner may go past the photo's edge, for a book the camera cut off, but no further than a photo's width
  const past = (v, n) => Math.round(Math.min(Math.max(v, -n), 2 * n) * 10) / 10;
  sc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !opened) return;
    if (drawing) { e.preventDefault(); drawing.pts.push(at(e)); if (drawing.pts.length === 4) drew(drawing.pts); else draw(); return; }
    const k = e.target.closest?.(".bs-corner"), book = cur();
    if (!k || !book) return;
    e.preventDefault();
    drag = { id: book.id, corner: +k.dataset.corner, corners: book.corners.map((p) => [...p]) };
    shell.drag(sc, e, { move, drop, cancel: () => { drag = null; drawBoxes(); repaint(); } });
  }, here);
  // the corner follows the pointer; the log holds nothing until it is dropped
  function move(e) {
    if (!drag) return;
    const [x, y] = at(e);
    drag.corners[drag.corner] = [past(x, st.W), past(y, st.H)];
    drawBoxes(); repaint();
  }
  // one GT action; the reading follows the corners
  function drop() {
    if (!drag) return;
    const { id, corners } = drag;
    drag = null;
    if (act({ type: "move-corners", book: id, corners })) reread(id); else { drawBoxes(); repaint(); }
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (drawing) endDrawing(); hideMenu(); } }, here);

  // ---------- the keyboard (req/shelves/truth/keys, req/shell/image/keys) ----------
  // the shell presses the open book's buttons by the keys study.json gives them; Right's key, on a title still as
  // the reader read it, first asks for a second press
  shell.actions.handle({
    right: (phase, { control }) => {
      const b = cur();
      if (!b) return;
      if (!typedNow(b) && asked !== b.id) { asked = b.id; document.querySelector(".bs-item .bs-confirm").hidden = false; return; }
      control.click();
    },
  });

  return {
    ready() { $("#bs-find").disabled = !opened; },
    opened() {
      opened = true; found = false; books = []; raw = null; curId = null; drag = null; drawing = null; selectFor = null; asked = null; pending = null; reads.clear(); hideMenu();
      $("#bs-find").disabled = false; $("#bs-read").disabled = true; $("#bs-export").disabled = true;
      shell.viewer.layer("bs").replaceChildren(); draw();
    },
    result(action, meta) {
      if (action === "find") {
        raw = meta.books.map((b) => ({ ...b }));
        // shown at once; the log's run, which gives them ids, waits for their readings
        books = raw.map((b, i) => ({ ...b, id: `r${i + 1}`, source: "found", verdict: null, typed: false, turnSet: false, proposed: null }));
        found = true; curId = null; shell.busy(false);
        shell.step("find", true, `${shell.algorithm.title}: ${books.length} books found` + (textless ? `, without the text finder (${textless})` : ""));
        shell.boxDone($("#bs-box"), `${books.length} books`);
        draw();
      }
    },
    // a curated ground truth's final results (req/shell/ground-truth/view): the books marked right, each boxed, and
    // none of the task's marks
    showTruth(doc) {
      books = (doc.books || []).filter((b) => b.verdict === "right" && Array.isArray(b.corners)).map((b, i) => ({ id: b.id ?? `b${i + 1}`, ...b }));
      curId = null; draw();
      const titled = books.filter((b) => b.text).length;
      return `${books.length} book${books.length === 1 ? "" : "s"}, ${titled} with a title`;
    },
    error() { shell.busy(false); },
    capturesPointer: () => !!drawing || drag !== null,
    pickAt(e) { return bookAt(at(e)); },
    // a book clicked on the photo opens in the task, whatever its verdict, the view left where it is
    pick(b) { if (!b || drawing) return; if (truth() && !tagging()) return; if (truth()) show(b.id, inView(b)); else { curId = b.id; draw(); } },
    zoomed: () => drawBoxes(),
  };
}
