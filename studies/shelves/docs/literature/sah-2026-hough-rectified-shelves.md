# Sah & Mathew 2026 — Hough-selected homography rectification of angled shelf photos

- **Title:** Supermarket Product Detection and Recognition: Utilizing Deep Learning with Rectified Imagery
- **Authors:** Mayank Sah, Jimson Mathew (Dept. of Computer Science and Engineering, IIT Patna)
- **Venue:** arXiv [2610.08126](https://arxiv.org/abs/2610.08126) v1 [cs.CV], 6 Oct 2026; a preprint, no venue named.
  It extends the authors' own Procedia Computer Science 260 (2025) paper (ref. [19]), which it calls limited in
  scope.
- **Licence:** CC BY-NC-ND 4.0, as the arXiv abstract page states; the PDF itself states none.
- **Thesis:** read the dominant shelf-line angle with a Hough transform, call the photo left- or right-angled, warp it
  with one of two fixed homographies, then run an off-the-shelf detector. Rectifying angled photos adds 1.8 to 6.9
  mAP@0.5 points, still far below frontal photos, and stops helping on crowded shelves.
- **Our copy:** the 10-page arXiv PDF, text layer complete, read end to end.
- **PDF:** kept in the study's Drive `Literature` folder as `Supermarket Product Detection and Recognition - Utilizing Deep Learning with Rectified Imagery.pdf`.

## What it gives the study

- **A warning about R9-roll's Hough, from the other side.** R9-roll reads the camera's roll by Hough over the board
  lines and levels the photo (`[camera-roll]`). Sah & Mathew read the shelf-line angle the same way (Canny, then
  OpenCV 4.7.0 Hough with a constant accumulator threshold of **500**, set "such that the shelf display angles take
  priority over the edges detectable from the product boundaries"), and report that **with no rack edge in view the
  lines follow product edges and the angle goes wrong**, especially in close-ups. For us that predicts the roll going
  wrong on a photo with no long board in view, where spine tops or lettering take the vote. A cheap test: count, on
  our tagged photos, how often the strongest Hough line is not a board.
- **Evidence against warping a whole photo, for a per-shelf correction.** Their correction is one fixed homography
  per side (left or right yaw), whatever the angle. Their own limitations: at steep views "only approximately 20%" of
  the content survives, one matrix per side is crude, and one rack orientation per photo is assumed. That supports
  what we do — straighten per box (`books.straighten`) — and, if a shelf-level correction is ever needed, reading it
  per shelf from the board lines, as Trixi warps per shelf level from known corners
  ([Wieczorek 2022](wieczorek-2022-trixi-the-librarian.md)).
- **Rectification buys little, and nothing at our density.** Most detectors gain +2 to +5 mAP@0.5 on angled photos
  (Table 3; YOLOv10m frontal 86.7, angled unrectified 57.1 / 57.8, rectified 60.8), still 20–30 points below frontal.
  By objects per photo (Table 5, 30–60°, 58 right and 60 left photos), the gain is +3.9 / +4.3 at 10–20 objects, +0.9 /
  +1.8 at 20–40, and **negative above 40** (18.2 → 15.1 right, 19.1 → 18.2 left). Our tagged photos hold 8 to 60
  books, so a global warp would sit at or past the point where it stops paying.

What it does not give: books, spines, reading, oriented or quadrilateral boxes, roll or lean of the books. No
accuracy of the angle estimate or of the homography is reported — Fig. 4 draws a homography evaluation (Frobenius
difference, reprojection error) that appears nowhere. Detection is axis-aligned mAP of grocery classes on 640×640
resizes from one store; nothing is comparable with our scores.

## Where the paper contradicts itself

Read before borrowing any of its thresholds:

- **The decision rule.** The text (§2.2): θ < 85 → LEFT, θ > 95 → RIGHT, uncorrected between. Fig. 2: θ < 80° →
  **Right**, θ > 110° → **Left**, 80°–110° uncorrected. Both thresholds and side assignment differ; which ran is
  unknown. The units are evidently degrees although Eq. 2 ranges θ over radians.
- **How many lines make one angle** is only in figures ("polling of Hough lines", "rank detected lines and pool
  their angle responses"); the rule is never given. Neither are the Canny thresholds or the Hough resolution, or
  whether it is the standard or probabilistic transform (§2 and §2.2 differ).
- **Where rectification pays best:** §3.2 says 10–20 objects, the Conclusion 5 to 10; Table 5 supports 10–20.
- **The data counts** do not reconcile (1946 vs 4800 training images; 636 vs 536 test photos), and the warp
  direction (B = A·H vs A = B·H) cannot be settled from the text.

The homographies themselves were built once, from two representative pairs taken "at 40 to 60 degrees" (SIFT,
FLANN, RANSAC on 640×640 resizes), and stay fixed for every experiment.

Left out: the detector training details, the per-model table beyond the rows quoted, the angle-by-density table
(Table 4: rectification loses in three dense cells), the precision–recall curves, the dataset-comparison table, the
figure descriptions, and the market statistics; cross-checked against the full text.
