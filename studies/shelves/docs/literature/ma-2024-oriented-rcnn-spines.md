# Ma et al. 2024: An Accurate Book Spine Detection Network Based on Improved Oriented R-CNN

*Ma H., Wang C., Li A., Xu A., Han D. Sensors 2024, 24(24), 7996, published 14 Dec 2024. DOI
[10.3390/s24247996](https://doi.org/10.3390/s24247996). CC BY 4.0, open access. Authors: Dalian University of
Technology library and Dalian Maritime University. Read in full from the publisher PDF. The extracted text repeats
its "for peer review" layer, so most passages appear twice; the duplicates agree. PDF: study Drive folder `Literature/An Accurate Book Spine Detection Network Based on Improved Oriented R-CNN.pdf`.*

**Why it matters to us:** it is the one spine-detection benchmark with a stated strict IoU, oriented boxes, and a
public library dataset. It also measures a small learned detector, YOLOv8n-OBB.

## Method, step by step

The base is Oriented R-CNN (Xie et al., ICCV 2021). It has four parts.
- **(a) Backbone.** ResNet50, pre-trained on ImageNet. In the residual blocks of "the last three layers" (stages are
  not named), every 3×3 convolution becomes a 3×3 deformable convolution (DCN). A DCN learns an offset Δpₙ for each
  sampling point and reads the shifted points by bilinear interpolation (Eqs. 1–2).
- **(b) Neck.** An FPN with bilinear upsampling produces P2–P5. A PANet bottom-up path follows: Nᵢ goes through a 3×3
  conv with stride 2, is added to Pᵢ₊₁, then through another 3×3 conv, giving Nᵢ₊₁. N2 is a copy of P2, and N6 is
  N5 max-pooled to half size.
- **(c) Oriented RPN.** Anchor areas are 32², 64², 128², 256² and 512², one per level from N2 to N6, with 3 aspect
  ratios each. A 3×3 conv feeds two 1×1 convs, which output a class score and the offsets δ = (δx, δy, δw, δh, δα,
  δβ).
- **The midpoint-offset box.** The box is (x, y, w, h, Δα, Δβ), where (x, y, w, h) is the rotated box's horizontal
  bounding box. Δα is how far vertex v1 sits from the midpoint of the top edge; Δβ is how far v2 sits from the midpoint
  of the right edge. Decoding (Eq. 3): x = δx·wa + xa, y = δy·ha + ya, w = wa·e^δw, h = ha·e^δh, Δα = δα·w,
  Δβ = δβ·h. With this form there is no angle to regress, so the 0/180° periodicity at upright spines does not arise.
- **(d) Head.** Rotated RoI Align, then fully connected layers for class and box refinement.
- **Anchors by improved K-median** (Algorithm 1). The distance is d = 1 − IoU, over the horizontal bounding boxes of
  the training set, with w and h normalised by the image's width and height.
  - Initialisation: pick one random centre. Then, until there are K centres, add the sample farthest from its nearest
    centre, reassign every sample, and recentre each cluster on its median.
  - Then run standard K-median from those centres.
  - At **K = 3** the centres are (w, h) = (0.037, 0.067), (0.116, 0.814) and (0.048, 0.779). That gives
    **h/w = {1.79, 7.05, 15.94}**, replacing the default {0.5, 1, 2}.
- **Training.**
  - Input resized to 1024×1024. SGD, learning rate 0.005, momentum 0.9, weight decay 1e-4, batch 2, 48 epochs, the
    rate ×0.1 at epochs 32 and 44. PyTorch 1.13, one NVIDIA A800.
  - Hyperparameters were chosen by mAP "on the book spine dataset" (Table 1). No validation split is described, so
    our reading is that the choice was made on the test split. Batch sizes 2, 8 and 16 gave mAP 80.68,
    80.36 and 79.86. Batch 16 at 96 epochs gave 80.20.
- **Augmentation**, applied to train and test *separately* after the split:
  - brightness factor drawn uniformly from [0.5, 1.5];
  - Gaussian noise, μ = 0, σ² = 0.05 (intensity scale not stated);
  - Gaussian blur, 17×17 kernel, σ = 0. *Our inference:* in OpenCV, σ = 0 means σ is derived from the kernel size,
    about 2.9;
  - min–max contrast stretch to [0, 255];
  - random horizontal or vertical flip.

## Definitions

- **Classes.** There are two: *spine* and *label*. The label is the call-number sticker; its polygons were added by the
  authors in Labelme, and everything was converted to DOTA format.
- **Angle.** The long side's angle to +x, in [0°, 180°). Most fall in 45–135°, peaking at 90°.
- **Metrics.** AP is the area under the precision–recall curve at **IoU ≥ 0.75**. mAP is the mean over the 2 classes.
  "Params (MB)" is the parameter count, units as printed. *The spine-class AP is the column comparable to our task;
  mAP is padded by the easy label class (about 90 for every model).*

## Data

- **Book spine dataset** (Zeng, Yang & Zhong 2020, the paper's ref. [22]).
  - 661 smartphone photos of Shenzhen University library shelves: 283 tilted (camera angle or placement) and 378
    near-vertical (lean under 5°).
  - 15,454 hand-labelled spines, about 23 per image.
  - Split 8:2 *before* augmentation, then each image tripled: 1587 train, 396 test.
  - *Our inference:* the test set is therefore about **132 distinct photos**, each scored in 3 versions. The licence is
    not stated in the paper; [SURVEY](SURVEY.md) records CC0 on 4TU.
- **On-shelf-books-recognition dataset** (Zhou et al. 2022). 425 images at 1920×1080 from the National Agricultural
  Library of CAAS. It has **no annotations** and is used only to show results by eye (Fig. 18).
- **Regime, our inference from the anchor centres.** A spine's bounding box is about **0.78–0.81 of the image's
  height**. These are close-ups of one shelf row, not whole bookcases.

## Results

**How far to trust them.** Every number comes from a single training run with no variance. The test set is about 132
photos, augmented, and hyperparameters were picked on it. Differences under about 1 point are noise.

**Anchors** (Table 2, base Oriented R-CNN):

| K | ratios | spine AP | label AP | mAP |
|---|---|---|---|---|
| 3 (default) | 0.5, 1, 2 | 71.25 | 90.11 | 80.68 |
| 3 | 1.79, 7.05, 15.94 | 81.41 | 90.09 | 85.75 |
| 5 | 1.48 … 18.00 | 81.38 | 90.18 | 85.78 |
| 7 | 1.33 … 18.99 | 81.49 | 90.13 | 85.81 |

With clustered anchors the model converges by epoch ~24 instead of ~32 (Fig. 14).

**Ablation** (Table 3, mAP / Params): base 80.68 / 41.13. K-median 85.75. +DCN 90.06 / 41.71. +PAFPN 90.15 / 44.67.
All three 90.22 / 45.25. The gains do not add up: either module alone gives about +4.3, both together +4.47.

**Comparison** (Table 4). All anchor-based models use the clustered ratios.

| model | spine AP | label AP | mAP | Params | GFLOPs | FPS |
|---|---|---|---|---|---|---|
| R3Det | 47.98 | 78.35 | 63.17 | 41.90 | 335.74 | 10.73 |
| S2ANet | 57.33 | 89.69 | 73.51 | 38.60 | 197.62 | 12.64 |
| YOLOv8n-OBB | 75.19 | 87.45 | 81.32 | 10.88 | 29.63 | 26.71 |
| Rotated Faster R-CNN | 64.59 | 89.91 | 77.25 | 41.14 | 198.41 | 12.31 |
| RoI Transformer | 70.85 | 89.45 | 80.15 | 55.13 | 199.52 | 8.14 |
| Oriented R-CNN (base) | 81.41 | 90.09 | 85.75 | 41.13 | 198.53 | 12.48 |
| STD-O (ViT) | 89.07 | 88.61 | 88.84 | 30.15 | 120.59 | 3.17 |
| **Ours** | **90.20** | 90.24 | **90.22** | 45.25 | 195.14 | 10.88 |

**The prose contradicts the table three times.** It says the mAP margins are 16.17 over S2ANet, 23.80 over Rotated
Faster R-CNN and 22.45 over RoI Transformer; Table 4 gives 16.71, 12.97 and 10.07. Trust the table. The headline
"+4.47 over the baseline" is measured against the base *with clustered anchors*; against plain Oriented R-CNN the gain
is 9.54. The FPS hardware and batch size are not stated.

## Failure modes, and what the authors rejected

**Failures** (Figs. 15 and 17):
- The base misplaces the **upper boundary** of upright spines.
- It misses **five tilted copies of one identical book**.
- It misses spines distorted by the camera angle at the image's **left edge**.
- The authors claim DCN fixes the deformed ones and PAFPN improves localisation on tilted ones. The evidence is two
  pictures.

**Rejected, with stated reasons:**
- Horizontal-box detectors: neighbouring boxes overlap heavily, so NMS suppresses real spines.
- Multi-angle rotation before detection: slow.
- Angle regression (Zeng's Mask R-CNN): loses accuracy at upright spines because of angle periodicity.
- RRPN's dense rotated anchors: costly.
- K-means for anchors: sensitive to outliers.
- K beyond 3 and batch sizes above 2: no gain.

## Gaps: what the paper never states

- Whether the IoU is between oriented boxes or between polygons. The NMS and score thresholds.
- The label instance count and the Shenzhen images' original resolution.
- Whether the 1024 resize keeps the aspect ratio.
- The noise intensity scale. Which stages got DCN.
- Results split into tilted and near-vertical images.
- Precision and recall at a fixed operating point (only AP).
- The dataset licence. Code or weights ("Data are contained within the article", but they are not).

## Where we diverge / what to take (our inference)

- **Score at their criterion too.** We match at IoU > 0.5 (`lab/grade.py`), while their AP uses 0.75. Reporting
  matched books at 0.75 next to 0.5 would tell us whether our boxes are merely found or tight. Their top-boundary
  failure suggests tightness is the hard part for learned models as well.
- **A transfer test, not a target.** The Shenzhen set is a single-row, tight-framed library regime, and our photos
  are multi-shelf home bookcases. Scoring R9 on a sample of it measures the regime gap (research-project §9). It can
  score boxes only. For us its spine AP of ~81–90 is a ceiling from another regime, not a number to beat.
- **A shape prior from data.** Their spine bounding boxes run h/w ≈ 7–16 in the square-resized frame, while our
  `ASPECT` floor is 2.5. This supports measuring the aspect distribution on our own ground truth and setting the bound
  from it, rather than raising the constant on their number.
- **Representation.** The midpoint offset is a parallelogram. Ours is a full quadrilateral with straightening, which
  is more general; nothing to adopt.
- **A learned route, gated** (research-project §10). YOLOv8n-OBB is the only candidate small enough for the page:
  10.9 M parameters, 29.6 GFLOPs, spine AP 75.19. It would be an opt-in route trained on Shenzhen-type data and scored
  on our 133 books, never a baseline dependency.
- **Repeated identical copies** defeat the learned detector too. Our `series_split` targets the same case from the
  opposite direction, splitting one box rather than recovering a missed one.

## Deliberately omitted

- The DCN and FPN background beyond what defines the build.
- The K-median mIoU curve (Fig. 12; no numbers in the text) and the density plot (Fig. 7).
- The related-work survey; the related work it cites was not itself read.
- Contributions, funding and references.

Cross-checked against the full 24-page text, both layers.
