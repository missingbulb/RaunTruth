# Reference digest — Freitas-Andrade et al. 2022, Pyvane / unbiased endothelial network analysis

> Self-contained digest of the source paper. **No need to reopen the PDF.**

- **Title:** *Unbiased analysis of mouse brain endothelial networks from two- or three-dimensional
  fluorescence images*
- **Authors:** Moises Freitas-Andrade, Cesar H. Comin, Matheus Viana da Silva, Luciano da F. Costa,
  **Baptiste Lacoste\*** (\*corresponding, blacoste@uottawa.ca). Ottawa Hospital Research
  Institute; Federal University of São Carlos; University of São Paulo; uOttawa Brain and Mind.
- **Venue / id:** *Neurophotonics* (2022) **9(3):031916**, article type **PROTOCOL**.
  DOI **10.1117/1.NPh.9.3.031916**. Published online 18 May 2022. 17 pages.
- **PDF:** `freitas-andrade-2022-pyvane-endothelial-networks.pdf`
- **Code:** **Pyvane**, open-source Python — <https://github.com/chcomin/pyvane>
- **One-line thesis:** a full wet-lab-to-number protocol — CD31 immunostaining of mouse brain
  (2-D on 25 µm sections, 3-D on 50–150 µm sections) followed by **segmentation → skeleton →
  graph → measurement** in an open-source Python toolbox that returns **vessel density,
  bifurcation-point density and tortuosity**.

---

## 1. Why this matters to *our* task ⭐

**This is the closest published analogue of what we are building** — same language, same library
stack, same four-stage architecture, and open source. Three payoffs, in order of value:

1. **Figure 9 is external ground truth for our own metrics.** Three 2-D vessel images with the
   authors' measured **vessel density, branch density and tortuosity printed on each panel**.
   We can run our pipeline on those exact images and compare. Nothing else in the corpus lets us
   do that. Result of doing so: **§5**.
2. **Figures 3, 8 and 13 are reference segmentations.** Each shows an original alongside the
   authors' own binary mask / skeleton / graph of *that same image*. A visual target for our
   segmentation that is not our own output — which is exactly what the repo's
   "never validate the pipeline against itself" rule demands.
3. **A fully specified algorithm** (§2) — including the two parameters Rust 2020 leaves blank
   (the thresholding method and its constant), plus a principled pruning rule and a tortuosity
   definition we do not yet have.

**What it does not give us:** no vessel-type classification (our CATEGORIZE ask is still
unmatched anywhere in the literature we have read), and **no scale bar on any figure and no
stated pixel size**, so none of its panels can be calibrated — see §4.

---

## 2. The algorithm, fully specified ⭐

Four modular stages (Fig 5). Pyvane implements each as a swappable "processor".

### 2.1 Segmentation
Assumes vessels are **bright on a dark background** and the image contains only vessels.

1. **Gaussian smoothing**, σ **typically 1 µm** (note: µm, not px — it is a physical scale).
2. **Adaptive (local) thresholding.** For each pixel *i*, compute a Gaussian-weighted local mean
   `Im(i)` with standard deviation **R**, then

   > `Io(i) = 1  if I(i) > Im(i) + C`, else `0`

   with **C typically 2 or 3**. A pixel is a vessel if it is brighter than its neighbourhood by
   at least C. `C > 0` is what stops flat background being classified as vessel.
3. **Remove small connected components** — typically **< 50 µm²** in 2-D, **< 350 µm³** in 3-D.
4. **Remove small holes** — typically **≤ 10 µm²** in 2-D; in 3-D **all** holes are removed
   (a 3-D stack is unlikely to contain background fully enclosed by vessels).

For 3-D stacks the adaptive threshold is applied **per Z-plane**, which makes detection
insensitive to brightness falling off with depth.

> **Note on CD31 specifically:** because CD31 labels endothelium, **large-diameter vessels can
> appear hollow**. Local thresholding still handles them provided the window radius R is large
> enough and the hollow centre is brighter than the surrounding background.

