# Appeltshauser, Linke & Heil et al. 2022 — Super-resolution imaging pinpoints ultrastructural changes at the node of Ranvier in patients with polyneuropathy

*medRxiv preprint 2022.08.05.22278366 · [DOI](https://doi.org/10.1101/2022.08.05.22278366) ·
CC-BY 4.0 · University of Würzburg · read from the supplied PDF (29 pages + supplement).*


*PDF: kept in the study's Drive `Literature` folder as `Super-resolution imaging pinpoints ultrastructural changes at the node of Ranvier in patients with polyneuropathy.pdf`, not in the repo.*

> **Attribution correction.** The first pass cited this as "Stengel et al.", from a web-search
> summary. The co-first authors are **Appeltshauser, Linke and Heil**; issue
> [#6](https://github.com/missingbulb/RaunTruth/issues/6) carries the wrong name.

## 1. What it gives the study

Only its confocal high-content half matters here; the dSTORM work does not.

- **The only published automated node count with an accuracy**, and how it fails on pathology:
  97 ± 11% on healthy mouse nerve, median ~85% with a ~15–185% spread on diseased human nerve (§2).
  This is R5's evidence that accuracy on controls is an upper bound.
- **Why the study reports precision and recall, not a count ratio**: their metric is
  automated / manual, which exceeds 100% and hides matched false positives and misses (§2).
- **Automated length measurement was tried and abandoned** as less accurate than manual (§3):
  expect the measurement to be the part that fights back, and score it against the taggers'
  lengths before trusting it.
- **Definition E**, the clearest operational gap definition in our sources, with companion
  definitions that match two of the lengths our taggers adjust (§4).
- **R2's sampling point**: 0.075 µm pixels, ~12 px across a ~1 µm node.

**What it does not give:** anything that transfers as a detection method (§5), a per-node matched
comparison, inter-rater agreement, or a CNS value.

## 2. Automated node counting

- **Zeiss LSM 980 Airyscan 2**, three colours, **20×**, 3D stacks and stitched tiles (Zen blue
  3.3). **Pixel size 0.075 µm**, stated indirectly: smoothing was "2 times pixelsize (0.15 µm)".
- Nodes segmented on **anti-pan-neurofascin** in **Imaris**: smoothing 0.15 µm, **intensity
  threshold set manually per image (500–1400)**, a volume filter, then **falsely detected
  Schmidt-Lanterman incisures discarded**. A human in the loop twice, so 97% is not a like-for-like
  bar for a finder with no per-image tuning.
- Reference: node count per sample by **two independent blinded investigators** in FIJI over the
  whole slide. n = 20 murine sciatic nerve images, n = 20 human.

**Results (Figure 4C):**

| Samples | Counting accuracy |
|---|---|
| Murine (healthy) | **97 ± 11%**, correlation with manual count r = 0.77, p < 0.0001 |
| Human (pathologically altered) | **median ~85%, spread ~15% to ~185%**; variance significantly increased (F = 0.037, p < 0.0001) |

The human median and spread are approximate. Values up to ~185% show the metric is
`automated count / manual count × 100`, a ratio of totals: an over-detector scores above 100%, and
equal false positives and misses score 100%. The collapse was attributed to *"the heterogeneity of
pathological alterations"*, and the authors fell back to the manual count for their analysis.

## 3. Automated morphometry, rejected

> *"Accuracy of automated assessment of nodo-paranodal length using Imaris did not reach as exact
> results as manual measurement. Therefore, blinded manual assessment was performed on all
> samples."*

The supplement reports significant automated-vs-manual differences (p = 0.02, p < 0.0001),
*"thus arguing against accuracy of automated measurement."* Their method was 3D surface fitting in
Imaris, not the plot-profile method
([`arancibia-carcamo-2017.md`](arancibia-carcamo-2017.md) §2), so it does not condemn ours; it does
say length on sparse fibres at fine sampling was still hard.

## 4. Definitions and reference values

All on **Caspr-1**, by hand in FIJI with linear ROIs; human sural nerve, n = 69 intact nodes from
4 patients (mean ± s.d.):

| Quantity | Definition, verbatim | Value | Our nearest quantity |
|---|---|---|---|
| **Nodal length** | *"the smallest gap between two paranodal Caspr-1 blocks"* | **0.9 ± 0.3 µm** | definition E |
| **Nodo-paranodal length** | *"the maximal extension of both Caspr-1 blocks and the nodal gap in between"* | **10.0 ± 4.9 µm** | the green-to-green length |
| **Paranodal axonal diameter** | *"the maximal diameter of paranodal Caspr-1 staining"* | **2.3 ± 0.9 µm** | the width |

The authors call these normal values for unaltered adult human nodes (no significant difference
from murine sural nerve). Nodal length is a **minimum over the pair**, not a distance along a fitted
axis, so it under-reports on a tilted or curved axon where definitions A and B over-report. PNS,
human, a different definition: context for magnitude, not a target.

**Their "intact looking" criteria** — two Caspr-1 blocks, homogeneous staining, rectangular form —
are close to the owner's R7 structure, purity and stick checks; they are a selection for
measurement, not a count.

## 5. Why the counting result does not transfer

**PNS teased fibres** (Figure 4A): individual fibres pulled apart on a slide, isolated nodes on a
near-empty background, against the owner's dense corpus callosum fields.

| | Appeltshauser et al. | This study |
|---|---|---|
| Preparation | Teased fibres, physically separated | Tissue section, densely packed |
| Marker | Pan-neurofascin labels the node **directly** | Caspr + Nav1.6; node inferred from **geometry** |
| Detection | Threshold + volume filter, one channel | Two-channel triplet rule |
| Confusers | Schmidt-Lanterman incisures (PNS-only) | Neighbouring nodes, crossing axons, nuclei |
| Threshold | Hand-set per image | Automatic |

**Unstated:** the node volume-filter cut-off (only the tissue one, >10000 voxels, is given); how the
counters resolved disagreements and how well they agreed; frame size and tile count (Supplemental
Table S9, not in the supplied text). Their FIJI script is said to be on Zenodo, but the DOI is not in
the text we have.

Left out: the dSTORM and periodicity analysis, β2-spectrin results, colocalisation statistics, the
patient cohort's clinical and electrophysiological data, node density against histopathology, and
the diagnostic discussion.
