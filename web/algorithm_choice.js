// The study's algorithms at the top of its Processing box (req/shell/processing/algorithms): the list its study.json
// names, joined with the numbers it names, the first the one chosen at first, each with its icon, its title and, where
// measured, its precision (P) and recall (R); beside it a (?) opening how the study scores them, where its metrics say
// (req/shell/processing/scoring); under it how the chosen one works and how well it did. The study reads the choice
// and hears it change.
const two = (x) => x.toFixed(2).replace(/^0/, "");
const pr = (a) => `P ${two(a.precision)} · R ${two(a.recall)}`; // one unbroken pair
const measured = (a) => typeof a.precision === "number" && typeof a.recall === "number";
const capital = (s) => s[0].toUpperCase() + s.slice(1);

export function algorithmChoice({ $, outline, status }) {
  const box = $("#algorithm-pick"), sel = $("#algorithm"), q = $("#scoring-help"), scoring = $("#scoring-note"), heard = [];
  const shut = () => { scoring.hidden = true; q.setAttribute("aria-expanded", "false"); };
  q.addEventListener("click", () => { const open = scoring.hidden; scoring.hidden = !open; q.setAttribute("aria-expanded", String(open)); });
  let list = [], doc = null, ready = Promise.resolve([]);
  const chosen = () => list.find((a) => a.key === sel.value);
  function about() {
    const a = chosen(); if (!a) return;
    $("#algorithm-about summary").textContent = `How the ${a.title} algorithm works`;
    const note = $("#algorithm-note");
    note.replaceChildren(outline(a.about));
    if (!measured(a)) return;
    const p = document.createElement("p"), b = document.createElement("strong");
    b.textContent = `${capital(a.title)} algorithm shows precision of ${a.precision.toFixed(2)} and recall of ${a.recall.toFixed(2)}${doc.measured ? " " + doc.measured : ""}`;
    p.append(b); if (a.note) p.append(` (${a.note})`);
    note.append(p);
  }
  sel.addEventListener("change", () => { about(); for (const fn of [...heard]) fn(sel.value); });
  return {
    // the study coming in: its list and their numbers fetched, the page never waiting on them; an algorithm the
    // numbers leave out shows none
    mount(manifest, base, signal) {
      const named = manifest.algorithms;
      box.hidden = !named;
      if (!named) { ready = Promise.resolve([]); return; }
      const json = (rel) => fetch(base + rel).then((r) => { if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`); return r.json(); });
      ready = Promise.all([json(named.list), named.metrics ? json(named.metrics) : {}])
        .then(([own, m]) => {
          if (signal.aborted) return new Promise(() => {});
          doc = { measured: m.measured };
          list = own.map((a) => { const v = m.versions?.[a.key]; return v ? { ...a, precision: v.precision, recall: v.recall, note: v.note } : a; });
          shut(); q.hidden = !m.scoring;
          if (m.scoring) { const head = document.createElement("p"); head.textContent = "How precision and recall are scored"; scoring.replaceChildren(head, outline(m.scoring)); }
          sel.replaceChildren(...list.map((a) => new Option(`${a.icon || ""} ${a.title}${measured(a) ? ` (${pr(a)})` : ""}`.trim(), a.key)));
          sel.title = list.some(measured) ? `Precision (P) and recall (R) of each algorithm${doc.measured ? " " + doc.measured : ""}` : "";
          sel.disabled = !list.length; about();
          return list;
        }, (e) => { if (!signal.aborted) status(`The algorithms could not be listed: ${e.message || e}`, true); return signal.aborted ? new Promise(() => {}) : []; });
    },
    // the study leaving: the list as before any study came in
    leave() {
      heard.length = 0; list = []; doc = null; sel.replaceChildren(); sel.title = ""; sel.disabled = true; box.hidden = true;
      shut(); q.hidden = true; scoring.replaceChildren();
      $("#algorithm-about").open = false; $("#algorithm-about summary").textContent = "How the algorithm works"; $("#algorithm-note").replaceChildren();
    },
    // what the study is handed: the list once fetched, the chosen key and title, and each change of it
    api: {
      get ready() { return ready; },
      get key() { return chosen()?.key; },
      get title() { return chosen()?.title; },
      // the list as the box shows it, and a choice made as the user's own is (a batch run, req/setup/batch, runs each of them)
      get list() { return list.slice(); },
      choose(key) { if (sel.value !== key && list.some((a) => a.key === key)) { sel.value = key; sel.dispatchEvent(new Event("change")); } },
      on(fn) { heard.push(fn); },
    },
  };
}