### 2.2 Skeleton
2-D: any standard thinning algorithm. 3-D: the **Palágyi–Kuba** algorithm, chosen deliberately
*because* it keeps small spurious branches — they can then be pruned by an explicit, tunable
rule rather than being silently lost inside the thinning step.

### 2.3 Graph
- Skeleton pixel with **1 neighbour → terminal node**; with **≥3 neighbours → bifurcation node**.
- Nodes joined by an **edge** where a vessel segment runs between them; the segment's pixel path
  is stored as an edge attribute.
- Adjacent bifurcation pixels are **merged into a single node** at their mean position.
- **Iterative pruning:** repeatedly remove the *globally smallest* branch (an edge joining a
  terminal to a bifurcation, measured by arc-length) while any branch is shorter than **S**.
  Removing one branch can create a new one, which is then re-measured — hence iterative.
  **Choose S slightly larger than the typical vessel diameter.**

> ⚠️ **2-D limitation the authors state plainly:** two vessels *crossing* in projection are
> detected as a bifurcation. "Detecting spurious bifurcation points in 2D samples should be
> expected." This is a **direct, published warning about our COUNT metric** — our panels are all
> 2-D projections.

### 2.4 Measurements
- **Vessel density (VD)** = Σ arc-length of all segments ÷ image area (or volume).
  Units **mm/mm²** (2-D) or **mm/mm³** (3-D). *Identical in definition to our `length_density`.*
- **Branching density** = number of nodes of degree ≥ 3 ÷ area/volume. *Note: this counts
  **bifurcation points**, i.e. our `junctions`, not our `segments`.*
- **Tortuosity**, per pixel: take all skeleton pixels within a circle of radius **d** of a
  reference pixel, fit a line **r** by linear least squares, and take the **mean distance from
  those pixels to r**. Small *d* finds sharp turns; large *d* finds smooth, prolonged curvature.
  The image's tortuosity is the mean over reference pixels. Examples run at **d = 10 µm and
  20 µm**.

### 2.5 Side-by-side with our pipeline

| Stage | Pyvane | Ours | Note |
|---|---|---|---|
| Smooth | Gaussian σ ≈ 1 µm | Gaussian σ = 1.0 **px** | same operator, **different unit** — ours is not scale-aware |
| Threshold | **adaptive local mean + C** | global Otsu (floored) OR Frangi vesselness | theirs adapts to uneven illumination; ours to thin-ridge shape |
| Small objects | < 50 µm² | < 20 px | same idea, again px vs µm |
| Holes | ≤ 10 µm² | `binary_fill_holes` (all) | ours is the 3-D rule applied in 2-D — **may close genuine background** |
| Skeleton | Palágyi–Kuba (3-D) / standard (2-D) | `skimage.skeletonize` | equivalent in 2-D |
| Pruning | iterative, global-smallest-first, threshold **S ≈ vessel diameter** | fixed `min_len=8 px`, 40 passes | theirs is principled and scale-linked; **ours is a magic number** |
| Branching | bifurcation nodes / area | branch **segments** / area | **different quantity — do not compare directly** |
| Tortuosity | yes | no | |

**Two concrete upgrades this suggests:** make the smoothing σ and the pruning length **physical
(µm) rather than pixel** constants, resolved through the existing `umpp_for()`; and set the prune
threshold from the measured vessel diameter instead of a literal 8.

---

## 3. Protocol facts worth keeping

- **No perfusion.** The authors found that perfusion — *including with fixatives* — **degrades
  CD31 immunostaining**. Mice are cervically dislocated, brain extracted, immersion-fixed in 4%
  PFA overnight at 4 °C. (Directly contradicts Rust 2020 and Wang 2022, which both perfuse.)
- **2-D route:** 30% sucrose cryoprotection → OCT → **25 µm** cryosections at −20 °C → store
  −80 °C (quality degrades after ~6 months). Permeabilize 0.5% PBT; block 10% normal donkey serum
  + 0.5% fish-skin gelatin, 1.5 h RT; primary overnight 4 °C under parafilm; secondary
  **AF488 donkey anti-goat 1:300**.
