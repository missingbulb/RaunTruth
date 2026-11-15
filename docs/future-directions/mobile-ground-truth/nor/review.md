# Efficiency review: NoR ground truth on a phone

Reviewed: `design.md`, `mockup.html`, `shot-light.png` in this folder, against `studies/nor/` at HEAD.
Nothing tracked was edited.

**How the numbers were made.** I fetched the reference slide (SHA-256 matches `data/sources.json`) into
a scratch folder and ran all five finders through `interactive.Session` at their own values
(throwaway probe scripts, not kept). Counts are measured on that **one image**; label yields rest on
Claude's 200 labels, not the owner's, so treat them as indicative. Every seconds-per-task figure is
still an assumption, mine as much as the design's. Physical sizes assume a 6.1" phone, 390 CSS px
wide, about 0.17 mm per CSS px.

## Facts the design got wrong or left out

| Design says | Measured / in code |
|---|---|
| 463 candidates, ~206 passes (from STATE.md) | **540 candidates, 222 passes** for tl at HEAD. STATE.md is stale (dated 2026-10-06); `finder_metrics.json` already says 534 with a pair of greens |
| ~150 extra proposals | **439** from the other four finders alone, more than 5 px from any tl candidate. **144 of them sit within 12 px of a tl candidate**: the same structure asked twice |
| Union "at their recalling preset" | Presets move filter values only (`finder_metrics.PRESETS`); the candidate pool is the same at every preset. The phrase adds nothing |
| "plus bare Nav peaks above an image-relative floor" | Undefined, and the floor decides everything: about 70 new chips at median+20 MAD, about 380 at +10, about 1,700 at +5 |
| T1g works on `fail0` chips | tl has **6** `fail0` candidates (all "one green"). T1g saves nothing on the default finder; rf/fill/walk/blobs have 590 to 1,270 |
| One area is 5-7 chips, about 20 s | tl alone: mean 5.4, max 15, **27 of 100 areas empty**. With the extras: mean 9.8 (13.4 in the 73 occupied areas), plus T2/T3/T4: about 35-50 s |
| An area is "about 1.5x on a phone" | The image is 1200 x 1200, an area 120 px: **2.7x** on a 328 px chip. Better than claimed (a node is about 12 mm long there) |
| T3 offers "length ends from a different R4 definition" | No R4 definition is computed anywhere in `detection/`. And R4's A/B/E define the **gap between the Caspr bars**; the `length` bar is the outer extent of green+red+green (`nor3.measure`, median 26 px = 4.5 um). R4 yields no alternatives for that bar at all |
| "each pick is also the hand evidence R4 waits for" | R4 and WARMUP say the **owner's own** hand measurements pick the definition. A helper's pick among machine options is not that |
| Desktop thumbs-up "implies" approved | True (`decide()` sets `approved`), so desktop never writes label 1 with `measured: null`. Phone T1-only does: a new state, which the lab reads correctly (`measure_error` skips it) |

## 1. Doability with touch only

Reference sizes: node triplet 26 px long, red 10 px, width 5.5 px (medians of tl passes). A T1 chip at
"3x node length" is 78 px, upscaled 4x to 312 CSS px, so the red spot is about 6.7 x 3.7 mm. Readable.

| Step | Verdict | Problem |
|---|---|---|
| T1 Yes / No buttons (72 px, 12 mm) | OK | |
| T1 swipes | Risky | Swipe right from the left edge is iOS back; swipe up from the bottom is home. One-handed swipes start at edges. Keep buttons primary, restrict swipes to the chip |
| Back, Can't tell, "Tilted" links | **Fail** | 14 px text, about 3 mm tall, 10 px under the big buttons. Below the 7-9 mm target and a slip from Yes hits Can't tell |
| T1 "the centre" | **Weak** | 495 of 540 candidates have another candidate inside the 78 px chip; 310 within 20 px. Four margin ticks do not say which of two adjacent triplets is asked |
| T1g 3x3 sheet | **Fail at 3x3** | 105 CSS px per chip: red spot about 2.3 x 1.2 mm. A 2x3 sheet (160 px, red about 3.4 mm) is the smallest that reads |
| T2 bars fit | Marginal | 1 source px = 0.67 mm at 4x, and the colour rim is blurred by 1 px (R7). A helper can see a bar off by 3+ px, not by 1 |
| T3 pick 1 of 3 | **Fail** | Option chips are 100 CSS px (1.3x). A 2 px difference between options is 0.4 mm. The mockup draws 25-38% differences that real data will not have |
| T3 nudge | Mechanically OK, judgment not | Relative drag needs no precise pointing, but it starts at the screen edge (back gesture), has no haptic on iOS, and asks for a 1 px call the eye cannot make at this size |
| T4 pinch | **Not one-handed** | Also fights page zoom. At 2.7x it is not needed; drop it or use a double-tap |
| T4 loupe, drag to place, Mark | Over-built | A missing mark matches within `MISSING_RADIUS` = 12 px = 5.4 mm on screen. A plain tap lands inside that. The loupe is only needed for bars, which this tier does not claim |
| Audio, hover | None needed | |

