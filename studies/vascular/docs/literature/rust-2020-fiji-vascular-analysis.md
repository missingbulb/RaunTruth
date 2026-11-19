# Rust et al. 2020 — automated Fiji analysis of brain vasculature

- **Title:** *A Practical Guide to the Automated Analysis of Vascular Growth, Maturation and
  Injury in the Brain*
- **Authors:** **Ruslan Rust\***, Tunahan Kirabali, Lisa Grönnert, Berre Dogancay, Yanuar D. P.
  Limasale, Andrea Meinhardt, Carsten Werner, Bàrbara Laviña, Luka Kulic, Roger M. Nitsch,
  Christian Tackenberg, Martin E. Schwab. (\*corresponding, ruslan.rust@irem.uzh.ch)
  Institute for Regenerative Medicine, University of Zurich / ETH Zürich.
- **Venue / id:** *Frontiers in Neuroscience* (2020) **14:244**, article type **METHODS**.
  DOI **10.3389/fnins.2020.00244**. Open access (CC BY). 10 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `A Practical Guide to the Automated Analysis of Vascular Growth, Maturation and Injury in the Brain.pdf`, not in the repo.
- **Supplementary:** the ImageJ toolbox, the LUT and the authors' calibrated representative
  image are on the article's Supplementary Material tab ([doi.org/10.3389/fnins.2020.00244](https://doi.org/10.3389/fnins.2020.00244)); their content is transcribed in **§7**.

---

## 1. What it gives the study

- **The study's acceptance target.** The supplementary macro and a native, µm-calibrated vessel
  image let us run their exact method and ours on the same image (§7.4): we agree within 5–16%
  on area, length density and branch count, finding *less* than their threshold does. "Within
  ~15% of the reimplemented macro on `VESSEL_rust20suppl_representative.png`" is the standing
  segmentation test.
- **Why 311 branches/mm² is not a target.** Their own macro on their own image gives 1091/mm²,
  3.5× their published p120 value (§7.4), so published summary counts cannot judge our COUNT.
- **Metric definitions that match ours:** area fraction (= `area%`), skeleton length in mm/mm²
  (= MEASURE as density), branches per mm² from `Analyze Skeleton` (= our segments, COUNT), plus
  one we lack: **nearest-neighbour distance**, which they argue exposes local gaps a mean density
  hides and which does not depend on fragmentation (§2).
- **Published parameters in µm** to set ours against: median radius 1, objects < 20 µm² removed,
  no pruning, 15 × 15 heatmap grid (§7.1–7.2).
- **21 `VESSEL_` panels** (§6), including four labelling methods on the same tissue, a test of
  whether the detector keys on staining style.

**What it does not give:** any vessel-type split. The authors "did not intent to distinguish
between different types of blood vessels", so CATEGORIZE has no counterpart here. No pixel
sizes in the paper; every figure calibration is a measured bar (§4). The binarization threshold
is manual and per-image (§7.1).

## 2. The method

Printed only as Figure 1C (raw tiff → ROI → 8/16-bit → median filter → binarize → skeletonize →
batch; then area fraction, length, branching, nearest neighbour; then heatmaps). Definitions from
the Methods:

- **Area fraction** = share of non-zero pixels in the binary image.
- **Segment length and branching**: skeletonize, "tag all pixels in a skeleton image and then count
  all its branches and measure their average and maximum length". They report mean and max per
  branch; we report the total.
- **Nearest-neighbour distance** between "closest individual single non-zero pixels", µm.
- **Heatmap**: N × N grid, area fraction per square, colour-mapped; square size "should be adapted
  to the used magnification and sample".
- Two Fiji plugins: *Measure Skeleton Length*, *Nearest Neighbor Distances Calculation with ImageJ*.

Against ours: they denoise with a median (radius 1), we with Gaussian σ = 1.0 px; they threshold
by hand, we use red-dominance + Otsu with a floor OR'd with Frangi; they do no gap handling, we
close (disk 2) and fill holes; they do not prune, we prune spurs.

