# Vascular Measurements: ground-truth tagging on a phone (design exploration)

Not a requirement and not built: a proposal to react to. Mockup: `mockup.html` beside this file.
Nothing here was run on a stack; every count and time below is an estimate and says so.

## (a) What the desktop makes, what the phone must make, and its tier

**Desktop** (`req/vascular/truth/tasks`, `req/vascular/model/ground-truth`): the tagger opens an area of
the stack in 3D and edits the drawn model there (drag points, delete, add a bend, connect, split a
junction into a crossing, draw a missed vessel, keep a faint line), gives every junction a verdict,
and presses "Area is right". Submit exports one corrected `vessel-model/2` file: each edge's `state`
beside `proposed`, `checked_junctions`, `reviewed_regions`, the moved and drawn geometry. That file is
the study's only full ground truth, and the three locked metrics are read off it: COUNT = its live
edges, MEASURE = the sum of their curve lengths, CATEGORIZE = each edge's width.

**Phone**: no model editing at all. The phone collects **verdicts on questions the extractor poses**,
and the corrected model is *recomposed* by replaying those verdicts onto the draft with the edits
`web/model.js` already has (`review`, `decide`, `splitJunction`, `checkJunction`, `connect`, `attach`,
`drawSegment`). Two things follow.

1. **The stored thing is a verdict ledger, anchored to geometry, not to model ids.** One record per
   answer: question type, the geometry it was about in µm (a curve, a point, a pair of points), the
   answer, who, when, how long, which draft version asked. This is the shape
   `analysis/extraction/labels/fable-v1.json` already has (a curve and a verdict), so the ledger
   (i) replays onto the draft to give a `vessel-model/2` file, and (ii) grades any extraction version
   through `fake_truth.grade` unchanged, replacing the model-judged labels with human ones. A ledger
   tied to ids would die with the next extractor version; one tied to geometry does not.
2. **What the phone can and cannot certify:**