The existing desktop page is not a fallback: adding a NoR is on `contextmenu`, the tip on `mousemove`,
and the finder needs Pyodide. The design is right that this is a separate, pre-extracted page.

## 2. Time on task

Recomputed with the design's own seconds:

| | Design | Recomputed | Note |
|---|---|---|---|
| T1 chips | 670 | **1,077** (540 + 439 + 10% gold), before any Nav peaks | |
| T1 time at 2 s | 22 min | **36 min** | 54 min at 3 s, likelier given crowded chips |
| T2/T3 | 19 min | about 20 min | about 240 yes x 3 s, plus the unsupported "20% off" x 10 s |
| T4 | 10 min | about 10 min | |
| One helper, one image | 50 min | **about 66 min** (84 at 3 s) | |
| With the second T1 vote the QC rule requires | "+22" | **about 100 helper-min** (about 140 at 3 s) | |
| 55-image corpus | not stated | roughly 90-130 helper-hours | if the other images resemble this one |

Taps per decision are fine (1 for T1, T2 and an empty T4; 2 for a T3 pick). Dead time is fine if the
sprite is prefetched. The cost is in **what is asked**, not in the tapping:

- **77% of T1 chips are low-prior** (318 tl rejects + 439 extras) and take about 25 of the 36 minutes.
  On the labels, the extras raise reachable real NoRs from 61 to 68 of 72, so 7 known real ones for
  439 chips. Asking these one at a time is the main waste.
- **Halving move 1:** send all low-prior chips, not just `fail0`, through "tap any node" sheets of
  2x3. About 126 sheets x 5 s plus picks is about 13 min instead of 25. T1 falls from 36 to about 21 min.
