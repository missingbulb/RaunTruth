# Wang et al. 2022 — CD31, phalloidin and α-SMA on the vessels of normal and ischemic rat brain

- **Title:** *The immunolocalization of cluster of differentiation 31, phalloidin and alpha smooth
  muscle actin on vascular network of normal and ischemic rat brain*
- **Authors:** Jia Wang†, Yating Guo†, Dongsheng Xu, Jingjing Cui, Yuqing Wang, Yuxin Su, Yihan Liu,
  Yi Shen, Xianghong Jing, **Wanzhu Bai\*** (†equal contribution; \*corresponding,
  wanzhubaisy@hotmail.com). Institute of Acupuncture and Moxibustion, China Academy of Chinese
  Medical Sciences, Beijing 100700, China.
- **Venue / id:** *Scientific Reports* (2022) **12:22288**. DOI **10.1038/s41598-022-26831-6**. Open
  access (CC BY). 13-page article.
- **PDF:** kept in the study's Drive `Literature` folder as `The immunolocalization of cluster of differentiation 31, phalloidin and alpha smooth muscle actin on vascular network of normal and ischemic rat brain.pdf`, not in the repo.

## What it gives the study

- **The 16 primary 2D panels** (`VESSEL_fig1…fig6_*`), the set `measure_vessels.py`'s region
  tables and the expected results below are built on. Each is the isolated goat-polyclonal CD31
  (gP-CD31) channel, shown red: in every comparison figure column `1` is the merge, **`2` the
  vessels alone**, `3` the second marker, `4`/`5` a 3-D render. Only column `2` is an input.
- **What CD31 shows, and so what a vessel mark means.** gP-CD31 labels the endothelium of the whole
  network, capillaries to penetrating arteries, in healthy and ischemic cortex; the mouse
  monoclonal (mM-CD31) lights capillaries only in the ischemic area. A gP-CD31 channel is therefore
  a complete vessel map, but **one that does not distinguish arteries**: it is the inner (lumen-side)
  layer, wrapped on penetrating arteries by phalloidin (F-actin) and, outside that, a disconnected
  α-SMA layer; on capillaries those two are sparse and largely independent of CD31.
- **For CATEGORIZE:** artery identity comes from the wall marker, not from CD31 width. Figs 5 and 6
  (phalloidin, α-SMA, column `3`) mark artery walls in the same fields as `VESSEL_fig5_*` /
  `VESSEL_fig6_*`, which makes them the study's independent check on a caliber cut. No caliber
  number is published.
- **The region ranking our results must reproduce.** Four regions: normal (control rat), ischemic
  core, penumbra, contralateral (mirror side of the same I/R brain). gP-CD31 intensity **and**
  area % peak in the ischemic area at **24 h** after a 1.5 h MCAO (Fig 3E–G; P < 0.05, n = 4 rats
  per group, 12 fields per region, mean ± SEM, values read off bar charts, not tabulated). This is
  a single time point: Rust 2020 finds *fewer* vessels three weeks after photothrombosis, so the
  ranking is not "ischemia ⇒ more vessels" in general.

**What it does not give:** no vessel count, length, branching or caliber; the authors quantified
only mean intensity (three 10× images per rat, every 12th section) and area % above a threshold
(ImageJ; the threshold is not stated). The raw `.oib` data are not shared.

## Acquisition, for calibration

- **Sections:** coronal, **80 µm** thick, perfusion-fixed (4% PFA). Thick enough that connectivity
  in a projection means something.
- **Confocal (Olympus FV1200):** 10× field 1260 × 1260 µm at 1024 × 1024 px (≈ 1.23 µm/px, computed
  from the stated field); 40× field 310 × 310 µm at 640 × 640 px (≈ 0.48 µm/px), z-stacks of about
  40 images at 2 µm steps (the 3-D renders, Imaris 7.7.1, brightness/contrast only).
- **Scale bars:** 50 µm on the column `1`/`2`/`3` detail panels; 2 mm and 200 µm on the overviews;
  40 and 20 µm on the 3-D panels. The paper does not say which objective each detail panel was taken
  with, so the panels are calibrated off their printed 50 µm bar, never from the field sizes above.
- The panels are **figure-resolution crops**, downsampled from the raw confocal: good for
  segmentation and ranking, not for publication-grade absolute length.

Left out: the glossary, reagent catalogue numbers and dilutions, the MCAO surgery, edema and
hemisphere-area results, Nissl findings, the monoclonal-vs-polyclonal epitope discussion and
angiogenesis speculation; none bears on segmentation, the metrics or ground truth.

## Figures

### The working dataset — `VESSEL_*` panels (16)

