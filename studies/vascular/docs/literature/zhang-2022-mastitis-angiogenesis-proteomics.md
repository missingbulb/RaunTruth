# Reference digest — Zhang et al. 2022, angiogenesis-related proteins in bovine hemorrhagic mastitis

> Self-contained digest of the source paper. **No need to reopen the PDF.**

- **Title:** *DIA proteomics identified the potential targets associated with angiogenesis in the
  mammary glands of dairy cows with hemorrhagic mastitis*
- **Authors:** Quanwei Zhang\*, Xu Bai, Jun Shi, Xueying Wang, Bohao Zhang, Lijun Dai, Ting Lin,
  Yuan Gao, Yong Zhang, **Xingxu Zhao\*** (\*corresponding). Gansu Agricultural University,
  Lanzhou, China.
- **Venue / id:** *Frontiers in Veterinary Science* (2022) **9:980963**, Original Research.
  Published 08 Aug 2022. DOI **10.3389/fvets.2022.980963**. 15 pages.
- **Licence:** **CC BY** (stated on page 1: "distributed under the terms of the Creative Commons
  Attribution License (CC BY)").
- **PDF:** kept in the study's Drive Literature folder as `DIA proteomics identified the potential targets associated with angiogenesis in the mammary glands of dairy cows with hemorrhagic mastitis.pdf`, not in the repo.
- **One-line thesis:** in mammary glands of Holstein cows with hemorrhagic mastitis (n = 3 vs 3
  healthy), arterioles, venules and capillaries are histologically damaged; DIA proteomics finds
  3,739 differentially expressed proteins, 99 of them in blood/vascular/angiogenesis GO terms and
  KEGG pathways, and **Caveolin-1 (CAV1)** is down-regulated at mRNA and protein level.

---

## 1. Why this matters to *our* task

**Relevance is low.** Different species (cow), different tissue (mammary gland), different
disease (inflammatory hemorrhage), 5 µm paraffin sections on a slide scanner rather than
confocal z-stacks of brain. The paper's subject is proteomics; the vessel imaging is
qualitative illustration.

What it explicitly does **not** give us:

- **No vessel quantification of any kind.** No microvessel density, no vessel count, no area
  fraction, no diameter, no length, no branch count. The only measured numbers are omics
  counts, relative CAV1 mRNA (qPCR) and CAV1 western-blot optical density.
- **No image-analysis method.** CD31 is used only for qualitative co-localization.
- **No network images.** Every vessel shown is a single cross-section (one arteriole, one venule,
  one capillary per panel) in a thin section, not a connected network.

The few points of marginal interest:

1. **A CD31 immunofluorescence channel shown in isolation** (Fig 8 row B), in a 5-channel layout
   (DAPI / CD31 / α-SMA / CAV1 / merge) per vessel type. It shows how weak and punctate CD31 can
   look in a slide-scanned paraffin section: the capillary panels (B5, B6) are mostly speckle, and
   in the disease case (B4, B6) the vessel outline is barely recoverable. Useful only as an example
   of a CD31 channel a segment-and-skeletonize pipeline would fail on.
2. **The arteriole / venule / capillary triad separated by α-SMA**, consistent with the
   corpus's caliber/marker logic (α-SMA marks the smooth-muscle coat of arterioles and venules,
   not capillaries) — see Stefanitsch 2015 and Wang 2022 for the quantitative versions.
3. **Damaged-vessel phenotype vocabulary** (endothelial detachment, collapsed lumen, media/
   adventitia separation, dilated capillaries) — pathology terms, not a metric.

Nothing here changes what we build.

---

## 2. Methods

### Animals and tissue
- Holstein cows: healthy lactating (**C, n = 3**) vs hemorrhagic mastitis (**HM, n = 3**), from a
  commercial farm in Wu Zhong City, Ningxia, China. HM diagnosed by veterinary clinical exam and
  milk observation; somatic cell count and other criteria "as described previously" (ref 14) —
  thresholds not stated here.
- Mammary glands collected at slaughter; snap-frozen in liquid nitrogen or fixed in **4% PFA**.
- Ethics: Gansu Agricultural University, GSAU-AEW-2018-0128.

### DIA proteomics
- **Orbitrap Exploris 480** (Thermo Fisher); direct DIA, "as described previously" (ref 15).
- Searched against the bovine reference genome **NCBI_GCF_002263795.1**; **Spectronaut 14**
  (Biognosys), default parameters.
