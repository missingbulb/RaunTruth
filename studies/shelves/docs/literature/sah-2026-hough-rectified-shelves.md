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
- **Our copy:** the 10-page arXiv PDF, text layer complete, read end to end with every figure.
- **PDF:** kept in the study's Drive `Literature` folder as `Supermarket Product Detection and Recognition - Utilizing Deep Learning with Rectified Imagery.pdf`.

## Why this matters to our task

- **It is the published form of our levelling step.** R9-roll reads the camera's roll by Hough over the board lines
  and levels the photo. Sah & Mathew do the same over shelf lines, but correct **yaw** (photo taken from the side of
  the rack) with a full homography rather than roll with a rotation. Their one transferable lesson is about the line
  threshold. They set the accumulator threshold so that shelf edges outvote product edges, and they report that the
  angle goes wrong when no rack edge is visible. Product edges then win. That is our false-shelf-line failure from the
  other side.
- **A fixed global homography is the crude end of the design space.** Their own limitations section concedes it: one
  matrix per side whatever the angle, content lost at steep views (down to about 20%), and one rack orientation per
  photo. It is evidence for a per-shelf correction, which is what Trixi does with known corners
  ([Wieczorek 2022](wieczorek-2022-trixi-the-librarian.md)), and against warping a whole home photo.
- **Gains are small and vanish where we live.** Our photos carry tens of spines (one tagged photo, `1TmVNx`, got
  59 and then 78 boxes from successive finders, per WARMUP). Their gain at 20–40 objects per photo is +0.9 to +1.8, and above 40 rectification
  **costs** up to 3.1 points (Table 5).
- **What it does not cover:** books, spines, reading, oriented or quadrilateral boxes, roll or lean. No rectification
  accuracy is reported, the homography evaluation drawn in Fig. 4 included. Detection is axis-aligned, with grocery
  classes.

## The method, in full

**1. Orientation by Hough** (§2, §2.2, Fig. 2, Fig. 3).
- Grey image → Canny → Hough lines. OpenCV ("Python CV2") **4.7.0**, accumulator threshold a constant **500**.
  - §2 calls it a "linear Hough transform" and §2.2 a "Probabilistic Hough Transform". Which OpenCV call was used is
    not stated.
- Line form ρ = x sin θ − y cos θ (Eq. 2, written y cos θ = x sin θ + ρ), with 0 ≤ θ ≤ π.
- The threshold was chosen "such that the shelf display angles take priority over the edges detectable from the
  product boundaries".
