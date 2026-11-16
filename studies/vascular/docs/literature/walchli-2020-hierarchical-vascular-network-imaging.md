# Wälchli et al. 2020 — hierarchical µCT imaging of mouse brain vessel networks

- **Title:** *Hierarchical imaging and computational analysis of three-dimensional vascular
  network architecture in the entire postnatal and adult mouse brain*
- **Authors:** **Thomas Wälchli\***, Jeroen Bisschop, Arttu Miettinen, Alexandra Ulmann-Schuler,
  Christoph Hintermüller, Eric P. Meyer, Thomas Krucker, Regula Wälchli, Philippe Monnier, Peter
  Carmeliet, Johannes Vogel, Marco Stampanoni. (\*corresponding; Zurich / Toronto.) Conflict
  declared: E.P.M. co-founded vasQtec, maker of the PU4ii resin.
- **Venue / id:** *bioRxiv* preprint **2020.10.19.344903**, v1 posted 19 Oct 2020, not peer
  reviewed. DOI **10.1101/2020.10.19.344903**. 150 pages (protocol, 12 figures, 10 Extended Data
  figures, 14 Supplementary figures, 1 video).
- **Licence:** **all rights reserved** — every page carries "The copyright holder for this
  preprint … is the author/funder. All rights reserved. No reuse allowed without permission."
- **PDF:** kept in the study's Drive `Literature` folder as `Hierarchical imaging and computational analysis of three-dimensional vascular network architecture in the entire postnatal and adult mouse brain.pdf`, not in the repo.

---

## 1. What it gives the study

Resin corrosion casts of P10 and P60 mouse brains, imaged by synchrotron µCT at 0.65–0.73 µm
isotropic voxels and reduced to a 3D skeleton graph. Its definitions are ours: a **segment** runs
branch point to branch point or to a free end (COUNT), its length is a summed smoothed centerline
(MEASURE), and it CATEGORIZEs by one caliber cut.

- **A 3D graph recipe with every cleanup constant in µm** (§2), the scale-linked rules our
  extraction's pixel constants should become: junctions closer than **2 µm** merged; a spur (one
  free end) removed if **L < 2·max(r₁, r₂)**; isolated pieces under **5 µm** erased; centerlines
  smoothed with σ 1.125 µm, no point moving more than 0.5 µm.
- **A caliber cut: capillary = inner diameter < 7 µm** (after Weber et al. 2008, macaque), with a
  segment's diameter the **mean** of its local diameters and a branch point's the diameter of its
  **thickest** segment. It is a *lumen* width; CD31 marks the wall, so ours should run wider by an
  amount the paper never measures.
- **3D reference magnitudes for young-adult (P60) cortex and hippocampus**, the owner's stacks'
  regions (§3): segments ~30 µm long and ~5 µm wide, tortuosity ~1.21, ~17,000 branch points/mm³.
- **What a real junction looks like:** degree 3 dominates, degree 5 is never found, and capillary
  pairs at a node spread ~75–150° while larger vessels show a through-vessel with a side branch
  (~90° and ~170°), against which `score.py`'s angle and degree tests can be read.
- **Age is a first-order confounder**: P10 → P60 cortex branch points ×4.3, segments shorter and
  thinner.

**What it does not give:** any immunostain on the analysed data, so nothing about how CD31 looks;
2D sections or projections; arteries vs veins (impossible from cast geometry); non-perfused
vessels, tip cells or sprouts; any injury model; any total length density (never reported);
validation of the graph against manual tracing. Nothing usable as a panel (§5).

## 2. The recipe (pi2 v3.0, github.com/arttumiettinen/pi2)

1. Optional bilateral filter if noisy (not needed at their SNR of 20–30).
2. **Otsu** global threshold; other bimodal-histogram methods landed within 10% of it.
3. Closing with a sphere of radius **0.75 µm** (the Procedure says "1–3 voxels").
4. Fill all enclosed background (bubbles in large vessels).
5. Distance map: local radius = distance to the nearest background.
6. Iterative thinning to one-voxel centerlines.
7. Graph: node = skeleton voxel with > 2 neighbours; edge = branch, with its voxels and the radius at
   each. **Nodes closer than 2 µm merged** (stated only in the Fig 7b legend).
8. Anchored convolution smoothing of each edge (Suhadolnik et al.): σ = 1.125 µm, displacement
   ≤ 0.5 µm, endpoints fixed.
