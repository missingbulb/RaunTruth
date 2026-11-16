# Reference digest — Young & Morrison 2018, microglia morphology in ImageJ (skeleton + fractal)

> Self-contained digest of the source paper. The method, every stated setting, the metric
> definitions, every reported number and a panel-by-panel description of every figure are here
> and in [`figures/README.md`](#figures). **No need to reopen the PDF.**
> The licence forbids derivatives, so **neither the PDF nor any figure is committed** (§9).

- **Title:** *Quantifying Microglia Morphology from Photomicrographs of Immunohistochemistry
  Prepared Tissue Using ImageJ*
- **Authors:** Kimberly Young, **Helena Morrison\*** (\*corresponding,
  h.morrison@arizona.edu). College of Nursing, University of Arizona.
- **Venue / id:** *Journal of Visualized Experiments* (JoVE) **136**, **e57648**, published
  5 June 2018. Article type: **Video Article** (a protocol with a companion video). 9 pages.
  DOI **10.3791/57648**. Article/video URL: https://www.jove.com/video/57648
- **PDF:** kept in the study's Drive `Literature` folder as `Quantifying Microglia Morphology from Photomicrographs of Immunohistochemistry Prepared Tissue Using ImageJ.pdf`, not in the repo.
- **Licence (as printed in every page header):** "Copyright © 2018 Creative Commons
  Attribution-NonCommercial-NoDerivs 3.0 Unported License" — **CC BY-NC-ND 3.0**.
- **Funding:** NINR F32NR013611. Authors declare nothing to disclose.
- **One-line thesis:** a fixed sequence of stock ImageJ filters turns an Iba1 photomicrograph
  (fluorescent or DAB) into a binary and a skeleton good enough that **AnalyzeSkeleton(2D/3D)**
  gives field-level *endpoints/cell* and *process length/cell*, and the same binary, hand-cleaned
  per cell, feeds **FracLac** for single-cell fractal dimension, lacunarity, density, span ratio
  and circularity.

---

## 1. Why this matters to *our* task

Our target: find **every** microglia cell in Iba1 (488 nm) images of mouse hippocampus, 20×,
Olympus slide-scanner 3D data, and measure each cell's geometry (process count, branching,
volume, soma size, territory). This paper is the de-facto baseline that most microglia
morphology papers cite, so it defines what reviewers will expect our numbers to be comparable to.

| What it gives us | What it means for what we build |
|---|---|
| **A concrete, fully-parameterised 2D preprocessing chain** (Greys LUT → B/C → Unsharp Mask r=3, w=0.6 → Despeckle 3×3 median → threshold → Despeckle → Close → Remove Outliers bright r=2 thr=50 → Skeletonize → AnalyzeSkeleton). | A ready-made **naive baseline** to beat (research-project §11). Every step is a stock ImageJ op with a direct scikit-image / SciPy equivalent, so it can be reimplemented in our lightweight Python stack and run on our images on day one. |
| **The two standard ramification metrics: endpoints/cell and summed process (branch) length/cell.** | These are what "number of processes" and "branching" usually mean in the literature. But note they are **field-level** quantities: whole-image skeleton totals **divided by a soma count** — not per-cell measurements. Our per-cell goal is strictly stronger; we can report the field-level version too for comparability. |
| **The skeleton QA criterion:** a soma must skeletonize to a **single origin point** with processes radiating from it, *not* a closed loop ("circular soma"). | A testable property for our skeletoniser: count skeleton cycles inside each detected soma; any cycle is a defect. Circular somas inflate junction/branch counts. Fill the soma (or skeletonize a soma-filled mask) before skeletonizing. |
| **Noise inflates endpoints massively.** Without the cleanup chain, endpoints/cell came out ~2× higher (≈400 vs ≈180 uninjured, read off Fig 4E/F) with larger error bars, and the injury effect lost significance. | Endpoint counts are **dominated by fragment/speckle handling**. Our fragment-pruning rule must be explicit, scale-free where possible, and reported; a raw endpoint count is not trustworthy. |
| **Inter-user variability is large and systematic** (Fig 5): two trained users, same images, same protocol → User 2 ≈ 20–25 % higher on both metrics (read off the bars). The steps they flag as most user-dependent are **brightness adjustment and threshold choice**. | The case for an automated, fixed-parameter method is made in the paper itself. It also says a *published* endpoints/cell value carries ±20 % operator noise before any biology. Do not tune to match one paper's absolute numbers. |
| **FracLac single-cell metrics** with their outputs for four example cells (Fig 6G): D_B 1.30–1.45, λ 0.41–0.69, density 0.036–0.049, span ratio 1.08–1.22, circularity 0.76–0.90. | Shape descriptors we can compute per cell from our own masks (convex hull, bounding circle, box-counting). The values are **2D, cropped single cells, unstated pixel size**, so they are order-of-magnitude anchors only. |

