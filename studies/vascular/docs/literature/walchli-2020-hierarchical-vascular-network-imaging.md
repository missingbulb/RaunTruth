# Reference digest — Wälchli et al. 2020, hierarchical µCT imaging of mouse brain vessel networks

> Self-contained digest of the source protocol. **No need to reopen the PDF.**

- **Title:** *Hierarchical imaging and computational analysis of three-dimensional vascular
  network architecture in the entire postnatal and adult mouse brain*
- **Authors:** **Thomas Wälchli\***, Jeroen Bisschop, Arttu Miettinen, Alexandra Ulmann-Schuler,
  Christoph Hintermüller, Eric P. Meyer, Thomas Krucker, Regula Wälchli, Philippe Monnier, Peter
  Carmeliet, Johannes Vogel, Marco Stampanoni. (\*corresponding; Zurich / Toronto.) Conflict
  declared: E.P.M. co-founded vasQtec, maker of the PU4ii resin.
- **Venue / id:** *bioRxiv* preprint **2020.10.19.344903**, v1 posted 19 Oct 2020, not peer
  reviewed. DOI **10.1101/2020.10.19.344903**. 150 pages (protocol, 12 figures, 10 Extended Data
  figures, 14 Supplementary figures, 1 video).
- **Licence:** **all rights reserved** — every page carries "The copyright holder for this
  preprint … is the author/funder. All rights reserved. No reuse allowed without permission."
  So no PDF, figure or panel is committed; figures are described in words only.
- **PDF:** kept in the study's Drive Literature folder as `Hierarchical imaging and computational analysis of three-dimensional vascular network architecture in the entire postnatal and adult mouse brain.pdf`, not in
  the repo.
- **One-line thesis:** a ~10-day protocol — polyurethane (PU4ii) corrosion casting, desktop µCT
  overview, synchrotron µCT at 0.65–0.73 µm isotropic voxels, Otsu + skeleton graph analysis —
  that quantifies the 3D vessel network of P10 and P60 mouse brains, splitting capillaries
  (< 7 µm inner diameter) from non-capillaries, and finds the P10→P60 gain is almost all
  capillaries.

---

## 1. Why this matters to *our* task ⭐

**A complete, stated 3D skeleton-graph recipe, in µm, with the definitions we use.** The paper's
"segment" is our COUNT unit (branch point to branch point), its "segment length" is a summed
smoothed-centerline length (our MEASURE), and it CATEGORIZEs by caliber with one threshold. What
it gives us:

- **A physical caliber cut:** capillary = inner diameter **< 7 µm**, non-capillary ≥ 7 µm (after
  Weber et al. 2008, macaque). A segment's diameter is the **mean** local diameter along it; a
  branch point takes the diameter of its **thickest** joining segment.
- **Every cleanup constant in µm:** closing sphere radius 0.75 µm; branch points < **2 µm** apart
  merged; spur removed if it has a free end and **L < 2·max(r₁, r₂)**; isolated pieces < **5 µm**
  erased; anchored Gaussian smoothing σ 1.125 µm, max displacement 0.5 µm. The spur rule is the
  scale-linked pruning METHODS-SYNTHESIS §4.3/§4.6 asks for.
- **Reference magnitudes for mouse cortex, young adult (P60), 3D:** mean segment length
  **~30 µm**, mean segment diameter **~5 µm**, tortuosity **~1.21**, branch-point density
  **~17,000 mm⁻³**, segment density **~3×10⁴ mm⁻³**, vascular volume fraction **2.6%** (§3).
- **Development changes everything:** P10 → P60 cortex: branch points ×4.3, segments longer at
  P10 (~40 µm) and wider (~7 µm). Age is a first-order confounder.

**What it does not cover:** CD31 or any immunostain on the analysed data (casts measure the
**lumen**; CD31 marks the endothelium, so our widths should run above theirs — by an amount the
paper never measures); 2D sections or MIPs; arteries vs veins (explicitly impossible from the
cast geometry); non-perfused vessels, tip cells, sprouts; ischemia or any injury model. No
images usable as `VESSEL_*` panels (§5).

## 2. The method

