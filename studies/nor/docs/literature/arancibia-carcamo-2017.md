# Arancibia-Cárcamo et al. 2017 — Node of Ranvier length as a potential regulator of myelinated axon conduction speed

*eLife 2017;6:e23329 · DOI [10.7554/eLife.23329](https://doi.org/10.7554/eLife.23329) ·
CC-BY · UCL (Attwell lab) + Iwate Medical University · full text read from the publisher PDF.*


*PDF: kept in the study's Drive `Literature` folder as `Node of Ranvier length as a potential regulator of myelinated axon conduction speed.pdf`, not in the repo.*

## 1. What it gives the study

- **The measurement the study automates (R4 definition A).** The brief's plot-profile requirement
  is this paper's node-length method, and the overview's Figures 2 and 7 are this paper's Figure 1
  (its panel B is the profile). It is the only length definition in our sources checked against
  electron microscopy (§2).
- **Reference magnitudes and the plausibility window.** Rat optic nerve and cortex node lengths
  (§3), and an observed cortical range of 0.43–3.72 µm that is much wider than the brief's
  1–2 µm ± 0.5 window — the evidence for re-expressing that window as a ratio (R1) rather than a
  µm filter.
- **A target bias for "horizontal" selection.** Their in-plane criterion underestimates true
  length by 1.7% ± 0.6% (§2).
- **Two validation signals, not detection rules** (§3): node length should not track blob or axon
  size, and summed Na<sub>v</sub>1.6 should rise with length.
- **The sampling the method was validated at**: 52.7 nm/px, ~19 px across a 1 µm node — the
  upper reference point of R2's tier-3 scale curve.

**What it does not give:** any detection step (every node was hand-selected, so the MVP has no
reference implementation here), any false-positive or miss rate, inter-observer agreement on
the selection or the length, the measurement script, and any corpus callosum value.

## 2. The plot-profile method, as performed

- **Selection.** Confocal images, background subtracted, in ImageJ. Only nodes **approximately
  parallel to the plane of section** were measured: Na<sub>v</sub>1.6 with both flanking Caspr
  paranodes inside a single 0.8 µm optical slice — a **3D** criterion, not an in-plane angle.
  For 10 randomly chosen axons, the angle to the slice plane showed this underestimates true node
  length by only **1.7% ± 0.6%**. A "horizontal" filter on our images carrying a much larger bias
  is admitting tilted axons. Our images are single planes for now, so the criterion itself cannot
  be applied (WARMUP blocker 3).
- **Projection.** Maximum intensity projection over the slices containing that node's Caspr — up
  to five interleaved slices at 0.38 µm, stack at most 2.32 µm thick.
- **Profile.** A line intensity profile spanning **both paranodes**, on the **Caspr channel only**
  (Na<sub>v</sub>1.6 identifies the node, never measures it), with a thickness **slightly less
  than the Caspr labelling thickness** — a finite-width average, which the brief omits and which
  sets profile noise. For our measurement, the line width is a parameter to tie to the measured
  paranode width, not a pixel count.
- **Length.** A MATLAB script took the distance between **the half-maximum of each paranode** — each
  crossing at 50% of *its own* peak. The brief's Figure 6 draws one global threshold instead
  (definition B); [`measurement-definitions.md`](measurement-definitions.md) works the fork through.
- **Accuracy.** Mean confocal length was not significantly different from EM on the same tissue
  (p = 0.06) — the reason the study automates this method rather than inventing one.

**Unstated, where our implementation needs a value:** how the two peaks were found, any smoothing,
what happened with more or fewer than two peaks; the background-subtraction method and radius; the
exact line thickness; whether the line was hand-drawn or fitted and its orientation optimised;
any PSF correction (lateral PSF ~200 nm FWHM at 63×/1.4 against a ~1 µm length, not discussed).
The measurement script is not published (only the simulation code was promised), so nothing can be
ported or run side by side.

**Acquisition**, for comparing our files' sampling: Zeiss LSM700/780, 63× NA 1.4 oil, pinhole
1 Airy unit for Caspr (0.8 µm optical slice), **52.7 nm pixels for the node measurements**
(Fig 2), z step 0.38 µm. Caspr was the 647 channel (rendered red) and Na<sub>v</sub>1.6 the 488
(green) — the inverse of the owner's convention. Rat tissue, 4% PFA, **not corrected for fixation
shrinkage**, so absolute lengths carry that unknown.

## 3. Reference values

Stated values, measured at 52.7 nm/px (mean ± s.e.m.):

| Quantity | Optic nerve | Cortex (layer V, motor) |
|---|---|---|
| Mean node length | **1.02 ± 0.02 µm** | **1.50 ± 0.05 µm** |
| Standard deviation | 0.29 µm | 0.58 µm |
| n (nodes) | 164 | 158 |
| Range | 4.4-fold | **8.7-fold — 0.43 to 3.72 µm** |
| Mean node diameter | — | 0.64 ± 0.01 µm (s.d. 0.14, n = 158) |

- Neither region is corpus callosum, so neither column is a target for the owner's images; white
  matter plausibly sits nearer the optic nerve, but that is an expectation, not a citation.
- **Length does not depend on node diameter** (p = 0.14 optic nerve, p = 0.42 cortex) nor on axon
  diameter at the paranode (p = 0.89, p = 0.98); EM slope not different from zero (p = 0.46). If our
  lengths correlate with the measured width or blob size, suspect a segmentation artefact.
- **Summed Na<sub>v</sub>1.6 over a node is linearly correlated with node length**
  (p = 1.2 × 10⁻¹⁵), with large scatter. A candidate far off that line is worth a second look; it
  is a validation signal, not a rule.
- Lengths vary much less along one axon than between axons.

## 4. Where the study diverges from it

- **They measured hand-picked nodes; we detect and count all of them**, including the ones the
  horizontal stage will refuse to measure — so detection and measurement have different error
  costs and are tuned separately.
- **Their parallel-to-section rule needs a z-stack** we do not have; an in-plane substitute must
  be measured against their 1.7% bias, not assumed equivalent.

Left out: the conduction-velocity modelling and energy argument, tracer injection, EM preparation,
antibody catalogue detail, tissue protocol beyond fixation, funding.
