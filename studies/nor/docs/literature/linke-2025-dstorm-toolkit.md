# Linke et al. 2025 — Deep learning-driven automated high-content dSTORM imaging with a scalable open-source toolkit

*Biophysical Reports 5:100201 ·
[ScienceDirect S2667074725000060](https://www.sciencedirect.com/science/article/pii/S2667074725000060) ·
University of Würzburg · read from the supplied PDF (11 pages).*


*PDF: kept in the study's Drive `Literature` folder as `Deep learning-driven automated high-content dSTORM imaging with a scalable open-source toolkit.pdf`, not in the repo.*

## What it gives the study

One fact: **a U-Net-family segmenter learned nodes from a very small annotation budget.** It bears
only on the gated learned route; nothing in it changes the current finders or how ground truth is
marked.

The paper is a dSTORM acquisition toolkit (scan, segment with a trained network, drive the
microscope); nodes are one of four demo datasets, reusing the murine teased-fibre pan-neurofascin
images of [`appeltshauser-2022-polyneuropathy.md`](appeltshauser-2022-polyneuropathy.md)
(20× Airyscan).

- **Node result:** Dice **87.79%**, pixel accuracy 99.60% with node 1.3% vs background 98.7% of
  pixels, so Dice is the number to read. *"100% of all objects were detected"*, with 86.67% of
  objects at Dice ≥ 75%. That is recall only.
- **Training budget:** *"Due to the use of image augmentation … labeling just 10–25 objects was
  adequate"* in most cases (stated across datasets; the node set's own size is not given). The
  objection that a learned route needs ground truth we do not have is weaker than it looked:
  10–25 objects is an annotation budget the owner could reasonably be asked for.

**Why it is not a recommendation.** Their task is one bright, isolated, single-channel object on
an empty background; ours is a two-channel geometric relation in a dense field, and 100% recall
there says nothing here. The learned route stays gated until the lightweight finders are
exhausted. Where it could fit is as a **per-channel Caspr/Nav segmenter** feeding the explicit
triplet checks, keeping the decision rule inspectable — a candidate to score against the current
segmentation, nothing more.

**Not stated:** any false-positive rate (the failure that matters in a dense field), variance or
a held-out test set for the node Dice, a classical-threshold baseline on the same data, the
node training-set size, training and augmentation settings, and the code location.

Left out: the microscope automation, calibration samples, the other demo datasets' results, and
the software discussion.
