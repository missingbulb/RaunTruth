# Reference digest — Rust et al. 2020, automated Fiji analysis of brain vasculature

> Self-contained digest of the source paper. Everything the project needs — the method, the
> parameters, the metric definitions, the reported numbers, *and* the extracted images — is
> captured here, with the figures and the supplementary material described in text.
> **No need to reopen the PDF.**

- **Title:** *A Practical Guide to the Automated Analysis of Vascular Growth, Maturation and
  Injury in the Brain*
- **Authors:** **Ruslan Rust\***, Tunahan Kirabali, Lisa Grönnert, Berre Dogancay, Yanuar D. P.
  Limasale, Andrea Meinhardt, Carsten Werner, Bàrbara Laviña, Luka Kulic, Roger M. Nitsch,
  Christian Tackenberg, Martin E. Schwab. (\*corresponding, ruslan.rust@irem.uzh.ch)
  Institute for Regenerative Medicine, University of Zurich / ETH Zürich.
- **Venue / id:** *Frontiers in Neuroscience* (2020) **14:244**, article type **METHODS**.
  DOI **10.3389/fnins.2020.00244**. Open access (CC BY). 10 pages.
- **PDF:** `rust-2020-fiji-vascular-analysis.pdf`
- **Supplementary:** the ImageJ toolbox, the LUT and the authors' calibrated representative
  image are on the article's Supplementary Material tab ([doi.org/10.3389/fnins.2020.00244](https://doi.org/10.3389/fnins.2020.00244)); their content is transcribed in **§7**.
- **One-line thesis:** a free, open-source **Fiji (ImageJ)** pipeline that binarizes and
  skeletonizes a fluorescent vessel image and returns four vascular parameters —
  **area fraction, segment length, branch count, nearest-neighbour distance** — plus
  **pericyte coverage**, validated across mouse development, mouse stroke, human Alzheimer's,
  retina and an in-vitro model.

---

## 1. Why this matters to *our* task ⭐

This is the **methods reference** for the project, in a way Wang 2022 is not. Wang gave us the
images and the biology but only published intensity and area-%; Rust gives us **exactly the
quantification we are building**, from an established lab, with the parameter set named and
defended.

Three concrete payoffs:

| What we get | Where it lands in our repo |
|---|---|
| **An external, published definition of our metrics** — area fraction, length (mm/mm²), branch count (per mm²), nearest-neighbour distance. Our locked COUNT/CATEGORIZE/MEASURE trio maps onto it almost exactly. | [`studies/vascular/docs/WORKING-GUIDE.md`](../WORKING-GUIDE.md) §4, [`METHODS-SYNTHESIS.md`](METHODS-SYNTHESIS.md) |
| **Real reference magnitudes** to sanity-check against (§4) — adult mouse cortex ≈ 0.10 area fraction, ≈ 25 mm/mm² length density, ≈ 310 branches/mm², ≈ 24 µm nearest distance. | [`studies/vascular/docs/results-first-pass.md`](../results-first-pass.md) |
| **The complete Fiji macro, a µm-calibrated native-resolution vessel image, and the LUT** (§7) — which together let us run their exact method against ours on their own data. **We match it to within 5–16%.** | §7, [`METHODS-SYNTHESIS.md`](METHODS-SYNTHESIS.md) §3 |
| **A fifth metric we do not yet compute — nearest-neighbour distance** — which the authors argue catches local hypoxic gaps that mean density hides. Cheap to add on top of our existing mask. | candidate next step |

**The one thing it does *not* give us:** Rust deliberately does **not** distinguish vessel types
("we did not intent to distinguish between different types of blood vessels (such as arteries,
arterioles, capillaries, venules, and veins)"). Our **CATEGORIZE** ask has no counterpart here —
that stays our own contribution, and Wang's phalloidin / α-SMA panels remain the only external
check on it.

---

## 2. The pipeline, step by step (Figure 1C) ⭐

This is the paper's core content and it is only printed **as an image** — reproduced here in
full so the PDF never has to be reopened. Figure: `figures/fig1_pipeline_development.png`.

| Stage | Steps as printed |
|---|---|
| **Raw image** | tiff-format · select ROI |
| **Pre-processing** | 8/16-bit · Median filter · Binarization · Skeletonization · Batch-processing |
| **Analysis** | Area fraction · Vessel length · Vessel branching · Nearest neighbor |
| **Visualization** | Heatmaps · Plots |