- **Decision rule, text (§2.2):** θ < 85 → LEFT oriented, θ > 95 → RIGHT oriented. The units are evidently degrees,
  although Eq. 2 ranges θ over radians. Between the two, the photo passes uncorrected ("no significant angle
  deviation").
- **Decision rule, Fig. 2, which contradicts the text:** θ < 80° → **Right**-oriented, θ > 110° → **Left**-oriented,
  80°–110° → no correction. Both the thresholds and the side assignment differ. Which one the experiments used is
  unknown.
- **How one angle is drawn from many lines** appears only in figures: "polling of Hough lines determines the
  dominant angle θ" (Fig. 2), and "rank detected lines and pool their angle responses" into θ̂_dom (Fig. 3). The
  ranking and pooling rule is never given.

**2. Two fixed homographies** (§2, §2.3, Fig. 4).
- Built **once**, before any experiment, from two representative pairs: a left-angled photo and its frontal
  counterpart, and a right-angled photo and its frontal counterpart. The pairs were taken "at 40 to 60 degrees" in
  each alignment.
  - Steps: resize to 640×640, SIFT keypoints, FLANN matching, then RANSAC → H_L, H_R.
  - §2 says RANSAC computes "the fundamental matrix", which is used to rectify. That is a misnomer for a homography
    (Eqs. 3–6 are a homography).
- H is 3×3 with eight degrees of freedom. The text both normalises h33 = 1 and states a unit Frobenius norm (Eq. 6).
- Rectification: B = A·H_L or B = A·H_R (Eqs. 3–4). The text then swaps the roles ("'B' is the input image, and 'A'
  is the rectified image"). The direction of the warp cannot be settled from the text.
- The matrices stay "static" for all experiments. "Passive integration": the detector is unchanged and only sees
  rectified test photos.

**3. Detection.** Off-the-shelf detectors trained on a mix of frontal and angled photos. Only **angled test photos**
are rectified.
- Models: YOLOv3, v5 n/s/m, v7 and v7-tiny, v8 n/s/m, v9 t/s/m, v10 n/s/m, RT-DETR l/x and RetinaNet.
- Training: 100 epochs on a GTX 1080 Ti. Input 640, learning rate 0.01, weight decay 0.0005, momentum 0.937.

### Gaps: what the paper never states

- The Canny thresholds, the Hough ρ/θ resolution, and (if HoughLinesP) the minimum line length and maximum gap.
- How lines are pooled into one θ, and which rule (text or Fig. 2) was run.
- The FLANN parameters, the ratio test, the RANSAC reprojection threshold and the inlier counts.
- The matrices themselves, and which representative images built them.
- Whether boxes are evaluated in the rectified frame or mapped back, and how ground truth was transformed.
- What "mAP 0.9" means: AP at IoU 0.9, or something else.
- The angle reference behind "camera angle". Table 4 bins span 10°–170°, so 90° is presumably frontal. The text
  calls 30–60° "from either side".
- The number of images per bin in Table 4.
- Runtime of the rectification step.
- Dataset access: Grocer-Help is cited to the authors' Scientific Reports 2026 paper (ref. [22]); no link is given.
  No code is linked.

## Data

All counts are as printed. They do not reconcile with each other.

- **§2.1 counts.**
  - A Grocer-Help subset of **1946** photos: 1310 for training and 636 for testing, with 176 product classes, all
    resized to 640×640.
  - Augmentation (contrast, saturation, blur, hue, flip) gives **7784** images, "of which 5240 … constitute the
    augmented training set".
  - An evaluation set of **2544**: 944 frontal, 800 right and 800 left. 5240 + 2544 = 7784, so the evaluation set
    looks augmented as well; the paper does not say.
- **§3.1 counts.**
  - A training set of **4800** images with over 60,000 objects.
  - Testing on 200 right, 200 left and 136 frontal photos, which is **536**, not 636.
  - Camera angles of 15–80° for the angled test photos. Objects per photo range from 2 to 55.
- **Other facts.**
  - One store.
  - Dense photos hold at least 35 objects.
  - Racks have up to 5 shelf rows; extreme views show 2–4.
- **Table 5 subsets:** 60 left and 58 right photos at 30–60°.

## The reported numbers

**Table 3, mAP@0.5** (the "mAP 0.9" columns are omitted here; see Gaps). Gain is read off Fig. 7 and equals
rectified minus the mean of right and left. We checked that rule against every row.

| Model | Frontal | Right, unrectified | Left, unrectified | Rectified | Gain (Fig. 7) |
|---|---|---|---|---|---|
| YOLOv3 | 87.6 | 52.23 | 51.1 | 54.79 | +3.1 |
| YOLOv5n | 60.1 | 49.12 | 49.4 | 56.2 | +6.9 |
| YOLOv5s | 83.9 | 52.3 | 53.1 | 57.2 | +4.5 |
| YOLOv5m | 88.3 | 54.1 | 55.1 | 58.6 | +4.0 |
| YOLOv7 | 74.34 | 52.3 | 50.5 | 56.2 | +4.8 |
| YOLOv7-tiny | 62.1 | 40.2 | 41.2 | 45.2 | +4.5 |
| YOLOv8n | 42.2 | 34.3 | 34.4 | 36.1 | +1.8 |
| YOLOv8s | 82.0 | 53.1 | 53.9 | 56.4 | +2.9 |
| YOLOv8m | 85.77 | 55.1 | 56.8 | 59.5 | +3.5 |
| YOLOv9t | 37.8 | 29.7 | 30.1 | 33.2 | +3.3 |
| YOLOv9s | 64.9 | 52.8 | 52.1 | 57.3 | +4.8 |
| YOLOv9m | 83.4 | 57.8 | 58.1 | 60.1 | +2.1 |
| YOLOv10n | 51.2 | 40.0 | 40.2 | 44.5 | +4.4 |
| YOLOv10s | 80.3 | 54.2 | 55.0 | 60.1 | +5.5 |
| YOLOv10m | 86.7 | 57.1 | 57.8 | 60.8 | +3.3 |
| RT-DETR-l | 50.4 | 40.2 | 41.0 | 42.5 | +1.9 |
| RT-DETR-x | 79.2 | 52.5 | 53.2 | 57.2 | +4.4 |
| RetinaNet | 76.9 | 56.3 | 56.9 | 59.8 | +3.2 |

- The prose calls 86.7 (YOLOv10m) the best frontal mAP. The table's own best frontal values are **YOLOv5m 88.3 and
  YOLOv3 87.6**.
- 60.8 (YOLOv10m) is the best rectified value.
- 14 of the 18 gains lie between +2 and +5.
- Frontal stays 20–30 points above rectified for the large models.

**Table 4, mAP@0.5 by camera angle and density, without and with rectification:**

| Angle bin | ≤10 objects | ≤10, rectified | ≥11 objects | ≥11, rectified |
|---|---|---|---|---|
| 10–30 | 41.2 | 45.5 | 14.3 | 13.9 |
| 30–60 | 74.8 | 80.2 | 34.2 | 36.1 |
| 60–80 | 83.5 | 84.0 | 56.2 | 57.1 |
| 110–130 | 83.1 | 83.2 | 57.1 | 56.3 |
| 130–150 | 71.6 | 75.7 | 36.1 | 36.8 |
| 150–170 | 40.08 | 42.2 | 11.01 | 11.00 |

- There is no 80–110 bin.
- Rectification loses in three dense cells.
- The largest gain is at 30–60 (+5.4 sparse).

**Table 5, mAP@0.5 by objects per photo, angle 30–60°** (right: 58 photos; left: 60):

| Objects per photo | Right | Right, rectified | Left | Left, rectified |
|---|---|---|---|---|
| < 5 | 89.8 | 89.9 | 88.4 | 89.0 |
| 5–10 | 85.3 | 86.4 | 84.1 | 84.9 |
| 10–20 | 79.2 | 83.1 | 78.8 | 83.1 |
| 20–40 | 49.1 | 50.0 | 48.2 | 50.0 |
| > 40 | 18.2 | 15.1 | 19.1 | 18.2 |

- §3.2 concludes that rectification works best at **10–20** objects. The Conclusion says **5 to 10**. Table 5
  supports 10–20 (+3.9 and +4.3, against +1.1 and +0.8).
- Table 2 reports mAP of the same detectors on existing datasets (GroZi-120, Webmarket, GroZi-3.2K, Freiburg,
  SKU110K: 24–93). It is context only. Its training protocol is not described.

## Discussion and the authors' limitations (§4)

1. **Lost content.** In dense, steep photos rectification can push objects out of frame or make distorted, noisy
   regions. At the extreme, "only approximately 20%" of the original content survives, because a fixed homography
   is a large warp at steep views.
2. **Rack boundaries must be visible.** Without them the Hough lines follow product edges and the orientation is
   wrong, especially in close-up photos. Proposed remedy: other structural cues such as empty shelf space.
3. **One matrix per side,** whatever the angle. Proposed remedy: viewpoint-dependent or gradual homographies.
4. **One rack orientation per photo.** Several racks at different orientations make the lines ambiguous.

Future work names a deep Hough transform trained jointly with the detector, multi-stage homography, and quantised
detectors. The authors also argue that rectifying at test time compensates for training sets dominated by frontal
photos.

## What is not in this article

- No supplementary material, code or dataset link.
- Grocer-Help is described in the authors' *Scientific Reports* 16:14834 (2026). The earlier version of this work
  is in *Procedia Computer Science* 260:1026–1033 (2025), and RectyNet (trainable rectification) in *Pattern
  Recognition Letters* (2026).
- None of these was fetched.

## Figures

The figures have no URLs of their own outside the [arXiv HTML](https://arxiv.org/html/2610.08126v1).

- **Fig. 1 (p. 2): the use-case diagram.**
  - A person photographs a supermarket aisle on a phone. Frontal and angled example photos go to an "Image
    Rectification Module", then to an object detector with a pretrained model, then to a descriptor database.
  - The output is product counts and descriptions.
  - The example photos show soda bottles behind wire shelf fronts with yellow price tags, and an aisle receding
    steeply.
- **Fig. 2 (p. 3): the rectification schematic.**
  - Four panels run input → structural line extraction (converging shelf lines, slanted product edges) → Hough
    accumulator with a peak → dominant orientation.
  - The orientation panel holds the **θ < 80° / > 110° / 80–110°** rule, which conflicts with the text.
  - Below: left- and right-view 3×3 matrices, a perspective warp and a cartoon "rectified image".
  - It is entirely a drawing. No real photo is shown.
- **Fig. 3 (p. 4): the Hough block diagram.**
  - Image processing (input, edge detection) feeds Hough space analysis: ρ = x cos θ + y sin θ (a different sign
    convention from Eq. 2), sinusoids in (ρ, θ), an accumulator heat map, peak detection, and "Hough Line Polling".
    That yields θ̂_dom, then the viewpoint (LEFT, FRONTAL or RIGHT).
  - The caption promises "Image Instances of Hough Transform on left-aligned and right-aligned images". None are
    shown, so the text's appeal to Fig. 3 for "the low deviation of angles" has nothing to point at.
- **Fig. 4 (p. 5): the homography-estimation flow.**
  - Two rows, left- and right-aligned: reference image → aligned image → point correspondences → estimated H with
    h33 = 1.
  - A "Homography evaluation" row lists the matrix difference ‖H_known − H_estimated‖_F, the reprojection error,
    the corner/geometric error, and a comparison of E_L against E_R. **None of these is reported anywhere.**
  - The caption says the figure shows "the effect of Image rectification on Left and Right Aligned Images". It does
    not: no before/after photo exists in the paper.
- **Fig. 5 (p. 6): camera angle.**
  - (a) A cartoon frontal shelf of four rows with price tags and two security cameras.
  - (b, c) The same kind of rack drawn from the left and from the right.
  - Clip-art, not data.
- **Fig. 6 (p. 7): precision–recall curves.**
  - Eight panels: YOLOv5m, v5s, v8m, v8s, v9m, v10m, v10s and RT-DETR-x.
  - Each has many thin grey per-class curves and a bold blue mean curve.
  - Read by eye, the blue curves start at precision about 0.91–0.96 and end, at recall 1.0, around 0.62–0.76.
    YOLOv10s is lowest, about 0.62.
  - Which test split the curves come from is not stated.
- **Fig. 7 (p. 8): gain per model.**
  - A dumbbell chart of angled (blue) against rectified (orange) mAP@0.5, from YOLOv5n +6.9 at the top to YOLOv8n
    +1.8 at the bottom.
  - The angled point is the right/left mean (see the Table 3 note).

## Where we diverge, and what to take (our inference)

- **Keep the threshold lesson, not the pipeline.** Our board lines already feed R9-roll's Hough. Sah's
  rack-boundary limitation predicts our "false shelf line" breaks: with no long board in view, spine-top or
  lettering edges take the vote. A test would be to count, on our tagged photos, how often the strongest Hough line
  is not a board.
- **Do not warp the whole photo.** Our straightening already happens per box (`books.straighten`, four corners
  through a homography). A per-shelf correction, like Trixi's per-level warp from shelf corners but read off the
  board lines rather than known tags, is the local version of what Sah & Mathew propose as future work.
- **The numbers are not comparable to ours.** They are mAP of class-labelled grocery boxes on 640×640 resizes from
  one store. Nothing scores a box's geometry or the angle estimate itself.

## Deliberately omitted

- The introduction's market statistics.
- The related-detector survey and Table 1's dataset feature checklist.
- Table 3's FLOPs and parameter columns, and the "mAP 0.9" columns, whose definition is unknown. The values are in
  the PDF if wanted.

Cross-checked against the full 10-page text and all seven embedded figures.
