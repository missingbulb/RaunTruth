// The five stages (req/shell/study/stage): what each opens and closes of the page's actions, in one table the shell, Study Setup and
// Data Management read through stageAllows. The table is the map's (dev/requirements/study-stages-map.md, The stages) in the rows the
// page has a control for, held to it by web-tests/test_stage_table.py through web-tests/stage_table.json.
"use strict";

export const STAGES = ["Setup", "Develop", "Analyze", "Review", "Public"];

// per action, open (1) or closed (0) in each stage, in the order of STAGES. view and own-images are open in every stage: who may use them
// is the store's sharing (members, anyone with the address, everyone), not the stage
const TABLE = {
  "setup-data": [1, 1, 1, 0, 0],
  view: [1, 1, 1, 1, 1],
  "own-images": [1, 1, 1, 1, 1],
  annotate: [1, 1, 1, 0, 0],
  mark: [0, 1, 1, 0, 0],
  batch: [1, 1, 1, 1, 1],
  numbers: [0, 1, 1, 1, 1],
};
export const ACTIONS = Object.keys(TABLE);
// what a study outside the model, one with no stage (the Image Viewer), has
const OUTSIDE = ["view", "own-images"];

// Whether the stage opens the action; a study with no stage is outside the model: nothing is annotated, marked, run in batch or kept in it
export function stageAllows(stage, action) {
  const k = STAGES.indexOf(stage);
  if (!(action in TABLE)) throw new Error(`no action "${action}" in the stage table`);
  return k < 0 ? OUTSIDE.includes(action) : !!TABLE[action][k];
}

// The stage of a study: its study file's when that is one of the five, else the study.json's own, else Develop
export const stageOf = (file, own) => [file?.stage, own?.stage].find((s) => STAGES.includes(s)) || "Develop";
// whether a stage is one the study's data is frozen in
export const frozen = (stage) => !stageAllows(stage, "setup-data");

// the traffic light of a stage in the switcher, what it means, and what moves a study on from it
export const LIGHT = { Setup: "red", Develop: "yellow", Analyze: "green", Review: "blue", Public: "all" };
export const WHAT = {
  Setup: "The study's inputs are being marked and its first algorithm and annotation tool built. Annotating is open for trial: nothing counts.",
  Develop: "Annotations score the algorithm: the owner marks them GT and each version's precision and recall is recorded.",
  Analyze: "Annotations replace the algorithm's answer in the study's numbers, and batch runs make its results.",
  Review: "The results are frozen: the ground truth is committed and the official scores published. Marking and data are closed.",
  Public: "The study is published and listed for everyone, its results as they were frozen.",
};
export const NEXT = {
  Setup: "To move on to Develop: the inputs are marked and an annotation tool works.",
  Develop: "To move on to Analyze: the owner judges the analysis valid.",
  Analyze: "To move on to Review: the owner calls the results final.",
  Review: "To move on to Public: the article is accepted.",
  Public: "This is the last stage.",
};
export const next = (stage) => STAGES[STAGES.indexOf(stage) + 1] || null;
export const before = (stage) => STAGES[STAGES.indexOf(stage) - 1] || null;

// What the page measures of a stage's gate, as lines for the stage popup. facts: {images, gt, official}, how many images the study's index
// lists, and how many of them carry a GT mark and an official mark; null where the page could not read them
export function gates(stage, facts) {
  if (!facts) return [];
  const { images, gt, official } = facts, many = (n) => `${n} image${n === 1 ? "" : "s"}`;
  if (stage === "Setup") return [`${many(images)} in the study's index.`];
  if (stage === "Develop") return [`${gt} of ${many(images)} ${gt === 1 ? "has" : "have"} a GT mark.`];
  if (stage === "Analyze") return [`${official} of ${many(images)} ${official === 1 ? "has" : "have"} an official mark.`];
  if (stage === "Review") return [`Frozen with ${gt} GT mark${gt === 1 ? "" : "s"} on ${many(images)}.`];
  return [];
}

// The popup's line for each action open to this user. may: {save, manage}, what the store lets them do; facts as above
export function lines(stage, may, facts) {
  const out = [];
  if (stageAllows(stage, "view")) out.push(["view", "View the study's images and run its algorithm on them."]);
  if (stageAllows(stage, "own-images")) out.push(["own-images", "Run the algorithm on your own images, in this browser: nothing leaves the device."]);
  if (may.save && stageAllows(stage, "annotate")) {
    const need = facts ? facts.images - facts.gt : null;
    out.push(["annotate", need == null ? "Annotate: open"
      : need === 0 ? "Annotate: every image has a GT mark" : `Annotate: ${need} image${need === 1 ? "" : "s"} still need${need === 1 ? "s" : ""} it`]);
  }
  if (may.manage) {
    if (stageAllows(stage, "setup-data")) out.push(["setup-data", "Study Setup: change the study's folders, tags and areas."]);
    if (stageAllows(stage, "mark")) out.push(["mark", "Study Setup: mark an extraction GT or official."]);
    if (stageAllows(stage, "batch")) out.push(["batch", stage === "Review" || stage === "Public" ? "Study Setup: run a batch: it counts once marked." : "Study Setup: run an algorithm over chosen images."]);
    out.push(["stage", "Study Setup: promote the study or move it back."]);
  }
  return out;
}
