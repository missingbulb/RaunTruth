# Chen et al. 2022 — Unitail: Detecting, Reading, and Matching in Retail Scene

*F. Chen, H. Zhang, Z. Li, J. Dou, S. Mo, H. Chen, Y. Zhang, U. Ahmed, C. Zhu, M. Savvides (CMU, Pittsburgh,
Tsinghua). ECCV 2022 · arXiv [2204.00298](https://arxiv.org/abs/2204.00298) (v4, 20 Jul 2022, with supplementary) ·
open access on arXiv, licence not checked; the dataset's licence is not stated in the paper (unitedretail.github.io,
with an evaluation server) · PDF: study Drive folder `Literature/Unitail - Detecting, Reading, and Matching in Retail Scene.pdf` · full text and supplementary
read from the arXiv PDF.*

**Why it matters to us:** it is the case for detecting dense, tilted items as **quadrilaterals** rather than
axis-aligned or rotated boxes, which is our representation (four corners, straightened by homography), and the
only retail paper that measures reading and text-based matching on product crops, the step after our finder.

## 1. Representation and data

**QUAD:** four points p_tl, p_tr, p_br, p_bl, 8 DOF, **clockwise from the top-left corner of the frontal face**;
the order is fixed, not re-sorted for the loss as many text detectors do. Cuboids and cylinders: the face's
corners. Spheres, cones, bags, irregular shapes: draw the minimal axis-aligned box, then move its corners to follow
the perspective. Occluded: only the visible part. Front face preferred; a side face only when no front is visible.
Items **under 8 × 8 px** are not positives: covered by ignore masks. Fig. 2 is the argument: an axis-aligned box
or rotated box on a tilted product carries more background and overlaps neighbours, so NMS suppresses true items.

**Unitail-Det:** 1,777,108 QUADs by 13 annotators, 3 verification rounds (Labelme). Origin domain = SKU-110K's
images re-annotated: train 8,216 images (1,215,013 QUADs), val 588 (92,128), test 2,940 (432,896). **Cross domain**:
500 new images (37,071 QUADs) from other stores, sensors, angles and unseen categories. 145 ± 46 QUADs per image
(5 to 744); mean scale 149.6 px (√area; 17² to 1938² px²); images average 2467 × 3288 px. Aspect ratio of a QUAD:
√((t·b)/(l·r)) from edge lengths, mostly 0.3–0.6. Shape difficulty: **std of the four interior angles**, 0 for a
rectangle; **6.24° origin vs 12.73° cross domain**.

**Unitail-OCR:** crops from the cross domain, warped upright by their QUAD, ≥ 15 × 15 px, blurred ones dropped;
1,454 one-shot categories (two-stage: 10 supercategories, then a pre-trained model's 6k clusters hand-corrected).
29,681 word-level quadrilateral text boxes on 4,466 products (ICDAR2015 style), 20,981 legible, transcribed in
lower-case alphanumerics only (0–9, a–z), number+unit kept as one word ("120mg"); a closed vocabulary supplied.
Gallery: one image per category (10,709 text regions, 7,565 words). Test: 3,012 products / 18,972 regions
(detection), 13,416 words (recognition), 10k query products (matching, general), ~2.4–2.5k visually similar ones
(hard track; both numbers appear).

## 2. Metrics

Detection: **g-mAP = geometric mean** of COCO-style mAP on the origin and cross test sets (punishes overfitting to
the origin domain); exact QUAD IoU via convex hull + shoelace formula; up to 400 detections per image. Text
detection: P, R, hmean. Recognition: word accuracy and **normalised edit distance** (edits / word length, averaged
over ground truths). Matching: top-1 accuracy.

## 3. RetailDet (learned, not portable; recorded for what it says about quads)

FCOS/DenseBox-style anchor-free head on FPN levels P3–P5 (ResNet), one classification channel and an **8-channel
corner-offset regression**. Three changes:
- **Quad-centerness**: centre = the QUAD's centre of gravity; C_QUAD(p) = [Π over l, r, t, b of
  min(d_p, d_g)/max(d_p, d_g)]^0.5, with d_p, d_g the distances from p and from the centroid to each side. Equals
  FCOS centerness on rectangles (proved in the supplementary). The plain box centre can lie far from a distant
  corner of a skewed quad.
- **Soft Scale**: assign each object to two adjacent levels l_i = ⌈l_org + log₂(√area/224)⌉, l_j = ⌊…⌋ with weights
  F_li = frac(log₂(√area/224)), F_lj = 1 − F_li, l_org = 5. Replaces Soft Selection's auxiliary network (5× slower
  on dense images), which the authors show follows scale anyway.
- **Corner Refinement Module** (RetailDet++): features bilinearly sampled at the 4 corners + centre, a 1×1 conv
  predicts corner offsets; a second-stage classifier used in training only.
Training: positives are pixels inside the QUAD **shrunk by α = 0.3** toward its centroid; focal loss
(classification) + SmoothL1 (regression), both weighted by quad-centerness × level factor F; 12 epochs, lr 0.01 ÷10
at epochs 9 and 11, input scaled to 1200, flip only.

## 4. Results