Cut from the publisher's figures (300 ppi). Calibration is `measure_vessels.py`'s `SCALEBAR_PX`,
measured off each figure's 50 µm bar: Fig 1 61 px (**0.820 µm/px**), Fig 3 47 px (**1.064 µm/px**),
Figs 4/5/6 76 px (**0.658 µm/px**). Wang panels carry no paper tag in their names.

| Panel | Cut from | Region | µm/px |
|---|---|---|---|
| `VESSEL_fig1_C1_healthy_gP-CD31_red.png` | Fig 1 C1 | healthy control | 0.820 |
| `VESSEL_fig3_{ischemic,penumbra,contralateral}_gP-CD31_red.png` | Fig 3 B2 / C2 / D2 | core / penumbra / contralateral | 1.064 |
| `VESSEL_fig4_{normal,ischemic,penumbra,contralateral}_gP-CD31_red.png` | Fig 4 A2–D2 | 4 regions | 0.658 |
| `VESSEL_fig5_{normal,ischemic,penumbra,contralateral}_gP-CD31_red.png` | Fig 5 A2–D2 | 4 regions | 0.658 |
| `VESSEL_fig6_{normal,ischemic,penumbra,contralateral}_gP-CD31_red.png` | Fig 6 A2–D2 | 4 regions | 0.658 |

Figs 4, 5 and 6 each show the four regions with a different second marker, so the twelve panels
are three separate captures per region: a robustness check across acquisitions.

**Crop method, to rebuild them:** Figs 4/5/6 have white gutters at x ≈ 352 / 707 / 1062 / 1418
(5 columns); Figs 1 and 3 have black gutters, split evenly over the measured grid (Fig 1 bottom
strip y 745–1121, 4 columns; Fig 3 middle grid y 899–1790, 3 rows × 5 columns). Trim 4 px inside
each cell against gutter bleed. Each panel has a white label ("A2", "C1"…) in a corner that a
brightness threshold picks up; the red-dominance mask excludes it.

### Expected results

> **What this is.** *Expected* per-image results for the 16 panels, produced by looking at each one
> (not by running a pipeline, which would be circular): the reference the automated pipeline is
> judged against. One objective anchor per image, the **red-channel area fraction** (the paper's
> own area-% metric), measured with a red-dominance mask that excludes the panel labels.
>
> **What this is NOT.** Not pixel-level ground truth, and not absolute numbers. Counts and branching
> are **visual estimates given as bands**. The panels are downsampled figure crops, so use these for
> *relative* behaviour and rough magnitude. Revise freely: a starting point, not a locked spec.

#### Metrics predicted per image

| Metric | How to read it | Source |
|---|---|---|
| **area %** | fraction of the field that is vessel (density proxy) | **measured** (red-dominance mask) |
| **intensity band** | relative gP-CD31 labeling strength: dim / moderate / bright | **measured** (95th-pct red) |
| **est. vessel count** | # distinct curvilinear segments, as a band | visual estimate |
| **relative length / branching** | expected skeleton length & junction count vs the other regions | visual + density |
| **dominant caliber** | thin capillary mesh vs. presence of a thick penetrating artery | visual |
| **continuity** | continuous vessels vs. fragmented / punctate (drives detector error) | visual |
| **detector difficulty** | how hard a threshold→skeletonize pipeline will find it | visual + SNR |

#### Per-image expectations

Grouped by region. `area%` and `intensity` are measured; counts/branching/difficulty are visual.

##### Healthy / normal control

| File | area% | intensity (p95 R) | est. count | caliber | continuity | difficulty | notes |
|---|---|---|---|---|---|---|---|
| `VESSEL_fig1_C1_healthy` | 16.6 | moderate (106) | ~15–22 | medium, capillary-dominated, some thick | good | **low** | The "cleanest" field: thick, continuous, well-branched mesh, high SNR. A *high-density healthy* exemplar — not representative of the fig4–6 "normal" below. |
| `VESSEL_fig4_normal` (A2) | 6.9 | dim (102) | ~8–14 | thin | **poor / punctate** | **high** | Sparse, faint, fragmented. Detector will over-fragment / under-count. |
| `VESSEL_fig5_normal` (A2) | 6.4 | dim (97) | ~8–14 + 1 artery | **mixed** | poor (capillaries) | med | **Prominent vertical penetrating artery** down the centre + sparse thin capillaries. The artery dominates length but is *one* structure — must not be shattered into many segments. |
| `VESSEL_fig6_normal` (A2) | 5.5 | dim (97) | ~6–12 | thin, streaky | **poor** | **high** | Faint diagonal **streaks** (obliquely-cut artery / tissue fold?) + few faint capillaries. Most ambiguous / artifact-prone panel; lowest SNR of the normals. |

##### Ischemic core (expected strongest — gP-CD31 upregulated in ischemia)

