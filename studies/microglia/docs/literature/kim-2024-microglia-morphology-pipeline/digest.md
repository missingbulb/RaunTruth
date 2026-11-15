# Reference digest — Kim, Pavlidis & Vogel Ciernia 2024, MicrogliaMorphology pipeline

> Self-contained digest of the source paper. The method, every parameter the paper (and its
> public macro) states, the 27 measure names, the reported numbers and every figure are captured
> here and in [`figures/`](figures/README.md). **No need to reopen the PDF.**

- **Title:** *Development of a High-Throughput Pipeline to Characterize Microglia Morphological
  States at a Single-Cell Resolution*
- **Authors:** Jennifer Kim, Paul Pavlidis, Annie Vogel Ciernia\* (\*corresponding,
  annie.ciernia@ubc.ca). Djavad Mowafaghian Centre for Brain Health / Graduate Program in
  Neuroscience, University of British Columbia, Vancouver.
- **Venue / id:** *eNeuro* **11(7)**, July 2024, article type *Research Article: Methods/New
  Tools — Novel Tools and Methods*. DOI **10.1523/ENEURO.0014-24.2024**. Received 10 Jan 2024,
  accepted 7 May 2024. 16 pages. (PMID 39029952, PMCID PMC11289588 — from the repo README, not
  the PDF.)
- **Licence (as printed in the PDF, p. 2):** "Copyright © 2024 Kim et al. This is an open-access
  article distributed under the terms of the **Creative Commons Attribution 4.0 International**
  license, which permits unrestricted use, distribution and reproduction in any medium provided
  that the original work is properly attributed." → PDF and figures are redistributed here with
  this attribution.
- **PDF:** [`kim-2024-microglia-morphology-pipeline.pdf`](kim-2024-microglia-morphology-pipeline.pdf)
- **Code:** <https://github.com/ciernialab/MicrogliaMorphology> (ImageJ macro),
  <https://github.com/ciernialab/MicrogliaMorphologyR> (R package). Data, input images,
  thresholded images and all single-cell images: OSF <https://osf.io/8t5c2/>. Video tutorial:
  <https://www.youtube.com/watch?v=YhLCdlFLzk8>.
- **One-line thesis:** a free Fiji macro (threshold → split into single cells by area → skeleton
  analysis) plus FracLac and an R package (PCA → (fuzzy) k-means) measure **27 morphology
  features per cell** on 2D extended-depth-of-focus images of hundreds to tens of thousands of
  microglia, and sort them into **ramified / hypertrophic / ameboid / rod-like** clusters whose
  population shares shift with LPS.

---

## 1. Why this matters to our task ⭐

Our owner images **mouse hippocampus** slices, **Iba1** (488 nm) + CD68 (555 nm), **20×
objective, slide scanner, 3D**, and wants every microglia found and measured (processes,
branching, volume, soma, territory). This paper is the **closest published analogue**: same
species, same marker (Iba1 is one of its three), same region (hippocampus is one of its three),
**same acquisition regime** (a **slide scanner at 20×** taking z-stacks, ZEISS Axioscan 7 here
vs Olympus for us), and the same goal (every cell in a field, per-cell geometry).