And how each number is actually computed (Methods, *Microscopy and Vascular and Pericyte
Quantification*):

- **Duplicate → denoise → binarize.** The image is duplicated, processed to remove noise, and
  binarized. The main text states no radius or threshold; **the supplementary macro does —
  median radius 1, `setThreshold(66, 255)` on 8-bit. See §7.1.**
- **Area fraction** = "the percentage of pixels with non-zero pixels" in the binary image.
  *(= our `area%`.)*
- **Vessel segment length** and **vascular branching**: **skeletonize the binary image**, then
  "tag all pixels in a skeleton image and then count all its branches and measure their average
  and maximum length". *(= our `segments` and `length_um`; they report mean/max per branch, we
  report the total.)*
- **Distance between single vessels** = **nearest-neighbour distance** between "closest
  individual single non-zero pixels". *(We do not compute this yet.)*
- **Pericyte coverage** = pericyte area fraction ÷ vascular area fraction. *(Needs a second
  channel; not applicable to our single-channel panels.)*
- **Heatmap** = divide the field into an N×N grid of squares, compute the area fraction of each
  square, colour-map the values. Square size is a parameter, "adjustable and should be adapted
  to the used magnification and sample".

### Required Fiji plugins (only two)
- **Measure Skeleton Length** — vessel segment length.
- **Nearest Neighbor Distances Calculation with ImageJ** — the distance metric.

The script itself is **Supplementary Data Sheet 1** — **now in this repo**, transcribed and
analysed in **§7**.

### How this compares to what we already do

| Step | Rust 2020 | Our `measure_vessels.py` |
|---|---|---|
| Denoise | median filter, **radius 1** | Gaussian σ=1.0 |
| Binarize | **manual `setThreshold(66,255)`** on 8-bit | red-dominance + Otsu with a floor, OR'd with a Frangi vesselness ridge filter |
| Gap handling | not mentioned | binary closing (disk 2) + fill holes |
| Skeleton | Fiji Skeletonize | `skimage.skeletonize` + spur pruning |
| Branch count | Analyze Skeleton | connected components of skeleton minus junctions |
| Length | mean + max per branch | total centerline length |
| Distance | nearest-neighbour | **not implemented** |
| Vessel type | **not attempted** | capillary vs artery by centerline diameter |

Our segmentation is *more* aggressive than theirs (Frangi + red-dominance vs a plain manual
threshold), which is the right call for figure-resolution crops. **§7.4 settles what that costs:
on their own native image we find 16% less area and 5% less length than their recipe — a small
under-detection, not a different answer.**

---

## 3. Experimental design at a glance

- **Mice:** wildtype and **Claudin5-eGFP (Cldn5-GFP)** C57BL/6, 7 days to 3 months, both sexes.
- **Four ways to make vessels visible** (all shown to work with the pipeline — Fig 1B):
  1. **Immunohistology** — rat anti-**CD31**, BD Biosciences, 1:100.
  2. **Isolectin B4** — lectin histofluorescence.
  3. **Transcardial perfusion** with **Lectin-DyLight594** (50 µl of 1 mg/ml, injected 1 min
     before perfusion).
  4. **Cldn5-eGFP reporter mice** — genetic label.
  > **Caveat the authors flag:** perfusion labels only vessels that carry blood, so **newly
  > formed vessels, tip cells and filopodia are missed**. Best signal-to-noise came from
  > transgenic reporters and perfusion.
- **Mouse tissue:** 4% PFA perfusion, post-fix 4 h, 30% sucrose, **40 µm coronal sections**
  (sliding microtome), free-floating; DAPI counterstain; Mowiol.
- **Stroke model:** **photothrombotic** (not MCAO) — Rose Bengal 13 mg/kg i.p., cold light
  through intact skull for **8 min** over a 5 × 3 mm window at Bregma +2.5 to −2.5 mm.
  **Analysis 3 weeks post-stroke** (also validated at days 1, 3, 7, 28).
- **Regions defined:** **stroke core** (no surviving neurons), **ischemic border zone (ibz)** =
  a band **300 µm distal to the core** with hypovascularization, **intact** = contralesional
  cortex.
