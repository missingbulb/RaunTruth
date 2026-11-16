# Moser et al. 2025: iPSC-derived mononuclear phagocytes in aging and 5xFAD mice

- **Title:** *Human iPSC-Derived Mononuclear Phagocytes Improve Cognition and Neural Health across
  Multiple Mouse Models of Aging and Alzheimer's Disease*
- **Authors:** **V. Alexandra Moser\***, Luz Jovita Dimas-Harms, Rachel M. Lipman, Jake Inzalaco,
  Shaughn Bell, Michelle Alcantara, Erikha Valenzuela, George Lawless, Simion Kreimer, Sarah J.
  Parker, Helen S. Goodridge, **Clive N. Svendsen\*** (\*corresponding). Board of Governors
  Regenerative Medicine Institute and Smidt Heart Institute, Cedars-Sinai Medical Center, Los Angeles.
- **Venue / id:** *Advanced Science* **2025, 12, e17848** (Research Article, 25 pages). DOI
  [10.1002/advs.202417848](https://doi.org/10.1002/advs.202417848). Received 31 Dec 2024, revised
  25 Jul 2025, published online 24 Aug 2025.
- **Licence (as printed on p. 1):** "© 2025 The Author(s). Advanced Science published by Wiley-VCH
  GmbH. This is an open access article under the terms of the Creative Commons Attribution License,
  which permits use, distribution and reproduction in any medium, provided the original work is
  properly cited." → **CC BY** (version not stated).
- **PDF:** kept in the study's Drive `Literature` folder as `Human iPSC-Derived Mononuclear Phagocytes Improve Cognition and Neural Health across Multiple Mouse Models of Aging and Alzheimer's Disease.pdf`, not in the repo.
- **Thesis, in one line:** tail-vein human iPSC-derived phagocytes improve memory in aging and
  5xFAD mice and restore ramified hippocampal microglial morphology, without entering the brain.

## What it gives the study

A biology paper with microglial morphology as a readout, and the set's only one in **dentate
gyrus with Iba1 + CD68**, our stain pair. Four things carry over:

1. **The manual reference our algorithm would replace, and how small it is.** Branches are
   traced by hand in **SNT** on 63× confocal stacks; *branch length* is averaged over **≈ 10
   cells per mouse**, Sholl over **3 randomly chosen cells per section**, reported as an area
   under the curve. Our per-cell table must be able to produce total traced length and a Sholl
   profile, over every cell rather than a hand-picked ten.
2. **The effect size that matters.** With aging in dentate gyrus, microglia count rises ≈ 25%,
   branch length falls ≈ 30% and Sholl AUC ≈ 34% (numbers below). A per-cell length measure
   must resolve a ~30% change to be useful for this biology.
3. **CD68 as % positive is a weak readout here.** "The percentage of IBA1+ cells that expressed
   CD68": **≈ 75% of microglia are already CD68⁺ in young dentate gyrus**, ≈ 86% aged. For LAMP1,
   the *amount* inside microglia separated groups where the % positive did not. So our CD68
   output should be a per-cell amount (area, or count of puncta, inside the Iba1 mask), not a
   positive/negative call. Their within-cell recipe, built for LAMP1, ports directly:
   Despeckle, Median "set at 0.5" (radius unit not stated), a per-cell ROI on a maximum-intensity
   composite, a per-cell MIP, threshold (method not stated), Analyze Particles inside the ROI,
   ≥ 5 cells per animal, and **only cells lying entirely within the z-stack**. That edge rule is
   the one stated whole-cell inclusion rule in the set; our single plane has no equivalent yet.
   The output is a 2D area, though the Discussion calls it a volume.
4. **What a dentate gyrus Iba1/CD68 field looks like** (Fig 2E, ≈ 187 µm square panels at
   ≈ 0.45 µm/px, from the 25 µm bar measured at 56 px): a **continuous lattice of fine processes
   filling the whole field**, ~6–8 somata of ≈ 5–8 µm beside larger DAPI neuronal nuclei, each
   with ≈ 3–6 thin primary processes; **neighbouring arbors meet and interdigitate so that where
   one cell ends is not visible in the projection**. Young CD68 is a few faint puncta at somata;
   aged CD68 is many bright puncta in somata and proximal processes, and some lie **over neuronal
   nuclei outside obvious Iba1 cells**. Grey-green tubular structures ≈ 5–10 µm wide are vessels
   or autofluorescence. Both match what our image needs gating: CD68 puncta must be gated by the
   Iba1 mask, and puncta bright in every channel (possible lipofuscin, which the paper does not
   address) rejected. In the Iba1/LAMP1 stain (Fig 2G, EDTA retrieval) Iba1 is dimmer, fragmentary,
   and strongest as a **membrane shell around the soma**, a reminder that Iba1 brightness depends
   on the protocol.

Fig 2B also warns about 2D: the SNT tracing of one cell (3 primary processes, ≈ 20 tips counted
by eye) mostly runs over dark background in the displayed image, so the tracing followed
processes through the stack that are not in focus in any single view. Even at 63×, thin distal
processes sit near the noise floor; a single-plane measure will miss much of what a 3D tracer
records, so their branch lengths are an upper bound for what we can measure.

**What it does not give:** no automated segmentation and no Iba1 threshold; no soma size or
volume, endpoints, process count, territory, fractal measures or skeleton analysis; and **the
Iba1 cell-count method is not described at all**: manual or automated, the criterion for a cell,
the counting frame, and whether counts are per field or per area. Whether tracing was 3D or on a
projection, the SNT mode, how the ≈ 10 length cells were chosen, edge handling in tracing, and
whether "branch length" is total length per cell or mean length per branch are all unstated. The
in-vitro axis reads "per Cell (µm)" and the in-vivo magnitudes fit **total traced length per
cell**, but that is our inference. The criterion for a cell to "express" CD68 is not given.

## Acquisition

30 µm horizontal free-floating sections (immersion-fixed 4% PFA 48 h); Iba1 Wako 019-19741
1:250, CD68 Bio-Rad MCA1957 1:200, no antigen retrieval stated for Iba1/CD68; mounted in
Vectashield HardSet. Nikon A1R confocal, "63x … under oil immersion and at a step size of
0.5 µm" (as printed). **3 sections per mouse, one field each in CA1, CA3 and dentate gyrus.**
Pixel size, NA, frame size and number of planes are not stated. LAMP1 used a Leica Stellaris 8
STED at 0.3 µm step.

## The numbers

Read by eye off bar charts (±~5% of axis range); the paper prints almost none. Units as printed,
often none. Mean ± SEM.

Dentate gyrus, male NSG (Fig 2), n = 10–20 per group:

| measure | young (3 mo) | aging vehicle (11–12 mo) | aging iMP | stats (Tukey) |
|---|---|---|---|---|
| Iba1⁺ cells: DG (count; area not stated) | ≈ 10.3 (range ≈ 7.5–13) | ≈ 12.9 | ≈ 12.3 | Y vs AV *** |
| Iba1 branch length: DG (unit not on axis; µm per cell presumed) | ≈ 152 (range ≈ 85–265) | ≈ 107 | ≈ 120 | Y vs AV * |
| Sholl AUC: DG | ≈ 103 (range ≈ 60–157) | ≈ 68 | ≈ 79 | Y vs AV ** |
| % CD68⁺ microglia: DG | ≈ 75 (range ≈ 45–90) | ≈ 86 | ≈ 86 | Y vs AV * ; Y vs AiMP * |
| % LAMP1⁺ microglia: DG | ≈ 33 (range ≈ 0–92) | ≈ 57 | ≈ 48 | all ns |
| LAMP1⁺ area in Iba1⁺ cells: DG (unit not stated) | ≈ 2.8 | ≈ 7.5 | ≈ 4.7 | Y vs AV **** ; AV vs AiMP * |

These rest on ≈ 10 hand-traced cells per mouse for length and 3 per section for Sholl, selected
samples whose mean-of-means hides a ~3× per-mouse spread in young branch length. The count is per
field of unstated size: the ≈ 187 µm square is the *figure panel*, and that it equals the
counting field is not stated.

5xFAD CA1 (Fig 6F–I, males, unpaired t-test, n = 6–10): Iba1⁺ cells ≈ 16 vs ≈ 16 (4 mo, vehicle
vs iMP) and ≈ 35 vs ≈ 33 (9 mo); branch length ≈ 105 vs ≈ 118 (4 mo, ns) and ≈ 80 vs ≈ 108
(9 mo, *). The ≈ 2× count at 9 months is plaque-associated microgliosis, from different cohorts
not tested against each other.

Effects differ by subfield (Supplementary Fig S3, text only): the CD68 aging increase appears in
dentate gyrus and CA3 but not CA1; microglia number rises in all three. **Pool hippocampus and
these effects blur**, so our results need the subfield, which is still an open owner question.

## Not available

The Supporting Information (all CA1/CA3 microglial plots and more) returned HTTP 403 from Wiley
(2026-11-15); it needs a browser or the author. The authors' repository
(github.com/shaughnmb/2024_moser_et_al) holds only snRNA-seq and proteomics code, no imaging,
tracing or Sholl code. No imaging data are deposited.

Left out: the iPSC differentiation and dosing, behaviour, snRNA-seq, transcriptomic clocks,
plasma proteomics, in-vitro iMGL morphology (cultured cells are spindle-shaped and a poor model
of tissue), and non-microglial histology.