| What we get | Consequence for what we build |
|---|---|
| **A complete, open, classical (non-ML) per-cell pipeline** at our magnification: 8-bit → enhance contrast → unsharp mask (r 3, 0.60) → despeckle → auto/auto-local threshold (radius 100 default) → despeckle → close → remove bright outliers (r 2, thr 50) → connected components filtered by an **area window** → skeletonize → AnalyzeSkeleton. (§2) | A ready **baseline to beat**. Each step is a few lines of scikit-image; the parameters are in §2.2. |
| **Its cell "detection" is not detection.** A cell = one connected component of the thresholded mask whose pixel area falls inside a user-chosen [min, max]. Touching cells are **discarded** (too big), fragments are **discarded** (too small). No seeds, no soma detection, no splitting. | It cannot "find every microglia cell". Fig 3E shows many cells in the ROI left uncoloured. **Finding every cell — especially splitting touching neighbours — is our own contribution**, and their output is a *biased sample* (isolated cells only). |
| **2D only, by design** (FracLac takes 2D). They compared **3D vs EDF (max-projection) vs single-plane 2D** on 20 hippocampal cells (§4.1): EDF keeps branching counts (r 0.91–0.97 vs 3D) but absolute counts drop ~3× and **junction voxels** and **quadruple points** are poorly preserved. | Evidence that a **2D max-projection baseline is defensible for counts and ranking**, but that **absolute** branch/endpoint numbers, volume and junction morphology need 3D. Our "volume" ask has no counterpart here. |
| **The 27 measures, named** (§3) — 9 AnalyzeSkeleton + 18 FracLac — and the finding that they collapse into ~4 correlated groups: **branching complexity, territory span/area, branch length, shape/circularity**; 3 PCs explain **84.6%**. | A defensible, literature-standard metric set to report; and the insight that a handful of well-chosen measures (one per group) carries most of the information. |
| **The four-state vocabulary with operational descriptions** (ameboid, hypertrophic, rod-like, ramified; §6) and how each looks in an Iba1 20× EDF image (figures). | The CATEGORIZE vocabulary if the owner wants states; rod-like cells are aligned/elongated and their processes overlap neighbours — a segmentation hazard. |

**What it does *not* give us:** soma size or soma segmentation as a separate object (all area
measures are whole-cell mask area); volume; process *count* as such (only skeleton end points,
branches, junctions); any accuracy/validation of the segmentation against hand annotation (none
reported — validation is only that clusters "look right" via ColorByCluster and replicate in a
second dataset); the threshold method or area window actually used in the paper's own datasets;
pixel size.

---

## 2. The pipeline, step by step ⭐

### 2.1 As the paper describes it (Materials and Methods, Fig 1A)