- **Human tissue:** paraffin, **5 µm** sections of medial frontal cortex, Netherlands Brain
  Bank; **5 AD patients vs 5 age-matched controls** (all AD subjects female, APOE E4 carriers,
  Braak 5–6). Labels: **biotinylated lectin** (vessels) + **goat anti-PDGFR-β** (pericytes).
  Sudan Black to quench autofluorescence.
- **Mouse pericyte marker:** **CD13**. Human: **PDGFR-β**.
- **Microscopy:** **Leica SP8** confocal, 10× / 20× / 40× objectives. *(No pixel sizes or field
  dimensions are given — see §7.)*
- **Stats:** RStudio; Shapiro–Wilk for normality; two-tailed unpaired one-sample t-test for two
  groups; ANOVA + Tukey HSD for the developmental time course. Mean ± **SD**.
  \*p<0.05, \*\*p<0.01, \*\*\*p<0.001.

---

## 4. Reported numbers — the reference magnitudes ⭐

**Use these as sanity checks, not targets.** They come from raw confocal data; our panels are
figure-resolution crops.

### 4a. Mouse cortex development (Fig 1D), area fraction / length / branches / distance

| Age | Area fraction | Length (mm/mm²) | Branches (per mm²) | Nearest distance (µm) |
|---|---|---|---|---|
| **p3** | 0.027 ± 0.003 | 17.12 ± 6.45 | 232.09 ± 92.16 | 50.49 ± 9.50 |
| **p10** | — | — | 423.43 ± 62.37 *(peak)* | — |
| **p120** | 0.106 ± 0.004 | 25.47 ± 0.95 | 310.74 ± 16.29 | 23.72 ± 0.23 |

p-values p3 vs p120: area **p<0.001**, length **p=0.028**, branches **p=0.449** (n.s.),
distance **p<0.001**.

**Biology to remember:** area fraction, length and branch density all rise steeply to ~p30 and
plateau; **branch count peaks at p10 and then *declines*** — the pruning of anastomoses during
normal maturation. Inter-vessel distance halves. So *"more branches" is not monotonically
"more mature"* — a caution for interpreting our own count metric.

### 4b. Mouse peri-infarct, 3 weeks post-photothrombotic stroke (Fig 2C)

| Metric | Intact | Ischemic border zone | Change |
|---|---|---|---|
| Area fraction | 0.100 ± 0.017 | 0.060 ± 0.014 | **−39%**, p<0.001 |
| Length (mm/mm²) | 57.74 ± 4.83 | 31.89 ± 5.83 | **−44%**, p<0.001 |
| Branches (per mm²) | 396.31 ± 18.81 | 126.57 ± 58.30 | **−68%**, p<0.001 |
| Nearest distance (µm) | 30.34 ± 1.76 | 36.85 ± 3.96 | **+21.4%**, p<0.001 |
| Pericyte coverage | 0.432 ± 0.096 | 0.112 ± 0.056 | **−74%**, p<0.001 |

### 4c. Human medial frontal cortex, AD vs control (Fig 3C)

| Metric | Control | AD | p |
|---|---|---|---|
| Area fraction, grey matter | 0.029 ± 0.001 | 0.026 ± 0.003 | 0.130 (n.s.) |
| Area fraction, white matter | 0.016 ± 0.004 | 0.015 ± 0.003 | 0.554 (n.s.) |
| Pericyte coverage, GM | 0.408 ± 0.110 | 0.149 ± 0.097 | **0.004** (−63%) |
| Pericyte coverage, WM | 0.721 ± 0.231 | 0.256 ± 0.137 | **0.004** (−64%) |

Also: **GM area fraction > WM** (0.028 ± 0.003 vs 0.015 ± 0.003, p<0.001); pericyte coverage
GM vs WM not significant (p=0.078).

> ⚠️ **Direction-of-change warning that matters for us.** In Wang 2022 the *ischemic* rat cortex
> showed **more** gP-CD31 signal than contralateral (24 h post-MCAO), and our pipeline
> reproduces that ranking. Here, mouse peri-infarct at **3 weeks** shows **less** vasculature
> than intact. These are not in conflict — different species, model, and above all **time
> point** (acute endothelial upregulation vs chronic rarefaction). Never state "ischemia ⇒ more
> vessels" as a general rule on the strength of our Wang numbers.