| part of the ground truth | phone | tier against the desktop file |
|---|---|---|
| Which edges exist (accept, reject, bridge) and which junctions are real: **COUNT** | every item gets a verdict | **Same tier, per item**, when the verdicts are the owner's. From helpers: per-item but *provisional* (see e), a label set of its own, never one series with the owner's |
| **Caliber bin** per edge | bin verdict where the measured width is near a bin edge, measured width elsewhere | Same tier for the bin; no corrected radius value (the desktop has no radius edit either) |
| **Centerline geometry**, so length per edge | checked ("the line is on the vessel"), never corrected | **Weaker**: "verified, not corrected". An edge whose line is judged off is listed for the desktop, and its length is left out of the certified total until fixed |
| **Misses** (recall), `reviewed_regions` | a tap seeds a traced proposal; the tile check closes the area | **Weaker for faint vessels**: a 165 µm tile on a phone in daylight is a worse detector than the desktop's Missed view. Marked `reviewed_regions[].by: "phone"` so a consumer can tell |
| Damaged sample (`excluded_regions`) | flag only | Not made on the phone (Data Management's, `req/shell/data/edit`) |

So: **topology and caliber bins at the desktop's tier; geometry and recall one tier down, with the
remainder routed to a short desktop queue** rather than faked. The honest name is a two-device
ground truth: the phone does the many small decisions, the desktop the few that need a drag.

## (b) The micro-tasks, in order

Order is by dependency, since an early answer deletes later questions (a spur judged noise removes its
junction; a tip that connects is no longer a tip). All of one area's questions run before the next
area's (`req/vascular/truth/order`): an area is one **deck**, about three minutes.

Renderings used: **slab** = brightest-over-depth of only the slices within the item's own depth
± 2 slices (`AXIAL_HALF_SLICES`), so vessels above and below drop out; **ribbon** = the image resampled
along the edge's curve and across it, the vessel straightened into a horizontal band
(`score.sample_edge` + `normals` + `at` already do the sampling); **depth strip** = a slider through
the slices that plays back and forth by itself; **side cut** = a reslice through depth along a line
(the existing "Look at it from the side", flattened to a picture).

| # | question | shown | answers | extraction it needs | s / answer | effect on the metrics |
|---|---|---|---|---|---|---|
| 1 | **Vessel or not?** A short dead-end branch, a low-confidence candidate, a short loop's weakest edge, an edge the extractor bridged | Slab crop about 60 µm across with the piece between two slim white edges; under it the ribbon. 2D is enough | Vessel / Not a vessel | *Existing*: candidates (`vessel_model.py`), dead-end line evidence (`v4.evidence`), loop edges (`v2.break_short_loops`), `bridged`. *New*: keep the edges v2 to v5 **deleted**, with their scores, as questions instead of dropping them | 3 | Rejecting a dead end off a 3-way junction: **count −2** (the branch, and its two neighbours become one). A lone piece: −1. A link between two 3-way junctions: −3. Length −its length |
| 2 | **Is A to B one vessel?** An open end inside the frame and the best place it could continue to (another end, or the side of a vessel) | Slab crop about 80 µm across, both points ringed, no line drawn across the gap (it would cover the evidence). Depth strip with A and B ticked at their own depths. **Needs z**: two ends 6 slices apart do not join | Connected / Separate | *Existing*: `v2.bridge_gaps`, `v3.geodesic_bridges` find and score the joins. *New*: return the **ranked candidates that failed the cut** (and the ones that passed, to verify) instead of only applying the winners; one or two per open end | 6 | End to end: **count −1** (two pieces become one), length +the gap's path. End onto a vessel's side: **count +1** (a new junction splits the vessel) |
| 3 | **Join or only cross?** Every junction that survives 1 and 2 (the desktop asks every one too) | Crop from above in depth colour with the junction ringed; side cut along the straightest pair; depth strip. **The question that is about z** | Join / Only cross | *Existing*: `v2.split_crossings` (4-way only), the spike's per-slice test `trace_vessel_graph.split_crossings`/`slice_groups`. *New*: a depth gap and a "one slice shows both" score per junction, to order the questions and to pre-pick the side cut's line | 8 | A 4-way junction that is a crossing: **count −2**. A 3-way one: −1 and a new open end (which goes to question 2). Length unchanged |
| 4 | **Is the line on the vessel?** Only edges whose fit strays (snap distance, bridged, traced from a tap) | Ribbon from above and, under it, the ribbon through depth with the model's depth drawn: a right line is a straight band in the middle of both | On it / Off it | *New, small*: the depth ribbon (resample the stack along the curve, z up). The fit residual already exists in `fit_curve` | 3 | None directly: "Off it" moves the edge to the desktop queue and its length out of the certified total |
| 5 | **How wide?** Only edges whose measured diameter is within its own error of a bin edge | Ribbon at native resolution on the slice where the vessel is sharpest, two cyan rulers at the bin edges | three bins | *Existing*: `score.profile_radius`, `taper` (`r_a`, `r_b`). *New*: the sharpest slice per edge, and the width's error (spread of the profile along the edge) | 4 | **Caliber bin** of that edge. Count and length untouched |
| 6 | **Is every vessel here drawn, and nothing else?** One per area, last | The whole area from above, model lines slim in magenta. Hold = lines off; a second look in "Missed" (signal outside the model's tubes, `web/coverage.js`) | Looks right / Something's off (after tapping the spot) | *Existing*: coverage tube. *New*: **tap to trace**: from the tap, snap to the brightest ridge within a finger's radius, then v3's geodesic both ways to the model; the result is a question-1 item asked at once | 10, +5 per tap | A traced miss joined at both ends: **count +3**, length +its path. "Looks right" writes `reviewed_regions` and accepts the area's confident edges, as "Area is right" does |

**What is deliberately not asked.** A confident, well-supported edge is never shown alone; it is
accepted by question 6, as on the desktop. Pairwise "which is wider?" is rejected for caliber: the
bins are absolute µm, a ranking does not give them, and people verify a ruler better than they
estimate a size. A rocking 3D animation is rejected as the main depth cue: it costs a renderer and
judging it takes longer than the strip; the strip plus the side cut carry the same information as
still pictures.

**2D or z.** Questions 1, 4 (top ribbon), 5 and 6 are answerable from a slab or a slice. Question 3 is
z by definition, and question 2 needs z as a veto. Depth is always shown three ways, so none is
relied on alone: colour (useless to a red-green colour-blind helper if the palette is red to green:
a question for the owner), the strip, and the side cut.

**Ordering inside a deck (which answers first).** Within a question type, by expected change to the
count: `p(1−p) × |Δcount|`, with `p` the extractor's own score for the item and Δcount from the
last column. Plaza's focused proofreading orders yes/no merge decisions the same way, greedily by
impact on the measure [1]. Consequence worth the owner's attention: a stack can be stopped early,
when what is left can move the count by less than a stated share. That would be a third, weaker tier
("bounded"), and is offered as a question, not assumed.

**Volume (estimate, not measured).** From the first draft of frontal r1 (136 junctions, 222 ends,
so about 300 to 350 edges) and the ledger's 1 to 1.75 open ends per junction: about 160 question-1
items, 150 question-2, 140 question-3, 20 question-4, 80 question-5, 16 areas. About **570 answers,
50 to 60 minutes of answering per stack per person**, in about 18 three-minute decks. With three
helpers per question it is about 3 person-hours per stack. These numbers are indicative only: the
counts are v1's, the seconds are guesses, and both need one measured pilot deck.

## (c) Entry

1. A link (`rauntruth.com/vascular/tag`) or the same page added to the home screen. It opens on the
   last stack with one button, **Continue: Area 7**, in the thumb's reach. Target: first question
   within 5 s of the tap.
2. **Nothing is computed on the phone.** Execute takes a minute or more on a desktop and needs the
   35 MB stack. A deck is prepared beforehand (by the desktop page after Execute, or by the lab):
   the area's 8-bit sub-volume with a margin (about 340 × 340 × 12 to 24 voxels, 1 to 2 MB before
   compression; `export_stack_view.py` already writes such volumes) plus its questions as JSON. Every
   picture above is drawn on the device from that sub-volume with a 2D canvas, so holding a depth,
   hiding the outline and pinching all work offline.
3. First time only: who is answering (a name the owner gave out), then 10 practice questions with
   the answer shown after each. After that, no tutorial screen ever again.
4. Answers are kept on the device and sent when there is a connection; a deck is resumable
   mid-question (the shell's draft, `req/shell/ground-truth/draft`, is the model for this).
5. Controls: answer buttons at least 92 px tall in the bottom third, same side every time, equal
   weight; Back (any distance, as on the desktop) and Can't tell as small links under them; no
   swipe-to-answer by default (a pocket or a bump answers too). About half of phone use is
   one-thumbed and the bottom of the screen is the reachable part [5].

## (d) Misses, caliber and length

- **Misses.** Three nets, coarse last. (i) The extractor's own fainter tracing already turns likely
  misses into candidates, asked as question 1. (ii) Rejected-by-the-extractor edges come back as
  question 1 too (new). (iii) Question 6's tap-to-trace. A finger never draws a vessel: it points,
  the tracer draws, a person confirms. What a tap cannot trace (no ridge to follow) is recorded as a
  spot for the desktop and the area is **not** marked reviewed. Recall on faint vessels stays the
  phone's weakest claim.
- **Caliber.** The edge's width is the extractor's measurement (`r_a`, `r_b`); the phone settles only
  the bin, and only where measurement error could flip it. STATUS says the current split over-calls
  arteries about 3×, so a random 5% of the *not* asked edges are asked anyway: that sample measures
  how often the measurement alone gets the bin right, a number the study does not have. Bin edges
  are the owner's to set (question f3).
- **Length.** Total length = the sum over accepted edges of the model's curve length, in 3D at the
  owner's 1 µm slice spacing. The phone changes it through accept, reject, bridge and traced misses;
  it does not change a curve. The curve is already held within half a vessel width of the
  centerline and 2 slices in depth, so its error is second-order beside a wrong accept; question 4
  catches the cases where it is not. Report the certified length (edges "on it" or not flagged) and
  the pending length (edges "off it") side by side, never summed silently.

## (e) Quality control

- **Check questions with known answers**, about 1 in 10, indistinguishable from the rest. They can
  only come from a stack the owner has corrected: replay the draft's questions against the owner's
  file and the answers fall out. **Until one owner-corrected stack exists there is no gold**, and the
  model-judged labels must not stand in (they are a model's, not the owner's). Bootstrap: the owner
  answers the first decks, on the phone or the desktop.
- **Weight each helper by their record on the check questions, per question type.** Stall Catchers
  does this for its flowing/stalled vessel movies and reports the weighted crowd answer as accurate
  as a trained technician with about seven answers per vessel on average [2][3]; EyeWire found the
  consensus more accurate than any single player [4]. Here: stop asking once the weighted agreement
  passes a threshold (expected 2 to 4 answers), and send what does not converge to the owner as a
  deck of its own, which is still thumb work.
- **Unlock by type.** A helper gets question 3 only after passing its practice set; it is the
  hardest and the costliest when wrong.
- **Can't tell is an answer**, never a failure: it routes the item to the desktop, and its rate per
  question type is the first health number of the whole scheme.
- **Cheap honesty checks**: the same item again later, turned or mirrored (the model must not
  depend on orientation, so the answer must not either); answers faster than a floor; a helper whose
  yes-rate drifts from the gold's.
- **Provenance in the file**: every verdict carries who and how many agreed, so "the owner's" and
  "three helpers'" never merge into one unlabelled ground truth.

## (f) Open questions for the owner

1. **Is "Join or only cross?" answerable at all in these stacks?** The doc's own measurement is that
   a vessel spans 4 to 6 slices through depth and that closer than that two vessels touch from every
   angle; the working stacks are 12 to 24 slices. Before building anything: take 30 junctions from
   one stack and answer them from the mockup's three cues. If you cannot, no helper can, and
   crossings stay a desktop (or an unanswerable) item.
2. **Who are the helpers, and may they see unpublished stacks on their own phones?** That decides
   whether redundancy and weighting are needed at all (owner only: none of it).
3. **Caliber bins**: the locked definition says capillary against penetrating artery by diameter;
   STATUS proposes Stefanitsch's < 5 / 5 to 10 / > 10 µm. Which edges go on the rulers?
4. **Is "verified, not corrected" geometry acceptable as ground truth for length**, with the off-line
   edges listed for the desktop? Or must every edge's line be confirmed one by one (about 300 more
   answers per stack)?
5. **May a stack be stopped early** once the remaining questions cannot move the count by more than a
   stated share, as a named weaker tier?
6. **Depth colours**: the approved view colours CD31 by depth. A red-to-green scale fails for the
   most common colour blindness; is another scale acceptable on the phone?
7. **Area order**: the desktop walks neighbours so the next area borders the last. On a phone each
   question is a crop with no surroundings; may the areas come most-uncertain first instead?
8. Each of these is a **network call or stored thing that needs its own approval** before any build:
   where a deck is published and fetched from (the stack's Drive folder?), where answers are sent,
   what identifies a helper, and what the phone keeps offline.
9. The shell's requirements say **a phone is not supported** (`req/shell/browsers/supported`, owner, 2026-11-03).
   Is this a second, small page with its own support statement, or a change to that one?

## Sources

1. Plaza, "Focused Proofreading: Efficiently Extracting Connectomes from Segmented EM Images", arXiv 1409.1199: proofreading as yes/no decisions on proposed merges, ordered greedily by impact on the error measure. https://arxiv.org/abs/1409.1199
2. Stall Catchers (Human Computation Institute): binary flowing/stalled answers on short vessel movies; about seven annotations combined per vessel into a crowd score (arXiv 2104.01687, https://arxiv.org/abs/2104.01687). Its weighting of players by known-answer "calibration" vessels is from memory of the project's own descriptions and was not re-verified in this session.
3. "Volunteers Sped Up Alzheimer's Research", Discover: crowd answers validated as at least as accurate as a trained technician. https://discovermagazine.com/mind/volunteers-sped-up-alzheimers-research-heres-how-you-can-help-too
4. Kim et al., "Space-time wiring specificity supports direction selectivity in the retina" (EyeWire), Nature 2014: consensus by voting, more accurate than any single player. https://pmc.ncbi.nlm.nih.gov/articles/PMC4074887 ; FlyWire, Nature Methods 2022, proofreading as split and merge edits of an automatic segmentation: https://www.nature.com/articles/s41592-021-01330-0 ; Mozak (UW and the Allen Institute), consensus among several players' neuron traces: https://washington.edu/news/2017/04/24/scientific-discovery-game-significantly-speeds-up-neuroscience-research-process
5. Hoober's observations of phone grips (49% one-handed) and the thumb zone, with the caveat that the classic heat map is too rigid: https://smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users
