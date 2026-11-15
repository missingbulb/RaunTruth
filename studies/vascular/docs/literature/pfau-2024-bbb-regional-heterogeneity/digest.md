# Reference digest — Pfau, Langen et al. 2024, blood–brain barrier heterogeneity between brain regions

> Self-contained digest of the source paper. **No need to reopen the PDF.**

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
- **PDF:** kept in the study's Drive Literature folder as
  `Characteristics of blood–brain barrier heterogeneity between brain regions revealed by profiling vascular and perivascular cells.pdf`,
  not in the repo.
- **One-line thesis:** the median eminence (ME), a circumventricular organ with naturally leaky
  vessels, differs from somatosensory cortex both in its capillary endothelial cells (~400–445
  differentially expressed genes; PLVAP⁺, fenestrated, MFSD2A⁻, GLUT1⁻, CLDN5⁻) and in their
  perivascular partners (no astrocyte endfeet, half the pericytes per EC, capillary-associated
  fibroblasts in an ECM-filled space), so BBB heterogeneity comes from both EC specialization and
  EC–perivascular cell interactions.

---

## 1. Why this matters to *our* task

**Mostly a molecular paper; the vessel morphometry is one figure, but that figure is directly
useful.**

- **A measured CD31 capillary diameter for mouse somatosensory cortex: 3.95 ± 0.49 µm** (mean ±
  s.d., 15 images, 5 mice; Fig. 1c). Their definition is the one our pipeline can compute itself:
  **CD31-covered area ÷ vessel length** for three capillaries per image, i.e. a mean projected
  width. That is a definition-matched anchor for CATEGORIZE: a caliber threshold near 5.5–5.9 µm
  (our `ARTERY_DIAM_PX = 9` on the Rust and Wang panels) sits above every per-image cortex mean in
  this figure (maximum 4.75 µm).
- **The same staining, two regions, a 2.4× diameter difference.** ME capillaries measure
  9.61 ± 1.82 µm on the same protocol. The calibrated Fig. 1c pair is a ready region-contrast test:
  a caliber metric that does not separate them is broken.
- **Linear density of EC nuclei along cortex capillaries: 1.93 ± 0.28 per 100 µm**, i.e. one EC
  nucleus per ~52 µm of capillary; and **cortex capillary lumens are formed by a single EC**
  (ME: more than one). Useful when an EC-nucleus channel (ERG) is available.
- **CD31 single-channel panels at known scale** (17 crops, 10 calibrated), §6. Cortex panels are
  sparse, clean capillary networks; ME panels are the opposite regime (dense, wide, hollow
  membrane-outlined tubes) and a hard transfer case.
- **Arteries are found with αSMA**, not with caliber (Extended Data Fig. 5a,b) — the same stance as
  Stefanitsch and Wang.

**What it does not cover:** hippocampus, frontal cortex, or any region other than somatosensory
cortex and ME; branch counts, segment lengths, total length, length density, tortuosity; caliber
*distributions* (only per-image means of three capillaries); arteriole or venule diameters; ageing
or disease.

## 2. The method

**Animals.** C57BL/6N wild type (Charles River 027) and reporter lines (Ai14, Aldh1l1-EGFP,
GFAP-GFP, Glast-CreER, TCF/LEF-GFP, Cdh5-CreERT2, Slco1c1-CreERT2, Pdgfrb-CreERT2,
Pdgfra-H2B-EGFP, ROSA26^LSL-ER-HRP^, Mfsd2a^ko^). 8–14 weeks, both sexes except scRNA-seq (male
only, killed at 08:00 to avoid oestrous and circadian variation). Reporter induction: tamoxifen
1 mg × 5 i.p., brains at 2 weeks; sparse labelling: one dose of 4OH-tamoxifen 0.4 mg, 1 week before.

**U.Clear (aqueous clearing; based on Adipo-Clear).** Ketamine/xylazine (100 mg kg⁻¹), cold 4%
PFA perfusion, overnight post-fix at 4 °C (for claudin-5: PBS perfusion and cold 100% methanol
drop-fix, then rehydration). Dissected to a **5 × 5 × 5 mm cube** of somatosensory cortex and a
similar cube of hypothalamus containing the ME. Delipidation in SBiP (200 µM Na₂HPO₄, 0.08% SDS,
16% 2-methyl-2-butanol, 8% 2-propanol, pH 7.4) ×4 (1 h, 2 h, 4 h, overnight); blocking in B1n
(0.1% Triton X-100, 2% glycine, 0.01% 10 N NaOH, 0.008% NaN₃), 37 °C 1 h; primary antibodies
2 days at 37 °C in PTxwH (0.1% Triton, 0.05% Tween-20, 0.002% heparin, 0.02% NaN₃ in PBS); 4 washes;
secondaries 2 days at 37 °C; 4 washes; SBiP ×4 again; washes in 0.5 mM Na₂HPO₄, PB, then PTS (75% PB,
25% 2,2′-thiodiethanol); equilibrated in histodenz with **refractive index 1.53**; stored at −20 °C.
Integrity was checked against thick sections (Extended Data Fig. 1f).

