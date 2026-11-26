// The Analysis box's choice in the left bar (req/shell/annotate/choice): once an image is open, Start and Open saved analysis, and its
// dialog listing the image's Analysis Files in the store. It draws what the shell hands it and tells the shell what was
// chosen; the shell owns the mode.
"use strict";

// $: the page's selector; the handlers: start(), local(), load() the Load dialog opened, pick(key) a file of the list
// loaded, edit(), clear()
export function annotateChoice({ $, remote, start, local, load, pick, edit, clear }) {
  const dlg = $("#load-dlg"), list = $("#annotate-list"), go = $("#load-go");
  let chosen = null;
  $("#annotate-scratch").onclick = () => start();
  $("#annotate-local").onclick = () => local();
  $("#annotate-load").onclick = () => { chosen = null; load(); dlg.showModal(); };
  $("#annotate-edit").onclick = () => edit();
  $("#annotate-clear").onclick = () => clear();
  $("#load-cancel").onclick = () => dlg.close();
  const choose = (key) => {
    chosen = key;
    for (const b of list.querySelectorAll("button[data-key]")) b.setAttribute("aria-selected", String(b.dataset.key === key));
    go.disabled = !key;
  };
  list.addEventListener("click", (e) => { const b = e.target.closest("button[data-key]"); if (b) choose(b.dataset.key); });
  list.addEventListener("dblclick", (e) => { if (e.target.closest("button[data-key]") && chosen) go.click(); });
  go.onclick = () => { const key = chosen; if (!key) return; dlg.close(); pick(key); };
  // when a draft was saved, as its button says it: the time alone for one of today
  const savedAt = (when) => {
    const d = new Date(when), time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return d.toDateString() === new Date().toDateString() ? `today ${time}` : `${d.toLocaleDateString()} ${time}`;
  };
  const text = (tag, t, cls) => Object.assign(document.createElement(tag), { textContent: t, ...(cls ? { className: cls } : {}) });
  // a title an offline hold may be keeping in its place
  const title = (el, t) => { if (el.dataset.onlineTitle === undefined) el.title = t; else el.dataset.onlineTitle = t; };
  return {
    // v: {shown, annotating, loads: whether the stage lets an Analysis File be loaded, draft: {saved, count} | null,
    // list: null | {busy} | {failed} | {sub}: the store has some, not listed yet | {rows: [{key, label, detail, group}]}, why: what holds Load while the list cannot be
    // read, asks: the list is read at Load's press, so Load is on until it is known, viewing: the line saying which Analysis File is shown read-only, or null, say: a line of the mode, or ""}
    draw(v) {
      $("#annotate-choices").hidden = v.annotating;
      // the work kept on this device leads where there is some: Continue is the primary, and Start starts over
      $("#annotate-local").hidden = !v.draft;
      $("#annotate-local").replaceChildren("Continue", ...(v.draft ? [text("small", ` · saved ${savedAt(v.draft.saved)} · ${v.draft.count} edit${v.draft.count === 1 ? "" : "s"}`)] : []));
      $("#annotate-scratch").classList.toggle("primary", !v.draft);
      $("#annotate-scratch").textContent = v.draft ? "Start over" : "Start";
      const l = v.list, rows = l?.rows || [], load = $("#annotate-load");
      load.hidden = !v.loads;
      load.disabled = !(rows.length || l?.sub || (v.asks && !v.why && !l?.rows));
      title(load, rows.length || l?.sub ? `Open one of this image's Analysis Files from ${remote.short}`
        : l?.busy ? "Looking for Analysis Files of this image…" : l?.failed || (l?.rows ? `No Analysis File of this image on ${remote.short} yet.` : v.why || ""));
      const button = (r) => {
        const b = text("button", r.label, "item"); b.type = "button"; b.dataset.key = r.key; b.setAttribute("role", "option");
        b.setAttribute("aria-selected", String(r.key === chosen));
        if (r.detail) b.append(text("span", r.detail, "dim"));
        return b;
      };
      // mine, then the marked, then the others folded away (req/shell/extractions/list)
      const others = rows.filter((r) => r.group === "other"), first = rows.filter((r) => r.group !== "other");
      const fold = Object.assign(document.createElement("details"), { className: "others" });
      fold.append(text("summary", `Others (${others.length})`), ...others.map(button));
      if (!rows.some((r) => r.key === chosen)) chosen = null;
      list.replaceChildren(...(l?.busy ? [text("p", "Looking for Analysis Files of this image…", "hint")]
        : l?.failed ? [text("p", l.failed, "hint")]
          : rows.length ? [...first.map(button), ...(others.length ? [fold] : [])] : [text("p", `No Analysis File of this image on ${remote.short} yet.`, "hint")]));
      go.disabled = !chosen;
      $("#load-dlg-msg").textContent = v.readFailed || "";
      const say = v.annotating ? v.say : v.viewing;
      // annotating with nothing to say of where the analysis came from, the part has nothing to show
      $("#annotate-box").hidden = !v.shown || (v.annotating && !say);
      $("#annotate-say").hidden = !say; $("#annotate-say").textContent = say || "";
      $("#annotate-edit").hidden = v.annotating || !v.viewing;
      $("#annotate-clear").hidden = !v.annotating;
    },
  };
}
