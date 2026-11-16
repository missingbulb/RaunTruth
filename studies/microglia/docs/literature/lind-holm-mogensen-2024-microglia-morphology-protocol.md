# Lind-Holm Mogensen et al. 2024 — microglia morphology protocol (STAR Protocols)

- **Title:** *Protocol for immunofluorescence staining and large-scale analysis to quantify
  microglial cell morphology at single-cell resolution in mice*
- **Authors:** **Frida Lind-Holm Mogensen**<sup>1,2,6,\*</sup>, **Corrado Ameli**<sup>3,6,\*</sup>,
  Alexander Skupin<sup>3,4,5</sup>, Alessandro Michelucci<sup>1,7,\*</sup>
  (6 = technical contact, 7 = lead contact, \* = correspondence). Luxembourg Institute of Health
  (Neuro-Immunology Group); University of Luxembourg (Faculty of Science; Luxembourg Centre for
  Systems Biomedicine, Integrative Cell Signalling Group; Integrative Biophysics); UC San Diego
  Dept. of Neurosciences. F.L.-H.M. did all wet work and imaging; C.A. did segmentation and
  computation.
- **Venue / id:** *STAR Protocols* **5**, 103467, **December 20, 2024** (Cell Press / Elsevier),
  article type **Protocol**, 23 numbered pages (24 PDF pages incl. the cover).
  DOI **[10.1016/j.xpro.2024.103467](https://doi.org/10.1016/j.xpro.2024.103467)**.
- **Licence, as stated in the PDF:** "This is an open access article under the CC BY license
  (http://creativecommons.org/licenses/by/4.0/)" (page footer, p. 1). The acknowledgments add that
  the authors applied **CC BY 4.0** to any Author Accepted Manuscript.
- **PDF:** kept in the study's Drive `Literature` folder as `Protocol for immunofluorescence staining and large-scale analysis to quantify microglial cell morphology at single-cell resolution in mice.pdf`, not in the repo.
- **Builds on / for complete details:** Lind-Holm Mogensen et al. 2024 (*J. Neuroinflammation*
  21:174, PARK7/DJ-1 + LPS) and Fixemer et al. 2022 (*Acta Neuropathol. Commun.* 10:36,
  human hippocampus). The computational pipeline is **MIC-MAC** (Salamanca et al. 2019, *Glia*
  67:1496–1509), here as **MIC-MAC 2.1**.
- **Code:** <https://github.com/CorradoAmeliLU/MIC-MAC-2.1> (`FeatureExtract.m`, tutorial, the
  example-data credentials). **Not reached:** the session's GitHub proxy returned 403 on
  2026-11-15 and attaching the repo was denied by policy, so it needs a human or another
  environment.

## What it gives the study

The **3D route** the owner's process, branching and volume measurements would need, from the
Iba1 stain to a per-cell table.

- **The acquisition to ask for** (owner question 1). Confocal z-stacks at **0.221 µm/px, 1 µm z
  step** (0.5 µm "would be better"), 28–32 slices aiming at **30 µm**, through **50 µm** sections,
  3×3 tiles at 10% overlap. "We strongly discourage working with a lower resolution (e.g. 10x)";
  40× "works well". Our 20×/0.7 widefield single plane is outside anything this paper tested
  (§1).
- **A segmentation recipe to reimplement without Imaris**: per-slice intensity normalisation, a
  0.3 µm Gaussian, a local-contrast (background-subtraction) threshold, connected components and a
  size window of **18,000–180,000 voxels** (§2).
- **The same wall as everyone else.** "Split touching objects" is **off**: merged cells fall
  outside the voxel window and are dropped, not split. In the example only **139 of 8159 objects
  (2%)** pass; the other 98% are mostly process fragments. Finding every cell needs what they
  skipped: soma seeds and splitting.
- **Exclusion rules for QC and for ground-truth instructions** (§3): drop cells cut by the first or
  last slice, isolated branches and unresolved aggregates; reject acquisitions with holes,
  stripes, tile seams, tears or more than four dim slices.
- **16 per-cell features** with **volume** among them (§4). Soma size, territory, Sholl and total
  process length are not among them.
- **A warning for per-cell CD68**: intensity is not comparable across images unless every setting
  is identical (§5).

**What it does not give:** any result (no group means, no statistics; those are in the cited
papers); the definitions of its 16 features (in MIC-MAC, not in this PDF); CD68 (not used); any
named brain region for its numbers; any accuracy of the segmentation against manual annotation;
soma detection.

## 1. Acquisition

Zeiss LSM 880, **LD LCI Plan-Apochromat 25× oil** (the rendered page says "25 ×"; the voxel
filter is said to be for "20x", see §2). Pinhole 19.8 (= 0.69 Airy units, 0.6 µm optical section).
Each stitched image is **1020.23 µm, 4608 px** square (4608 × 0.221 = 1018.4 µm; 1020.23/4608 =
0.2214 µm/px, consistent). A 30 µm stack because "a microglia cell ranges from 5-15 µm in diameter
and processes can extend over a larger volume and area"; do not go below 28 slices. About 2 h per
9-tile, 28-slice acquisition. Laser settings may need slight changes to image through 30 µm, which
is why intensity is not a readout (§5).

**Unstated:** objective NA; single-tile size; bit depth, detector, emission ranges, averaging; the
voxel window for 40× (only that it must change).

## 2. Segmentation (Imaris)

1. **Normalize Layers** (per-slice intensity correction), then **Gaussian Filter, width 0.300 µm**
   on Iba1 (whether σ or FWHM is not stated).
2. **Surfaces**: Smooth on, **Surfaces Detail 0.500 µm**; threshold by **Background Subtraction
   (Local Contrast)** with "Diameter of largest sphere which fits into the object" = **0.500 µm**,
   i.e. the thickness of the thinnest structure to keep.
3. **Threshold 0.5–1.5, set by hand per image** (screenshot: 1.00, just above the background peak
   of a decreasing histogram). Criterion: the surface must be "wide enough to have the microglia
   branches connected to the soma, while at the same time not overestimating the microglia size
   with respect to the signal". **Split touching objects (region growing): disabled** (greyed
   default seed diameter 2.21 µm).
