# NoR Finder on a phone, v2 (after the efficiency review)

Replaces `design.md` where they differ. Counts are the review's, measured on the one reference slide (1200 x 1200, 540 tl candidates, 222 passes); seconds per task are still assumptions.

## What changed and why

| # | Change | Why |
|---|---|---|
| 1 | **Phone tier is detection only.** T2 and T3 are gone; every phone label carries `measured: null` | No R4 definition is computed, R4 defines the gap and not the bar T3 edited, and a 1 px call is 0.67 mm on screen. Bars stay with the lead on desktop. Saves about 20 min and two extractions |
| 2 | **Passes one at a time; rejects and extras on 2x3 "tap any node" sheets**; a tapped chip then gets its own T1 | 77% of v1's chips were low-prior and took about 25 of 36 min. 3x3 was too small to read (red spot about 2 mm) |
| 3 | **Proposal pool = union of the five finders, deduped at 12 px** (the page's missing radius). No "recalling preset", no bare Nav peaks | Presets do not change the pool; 144 extras duplicated a tl candidate; the Nav floor was undefined (70 to 1,700 chips). Add peaks only if a desktop-tagged image shows the union's recall is short |
| 4 | **T1 and sheets are one pooled stream, not an area walk; T4 is a later pass per area**, plain tap to mark, no loupe, no pinch | Chips are context-free, so the walk only forced a change of question every ~10 chips. A mark matches within 12 px = 5.4 mm on screen, which a tap hits; an area is 2.7x on the phone, so no zoom |
| 5 | **Targets and the asked triplet made unambiguous**: Back and Can't tell are 48 px buttons in their own row, 24 px clear of Yes / No; swipes act only on the chip; a white bracket above and below the asked triplet, off the signal | The v1 links were 3 mm tall under Yes; edge swipes collide with iOS back and home; 495 of 540 candidates have a neighbour inside the chip, so margin ticks did not say which |

Also corrected: 540 / 222 not 463 / 206; T3's "hand evidence for R4" claim withdrawn (R4 wants the owner's own measurements).

## Where I differ from the review

- **Sheets for every tl reject (partly disagree).** The review itself says rejects are often not judgeable by eye, and a sheet gives each chip a sixth of a glance. A reject's label 0 matters more than an extra's, because the page's live filters can turn it into a pass. So: a sheet "no" is recorded as `via: "sheet"`, needs two helpers on differently shuffled sheets, each sheet is filled with chips of similar brightness (a bright node does not hide a faint one), and gold positives are seeded into sheets to measure the sheet miss rate. If that rate is poor, tl rejects go back to single chips (+318 chips, about 11 min).
- **Pooling across images (partly disagree).** Across areas, yes. Across images only for gold and second votes: one image at a time lets a pack finish and be submitted, and the helper's eye settles on that image's brightness.
- **Easiest-first ordering (disagree).** Passes are about 90% yes; served in a block, Yes becomes a reflex. Keep them shuffled with gold negatives and sheet picks.

## Tasks

| # | Task | Shown | Answers | Extraction | Est. s |
|---|---|---|---|---|---|
| T0 | Practice, first run | 8 gold chips, answer shown | as T1 | curated truth (none exists yet: step zero is the lead tagging one image on desktop) | 40 total |
| T1 | **Is the bracketed one a node?** (222 passes + sheet picks + ~10% gold) | level-turned chip, 78 px source at 4x, white bracket off the triplet, grey Caspr and Nav strips | Yes / No big; Can't tell / Back 48 px, separate row; swipe on the chip only | new: offline pack builder (sprite + JSON) reproducing the page's level-turned crop | 2-3 |
| T1s | **Tap any that might be a node** (318 rejects + ~295 deduped extras = ~103 sheets) | 2x3 sheet, each chip 160 px with its own bracket | tap chips, then **None left** / **Next** | same builder; brightness-sorted grouping | 5 per sheet |
| T4 | **Any node left here?** (100 areas, after the area's chips are settled) | one area at 2.7x, answered items as faint outlines | tap a spot = dashed ring, tap it again to remove; **Nothing left** / **Done** | exists: grid, outlines. A mark is `kind: missing`, `radius_px: 12`, `measured: null` | 5, +2 per mark |
| T5 | Done | counts, gold score, desktop list | Send | `shell.submitTruth` | - |

File: `norfinder-ground-truth/2` with `source: "phone"`, `votes`, `via`, the image's SHA-256 and Drive id, the finder version the pack was built from, and the areas checked (which neither tier records today).

## Throughput (one helper, this image)

| | Count | Time |
|---|---|---|
| T1 singles | ~310 (222 + ~60 picks + gold) | 10-16 min |
| T1s sheets | ~103 | ~9 min |
| T4 | 100 | ~9 min |
| **Total** | | **about 28-34 min** (v1 recomputed: 66-84) |
| With second votes on T1 and sheets | | about 50-60 helper-min (v1: 100-140) |

Bursts are now one question type each: a 3-minute sitting is ~70 singles or ~35 sheets.

## Tier

Detection labels: desktop format, and desktop tier **only after** an agreement rate is measured against a desktop-tagged image. Measurements: none claimed. Misses: weaker (pool plus a 5 s look).

## Owner questions (new or sharpened)

1. **The area walk.** `designing-ground-truth-tasks` says one walk, area by area, never a pass per task. On the phone I propose a pooled chip stream and a per-area T4 pass after it, with the picture-reveal as T4's reward. Yours to rule.
2. Void nodes and heminodes: needed before any helper starts, or their splits read as noise.
3. Each network call (packs, answers, helper identity) still needs its own approval.
4. Is `measured: null` on a label 1 acceptable in curated truth?