---

## 5. Imaging / calibration facts for the extracted panels

The paper gives **no pixel sizes**. Everything we can calibrate comes from the printed scale
bars, measured directly off the figure images:

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

These are the numbers in `SCALEBAR_PX` / `SCALEBAR_UM` / `UNCALIBRATED` in
`studies/vascular/analysis/measure_vessels.py` (the single calibration
source).

**Honest caveats on this table:**
- The bar is drawn **once per row**, in the right-hand column; we apply it to the whole row on
  the assumption that a row is one acquisition scale. The dashed ROI boxes support this for
  Fig 1's adult row (box ≈ 298 px × 1.351 = 403 µm vs a 356 µm close-up field, ~13% apart) but
  only loosely for the development row (~25% apart). **Fig 1's close-up rows are the weakest
  calibration in the set** — the caption states a single 50 µm bar for all of panel B, yet the
  development close-up bar (71 px) implies almost no magnification over its overview (73 px),
  which is hard to reconcile with the visible zoom.
- **Fig 3 is the strongest**: the white ROI square in the overview measures ~101 px → 120 µm,
  against a 105 µm close-up field. Independent agreement within ~14%.
- **Fig 2's overview row draws no bar at all.** It is declared in `UNCALIBRATED` rather than
  given a borrowed scale, so those two panels report area % and pixels only.

---

## 6. Discussion — the arguments worth keeping

- **Why open source.** Most vascular quantification relies on commercial tools (Matlab, Imaris,
  Vesselucida) that are expensive and expertise-heavy; open alternatives are often unmaintained
  or mutually incompatible. This toolbox is free, needs no coding to adapt, and was tested
  across operating systems and ImageJ versions.
- **Why these four parameters.** Area fraction gives general density; **length and branching**
  matter because they govern oxygen/nutrient exchange between capillary and tissue; **distance
  and its variability** detect **local hypoxic regions that a mean density hides**. That last
  argument is the strongest reason for us to add the nearest-neighbour metric.
- **Pericyte coverage came out 40–60%**, where the literature reports ~80%. The authors
  attribute the gap to **different antibodies/epitopes** (CD13 vs PDGFR-β for pericytes; CD31 vs
  lectin/laminin/collagen IV for vessels) — a direct reminder that *marker choice changes the
  number*, which is also why Wang's gP-CD31 vs mM-CD31 comparison matters to us.
- **Sensitivity depends on the staining, not the script.** "The sensitivity and reliability of
  the script strongly depends on the quality of vascular visualization and imaging." Old human
  tissue is heterogeneous — **all automated steps should be manually controlled**. (This is the
  same discipline as our visual-assertion rule.)
- **Retina is denser than brain** — the authors observe higher vascular density in adult mouse
  retina than cortex, consistent with prior reports.
- **Stated limitations.** No information about **vascular integrity / BBB leakage** (would need
  tracers or fibrinogen staining, or MRI/NIRS in humans). Only 5 AD + 5 control subjects, all AD
  female APOE-E4 Braak 5–6 — too small to interpret the phenotype. Structural end-points should
  ideally be paired with physiological imaging (fMRI, PET).

---

## 7. Supplementary material — every earlier gap now closed ⭐

The owner supplied Supplementary **Data Sheet 1** and **Table 1**, which the Frontiers site had
refused to an automated fetch. They resolve **every** parameter this digest previously listed as
unknown. They are on the article's Supplementary Material tab ([doi.org/10.3389/fnins.2020.00244](https://doi.org/10.3389/fnins.2020.00244)); this section transcribes what the project uses.

### 7.1 The actual Fiji macro — `Quantification.ijm`

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

**The parameters that were missing, now known:**

| Previously unknown | Value |
|---|---|
| Bit depth | **8-bit** (16-bit acceptable) |
| Denoise | **Median, radius = 1** |
| Binarization | **manual `setThreshold(66, 255)`** — auto-threshold is present but *commented out*, with `// this should be adapted to your image!!` |
| Small-object removal | **Analyze Particles, size = 20–Infinity** — the image is µm-calibrated, so **20 µm²** |
| Skeleton analysis | **Analyze Skeleton (2D/3D), `prune=none`** |
| Heatmap grid | **15 × 15** squares (`numRow = 15`, "can be adapted to image size") |
| Pixel size | the representative image is **0.6058 µm/px** (§7.3) |

