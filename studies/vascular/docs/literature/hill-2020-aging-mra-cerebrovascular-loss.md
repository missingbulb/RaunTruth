# Reference digest — Hill et al. 2020, cerebrovascular loss in the aging mouse brain by CE-MRA

- **Title:** *Detection of Cerebrovascular Loss in the Normal Aging C57BL/6 Mouse Brain Using
  in vivo Contrast-Enhanced Magnetic Resonance Angiography*
- **Authors:** Lindsay K. Hill, Dung Minh Hoang, Luis A. Chiriboga, Thomas Wisniewski,
  Martin J. Sadowski, **Youssef Z. Wadghiri\*** (\*corresponding, wadghiri@med.nyu.edu). NYU
  Grossman School of Medicine / NYU Tandon / SUNY Downstate.
- **Venue / id:** *Frontiers in Aging Neuroscience* (2020) **12:585218**, ORIGINAL RESEARCH.
  DOI **10.3389/fnagi.2020.585218**. Open access. 17 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `Detection of Cerebrovascular Loss in the Normal Aging C57BL Mouse Brain Using in vivo Contrast-Enhanced Magnetic Resonance Angiography.pdf`, not in the repo.

## What it gives the study

Little, and none of it for the extraction algorithm or the ground truth. The paper images the
whole mouse brain by in-vivo MR angiography at (100 µm)³ voxels, where every capillary is below
resolution, and backs it with CD31 histology on 5 µm paraffin sections, where vessels show as
isolated cross-sections. Neither shows a vessel network, so nothing here bears on tracing,
junctions, widths or the vessel model. It contributes no panels.

What it does give:

1. **Age is a confounder on the scale of a disease effect.** Over two years of normal aging, CD31
   vessel density falls ~21% and apparent blood volume 20–59% by region. Any comparison of COUNT or
   MEASURE between groups of mice needs the groups age-matched, or the age stated.
2. **A cortical count density, not comparable to COUNT.** 458 ± 61 CD31 vessel profiles per mm² of
   section in young mice. This counts cross-sections in a 5 µm section, not branch segments, so it
   is a different quantity from our `count_density` and from Rust 2020's branches/mm². The study
   once read it, with Rust's table, as evidence that our counts were 5–8× too high; that reading
   was retracted (STATUS, METHODS-SYNTHESIS §3.1), and this number must not be used as a target.
3. **A model for reporting a cross-method comparison.** The authors claim only that two methods at
   very different resolutions agree on the direction and rough size of a change, not on numbers.
   That is the standard the study holds its own figure-crop and cross-paper comparisons to.

A stated threshold rule is in the methods (below), but for MR voxel intensities; it does not
transfer to CD31 confocal.

## The supporting numbers

**CD31 histology** (same animals, N = 5 per age; rabbit anti-mouse CD31 clone D8V9E, CST #77699,
1:200; PFA-fixed, paraffin, 5 µm sections; NanoZoomer whole-slide scans; Visiopharm's CD31
application, vessels detected in the red channel above a background threshold, reported as vessels
per mm² of section). From the paper's text and Fig 9, mean ± SD:

| Age (months) | Whole section, vessels/mm² |
|---|---|
| 2–4 | 458.18 ± 61.28 |
| 14–16 | 419.35 ± 57.91 |
| 24–26 | 361.60 ± 49.03 |

One regional ROI falls 465.93 ± 83.71 → 341.89 ± 38.18 (p < 0.05). The age of the study's own mice
is not recorded in the study.

**Apparent cerebral blood volume (aCBV)** by CE-MRA, longitudinal C57BL/6NTac, %, mean ± SD (the
paper's table): cerebral cortex 2.00 ± 0.10 → 1.60 ± 0.30 → 1.35 ± 0.21; hippocampus
2.28 ± 0.26 → 1.61 ± 0.51 → 1.80 ± 0.58, at 2–4, 14–16 and 24–26 months. Loss over two years
ranges from 19.95% (entorhinal cortex) to 58.59% by region, steeper in the first year. aCBV is the
share of (100 µm)³ voxels above `mean + 2.5·SD` of the region (ImageJ), a detectable-fraction
proxy rather than a blood volume.

**The authors' own limitation:** the two methods are not expected to agree numerically, since MRA
sees only the vessels its voxels resolve.

Left out: the gadolinium-micelle agent, MRI acquisition, atlas registration, deformation-based
morphometry and brain-volume results, statistics, and the MRA figures.
