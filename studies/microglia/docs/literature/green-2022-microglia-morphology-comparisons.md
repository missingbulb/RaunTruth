# Green, Murphy & Rowe 2022 — comparing ImageJ microglia-morphology methods

- **Title:** *Comparisons of quantitative approaches for assessing microglial morphology reveal
  inconsistencies, ecological fallacy, and a need for standardization*
- **Authors:** Tabitha R. F. Green, Sean M. Murphy, **Rachel K. Rowe\*** (\*corresponding,
  rachel.rowe@colorado.edu). Dept. of Child Health, University of Arizona College of
  Medicine–Phoenix; Dept. of Integrative Physiology, University of Colorado Boulder.
- **Venue / id:** *Scientific Reports* (2022) **12:18196**. DOI **10.1038/s41598-022-23091-2**.
  Received 19 Aug 2022, accepted 25 Oct 2022, published online 28 Oct 2022. 13 pages.
- **Licence (as stated in the PDF):** "This article is licensed under a **Creative Commons
  Attribution 4.0 International License**" (CC BY 4.0), © The Author(s) 2022.
- **PDF:** kept in the study's Drive `Literature` folder as `Comparisons of quantitative approaches for assessing microglial morphology reveal inconsistencies, ecological fallacy, and a need for standardization.pdf`, not in the repo.
- **Data:** Dryad, doi:10.5061/dryad.j3tx95xhq (CC0). Listed, but the files could not be
  downloaded from here (§5).

## What it gives the study

Five ImageJ methods (percent coverage, whole-image skeleton, fractal analysis, single-cell
skeleton with soma outline, Sholl) run on the **same** images and cells, in Iba1 DAB at 40× in
mouse cortex. It detects no cells automatically. What it settles for us:

- **The output must be a per-cell table.** Whole-image skeleton effects were **67–93% smaller**
  than the same metrics measured per cell, and three of the four per-cell skeleton effects
  vanished at image level. Averaging coverage per mouse hid an effect that per-image values found
  (p = 0.35 vs p = 0.006). Summaries keep the hierarchy, cells within images within animals.
- **The steps an automatic "every cell" method must do, because here a person did them.** Each
  cell was cropped with a fixed ROI and cleaned with a **paintbrush**: fragments not attached to
  the cell removed, branches broken by thresholding reconnected, against the original image.
  Somata were **counted by hand**. Every per-cell number in the paper comes from hand-cleaned
  masks, which is also what a ground-truth task for whole-cell masks would ask a tagger to do.
- **Threshold choice is a first-order effect.** One low-quality image gave **36.7%** coverage
  binarised directly and **14.8%** after a background-correcting threshold; the stricter cut
  removed processes and made cells look de-ramified. Our per-cell metrics should be reported
  with how they move with the threshold.
- **A primary-process count needs a soma mask, not a centre and a radius.** Somata are not round,
  so Sholl's first circle either cuts the soma or lands on secondary branches; primary processes
  are then missed or secondaries counted as primaries. For us: primary processes = branches
  leaving the soma mask.
- **Where the soma ends is a judgement call**, and this lab's outlines take in the thick proximal
  trunks (§3). A soma ground-truth mark needs a stated rule for that boundary.
- **The two hallmarks of reactivity** were fewer branches and a larger soma, the most sensitive
  and easiest to read. "Activated" is the de-ramified direction.
- **Per-cell reference magnitudes** (§2), within one method only.

**What it does not give:** fluorescence (it is brightfield DAB, dark on light); 20× (it is 40×);
hippocampus (cortex only, never mentioned); CD68 (never mentioned); 3D (z-stacks were taken but
every analysis is 2D, and how a stack became 2D is not stated); territory (hull area not
reported); a primary-process count; any automatic segmentation or its accuracy. Cells were
**3 random cells per image**, only from images "with clearly visible microglial cell bodies":
edge, overlapping and faint cells were never measured, the opposite of our goal.

## 1. The methods, with the parameters a comparison would need

**Whole-image skeleton** (after Young & Morrison 2018): 8-bit → FFT bandpass → brightness/contrast
by hand → unsharp mask → despeckle → threshold by hand → despeckle, close, remove outliers →
Skeletonize → Analyze Skeleton. Totals of branch length, endpoints and branches over the image,
each **divided by a manual soma count**.

**Background subtraction, a scale-free rule:** the rolling-ball radius was set to **50% of the
mean radius of 5 cell bodies**; "the same rolling ball radius of **50 pixels** was used throughout
the study". The pixel size is never given, so 50 px has no µm value.

**Single cell:** binarise; crop with **one fixed ROI** "sized to fit around all microglia in the
study"; paintbrush clean-up (above); outline → FracLac box counting, "grid design Num G" = 4, with
convex hull and bounding circle; the same cell skeletonised for branches, total length and
endpoints; **soma area and perimeter outlined by hand** (multipoint selection).

**Sholl:** radius from the soma centre to the tip of the longest branch; first circle "as close to
the edge of the cell body as possible"; circles every **5 µm**.

**Statistics:** hierarchical GLMMs (glmmTMB) with animal crossed with region for single cells and
mouse crossed with a binned cell count for whole-image values.

**Unstated:** image and pixel size; z-stack settings and the 2D reduction; threshold method or
value in any pipeline (always "adjusted" by hand per image); FFT, unsharp-mask and
remove-outliers parameters; Analyze Skeleton pruning and fragment handling; the ROI size; which
"circularity" FracLac reports; the Sholl first-circle radius; how "branch" differs between the
whole-image and single-cell analyses; how edge cells were handled.

## 2. Reference numbers

