// Runs the study's tag rules (web/tags.js) under Node, case by case, and prints each case's outcome as one JSON object
// for test_tags.py to judge.
//   node web-tests/tags_driver.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const t = await import(path.join(repo, "web", "tags.js"));
const out = {};
out.parsed = ["damaged-slide", "  Group:Wild Type ", "group:sick", "a--b", "-x", "folder:here", "folder", "x:y:z", "", "dé"].map((s) => t.parseTag(s));
out.added = [t.addTag(["group:sick", "dim"], "group:wild-type"), t.addTag(["dim"], "dim"), t.addTag([], "bright")];
// own tags, then the folder's, then the folder above it
out.effective = t.effective(["group:sick", "mine"], [["group:wild-type", "near"], ["group:old", "far", "near"]]);
out.inheritedOnly = t.effective([], [["group:wild-type"], ["group:old"]]);
out.hidden = [t.isHidden(["group:sick"], ["group"]), t.isHidden(["group:sick"], ["group:wild-type"]), t.isHidden(["dim"], ["dim"]),
  t.isHidden(["dimmer"], ["dim"]), t.isHidden([], [])];
const images = [
  { id: "1", folder: "F", path: ["Data"], tags: ["group:wild-type"] },
  { id: "2", folder: "S", path: ["Data", "sub"], tags: ["group:sick"] },
  { id: "3", folder: "E", path: ["Elsewhere"], tags: [] },
  { id: "4", folder: "F", path: ["Data"], tags: ["group:sick", "z"] },
];
const show = (gs) => gs.map((g) => [g.label, g.items.map((i) => i.id)]);
out.byFolder = show(t.groupsOf(images, null));
out.byTag = show(t.groupsOf(images, "group"));
out.names = t.multiNames(images);
console.log(JSON.stringify(out));