- **Q value (FDR) cutoff 1%** at precursor and protein level; protein quantified as the average of
  the **top three** filtered peptides.
- **DEP criteria: |fold change| > 1.50 and Q < 0.05**, in R.
- GO and KEGG enrichment significant at **Q ≤ 0.05**.
- PPI networks: STRING v10.0, Cytoscape 2.8.1 (ClueGO), Ingenuity Pathway Analysis. Phenotype
  prediction from the Mouse Genome Informatics database. Plots in R and OmicShare tools.
- Data deposited: **iProX / ProteomeXchange IPX0003382000 / PXD028100**.

### Histology (H&E)
- Paraffin (Solarbio), **5 µm** sections, Leica microtome; H&E "as described previously" (ref 23).
- **Olympus BX53M** microscope. "At least in triplicate".

### CAV1 immunohistochemistry
- Citrate-buffer antigen retrieval; ABC (avidin-biotin-peroxidase) kit, Bioss.
- Rabbit polyclonal **anti-CAV1, Bioss, 1:300**. Negative control: PBS instead of primary.
- Olympus microscope (model not stated for IHC).

### Immunofluorescence (the vessel-marker part)

| Target | Marks | Primary dilution | Secondary fluorophore |
|---|---|---|---|
| **CD31** | vascular endothelial cells | **1:250** | **Cy5** (shown pseudocoloured magenta) |
| α-SMA | vascular smooth muscle | 1:200 | Cy3 (shown red) |
| CAV1 | — (target protein) | 1:150 | FITC (shown green) |
| DAPI | nuclei | 10 µg/mL, 5 min | — |

- All primaries and secondaries from **Bioss** (Beijing); secondaries at **1:300**.
- Protocol "as previously described" (ref 25).
- Imaged on a **Pannoramic DESK slide scanner (3DHISTECH)** — a whole-slide scanner, **not a
  confocal**, on 5 µm sections: effectively 2-D.

### qPCR and western blot
- RNA: FastPure kit (Vazyme); NanoDrop-8000; 1 µg RNA to cDNA (BioTeke). LightCycler 96 (Roche),
  20 µL reactions, SYBR Premix Ex Taq II; 2^−ΔΔCT against GAPDH.
- Primers: CAV1 F `GCCGTGTCTATTCCATCT`, R `ATTTCTTTCTGCGTGTTG`; GAPDH F `GGTCACCAGGGCTGCTTT`,
  R `CTGTGCCGTTGAACTTGC`.
- Western: RIPA extraction from 100 mg tissue; band optical density in Image-Pro Plus 6.0;
  β-actin control.
- Stats: mean ± SD; SPSS 21; Student's t-test (two groups) or one-way ANOVA; P < 0.05.

### Gaps — parameters the paper does not state

- **Any imaging parameter for the IF**: objective, numerical aperture, pixel size, exposure,
  channel filters, scanner magnification setting, z-handling. None stated.
- Antibody catalogue numbers and clones for CD31, α-SMA, CAV1 (only "Bioss").
- Blocking, incubation times and temperatures for IHC/IF (deferred to refs 18, 24, 25).
- How fields were chosen for the representative images; how many fields/sections per animal.
- No vessel quantification exists, so no counting method, threshold, or ROI definition to report.
- HM diagnostic thresholds (SCC cut-off), animal ages, parity, lactation stage.
- qPCR cycling program (deferred to refs).
- Which statistical test produced each figure's asterisks (t-test is the likely one for two
  groups, but it is not said per figure).

---

## 3. Results — the numbers

### Proteomics (Fig 2)

| Quantity | Value |
|---|---|
| Precursors | 76,255 |
| Peptides | 63,103 |
| Protein groups | 7,618 |
| Proteins | **20,355 in the text; 20,335 in Fig 2A** (internal discrepancy) |
| Proteins from 1 peptide / ≥ 11 peptides | 17% / 25% |
| DEPs (HM vs C) | **3,739** — 2,718 up, 1,021 down |
| Significant terms (P.adjust < 0.05) / all | BP 819 / 3,261; MF 103 / 588; CC 66 / 340; KEGG 68 / 325 |

### Vascular candidate selection (Figs 3–6)

