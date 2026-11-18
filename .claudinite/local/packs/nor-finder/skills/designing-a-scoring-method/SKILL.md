---
name: designing-a-scoring-method
description: Designing, validating or improving how a study scores its algorithm against ground truth (its score(answer, truth) and SCORING). Use when a study gets its first scorer, when the owner questions what its precision and recall mean, or when an algorithm's real progress fails to move its score.
metadata:
  body: workflow
---

# Designing a scoring method

A study's score is what every iteration of its algorithm is steered by, so it must reward each step that brings an
answer nearer the ground truth and never treat a near miss as a total one. "Still not right, score zero" stops a
search the moment it is close. The scorer lives beside the algorithm, as the study's `score(answer, truth)` and
`SCORING` (lab/README.md), and its output is the precision and recall the page shows.

## 1. Start from the owner's directions and the two shapes

- Write down, before anything else, the directions the owner gave for this scorer, in their own words. They
  outrank everything below; where research or validation argues against one, bring that to the owner rather than
  dropping it.
- Name the answer's shape (what one version returns) and the ground truth's (what the page's ground-truth file
  holds, read from a real submitted file, not from the page's code), and the unit that is counted: a book, a node,
  a vessel.
- Take the ground truth as right, and score every element of it the same whatever its origin: one a person added
  and one the algorithm proposed and a person kept are equally truth, so no tolerance, weight or rule depends on
  who marked it. An element's own state is fair to score (one marked undecided, one with no label); its history is
  not.

## 2. Hypothesize the error types and the matching types first

Before any formula, write two tables in the report.

- **Error types**: every way an answer can be wrong, each at a few severities. Cover at least: a unit missed,
  a unit invented, a unit found but placed off (a little, a lot), one unit split into two, two merged into one,
  a unit right in one part and wrong in another (its outline right and its label wrong, or the reverse),
  a duplicate, the whole answer shifted or scaled, an empty answer, and ground truth that is itself incomplete or
  unlabelled. Add the ones this task has.
- **Matching types**: how an answer unit can be paired with a truth unit, strongest evidence first (an exact
  label, a fuzzy label, a large overlap, a nearest one), and what each pairing is worth.
- For each row, the score movement it should cause: perfect scores 1, an empty answer 0, and **every** fix of one
  error moves the score up, by more for a bigger fix. A row whose intended movement is "nothing until fully right"
  is the failure this skill exists to prevent; rewrite it as partial credit.

## 3. Research how this kind of output is scored

- Read the study's own literature summaries (`studies/<study>/docs/literature/`) for how its field reports
  results.
- Search online for how comparable outputs are scored: detection and segmentation benchmarks, text recognition,
  tracing and graph matching, and the losses ML training uses for the same output. Prefer the primary source (the
  benchmark's paper or its evaluation code) over a summary.
- Record each source under `## Sources` in the report, with its URL and the date read, and say which idea came
  from it and which ideas were weighed and turned down.

## 4. Design the scorer

- Pair units in stages, the strongest evidence first: pair what the strongest signal pairs, take those out, then
  pair the rest by the next signal, and so on, each pairing one-to-one.
- Give partial credit as soft counts: a paired unit adds its quality (0 to 1) to `tp` and the rest of its weight to
  `fp` and `fn` as the error says; an unpaired answer unit is `fp`, an unpaired truth unit `fn`. Precision is then
  `tp / (tp + fp)` and recall `tp / (tp + fn)`, as the lab sums them over images.
- Make every constant a measured or stated scale (a tolerance in the image's own units, a fraction of a unit's
  size), never a pixel count tuned to today's images, and give each its reason in a comment.
- Write `SCORING` as the page shows it: a short Markdown outline of pseudo-code, a few bullets a person reads in
  half a minute, every number in it the scorer's own.

## 5. Validate it before trusting it

- **Perturbation tests**: from real ground-truth files, build answers carrying each error type at rising
  severity, and assert the score falls monotonically with severity, rises with each fix, is 1 for the truth
  itself, 0 for an empty answer, and does not change when units are reordered. These go in the study's tests.
- **Real runs**: score every version the lab registers on the real ground truth (`python3 lab/run.py STUDY`), and
  compare the new ranking and the old. Look at the images where they disagree most and say which is right.
- **Show where it breaks**: render the pairings over one image (matched, partly matched, missed, invented) and show
  it in the conversation before quoting numbers.

## 6. Land it as a change of definition

- A new scorer redefines precision and recall: that is the owner's call, never a tuning step. Put the old and the
  new numbers for every version side by side to the owner, with the validation, and switch only on their word.
- Once switched, re-measure every version under the new definition (`python3 lab/run.py STUDY --write`); never
  carry old numbers on under the new name.
- Keep the report (error types, matching types, sources, what was turned down, the validation) as
  `studies/<study>/docs/scoring.md`, so the next change starts from it.
