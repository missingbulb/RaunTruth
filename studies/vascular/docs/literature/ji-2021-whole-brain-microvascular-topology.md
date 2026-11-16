# Reference digest — Ji et al. 2021, whole-brain microvascular topology

- **Title:** *Brain microvasculature has a common topology with local differences in geometry that
  match metabolic load*
- **Authors:** Xiang Ji, Tiago Ferreira, Beth Friedman, Rui Liu, Hannah Liechty, Erhan Bas,
  Jayaram Chandrashekar, **David Kleinfeld\*** (\*lead contact, dk@physics.ucsd.edu). UC San Diego;
  HHMI Janelia.
- **Venue / id:** *Neuron* **109**:1168–1187 (2021), in press online Feb 2021 (the copy read paginates
  1–20). DOI **10.1016/j.neuron.2021.02.006**. © Elsevier. Free author manuscript at
  [PMC8525211](https://pmc.ncbi.nlm.nih.gov/articles/PMC8525211); the publisher PDF read here came from
  [the Kleinfeld lab site](https://neurophysics.ucsd.edu/publications/1-s2.0-S0896627321000805-main.pdf).
- **PDF:** kept in the study's Drive `Literature` folder as `Brain microvasculature has a common topology with local differences in geometry that match metabolic load.pdf`, not in the repo.

## What it gives the study

The largest measured mouse vessel graph (three whole brains at sub-µm resolution), and the only
source with numbers **per region, hippocampus included**, which the study's CA1 stacks need. It is
the main source of the scorer's reference values and of the expected amounts in one field:

- **Topology is the same in every region:** three-way junctions (96.8–98.7%), near-planar (third
  branch ~15° out of plane), wide angles (smallest 84°, median 118°), loops of ~9 branches with
  two-branch loops ≈ 1%. So the cortex-derived junction and loop checks apply to CA1 too (B2–B4).
- **Segments:** median capillary 45–46 µm in grey matter, under 40 µm dominating, over 200 µm rare;
  tortuosity 1.27 (B5, B6).
- **Width:** capillaries are vessels under r = 3.5 µm, ~96% of all length; minimum in-vivo radius
  1.9 µm. Vessels under ~5 µm radius shrink after perfusion-fixation, which the study's fixed CD31
  tissue undergoes too (B7). A caliber cut for CATEGORIZE could start from 3.5 µm radius, though
  Ji's widths are lumen and CD31 marks the wall.
- **What differs by region is length density:** cortex 0.98, hippocampus 0.68, Ammon's horn
  0.65 m/mm³. A CA1 stack should carry about two-thirds of a cortex stack's length; denser regions
  have shorter segments (B13).
- **Space filling:** mean tissue-to-vessel distance follows d̄ = 0.494·ρ_L^(−1/2) − 3.08 µm, so a
  void much wider than that holds a missed vessel (B12).
- **Even the best extraction leaves blind ends:** after their classifier cleanup, only 0.485 of
  interior 240 µm cubes had no open-ended segment. Interior open ends in our models are expected
  to fall, not to reach zero (B16).
- **Expected amounts per field** in BIOLOGY-INVARIANTS come from its 4.13 million nodes per 384 m
  of vessel (~10.8 junctions per mm) and the densities above.

These feed B2–B7, B12, B13, B15 and B16 in [`BIOLOGY-INVARIANTS.md`](BIOLOGY-INVARIANTS.md).

**What it does not give:** CD31 (vessels filled with fluorescent gel), frontal cortex among the
quoted regions, a degree-4 share on its own, per-junction diameter ratios or Murray fits, taper,
flow direction, or an arteriole/venule split (non-capillaries are lumped by radius).

## The method behind the numbers

- **Tissue and imaging:** 3 male C57BL/6 mice, 50–80 days. Perfused, then gelatin with FITC-BSA
  cross-linked to the lumen; fill check 0.998 of 2,835 segments gap-free (the rest had gaps
  < 10 µm). Serial two-photon tomography at 0.3 × 0.3 × 1 µm, analysed at 1 µm isotropic in
  **240 µm cubes** on a 208 µm pitch. Shrinkage corrected by a linear 1.051.
- **Segmentation:** median filter for shot noise; a rod matched filter then Frangi vesselness,
  intersected with an intensity threshold; agglomerate high-SNR neighbours and drop small clusters.
- **Graph:** topology-preserving thinning; centerline voxels shifted toward brighter neighbours;
  nodes where ≥ 3 of 26 neighbours. **Random-forest classifiers** then remove isolated voxels,
  short segments with free ends and **false connections from poor axial resolution and close
  vessels**, and add linkers bridging free ends (after Kaufhold 2012); > 0.95 accuracy against
  manual annotation, 3 connectivity errors in 2,133 segments checked by hand. The same classes the
  extraction lab fights (spurs, merged crossings, gaps) needed a learned cleanup even at 1 µm
  axial sampling.
- **Width:** a branch's radius is the **median** along it, refined by fitting a PSF-blurred tube
  (lateral HWHM ≈ 0.41–0.44 µm, axial ≈ 3.4 µm), and calibrated against in-vivo imaging before and
  after perfusion (6 mice, 102,284 matched positions). The authors note light-sheet maps
  overestimate diameter.
- **Angles:** from the principal direction of the first 10 skeleton voxels of each branch; planarity
  as the third tangent's elevation from the plane of the other two.

## The numbers

From the paper's text, Table 1 and figure legends (mean ± SD per brain, or ± SE over cubes as marked):

| Quantity | Value | Notes |
|---|---|---|
| Nodes / branches per brain | (4.13 ± 0.17) × 10⁶ / (6.32 ± 0.27) × 10⁶ | |
| Total length / volume | 384 ± 16 m in 443 ± 9 mm³ | shrinkage-corrected |
| Largest connected component | 0.987 ± 0.012 of branches | |
| Degree-3 nodes | **0.968–0.987** (middle quartiles over cubes) | mean degree 3.02 ± 0.02; branches/nodes 1.529 |
| Tangent angles at a node | min **84 ± 4°**, median **118 ± 2°**, max **145 ± 3°** | means across regions |
| Out-of-plane of third branch | mean projection 0.255 ± 0.037 → **14.8°** | |
| Shortest loop through a branch | **8.97 ± 0.53 branches** | mean ± SE |
| Two-branch loops | ≈ **0.011** of loops (median) | |
| Tortuosity | **1.27 ± 0.05** | mean ± SE |
| Median capillary length | somatosensory **46 ± 1**, inferior colliculus **45 ± 1**, corpus callosum **67 ± 3 µm** | Fig. 5D–E |
| Mean / median radius | 2.74 ± 0.09 / 2.14 ± 0.04 µm (Fig. 3F legend) | PMC manuscript: 2.39 / 2.05 |
| Capillary cut-off | r = **3.5 µm** (radius PDF leaves its power law) | |
| Power-law exponent above 3.5 µm | **2.73 ± 0.03**, R² = 0.98 | PMC manuscript: 2.81; Murray predicts 3 (a population statistic) |
| Capillaries' share | **0.959 ± 0.008 of length**; 0.8 ± 0.2 of volume per cube | |
| Minimum in-vivo radius | **1.9 ± 0.3 µm** | |
| Capillary anisotropy | ≈ 0.4, significant | weakly oriented; superficial cortex leans normal to the pia |
| Length density, m/mm³ | somatosensory 0.98 ± 0.02; piriform 0.72 ± 0.01; hippocampus 0.68 ± 0.02; Ammon's horn 0.65 ± 0.02 (Table 1); corpus callosum 0.49 ± 0.12 … inferior colliculus 1.41 ± 0.05 | vibrissa cortex 0.88 ± 0.17 (Tsai 2009, cited) |
| Mean tissue-to-vessel distance | 10.0 ± 0.2 (inferior colliculus) … 20.2 ± 3.9 µm (corpus callosum) | |
| Distance scaling | d̄ = 0.494 ρ_L^(−1/2) − 3.08 µm (R² 0.95, 91,751 cubes); d̄_max = 0.955 ρ_L^(−1/2) − 1.85 µm | Fig. 6 |
| Losing one capillary | raises its territory's max distance by ≤ ~2.1 µm | |
| Open-ended segments after cleanup | 0.485 of interior cubes have none | Fig. 1J |

**Caveats.** The publisher copy and the PMC author manuscript disagree on mean radius and the
power-law exponent; the publisher numbers are quoted, and both should be read as ±0.1. The full
angle distribution is only in a figure (Fig. 3); the means are given. Densities are of cleared,
gel-filled whole brains; fixed sections shrink differently. The supplementary items (MATLAB code,
Tables S1–S6) were not read; the code is at neurophysics.ucsd.edu/software.php.

**The authors' reading:** the shared topology is a set of design rules giving redundancy (one lost
capillary barely matters); two-branch loops are rare because few mature vessels come from
intussusceptive angiogenesis.

Left out: the oxygen and metabolism model, percolation, capillary order, cortical depth profiles,
stalled capillaries, the perfusion protocol details and the fMRI discussion.
