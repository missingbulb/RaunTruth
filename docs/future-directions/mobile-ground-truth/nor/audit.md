# Audit of the phone tagging design v2 (NoR)

Audited: `design-v2.md`, `mockup-v2.html`, `shot-v2-light.png`, against `studies/nor/` at HEAD. Nothing tracked was edited.

**Which numbers to trust.** Counts marked *measured* come from the one reference slide (1200 x 1200, tl: 540 candidates, 222 passes), re-run here (throwaway probe scripts, not kept). Sizes in mm are geometry: mockup pixels x 0.17 mm (6.1" phone, 390 CSS px wide). **Every duration is an estimate** built from textbook figures (a fixation with its saccade about 0.25 s, a two-way decision 0.3-0.5 s, a thumb tap on a near, large target 0.25-0.35 s, a reach that needs a regrip 0.6-0.9 s). Nobody has timed a person on this. Label yields rest on Claude's 200 labels, not the owner's.

New facts measured for this audit:

| Fact (reference slide, tl) | Value |
|---|---|
| Longest pass triplet | 32 px (median 26): always inside a 78 px chip with 23 px or more of margin each side |
| Passes with another **pass** inside their chip (within 39 px) | 165 of 222 |
| Passes whose length line crosses a square's border | 51 of 222; 180 of 540 candidates sit within 12 px of a border |
| Candidates whose chip runs off the image | 38 of 540 |
| Reject reasons the eye cannot check in a chip | dim 56 + faint for its image 25 + in nucleus 12 + shares a segment 14 = 107 of 318 |
| Pass axis already within 20 degrees of level | 187 of 222 |
| Display window (the page maps to 8-bit by image quantile) | at the 99.9th percentile 67 of 222 passes clip in red and a dim/faint reject shows at about 54% against 85% for a pass; at the 98.7th, 220 of 222 clip and the difference is gone |
| Rejects with an axis to turn by | 312 of 318. The desktop page never turns a rejected crop level (`readOpts`), v2 turns all |

## 1. Pre-mortem: it failed six months in. Why?

Likelihoods are my judgment, not measured.

| # | Side | Story | Likely | Change that prevents it |
|---|---|---|---|---|
| 1 | Owner | **Gold was never built.** T0, the check score, the sheet miss rate and the tier promotion all wait on the lead tagging one image on desktop. No curated truth has arrived since September. Nothing ever got measured, so the labels stayed "indicative" and nobody used them | High | The pack builder refuses to build without a desktop truth file for at least one image. Bootstrap alternative: three helpers tag, the lead rules only on the disagreements |
| 2 | Data | **The labels are the finder's output.** Passes are about 90% yes, the thumb rests on Yes, and a chip takes 2 s. Helpers approved tl's false passes; the lab then scored tl against its own opinion. A second helper has the same reflex, so two votes do not catch it | High | Gold negatives that are *finder passes* (only 5 known today), yes-rate on them shown per sitting; a 0.3 s lock before Yes arms; never a default-yes sheet for passes (considered below, rejected) |
| 3 | Helper | **Nobody came back.** 30 min x 2 helpers x 55 images is 50+ hours of one question with no reward: the picture reveal was moved to the last pass, which most never reached | High | A row of squares is a sitting (about 3 min) and ends with its strip of the picture; ask the owner how many images truth is needed on before sizing for 55 |
| 4 | Data | **Sheet "no" wrote label 0 on real faint nodes.** Six chips, a 3.4 x 1.9 mm red spot, search stops after the first find, and one tap on "None left" writes six labels. Those label 0s are the ones that punish a finder for recovering a reject | Medium-high | Input lock when a sheet appears, no label 0 from one helper's sheet, gold positives in sheets with the miss rate reported beside the labels, picks decided in place at full size |
| 5 | Tech | **Progress was lost.** Sync and identity each need an approval that never came, so answers stayed in browser storage; Safari drops a site's script-written storage after seven days without a visit unless it is on the home screen. A helper lost 20 minutes and stopped | Medium-high | No backend: the pack is static files, answers leave through the share sheet as a file after every row; first run asks to add to the home screen |
| 6 | Owner | **The agreement rate came back at 85% and nobody knew if that was good.** No threshold was set, so the phone tier stayed in limbo | Medium | Set the bar before building. Test the question on paper first: 60 static chips on the lead's own phone, one afternoon, before any builder or sync is written |
| 7 | Data | **Faint nodes were under-labelled.** Tagging happened on a bus in daylight. Bright nodes got yes, dim ones Can't tell or no: the truth is biased exactly where the finders differ | Medium | One fixed display window per image (never per chip), a known-dim gold chip in every sitting, a sitting that fails it is held back |
| 8 | Data | **Helpers split on void nodes and heminodes**, and the split was read as noise. Images with a different pixel size made a 4x chip show nodes at another size | Medium | The owner's ruling before the first helper; a three-picture legend one long-press away; chips cut in micrometres (13.6 um), not 78 px |
| 9 | Tech | **Phone evidence was not desktop evidence.** The builder's crop had no DAPI, another window, turned rejects. And the finder moved on (this lab mutates it weekly), so half-done packs pointed at a pool that no longer existed | Medium | Builder proven by pixel diff against the page's crop; labels keyed by x, y and image SHA; a pack carries the finder version and stays valid for its own pool |
| 10 | Data | **The squares pass found nothing.** About 9 in 10 squares hold no missed node, so "Nothing left" became a reflex. "100 areas checked" went into the file and meant little | Medium | Seed squares where a known node's outline is withheld; report the hit rate next to the areas-checked claim |
| 11 | Owner | **It was turned down at review.** It breaks the area-walk rule and writes label 1 with `measured: null`, both the owner's to decide | Medium | Ask both first; the row walk in v3 keeps the rule's point (a region finishes, the picture grows) |
| 12 | Tech | **"835 waiting for a second helper" never cleared.** There was one helper. Squares "open once chips are settled", so they never opened either and no pack was ever sent | Medium | Squares need the pool's outlines, not the answers: open from the start. One-vote labels go out marked `votes: 1` |

## 2. What each decision needs, and whether the screen has it

| Task | The decision | Must be visible | On v2's screen? |
|---|---|---|---|
| T1 | Red between two greens, in a line | Both flanks whole | Yes: 23 px or more of margin (measured) |
| | | Which triplet is asked | On the colour chip yes. **Not on the grey strips**: no bracket there, another scale (1.95x against 4x), and 165 of 222 chips hold a second pass |
| | | Red and green where they overlap | Only through the strips, which need re-finding (above) |
| | | Is it faint *for this image* | **No.** Needs the whole image. Depends on a window the design never names: per chip it is lost entirely, at the page's own it is partly clipped |
| | | Does it sit on a nucleus | **No.** The mockup's chip and strips carry no DAPI; the desktop crop does |
| | | Does the fibre continue | **Nobody can.** The stain is DAPI, Caspr, Nav: nothing marks the axon. Not a phone defect, but the question must not be taught that way |
| | | Out-of-plane tilt | **Nobody can**: single-plane images |
| | | Is the neighbour using the same green | Partly: both are in view, but each is asked alone, so two yeses on one shared green are possible (desktop too) |
| | | Black beyond the image edge | **No**: 38 chips run off the image and black reads as "no flank" |
| | | The finder's reason | Hidden. Right: it would bias. Keep it hidden |
| T1s | "Might be" at 2x | The same, at half size | Flanks yes; overlap, nucleus, faintness no. Brightness-sorted sheets make all six look alike, and whether a sheet is stretched to itself is unstated |
| T4 | Is an unoutlined node here | The whole node | **No for nodes on a border** (51 of 222 cross one): half shows, and the same node can be marked in two squares |
| | | Which things are already in the pool | Yes, outlines. Needs the pool only, not the answers |
| | | Nucleus, faintness | No, as T1 |
| T0 | Learn the bar | Curated truth | **Does not exist** |
| T5 | Send | Image SHA-256, Drive id | In the pack. Every network call still unapproved |

The pack must hold, per image: SHA-256, Drive id, micrometres per pixel, the display window, finder version. Per chip: x, y, angle (and a rule for the 6 without one), the finders that proposed it, its square, three renderings (colour with DAPI, Caspr, Nav) cut by one transform, an edge mask, a brightness rank for sheet grouping. Per helper: shuffle seed, gold flags (answers hashed, not readable). For squares: a margin and the pool's outlines.

## 3. Walkthrough from the body

Distances are in the 740 px mockup frame; on a real 844 px screen v2's top-anchored chip and bottom-anchored buttons drift another 10 to 17 mm apart. Comfortable one-handed thumb reach is taken as about 65 mm from the bottom corner (assumption).

### T1, one chip (v2)

| Step | Body | Size / distance | Time | Verdict |
|---|---|---|---|---|
| 1 | Next chip replaces the last; eyes are already there | chip 53 x 38 mm | 0.2 | fine |
| 2 | One fixation on the bracket (always dead centre) | bracket 23 mm wide | 0.25 | fine |
| 3 | Look left and right for the greens; with a second triplet in the chip (3 of 4 passes) one more fixation to rule it out | triplet 17.7 mm, red 6.8 x 3.7 mm | 0.25-0.5 | fine; taxing when crowded |
| 4 | Compare red with the background, decide | | 0.3-0.5 | fine |
| 5 | Optional: eyes drop 26 mm to the strips, two fixations, find the same blob again with no bracket at half scale, come back | strips 26 x 11 mm, red 3.3 mm | 0.8-1.0 | **taxing**; on a clean chip **redundant** |
| 6 | Tap Yes; the thumb is resting on it and the eyes stay on the chip once the layout is learned. In the first dozen chips the eyes travel 77 mm down and back | Yes 25.5 x 12 mm | 0.25 (first chips +0.5) | fine |
| 7 | Nothing confirms which button registered, so some taps get a glance down | 77 mm | 0-0.5 | **redundant** |

Clean pass 1.6-1.9 s, crowded or with strips 2.3-2.9 s: **about 2.2 s on average. The 2-3 s claim holds for passes.** A sheet pick is a hard chip by construction: strips every time, hesitation, about **5 s** (the design counts them at 2-3).

| Bad path | What the body does | Time | Verdict |
|---|---|---|---|
| Wrong tap, undo | Notice only after the chip is gone (memory). Eyes 77 mm down to Back, thumb 10 mm up, tap; old chip returns **without showing what I answered**; re-read, thumb 27 mm across, tap | 3.5 on top | **taxing** |
| Can't tell | A rarely used, smaller target (25.5 x 8 mm): eyes must guide the thumb 27 mm left, 10 mm up | +0.6 | fine |
| Swipe on the chip | Thumb leaves the buttons, reaches 58 mm or more up, covers the chip it is judging, drags; starts 2.7 mm from the screen edge, where iOS reads "back" | +0.5, error-prone | **redundant** |
| Left hand | Yes is on the far side: every yes is a 27 mm stretch, No is under the thumb. Nine in ten answers are yes. The cheap answer is the wrong one | +0.2 per yes, and a pull toward No | **taxing** |
| Glare | Chip is black with small coloured marks; green is the weaker channel. Tilt the phone, shade it, lean in | +1 to 3, or a guess | **grueling** |
| Loud lab | No sound is used. No haptics on iOS Safari either, so no cost and no confirmation | 0 | fine |
| Interruption | Unlock, find the tab, read a welcome card (3 lines and a score), tap Continue, then three slow chips while the eye settles | 8-10 a sitting | **redundant** (the card), taxing |

### T1s, one sheet (v2)

| Step | Body | Size / distance | Time | Verdict |
|---|---|---|---|---|
| 1 | Sheet appears. A double tap carried over from the last sheet lands on the same button: six label 0s unseen | | 0.25 | **futile** when it happens |
| 2 | Six chips in a Z, one or two fixations each, six decisions held against one bar | chip 26 x 17 mm, red 3.4 x 1.9 mm | 2.7-3.6 | **taxing** |
| 3 | Per tap: top-row chips are 88 mm from the button, beyond one-handed reach; regrip or second hand; the hand covers the lower chips | | 0.8 each | **grueling** one-handed |
| 4 | Check the blue border came on | | 0.2 | fine |
| 5 | Tap None left / Next | 53 x 12 mm | 0.35 | fine |
| later | Each pick returns alone, out of context, to be found and judged again | | 5 each | **taxing**, half redundant |

0 taps 3.4 s (about 53% of sheets if a tenth of chips are picked), 1 tap 4.5 s (35%), 4 taps 7 s and 20 s more of follow-ups. **Average about 4.0 s: the 5 s claim is generous.** The cost is in what a 0.5 s glance at a 2 mm spot can be worth, not in seconds.

### T4, one square (v2)

| Step | Body | Size / distance | Time | Verdict |
|---|---|---|---|---|
| 1 | New square, unrelated to the last, not turned | 53 x 53 mm, a node 11.5 mm | 0.25 | fine |
| 2 | Sweep it: 6 to 10 fixations, each blob checked for an outline; up to 15 outlines in a square | | 1.8-3.0 | **taxing**; for about 9 in 10 squares the answer is nothing |
| 3 | A half node on the border: mine, or the next square's? | | +1 | **futile** (no way to know) |
| 4 | Mark: the square's upper half is out of thumb reach (centre 69 mm up); the finger covers the node; lift and check the ring | radius 5.3 mm | 1.5-2 | taxing |
| 5 | Nothing left / Done | | 0.35 | fine |

About 4.5 s for an empty square, 6-7 s with a mark. **The 5 s (+2 per mark) claim holds.**

### v2 per image, summed from the steps

| | Design | From the steps |
|---|---|---|
| T1: 222 passes x 2.2 + 60 picks x 5 + 28 gold x 2.5 + about 9 undos | 10-16 min | 14.8 min |
| T1s: 103 x 4.0 | 9 min | 6.9 min |
| T4: 100 x 4.5 + marks | 9 min | 7.8 min |
| Not in the design: six re-entries, Can't-tell hesitation, practice | - | 2.7 min |
| **One helper** | **28-34 min** | **about 32 min** |
| With second votes on T1 and sheets | 50-60 | about 54 helper-min |

The claims hold, at their upper end. v2 is not slow; it is fragile.

## v3 changes

| # | Step it replaces | v3 | Saves (per helper, per image) |
|---|---|---|---|
| 1 | Strip glance (T1 step 5), eye travel to buttons (6) | **Chip stack sits on the buttons.** Colour chip, then Caspr and Nav tracks at the same 4x and the same x, the bracket's ticks running down through all three; Yes / No directly under. Chip to Yes 44 mm (was 77), track to Yes 13 mm; eyes drop straight down with nothing to re-find. Free space goes to the top. This is also what the desktop card does (verdicts under the crop) | 0.5 min; the strips become usable |
| 2 | Wrong-tap path, unconfirmed tap (7) | A white tick or cross stamps the chip's corner as it leaves. The left small button reads **Undo: Yes** for the last answer; one tap restores the chip with that answer shown | 0.2 min; undo 3.5 s to 2 s |
| 3 | Swipe | **Removed.** Buttons only | fewer errors |
| 4 | Left hand | Asked once ("which thumb?"); Yes goes under that thumb | removes the pull toward No |
| 5 | Sheet reach (step 3), carried-over tap (1) | Sheet bottom-anchored (top row 60 mm up, not 88); the button arms 0.4 s after the sheet appears | 0.3 min |
| 6 | Pick returns later | **A tapped chip opens in place** at 4x with its tracks and Yes / No / Can't tell, then the sheet comes back with it ticked. One orientation instead of two, and the tap is no longer a throwaway | 2.0 min (60 picks, 5.8 s to 3.8 s) |
| 7 | Faintness, nucleus, image edge invisible | One display window per image, written in the pack; DAPI drawn in the colour chip; hatching where the image ends; chips cut in micrometres. A small "red against this image" scale is **the owner's call**: it shows what the eye cannot get, but it is the finder's own quantity | 0; fixes four blind spots |
| 8 | Border nodes in squares (step 3) | Square shown with an 18 px margin, dimmed, inner corners ticked; a mark counts where its centre falls; marks within 12 px merge. Costs zoom: 2.0x, a node 8.8 mm, the radius 4.1 mm | 0; removes a futile step |
| 9 | Squares blocked on "settled", empty-square reflex | Squares need only the pool: open from the start. Seeded squares measure the hit rate | 0; unblocks the pack |
| 10 | Three long passes, reward at the end, welcome card | **Row walk: a row of ten squares is a sitting**: its passes, its sheets, its squares (about 3 min), then that strip of the picture. Resume lands on the chip, behind three known chips with the answer shown. Owner's call: it is the area-walk rule at row size | +0.3 min (warm-up chips cost more than the card) |
| 11 | Second vote on every pass | Second vote on every sheet, on every No and Can't tell, and on a fifth of the yes passes to measure agreement. Reflex yes is caught by gold, not by a second reflex | second helper 22 to about 12 min |

**Considered and rejected:** passes on a "tap any that is not a node" sheet (3 min instead of 8). A yes by omission makes the truth the finder's output wherever attention lapses, which is failure story 2 by design.

| | v2 (from steps) | v3 |
|---|---|---|
| A pass chip | 2.2 s | 2.0 s |
| A sheet pick, tap to verdict | 5.8 s | 3.8 s |
| A sheet with no taps | 3.4 s | 3.4 s |
| A square | 4.5 s | 4.5 s |
| Undo | 3.5 s | 2.0 s |
| **One helper, one image** | **about 32 min** | **about 29.5 min** |
| With second votes | about 54 helper-min | about 41 helper-min |

The honest result: the body costs only about 3 minutes too much. Nearly all the time is looking, which no layout removes. v3's gain is in what the labels are worth (four decisions that had no data, one futile step, the default-no sheet) and in whether anyone finishes a pack.

## Questions this leaves with the owner

1. Row walk in place of three passes: acceptable as the phone's form of the area walk?
2. Show a "red against this image" scale, or keep the helper blind to it?
3. Second votes sampled on yes passes, or on all?
4. How many of the 55 images need truth at all?
5. Still open from v2: void nodes and heminodes, `measured: null` on a label 1, each network call.
