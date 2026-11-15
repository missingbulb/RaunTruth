# Reference digest — Moser et al. 2025, iPSC-derived mononuclear phagocytes in aging and 5xFAD mice

> Self-contained digest of the source paper. Everything the microglia study needs from it (the
> Iba1/CD68 imaging and morphology method, every parameter stated and not stated, the reported
> microglial numbers, and the figures) is captured here and in [`figures/`](figures/).
> **No need to reopen the PDF.** The non-microglial parts (behaviour, snRNA-seq, proteomics) are
> summarised accurately but briefly.

- **Title:** *Human iPSC-Derived Mononuclear Phagocytes Improve Cognition and Neural Health across
  Multiple Mouse Models of Aging and Alzheimer's Disease*
- **Authors:** **V. Alexandra Moser\***, Luz Jovita Dimas-Harms, Rachel M. Lipman, Jake Inzalaco,
  Shaughn Bell, Michelle Alcantara, Erikha Valenzuela, George Lawless, Simion Kreimer, Sarah J.
  Parker, Helen S. Goodridge, **Clive N. Svendsen\*** (\*corresponding). Board of Governors
  Regenerative Medicine Institute and Smidt Heart Institute, Cedars-Sinai Medical Center, Los Angeles.
- **Venue / id:** *Advanced Science* **2025, 12, e17848** (Research Article, 25 pages). DOI
  **10.1002/advs.202417848**. Received 31 Dec 2024, revised 25 Jul 2025, published online
  24 Aug 2025.
- **Licence (as printed on p. 1):** "© 2025 The Author(s). Advanced Science published by Wiley-VCH
  GmbH. This is an open access article under the terms of the Creative Commons Attribution License,
  which permits use, distribution and reproduction in any medium, provided the original work is
  properly cited." → **CC BY**; the PDF and figures are redistributed here with this citation.
- **PDF:** [`moser-2025-ipsc-mononuclear-phagocytes.pdf`](moser-2025-ipsc-mononuclear-phagocytes.pdf)
- **One-line thesis:** repeated tail-vein injection of human iPSC-derived mononuclear phagocytes
  (iMPs) into aging NSG, middle-aged BALB/c and 5xFAD mice improves hippocampus-dependent memory
  and **restores ramified hippocampal microglial morphology** (traced branch length, Sholl
  complexity), without the cells entering the brain — probably via plasma changes (serum amyloids
  SAA2/SAP lowered).

---

## 1. Why this matters to our task ⭐

This is a **biology paper that uses microglial morphology as a read-out**, not a methods paper.
What it gives an automated Iba1 detector/measurer is modest but concrete:

| What we get | Use for us |
|---|---|
| **The standard manual reference method we would be replacing**: confocal z-stacks of Iba1 (63×, 0.5 µm step, 30 µm sections), branches traced by hand in **SNT (Simple Neurite Tracer)**, **average branch length per region per animal**, and **Sholl area-under-curve** from 3 randomly chosen cells per section (§2). | Defines two per-cell metrics our algorithm must be able to produce (total traced process length, Sholl profile/AUC) and shows how small the manual sample is (≈10 cells/mouse for length, 3 for Sholl). |
| **Direction and size of the aging effect in hippocampal DG**: microglia count ↑ ≈25%, traced branch length ↓ ≈30%, Sholl AUC ↓ ≈34%, % CD68+ microglia ≈75% → ≈86% (§4). | Effect sizes a per-cell geometry pipeline must be sensitive enough to resolve; a ~30% length change is the signal of interest. |
| **CD68 is scored as a binary per-cell fraction** ("% of IBA1+ cells that expressed CD68"), with **≈75% of microglia already CD68+ in young (3-month) DG** (§4). | CD68 positivity alone is a weak activation discriminator in hippocampus; a **CD68 volume/area inside the Iba1 mask** (as they did for LAMP1) is the more informative quantity for our 555 nm channel. |
| **A within-cell lysosomal-marker area method** (LAMP1 area inside Iba1 ROIs: despeckle + median 0.5, per-cell MIP, threshold, Analyze Particles; cells kept only if wholly within the z-stack) (§2.4). | Directly portable to CD68: per-cell MIP, threshold inside the cell ROI, and the **"entire cell within the stack" exclusion rule** for 3D data. |
| **Reference images of DG microglia at ~0.45 µm/px (figure scale)** with overlapping arbors and CD68 puncta (figures/README). | What a crowded hippocampal Iba1 field looks like; neighbouring arbors interdigitate, so territory segmentation is non-trivial. |