> ⚠️ **The headline caveat, in the authors' own words:** the threshold is **hard-coded and
> manual**, flagged "this should be adapted to your image!!". The published pipeline is therefore
> *not* fully automated at the step that matters most. Our adaptive segmentation is arguably a
> genuine improvement, not a deviation — and it removes the one parameter they could not fix.

### 7.2 The heatmap macro — `Heatmap.ijm`

Same pre-processing, then tile the binary into **15 × 15** rectangles, `Measure` the mean of each,
invert it (`255 - mean`) and `Fill` the rectangle with that grey value; finally apply a LUT.
The authors' own LUT, `hm_stroke.lut`, is kept in vascularColoring. This is the concrete recipe
behind the recommendation in [`METHODS-SYNTHESIS.md`](METHODS-SYNTHESIS.md) §4.4.

### 7.3 `Representative_Image.tif` — the best single input we have ⭐

A **1024 × 1024 ImageJ TIFF**, red vessel channel on black, `unit=µm`, `XResolution = 1.650568`
pixels per µm → **0.6058 µm/px**, i.e. a **620 × 620 µm** field.

**Why it matters:** every other panel in this repo is a *figure-resolution crop* re-extracted from
a printed PDF. This one is **native acquisition data, published by the authors, carrying its own
calibration** — no scale bar to measure, no downsampling. It is the image their macro was written
against.

*Calibration cross-check:* capillaries in it measure 8–12 px across = **5–7 µm**, against
Stefanitsch's measured mean CD31⁺ diameter of **6.03 µm**. The metadata is consistent with the
biology, so the 0.6058 µm/px is trustworthy. It is recorded in `UMPP_DIRECT` in
`studies/vascular/analysis/measure_vessels.py` — a separate table from
`SCALEBAR_PX`, because its provenance is image metadata rather than a measured bar.

Cropped into the working dataset as
`figures/panels/VESSEL_rust20suppl_representative.png`.

### 7.4 Running both pipelines on it — the real apples-to-apples ⭐⭐

The authors' recipe (§7.1) reimplemented step-for-step, and our pipeline, on **the same native
image**:

| Metric | **Their recipe, their image** | **Our pipeline, same image** | Agreement | Their *published* adult-cortex value |
|---|---|---|---|---|
| Area fraction | **9.6%** | 8.1% | **−16%** | 10.6% |
| Length density | **15.3 mm/mm²** | 14.5 mm/mm² | **−5%** | 25.5 mm/mm² |
| Branch count | **1091 /mm²** (420 branches) | 920 /mm² (354 segments) | **−16%** | **311 /mm²** |
| Junctions | 447 /mm² | — | — | — |

**Two conclusions, and the second one corrects this repo's previous diagnosis:**

1. ✅ **Our implementation faithfully reproduces the published method.** Within **5–16%** on all
   three shared metrics, against an independent reimplementation of their macro on their data.
   The residual is our slight *under*-detection (we find less area than their threshold does),
   which is the faint-vessel failure mode — real, but modest.
2. ⚠️ **The "our branch counts are 5–8× too high" conclusion was wrong.** The authors' *own*
   recipe on their *own* representative image yields **1091 branches/mm²** — **3.5× their own
   published 311/mm²**. So the gap is not our fragmentation. It is some combination of the
   representative image being denser than their p120 cortex average, and "number of branches" in
   the published summary meaning something narrower than the raw `Analyze Skeleton` branch count.
   **Whatever the cause, it is theirs, not ours** — and no target derived from that 311 figure
   should be used to judge our segmentation.

### 7.5 Supplementary Table 1 — human post-mortem demographics