- **3-D route:** vibratome sections of cortex (speed 4, frequency 8–10), free-floating staining,
  Fluoromount-G.
- **Imaging:** Zeiss **Axio Imager M2** + **Axiocam 506 mono** + **ApoTome.2** optical sectioning
  (confocal is an acceptable substitute).
  - **2-D:** ×20 (Plan-APOCHROMAT 20×/0.8), **10 µm-deep z-stack at 1 µm steps → maximum
    intensity projection**. The shallow stack is deliberate: it keeps the quantification within
    one anatomical plane.
  - **3-D:** ×10 (Plan-APOCHROMAT 10×/0.45), **60–70 µm** stacks at 1 µm steps (90–100 µm with a
    confocal).
- **Anatomical sampling:** tangential serial sections let anterior / parietal / occipital cortex
  be imaged from one slide; **layer IV barrel cortex is visible from autofluorescence alone**
  when exposure is pushed, and serves as the landmark for identifying neighbouring regions.

## 4. Calibration — none available

**No figure in this paper prints a scale bar, and no pixel size is stated anywhere.** Every
panel extracted here is therefore declared in `UNCALIBRATED` in
`studies/vascular/analysis/measure_vessels.py`; they report area % and pixel
counts only. This is a real limitation, not an oversight — see §5 for what can still be done
with them.

## 5. Running our pipeline on Figure 9 — the one real external check ⭐

Figure 9 prints the authors' own measurements on three 2-D samples. All three crops are the same
size (≈623 × 499 px), so raw counts are directly comparable between them.

| Panel | Published VD (mm/mm²) | Published branch density (mm⁻²) | Published tortuosity | Our segments | Our area % |
|---|---|---|---|---|---|
| (a) dense | 22.60 | 234.3 | 0.90 | 240 | 15.3 |
| (b) sparse | 16.72 | 134.3 | 0.97 | 164 | 8.3 |
| (c) straight | 8.84 | 49.0 | 0.61 | 52 | 6.0 |

**What this establishes — and what it does not.**

- ✅ **Ranking is exactly right.** Our segment counts order the three panels identically to the
  published branch densities, and so does area % against published vessel density.
- ✅ **Relative magnitudes are close.** Dividing our count by the published density gives an
  implied field area of **1.024 / 1.221 / 1.061 mm²**. Those should be identical (same-size
  crops), and they agree to **±9% around their mean** — so our *relative* branch counting is good
  to roughly 10–20% across a 5× range of vessel density.
- ⚠️ **Panel (b) is our worst case in both metrics.** It is the outlier in the implied-area check
  (1.22 vs ~1.04), and the area%-to-published-VD ratio drops to 0.50 against 0.68 for (a) and
  (c). (b) is the *sparse, dim* field — consistent with our known failure mode of missing faint
  vessels, now measured against an external reference rather than eyeballed.
- ❌ **Absolute density cannot be checked.** The implied ~1 mm² field is not credible for a ×20
  objective (a 20×/0.8 field on an Axiocam 506 is on the order of 0.15 mm²). Taking a realistic
  field size instead, our counts come out **roughly 5–8× above** the published branch density —
  which independently reproduces the same over-counting factor the Rust 2020 comparison suggests
  (see [`METHODS-SYNTHESIS.md`](METHODS-SYNTHESIS.md) §3). Two independent papers pointing
  at the same ~5–8× is the strongest statement we have of the fragmentation problem.
- **Reminder:** the published "branch density" counts **bifurcation points**, our `segments`
  counts **branch segments**. In a well-connected mesh these are within a small factor of each
  other, but they are not the same quantity — part of the residual gap is definitional.

## 6. Reported reference magnitudes