**Sample prep that bears on what a vessel image shows:** mouse, 40 µm coronal sections; vessels
shown by CD31 immunostaining, isolectin B4, perfused Lectin-DyLight594 or Cldn5-eGFP reporter.
**Perfusion labels only vessels carrying blood, so new vessels, tip cells and filopodia are
missed.** Human tissue is **5 µm paraffin**, which cuts vessels into cross-sections (§6). Leica SP8,
10×/20×/40×. Statistics are mean ± **SD**.

## 3. Reference magnitudes — sanity checks, not targets

From raw confocal data, mean ± SD, as the first intake recorded them against Figs 1D, 2C and 3C;
it did not record whether each value was printed or read off a plot.

**Mouse cortex development (Fig 1D):**

| Age | Area fraction | Length (mm/mm²) | Branches (per mm²) | Nearest distance (µm) |
|---|---|---|---|---|
| p3 | 0.027 ± 0.003 | 17.12 ± 6.45 | 232.09 ± 92.16 | 50.49 ± 9.50 |
| p10 | — | — | 423.43 ± 62.37 *(peak)* | — |
| p120 | 0.106 ± 0.004 | 25.47 ± 0.95 | 310.74 ± 16.29 | 23.72 ± 0.23 |

p3 vs p120: area p<0.001, length p=0.028, branches p=0.449 (n.s.), distance p<0.001. Branch
count peaks at p10 and then declines (anastomoses pruned), so a higher count is not a more mature
or healthier network.

**Mouse peri-infarct, 3 weeks after photothrombosis (Fig 2C):**

| Metric | Intact | Ischemic border zone | Change |
|---|---|---|---|
| Area fraction | 0.100 ± 0.017 | 0.060 ± 0.014 | −39%, p<0.001 |
| Length (mm/mm²) | 57.74 ± 4.83 | 31.89 ± 5.83 | −44%, p<0.001 |
| Branches (per mm²) | 396.31 ± 18.81 | 126.57 ± 58.30 | −68%, p<0.001 |
| Nearest distance (µm) | 30.34 ± 1.76 | 36.85 ± 3.96 | +21.4%, p<0.001 |

The border zone is a band 300 µm distal to the core. **The direction is opposite to Wang 2022**
(more gP-CD31 signal 24 h after MCAO): species, model and above all time point differ. Never
generalise "ischemia ⇒ more vessels" from the Wang panels.

**Human medial frontal cortex (Fig 3C):** area fraction GM 0.029 ± 0.001 (control) vs
0.026 ± 0.003 (AD), n.s.; WM 0.016 ± 0.004 vs 0.015 ± 0.003, n.s.; GM 0.028 ± 0.003 > WM
0.015 ± 0.003 (p<0.001). Five AD (all female, Braak 5–6, four of five APOE-E4) vs five controls
(skewing male): too small and confounded to read a phenotype.

## 4. Calibration of the figure panels

The paper gives no pixel sizes; each row is calibrated off its printed bar, measured on the
figure. These are the values in `measure_vessels.py`'s `SCALEBAR_PX` / `SCALEBAR_UM` /
`UNCALIBRATED`:

| Panel row | Bar as captioned | Bar measured | µm/px |
|---|---|---|---|
| Fig 1B development, overview | 50 µm | 73 px | 0.685 |
| Fig 1B development, close-up | 50 µm | 71 px | 0.704 |
| Fig 1B adult, overview | 50 µm | 37 px | 1.351 |
| Fig 1B adult, close-up | 50 µm | 51 px | 0.980 |
| Fig 2B overview | 100 µm | **no bar drawn** | **uncalibrated** |
| Fig 2B close-up | 20 µm | 75 px | 0.267 |
| Fig 3B overview | 100 µm | 84 px | 1.190 |
| Fig 3B close-up | 20 µm | 83 px | 0.241 |

- The bar is drawn **once per row**, in the right-hand column, and applied to the whole row on the
  assumption a row is one acquisition scale. Fig 1's adult row supports it (ROI box ≈ 298 px ×
  1.351 = 403 µm vs a 356 µm close-up field, ~13% apart); the development row only loosely
  (~25%). **Fig 1's close-up rows are the weakest calibration in the set**: the development
  close-up bar (71 px) implies almost no magnification over its overview (73 px), which the
  visible zoom contradicts.