**What it does *not* give us:** no automated segmentation, no thresholds for Iba1, no soma
area/volume, no endpoint or process counts, no convex-hull territory, no fractal/lacunarity, no
skeleton analysis — only hand tracing. The Iba1 cell-count method is **not described at all**
(§2.6). Imaging is 63× confocal, not 20× slide-scanner: at our 20× Olympus resolution the fine
terminal processes they traced will be partly unresolved, so their absolute branch lengths are an
upper bound for what we can measure.

---

## 2. The microglia imaging and morphology method, in full ⭐

All from §4 *Experimental Section*, "Immunohistochemistry and Quantification" (pp. 18–19), plus
the in-vitro iMGL section (p. 17).

### 2.1 Tissue
- Transcardial perfusion with ice-cold 0.1 M PBS (no PFA perfusion), 24 h after last treatment;
  isoflurane anaesthesia.
- One hemibrain **immersion post-fixed in 4% PFA / 0.1 M PBS for 48 h at 4 °C**; stored in
  0.1 M PBS / 0.03% NaN₃. (The other hemibrain's hippocampus went to snRNA-seq.)
- Cryoprotected **30% sucrose 48 h**, flash-frozen on dry ice, **horizontal sections at 30 µm** on
  a Leica SM2010R freezing sliding microtome; free-floating, stored at 4 °C.

### 2.2 Staining (immunofluorescence)
- IBA1: **Wako #019-19741, 1:250**. CD68: **Bio-Rad #MCA1957, 1:200** (rat anti-mouse CD68,
  clone not stated in text). LAMP1: Santa Cruz #SC-19992, 1:200. COX1: Cayman #160110, 1:500.
- Antigen retrieval: IBA1/LAMP1 sections boiled in 10 mM EDTA pH 6.0, 10 min; IBA1/COX1 sections
  95% formic acid 5 min. **No retrieval is stated for IBA1/CD68.**
- Then TBS 3×5 min; 3% H₂O₂ / 3% methanol 10 min; 0.2% Triton-X/TBS 3×10 min.
- Block: 2% BSA in 0.2% Triton-X/TBS. Primaries overnight at 4 °C. Rinse 0.1% Triton-X 3×10 min.
- Secondaries: Alexa Fluor conjugates 1:500 in block, 2 h RT (fluorophores not stated). DAPI
  counterstain. Mounted in Vectashield HardSet (H-1400).
- Figure colours: Fig 2E shows IBA1 red, CD68 green; Fig 2G shows IBA1 green, LAMP1 red.

### 2.3 Acquisition and morphology (Iba1)
- Microscope: **Nikon A1R confocal**. "For IBA1-stained sections, images were acquired at **63x**
  magnification under oil immersion and at a **step size of 0.5 µm**." (Nikon does not normally
  sell a 63× objective; the text says 63×, as printed.)
- Sampling: **3 sections per mouse**, **3 fields per section — one each in CA1, CA3 and DG**.
- **Branch length**: "Microglial branches were traced using the Simple Neurite Tracer (SNT) plugin
  on ImageJ and the average branch length per brain region for each animal was calculated." Fig 2C
  legend: "An average of **10 IBA+ cells per mouse** was analyzed for branch length; each dot shows
  average data from one mouse."
- **Sholl**: "randomly selecting **three microglia**, centering the traced branches into a shared
  root and running the Sholl analysis function using the SNT plugin. The resulting Sholl profiles
  provided intersection values which were then used to calculate the **area under the curve using
  the trapezoid rule** [ref 146 = Kongsui et al., *J Neuroinflammation* 2014, 11, 182]. Output
  values were averaged across the three traced microglia."
- **CD68 / LAMP1 / COX1 positivity**: images acquired as for IBA1; "the **percentage of IBA1+ cells
  that expressed** either LAMP1, CD68, or COX1 was calculated."
- BALB/c: tracing and Sholl in DG only, 3-week and 10-week treated animals pooled (no difference
  between them within group).

### 2.4 LAMP1 area inside microglia (the only within-cell volumetric-style measure)
- DG only. **Leica Stellaris 8 STED** confocal, **z-step 0.3 µm**, ImageJ.
- Z-stacks preprocessed with **Despeckle**, then **Median filter "set at 0.5"** (radius, units not
  stated).
- Cells outlined with the ROI tool on a maximum-intensity composite, "while scanning through the
  z-stack to ensure that **all included cells were entirely within the z-stack**".