| File | area% | intensity (p95 R) | est. count | caliber | continuity | difficulty | notes |
|---|---|---|---|---|---|---|---|
| `VESSEL_fig3_ischemic` (B2) | **21.9** | **bright (199)** | ~18–28 | thick | excellent | low | Densest & brightest of all 16 — the strong-ischemia exemplar. |
| `VESSEL_fig4_ischemic` (B2) | 16.8 | bright (168) | ~15–22 | medium–thick | good | low–med | **Bright focal blob** (strong labeling / vessel cross-section) can inflate area% and act as a false skeleton hub. |
| `VESSEL_fig5_ischemic` (B2) | 12.7 | bright (152) | ~15–22 | medium–thick | good | low–med | Thick bright arcs + a thick central vessel. |
| `VESSEL_fig6_ischemic` (B2) | 19.5 | bright (158) | ~16–24 | thick | good | low | Dense branching with a large central arch vessel. |

##### Penumbra (expected intermediate–high)

| File | area% | intensity (p95 R) | est. count | caliber | continuity | difficulty | notes |
|---|---|---|---|---|---|---|---|
| `VESSEL_fig3_penumbra` (C2) | 20.4 | high (135) | ~20–28 | medium–thin | good | low–med | Dense, highly branched. |
| `VESSEL_fig4_penumbra` (C2) | 12.8 | high (150) | ~18–26 | thin–medium | good | low–med | Well-connected thin mesh, high branching. |
| `VESSEL_fig5_penumbra` (C2) | 18.1 | high (150) | ~18–26 | thin–medium | good | low–med | Branching network with central vessels. |
| `VESSEL_fig6_penumbra` (C2) | 14.6 | high (139) | ~18–26 | medium | good | low–med | Dense well-connected mesh. |

##### Contralateral (mirror healthy side — expected low, like normal)

| File | area% | intensity (p95 R) | est. count | caliber | continuity | difficulty | notes |
|---|---|---|---|---|---|---|---|
| `VESSEL_fig3_contralateral` (D2) | 8.6 | dim (93) | ~16–24 | thin | moderate | med–high | Many fine thin dim threads; high count but low area. |
| `VESSEL_fig4_contralateral` (D2) | 7.4 | dim (81) | ~14–20 | thin | moderate | med–high | Fine distributed mesh, dim. |
| `VESSEL_fig5_contralateral` (D2) | 11.0 | dim–moderate (99) | ~14–20 | mixed | moderate | med | Thicker curvilinear vessels upper field, thinning lower. |
| `VESSEL_fig6_contralateral` (D2) | 5.4 | **dimmest (72)** | ~12–18 | thin | **poor** | **high** | Dimmest panel overall; thin fragmented vessels + faint vertical vessel. |

#### Expected cross-region ordering (the validation target)

The pipeline's per-region numbers should reproduce these *rankings*, grounded in the paper (Fig 3E–G:
gP-CD31 intensity **and** area% peak in the ischemic area, drop on the healthy sides):

- **Density / area% / total length:**  ischemic ≈ penumbra  **>**  contralateral ≥ normal.
  Measured region means: ischemic **17.7%**, penumbra **16.5%**, contralateral **8.1%**, normal **6.3%**.
- **Labeling intensity:**  ischemic (p95 152–199)  **>**  penumbra (135–150)  **>**  contralateral ≈
  normal (72–106). This is the cleanest, most reliable signal.
- **fig1 healthy is an outlier** high-density healthy field (16.6%) — treat it as its own exemplar, not
  as the "normal" baseline (the fig4–6 "normal" panels, a separate control animal, sit at ~6%).

A first automated pass should be judged on: (1) does the **region ranking** above come out right?
(2) is each image's pipeline area% within a few points of the measured anchor here? (3) do vessel
**counts** land inside the visual bands? Absolute length in µm is *not* yet validatable at this
resolution.

#### Gotchas for the detector (flagged from the images)

- **Penetrating arteries** (`fig5_normal`, faintly `fig6_normal`/`fig6_contralateral`): one large
  high-caliber structure — inflates length, should count as **one** vessel, and must not be skeletonized
  into a bushy artifact.
- **Bright focal blob** (`fig4_ischemic`): can inflate area% and create a spurious high-degree junction.
- **Dim / fragmented fields** (`fig4_normal`, `fig6_normal`, `fig6_contralateral`): low SNR → a global
  threshold will over-fragment; expect the largest count/length error here.
- **Streaky non-vessel signal** (`fig6_normal`): tissue folds / obliquely-cut walls can be mistaken for
  vessels — a good stress test for false positives.
- **Panel labels** ("A2"/"B2"/"C1"/"D2", white text in a corner) are excluded by the red-dominance mask
  used for area% here, but a naive brightness threshold **will** pick them up — mask them out.
