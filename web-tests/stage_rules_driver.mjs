// Runs the stage table of web/stages.js under Node and prints what it says as one JSON object for test_stage_table.py to judge.
//   node web-tests/stage_rules_driver.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const s = await import(path.join(repo, "web", "stages.js"));

const out = { stages: s.STAGES, allows: {}, outside: {} };
for (const action of s.ACTIONS) {
  out.allows[action] = s.STAGES.map((stage) => s.stageAllows(stage, action));
  out.outside[action] = s.stageAllows(null, action);
}
out.stageOf = { file: s.stageOf({ stage: "Analyze" }, { stage: "Review" }), fallback: s.stageOf({}, { stage: "Review" }), none: s.stageOf(null, {}),
  old: s.stageOf({ stage: "GT" }, { stage: "Published" }), unknown: s.stageOf({ stage: "Elsewhere" }) };
out.lights = s.STAGES.map((n) => [n, typeof s.LIGHT[n], typeof s.WHAT[n], typeof s.NEXT[n]]);
console.log(JSON.stringify(out));
