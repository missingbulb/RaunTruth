# NoR Finder: ground truth on a phone (design exploration)

Nothing here is built or approved. Timings are estimates, not measurements, except where a source is cited.

## (a) What the desktop makes, and what the phone must make

The desktop submits one `norfinder-ground-truth/2` file per image (`truth()` in `studies/nor/web/nor.js`, `req/nor/downloads`):

| Desktop output | How it is made | Phone equivalent | Tier |
|---|---|---|---|
| `label` 1 / 0 per candidate (unvoted = ambiguous, left out) | thumbs up / down on the card | T1 yes / no chip; "can't tell" = left out, as on desktop | **Same**, once two answers agree and the helper passes gold |
| `measured: approved` (the finder's length, red length, width are right) | implied by thumbs up | T2 "bars fit?" yes | **Same** |
| `measured: adjusted` + `lines` (three draggable bars, axis can turn) | drag bar ends on the crop | T3 nudge an end **along the axis only** | **Same for a shift along the axis; weaker otherwise**: a tilted axis or a wrong width position cannot be fixed, it goes to desktop |
| `kind: missing` NoRs with position, radius, lines | right-click "Add a NoR Here", then correct its bars | T1 on *extra proposals* (new extraction), then T4 tap-to-mark | **Weaker**: position is good; bars are the image's typical ones unless T3 fits them, so `measured` should be `null`, not `adjusted` |
| 100 areas checked for misses (kept in the browser, gates Submit) | "No missed NoRs here" per area | T4 area check | **Same claim, weaker evidence** (small screen, 5 s look) |

Proposal: the phone writes the same format plus `source: "phone"`, `votes` per label and the helper's gold score, as a *submission*. The Data Manager's accept step (STATE.md, R10) stays the gate into curated truth. The lab can then score with or without phone labels. So: **detection labels are the same tier; measurements are the same tier only where approved or shifted along the axis; misses are a weaker tier.**

## (b) Micro-tasks, in order

One "pack" = one image, pre-extracted (see (c)). Work comes area by area as on desktop (`req/nor/truth/order`), so each area closes with its check; inside an area the chips are shuffled and **blind**: the helper never sees whether the finder passed or rejected a chip.

| # | Task | Shown | Answers | Extraction behind it | Est. s |
|---|---|---|---|---|---|
| T0 | Practice (first run only) | 8 gold chips, answer revealed after each | as T1 | curated truth of another image | 40 total |
| T1 | **Is the centre a node?** | One chip: crop turned level, ~3x the node's length wide, upscaled by whole pixels; white ticks in the margin point at the centre triplet (never drawn on the signal). Below it, the same crop as two grey strips (Caspr, Nav) for colour-blind helpers and yellow overlap | swipe right / big **Yes**; swipe left / big **No**; swipe up / small **Can't tell**; Back | exists: level-turned crops with padding (`req/nor/cards/options`), per-candidate box, axis lines. New: crop for candidates with no axis (one green, no green) uses the nearest green's direction, else unturned | 2 (Zooniverse measured 1-3 s for swipe yes/no [1]) |
| T1g | *Optional* **Tap any node** | 3x3 sheet of chips the finder rejected before any check (no second green, joined greens) | tap those that might be nodes, then **None left** | exists: `fail0`. Picked chips go to T1; unpicked get label 0 with one vote | 6 per sheet of 9 |
| T2 | **Do the bars fit?** (only chips answered yes) | Chip enlarged, the three bars drawn white above/below the signal with end ticks, the Caspr profile along the axis as a line under it with the two ends marked | **Fit** / **Off** / Can't tell | exists: `lines`, `m`. New: the axis profile plot (R3 plot-profile, drawn rather than only computed) | 3 |
| T3 | **Pick the better ends**, then nudge (only after "Off") | The same chip three times, each with the length ends from a different R4 definition (A, B, ...); below, "None" opens a nudge: thumb drags anywhere in the left or right half to slide that end, 1 px steps, haptic tick per step | tap one of 3, or nudge + **Done**, or **Tilted, send to desktop** | new: emit every R4 definition's ends per candidate (R4 says they share the pipeline; check which are computed today). Red length and width: nudged the same way, one bar at a time | 5 pick, 12 nudge |
| T4 | **Anything left in this square?** | One area (1/100 of the image, about 1.5x on a phone), everything already answered dimmed to an outline, pinch to zoom | **Nothing left** / tap a spot (loupe opens above the finger, drag to place, **Mark**) | exists: grid, cut-out of decided items. New: touch loupe. A mark becomes a `missing` label; its bars are tried by running the `fill` finder at that point, then T2 | 5, +8 per mark |
| T5 | Done | counts, gold score, what went to desktop | **Send** | exists: `shell.submitTruth` | - |

Why T4 is short: before it, the pack adds **extra proposals** to T1, so most misses are answered as ordinary chips. New extraction: the union of all five finders' candidates at their "recalling" preset plus bare Nav peaks above an image-relative floor, minus anything within 5 px of a current candidate (the lab's own matching distance). A yes on one of these is a `missing` label.

