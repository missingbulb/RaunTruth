# Reference digest: Baek et al. 2026, OPC–microglia crosstalk via BMP4 in Alzheimer's disease

> A self-contained digest of the source paper. The microglia imaging and quantification, the
> parameters the paper states and the ones it leaves out, the reported numbers and the figure
> descriptions are all here and in [`figures/README.md`](#figures).
> **You should not need to reopen the PDF.**

- **Title:** *Oligodendrocyte precursor cells–microglia crosstalk via BMP4 drives microglial
  neuroprotective response and mitigates Alzheimer's disease*
- **Authors:** Soonbong Baek, Jaemyung Jang, Seungeun Yeo, Hyun Jin Jung, Youngshik Choe\*
  (\*corresponding, dallarae@kbri.re.kr). Developmental Disorders & Rare Diseases Research Group,
  Korea Brain Research Institute (KBRI), Daegu, Republic of Korea.
- **Venue / id:** *Signal Transduction and Targeted Therapy* (Springer Nature) (2026) **11:109**,
  article type ARTICLE, marked OPEN. DOI **10.1038/s41392-026-02620-9**. Received 23 Sep 2025,
  revised 14 Jan 2026, accepted 28 Jan 2026, published online 25 Mar 2026. 16 pages (p. 16 is
  references and the licence; its lower half is blank).
- **Licence (exact wording, p. 16):** "This article is licensed under a Creative Commons
  **Attribution-NonCommercial-NoDerivatives 4.0** International License … You do not have
  permission under this licence to share adapted material derived from this article or parts of
  it." (**CC BY-NC-ND 4.0**.) © The Author(s) 2026.
  **The repo therefore holds no PDF and no figure crops.** Figures are described in words only, in
  [`figures/README.md`](#figures).
- **Owner's copy:** a "Microsoft Print to PDF" print with **no text layer**. Every page is an
  image, so nothing can be text-searched or copied. This digest was transcribed by reading page
  renders at 150–400 dpi. The embedded figure images are only print resolution, so fine
  tick labels and individual dots are approximate (see the "≈" notes below).
- **One-line thesis:** committed oligodendrocyte precursors (COPs, Bcas1⁺) raise **Bmp4** in
  response to amyloid. Bmp4 → microglial **Bmpr1a** → **pSmad1/5/8** directly drives **Trem2**
  transcription, which pushes microglia into the protective **DAM** state: they cluster around
  plaques, show more CD68 phagolysosomes, have more complex processes, and build a compacting
  barrier. Deleting OPC Bmp4 blunts all of this and worsens amyloid pathology in 5xFAD mice.
  Adding Bmp4 back (COP transplant, AAV-Sox10-Bmp4) improves it.

---

## 1. Why this matters to our task ⭐

This is **a biology paper, not a methods paper.** Microglia are its readout, not its subject of
method development. The imaging methods section is **missing from the main text**: the printed
Materials and Methods cover only injections, PLX5622/transplantation and statistics, and say
everything else is in the supplement, which we do not have. What it gives us is still concrete:

| What we get | Use for our algorithm |
|---|---|
| **An Imaris Filament Tracer reconstruction of Iba1⁺ microglia** (Fig 2q), with soma marked as dots and processes traced, scored as **terminal points per microglia** and **total process length per microglia (µm)**, 120 cells/condition. | The paper's operational definition of "number of extensions / branching" = **terminal points** (process tips), and "process size" = **summed traced length**. This is the same family as our planned per-cell skeleton metrics. |
| **Reference magnitudes for plaque-region cortical microglia in 4-month 5xFAD** (§4): ≈ 16 terminal points and ≈ 255 µm total process length per cell (WT-Bmp4); ≈ 7.5 tips and ≈ 185 µm when activated/blunted (cKO). Per-cell spread is wide: tips ≈ 2–32, length ≈ 30–650 µm. | Sanity range for our tip count and length outputs. A cell with 60 tips or 2 mm of processes means a merge error. **Caveat:** these are cortex, Imaris, unknown z-depth and objective, in an AD model, not hippocampus. |
| **Plaque-association operationalised:** a microglion is "plaque-associated" if its **cell body** is within **20 µm of the plaque edge**, giving ≈ 2.5–4 microglia per plaque. **Microglial coverage** = % of plaque perimeter covered by microglia (≈ 30–80%). | If the owner's slices are from AD-model mice, this 20 µm soma-to-edge rule is the standard to copy. It also warns that **plaque-associated microglia clump**, with several cells touching each other on one plaque, which is the hardest case for per-cell separation. |
| **CD68 measured as an area fraction inside Iba1:** "CD68⁺ area relative to the Iba1⁺ area" (%), ≈ 15% (WT-Bmp4) vs ≈ 10% (cKO). | Directly matches the owner's CD68 (555 nm) channel. A per-cell CD68/Iba1 overlap ratio is an established readout. The paper reports **area (2D)**, not volume. |
| **The visual vocabulary of reactive microglia** (§6): thick, short processes, enlarged soma, polarization toward plaques, and tightly packed clusters. | Tells us which morphologies the detector must survive. |

**What it does *not* give us:** no z-stack parameters, no objective/NA, no voxel size, no
threshold or Imaris settings (surface detail, seed size, thresholds), no soma volume, no
territory/convex-hull, no Sholl, no cell density in µm-calibrated form for healthy tissue, and
**no hippocampal morphology at all**. Morphology is cortex only; hippocampus appears only in
plaque counts and ELISA. Every morphology parameter we would need to reproduce Fig 2q is
listed as a gap in §3.3.

---

## 2. Experimental design (brief)

- **Model:** **5xFAD** mice (amyloid model) crossed with **Pdgfra-CreERT2** (OPC-specific,
  tamoxifen-inducible), **Bmp4^fl/fl**, and the **Rosa26-LSL-tdTomato (Ai9)** reporter.
  Both sexes, usually in equal numbers. Most histology is at **4 months**.
- **Manipulations:**
  1. **OPC ablation:** AAV-mCherry-flex-dtA (diphtheria toxin A), retro-orbital injection
     (ROI), 200 µl at 1×10¹² particles/ml, into 3-month Pdgfra-CreERT2;5xFAD. TAM 160 mg/kg i.p.
     twice, every other day, starting 5 days after ROI. Analysed 2 weeks after the last TAM
     (14 days; the scheme says day 21). TAM reduced Bcas1⁺ COPs by ≈ 70–80%.
  2. **OPC-specific Bmp4 cKO:** TAM at 3 months (two doses, alternate days). Analysis at
     4 months, 28 days post-TAM. ≈ 90% of Bcas1⁺ COPs were tdTomato⁺ 5 days after TAM.
  3. **Microglia depletion and transplant:** PLX5622 (MedChemExpress HY-114153) 100 mg/kg i.p.
     every other day × 5 in 2-month 5xFAD, which depleted ≈ 70% of endogenous microglia. Two
     days later, P10 WT CD11b-MACS microglia transduced with lenti-GFP (WT) or
     lenti-siBmpr1a-GFP (KD; siRNA2) were stereotaxically injected at AP −1.23, ML ±0.5:
     2.5×10⁵ cells per hemisphere at 5×10⁴ cells/µl in DPBS (WELGENE LB001-01), 1.5×10⁵ at DV −1.0
     and 1×10⁵ at DV −2.0, 5×10⁴ cells/min, 3 min pause. Anaesthesia 1.25% avertin 250 mg/kg.
     Analysed at 3 months, 20 days after transplant.
  4. **COP transplant:** primary COPs from Bmp4^fl/fl transduced with AAV-CAG-GFP (WT-COP) or
     AAV-CAG-Cre-GFP ( Bmp4 KO-COP), delivered by ROI (2×10⁵ cells/2 µl of AAV at
     1×10¹³ particles/ml) into 2-month 5xFAD. Analysis at 3 months.
  5. **AAV-Sox10-Bmp4:** AAV expressing Bmp4 under the Sox10 (COP-active) promoter, ICV into
     3-month 5xFAD, vs AAV-Mock. Behaviour at 4 weeks, postmortem at 5 weeks. Compared against a
     ubiquitous AAV-CMV-Bmp4.
- **In vitro:** human-induced microglia (hiMG), BV2, primary murine microglia, primary COPs;
  treated with oligomeric Aβ (oAβ), rhBMP4 / rmBMP4 (10 ng/ml), rmTGF-β1 (5 ng/ml), the BMP
  receptor inhibitor LDN-193189, siBMPR1A, BMPR1A overexpression.
- **Human tissue:** postmortem AD vs non-dementia control (NDC); Edinburgh Brain Bank and
  Netherlands Brain Bank. Used for IHC of BMP4/BCAS1 and pSmad1/5/8 in IBA1⁺ microglia only;
  no counts we can reuse as magnitudes.
- **Stats:** GraphPad Prism 10. Mean ± **s.e.m.** Unpaired two-tailed Student's t-test for two
  groups; one-way ANOVA + Tukey for >2 groups; two-way (repeated-measures) ANOVA + Sidak for
  factorial/repeated designs. Significance at adjusted p<0.05. *p<0.05, **p<0.01, ***p<0.001.
  n = animals per sex. Plaque / plaque-morphology dots = mean over 90–110 plaques per mouse;
  cell/plaque counts per area = mean over >6 sections per mouse; mRNA puncta = per cell over
  >6 sections per mouse.

---

## 3. Microglia imaging and quantification — in full, with the gaps named

### 3.1 Stains and reporters used on microglia

| Marker | Reads out | Where |
|---|---|---|
| **Iba1 / Aif1** (protein by IF; *Aif1* mRNA by RNAscope) | pan-microglia; used for morphology and coverage | Fig 1h, 2m/q, 3i, 4, 5g, 6i/j |
| **Trem2** (protein IF; *Trem2* mRNA RNAscope-ISH) | DAM marker; plaque-associated activation | Fig 1h/l/n/s, 3a/d, 5g, 6j |
| **CD68** | phagolysosome / phagosome load | Fig 1g, 2o/p, 3b |
| **pSmad1/5/8** (nuclear) | active BMP signalling in microglia | Fig 1u/v, 2k, 3b, 4j |
| **Bmpr1a** (protein; flow FITC; *Bmpr1a* mRNA) | BMP receptor on microglia | Fig 1o–t, 3f |
| **MX04 (methoxy-X04)** | compact / dense-core Aβ plaque (blue) | throughout |
| **Aβ (D54D2, 6E10)** | total / diffuse amyloid | throughout |
| **Lamp1** | dystrophic neurites around plaques | Fig 3p, 6m |
| **CD163 / Tmem119** | exclude peripheral macrophages, confirm microglia identity | Suppl. Fig 7m,n |

Microglia are counted/measured mostly in the **cortex**; plaque burden and ELISA also cover
**hippocampus / subiculum**. The owner images **hippocampus** with **Iba1 (488) + CD68 (555)** at
**20×**, so the directly comparable readouts here are **CD68⁺-area-within-Iba1** and
**plaque/microglia counts**, not the Imaris morphology (which is cortex).

### 3.2 The quantification rules the paper does state

- **Microglial morphology (Fig 2q–s, the closest thing to our target):**
  - Reconstruction with **Imaris Filament Tracer** from Iba1⁺ signal. Pink dots = microglial soma.
  - **No. terminal points per microglion** = count of process tips (branching/extension proxy).
  - **Process length per microglion (µm)** = summed traced process length.
  - n = 4 female mice, **120 microglia analysed per condition**.
  - No z-stack depth, voxel size, objective, or Imaris parameters are given.
- **Plaque-associated microglia (Fig 1h, 2n, 3e):** number of microglia whose **cell body lies
  within 20 µm of the Aβ plaque edge**, "based on distances measured from the microglial cell
  body." Each dot = mean over **90–110 plaques** per mouse.
- **Trem2⁺ microglia per plaque** (Fig 1h, 3e, 5j, 6): same 20 µm rule, counting only Trem2⁺ cells.
- **Microglial coverage / barrier (Fig 3i-j, 4n):** **% of plaque perimeter covered by microglia**
  (dense-core MX04⁺ plaques with a halo of Aβ-D54D2). Plotted as plaque diameter vs microglial
  coverage %, a negative correlation (Fig 3j: R² ≈ 0.83 both genotypes).
- **CD68 load (Fig 2o-p, 3b):** **CD68⁺ area relative to Iba1⁺ area (%)** in phagocytic microglia.
  2D area ratio; Fig 1g shows it at the single-cell level (white ROI boxes zoomed).
- **Plaque morphology (Fig 3k-q, 6l-n):** MX04⁺ dense-core plaque **count** (normalised to a
  random control mouse), **area per plaque (µm²)**, **circularity** (0–1), and **Lamp1⁺ area per
  plaque (µm²) within 20 µm**. Dots = mean over 90–110 plaques/mouse.
- **mRNA puncta (RNAscope):** *Trem2* / *Bmp4* / *Olig1* / *Aif1* puncta counted **per cell**,
  averaged over >6 sections or 10 random fields per mouse; e.g. *Bmp4⁺/Olig1⁺* COPs and *Trem2⁺*
  microglia "per 500 µm²".
- **Flow cytometry:** CD11b-enriched microglia, Bmpr1a-FITC × Trem2-PE quadrant gating
  (Fig 1q, 3f); % Trem2⁺Bmpr1a⁺.

### 3.3 Parameters NOT stated anywhere we can read (gap list — do not re-hunt the PDF)

These are all presumably in the **unavailable supplement**:
- **Objective / NA / microscope** for the histology (only "confocal visualization"; the vascular
  companion papers name Leica/Zeiss, this one does not in the main text).
- **z-stack:** step size, number of planes, total depth — nothing. Imaris work implies a stack but
  the depth is unknown, so "process length" and "terminal points" cannot be treated as truly 3D of
  a known thickness.
- **Voxel / pixel size (µm/px)** — not stated. The only spatial anchors are the **drawn scale
  bars** (10, 20, 50, 100, 200 µm; 2 mm on heatmaps) and the "per 500 µm²" counting-field label.
- **Imaris settings:** filament seed/soma diameter, threshold, detail, how overlapping cells were
  split. So per-cell separation in clusters is a black box.
- **Thresholds** for CD68⁺ area, Lamp1⁺ area, Bassoon/Homer1, MX04 area — none given.
- **Microglia density** in a µm-calibrated healthy baseline (only "per 500 µm²" / "per mm²" in AD
  tissue, model-specific).
- **Soma size / volume, territory / convex hull, Sholl, branch order** — not measured at all.
  The paper's morphology is only {terminal points, total length}.
- **Antibody clones/dilutions, section thickness, fixation** — not in the readable text.

---

## 4. Reported numbers (reference magnitudes)

Values are read off printed scatter/bar plots at ≈150–400 dpi; treat the ones marked ≈ as
**group-mean estimates, ±1 unit of the axis**. Only quantities with a clear axis are given. All are
mean ± s.e.m. in the paper; I did not attempt to read error bars.

### 4a. Microglial morphology, cortex, 4-month 5xFAD (Fig 2q–s; Imaris; 120 cells/condition)
| Metric | Bmp4-WT;5xFAD | Bmp4-cKO;5xFAD | Direction | Per-cell spread (both) |
|---|---|---|---|---|
| Terminal points per microglion | ≈ 16 | ≈ 7.5 | cKO lower, *** | ≈ 2–32 |
| Process length per microglion (µm) | ≈ 255 | ≈ 185 | cKO lower, *** | ≈ 30–650 |
| Iba1⁺ area (%) | ≈ 15 | ≈ 10 | cKO lower, *** | — |

### 4b. Plaque-associated microglia (20 µm from edge)
| Metric | Group | Value | Fig |
|---|---|---|---|
| Trem2⁺ microglia per plaque | Veh (OPC intact) vs TAM (OPC ablated) | ≈ 3.9 vs ≈ 2.7, * | 1h |
| Trem2⁺ microglia per plaque | Bmp4-WT vs cKO | ≈ 4.0 vs ≈ 2.5, *** | 3e |
| Microglia per plaque | Bmp4-WT vs cKO | ≈ 4.0 vs ≈ 3.1, ** | 2m-n |
| Trem2⁺ microglia per plaque | Non-ROI / WT-COP / Bmp4 KO-COP | ≈ 2.7 / ≈ 4.2 / ≈ 3.1 | 5j |
| % microglial coverage of plaque perimeter | WT vs Bmpr1a-KD transplant | ≈ 68% vs ≈ 31%, *** | 4n |

### 4c. CD68 phagosome load
| Metric | Group | Value | Fig |
|---|---|---|---|
| CD68⁺ area / Iba1⁺ area (%) | Bmp4-WT vs cKO | ≈ 15% vs ≈ 10%, *** | 2o-p |

### 4d. Plaque morphology (dense-core, MX04)
| Metric | Group | Value | Fig |
|---|---|---|---|
| MX04⁺ area per plaque (µm²) | Bmp4-WT vs cKO | ≈ 140 vs ≈ 195, ** | 3n |
| MX04⁺ plaque circularity | Bmp4-WT vs cKO | ≈ 0.50 vs ≈ 0.38, *** | 3o |
| Lamp1⁺ area per plaque (µm²) | Bmp4-WT vs cKO | ≈ 150 vs ≈ 195, * | 3p-q |
| MX04⁺ area per plaque (µm²) | WT vs Bmpr1a-KD transplant | ≈ 95 vs ≈ 125, * | 4p |
| MX04⁺ plaque circularity | WT vs Bmpr1a-KD | ≈ 0.67 vs ≈ 0.53, ** | 4q |
| Lamp1⁺ area per plaque (µm²) | Mock vs Sox10-Bmp4 (ICV) | ≈ 470 vs ≈ 290, ** | 6n |

### 4e. Cell densities in AD tissue (model-specific, not healthy baselines)
| Metric | Group | Value | Fig |
|---|---|---|---|
| *Bmp4⁺/Olig1⁺* COPs per 500 µm² | 4M WT / 5xFAD 2.5M / 4M / 8M | ≈ 3.5 / ≈ 15 / ≈ 10.5 / ≈ 6 | 1m |
| *Trem2⁺* microglia per 500 µm² | 4M WT / 5xFAD 2.5M / 4M / 8M | ≈ 3 / ≈ 9 / ≈ 10 / ≈ 14 | 1n |
| Bmp4 (ELISA, pg / 10 mg cerebral tissue) | WT / 5xFAD / 5xFAD;Bmp4-cKO | ≈ 28 / ≈ 43 / ≈ 11 | 2b |
| No. GFP⁺ COPs per mm² after ROI | cortex-ctrl / cortex / Sub / Hipp | ≈ 3 / ≈ 55 / ≈ 170 / ≈ 140 | 11c |

### 4f. Flow cytometry quadrants (Trem2-PE × Bmpr1a-FITC)
- WT microglia: Bmpr1a⁺ ≈ 5.07% of CD11b⁺; 5xFAD: ≈ 28.18% (Fig 1q). % Trem2⁺Bmpr1a⁺ ≈ 14% (WT)
  vs ≈ 33% (5xFAD), *** (Fig 1r).
- Transplant Trem2⁺Bmpr1a⁺: WT ≈ 48.98% vs Bmpr1a-KD ≈ 19.02% (Fig 3f-g).

---

## 5. The rest of the paper, briefly (biology — accurate but not our method)

- **OPC ablation worsens amyloid** independent of myelin: dtA depletion of COPs left total myelin
  (Mbp area ≈ 32%, ns) unchanged but raised insoluble Aβ42 and plaque counts in cortex and
  subiculum; reduced CD68⁺ phagosomes and Trem2⁺ microglia. Bace1 fell (OPCs express Bace1) but
  β-CTF was unchanged.
- **COPs are the Bmp4 source:** *Bmp4* mRNA is enriched in the COP cluster (scRNA-seq), rises with
  amyloid, and *Bmp4⁺* COPs localise around **dense-core** (not diffuse) plaques. oAβ induces Bmp4
  in COPs via **Lrp1**-mediated Aβ uptake.
- **Signalling axis:** amyloid-associated microglia upregulate **Bmpr1a** and **pSmad1/5/8**;
  pSmad1/5/8 is higher in peri-plaque than non-plaque microglia and in human AD vs NDC. ChIP-qPCR
  shows **pSmad1/5/8 binds the Trem2 promoter** (−316 to −175 and −572 to −429 bp from TSS),
  enriched in 5xFAD; Smad4 drives a Trem2-promoter luciferase reporter. pSmad2/3 (TGF-β arm) does
  not bind. Bmp4+oAβ raises Trem2-promoter luciferase; TGF-β1 does not.
- **Bmp4 cKO** (Fig 2–3): more and larger Aβ plaques in cortex and hippocampus, worse Y-maze and
  NOR memory, DAM genes (*Trem2, B2m, Ctsd, Ctsb*) down, fewer/less-branched plaque microglia,
  less CD68, larger but less-circular (less-compacted) dense-core plaques, more Lamp1⁺ dystrophic
  neurites, fewer cortical and CA1 neurons, reduced synaptic proteins (Syp, Syt1, PSD95), more
  oligomeric Aβ. Transiently *more* myelin at 4 months (loss of myelin is itself an upstream Aβ
  driver), then worse demyelination by 7 months.
- **Rescue:** Bmpr1a-KD transplanted microglia fail to activate pSmad1/5/8, fail to become Trem2⁺
  DAM, and cover plaques poorly → less-compact plaques. WT-COP transplant and ICV
  **AAV-Sox10-Bmp4** raise Trem2⁺ microglia, improve plaque compaction (more MX04⁺ dense cores,
  smaller/rounder plaques), reduce insoluble Aβ42 and Lamp1⁺ spheroids, and rescue memory. In
  hiMG/BV2, rhBMP4 enhances Aβ phagocytosis and CLEC7A; the BMP-receptor inhibitor LDN-193189
  abolishes it; Bmp4+IFN-γ co-upregulates DAM/IFN genes (*Clec7a, Clec2d, Stat1/2, Irf7*).

### Microglial biology worth keeping
- **DAM (disease-associated microglia):** neuroprotective in **early** AD; marked by **Trem2,
  Apoe, B2m, Cst7, Clec7a, Itgax, Lpl, Cd9, Csf1**. Driven here by Bmp4→pSmad1/5/8→Trem2. Can
  become neurotoxic in **late** AD.
- **Plaque-associated microglia** envelop and tightly pack plaques, forming a **barrier** that
  compacts Aβ into dense cores and limits neurite dystrophy (Trem2-dependent; the Yuan 2016 /
  ref. 25 barrier concept). Coverage anti-correlates with plaque diameter.
- **CD68** = phagolysosome marker; its area within Iba1 indexes phagocytic activity.
- **Morphology shift on activation:** fewer terminal tips, shorter processes, enlarged soma,
  polarization toward the plaque = loss of homeostatic surveillance morphology.
- **Trem2** genetic variants cause late-onset AD by impairing Aβ phagocytosis and barrier
  formation.

### Authors' own limitations (as stated)
- The Tgfb–Bmp4 intersection in governing microglial downstream signalling is not resolved
  ("further studies would be required").
- COPs are transient, so their effect may be short-lived (motivating the AAV route).
- Transplanted microglia engrafted but migrated little (incomplete depletion, acute timeframe).
- Broader Bmp4-responsive cell types (neurons, astrocytes, endothelium) likely also contribute to
  the neuroprotective milieu but were not dissected here.

---

## 6. What an algorithm will face (from the images)

See [`figures/README.md`](#figures) for panel-by-panel notes. The load-bearing points:
- Microglia in these images are **plaque-centric and clustered**: Fig 1h/2m/3i/5i show several
  Iba1⁺ cells converging on one MX04⁺/Aβ core with **processes interdigitating and somata
  touching** — the worst case for instance segmentation.
- The best clean per-cell view is **Fig 2q**, the Imaris render: isolated cyan skeletons on black
  with pink soma dots — but that is the *output* of a commercial pipeline on a z-stack, not raw
  confocal, and the raw data behind it is not shown.
- **CD68** (Fig 1g, 2o) sits as punctate green inside the red Iba1 cell body, concentrated near
  the soma/plaque, not along distal processes — so a CD68/Iba1 area ratio depends heavily on where
  the soma is segmented.
- Activated (cKO) microglia are visibly **bushier and more amoeboid** than WT; the paper's own
  metric (fewer tips, shorter processes) is counterintuitive and worth noting: "activated" here
  means **de-ramified**, not more branched.

---

## 7. What is not in this PDF

- **The supplementary material was not provided to this intake.** It is referenced constantly
  (Supplementary Figs 1–11, Supplementary Tables 1–5) and **almost certainly contains the imaging
  Materials and Methods** — microscope, objective, z-step, antibodies, Imaris and threshold
  settings — i.e. exactly the §3.3 gaps. It is available at the article DOI:
  **https://doi.org/10.1038/s41392-026-02620-9** (Additional Information, p. 15).
- **Raw scRNA-seq:** NCBI GEO accession **GSE241211**. Code "available from the lead contact upon
  reasonable request" (no repository).
- Published scRNA-seq reused: PS2APP **GSE160512**, P301L **GSE153895**, cuprizone **GSE148676**.
- The owner's PDF has **no text layer** (Microsoft Print to PDF); all text here was read from page
  renders, so a transcription error in a gene name or number is possible — the DOI is the
  authority.

---

## 8. Extracted images

Per the **CC BY-NC-ND 4.0** licence (no derivatives), **no figure crops and no PDF are committed**
to the repo. Figures are described in words only.

| Figure | Subject | Described in |
|---|---|---|
| Fig 1 | OPC ablation ↑ amyloid; Bmp4/Trem2/Bmpr1a up with AD | [`figures/README.md`](#figures) |
| Fig 2 | Bmp4-cKO worsens amyloid; **microglia morphology (q–s)** | [`figures/README.md`](#figures) |
| Fig 3 | Bmp4 loss impairs the microglial barrier; CD68, coverage, plaque compaction | [`figures/README.md`](#figures) |
| Fig 4 | Bmpr1a-KD microglia blunted; Trem2 promoter ChIP | [`figures/README.md`](#figures) |
| Fig 5 | COP transplant restores the barrier | [`figures/README.md`](#figures) |
| Fig 6 | AAV-Sox10-Bmp4 rescue | [`figures/README.md`](#figures) |

---

## Figures

**Licence: CC BY-NC-ND 4.0 (no derivatives).** No figure crops and no PDF are committed. This
file describes every figure in words so the paper never has to be reopened. Panels are described
from page renders at 150-400 dpi; the owner's copy is an image-only print, so fine labels are
approximate. All numbers are in the digest, section 4.

Stain colour key recurring across figures: **Iba1 = red** (microglia; green where noted as
GFP/Aif1), **Trem2 = green** (or white in triple labels), **CD68 = green**, **MX04 = blue**
(dense-core plaque), **Ab (D54D2/6E10) = red or green**, **Lamp1 = red**, **DAPI = blue**,
**pSmad1/5/8 = yellow/magenta nuclear**.

---

### Figure 1 - OPC-derived Bmp4 is linked to amyloid pathology (p. 2, legend p. 3)
22 panels (a-v). Microglia-relevant ones:

- **g - CD68/Iba1/MX04.** Veh vs TAM (OPC-ablated), cortex. Red Iba1 microglia wrapping a blue
  MX04 plaque; green CD68 puncta sit **inside the soma**, clustered at the plaque. Lower row is a
  zoom of the white ROI box (scale 10 um). TAM cell visibly has **less green CD68**. Shows the
  single-cell basis of the CD68/Iba1 ratio: CD68 is perinuclear, not on distal processes.
- **h - Trem2/Iba1/MX04.** Veh vs TAM, cortex, 50 um. Microglia (red) with green Trem2 clustered
  on MX04+ plaques. Quantified as Trem2+ microglia within 20 um of plaque edge (approx 3.9->2.7).
  Several microglia converge on one plaque - **somata close together, processes overlapping**.
- **l - RNAscope *Bmp4/Olig1/Trem2* + MX04.** WT(4M) and 5xFAD at 2.5/4/8M, PPC. mRNA puncta
  (red/green/white) around blue MX04 plaques; the *Bmp4* COP signal is strongest at 2.5M and
  fades by 8M while Trem2 rises. Punctate, not cell-filling.
- **o-r - microglial Bmpr1a/pSmad1/5/8 (WB, flow).** o: WB of CD11b-sorted microglia (Bmpr1a,
  pSmad1/5/8, Trem2 up in 5xFAD). q: flow dot plots Bmpr1a-FITC x Trem2-PE (WT 5.07% vs 5xFAD
  28.18% Bmpr1a+).
- **u-v - Smad1/5/8/Iba1/Ab.** Non-plaque vs peri-plaque cortex, 10 um. Peri-plaque Iba1+ cells
  have more nuclear pSmad1/5/8. Microglia here are **amoeboid, enlarged, tightly around the core**.

### Figure 2 - Genetic Bmp4-cKO exacerbates amyloid (p. 5, legend p. 6)
21 panels (a-u). Microglia-relevant:

- **m - Iba1/MX04.** Bmp4-WT vs cKO, cortex, 50 um. Field of green Iba1 microglia on blue MX04
  plaques; cKO has visibly **fewer microglia per plaque** (quantified n: approx 4.0 vs 3.1).
- **o - CD68/Iba1/DAPI.** WT vs cKO, 10 um, with zoom. A single phagocytic microglion: red Iba1
  cell body full of green CD68 in WT; in cKO the cell is **more spindly/amoeboid with little
  CD68**. Clearest single-cell CD68 view. (p: CD68+/Iba1+ area approx 15% vs 10%.)
- **q - Imaris Filament Tracer, Iba1.** [STAR] The most useful panel for us. WT vs cKO, 50 um.
  **Cyan traced skeletons on a black background, each soma a pink/magenta dot.** WT cells are large
  and densely ramified with many tips; cKO cells are smaller with fewer, shorter branches. Cells
  are **well separated here** because this is the reconstructed output, not raw signal - in the raw
  images (m) they overlap. Defines the paper's morphology metrics:
  - **r - terminal points per microglion:** open-circle scatter, approx 16 (WT) vs 7.5 (cKO),
    per-cell range approx 2-32, 120 cells each, ***.
  - **s - process length per microglion (um):** approx 255 (WT) vs 185 (cKO), range approx 30-650,
    ***.

### Figure 3 - Bmp4 deficiency impedes the microglial barrier (p. 7, legend p. 8)
21 panels (a-u). Microglia-relevant:

- **a - DAM dot plot.** Trem2, Spp1, Lpl, Itgax, Cstd, Cstb, Cst7, Csf1, Cd63, Cd9, B2m, Apoe:
  dot size = % expressing, colour = mean expression. All lower in cKO.
- **b-c - WB** CD11b-sorted microglia: pSmad1/5/8, Trem2, CD68 down in cKO; CD11b unchanged.
- **d-e - Iba1/Trem2/MX04**, 20 um. Trem2+ microglia per plaque approx 4.0 vs 2.5. Cluster of
  cells on one plaque.
- **i-j - Iba1/Ab/MX04 + coverage.** i: a single dense-core plaque (blue MX04 core, red Ab halo)
  enveloped by green Iba1 processes, 10 um; WT processes **wrap the core tightly**, cKO leave gaps.
  j: plaque diameter vs microglial coverage %, negative correlation, R-sq approx 0.83.
- **k-q - plaque morphology** (MX04 count/area/circularity; Lamp1+ area). cKO plaques are
  **bigger, less circular (less compacted), more Lamp1+ dystrophy**.
- **r-u - Nissl neurons, synaptic WB** (fewer neurons, less Syp/Syt1/PSD95, more oAb in cKO).

### Figure 4 - Bmpr1a-KD microglia are blunted; Trem2 promoter (p. 9, legend p. 10)
20 panels (a-t). Microglia-relevant:

- **b - IBA1/TREM2/DAPI, hiMG**, oAb +/- siBMPR1A +/- BMPR1A-OE, 50 um. Cultured human microglia
  (green) with red TREM2; TREM2 drops with siBMPR1A, rescued by OE. **Flat cultured microglia, not
  tissue.**
- **g-h - Sham/WT/Bmpr1a-KD transplant, GFP/Iba1**, 50 um. Engrafted GFP+ microglia repopulate.
- **j-k - GFP/pSmad1/5/8/DAPI**, 10 um. WT engrafted microglia have nuclear pSmad1/5/8; KD do not.
- **l-q - GFP/Ab/Trem2 + plaque.** KD microglia: fewer Trem2+, less coverage (approx 68%->31%),
  less-compact MX04 plaques (bigger area, lower circularity).
- **s-t - ChIP-qPCR / luciferase.** pSmad1/5/8 binds Trem2 promoter (-316..-175, -572..-429 bp).

### Figure 5 - COP transplant restores microglial barrier (p. 11, legend p. 12)
15 panels (a-o). Microglia-relevant:

- **g - Aif1/Trem2/DAPI RNAscope**, subiculum, 10 um. *Trem2* (red) puncta per *Aif1+* microglion
  rise with WT-COP, less with Bmp4 KO-COP.
- **i-j - Trem2/Iba1/MX04**, 10 um + zoom. Trem2+ microglia per plaque approx 2.7/4.2/3.1
  (Non-ROI/WT-COP/KO-COP). Microglia cluster on the MX04 core.
- **m-o - Bassoon/Homer1** synaptic puncta (pre-synaptic preserved by WT-COP).

### Figure 6 - AAV-Sox10-Bmp4 rescue (p. 13, legend p. 14)
15 panels (a-o). Microglia-relevant:

- **i - Iba1/MX04**, 50 um. Mock vs Sox10-Bmp4; red Iba1 microglia denser around blue plaques
  after Bmp4; microglial coverage approx 64%->77%.
- **j-k - Aif1/Trem2/DAPI/Ab RNAscope**, diffuse vs dense-core plaques, 10 um + zoom. *Trem2*
  puncta per Aif1+ microglion rise with Bmp4 around both plaque types.
- **m-n - ThS/Iba1/Lamp1**, 10 um. Thioflavin-S plaque (green) ringed by red Iba1 microglia and
  yellow Lamp1 dystrophy; Sox10-Bmp4 reduces Lamp1+ area per plaque (approx 470->290 um2).
- **o - WB** Syt1, Syp, PSD95, Smad1, pSmad1/5/8, Trem2 up with Sox10-Bmp4.

---

#### What the images tell us about the detection problem
- Microglia in this corpus are almost always shown **converging on a plaque**, so the canonical
  scene is **3-5 cells per plaque with touching somata and interdigitating processes** (Fig
  1h, 2m, 3d/i, 5i). Instance separation in that cluster is the hard case.
- The only **clean per-cell morphology** is the **Imaris reconstruction (Fig 2q)** - cyan
  skeletons, pink soma dots, on black - which is a commercial pipeline's output over an unseen
  z-stack, not raw confocal. We never see the raw stack it came from.
- **CD68** is **perinuclear/punctate inside the soma** (Fig 1g, 2o), so a CD68-within-Iba1 ratio
  is sensitive to soma segmentation, not process tracing.
- "Activated" microglia here are **de-ramified** (fewer tips, shorter, more amoeboid), the
  opposite of the intuition that activation = more branching. Worth flagging to the owner.