- GO: 3 vasculature terms → 27 DEPs; 20 blood terms → 56 DEPs; union **59** (3 only-vasculature,
  24 shared, 32 only-blood). 49 of 59 up, 10 down.
- KEGG: 4 pathways — VEGF signaling (ko04370), prolactin signaling (ko04917), renin-angiotensin
  system (ko04614), fluid shear stress and atherosclerosis (ko05418) — **49** DEPs, 39 up, 10 down.
  Upset plot set sizes: shear stress 24, VEGF 12, prolactin 10, RAS 3 (as drawn).
- GO ∪ KEGG = **99** DEPs (50 GO-only, 40 KEGG-only, **9 shared**: CAV1, PRKCB, ACTB, CYBA,
  STAT1, ACTG1, PRCP, AGT, HSPB1). Of the 9, CAV1 alone is down (log2FC ≈ −3.5 as read off
  Fig 6C); STAT1 and CYBA the largest up (≈ +3.5 read off the bar chart).
- MGI phenotype mapping flags **AGT, PRKCB, CAV1** as cardiovascular-related.

### CAV1 validation (Fig 7)

- **qPCR**: CAV1 mRNA significantly lower in HM (**P < 0.05** in text; Fig 7E marks `**`).
  Per-animal bars read roughly C1 1.0, C2 1.6, C3 1.3 vs HM1 0.1, HM2 0.15, HM3 0.3 (read off the
  plot, not tabulated in the paper).
- **Western**: CAV1/β-actin integral OD significantly lower in HM (P < 0.05, `*`). Bars read
  roughly 0.69 / 0.76 / 0.71 vs 0.47 / 0.59 / 0.36 (read off the plot).
- IHC: CAV1 in mammary epithelial cells, VECs and VSMCs; weaker in HM except in capillary VECs,
  where it is strong in both groups.

### Histology and IF — qualitative only

- C: intact alveoli; arterioles regular with intact intima; venules with smooth endothelium;
  capillaries a single intact endothelial layer.
- HM: alveoli filled with RBCs and neutrophils; arteriolar endothelium detached, lumen collapsed;
  venular endothelium detached, media and adventitia separated; capillaries severely dilated,
  surrounded by inflammatory cells.
- IF: CD31 in VEC cytoplasm, "particularly in the arterioles of the C group (Figure 8B3)" — but
  B3 is in the **venule** column of the figure; the text and figure disagree on which vessel type
  B3 shows.

**No vessel number of any kind is reported.**

---

## 4. Calibration facts

No panel from this paper enters the working dataset (§6), so nothing was measured and **no
`SCALEBAR_PX`, `UMPP_DIRECT` or `UNCALIBRATED` entry is proposed.** For the record, the drawn bars
and the captions disagree, so anyone who does use a panel must read the bar in the panel:

- **Fig 1**: caption says "(100 ×)" for every panel, then "Scale bar of 50, 100, and 20 µm
  represents 400 ×, 200 x, and 800 × magnification". Drawn bars: A 100 µm, B–D 50 µm, E–H 20 µm.
  **A and B are a C-vs-HM pair at different magnifications.**
- **Fig 7**: caption says 50 and 20 µm bars; drawn bars are **50 µm** (all IHC panels and B3–D4)
  and **100 µm** (A3, A4). No 20 µm bar appears.
- **Fig 8**: caption says 50 and 20 µm bars; drawn bars are **20 µm** (arteriole and venule
  columns) and **10 µm** (capillary columns A5–E6). No 50 µm bar appears.
- The pairing of magnification (e.g. "400×") to µm/px is not stated, and the scanner pixel size is
  not given.

---

## 5. Discussion arguments worth keeping, and limitations

- Authors frame HM as a vessel-permeability / vessel-injury disease and link the candidate
  proteins to VEGF signaling (AGT, HSPB1, STAT1 cited as VEGF-pathway angiogenesis mediators).
- CAV1 is a binding partner and negative regulator of eNOS in endothelium; its loss is offered as
  a link to angiogenesis dysregulation. Mechanism is stated as "incompletely elucidated".
- **Unstated limitations worth noting**: n = 3 per group; "angiogenesis" is inferred from GO/KEGG
  term membership, never measured (no vessel density or sprouting readout); images are single
  representative fields.
