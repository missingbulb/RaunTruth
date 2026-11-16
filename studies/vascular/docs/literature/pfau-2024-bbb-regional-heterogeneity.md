# Pfau, Langen et al. 2024 — blood–brain barrier heterogeneity between brain regions

- **Title:** *Characteristics of blood–brain barrier heterogeneity between brain regions revealed by
  profiling vascular and perivascular cells*
- **Authors:** Sarah J. Pfau (equal), Urs H. Langen (equal), Theodore M. Fisher, Indumathi Prakash,
  Faheem Nagpurwala, Ricardo A. Lozoya, Wei-Chung Allen Lee, Zhuhao Wu, **Chenghua Gu\***
  (\*corresponding). Harvard Medical School / HHMI; Boston Children's Hospital; Weill Cornell.
- **Venue / id:** *Nature Neuroscience* **27**:1892–1903, October 2024. DOI
  **10.1038/s41593-024-01743-y**. Received 30 Oct 2023, accepted 30 Jul 2024, online 29 Aug 2024.
  41 pages: article, Methods, 10 Extended Data figures and the Nature Portfolio Reporting Summary.
- **Licence:** **CC BY 4.0** ("Open Access This article is licensed under a Creative Commons
  Attribution 4.0 International License", page 12). © the authors.
- **PDF:** kept in the study's Drive `Literature` folder as `Characteristics of blood–brain barrier heterogeneity between brain regions revealed by profiling vascular and perivascular cells.pdf`, not in the repo.

---

## 1. What it gives the study

A transcriptomics paper (median eminence, ME, vs somatosensory cortex) whose one morphometry
figure, Fig 1c–d, is directly useful:

- **A definition-matched caliber anchor for CATEGORIZE: CD31 capillary diameter in mouse
  somatosensory cortex 3.95 ± 0.49 µm** (mean ± s.d., 15 images, 5 mice), measured as
  **CD31-covered area ÷ vessel length**, a mean projected width our pipeline can compute itself.
  A cut near 5.5–5.9 µm (our `ARTERY_DIAM_PX = 9` on the Rust and Wang panels) sits above every
  per-image cortex mean (maximum 4.75 µm) but below anything clearly arterial.
- **A region contrast a caliber metric must see:** ME capillaries measure **9.61 ± 1.82 µm** with
  the same staining, 2.4× cortex. The Fig 1c pair (§5) is the ready test.
- **Arteries identified by αSMA**, never by caliber (Extended Data Fig 5a–b), as in Stefanitsch and
  Wang: any caliber cut is a convention.
- **EC nuclei along cortex capillaries, 1.93 ± 0.28 per 100 µm** (one per ~52 µm), and a cortex
  capillary lumen formed by one EC. A plausibility scale if an ERG channel is ever available.
- **17 CD31 single-channel panels** at measured scale (10 calibrated), §5: sparse, clean cortex
  capillary networks, and ME panels in the opposite regime as a hard transfer case.

**What it does not give:** branch counts, segment lengths, total or density length, tortuosity;
caliber *distributions* (only per-image means of three capillaries); arteriole or venule
diameters; any region but somatosensory cortex and ME (no hippocampus or frontal cortex, the
owner's stacks' regions); ageing or disease.

## 2. The morphometry method, and what it leaves unstated

- Mouse C57BL/6N and reporter lines, 8–14 weeks. Goat polyclonal anti-CD31, **R&D AF3628** (the
  same antibody as Wang's gP-CD31), 1:50. Leica TCS SP8 confocal; U.Clear-cleared 5 mm cubes
  rendered in Imaris 9.3.1; sections in Fiji 2.1.0.
- From **three ~50 µm-thick 40× confocal stacks of capillaries per region per mouse**, n = 5,
  analysed blind:
  - **Capillary diameter:** "the area covered by three different capillaries in each image,
    labeled by CD31 immunostaining, was measured and divided by their respective vessel length";
    the mean of the three is one point (the Methods says "average capillary length" here, an
    evident slip for diameter). A mean width: it hides tapering and local swellings, and three
    capillaries per image is a small sample.
  - **EC density:** ERG⁺ nuclei ÷ total capillary length.
  - Mean ± s.d., nested two-tailed t-test; normality assumed, not tested.
- **Unstated, where the study would need it:** objective NA; pixel size, zoom and z-step of any
  stack; whether the shown panels are maximum projections, slices or Imaris renders; which
  software measured area and length and how the capillary boundary was thresholded; how a vessel
  was chosen as a "capillary" (no diameter cut-off or marker rule); the cortical layer or depth;
  any expansion or shrinkage from clearing; whether cortex and ME panels in one row share
  magnification.

## 3. The numbers

Fig 1c, 1d and 5f state no numbers in the text. **These are computed from the plotted points'
vector coordinates in the PDF** (exact positions, not by eye): 15 points per group, three per
mouse; the drawn mean and s.d. bars agree with the points to the third decimal.

| Quantity | Cortex | ME | n / stats |
|---|---|---|---|
| Capillary diameter (CD31 area ÷ length) | **3.95 ± 0.49 µm** (range 3.28–4.75; per-mouse 3.57–4.27) | **9.61 ± 1.82 µm** (7.14–12.56; per-mouse 8.40–11.18) | 5 mice × 3 images; P = 3.604601 × 10⁻⁶, nested t-test |
| EC nuclei (ERG⁺) per 100 µm capillary | **1.93 ± 0.28** (1.43–2.28) | **5.60 ± 0.91** (4.07–7.32) | 5 × 3; P = 4.569415 × 10⁻⁶ |
| Pericytes per EC | **0.29 ± 0.03** (0.24–0.34) | **0.16 ± 0.02** (0.13–0.20) | 5 × 3; P = 4.793057 × 10⁻⁶ |
| ECs forming one capillary lumen | one | more than one | sparse labelling, Fig 1e (qualitative) |

## 4. What the images show that would trip the algorithm

- **ME capillaries look nothing like cortex ones** in CD31: wide, closely packed, often outlined
  by membrane staining around a darker lumen. A threshold splits them into two walls, and a
  detector tuned on cortex over-merges them (a quick Otsu check put 77–80% of the ME panels in
  foreground).
- **At 0.32–0.33 µm/px (Fig 3c, Extended Data 1a) CD31 outlines both walls even of a cortex
  capillary**: a plain threshold returns two thin walls and a halved width, the hollow-vessel
  failure at high zoom.
- **Fig 1a and Extended Data 5a are projections of thick cleared volumes**: vessels at different
  depths overlap and cross, making false junctions. Whether the close-ups are projections is not
  stated.

## 5. The panels

17 CD31 single-channel crops, CD31 white on black, all `VESSEL_`. To rebuild them: render the main
figures from the PDF at 300 dpi, clipped to the figure without captions (scale bars are vector art
over the micrographs, so they appear in the render but not in the embedded images); take the
Extended Data figures as the PDF's own 300 dpi page rasters; cut each box below with a 3 px inner
trim.

**Calibration:** each bar measured in pixels on the 300 dpi render (longest bright run at
threshold 128) and cross-checked against the bar's vector length in the PDF (points × 300/72); the
two agree within 1 px. Each bar is drawn on the **cortex row only**, and cortex and ME are separate
acquisitions, so the ME rows are uncalibrated, except Fig 1c, where cortex and ME sit side by side
in one row under one bar (taken as one scale per row, the Rust 2020 precedent). These panels are not
yet in `measure_vessels.py`'s tables.

| Panel | Cut from | Bar on panel | µm/px | Field |
|---|---|---|---|---|
| `VESSEL_pfau24fig1a_cortex_CD31` | Fig 1a, U.Clear volume | 100 µm = 23 px | 4.35 | ~1,180 µm |
| `VESSEL_pfau24fig1a_ME_CD31` | Fig 1a | none | uncalibrated | — |
| `VESSEL_pfau24fig1b_cortex_CD31` | Fig 1b | 10 µm = 20 px | 0.50 | ~135 µm |
| `VESSEL_pfau24fig1b_ME_CD31` | Fig 1b | none | uncalibrated | — |
| `VESSEL_pfau24fig1c_cortex_CD31` ⭐ | Fig 1c, the diameter images | 20 µm = 31 px | 0.645 | ~178 µm |
| `VESSEL_pfau24fig1c_ME_CD31` ⭐ | Fig 1c, same row | the row's bar | 0.645 | ~178 µm |
| `VESSEL_pfau24fig3c_cortex_CD31` | Fig 3c | 10 µm = 31 px | 0.323 | ~77 µm |
| `VESSEL_pfau24fig3c_ME_CD31` | Fig 3c | none | uncalibrated | — |
| `VESSEL_pfau24ed1a_cortex_CD31` | Ext. Data 1a | 10 µm = 30 px | 0.333 | ~110 µm |
| `VESSEL_pfau24ed1a_ME_CD31` | Ext. Data 1a | none | uncalibrated | — |
| `VESSEL_pfau24ed1d_cortex_CD31` | Ext. Data 1d | 10 µm = 19 px | 0.526 | ~174 µm |
| `VESSEL_pfau24ed1d_ME_CD31` | Ext. Data 1d | none | uncalibrated | — |
| `VESSEL_pfau24ed2d_cortex_CD31` | Ext. Data 2d | 20 µm = 50 px | 0.40 | ~133 µm |
| `VESSEL_pfau24ed5a_cortex_CD31` | Ext. Data 5a, overview | 100 µm = 52 px | 1.92 | ~627 µm |
| `VESSEL_pfau24ed5a_ME_CD31` | Ext. Data 5a | none | uncalibrated | — |
| `VESSEL_pfau24ed5b_cortex_CD31` | Ext. Data 5b, artery close-up | 20 µm = 46 px | 0.435 | ~142 µm |
| `VESSEL_pfau24ed5b_ME_CD31` | Ext. Data 5b | none | uncalibrated | — |

**Crop boxes**, as (figure render, (x0, x1, y0, y1) in px, panel name):

```
PANELS = [
    ('fig1_me_vs_cortex_vessel_morphology.png', (235, 512, 43, 319), 'VESSEL_pfau24fig1a_cortex_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (235, 512, 324, 601), 'VESSEL_pfau24fig1a_ME_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (1192, 1467, 45, 320), 'VESSEL_pfau24fig1b_cortex_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (1192, 1467, 325, 601), 'VESSEL_pfau24fig1b_ME_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (235, 517, 684, 965), 'VESSEL_pfau24fig1c_cortex_CD31'),
    ('fig1_me_vs_cortex_vessel_morphology.png', (529, 810, 684, 965), 'VESSEL_pfau24fig1c_ME_CD31'),
    ('fig3_me_specific_capillary_ecs.png', (289, 533, 633, 877), 'VESSEL_pfau24fig3c_cortex_CD31'),
    ('fig3_me_specific_capillary_ecs.png', (289, 533, 880, 1124), 'VESSEL_pfau24fig3c_ME_CD31'),
    ('edfig1_vascular_differences.png', (50, 387, 69, 406), 'VESSEL_pfau24ed1a_cortex_CD31'),
    ('edfig1_vascular_differences.png', (50, 387, 409, 745), 'VESSEL_pfau24ed1a_ME_CD31'),
    ('edfig1_vascular_differences.png', (1144, 1480, 821, 1158), 'VESSEL_pfau24ed1d_cortex_CD31'),
    ('edfig1_vascular_differences.png', (1144, 1480, 1165, 1501), 'VESSEL_pfau24ed1d_ME_CD31'),
    ('edfig2_tem_and_aqp4.png', (97, 435, 2007, 2346), 'VESSEL_pfau24ed2d_cortex_CD31'),
    ('edfig5_arteries_and_validation.png', (53, 385, 57, 390), 'VESSEL_pfau24ed5a_cortex_CD31'),
    ('edfig5_arteries_and_validation.png', (53, 385, 400, 732), 'VESSEL_pfau24ed5a_ME_CD31'),
    ('edfig5_arteries_and_validation.png', (1159, 1492, 46, 378), 'VESSEL_pfau24ed5b_cortex_CD31'),
    ('edfig5_arteries_and_validation.png', (1159, 1492, 388, 720), 'VESSEL_pfau24ed5b_ME_CD31'),
]
```

**How far to trust the scale:**

- **Biology cross-check** (rough Otsu mask, median 2 × distance-to-edge on the skeleton, for scale
  only, not a result): Fig 1c cortex 3.9–4.7 µm against the authors' 3.95 µm for this kind of
  image; Fig 1b 4.0, Extended Data 1d 3.8, 2d 4.3, 5b 4.4 µm. Fig 3c cortex and Extended Data 1a gave
  1.4–3.6 µm, from the hollow-wall split above; their bars agree with the PDF vectors.
- **The authors' own drawing is inconsistent by 2.6%**: Fig 1c and 1d both draw a "20 µm" bar in
  the same raster, at 7.42 pt and 7.61 pt. Bars are 19–52 px, so ±1 px is a further 2–5%.
- **Fig 1a (4.35 µm/px) and Extended Data 5a (1.92 µm/px) cannot resolve capillary width**
  (capillaries are 1–2 px): area fraction and coarse network only, never caliber.
- **The Fig 1c pair is an aggregate check**: the authors' 3.95 and 9.61 µm come from 15 images
  each, not from these two crops, so our caliber on them should land near those values and keep
  the ~2.4× ratio; it is not per-vessel ground truth.
- **Burned-in labels**: each calibrated panel carries its white bar and "N µm" label in the
  bottom-left corner; mask it before segmenting.
- Figure crops with display contrast, not raw acquisitions; no raw confocal stacks are deposited.

Left out: the single-cell and spatial transcriptomics, cell-type counts, astrocyte, pericyte,
fibroblast and TEM findings, ligand–receptor analysis, the clearing protocol in detail, and the
figure-by-figure description; none bears on the extraction, the metrics or ground truth.
Supplementary videos (3D U.Clear stacks) were not fetched.
