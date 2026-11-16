# Kim, Pavlidis & Vogel Ciernia 2024 — MicrogliaMorphology pipeline

- **Title:** *Development of a High-Throughput Pipeline to Characterize Microglia Morphological
  States at a Single-Cell Resolution*
- **Authors:** Jennifer Kim, Paul Pavlidis, Annie Vogel Ciernia\* (\*corresponding,
  annie.ciernia@ubc.ca). Djavad Mowafaghian Centre for Brain Health / Graduate Program in
  Neuroscience, University of British Columbia, Vancouver.
- **Venue / id:** *eNeuro* **11(7)**, July 2024, article type *Research Article: Methods/New
  Tools — Novel Tools and Methods*. DOI **10.1523/ENEURO.0014-24.2024**. Received 10 Jan 2024,
  accepted 7 May 2024. 16 pages. (PMID 39029952, PMCID PMC11289588 — from the repo README, not
  the PDF.)
- **Licence (as printed in the PDF, p. 2):** "Copyright © 2024 Kim et al. This is an open-access
  article distributed under the terms of the **Creative Commons Attribution 4.0 International**
  license, which permits unrestricted use, distribution and reproduction in any medium provided
  that the original work is properly attributed."
- **PDF:** kept in the study's Drive `Literature` folder as `Development of a High-Throughput Pipeline to Characterize Microglia Morphological States at a Single-Cell Resolution.pdf`, not in the repo.
- **Code:** <https://github.com/ciernialab/MicrogliaMorphology> (ImageJ macro),
  <https://github.com/ciernialab/MicrogliaMorphologyR> (R package). Data, input images,
  thresholded images and all single-cell images: OSF <https://osf.io/8t5c2/>. Video tutorial:
  <https://www.youtube.com/watch?v=YhLCdlFLzk8>.

## What it gives the study

The closest published regime to ours: mouse **hippocampus**, **Iba1**, a **20× slide scanner**
(ZEISS Axioscan 7), per-cell geometry for every cell that passes a filter. Its stacks are
max-projected to 2D before analysis, so its numbers are 2D numbers, like ours will be.

- **A baseline to beat, and the reason "find every cell" is new work.** A "cell" is a connected
  component of a thresholded mask whose pixel area lies inside a user-set window. There are no
  seeds, no soma detection and no splitting: touching cells fall above the window and fragments
  below it, and both are **dropped**. The output is an isolated-cells-only sample, biased against
  dense fields, hypertrophic cells and long-process cells that touch neighbours (our reading; the
  authors do not state it). Every step is a few lines of scikit-image (§1).
- **How far 2D falls short of 3D, measured on hippocampal cells** (§2). 2D and max-projected
  branching counts correlate with 3D at r 0.91–0.97, but their absolute values are **~3× lower**
  (read off plot axes), and junction voxels and quadruple points are not preserved. So a 2D
  pipeline can **rank** cells by branching but cannot report absolute branch or endpoint numbers,
  and has nothing to say about volume. Our single plane is weaker than their projection (§3).
- **What to report per cell.** 27 features (9 AnalyzeSkeleton, 18 FracLac) collapse into about
  **four correlated families** (branching complexity, territory span/area, branch length,
  shape/circularity); the first 3 PCs explain **84.6%** of variance. One well-measured feature per
  family carries most of the information.
- **A state vocabulary** (ameboid, hypertrophic, rod-like, ramified) for the coarse-state call
  DATA-REVIEW says in-focus cells support, with a warning about what "rod-like" can hide (§4).
- **A possible external sample source**: OSF holds their input images, thresholded images and
  every single-cell image, offered as a benchmarking set at our magnification. **Not fetched**, and
  it carries no hand-annotated cell ground truth.

**What it does not give:** any accuracy of the segmentation against hand annotation (none was
measured; the only validation is that clusters look right when painted back and replicate in a
second dataset); soma size or a soma object (every area is whole-mask area); a process *count*
(only skeleton endpoints, branches, junctions); volume; CD68 (not used or discussed); the pixel
size, threshold method or area window used on its own datasets; any hippocampal-subfield result.

## 1. The pipeline, and the parameters a reimplementation needs