- A **per-cell MIP** was made "to ensure that only particles within the cell were labeled and
  counted", then thresholded (method not stated); **Analyze Particles** measured area of LAMP1+
  particles inside the ROI. **≥ 5 cells/animal.**
- Output is an area (2D, from the MIP), not a volume, despite the Discussion calling it "microglial
  LAMP1 volume".

### 2.5 Other histology (for context; not microglia)
- NeuN and GFAP: 20× on a "Leica DM600B" (as printed), 3 non-overlapping fields per subregion ×
  4 sections/mouse; counts in ImageJ. Astrocyte hypertrophy = outlined GFAP+ cell bodies (mean 20
  in CA1, 18 in CA3). DCX, calretinin, GluR2/3, Ki-67: 20×, DG, 4 sections. COX2 and Aβ: DAB,
  grayscale + threshold → % area ("load"). VGLUT1: A1R 40× oil, 0.33 µm step, MIP, ROI ±10 µm
  around CA3 pyramidal layer, threshold → % area, 3 sections.

### 2.6 In-vitro microglia (iMGL) branch length
- iPSC → same 4-stage protocol as iMPs → floating cells plated **50,000/well** (24-well) in
  RPMI-1640 + GlutaMAX + 10 ng/mL GM-CSF + 100 ng/mL IL-34; 1 week; 24 h treatment.
- IBA1 (Wako 019-19741, 1:250) ICC; **40× oil** non-overlapping fields across ≥3 coverslips;
  "simple neurite tracer plugin in NIH ImageJ was used to trace IBA+ cell branches, and the
  **average branch length** was calculated." Fig 5O axis: "**Branch Length per Cell (µm)**".

### 2.7 Parameters NOT stated (do not re-hunt)
- **How IBA1+ cells were counted** (manual vs automated, criterion for a cell, counting frame, per
  field vs per area, whether z-stack or MIP). The y-axis is just "IBA1+ Cells: DG"; units/area absent.
- Pixel size, frame size, zoom, objective NA, pinhole, laser lines / channels, detector settings for
  any confocal acquisition; number of z-planes; whether whole 30 µm thickness was imaged.
- Whether tracing was done in 3D or on a projection; tracing mode in SNT (manual/semi-auto, path
  fitting); which cells were chosen for the ≈10-cell branch-length sample (Sholl cells were
  "randomly" selected; length cells not described); handling of cells cut by section/field edges in
  the tracing (an edge rule is stated only for the LAMP1 analysis).
- Exact definition of "branch length": total traced length per cell vs mean length per branch.
  Fig 5O's in-vitro axis says "per Cell (µm)" and the in-vivo magnitudes (~100–150, unit-less axis)
  are consistent with **total traced length per cell in µm** — this is our inference, not stated.
- Sholl radius step, start radius, max radius; whether the AUC is in intersections·µm.
- Criterion for a cell to "express" CD68/LAMP1/COX1 (any puncta? threshold? 2D or 3D overlap?).
- Threshold method and values (LAMP1, COX2, Aβ, VGLUT1), and units of "LAMP1+ Area in IBA1+ Cells"
  (axis 0–15, unit not given; µm² presumed).
- Secondary fluorophores; CD68 antibody clone; antigen retrieval for IBA1/CD68.
- Soma size, process count, endpoints, convex hull/territory, fractal dimension, lacunarity,
  ramification index, cell volume — **none of these were measured**.

---

## 3. Experimental design at a glance

- **iMPs:** 83i iPSC line (non-integrating episomal reprogramming). 4-stage differentiation:
  S1 BMP4 80 ng/mL (d0–4); S2 bFGF 25 + SCF 100 + VEGF 80 ng/mL (d4–6); S3 SCF 50, IL-3 50,
  TPO 5, M-CSF 50, Flt3L 50 ng/mL (d6–12/14); S4 M-CSF 50, Flt3L 50, GM-CSF 25 ng/mL. Floating
  cells budding off adherent cysts harvested every 4 days (collected every other feed) for up to
  ~10–15 weeks. Flow: **90.9% CD11b+/CD34−**, of which 93.2% CD14+CD16+ and 96.0% CD14+CD11c+
  (Fig 1B gates). ICC: CD68+, CD11c+, **low IBA1 and P2ry12**; phagocytose pHrodo zymosan.
- **Dose:** 5 × 10⁵ cells in 100 µL saline, tail vein (chosen to exceed host circulating monocytes,
  ~88,000–440,000). Heat-killed "dead iMPs" (95 °C 15 min) as a control in BALB/c.