9. Length = sum of distances between consecutive smoothed points.
10. Erase **isolated** branches < 5 µm.
11. Erase branches with one free end and **L < 2·max(r₁, r₂)** (the Methods text says "twice the
    radius at the non-free end": the two wordings disagree).
12. Dissolve degree-2 nodes, drop degree-0 nodes.

**Definitions:** tortuosity = segment length ÷ straight distance between its ends; densities are
counts ÷ the tomogram's **cylinder** volume, per mm³; extravascular distance (EVD) = distance
transform of background. **Unstated:** resin shrinkage, how segments cut by the ROI boundary are
handled, how the 7 µm cut was chosen beyond the citation, and exact n per panel (legends give ranges
that disagree; about three 1 mm³ ROIs per animal per region).

## 3. Reference magnitudes

**From the text, mean ± SD, ROI method, Welch t-test:**

| Quantity | Region | P60 WT | P10 WT | P |
|---|---|---|---|---|
| Vascular volume fraction | cortex | **2.58 ± 0.77%** | 1.67 ± 0.45% | 0.0032 |
| | hippocampus | 2.97 ± 0.70% | 2.14 ± 0.22% | 0.019 |
| Branch points, all (mm⁻³) | cortex | **16,954 ± 8,330** | 3,922 ± 1,377 | exponent garbled |
| | hippocampus | 19,814 ± 6,727 | 6,010 ± 1,099 | 0.00019 |
| Branch points, capillary (mm⁻³) | cortex / hippocampus | 13,994 / 15,258 | 1,929 / 3,524 | |
| Degree-4 branch points (mm⁻³) | cortex | 1,769 ± 1,047 | 188 ± 62 | 0.00015 |
| Degree-5 branch points | all | none detected | none | |
| Extravascular distance | cortex | **17.42 ± 6.52 µm** | 31.94 ± 10.63 µm | exponent garbled |
| | hippocampus | 13.4 ± 3.93 µm | 18.44 ± 2.17 µm | 0.014 |

Some P-values' exponents did not survive text extraction and are left unstated.

**The degree mix contradicts itself.** Extended Data Fig 7 says degree ≥ 4 is "far less than 1% of
all branch points"; the text's own cortex numbers give 1,769 / 16,954 ≈ **10%** at P60 and
188 / 3,922 ≈ **5%** at P10. Use neither as a target; Blinder (7%) and Ji (1–3%) bracket them.

**Read off Supplementary Fig 4** (vector boxplots, ROI method; means ±~1 in the last digit):

| Quantity | Region | P10 WT | P60 WT |
|---|---|---|---|
| Segment density (×10⁴ mm⁻³) ¹ | cortex / hippocampus | ~0.7 / ~1.05 | ~2.9 / ~3.4 |
| Mean segment diameter (µm) | cortex / hippocampus | ~6.9 / ~6.3 | **~5.0** / ~5.3 |
| Mean segment length (µm) | cortex / hippocampus | ~40 / ~45.5 | **~30** / ~27.5 |
| Tortuosity | cortex / hippocampus | ~1.175 / ~1.179 | **~1.207** / ~1.206 |

¹ The axis is printed "µm⁻³"; the magnitudes only make sense as mm⁻³.

**Whole-brain scan, cortex** (Supplementary Fig 12, one brain per age, 126 / 76 blocks): at P60
capillaries alone measure ~4.8 µm across, ~25 µm long, tortuosity ~1.20.

**Diameter distribution** (Fig 6e–g, read off): segment-diameter histograms peak near **4 µm**
(P60) and ~5 µm (P10), with very little mass above 10 µm.

**Branching angles** (Fig 10h–p, read off): capillary segment pairs at a node spread ~75°–150°
(peak ~120–140°); non-capillary pairs peak at ~90° and ~170°, sharper at P60; a small spike near 0°
appears in every all-vessel and capillary curve.

**Derived, not reported** (our arithmetic, product of means, indicative only): P60 cortex length
density ≈ 2.9×10⁴ mm⁻³ × 30 µm ≈ **0.9 m/mm³**.

## 4. Arguments that bear on the study

- **Casts measure the lumen.** The authors argue immunostains mismeasure diameter because
  perivascular cells and stain spread blur the edge, and that no marker labels capillaries
  selectively; hence a morphological cut. Our CD31 widths are wall-to-wall and should not be held to
  7 µm unadjusted.
- **Maximum projections overestimate density**, because the area fractions of stacked optical
  sections add, more so the thicker the stack: relevant to every flattened view we measure.
- **Resin may leak where the barrier is broken** (stroke, trauma, tumour); not seen in their brains,
  not excluded in disease.
- **Development tension:** Rust 2020 finds 2D branch density peaking at P10 and then falling; here
  3D branch points rise ×4.3 from P10 to P60. Different modality and definitions, and casts cannot
  see unperfused P10 sprouts.

## 5. Why no panels

The licence forbids reuse, and the images are µCT slices of resin casts, 3D renders, SEM, schematics
and plots, not single-channel CD31 images. Nothing enters `VESSEL_*`. Figure 8 (segment
statistics, cortex) is missing from this PDF (its page carries a duplicate of Extended Data Fig 8);
Supplementary Figs 4 and 12 recover the same quantities approximately.

Left out: the casting and µCT protocol, superior colliculus and other regions, volume fractions per
class, Nogo-A⁻/⁻ results, directionality, the authors' other internal inconsistencies (perfusion
volumes, projection counts, scale-bar units), and the figure-by-figure description; none bears on
the extraction, the metrics or ground truth.
