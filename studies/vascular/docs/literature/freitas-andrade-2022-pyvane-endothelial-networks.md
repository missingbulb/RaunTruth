# Freitas-Andrade et al. 2022 — Pyvane, unbiased analysis of mouse brain endothelial networks

- **Title:** *Unbiased analysis of mouse brain endothelial networks from two- or three-dimensional
  fluorescence images*
- **Authors:** Moises Freitas-Andrade, Cesar H. Comin, Matheus Viana da Silva, Luciano da F. Costa,
  **Baptiste Lacoste\*** (\*corresponding, blacoste@uottawa.ca). Ottawa Hospital Research
  Institute; Federal University of São Carlos; University of São Paulo; uOttawa Brain and Mind.
- **Venue / id:** *Neurophotonics* (2022) **9(3):031916**, article type **PROTOCOL**.
  DOI **10.1117/1.NPh.9.3.031916**. Published online 18 May 2022. 17 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `Unbiased analysis of mouse brain endothelial networks from two- or three-dimensional fluorescence images.pdf`, not in the repo.
- **Code:** **Pyvane**, open-source Python — <https://github.com/chcomin/pyvane>

---

## 1. What it gives the study

- **The closest published analogue of our extraction**, in 2D and 3D, on CD31: segment →
  skeleton → graph → measure, every step with a stated parameter in **µm** (§2). It is the model for
  moving our pixel constants (σ, small objects, prune length) to physical units, and its rules for
  3D stacks (threshold per z-plane, components in µm³, all holes filled) apply directly to the
  owner's stacks.
- **Two failures we have, named by the authors.** CD31 marks endothelium, so **large vessels can
  look hollow**: the two-lines-around-a-dim-lumen trace that `fill_lumens` (ledger L3) answers.
  And in 2D **two vessels crossing are detected as a bifurcation**: "Detecting spurious
  bifurcation points in 2D samples should be expected". For ground truth, a junction in a
  projection is not a junction until depth confirms it.
- **The only per-image external numbers** for our metrics: Fig 9 prints vessel density, branch
  density and tortuosity on three 2D images (§4). Our pipeline reproduces their ranking exactly;
  the sparse dim panel is our worst case.
- **A reference mask and skeleton not made by us** (Figs 3 and 8), as a visual answer key for
  segmentation (§5).
- **A principled pruning rule**: remove the globally smallest terminal branch, repeatedly, while
  any is shorter than **S, slightly larger than the typical vessel diameter**, in place of our fixed
  `min_len = 8 px`.
- **3D reference magnitudes** and the size of the 2D projection bias on tortuosity (§3).

**What it does not give:** no vessel-type classification (CATEGORIZE), and **no scale bar on any
figure and no stated pixel size**, so none of its panels can be calibrated. Its "branching
density" counts bifurcation points (our `junctions`), not our `segments`.

## 2. The algorithm

**Segmentation.** Assumes bright vessels on a dark background and nothing else in the image.

1. Gaussian smoothing, σ **typically 1 µm**.
2. Adaptive threshold: for each pixel, a Gaussian-weighted local mean `Im(i)` with standard
   deviation **R**; `Io(i) = 1 if I(i) > Im(i) + C`, with **C typically 2 or 3**. `C > 0` keeps
   flat background out. **R is not given a value**; for hollow CD31 vessels it must be large
   enough, and the hollow centre brighter than the background, for the lumen to fill.
3. Remove small components: typically **< 50 µm²** in 2D, **< 350 µm³** in 3D.
4. Remove small holes: **≤ 10 µm²** in 2D; in 3D **all** holes (a stack is unlikely to hold
   background fully enclosed by vessels). Our `binary_fill_holes` applies the 3D rule in 2D and may
   close real background.

In 3D the adaptive threshold runs **per z-plane**, which makes detection insensitive to brightness
falling with depth.

**Skeleton.** 2D: any standard thinning. 3D: **Palágyi–Kuba**, chosen because it keeps small spurs
so that an explicit rule, not the thinning, decides which go.

**Graph.** One neighbour → terminal; ≥ 3 → bifurcation; adjacent bifurcation pixels merged into one
node at their mean position; then the iterative prune above (removing one branch can expose
another, which is re-measured). The authors warn that S set too large removes real short segments.

**Measurements.**

- **Vessel density** = Σ segment arc length ÷ area (volume): mm/mm² (mm/mm³). Identical to our
  `length_density`.
- **Branching density** = nodes of degree ≥ 3 ÷ area (volume).
- **Tortuosity**, per skeleton pixel: fit a least-squares line to the skeleton pixels within radius
  **d**, take their mean distance to it; the image value is the mean over pixels. Run at d = 10 and
  20 µm; small d finds kinks, large d long bends. Units µm.

The authors stress that σ, the size cut-offs and d must be matched to the noise and to the spatial
extent of the biology, not fixed.

## 3. Acquisition and reference magnitudes