Before the macro: Axioscan z-stack at 20×, **0.5 µm z-step** (Methods) → ZEN **Extended Depth of Focus** by **maximum projection**
("only compile the pixels of highest intensity at any given position in a z-stack") → one .tiff
per channel; region ROIs from atlas alignment (FASTMAP; the repo now recommends ROIMAPer).

Per-image steps, read on 2026-11-15 from the macro source
(`macros-scripts/MicrogliaMorphology_Steps/MM_Step{1..4}_*.ijm`, HEAD
`6efb58d1ec8c3f65b2935a767f404234061f29a4`). The step files say "Updated July 29, 2024", after
the paper's acceptance, so the paper's datasets may have run on an earlier revision.

| step | ImageJ call (verbatim) | note |
|---|---|---|
| 8-bit | `run("8-bit")` | |
| contrast | `Enhance Contrast saturated=0.35` | LUT only; macro comment: "pixel values are unchanged" |
| sharpen | `Unsharp Mask... radius=3 mask=0.60` | |
| denoise | `Despeckle` | 3×3 median |
| threshold, global | `Auto Threshold method=<user> ignore_black white` | one of the 16 ImageJ global methods |
| threshold, local | `Auto Local Threshold method=<user> radius=<user, default 100> parameter_1=0 parameter_2=0 white` | one of 9 local methods; README: "A radius of 100 will typically work well"; radius in **pixels** |
| denoise | `Despeckle` | |
| bridge gaps | `Close-` | "connects two dark pixels if they are separated by up to 2 pixels" |
| outliers | `Remove Outliers... radius=2 threshold=50 which=Bright` | |
| cells | `Analyze Particles... pixel add` | **areas in pixels**; keep if `min < area < max` (strict) |
| skeleton | `Skeletonize (2D/3D)`, `Analyze Skeleton (2D/3D) prune=none` | **no pruning** |

The threshold is chosen per dataset from BioVoxxel ThresholdCheck's gallery of all 25 methods.
The criterion (paper): capture "full, single microglial cells without losing branching
connectivity"; (README): "capturing as many branches as possible that are connected to cell
bodies, while minimizing overlap between cells". That trade-off, branches kept against cells
merged, is the one our segmentation has to resolve per cell rather than per dataset.

**The area window** is set by the user clicking 5 particles "TOO SMALL to be a single microglia
cell" and 5 "TOO BIG" (README: "2 obviously overlapping cells"). As we read the code, min = the
largest "too small" particle and max = the smallest "too big" one; that reading of ImageJ's
Summarize row order is ours, not the authors'.

FracLac runs by hand in box-counting mode with "lock black background", options "adapted from
Young & Morrison 2018, Section 5.5". Clustering: PCA on the 27 features, fuzzy k-means on PCs 1–3,
**k = 4** by within-sum-of-squares and silhouette, clusters named by painting them back on the
image.