| Detector (ResNet-50 unless noted) | g-mAP | origin mAP / AP50 / AP75 | cross mAP / AP50 / AP75 |
|---|---|---|---|
| FCENet (segmentation) | 32.0 | 36.8 / 76.0 / 31.2 | 27.9 / 60.1 / 22.6 |
| DBNet (segmentation) | 45.3 | 51.0 / 86.8 / 55.4 | 40.3 / 71.6 / 42.7 |
| Gliding Vertex (regression) | 46.0 | 52.3 / 89.0 / 56.9 | 40.5 / 76.7 / 38.6 |
| Mask R-CNN | 52.4 | 57.3 / 91.6 / 66.0 | 48.0 / 77.9 / 53.2 |
| RetailDet | 54.7 | 58.7 / 91.6 / 68.4 | 50.9 / 80.6 / 56.7 |
| RetailDet, ResNet-101 | 57.1 | 60.3 / 92.8 / 70.6 | 54.1 / 83.5 / 60.6 |

Every detector loses 5–9 mAP points across stores. Regression beats segmentation. Ablation on val (mAP): base 58.3,
+QC 60.4, +SS 61.4, +CRM 63.8. The same model scores **59.0 on SKU-110K's boxes vs 61.3 on the same images'
QUADs**, credited to quads being a smoother target with fewer dense overlaps. SKU-110K mAP: RetinaNet+EM-Merger
(Goldman 2019) 49.2, ATSS 57.4, Cascade-RCNN+Rong 58.7, RetailDet++ 59.0. Speed (2080Ti): RetailDet R101 6.3 FPS.
Trust: authors' own benchmark and baselines re-trained by them; single runs; the 2.3-point quad-vs-box gap mixes
target shape with annotation differences.

**Reading** (training on Unitail vs synthetic + ICDAR15): text detection hmean DBNet .666 → .819 (R .541 → .773,
P .866 → .871), FCENet .538 → .825, PSENet .539 → .744. Recognition word accuracy / NED: CRNN 40.0% / .36 → 51.4% /
.25; SATRN 62.7 → 74.9; ABINet 69.2% / .17 → **77.2% / .11** (best). Public weights read product text badly;
in-domain fine-tuning (10 epochs) gains 8–16 points. Trust: English alphanumerics only, curated legible crops.

**Matching:** visual classifier first; if its top two cosine similarities differ by ≤ t, decide by
w·sim_text + (1 − w)·sim_visual over those two (t, w tuned on val, values not given). sim_text (Fig. 6b): the text
recogniser's n *intermediate feature vectors* (not its output words; "CRE4w" still carries A and M), each plus a 2-D
positional encoding of its box location, matched to the gallery's m vectors by the **Hungarian assignment**
maximising Σ cosine similarities. Rejected: recognised words → BERT → one vector (Fig. 6a), which propagates OCR
errors and loses position. Top-1: text only 47.81% (BERT version 30.37%), hard track text only 31.71%; ResNet-101
85.03 → 86.19 with text (general), 58.37 → 60.52 (hard); EfficientNetV2 83.81 → 84.62, 56.49 → 59.24. Errors
accumulate from detection (R .773) and recognition (.772); 2% of products carry no text.

**Failure modes:** unseen categories and steep camera angles in the cross domain (Fig. 12).

## 5. Gaps

- Matching's t and w; the positional encoding's exact form and dimension; how n (5 in the figure) is chosen.
- Eq. 8 is a raw sum, not normalised by sequence length, so a product with more words can outscore; unaddressed.
- Inconsistent numbers: hard track 2.4k vs 2.5k samples; text gains quoted as +0.56–0.94 in the prose against
  +0.81 / +1.16 in Table 4.
- Inter-annotator agreement on corner placement; how a QUAD is drawn on a non-planar face.
- No non-Latin script; no evaluation of reading on detected (not ground-truth) crops.

## 6. What transfers to a bookshelf / where we diverge (our inference)

- **Our four-corner box is the right representation**, with evidence: quads lower dense overlap and suppression
  errors, and the corner order convention (clockwise from top-left of the *face*) is worth fixing in our JSON so a
  spine lying on its side is unambiguous. We already score polygon IoU (`books.iou`, Sutherland–Hodgman), matching
  their convex-hull IoU.
- **Two cheap diagnostics to compute on our ground truth:** the interior-angle std per book (how far our leaners
  and perspective depart from rectangles; 6° vs 13° separated their easy and hard domains) and √area scale per
  photo, so `WORK`'s scale dependence can be stated in their terms.
- **Their g-mAP idea** maps onto our held-out photo: report tuning and held-out scores and their geometric mean, so
  overfitting to the tuning photos shows.
- **Reading:** a large in-domain gain from fine-tuning says Tesseract's off-the-shelf Hebrew on spines is likely
  far below its potential, but fine-tuning is heavy and out of our lightweight route. Reading per text line, then
  matching by an assignment over lines rather than one concatenated string, transfers to the title matcher
  downstream (not this study).
- **Divergence:** everything learned (RetailDet, OCR fine-tuning, feature matching) is beyond a CPU classical
  finder; spines are far thinner (aspect well below 0.3) and lettering runs along the long axis, which Unitail's
  frontal faces rarely do.

## 7. Deliberately omitted

Cross-checked against the full 31 pages including the supplementary. Omitted: related-work dataset lists (Table 6),
the Soft Selection analysis beyond its conclusion, SKU-110K-r rotated-box results (RetailDet 57.5 mAP), codebases and
GPU counts, the supercategory list, qualitative Figs. 9–11 and 13, and references.
