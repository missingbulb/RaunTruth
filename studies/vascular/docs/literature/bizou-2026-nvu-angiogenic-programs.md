# Reference digest — Bizou et al. 2026, NVU communications and regional angiogenic programs

- **Title:** *Mapping neuro-vascular unit communications reveals distinct angiogenic programs
  across developing mouse brain regions*
- **Authors:** Mathilde Bizou, Elise Drapé, Gael Cagnone, Joel P. Howard, Frans Irgolitsch,
  Séverine Leclerc, Mei Xi Chen, Blanche Boisseau, Isabelle Robillard, Matthieu Ruiz,
  Fréderic Lesage, Jean-Sébastien Joyal, Gregor Andelfinger, **Alexandre Dubrac**.
  CHU Sainte-Justine / Université de Montréal / Polytechnique Montréal.
- **Venue / id:** *Nature Communications* (2026) **17:6746**.
  DOI **10.1038/s41467-026-73373-w**. Received 18 Aug 2023, accepted 28 Apr 2026. 18 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `Mapping neuro-vascular unit communications reveals distinct angiogenic programs across developing mouse brain regions.pdf`, not in the repo.

## What it gives the study

A mostly transcriptomic paper on postnatal mouse brain development; its vessel imaging is
supporting evidence, and it reports no branch count, length, caliber or tortuosity. For the study
it gives four things:

1. **Density differs by region at the same age.** Thalamus is significantly denser than the
   whole-brain mean at every age from P6 to P40. A baseline from one region is not a baseline for
   another, which bears on comparing the study's frontal-cortex and CA1 stacks, and on comparing
   either with a whole-brain literature value.
2. **A second paper building a grid heatmap of per-square vascular density** (after Rust 2020),
   here as its main measurement over seven regions and five ages. It supports METHODS-SYNTHESIS
   §4.5's candidate: a per-square map answers *where* a field is under-vascularized. The square
   size is not stated.
3. **Two markers merged before segmenting.** CD31 and ICAM2 are merged for signal-to-noise; the
   study's stacks have CD31 alone, so faint capillaries the extraction misses may be a limit of the
   input, not only of the algorithm. Tip cells are found from the CD31⁺/ICAM2⁻ mismatch, which a
   single channel cannot do.
4. **An open Python + scikit-image analysis package**, the LIOM Toolkit
   (<https://github.com/LIOMLab/liom-toolkit>), the study's own stack; not yet read.

Its density unit is an **area** density, µm²/mm² × 10³ (our `area` % rescaled), not the length
density MEASURE reports; the two must not be mixed. No pixel size or scale bar is identifiable, and
every micrograph is a multi-channel merge (vessels, DAPI, EdU or a third marker), so it contributes
no panels.

## The supporting detail

- **Segmentation:** Imaris 9.9.1 `Surfaces` on the merged CD31/ICAM2 channel, surface detail
  1 µm, background subtraction 3 µm, then a trained pixel classifier to reject false-positive
  vessels. Commercial, so not reproducible; only the downstream analysis is open.
- **Heatmap:** the segmented section is tiled into fixed-size squares and density computed per
  square (Fig 1a, coronal sections at P1–P40).
- **Regional result** (Fig 1b, mean ± s.e.m., n = 3 per age, 5 at P40): density rises from birth
  to ~P20 in all seven regions (cortex, hippocampal formation, thalamus, hypothalamus, piriform,
  caudoputamen, amygdala); thalamus vs whole-brain mean p = 0.031 (P6), 0.0066 (P12), 0.0006 (P20),
  0.0047 (P40). Endothelial nuclei and tip cells peak at P6 and differ between cortex and
  thalamus, so developmental metrics need not move together. The summary does not record how the
  hippocampal formation compares with cortex.

Left out: the scRNA-seq, spatial transcriptomics, ligand–receptor and TGFβ/mTOR results, the
imaging hardware, the statistics and every non-vascular figure.
