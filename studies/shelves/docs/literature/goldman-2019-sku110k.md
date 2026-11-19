# Goldman et al. 2019 — Precise Detection in Densely Packed Scenes (SKU-110K, EM-Merger)

*E. Goldman, R. Herzig, A. Eisenschtat, O. Ratzon, I. Levi, J. Goldberger, T. Hassner. CVPR 2019 ·
arXiv [1904.00853](https://arxiv.org/abs/1904.00853) (v3, 30 Apr 2019) · Bar-Ilan, Tel Aviv University,
Trax Retail (funder), Open University of Israel · open access on arXiv, licence not checked; the dataset's
licence is not stated in the paper (code and data at github.com/eg4000/SKU110K_CVPR19) · PDF: study Drive folder `Literature/Precise Detection in Densely Packed Scenes.pdf` · full text read from the arXiv PDF.*

## What it gives the study

Our finder's hardest choice is which of many overlapping candidates are separate books: R9's runs are joined by
"add where it overlaps none at IoU 0.3" (`ADD_IOU`, first run wins), lines by `CROWD`'s pairwise spacing. This paper
replaces greedy suppression with a **clustering merger** and its ablation shows the merger, not the learned score,
carries most of the gain. The merger is CPU-cheap and portable; the CNN detector is not, and we will not run it.

It also gives two evaluation habits: **per-photo count error** (MAE) beside precision and recall, and a held-out split
that **never puts the same shelf display in two subsets**.

It does not give the merger's suppression threshold (see Gaps), and nothing about leaning or thin objects.

## The EM-Merger, as we would port it

On the N detections that survive (objectness c > 0.1):

1. Each box → 2-D Gaussian: mean (x_i, y_i), covariance diag((h_i/4)², (w_i/4)²) (the paper pairs h with the first
   coordinate; likely a notation slip).
2. Mixture weights α_i = c^iou_i / Σ c^iou, where c^iou is a learned prediction of the box's IoU with the nearest
   true object (an objectness score stays high on a box over half of two products; the IoU score does not).
3. Find K ≪ N Gaussians minimising Σ_i α_i min_j KL(f_i ‖ g_j), with **K = image area / mean box area**, stated as
   an upper bound.
4. Initialise by agglomerative clustering down to K; then EM: assign each detection to its nearest Gaussian by KL,
   re-estimate weights, means and covariances (each member's spread plus its offset). Stop at d < 1e-10 or after
   **10 iterations** ("nearly always converges within ten").
5. Suppress less-confident Gaussians overlapping another "by more than a predefined threshold" → K', the count.
6. Each Gaussian's box: the **median width and height** of the detections whose centres fall inside its 2σ ellipse.

## The numbers it rests on (SKU-110K test)

| Method | AP | AP.75 | PR=.5 | count MAE | RMSE |
|---|---|---|---|---|---|
| RetinaNet | .455 | .389 | .544 | 16.58 | 30.70 |
| Base & NMS | .413 | .384 | .491 | 24.96 | 34.38 |
| Soft-IoU & NMS | .418 | .386 | .492 | 25.39 | 34.73 |
| Base & EM-Merger (objectness weights) | .482 | .540 | .802 | 23.98 | **283.97** |
| Full (EM-Merger on Soft-IoU) | **.492** | **.556** | **.834** | **14.52** | **23.99** |

PR=.5 is precision at recall 0.5 on the IoU 0.75 curve. The merger alone lifts AP.75 .384 → .540 and PR=.5 .491 →
.802; the learned score with NMS changes nothing. The 283.97 RMSE for the merger on objectness weights is
unexplained (presumably a few runaway counts): the weights matter for counting even when AP barely moves. Trust:
single runs, no variance, one dataset the authors built (11,762 store photos JPEG-compressed to 1 MP, mean **147.4
objects per image**); still the cleanest NMS-vs-clustering ablation in the literature. The merger's own CPU cost
is not isolated. Stated hard case: low-contrast, dark neighbouring items.

## Gaps the port would have to fill

The suppression threshold in step 5 and what "overlap" between Gaussians means; whether mean box size in K is over
all detections and whether K is ever reached; the agglomerative linkage and distance; the output box's centre
(Gaussian mean, by implication); handling a Gaussian with no member centre inside 2σ.

## What transfers to a bookshelf (our inference, untested on spines)

- **A 1-D EM merge per shelf row.** Each candidate from all R9 runs (base, log-grey, 1440 px, gap search, regions)
  becomes N(x_i, (w_i/4)²) on the row axis, x_i its centre at mid-height. Weight by a quality score we already have
  (`spine` checks passed, `text_along` coverage, seam strength). KL(f‖g) = ln(σ_g/σ_f) + (σ_f² + (µ_f − µ_g)²)/(2σ_g²)
  − ½. Initialise by sorting centres (1-D agglomerative is a sort), K = row length / median candidate width (a prior
  the row measures for itself), 10 iterations, each cluster's box the median width of members within 2σ. A few
  hundred candidates per row is microseconds in numpy.
- **What it would replace:** `ADD_IOU`'s first-run-wins rule and `CROWD`'s pairwise merge, with one global choice that
  lets a better later box displace an earlier one.
- **Divergences:** their boxes are axis-aligned, ours leaning quads, so the axis must be the row after its lean is
  removed, or the bottom-edge midpoint. Our rows hold posts and ornaments, so K' (step 5) matters more than K. Our
  weight would be hand-made, and the 283.97 RMSE row warns that a poor weight can wreck the count.

Left out: the detector's architecture and losses, the dataset's split sizes, the other baselines, the car-park
counting transfer, runtime on GPU, and the related work.
