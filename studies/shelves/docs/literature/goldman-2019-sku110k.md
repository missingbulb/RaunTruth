# Goldman et al. 2019 — Precise Detection in Densely Packed Scenes (SKU-110K, EM-Merger)

*E. Goldman, R. Herzig, A. Eisenschtat, O. Ratzon, I. Levi, J. Goldberger, T. Hassner. CVPR 2019 ·
arXiv [1904.00853](https://arxiv.org/abs/1904.00853) (v3, 30 Apr 2019) · Bar-Ilan, Tel Aviv University,
Trax Retail (funder), Open University of Israel · open access on arXiv, licence not checked; the dataset's
licence is not stated in the paper (code and data at github.com/eg4000/SKU110K_CVPR19) · PDF: study Drive folder `Literature/Precise Detection in Densely Packed Scenes.pdf` · full text read from the arXiv PDF.*

**Why it matters to us:** our finder's hardest choice is which of many overlapping candidates are separate
books (R9's runs are joined by "add where it overlaps none at IoU 0.3", `ADD_IOU`; lines are joined by `CROWD`).
This paper replaces greedy suppression with a clustering merger and shows the merger, not the learned score,
carries most of the gain. The detector itself is a CNN we will not run.

## 1. Method, step by step

**Base detector** (not portable): RetinaNet-like, ResNet-50 + FPN with three upscaling layers; per RPN, a box
head (x, y, h, w: centre, height, width) and an objectness head c ∈ [0,1]. Detections with **c ≤ 0.1 are
dropped** before the Soft-IoU layer is trained.

**Soft-IoU head.** A third fully-convolutional head predicts c^iou ∈ [0,1], the IoU of the box with *the
closest annotated box* (image coordinates; 0 if they do not overlap; pixels counted). Trained with binary
cross-entropy against that IoU; total loss L = L_cls (cross-entropy) + L_reg (Euclidean) + L_sIoU. Rationale: an
objectness classifier is trained to be invariant to partial overlap, so a box covering half of two products
scores high objectness but should score low IoU.

**EM-Merger** (the portable part), on the N surviving detections:

1. Each box → 2-D Gaussian f_i: mean µ_i = (x_i, y_i), diagonal covariance Σ_i = diag((h_i/4)², (w_i/4)²) (sic:
   the paper pairs h with the first coordinate; see Gaps).
2. Mixture f = Σ α_i f_i, with α_i = c^iou_i / Σ_k c^iou_k.
3. Seek K ≪ N Gaussians g_j (weights β_j) minimising d(f, g) = Σ_i α_i min_j KL(f_i ‖ g_j).
4. **K = size(I) / (µ_w µ_h)**: image area over mean box area, "the number of non-overlapping mean-sized boxes
   that fit", stated as an *upper bound*.
5. **Initialise** by agglomerative hierarchical clustering: every detection its own cluster, merged until K remain
   (rejected alternative: deep clustering, pointless in 2-D).
6. **E-step:** π(i) = argmin_j KL(f_i ‖ g_j). **M-step:** β_j = Σ_{i∈π⁻¹(j)} α_i; µ'_j = (1/β_j) Σ α_i µ_i;
   Σ'_j = (1/β_j) Σ α_i (Σ_i + (µ_i − µ'_j)(µ_i − µ'_j)ᵀ) (each member's own spread plus its offset).
7. **Stop** when d(f, g) < ε_EM = 1e-10, or after **10 iterations** ("nearly always converges within ten").
8. **Model selection:** suppress less-confident Gaussians overlapping another "by more than a predefined
   threshold" → K' ≤ K, the actual count.
9. **Gaussian → box:** take the 2σ ellipse of each g_j, collect the original detections whose *centres* fall
   inside, output the **median width and height** of that set (centre: the Gaussian's mean, by implication).

**Method only in figures:** Fig. 2 and 3 show the mixture rendered as a heat map whose peaks are the items, with
the K' Gaussians as green ellipses; the dark bottom row of Fig. 1 is where RetinaNet+NMS splits and merges items,
i.e. low-contrast neighbours are the stated hard case.

## 2. Data — SKU-110K

11,762 shelf photos from thousands of stores (US, Europe, East Asia), taken on paid associates' own phones at
≥ 5 MP, **JPEG-compressed to 1 MP**; angles, light, devices unregulated. Mean **147.4 objects per image**; one class
(object). Boxes by skilled annotators, visually checked for *obvious* errors only. Split 70/5/25: train 8,233
images (1,210,431 boxes), val 588 (90,968), test 2,941 (432,312), **never the same shelf display of the same shop in
two subsets**.

## 3. Metrics

COCO AP at IoU .50:.05:.95; AP.75; AR300 (300 = max objects); **PR=.5 = precision read at recall 0.5 on the
IoU 0.75 curve** (not IoU 0.5); per-image count **MAE** = mean |K'_i − t_i| and **RMSE**.

## 4. Results (SKU-110K test)

| Method | AP | AP.75 | AR300 | PR=.5 | MAE | RMSE |
|---|---|---|---|---|---|---|
| Monkey (random boxes, true K' and size stats) | .000 | 0 | .010 | 0 | — | — |
| Faster R-CNN | .045 | .010 | .066 | 0 | 107.46 | 113.42 |
| YOLO9000opt (retrained for 300 boxes) | .094 | .073 | .111 | 0 | 84.17 | 97.81 |
| RetinaNet | .455 | .389 | .530 | .544 | 16.58 | 30.70 |
| Base & NMS | .413 | .384 | .484 | .491 | 24.96 | 34.38 |
| Soft-IoU & NMS | .418 | .386 | .483 | .492 | 25.39 | 34.73 |
| Base & EM-Merger (objectness weights) | .482 | .540 | .553 | .802 | 23.98 | **283.97** |
| Full (EM-Merger on Soft-IoU) | **.492** | **.556** | **.554** | **.834** | **14.52** | **23.99** |

Trust: single runs, no variance; one dataset the authors built; still the cleanest ablation of NMS vs clustering
merge in the literature. The merger alone lifts AP.75 .384 → .540 and PR=.5 .491 → .802: the large, believable
effect. The score alone with NMS changes nothing (.413 → .418, MAE slightly worse). The RMSE of 283.97 for
merger-on-objectness is unexplained (presumably a few images with runaway counts); it says the weights matter for
*counting* even when AP barely moves. RetinaNet beats their own base (.455 vs .413), attributed to "better framework
optimisation".

Counting transfer (car parks, MAE / RMSE): CARPK 6.77 / 8.52 vs RetinaNet 16.62 / 22.30; PUCPR+ 7.16 / 12.00 vs
IEP 15.17. Trust: comparison numbers partly copied from other papers.

Runtime (i7-5930K + Titan X): base 0.5 FPS; with EM-Merger on CPU 0.23 FPS, blamed on GPU↔CPU memory traffic; "a GPU
version will be nearly as fast" is an untested claim. The merger's own CPU cost is not isolated.

**Failure modes stated:** "far from perfect"; dense dark items; YOLO-family unsuited above ~50 objects.

## 5. Gaps — what the paper does not state

- The **suppression threshold** in step 8 and what "overlap" between Gaussians means (IoU of 2σ boxes? KL?).
- Whether µ_w, µ_h in K are means over *all detections* or something else; whether K is ever reached or
  only bounds the agglomerative stop.
- The **agglomerative linkage** and distance (KL? Euclidean centres?).
- The covariance pairing: Σ_i = diag((h/4)², (w/4)²) against µ = (x, y) puts height on the x axis; likely a
  notation slip, but unstated.
- The output box **centre** (Gaussian mean or median of members) and how a Gaussian with no member centre inside
  2σ is handled.
- The closed-form diagonal KL they use (we take the standard one).
- Any per-component CPU timing; any analysis of the 283.97 RMSE outliers.

## 6. What transfers to a bookshelf / where we diverge (our inference, untested on spines)

- **A 1-D EM merge per shelf row.** A row is nearly one-dimensional. Each candidate box from all R9 runs (base,
  log-grey, 1440 px, gap search, regions) becomes N(x_i, (w_i/4)²) on the row axis, x_i its centre at mid-height,
  w_i its width. Weight α_i by a cheap quality score we already compute (`spine` checks passed, `text_along`
  coverage, seam strength); the ablation says even objectness-grade weights give most of the AP gain.
  KL(f‖g) = ln(σ_g/σ_f) + (σ_f² + (µ_f − µ_g)²)/(2σ_g²) − ½. Initialise by sorting centres and merging adjacent
  pairs (1-D agglomerative is a sort), K = row length / median candidate width (a prior the row measures for
  itself, so no assumed count). Run 10 iterations, then each cluster's box is the median width of members within
  2σ. Cost O(N·K) per iteration: a few hundred candidates per row is microseconds in numpy.
- **What it would replace:** the `ADD_IOU` pass-overlap rule (first run wins, later runs only fill holes) and
  `CROWD`'s pairwise spacing merge, with one global choice that lets a better later box displace an earlier one.
- **Divergences.** Their boxes are axis-aligned; ours are leaning quads, so the 1-D axis must be the row after
  the row's lean is removed, or the merge done on the bottom-edge midpoint. Their K is an upper bound on an image
  full of products; our rows hold posts and ornaments, so K' (step 8) matters more than K. They have a learned IoU
  score; ours would be hand-made, and the RMSE 283.97 row warns that a poor weight can wreck the count.
- **Evaluation borrowings:** per-photo count MAE beside P/R, and the never-same-shelf split rule for held-out
  photos.

## 7. Deliberately omitted

Cross-checked against the full 10-page text. Omitted: the related-work survey of detectors and NMS
alternatives (mean-shift, affinity propagation, GossipNet, Soft-NMS are named only), Table 1's comparison of other
benchmarks, network training details (none are given beyond the losses), the Monkey baseline's sampling formula
beyond its one-line summary, acknowledgements and references.
