# Reference digest — Green, Murphy & Rowe 2022, comparing ImageJ microglia-morphology methods

> Self-contained digest of the source paper. The method, every stated parameter, the metric
> definitions, the reported numbers and the figures are captured here and in
> [`figures/`](#figures). **You should not need to reopen the PDF.**

- **Title:** *Comparisons of quantitative approaches for assessing microglial morphology reveal
  inconsistencies, ecological fallacy, and a need for standardization*
- **Authors:** Tabitha R. F. Green, Sean M. Murphy, **Rachel K. Rowe\*** (\*corresponding,
  rachel.rowe@colorado.edu). Dept. of Child Health, University of Arizona College of
  Medicine–Phoenix; Dept. of Integrative Physiology, University of Colorado Boulder.
- **Venue / id:** *Scientific Reports* (2022) **12:18196**. DOI **10.1038/s41598-022-23091-2**.
  Received 19 Aug 2022, accepted 25 Oct 2022, published online 28 Oct 2022. 13 pages.
- **Licence (as stated in the PDF):** "This article is licensed under a **Creative Commons
  Attribution 4.0 International License**" (CC BY 4.0), © The Author(s) 2022. Redistribution and
  derivatives are allowed with attribution, so the PDF and the figures are committed here.
- **PDF:** kept in the study's Drive `Literature` folder as `Comparisons of quantitative approaches for assessing microglial morphology reveal inconsistencies, ecological fallacy, and a need for standardization.pdf`, not in the repo.
- **Data:** Dryad, doi:10.5061/dryad.j3tx95xhq (CC0). Listed, but the files could not be
  downloaded from here. See [§ What is not in this PDF](#9-what-is-not-in-this-pdf).
- **One-line thesis:** five common ImageJ ways of quantifying Iba1 microglial morphology
  (percent coverage, whole-image skeleton, fractal analysis, single-cell skeleton plus soma
  area/perimeter, Sholl) were run on the **same** images and cells and **disagree**. Whole-image
  averages hide effects that per-cell measurement finds ("ecological fallacy" / aggregation
  bias), so the cell has to be the unit of measurement.

---

## 1. Why this matters to our task ⭐

We want an algorithm that finds **every** microglial cell in a 20× fluorescent Iba1 (488 nm)
image or z-stack of mouse hippocampus and measures each cell's geometry. This paper detects no
cells automatically. Its value to us is that it argues for **per-cell** measurement over
whole-image measurement, defines the per-cell metrics, and shows where each method fails.

| What the paper gives us | What it means for what we build |
|---|---|
| **Per-cell metrics beat field aggregates.** In the whole-image skeleton analysis, effect sizes were **67–93 % smaller** than for the same metrics measured per cell. Three of the four per-cell skeleton effects disappeared at image level. Averaging percent coverage per animal hid a significant effect (p = 0.35 averaged vs p = 0.006 per image). | Our output must be a **per-cell table** (cell id, image, region, animal), not field averages. Any summary has to keep the hierarchy (cells within images within animals), as their mixed models do. |
| **The hard step was done by hand.** Isolating a cell meant cropping a fixed ROI from the binary image, then using a **paintbrush** to remove fragments not attached to the cell and to **reconnect branches broken by thresholding**, while checking the original. | These are exactly the steps an automated "find every cell" algorithm has to do itself: assign each process fragment to a soma or reject it, and bridge thresholding gaps. Every published per-cell number here comes from hand-cleaned masks. |
| **Somata were counted manually** to get cells per image (≈ 22 per 40× field, §5a). | Soma detection is the natural seed for cell instances. The paper gives a manual reference count to compare with, but at a different magnification, stain and region. |
| **Thresholding moves everything.** One low-quality image gave **36.7 %** coverage when binarised directly and **14.8 %** after a background-correcting threshold. The stricter threshold removed processes, which looks like de-ramification (Fig 5). | Segmentation sensitivity is a first-order risk for process counts and lengths. We should report how our per-cell metrics move with the threshold and prefer adaptive, local thresholds over one global cut. |
| **The Sholl first-circle problem.** Somata are not circular, so the first circle either cuts the soma or lands on secondary branches. Primary processes are then missed, or secondary ones counted as primary. | We need a real **soma segmentation** (not a centroid with a radius) before counting primary processes or running Sholl. Process count should be "branches leaving the soma mask". |
| **Metric definitions** (§4) for branches, endpoints, total branch length, soma area/perimeter, fractal dimension, lacunarity, convex-hull circularity, span ratio, density, Sholl intersections. | A ready list of per-cell outputs with ImageJ-compatible meanings, so our numbers can be compared with this lab's. |
| **The two hallmarks of reactivity** are **fewer branches** and a **larger soma**. These were the most sensitive and easiest to interpret. | Minimum viable per-cell output: soma area, primary process count, branch count, endpoints, total branch length. |

**What it does *not* cover, and why caution is needed:**
- **Brightfield DAB, not fluorescence.** Iba1 was detected with DAB on a Zeiss widefield
  microscope with a colour camera. Our images are fluorescent (Iba1 488, CD68 555). Background,
  contrast and saturation are all different.
- **40× objective, not 20×.** At our 20× objective, fine processes will be thinner in pixels and
  will break up more easily.
- **Cortex, not hippocampus.** Images were from retrosplenial, somatosensory and entorhinal
  cortex. **The hippocampus is not mentioned anywhere.**
- **No CD68.** The paper never mentions CD68 or any phagocytic or lysosomal marker. Iba1 is the
  only stain.
- **2D only.** Z-stacks were acquired, but every analysis is 2D. How a stack became a 2D image
  is not stated. No 3D volume, no 3D skeleton, no cell volume.
- **No territory or nearest-neighbour measure.** The convex hull and bounding circle are
  measured, but only hull circularity and span ratio are reported, not hull **area**. Nearest
  neighbour analysis is named as a method the paper did not use.
- **Selection bias.** Only images "with clearly visible microglial cell bodies" were used, and
  only **3 random cells per image** were analysed. This is the opposite of our "every cell" goal.
  Edge cells, overlapping cells and faint cells were never measured.

---

## 2. Experimental design

- **Animals:** male C57BL/6J mice. Tissue reused from an earlier study on microglia and sleep
  after an immune challenge (Rowe et al. 2022, *Biology*; data on Dryad).
  - **Treatment group:** PLX5622 (Plexxikon, **1200 ppm** in AIN-76A chow) for **21 days** to
    deplete microglia, then LPS. Back to standard chow 4 days after LPS, **10 days** to
    repopulate, then a second LPS injection.
  - **Control group:** AIN-76A chow, same LPS schedule, microglia intact.
  - **LPS:** *E. coli* 0111:B4 (Sigma-Aldrich), i.p., **0.4 mg/kg** in **0.05 ml** sterile
    saline, on day 21 and again after repopulation.
  - **Collection:** **7 days** after the second LPS injection.
  - Chosen because the manipulation produced "a robust difference in microglial ramification".
- **n:** treatment **12 mice**, control **13 mice**.
- **Rigor:** University of Arizona IACUC protocol 13-460, ARRIVE guidelines, random assignment,
  experimenters blinded.
- **Perfusion / tissue:** Euthasol overdose, transcardial PBS perfusion, brains **drop-fixed in
  4 % PFA for 24 h**, sucrose 15 % then 30 %. **Megabrain** technique (many brains frozen in one
  block), cryosectioned at **40 µm, coronal**, mounted on slides straight away.
- **IHC (DAB, brightfield):**
  1. Bake slides at 56 °C, 3 h.
  2. Antigen retrieval, sodium citrate pH 6.0, **100 min**.
  3. PBS wash, PAP pen.
  4. Block in 4 % normal horse serum (NHS), 0.1 % Triton X-100 in PBS, 60 min.
  5. Primary **rabbit anti-Iba1, WAKO #019-19741, 1:1000** in 1 % NHS, 0.1 % Triton X-100, overnight at 4 °C.
  6. Wash in PBS + 0.1 % Tween 20.
  7. Secondary **biotinylated horse anti-rabbit IgG (H+L), Vector BA-1100, 1:250** in 4 % NHS, 0.4 % Triton X-100, 60 min at room temperature.
  8. Block endogenous peroxidase in H₂O₂, 30 min.
  9. **ABC** (Vectastain PK-6100), 30 min.
  10. **DAB** (Vector SK-4100), **10 min**.
  11. Water, ethanol 70/90/100 %, Citrosolve, coverslip in DPX.

  Stained in **two batches**, with treatment and control split evenly across them.
- **Imaging:** **Z-stacked** photomicrographs, **40× objective**, **Zeiss Imager A2**,
  **AxioCam MRc5** camera, **Neurolucida 360** software, "consistent microscope settings and
  Z-stack parameters". Three slices per animal from **between bregma and lambda**, imaged in
  **retrosplenial, somatosensory and entorhinal cortex**. **9 images per mouse** (3 slices × 3
  images). **225 images**, **669 microglia** (345 from 13 control mice, 324 from 12 treatment
  mice). Cells were chosen at random from coordinates and a random number generator.
- **Inclusion criterion:** only "images with clearly visible microglial cell bodies were
  included", to keep staining and imaging artefacts to a minimum.

> ⚠️ **Count inconsistency in the paper:** "27 microglia/mouse" gives 13 × 27 = 351 control
> cells, but 345 are reported. Treatment is consistent (12 × 27 = 324). About 6 control cells
> are missing, and the paper does not say why.

---

## 3. The five methods, step by step (every stated parameter)

### 3.1 Percent coverage (whole image)

1. Convert the raw image to **8-bit**.
2. **Subtract Background** (rolling ball). The radius was chosen by averaging the radius of
   **5 cell bodies** and setting the rolling ball to **50 % of that radius**. "The same rolling
   ball radius of **50 pixels** was used throughout the study." Read together, this means a mean
   soma radius of about 100 px in their native pixels. The native pixel size is never given.
3. Convert to binary, with "minimal adjustments to the threshold … so that the binary image best
   represented the raw data", and filter out processing artefacts. The threshold is set by hand,
   **per image**.
4. Percent coverage = percentage of the image covered by dark (Iba1+) pixels.
5. Two ways of analysing it: **(1)** average the 9 values per mouse; **(2)** keep all 9 images
   as separate data points.

The paper notes that this measure is also called "optical/pixel density" or "intensity of
staining/fluorescence". It rests on the idea that reactive microglia express more Iba1.

### 3.2 Whole-image skeleton analysis

The protocol follows Morrison et al. 2017, Young & Morrison 2018 (JoVE) and Morrison & Filosa
2013.

1. Convert to **8-bit**.
2. Apply the **FFT bandpass filter**.
3. Adjust **brightness/contrast** by hand "to best visualize the branches".
4. Apply **unsharp mask**.
5. Apply **despeckle**.
6. Set the **threshold** by hand.
7. Apply **despeckle**, **close** and **remove outliers**.
8. **Skeletonize**, then run **Analyze Skeleton**.
9. **Count somata manually** to get the number of cells per image.
10. Total branch length, endpoints and number of branches over the **whole image**, each
    **divided by the number of cells** in the frame.

### 3.3 Fractal analysis (single cell)

1. Binarise the image.
2. Make **one fixed ROI**, "sized to fit around all microglia in the study", so that isolated
   cells share one scale.
3. Pick **3 cells per image** at random from coordinates.
4. Cut each cell out of the binary image with the ROI.
5. **Paintbrush:** remove fragments not attached to the cell and reconnect branches fragmented
   by processing, "using the original photomicrograph as a reference". This is **manual
   correction**.
6. Convert the binary cell to an **outline**.
7. Run **FracLac**: **box counting**, **"grid design Num G" = 4**.
8. Measure the **convex hull** and **bounding circle**.
9. Outputs: fractal dimension, lacunarity, circularity, span ratio, density (§4).

### 3.4 Single-cell skeleton analysis, with soma area and perimeter

Uses the **same isolated cells** as 3.3.

1. Skeletonize the cell and run **Analyze Skeleton**.
2. Outputs per cell: number of branches, total branch length, endpoints.
3. **Soma area and perimeter** from the **multipoint area selection tool**, i.e. the soma is
   outlined by hand.

### 3.5 Sholl analysis

Uses the same isolated cells.

1. Draw a radius from the **centre of the cell body to the end of the longest branch**. This
   sets the upper and lower limits for the circles.
2. Put the **first circle as close to the edge of the cell body as possible**, so the soma is not
   counted as an intercept.
3. Space the circles **5 µm** apart for every cell.
4. Count branch crossings on each circle.

### 3.6 Statistics

- **Hierarchical GLMMs**, R package **glmmTMB**; contrasts with **emmeans**. Tukey-adjusted
  p-values, effect size **d** (Sawilowsky 2009), predicted-mean differences **Δ**, and 95 % CIs.
- **Error distributions:**
  - **Beta:** lacunarity, density, circularity, percent coverage, mean percent coverage.
  - **Negative binomial** (overdispersed counts): branches, branch length, endpoints, cell
    area, cell perimeter, and the image-level means of branches, branch length, endpoints and
    cell count.
  - **Gaussian:** fractal dimension.
  - **Gamma with log link:** span ratio (strongly skewed).
  - **Negative binomial:** Sholl intersections.
- **Fixed effects:** treatment. For Sholl, also distance from the soma (as a **natural cubic
  spline**) and the treatment × distance interaction.
- **Random effects:**
  - **Single-cell models:** animal crossed with brain region (9 cells per region × 3 regions =
    27 per mouse).
  - **Whole-image models:** mouse crossed with a **binned number of cells** used to compute the
    value (9 per mouse).
  - **Sholl model:** mouse only (n = 25 distances per mouse).

### 3.7 Parameters the paper does NOT state (do not re-hunt)

- **Image size and pixel size (µm/px).** Not given anywhere, so the 50 px rolling ball cannot be
  converted to µm.
- **Z-stack settings:** step, number of planes, depth. **How the stack was reduced to 2D**
  (single plane, MIP, extended depth of field) is also not stated.
- The objective's NA and the camera adapter / intermediate magnification.
- **FFT bandpass** filter sizes ("filter large/small structures"), autoscale, saturate.
- **Unsharp mask** radius and weight. **Remove outliers** radius and threshold. Despeckle and
  close repeats.
- The **threshold method or value** in every pipeline. It is always "adjusted" by hand, per
  image.
- **Analyze Skeleton** settings: prune mode, loop handling, whether isolated fragments or short
  spurs were excluded. The minimum fragment size for "processing artefact" removal.
- **ROI size** used to isolate cells.
- FracLac settings other than box counting and Num G = 4. **Which** "circularity" FracLac
  reports: the text says "how circular the microglial cell is", and the figure shows a
  convex-hull polygon and bounding circle.
- **Sholl:** the first-circle radius in µm, the maximum radius, and whether the 5 µm step was
  measured in 2D on the projected image.
- **How "branch" is defined** in the whole-image vs single-cell analyses. The values differ
  systematically (§5c), and the paper does not explain why.
- How cells cut by the image edge were handled.

---

## 4. Metric definitions, exactly as given ⭐

| Metric | Definition in the paper | Tool / unit |
|---|---|---|
| **Percent coverage** | "The percentage of the image covered by dark pixels" after background subtraction and thresholding. Also called optical/pixel density or staining intensity in the literature. | ImageJ, fraction 0–1 (axis labelled "%") |
| **Mean branch length (whole image)** | "Averaging the total length of branches in the photomicrograph by the total number of microglia in the photomicrograph". This is a **per-cell total** length, not a per-branch mean. | Analyze Skeleton, µm |
| **Endpoints (whole image)** | Total skeleton endpoints in the image ÷ manual soma count. | n per cell |
| **Branches (whole image)** | Total skeleton branches in the image ÷ manual soma count. | n per cell |
| **Cells per image** | Somata counted manually. | n |
| **Fractal dimension (Db)** | "A statistical measure of pattern complexity". Box-counting dimension of the **outline** of the isolated binary cell. | FracLac |
| **Lacunarity** | "A geometric measure of how a pattern fills space". | FracLac, 0–1 |
| **Circularity** | "How circular the microglial cell is". Measured with the convex hull and bounding circle. | FracLac, 0–1 |
| **Span ratio** | "Longest length/longest width" (of the convex hull). | FracLac |
| **Density** | "Number of pixels/area". Cell pixels ÷ convex-hull area. | FracLac, 0–1 |
| **Branches per cell** | Number of branches from Analyze Skeleton on the isolated cell's skeleton. | n |
| **Total branch length** | Summed skeleton branch length of the isolated cell. | µm |
| **Endpoints per cell** | Skeleton endpoints of the isolated cell. | n |
| **Cell body (soma) area / perimeter** | Hand-drawn polygon around the soma (multipoint area selection). | µm², µm |
| **Sholl intersections** | Number of times branches cross each concentric circle. Circles every 5 µm, starting at the soma edge and ending at the tip of the longest branch. | n per circle |

Not measured or not reported: **cell area or cell volume** (whole-cell mask area is not
reported), **convex-hull area / territory**, **primary process count**, **ramification index**,
**nearest-neighbour distance**, **cell density per mm²**, and **3D anything**.

---

## 5. Reported numbers ⭐

Statistics in the text are **p** (Tukey-adjusted), **Δ** (difference in predicted conditional
means) and **d** (effect size). **Point estimates and 95 % CIs appear only in the plots**
(Figs 3–4). The values marked "≈" below were **read by eye off the plotted points** and are good
to about half a tick spacing. Treat them as approximate. The per-cell raw data are on Dryad (§9).

### 5a. Whole-image methods (Fig 3)

n = 117 control images (13 mice), 108 treatment images (12 mice). Percent coverage per animal:
n = 13 / 12.

| Metric | Control ≈ (95 % CI) | Treatment ≈ (95 % CI) | p | Δ | d |
|---|---|---|---|---|---|
| Mean Iba1 coverage, **averaged per mouse** | 0.17 (0.155–0.19) | 0.18 (0.165–0.20) | 0.35 | 1.2 % | 0.0006 |
| Iba1 coverage, **per image** | 0.16 (0.145–0.18) | 0.195 (0.175–0.215) | **0.006** | 3.5 % | 0.002 |
| Mean branch length per cell (µm) | 610 (540–695) | 580 (515–665) | 0.40 | 28 µm | 0.002 |
| Mean endpoints per cell | 119 (103–137) | 101 (88–117) | **0.002** | 18 | 0.01 |
| Cells per image (manual soma count) | 22 (21.5–23) | 22.5 (21.5–23.5) | 0.60 | 0 | 0.01 |
| Mean branches per cell | 127 (110–147) | 114 (98–131) | 0.08 | 13 | 0.005 |

Raw spread of individual images (read off the plots):
- Coverage: about 0.07–0.29.
- Cells per image: **10–38**.
- Branch length per cell: about 280–1300 µm.
- Endpoints per cell: about 10–280.

### 5b. Single-cell methods (Fig 4)

n = 345 control cells (13 mice), 324 treatment cells (12 mice).

| Metric | Control ≈ (95 % CI) | Treatment ≈ (95 % CI) | p | Δ | d |
|---|---|---|---|---|---|
| Fractal dimension Db | 1.49 (1.47–1.52) | 1.44 (1.42–1.46) | **< 0.0001** | 0.05 | **0.65** |
| Lacunarity | 0.36 (0.32–0.41) | 0.375 (0.33–0.43) | 0.72 | 0.013 | 0.004 |
| Circularity | 0.805 (0.79–0.815) | 0.79 (0.78–0.80) | 0.08 | 0.013 | 0.003 |
| Span ratio | 1.53 (1.47–1.59) | 1.56 (1.50–1.62) | 0.33 | 0.03 | 0.10 |
| Density | 0.080 (0.076–0.085) | 0.076 (0.072–0.081) | 0.22 | 0.004 | 0.0001 |
| Soma perimeter (µm) | 70 (64–76) | 84 (77–92) | **0.002** | 14 µm | 0.01 |
| **Soma area (µm²)** | **610 (540–685)** | **760 (670–860)** | **0.01** | 148 µm² | 0.02 |
| **Branches per cell** | **179 (151–212)** | **127 (106–150)** | **0.002** | 52 | 0.04 |
| **Total branch length per cell (µm)** | **1110 (990–1260)** | **800 (710–905)** | **< 0.0001** | 315 µm | 0.03 |
| **Endpoints per cell** | **81 (70–94)** | **58 (50–68)** | **0.001** | 23 | 0.03 |
| Sholl intersections (whole curve) | — | — | **0.002** (text) / **0.0002** (figure) | 2.29 | 0.003 |

Raw spread of individual cells (read off the plots):
- Soma area: about 150–1870 µm².
- Soma perimeter: about 33–185 µm.
- Branches: about 20–370.
- Total length: about 160–2570 µm.
- Endpoints: about 9–188.
- Db: about 1.17–1.78.

**Sholl curve (Fig 4k):**
- Intersections rise from about 6 at 5 µm.
- Control peaks at about **13–14 intersections near 30 µm**. Treatment peaks at about
  **11 near 25 µm**.
- Both fall to about 0 by about **90–100 µm**. The axis runs to 125 µm.

> ⚠️ **The Sholl p-value disagrees between text and figure.** The text says p = 0.002 (checked
> on the rendered page). The Fig 4k annotation says 0.0002.

**The aggregation claim, in the authors' numbers:**
- Whole-image skeleton effects (Fig 3c, d, f) were **67–93 % smaller** than the single-cell ones
  (Fig 4h–j).
- Averaging coverage per mouse made the effect **70 % smaller** than keeping each image.

### 5c. Things in these numbers to be careful about (our reading)

- **The soma areas are very large.** A mean of about **610 µm²** equals a disc about
  **28 µm across**. That is far bigger than the somata look in the figure panels at the printed
  scale bar (§7 and figures/README). The hand-drawn outlines in Fig 2f take in the thick proximal
  process trunks, not only the nucleus-containing body. **Do not use 600 µm² as a reference
  mouse soma size.** At best it is "soma plus proximal trunks, as drawn by this lab in DAB 2D
  projections". The paper's own pixel calibration is unknown (§3.7).
- **Branch and endpoint counts are skeleton artefacts as much as biology.** About **179
  branches** and **81 endpoints** per cell come from Analyze Skeleton on a thresholded DAB
  image. The skeleton has spurs and small loops (visible in Fig 1e/f). These are not counts of
  biological processes, and **primary process count is not reported at all**.
- **Whole-image and single-cell values disagree.** Whole-image **endpoints** per cell (≈ 119)
  are **higher** than single-cell (≈ 81), probably because loose fragments add endpoints.
  Whole-image **branches** (≈ 127) and **length** (≈ 610 µm) are **lower** than single-cell
  (≈ 179, ≈ 1110 µm). The paper does not explain this. Hand-reconnecting broken branches in
  single cells is a likely reason.
- **Units of coverage.** The Fig 3 axes say "(%)" but the values are 0.1–0.3 fractions. The text
  quotes Δ as 1.2 % and 3.5 %, which matches fractions × 100.

---

## 6. Microglial biology the paper states

- Microglia are the CNS's own immune cells. They constantly sample their surroundings and
  respond to injury or infection.
- **Ramified (non-inflammatory) state:** "highly ramified morphology with many sinuous branches
  stemming from a small cell body".
- **Reactive state:** after a pathological stimulus, microglia "rapidly change their morphology
  by **shortening their processes and enlarging their cell body**". This happens on a
  **continuum**, and the degree of de-ramification goes with the severity of the stimulus.
  "Amoeboid" appears only in a cited title. The paper does not define discrete classes.
- **Two hallmark features of reactivity:** decreased branching and increased soma size. Here,
  soma area and perimeter together with the single-cell skeleton picked up "even small changes".
- **Iba1** (ionized calcium-binding adapter molecule 1) is the standard microglial marker.
  Percent coverage assumes reactive microglia **express more Iba1**. The authors warn that
  coverage also rises with background and artefact, so it is not specific.
- **PLX5622** (a CSF1R inhibitor, named only by its compound code here) depletes microglia.
  After withdrawal they **repopulate**. In this design the repopulated, twice-LPS-challenged
  microglia had larger somata and fewer, shorter branches, i.e. a more reactive shape. **Cell
  numbers per field did not differ** (≈ 22 vs ≈ 22.5 per image, p = 0.60), so repopulation
  restored density within the 10-day window.
- **Regions:** retrosplenial, somatosensory and entorhinal cortex were pooled, with region as a
  random effect. **No region-by-region numbers are reported.** The paper says nothing about the
  **hippocampus** or about **CD68**.
- Other approaches mentioned but not used: **nearest-neighbour** spatial analysis of microglia
  (Davis et al. 2017), **3D reconstruction in Neurolucida** (branch length, number, soma size;
  Torres-Platas et al. 2014), the **cell-body-to-cell-size ratio** (Hovens et al. 2014), and
  transcriptomics (RNA-seq, NanoString).

---

## 7. Imaging scale, as measured from the figures (not stated in the paper)

The paper gives no pixel size. We measured the printed scale bars on the extracted figure images
(figure pixels, not native camera pixels):

| Panel | Bar (caption) | Bar measured | µm per figure-px | Panel size → field |
|---|---|---|---|---|
| Fig 1a (40× DAB field) | 100 µm | 147 px | 0.680 | 791 × 586 px → **≈ 538 × 399 µm** |
| Fig 1e (enlarged red box) | 25 µm | 167 px | 0.150 | 795 px wide → ≈ 119 µm |
| Fig 1c red box (in the Fig 1a scale) | — | 174 px | 0.680 | ≈ 118 µm. **Agrees with 1e within 1 %** |
| Fig 2a | 100 µm | 135 px | 0.741 | 904 × ≈ 745 px → ≈ 670 × 550 µm |
| Fig 5a (low-quality example) | 100 µm | 140 px | 0.714 | 802 px wide → ≈ 573 µm |

Caveats:
- The 1a and 1e bars agree with each other. However, a field about 0.54 mm wide is **not** what
  a 40× objective onto a 2/3-inch camera sensor normally gives (roughly 0.2 mm across). That
  expectation is ours; the paper states neither the sensor size nor the adapter. Either the
  figures are not full fields, or the printed bars are off. **Treat µm values taken from these
  figures as uncertain by up to about 2×.**
- With the printed bars, about 22 cells per field (§5a) is about **100 somata per mm² of section
  area**, counted through a 40 µm section (≈ 2.6 × 10³ per mm³). This is **our derivation**, not
  a published density. It carries the scale caveat above, and it uses only images selected for
  clearly visible somata.

---

## 8. Discussion arguments and the authors' limitations

- **Over-processing changes the answer.** Background inflates coverage. Thresholding to remove
  background trims branches, so cells look less ramified (more reactive). The same image can be
  pushed either way (Fig 5a–c).
- **Coverage carries no shape information.** A highly ramified cell and a large-soma
  sparsely-branched cell can both cover **5.6 %** of the frame (Fig 5d, e).
- **Do not compare coverage across stains or protocols.** The authors cite neuron work where
  the staining method biased morphology measurements.
- **Ecological fallacy / aggregation bias (Simpson's paradox).** Averaging per image or per
  animal changes the unit of inference and throws away information. Whole-image skeleton metrics
  turn into "properties of the field of view", not of cells.
- **Fractal analysis** is sensitive here: Db was the only fractal metric that changed, and it had
  the largest d. It is hard to interpret biologically.
- **Sholl** was developed for neurons, whose somata are more uniform. With microglia the first
  circle often touches a secondary branch, so short processes near the soma go uncounted. There
  is a trade-off between enclosing the whole soma and counting every branch. Part of Sholl's
  sensitivity here came from the spline-based mixed model, not the measurement itself.
- **Table 1, pros and cons as printed:**

| Method | Pros | Cons |
|---|---|---|
| Percent coverage | Quick; works for many stains | No morphological data; very sensitive to stain quality, background, protocol changes; averaging across images can introduce bias |
| Whole-image skeleton | Quick; some morphological data | Affected by stain quality and background; thresholding to correct background trims branches and alters morphology; averaging across cells in an image can introduce bias |
| Fractal analysis | Mathematical/geometric complexity measures; can focus on specific cells near an area of interest, or on other cell types | Time-consuming; interpretation needs mathematics/geometry knowledge |
| Individual skeleton + soma area/perimeter | Accurately detects morphological change; measures the hallmark features (soma size, ramification); quantitative measure of cell span; can focus on specific cells; easy to interpret | Time-consuming and labour-intensive |
| Sholl | Detects ramification changes; quantitative measure of cell span; can focus on specific cells | Assumes circularity and Euclidean distances; hard to place the first ring on a non-circular soma, so primary processes are missed and secondary processes are recorded as primary |

- **Conclusion:** single-cell analyses fit detailed morphology studies. Whole-image analyses may
  serve as rapid screens, with the aggregation-bias warning. The paper recommends combining
  methods.
- **Limitations the paper states or implies:**
  - All single-cell methods depend on manual isolation and are labour-intensive.
  - Only 3 cells per image were measured.
  - Only images with clearly visible somata were used.
  - Other techniques (nearest neighbour, 3D Neurolucida reconstruction, genetics) were not
    compared.

---

## 9. What is not in this PDF

- **No supplementary information.** The article has no SI section or MOESM files. Our fetch of
  the nature.com article page was redirected (303) to a login/cookie authorisation, so the
  publisher page could not be checked further.
- **Dryad data set:** https://doi.org/10.5061/dryad.j3tx95xhq. The dataset API
  (`https://datadryad.org/api/v2/datasets/doi%3A10.5061%2Fdryad.j3tx95xhq`) answered **200**:
  - Licence **CC0-1.0**, published 2022-10-31, 108 KB.
  - Files: `Perc_Coverage_Avg.csv` (896 B), `Perc_Coverage.csv` (6 052 B), `Sholl_Data.csv`
    (17 828 B), `Single_Cell.csv` (64 178 B), `README_Microglia_Morphology_updated.docx`
    (19 390 B).
  - **No whole-image skeleton file is listed, and no images are included.**
  - Downloads failed. `api/v2/files/<id>/download` returned **401** ("must have current bearer
    token"). `downloads/file_stream/1902206` returned **403**.
  - **Needs a human with a browser to download** `Single_Cell.csv` and `Sholl_Data.csv`. These
    hold the exact per-cell values behind §5b, which would replace the eye-read plot estimates.
- The Dryad record links a related dataset, doi:10.5061/dryad.tdz08kq2m, from the source sleep
  study (Rowe et al. 2022). Not fetched.
- **No code.** All processing was interactive ImageJ/Fiji. No macro was published.
- **No raw images.** The only images available are the five figures below.

---

## 10. Extracted images

All five are real figures (CC BY 4.0). The publication-date glyph (page 11) was dropped. Panel by
panel descriptions are in [`figures/README.md`](#figures).

| File | Figure | Content |
|---|---|---|
| `fig1_full-image-skeleton-pipeline.png` | Fig 1 | 40× DAB Iba1 field → binary → skeleton → tagged skeleton, with a 4.6× enlargement of one cell |
| `fig2_single-cell-methods.png` | Fig 2 | Field + binary with 3 selected cells; isolated cells under fractal, skeleton, soma outline and Sholl |
| `fig3_full-image-results.png` | Fig 3 | Coverage (per mouse vs per image) and whole-image skeleton results |
| `fig4_single-cell-results.png` | Fig 4 | Fractal, single-cell skeleton, soma and Sholl results |
| `fig5_thresholding-artefacts.png` | Fig 5 | Low-quality image binarised two ways (36.7 % vs 14.8 %); two cells with equal 5.6 % coverage |

---

## Figures

The figures are reproduced under the article's **CC BY 4.0** licence: © The Author(s) 2022,
https://doi.org/10.1038/s41598-022-23091-2. They were extracted unchanged from the PDF and
converted to PNG. The only image dropped is a text glyph ("Published online: 28 October 2022").

All photomicrographs are **brightfield DAB** Iba1 immunohistochemistry (brown on a grey-beige
background), from **mouse cortex** (retrosplenial, somatosensory or entorhinal; the figures do
not say which), in **40 µm** sections imaged with a **40× objective**. Our data is different:
fluorescent Iba1/CD68, 20× objective, hippocampus. In the DAB images, cells are **dark on
light**, where ours are bright on dark. Scale bars were measured on these extracted PNGs; see the
digest §7 for the caveat on absolute scale.

---

### Fig 1 — whole-image skeleton pipeline


- **(a)** A 40× Iba1 DAB field. The 100 µm bar is 147 px, so ≈ 0.68 µm per figure-px and the
  field is ≈ 538 × 399 µm.
  - **About two dozen somata** are visible, in line with the paper's mean of ≈ 22 per image.
    They are spaced fairly evenly, roughly one cell-span apart, with no clumping.
  - Each cell shows a **dark, compact soma** and about **4–8 thick primary processes**. These
    taper into finer, beaded, sinuous branches.
  - The **soma is not circular.** It merges smoothly into the thick proximal trunks, so where
    the soma ends is a judgement call. This is the "first Sholl ring" problem.
  - A cell's arbor reaches roughly 50–80 µm across at this scale.
  - **Neighbouring arbors touch and interdigitate at their tips.** No cell's processes clearly
    overlap a neighbour's soma, but the outer branches of adjacent cells often meet. In 2D you
    cannot tell which cell owns them.
  - There are many **faint, thin process fragments** with no visible parent soma. They are
    probably out of focus or come from cells in other planes of the 40 µm section.
  - The somata differ in darkness: some cells are crisp, others blurred or out of focus.
  - The background is uneven, with a darker grey patch at the left.
- **(b)** The same field after thresholding (black = Iba1+). The somata and thick trunks survive
  as solid blobs. The fine branches break into **many disconnected specks and short segments**.
  Arbors next to each other merge into continuous dark clusters (top right, centre). Scattered
  background specks are visible everywhere.
- **(c)** The skeleton of (b). Each cell becomes a tree, but there are **many isolated short
  fragments**, and the dense regions turn into **small looped meshes**. These come from
  skeletonising blobs, for example near the right edge and at the bottom right. The red box
  marks the region enlarged in (e).
- **(d)** The same skeleton tagged by Analyze Skeleton (on black: branches orange, junctions
  purple, endpoints blue-ish). It is too small at this size to read individual tags. The green
  box marks (f).
- **(e)** A 4.6× enlargement of the red box, about 118 µm wide. The 25 µm bar is 167 px, which
  agrees with (a)'s scale within 1 %.
  - One cell's skeleton has about **5 main limbs** from a central junction cluster, with
    secondary and tertiary branches.
  - It contains a **small loop** (right of centre).
  - There are **about 8–10 detached segments** near its tips: broken process pieces that the
    whole-image analysis counts as extra branches and endpoints.
- **(f)** The same region, tagged. Junction points are purple, branches orange, endpoints at the
  tips. **Thick orange runs** mark places where the skeleton is two pixels wide.

**For our algorithm:** even in a clean 40× field, thresholding breaks every cell's fine arbor
into pieces and fuses neighbouring arbors. Assigning fragments to cells is the core problem. At
20×, with fluorescent Iba1, the fine branches will be thinner still.

---

### Fig 2 — single-cell methods


- **(a)** Another 40× DAB field (lower JPEG quality). The 100 µm bar is 135 px (≈ 0.74 µm per
  figure-px; field ≈ 670 × 550 µm). Three **black squares** mark the randomly selected cells.
  The density and look of the cells match Fig 1a: about 20+ somata, ramified, with neighbouring
  arbors meeting.
  - The **top-left box contains two cells**: the selected one and a second soma at its lower
    left.
  - The box size was fixed for the whole study, about 95 µm at this scale. That box always
    **includes branches of neighbours**, which the authors removed by hand.
- **(b)** Binary version with the same boxes. Lots of speckle. The selected cells' arbors run
  into neighbours' fragments.
- **(c) Isolated microglia.** Three hand-cleaned binary cells:
  1. Top: a sprawling cell with long, beaded processes, mostly in one diagonal direction.
  2. Middle: a large dark central body with about 7–8 thick, short processes.
  3. Bottom: a cell with about 5 processes and an irregular body.

  The processes are **thick and blobby** in the binary image. These masks are what all the
  single-cell numbers were measured on.
- **(d) Fractal analysis.** Each cell's outline (grey double line) inside its **convex hull**
  (blue polygon) and **bounding circle** (magenta). The hull is a 4–6-sided polygon spanning the
  arbor.
- **(e) Individual skeleton analysis.** A thin skeleton of each cell, with about 5–7 main limbs
  and many short side branches. The **number of branches is much higher than the number of
  visible processes.**
- **(f) Cell body area & perimeter.** Hand-drawn green outlines around the soma. The outline
  takes in the **thick proximal trunks**, especially in the middle and bottom cells. This
  explains the large reported soma areas (≈ 600–750 µm²). The middle cell's outline covers most
  of its dark central mass.
- **(g) Sholl analysis.** Concentric circles (grey/lavender) centred on the soma, with a magenta
  radius drawn to the tip of the longest branch. The top cell has about 14 visible rings, the
  middle about 7, the bottom about 9. The **inner rings fall inside the irregular soma or cross
  the thick trunks**, which is the placement problem the authors describe.

No scale bar is drawn for (c)–(g). The caption applies the 100 µm bar to (a, b) only.

---

### Fig 3 — whole-image results


Each panel shows the model point estimate (black dot) with its 95 % CI (black bars) for Control
and Treatment, over grey dots for individual images or mice. Values read off the plots are in the
digest §5a.

- **(a)** Mean Iba1 coverage per mouse. About 0.17 vs 0.18; no bracket, n.s.
- **(b)** Coverage per image. About 0.16 vs 0.195; bracket "0.006". Raw values ≈ 0.07–0.29.
  The y-axis is labelled "(%)" but the scale is a fraction.
- **(c)** Mean microglial branch length (µm), about 610 vs 580, n.s. Per image ≈ 280–1300.
- **(d)** Mean endpoints per cell, about 119 vs 101; bracket "0.002".
- **(e)** Mean microglial cells per image, about 22 vs 22.5, n.s. **Integer counts from 10 to
  38** per 40× field. This is the paper's only cell-density information.
- **(f)** Mean branches per cell, about 127 vs 114, n.s. (p = 0.08).

---

### Fig 4 — single-cell results


Same layout as Fig 3, with dots for individual cells (n = 345 / 324).

- **(a)** Fractal dimension, about 1.49 vs 1.44; "<0.0001".
- **(b)** Lacunarity, about 0.36 vs 0.375, n.s. The distribution is skewed and floors near 0.2.
- **(c)** Circularity, about 0.80 vs 0.79, n.s. Values sit high (0.45–0.95), consistent with a
  hull-based measure rather than mask circularity.
- **(d)** Span ratio, about 1.53 vs 1.56, n.s. Range ≈ 1.0–3.5.
- **(e)** Density, about 0.080 vs 0.076, n.s. Range ≈ 0.01–0.17.
- **(f)** Cell body perimeter (µm), about 70 vs 84; "0.002".
- **(g)** Cell body area (µm²), about 610 vs 760; "0.01". Cells range ≈ 150–1870.
- **(h)** Branches per microglia, about 179 vs 127; "0.002". Range ≈ 20–370.
- **(i)** Total branch length (µm), about 1110 vs 800; "<0.0001". Range ≈ 160–2570.
- **(j)** Endpoints per microglia, about 81 vs 58; "0.001". Range ≈ 9–188.
- **(k)** Sholl: mean intersections against distance from the cell body (0–125 µm). Light grey =
  Control, dark = Treatment, with a fitted spline and band, and dots per mouse and distance.
  - Control peaks at about 13–14 near 30 µm; Treatment at about 11 near 25 µm.
  - Both reach about 0 by 90–100 µm.
  - The legend bracket says **"0.0002"**, but the text says p = 0.002.

---

### Fig 5 — how processing changes the result


- **(a) "Low stain/photomicrograph quality."** A darker, purplish-brown DAB field. The 100 µm
  bar is 140 px (≈ 0.71 µm per figure-px; field ≈ 573 µm wide).
  - About 25–30 **dark round somata** stand out clearly.
  - The processes are faint and low-contrast against a **mottled, textured background** of
    similar hue.
  - The red box marks a region shown again in (b) and (c).

  This is the image type where a soma detector would still work but process tracing would not.
- **(b) "Change to binary" → "Overrepresentation of branches/coverage", 36.7 %.** The background
  texture binarises into a dense black network. The cells are lost inside it.
- **(c) "Change to binary & threshold" → "Underrepresentation of branches/coverage", 14.8 %.**
  The somata survive as blobs, but most processes are gone, leaving short stubs and specks. The
  cells look **amoeboid/reactive** purely because of the threshold.
- **(d)** An isolated, highly ramified cell (binary). Small soma, about 6–8 long, beaded,
  branching processes. **5.6 % coverage.**
- **(e)** An isolated reactive-looking cell. A large, solid, rounded body with about 4–5 short,
  stubby processes. **Also 5.6 % coverage.**

  (d) and (e) show that coverage cannot tell a ramified cell from a reactive one. Together they
  are a compact visual reference for the two ends of the morphology continuum.