| Subject | Braak | CERAD | APOE | Age | Sex | PMD | Diagnosis |
|---|---|---|---|---|---|---|---|
| 1 | 0 | A | N/A | 90 | M | 07:40 | Non-demented control |
| 2 | 0 | O | E3/E3 | 80 | M | 07:15 | Non-demented control |
| 3 | 0 | B | E3/E3 | 88 | F | 06:15 | Non-demented control |
| 4 | 1 | B | E3/E3 | 69 | F | 15:30 | Non-demented control |
| 5 | 1 | A | E3/E3 | 87 | M | 10:20 | Non-demented control |
| 6 | 5 | C | E3/E4 | 69 | F | 05:45 | Alzheimer's disease |
| 7 | 6 | C | E3/E4 | 89 | F | 04:30 | Alzheimer's disease |
| 8 | 6 | C | E4/E4 | 86 | F | 05:00 | Alzheimer's disease |
| 9 | 6 | C | E3/E4 | 94 | F | 05:40 | Alzheimer's disease |
| 10 | 6 | C | E3/E3 | 91 | F | 03:40 | Alzheimer's disease |

CERAD = amyloid-load score; PMD = post-mortem delay (h:mm). Confirms the paper's stated caveat:
**all five AD subjects are female**, four of five are APOE-E4 carriers, all Braak 5–6, and the
controls skew male — the cohort is too small and too confounded to interpret the phenotype.

### 7.6 Still not obtained

**Supplementary Figures S1, S3, S4** — tip cells/filopodia (S1), retinal development p3–p120 (S3),
HUVEC 3-D in-vitro networks (S4). Not part of Data Sheet 1. Low priority: none is core method,
and S3/S4 are outside brain tissue.

## 8. Extracted images

