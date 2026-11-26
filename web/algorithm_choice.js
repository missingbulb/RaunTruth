// The study's algorithm (req/shell/processing/algorithms): of the list its study.json names, the one the list marks `default`
// is the one the page runs, with no choice of it on the page. Once an analysis has started, a fold in the Analysis box says how
// it works, how well it did where measured, and how the study scores (req/shell/processing/scoring). The study reads which
// one it is; whoever runs each of them in turn (a batch, req/setup/batch) chooses through the same reading.
const measured = (a) => typeof a.precision === "number" && typeof a.recall === "number";

// the score's stamp from Review on (req/shell/processing/stamp), {version, dataset_sha256, frozen, commit}: what the numbers were measured on
// and when it was frozen, with a link to the commit that holds the ground truth; null where the metrics carry none
const stampOf = (v) => {
  const t = v?.stamp;
  return t && typeof t.dataset_sha256 === "string" && typeof t.frozen === "string" ? t : null;
};

export function algorithmChoice({ $, outline, status, repo }) {
  const box = $("#algorithm-pick"), scoring = $("#scoring-note"), heard = [];
  let list = [], doc = null, ready = Promise.resolve([]), key = null;
  const chosen = () => list.find((a) => a.key === key);
  function about() {
    stamped(); const a = chosen(), note = $("#algorithm-note");
    note.replaceChildren();
    if (!a) return;
    note.append(outline(a.about));
    if (!measured(a)) return;
    const p = document.createElement("p"), b = document.createElement("strong");
    b.textContent = `It shows precision of ${a.precision.toFixed(2)} and recall of ${a.recall.toFixed(2)}${doc.measured ? " " + doc.measured : ""}`;
    p.append(b); if (a.note) p.append(` (${a.note})`);
    note.append(p);
  }
  // the stamp of the one that runs, beside its numbers
  function stamped() {
    const el = $("#algorithm-stamp"), t = chosen()?.stamp;
    el.hidden = !t; el.replaceChildren();
    if (!t) return;
    el.append(`Frozen ${t.frozen} · algorithm version ${t.version ?? chosen().key} · data set ${t.dataset_sha256.slice(0, 8)}`);
    if (typeof t.commit === "string" && t.commit) {
      const link = Object.assign(document.createElement("a"), { href: `https://github.com/${repo}/commit/${t.commit}`, target: "_blank", rel: "noopener", textContent: `ground truth ${t.commit.slice(0, 8)}` });
      el.append(" · ", link);
    }
  }
  function choose(k) {
    if (key === k || !list.some((a) => a.key === k)) return;
    key = k; about();
    for (const fn of [...heard]) fn(k);
  }
  return {
    // the study coming in: its list and their numbers fetched, the page never waiting on them; an algorithm the
    // numbers leave out shows none. A list that marks no one algorithm default, or several, is the study's error, said.
    mount(manifest, base, signal) {
      const named = manifest.algorithms;
      box.hidden = !named;
      if (!named) { ready = Promise.resolve([]); return; }
      const json = (rel) => fetch(base + rel).then((r) => { if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`); return r.json(); });
      ready = Promise.all([json(named.list), named.metrics ? json(named.metrics) : {}])
        .then(([own, m]) => {
          if (signal.aborted) return new Promise(() => {});
          const defaults = own.filter((a) => a.default === true);
          if (defaults.length !== 1) throw new Error(`${named.list} marks ${defaults.length} algorithms default, where it must mark one`);
          doc = { measured: m.measured };
          list = own.map((a) => { const v = m.versions?.[a.key]; return v ? { ...a, precision: v.precision, recall: v.recall, note: v.note, stamp: stampOf(v) } : a; });
          $("#scoring-fold").hidden = !m.scoring;
          scoring.replaceChildren(...(m.scoring ? [outline(m.scoring)] : []));
          key = defaults[0].key; about();
          return list;
        }).catch((e) => { if (signal.aborted) return new Promise(() => {}); status(`The study's algorithm could not be read: ${e.message || e}`, true); return []; });
    },
    // the study leaving: as before any study came in
    leave() {
      heard.length = 0; list = []; doc = null; key = null; box.hidden = true; box.open = false; $("#algorithm-stamp").hidden = true;
      $("#scoring-fold").hidden = true; $("#scoring-fold").open = false; scoring.replaceChildren(); $("#algorithm-note").replaceChildren();
    },
    // what the study is handed: the list once fetched, the key and title of the one that runs, and each change of it
    api: {
      get ready() { return ready; },
      get key() { return chosen()?.key; },
      get title() { return chosen()?.title; },
      get list() { return list.slice(); },
      // the list's default
      get default() { return list.find((a) => a.default === true)?.key; },
      choose,
      on(fn) { heard.push(fn); },
    },
  };
}
