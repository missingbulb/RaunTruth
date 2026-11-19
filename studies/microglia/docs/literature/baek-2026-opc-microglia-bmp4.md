# Baek et al. 2026: OPC–microglia crosstalk via BMP4 in Alzheimer's disease

- **Title:** *Oligodendrocyte precursor cells–microglia crosstalk via BMP4 drives microglial
  neuroprotective response and mitigates Alzheimer's disease*
- **Authors:** Soonbong Baek, Jaemyung Jang, Seungeun Yeo, Hyun Jin Jung, Youngshik Choe\*
  (\*corresponding, dallarae@kbri.re.kr). Developmental Disorders & Rare Diseases Research Group,
  Korea Brain Research Institute (KBRI), Daegu, Republic of Korea.
- **Venue / id:** *Signal Transduction and Targeted Therapy* (Springer Nature) (2026) **11:109**,
  article type ARTICLE, marked OPEN. DOI
  [10.1038/s41392-026-02620-9](https://doi.org/10.1038/s41392-026-02620-9). Received 23 Sep 2025,
  revised 14 Jan 2026, accepted 28 Jan 2026, published online 25 Mar 2026. 16 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `Oligodendrocyte precursor cells–microglia crosstalk via BMP4 drives microglial neuroprotective response and mitigates Alzheimer's disease.pdf`, not in the repo.
- **Licence (exact wording, p. 16):** "This article is licensed under a Creative Commons
  **Attribution-NonCommercial-NoDerivatives 4.0** International License … You do not have
  permission under this licence to share adapted material derived from this article or parts of
  it." (**CC BY-NC-ND 4.0**.) © The Author(s) 2026.
- **Owner's copy:** a "Microsoft Print to PDF" print with **no text layer**. It was read from page
  renders at 150–400 dpi, so plotted values below are approximate and a transcription slip in a
  number is possible; the DOI is the authority.
- **Thesis, in one line:** OPC-derived Bmp4 drives microglial Trem2 via Bmpr1a → pSmad1/5/8,
  pushing 5xFAD microglia into a protective, plaque-clustering, CD68-rich state.

## What it gives the study

A biology paper in which microglia are the readout. Its imaging methods are only in the
supplement, which was not provided. Four things carry over:

1. **What "number of extensions" means in practice: terminal points per cell.** Imaris Filament
   Tracer on Iba1, soma marked as a point, scored as **terminal points per microglion** and
   **total process length per microglion (µm)**, 120 cells per condition. This is the per-cell
   metric family the owner asked for, and its magnitudes are a sanity range for ours: a cell
   reported with many times the per-cell maximum below is a merge error.
2. **"Activated" means de-ramified.** The reactive (cKO) cells have *fewer* tips and *shorter*
   processes, are bushier and more amoeboid, with thick short processes and enlarged somata. A
   state classifier must treat a higher tip count as the homeostatic direction.
3. **CD68 as an area ratio inside Iba1**: "CD68⁺ area relative to the Iba1⁺ area" (%), 2D. This
   is a ready definition for our per-cell CD68. In its single-cell views (Fig 1g, 2o) CD68 sits
   as puncta **inside the soma and near the plaque, not on distal processes**, the same
   distribution our image shows. The ratio therefore depends on where the soma mask ends far more
   than on process tracing.
4. **Plaque association, and why clusters matter.** A microglion is plaque-associated when its
   **cell body lies within 20 µm of the plaque edge**, measured from the cell body. In every
   plaque view (Fig 1h, 2m, 3d/i, 5i) 3–5 cells converge on one core with **touching somata and
   interdigitating processes**: the hardest case for splitting touching cells, and the reactive
   state a detector that drops touching cells would under-sample. The 20 µm rule applies to the
   owner's data only if the mice are an amyloid model, which is still an open question.

**What it does not give:** no objective, NA, pixel or voxel size, z-step or depth; no Imaris
settings (seed or soma diameter, threshold, how touching cells were split); no CD68 threshold;
no soma size or volume, territory, Sholl or branch order; no healthy-tissue density; and **no
hippocampal morphology**: all morphology is cortex, hippocampus appears only in plaque counts
and ELISA. Whether these 2D or 3D numbers come from a stack of known depth is unknown, so the
tip and length values cannot be treated as 3D of a known thickness.

## The numbers

Read by eye off printed scatter and bar plots (±1 axis unit), group means only; the paper plots
mean ± s.e.m. and the error bars were not read. 4-month 5xFAD **cortex**, Imaris, n = 4 female
mice, 120 cells per condition.

| metric | Bmp4-WT;5xFAD | Bmp4-cKO;5xFAD (de-ramified) | per-cell spread, both | Fig |
|---|---|---|---|---|
| terminal points per microglion | ≈ 16 | ≈ 7.5 (***) | ≈ 2–32 | 2r |
| process length per microglion (µm) | ≈ 255 | ≈ 185 (***) | ≈ 30–650 | 2s |
| CD68⁺ area / Iba1⁺ area (%) | ≈ 15 | ≈ 10 (***) | — | 2o–p |

The original transcription also lists an "Iba1⁺ area (%)" row for Fig 2q–s with the same ≈ 15 vs
≈ 10. It could not be re-checked against the image-only print and may be a duplicate of the CD68
row; do not use it.

Plaque association (20 µm rule; each dot a mouse mean over 90–110 plaques): microglia per plaque
≈ 4.0 (WT) vs ≈ 3.1 (cKO), Fig 2m–n; Trem2⁺ microglia per plaque ≈ 2.5–4.2 across conditions
(Fig 1h, 3e, 5j). Microglial coverage of the plaque perimeter ≈ 68% (WT) vs ≈ 31% (Bmpr1a-KD
transplant), Fig 4n, and it falls as plaque diameter rises (Fig 3j, R² ≈ 0.83).

## What else bears on the study

- The only clean per-cell picture (Fig 2q: traced skeletons with soma dots on black) is the
  *output* of a commercial pipeline on an unseen z-stack. The raw images behind it (Fig 2m) show
  the cells overlapping, so the clean separation is Imaris's, and how it was done is unstated.
- How the 120 cells per condition were chosen is not stated.
- The supplementary material (Supplementary Figs 1–11, Tables 1–5), at the DOI, almost certainly
  holds the imaging methods above; ask the owner for it if Baek's settings are needed.

Left out: the BMP4–Trem2 signalling biology, transplant and AAV experiments, behaviour, plaque
morphology, RNAscope and flow-cytometry counts, and AD-tissue cell densities, none of which
bears on detecting or measuring cells in our images.
