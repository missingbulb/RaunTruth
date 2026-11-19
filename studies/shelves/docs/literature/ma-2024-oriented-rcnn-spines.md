# Ma et al. 2024: An Accurate Book Spine Detection Network Based on Improved Oriented R-CNN

*Ma H., Wang C., Li A., Xu A., Han D. Sensors 2024, 24(24), 7996, published 14 Dec 2024. DOI
[10.3390/s24247996](https://doi.org/10.3390/s24247996). CC BY 4.0, open access. Authors: Dalian University of
Technology library and Dalian Maritime University. Read in full from the publisher PDF. The extracted text repeats
its "for peer review" layer, so most passages appear twice; the duplicates agree. PDF: study Drive folder `Literature/An Accurate Book Spine Detection Network Based on Improved Oriented R-CNN.pdf`.*

## What it gives the study

- **A strict criterion to report beside ours:** AP at **IoU ≥ 0.75** on oriented spine boxes. Our score credits a
  box by its IoU with the book, paired at any overlap (`algorithm/score.py`); the share of pairs at 0.75 next to 0.5
  would say whether our boxes are found or tight. Its base model's
  stated failure is the **upper boundary** of upright spines, so tightness is the hard part for learned models too.
- **A public spine set to measure our regime gap on**, not a target: the Shenzhen library set (CC0 on 4TU per
  [SURVEY](SURVEY.md)). It is single-row, tight-framed library shelves, where our photos are multi-shelf home
  bookcases; it can score boxes only.
- **A measured shape prior:** spine boxes at h/w ≈ 7–16 in the training frame, against our `ASPECT` floor of 2.5.
  It argues for measuring the aspect distribution on our own ground truth and setting the bound from it, not for
  raising the constant to their number.
- **The one learned detector small enough for the page**, as a gated route only (research-project §10):
  YOLOv8n-OBB, 10.88 M parameters, 29.63 GFLOPs, spine AP 75.19.

It gives no precision or recall at an operating point (only AP), no split by tilted vs upright photos, and no code
or weights, so nothing here places R9's P 0.67 / R 0.89 directly. Its midpoint-offset box is a parallelogram; our
four-corner box with straightening is more general, nothing to adopt.

## The supporting facts

- **Model:** Oriented R-CNN with deformable convolutions in the backbone and a PANet neck; boxes as a horizontal box
  plus two vertex offsets, so no angle is regressed and the 0/180° periodicity at upright spines does not arise.
- **Anchors from the data:** K-median with d = 1 − IoU on the training boxes normalised by image size. At **K = 3**
  the centres are (w, h) = (0.037, 0.067), (0.116, 0.814), (0.048, 0.779), giving **h/w = {1.79, 7.05, 15.94}**.
  The two tall centres put a spine's box at **0.78–0.81 of the image's height** (our inference): close-ups of one
  shelf row, not whole bookcases.
- **Data:** 661 smartphone photos of Shenzhen University library shelves (283 tilted, 378 near-vertical, lean under
  5°), **15,454 spines, about 23 per image**; classes *spine* and *label* (the call-number sticker). Split 8:2
  *before* augmentation, then each image tripled: 1587 train / 396 test, so about **132 distinct test photos**, each
  scored three times (our inference). Augmentation: brightness [0.5, 1.5], Gaussian noise, a 17×17 blur, contrast
  stretch, flips.
- **Metric:** AP at IoU ≥ 0.75; mAP is the mean over the two classes and is padded by the easy label class (~90 for
  every model), so the **spine AP** is the column comparable to our task.

| (Table 4; anchor-based models use the clustered ratios) | spine AP | Params ("MB" as printed: the parameter count) | GFLOPs | FPS |
|---|---|---|---|---|
| R3Det | 47.98 | 41.90 | 335.74 | 10.73 |
| S2ANet | 57.33 | 38.60 | 197.62 | 12.64 |
| Rotated Faster R-CNN | 64.59 | 41.14 | 198.41 | 12.31 |
| RoI Transformer | 70.85 | 55.13 | 199.52 | 8.14 |
| YOLOv8n-OBB | 75.19 | 10.88 | 29.63 | 26.71 |
| Oriented R-CNN (base) | 81.41 | 41.13 | 198.53 | 12.48 |
| STD-O (ViT) | 89.07 | 30.15 | 120.59 | 3.17 |
| **Ours** | **90.20** | 45.25 | 195.14 | 10.88 |

- The clustered anchors alone lift the base's spine AP **71.25 → 81.41** (Table 2); K = 5 or 7 adds nothing.
- **How far to trust them:** one training run per model, no variance, about 132 augmented test photos, and the
  hyperparameters chosen by mAP on the test split (no validation split is described). Differences under ~1 point are
  noise. The prose contradicts Table 4's margins three times; trust the table. FPS hardware is not stated.

## Failures that bear on ours

- The base misses **five tilted copies of one identical book**. Repeated copies defeat a learned detector too; our
  `series_split` attacks the same case from the other side, splitting one box rather than recovering a missed one.
- It misses spines distorted by the camera angle at the image's **left edge** (cf. our frame-edge misses).
- The authors reject horizontal boxes because neighbouring boxes overlap heavily and NMS suppresses real spines.

## Gaps the study would need

Whether the IoU is between oriented boxes or polygons; NMS and score thresholds; the photos' original resolution;
whether the 1024 resize keeps aspect; precision and recall at a fixed point; the dataset licence (in the paper);
code or weights ("Data are contained within the article", but they are not).

Left out: the network's layer-by-layer build and training schedule, the ablation of its modules, the related-work
survey and the qualitative figures.