**Animals.** WT C57BL/6 ("WT/Bl6") and Nogo-A⁻/⁻ mice, male or female, at **P10** and **P60**;
weighed before perfusion (weight-matching stressed). ROI analysis: n = 4–6 (P10 WT), 8–12 (P60
WT), 3–5 / 11 (P10 Nogo-A⁻/⁻), 8–11 / 13 (P60 Nogo-A⁻/⁻) — counts differ between legends;
about three ROIs per animal per region. Whole-brain scan: **one** P10 WT and **one** P60 WT.

**Casting.** Pentobarbital 100 mg/kg i.p. Butterfly needle (23G adult, 25G P10) into the left
ventricle at ~30°, glued; right atrium opened. Perfusion: ACSF + 25,000 U/L heparin (20 ml adult,
5 ml P10; elsewhere "10–20 ml"), then 4% PFA in PBS, then PU4ii resin (5 g resin + 3 g ethyl
methyl ketone + 5–10 mg pigment, 0.8 g hardener added last, degassed). Pressure **90–100 mmHg**
(P10, 4 ml/min) and **100–120 mmHg** (P60, 8 ml/min). Success = paws/snout/tail turn blue at
once. Cure ≥ 24 h at room temperature; macerate in 7.5% KOH at 50 °C ≥ 24 h; decalcify in 5%
formic acid at 50 °C ≥ 24 h; dissect off extracranial vessels; wash; **2% OsO₄ 24 h** for X-ray
contrast; lyophilise overnight at −54 °C; glue to Plexiglas stubs with steel reference pins.
QC: light microscopy of all casts, SEM (Hitachi S4000, gold-sputtered) on 1–2 — dense network, no
holes, endothelial nuclear imprints on large vessels. PU4ii is described as low-viscosity,
minimal-shrinkage; **no shrinkage figure is given**.

**Imaging.**
- *Overview:* Scanco µCT 40, 50 kVp, 160 µA, **16 µm** isotropic voxels, 1000 projections,
  200 ms, 3× frame averaging. Used only to place ROIs.
- *ROIs:* "one to three ROIs of 1 mm³ per animal and brain region" in cortex, hippocampus,
  superior colliculus (corpus callosum, brain stem also drawn in Fig. 4).
- *High resolution:* SRµCT at TOMCAT (Swiss Light Source), 17.5 keV, sample–detector 30 mm,
  **0.73 µm** isotropic voxels, Paganin phase retrieval, gridrec. Projections stated two ways:
  1001 × 2 s (Equipment setup) and 2000 × 0.1 s (Procedure step 22). Image
  2560 × 2560 × 2160 voxels ≈ 5.5 mm³. Field of view is a **cylinder**; renders show 0.75 mm boxes.
  SNR > 10, typically 20–30.
- *Whole brain:* same setup at **0.65 µm**, mosaic, non-rigid stitching (NRStitcher, Miettinen
  2019), ~24 h per brain, manually registered to the Allen atlas and cut into ROI-sized blocks
  (5–126 per region).

**Segmentation and graph (pi2 v3.0, github.com/arttumiettinen/pi2, Python 3.6).**
1. Optional bilateral filter if noisy (not needed at their SNR).
2. **Otsu** global threshold. Other bimodal-histogram methods gave thresholds within 10% of Otsu.
3. Morphological **closing**, spherical element radius **0.75 µm** (Procedure: "1–3 voxels").
4. Fill all enclosed background (bubbles in large vessels).
5. Distance map of vessels (local radius = distance to nearest background).
6. Skeletonize by iterative thinning to one-voxel centerlines.
7. Trace a graph: node = skeleton voxel with > 2 neighbours (degree ≥ 3); edge = branch, with
   its voxel list and the radius at each voxel. **Nodes closer than 2 µm merged into one** (Fig.
   7b legend only).
8. **Anchored convolution** smoothing (Suhadolnik et al.) of each edge's points: Gaussian
   σ = 1.125 µm, no point moves > 0.5 µm, endpoints fixed.
