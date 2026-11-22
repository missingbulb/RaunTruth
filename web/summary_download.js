// Download Summary (req/shell/summary/download): the study works out its summary and hands it over as data; the shell
// saves it as one CSV, the same table for every study. set({over, rows}) offers it, set(null) takes it back; each row is
// {measurement, unit, value} for a single number or {measurement, unit, n, mean, sd, median, min, max} for a distribution.
const COLUMNS = ["image", "study", "counted_over", "measurement", "unit", "value", "n", "mean", "sd", "median", "min", "max"];
export const cell = (v) => {
  if (v == null || (typeof v === "number" && !Number.isFinite(v))) return "";
  const t = typeof v === "number" ? String(Number(v.toPrecision(6))) : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// the CSV's text for a summary of the image `image` in the study `study`
export function summaryCsv(summary, image, study) {
  const lines = [COLUMNS.join(",")];
  for (const r of summary.rows) {
    const at = { image, study, counted_over: summary.over, ...r };
    lines.push(COLUMNS.map((k) => cell(at[k])).join(","));
  }
  return lines.join("\n") + "\n";
}

// the button at the Summary box's foot, and the study's summary it saves
export function summaryDownload({ button, saveFile, image, study }) {
  let summary = null;
  const show = () => { button.hidden = !summary; };
  button.onclick = () => {
    if (!summary) return;
    const name = image() || "image";
    saveFile(name.replace(/\.[^.]*$/, "") + "_summary.csv", summaryCsv(summary, name, study()), "text/csv");
  };
  show();
  return {
    api: { set(s) { summary = s && Array.isArray(s.rows) ? { over: s.over ?? "", rows: s.rows } : null; show(); } },
    clear() { summary = null; show(); },
  };
}
