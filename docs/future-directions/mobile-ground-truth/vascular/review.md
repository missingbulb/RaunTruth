# Efficiency review: phone ground-truth tagging, Vascular Measurements

Reviewed: `design.md`, `mockup.html` (360 x 740 CSS px screens), against `studies/vascular/` code, docs and the
four real stacks. Read-only: no tracked file changed. To get real counts I fetched the four CD31 stacks with the
study's own `analysis/stacks.py` (into git-ignored `data/raw/`) and ran `lab.py cmp v1 v5` (git-ignored
`analysis/extraction/runs/`). My measuring scripts were throwaway probes and are not kept.

**Trust of the numbers below.** Counts of edges, junctions, tips, widths and file sizes are measured on v5's
drafts. The depth figures (blur, "two peaks", tip depths) come from throwaway probes of mine, unvalidated against
any eye: indicative only. Every time figure is the design's own guessed seconds multiplied by real counts; no
person has answered a single question.

## Verdict in one paragraph

The decomposition is sound and its volume estimate holds (real: 416 to 683 answers, 38 to 60 min per stack at the
design's own seconds). Three things do not hold at phone size or in these stacks: (1) "Join or only cross?" is
unanswerable for roughly 65 to 85% of junctions by anyone on any device, because the axial blur (4 to 5 slices
at half peak) is as large as the gap between two capillaries that pass each other; (2) the depth cues are
slower than claimed on 24-slice stacks and the "6 slices apart do not join" veto is wrong for this data;
(3) questions 1 and 2 ask about the same dead-end branch twice. Fixing 1 and 3 cuts about 40% of the time and
removes the one question a helper cannot answer.

## 0. Claims checked

| claim in the design | finding |
|---|---|
| `model.js` has `review`, `decide`, `splitJunction`, `checkJunction`, `connect`, `attach`, `drawSegment` | True. All take segment indexes or node ids, so the geometry-to-id resolver is new work |
| `fable-v1.json` is "a curve and a verdict" in µm; `fake_truth.grade` grades by geometry | True (2D `curve_um`, no z; coverage within 2.5 µm over half the length). A ledger with z or with junction or pair records needs `grade` extended: "unchanged" holds only for question 1 |
| z-step 1 µm; working stacks 12 to 24 slices | True: `view.spacing` 1.0 (owner, 2026-10-29); stacks are 12, 18, 24, 24 slices, all with signal |
| A vessel spans 4 to 6 slices | Confirmed by my probe: median 4, 4, 5, 5 slices at half peak. 30 to 55% of profiles are clipped by the stack's top or bottom |
| "136 junctions, 222 ends, 300 to 350 edges" | That is the 2026-10-03 first draft. v5 on the same stack: 196 edges, 75 junctions, 144 tips (130 inside the frame) |
| Sub-volume "340 x 340 x 12 to 24, 1 to 2 MB before compression" | Raw is 1.39 to 2.77 MB; PNG 1.0 to 2.0 MB (the high background compresses only 25 to 35%). 16 decks = 16 to 33 MB per stack |
| `v2.split_crossings` is 4-way only; the spike has the per-slice test | True. v5 has 2 to 26 four-way junctions per stack, 97 to 85% are 3-way, so the existing splitter covers almost none of question 3 |
| `export_stack_view.py` "already writes such volumes" | It writes a 2x-binned whole stack from the two-channel originals; a native-resolution regional export of the trimmed stacks is a small change, not existing |
| `confidence` can serve as `p` in `p(1-p) x delta` | No. The model file itself says it is "a ranking for review, not a calibrated probability"; in v5 0 to 1 confident edges per stack fall under 0.5 |
| Rejecting a dead end gives count -2 | Only with a counter that dissolves the two-way point left behind. `model.js` keeps rejected segments in the incidence, so `edges()` does not merge the two neighbours. The locked COUNT needs a named degree-based counter (same gap on the desktop) |
| Shell says a phone is unsupported | Not re-checked here |

## 1. Doability on phone inputs

Scale: 360 CSS px is about 68 mm, so 1 CSS px is about 0.19 mm; a finger pad covers 40 to 50 CSS px.

| step | precision or legibility needed | on the phone | verdict |
|---|---|---|---|
| Answer buttons (92 px, bottom third) | none | 17 mm tall targets | Fine, one thumb |
| Q1 slab, 60 µm in 340 px | capillary (median 3.3 to 3.8 µm) is 19 to 22 px | readable; native data is only 6 px across the vessel, so the picture is a 3x upscale | Fine |
| Q1 ribbon strip, 56 px tall | band against speckle | readable | Fine |
| Depth strip, autoplay | none to watch | 12 slices there and back at 5 frames/s is 4.4 s; **24 slices is 9.4 s per cycle**, longer than the 6 to 8 s claimed for the whole answer | Too slow on 3 of 4 stacks unless the strip plays only the item's own window (about 9 slices) |
| Depth strip, "drag to hold a depth" | 1 slice | track is about 190 px: 16 px per slice at 12 slices, **8 px at 24**; the knob is 32 px | Lacks finger precision. Replace with step buttons or tap-left / tap-right |
| Side cut, 92 px tall | separate two blobs through depth | 7.7 px per slice at 12 slices, 3.8 at 24; a vessel's own blur is 4 to 5 slices = 15 to 38 px, of a 92 px panel | Readable only when the two are 6 or more slices apart (see below) |
| Depth colour | hue difference | red to green fails for red-green colour blindness (design says so); outdoors hue contrast drops first | Never the only cue; fine as third |
| Q5 rulers at 7 px/µm | 5 µm against the wall | ruler 35 px, vessel about 25 px, but the wall itself is a 1 px native (0.55 µm, 4 px on screen) ramp either side | Legible; not more accurate than the measurement it second-guesses (see 3) |
| Q6 tile, 165 µm (187 with margin) in 340 px | spot a faint capillary; tap it | 1.8 to 2.1 px/µm: a capillary is 6 to 7 px (1.3 mm), the magenta line 1.2 px (0.2 mm). A finger pad covers 20 to 27 µm = 6 to 8 capillary widths; median segment is 31 to 38 µm; up to 57 edges in one area (CA1 r2) | Coarse look: fine. **Tap-to-trace lacks precision in dense areas**; pinch needs two hands. Needs a two-step: tap, then a magnified 60 µm crop with the traced proposal to confirm |
| Q6 "hold: lines off", Q1 "hold to hide the outline" | press and hold | fine with one thumb, but hides the answer buttons' thumb | Make it a toggle, or blink the outline automatically |

**Can z-ambiguity be resolved at all?** Partly, and less than the design hopes.

- Stack depth is 12 to 24 µm; a vessel's blur through depth is 4 to 5 µm; a capillary is 3.3 to 3.8 µm wide. Two
  capillaries that pass without touching can sit 4 µm apart centre to centre, inside one blur. Nothing on any
  screen separates those.
- My probe of the stack's own depth profile at each v5 junction (indicative): two separate peaks, 3 or more slices
  apart with a real dip, at **15%, 22%, 24%, 34%** of junctions (frontal r1, frontal r2, CA1 r1, CA1 r2). Those are
  the junctions where "only cross" can be seen. At the other 66 to 85% one blurred peak is all there is: a true
  junction and a close crossing look identical.
- Depth a few widths away from the junction does not help: branches of a real junction are 4 or more slices apart
  there in 44 to 81% of junctions, because capillaries dive. So a "5 slices apart" label on the side cut, as the
  mockup draws it, would read "crossing" at half the real junctions.
- 26 to 53% of edges are under 5 noise units in their best single slice. On a thin slab (±1 to 2 slices) those
  vessels sit at speckle level; the flattened picture is where they are visible. The strip therefore shows faint
  vessels worst exactly where the question is hardest.
- Question 2's veto "two ends 6 slices apart do not join" does not fit: of tip pairs within 30 µm, 53 to 77%
  differ by 4 or more slices in the model, and 18 to 63% of interior tips sit within 1.5 slices of the stack's top
  or bottom (63% on the 12-slice stack). Either the tips' depths are noisy or vessels dive that steeply; both
  make an absolute slice gap a bad veto. A slope (depth change per µm of gap) is the scale-free form.

## 2. Time on task

Real v5 counts per stack (confident edges; 4 x 4 areas):

| stack | slices | edges | candidates | junctions (3-way / 4+) | interior tips | junctions per area (median / max) |
|---|---|---|---|---|---|---|
| frontal r1 | 12 | 196 | 15 | 75 (73 / 2) | 130 | 4.5 / 9 |
| frontal r2 | 24 | 294 | 45 | 118 (111 / 7) | 142 | 7 / 12 |
| CA1 r1 | 18 | 267 | 18 | 122 (110 / 12) | 120 | 7 / 18 |
| CA1 r2 | 24 | 386 | 9 | 178 (152 / 26) | 170 | 10.5 / 30 |

Answers per stack, recomputed. Q1 = candidates + dead ends under 20 µm + bridged + flagged short-loop edges +
what v2 to v5 deleted (their `repairs` counts); Q2 = one per interior tip; Q3 = every junction; Q4 = bridges;
Q5 = edges within 15% of 5 µm or 10 µm plus a 5% sample (15% is my assumption: 1 native pixel on a 3.5 µm vessel);
Q6 = 16 areas, two taps each.

| stack | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | answers | minutes at the design's seconds |
|---|---|---|---|---|---|---|---|---|
| frontal r1 | 147 | 130 | 75 | 22 | 26 | 16 | **416** | **38** |
| frontal r2 | 357 | 142 | 118 | 8 | 42 | 16 | **683** | **56** |
| CA1 r1 | 112 | 120 | 122 | 7 | 83 | 16 | **460** | **45** |
| CA1 r2 | 154 | 170 | 178 | 3 | 98 | 16 | **619** | **60** |

So "about 570 answers, 50 to 60 min" is the right order, by a different mix than the design assumed: more
question 1 (resurrected deletions dominate on frontal r2: 257 of 357), fewer question 3 on frontal r1 (75, not 140).
The seconds are the soft part: with a 24-slice strip, questions 2 and 3 are nearer 9 and 13 s than 6 and 8,
which adds 15 to 23 min on the three deeper stacks (CA1 r2: about 85 min). Three helpers per question: 2 to 4
person-hours per stack.

- **Taps per decision**: 1 for Q1 to Q5 (good); Q6 is 1 + 2 per miss (tap, confirm, verdict on the trace).
- **Deck length is not 3 min everywhere**: junctions per area run 0 to 30 and edges 12 to 57, so CA1 r2's densest
  area is about 100 answers (about 10 min) and the emptiest under 10. Cut decks by question count, not by area.
- **Dead time**: 1.0 to 2.0 MB per deck. About 1 to 2 s on a 10 Mbit/s link, 8 to 16 s on 1 Mbit/s. Fetch the
  next deck while the current one is answered and the "first question in 5 s" target holds from the second deck
  on. Per-question crops would be larger in total (38 x 0.14 MB raw), so one sub-volume per deck is right.

**Metric value per second** (count change if the answer flips the draft, over the design's seconds; flip rates are
guesses where the study has no data):

| question | count change per flip | likely flip rate | s | value | note |
|---|---|---|---|---|---|
| Q1 on kept short dead ends, candidates | 1 to 3, and length | high (the largest error class in LEDGER: 13 of 74 judged non-vessels kept) | 3 | **highest** | 2D, any helper |
| Q1 on resurrected deletions | 1 to 3 | low: v2 to v5 dropped them at a cost of 4 of 111 judged vessels | 3 | low per item, and it is 67 to 257 items | sample, do not ask all |
| Q2 | 1 | unknown; LEDGER says the labels hold few gaps | 6 to 9 | medium | half the tips may be vessels leaving the slab |
| Q3, junction with two depth peaks | 1 to 2 | high | 8 | high | answerable |
| Q3, the rest | 1 to 2 | cannot be seen | 8 to 13 | **near zero** | 66 to 85% of Q3's time |
| Q4 | 0 | n/a | 3 | none on the metrics | routing only |
| Q5 | 0 on count and length; a bin | n/a | 4 | caliber only | 83 to 95% of edges are under 5 µm; 0 to 2 per stack over 10 µm |
| Q6 | 3 per traced miss | 7 of 9 judged misses are faint | 10 + | the only recall net | weakest on a phone |

**Where a different decomposition halves the time**

1. **Ask question 3 only where depth shows two peaks**: 11 to 61 junctions instead of 75 to 178. Saves 8 to 16 min
   per stack and all of the unanswerable items. The rest are recorded "join, not resolvable", not "checked".
2. **Merge questions 1 and 2 on dead ends into one pick-one**: a dead-end branch is noise, or continues to the
   ringed spot, or really ends or leaves the slab. Today its edge is asked in Q1 and its tip again in Q2 with a
   fresh picture to parse. One question of 120 to 170 items replaces about 250 to 300 answers.
3. **Sample the resurrected deletions** (say 30 per stack, to measure what v2 to v5 lose) instead of asking all
   67 to 257.
4. **Do not ask question 2 for tips at the stack's top or bottom** (18 to 63% of interior tips): show them as
   "leaves the slab" in the merged question's default.

Together: about 230 to 310 answers and 24 to 34 min per stack at the design's seconds, from 416 to 683 and 38 to 60.

## 3. Answerability by a trained non-lead

| question | in the stated seconds? | why | substitute |
|---|---|---|---|
| Q1 vessel or not | Yes, 3 s | Shape and continuity in 2D; the ribbon is a good idea. Risk: a ribbon of pure speckle also looks like a band once straightened along a line; show the same ribbon turned a quarter beside it (the extractor's own quarter-turn test, as a picture) | none needed |
| Q2 A to B one vessel | Partly, 6 to 9 s | Answerable from good continuation in the flattened crop; the gap is by definition where signal dropped, so the thin slab shows nothing there. The depth veto as stated misleads (section 1) | Show the tracer's proposed path as a dotted line that blinks on and off, and ask "does the vessel follow this path?"; or show the two best landings and ask "which one, or neither" |
| Q3 join or only cross | **No** for single-peak junctions, for anyone; yes for two-peak ones in about 4 s | Blur equals the gap | (a) ask only two-peak junctions, with the side cut placed by the probe; (b) for a 3-way junction, replace the verdict with "which two arms are one vessel?" (three choices or "all three join"), a 2D direction judgment `splitJunction` currently makes alone by angle; (c) everything else: desktop sample audit, not a helper question |
| Q4 line on the vessel | Yes, 3 s for the top ribbon; the depth ribbon is 12 to 24 native rows tall, with a 4 to 5 row blur | A depth error of 2 slices is invisible in it | Keep the top ribbon only; treat depth as unverified everywhere, which is what the curve fit's own 2-slice tolerance already says |
| Q5 how wide | Yes to tap, but it adds nothing | The helper eyeballs the same blurred wall the half-maximum measurement used; asked only where the measurement is within its own error, the eye is inside that error too. Bins are not set (f3), and `ARTERY`-style splits are the study's least trustworthy number | Defer until the owner sets bins. Then ask the owner about 20 edges once to fix where the wall is read, and let the measurement bin the rest; report "within error of a bin edge" as its own count |
| Q6 everything drawn | Coarse yes in 10 s; faint misses no | 7 of 9 judged misses are capillaries at speckle brightness | Keep as the coarse last check. Add the Missed view as an automatic blink, not a hold. Faint recall stays a desktop claim, as the design already says |

## 4. Ground-truth equivalence and recomposition

| part | claimed tier | finding |
|---|---|---|
| Edge exists (Q1) | same as desktop | Holds per item. Replay through `decide` works for any proposed edge. Needs the geometry-to-segment resolver and a tolerance rule; note `fake_truth` matches at 2.5 µm over half the length, in 2D |
| COUNT | same tier | Holds only with a counter that dissolves two-way points after a rejection (see 0), and only if Q3's unresolvable junctions are counted as "not resolvable", never as "checked". Writing them into `checked_junctions` would claim the desktop's verdict without the desktop's turnable 3D view. Proposed: a separate list, and COUNT reported with the number of unresolved junctions beside it (each is worth 1 to 2 segments) |
| Crossing split | same tier | `splitJunction` picks the through pair by angle alone and places the leftover tip itself. A phone "only cross" on a 3-way junction therefore records less than the desktop, where the owner sees and can fix the result. Ask the pair (3b above) or route 3-way splits to the desktop |
| Caliber bin | same tier | Agreed that no radius is corrected on either device. But it is the measurement's tier, not a human one, wherever the helper is not asked (most edges) |
| Length | weaker, "verified, not corrected" | Honest. Also say that depth along the curve is unverified: length is "3D at 1 µm spacing", and a curve allowed 2 slices of depth error on a 31 to 38 µm median segment is a small term, but the phone never checks it |
| Recall | weaker | Agreed, and correctly marked `by: "phone"` |

**Dependencies between questions.** The stated order 1, 2, 3 is not a clean order:

- Q3 "only cross" on a 3-way junction makes a new open end "which goes to question 2": a loop back, after Q2 is done.
- Q2 "end onto a vessel's side" makes a new junction, which Q3 would then ask about although the answer was just given.
- Q1 "not a vessel" merges two neighbours into one edge, whose width, bin and fit differ from either half: any Q4
  or Q5 item prepared for the halves is stale.
- Q6's traced miss creates Q1, Q2 and Q5 items for an area whose deck was "prepared beforehand".

With "nothing computed on the phone", every follow-up must be precomputed for both branches of each answer, or the
deck must come back in rounds (answer, upload, lab regenerates, next round). Rounds are simpler and match the
offline design: round 1 = existence (merged Q1+Q2), round 2 = junctions and widths on the settled graph, round 3 =
area check. Wasted questions today: Q2 on tips of branches Q1 then rejects is avoided by the order, but Q5 on an
edge later rejected or merged is not, and neither is Q3 on a junction a Q2 answer in the next area dissolves
(tips near area borders: all of an area before the next is the desktop's rule and costs the phone nothing to keep,
but cross-border joins need the neighbour's sub-volume margin, which 20 px = 11 µm does not cover for a 12-width
reach of about 40 µm).

**Early stopping** has no basis yet: it needs a calibrated `p` per item, and the study has no owner-judged item at
all. Drop it from the first build.

## 5. Algorithmic dependencies

| need | status | cost | risk |
|---|---|---|---|
| Slab, flattened crop, ribbon from `sample_edge` / `normals` / `at` | exists in Python; the phone draws from the sub-volume, so it is re-written in JS | small | two copies of the sampling: guard or precompute ribbons as images |
| Native-resolution regional 8-bit export | new, small (the existing exporter bins 2x and reads the originals) | small | the 8-bit window must be one per stack, as the view's rule says |
| Geometry-anchored ledger, resolver onto a new draft, replay to `vessel-model/2` | new | medium | the core of the proposal; tolerance choices decide whether a verdict survives an extractor change |
| v2 to v5 keeping what they delete, with scores | new; touches four versions' outputs | medium | must not change the models (the lab's bit-identical rule): emit beside, not inside |
| Ranked bridge candidates that failed the cut | new; `bridge_gaps` and `geodesic_bridges` apply winners only | medium | the reach (12 widths) crosses area borders |
| Per-junction depth evidence (two-peak test, side-cut line) | new for the model; the spike's `slice_groups` is the nearest thing and is not in the pipeline | medium | **highest value**: it is what makes Q3 askable. Mine above is a crude version; it needs the owner's eye on 30 junctions first (the design's own f1) |
| Width error and sharpest slice per edge | new | small | low value until bins exist |
| Tap-to-trace on the device | new, and it is computation on the phone (ridge snap + geodesic), against "nothing is computed on the phone" | high | precompute a ridge map per deck (adds a second volume-sized download) or send the tap to the next round |
| Calibrated `p` for ordering | not available | n/a | needs owner gold first |
| Gold questions, helper weighting | needs one owner-corrected stack; none exists | n/a | the whole helper path is blocked on it; owner-only use needs none of it |
| Degree-based COUNT over the corrected file | missing on both devices | small | without it the phone's and the desktop's counts are both read differently by different code |

## 6. Top 5 changes, ranked

1. **Triage question 3 by depth evidence and ask only what can be seen.** Two-peak junctions (15 to 34%, to be
   validated by the owner on 30 junctions) get "only cross?" with the side cut; the rest are stored as "join, not
   resolvable" in a list of their own and COUNT is reported with that number beside it. Saves 8 to 16 min per
   stack and removes the question no helper can answer.
2. **One question per dead-end branch** with three answers (not a vessel / continues to the ringed spot / ends or
   leaves the slab), replacing Q1-on-dead-ends plus Q2. Tips at the stack's top or bottom default to "leaves the
   slab". About 100 to 150 fewer answers per stack, and the depth veto becomes a slope, not "6 slices".
3. **Work in rounds, not one precomputed deck**: existence, then junctions and widths on the settled graph, then
   the area check. Removes stale Q4/Q5 items and the Q3-to-Q2 loop, keeps "nothing computed on the phone" true,
   and moves tap-to-trace's tracing to the lab between rounds.
4. **Fix the depth controls for a thumb**: the strip plays only the item's own 9-slice window (under 4 s on every
   stack), holding a depth is two step buttons, the outline and the Missed view blink by themselves, and the
   flattened crop stays on screen beside any slab since a quarter to a half of edges are at speckle level in one
   slice. Cut decks by answer count (about 40), not by area (10 to 100).
5. **Drop from the first build: question 5, question 4's depth ribbon, early stopping, and asking every
   resurrected deletion** (sample 30). Caliber waits on the owner's bins; the measurement bins the edges, with
   "within error of a bin edge" reported as a count. Before any helper work, the owner answers the first decks:
   there is no gold, and none of the redundancy machinery can start without it.

Reading for the owner: with changes 1 to 5 a stack is about 230 to 310 one-tap answers, 24 to 34 min at the
design's guessed seconds, for existence and the visible crossings; unresolvable junctions, faint misses,
off-line curves and caliber remain a named desktop remainder. One measured pilot deck is still the first thing
to do, as the design itself says.
