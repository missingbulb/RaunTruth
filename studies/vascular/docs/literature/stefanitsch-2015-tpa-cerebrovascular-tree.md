# Stefanitsch et al. 2015 — tPA deficiency and the cerebrovascular tree

- **Title:** *tPA Deficiency in Mice Leads to Rearrangement in the Cerebrovascular Tree and
  Cerebroventricular Malformations*
- **Authors:** Christina Stefanitsch, Anna-Lisa E. Lawrence, Anna Olverling, Ingrid Nilsson,
  **Linda Fredriksson\*** (\*corresponding, linda.fredriksson@ki.se). Karolinska Institutet,
  Division of Vascular Biology; University of Michigan Medical School.
- **Venue / id:** *Frontiers in Cellular Neuroscience* (2015) **9:456**, ORIGINAL RESEARCH.
  DOI **10.3389/fncel.2015.00456**. Open access. 12 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `tPA Deficiency in Mice Leads to Rearrangement in the Cerebrovascular Tree and Cerebroventricular Malformations.pdf`, not in the repo.

---

## 1. What it gives the study

**A measured caliber distribution for CD31⁺ mouse cortical vessels**, the external anchor for
CATEGORIZE, and a mean artery diameter by smooth-muscle marker. Wild-type adult mouse cortex
(n = 5 mice; mean ± SEM; Fig 1B–C and 3C–D, bar heights with the vessel counts printed on the bars):

| Marker | Mean diameter (WT) | Size distribution (WT) |
|---|---|---|
| **CD31⁺** (all endothelium) | **6.03 ± 0.3 µm** (n = 211 vessels) | **< 5 µm: 54 ± 6%** · 5–10 µm: ~36% (counts 114 / 76 / 21) · **> 10 µm: 10 ± 1%** |
| **ASMA⁺** (smooth-muscle-covered: arteries, arterioles) | **22.9 ± 1.3 µm** | **< 15 µm: 17 ± 8%** · **> 30 µm: 19 ± 3%** |

What follows for the study:

1. **Our artery threshold is too low.** `ARTERY_DIAM_PX = 9` is **5.9 µm** on the Wang
   fig4/5/6 panels, below the mean of *all* CD31⁺ vessels and inside the capillary population;
   smooth-muscle-covered vessels average 22.9 µm. On Rust's calibrated native image the same cut
   calls 29% of segments artery against the 10% of CD31⁺ vessels above 10 µm here
   ([`METHODS-SYNTHESIS.md`](METHODS-SYNTHESIS.md) §4.2).
2. **The threshold must be in µm.** A fixed pixel value means a different diameter on every
   panel (from `measure_vessels.py`'s calibration):

   | Panels | µm/px | 9 px means |
   |---|---|---|
   | wang fig4/5/6 | 0.658 | 5.9 µm |
   | wang fig1 | 0.820 | 7.4 µm |
   | wang fig3 | 1.064 | 9.6 µm |
   | rust20 fig1 adult overview | 1.351 | 12.2 µm |
   | rust20 fig3 overview | 1.190 | 10.7 µm |

3. **A published three-bin scheme**, < 5 / 5–10 / > 10 µm for CD31⁺ (and < 15 / > 30 µm for
   ASMA⁺), to report as a distribution in place of a binary split.

Our split's ~10% arteries on the Wang panels matches the 10% above 10 µm only by coincidence: it
comes from a cut that means 5.9 µm, not 10 µm.

**What it does not give:** how a diameter was measured (no algorithm, no manual-vs-automatic
statement beyond "Volocity / ImageJ64"), whether it is the CD31 outer width or a lumen, and any
µm/px or field size. The caliber numbers the study most needs are the least specified in the paper;
per-staining parameters are in Supplementary Table S1, not obtained. No counts, lengths or branching.

## 2. Methods behind the numbers

- 50 µm vibratome sections, perfusion-fixed (4% PFA); CD31 (BD 553370), confirmed with a second
  endothelial marker, podocalyxin; ASMA-Cy3 for smooth muscle.
- Analysis on **maximum-intensity projections of 15–22 µm z-stacks** (Zeiss LSM700) or on
  epifluorescence images; 4–11 fields per animal in cortex, hippocampus and amygdala, no
  sub-regional difference found. Quantities are pixel counts above a set threshold with identical
  acquisition settings within a staining experiment.
- **Two independent readers, blinded to group**, with one image set per staining re-read by a second
  blinded reader. A model for how the owner's ground truth could be cross-checked; our visual
  expectations are a one-reader version of it.

## 3. How the distribution moves (tPA⁻/⁻, n = 5)

The knockout shifts it toward small vessels: mean CD31⁺ diameter **4.75 ± 0.2 µm** (P < 0.01);
< 5 µm 67 ± 4% (P < 0.05); > 10 µm 1 ± 0.8% (P < 0.01); counts 180 / 85 / 4 = 269. Mean ASMA⁺
15.4 ± 0.7 µm; < 15 µm 61 ± 6%, > 30 µm 5 ± 1% (both P < 0.01), with total ASMA unchanged. Total CD31
staining falls only non-significantly (80 ± 12% of WT, P = 0.31): **a caliber shift can leave area
% flat**, so area % alone would miss it, and a caliber distribution would not.

## 4. Limitations

A constitutive knockout, so developmental and adult effects cannot be separated; and the
diameter method is unstated (§1), measured on 2D projections of 15–22 µm stacks.

## 5. Why no panels

Every micrograph is a two- or three-channel merge (a vessel marker with DAPI nuclei, often a third
marker), so none is an isolated vessel channel, and the DAPI speckle would read as texture to any
threshold. No pixel size is stated either. Nothing enters `VESSEL_*`.

Left out: the ERG, ZO1, collagen IV, GFAP, AQP4, PDGFRα and CD13 results, the ventricular
malformation and MRI work, and the reagent catalogue; none bears on the metrics or ground truth.