Values are model point estimates and 95% CIs **read by eye off Figs 3–4**, good to about half a
tick; the text gives only p, Δ and effect size d. Male C57BL/6J; Treatment = microglia depleted
with PLX5622, repopulated and given LPS twice, which left them more reactive in shape.

**Single cells** (n = 345 control cells / 13 mice, 324 treatment / 12 mice):

| metric | control ≈ (95% CI) | treatment ≈ (95% CI) | p | d |
|---|---|---|---|---|
| fractal dimension Db | 1.49 (1.47–1.52) | 1.44 (1.42–1.46) | < 0.0001 | 0.65 |
| circularity (hull) | 0.805 (0.79–0.815) | 0.79 (0.78–0.80) | 0.08 | 0.003 |
| span ratio | 1.53 (1.47–1.59) | 1.56 (1.50–1.62) | 0.33 | 0.10 |
| soma perimeter (µm) | 70 (64–76) | 84 (77–92) | 0.002 | 0.01 |
| **soma area (µm²)** | **610 (540–685)** | **760 (670–860)** | 0.01 | 0.02 |
| **branches per cell** | **179 (151–212)** | **127 (106–150)** | 0.002 | 0.04 |
| **total branch length (µm)** | **1110 (990–1260)** | **800 (710–905)** | < 0.0001 | 0.03 |
| **endpoints per cell** | **81 (70–94)** | **58 (50–68)** | 0.001 | 0.03 |

Per-cell spread off the plots: soma area ≈ 150–1870 µm²; branches ≈ 20–370; total length
≈ 160–2570 µm; endpoints ≈ 9–188; Db ≈ 1.17–1.78. Sholl: control peaks at ≈ 13–14 intersections
near 30 µm, treatment ≈ 11 near 25 µm, both ≈ 0 by 90–100 µm (p = 0.002 in the text, 0.0002 on
the figure).

**Whole image** (117 / 108 images): endpoints per cell ≈ 119 vs 101 (p = 0.002); branches ≈ 127
vs 114 (p = 0.08); branch length per cell ≈ 610 vs 580 µm (p = 0.40); coverage per image ≈ 0.16
vs 0.195 (p = 0.006), averaged per mouse ≈ 0.17 vs 0.18 (p = 0.35). **Cells per image ≈ 22 vs
22.5** (p = 0.60), integer counts 10–38 per field.

**How far to trust them:**
- **The soma area is soma plus proximal trunks.** 610 µm² is a disc ≈ 28 µm across, far larger
  than the somata look; the hand outlines (Fig 2f) take in the thick trunks. Never use it as a
  mouse soma size; ours is 6.8 µm median half-maximum diameter.
- **Branch and endpoint counts are skeleton artefacts as much as biology**: unpruned skeletons of
  thresholded DAB with spurs and small loops (Fig 1e/f), with many more branches than visible
  processes (Fig 2e).
- **Whole-image and single-cell values disagree in both directions**: whole-image endpoints are
  higher (≈ 119 vs ≈ 81, likely loose fragments), branches and length lower (≈ 127 vs ≈ 179,
  ≈ 610 vs ≈ 1110 µm, likely the hand reconnection). The paper does not explain this.
- **Density, our derivation:** with the printed scale bars a field is ≈ 538 × 399 µm, so ≈ 22
  cells is ≈ **100 somata per mm²** of section, through 40 µm sections, from images selected for
  clear somata. A 40× objective normally gives a field nearer 0.2 mm (our expectation; sensor and
  adapter are unstated), so µm values from these figures are **uncertain by up to about 2×**. Ours,
  ~415–500/mm² projected, is not comparable without that and the region difference resolved.

## 3. What the figures show that bears on us

- **Thresholding breaks every arbor and fuses neighbours** (Fig 1b–f), even in a clean 40× field:
  fine branches become disconnected specks, adjacent arbors merge into dark clusters, the
  skeleton grows loops in dense regions, and one enlarged cell has ≈ 8–10 detached segments near
  its tips. Neighbouring arbors meet at their tips and in 2D their owner cannot be told; faint
  fragments with no visible soma come from other planes of the section, as in our field.
- **The fixed crop always contains neighbours' branches** (Fig 2a), and one box holds two somata.
- **A low-quality image where a soma detector would work and tracing would not** (Fig 5a): dark
  round somata stand out over a mottled background of similar hue; binarised one way the
  background becomes a network that swallows the cells, the other way only somata and stubs
  remain, looking amoeboid purely from the threshold.
- **Coverage carries no shape** (Fig 5d, e): a highly ramified cell and a large-bodied, stubby
  one both cover **5.6%** of the frame.

## 4. Arguments and limitations

Over-processing changes the answer in both directions: background inflates coverage,
background-correcting thresholds trim branches into a reactive look. Coverage should not be
compared across stains or protocols. Averaging per image or animal is aggregation bias; whole-image
metrics become "properties of the field of view". Db was the most sensitive fractal metric but is
hard to interpret. Sholl was built for neurons with uniform somata; part of its sensitivity here
came from the spline mixed model. The single-cell methods are the accurate ones and also the
labour-intensive ones, which is the gap an automatic per-cell method fills.

## 5. Not available

Dryad (CC0, 108 KB) lists `Single_Cell.csv` and `Sholl_Data.csv`, the exact per-cell values behind
§2, but downloads returned 401/403; **needs a human with a browser**. No whole-image file, no
images, no code (all interactive Fiji), no supplementary information.

**Left out:** the PLX5622/LPS design and IHC protocol, lacunarity and density values (no effect),
the full statistical model list, the methods pros-and-cons table, and the biology background.