- **Models:**
  1. **NSG** (NOD scid gamma) male and female, young 3 mo vs aging 11–12 mo; every 3rd day ×8
     injections (21 days); behaviour from 5th injection. Groups: Young Veh, Aging Veh, Aging iMP.
  2. **BALB/c** males 3 mo vs 11–13 mo, cyclosporin A immunosuppression (15 mg/kg i.p. daily from
     3 d before, then 200 mg/L in drinking water); twice weekly for 4 or 10 weeks; + dead-iMP group.
  3. **5xFAD** males, treatment from **4 mo** ("young") or **9 mo** ("aging"); twice weekly;
     cyclosporin A as above; compared only Veh vs iMP within age (t-tests).
- **Stats:** Prism 10; one-way ANOVA + Tukey (t-tests for 5xFAD); mean ± **SEM**; normality
  **assumed, not tested**; blinded, multiple investigators. n = 10–20/group (NSG), 6–10 (5xFAD).

---

## 4. Reported numbers ⭐

The paper prints almost no numbers for the histology; they exist only as bar charts. Values
marked **≈** were **read by eye off the figure** (not stated by the authors; ±~5% of axis range).
Units are as printed on the axis — often none.

### 4a. NSG male, hippocampal DG (Fig 2), n = 10–20/group (dots: ≈19 / 9 / 12)

| Measure | Young Veh | Aging Veh | Aging iMP | Stats (Tukey) |
|---|---|---|---|---|
| IBA1+ cells: DG (count; unit/area not stated) | ≈10.3 (range ≈7.5–13) | ≈12.9 | ≈12.3 | Y vs AV *** ; Y vs AiMP ** ; AV vs AiMP ns |
| IBA1 branch length: DG (unit not on axis; µm per cell presumed) | ≈152 (range ≈85–265) | ≈107 | ≈120 | Y vs AV * ; Y vs AiMP ns ; AV vs AiMP ns |
| Microglia Sholl (AUC): DG | ≈103 (range ≈60–157) | ≈68 | ≈79 | Y vs AV ** ; others ns |
| % CD68+ microglia: DG | ≈75 (range ≈45–90) | ≈86 | ≈86 | Y vs AV * ; Y vs AiMP * ; AV vs AiMP ns |
| % LAMP1+ microglia: DG | ≈33 (range ≈0–92) | ≈57 | ≈48 | all ns |
| LAMP1+ area in IBA1+ cells: DG (unit not stated) | ≈2.8 | ≈7.5 | ≈4.7 | Y vs AV **** ; AV vs AiMP * ; Y vs AiMP ns |
| % GFAP+ cells: DG | ≈27 | ≈25 | ≈27 | all ns |

**Trustworthiness:** cell counts are per field of unstated size; "branch length" is from ≈10
hand-traced cells per mouse at 63×, Sholl from 3 cells per section — these are small, selected
samples, and the mean-of-means hides the large per-mouse spread (young branch length spans ~3×).

### 4b. NSG male CA1 / CA3, BALB/c, NSG female (Supplementary Figs S3, S4 — **text only**)

Direction of effects as stated in the text (no numbers in the main PDF):
- CA1: microglia number ↑ in aging Veh; branch length ↓ in both aging groups; complexity ↓ in aging
  Veh only; CD68 similar across groups; % LAMP1+ ↑ in both aging groups.
- CA3: microglia number ↑ in both aging groups; branch length ↓ in aging Veh only; complexity ↓ in
  aging Veh only; CD68 ↑ with aging, trend ↓ with iMP; microglial COX-1 ↑ with aging (not
  significant with iMP); COX-2 % area unchanged; GFAP+ astrocytes ↑ with aging.
- BALB/c DG: branch length and complexity ↓ in aging Veh (trend in dead-iMP); **live-iMP > aging Veh,
  = young**; microglia number ↑ only in dead-iMP; CD68 ↑ in all aging BALB/c.
- NSG female: only microglial branch length ↓ with aging, restored by iMP.

### 4c. 5xFAD, CA1 (Fig 6F–I; axis labels say CA1), unpaired t-test, n = 6–10/group

| Measure | 4-mo Veh | 4-mo iMP | p | 9-mo Veh | 9-mo iMP | p |
|---|---|---|---|---|---|---|
| IBA1+ cells: CA1 | ≈16 | ≈16 | ns | ≈35 | ≈33 | ns |
| IBA1 branch length: CA1 | ≈105 | ≈118 | ns | ≈80 | ≈108 | * |

