# Reference digest — Blinder et al. 2013, the cortical angiome

- **Title:** *The cortical angiome: an interconnected vascular network with noncolumnar patterns of blood flow*
- **Authors:** Pablo Blinder, Philbert S. Tsai, John P. Kaufhold, Per M. Knutsen, Harry Suhl,
  **David Kleinfeld\*** (\*corresponding, dk@physics.ucsd.edu). UC San Diego; SAIC.
- **Venue / id:** *Nature Neuroscience* **16**(7):889–897, July 2013. DOI **10.1038/nn.3426**.
  Paywalled; PDF supplied by the owner (2026-10-29). 11 pages including Online Methods.
- **PDF:** kept in the study's Drive `Literature` folder as `The cortical angiome - an interconnected vascular network with noncolumnar patterns of blood flow.pdf`, not in the repo.

## What it gives the study

The most direct published description of **what a correct mouse cortical vessel graph looks
like**, measured over whole reconstructed volumes. For the extraction lab's scorer and for what an
owner correcting the vessel model should expect, it gives:

- **Junctions are three-way** (0.93 triads, < 0.07 four-way): a four-way rate above ~7% means
  crossings were merged (B3; `score.py`'s degree-4 flag).
- **Capillary segments run 10–200 µm, median 50 µm**, none spanning hundreds of µm: the reference
  for the segment-length distribution behind COUNT (B5).
- **Capillary radius ~2 µm, constant with depth**: the scale against which a traced width is
  checked, and the reason a capillary-sized trace much wider is suspect (B7).
- **Loops average 8 edges, and 2–4-edge loops are ~15% of loops**: a short loop is not wrong by
  itself; a surplus of them is. This corrected the scorer's short-loop rule (ledger L1) (B2).
- **No blind ends and no weakly attached sub-networks** in healthy cortex, while their own
  extraction still found gaps in ~5% of vessels: an interior open end is a gap or a spur (B16;
  ledger L1's open-ends-per-junction count).
- **Penetrating venules outnumber arterioles 3 : 1, and are not wider** (medians 9 vs 11 µm):
  caliber alone cannot tell arteriole from venule, so CATEGORIZE cannot either (B10).

These feed B1–B5, B7, B10, B11 and B16 in [`BIOLOGY-INVARIANTS.md`](BIOLOGY-INVARIANTS.md).

**What it does not give:** hippocampus (vibrissa cortex only), CD31 (vessels are filled with a
fluorescent gel, so its widths are lumen, not endothelium), branching angles, Murray's law,
diameter ratios at junctions, or taper within a segment. Its graph is whole-volume, so its loops
are closed where the study's thin stacks cut most loops open (B15).

## The method behind the numbers

- **Tissue and imaging:** 12 male C57BL/6 mice; perfused with fluorescein-albumin gel, then 4% PFA,
  a fixation the authors say "preserved the size of the vessels" (no shrinkage figure given).
  Two-photon block-face imaging with serial ablation, **1 µm cubic voxels**, 2–3 mm³ per brain
  (full-depth set, n = 4) or all of vS1 to ~layer 5a (upper-cortex set, n = 4). Arterioles and
  venules told apart by tracing on the surface to the middle cerebral artery vs the sagittal sinus
  or rhinal vein, not by caliber.
- **Vectorization (Kaufhold 2012):** short centerlines, each with a radius, meeting three at a time
  at branch points. Radii corrected for resolution and point spread. **About 0.05 of vessels had
  gaps, corrected automatically** ("connecting gaps and deleting open-ended segments").
  Penetrating vessels checked by eye; some surface vessels traced by hand.
- **The edge definition the numbers use:** an edge is a whole vessel between two vertices; its
  length is the summed centerline length (tortuous, not chord); its radius is the **median** along
  it. This matches COUNT's segment and MEASURE's centerline length; a single radius per edge is
  why the paper says nothing on taper.

## The numbers

From the paper's text and figures:

| Quantity | Value | n / where read |
|---|---|---|
| Vertex degree | **0.93 triads, < 0.07 crosses** | all data sets |
| Microvessel length | 10–200 µm, **median 50 µm** | 101,992 edges, 4 brains (Fig. 2a) |
| Microvessel radius | median and mean **near 2 µm**, flat with depth | same (Fig. 2b) |
| Edges per loop | **mean 8**, histogram 2 to ~15, mode 7–8 | 59,909 loops, 4 brains (Fig. 2d) |
| Pial-surface loops | mean **4** edges (from Blinder 2010) | 2D network |
| Penetrating venules : arterioles | **3.0 ± 0.1** (mouse); rat estimates 1.8 and 2.6 | 262 columns, 8 mice |
| Penetrating arteriole diameter | broad, **median 11 µm**; some barely thicker than microvessels | |
| Penetrating venule diameter | broad, **median 9 µm** | |
| Primary side branches | arterioles peak at layer 4; venules near the surface | Fig. 5e |
| Network resistance | plateaus at 0.4 P µm⁻³ by **~150 µm** separation | 1,000 vertex pairs per brain (Fig. 2g) |
| Microvascular volume fraction | 0.0074 (cited, Tsai 2009) | |

**Loop sizes read by eye off Fig. 2d (approximate, ±0.01):** loops of 2, 3, 4, 5 edges ≈ 0.04,
0.055, 0.06, 0.09 of loops; mode ≈ 0.15. So **2–4-edge loops ≈ 15%**. The inset's 8-edge loop
(scale bar 20 µm) fits within a few tens of µm, so a loop that is small across can still have many
edges; the scorer's size rule (under 100 µm round, ledger L1) is not checked against this. Ji 2021 puts 2-edge loops nearer 1%; the two disagree on the tail.

## Arguments that bear on scoring

- **Why no isolated pockets:** where every vertex has degree 3, the count of vertices reached
  doubles each step outward, so the share that can hang off the mesh by one edge scales as
  (log₂N)/N, negligible at N ~ 10⁴ per mm³. Their community analysis found no near-isolated
  pockets. A dangling tree inside the volume is therefore an extraction error, not biology.
- **A 3D lattice, not a tree:** network resistance stops growing past ~150 µm (≈ 3 median
  lengths), as in a 3D lattice (it would grow linearly in 1D, logarithmically in 2D) (B1).
- **Flow direction can reverse** (cited, not studied): Nguyen et al. 2011 report reversals in
  upstream capillaries after a venule is occluded. This is behind BIOLOGY-INVARIANTS' question 3,
  whether "no directed cycle" holds only at an instant.

Left out: the flow simulations, communities, flow domains, occlusion and lattice models, the
intrinsic optical imaging, the gel and ablation protocol details, and the figures that render the
network rather than measure it.