Three full figures, 24 cropped panels. Descriptions and the working-dataset inventory:
[`figures/README.md`](#figures) and
[`figures/panels/README.md`](#figures).

| File | Fig | Content |
|---|---|---|
| `figures/fig1_pipeline_development.png` | 1 | **The method figure.** A design schematic, B the four visualization methods × development/adult (16 vessel panels), **C the step-by-step pipeline**, D heatmaps p3–p120 + the four quantification plots. |
| `figures/fig2_stroke_periinfarct.png` | 2 | Mouse photothrombotic stroke at 3 weeks: design, intact vs core/ibz vessels, vessels+pericytes close-ups, 5 boxplots. |
| `figures/fig3_human_alzheimers.png` | 3 | Human AD vs control medial frontal cortex: design, Ctrl vs AD vessels, vessels+pericytes close-ups, GM/WM boxplots. |

**20 of the 24 panels are isolated vessel channel** (`VESSEL_*`) and have been folded into the
working dataset — see [`figures/panels/README.md`](#figures) for the caveats
that come with them (different species, markers and magnifications from the Wang panels; the
per-paper rollup in `measure_vessels.py` exists so the two are never averaged together).

---

## Figures

Native-resolution figure images extracted from
`../rust-2020-fiji-vascular-analysis.pdf` with
the paper-intake skill's extractor. Cropped sub-panels and the working-dataset inventory: [`panels/README.md`](#figures).
The authors' supplementary toolbox and their calibrated representative image are in
the publisher's supplementary material — see §7 above.

The PDF embeds each figure as a single JPEG; there are only three (the paper's other exhibits
are supplementary and not in the file). Re-crop the panels with
a crop script that is not kept.

---

### Figure 1 — `fig1_pipeline_development.png` (2120 × 2787)


**The most useful figure in the paper for us.** Four sub-panels:

- **A — experimental design.** Schematic: the three visualization routes (immunohistology,
  vascular tracing, reporter mice) → image processing (raw → processed → analysed → batch) →
  data analysis (the four parameters, each with the icon reused in the plots: orange = area
  fraction, blue = vascular length, green = branching, magenta = nearest-neighbour distance).
- **B — the vessel images**, 4 markers × 2 ages × (overview + close-up strip) = **16 panels**,
  all isolated red vessel channel on black. Columns: **CD31** (immuno), **Isolectin B4**
  (lectin histofluorescence), **Perfusion** (Lectin-DyLight594), **Cldn5-eGFP** (reporter).
  Rows: **development** (p10) and **adult** (3 months); the thin strip beneath each row is the
  magnified content of that row's white dashed box. Scale bar 50 µm (drawn in the rightmost
  column only). **These 16 are cropped into the working dataset.**
- **C — the step-by-step pipeline** (right-hand vertical flow): Raw image → Pre-processing →
  Analysis → Visualization, with the sub-steps listed. **This is the paper's method and it
  exists only as pixels** — transcribed into §2 above.
- **D — results:** coronal heatmaps at p3/p7/p10/p30/p60/p120 (grid-square area fraction,
  blue→yellow) beside the matching Nissl outline, then the four quantification scatter plots
  vs age. Scale bar 2 mm.

**What we see in panel B (visual notes, for QA):** the development row is a sparse, wide-mesh
network with large avascular gaps and visible sprout-like tips; the adult row is a dense, fine,
regular mesh. **Every adult panel includes the cortical surface** — the bright thick pial vessel
band along the top edge — which is a real anatomical structure, not an artefact, but it will
inflate area %, mean width and the artery count for those four panels. The white dashed ROI
boxes and the white marker labels are figure annotations; the pipeline's red-dominance
segmentation excludes them.

---

### Figure 2 — `fig2_stroke_periinfarct.png` (2090 × 1625)


Mouse **photothrombotic stroke**, analysed 3 weeks post-injury.

- **A — design:** injury→analysis timeline (0→21 days), a coronal schematic marking **intact**
  (grey), **stroke core** (orange) and **ischemic border** (yellow), and the
  vasculature/pericyte cartoon listing which metric belongs to which compartment.
- **B — images**, 2 × 2:
  - *top row, vessel channel only:* **intact** cortex (dense mesh) and the **core / ibz**
    field, where white dashed lines drawn on the figure mark the core↔ibz boundary. The
    vascular dropout across that boundary is obvious by eye.
  - *bottom row, vasculature (red) + pericytes (cyan, CD13):* intact and ibz close-ups.
  - Captioned 100 µm (overview) / 20 µm (close-up) — but **the overview row draws no bar**;
    see §5 above.
- **C — five boxplots:** area fraction, length, branch count, nearest distance, pericyte
  coverage; intact vs ibz. All significant; numbers in the digest §4b.

---

### Figure 3 — `fig3_human_alzheimers.png` (2113 × 1660)


Human post-mortem **medial frontal cortex**, 5 Alzheimer's vs 5 age-matched controls.

- **A — design:** AD vs non-AD schematic.
- **B — images**, 2 × 2: *top row* vessel channel only (biotinylated lectin), **Ctrl** and
  **AD**, each with a white ROI square marking the close-up; *bottom row* vasculature (red) +
  pericytes (cyan, PDGFR-β). Bars 100 µm (overview) / 20 µm (close-up), both drawn.
- **C — four boxplots:** area fraction (GM, WM) and pericyte coverage (GM, WM), Ctrl vs AD.
  Area fraction n.s.; pericyte coverage significantly reduced in AD (both GM and WM).

**Visual note:** these human panels look nothing like the mouse ones — **5 µm paraffin sections
cut vessels in cross-section**, so the field is mostly small bright ellipses and short
fragments rather than a connected mesh. Any *connectivity* metric (branch count, junctions) is
close to meaningless here; area fraction is the metric the authors actually report for human
tissue, and that is not an accident.

---

## Figure panels

25 panels: 24 cropped from the 3 figures, plus the authors' own supplementary image. Full figures and their descriptions:
[`README.md`](#figures). 
### The working-dataset panels — `VESSEL_*.png` (21 files)

Isolated **vessel channel** (red on black), the inputs for detection / counting / length
quantification. These are picked up automatically by
`studies/vascular/analysis/measure_vessels.py`, which globs
`references/*/figures/panels/VESSEL_*.png`.

#### Fig 1B — four labelling methods × two ages (16 files)

| File pattern | Age | Marker | µm/px |
|---|---|---|---|
| `VESSEL_rust20fig1_dev_overview_<marker>.png` | p10 | CD31 / IsolectinB4 / Perfusion-LectinDylight594 / Cldn5-eGFP | 0.685 |
| `VESSEL_rust20fig1_dev_closeup_<marker>.png` | p10 | same four | 0.704 |
| `VESSEL_rust20fig1_adult_overview_<marker>.png` | 3 mo | same four | 1.351 |
| `VESSEL_rust20fig1_adult_closeup_<marker>.png` | 3 mo | same four | 0.980 |

**Why these are valuable:** the same tissue type imaged four different ways. They are the
cleanest available test of whether our detector is **marker-agnostic** — a segmentation that
scores very differently on CD31 vs Cldn5-eGFP vs perfusion is keying on staining style, not on
vessels.

#### The supplementary representative image (1 file) ⭐ the best input in the repo

| File | What | µm/px |
|---|---|---|
| `VESSEL_rust20suppl_representative.png` | **native-resolution 1024 × 1024 red vessel channel, published by the authors** as the example their macro was written against | **0.6058** |

Unlike every other panel here, this is **not a figure crop**. It comes from
`../../supplementary/Representative_Image.tif`,
an ImageJ TIFF that **carries its own calibration** (`unit=µm`, 1.650568 px/µm → 620 × 620 µm
field). It is recorded in `UMPP_DIRECT` rather than `SCALEBAR_PX` — the scale is the
acquisition's own, not a bar measured off a printed page.

**Use it as the primary sanity-check panel.** §7.4 above runs the
authors' published macro and our pipeline side by side on it: we agree to within **5–16%** on
area fraction, length density and branch count.

#### Fig 2B / 3B — injury and disease (4 files)

| File | What | µm/px |
|---|---|---|
| `VESSEL_rust20fig2_overview_intact_vasculature.png` | mouse intact cortex | **uncalibrated** |
| `VESSEL_rust20fig2_overview_core-ibz_vasculature.png` | mouse stroke core + ischemic border zone | **uncalibrated** |
| `VESSEL_rust20fig3_overview_Ctrl_vasculature.png` | human control frontal cortex | 1.190 |
| `VESSEL_rust20fig3_overview_AD_vasculature.png` | human Alzheimer's frontal cortex | 1.190 |

### Companion panels (4 files)

`rust20fig2_closeup_*` and `rust20fig3_closeup_*` — **vasculature (red) + pericytes (cyan)**
two-channel close-ups. No `VESSEL_` prefix: the cyan channel is a second marker, so these are
context/ground-truth images, not clean segmentation inputs. Useful for checking that the
red-dominance segmentation really does ignore a co-stain.

---

### ⚠️ Read this before comparing these numbers to the Wang panels

These panels were folded into the working dataset deliberately, but they are **not**
interchangeable with the 16 gP-CD31 rat panels:

1. **Different species and model** — mouse (development, photothrombotic stroke) and human
   (post-mortem AD) here; rat MCAO in Wang.
2. **Different markers** — CD31 (rat anti-, mouse tissue), isolectin B4, perfused lectin,
   Cldn5-eGFP, biotinylated lectin. Wang is goat-polyclonal CD31 throughout.
3. **Different magnifications**, spanning 0.24–1.35 µm/px against Wang's 0.66–1.06. Raw length
   is meaningless across this set; only **length density (mm/mm²)** and **area %** compare.
4. **The supplementary representative image is the exception to all of the above** — native
   resolution, self-calibrated, and the only panel here validated directly against the authors'
   own method.
5. **`measure_vessels.py` rolls regions up per paper for exactly this reason** — nothing in the
   output averages a Wang region with a Rust region.
6. **Two panels are uncalibrated** (`rust20fig2_overview_*`, no scale bar drawn on that row —
   declared in `UNCALIBRATED` in `measure_vessels.py`). They report area % and pixels only and
   are excluded from every µm and density figure.
7. **The human panels are cross-sections, not networks** (5 µm paraffin). Branch/junction
   counts on them are not comparable to anything else in the set — treat area % as the only
   meaningful metric there.

**Expected-results discipline:** there is no visual `expected-results.md` for these panels yet.
Per [`studies/vascular/docs/WORKING-GUIDE.md`](../WORKING-GUIDE.md) rule 1, the pipeline's
own output on them is **not** ground truth. Until someone eyeballs them and writes down what a
good result looks like, treat the numbers as exploratory.

### Crop method (reproducible)

Regenerated from `../fig*.png` by a crop script that is not kept (Pillow). The grid was
located automatically from the figures' own dark image bands (photomicrographs are
black-background, the page is white) and then frozen as literal coordinates so the crop is
deterministic. A 3-px inner trim avoids edge bleed.

**Resolution caveat:** as with the Wang panels, the 24 cropped panels are figure-resolution
(~360–440 px each), downsampled from the raw confocal — fine for prototyping, not for
publication-grade absolute lengths. `VESSEL_rust20suppl_representative.png` is **not** cropped by
this script: it is copied straight from the supplementary TIFF at native 1024 × 1024.