From **324 3-D stacks** (Fig 12 distributions):
- **Vessel density** peaks at ≈ **2000 mm/mm³**
- **Branching-point density** peaks at ≈ **50 000 mm⁻³**
- **Tortuosity** is right-skewed — most samples low, a small tail of very tortuous ones.

**2-D vs 3-D tortuosity:** measuring the *same* samples with depth discarded gives **0.93 ± 0.07
in 2-D vs 1.4 ± 0.1 in 3-D**. Projection systematically *under*-states tortuosity by ~35%. Worth
remembering: every panel we work on is a 2-D projection.

## 7. Discussion / limitations

- **Why Pyvane over the alternatives:** its default processors were validated on *hundreds* of
  images across many animals, whereas competing methods were tested on 3, 5, 9 and 15 images
  respectively. And it is modular — the segmentation processor can be swapped for a CNN without
  touching the rest — versus monolithic tools that must be used as shipped.
- **Scale is a choice, not a constant.** The authors stress that the analysis scale (σ, the
  component-size cutoffs, tortuosity *d*) must be matched both to the noise and to the *spatial
  extent of the biology being studied*.
- **Stated limitations:** spurious bifurcations from crossings in 2-D; pruning can remove genuine
  short segments if S is set too large; no vessel-type discrimination.

## 8. Extracted images

