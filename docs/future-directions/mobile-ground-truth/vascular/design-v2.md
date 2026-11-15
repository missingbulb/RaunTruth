# Vascular phone tagging, v2: after the efficiency review

Supersedes `design.md` where they differ; what v1 says about the ledger, entry and quality control
stands. Mockup: `mockup-v2.html`. Counts are the review's, measured on v5's drafts. Every second is
still a guess, the review's depth probe is unvalidated, and nobody has answered a question yet.

## What changed, and why

| change | why (review finding) |
|---|---|
| **Three rounds**, not one prepared deck: 1 what exists, 2 junctions on the settled model, 3 each area's last look. The lab redraws the model from the answers between rounds | An answer changes the graph under later questions (a rejected branch merges its neighbours, a join makes a junction); precomputing both branches of every answer is not practical, and it keeps "nothing computed on the phone" true |
| **One question per dead end**, three answers (not a vessel / goes on to the ring / ends here) | v1 asked the branch in Q1 and its tip again in Q2 |
| **Ends at the stack's top or bottom are settled without asking** (below) | 18 to 63% of interior tips sit there |
| **"Join or only cross?" is split in three** (next section) | One blurred peak at 66 to 85% of junctions: the eye cannot answer |
| Depth: the strip plays only the item's own 9 slices; two step buttons, no slider; outlines and paths blink, nothing is held; the flattened picture is the main picture for gaps | 24 slices took 9.4 s a loop; 8 px per slice under a 32 px knob; a hold occupies the answering thumb; a gap is dark in a thin slab |
| The depth veto is a **slope** (slices per µm of gap), never "6 slices apart" | 53 to 77% of near tip pairs differ by 4 slices or more |
| Tap-to-trace becomes **touch, see it enlarged, lift to mark**; the lab traces between rounds | A fingertip covers 6 to 8 capillary widths, and tracing was phone compute |
| Decks cut at about 40 answers, not per area | Areas run from under 10 to about 100 answers |
| **Dropped from the first build**: caliber question, "is the line on the vessel?", ordering by `p(1−p)`, early stopping, asking every deleted edge (30 sampled per stack instead) | Bins are not set and 83 to 95% of edges are under 5 µm; a 2-slice depth error is invisible in a ribbon; `confidence` is a ranking, not a probability |
| COUNT needs a **named counter that dissolves two-way points** after a rejection | `model.js` `edges()` keeps the rejected segment in the incidence. The desktop has the same gap, so this is a study requirement, not a phone one |

## Junctions: what replaces the question depth cannot answer

Three observations decide the design.

1. **A crossing seen from above has four arms.** Two vessels passing each other project as an X: a
   four-way node, or two three-way nodes a vessel's width apart. A lone three-way node can be a
   crossing only if the passing vessel's far side was lost by the tracer. So for a three-way
   junction the first question is flat: **does the branch carry on past the vessel?**
   (mockup frame 3). No depth is read. "Stops here" leaves a join (a vessel does not end in tissue);
   "Carries on" has the lab trace the arm and the spot returns as a four-arm item.
2. **Seeing two peaks is one thing, measuring a depth is another.** The eye needs the two vessels a
   blur apart (4 to 5 slices). A vessel's depth along its length is a centroid, measurable several
   times finer than the blur, and two separate vessels cannot be closer centre to centre than the
   sum of their radii (about 3.5 µm for capillaries, about 3.5 slices). So: fit each arm's depth as a
   line over 1 to 5 widths out and read it at the junction. Arms that dive do no harm, since only
   where the lines arrive matters. Lines that arrive apart by more than touching distance, beyond
   their error: a crossing. Within it: a join. The person is shown that as a small chart and asked
   **do the two lines meet?** (frame 5).
3. **What is left is a number, not a guess.** A junction with no verdict goes to
   `unresolved_junctions`, never `checked_junctions`, and COUNT is reported as a range: each
   unresolved three-way is worth 1 segment, each four-way 2.

