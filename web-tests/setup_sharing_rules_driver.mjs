// Runs Study Setup's sharing rules (web/setup_sharing.js) under Node, case by case, and prints each case's outcome as one
// JSON object for test_setup_sharing_rules.py to judge.
//   node web-tests/setup_sharing_rules_driver.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const s = await import(path.join(repo, "web", "setup_sharing.js"));

// what the store gives the rules: where an item's sharing is changed, and the words for checking it there
const STORE = { link: (kind, id) => `${kind}:${id}`, check: "Check its sharing" };
const LINK = { id: "anyoneWithLink", type: "anyone", role: "reader" };
const user = (email, role) => ({ id: "user-" + email, type: "user", role, emailAddress: email });
// the study's items, each shared as given: the root by no one, the rest by link unless told otherwise
const items = ({ root = [], data = [LINK], previews = [LINK], extractions = [LINK, user("w@example.com", "writer")], file = [LINK] } = {}) => [
  { kind: "root", id: "r", label: "the root", perms: root }, { kind: "data", id: "d", label: "Data", perms: data },
  { kind: "previews", id: "p", label: "Previews", perms: previews }, { kind: "extractions", id: "e", label: "Extractions", perms: extractions },
  { kind: "file", id: "f", label: "the study file", perms: file }];
const wants = (stage, given) => s.corrections(stage, items(given), STORE).map((c) => [c.kind, c.how]);

const out = { stages: {} };
for (const stage of s.STAGES) out.stages[stage] = { rootByLink: wants(stage, { root: [LINK] }), rootNamed: wants(stage, { root: [user("a@example.com", "reader")] }) };
out.itemsNotByLink = wants("Develop", { root: [], previews: [], file: [user("a@example.com", "reader")] });
out.noWriter = Object.fromEntries(s.STAGES.map((st) => [st, wants(st, { root: st === "Review" || st === "Public" ? [LINK] : [], extractions: [LINK, user("r@example.com", "reader")] })]));
const LINK_EDIT = { id: "anyoneWithLink", type: "anyone", role: "writer" };
out.linkEditIsWrong = wants("Develop", { extractions: [LINK_EDIT, user("o@example.com", "owner")] });
out.linkEditNamesItsPermission = s.corrections("Develop", items({ extractions: [LINK_EDIT, user("o@example.com", "owner")] }), STORE)[0]?.permission;
out.linkEditOnlyIsNoWriter = wants("Develop", { extractions: [LINK_EDIT] });
out.linkEditElsewhere = wants("Review", { root: [LINK_EDIT], data: [LINK_EDIT] });
out.ownerIsWriter = wants("Develop", { extractions: [LINK, user("o@example.com", "owner")] });
out.unreadable = s.corrections("Develop", [{ kind: "previews", id: "p", label: "Previews", perms: null }], STORE).map((c) => [c.kind, c.how]);
out.missingItemsSkipped = s.corrections("Develop", [{ kind: "root", id: "r", label: "the root", perms: [user("a@example.com", "writer")] }], STORE).length;
out.permissionToRemove = s.corrections("Develop", items({ root: [LINK] }), STORE)[0].permission;
out.stageOf = {
  fileFive: s.stageOf({ stage: "Analyze" }, { stage: "GT" }), todayGT: s.stageOf({}, { stage: "GT" }), todayNull: s.stageOf(null, {}),
  todayOther: s.stageOf({ stage: "Elsewhere" }, { stage: "Published" }),
};
out.people = s.people(items({ root: [LINK, user("m@example.com", "writer"), user("v@example.com", "reader")],
  extractions: [user("v@example.com", "writer"), user("o@example.com", "writer")] }));
out.links = s.corrections("Develop", items({ root: [LINK], file: [] }), STORE).map((c) => c.link);
console.log(JSON.stringify(out));