Note the **≈2× higher microglia count in 9-month vs 4-month 5xFAD CA1** (different cohorts and
batches, not tested against each other) — plaque-associated microgliosis.

### 4d. iMGL in vitro (Fig 5J–O), n = 3–5 wells (J, K, M), 118–219 cells/group (O)

| Measure | Veh | iMP media | SAP/SAA2 | SAP/SAA2 + iMP media |
|---|---|---|---|---|
| % healthy (DAPI+/CC3−) microglia | ≈62 | ≈66 | ≈53 | ≈70 (Veh vs SAP/SAA2 p = 0.07; * and ** as plotted) |
| **Branch length per cell (µm)** | ≈65 | ≈65 | ≈68 | ≈70 (all ns) |

Camptothecin (20 µM) reduced iMGL branch length (Fig S8K, not in this PDF); not significant in
iMP-conditioned media.

### 4e. Non-microglial headline results (brief)
- Behaviour (NSG male, Fig 1F–I): spontaneous alternation ↓ with aging (*), partly restored; arm
  entries ↓ with age regardless of treatment (****); **novel object location: aging ↓ (**), iMP vs
  aging ↑ (p = 0.009)**, iMP vs young p = 1.00; novel object recognition ns. Females: trends only
  (NOL means −0.02 aging vs 0.25 young vs 0.13 iMP).
- 5xFAD: iMP ↑ NOR in 4-mo (*), ↑ NOL in 9-mo (**); Aβ plaque load and soluble Aβ40/42 unchanged
  (Triton-soluble Aβ42/40 ratio trend p = 0.06 in young).
- snRNA-seq (n = 5/group; 105,414 nuclei after QC; 15 cell types, 13 PCs, resolution 0.6):
  DG **mossy cells** most DEGs; mossy subclusters 5 and 10 lost in aging, restored by iMPs (ns by
  counts). NeuN+ hilus cells ↓ in aging (*); GluR2/3+ % ↓ in aging (*), restored. DCX unchanged.
  Microglia identified by **Tmem119 & Itgam**.
- Transcriptomic clocks (Buckley et al. method; 15-cell pseudocells × 100): iMPs reduce predicted
  age in 9 of 15 cell types, **including microglia (MG; aging Veh ≈13.7 mo vs aging iMP ≈10.6 mo,
  **)**. 160 clock genes shared by ≥2 types; 28 by ≥3, incl. *Apoe*.
- iMPs do not enter the brain (GFP flow, human Alu qPCR, SC121 IHC); accumulate in lung (also
  kidney, heart, spleen).
- Plasma proteomics: 485 proteins; aging vs young 75 up / 34 down (FDR < 0.05, FC ≥ 1.5);
  haptoglobin 5.4-fold up in aging (4.2-fold iMP vs young). iMP vs aging Veh: up adiponectin, MTUS1,
  GAPDH; down SAA2, Ppp1r21, SAP, Arhgap30. SAA2 correlates with NOL (R = −0.345, p = 0.01); SAP
  trends (NOL R = −0.231, p = 0.07; GluR2/3 R = −0.262, p = 0.05). Cortical cytokines: CXCL10, CCL3
  ↑ in aging Veh only; IL33 ↑ in both aging groups.

---

## 5. Microglial biology worth keeping

- **Branch retraction = activation.** "Microglial processes were traced and Sholl analysis was
  performed, as branches contract when microglia become activated" (ref 24, Ayoub & Salm 2003).
  Both branch length and Sholl complexity fall with aging; the paper treats shorter/simpler arbors
  as the activated phenotype and longer/more complex as healthy.
- **Microglia number rises with aging** in DG, CA1 and CA3 (microgliosis), and strongly with
  amyloid pathology (5xFAD 9 mo ≈2× 4 mo in CA1).
- **CD68 = lysosomal marker increased upon microglial activation** (ref 25). But in this dataset
  **most DG microglia are CD68+ even in young mice (≈75%)**; aging shifts it to ≈86%. Visually,
  aged-mouse CD68 is many bright, larger puncta clustered in somata and proximal processes; young
  CD68 is sparse and faint (figures/README, Fig 2E).
- **LAMP1** (lysosomal) up in aging and AD; the *amount* inside microglia (area) separated groups
  where the *fraction of LAMP1+ cells* did not — a reminder that a per-cell quantity beats a binary
  positivity call.
