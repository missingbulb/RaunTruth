// The Annotations box in the left bar (req/shell/annotate/choice): after an image loads it asks how to get annotations on it,
// and once the user annotates it says so and offers Clear. It draws what the shell hands it and tells the shell what was
// chosen; the shell owns the mode.
"use strict";

// $: the page's selector; the handlers: scratch(), local(), stored(), pick(key) a row of the list, edit(), clear()
export function annotateChoice({ $, remote, scratch, local, stored, pick, edit, clear }) {
  $("#annotate-load").textContent = `Load annotation from ${remote.short}`;
  $("#annotate-scratch").onclick = () => scratch();
  $("#annotate-local").onclick = () => local();
  $("#annotate-load").onclick = () => stored();
  $("#annotate-edit").onclick = () => edit();
  $("#annotate-clear").onclick = () => clear();
  $("#annotate-list").addEventListener("click", (e) => { const b = e.target.closest("button[data-key]"); if (b && !b.disabled) pick(b.dataset.key); });
  const text = (tag, t, cls) => Object.assign(document.createElement(tag), { textContent: t, ...(cls ? { className: cls } : {}) });
  return {
    // v: {shown, annotating, route, draft: {saved, count} | null, list: null | {busy} | {failed} | {rows: [{key, label, detail, group}]},
    // viewing: the line saying which annotation is shown read-only, or null}
    draw(v) {
      $("#annotate-box").hidden = !v.shown;
      for (const id of ["#annotate-ask", "#annotate-choices"]) $(id).hidden = v.annotating;
      $("#annotate-local").hidden = !v.draft;
      if (v.draft) $("#annotate-local").title = `Saved ${new Date(v.draft.saved).toLocaleString()}, ${v.draft.count} action${v.draft.count === 1 ? "" : "s"}`;
      else $("#annotate-local").removeAttribute("title");
      const list = $("#annotate-list"), l = v.annotating ? null : v.list;
      list.hidden = !l;
      if (l) {
        const button = (r) => {
          const b = text("button", r.label, "item"); b.type = "button"; b.dataset.key = r.key;
          if (r.detail) b.append(text("span", r.detail, "dim"));
          return b;
        };
        // mine, then the marked, then the others folded away (req/shell/extractions/list)
        const others = l.rows?.filter((r) => r.group === "other") || [], shown = l.rows?.filter((r) => r.group !== "other") || [];
        const fold = Object.assign(document.createElement("details"), { className: "others" });
        fold.append(text("summary", `Others (${others.length})`), ...others.map(button));
        list.replaceChildren(...(l.busy ? [text("p", "Looking for annotations of this image…", "hint")]
          : l.failed ? [text("p", l.failed, "hint")]
            : l.rows.length ? [...shown.map(button), ...(others.length ? [fold] : [])] : [text("p", `No annotation of this image on ${remote.short} yet.`, "hint")]));
      } else list.replaceChildren();
      const say = v.annotating ? v.route : v.viewing;
      $("#annotate-say").hidden = !say; $("#annotate-say").textContent = say || "";
      $("#annotate-edit").hidden = v.annotating || !v.viewing;
      $("#annotate-clear").hidden = !v.annotating;
    },
  };
}