- **Internal inconsistencies**: protein count 20,355 vs 20,335; Fig 8B3 called arteriole in text
  but sits under "Venules"; scale-bar captions of Figs 1, 7 and 8 do not match the drawn bars;
  Fig 5A legend misspells "Fluid" as "Fluclass".

---

## 6. What is not in this PDF

- **Supplementary Tables 1–4** (all 3,739 DEPs; the 59 GO candidates; the 49 KEGG candidates; MGI
  phenotypes) are online at
  `https://www.frontiersin.org/articles/10.3389/fvets.2022.980963/full#supplementary-material`.
  **Not fetched**: they are protein lists with no bearing on vessel measurement.
- Raw proteomics: ProteomeXchange **PXD028100** / iProX **IPX0003382000**. Not fetched.
- No code, no image data, no native-resolution micrographs released.

---

## 7. Extracted images

The PDF carries eight raster figures. The three **micrograph** figures are described in [`figures/README.md`](#figures). Figures 2–6 are bioinformatics charts
(bar/pie charts, bubble plots, Venn and upset diagrams, volcano plots, heat maps, PPI networks);
every number in them that matters is transcribed in §3, so they are described there. No image is in the repo: the study
keeps no binaries in git.

**No `panels/` folder, deliberately.** The only isolated single-channel vessel images are the six
CD31 panels of Fig 8 row B. Each shows **one vessel cross-section** in a 5 µm slide-scanned
section, partly circled by a drawn dashed line; the capillary panels hold a single few-micron
profile inside a dashed box amid speckle. None is a vessel network, so none is a legitimate
input to a segment-skeletonize-and-count pipeline, and the `VESSEL_` contract stays unbroken.

| File | Fig | Content |
|---|---|---|
| `figures/fig1_HE_alveoli_and_vessels.png` | 1 | H&E: alveoli, arterioles, venules, capillaries, C vs HM. |
| — (not committed) | 2 | Proteome summary: identification counts, peptide distribution, DEP counts, GO/KEGG counts, top-20 BP and KEGG. |
| — (not committed) | 3 | GO bubble plot + term table, Venn (3/24/32), volcano, heat map of 24 shared DEPs. |
| — (not committed) | 4 | ClueGO network of 59 DEPs and 25 GO terms. |
| — (not committed) | 5 | KEGG circle plot of 4 pathways, heat map of 49 DEPs, volcano, upset plot. |
| — (not committed) | 6 | Venn (50/9/40), heat map and log2FC of 9 shared DEPs, PPI of 99 DEPs, MGI phenotype grid. |
| `figures/fig7_CAV1_IHC_qPCR_western.png` | 7 | CAV1 IHC by vessel type with negative controls; qPCR and western bars. |
| `figures/fig8_IF_DAPI_CD31_aSMA_CAV1.png` | 8 | IF: DAPI / **CD31** / α-SMA / CAV1 / merge for arteriole, venule, capillary, C vs HM. |

---

## Figures

The three micrograph figures, described from the PDF (kept in the study's Drive Literature folder
as `fvets-09-980963.pdf`) with `_tools/extract_pdf_assets.py` at the resolution embedded in the PDF.
Licence CC BY. The images are not in the repo: the study keeps no binaries in git. Digest: [`../digest.md`](#).

Figures 2–6 are omics charts; their content is transcribed in the digest §3.

> **No `panels/` folder, deliberately.** All tissue is 5 µm paraffin sections of cow mammary
> gland on an Olympus microscope or a Pannoramic slide scanner. The only single-channel vessel
> images (Fig 8 row B, CD31) each show one vessel cross-section, not a network. Reasoning:
> [`../digest.md`](#) §7.

Scale bars below are the ones **drawn on the panels**; the captions state different values (digest
§4). No bar was measured in pixels.

---

### Fig 8 — `fig8_IF_DAPI_CD31_aSMA_CAV1.png` (the one closest to us)

*Image not in the repo: the study keeps no binaries in git. Render it from the PDF in the Drive Literature folder.*

3780 × 3140 px. A 5 × 6 grid. Columns: arteriole Con / HM, venule Con / HM, capillary Con / HM.
Rows: **A** DAPI (blue), **B** CD31 (Cy5, shown magenta), **C** α-SMA (Cy3, red), **D** CAV1
(FITC, green), **E** merge. Drawn bars: **20 µm** in columns 1–4, **10 µm** in columns 5–6.

What you actually see:

- **B1 (arteriole, Con)**: a faint, dotted CD31 ring inside a drawn dashed outline. **B2 (HM)**:
  diffuse speckle with a single bright elongated profile; the ring is not recoverable without the
  dashed outline.
- **B3 (venule, Con)**: the clearest CD31 image — a continuous, convoluted endothelial outline,
  labelled "VE". (The text calls B3 an arteriole; it sits under "Venules".) **B4 (HM)**: diffuse
  network-like speckle, no clear lumen.
- **B5 / B6 (capillary)**: almost all background speckle; one small CD31-positive profile inside
  a dashed box in B5, none distinguishable in B6's box.
- Row C (α-SMA) is far brighter and more continuous than CD31: thick smooth-muscle rings around
  the Con arteriole (C1) and venule (C3); fragmented blobs in HM (C2, C4); in C5 the many
  α-SMA rings are other vessels, and the boxed capillary is α-SMA-negative.
- Drawn **white dashed outlines and boxes** cross the vessels in rows A, B, D and E, and white
  text labels (VE, VSM, VEC, VV, LY, NEUT) sit on the image — any pipeline run on these would
  segment the annotations.

### Fig 1 — `fig1_HE_alveoli_and_vessels.png`

*Image not in the repo: the study keeps no binaries in git. Render it from the PDF in the Drive Literature folder.*

827 × 1039 px. H&E, 4 rows × 2 columns (Con | HM): **A/B** alveoli, **C/D** arterioles, **E/F**
venules, **G/H** capillaries. Drawn bars: A **100 µm**; B, C, D **50 µm**; E–H **20 µm** — so the
alveoli pair A/B is shown at different magnifications. Con alveoli are open with an intact
epithelial lining (dashed outline in A); HM alveoli are packed with RBCs and neutrophils. The Con
arteriole (C, dashed outline) has a defined smooth-muscle wall; the HM one (D) has a collapsed
lumen. HM venule (F) is distended and filled with RBCs. Capillaries (G, H) are only a dashed box
around a few cells — at this scale a capillary is a handful of nuclei, not a tube.

### Fig 7 — `fig7_CAV1_IHC_qPCR_western.png`

*Image not in the repo: the study keeps no binaries in git. Render it from the PDF in the Drive Literature folder.*

1535 × 2034 px. **A1–D2**: CAV1 IHC (DAB brown, haematoxylin counterstain) in alveoli, arterioles,
venules and capillaries, Con | HM. **A3–D4**: matching negative controls (no primary), blue only.
Drawn bars **50 µm** everywhere except A3 and A4, which carry **100 µm**. Dashed outlines mark the
alveolus, arteriole wall and venule; a red dashed box marks an RBC in D2. **E**: relative CAV1
mRNA per animal (C1–C3 red, HM1–HM3 blue), `**`. **F**: western blot (CAV1 20 kDa, β-actin
42 kDa) with integral OD bars, `*`. The bar values are only drawn, not tabulated; the digest §3
gives readings off the plot, marked as such.

---

### Figures 2–6 (described for completeness)

- **Fig 2** — A: identification bars (76,255 / 63,103 / 7,618 / 20,335); B: pie of peptides per
  protein; C: DEPs up 2,718, down 1,021; D: GO/KEGG term counts (all vs P.adjust < 0.05);
  E/F: top-20 BP and KEGG bubble plots (rich factor 0.15–0.35 and 0.2–0.5).
- **Fig 3** — A: −log10(Q) vs z-score bubble plot with a table of the 23 GO IDs (3 vasculature,
  20 blood); B: Venn 3 / 24 / 32; C: volcano, 49 up / 10 down; D: heat map of 24 shared DEPs.
- **Fig 4** — ClueGO network of 59 DEPs and 25 GO terms, angiogenesis terms enlarged at right.
- **Fig 5** — A: circular KEGG plot (ko04370 VEGF, ko04917 prolactin, ko04614 RAS, ko05418
  shear stress; legend misspelled "Fluclass"); B: heat map of 49 DEPs; C: volcano; D: upset plot.
- **Fig 6** — A: Venn 50 / 9 / 40; B: heat map of the 9 shared DEPs; C: log2FC bars (CAV1 the only
  down); D: concentric PPI network of 99 DEPs; E: MGI phenotype grid for the 9 DEPs.
