# Reference digest — Smith et al. 2019, brain capillary networks across species

- **Title:** *Brain Capillary Networks Across Species: A few Simple Organizational Requirements Are
  Sufficient to Reproduce Both Structure and Function*
- **Authors:** Amy F. Smith, Vincent Doyeux, Maxime Berg, Myriam Peyrounette, Mohammad
  Haft-Javaherian, Anne-Edith Larue, John H. Slater, Frédéric Lauwers, Pablo Blinder, Philbert Tsai,
  David Kleinfeld, Chris B. Schaffer, Nozomi Nishimura, Yohan Davit, **Sylvie Lorthois\***
  (\*corresponding). IMF Toulouse; Cornell; Delaware; INSERM Toulouse; Tel Aviv; UC San Diego.
- **Venue / id:** *Frontiers in Physiology* (2019) **10:233**. DOI **10.3389/fphys.2019.00233**.
  **Open access, CC BY.** Supplementary Material online (not fetched).
- **PDF:** kept in the study's Drive `Literature` folder as `Brain Capillary Networks Across Species - A few Simple Organizational Requirements Are Sufficient to Reproduce Both Structure and Function.pdf`, not in the repo.

## What it gives the study

Capillary-bed statistics for mouse cortex, measured on capillary-only volumes, and one
structural fact the scorer depends on:

- **Reference values for scoring a capillary graph:** segment length 44.8 µm (SD 28 µm), 7.2% of
  interior junctions with more than three branches, 11.2 edges and 486 µm per shortest loop,
  tissue-to-vessel distance mean 18.4 µm and maximum ~50 µm (B2, B3, B5, B12).
- **The capillary bed has no narrowing direction.** Under a pressure gradient, three-way capillary
  junctions split about evenly into converging (2 in, 1 out) and diverging (1 in, 2 out). This is why
  the scorer checks narrowing and Murray only at arteriole/venule junctions (ledger L1) and why
  capillary `r_a`/`r_b` carry no flow direction (B10).
- **A caliber cut:** arterioles and venules were separated from capillaries at **7.2 µm diameter**
  (mouse; 9.9 µm human), chosen so the trees held no loops. A candidate number for CATEGORIZE,
  in lumen diameter of gel-filled vessels, not CD31 wall (B7).
- **Loops are biased low near a volume's boundary**, and loop statistics need a domain of 3–4 times
  the network's length scale (~75 µm) to converge. The study's stacks are a few tens of µm deep, so
  their closed-loop counts will be far below these values (B15).
- **Not independent of Blinder 2013:** the mouse volumes are cut from the same reconstructions
  (Tsai 2009 / Blinder 2013), so agreement between the two counts once.

**What it does not give:** arterioles and venules (excluded), diameters (all set to 5 µm),
tortuous lengths (straight only; tortuous estimated ~20% longer), junction angles, hippocampus, a
degree-4 share separate from degree ≥ 5.

## The method behind the numbers

- **Mouse:** somatosensory cortex from the Tsai 2009 / Blinder 2013 gel casts, two-photon at 1 µm³,
  diameters histogram-matched to in-vivo values. **7 capillary-only ROIs, 240 µm cubes, deeper than
  650 µm** below the pia, after removing arterioles and venules traced from the surface while
  diameter stayed above 7.2 µm.
- **Human:** the India-ink brain of Cassot 2010, 4 ROIs (264 × 264 × 207 µm), re-segmented with
  DeepVess and corrected by hand; lengths and radii ×1.1 for shrinkage; trees cut at 9.9 µm.
- **Shortest loops:** for each vertex and each pair of its neighbours, the length-weighted Dijkstra
  path between the two neighbours that avoids the vertex, closed through it, duplicates removed.
  A loop count from the vessel model is comparable only if counted this way.
- **Generator:** one random seed per cube of side L_C, 3D Voronoi edges as capillaries, trimmed to
  three-way junctions, uniform 5 µm diameters. The study prefers real images to synthetic ones for
  testing, so it is a source of expected statistics, not of test inputs.

## The numbers

Mouse, mean ± SD over the 7 ROIs (the paper's table; distribution shapes read by eye off Fig. 4):

| Metric | Mouse cortex |
|---|---|
| Mean straight segment length | **44.8 ± 2.4 µm** (SD within an ROI 28.1 ± 2.3) |
| Length density | **673 ± 58 mm/mm³** (0.67 m/mm³) |
| Interior vertices with > 3 connections | **7.2 ± 0.9%** |
| Edges per shortest loop | **11.2 ± 1.2** |
| Shortest-loop length | **486 ± 60 µm** |
| Loops per edge | **5.1 ± 0.3** |
| Mean tissue-to-vessel distance | **18.4 ± 0.9 µm** |
| Mean of its local maxima | **29.4 ± 1.5 µm** |
| Maximum | **50.1 ± 3.7 µm** |

- **Fig. 4, by eye:** edges per loop spread ~2 to ~25, broadly flat between ~5 and ~19, a few
  percent at 2–4; segment lengths ~5 to ~250 µm on a log axis, peaking at 40–60 µm.
- The length density is of capillaries only, deep cortex, so it sits below Ji 2021's 0.98 m/mm³
  for all vessels in somatosensory cortex.
- **Human vs mouse:** same topology; human mean length 34.4% longer, mean tissue-to-vessel distance
  ~15.8% higher; human loop statistics noisy (4 ROIs).
- **Convergence (synthetic networks):** mean length and loop counts converge within 5% by a domain
  of (3–4 L_C)³; the 240 µm mouse ROIs, (3.2 L_C)³, sit ~4% from converged on loops.
- **Occlusion:** after one capillary is blocked, flow reverses in the other branch of a diverging
  junction; in 13–18% of cases both outflows stop.

## The authors' arguments and limitations

- Three ingredients reproduce the bed: isotropic and space-filling, mostly three-way junctions, and
  convex tissue domains of one size (L_C ≈ 75 µm mouse, 90 µm human).
- Rat counts of 4–7 capillaries per loop (Hudetz 1988) are lower than theirs, perhaps because long
  loops are hard to trace by hand, or a species difference.
- Limitations they state: uniform diameters, no tortuosity, capillary-only ROIs smaller than a
  representative volume, few human ROIs.

Left out: permeability, transit times and exchange, the synthetic-model comparisons and lattices,
the space-filling box counting, and the figures not cited here.
