// A run's report (explore.mjs): steps.json, every step (its action, what it changed, its findings) and the run's
// findings, which a replay and a shrink read back; and summary.md, the findings by class, each with how to reproduce
// it, and what the walk covered.
import fs from "node:fs";
import path from "node:path";

const ME = "node web-tests/explore/explore.mjs";
const q = (s) => (/^[\w./:@=-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);

export function write(out, run) {
  fs.writeFileSync(path.join(out, "steps.json"), JSON.stringify(run, null, 1) + "\n");
  const file = path.join(out, "steps.json");
  const by = { bug: [], gap: [], call: [] };
  for (const f of run.findings) by[f.class].push(f);
  const where = (a) => a.kind === "event" ? `event ${a.event}${a.said ? ` (${a.said})` : ""}` : a.kind === "key" ? `key ${a.press}`
    : `${a.kind} ${a.key}${a.text ? ` "${a.text}"` : ""}${a.value !== undefined && a.kind !== "click" ? ` = ${JSON.stringify(a.value ?? a.press)}` : ""}`;
  const lines = [`# Exploration: ${run.world.name}, seed ${run.seed}`, "", run.world.about, "",
    `${run.steps.length} steps${run.replayOf ? `, a replay of ${run.replayOf}` : ""}${run.focus.length ? `, focus ${run.focus.join(" ")}` : ""}${run.plants.length ? `, plants ${run.plants.join(" ")}` : ""}, ${Math.round(run.seconds)} s.`,
    "", `Run again: \`${run.command}\``, "",
    `## Findings: ${by.bug.length} bug(s), ${by.gap.length} gap(s), ${by.call.length} call(s)`, ""];
  if (!run.findings.length) lines.push("None.", "");
  for (const cls of ["bug", "gap", "call"]) for (const f of by[cls]) {
    lines.push(`### ${cls}: ${f.what}`, "",
      `- ${f.oracle}, first at step ${f.step}${f.times > 1 ? `, ${f.times} times (steps ${f.steps.slice(0, 12).join(", ")}${f.steps.length > 12 ? ", ..." : ""})` : ""}`,
      `- reproduce: \`${ME} --replay ${q(file)} --upto ${f.step}\``,
      `- shrink: \`${ME} --shrink ${q(file)} --finding ${q(f.sig)}\``);
    if (f.shot) lines.push(`- screenshot: [${f.shot}](${f.shot})${f.ownerShot ? `, for the owner [${f.ownerShot}](${f.ownerShot})` : ""}`);
    lines.push("");
  }
  const seen = new Map(), done = new Map();
  for (const s of run.steps) {
    for (const c of s.offered || []) seen.set(c, (seen.get(c) || 0) + 1);
    const k = s.action.family || s.action.kind;
    done.set(k, (done.get(k) || 0) + 1);
  }
  const tried = new Set(run.steps.map((s) => s.action.key || s.action.event || s.action.press));
  const never = [...seen.keys()].filter((k) => !tried.has(k));
  lines.push("## Coverage", "",
    `- families: ${[...done].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ")}`,
    `- ${tried.size} distinct actions taken; ${never.length} controls offered and never taken${never.length ? `: ${never.slice(0, 30).join(", ")}${never.length > 30 ? ", ..." : ""}` : ""}`,
    `- shell-states: ${run.steps.reduce((n, s) => n + (s.shell?.checked || 0), 0)} element checks over ${run.steps.filter((s) => s.shell).length} states`,
    `- final state: [${run.finalShot}](${run.finalShot})`, "",
    "## Steps", "", "| step | action | changed | findings |", "|---|---|---|---|",
    ...run.steps.map((s) => `| ${s.i} | ${where(s.action).replace(/\|/g, "\\|")}${s.error ? ` (failed: ${s.error.replace(/\|/g, "/").slice(0, 80)})` : ""} | ${s.change?.categories.join(" ") || ""} | ${s.findings.join("; ").replace(/\|/g, "\\|")} |`), "");
  fs.writeFileSync(path.join(out, "summary.md"), lines.join("\n"));
}
