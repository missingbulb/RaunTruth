# Study stages: the map

A [Wayfinder](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md) map for #1015,
kept as this one file instead of tracker issues (the owner's choice). Each open question below is a ticket: one
question, one session, resolved in place and then moved into Decisions so far.

## Destination

`req/shell/study/stage`, `req/shell/account/role` and the requirements that hang off them are rewritten in
`requirements.md` and agreed by the owner, ready to build. Nothing is built inside this map.

## Notes

- A stage exists to **direct work**, not to describe a study: each stage is defined by the actions each actor
  can take in it, which actions it opens and which it closes.
- Load `grilling` and `domain-modeling` (Wayfinder's companions, upstream in the same repo) for every question
  marked *grilling*.
- Draft model, the owner unsure it is the right cut (question 1 tests it):

  | Stage | Study Manager | Annotator | Developer (repo) | Viewer | Out when |
  |---|---|---|---|---|---|
  | Setup | adds images, sets metadata and tags, hides | none | builds a first algorithm and the annotation tools | ? | images and metadata in, an annotation tool works |
  | Develop | manages images | annotates; the annotations score the algorithm | improves the algorithms, records each version's quality | ? | the owner judges the analysis valid |
  | Analyze | starts batch runs | annotates; the annotations correct the results | fixes only? | sees the numerical results? | the owner calls the results final |
  | Review | exports for reviewers | closed | closed | reviewers? | the paper is accepted |
  | Public | releases data, analysis, algorithms | closed | closed | everyone sees everything released | none |

### Terms

- **Annotation** - a qualified person saying what an image really shows. "Ground truth" (for developing the
  algorithm) and "correction" (for the study's numbers) are the same action; only its use differs.
- **Actor** - who takes an action: Study Manager, Annotator, Viewer on the page; Developer in the repo; the
  study's owner, who promotes.

## Decisions so far

- Destination: rewritten requirements, no code.
- Stages are redrawn; today's PreGT/GT/PostGT/Published is not kept as is.
- Drive sharing stays the only source of who holds a role; the stage decides which actions each role has.
- The page measures each stage's exit conditions and shows them; moving on stays the owner's deliberate step.
- A study can move back a stage.
- The analysis is valid when the owner judges it so; no preset numeric target for now (no good UI for one yet).
- One stage per study, each analysis inside it shown against the gate.
- A stage closes actions as well as opening them (for example a freeze in Review).
- A new role is added only where it separates permitted actions.
- The stage directs repo work too, through each study's `STATE.md` and the skills.
- The Image Viewer is out of the model.

## Open questions

### 1. Is Setup / Develop / Analyze / Review / Public the right cut? *(grilling)*

Walk NoR and Vascular through the draft table, cell by cell: where does a real study's next action land, and
does any stage have no action of its own (merge it) or two unrelated ones (split it)?

### 2. Who sees a study in each stage? *(grilling)*

Today every study is in the public switcher. Is a Setup or Develop study shown to Viewers at all, and does that
sit beside tag-based hiding (`req/shell/data/hidden`) or replace part of it?

### 3. One Annotator role for ground truth and corrections? *(grilling)*

Given the Annotation term, does Ground Truth Tagger become Annotator, and where does an annotation go in
Develop (the GT folders) versus Analyze (the study's results)?

### 4. Is there a Reviewer role? *(grilling, after 1)*

Only if Review has an action no other role should have.

### 5. What does the page show each actor as their next action? *(prototype, after 1)*

How the stage directs work on the page: the gate's measured conditions, and the open actions per role.

### 6. Which requirements does the redraw touch? *(research)*

List every requirement and test that reads `stage` or a role, so the rewrite misses none.

## Not yet specified

- How today's studies, all at GT, map onto the new stages.
- What brings a study back a stage, and what it shows when it does.
- Batch execution and the numerical results view: no requirement for either exists yet.
- How the stage reaches `STATE.md` and the skills.

## Out of scope

- The Image Viewer: no stage, set apart by the owner.
- Building any of it: this map ends at agreed requirements.
