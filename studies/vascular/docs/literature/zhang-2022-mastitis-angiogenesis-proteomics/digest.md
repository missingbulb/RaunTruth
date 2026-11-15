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
- **PDF:** kept in the study's Drive Literature folder as `fvets-09-980963.pdf`, not in the repo.
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

The PDF carries eight raster figures. The three **micrograph** figures are committed (CC BY) and
described in [`figures/README.md`](figures/README.md). Figures 2–6 are bioinformatics charts
(bar/pie charts, bubble plots, Venn and upset diagrams, volcano plots, heat maps, PPI networks);
every number in them that matters is transcribed in §3, so they are described there but not
committed.

**No `panels/` folder, deliberately.** The only isolated single-channel vessel images are the six
CD31 panels of Fig 8 row B. Each shows **one vessel cross-section** in a 5 µm slide-scanned
section, partly circled by a drawn dashed line; the capillary panels hold a single few-micron
profile inside a dashed box amid speckle. None is a vessel network, so none is a legitimate
input to a segment-skeletonize-and-count pipeline, and the `VESSEL_` contract stays unbroken.

| File | Fig | Content |
|---|---|---|
| [`figures/fig1_HE_alveoli_and_vessels.png`](figures/fig1_HE_alveoli_and_vessels.png) | 1 | H&E: alveoli, arterioles, venules, capillaries, C vs HM. |
| — (not committed) | 2 | Proteome summary: identification counts, peptide distribution, DEP counts, GO/KEGG counts, top-20 BP and KEGG. |
| — (not committed) | 3 | GO bubble plot + term table, Venn (3/24/32), volcano, heat map of 24 shared DEPs. |
| — (not committed) | 4 | ClueGO network of 59 DEPs and 25 GO terms. |
| — (not committed) | 5 | KEGG circle plot of 4 pathways, heat map of 49 DEPs, volcano, upset plot. |
| — (not committed) | 6 | Venn (50/9/40), heat map and log2FC of 9 shared DEPs, PPI of 99 DEPs, MGI phenotype grid. |
| [`figures/fig7_CAV1_IHC_qPCR_western.png`](figures/fig7_CAV1_IHC_qPCR_western.png) | 7 | CAV1 IHC by vessel type with negative controls; qPCR and western bars. |
| [`figures/fig8_IF_DAPI_CD31_aSMA_CAV1.png`](figures/fig8_IF_DAPI_CD31_aSMA_CAV1.png) | 8 | IF: DAPI / **CD31** / α-SMA / CAV1 / merge for arteriole, venule, capillary, C vs HM. |
