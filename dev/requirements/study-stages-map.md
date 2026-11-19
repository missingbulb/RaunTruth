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
- **Actor** - who takes an action: anyone, someone Drive lets annotate, someone Drive lets manage the study;
  Developer in the repo; the study's owner, who promotes. The table's role names predate the role-free decision.

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
- No role menu in the main app: Drive permissions only add actions. Before annotating, the page differs between
  someone who may annotate and someone who may not by one button, **Start Annotating** (name tentative), which
  moves the page into an annotation mode; every annotation tool shows only in that mode.
- Images hidden by tag are hidden for everyone in the main app.
- Stages are drawn per app, with no roles to carry; the draft table is re-cut then.
- **Question 0, resolved: all of Data Management leaves the main app for a Study Setup app**, a page of the same
  site opened from the profile menu's "Study Setup...", sharing the shell's code, study files and sign-in. The aim
  is simpler code, tests and requirements, not only a simpler screen. Everything moves: folders, Drive access,
  ground-truth setup, previews, tags and descriptions, hide rules, the grouping tag, areas of interest, damaged
  areas, Needs GT. Marking an image's inputs is its own step before annotating: short, purely human work, where
  annotating is the long work the algorithms exist to shorten. Study Setup shows images in the shell's plain view
  (no study algorithm, steps or item view), is online-only, and has its own requirement prefix (`req/setup/*`)
  and test folder; what both apps share stays under `req/shell`. Accepting or rejecting a submitted annotation
  stays in the main app's annotation mode. The owner expects the main app to go unused by a study's owner until
  annotating starts.

## Open questions

### 1. Is Setup / Develop / Analyze / Review / Public the right cut, per app? *(grilling)*

The apps already suggest one boundary: Study Setup carries the Setup stage, the main app everything from
annotating on. Walk NoR and Vascular through the draft table, cell by cell: where does a real study's next action
land, and does any stage have no action of its own (merge it) or two unrelated ones (split it)?

### 2. Who sees a study in each stage? *(grilling)*

Today every study is in the public switcher. Is a Setup or Develop study shown to Viewers at all, and does that
sit beside tag-based hiding (`req/shell/data/hidden`) or replace part of it?

### 3. Where does an annotation go? *(grilling)*

Annotating is one action (see Terms). Where does it land in Develop (the GT folders, scoring the algorithm)
versus Analyze (the study's results), and is the Drive permission behind Start Annotating the same in both?

### 4. Does Review need a permission of its own? *(grilling, after 1)*

Only if Review has an action no existing permission should carry.

### 5. What does each app show a person as their next action? *(prototype, after 1)*

How the stage directs work: the gate's measured conditions, and the actions open to what the user may do.

### 6. Which requirements does the redraw touch? *(research)*

List every requirement and test that reads `stage`, a role or the role menu, so the rewrite misses none.

## Not yet specified

- How today's studies, all at GT, map onto the new stages.
- What brings a study back a stage, and what it shows when it does.
- Batch execution and the numerical results view: no requirement for either exists yet.
- How the stage reaches `STATE.md` and the skills.
- Study Setup in detail: how the profile menu opens it, how it returns to the main app, which shared pieces move
  from `req/shell/data/*` to `req/setup/*`.

## Out of scope

- The Image Viewer: no stage, set apart by the owner.
- Building any of it: this map ends at agreed requirements.