**Sections.** 25 µm coronal cryosections (KCC4/CD31), 5 µm paraffin sections (GeoMX), 100 µm
vibratome sections and 80 nm ultrathin sections (TEM).

**CD31 antibody.** Goat polyclonal anti-CD31, R&D Systems **AF3628**, 1:50 (1:100 as the
Alexa647 conjugate for GeoMX). Secondaries donkey anti-goat AF488 / Cy3 / AF647, 1:250. GLUT1
(Millipore 07-1401) and EMCN (sc-65495) replace CD31 where antibody species clash (Figs. 3d–f, 7d–e);
ICAM2 is the pan-EC marker in Fig. 5d.

**Imaging.** Leica **TCS SP8** confocal (LAS X 3.0.16120.2); U.Clear stacks 3D-reconstructed in
**Imaris 9.3.1**; sections processed in **Fiji 2.1.0**; Olympus VS120 slide scanner; JEOL 1200EX TEM
with AMT 2k CCD.

**Vessel morphometry (the part that matters here).** From **three ~50 µm-thick 40× confocal stacks
of capillaries per region per mouse**, n = 5 mice, analysed blind:
- **Capillary diameter:** "the area covered by three different capillaries in each image, labeled by
  CD31 immunostaining, was measured and divided by their respective vessel length"; the mean of the
  three is one data point (the Methods says "average capillary length" here, an evident slip for
  diameter).
- **EC density:** ERG⁺ EC nuclei counted and divided by total capillary length.
- **Pericyte coverage:** GFP⁻ Tomato⁺ pericytes (Pdgfra-H2B-GFP; Pdgfrb-CreERT2:Ai14) per ERG⁺ EC.
- Statistics: mean ± s.d., **nested two-tailed t-test** (GraphPad Prism 8); normality assumed,
  not tested.

**Serial TEM.** A published mouse visual-cortex volume (450 × 450 × 50 µm, 40 nm sections); ECs and
pericytes traced by hand in TrakEM2 and rendered in Blender. Vessel 1: 794 sections (31.8 µm), 66
excluded; vessel 2: 490 sections (19.6 µm), 28 excluded; vessels 3 and 4 over 22 µm and 6.5 µm.

**Transcriptomics (summarized; not our task).** inDrops scRNA-seq of ME and a size-matched cortex
piece (~0.05 × 0.2 × 1.2 mm³), five mice pooled per replicate, 15 days, 52 libraries; Seurat 4 with
EmptyDrops, scrublet (>0.25), SoupX; cells kept with ≥500 genes, ≥750 reads, ≤15% mitochondrial,
novelty ≥0.4; 30 PCs; DE by Wilcoxon, |log₂FC| > 0.6, adjusted P < 0.05. GeoMX whole-transcriptome
spatial profiling of DES⁺GFP⁻ (pericyte) and DES⁻GFP⁺ (fibroblast) areas, 79 segments, 53 kept from
4 animals, linear mixed model, FDR < 0.05, |log₂FC| > 1. Ligand–receptor analysis with CellChat 1.6.0
and a co-expression interaction score (bootstrap null, score > 40 ⇔ one-sided P < 0.01 after
Bonferroni).

**Gaps — parameters the paper does not state:** objective NA and immersion; pixel size, zoom and
z-step of any stack; whether the shown panels are maximum projections, slices or Imaris renders;
which software measured area and length, and how the capillary boundary was thresholded; how a
vessel was chosen as a "capillary" (no diameter cut-off or marker rule); which cortical layer or
depth was imaged; any tissue expansion or shrinkage from U.Clear; whether cortex and ME panels in one
figure row share magnification.

## 3. The reported numbers

Fig. 1c, 1d and 5f give no numbers in the text. **The values below are computed from the plotted
points' vector coordinates in the PDF** (exact positions, not eyeballed): 15 points per group,
three per mouse. The mean and s.d. bars drawn on each plot agree with the points to the third
decimal, which confirms the reading.

| Quantity | Cortex | ME | n / stats |
|---|---|---|---|
| Capillary diameter (CD31 area ÷ length) | **3.95 ± 0.49 µm** (range 3.28–4.75; per-mouse 3.57–4.27) | **9.61 ± 1.82 µm** (7.14–12.56; per-mouse 8.40–11.18) | 5 mice × 3 images; P = 3.604601 × 10⁻⁶, nested t-test |
| EC nuclei (ERG⁺) per 100 µm capillary | **1.93 ± 0.28** (1.43–2.28) | **5.60 ± 0.91** (4.07–7.32) | 5 × 3; P = 4.569415 × 10⁻⁶ |
| Pericytes per EC | **0.29 ± 0.03** (0.24–0.34) | **0.16 ± 0.02** (0.13–0.20) | 5 × 3; P = 4.793057 × 10⁻⁶ |
| ECs forming one capillary lumen | one | more than one | Cdh5-CreER sparse labelling, Fig. 1e (qualitative) |

