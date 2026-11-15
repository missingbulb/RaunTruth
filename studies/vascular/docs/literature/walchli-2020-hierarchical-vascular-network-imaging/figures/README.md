# Figures — Wälchli et al. 2020 (bioRxiv 2020.10.19.344903)

Described from page renders of the owner's copy of the PDF (kept in the study's Drive Literature
folder, not in the repo). Digest: [`../digest.md`](../digest.md).

> **The figure images are not committed.** Every page of the preprint states "All rights
> reserved. No reuse allowed without permission", and this repository is public, so only these
> descriptions are kept.

> **There is no `panels/` folder for this paper, deliberately.** The images are resin-cast µCT
> slices, 3D surface renders, SEM, photographs, schematics and plots. None is a single-channel
> CD31 vessel image, so nothing enters the working dataset.

---

## Main figures

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

## Extended Data

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

## Supplementary

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