**Image preparation (before the macro).** Slide-scanner z-stack → ZEN builds an **Extended Depth
of Focus (EDF)** image using **maximum projection** (the paper: "only compile the pixels of
highest intensity at any given position in a z-stack ... which retains the 3D information") →
saved in the .czi. In ImageJ, one **.tiff per fluorescent channel** is made, regions of interest
cropped/saved; coronal sections aligned to the **Allen Brain Atlas** with the ImageJ macro
**FASTMAP** (Terstege 2022) to define region/subregion ROIs (the repo now recommends their newer
**ROIMAPer** plugin). File names carry metadata (`Cohort_AnimalID_Condition_Sex_Region.tiff`) for
the R side.

**Step 1 — dataset-specific parameters (user input).**
- Threshold **method** and, for auto-local, the **radius**, chosen with **BioVoxxel Toolbox →
  ThresholdCheck**, which shows a gallery of the **16 global auto-threshold** and **9 auto-local**
  ImageJ methods. Criterion (paper): capture "full, single microglial cells without losing
  branching connectivity"; (README): "capturing as many branches as possible that are connected to
  cell bodies, while minimizing overlap between cells".
- **Single-cell area range [min, max]**, to "exclude any artifacts of 2D representation in the
  EDFs such as cell particles and incomplete cells or multiple cells that are overlapping".

**Step 2 — threshold** (adapted from Young & Morrison 2018, JoVE): 8-bit/grayscale → enhance
brightness/contrast → **unsharp mask** → **despeckle** → **auto-local or auto threshold** →
second **despeckle** → **dilation and connection** ("Close-") "to connect branches" → **remove
outliers**. Also writes `Areas.csv` (area of each image/ROI) for density = cells / area.

**Step 3 — single cells:** **AnalyzeParticles** + ROI Manager; each particle whose area is within
the Step-1 window is saved as its own image with a unique identifier (and its ROI, so it can be
mapped back).

**Step 4 — skeleton:** **Skeletonize (2D/3D)** (Lee et al. 1994 thinning) → **AnalyzeSkeleton**
(Arganda-Carreras 2010) → per-cell .csv of the 9 skeleton measures.

**Step 5 — FracLac** (Karperien 1999/2013), run by hand (not callable from the ImageJ macro
language), box-counting (BC) mode in batch over the single-cell images, options "adapted from
Young & Morrison 2018, Section 5.5", **"lock black background"** → the 18 hull/circle/shape
measures. Cell IDs survive, so an R function merges Step 4 + Step 5 into one master .csv of **27
features per cell**.

**ColorByCluster** (macro + R helper): paints each cell in the original .tiff by its cluster —
the paper's only visual validation route (Fig 3E).

**MicrogliaMorphologyR** (R; wraps tidyverse, Hmisc, pheatmap, factoextra, lmerTest, lme4,
Matrix, SciViews, ggpubr, glmmTMB, DHARMa, rstatix, gridExtra): feature QC ("values that dominate
and disproportionately skew feature distributions"), normalization options, Spearman feature
correlation, **PCA**, **k-means / fuzzy k-means** on the first PCs, cluster characterisation
heatmaps, cluster-percentage per animal, and mixed models (below).

### 2.2 Parameters actually in the macro source (read from GitHub, not stated in the paper)

Read on 2026-11-15 from `macros-scripts/MicrogliaMorphology_Steps/MM_Step{1..4}_*.ijm` at
`ciernialab/MicrogliaMorphology` HEAD `6efb58d1ec8c3f65b2935a767f404234061f29a4`. The step files
say "Updated July 29, 2024" — i.e. **after** the paper's acceptance; the paper's datasets may have
been run on an earlier revision.

| Step | ImageJ call (verbatim parameters) | Note |
|---|---|---|
| measure | `Set Measurements... area`, `Measure` | image/ROI area → `Areas.csv` |
| 8-bit | `run("8-bit")`, `run("Grays")` | |
| contrast | `Enhance Contrast saturated=0.35` | no `normalize` → LUT only; macro comment: "pixel values are unchanged" |
| sharpen | `Unsharp Mask... radius=3 mask=0.60` | |
| denoise | `Despeckle` | 3×3 median |
| threshold (global) | `Auto Threshold method=<user> ignore_black white` | one of Huang, Huang2, Intermodes, IsoData, Li, MaxEntropy, Mean, MinError(I), Minimum, Moments, Otsu, Percentile, RenyiEntropy, Shanbhag, Triangle, Yen |
| threshold (local) | `Auto Local Threshold method=<user> radius=<user, default 100> parameter_1=0 parameter_2=0 white` | one of Bernsen, Contrast, Mean, Median, MidGrey, Niblack, Otsu, Phansalkar, Sauvola. README: "A radius of 100 will typically work well". Radius is in **pixels**. |
| ROI | `Clear Outside` if the image carries a traced ROI | |
| denoise | `Despeckle` | |
| bridge gaps | `Close-` | macro comment: "connects two dark pixels if they are separated by up to 2 pixels" |
| outliers | `Remove Outliers... radius=2 threshold=50 which=Bright` | |
| particles | `Analyze Particles... pixel add` | **areas in pixels** (not µm²); keep if `min < area < max` (strict) |
| skeleton | `Skeletonize (2D/3D)`, `Analyze Skeleton (2D/3D) prune=none` | **no pruning**; `Summarize` per cell |

**How the area window is set (Step 1 macro):** the user clicks **5 particles "TOO SMALL to be a
single microglia cell"** and **5 "TOO BIG"** (README: "2 obviously overlapping cells"), then
`Summarize`. As I read the code, `area_min = getResult("Area")` takes the **last** Summarize row
(Max) of the too-small set, and `area_max = getResult("Area", nResults-2)` takes the **Min** row of
the too-big set — i.e. min = largest "too small" particle, max = smallest "too big" one. (This is
my reading of ImageJ's Summarize row order — Mean, SD, Min, Max — not something the authors
state.) Saved to `FinalDatasetParameters.txt`.

### 2.3 Clustering and statistics (as reported)

- **PCA** on the 27 features; first **3 PCs explain 84.6%** of variance (Extended Data Fig 4-1B,
  not in the PDF). The PCA input normalization is not stated in the main text (R package offers
  "data normalization options").
- **Fuzzy k-means** (Cebeci 2019) on PCs 1–3; each cell gets a membership score per cluster and a
  hard label = highest membership. Hard labels used throughout the paper. **k = 4** chosen by
  **within-sum-of-squares and silhouette** (Extended Data Fig 4-1C). Clusters named by visual
  check with ColorByCluster (§5.1).
- Authors note hierarchical clustering or Gaussian mixture models could be swapped in.
- **Cluster-shift statistics:** per brain region, GLMM with **beta** distribution (glmmTMB):
  `percentage ~ Cluster*Treatment*Antibody + (1|MouseID)`; Type II Wald χ²; post-hoc PBS vs 2xLPS
  per Cluster×Antibody, **Bonferroni**, q < 0.05. Regions fitted separately because the
  4-way model did not converge.
- **Single-measure statistics:** per region, `lmer`: `Value ~ Treatment*Antibody + (1|MouseID)`;
  Bonferroni across antibodies, q < 0.05. Shown for cell area.
- Feature correlations: Spearman, "highly correlated" = |R| ≥ 0.8, p < 0.05; PC–feature
  correlations |R| ≥ 0.75, p < 0.05.

### 2.4 Parameters NOT stated (gaps — do not re-hunt the PDF)

- **Pixel size / µm per pixel** of the Axioscan 20× images; objective **NA**; camera; z-range
  (number of slices) of the stacks; exposure.
- **Which threshold method and radius** were used for the 2xLPS, 1xLPS or 3D-comparison datasets.
- **The area window [min, max]** used for any dataset, and its units (the macro works in pixels).
- Units of "Area", "Perimeter", radii, spans, branch lengths in the results (Fig 4C "Area" axis
  runs ~7,000–11,000 with **no unit**; FracLac reports pixels by default, so pixels is likely but
  **unconfirmed**).
- FracLac options (only "adapted from Young & Morrison 2018 §5.5" and a screenshot in the repo
  README, which I did not fetch).
- Whether features were scaled before PCA, and how the four clusters map to cluster numbers in
  the 1xLPS dataset.
- How 3D skeletons were obtained for the 20-cell 3D comparison (thresholding in 3D? same
  pipeline?) — only that cells were "manually isolated from z-stack images" and AnalyzeSkeleton
  ran in 3D.
- Any segmentation accuracy (precision/recall of cells, per-pixel overlap) — **never measured**.
- Number of cells per region/animal/antibody (only the 43,332 total).

---

## 3. The 27 morphology measures ⭐

The paper names them but **gives no formulae**; the definitions below are the paper's own words
where it gives any (Results/Discussion) and otherwise only the name. Source plugin in brackets.
Grouping = the correlation groups the paper reports (Spearman |R| ≥ 0.8, Fig 3A).

| # | Measure (paper's name) | Plugin | Paper's group / what it says |
|---|---|---|---|
| 1 | # of end point voxels | AnalyzeSkeleton | branching complexity |
| 2 | # of junction voxels | AnalyzeSkeleton | branching complexity; "the numbers of actual pixels which make up the junctions" |
| 3 | # of triple points | AnalyzeSkeleton | branching complexity |
| 4 | # of branches | AnalyzeSkeleton | branching complexity |
| 5 | # of junctions | AnalyzeSkeleton | branching complexity |
| 6 | # of quadruple points | AnalyzeSkeleton | "the most complex type of junction"; clusters near the complexity group but not starred |
| 7 | # of slab voxels | AnalyzeSkeleton | area & territory span (correlation group) |
| 8 | Maximum branch length | AnalyzeSkeleton | branch length |
| 9 | Average branch length | AnalyzeSkeleton | branch length |
| 10 | Width of bounding rectangle | FracLac | area & territory span |
| 11 | Height of bounding rectangle | FracLac | area & territory span |
| 12 | Maximum radius from hull's center of mass | FracLac | area & territory span |
| 13 | Maximum span across hull | FracLac | area & territory span |
| 14 | Diameter of bounding circle | FracLac | area & territory span |
| 15 | Maximum radius from circle's center of mass | FracLac | area & territory span |
| 16 | Perimeter | FracLac | area & territory span |
| 17 | Mean radius | FracLac | area & territory span |
| 18 | Mean radius from circle's center of mass | FracLac | area & territory span |
| 19 | Area | FracLac | area & territory span |
| 20 | Foreground pixels | FracLac | area & territory span |
| 21 | Density of foreground pixels in hull area | FracLac | "describes a cell's occupancy within its territory and can be a proxy for soma and/or branch thickness" |
| 22 | Circularity | FracLac | cell shape; "highly negatively correlated with span ratio of the bounding hull" |
| 23 | Span ratio of hull (major/minor axis) | FracLac | cell shape; "higher value indicates greater cell oblongness" |
| 24 | Max/min radii from circle's center of mass | FracLac | cell shape |
| 25 | Relative variation (CV) in radii from circle's center of mass | FracLac | cell shape |
| 26 | Max/min radii from hull's center of mass | FracLac | cell shape |
| 27 | Relative variation (CV) in radii from hull's center of mass | FracLac | cell shape |

The AnalyzeSkeleton vocabulary is drawn in Fig 2E (and Fig 1A): **end point** = skeleton pixel
with one neighbour (drawn blue at branch tips), **junction** = pixels where branches meet (drawn
purple), **quadruple point** = junction joining four branches, **branch length** = slab run
between end/junction points, **"voxel"** = one skeleton pixel. Note that *branching complexity*
features are counts; *territory* features are hull/circle/rectangle geometry of the binary mask —
there is **no fractal dimension or lacunarity** among the 27 even though FracLac is a fractal
tool.

**PC loadings (Fig 3B, Spearman |R| ≥ 0.75):** **PC1** = branching complexity + territory span +
density of foreground pixels in hull (paper says positively; on the heatmap that density row is
blue on PC1 — see figures/README); **PC2** = circularity (+) vs the five shape/oblongness measures
(−); **PC3** = average branch length (and maximum branch length, weaker).

---

## 4. Reported numbers ⭐

### 4.1 3D vs EDF vs single-plane 2D (Fig 2; 20 hippocampal cells, female mice, 5 per class)

Pearson correlations between image types, read off Fig 2D (each n = 20 cells):

| Feature | 3D vs 2D | EDF vs 2D | EDF vs 3D |
|---|---|---|---|
| # of branches | R = 0.92, p = 1.3e-08 | R = 0.94, p = 1e-09 | R = 0.92, p = 6.7e-09 |
| # of end point voxels | R = 0.93, p = 1.7e-09 | R = 0.95, p = 3.5e-10 | R = 0.97, p = 9.5e-13 |
| # of junction voxels | **R = 0.36, p = 0.11** | R = 0.92, p = 1.4e-08 | **R = 0.53, p = 0.016** |
| # of junctions | R = 0.91, p = 2.2e-08 | R = 0.92, p = 5.4e-09 | R = 0.91, p = 2.6e-08 |

**Magnitudes (axis ranges of Fig 2D, read off the plots — approximate):** branches per cell up
to ~230 in 3D vs ~75 in 2D and ~70 in EDF; end points up to ~70 (3D) vs ~22 (2D) / ~26 (EDF);
junctions up to ~125 (3D) vs ~42 (2D) / ~36 (EDF); junction voxels up to ~3,000 in 3D vs ~75 in
2D / ~65 in EDF. → **2D/EDF undercount branching roughly 3× relative to 3D** at this
magnification; the authors: "the raw values of all skeletal measures quantified decreased
considerably when measured from 3D to either of the 2D image forms" (Ext. Data Fig 2-1A).

- PC1 correlated across all three image types (starred, |R| ≥ 0.7, p < 0.05 in Fig 2C); **PC2
  (mostly maximum branch length) correlated between 3D and EDF but not 3D and 2D.**
- Quadruple points were "the least well captured in 2D representations".
- Hypertrophic and ramified cells (the most branched) "were better captured in 3D".
- Conclusion: "EDF images better retain 3D skeletal information than 2D forms do but ... relative
  group differences between ameboid, hypertrophic, ramified, and rod-like morphologies are still
  maintained across image forms."
- Caption/heading inconsistency: Fig 2 caption says "Spearman's correlation of PCs 1–2"; the
  panel title says "Pearson's correlation of PCs across Image Types".

### 4.2 Datasets

| Dataset | Mice | Treatment | Collection | Stain | Cells |
|---|---|---|---|---|---|
| **2xLPS** (main) | Cx3cr1-GFP, C57BL/6J background, 8 wk, n = 3/condition (2 F, 1 M) | 0.5 mg/kg LPS (E. coli O55:B5) or PBS i.p., every 24 h × 2 | 3 h after last injection | Cx3cr1-GFP + Iba1 + P2ry12 + DAPI | **43,332** cells, FC + STR + HC |
| **1xLPS** (replication, Ext. Data Fig 3-1) | C57BL/6J, 8 wk, n = 2/sex/condition; reversed light cycle | 1.0 mg/kg LPS or PBS, once | 24 h | Iba1 only | not stated |
| **Image-type comparison** | female, hippocampus | — | — | not stated | 20 (5 per class) |

### 4.3 Model statistics (2xLPS)

| Test | FC | HC | STR |
|---|---|---|---|
| Cluster×Treatment×Antibody (beta GLMM, Type II Wald) | χ²(6, n = 6) = 17.676, p = 0.007 | χ²(6, n = 6) = 50.684, p = 3.428 × 10⁻⁹ | χ²(6, n = 6) = 77.402, p = 1.228 × 10⁻¹⁴ |
| Area: Treatment×Antibody (lmer, Type II Wald) | χ²(2, n = 6) = 46.489, p = 8.035 × 10⁻¹¹ | χ²(2, n = 6) = 189.851, p = 5.949 × 10⁻⁴² | χ²(2, n = 6) = 255.691, p = 3.002 × 10⁻⁵⁶ |

### 4.4 Cluster shares, hippocampus (Fig 4A; fraction of cells per animal, read off the box plots — approximate, n = 3 mice)

| Marker | Ameboid PBS → LPS | Hypertrophic | Ramified | Rod-like |
|---|---|---|---|---|
| Cx3cr1 | ~0.19 → ~0.13 \* | ~0.11 → ~0.32 \* | ~0.40 → ~0.29 \* | ~0.31 → ~0.26 (n.s.) |
| **Iba1** | ~0.20 → ~0.14 \* | ~0.20 → ~0.41 \* | ~0.30 → ~0.24 \* | ~0.30 → ~0.22 \* |
| P2ry12 | ~0.41 → ~0.19 \* | ~0.15 → ~0.39 \* | ~0.21 → ~0.24 (n.s.) | ~0.23 → ~0.19 (n.s.) |

\* = Bonferroni q < 0.05 as starred in the figure. Text: in HC and STR, "LPS-induced decreases in
ameboid cluster membership and increases in hypertrophic cluster membership were maintained across
all three microglia antibodies"; in FC the ameboid change was seen only with Iba1 and P2ry12.
Note the counter-intuitive direction (LPS *reduces* the ameboid share) — 3 h after the second
injection.

**Baseline mix worth remembering:** in PBS hippocampus with Iba1, only ~30% of retained cells are
"ramified"; ~20% fall in the "ameboid" cluster even in controls. These are *relative* k-means
clusters, not absolute states — a control animal's "ameboid" cluster is the least-branched
quarter-ish of a mostly-ramified population, plus fragments that passed the area window.

### 4.5 Cell area (Fig 4C; units not stated, likely pixels)

Per-animal means span roughly **7,000–11,000** (axis units unstated). Hippocampus: Cx3cr1 ~10,100
(PBS) vs ~9,900 (LPS); **Iba1 ~8,550 vs ~7,900 (n.s.)**; P2ry12 ~6,850 vs ~8,350 (\*). LPS
increased area only for P2ry12 (HC and STR). Iba1-stained cells read smaller than Cx3cr1-GFP
cells in every region.

---

## 5. Biology worth keeping

### 5.1 The four states as the paper uses them

| Cluster (2xLPS) | Name | What drives it (Fig 3D, text) | README one-liner |
|---|---|---|---|
| 1 | **Ameboid** | lowest branching complexity and territory span | "round, few processes" |
| 2 | **Rod-like** | greatest oblongness and "branching inhomogeneity" (high span ratio, max/min radii, CV of radii) | "elongated soma with bipolar processes" |
| 3 | **Hypertrophic** | highest average/maximum branch length; (text:) highest density of foreground pixels in hull; average territory | "thicker, shorter processes with larger soma" |
| 4 | **Ramified** | greatest branching complexity, territory span and circularity | "smaller soma with long, highly branched processes" |

- Hypertrophic overlaps heavily with ameboid and rod-like in PC space — "a state between
  ameboid and rod-like forms on the morphological spectrum".
- Rod microglia (Taylor 2014, cited): "long, thin processes protruding from oval-shaped somas
  that retract neuron-adjacent planar processes in response to diffuse brain injury".
- Hyper-ramified forms reported in stress-induced depression, accelerated aging and AD models;
  README also lists dystrophic and satellite as other described forms.
- Microglia are "never truly quiescent", constantly extending and retracting processes (in vivo
  two-photon), so a fixed-tissue snapshot is one instant of a dynamic shape.
- Form–function is **not** dichotomous: ramified microglia phagocytose (adult neurogenesis),
  ameboid ones can be *less* phagocytic (epilepsy). The paper argues against "resting/activated"
  and for continuous states (hence fuzzy clustering).

### 5.2 Markers

- **P2ry12** is the most microglia-specific; **Cx3cr1 and Iba1 also label other macrophages**
  (perivascular/infiltrating) — relevant to our Iba1 channel: an Iba1+ cell is not necessarily a
  microglion, especially near vessels and meninges, or in disease with infiltration.
- All three are "homeostatic" markers whose expression changes in disease/inflammation.
- P2ry12 is "less concentrated in the cell bodies and more spread throughout the cell branches"
  than Iba1/Cx3cr1 (Fig 4B) — so marker choice changes measured area and cluster shares.
- **CD68** (our second channel) is not used or discussed in this paper.

### 5.3 Regional notes

- Regions: frontal cortex, striatum, hippocampus, with subregions (Ext. Data Fig 4-1D, not in the
  PDF). Region-specific responses: striatum shows the strongest model effects, frontal cortex the
  weakest. Microglial morphology and density are known to vary across regions (refs Lawson 1990;
  Tan 2020; Mittelbronn 2001 — "differs by up to one order of magnitude" in human, title only).
- No hippocampal-subfield-specific result is reported in the main text.

---

## 6. Discussion arguments and the authors' limitations

- Reporting one feature (e.g. branch number or area) gives "an incomplete or biased
  representation"; consider all features together (PCA + clustering).
- Manual cell picking introduces selection bias and limits n; their tool processes all cells
  that pass the area filter.
- **Limitations stated:** 2D only (FracLac); requires user input for dataset parameters; R
  skills needed; large datasets need more compute; marker-comparison results are
  "preliminary"/"proof-of-concept" (n = 3/group, underpowered; sex differences not testable);
  hard cluster boundaries are artificial (continuum) — hence fuzzy k-means.
- 3D is acknowledged as finer-grained but argued to be low-throughput because of data size and
  processing time.
- **Limitations they do not state (ours):** the area window silently drops touching cells and
  large/small cells, biasing the sample against dense regions, hypertrophic cells and cells with
  long processes that touch neighbours; no segmentation ground truth; a max projection merges
  processes from different depths, so cells overlapping in z appear fused; cluster identities are
  dataset-relative (k-means is re-fit per dataset), so "ramified %" is not comparable across
  studies.

---

## 7. What is not in this PDF

- **Extended Data** (Figs 2-1, 3-1, 4-1; Tables 2-1, 2-2, 3-1 to 3-4, 4-1 to 4-4) — cited
  throughout (variance explained per PC, WSS/silhouette plots, subregion map, full correlation
  tables, post-hoc tables) but **not in this PDF**. Not fetched; would be on the eNeuro article
  page.
- **GitHub, MicrogliaMorphology** — README fetched 2026-11-15 from
  `https://raw.githubusercontent.com/ciernialab/MicrogliaMorphology/main/README.md` (HTTP 200;
  HEAD `6efb58d1…` by `git ls-remote`; README "Last updated: 7 January, 2026"). Contents:
  install Fiji + **BioVoxxel Toolbox** + **FracLac**; three macros
  (`MicrogliaMorphology_BioVoxxel.ijm`, `_Program.ijm`, `_ColorByCluster.ijm`) and four step
  macros (`MM_Step1_DatasetParameters` … `MM_Step4_SkeletonAnalysis`); ROI integration
  (ROIMAPer); Step 1 ThresholdCheck guidance (radius 100 typical; check all 25 methods visually;
  example under/well/over-thresholded cells, shown as images I did not fetch); area-window
  guidance (too small = "almost as big as a single-cell"; too big = "2 obviously overlapping
  cells"); FracLac: BC mode, "lock black background", batch; note that very large batches may
  exhaust ImageJ memory. The four step macros were also read (not vendored) for §2.2.
- **GitHub, MicrogliaMorphologyR** — README fetched 2026-11-15 (HTTP 200; HEAD `c4cbc5b3…`;
  "Last updated: 01 Oct, 2026"). Install via `devtools::install_github`; tutorial on the package
  site; a **"Pipeline 2"** workflow tutorial now exists
  (`ciernialab.github.io/MicrogliaMorphologyR/articles/MicrogliaMorphologyPipeline2.html`, not
  fetched — **post-paper and possibly a different method; worth a look**); the four-class
  one-liners in §5.1.
- **GitHub REST API** (`api.github.com/repos/ciernialab/MicrogliaMorphology/commits`) → **403**
  from the session's proxy (GitHub API access not enabled for this repo in this session). Not
  retried; commit SHAs obtained with `git ls-remote` instead.
- **OSF <https://osf.io/8t5c2/>** — input images, thresholded images and *all* single-cell images,
  offered by the authors as a "benchmarking dataset". **Not fetched.** Potentially our best
  external sample source at the same magnification (but no hand-annotated cell ground truth).
- **YouTube tutorial** — not fetched.

---

## 8. Extracted images

All five embedded rasters are real figures (no logos/icons). Descriptions:
[`figures/README.md`](figures/README.md).

| File | Paper item | Content |
|---|---|---|
| [`figures/fig0_visual_abstract.png`](figures/fig0_visual_abstract.png) | Visual Abstract (p. 1) | pipeline overview; Cx3cr1/Iba1/P2ry12/DAPI 50 µm panels; exemplar ameboid/hypertrophic/rod-like/ramified cells |
| [`figures/fig1_study_overview.png`](figures/fig1_study_overview.png) | Figure 1 (p. 7) | A pipeline diagram; B LPS design + dorsal hippocampus Iba1 overviews (200 µm) and insets (30 µm) |
| [`figures/fig2_image_type_comparison.png`](figures/fig2_image_type_comparison.png) | Figure 2 (p. 8) | 3D vs EDF vs 2D: PCA, per-class boxplots, PC correlation, feature scatter plots, skeleton glossary |
| [`figures/fig3_morphology_clusters.png`](figures/fig3_morphology_clusters.png) | Figure 3 (p. 10) | 27-feature correlation matrix, PC loadings, clusters, cluster heatmap, ColorByCluster hippocampus |
| [`figures/fig4_lps_cluster_shifts.png`](figures/fig4_lps_cluster_shifts.png) | Figure 4 (p. 12) | cluster shares by region × marker; same cells in 3 markers (50 µm); cell area |