**Pericyte–EC contacts along cortex capillaries (serial TEM, 4 vessels, one animal; Fig. 5c,
% of sections):** close contact ~83% on average; peg-and-socket 13.8% (vessel 2), 46% (1), 50% (4),
85% (3); pericyte contact with EC tight-junction clefts 64% (1), 40% (2), 25% (3), none detectable
over the 6.5 µm of vessel 4.

**Cell counts.** 58,117 cells after QC (35,879 ME, 22,238 cortex; Fig. 2 legend says 58,238 /
35,934 / 22,304 — the paper's own discrepancy); ECs ~4%. 2,284 ECs in 7 subtypes: cECs 1 733,
cECs 2 647, aECs 1 272, vECs 224, Plvap ECs 125, aECs 2 109, tip cells 36 (36 of 37 tip cells from
ME). 8,508 astrocytes in 4 subtypes (ME 1 3,619, cortex 3,197, ME 2 1,001, GFAP-high 678, 96% of the
last from ME). 714 fibroblasts in 4 subtypes. 445 DE genes between ME and cortex cECs; 137 between
ME and cortex pericyte-enriched GeoMX regions.

## 4. Arguments worth keeping

- **Diameter as area ÷ length.** A cheap, definition-transparent caliber measure: the projected
  mask area of a capillary over its centerline length. It is a mean width, so it hides tapering and
  local swellings; three capillaries per image is a small sample.
- **ME capillaries look nothing like cortex capillaries** in CD31: wide, closely packed, often
  outlined by membrane staining with a darker lumen, sitting in an ECM-filled perivascular space
  with fibroblasts. A detector tuned on cortex will over-merge them (our quick Otsu check put 77–80%
  of the ME panels in foreground, §6).
- **Arteries are identified by αSMA⁺ smooth muscle**, and capillaries by the absence of arteriolar
  and venous markers and of SMCs; no caliber rule is used anywhere.
- **Cortex cEC-enriched genes (IGF1R, BSG, SPOCK2, GLUT1, CLDN5, MFSD2A) are shared by BBB
  capillaries throughout the brain**; the authors expect other cortex-enriched genes to be
  region-specific. Hippocampus and basal ganglia are named in the introduction as regions with BBB
  heterogeneity, citing other work only.
- **Authors' limits:** two regions only; scRNA-seq of ME inevitably includes ME-adjacent BBB
  vessels; GeoMX does not isolate single cells; ligand–receptor pairs are candidates, with only
  Bsg–Itga6 and VEGF–VEGFR2 checked by staining; normality assumed, not tested.

## 5. What is not in this PDF

- **Supplementary material is not in this PDF:** Supplementary Videos 1–6, Supplementary Figs. 1–3,
  Supplementary Table 1 (DE genes, pathways, ligand–receptor pairs) and Table 2 (antibodies; the
  Reporting Summary lists them, transcribed in §2 only for vessel stains) and Table 3 (marker
  genes). Not fetched; none is needed for vessel morphometry except possibly the videos (3D U.Clear
  stacks).
- **Data and code (not fetched):** GEO **GSE241206** (scRNA-seq and GeoMX); Single Cell Portal
  **SCP2553**; ligand–receptor code at `github.com/gulabneuro/scRNAseq-ligand_receptor`. No raw
  confocal stacks are deposited.
- **No numbers in the text** for Fig. 1c, 1d, 5f; §3 takes them from the plot vectors.
- **Deliberately omitted:** gene lists and pathway names beyond the validated markers, astrocyte and
  fibroblast subtype comparisons to published atlases (Extended Data Figs. 6, 7g–j, 9i), GeoMX QC
  detail, reference list. Cross-checked against the full text.

## 6. Calibration of the extracted panels

17 CD31 single-channel crops; inventory and caveats in
[`figures/panels/README.md`](figures/panels/README.md). **Bars are measured in pixels on the
300-dpi figure PNGs** (longest bright run at threshold 128) and cross-checked against the bar's
vector length in the PDF (main figures: bar points × 300/72); the two agree within 1 px.

| Panel prefix | Bar | Bar px | µm/px | Field width |
|---|---|---|---|---|
| `pfau24fig1a_cortex` | 100 µm | 23 | 4.35 | ~1,180 µm |
| `pfau24fig1b_cortex` | 10 µm | 20 | 0.50 | ~135 µm |
| `pfau24fig1c` (cortex and ME, one row) | 20 µm | 31 | 0.645 | ~178 µm |
| `pfau24fig3c_cortex` | 10 µm | 31 | 0.323 | ~77 µm |
| `pfau24ed1a_cortex` | 10 µm | 30 | 0.333 | ~110 µm |
| `pfau24ed1d_cortex` | 10 µm | 19 | 0.526 | ~174 µm |
| `pfau24ed2d_cortex` | 20 µm | 50 | 0.40 | ~133 µm |
| `pfau24ed5a_cortex` | 100 µm | 52 | 1.92 | ~627 µm |
| `pfau24ed5b_cortex` | 20 µm | 46 | 0.435 | ~142 µm |

**Not calibrated:** the ME rows of Fig. 1a, 1b, 3c and Extended Data Figs. 1a, 1d, 5a, 5b. Each
bar is drawn on the cortex row only, and cortex and ME are separate acquisitions, so nothing on the
figure fixes the ME rows' scale. Fig. 1c is the exception: cortex and ME sit side by side in one
row under one bar, which the repo treats as one scale per row (the Rust 2020 precedent).

**Cross-check against biology** (rough Otsu mask, median 2 × distance-to-edge on the skeleton,
for checking scale only, not a result): Fig. 1c cortex **3.9–4.7 µm** against the authors' own
3.95 µm for this kind of image; Fig. 1b 4.0 µm, Extended Data 1d 3.8 µm, 2d 4.3 µm, 5b 4.4 µm. Weak
spots: Fig. 3c cortex (0.32 µm/px) and Extended Data 1a gave 1.4–3.6 µm, because CD31 at that
zoom outlines a hollow tube and the crude mask splits the walls; the bars themselves agree with the
PDF vectors. **Fig. 1a (4.35 µm/px) and Extended Data 5a (1.92 µm/px) cannot resolve capillary
width** (capillaries are 1–2 px): use them for area fraction and coarse network only, never for
caliber.

**The authors' own drawing is inconsistent by 2.6%:** Fig. 1c and 1d both draw a "20 µm" bar in
the same raster, at 7.42 pt and 7.61 pt. That is the size of the scale uncertainty on any one panel.

## 7. Extracted images

All 7 figures and 10 Extended Data figures, described with the images inline in
[`figures/README.md`](figures/README.md):

| File | What | Vessel content |
|---|---|---|
| `fig1_me_vs_cortex_vessel_morphology.png` ⭐ | U.Clear CD31, tracer, MFSD2A; **capillary diameter and EC density plots**; TEM; PDGFRβ/AQP4 | CD31 cortex and ME at 4 scales |
| `fig2_scrnaseq_cell_types.png` | UMAP of 58k cells, 11 types | none |
| `fig3_me_specific_capillary_ecs.png` | EC subtypes; EMCN, ESM1, IGF1R, BSG staining | CD31 (3c), GLUT1/EMCN |
| `fig4_astrocyte_subtypes.png` | astrocyte subtypes and their vessel contacts | CD31 merged with reporters |
| `fig5_pericytes.png` | serial TEM pericytes, ICAM2/PDGFRβ, **pericyte : EC ratio** | ICAM2 single channel (5d) |
| `fig6_capillary_fibroblasts.png` | ME fibroblasts (TEM, reporter, DECORIN/COL1) | CD31 merged |
| `fig7_ligand_receptor_signalling.png` | ligand–receptor pairs; BSG/ITGA6; VEGF/VEGFR2 | GLUT1/EMCN |
| `edfig1_vascular_differences.png` | tracer, GLUT1/PLVAP, CLDN5, MFSD2A knockout, thick section | CD31 (1a, 1d, 1f) |
| `edfig2_tem_and_aqp4.png` | TEM of cortex and ME capillaries; AQP4 | CD31 (2d) |
| `edfig3_scrnaseq_qc.png` | scRNA-seq QC | none |
| `edfig4_ec_subtype_genes.png` | EC zonation markers, DE heatmaps | none |
| `edfig5_arteries_and_validation.png` ⭐ | **CD31/αSMA arteries**, PLVAP, SPOCK2, TCF/LEF Wnt reporter | CD31 (5a, 5b, 5c) |
| `edfig6_ec_comparison_to_other_tissues.png` | overlap with peripheral EC atlases | none |
| `edfig7_astrocytes.png` | astrocyte subtype detail, Slco1c1 reporter, GLAST, tanycytes | CD31 (7d, 7l, 7m, 7o) |
| `edfig8_mural_cells.png` | serial TEM sections, pericyte renders, GeoMX DE | GLUT1/EMCN |
| `edfig9_fibroblasts.png` | fibroblast subtypes and renders | CD31 (9c, 9d), Cdh5-tdTomato |
| `edfig10_ligand_receptor.png` | CellChat bubble plots, interaction-score table | none |
