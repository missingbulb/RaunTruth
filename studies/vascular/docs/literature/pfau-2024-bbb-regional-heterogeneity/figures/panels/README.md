# Extracted panels — Pfau, Langen et al. 2024

17 CD31 single-channel crops (CD31 white on black), all `VESSEL_`, not in the repo (the study keeps
no binaries in git), regenerated from the figure PNGs, once rendered from the PDF into `../`, by [`../crop_panels.py`](../crop_panels.py). Full figures: [`../README.md`](../README.md).
Digest: [`../../digest.md`](../../digest.md). Mouse, 8–14 weeks, goat anti-CD31 (R&D AF3628), Leica
SP8 confocal; somatosensory cortex vs median eminence (ME).

## Inventory

| File | Source | Region | Bar on panel | µm/px | Field |
|---|---|---|---|---|---|
| `VESSEL_pfau24fig1a_cortex_CD31.png` | Fig 1a, U.Clear volume | cortex | 100 µm = 23 px | 4.35 | ~1,180 µm |
| `VESSEL_pfau24fig1a_ME_CD31.png` | Fig 1a | ME | none | uncalibrated | — |
| `VESSEL_pfau24fig1b_cortex_CD31.png` | Fig 1b | cortex | 10 µm = 20 px | 0.50 | ~135 µm |
| `VESSEL_pfau24fig1b_ME_CD31.png` | Fig 1b | ME | none | uncalibrated | — |
| `VESSEL_pfau24fig1c_cortex_CD31.png` ⭐ | Fig 1c, diameter images | cortex | 20 µm = 31 px | 0.645 | ~178 µm |
| `VESSEL_pfau24fig1c_ME_CD31.png` ⭐ | Fig 1c, same row | ME | shares the row's bar | 0.645 | ~178 µm |
| `VESSEL_pfau24fig3c_cortex_CD31.png` | Fig 3c | cortex | 10 µm = 31 px | 0.323 | ~77 µm |
| `VESSEL_pfau24fig3c_ME_CD31.png` | Fig 3c | ME | none | uncalibrated | — |
| `VESSEL_pfau24ed1a_cortex_CD31.png` | Ext. Data 1a | cortex | 10 µm = 30 px | 0.333 | ~110 µm |
| `VESSEL_pfau24ed1a_ME_CD31.png` | Ext. Data 1a | ME | none | uncalibrated | — |
| `VESSEL_pfau24ed1d_cortex_CD31.png` | Ext. Data 1d | cortex | 10 µm = 19 px | 0.526 | ~174 µm |
| `VESSEL_pfau24ed1d_ME_CD31.png` | Ext. Data 1d | ME | none | uncalibrated | — |
| `VESSEL_pfau24ed2d_cortex_CD31.png` | Ext. Data 2d | cortex | 20 µm = 50 px | 0.40 | ~133 µm |
| `VESSEL_pfau24ed5a_cortex_CD31.png` | Ext. Data 5a, overview | cortex | 100 µm = 52 px | 1.92 | ~627 µm |
| `VESSEL_pfau24ed5a_ME_CD31.png` | Ext. Data 5a | ME | none | uncalibrated | — |
| `VESSEL_pfau24ed5b_cortex_CD31.png` | Ext. Data 5b, artery close-up | cortex | 20 µm = 46 px | 0.435 | ~142 µm |
| `VESSEL_pfau24ed5b_ME_CD31.png` | Ext. Data 5b | ME | none | uncalibrated | — |

How the bars were measured, and the biology cross-check: [`../../digest.md`](../../digest.md) §6.

## Why these are worth having

- **Fig 1c is a same-image anchor.** The authors measured cortex capillaries at 3.95 ± 0.49 µm
  and ME capillaries at 9.61 ± 1.82 µm (area ÷ length, 15 images each) on images of this kind. Our
  caliber on the Fig 1c pair should land near those and keep the ~2.4× ratio. It is an aggregate
  check (their numbers come from 15 images, not from these two crops), not per-vessel ground truth.
- **Seven cortex panels at 0.32–0.65 µm/px** of clean, sparse CD31 capillaries, plus two overviews
  (Fig 1a, Ext. Data 5a) where penetrating vessels and αSMA⁺ arteries are visible in the merge.
- **The ME panels are a hard transfer case**: dense, wide, closely packed tubes whose CD31 outlines
  the membrane around a darker lumen.

## Caveats

- **Figure crops, not raw data.** 300 dpi is the PDF's native resolution for these micrographs,
  but the authors' acquisitions were larger; contrast and projection were set for display.
- **Burned-in labels.** Every calibrated panel carries its white scale bar and its "N µm" label in
  the bottom-left corner; mask that corner before segmenting or it counts as a vessel.
- **Projections.** Fig 1a and Ext. Data 5a are projections of thick U.Clear volumes; vessels at
  different depths overlap and cross, which creates false junctions. The close-ups probably are
  projections too; the paper does not say.
- **Too coarse for caliber:** Fig 1a (4.35 µm/px) and Ext. Data 5a (1.92 µm/px) draw capillaries
  1–2 px wide. Use them for area fraction and coarse topology only.
- **ME rows are uncalibrated** except Fig 1c: each bar is drawn on the cortex row, and the ME row is
  a separate acquisition. They report area % and px only.
- **Bar uncertainty.** Bars are 19–52 px, so ±1 px is 2–5%; the authors' own two "20 µm" bars in Fig
  1c/1d differ by 2.6%.
- **Hollow tubes at high zoom.** At 0.32–0.33 µm/px (Fig 3c, Ext. Data 1a) CD31 outlines both walls
  of a capillary; a plain threshold returns two thin walls and a halved width.