13 figures, 12 cropped panels. Descriptions: [`figures/README.md`](#figures);
panel inventory and caveats: [`figures/panels/README.md`](#figures).

| File | Fig | Content |
|---|---|---|
| `figures/fig1_antibody_incubation_slide.png` | 1 | Photo of a slide under parafilm during primary-antibody incubation. |
| `figures/fig2_vibratome_prep.png` | 2 | Preparing mouse brain for vibratome sectioning. |
| `figures/fig3_2D_MIP_and_skeleton.png` | 3 | **(a) CD31 MIP, (b) the authors' skeleton of it**, (c) cortex sampling regions. |
| `figures/fig4_tangential_cortex_regions.png` | 4 | Tangential serial cortex; barrel cortex as an anatomical landmark. |
| `figures/fig5_pyvane_pipeline.png` | 5 | **The full method diagram** — the four stages and the algorithm used at each. |
| `figures/fig6_branch_pruning.png` | 6 | The iterative pruning rule, illustrated. |
| `figures/fig7_tortuosity_method.png` | 7 | How per-pixel tortuosity is computed (neighbourhood, fitted line, distances). |
| `figures/fig8_2D_worked_example.png` | 8 | **Original → binary → skeleton → graph** on one real sample. |
| `figures/fig9_2D_samples_with_measurements.png` | 9 | **Three samples with published measurements** — our ground truth (§5). |
| `figures/fig10_3D_reconstruction.png` | 10 | 3-D stack and its reconstruction, coloured by vessel diameter. |
| `figures/fig11_3D_samples.png` | 11 | Six 3-D samples spanning the density/tortuosity range. |
| `figures/fig12_measurement_distributions.png` | 12 | Distributions over 324 stacks (§6). |
| `figures/fig13_local_tortuosity.png` | 13 | One original + local tortuosity at d = 10 µm and 20 µm. |

---

## Figures

Native-resolution figure images extracted from
`../freitas-andrade-2022-pyvane-endothelial-networks.pdf`
with the paper-intake skill's extractor. Cropped panels: [`panels/README.md`](#figures).

**All 13 figures of the paper are here.** Unlike the other papers in this corpus, **not one of
them prints a scale bar** — which is why every extracted panel is declared uncalibrated.

The three most useful are **Fig 5** (the method), **Fig 8** (a reference segmentation) and
**Fig 9** (published measurements = ground truth).

---

### Fig 5 — `fig5_pyvane_pipeline.png` — the method ⭐


Three columns: example images (left), the four stages (middle), the algorithm used at each
(right). **Segmentation** ← Gaussian smoothing, adaptive thresholding, small-connected-component
removal, hole removal. **Skeletonization** ← Palágyi–Kuba. **Graph construction** ← terminal and
bifurcation point detection, branch pruning. **Characterization** ← vessel density, density of
bifurcation points, tortuosity. Transcribed with all parameters in §2 above.

### Fig 9 — `fig9_2D_samples_with_measurements.png` — ground truth ⭐


Three 2-D samples, each captioned with the authors' own numbers: (a) VD 22.60 mm/mm², branch
234.3 mm⁻², tortuosity 0.90 µm; (b) 16.72, 134.3, 0.97; (c) 8.84, 49.0, 0.61. (a) is a dense
mesh, (b) sparse and fragmented-looking, (c) dominated by long straight parallel vessels — hence
its low tortuosity. **The only external per-image ground truth in the whole corpus.** Our
pipeline's result on these three: §5 above.

### Fig 8 — `fig8_2D_worked_example.png` — a reference segmentation ⭐


(a) original, (b) the authors' binary mask, (c) their skeleton, (d) their graph (blue nodes =
bifurcations and terminations, green edges). Useful as a *visual* target: run our segmentation on
(a) and compare the mask to (b) and the skeleton to (c). Note in (d) how sparse the graph looks
relative to (c) — that is the pruning at work.

### Fig 3 — `fig3_2D_MIP_and_skeleton.png`


(a) maximum-intensity projection of a 10 µm-deep CD31 z-stack; (b) the skeleton of it, which the
caption argues "clearly captures all vessels within the 10 µm depth"; (c) a BioRender schematic
of the frontal / parietal / caudal cortical regions sampled. Another original+skeleton reference
pair.

### Fig 13 — `fig13_local_tortuosity.png`


(a) original grayscale vessels; (b) per-pixel tortuosity at **d = 10 µm**; (c) at **d = 20 µm**,
both on a black→purple→orange→white colour scale topping out at 3.47 µm. The small scale picks out
sharp kinks; the large scale picks out long smooth bends. **Visual note:** (a) has a noticeably
*bright, textured grey background* compared with the other originals — which is exactly why our
segmentation over-detects on it (see [`panels/README.md`](#figures)).

### Fig 7 — `fig7_tortuosity_method.png`


(a) skeleton split into segments; (b) the per-pixel construction — reference pixel *pc* in
orange, its circular neighbourhood, the least-squares line *r* in purple, and the red distances
whose mean is the tortuosity value.

### Fig 6 — `fig6_branch_pruning.png`


The iterative prune: (a) smallest branch found (red), (b) removing it exposes a new branch, also
below threshold, (c) the settled result.

### Fig 10 / 11 / 12 — 3-D


`fig10_3D_reconstruction.png` — (a) a raw 3-D stack, (b) the detected vessels rendered with
colour encoding **diameter** (brighter = thicker).


`fig11_3D_samples.png` — six 3-D samples (shown as maximum Z-projections) spanning the density
and tortuosity range: (a) highest density, (b) lowest, (c) most tortuous, (d) least, (e)/(f)
intermediate.


`fig12_measurement_distributions.png` — distributions of (a) vessel density, (b) branching-point
density and (c) average tortuosity over **324** 3-D stacks. Density distributions symmetric;
tortuosity right-skewed.

### Fig 1 / 2 / 4 — protocol context


`fig1_antibody_incubation_slide.png` — a slide covered with parafilm during overnight primary
antibody incubation (the trick that lets a small antibody volume cover the whole section).


`fig2_vibratome_prep.png` — halving the brain, mounting and vibratome-sectioning the cortex for
the 3-D route.


`fig4_tangential_cortex_regions.png` — (a) tangential serial cortex sections with anterior/
parietal/occipital regions boxed; (b) layer IV barrel cortex made visible by pushing exposure on
background autofluorescence; (c) using S1 as a landmark for frontal/motor, auditory and visual
cortex.

---

## Figure panels

12 sub-panels from Figs 3, 8, 9 and 13. Full figures: [`README.md`](#figures).

> **These panels are GRAYSCALE** — white vessels on black, not the red channel of the other
> papers. `measure_vessels.py` detects this (`MIN_RED_FRACTION`) and falls back to a luminance
> path; the red panels stay on exactly the code path they were originally measured with.

> **All of them are UNCALIBRATED.** No figure in this paper prints a scale bar and no pixel size
> is stated. They report area % and pixel counts only — never µm, never a density.

### Working-dataset panels — `VESSEL_*.png` (6 files)

| File | What | Why it is here |
|---|---|---|
| `VESSEL_fa22fig9_a_dense.png` | dense mesh — published VD **22.60** mm/mm², branch **234.3** mm⁻², tortuosity **0.90** | **ground truth** |
| `VESSEL_fa22fig9_b_sparse.png` | sparse — published **16.72**, **134.3**, **0.97** | **ground truth** |
| `VESSEL_fa22fig9_c_straight.png` | long straight parallel vessels — published **8.84**, **49.0**, **0.61** | **ground truth** |
| `VESSEL_fa22fig8_original.png` | the worked example | has a **reference mask and skeleton** beside it |
| `VESSEL_fa22fig3_MIP_CD31.png` | 10 µm-deep CD31 MIP | has a **reference skeleton** beside it |
| `VESSEL_fa22fig13_original.png` | the tortuosity example | **currently a failing case** — see below |

### Reference panels (6 files) — the authors' own output

Not `VESSEL_`-prefixed: these are results, not inputs. They are the closest thing we have to an
externally-produced answer key for segmentation.

| File | What it is a reference for |
|---|---|
| `fa22fig8_binary_reference.png` | the binary mask our `segment()` should approximate on `VESSEL_fa22fig8_original.png` |
| `fa22fig8_skeleton_reference.png` | the skeleton it should produce |
| `fa22fig8_graph_reference.png` | the pruned graph — bifurcations/terminations in blue, edges green |
| `fa22fig3_skeleton_reference.png` | the skeleton for `VESSEL_fa22fig3_MIP_CD31.png` |
| `fa22fig13_tortuosity_d10um.png` | per-pixel tortuosity at d = 10 µm |
| `fa22fig13_tortuosity_d20um.png` | per-pixel tortuosity at d = 20 µm |

**How to use them (and how not to).** Compare our mask/skeleton against these *visually*, in the
overlay style the working guide prescribes. Do **not** score against them numerically as if they
were pixel-perfect labels — they are figure-resolution JPEG/PNG renderings of the authors'
output, re-cropped, with their own compression artefacts.

### Known failure: `VESSEL_fa22fig13_original.png`

Our pipeline currently reports **43.7% area** and a 90th-percentile width of **66 px** on this
panel — both obviously wrong; the visible vasculature is nothing like 44% of the field. The
cause is visible in the image: unlike the other originals, this one has a **bright, textured grey
background**, and the luminance fallback plus the Otsu floor swallow it.

It is kept in the dataset **deliberately, as a hard test case**. A segmentation change that fixes
the faint-vessel misses without also fixing this panel has probably just moved the threshold.

### What these panels are good for

1. **The one external numeric check we have** — Fig 9, see §5 above.
   Ranking is reproduced exactly; relative counts agree to ±9%; panel (b), the sparse dim one, is
   our worst case in both metrics, which independently confirms the faint-vessel failure mode.
2. **A visual answer key** for segmentation and skeletonization (Figs 3, 8).
3. **Marker/appearance robustness** — grayscale, a different microscope, a different lab. If our
   detector only works on Olympus red-channel rat panels, these are where that shows.

### What they are not good for

- Any **µm or density** number (uncalibrated).
- Any **cross-paper mean** — `measure_vessels.py` groups the rollup per paper for this reason.
- **Absolute branch counts.** The published number counts *bifurcation points*; ours counts
  *branch segments*. Related, not equal.

### Crop method

a crop script that is not kept (Pillow), coordinates located from the figures' dark
image bands and frozen. 3-px inner trim.