**What it does *not* give us:**

- **No cell detection at all.** The soma count used as the per-cell denominator is obtained by an
  unstated method (presumably manual counting). Single cells for FracLac are **randomly picked by
  hand** and **isolated by hand with a paintbrush** (removing neighbours' processes, joining
  fragments). The hard part of our task — separating touching cells and assigning processes to
  somas — is done by a human here.
- **No 3D.** Z-stacks are **max-intensity-projected** to 2D before everything. "Volume" is not
  measured; the authors only say solidity/convexity/form factor "may be possible if generating 3D
  shapes". AnalyzeSkeleton itself is 3D-capable but is used on 2D projections here.
- **No soma size, no territory area, no process count per cell.** "Territory" exists only
  indirectly as FracLac's convex hull / bounding circle on hand-isolated cells.
- **No CD68**, no hippocampus (figures are cortex), no 20× example (they recommend 40×/63× for
  detail and image with "20X objective or greater").
- **No ground truth, no accuracy validation.** Validity is argued visually (skeleton overlaid on
  the photo) and by statistical sensitivity (Fig 4), not by agreement with annotated cells.

---

## 2. Tissue, staining and imaging (protocol §1–3)

| Step | Stated settings |
|---|---|
| Fixation | Brain into 10 mL vial with 5 mL **4 % PFA**, **24 h at 4 °C**. |
| Cryoprotection | Rinse, then 5–10 mL **30 % sucrose** in PBS (0.01 M), **72 h at 4 °C**. Store at −80 °C (cryostat) or 4 °C (microtome). |
| Sectioning | Cryostat or microtome, coronal or sagittal; free-floating in cryoprotectant (50 mM PBS, ethylene glycol, glycerol) at −20 °C. **Tested on 50–200 µm sections.** < 50 µm "may not capture the full span of microglia processes"; thick sections risk poor antibody penetration. Not tested on paraffin. |
| Block | ≤ 15 mouse sections per 4 mL glass vial; 1 mL of up to 10 % horse serum, PBS 0.01 M, 0.5 % Triton, 0.04 % NaN3, 1 h, room temperature (23 °C). |
| Washes | 3 × 5 min PBS 0.01 M, RT, between every step. |
| Primary | **Iba1 1:1,000**, RT, **72 h**, 1 mL PBS 0.01 M + 0.5 % Triton + 0.04 % NaN3, covered. |
| Secondary | **Anti-rabbit 488, 1:250**, covered, RT, **4 h**, same buffer. |
| Mounting | Subbed slides, **soft-set** mounting medium (high viscosity, does not compress tissue — "best retains the morphology" vs hard-set); **#1.5 coverslip** for confocal; store at 4 °C. |
| Microscope | Bright-field or **confocal with z-stack**, **20× objective or greater**; "excellent process detail" at **40× or 63×**. Imaging settings constant across the experiment. |
| Bit depth | **Acquire 8-bit**; "conversion of files to 8-bit post-acquisition may distort the data collection". |
| Z-stack | **At least 30 µm** depth, **≤ 2 µm** step; more depth / finer step gives more detail at the cost of time. "Use Nyquist sampling where possible." |
| Export | Save TIFF; in ImageJ **Image › Color › Split Channels**, then **Image › Stacks › Z Project › Maximum Intensity Projection** "where appropriate"; save TIFF. |

Fluorescent IHC "yields superior visualization of cell processes" compared with DAB.

---

## 3. Skeleton analysis, step by step (protocol §4)

Section numbering as in the text. **Caution:** the figures (Fig 2, Fig 3) and the Discussion
label the same steps **one lower** (figure "4.1 Grayscale" = text step 4.2; Discussion's
"step 4.2 (increasing image brightness)" and "step 4.5 (determining the threshold)" = text steps
4.3 and 4.6).

