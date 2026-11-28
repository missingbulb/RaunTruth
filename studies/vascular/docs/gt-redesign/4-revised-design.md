# Revised design: the owner's answers and the review folded into the design

This file starts from [2-design.md](2-design.md) and lists only what changes. It folds in the owner's answers of
2026-11-28 and the [review](3-review.md)'s changes that those answers leave standing.

## The owner's answers (2026-11-28)

| Question | Answer | What it overturns |
|---|---|---|
| Structure inside a region | **Four tasks per region**: Doubts → Junctions → Gaps & missed → Vessels, one item at a time, Back allowed, letter keys | The one-pass area (2026-11-07) and the F/J keys (2026-11-15) |
| Missed vessels | **An explicit claim**: a region counts as checked only when the person says so, after the slices were stepped through | "No button saying no vessel was missed" (2026-11-07) |
| Width ground truth | **Every vessel, a card each** | Today's "These widths look right", which records the widths nobody touched as looked at |
| Next step | **Revise, then a paper test** before any page code | |

## Changes from the design

### Keys: verdicts on letters only, the left hand on the keyboard and the right hand on the mouse

**As built** (`req/vascular/truth/keys`), the owner's rule of 2026-11-15 stays: F and J are the box's first and second
answers in every study's tasks, so F is Keep, Junction or Agree, and J is Reject, They cross or Not a vessel. Q is
can't tell, Space the step's own button, S skip, B back, `,` and `.` the slices, − and + the width, ⌫ its reset. The
table below was the proposal before that reconciliation.

| Task | Keys |
|---|---|
| Doubts | **D** keep (a vessel) · **X** reject |
| Junctions | **D** branch · **C** crossing · **X** cut · **Q** can't tell |
| Gaps (a suggestion) | **D** accept · **X** no |
| Gaps (the free look) | **F** nothing else missing, offered only once every slice has been seen |
| Vessels | **D** agree · **A** narrower · **S** wider (0.25 µm each) · **X** not a vessel · **Q** can't tell |
| Every task | **Space** skip · **Shift+Space** back · **,** and **.** step a slice · the number keys hold the views, as today |

There are no Enter, Delete or Backspace verdicts. On a Mac laptop the key labelled delete sends Backspace (review
story 7). **X** means "not this" in every task, and **D** means "the algorithm's answer is right".

### Widths: one card per vessel, built so the card cannot be passed on reflex

The owner chose a card for every vessel over the review's blind sample. The card is changed so that Agree carries
evidence:

- **The edge convention is drawn.** The profile shows a horizontal line at half its height, labelled `edges at
  half height`, and tick labels every µm. The dashed edges are drawn where that line meets the curve: the
  measured width, not the algorithm's. The algorithm's value is written beside them but not drawn. A vessel whose
  half-height width is under 2 µm (about the optical resolution) says `at the resolution limit`.
- **D agrees with the measured width**, not with the algorithm's number. When the two differ by more than 15%,
  the facts line says so in bold before D is offered.
- **D is offered only once the vessel has been shown whole.** The main view draws the current vessel thick from end
  to end, and the card shows its straightened strip. The strip moves into the first version (the design had
  deferred it).
- **Q can't tell** is recorded as its own status (`width.how: "unclear"`) and is left out of the width score. It is
  not silence.
- The statuses in the file: `set` (stepped or dragged), `measured` (D on the measured width), `unclear`, or none.
  None means nobody said anything, and it never reads as agreement.

### Junctions: evidence, not the algorithm's verdict

- Each arm's depth is written **at the end of that arm** in the crop. There is no list of four numbers.
- The `suggests crossing` line and the pre-drawn pairing are dropped. Pressing **C** draws the pairing it will apply,
  and **C** again confirms it. Tab picks another pairing.
- Holding **E** colours the crop by depth.
- **Junctions closer than two vessel widths are asked about as one item**, so a crossing the algorithm turned into two
  3-arm junctions is caught once.
- **Q can't tell** is recorded on the junction and left out of COUNT's score.

### Gaps and missed vessels: the claim must be earned

- Faint-vessel suggestions (ridge traces not covered by the graph) move into the first version.
- During the free look the card shows `slices seen 7 / 12`. **F Nothing else missing** turns on only once every slice
  has been seen. The file records, for each region, the slices seen and the seconds spent.

### The main view and the left bar

- The current item is drawn whole: the vessel thick from end to end, or every arm of the junction. Within a region
  the camera stays still.
- A region that is done is **blacked out**, as the owner's rule says. The design's hatch is dropped. The blackout
  covers only the region's own cell, so the neighbours' graph still shows in the margin at 40%.
- The area map stays at the **top left**, as today.
- While tagging, the boxes above the tasks (Image, Analysis, Execute) fold to one line. The chips sit on one row,
  and the Summary box stays visible.
- Colours: the current item is ringed green, the edit-history ring colour today's model view already uses
  (magenta is today's "unchecked width"). Each task keeps its colour in the bar only, never on the image.
- The suggested start cell starts the walk, and "region n of 16" counts in the order the work is done.

### Coverage and time

- A region can end after its first three tasks as **graph checked**. That is ground truth for COUNT and MEASURE while
  its widths wait (review change 7).
- Estimate: **about 2¼ h for a median stack**, from textbook seconds. The paper test measures it.

## Still to settle (the owner's, asked once the paper test has numbers)

- Whether a graph-checked region counts as ground truth for COUNT and MEASURE before its widths are done.
- Whether "can't tell" junctions and widths are left out of the score (as above) or sent back to be asked again.