- **Fig 3 is the strongest**: the ROI square measures ~101 px → 120 µm against a 105 µm close-up
  field, ~14% apart.
- **Fig 2's overview row draws no bar**, so it is declared in `UNCALIBRATED`, not given a borrowed
  scale.

## 5. Arguments and limitations that bear on the study

- **Sensitivity depends on the staining, not the script**: "The sensitivity and reliability of the
  script strongly depends on the quality of vascular visualization and imaging"; all automated
  steps "should be manually controlled", the same discipline as our overlay review.
- **Marker choice moves the number**: their pericyte coverage (40–60%) sits below the literature's
  ~80%, which they put down to antibodies and epitopes alone.
- **Distance and its variability** are argued as the metric for local hypoxic regions, the reason
  to add nearest-neighbour distance.

## 6. The `VESSEL_` panels (21)

Isolated vessel channel, red on black. Cut from the three published figures (24 crops, of which 20
are vessel-only), plus the supplementary image. Crop method: the grid located from the figures'
dark image bands on the white page, frozen as literal coordinates, 3 px inner trim. Crops are
figure-resolution (~360–440 px each).

| Panel | Cut from | µm/px |
|---|---|---|
| `VESSEL_rust20fig1_dev_overview_<marker>.png` (×4) | Fig 1B, p10 row | 0.685 |
| `VESSEL_rust20fig1_dev_closeup_<marker>.png` (×4) | Fig 1B, p10 close-up strip | 0.704 |
| `VESSEL_rust20fig1_adult_overview_<marker>.png` (×4) | Fig 1B, 3-month row | 1.351 |
| `VESSEL_rust20fig1_adult_closeup_<marker>.png` (×4) | Fig 1B, 3-month close-up strip | 0.980 |
| `VESSEL_rust20fig2_overview_intact_vasculature.png` | Fig 2B top, intact | uncalibrated |
| `VESSEL_rust20fig2_overview_core-ibz_vasculature.png` | Fig 2B top, core + border zone | uncalibrated |
| `VESSEL_rust20fig3_overview_Ctrl_vasculature.png` | Fig 3B top, human control | 1.190 |
| `VESSEL_rust20fig3_overview_AD_vasculature.png` | Fig 3B top, human AD | 1.190 |
| `VESSEL_rust20suppl_representative.png` | supplementary `Representative_Image.tif`, native 1024 × 1024 | 0.6058 (metadata, §7.3) |

`<marker>` is one of `CD31`, `IsolectinB4`, `Perfusion-LectinDylight594`, `Cldn5-eGFP`. The
`rust20fig2_closeup_*` and `rust20fig3_closeup_*` crops are vessels + pericytes (cyan) and carry no
`VESSEL_` prefix.

What trips the algorithm on these:

- **Every Fig 1B adult panel includes the cortical surface**, a bright thick pial vessel band along
  the top edge: real anatomy, but it inflates area %, mean width and the artery count there.
- **The human panels are cross-sections, not networks** (5 µm paraffin): mostly small ellipses and
  short fragments, so branch and junction counts there compare with nothing; only area % means
  anything.
- White dashed ROI boxes, white dashed core/border lines (Fig 2B) and marker labels are figure
  annotations; the red-dominance mask excludes them.
- Mouse and human, five markers, 0.24–1.35 µm/px: never averaged with Wang's panels
  (`measure_vessels.py` rolls up per paper). No visual expected results exist for these panels
  yet, so the pipeline's numbers on them are exploratory.

## 7. Supplementary material

Data Sheet 1 (the toolbox) and Table 1 (human demographics), supplied by the owner.

### 7.1 The Fiji macro — `Quantification.ijm`

Reproduced in full, because it *is* the method:

