# Reference digest — Moser et al. 2025, iPSC-derived mononuclear phagocytes in aging and 5xFAD mice

> Self-contained digest of the source paper. Everything the microglia study needs from it (the
> Iba1/CD68 imaging and morphology method, every parameter stated and not stated, the reported
> microglial numbers, and the figures) is captured here and in [`figures/`](#figures).
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
- **PDF:** kept in the study's Drive `Literature` folder as `Human iPSC-Derived Mononuclear Phagocytes Improve Cognition and Neural Health across Multiple Mouse Models of Aging and Alzheimer's Disease.pdf`, not in the repo.
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
[`figures/README.md`](#figures).

| File | Content | Microglia relevance |
|---|---|---|
| `fig1_imp_characterization_behavior.png` | iMP protocol, flow, ICC (CD68/CD11c/IBA1/P2ry12), NSG behaviour | low (cultured iMPs: round, IBA1-low) |
| `fig2_microglia_iba1_cd68_sholl.png` | DG IBA1 counts, SNT tracing + Sholl example, IBA1/CD68, IBA1/LAMP1, GFAP, cytokines | **high** — the core of this intake |
| `fig3_snrnaseq_mossy_cells.png` | snRNA-seq UMAP/markers, mossy-cell genes, NeuN, GluR2/3 | low |
| `fig4_transcriptomic_clocks.png` | cell-type aging clocks incl. microglia | low |
| `fig5_plasma_proteomics_imgl.png` | plasma proteomics; iMGL apoptosis, phagocytosis, IBA1 branch length | low–medium (in-vitro morphology) |
| `fig6_5xfad_microglia_mossy.png` | 5xFAD behaviour, CA1 IBA1 counts and branch length, GluR2/3 | medium (numbers only, no microglia images) |

---

## Figures

Native-resolution figure images extracted from
the PDF in the study's Drive `Literature` folder (named in the citation block)
(open access under the "Creative Commons Attribution License" — CC BY, version not stated in the PDF — © 2025 The Author(s), *Advanced Science*,
Wiley-VCH; cite DOI 10.1002/advs.202417848). 
Each figure is a single embedded raster, saved here as PNG. The only other image in the PDF, the
*Advanced Science News* logo on p. 2, was dropped. Supplementary figures (S1–S9) are **not** in the
PDF (see digest §7).

**Scale-bar measurements.** Bars were measured in pixels off these images with a white-run scan
(lengths below). They give the *figure's* µm/px, not the acquisition pixel size, which the paper
never states. No bar values were assumed: each value is the one printed in the legend.

---

### Figure 1 — `fig1_imp_characterization_behavior.png` (2048 × 1479)


iMP generation and NSG behaviour.

- **A** — schematic of the 4-stage differentiation (S1 D0–4 BMP4; S2 D4–6 bFGF/SCF/VEGF; S3 D6–14
  SCF/IL3/TPO/M-CSF/FLT3; S4 D14+ M-CSF/GM-CSF/FLT3); floating cells collected and pelleted.
- **B** — flow gates: CD11b+CD34− **90.9%** → CD14+CD16+ **93.2%** and CD14+CD11c+ **96.0%**.
- **C** — four ICC panels of cultured iMPs, marker red + DAPI blue: CD68, CD11c, IBA1, P2ry12.
  Scale bar = 50 µm (43 px drawn in the CD68 panel). What we see: small, **round, unramified** cells
  scattered sparsely; CD68 strong and cytoplasmic; IBA1 and P2ry12 nearly absent (a few faint red
  dots). These are monocyte-like cells, *not* microglia — nothing here resembles tissue microglia.
- **D** — CD68 (green) + pHrodo beads (red) + DAPI; scale 50 µm. Rounded green cells, a few red bead
  spots.
- **E** — NSG treatment schematic (Young Veh, Aging Veh, Aging iMP; injections every 3rd day;
  SAB d13, FC d14–16, NOL/NOR d19, EPM d21, endpoint d22).
- **F–I** — bar/dot plots: % SAB, arm entries, NOL index, NOR index (stats in digest §4e).

---

### Figure 2 — `fig2_microglia_iba1_cd68_sholl.png` (1706 × 2652) ⭐


**The figure that matters for the microglia study.** All hippocampal **dentate gyrus**, male NSG.

- **A** — IBA1+ cells: DG (count, no unit/area). Young ≈10, aging ≈13, iMP ≈12.
- **B** — **one traced microglia**, two panels. Left: IBA1 (red) + DAPI (blue) image with the SNT
  tracing overlaid in cyan. Right: the same tracing with **concentric Sholl shells** (multicoloured
  rings) centred on the soma (green dot). Scale bar drawn (55 px) but **its value is not given in
  the legend**. What we see: the soma is a compact red ovoid ≈ 1/10 of the 336-px panel width; the
  tracing has **3 primary processes** leaving the soma (one long one to the upper-left that carries
  most of the arbor, one short upward, one down-right), branching to roughly **20 terminal tips**
  (counted by eye on the tracing), several with small knob-like swellings at branch points. The
  cyan tracing mostly runs over **dark background** in the displayed image: the processes it follows
  are barely visible in this single view, meaning the tracing was done through the z-stack and the
  shown image does not contain the full arbor in focus. **Implication:** thin distal processes are
  near the noise floor even at 63×; a 2D projection-based detector will miss much of what a 3D
  tracer records.
- **C** — IBA1 branch length: DG (axis 0–300, no unit). Young ≈152, aging ≈107, iMP ≈120.
- **D** — Microglia Sholl: DG (AUC, axis 0–200). Young ≈103, aging ≈68, iMP ≈79.
- **E** — **IBA1 (red) / CD68 (green) / DAPI (blue)**, three columns Young / Aging Vehicle / Aging
  iMP; top row overview, bottom row magnified inset of the white box. Legend: scale bar = **25 µm on
  top image** (measured **56 px** → ≈0.45 µm/px at figure resolution; each overview panel is
  **419 × 419 px ≈ 187 µm square**) and **5 µm on bottom image** (measured **52 px**). **The 5 µm
  value is inconsistent with the geometry:** the white ROI box is ≈140 px wide and its inset is
  228 px, a ×1.63 enlargement, so a 52-px inset bar spans ≈32 px ≈ **14–15 µm** of the overview.
  Treat the inset bar as mislabelled (or the inset as not a pure enlargement); trust the 25 µm bar.
  What we see:
  - *Young:* a **continuous lattice of fine red processes filling the entire field** — no empty
    territory; ~6–8 identifiable Iba1 somata (small red-ringed bodies ≈ 5–8 µm, beside the larger
    blue DAPI nuclei of granule/hilar neurons) in ≈187 × 187 µm. Each soma gives off several (≈3–6)
    thin primary processes that branch repeatedly; **arbors of neighbouring cells meet and
    interdigitate**, so where one cell ends and the next begins is not visible in the projection.
    Processes are 1–3 px wide here (≈0.5–1.5 µm). CD68 is sparse: a few faint yellow/orange puncta,
    mostly at somata.
  - *Aging Vehicle / Aging iMP:* the same lattice, slightly thinner and more tangled, with
    **abundant bright orange/yellow CD68 puncta** (CD68 green over IBA1 red) clustered in somata and
    proximal processes, and also scattered over neuronal nuclei. Several **grey-green tubular
    structures** (≈ 5–10 µm wide, elongated, some branched) are blood vessels / autofluorescence,
    not cells. **Caution for us:** in aged tissue some yellow puncta outside obvious Iba1 cells may
    be lipofuscin autofluorescence, which appears in both channels — the paper does not address it.
    A CD68-in-Iba1 measurement must gate puncta by the Iba1 mask and ideally reject puncta bright
    in every channel.
  - Insets: one cell each, soma centred, with 4–6 visible processes; young inset processes long and
    smooth, aged insets shorter with puncta.
- **F** — % CD68+ microglia: DG. Young ≈75, aging ≈86, iMP ≈86.
- **G** — **IBA1 (green) / LAMP1 (red) / DAPI**, Young / Aging Veh / Aging iMP. Top: 25 µm bar
  (measured **56 px**, same 187-µm panels); bottom-left inset "10 µm" (measured **32 px**); the
  orthogonal-view crops "2 µm" (measured **20 px**). Orthogonal (xz/yz) views with white cross-hairs
  show LAMP1 puncta inside the Iba1+ cell body in 3D. What we see: Iba1 in this staining is
  **dimmer and sparser** than in E (different antigen retrieval — EDTA boiling — and green channel);
  ~6–9 somata per field, processes fainter and fragmentary; dense DAPI granule-cell layer visible at
  the edges. Iba1 signal is strongest in the **membrane shell around the soma** (ring around the DAPI
  nucleus in the orthogonal views). Aged panels carry many red/yellow puncta.
- **H** — % LAMP1+ microglia: DG (ns). **I** — LAMP1+ area in IBA1+ cells: DG (young ≈2.8, aging
  ≈7.5, iMP ≈4.7; unit not stated).
- **J** — **GFAP (green) / DAPI**, three columns; 25 µm bar (measured 56 px). Star-shaped astrocytes
  with thick primary processes, evenly tiled, ~20+ per field — morphologically distinct from the
  thin, more tortuous microglial lattice. **K** — % GFAP+ cells (ns).
- **L** — cortical cytokines (pg/mg): IL33, CXCL10, CCL3, CXCL1, CXCL2.

---

### Figure 3 — `fig3_snrnaseq_mossy_cells.png` (2054 × 2593)


- **A** — UMAP of 15 hippocampal clusters (GRN, PYR, EXCN, INHN, MOSS, BSKT, ASTR, ASTR-A1, MG,
  OLIG, OPC, VLMC, CPCa, CPCb, PERI). **B** — violin plot of markers (microglia: *Tmem119*,
  *Itgam*). **C** — mossy-cell subclusters 0–12 split by group (subclusters 5 and 10 depleted in
  aging Veh). **D, E** — GO dot plots for subclusters 5 and 10. **F** — per-gene expression
  (*Vav3, Kcnma1, Robo1, Tcf7l2, Kcnc2, Hdac9, Lef1, Fgf13, Rnf220, Cit, Shisa9, Syt9*).
- **G** — NeuN (green) in DG hilus, scale 25 µm (measured 43 px). **H** — NeuN+ cells: DG
  (young ≈115, aging ≈88, iMP ≈100).
- **I** — GluR2/3 (red) / DAPI in DG, 100 µm bar (61 px) on overview, 25 µm on inset (55 px).
  **J** — % GluR2/3+ cells (young ≈28, aging ≈23, iMP ≈27).

No microglia imagery.

---

### Figure 4 — `fig4_transcriptomic_clocks.png` (2049 × 1628)


- **A** — clock-building schematic (15 random cells → pseudocell, ×100 per cell type; leave-one-out
  cross-validation; predict iMP samples).
- **B** — heatmaps of predicted age (0–20 months) per pseudocell for INHN, BSKT, MOSS, EXCN, PYR,
  GRN, **MG**, ASTR, ASTR-A1.
- **C** — predicted ages per group; MG: young ≈3, aging Veh ≈14, aging iMP ≈11 (**).
- **D** — GO of 160 clock-driver genes.

No images.

---

### Figure 5 — `fig5_plasma_proteomics_imgl.png` (1504 × 2498)


- **A** — volcano, aging iMP vs aging Veh (labelled: Saa2, Ppp1r21, Apcs, Arhgap30 down; Adipoq,
  Mtus1, Gapdh up). **B** — heatmap of the 109 aging-DE proteins. **C, D** — SAA2 and SAP by
  discovery proteomics and PRM. **E–H** — correlations with NOL index and GluR2/3.
- **I** — iMGL: CC3 (green) / CD105 (red) / DAPI, four conditions; scale 50 µm (50 px). Arrows mark
  live, early-apoptotic (EA) and late-apoptotic (LA) cells. Cultured microglia are **elongated,
  bipolar or few-process cells**, sparse, not overlapping.
- **J, K** — % healthy, % CC3+ (early/late). **L** — pHrodo zymosan phase image, scale 200 µm.
  **M** — phagocytosis (% of Veh).
- **N** — iMGL IBA1 (green) / DAPI, scale 50 µm (35 px). Cells are spindle/bipolar or with 2–4
  short processes, scattered with little contact — a far simpler shape than tissue microglia.
- **O** — **Branch length per cell (µm)**: ≈65–70 in every condition (ns).

---

### Figure 6 — `fig6_5xfad_microglia_mossy.png` (2051 × 1948)


- **A** — 5xFAD schematic, start at 4 or 9 months, twice weekly.
- **B–E** — NOL/NOR indices (young: NOR *; aging: NOL **).
- **F, H** — IBA1+ cells: CA1 (young ≈16 vs ≈16; aging ≈35 vs ≈33; ns).
- **G, I** — IBA1 branch length: CA1 (young ≈105 vs ≈118 ns; aging ≈80 vs ≈108 *).
- **J** — GluR2/3 (green) / DAPI in DG, Young/Aging × Veh/iMP; 100 µm bar (62 px). Green
  vessel-like streaks are visible in the hilus. **K, L** — % GluR2/3+ cells.

No microglia images for 5xFAD — only the plotted numbers.