**Unstated, where we would need them:** pixel size, objective NA and z-range of the stacks; the
threshold method, radius and area window used for any dataset, and the window's units; the units
of area, perimeter, radii and lengths in the results (FracLac defaults to pixels, so pixels is
likely, **unconfirmed**); FracLac options beyond the above; whether features were scaled before
PCA; how 3D skeletons were made for the 20-cell comparison (only that cells were "manually
isolated from z-stack images" and AnalyzeSkeleton ran in 3D).

## 2. 2D against 3D

20 hippocampal cells from female mice, 5 per class, each measured as a 3D stack, as the EDF
projection and as a single 2D plane. Pearson R (n = 20 each), read off Fig 2D:

| feature | 3D vs 2D | EDF vs 2D | EDF vs 3D |
|---|---|---|---|
| # of branches | R = 0.92, p = 1.3e-08 | R = 0.94, p = 1e-09 | R = 0.92, p = 6.7e-09 |
| # of end point voxels | R = 0.93, p = 1.7e-09 | R = 0.95, p = 3.5e-10 | R = 0.97, p = 9.5e-13 |
| # of junction voxels | **R = 0.36, p = 0.11** | R = 0.92, p = 1.4e-08 | **R = 0.53, p = 0.016** |
| # of junctions | R = 0.91, p = 2.2e-08 | R = 0.92, p = 5.4e-09 | R = 0.91, p = 2.6e-08 |

**Magnitudes, from the plot axis ranges (approximate):** branches per cell up to ~230 in 3D vs ~75
in 2D and ~70 in EDF; endpoints up to ~70 vs ~22 / ~26; junctions up to ~125 vs ~42 / ~36. The
authors: "the raw values of all skeletal measures quantified decreased considerably when measured
from 3D to either of the 2D image forms". PC1 correlated across all three image types; PC2
(mostly maximum branch length) correlated between 3D and EDF but **not between 3D and a single
plane**. Hypertrophic and ramified cells, the most branched, "were better captured in 3D".
Conclusion: relative differences between the four classes "are still maintained across image
forms". (The caption says Spearman, the panel says Pearson.)

For us: this is the only evidence in the set on a **single plane**, which is what we have. It
supports ranking by branching and a coarse class, and it says branch length behaves worse in a
single plane than in a projection. These are 20 hand-isolated, presumably in-focus cells; our
field also holds blurred cells from other depths, which this comparison never met.

## 3. What their images look like, against ours

Fig 1B (dorsal hippocampus, Iba1 yellow, DAPI blue) is the one image in the paper of our kind.
Figure-image scales measured off the bars (200 µm = 143–144 px, inset 30 µm = 77 px) are figure
scales, not the acquisition pixel size. By eye: several hundred evenly tiled cells with **no empty
gaps** between territories, neighbours' processes meeting and crossing; a ramified PBS cell spans
~50–60 µm tip to tip with 5–8 primary processes off a ~8–10 µm soma, branching 2–3 more times.
That is more than our in-focus cells show (2–4 primaries, 1–2 orders): their projection collects
the arbor from the whole stack, our plane cuts it. The thresholded field in Fig 1A is a carpet of
fused multi-cell clumps and fragments, which is what the area window throws away.

## 4. The four states, and the rod-like trap

| cluster | name | what drives it | README one-liner |
|---|---|---|---|
| 1 | Ameboid | lowest branching complexity and territory span | "round, few processes" |
| 2 | Rod-like | greatest oblongness and branching inhomogeneity | "elongated soma with bipolar processes" |
| 3 | Hypertrophic | highest average/maximum branch length; average territory | "thicker, shorter processes with larger soma" |
| 4 | Ramified | greatest branching complexity, territory span and circularity | "smaller soma with long, highly branched processes" |

- **Clusters are relative**, re-fit per dataset. In PBS hippocampus with Iba1 only ~30% of
  retained cells are "ramified" and ~20% "ameboid" (read off box plots, n = 3 mice): a control
  animal's "ameboid" cluster is its least-branched cells plus fragments that passed the window,
  not round cells. "Ramified %" is not comparable across studies.
- **Rod-like may be merged neighbours.** In the painted-back hippocampus (Fig 3E), some cells
  inside the ROI stay unpainted (failed the window or fused), and one "rod-like" cell is a long
  chain that looks like two or more aligned cells fused. Our top band holds elongated Iba1⁺ cells
  aligned along a fibre tract: exactly where a merge would be called rod-like.
- The painted masks are blobbier than the grayscale processes beneath: fine terminal branches are
  lost at threshold.
- **Iba1 also labels perivascular and infiltrating macrophages** (P2ry12 is the specific marker),
  so an Iba1⁺ object is not necessarily a microglion, near vessels and meninges especially.

## 5. Arguments and limitations that bear on us

- One feature alone gives "an incomplete or biased representation"; the authors use all features
  together. Manual cell picking biases the sample; their tool takes every cell that passes the
  filter (and, unstated, none that do not).
- Stated limitations: 2D only (FracLac is 2D); dataset parameters need user input; marker
  comparisons are underpowered (n = 3/group); hard cluster boundaries are artificial. 3D is
  acknowledged as finer but argued too slow.
- Not stated (ours): no segmentation ground truth; a max projection fuses cells that overlap in
  z, which a single plane avoids only by losing the arbor instead.

**Not fetched, worth a look:** the Extended Data (variance per PC, subregion map, full tables) on
the eNeuro page; MicrogliaMorphologyR's post-paper "Pipeline 2" tutorial
(`ciernialab.github.io/MicrogliaMorphologyR/articles/MicrogliaMorphologyPipeline2.html`), possibly
a different method; the OSF images.

**Left out:** the LPS design and its cluster-shift statistics, the per-feature definitions of the
27 measures (names only in the paper, no formulae), cell-area values (no unit stated), marker and
regional biology, and the R package's dependencies.
