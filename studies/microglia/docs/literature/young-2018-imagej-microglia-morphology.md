# Young & Morrison 2018: microglia morphology in ImageJ (skeleton + fractal)

- **Title:** *Quantifying Microglia Morphology from Photomicrographs of Immunohistochemistry
  Prepared Tissue Using ImageJ*
- **Authors:** Kimberly Young, **Helena Morrison\*** (\*corresponding,
  h.morrison@arizona.edu). College of Nursing, University of Arizona.
- **Venue / id:** *Journal of Visualized Experiments* (JoVE) **136**, **e57648**, published
  5 June 2018. Video Article (a protocol with a companion video), 9 pages. DOI
  [10.3791/57648](https://doi.org/10.3791/57648). Article/video: https://www.jove.com/video/57648
- **PDF:** kept in the study's Drive `Literature` folder as `Quantifying Microglia Morphology from Photomicrographs of Immunohistochemistry Prepared Tissue Using ImageJ.pdf`, not in the repo.
- **Licence (as printed in every page header):** "Copyright © 2018 Creative Commons
  Attribution-NonCommercial-NoDerivs 3.0 Unported License" — **CC BY-NC-ND 3.0**.

## What it gives the study

The protocol most microglia-morphology papers cite, so it sets what our numbers will be compared
with. It is a whole-image method and finds no cells.

1. **A naive baseline to beat.** A fixed chain of stock ImageJ filters, each with a direct
   scikit-image or SciPy equivalent, turns an Iba1 image into a binary and a skeleton; the
   supporting detail is below. Any per-cell process measure we build should out-score it.
2. **Its metrics are field averages, not per-cell values.** *Endpoints/cell* and *process
   length/cell* are whole-image skeleton totals **divided by a soma count** whose method is not
   stated. They include fragments of out-of-frame cells and the skeleton inside somata. If we
   report them at all, it is for comparability beside our per-cell table.
3. **A testable skeleton defect: the soma loop.** A soma must skeletonize to a **single origin
   point** with processes radiating from it; a closed loop around the cell body ("circular
   soma", Fig 1) "confound[s] the data". For us that is a check: no skeleton cycle inside a
   detected soma, which a filled soma mask before skeletonizing should guarantee.
4. **Endpoint counts are mostly noise handling.** Without the cleanup chain, endpoints/cell came
   out about twice as high and the injury effect lost significance (numbers below; Fig 4D shows
   the skeleton dense with tiny fragments). Our fragment-pruning rule therefore has to be
   explicit, scale-free where possible, and reported; a raw endpoint count is not trustworthy.
5. **Operators differ by 20–25%.** Two trained users, same images and protocol: User 2 was
   ≈ 20–25% higher on both metrics (read off the bars, Fig 5), mostly through **brightness adjustment and threshold choice**. A
   published endpoints/cell carries that operator noise before any biology, so absolute values
   are not targets; and if we ever hand-trace ground truth, inter-tagger agreement needs
   measuring.
6. **Acquisition it recommends**, relevant to whether the owner should take a z-stack:
   confocal or bright-field **z-stack ≥ 30 µm deep at ≤ 2 µm step**, "Nyquist sampling where
   possible", **20× or greater** (process detail at 40× or 63×), sections **50–200 µm**
   (thinner "may not capture the full span of microglia processes"), acquire **8-bit**, soft-set
   mounting medium (hard-set compresses tissue). The stack is then **max-intensity projected**:
   the whole method is 2D.

**What it does not give:** no cell detection (FracLac cells are picked at random and **isolated
by hand with a paintbrush**, cutting neighbours' touching tips apart and joining fragments), so
the touching-cell problem is done by a human; no 3D or volume; no soma size, territory or
per-cell process count; no CD68; no hippocampus (figures are cortex) and no 20× example; no
ground truth or accuracy validation, only visual overlays and statistical sensitivity.

## The baseline chain (protocol §4)

Fluorescence branch; the protocol's own text-step numbers.

| step | operation | settings |
|---|---|---|
| 4.2 | 8-bit, Greys LUT (DAB first gets FFT Bandpass: large structures to 40 px, small to 3 px) | — |
| 4.3 | Brightness/Contrast | max slider "up to the edges of the histogram but no further"; ideally a fixed value for all images |
| 4.4 | Unsharp Mask | radius (σ) 3 px, weight 0.6 (ImageJ defaults); optional |
| 4.5 | Despeckle | 3 × 3 median |
| 4.6 | Threshold → binary | method **not stated**; the Discussion recommends a fixed automatic method, e.g. **Huang**, over the more variable default |
| 4.7 | Despeckle; Binary › Close (joins pixels up to 2 px apart; iterations not stated); Remove Outliers, bright, radius 2 px, threshold 50 | — |
| 4.8 | Save the binary; Skeletonize | — |
| 4.9 | AnalyzeSkeleton(2D/3D), "Branch information" ticked | prune options not stated |
| 4.11 | Drop skeletons with 2 endpoints and maximum branch length < cutoff; drop branches < cutoff; sum endpoints and branch length; divide each by the soma count | cutoff **0.5, unit not stated** (0.5 px would remove nothing, so µm or a calibrated unit is likely; our inference) |

The authors say to optimise the chain on a set containing cases and controls, then **freeze**
it; that steps may be added or removed per dataset; and that region analysis is inappropriate
when morphologies differ drastically within one field. Fractal analysis (§5) runs FracLac in
box-counting mode, Num G = 4, Metrics on, on a fixed-size rectangular ROI around each
hand-isolated cell outline; ROI size and cell numbers are not stated.

## The numbers

Rodent **cortex**; species, injury model and microscope for the figures are not stated. Bar
values were read off low-resolution plots (±~5% of axis span); whether bars are SEM or SD, and
what n = 3 counts, are not stated.

| metric | condition | with protocol | without protocol | source |
|---|---|---|---|---|
| endpoints/cell | uninjured | ≈ 180 | ≈ 405 | Fig 4E/F, fluorescence |
| endpoints/cell | injured | ≈ 115 (p < 0.01) | ≈ 270 (n.s.) | Fig 4E/F |
| process length/cell (µm) | uninjured | ≈ 610 | ≈ 505 | Fig 4E/F |
| process length/cell (µm) | injured | ≈ 400 (p < 0.01) | ≈ 380 (n.s.) | Fig 4E/F |

The Results text says 4F is less variable than 4E, which contradicts the plotted error bars;
the text has E and F swapped.

Inter-user (Fig 5, DAB, same protocol): uninjured endpoints/cell ≈ 81 (User 1) vs ≈ 102
(User 2); process length/cell ≈ 218 vs ≈ 265 µm; injured regions ≈ 46–66 vs ≈ 58–81 endpoints
and ≈ 130–194 vs ≈ 155–225 µm. The effects point the same way for both users but their
significance patterns differ.

Fluorescence (≈ 180 endpoints, ≈ 610 µm) and DAB (≈ 80–100, ≈ 220–265 µm) differ ~2–3× for
uninjured cells; the paper does not comment. Absolute values do not transfer between setups.

FracLac on four single cells (Fig 6G, printed exactly; one cell each, no statistics):

| cell | D_B | λ | density | span ratio | circularity |
|---|---|---|---|---|---|
| uninjured, without protocol | 1.3733 | 0.6186 | 0.0384 | 1.217 | 0.8972 |
| uninjured, with protocol | 1.4526 | 0.408 | 0.0487 | 1.1791 | 0.8853 |
| injured, without protocol | 1.3008 | 0.6905 | 0.0362 | 1.1695 | 0.7672 |
| injured, with protocol | 1.4054 | 0.4217 | 0.0471 | 1.0799 | 0.7631 |

Preprocessing moves D_B by ~0.08–0.10 and λ by ~0.2 on the same cell, more than the
injured-vs-uninjured difference shown. These are 2D, cropped cells of unstated pixel size:
order-of-magnitude anchors only. The paper gives only one-word meanings (density = size,
span ratio = elongation, circularity = shape, D_B = complexity, λ = heterogeneity); the formulas
are in the FracLac manual, not fetched.

Arbor reach, rough: measuring the drawn 10 µm bar in Fig 6A (≈ 37–38 px in the 700 px JPEG)
makes the panel ≈ 87 µm across, and the uninjured central cell's processes reach roughly its
edges. That is our measurement off a JPEG, not an author number, but it says a fluorescence
arbor in a projected stack spans far beyond the 10–25 µm we can trace in one plane.

## What it shows of the cells

Uninjured microglia are evenly spaced, with a compact soma and ~6–8 primary processes; neighbours'
arbors **touch and interdigitate at their tips but somata do not overlap**. Injured cells have
larger, brighter, elongated somata and fewer, thicker, shorter processes, and sit closer together
(Fig 6A/B). Fine terminal twigs break into dots and dashes in the binary unless filtered (Fig 6C).

## Limitations the authors state that bear on us

- The skeleton metrics depend on the cell count, which may itself differ between conditions.
- Same microscope and scale within an experiment: at nominally equal 40×, a Leica SP II gave
  "twice the number of cells and less detail" than a Zeiss 880.
- It cannot rescue poor contrast or blur.
- Fractal analysis is called "less subject to inter-user variability", asserted and not tested.

Not stated anywhere and needed if we reproduce it: the threshold method used for the shown data,
the B/C slider values, the fragment-cutoff unit, how somata are counted (and cells cut by the
border), pixel size and objectives, and AnalyzeSkeleton prune options. The companion video and
the JoVE materials list could not be fetched (HTTP 202, empty body, 2026-11-15).

Left out: the tissue-preparation and staining recipe beyond what is above, the figure-by-figure
step renders, and the general microglia biology.