4. **Keep surfaces of 18,000–180,000 voxels** ("Number of Voxels Img=1"), "usually … for mouse
   microglia at 20x", tuned interactively to remove isolated branches, cells cut by the first or
   last slice, and "aggregates of microglia not identified as individual cells". The size
   histogram is a tall peak of small objects decaying into a long flat tail; 139 of 8159 kept.
   (Extracted text reads "180000 and 1800000"; the rendered page reads 18’000 and 180’000 and the
   screenshot fields 18000 / 180000. **18,000–180,000 is correct.**)
5. Mask the Iba1 channel with the kept surfaces (outside 0, inside 255), save `.ims`, run
   `FeatureExtract.m`, which returns one row of features and one 3D logical volume per cell.

**Our arithmetic, not the authors':** at 0.221 × 0.221 × 1 µm the window is **≈ 879–8,791 µm³**
per cell, valid only if it was applied at that sampling, which the 25×/"20x" mismatch leaves
uncertain. A window in voxels must be re-expressed in µm³ for any other sampling. The paper's
**300–350 analysable cells per 3×3-tile image** ("up to 350 per brain slice") in ≈ 1.020 × 1.020 × 0.030 mm ≈ 0.0312 mm³ is **≈ 9,600–11,200 retained
cells/mm³**: cells that pass the filter, not all microglia.

**The trade-off in their images:** in a whole acquisition with an intensity gradient (the dim-stack
troubleshooting image), the bright corner is a dense, interconnected-looking meshwork and the dim
corner fades to dotted processes, so a single global threshold would merge cells in one and lose
them in the other. That is their reason for per-slice normalisation and a local threshold, and it
applies to our corners at 0.86 of the centre.

## 3. What their cells look like, and what fails

Their troubleshooting images are max-projection-style confocal views (Iba1 red, DAPI blue); scales
below are figure-image scales measured off the bars, not the acquisition sampling.

- **Fragments that are not cells.** At ≈ 0.34 µm per figure pixel, close to our 0.338 µm/px,
  processes are ≈ 1 µm thick, tortuous and beaded, and break into **dotted fragments** wherever
  they leave the focal range: many isolated red dots are process pieces. Somata ≈ 5–10 µm by eye.
  DAPI nuclei are as large as or larger than microglial somata and far more numerous. This is the
  class of our 4–6 MAD "process knot" detections.
- **Interdigitation in projection.** In a whole field of normal ramified cells (≈ 0.5 µm per figure
  pixel) cells are dense and evenly tiled, ≈ 4–8 thin processes each, and neighbours' processes
  appear to touch in projection; the authors' 3D separates them better.
- **At ≈ 1 µm per figure pixel** only somata and a red haze are visible; processes are not
  resolved. That is a coarser sampling than ours, but it shows how fast tracing is lost.
- **Non-specific blobs at a tissue tear** are large, bright and compact, and **would pass a size
  filter as (amoeboid) cells**. They delete them by hand or, preferably, exclude the image. Our
  top band's large CD68 blobs with negligible Iba1 are a candidate for this kind of check.
- Acquisitions are rejected for holes, cutting stripes, tile misalignment (processes cut and
  offset at a seam), tears, and **dim signal in more than four z-slices** (uneven antibody
  penetration; do not raise the antibody concentration).

## 4. The 16 features

As listed: 1st largest bound, 2nd largest bound, 1 over 2, average curvature, average node
degree, compactness, ending node density, link density, max curvature, max edge length, mean edge
length, node density, polarity, S-metric, volume, volume/number of edges. **No definitions in this
PDF.** The node/edge vocabulary implies a per-cell skeleton graph and "1 over 2" plausibly the
ratio of the two bounds; both are our inference. Definitions are in Salamanca et al. 2019
(doi:10.1002/glia.23623) and the code.

| the owner wants | here? |
|---|---|
| number of processes | indirectly (ending node density, node degree; no count named) |
| branching | node density, average node degree, link density |
| volume | **volume** of the masked surface |
| soma size | no |
| territory | no (bounds are the nearest) |
| process length | max / mean edge length; no total |

## 5. Authors' limitations that bear on us

1. Iba1 does not separate resident microglia from infiltrating monocyte-derived macrophages; add
   TMEM119 where infiltration is expected.
2. Large clumps (e.g. plaque-associated) exceed the voxel window and are **systematically
   excluded**: the most activated cells are the ones lost.
3. Laser settings often need slight changes to get a bright image through 30 µm, so **do not
   use intensity as an activation readout** unless settings are identical across all images. A per-cell CD68 amount inherits this.
4. Outcomes vary with microscope defaults and brand: one instrument, one setting set.

The animal, not the cell, is the experimental unit when treatment is per animal.

**Not fetched:** the MIC-MAC 2.1 repo (above); the OwnCloud example acquisition with intermediate
and final results (credentials in that repo), the ideal same-image target for a reimplementation;
the supplemental Methods video S1; the two papers with the results.

**Left out:** reagents, buffers, dissection, fixation, cryosectioning and staining steps; laser
and gain values; troubleshooting remedies for the wet lab; the Imaris click path and file formats.