Throughput for one image like the reference slide (463 candidates, ~206 passes; assume ~150 extra proposals, 10% gold):

- T1: ~670 chips x 2 s = **22 min**
- T2/T3: ~230 yes x 3 s + 20% off x ~10 s = **19 min**
- T4: 100 areas x 5 s + marks = **10 min**
- Total about **50 min of thumb time per image per helper**, in bursts: one area is 5-7 chips, about 20 s, so a 3-minute break clears ~9 areas. A second helper on T1 only adds ~22 min. All of this is arithmetic on assumed seconds; only the T1 figure has outside support.

## (c) Entry flow

The phone cannot run the finder (Pyodide + numpy + a TIFF is "the slow part" even on desktop). So a pack is built ahead: a JSON of items and one sprite image of chips, made by the lab or by a desktop session, fetched by the phone.

1. Open the link or home-screen icon (the page as an installable web app; a store app adds nothing here).
2. The page opens straight on the next unanswered chip of the last pack, with no menu. Target: first answer within 5 s of opening, 45 s the first time (T0).
3. Answers save locally after each one and send in the background; closing the phone mid-area loses nothing.

Layout: answer buttons at least 64 px tall in the bottom third, nothing to tap in the top third; about half of people hold a phone one-handed and the bottom is the comfortable reach [3]. No sound. A short vibration on commit where the browser has one (Android; iOS Safari has none, so the chip's slide is the confirmation). Reduced-motion users get no slide, as on desktop.

## (d) Misses and measurements

- **Misses**: two layers. Extra proposals as T1 chips (simple, blind, mixed with real candidates, so "yes" is not a habit), then T4 per area (coarse). Recall of the phone tier is bounded by what the proposal pool plus a 5 s look catches; measure it against a desktop-tagged image before trusting it.
- **Measurements**: T2 separates "is it a node" from "are the bars right", which desktop folds into one thumbs up. Fit = `approved`. Off = pick among R4 definitions (each pick is also the hand evidence R4 waits for), else a 1-D nudge = `adjusted`. Tilted axis, wrong width position, or two nudges undone = desktop queue with the label kept and `measured: null`.
- **Ambiguous**: "Can't tell" is never forced. It is left out of the file like an unvoted desktop candidate and listed for the lead on desktop.

## (e) Quality control

| Mechanism | Rule (starting values, to tune) |
|---|---|
| Gold chips | ~1 in 10 T1 chips has a curated answer, unmarked. Below 85% on the last 20, the session pauses into practice and its answers since the last good gold are dropped |
| Agreement | A T1 label needs 2 matching answers from different helpers; a split gets a third; still split = desktop. With one helper only: single-vote labels, flagged, plus 5% repeats of their own chips for consistency |
| Weighting | Majority vote to start; per-helper error rates (Dawid-Skene) only if helpers differ a lot [2] |
| Bias guards | Blind to the finder's verdict; chips shuffled so yes and no alternate unpredictably; a run of 15 identical answers under 1 s each triggers a gold chip |
| Escalation | Can't tell, splits, tilted axes and any area where a helper marked 3+ misses go to a desktop list for the lead |

Bootstrapping problem: gold needs curated truth, and STATE.md says none has arrived (the 200 labels are Claude's, not the owner's). The lead has to tag at least one image on desktop first.

## (f) Open questions for the owner

1. **Network and storage (each needs its own approval under `network-calls-approved`)**: where packs live and who builds them; where answers go before submission; a helper identity for agreement and gold scores.
2. Is a phone-tier label acceptable in curated truth after two agreeing votes, or must the lead confirm every one?
3. Should T2 exist at all for helpers, or do helpers only do T1/T4 and the lead approve bars on desktop?
4. Void nodes and heminodes (open in WARMUP): a third T1 answer "half node", or keep them under "No"?
5. May the helper be shown the finder's verdict or rejection reason? This design hides both.
6. Is T1g (nine at once) worth its weaker one-vote "no" labels?
7. Reward: keep the picture-reveal on the phone (one square uncovered per area)?
8. Which R4 length definitions should T3 offer, and are all of them computed today?

## Sources

Read as search-result summaries only, not the pages themselves; verify before quoting further.

1. Zooniverse blog, "Notes on the Zooniverse mobile app" (2019) and "Keeping it simple" (2017): swipe yes/no workflows, 1-3 s per mobile classification, yes/no as a filter before a detailed workflow. https://blog.zooniverse.org/2019/08/01/notes-on-the-zooniverse-mobile-app-a-first-look-at-mobile-usage-and-results/ , https://daily.zooniverse.org/2017/09/11/keeping-it-simple/
2. Dawid and Skene (1979) and the AWS SageMaker Ground Truth write-up: majority vote is fine when workers are alike; model error rates when they are not. https://aws.amazon.com/blogs/machine-learning/use-the-wisdom-of-crowds-with-amazon-sagemaker-ground-truth-to-annotate-data-more-accurately
3. Hoober's grip observations (49% one-handed) via Smashing Magazine, "The Thumb Zone". https://smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users