- **COX-1** is microglial and up in aging/AD; **COX-2** largely neuronal.
- **Regional differences:** effects differ between DG, CA1 and CA3 (e.g. CD68 aging increase in DG
  and CA3 but not CA1). Analyses must be per subregion; pooling hippocampus would blur them.
- **In vivo vs in vitro:** iMPs lengthen microglial branches in vivo but conditioned media does not
  change iMGL branch length in vitro — culture microglia (≈65 µm traced per cell) are a poor model
  of tissue morphology.

---

## 6. Authors' limitations (as stated)

- Partial rescue only: several measures (spontaneous alternation, several histological outcomes)
  showed iMP not different from young but also not different from aging Veh.
- Only 11–12-month NSG mice tested for aging; more advanced ages untested. Dose and time course not
  explored; memory retention only to 30 min; executive-function tasks not tested.
- BALB/c behaviour highly variable; later time points impractical because of immunosuppression.
- Females under-studied; female NSG showed few aging effects.
- Mechanism unresolved (in-vitro conditioned media recapitulates only part of the effects).
- Data distribution assumed normal, not tested (Statistical Analysis).
- **Not stated as a limitation but relevant to us:** morphology rests on ≈10 traced cells/mouse
  (length) and 3 cells/section (Sholl), selected by hand; no automated or whole-field analysis.

---

## 7. What is not in this PDF

- **Supporting Information** (Figures S1–S9, Tables S1–S3): includes all CA1/CA3 microglial plots
  (S3), BALB/c tracing and Sholl (S4F–K), NSG female microglia (S3W–Z), 5xFAD CA3/other microglia
  plots (S9G,H), iMGL camptothecin branch length (S8K). The paper says it "is available from the
  Wiley Online Library or from the author". **Fetch attempted 2026-11-15:**
  `https://advanced.onlinelibrary.wiley.com/action/downloadSupplement?doi=10.1002%2Fadvs.202417848`
  → **HTTP 403** (Cloudflare "Just a moment…" challenge page). Not retried (publisher 403). Needs a
  human with a browser, or a request to the author.
- **Authors' code repository** `https://github.com/shaughnmb/2024_moser_et_al/` (cloned 2026-11-15,
  HEAD `694293a206f2d29e30704f0caf1d97d341f1d64b`, GPL-3.0): holds only the snRNA-seq/clock R script
  (`moser_et_al_2025.R`, 5195 lines) and processed plasma proteomics tables. **No imaging, tracing
  or Sholl code** — nothing for us; not committed here. (Its script names an additional
  "Cluster 21 – Activated Microglia" that does not appear among the paper's final 15 cell types.)
- Raw data: snRNA-seq GEO **GSE220548**; proteomics PRIDE **PXD052723**. **No imaging data are
  deposited.**

---

## 8. Extracted images

Six figures, each a single embedded raster; the only other image (p. 2) was the journal logo and
was dropped. Panel-by-panel descriptions, scale-bar measurements and what the microglia look like:
[`figures/README.md`](figures/README.md).

| File | Content | Microglia relevance |
|---|---|---|
| [`fig1_imp_characterization_behavior.png`](figures/fig1_imp_characterization_behavior.png) | iMP protocol, flow, ICC (CD68/CD11c/IBA1/P2ry12), NSG behaviour | low (cultured iMPs: round, IBA1-low) |
| [`fig2_microglia_iba1_cd68_sholl.png`](figures/fig2_microglia_iba1_cd68_sholl.png) | DG IBA1 counts, SNT tracing + Sholl example, IBA1/CD68, IBA1/LAMP1, GFAP, cytokines | **high** — the core of this intake |
| [`fig3_snrnaseq_mossy_cells.png`](figures/fig3_snrnaseq_mossy_cells.png) | snRNA-seq UMAP/markers, mossy-cell genes, NeuN, GluR2/3 | low |
| [`fig4_transcriptomic_clocks.png`](figures/fig4_transcriptomic_clocks.png) | cell-type aging clocks incl. microglia | low |
| [`fig5_plasma_proteomics_imgl.png`](figures/fig5_plasma_proteomics_imgl.png) | plasma proteomics; iMGL apoptosis, phagocytosis, IBA1 branch length | low–medium (in-vitro morphology) |
| [`fig6_5xfad_microglia_mossy.png`](figures/fig6_5xfad_microglia_mossy.png) | 5xFAD behaviour, CA1 IBA1 counts and branch length, GluR2/3 | medium (numbers only, no microglia images) |