| Text step | Operation (ImageJ menu) | Stated settings / notes |
|---|---|---|
| 4.1 | Install Fiji/ImageJ, **AnalyzeSkeleton(2D/3D)** (Arganda-Carreras 2010) and **FracLac** (Karperien). | Whole conversion to a skeleton "takes less than 1 min". |
| 4.2 | Fluorescence: ensure **8-bit**, apply **Image › Lookup Tables › Greys**. DAB bright-field: first **Process › FFT › Bandpass Filter**, then greyscale. | FFT bandpass at **ImageJ defaults: filter large structures down to 40 px, small structures up to 3 px, no stripe suppression**. Removes small features / tissue cracks. |
| 4.3 | **Image › Adjust › Brightness/Contrast** if too dim. | Move min/max sliders "up to the edges of the histogram but no further". Fluorescence: use the **max** slider; DAB: the **min** slider. Authors note B/C changes the LUT, not pixel values (but the subsequent filters/threshold act on the displayed result once applied). Ideally a fixed slider value (0–255) for all images and users. |
| 4.4 | **Process › Filters › Unsharp Mask** | **ImageJ defaults: radius (sigma) = 3 px, mask weight = 0.6.** Optional "if contrast is adequate". |
| 4.5 | **Process › Noise › Despeckle** | **3 × 3 median** filter, removes salt-and-pepper noise created by the unsharp mask. |
| 4.6 | **Image › Adjust › Threshold** → binary | Method **not specified in the step** (manual / ImageJ default). Discussion: the default is "more variable"; for bright, high-contrast images skip step 4.3 and **standardise with a fixed automatic method, e.g. Huang**. |
| 4.7.1 | **Process › Noise › Despeckle** on the binary | Removes remaining single-pixel noise. |
| 4.7.2 | **Process › Binary › Close-** | Authors: "connects two dark pixels if they are separated by up to 2 pixels" (Binary Options iterations/count not stated, i.e. defaults). |
| 4.7.3 | **Process › Noise › Remove Outliers** | **Bright** outliers, **radius = 2 px**, **threshold = 50**: a pixel is replaced by the local median if it deviates by more than the threshold. |
| 4.8 | Save the binary (needed for fractal analysis), then **Process › Binary › Skeletonize**. | — |
| 4.9 | **Plugins › Skeleton › Analyze Skeleton**, tick **"Branch information"**. | Outputs a tagged skeleton image, the **Results** table (one row per skeleton = connected component: #branches, #junctions, #end-point voxels, #junction voxels, #slab voxels, average branch length, #triple points, #quadruple points, maximum branch length) and the **Branch information** table (one row per branch, incl. branch length). |
| QA | Overlay skeleton on original. | **Somas must be single origin points with processes emanating from the centre; circular somas "confound the data and should be avoided through protocol adjustment"** (Fig 1). Expect to add/remove steps per dataset. |
| 4.10 | Copy Results + Branch information into Excel. | — |
| 4.11.1 | Duplicate the workbook as "…TRIM" — keep raw output untouched. | — |
| 4.11.2 | Choose a **fragment cutoff** by measuring several fragments with the Line tool in the skeleton image. | **Cutoff used here = 0.5** (unit not given; see gaps). Must be constant across a dataset. |
| 4.11.3 | Sort Results by **"endpoint voxels"** (desc), then **"Mx branch pt"** [maximum branch length] (desc). | — |
| 4.11.4 | **Delete every row with 2 endpoints and maximum branch length < cutoff.** **Sum the endpoints column** = total endpoints in the image. | I.e. drop isolated single-segment fragments shorter than the cutoff. |
| 4.11.5 | Branch information: sort by branch length, **delete every branch shorter than the cutoff**, **sum branch length** = total process length in the image. | — |
| 4.11.6 | Repeat per image. | — |
| 4.11.7 | **endpoints/cell = summed endpoints ÷ number of microglia somas in the image; process length/cell = summed branch length ÷ number of somas.** | Convert pixels → µm if needed. How the soma count is obtained is **not stated**. |

Troubleshooting table, as printed:

| Problem | Fix |
|---|---|
| Image too dim | Greyscale, B/C sliders, and/or Unsharp Mask |
| Too much background | B/C sliders, Despeckle, and/or Remove Outliers |
| Circular somas in skeleton (esp. fluorescence) | FFT Bandpass and/or Unsharp Mask |
| Tissue cracks (esp. bright-field) | FFT Bandpass and/or Despeckle |

Discussion adds: Dilate or Sharpen may be swapped in; optimise and **freeze** the protocol on a
set containing both cases and controls before collecting data; whole-image analysis may also be
restricted to a multi-cell ROI.

---

## 4. Fractal analysis, step by step (protocol §5)

Uses the binary from steps 4.1–4.7 (i.e. before skeletonizing).

| Step | Operation | Stated settings / notes |
|---|---|---|
| 5.1 | Draw a **fixed-size rectangular ROI** large enough for a whole cell; same size for the whole dataset. | Rectangle, not freehand: FracLac results are scale-dependent, and a freehand ROI gets auto-scaled into different windows. ROI size **not stated**. |
| 5.2 | **Randomly** select cells (random number generator + numbered grid); ROI Manager › Update to lock; **Ctrl+Shift+D** to duplicate the ROI from both the photo and the binary; save. | Number of cells per image/animal **not stated** ("a sufficient number"). |
| 5.3 | On the binary crop, **paintbrush** (black foreground; Alt for white) to **remove adjacent cells' processes, connect fragmented processes, isolate the cell**, using the photo as reference. | Fully manual. |
| 5.4 | **Process › Binary › Outline.** | FracLac accepts filled or outline shapes; "current convention is to use shape outlines". |
| 5.5 | **Plugins › Fractal Analysis › FracLac**, mode **BC** (box counting); Grid Design **Num G = 4**; Graphics options: tick **Metrics** (convex hull + bounding circle). | Num G = number of grid orientations; recommended **4–12**; higher is slower. Other FracLac settings at defaults (not listed). |
| 5.6 | **Scan.** | Produces Hull and Circle Results, Box Count Summary File, Scan Types (log; unused). |
| 5.7 | From Hull and Circle Results take **density, span ratio, circularity**; from Box Count Summary take **fractal dimension (D_B)** and **lacunarity (λ)**. | Full definitions deferred to the FracLac manual. |

---

## 5. Metric definitions — exactly as the paper gives them

| Metric | Paper's wording | Notes for us |
|---|---|---|
| **Ramification** | "commonly defined as a complex shape having multiple processes and is often reported as the number of endpoints per cell and the length of cell processes". | — |
| **Endpoints/cell** | Sum of AnalyzeSkeleton end-point voxels over all retained skeletons in the image ÷ number of somas in the image. | Field average, not per cell. Includes endpoints of fragments belonging to out-of-frame cells. |
| **Process length/cell** | Sum of AnalyzeSkeleton branch lengths ≥ cutoff in the image ÷ number of somas; µm. | Total skeleton length per soma — includes intra-soma skeleton. |
| **Density** (FracLac) | "describe[s] the size … of the cell outline". | In FracLac: foreground pixels ÷ convex-hull area (manual definition, not restated in this paper). |
| **Span ratio** (FracLac) | describes "elongation". | FracLac: ratio of the convex hull's major to minor axis. |
| **Circularity** (FracLac) | describes "shape". | FracLac: 4π·area/perimeter² of the convex hull. |
| **Fractal dimension D_B** | summarises "cell complexity"; box-counting. | — |
| **Lacunarity λ** | summarises "shape heterogeneity". | — |

The FracLac formulas in the "notes" column are the FracLac manual's definitions as we know them,
**not** from this PDF and not re-checked against the manual in this intake; the paper only gives
the one-word interpretations quoted.

---

## 6. Reported numbers

All rodent **cortex**; the injury model, species and microscope behind the figures are **not
stated** in this paper (the reference list points to the authors' rat diffuse brain injury
(Morrison 2017, ref 7) and mouse stroke (Morrison & Filosa, refs 8, 14) work). Bar-chart values
below were **read off the plots** (low-resolution JPEG; ±~5 % of axis span) — the paper prints no
numeric table for them.

### 6.1 Fig 4 — with vs without the protocol (fluorescence, n = 3, Student's t-test)

Plotted as mean with an upward error bar (SEM or SD not stated).

| Metric | Group | **With protocol (4E)** | **Without protocol (4F)** |
|---|---|---|---|
| Endpoints/cell | Uninjured | ≈ 180 | ≈ 405 |
| Endpoints/cell | Injured | ≈ 115 | ≈ 270 |
| Endpoints/cell | test | **p < 0.01** | n.s. (no mark) |
| Process length/cell (µm) | Uninjured | ≈ 610 | ≈ 505 |
| Process length/cell (µm) | Injured | ≈ 400 | ≈ 380 |
| Process length/cell (µm) | test | **p < 0.01** | n.s. (no mark) |

Axes: endpoints 0–500, length 0–800 µm. The caption says "with (E) and without (F)", matching
the panel titles; the Results text says "data summarized in Figure 4F are less variable than
those in Figure 4E", which contradicts the plotted error bars (E's are smaller) — **the text has
E and F swapped**.

### 6.2 Fig 5 — inter-user variability (DAB, n = 3, ANOVA)

Same images, same protocol, two briefly trained undergraduates. Read off the plots:

| Metric | Group | User 1 | User 2 |
|---|---|---|---|
| Endpoints/cell | Uninjured | ≈ 81 | ≈ 102 |
| | Injured region 1 | ≈ 56 | ≈ 72 |
| | Injured region 2 | ≈ 46 | ≈ 58 |
| | Injured region 3 | ≈ 66 | ≈ 81 |
| Process length/cell (µm) | Uninjured | ≈ 218 | ≈ 265 |
| | Injured region 1 | ≈ 170 | ≈ 203 |
| | Injured region 2 | ≈ 130 | ≈ 155 |
| | Injured region 3 | ≈ 194 | ≈ 225 |

Significance marks as drawn — User 1 endpoints: U vs R1 \*\*, U vs R2 \*\*\*, U vs R3 \*,
R2 vs R3 \*; User 1 length: U vs R2 \*\*, R2 vs R3 \*. User 2 endpoints: U vs R1 \*, U vs R2 \*\*\*,
R2 vs R3 \*; User 2 length: U vs R1 \*, U vs R2 \*\*, R2 vs R3 \*. (\* p < 0.05, \*\* p < 0.01,
\*\*\* p < 0.001.) Same direction of effects, different absolute values and different
significance pattern.

Note the **~2–3× gap between Fig 4 (fluorescence: ≈ 180 endpoints, ≈ 610 µm per uninjured cell)
and Fig 5 (DAB: ≈ 80–100 endpoints, ≈ 220–265 µm)**. The paper does not comment on it; it is
consistent with its own statement that magnification, microscope and stain change detail and
cell count per frame. Absolute values do not transfer between setups.

### 6.3 Fig 6G — FracLac on four single cells (printed numbers, exact)

| Cell | D_B | λ | Density | Span ratio | Circularity |
|---|---|---|---|---|---|
| Uninjured, without protocol | 1.3733 | 0.6186 | 0.0384 | 1.217 | 0.8972 |
| Uninjured, **with** protocol | **1.4526** | **0.408** | **0.0487** | **1.1791** | **0.8853** |
| Injured, without protocol | 1.3008 | 0.6905 | 0.0362 | 1.1695 | 0.7672 |
| Injured, **with** protocol | **1.4054** | **0.4217** | **0.0471** | **1.0799** | **0.7631** |

One cell each — illustrative, no statistics. The protocol raises D_B by ~0.08–0.10 and lowers λ
by ~0.2 on the same cell, i.e. **preprocessing moves FracLac outputs by more than the
injured-vs-uninjured difference** shown here.

### 6.4 Other quantities stated

- Fragment cutoff 0.5 (unit unstated).
- Leica SP II at 40× gives "twice the number of cells and less detail" than a Zeiss 880
  (objective for the Zeiss unstated) — the field of view differs between microscopes at nominal
  equal magnification.
- Fig 6A: by our own measurement of the drawn 10 µm bar (≈ 37–38 px in the 700-px-wide JPEG),
  the panel is ≈ 87 µm square and the central uninjured cell's processes reach roughly the panel
  edges — **rough, measured off a JPEG of a printed figure; not an author number**.

---

## 7. Microglial biology worth keeping

- Microglia are brain phagocytes that continuously survey the parenchyma; they respond to
  physiology changes along a continuum from **hyper-ramified / highly complex** to
  **de-ramified / amoeboid**, and can become **polarised, rod-shaped**.
- Ramification differences can be **subtle** (epilepsy, concussion) as well as gross (stroke);
  quantitative continuous measures are needed to resolve them.
- In the injured examples (Fig 6B) cells have **larger, brighter, elongated somas** and **fewer,
  thicker, shorter processes**; in uninjured tissue (Fig 6A) a small soma with many thin,
  long, branched processes that tile the field.
- Microglia morphology is a proxy for function; multivariate / cluster analysis across many
  parameters (refs 12, 21) is the suggested way to stratify morphotypes.
- Tissue must not be flattened during storage — it "irrevocably alters microglia morphology".
  Sections < 50 µm may truncate the processes.

---

## 8. Authors' own limitations and cautions

- Cannot rescue poor IHC or microscopy (low contrast, blur, distortion).
- Same scale and **same microscope** within an experiment; different systems give different
  frame sizes and cell counts at the same nominal objective.
- **User influence:** brightness (text 4.3) and threshold (text 4.6) are the most variable
  steps; fix numeric values, or use an automatic threshold (Huang). One trained user should do a
  whole dataset; expert oversight reduces variability.
- Whole-field skeleton rendering is "imperfect" compared with the single-cell approach.
- Region analysis is **inappropriate when morphologies differ drastically within one field**.
- The skeleton metrics **depend on cell count**, which itself may differ between conditions.
- Fractal analysis is slow (manual isolation) but "less subject to inter-user variability"
  (asserted, **not assessed**).
- Method is **2D**; 3D shape descriptors (solidity, convexity, form factor) only "may be
  possible".
- Not tested on paraffin sections.

### Parameters NOT stated anywhere in the PDF

- Threshold method/value used for the presented data (only "Image › Adjust › Threshold"; Huang
  suggested as an alternative).
- Brightness/contrast slider values.
- **Unit of the 0.5 fragment cutoff** (pixels vs µm — AnalyzeSkeleton reports calibrated units if
  the image is calibrated; 0.5 px would remove nothing meaningful, so likely µm or a calibrated
  unit, but this is our inference).
- **How somas are counted** for the per-cell denominator (manual? which criteria? cells cut by
  the image border?).
- Pixel size / µm per pixel, image dimensions, microscope models and objectives for the figures,
  z-range actually acquired, whether MIP was used for the figures.
- Species, region detail and injury model for Figs 4–6; what n = 3 counts (animals? images?);
  number of images and cells per animal; whether bars are SEM or SD.
- Close- iterations/count; AnalyzeSkeleton prune options (cycle pruning, end-branch pruning) —
  only "Branch information" ticked is mentioned.
- FracLac ROI size, number of cells analysed per group, other FracLac options beyond BC,
  Num G = 4 and Metrics.
- Iba1 antibody source/host (implied rabbit by the anti-rabbit secondary), section thickness used
  for the figures.

---

## 9. What is not in this PDF

- **Companion video** at https://www.jove.com/video/57648/ (redirects to
  https://www.jove.com/t/57648). Fetched 2026-11-15 with curl: HTTP **202 with an empty body**
  (bot challenge) — video and page not retrievable from this environment. The video likely shows
  the slider choices and threshold being set by hand; nothing in it is transcribed here.
- **Materials list** (JoVE normally publishes a "Table of Materials" on the web page): not in the
  PDF; not retrieved (same 202).
- **"Please click here to view a larger version of this figure"** links: higher-resolution
  figures exist on the JoVE site only; the PDF embeds each figure at 700 px width. Not retrieved.
- **FracLac manual** (https://imagej.nih.gov/ij/plugins/fraclac/FLHelp/Introduction.htm): holds
  the actual definitions of density, span ratio, circularity, D_B and λ; not fetched for this
  intake.
- **Licence:** CC BY-NC-ND 3.0 forbids derivatives, and this repository is public — so the PDF
  and the figures are **not committed**; they are described in
  [`figures/README.md`](#figures) instead.

---

## 10. Extracted images

Six figure JPEGs (700 px wide) are embedded in the PDF (plus the JoVE logo, ignored). None is
committed (licence). Descriptions: [`figures/README.md`](#figures).

| Fig | PDF page | Embedded size (px) | Content | Committed |
|---|---|---|---|---|
| 1 | 5 | 700 × 281 | Circular vs single-origin soma skeleton; overlay on Iba1 fluorescence | no (CC BY-NC-ND) |
| 2 | 5 | 700 × 273 | Skeleton protocol, step by step, fluorescence | no |
| 3 | 5 | 700 × 219 | Skeleton protocol, step by step, DAB bright-field | no |
| 4 | 6 | 700 × 364 | Field image, crop, binary/skeleton with vs without protocol, bar charts | no |
| 5 | 6 | 700 × 288 | Two users' binaries/skeletons and bar charts (DAB) | no |
| 6 | 7 | 700 × 1170 | Uninjured vs injured single cells → binary, outline, hull/circle, box counting, FracLac values | no |

---

## Figures


The article is licensed **CC BY-NC-ND 3.0** (printed in every page header). That licence forbids
derivatives, and this repository is public, so **no image and no PDF is committed**. Each figure
is described here panel by panel instead. The PDF embeds every figure as one JPEG, **700 px wide**
(low resolution; the JoVE site links "larger versions", not retrieved — see digest §9). Every
scale bar in the paper is **10 µm**; the caption gives no pixel size.

**Step-number offset:** the panel labels in Figs 2 and 3 use step numbers **one lower** than the
protocol text (panel "4.1 Grayscale" = text step 4.2, "4.5 Binary" = text 4.6, "4.7 Skeletonize"
= text 4.8, "4.8 Tagged skeleton" = text 4.9). Labels below are quoted as printed.

---

### Figure 1 — circular vs single-origin soma (PDF p. 5, 700 × 281)

Three square panels in a row.

- **"Circular Soma"** — a black-on-white skeleton of one ramified cell; a **red circle** marks the
  soma, where the skeleton forms a **closed loop** around the cell body (labelled suboptimal).
- **"Single Origin Soma"** — the same cell's skeleton with a **green circle** at the soma, where
  the processes converge on one point/short star with no loop (optimal). The two skeletons look
  almost identical outside the soma — the difference is only the few pixels at the centre.
- **"Overlay"** — the skeleton in **red** over the Iba1 fluorescence (green on black). One cell
  centred: a bright, roughly triangular soma, ~6–8 primary processes that branch repeatedly into
  fine, tortuous terminal twigs; the skeleton follows processes to their tips. Fragments of
  neighbouring cells' processes are visible at the panel edges, unskeletonized. Scale bar 10 µm
  (white, bottom right); the cell's arbor spans several bar lengths.

What it means for us: skeletonizing a filled soma without care produces a loop; a loop inside
the soma is a detectable defect.

### Figure 2 — skeleton protocol on a fluorescence image (PDF p. 5, 700 × 273)

Two rows of panels; each panel shows the whole field with a **single cell enlarged** as an inset
in its top-left quadrant (a white frame), red 10 µm bars in both the inset and the field.

- **Original Image** — Iba1 (green on black). Roughly **15–20 microglia** in the field, evenly
  spaced, each with a compact bright soma and a star of processes; processes of neighbours come
  close to each other but cells are mostly separable by eye.
- **4.1 Grayscale**, **4.2 Brightness/Contrast**, **4.3 Unsharp Mask**, **4.4 Despeckle** — white
  on black; each step brightens fine processes and makes the background more uniform. After B/C
  the somas saturate white.
- **4.5 Binary**, **4.6.1 Despeckle**, **4.6.2 Close**, **4.6.3 Remove Outliers** — black cells on
  white. Somas are solid black blobs, processes thick black lines; the binary visibly merges
  neighbouring processes in places, and speckle is progressively reduced. Differences between the
  four binary panels are small at this resolution.
- **4.7 Skeletonize** — thin grey skeleton on white; every cell becomes a tree, with small
  isolated fragments around.
- **4.8 Tagged skeleton** — AnalyzeSkeleton output on black (branches/endpoints/junctions in
  colour); at 700 px almost nothing is legible.

### Figure 3 — skeleton protocol on a DAB bright-field image (PDF p. 5, 700 × 219)

Same layout as Fig 2, red 10 µm bars, inset of one cell top-left.

- **Original Image** — brown DAB-stained microglia on a pale blue-grey background; ~15 cells,
  dense dark somas, brown processes.
- **4.1 FFT Bandpass Filter** — background flattened, cells become more orange.
- **4.1 Grayscale**, **4.2 Brightness/Contrast**, **4.3 Unsharp Mask**, **4.4 Despeckle** — dark
  cells on light grey; contrast rises step by step.
- **4.5 Binary**, **4.6.1 Despeckle**, **4.6.2 Close** — black cells on white; somas and proximal
  processes are heavier and blobbier than in the fluorescence case. **No "Remove Outliers"
  panel** for DAB.
- **4.7 Skeletonize** — grey skeletons; **4.8 Tagged Skeleton** — on black, illegible at this size.

### Figure 4 — with vs without the protocol (PDF p. 6, 700 × 364)

- **A** — fluorescence Iba1 field (green on black), **~20–25 microglia** evenly tiling the field,
  each with distinct soma and radiating processes; yellow box marks the cell enlarged in B. Red
  10 µm bar. Cells' territories abut but seldom overlap heavily.
- **B** — the enlarged cell: a bright soma with **~6–8 primary processes** branching into many
  thin secondary/tertiary branches; neighbouring somas visible at the top edge. Red 10 µm bar.
- **C "WITH PROTOCOL"** — binary (left) and skeleton (right) of the B crop: solid soma, connected
  thick processes; skeleton is a clean tree with modest speckle.
- **D "WITHOUT PROTOCOL"** — binary has many small specks and broken processes; the skeleton is
  dense with tiny fragments everywhere — the source of the inflated endpoint counts.
- **E (with protocol)**, **F (without protocol)** — bar charts of endpoints/cell (axis 0–500) and
  process length/cell (µm, axis 0–800), uninjured (white) vs injured (grey); values transcribed
  in digest §6.1. ** (p < 0.01) on both E charts, none on F.

### Figure 5 — inter-user variability (PDF p. 6, 700 × 288)

- **Original Image** (left) — DAB bright-field field (brown cells on pale background) with one
  cell circled and enlarged in an inset; red 10 µm bars.
- **Binary / Skeleton × User 1 / User 2** — four panels, each with the same cell inset. **Coloured
  circles (red, dark blue, orange, light blue)** mark the same locations in both users' insets
  where the binaries/skeletons differ — processes joined or broken, a branch present for one user
  and missing for the other. The differences are local and small-looking but change counts.
- **Bar charts** for User 1 and User 2: endpoints/cell (axis 0–150) and process length/cell (µm,
  axis 0–300) for Uninjured (black) and Injured Regions 1–3 (greys); values and significance marks
  transcribed in digest §6.2.

### Figure 6 — fractal analysis (PDF p. 7, 700 × 1170)

- **A "Uninjured"** — fluorescence crop (green on black), white 10 µm bar bottom right. One
  central cell with a small, moderately bright soma and **many thin, long, wavy processes**
  reaching toward the panel edges; parts of 2–3 neighbouring cells at the borders, whose
  processes interdigitate with the central cell's. Fine punctate background. By our measurement
  of the bar (≈ 37–38 px = 10 µm) the panel is ≈ 87 µm across — rough, off a JPEG.
- **B "Injured"** — same framing, white 10 µm bar. **Four or five cells with large, bright,
  elongated/irregular somas** and fewer, **thicker, shorter** processes; cells crowd closer
  together than in A.
- **C** — binary of the isolated central cell, "Without Protocol" / "With Protocol", for A then B.
  Without the protocol the processes are broken into dots and short dashes; with it they are
  continuous and the arbor is complete.
- **D** — the same cells as **outlines** (Process › Binary › Outline).
- **E** — outlines with **convex hull (blue polygon)** and **bounding/enclosing circle (pink)**.
  The hull of the uninjured cell is roughly pentagonal; the injured cell's is a narrower
  triangle-like shape.
- **F** — three stacked thumbnails per cell showing **box-counting grids** at different box sizes
  (grid lines in pink/red over the outline).
- **G** — the FracLac numbers for each of the four columns (D_B, λ, density, span ratio,
  circularity); transcribed exactly in digest §6.3.

#### What microglia look like at these magnifications

Objectives and pixel sizes for the figures are not stated. At the field scale of Figs 2–5
(~15–25 cells per field), uninjured microglia are **separate,
evenly spaced cells with a compact soma and a radiating star of processes**; primary processes
are clearly resolved, fine terminal twigs are faint and break up in the binary without filtering.
Neighbouring arbors **touch and interdigitate at their tips** but somas never overlap; the human
isolation step in the fractal protocol exists exactly to cut those touching tips apart. Injured
cells have bigger, brighter somas and fewer, stubbier processes, and sit closer together.