| junction class | per stack | what happens | recorded as |
|---|---|---|---|
| Two peaks through depth | 11 to 61 (15 to 34%, the review's probe) | Frame 4: side cut and 9-slice strip. Join / Only cross | `checked_junctions` or split: the desktop's tier |
| Three-way, one peak, the branch's depth line misses the vessel's, or signal lies beyond it | not measured; my guess 8 to 30 | Frame 3: Stops here / Carries on | "Stops": join, checked. "Carries on": to the next row |
| Four arms, one peak (and X's drawn as two close Y's) | up to 2 to 26, plus what frame 3 sends | Frame 5: Meet / Pass apart | `measured_junctions`: a person checked a measurement, one tier down |
| Three-way, one peak, nothing flagged | the bulk, about 50 to 110 | Not asked. Join | `by: "geometry"`; 10% sampled into the owner's desktop audit |
| "Can't tell" anywhere | to be measured | Not asked again | `unresolved_junctions`; widens COUNT's range |

Honesty on row 3 and 4: observation 2 is my proposal and **untested**. It fails where a profile is
clipped by the stack's top or bottom (30 to 55% of profiles), where two vessels really touch, and
if the depth error turns out near the touching distance. It has a check that needs no ground truth:
on the two-peak junctions, where the eye can see the answer, the depth lines must agree with it.
Run that before building frame 5. Row 4 rests on a stated assumption (a three-way crossing needs a
lost fourth arm); the audit is what tests it.

A cross-check the owner may want: straight lines thrown independently at v5's length density would
cross about 35 to 130 times per field (my arithmetic, indicative only). A capillary mesh in a slab
thinner than its own spacing is far from independent, so this is a ceiling, but v5 finds only 2 to
26 four-way nodes: worth knowing how many X's sit in the model as two close three-ways.

**Where I disagree with the review.** (a) "Unanswerable by anyone on any device" holds for the eye
on pixels, not for a measurement: observation 2. (b) Its substitute "which two arms are one vessel?"
presumes a crossing. At a real bifurcation it has no right answer, and a three-arm crossing lacks
the arm to pair; "carries on?" asks the thing that is actually in doubt. I adopt everything else.

## Ends that leave the slab

A dead end is settled as "leaves the slab" without a question when its depth is within 1.5 slices
of the stack's top or bottom **and** its depth slope over the last few widths heads outward. It is
then a vessel cut off by the block, exactly as a tip on the image border is cut off by the frame:
the segment counts, no join is searched for. Recorded `by: "auto"`, with 5% sampled into ordinary
dead-end questions to measure how often the rule is wrong. A boundary tip whose slope runs level is
still asked. Caveat: depth is least reliable exactly at the boundary (clipped profiles).

## Task table

| round | question (frame) | shown | answers | per stack | s |
|---|---|---|---|---|---|
| 1 | Dead end: what is it? (2) | Flattened crop, outline and proposed path blinking; the piece's ribbon beside the same ribbon turned a quarter | Not a vessel / Goes on / Ends here | 45 to 140 | 5 |
| 1 | Vessel or not? (v1's) | Same picture, no path | Vessel / Not | 60 to 110: candidates, bridged, short-loop edges, 30 sampled deletions | 3 |
| 2 | Carries on past the vessel? (3) | Flattened crop, dotted lane beyond | Stops here / Carries on | 8 to 30 (guess) | 4 |
| 2 | Join or only cross? (4) | Top view, side cut, 9-slice strip with step buttons | Join / Only cross | 11 to 61 | 5 |
| 2 | Do the lines meet? (5) | Top view, depth chart with error bands | Meet / Pass apart | 2 to 30 | 5 |
| 3 | Everything drawn, nothing else? (6) | Area from above, lines blinking, enlarged spot under a resting finger | Looks right / Something's off | 16, plus about 30 traced pieces as "Vessel or not?" | 10, 3 |

Every question keeps Back and Can't tell.

## Throughput

About **175 to 410 answers and 15 to 30 minutes per stack per person** (v1: 416 to 683 and 38 to
60), in 5 to 10 decks over three rounds. The review's own estimate for its changes is 230 to 310
and 24 to 34 minutes; mine is wider because the boundary-tip share and the frame-3 count are not
measured per stack. The new cost is waiting: a round opens only after the lab has redrawn the
model, so a stack takes three sittings, not one.

## Tier

| part | v2 |
|---|---|
| Edge exists | Desktop's tier per item (owner's verdicts), given a geometry-to-segment resolver with a stated tolerance |
| COUNT | Desktop's tier **as a range**: the count, with the unresolved junctions' worth beside it. Auto-settled items (`geometry`, `auto`) are labelled and audited, never merged unlabelled |
| Junction verdicts | Two-peak: desktop's tier. Chart-based: one tier down, a checked measurement |
| Caliber | The measurement's own tier; no human verdict in the first build |
| Length | Checked existence, unchecked curve: depth along every curve is unverified on the phone |
| Recall | Weaker, marked `by: "phone"`; faint misses remain a desktop claim |

## New questions for the owner (beside v1's)

1. Who runs the lab between rounds, and where (each is a network call to approve)?
2. Is "a three-way junction with nothing flagged is a join" acceptable as a labelled, audited default?
3. Is a COUNT reported as a range acceptable ground truth, or must every unresolved junction go to the desktop?
4. The first test is unchanged and now sharper: 30 junctions by the owner's eye, two-peak and one-peak mixed, with the depth chart beside each.