```javascript
//PRE-PROCESSING
run("Duplicate...", "duplicate");     // keep the raw image
run("8-bit");                          // alternatively 16-bit
//run("Z Project...", "projection=[Max Intensity]");   // if needed
run("Median...", "radius=1");          // remove noise, radius can be adjusted

//BINARIZED IMAGE
//setAutoThreshold("Default dark");
setThreshold(66, 255);
run("Convert to Mask");
run("Analyze Particles...", "size=20-Infinity show=Masks");   // remove small artefacts

//1 Area fraction      -> Set Measurements(area_fraction) + Measure
//2 Vascular length    -> Duplicate, Skeletonize, "Measure Skeleton Length Tool"
//3 Vascular branches  -> Duplicate, Skeletonize, "Analyze Skeleton (2D/3D)", prune=none
//4 Nearest neighbour  -> Analyze Particles(size=20-Infinity, display), then "Nnd"
```

| Parameter | Value |
|---|---|
| Bit depth | 8-bit (16-bit acceptable) |
| Denoise | median, radius 1 |
| Binarization | **manual `setThreshold(66, 255)`**; the auto-threshold line is commented out, marked `// this should be adapted to your image!!` |
| Small objects | Analyze Particles, size 20–Infinity; the image is µm-calibrated, so **20 µm²** |
| Skeleton analysis | Analyze Skeleton (2D/3D), **`prune=none`** |

The published pipeline is **not automated at its decisive step**: the threshold is hand-set per
image. Our adaptive segmentation removes that parameter rather than deviating from the method.

### 7.2 The heatmap macro — `Heatmap.ijm`

Same pre-processing, then tile the binary into **15 × 15** rectangles (`numRow = 15`, "can be
adapted to image size"), `Measure` the mean of each, invert it (`255 - mean`), `Fill` the rectangle
with that grey value, and apply a LUT. The authors' LUT, `hm_stroke.lut`, is kept in
vascularColoring. This is the recipe behind [`METHODS-SYNTHESIS.md`](METHODS-SYNTHESIS.md) §4.4.

### 7.3 `Representative_Image.tif`

A **1024 × 1024 ImageJ TIFF**, red vessel channel on black, `unit=µm`, `XResolution = 1.650568`
px per µm → **0.6058 µm/px**, a **620 × 620 µm** field. Native acquisition data carrying its own
calibration, the image the macro was written against, and the only panel in the set that is not
a downsampled figure crop. Cross-check: capillaries measure 8–12 px across = **5–7 µm**, against
Stefanitsch's mean CD31⁺ diameter of 6.03 µm. Recorded in `UMPP_DIRECT`, apart from
`SCALEBAR_PX`, because its provenance is metadata, not a measured bar.

### 7.4 Both pipelines on it

The authors' recipe (§7.1) reimplemented step for step, and our pipeline, on the same image:

| Metric | **Their recipe, their image** | **Our pipeline, same image** | Agreement | Their *published* adult-cortex value |
|---|---|---|---|---|
| Area fraction | **9.6%** | 8.1% | **−16%** | 10.6% |
| Length density | **15.3 mm/mm²** | 14.5 mm/mm² | **−5%** | 25.5 mm/mm² |
| Branch count | **1091 /mm²** (420 branches) | 920 /mm² (354 segments) | **−16%** | **311 /mm²** |
| Junctions | 447 /mm² | — | — | — |

1. **Our implementation reproduces the published method** within 5–16% on all three shared
   metrics. The residual is *under*-detection (less area than their threshold finds): the
   faint-vessel failure, real but modest.
2. **The earlier "our counts are 5–8× too high" was wrong.** Their recipe on their image gives
   1091 branches/mm², 3.5× their published 311/mm²: the representative image may be denser than
   their p120 average, or the published "number of branches" may count something narrower than raw
   `Analyze Skeleton` branches. Either way the gap is not our fragmentation, and no target derived
   from 311/mm² judges our segmentation.

On the same image our 9 px caliber cut means 5.45 µm and calls 101 of 354 segments (29%) artery
(see [`METHODS-SYNTHESIS.md`](METHODS-SYNTHESIS.md) §4.2).

### 7.5 Not obtained

Supplementary Figures S1 (tip cells, filopodia), S3 (retina) and S4 (HUVEC in vitro): not core
method, and S3/S4 are not brain tissue.

Left out: the open-source rationale, retina and in-vitro results, pericyte methods and numbers
beyond the marker caveat, the stroke protocol details, Supplementary Table 1 row by row, and the
figure-by-figure description; none bears on segmentation, the metrics or ground truth.
