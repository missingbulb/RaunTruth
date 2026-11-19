# Synthesis — what the six papers say about finding and measuring microglia

Cross-paper reading for the study's goal: find **every** microglia cell in an Iba1 image and
measure each one's geometry (processes, branching, soma, territory, volume), with CD68 alongside.
Each claim links to the digest it comes from; numbers there carry their caveats. Our own image:
[`../DATA-REVIEW.md`](../DATA-REVIEW.md).

Short names used below: **Young** = [young-2018](young-2018-imagej-microglia-morphology.md) ·
**Green** = [green-2022](green-2022-microglia-morphology-comparisons.md) ·
**Kim** = [kim-2024](kim-2024-microglia-morphology-pipeline.md) ·
**Lind-Holm** = [lind-holm-mogensen-2024](lind-holm-mogensen-2024-microglia-morphology-protocol.md) ·
**Moser** = [moser-2025](moser-2025-ipsc-mononuclear-phagocytes.md) ·
**Baek** = [baek-2026](baek-2026-opc-microglia-bmp4.md).

## 1. Nobody in this set finds every cell

| paper | how a "cell" is obtained | what is lost |
|---|---|---|
| Young | not at all: whole-image skeleton totals ÷ a soma count (counting method unstated) | per-cell values; any cell identity |
| Green | hand-isolated: fragments painted out, broken branches reconnected | throughput; reproducibility |
| Kim | thresholded connected components inside a user-set area window | **touching cells dropped**, fragments dropped: a biased, isolated-cells-only sample |
| Lind-Holm | Imaris local-contrast surfaces in 3D, a voxel window of 18,000–180,000, "split touching objects" off | **only 2% of objects pass** in the example |
| Moser | hand tracing in SNT, ~10 cells per mouse | everything but a handful of cells |
| Baek | Imaris Filament Tracer per cell, 120 cells per condition (selection unstated) | cell selection unknown |

**Splitting touching cells and keeping them is the open problem**, and it is the step our
"every cell" goal depends on. Every pipeline here either avoids it by hand or drops the cells
that need it. Those cells are not a random sample: clustered, plaque-associated and hypertrophic
cells touch more often (Baek), so dropping them biases exactly the reactive states.

## 2. Per cell, not per field

Green measured the same images both ways: whole-image skeleton effects were **67–93% smaller**
than per-cell ones, and three of four per-cell effects vanished at image level. Young's protocol
is the whole-image kind. Our output should therefore be a **per-cell table** (cell, image,
region, animal) that is summarised hierarchically, never a field average.

## 3. The metrics, and what each needs

| metric | definition used | who | needs |
|---|---|---|---|
| cell count / density | somata per area (Baek, Moser: per field) | all | 2D is enough |
| soma area | hand outline (Green: 610 µm², which includes proximal trunks); Baek marks a soma point only | Green, Baek | a soma mask; in-focus cells |
| primary processes / "extensions" | Baek: **terminal points per cell** (≈16 healthy vs ≈7.5); Sholl first-circle crossings (Green warns these fail on non-round somata) | Baek, Green | 3D for absolute numbers |
| endpoints, branches, branch length | AnalyzeSkeleton on a binary skeleton | Young, Green, Kim | 3D for absolute values (Kim: 2D EDF undercounts ~3×, yet r 0.91–0.97 with 3D) |
| total process length | skeleton or filament length per cell (Young ≈610 µm fluorescence; Baek ≈185–255 µm; Green ≈1110 µm DAB) | Young, Green, Baek, Moser | values differ by method by up to 5×: compare only within one method |
| Sholl | intersections vs radius, or area under the curve | Green, Moser | a soma centre; 3D preferred |
| territory / span | convex hull area, span ratio (FracLac) | Young, Green, Kim | a per-cell mask with its whole arbor |
| fractal dimension, lacunarity | FracLac box counting on 2D outlines (D_B ≈1.3–1.5) | Young, Green | 2D by design |
| cell volume | Imaris surface voxels | Lind-Holm | a z-stack |
| CD68 | % CD68⁺ cells (Moser, ~75% in young dentate gyrus); CD68⁺ area ÷ Iba1⁺ area (Baek, ≈10–15%) | Moser, Baek | a cell mask, per cell |
| state | k-means on 27 features into ameboid / hypertrophic / rod-like / ramified (Kim) | Kim | the feature table |

Kim's 27 features collapse into about four families (branching, territory, branch length,
shape), with three components explaining 84.6% of the variance. **A handful of well-measured
features may carry most of the information.**

"Activated" here means **de-ramified**: fewer tips, shorter processes, larger soma (Baek, Green).
A higher process count is the homeostatic direction, not the reactive one.

## 4. Acquisition: what the literature images, against what we have

| | magnification | mode | z | px size |
|---|---|---|---|---|
| Kim | 20× slide scanner (Axioscan 7) | widefield | 0.5 µm step, max-projected | not stated |
| Lind-Holm | 20–25× | confocal | 1 µm step, ~30 µm | 0.221 µm |
| Moser | 63× oil | confocal | 0.5 µm step, 30 µm sections | not stated |
| Green, Young | 40× / DAB brightfield and fluorescence | widefield | 2D (Young: MIP) | — |
| Baek | not stated (supplement unavailable) | — | — | — |
| **ours** | **20×/0.7** | **widefield** | **one plane** | **0.338 µm** |

Our image is closest to Kim's regime, without the z-stack Kim projects. Every paper that measures
processes or volume takes a z-stack. Section 5 of [`../DATA-REVIEW.md`](../DATA-REVIEW.md) states
what a single plane supports.

## 5. Reference magnitudes

Different species, region, method and magnification throughout, so these are sanity ranges and
never targets. **Never average across papers.**

| quantity | value | paper, conditions |
|---|---|---|
| soma diameter | 5–15 µm across | Lind-Holm, confocal |
| soma area | 610 µm² (includes trunks) | Green, DAB 40×, cortex |
| terminal points per cell | ≈7.5–16 (per-cell range ≈2–32) | Baek, Imaris, 5xFAD cortex |
| endpoints per cell | ≈180 (fluorescence), ≈80–100 (DAB) | Young, whole-image ÷ somata, cortex |
| process length per cell | ≈185–255 µm (Baek) · ≈610 µm (Young) · ≈1110 µm (Green) | method-dependent |
| cells per image | 300–350 per 1020 µm confocal field | Lind-Holm |
| Iba1⁺ cells per field (dentate gyrus) | ≈10 young, ≈13 aged; the ≈187 µm is the figure panel measured off its scale bar, not a stated counting field | Moser |
| CD68⁺ microglia | ≈75% young, ≈86% aged (dentate gyrus) | Moser |
| plaque association | soma within 20 µm of the plaque edge; ≈2.5–4 cells per plaque | Baek |

Our field's first estimate, ~415–500 cells/mm² *projected*, has no like-for-like comparison here:
the papers report per-field or per-volume counts in other regimes.

## 6. Gaps this set leaves open

- **Instance segmentation of touching cells**: no paper does it, and none reports segmentation
  accuracy against hand labels (Kim states this outright).
- **Feature definitions for MIC-MAC** (Lind-Holm): they live in its code repo, which this session
  could not reach (403). Green's per-cell data on Dryad also refused download (401/403).
- **Baek's imaging methods** are only in its supplement, which was not provided.
- **Hippocampal subregion values** for most metrics: only Moser (dentate gyrus) and Kim
  (hippocampus) work there.