- **Imaging:** Zeiss Axio Imager M2 + Axiocam 506 mono + ApoTome.2 (confocal acceptable). 2D: 20×/0.8,
  a **10 µm z-stack at 1 µm steps, max-projected**, kept shallow to stay in one anatomical plane, on
  25 µm cryosections. 3D: 10×/0.45, 60–70 µm stacks at 1 µm steps (90–100 µm on a confocal), 50–150 µm
  vibratome sections.
- **No perfusion**: perfusion, fixative included, degraded their CD31 staining (Rust and Wang both
  perfuse). Brains immersion-fixed in 4% PFA.
- **Over 324 3D stacks (Fig 12, read off histograms):** vessel density peaks near **2000 mm/mm³**,
  branching-point density near **50 000 mm⁻³**; tortuosity right-skewed.
- **2D vs 3D tortuosity on the same samples: 0.93 ± 0.07 vs 1.4 ± 0.1.** Projection under-states
  tortuosity by about a third, which matters for any shape number on a flattened stack.

## 4. Our pipeline on Fig 9

Three 2D samples, each captioned with the authors' numbers. The three crops are the same size
(≈ 623 × 499 px), so raw counts compare between them.

| Panel | Published VD (mm/mm²) | Published branch density (mm⁻²) | Published tortuosity (µm) | Our segments | Our area % |
|---|---|---|---|---|---|
| (a) dense | 22.60 | 234.3 | 0.90 | 240 | 15.3 |
| (b) sparse | 16.72 | 134.3 | 0.97 | 164 | 8.3 |
| (c) straight | 8.84 | 49.0 | 0.61 | 52 | 6.0 |

- **Ranking is exactly right**: our segment counts order the panels as the published branch
  densities do, and area % as the published vessel densities do.
- **Relative magnitudes are close**: our count ÷ the published density implies a field of
  **1.024 / 1.221 / 1.061 mm²**, which should be equal and agree to **±9% around their mean**.
- **Panel (b), the sparse dim field, is our worst case** in both: the outlier in implied area, and
  its area-% ÷ published-VD ratio is 0.50 against 0.68 for (a) and (c). The faint-vessel failure,
  measured against an external reference.
- **Absolute density cannot be checked.** The implied ~1 mm² field is not credible for a 20×
  objective (a 20×/0.8 field on an Axiocam 506 is of the order of 0.15 mm², an estimate, not a
  stated size); on that estimate our counts run 5–8× above the published density. That factor
  was once read as fragmentation; the same-image test against Rust's macro
  ([`rust-2020-fiji-vascular-analysis.md`](rust-2020-fiji-vascular-analysis.md) §7.4) retracted the
  reading, and part of the gap is definitional (bifurcation points vs segments).

## 5. The panels

All **grayscale** (white on black), so `measure_vessels.py` takes its luminance path
(`MIN_RED_FRACTION`), and all **uncalibrated** (`UNCALIBRATED['fa22']`): area % and pixels only.
Cut from the published figures, crop coordinates located from the figures' dark image bands and
frozen, 3 px inner trim.

| Panel | Cut from | Use |
|---|---|---|
| `VESSEL_fa22fig9_a_dense.png` | Fig 9a | published numbers, §4 |
| `VESSEL_fa22fig9_b_sparse.png` | Fig 9b | published numbers, §4 |
| `VESSEL_fa22fig9_c_straight.png` | Fig 9c, long straight parallel vessels | published numbers, §4 |
| `VESSEL_fa22fig8_original.png` | Fig 8a | reference mask, skeleton, graph beside it |
| `VESSEL_fa22fig3_MIP_CD31.png` | Fig 3a, a 10 µm CD31 MIP | reference skeleton beside it |
| `VESSEL_fa22fig13_original.png` | Fig 13a | hard case, below |

The authors' output, cut from the same figures without the `VESSEL_` prefix:
`fa22fig8_binary_reference.png`, `fa22fig8_skeleton_reference.png`, `fa22fig8_graph_reference.png`
(Fig 8b–d), `fa22fig3_skeleton_reference.png` (Fig 3b), `fa22fig13_tortuosity_d10um.png` and
`_d20um.png` (Fig 13b–c). Compare against them by eye in the overlay style; they are re-cropped
figure renderings with compression artefacts, not pixel labels to score against. Fig 8d's graph is
much sparser than its skeleton (8c): that is the pruning.

**`VESSEL_fa22fig13_original.png` fails**: 43.7% area and a 90th-percentile width of 66 px, both
plainly wrong. Unlike the other originals it has a **bright, textured grey background**, which the
luminance fallback and the Otsu floor swallow. It stays as a hard test: a segmentation change that
fixes faint-vessel misses without fixing this panel has probably only moved the threshold.

Left out: the wet-lab protocol (sectioning, blocking, antibodies, slide handling), the tangential
cortex sampling and barrel-cortex landmark, the comparison with competing tools, and the
figure-by-figure description; none bears on the extraction, the metrics or ground truth.