- **Halving move 2:** dedupe extras at 12 px (the page's own missing radius), not 5. That removes 144
  chips (about 5 min) and stops a yes on an extra becoming a `missing` label on top of an existing candidate.
- **Halving move 3:** take T2/T3 off the phone for now (section 4). That removes 20 min.
- With all three: about **30 min per helper per image**, 21 of them double-voted.

**Area walk or pooled?** T1 chips are context-free crops; the helper never sees the image, so walking
areas buys T1 nothing on a phone and costs a change of question type about every 10 chips (T1, T2, T3,
T4 inside 40 s). The Zooniverse 1-3 s figure is for one question repeated. Pooling T1 across areas, and
across images, also makes gold mixing, second votes, easiest-first ordering and 3-minute bursts
simple. T4 must stay per area, as a later pass once that area's chips are settled. This contradicts
the `designing-ground-truth-tasks` skill ("one walk, area by area, never one pass per task"). The
skill's reason is seeing a region finish on the image, which a phone chip stream never shows. That is
the owner's call, not a tuning step; the per-area reveal can still be the T4 reward.

## 3. Answerable in about 2 s by a trained non-lead?

| Question | Answerable? | Why |
|---|---|---|
| T1 on a tl pass | Yes | Clean triplet, about 90% yes on the labels (46 real, 5 false) |
| T1 on a reject or an extra | Often not | R7's reasons are purity at most 20%, green balance at least 1/4, 3.5 noise units, faintest tenth of the image. None can be judged by eye on an 8-bit crop, and "faintest tenth" needs the whole image. Claude's own labelling left 35 of 200 unsure. Expect a high Can't-tell rate; measure it |
| T1 on a void node or heminode | No | Open in WARMUP. Until the owner rules, helpers will split and the split gets read as noise |
| T1g | Yes if 2x3 | "Might be" is a low bar, which suits it |
| T2 | Only for gross errors | And nobody has defined "fit" for the outer-extent length bar |
| T3 | No | See section 1 and the R4 mismatch |
| T4 | Yes | Coarse by design. "Tap what looks like a node" is easier than T1 on a faint chip |

Gold cannot be built yet. STATE.md: no curated truth has arrived and the 200 labels are Claude's.
The design says so; it blocks T0 and the whole QC table, so it is step zero.

## 4. Ground-truth equivalence

| Output | Claimed | Actual |
|---|---|---|
| `label` 1/0 on tl candidates | Same | **Same in format** (`validate()` accepts extra keys; scoring matches by x, y within 5 px). Evidence differs: desktop shows segment borders and the image around; the chip is blind and crowded. Same tier only after a measured agreement rate against a desktop-tagged image |
| Label 1 with no T2 answer | not addressed | `measured: null`, which desktop never writes. Harmless, and more honest than desktop's implied approval |
| `measured: approved` from T2 | Same | Weaker: the look is coarser than desktop's and "fit" is undefined |
| `adjusted` from T3 | Same along the axis | Not supportable at phone resolution; R4 options do not exist |
| `missing` from extras and T4 | Weaker, `measured: null` | Agreed, and better than desktop, which stamps every added NoR `adjusted` with median bars (`measured()` returns it for any `c.added`). Needs `radius_px` or `validate()` rejects it. Dedupe against existing candidates first |
| Label 0 on extras | not addressed | Harmless (it counts only when some finder passes there); cheap to keep, single-vote |
| Areas checked | "Same claim" | Desktop keeps them only in localStorage (`AREAS_KEY`), not in the file. Neither tier records it today |
| Pack identity | not addressed | The file needs the image's Drive id and SHA-256 or `validate()` refuses it, and should name the finder version, since chip ids are meaningless outside that run |

Net: detection labels can reach the desktop tier. Measurements should not be claimed from the phone at all yet.

## 5. Algorithmic dependencies

| Extraction | Exists? | Cost / risk |
|---|---|---|
| Candidates, boxes, axis, `lines`, `fail0` | Yes (`interactive.detect`) | 534 of 540 tl candidates have an axis |
| Level-turned crops | Only as browser canvas code in `nor.js` | **New**: an offline pack builder (sprite + JSON) in Python. Small, but it must be shown to produce the same crop |
| Union of five finders | Runs today, about 21 s raw Python | Low cost. Risk: duplicates (144 within 12 px) and 439 chips of workload |
| Bare Nav peaks | No | 70 to 1,700 chips depending on an unchosen floor. High risk to throughput; add only if the union's measured recall is short |
| Caspr profile plot (T2) | Not in `measure()` | New. Only worth it if T2 stays |
| R4 definitions A/B/E | **None computed** | New, and they define a different quantity from the bar T3 edits. Do not build for the phone |
| `fill` at a tapped point (T4) | No; `segment_fill` runs on the whole image | New seeding path. Not needed if marks carry `measured: null` |
| Touch loupe | No | Not needed for a 12 px radius |
| Pack hosting, answer sync, helper identity | No | Each is a network call needing its own approval (`network-calls-approved`). The largest non-algorithmic cost |
| Gold set | No curated truth | Blocked on the lead tagging one image on desktop |

## 6. Top five changes, ranked

1. **Phone tier = detection only: T1, T1g, T4.** Drop T2/T3. They take about 20 of 66 minutes, need
   two new extractions, rest on an R4 mismatch and ask for 1 px calls at 0.67 mm per px. Labels go out
   with `measured: null`; bars stay with the lead on desktop.
2. **Triage by prior.** One chip at a time only for passes (about 222). All rejects and extras go
   through 2x3 "tap any node" sheets, picks then go to T1. T1 drops from 36 to about 21 min.
3. **Fix the proposal pool before sizing anything on it.** Dedupe at 12 px, drop "recalling preset",
   leave Nav peaks out until a desktop-tagged image shows what recall the union alone reaches.
4. **Pool T1 into one stream across areas and images; T4 as a later per-area pass with tap-to-mark,
   no loupe, no pinch.** Put the conflict with the area-walk skill to the owner as a question.
5. **Make every target and chip unambiguous.** Back and Can't tell become 44 px+ buttons away from
   Yes; swipes only on the chip, not from screen edges; mark the asked triplet with a white bracket
   off the signal instead of four margin ticks. Before any of it: the lead tags one image on desktop
   (gold), and void nodes and heminodes get a ruling.
