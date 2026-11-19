# Chen et al. 2022 — Unitail: Detecting, Reading, and Matching in Retail Scene

*F. Chen, H. Zhang, Z. Li, J. Dou, S. Mo, H. Chen, Y. Zhang, U. Ahmed, C. Zhu, M. Savvides (CMU, Pittsburgh,
Tsinghua). ECCV 2022 · arXiv [2204.00298](https://arxiv.org/abs/2204.00298) (v4, 20 Jul 2022, with supplementary) ·
open access on arXiv, licence not checked; the dataset's licence is not stated in the paper (unitedretail.github.io,
with an evaluation server) · PDF: study Drive folder `Literature/Unitail - Detecting, Reading, and Matching in Retail Scene.pdf` · full text and supplementary
read from the arXiv PDF.*

## What it gives the study

- **Evidence that our four-corner box is the right representation.** On dense, tilted items an axis-aligned or
  rotated box carries more background and overlaps its neighbours, so NMS suppresses true items; the same detector
  scores **59.0 mAP on SKU-110K's boxes vs 61.3 on the same images' quadrilaterals**. Trust: a 2.3-point gap that
  mixes target shape with annotation differences, single runs, the authors' own benchmark. We already score polygon
  IoU (`books.iou`, Sutherland–Hodgman), matching their exact convex-hull IoU.
- **A corner-order convention** worth fixing in our JSON: four points **clockwise from the top-left corner of the
  frontal face**, fixed rather than re-sorted, so a spine lying on its side is unambiguous. For the Books task's
  conventions, theirs: an occluded item gets only its visible part, items under 8 × 8 px are ignore-masked, and the
  front face is drawn, a side face only when no front is visible.
- **Two cheap diagnostics for our ground truth:** the **std of a box's four interior angles** (0 for a rectangle;
  **6.24° on their origin domain vs 12.73° cross-domain**, which separated their easy and hard sets), to say how far
  our leaners and perspective depart from rectangles; and √area scale per photo, to state `WORK`'s scale dependence
  in their terms.
- **Their g-mAP idea for our held-out photo:** the geometric mean of the in-domain and cross-domain scores punishes
  overfitting; reporting tuning and held-out scores and their geometric mean would show ours.
- **Reading:** in-domain fine-tuning lifted every reader by 8–16 points (below), so Tesseract's off-the-shelf
  Hebrew on spines is likely far below its potential; fine-tuning is heavy and off our lightweight route.

It gives nothing for thin, tall objects (their quads' aspect is mostly 0.3–0.6, spines far thinner, and lettering
running along the long axis is rare on frontal faces), no non-Latin script, and no reading of detected (rather than
ground-truth) crops. Its detector (RetailDet) is learned and not portable.

## The supporting numbers

- **Cross-store drop:** every detector loses **5–9 mAP points** on the 500 cross-domain images (other stores,
  sensors, angles, unseen categories); RetailDet ResNet-50 58.7 → 50.9, AP50 91.6 → 80.6, AP75 68.4 → 56.7. A
  measured size for the regime gap our held-out photo stands for.
- **Data:** 1,777,108 quadrilaterals on SKU-110K's images re-annotated (13 annotators, 3 verification rounds),
  **145 ± 46 per image**; images average 2467 × 3288 px.
- **Reading** (trained on their crops vs synthetic + ICDAR15; English alphanumerics only, curated legible crops):
  text detection hmean DBNet .666 → .819 (recall .541 → .773); word accuracy / normalised edit distance CRNN 40.0% /
  .36 → 51.4% / .25, ABINet 69.2% / .17 → **77.2% / .11**.
- **Matching by text** (downstream of this study, for the title matcher): the reader's intermediate features per
  text box plus a positional encoding, matched to the gallery's by a **Hungarian assignment**; recognised words fed
  to BERT as one vector were rejected (they propagate OCR errors and lose position): text only 47.81% vs 30.37%
  top-1. The sum is not normalised by sequence length, so a product with more words can outscore. Reading per line
  and matching by an assignment over lines, not one concatenated string, is the transferable idea.

Left out: RetailDet's architecture, training and ablation, the other detectors' rows, the OCR set's construction,
the matching thresholds (not given), related-work tables and the qualitative figures.
