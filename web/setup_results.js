// Results (req/setup/results): Study Setup's box for the study's numbers over its images. Nothing is read until Show results is pressed;
// then each image with an official mark has its official extraction read and listed as one row (the image, the algorithm and version that
// made it or "by hand", and the study's measures, which its study.json names under `results.measures`), the totals last, and Download CSV
// saves the same rows from the page, asking the network for nothing.
"use strict";
import { cell } from "./summary_download.js";
import { work } from "./pending.js";
import { asLoaded } from "./as_loaded.js";
import { holdOwns } from "./offline.js";

const READ_AT_ONCE = 6;

// a measure's value in an extraction's document: `path` (dotted: "labels.0.count") a number, or `count` the paths of lists whose lengths
// are added; null where the document has no such number
const at = (doc, path) => String(path).split(".").reduce((x, k) => (x == null ? undefined : x[k]), doc);
export function measureOf(doc, m) {
  if (m.count) {
    const lists = m.count.map((p) => at(doc, p));
    return lists.some(Array.isArray) ? lists.reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0) : null;
  }
  const v = at(doc, m.path);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// how the extraction was made: the algorithm and the first eight of its code version where a batch run made it, "by hand" where a person's
// tagger is named or no run is recorded
export function howOf(doc) {
  if (typeof doc?.tagger === "string") return "by hand";
  const run = (doc?.history?.actions || []).find((a) => a?.type === "run" && a.algorithm);
  return run ? [run.algorithm, run.version?.code && String(run.version.code).slice(0, 8)].filter(Boolean).join(" ") : "by hand";
}

// $: the page's selector; reader, place: the store's reads and the study's place in it; saveFile(name, text, type): the page's own download
export function setupResults({ $, reader, place, saveFile }) {
  const box = $("#results-box"), msg = $("#results-msg"), csv = $("#results-csv"), scroll = $("#results-scroll"), table = $("#results-scroll table");
  // the box as the page loaded, put back when the study leaves
  const asStarted = asLoaded([box], holdOwns);
  let measures = [], shown = null, epoch = 0, busy = false;
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle("err", !!err); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const row = (cells, tag = "td") => {
    const tr = document.createElement("tr");
    for (const c of cells) tr.append(Object.assign(document.createElement(tag), { textContent: c ?? "" }));
    return tr;
  };

  // [{name, how, values}] of the images with an official mark, by name, read from the study file now and each file
  async function read() {
    const s = await place.settings({ fresh: true });
    const names = new Map((s?.index?.images || []).filter((i) => i.sha).map((i) => [i.sha, i.name]));
    const marked = Object.entries(s?.marks || {}).filter(([, m]) => typeof m?.official?.file === "string");
    const out = [], failed = [];
    for (let k = 0; k < marked.length; k += READ_AT_ONCE) {
      await Promise.all(marked.slice(k, k + READ_AT_ONCE).map(async ([sha, m]) => {
        const name = names.get(sha) || sha.slice(0, 8);
        try {
          const doc = JSON.parse(await reader.text(m.official.file));
          out.push({ name, how: howOf(doc), values: measures.map((x) => measureOf(doc, x)) });
        } catch (e) { console.warn(`the official extraction of ${name} was not read:`, e); failed.push(name); }
      }));
    }
    return { rows: out.sort((a, b) => a.name.localeCompare(b.name)), failed };
  }

  const totals = (rows) => measures.map((_, i) => {
    const v = rows.map((r) => r.values[i]).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) : null;
  });
  const lines = (rows) => [["Image", "Algorithm", ...measures.map((m) => m.title)],
    ...rows.map((r) => [r.name, r.how, ...r.values]), [`Total (${plural(rows.length, "image")})`, "", ...totals(rows)]];

  function draw() {
    box.classList.toggle("busy", busy);
    $("#results-show").disabled = busy;
    csv.hidden = !shown; scroll.hidden = !shown;
    if (!shown) { table.tHead.replaceChildren(); table.tBodies[0].replaceChildren(); table.tFoot.replaceChildren(); return; }
    const [head, ...rest] = lines(shown), foot = rest.pop();
    table.tHead.replaceChildren(row(head, "th"));
    table.tBodies[0].replaceChildren(...rest.map((cells) => { const tr = row(cells); tr.dataset.name = cells[0]; return tr; }));
    table.tFoot.replaceChildren(row(foot));
  }

  async function show() {
    const mine = ++epoch;
    busy = true; say(""); draw();
    try {
      const got = await read();
      if (mine !== epoch) return;
      shown = got.rows;
      say(got.failed.length ? `Not read: ${got.failed.join(", ")}.` : shown.length ? "" : "No image has an official mark.", !!got.failed.length);
    } catch (e) { if (mine === epoch) say("The results could not be read: " + (e.message || e), true); }
    if (mine === epoch) busy = false;
    draw();
  }
  $("#results-show").onclick = () => work.during(show(), "the results read");
  csv.onclick = () => {
    if (!shown) return;
    saveFile("results.csv", lines(shown).map((r) => r.map(cell).join(",")).join("\n") + "\n", "text/csv");
  };

  return {
    // a study comes in: the measures its study.json names
    mount(m) { epoch++; measures = (m?.results?.measures || []).filter((x) => x?.title && (x.path || Array.isArray(x.count))); shown = null; busy = false; say(""); box.hidden = false; draw(); },
    open() {},
    signedIn() {},
    opened() {},
    leave() { epoch++; shown = null; measures = []; busy = false; asStarted(); },
    get on() { return false; },
  };
}
