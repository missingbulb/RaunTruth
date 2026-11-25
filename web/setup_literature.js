// Literature (req/setup/literature): Study Setup's list of the papers in the study's Literature folder in the store, each beside the
// repo's summary of it, and the summaries no paper there pairs with. The folder is listed when the aspect is chosen and not before; the
// summaries are the site's own list of them.
"use strict";

const stem = (name) => String(name).replace(/\.[^.]*$/, "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const same = (a, b) => a.trim().normalize("NFC").toLowerCase() === b.trim().normalize("NFC").toLowerCase();

// files: [{id, name}] of the folder; summaries: [{file, title, paper}]. {papers: [{id, name, summary | null}] by name, orphans: the
// summaries no file pairs with}: a summary's named paper first, else the two file names alike once reduced to letters and digits
export function paired(files, summaries) {
  const taken = new Set();
  const papers = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((f) => {
    const summary = summaries.find((s) => s.paper && same(s.paper, f.name)) || summaries.find((s) => stem(s.file) === stem(f.name)) || null;
    if (summary) taken.add(summary);
    return { id: f.id, name: f.name, summary };
  });
  return { papers, orphans: summaries.filter((s) => !taken.has(s)) };
}

// $: the page's selector; reader, place: the store's reads and the study's place in it; calls: the page's calls shown; study(): the id of
// the study on show; summariesAt: the address of the site's list of summaries; linkOf(id): a file's address in the store
export function setupLiterature({ $, reader, place, calls, study, summariesAt, linkOf }) {
  const list = $("#literature-papers"), orphans = $("#literature-orphans"), msg = $("#literature-msg");
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text ?? "" });
  const say = (t) => { msg.textContent = t; };
  let listed = null;
  const summaries = async () => {
    if (!listed) {
      try { const r = await fetch(summariesAt, { cache: "no-cache" }); listed = r.ok ? await r.json() : {}; } catch { listed = {}; }
    }
    return listed[study()] || [];
  };

  async function show() {
    orphans.hidden = true; $("#literature-summaries").replaceChildren(); say("");
    const slot = calls.fill(list, "store", "the Literature folder");
    try {
      const [folder, known] = await Promise.all([place.literature(), calls.during("site", "the summaries", summaries)]);
      const files = folder ? (await reader.all(folder)).filter((f) => !f.folder) : [];
      if (!slot.done()) return;
      const { papers, orphans: alone } = paired(files, known);
      list.replaceChildren(...papers.map((p) => {
        const li = document.createElement("li"), a = el("a", "name", p.name);
        a.href = linkOf(p.id); a.target = "_blank"; a.rel = "noopener";
        li.append(a, ...(p.summary ? [el("span", "of", p.summary.title), el("span", "has yes", "summary")] : [el("span", "has no", "no summary in the repo")]));
        return li;
      }));
      $("#literature-summaries").replaceChildren(...alone.map((s) => { const li = document.createElement("li"); li.append(el("span", "name", s.title), el("span", "of", s.paper || s.file)); return li; }));
      orphans.hidden = !alone.length;
      const n = papers.length, with_ = papers.filter((p) => p.summary).length;
      say(!folder ? "The study's root has no Literature folder." : !n ? "The Literature folder holds no file."
        : `${n} paper${n === 1 ? "" : "s"}, ${with_} with a summary.${known.length ? "" : " The site lists no summary for this study."}`);
    } catch (e) {
      if (slot.failed(e)) say(`The Literature folder could not be read: ${e.message}`);
    }
  }
  return { show };
}
