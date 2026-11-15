# Audit of the phone tagging design v2 (Vascular Measurements)

Audited: `design-v2.md`, `mockup-v2.html`, `shot-v2-light.png`, with `design.md` and `review.md` as history,
against `studies/vascular/requirements.md`, `docs/WARMUP.md`, `docs/STATUS.md`, `docs/3D-STACKS.md`,
`web/` and `analysis/extraction/`, and the four stacks in `data/raw/`. No tracked file changed. New probe:
a throwaway probe script (not kept). Proposal: `mockup-v3.html`, `shot-v3-light.png`, `shot-v3-dark.png`.

**Trust of the numbers.** Counts (tips, junctions, edges) are measured on v5's drafts. The contrast and
"lane beyond the tip" figures are a throwaway probe of mine, one crude statistic, unvalidated by any eye:
indicative. **Every second in sections 3 and 4 is built from textbook figures** (a fixation with its saccade
0.25 to 0.3 s, a thumb move 0.4 s, a hard perceptual judgment 0.8 to 1.5 s), not from a person: they rank
steps well and total badly. Distances use 0.17 mm per CSS px on the mockup's 360 px layout (a 390 px phone is
8% larger).

## 0. Facts checked that change the picture

| claim or assumption in v2 | what the repo and stacks say |
|---|---|
| Depth is painted "shallow red to deep green", and cyan and magenta are outside it | The page's depth palette is **Turbo** (`web/viewer3d.js`), blue through cyan, green, yellow to red. Cyan `#35e0ff` is inside it, so every cyan ring, path and ruler vanishes on vessels a quarter of the way down. Only magenta is safe, as `req/vascular/model/view` already says |
| "Helpers" answer | The requirements know one tagger, the owner; no stack has an owner-corrected model yet (`labels/` holds a model's verdicts). So there is no gold for check questions and nobody to calibrate a helper against |
| Ends leaving the slab are 18 to 63% of interior tips | With v2's own second condition (slope heading out): **18, 22, 33, 51%** (25, 27, 56, 66 tips). 0 to 16 boundary tips per stack run level and are still asked. The 5% sample is **1 to 3 questions per stack**: it cannot measure the rule's error |
| "How many X's sit in the model as two close three-ways?" | 2 to 4 per stack (an edge between two three-way nodes no longer than two widths). Four-arm items are 5 to 29 per stack, not a hidden mass |
| Round 2 must wait for round 1 | 60 to 77% of junctions have an arm that is a round-1 item (dead end, bridged or candidate), so the dependency is real; but the only thing a junction needs from round 1 is "was my arm rejected", a skip, not a redraw |
| Dead-end questions are a side task | 42 to 61% of v5's confident edges are dead-end or bridged pieces (113 to 162 per stack). The dead-end question **is** the COUNT |
| The flattened crop shows the gap | Stack-dependent. In the page's own window CA1 r1's background sits at half brightness (0.50 against 0.20 to 0.27 on the others); 22% of its confident edges are under 1.5× their background's luminance in a lit room, 39% by a window. On the other three 1 to 2% and 4 to 16% |
| "Goes on to the ring" can be seen | In the lane straight on from an asked tip, the signal exceeds a quarter-turned control lane by 1.2× in only **31 to 62%** of tips in a lit room (24 to 58% by a window). For the rest the deciding evidence is not on the screen, or the vessel turns (the probe looks straight on only) |
| A phone is a supported device | `web/browsers.js` refuses mobile ("made for a desktop or laptop"). The tagger is a new surface, its fetches and its helper identity each an approval of the owner's (`network-calls-approved`) |

## 1. Pre-mortem: it failed in six months. Why?

| # | story | kind | likelihood | what prevents it |
|---|---|---|---|---|
| 1 | **Defaults were the ground truth.** 50 to 110 junctions per stack "join by geometry", 25 to 66 tips "leave the slab by auto", every confident edge accepted by a 10 s area look. People decided 15 to 34% of junctions. COUNT moved by what v5 already believed, and the range did not include the defaulted junctions, so it looked tight | data | **high** | Report COUNT in three labelled parts (person, measurement, default) and put the defaults in the range. Do not build until the pilot shows the person-decided part can move COUNT by more than the defaults' uncertainty |
| 2 | **The audit of the default could not be done.** 10% of one-peak junctions went to the owner's desktop, where the same blur makes them unanswerable (the review's own finding). The audit returned "can't tell" and the assumption stayed untested | data | **high** | Test it with different data, not a different device: one stack re-imaged at a finer z-step or deconvolved, or a lumen stain; until then call the one-peak junctions unresolved, not joined |
| 3 | **Three rounds, three waits.** Round 2 opened two days after round 1 because nobody was named to run the lab; half the helpers never opened round 2; round 3 was done on one stack | helper, owner | **high** | One sitting: order each junction after its own arms and skip it on a rejection (section 4, C6). Only traced pieces come back, as one short follow-up |
| 4 | **No gold, so no trust.** No owner-corrected stack existed, so check questions had no answers; helper verdicts stayed "provisional" forever and the owner redid the stack on the desktop | owner | **high** | The owner answers the first two stacks on the phone design itself (it is the cheapest gold), before any helper is invited |
| 5 | **The depth chart was a rubber stamp.** "Do the lines meet?" is decided by two printed numbers (4.5 against 3.6). Helpers learned to compare them; agreement with the measurement was 100% and added nothing, at 7 to 8 s each | helper | high | Drop frame 5. Record the measurement as a measurement; validate it once on the two-peak junctions, as v2 itself proposes |
| 6 | **"Ends here" became the dump answer.** A third or more of dead-end lanes show nothing (probe above). Faced with a faint gap, people chose "Ends here" (safe-sounding, keeps the vessel). Fragmentation stayed, COUNT stayed about where v5 put it | helper, data | high | Show the gap itself as a straightened strip with a control beside it; rename the answers to what is seen; count "Ends here" as an open end in the range, never as settled |
| 7 | **CA1 r1 on a bus.** The low-contrast stack was answered outdoors; a fifth to two fifths of its vessels were under 1.5× their background. "Not a vessel" rose, recall fell, and nobody could tell from the ledger | technical | medium | Grey evidence with a per-crop window (the crop's own black and white points), a brightness check item at deck start, and per-deck flip rates compared across decks |
| 8 | **Colour lied.** Marks drawn cyan over a Turbo-coloured stack disappeared on shallow vessels; one helper in twelve men could not tell the red vessel from the green one in frame 4 and answered from the side cut alone | technical | medium (certain for cyan once built on the real palette) | No hue for depth in any question: depth is a position (the side cut) or a panel (upper, lower). Evidence in grey, marks in amber and blue |
| 9 | **The auto rule was wrong at the boundary and nobody knew.** Depth is least reliable where profiles are clipped (30 to 55% of them); the 5% sample was 1 to 3 items per stack; 51% of frontal r1's tips were settled by it | data | medium | Sample 20 per stack until 100 owner answers exist, then set the rate from the measured error |
| 10 | **Round 3 found nothing.** A 165 µm tile with up to 57 lines blinking, faint misses at speckle level (7 of 9 judged misses are faint). Every area got "Looks right" in 6 s; recall did not move; the magnifier was used twice | helper | medium to high | Move the search to the lab: unexplained signal becomes numbered candidates asked as ordinary pieces; the area look only points at a quarter |
| 11 | **The ledger did not replay.** Geometry-anchored verdicts met a redrawn model after a new extraction version; the resolver's tolerance matched the wrong piece in dense areas; `model.js` still kept rejected segments in the incidence, so COUNT from the replay disagreed with COUNT on the phone's summary | technical | medium | Build the counter and the resolver first, on the desktop, with a test that replays a ledger onto v4 and v5 and gets one count |
| 12 | **It was dull.** 300 near-identical grey crops, no visible progress on the stack, nothing learned. Helpers did one stack | helper | medium | Decks of 40 with the area map filling in (the desktop's cut-out reward), the stack's count moving as answers land, and an end at a named number, not "more later" |
| 13 | **The owner never needed it.** Four stacks, 13 to 30 minutes each on a desktop tagger that already exists: about two hours of the owner's time in all. The phone build cost more than the work it replaced | owner | medium | Decide by the corpus: the phone pays only if many more stacks are coming. Ask the owner how many |

## 2. Data dependencies: what must be known to answer

"On screen" is judged on the v2 mockup. Verdicts: **yes**, **weak** (present but under phone contrast or
resolution in part of the cases), **no**.

| question, answer | what the helper must perceive or know | what the system must have computed | deciding evidence on screen? |
|---|---|---|---|
| Dead end: **Not a vessel** | That the outlined piece is speckle: no band along it, no blob across it | The piece's ribbon and its quarter turn | **Yes** (the two ribbons). Weak on CA1 r1 |
| Dead end: **Goes on to the ring** | Faint signal across the gap, in some slice, along the dotted path; and that the thing at the ring is a vessel | The tracer's best path (the candidates that failed the cut, which the lab does not output today) | **Weak to no.** No ribbon shows the gap; the dotted path is drawn over it half the time; the gap is 22% opacity in the mockup and absent from the screen in a third to two thirds of real tips. Only one landing is offered: a vessel that goes on elsewhere has no answer |
| Dead end: **Ends here** | That nothing continues in any direction, at any depth. Also knowledge: a vessel does not end in tissue, so this answer means "the stain or the slab ended", which the helper cannot tell apart | The tip's depth and slope (to say it is not leaving the slab) | **No.** It is the absence of evidence in a flattened picture; the depth facts are not shown. A trained non-lead does not know which it is |
| Vessel or not | Band along, blob across; continuity with neighbours | Ribbon, quarter turn | **Yes** |
| Carries on past the vessel: **Carries on** | Signal in the lane beyond the trunk, wider than speckle, continuous from the junction; which arm is "the branch from above" (above on the screen, or shallower? the captions use "from above" for the top view) | The lane; that the branch's depth misses the trunk's | **Weak.** The lane is the same faint-signal judgment as the gap, with no strip and no control. A neighbouring vessel inside the lane reads as "carries on" |
| Carries on: **Stops here** | Dark lane | same | Yes where the lane is clean |
| Join or only cross: **Only cross** | A dark band between two blobs in the side cut; that the cut's horizontal axis is the dotted diagonal of the top view (a mental rotation); that each blob is blurred by 4 to 5 slices, so a 3-slice separation is a **dimmer waist**, not the black gap the mockup draws | The two peaks, which arms belong to which, the cut's line | **Yes when 5 or more slices apart; weak at 3 to 4**, where two 54 px blurs sit 36 px apart. The item was selected by the same profile it displays, so the answer is mostly a confirmation |
| Join or only cross: **Join** | One blob; and that "one blob" is not just two within a blur (the lab filtered those out) | same | Yes for the selected class |
| Depth colour as a cue (frame 4, top view) | Hue difference between two vessels | Palette | **No** for a red-green colour-blind helper; no under the real palette for cyan marks |
| Strip playback (frame 4) | Which vessel is present in which slice, held in memory across 1.8 to 3.6 s | Per-slice slabs | Present, but **faint vessels are at speckle level in a thin slab** (26 to 53% of edges under 5 noise units): the cue is weakest where the question is hardest, and it repeats the side cut |
| Do the lines meet: **Meet / Pass apart** | What an error band is; that "meet" means "closer than touching distance" although the drawn lines do not touch; that 4.5 against 3.6 is the comparison | Depth lines, their errors, the touching distance | On screen, but **needs knowledge a trained non-lead lacks, and no judgment**: the two printed numbers decide it. Whether the fit is sane (raw points) is not shown |
| Everything drawn: **Looks right** | That each of 12 to 57 magenta lines sits on a vessel, and that no unlined vessel exists (an exhaustive search for an absent, faint target) | The Missed view's signal outside the tubes exists and is not shown | **Weak**: the coarse errors yes; 7 of 9 judged misses are faint capillaries at 6 to 7 px |
| Everything drawn: **mark a spot** | Where exactly the miss is, within a capillary width | A tracer that starts from the mark | Yes with the magnifier; costs a second hand |
| Can't tell | Nothing | That the item widens COUNT's range | Yes; but its target is a 5 × 7.5 mm word in the system's home-gesture strip |

Questions whose deciding evidence is missing or under contrast: **Goes on**, **Ends here**, **Carries on**,
the 3 to 4 slice **Only cross**, the faint half of **Everything drawn**. Needing knowledge a trained
non-lead lacks: **Ends here** (why vessels end) and **Do the lines meet**.

## 3. Micro-interaction walkthrough

Layout facts (mockup, 360 × 740 CSS px): the picture's centre is 79 mm above the answer row's centre (15° of
eye travel at 30 cm), with 22 mm of empty screen between the hint and the buttons. Three-answer buttons are
18 × 16 mm, two-answer 28 × 16 mm, step buttons 14 × 9 mm and **0.7 mm above the answers**. Back and Can't tell
are words 5 to 10 mm wide in a 7.5 mm row whose bottom is 2.4 mm from the screen's edge. The top-left "‹" is
120 mm from a resting thumb and its meaning beside Back is not stated. The blink period is not specified; 1.2 s
(0.6 on, 0.6 off) is assumed. Marks: fine, taxing, **grueling**, *futile*, redundant.

### Frame 2, dead end (claim 5 s)

| # | step | body | s | mark |
|---|---|---|---|---|
| 1 | Next item slides in | wait | 0.25 | fine |
| 2 | Eyes leave the buttons, travel 79 mm up, find a 1.4 px white outline among orange vessels; if it is in its off phase, wait | 2 fixations + 0 to 0.6 s | 0.8 | taxing |
| 3 | Follow the branch to its tip, then the dotted path 13 mm to the cyan ring | 2 fixations | 0.5 | fine |
| 4 | Wait for the dotted path to blink **off**, to see what is under it; judge faint signal in the gap, remembering where the path ran | up to 0.6 s wait + judgment, 1 item in memory | 1.4 | **grueling** |
| 5 | Drop 27 mm to the two ribbons, compare band against blob | 2 fixations + compare | 0.9 | redundant for an obvious vessel; they show the piece, not the gap |
| 6 | Drop 51 mm to three buttons, map what was seen to three labels | 1 fixation + 3-way choice | 0.8 | taxing |
| 7 | Thumb 0 to 20 mm to an 18 × 16 mm target | move + tap | 0.4 | fine |
| | **Typical** | | **5.1 obvious, 6.4 faint** | |

Bad paths: **cannot find the branch** (outline in off phase on a dense crop; two more blink cycles, +2.4 s, then
Can't tell: 9 s for nothing, futile). **Vessel goes on, but not to the ring**: no answer fits; 2 to 3 s of
re-reading, then "Ends here" (wrong) or Can't tell. **Wrong tap**: eyes down 15 mm to "Back" (5 mm word),
slide back 0.25 s, re-find the item 0.8 s, answer 0.4 s, re-answer the next: +2.5 s. **Can't tell**: thumb drops
12 mm into the gesture strip; a miss summons the app switcher, 3 to 5 s to recover.

### "Vessel or not?" (claim 3 s)

Slide 0.25, find the outline with its blink 0.8, ribbons 0.9, two-way choice 0.4, thumb 0.4: **2.8 to 3.3 s**.
The claim holds. The blink is the only taxing step.

### Frame 3, carries on (claim 4 s)

| # | step | s | mark |
|---|---|---|---|
| 1 | Slide in | 0.25 | fine |
| 2 | Find the white ring; decide which arm is "the branch from above" | 0.9 | taxing the first dozen times (the word "above") |
| 3 | Find the two dotted lines below; magenta model lines blink meanwhile and pull the eye | 0.5 | fine |
| 4 | Judge faint signal between the dotted lines over 27 mm of lane, with no control to compare against | 1.3 | taxing; **grueling** on CA1 r1 |
| 5 | Eyes 62 mm down, two-way choice, thumb | 0.8 + 0.4 | fine |
| | **Typical** | **4.2** | |

Bad path: a neighbour vessel lies inside the lane. The helper sees signal and answers "Carries on"; the lab
traces a false fourth arm and the spot returns as a four-arm item in a later round: about 12 s and a wrong
edge from one honest answer.

### Frame 4, join or only cross (claim 5 s)

| # | step | s | mark |
|---|---|---|---|
| 1 | Slide in | 0.25 | fine |
| 2 | Find the ring in the top view; register two colours | 0.8 | fine (not for a red-green colour-blind helper) |
| 3 | Watch the slices play: half a loop to see each vessel in its own slices, arriving at a random phase, holding "what was here four slices ago" in memory | 1.8 to 3.6 | **grueling**, and redundant with step 4 |
| 4 | Drop 30 mm to the side cut; find the blob, the band, the gap between | 0.8 | fine |
| 5 | Map the cut to the dotted diagonal above (a mental rotation), check which vessel is the band | 1.0 | taxing |
| 6 | Eyes 52 mm down past the step row, two-way choice, thumb | 0.9 + 0.4 | fine |
| | **Typical** | **6.0 with half a loop, 7.8 with a full one, 4.2 ignoring the playback** | |

The 5 s claim holds only for a helper who learns to ignore the playback. **Stepping back and forth**: thumb up
10 mm to a 14 × 9 mm button, eyes up 70 mm to see the slice change, down again; four steps cost 4 × 0.9 s; then
the thumb returns across a 0.7 mm gap to "Join". Total about 10 to 12 s, with a real chance of tapping
"deeper" for "Join" or the reverse. For the 3 to 4 slice cases the helper steps, sees a waist, steps again, and
ends on Can't tell: futile.

### Frame 5, do the lines meet (claim 5 s)

| # | step | s | mark |
|---|---|---|---|
| 1 | Slide in; find the ring; match the cyan dotted vessel to the cyan line and the magenta to the magenta, across two panels | 1.5 | taxing |
| 2 | Find the dashed vertical; read each line where it crosses; see that the bands do not overlap | 1.3 | taxing (what is a band?) |
| 3 | Read "4.5 µm apart here" and "touching would be 3.6"; compare | 1.8 | redundant with step 2 |
| 4 | Reconcile "meet" with lines that never touch on the chart; choose; thumb | 1.5 + 0.4 | *futile*: the numbers decided it |
| | **Typical** | **6.5 to 7.6** | |

### Frame 6, the area's last look (claim 10 s, plus marks)

| # | step | s | mark |
|---|---|---|---|
| 1 | Slide in; take in the tile | 0.6 | fine |
| 2 | Check each magenta line against its vessel while the lines blink: about 0.3 s a line, 12 to 57 lines | 4 to 17 | taxing; **grueling** in a dense area |
| 3 | Search the dark for an unlined faint vessel, 6 px wide | 4 to 8 | *futile* for the faint ones |
| 4 | Decide; thumb | 0.9 | fine |
| | **Typical "Looks right"** | **10 median area, 22 to 27 dense** | |
| 5 | Mark: the thumb cannot reach the tile's upper half (8 to 59 mm from the top), so the other hand comes in; touch; the finger covers 6 to 8 capillaries; find the 24 mm magnifier "away from the finger"; steer to the spot; lift, where the finger's roll shifts the mark by about a capillary width | 4 to 6 per mark | **grueling** |
| 6 | Mis-marked: eyes to "Remove last mark" (in Can't tell's place), tap, redo | 5 | taxing |

**A deck interrupted** (a call, a stop): the answers are safe (v1: kept on the device). On return the helper
sees an item mid-deck with no memory of the deck's question type or how it was calibrating "faint": the next 3
items run about double, 10 to 15 s lost. Across three rounds days apart this is paid in full each time.

**A red-green colour-blind helper**: frames 3 and 5 are unaffected; frame 2 loses nothing (one hue per crop);
frame 4 loses the top view's cue and its playback contrast, and decides from the side cut, where position
carries depth: answerable, at the 4.2 s path. The legend's "shallow red to deep green" cannot be read at all.

### Sums against the claims

| question | claim s | from steps s | per stack | claim min | from steps min |
|---|---|---|---|---|---|
| Dead end | 5 | 6.4 | 45 to 140 | 3.8 to 11.7 | 4.8 to 14.9 |
| Vessel or not (with round 3's 30 traced pieces) | 3 | 3.3 | 90 to 140 | 4.5 to 7.0 | 5.0 to 7.7 |
| Carries on | 4 | 4.3 | 8 to 30 | 0.5 to 2.0 | 0.6 to 2.2 |
| Join or only cross | 5 | 7.4 | 11 to 61 | 0.9 to 5.1 | 1.4 to 7.5 |
| Do the lines meet | 5 | 7.6 | 2 to 30 | 0.2 to 2.5 | 0.3 to 3.8 |
| Area look | 10 | 14 to 22 | 16 | 2.7 | 3.7 to 5.9 |
| Three sittings' re-entry, deck changes, Back and Can't tell | 0 | | | 0 | 3.5 to 5.5 |
| **Per stack** | | | | **15 to 30** (v2's own total) | **19 to 47** |

## 4. v3 changes

| # | change | replaces (step) | saves per stack |
|---|---|---|---|
| C1 | **One straightened strip: the piece, the gap, the landing**, read left to right, with the same strip a quarter turn away as a control under it. Answers name what is seen: "Noise", "Stops" (vessel, then dark), "Runs on" (vessel right through) | Frame 2 steps 2 to 6: outline hunt, blink wait, gap judgment under a dotted path, ribbons of the wrong thing | 2.4 s × 45 to 140: **1.8 to 5.6 min** |
| C2 | **Nothing blinks.** Marks sit beside the evidence, never on it: ticks at the strip's edges, corner brackets on the context crop | Every blink wait | 0.5 s × 90 to 140 pieces: 0.8 to 1.2 min |
| C3 | **Evidence in grey with the crop's own window; marks amber and blue.** Depth is never a hue: it is a position (side cut) or a panel (upper, lower) | Depth colour; cyan inside Turbo; the red-green dependence; blue and red hues that dim faint vessels | Removes failure 8; time neutral |
| C4 | **Two still slabs chosen by the lab** (the slices of each peak) side by side, over the side cut. No playback, no step buttons | Frame 4 step 3 and the stepping path, the 0.7 mm mis-tap | 3.1 s × 11 to 61: **0.6 to 3.2 min** |
| C5 | **Frame 5 is not asked.** The depth-line verdict is recorded `by: "measurement"`, validated once against the two-peak junctions; what it cannot settle is unresolved | The futile chart | 7.6 s × 2 to 30: 0.3 to 3.8 min |
| C6 | **One sitting.** A junction's item is placed after its own arms' items in the same deck and skipped if an arm was judged noise (a rule in the deck's JSON, nothing computed on the phone). "Runs on" needs no redraw: the landing was already in the strip. Only traced pieces and four-arm returns come back, as one short follow-up deck | Rounds 2 and 3 as separate sittings | 2 re-entries, about 1 to 1.5 min, and **two lab waits** |
| C7 | **The lab does the search for misses.** Signal outside the model's tubes becomes numbered candidates, asked as ordinary pieces in the main deck. The area look keeps two buttons; "Something's off" asks only which quarter (four 28 mm tiles, no precision), and the lab or the desktop takes it from there | Frame 6 steps 3, 5, 6: the futile search, the two-handed magnifier | 6 to 10 s × 16: **1.6 to 2.7 min** |
| C8 | **The picture sits directly above the answers**, the question (a fixed phrase per type) at the top. Eye travel 79 mm to about 30 mm; the answers stay in peripheral view | Every item's two long saccades | inside C1 and C4 |
| C9 | **Can't tell is a real button** (a slim fourth target above the gesture strip); Back shows the previous item with its answer lit, one tap to change | The 5 mm words in the gesture strip | Removes a 3 to 5 s accident |
| C10 | **Sample 20 auto-settled ends per stack**, not 5%, until 100 owner answers measure the rule | A sample of 1 to 3 | **costs 1.1 to 1.3 min** |
| C11 | **COUNT in three labelled parts**: decided by a person, by measurement, by default; the defaults inside the range | A range that hides the 50 to 110 defaulted junctions | none; removes failure 1's disguise |
| C12 | **The owner answers the first two stacks**; no helper before that | Check questions without gold | none |

**Per-answer times in v3 (from steps, same textbook figures):** dead-end strip 4.0 s; piece 2.8 s; carries on
3.5 s; join or only cross 4.3 s; area look 8 s (12 dense).

**New per-stack total:** about **190 to 400 answers and 13 to 29 minutes, in one sitting plus a follow-up of
about two minutes** (v2 from the same step figures: 175 to 410 answers, 19 to 47 minutes, three sittings; v2's
own claim: 15 to 30). The upper end is CA1 r2 with 140 dead ends and 61 two-peak junctions.

**What v3 does not fix.** The one-peak junctions (66 to 85%) stay unresolvable with these stacks on any
screen: v3 only stops pretending. "Stops" is still an absence. And the thirteen-item pre-mortem's
last line stands: with four stacks, the desktop tagger is cheaper than building this.

## 5. Questions this audit leaves for the owner

1. How many more stacks are coming? Under about twenty, the phone build does not repay itself.
2. Is anyone but the owner going to answer? If not, drop the helper machinery (weights, check questions).
3. May one stack be re-imaged finer in z, or deconvolved, to test "a three-way junction is a join"?
4. Is a COUNT with a labelled default part acceptable as ground truth?