9. Length = sum of distances between consecutive smoothed points.
10. Erase **isolated** branches < 5 µm.
11. Erase branches with one free end and **L < 2·max(r₁, r₂)** (Methods text says "twice the
    radius at the non-free end").
12. Dissolve degree-2 nodes (join their two edges); drop degree-0 nodes.

**Metric definitions.**

| Metric | Definition |
|---|---|
| Vascular volume fraction (VVF) | vessel voxels / all voxels; capillary / non-capillary VVF = VVF scaled by each class's share of summed segment volume |
| Branch point degree | number of segments meeting at the node (≥ 3) |
| Branch point diameter | diameter of the **thickest** joining segment; decides capillary vs non-capillary branch point |
| Branch point / segment density | count ÷ network volume (the **cylinder** volume of the tomogram), per mm³ |
| Segment | edge between two branch points (or branch point and free end) |
| Segment diameter | **mean** of local diameter over the segment's points |
| Segment length | sum of smoothed point-to-point distances |
| Tortuosity | segment length ÷ straight distance between its endpoints |
| Segment volume | sum of cylinders per line piece, diameter = mean of its two end diameters |
| Extravascular distance (EVD) | Euclidean distance transform of background; mean and histogram |
| Directionality | each line piece's unit vector → RGB (×1.75, clamped); angles between all segment pairs at a node |

**Statistics.** Welch t-test on per-ROI means, P < 0.05; boxplots (whiskers 1.5 IQR, open dot =
mean); NumPy/Matplotlib.

**Gaps (never stated):** resin shrinkage; any validation of the segmentation or graph against
manual tracing or a phantom; how the 7 µm cut was chosen beyond the citation; whether densities
are per ROI or pooled per animal before the t-test (text says "mean of the parameters of each
ROI"); exact n per panel (legends give ranges that disagree); handling of segments cut by the ROI
boundary; any total length density (mm/mm³) — it is never reported; the medians or full
distributions of segment length behind Fig. 8 (see §5).

## 3. The reported numbers

**From the text (mean ± SD, P60 WT vs P10 WT, ROI method):**

| Quantity | Region | P60 WT | P10 WT | P |
|---|---|---|---|---|
| VVF, all | cortex | **2.58 ± 0.77%** | 1.67 ± 0.45% | 0.0032 |
| | hippocampus | 2.97 ± 0.70% | 2.14 ± 0.22% | 0.019 |
| | superior colliculus | 2.81 ± 1.15% | 1.93 ± 0.26% | 0.048 |
| VVF, capillaries | cortex | 1.16 ± 0.37% | 0.43 ± 0.22% | exponent garbled |
| | hippocampus | 1.28 ± 0.37% | 0.79 ± 0.1% | 0.011 |
| | sup. colliculus | 1.52 ± 0.42% | 0.64 ± 0.14% | exponent garbled |
| VVF, non-capillaries | cortex / hipp. / SC | 1.42 / 1.7 / 1.29% | 1.24 / 1.35 / 1.3% | 0.41 / 0.20 / 0.99 |
| Branch points, all (mm⁻³) | cortex | **16,954 ± 8,330** | 3,922 ± 1,377 | exponent garbled |
| | hippocampus | 19,814 ± 6,727 | 6,010 ± 1,099 | 0.00019 |
| | sup. colliculus | 23,907 ± 11,031 | 4,471 ± 1,581 | exponent garbled |
| Branch points, capillary (mm⁻³) | cortex / hipp. / SC | 13,994 / 15,258 / 19,991 | 1,929 / 3,524 / 2,416 | |
| Branch points, non-capillary (mm⁻³) | cortex / hipp. / SC | 2,960 / 4,557 / 3,916 | 1,993 / 2,486 / 2,055 | 0.10 / 0.035 / 0.091 |
| Degree-4 branch points (mm⁻³) | cortex | 1,769 ± 1,047 | 188 ± 62 | 0.00015 |
| Degree-5 branch points | all | none detected | none | |
| Mean degree change P10→P60 | all regions | +2–3% | | |
| Extravascular distance | cortex | **17.42 ± 6.52 µm** | 31.94 ± 10.63 µm | exponent garbled |
| | hippocampus | 13.4 ± 3.93 µm | 18.44 ± 2.17 µm | 0.014 |
| | sup. colliculus | 11.15 ± 3.55 µm | 19.22 ± 4.29 µm | exponent garbled |

P10 cortex VVF split: 74.2% of vessel volume non-capillary, 25.8% capillary. Nogo-A⁻/⁻ at P10
mimics the P60 gain (cortex VVF 2.32 ± 0.35%, EVD 16.56 ± 2.30 µm); at P60 no difference.
Some P-values' exponents did not survive text extraction ("10"$") and are left unstated.

**Degree mix — a contradiction in the paper.** Extended Data Fig. 7 says degree ≥ 4 is "far less
than 1% of all branch points", but the text's own cortex numbers give degree-4 / all =
1,769 / 16,954 ≈ **10%** at P60 and 188 / 3,922 ≈ **5%** at P10. Trust neither as a
target without checking; Blinder (7%) and Ji (1–3%) bracket them.

**Read off Supplementary Fig. 4 (vector boxplots, ROI method; means ±~1 in the last digit):**

| Quantity | Region | P10 WT | P60 WT |
|---|---|---|---|
| Segment density (×10⁴ mm⁻³) ¹ | cortex / hipp. | ~0.7 / ~1.05 | ~2.9 / ~3.4 |
| | sup. colliculus | ~0.08×10⁵ | ~0.42×10⁵ |
| Mean segment diameter (µm) | cortex / hipp. / SC | ~6.9 / ~6.3 / ~6.6 | **~5.0** / ~5.3 / ~4.6 |
| Mean segment length (µm) | cortex / hipp. / SC | ~40 / ~45.5 / ~52.5 | **~30** / ~27.5 / ~28.5 |
| Tortuosity | cortex / hipp. / SC | ~1.175 / ~1.179 / ~1.156 | **~1.207** / ~1.206 / ~1.211 |
| Mean segment volume (×10³ µm³) | cortex / hipp. / SC | ~2.4 / ~1.85 / ~2.4 | ~0.85 / ~0.8 / ~0.6 |

¹ The axis is printed "µm⁻³"; the magnitudes only make sense as mm⁻³ (a legend typo).

**Whole-brain scan, cortex (Supplementary Fig. 12; n = 126 / 76 blocks from one brain each):**
segment density ~0.7 → ~3.6 ×10⁴ mm⁻³ (+426%); mean diameter ~8.4 → ~5.8 µm (−31%); mean length
~47 → ~25 µm (−46%); tortuosity ~1.155 → ~1.20 (+4%). Capillaries alone at P60: diameter ~4.8 µm,
length ~25 µm, tortuosity ~1.20. Whole-brain VVF (Fig. 11k–r, P60, approximate): cortex ~3.4%,
hippocampus ~3.1%, thalamus ~3.5%, medulla ~4.2%.

**Diameter distribution (Fig. 6e–g, read off):** segment-diameter histograms peak at
**~4 µm** (P60) and ~5 µm (P10) in all three regions; very little mass above 10 µm.

**Branching angles (Fig. 10h–p, Suppl. Fig. 14):** capillary segment pairs at a node spread
**~75°–150°** (broad hump, peak ~120–140°); non-capillary pairs peak at **~90° and ~170°**
(a straight through-vessel with a perpendicular side branch), sharper at P60. A small spike near
0° appears in every "all vessels" and capillary curve.

**Derived, not reported (our arithmetic, product of means — indicative only):** P60 cortex length
density ≈ 2.9×10⁴ mm⁻³ × 30 µm ≈ **0.9 m/mm³**; P10 ≈ 0.28 m/mm³.

## 4. Arguments worth keeping

- **Casts measure the lumen, so diameters are inner diameters.** The authors argue immunostains
  (incl. LSFM) mismeasure diameter because perivascular cells and staining spread distort the
  edge, and that no marker selectively labels capillaries (Mfsd2a, Tfrc, Slc16a2, Car4, Cxcl12,
  Rgcc, Spock2 all stain larger vessels too). Hence a morphological 7 µm cut.
- **MIPs overestimate density** because the area fractions of stacked optical sections sum; the
  error grows with section thickness. Directly relevant to every 2D projection we measure.
- **The P10→P60 gain is capillaries**, made by new degree-3 branch points (+304% cortex) and by
  existing ones gaining a fourth branch (+839% degree-4). Non-capillary volume barely moves.
- **Segments get shorter and thinner with maturity** as the capillary mesh fills in; EVD halves
  (cortex 31.9 → 17.4 µm), comparable to Tsai 2009's "≤ 15 µm from any neuron".
- **Directionality:** in cortex and superior colliculus the surface plexus (PNVP) runs in x/y and
  penetrating vessels (INVP) run radially in z; capillaries are isotropic; hippocampal main
  branches follow the structure's curve along x.
- **Authors' stated limitations:** labour-intensive; snapshot only, many animals for time
  courses; only perfused lumen is seen (no tip cells, filopodia, non-perfused sprouts); no flow;
  no artery/vein call except by SEM nuclear-imprint shape (elongated = artery, round = vein);
  resin may extravasate where the blood–brain barrier is broken (stroke, trauma, tumour) — not
  seen in their P10 brains, not excluded in disease; terminal procedure.
- **Resolution argument:** 0.65 µm isotropic vs 1.625 × 1.625 × 3 µm LSFM resampled to 3 µm
  (Todorov 2020) and 2 µm µCT (Quintana 2019).

**Cross-paper tension.** Rust 2020 reports branch density peaking at P10 and then *declining*;
here cortex branch points rise ×4.3 from P10 to P60. Different modality (2D CD31 sections vs 3D
perfused lumen) and different definitions; perfusion casting cannot see unperfused P10 sprouts,
which likely explains much of it.

**Internal inconsistencies to keep in mind:** ACSF volume (5 vs 10–20 ml at P10); projection
count/exposure (1001 × 2 s vs 2000 × 0.1 s); closing radius (0.75 µm vs 1–3 voxels); spur rule
wording; degree-4 share (§3); Fig. 11 scale bars printed "2.5 µm / 0.25 µm / 1 µm" where mm is
evidently meant; Extended Data Fig. 4 scale bars printed "100 mm / 50 mm"; non-capillary share
in P10 superior colliculus given as "1.3% … (33% of total)" and capillaries "0.64% (67%)",
which is arithmetically reversed.

## 5. What is not in this PDF

- **No usable panels.** The licence forbids reuse, and the images are anyway µCT slices of
  resin casts, 3D surface renders, SEM, schematics and plots — not single-channel CD31 vessel
  images. Nothing enters the `VESSEL_*` dataset and nothing needs calibration.
- **Figure 8 is missing from this PDF.** Page 79, where Figure 8 (segment density, diameter,
  length, tortuosity, volume — cortex, ROI method) should sit, carries a second copy of Extended
  Data Figure 8 (same embedded image as page 103). Its legend (page 80) survives. The same
  quantities are recovered approximately from Supplementary Figs. 4 and 12 (§3); the per-class
  (capillary / non-capillary) ROI-method values and the Fig. 8c diameter-vs-length plot are lost.
- **Supplementary Video 1** (P10 perfusion) is referenced, not included.
- **No code or data deposit** beyond the pi2 repository URL; no request was made for the
  analysis scripts. Not fetched.
- **Deliberately omitted:** the introduction's developmental biology and Nogo-A background,
  reagent catalogue numbers, the troubleshooting table beyond "air bubbles and mitral-valve
  injury ruin a perfusion", acknowledgements, and Nogo-A⁻/⁻ results beyond one line.
  Cross-checked against the full extracted text (8,001 lines).

## 6. Extracted images

All figures described in words (no images: all rights reserved) in
[`figures/README.md`](#figures). The most useful for us: Fig. 4o (skeleton tracing
schematic), Fig. 6e–g (diameter histograms), Fig. 7b (branch point definition, 2 µm merge),
Fig. 10h–p (branch angles), Supplementary Figs. 4 and 12 (segment length/diameter/tortuosity).

---

## Figures

Described from page renders of the owner's copy of the PDF (kept in the study's Drive Literature
folder, not in the repo). Digest: [`../digest.md`](#).

> **The figure images are not committed.** Every page of the preprint states "All rights
> reserved. No reuse allowed without permission", and this repository is public, so only these
> descriptions are kept.

> **There is no `panels/` folder for this paper, deliberately.** The images are resin-cast µCT
> slices, 3D surface renders, SEM, photographs, schematics and plots. None is a single-channel
> CD31 vessel image, so nothing enters the working dataset.

---

### Main figures

**Fig. 1 — protocol flow chart.** Colour-coded boxes over a 10-day timeline: day 1 perfusion;
days 2–4 curing, KOH maceration, formic-acid decalcification, dissection; days 4–5 wash, OsO₄,
freeze-drying; days 5–6 mounting, desktop µCT, ROI selection; days 6–7 SRµCT; days 7–10
reconstruction and analysis. A note gives a **60–70% perfusion success rate** depending on the
experimenter. Output list: VVF [%], segment length [µm], diameter [µm], volume [µm³],
tortuosity, branch points [number/mm³], directionality, extravascular distance [µm].

**Fig. 2 — P10 perfusion and dissection.** (a,b) pump/syringe set-up schematic; (c–f) photos of
opening the chest, 30° needle entry, blue paws/snout/tail; (g–j) matching drawings; (k–n) blue
resin cast before/after decalcification and the isolated brain cast. Scale bars 5 mm.

**Fig. 3 — principle of casting.** Blue resin-filled P60 mouse; vessel cross-section schematic
showing resin filling the **lumen (inner diameter)** with endothelial-nucleus imprints, wall
digested away; whole-body and dissected brain casts.

**Fig. 4 — ROI placement and reconstruction.** (a–h) Allen-atlas drawings with ROI boxes in
cortex, corpus callosum, hippocampus, superior colliculus, brainstem at P10 and P60; (i–l)
desktop-µCT render of a P10 cast with coloured ROI cubes (scale 250 µm); (m) three orthogonal
SRµCT slices of a P10 cortex ROI — sparse bright vessel cross-sections on grey, the axial slice
showing the **circular** field of view (scale 100 µm); (n) the same slice with Otsu edges in red;
(o) schematic: vessel → voxel mask → pixel centerline → smoothed centerline with length and
diameter arrows; (p) 3D view with segmented vessels (red) and centerlines (blue).

**Fig. 5 — global morphometry.** (a–d) P60 cortex ROI (0.75 mm box) as raw volume, segmentation,
centerlines and a 0.30 mm zoom; (e–g) radius-coloured renders (0–18 µm colour bar) P10 vs P60
for cortex (PNVP/INVP labelled), hippocampus, superior colliculus — P60 visibly denser; (h–j)
VVF boxplots, +54% / +39% / +45%. Scale bars 100 µm, zooms 50 µm.

**Fig. 6 — capillary vs non-capillary.** (a,b) schematic of the 7 µm inner-diameter cut;
(c,d) render with one non-capillary tree in magenta and capillaries in green; **(e–g)
segment-diameter histograms** (bin 0.36 µm): single peak near **4 µm at P60, ~5 µm at P10**,
dashed line at 7 µm, almost nothing above ~12 µm; (h–k, r, s) renders split magenta/green — at
P10 the cortex has long radial magenta penetrators with sparse green patches, at P60 a dense
green mesh; (l–q, t–v) VVF boxplots per class: capillaries +169% / +60% / +138%,
non-capillaries +14% / +26% / ±0% (n.s.).

**Fig. 7 — branch points (cortex).** (a) capillary-bed schematic; **(b) definition**: degree
3/4/5 junctions, and two junctions closer than **2 µm** merged into one; (c) branch-point
density vs branch-point diameter (bin 0.38 µm), P60 peak ~1.1×10⁴ mm⁻³ per bin near 4–5 µm;
(d,e) renders with branch points as magenta/green dots; (f–h) density boxplots: all +332%,
non-capillary +48% (n.s.), capillary +625%.

**Fig. 8 — segment density, diameter, length, tortuosity, volume (cortex).** **Image missing
from this PDF**: its page shows a duplicate of Extended Data Fig. 8. The legend survives (bin
widths: diameter 0.36 µm, length 2.5 µm, tortuosity 0.013, volume 2957.74 µm³; diameter/length
ratio higher at P10). See Supplementary Figs. 4 and 12 for the same quantities.

**Fig. 9 — extravascular distance.** (a) schematic; (b) EVD histogram (cortex, bin 10 µm):
P60 peaks ~33% at the 10–20 µm bin, P10 flatter with a tail past 100 µm; (c–h) circular
distance-map slices (0–150 µm colour bar), P10 with large empty holes, P60 uniformly dark;
(i–k) boxplots −45% / −27% / −42%.

**Fig. 10 — directionality.** (a) P60 cortex cube coloured x red, y green, z blue, and each
direction alone; (b–g) P10/P60 cortex (blue radial penetrators, horizontal surface vessels),
hippocampus (red x-running main branches), superior colliculus; **(h–p) histograms of the angle
between segment pairs at a node** (bin 5°): all/capillary curves broad, rising from ~30° to a
plateau ~90–150° and falling to 180°, with a small spike near 0°; non-capillary curves with a
shoulder ~90° and a peak ~165–170°, sharper at P60.

**Fig. 11 — whole-brain SRµCT.** (a–h) whole P10 and P60 cast volumes in three planes with
zooms (scale bars printed in µm, evidently mm); (i,j) radius-coloured 0.75 mm cubes for cortex,
hippocampus, thalamus, cerebellum, medulla, pons; (k–r) VVF boxplots per region (P10→P60:
cortex +58%, hippocampus +28%, SC +45%, thalamus +34%, hypothalamus +8% n.s., cerebellum +5%
n.s., pons +28%, medulla +10% n.s.).

**Fig. 12 — working model.** Drawings of P10 vs P60 networks per region and a table of which
parameters rise (VVF, branch-point and segment density, degree, tortuosity) and fall (segment
length, volume, diameter, branch-point diameter, EVD).

### Extended Data

- **ED 1** — P60 perfusion and dissection photos (8 ml/min, 100–120 mmHg). Scale bars 10 mm.
- **ED 2** — QC: light-microscopy and SEM of casts; dense cortical capillary mesh without
  breaks; elongated nuclear imprints on a large vessel. Partly reproduced from Wälchli 2017
  (JCBFM) and Krucker 2006.
- **ED 3, 4** — Nogo-A⁻/⁻ renders (radius-coloured; capillary/non-capillary split).
- **ED 5, 6** — as Fig. 7 for hippocampus (+230% all) and superior colliculus.
- **ED 7, 8, 9** — branch-point **degree** for cortex, hippocampus, SC: absolute frequency of
  degree 3 ≫ 4, degree 5 ≈ 0; renders with degree-4 nodes enlarged; degree-3 and degree-4
  density boxplots (cortex degree-4: +839% all, +1345% capillary).
- **ED 10** — fluorescent pigment in the resin plus FluoroMyelin on 150 µm sections; whole
  brains glowing yellow-green or UV-blue. Not a vessel channel either (resin fill, multi-colour
  overlay).

### Supplementary

- **SF 1** — bar charts of fold change P10→P60 for every parameter, split magenta/green.
- **SF 2, 3** — VVF and branch-point density, four groups (P10/P60 × WT/Nogo-A⁻/⁻), 3 regions.
- **SF 4** ⭐ — segment density, diameter, length, tortuosity, volume, four groups × 3 regions
  (vector plots; values transcribed in the digest §3). Density axis mislabelled µm⁻³.
- **SF 5** — EVD, four groups.
- **SF 6–9** — directionality renders per region, split by class.
- **SF 10, 11** — whole-brain VVF and branch-point density by region incl. corpus callosum and
  hippocampal subfields.
- **SF 12** ⭐ — whole-brain cortex segment density/diameter/length/tortuosity/volume
  (transcribed in the digest §3).
- **SF 13** — whole-brain EVD.
- **SF 14** — whole-brain branch-angle histograms (same shapes as Fig. 10h–p).
