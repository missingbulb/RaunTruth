# Reference digest — Lind-Holm Mogensen et al. 2024, microglia morphology protocol (STAR Protocols)

> Self-contained digest of the source paper. The method, every stated parameter, the metric
> list, the troubleshooting cases and every embedded image are captured here and in
> [`figures/`](#figures). **No need to reopen the PDF.**

- **Title:** *Protocol for immunofluorescence staining and large-scale analysis to quantify
  microglial cell morphology at single-cell resolution in mice*
- **Authors:** **Frida Lind-Holm Mogensen**<sup>1,2,6,\*</sup>, **Corrado Ameli**<sup>3,6,\*</sup>,
  Alexander Skupin<sup>3,4,5</sup>, Alessandro Michelucci<sup>1,7,\*</sup>
  (6 = technical contact, 7 = lead contact, \* = correspondence). Luxembourg Institute of Health
  (Neuro-Immunology Group); University of Luxembourg (Faculty of Science; Luxembourg Centre for
  Systems Biomedicine, Integrative Cell Signalling Group; Integrative Biophysics); UC San Diego
  Dept. of Neurosciences. F.L.-H.M. did all wet work and imaging; C.A. did segmentation and
  computation.
- **Venue / id:** *STAR Protocols* **5**, 103467, **December 20, 2024** (Cell Press / Elsevier),
  article type **Protocol**, 23 numbered pages (24 PDF pages incl. the cover).
  DOI **[10.1016/j.xpro.2024.103467](https://doi.org/10.1016/j.xpro.2024.103467)**.
- **Licence, as stated in the PDF:** "This is an open access article under the CC BY license
  (http://creativecommons.org/licenses/by/4.0/)" (page footer, p. 1). The acknowledgments add that
  the authors applied **CC BY 4.0** to any Author Accepted Manuscript. **CC BY permits
  redistribution and derivatives → the PDF and the extracted figures are committed here, with
  attribution.**
- **PDF:** kept in the study's Drive `Literature` folder as `Protocol for immunofluorescence staining and large-scale analysis to quantify microglial cell morphology at single-cell resolution in mice.pdf`, not in the repo.
- **Builds on / for complete details:** Lind-Holm Mogensen et al. 2024 (*J. Neuroinflammation*
  21:174, PARK7/DJ-1 + LPS) and Fixemer et al. 2022 (*Acta Neuropathol. Commun.* 10:36,
  human hippocampus). The computational pipeline is **MIC-MAC** (Salamanca et al. 2019, *Glia*
  67:1496–1509), here as **MIC-MAC 2.1**.
- **One-line thesis:** a step-by-step wet-lab-to-numbers recipe — 50 µm cryosections, Iba1
  immunofluorescence, 3×3-tile confocal z-stacks at 0.221 µm/px × 1 µm z, **Imaris "Surfaces"
  segmentation** with a hand-tuned local-contrast threshold and a voxel-count filter, then a
  **MATLAB script (MIC-MAC 2.1 `FeatureExtract.m`)** that skeletonizes each cell and returns
  **16 morphological features for 300–350 cells per image**.

---

## § Why this matters to our task ⭐

This is the closest published analogue of what we are building: **find every microglia cell in
a 3D Iba1 stack, one object per cell, and measure its geometry.** Concretely:

| What we get | Consequence for our build |
|---|---|
| **A complete, parameterised 3D segmentation recipe** (Imaris): per-slice intensity normalisation → Gaussian 0.3 µm → local-contrast (background-subtraction) threshold with 0.5 µm sphere, smoothing 0.5 µm, threshold **0.5–1.5 hand-tuned per image** → connected components → keep objects of **18,000–180,000 voxels** (at 0.221 × 0.221 × 1 µm voxels ≈ **880–8,800 µm³**, our arithmetic). | A baseline we can reimplement in Python (`scipy.ndimage` / scikit-image) without Imaris: local background subtraction + threshold + 3D labelling + size filter. Their size window must be re-expressed in µm³ for our voxel size — it is a voxel count tied to their sampling. |
| **"Split touching objects" is deliberately OFF.** Cells are separated purely by threshold-induced disconnection; merged clumps fall outside the voxel window and are **dropped**, not split. | Their per-cell numbers are from the *isolatable* subset (≈ 2% of all surface objects in the shown example; the rest are fragments). If the owner wants **every** cell, we need what they skipped: soma seeding + splitting of touching cells. |
| **The 16 per-cell features** (bounds, curvature, node degree, compactness, node/ending/link density, edge lengths, polarity, S-metric, volume, volume/edges) — named, but **not defined in this PDF** (definitions are in MIC-MAC, Salamanca 2019). | A ready metric list for "number of processes, branching, volume". Notably **absent**: soma size, territory/convex-hull volume, Sholl, total process length — those we would add ourselves. |
| **Acquisition sizes** — 30 µm stacks (28–32 z-slices at 1 µm), 1020.23 µm square field, 4608 px, cells "5–15 µm in diameter", **300–350 analysable cells per 3×3-tile image**. | Reference magnitudes; and a warning that our **20× slide-scanner** data is coarser than their 25× oil confocal — they "strongly discourage" 10×, and only report testing 25× (used) and 40× (works, needs a different voxel filter). Whether 20× slide-scanner sampling resolves processes well enough is **unvalidated by this paper**. |
| **The rejection criteria** (holes, stripes, tile misalignment, tears, >4 dim z-slices, uneven cell distribution) and the **edge rule** (drop cells cut by first/last slice). | Direct inputs for a QC stage and for ground-truth instructions. |

**What it does *not* cover:** no CD68 (lysosomal/phagocytic marker — the owner's second
channel) at all; no hippocampus-specific numbers (no region results are reported); no
accuracy/validation of segmentation against manual annotation; no soma detection; no numeric
results of any kind beyond throughput (results live in the cited papers).

---

## 1. Materials (Key resources table, transcribed)

### Antibodies
| Reagent | Dilution | Source | Identifier |
|---|---|---|---|
| Rabbit anti-IBA1 (ionized calcium binding adaptor molecule 1) | 1:1,000 | Wako/Fujifilm | Cat#019-19741; RRID:AB_839504 |
| Chicken anti-tyrosine hydroxylase (TH) | 1:1,000 | Abcam | Cat#ab76442; RRID:AB_1524535 |
| Alexa Fluor 488 | 1:1,000 | Thermo Fisher | Cat#A-11039; RRID:AB_2534096 |
| Alexa Fluor 647 | 1:1,000 | Thermo Fisher | Cat#A-21244; RRID:AB_2535812 |

The PDF does **not** say which secondary goes on which primary, nor the secondaries' host
species. (From the catalogue numbers — *not* stated in the PDF — A-11039 is an anti-chicken
AF488 and A-21244 an anti-rabbit AF647, i.e. Iba1 would be read in the far-red AF647 channel,
consistent with the imaging track in step 40 using 405 + 633 nm. Treat as inference.)
TH is listed but never used in the described analysis.

### Chemicals
PFA 4% (Alfa Aesar J61899); PBS 10× without Ca²⁺/Mg²⁺ (RotiCell, Roth 9150.1); 0.9% NaCl
injection solution (Braun L8002); Triton X-100 (Thermo A16046.AE); H₂O₂ 30% (Sigma 216763);
BSA (Sigma A9418); sucrose (Sigma S0389); **Fluoromount with DAPI** (Invitrogen 00-4959-52);
LPS *E. coli* O55:B5 (Sigma L6529-1MG); transparent nail polish.

### Animals
C57Bl/6NCrl, **4-month-old males**, Charles River (SPF). Licence LUPA2022/1 (Luxembourg).

### Software
Black Zen 2.3 SP1 (Zeiss), ZEN, **Imaris** (+ Imaris File Converter, **Imaris Stitcher 9
onward**), Excel, Prism 10.0.03, **MATLAB**. Imaris and ZEN versions otherwise unstated.

### Equipment
**Zeiss LSM880 confocal**; Leica CM 1850 UV cryostat; rodent brain matrix RBM-2000C (ASP/Kent
Scientific); Tissue-Tek OCT 4583; Epredia Superfrost Plus slides J1800AMNZ; VWR biopsy zip bags
60×80 mm; Coplin box; Parafilm; Zeiss Immersol 518 F oil; Corning cover slides 24×55 mm; Epredia
12 mm coverslips 0.13–0.16 mm; Kimwipes.

### Buffers
| Buffer | Composition (per 100 mL) | Storage |
|---|---|---|
| Embedding | 30% sucrose (30 g) in Milli-Q water | +4 °C, one month |
| Permeabilization + peroxidase removal | **3% H₂O₂** (10 mL of 30%) + **1.5% Triton X-100** (1.5 mL) + 88.5 mL PBS | prepare daily |
| Blocking | **5% BSA** (5 g) in PBS | ≤ 2 weeks at +4 °C after BSA added |
| Antibody dilution | **0.3% Triton X-100 + 2% BSA** in PBS | ≤ 2 weeks after BSA added |
| Wash buffer 1 | 0.1% Triton X-100 in PBS | room temperature |
| Wash buffer 2 | 0.3% Triton X-100 in PBS | room temperature |

Triton X-100 may be replaced by Tween 20 throughout.

---

## 2. The method, step by step (numbering as in the paper)

Overall timeline (graphical abstract, fig01): dissection
3 h → fixation & macrosectioning 3 days → cryosectioning 1 day → staining 2 days → confocal
imaging 1 day → image analysis 1 day.

### Animal and tissue preparation (3 h)
1. Weigh mice for dose.
2. i.p. **ketamine (100 mg/mL, Nimatek Vet) + medetomidine (1 mg/mL, Dorbene Vet)** in saline
   (final dose per kg not stated). Dim light; clean bench with Bacillol then 70% ethanol; three
   tissue papers laid out (fig02).
3. No reflexes → open chest, **transcardial perfusion with cold PBS**.
4. Dissect brain (cuts 1–5 along intraparietal, midline, parietal/frontal bones;
   fig03); 5 mm midline cut. Place in 15 mL Falcon.
   If the whole brain goes to histology, perfuse directly with cold 4% PFA instead.
5. Optionally wash in cold PBS and halve in the brain matrix: **one hemisphere drop-fixed in cold
   4% PFA 24 h at 4 °C**; the other kept in PBS for RNA/protein/-omics.
6. Ice.

### Fixation and embedding (24–48 h fix; 48 h sucrose)
7. **4% PFA, 4 °C, 24–36 h** (hemisphere).
8. 3× cold PBS wash; **30% sucrose at 4 °C until the brain sinks (~48 h)**.
9–10. Blot, place in brain matrix, insert **5 blades** (middle blade pressed 2 mm first to fix the
   brain on the midline), cut into **sagittal macro-sections** L3 L2 L1 | R1 R2 R3
   (fig04); up to ten macro-sections with nine
   blades is possible but harder to cryosection.
11–12. Zip bag, **−80 °C ≥ 48 h** before cutting.

### Cryosectioning (1–3 h)
13. Cryostat at **−20 °C**.
14. Label slides: `MouseID_Genotype_Sex_Hemisphere_Macrosection_Section`, e.g.
   `DO007_WT_M_L_3/18`. Orient with the Allen Mouse Brain Atlas.
15–18. Embed macro-section in OCT without bubbles, fresh straight blade
   (fig05, fig06).
19. Trim at **10 µm** until the full face is exposed.
20–21. Cut **50 µm** sections directly onto Superfrost Plus slides (slide-mounted, not
   free-floating).
22. Store slides vertically at **−80 °C** (≥ 1 day).

### Immunofluorescence — Day 1 (18.5 h)
23. Thaw slides 10 min.
24. PBS 2 × 5 min (Coplin box).
25. **Permeabilize + quench peroxidase: PBS + 3% H₂O₂ + 1.5% Triton X-100, 30 min.**
26. Wash 1 × 5 min 0.1% Triton/PBS, 1 × 5 min PBS.
27. **Block: 5% BSA/PBS, 30 min.**
28. Blot; **300 µL primary (1:1000) in 2% BSA + 0.3% Triton, 17 h overnight at room
   temperature**, horizontal, Parafilm cover.
29. Humid chamber (wet tissue in box).

### Immunofluorescence — Day 2 (3.5 h)
30. Remove Parafilm.
31. Wash **3 × 10 min PBS + 0.3% Triton**.
32. Blot dry.
33. **300 µL secondary (1:1000) in 2% BSA + 0.3% Triton.**
34. **2 h at room temperature, dark.**
35. Wash 3 × 10 min PBS.
36. Mount with **Fluoromount + DAPI**, coverslip, push out bubbles.
37. Dry ≥ 2 h at RT, seal corners with nail polish, dry 12–18 h.

### Imaging — Day 3 (2–2.5 h per section)
38. Clean slide with ethanol.
39. **Zeiss LSM 880, LD LCI Plan-Apochromat 25× oil objective.** (Verified on the rendered page:
   the PDF says "25 ×". Elsewhere the paper says "20x" — see Gaps.)
40. **One track, lasers 405 nm (21.7) and 633 nm (36.1)**, pinhole **19.8** (= **0.69 Airy units**,
   **0.6 µm section**). **DAPI: gain 840, digital offset 1, digital gain 0.6. Far-red A647:
   gain 655, digital offset −1, digital gain 1.5.** Units of 21.7 / 36.1 and 19.8 not stated
   (presumably % laser power and µm). Keep identical settings across all images to compare
   intensity.
41. **3 × 3 tile scan (9 tiles), 10% overlap, xy resolution 0.221 µm, z step 1 µm.** Slow scan
   speed / line averaging improve SNR. **9 tiles × 28 slices ≈ 2 h.** Do not go below **28
   slices** — "a microglia cell ranges from 5-15 µm in diameter and processes can extend over a
   larger volume and area".
42. Choose **28–32 z-slices, aiming at a 30 µm range**. **Each image: 1020.23 µm, 4608 px, both
   x and y.** (4608 × 0.221 = 1018.4 µm; 1020.23/4608 = 0.2214 µm/px — consistent.)
   0.5 µm z-steps would be better but slower. Average stack = **30 µm (30 × 1 µm)**, "as this is
   the size of a microglia". **"We strongly discourage working with a lower resolution (e.g.
   10x)."** Tested at **40×: works well**, more robust; only the 3D voxel-size filter (46d) must
   change.
43. Store slides at −80 °C; image ideally within 3 weeks of staining (they report success up to
   6 years later).

### Image processing and segmentation — Imaris (≈ 2 h per acquisition)
44. **QC each acquisition** in Surpass and Slice view. **Exclude** acquisitions with holes/ruptures,
   tile misalignment, **dim signal in more than four z-slices**, or strongly uneven cell
   distribution (troubleshooting 1–5).
45. **Image Processing → Normalize Layers** (per-slice intensity correction), **then Gaussian
   Filter, width 0.300 µm**, on the Iba1 channel (fig07).
   In the screenshot the Iba1 channel is **Channel 3 (red)**; Ch1 blue and Ch2 green are the
   other channels.
46. **Surfaces creation wizard** (fig08):
   - a. Deselect *Classify Surfaces* and *Object-Object Statistics*; no ROI; no tracking
     (fig09).
   - b. Source = Iba1 channel. **Smooth ON, Surfaces Detail 0.500 µm.** Thresholding =
     **Background Subtraction (Local Contrast)** with **"Diameter of largest sphere which fits
     into the object" = 0.500 µm** (fig10).
   - c. **Background-subtraction threshold between 0.5 and 1.5, set manually per image** (the
     screenshot shows **1.00** on a histogram axis running 0–34(.5)). Criterion: the gray surface
     must be "wide enough to have the microglia branches connected to the soma, while at the same
     time not overestimating the microglia size with respect to the signal". **Split touching
     objects (region growing): DISABLED** (its greyed default seed-point diameter shows 2.21 µm)
     (fig11).
   - d. **Filter surfaces by "Number of Voxels Img=1" between 18,000 and 180,000** — "usually …
     for mouse microglia at 20x". In the example screenshot this keeps **139 of 8159 objects
     (2%)**; the histogram axis maximum reads **69847**
     (fig12). Tune interactively to
     remove **isolated branches**, **cells cut by the first or last z-slice**, and **aggregates
     of microglia not identified as individual cells**.
     > ⚠️ **Text-extraction trap:** the extracted text reads "180000 and 1800000" — the rendered
     > page reads **18’000 and 180’000**, and the screenshot fields say 18000 / 180000. The
     > apostrophes are thousands separators. **18,000–180,000 is correct.**
47. Select the surface → Edit → **Mask All** → mask the Iba1 channel: **outside = 0, inside =
   255**, "duplicate channel before applying mask" checked (fig13,
   fig14).
48. **Delete all channels except the new "Masked Iba1+ Channel"** (fig17);
   save as **Imaris 5.5 `.ims`** (fig15).

### Feature extraction — MATLAB
49. Run **`FeatureExtract.m`** from https://github.com/CorradoAmeliLU/MIC-MAC-2.1. Parameters
   at the top of the script (fig16):
   ```matlab
   %% Parameters
   folder_path = ''; %INPUT FOLDER
   folder_output = ''; %OUTPUT FOLDER
   reprocess_samples = false;
   ```
   Input: one or more masked `.ims` files. Output per acquisition: **`_attributes.mat`** (table,
   one row per cell, one column per feature) and **`_volumes.mat`** (one logical 3D matrix per
   row = that cell's full morphology), **row order shared** between the two. A tutorial is in the
   GitHub repo.
50. Analyse the tables in any tool.

---

## 3. Per-cell measures

**The 16 features, exactly as listed (Expected outcomes):** 1st largest bound, 2nd largest
bound, 1 over 2, average curvature, average node degree, compactness, ending node density, link
density, max curvature, max edge length, mean edge length, node density, polarity, S-metric,
volume, volume/number of edges.

**Definitions: none are given in this PDF.** The node/edge/link vocabulary implies a skeleton
graph per cell (nodes = branch points and endpoints, edges/links = segments), and "1 over 2"
plausibly the ratio of the 1st to 2nd largest bound — **both are inference; the definitions are
in Salamanca et al. 2019 (MIC-MAC) and the GitHub code, neither of which is in this PDF.** The
"Before you begin" section also names "number of processes, volume, and length of processes and
clustering of various phenotypic shapes, such as compactness (e.g., amoeboid features)".

Measures our owner asked for, mapped:

| Owner wants | In this protocol? |
|---|---|
| number of processes / extensions | indirectly (ending node density, node degree; counts not named) |
| branching | node density, average node degree, link density |
| volume | **volume** (of the masked surface) |
| soma size | **no** |
| territory | **no** (bounds are the nearest thing) |
| process length | max / mean edge length (total length not listed) |

---

## 4. Reported numbers

This protocol reports **no biological results** — no group means, no statistics. All numbers it
gives are procedural:

| Quantity | Value | Where |
|---|---|---|
| Cells analysed per image | **300–350** per 3×3 tile scan ("up to 350 per brain slice") | Expected outcomes, Summary |
| Features per cell | **16** | Expected outcomes |
| xy pixel size | **0.221 µm** | step 41 |
| z step | **1 µm** (0.5 µm better) | steps 41–42 |
| z range | **28–32 slices, ≈ 30 µm** | step 42 |
| Field of view | **1020.23 µm**, **4608 px** square | step 42 |
| Tile overlap | **10%** | step 41 |
| Acquisition time | **≈ 2 h** for 9 tiles × 28 slices; 2–2.5 h per section | steps 41, Day 3 |
| Section thickness | **50 µm** (trim 10 µm) | steps 19–20 |
| Microglia cell diameter | **5–15 µm** (processes extend further) | step 41 note |
| Gaussian width | **0.300 µm** | step 45 / fig07 |
| Surface detail / local-contrast sphere | **0.500 µm / 0.500 µm** | step 46b |
| Background-subtraction threshold | **0.5–1.5**, manual (example 1.00) | step 46c |
| Voxel-count filter | **18,000–180,000 voxels** "at 20x" | step 46d |
| Example filter result | **139 of 8159** objects kept (2%) | fig12 |
| Analysis time | ≈ 2 h per acquisition | section header |

**Derived by us, not by the authors** (arithmetic on their stated values):
- Voxel volume 0.221 × 0.221 × 1 = 0.0488 µm³ → the voxel window ≈ **879–8,791 µm³** per cell.
  This only holds if the voxel filter was applied at the stated sampling (the paper ties it to
  "20x", while imaging at 25×, so the sampling it was calibrated on is uncertain).
- Imaged volume ≈ 1.020 × 1.020 × 0.030 mm = 0.0312 mm³ → 300–350 retained cells ≈
  **9,600–11,200 retained cells/mm³**. This is a density of *cells that pass the filter*, not of
  all microglia (merged, cut-off and fragmented cells are excluded).

---

## 5. Microglial biology worth keeping

- **Morphology as a readout** of functional/activation state, disease progression and treatment
  response; **amoeboid** = compact. LPS-induced neuroinflammation and DJ-1 (PARK7) knockout were
  the application (results in the cited J. Neuroinflammation paper).
- **Iba1 does not separate microglia from infiltrating monocyte-derived macrophages**; add
  **TMEM119** if infiltration is expected.
- **Plaque-associated clumps** (e.g. Alzheimer models) exceed the voxel window and are
  **systematically excluded** — the protocol under-samples exactly the most activated cells
  in such tissue.
- A microglia is ≈ 30 µm across including processes (their justification for a 30 µm stack);
  soma/cell "5–15 µm in diameter".
- Statistics: the **animal is the experimental unit** when treatment is per animal; cells within
  an animal are not independent replicates. k-means for morphological subtyping at cell level;
  regression for multiple factors (cites a hierarchical Bayesian Sholl approach, VonKaenel 2024).

---

## 6. Limitations (authors') and troubleshooting

**Limitations, as stated:**
1. Cannot distinguish resident microglia from infiltrating monocyte-derived macrophages (use
   TMEM119).
2. Large clumps (plaques) removed by the voxel filter → most plaque-associated cells excluded.
3. Laser settings often need slight changes to get a bright image through 30 µm → **do not use
   intensity as an activation readout** unless settings are identical across all images.
4. Outcomes vary with microscope defaults and brand; image everything on one instrument with one
   setting set.

**Troubleshooting:**

| Problem | Cause | Solution | Figure |
|---|---|---|---|
| 1. Holes in tissue | over/under-fixation; too strong permeabilization | adjust 4% PFA time (24–48 h at 4 °C; PFA penetrates ≈ 1 mm/h at RT, slower at 4 °C; mouse brain ≈ 1 cm³ → hemisphere ≈ 24 h, whole brain 24–48 h); lower Triton to 1% or 0.5% (also for sections thinner than 50 µm) or use 1.5% Tween 20; or perfuse with cold 4% PFA | fig18 |
| 2. Striped lines | cryostat cutting | change blade often, better OCT mounting, keep everything at −20 °C, one smooth stroke; vibratome free-floating sections also acceptable | fig19 |
| 3. Tile misalignment (processes cut between tiles) | stage mechanics or Zen processing | always tile with 10% overlap; Zeiss guide §5.2.19–5.2.20; a Methods video S1 is referenced | fig20 |
| 4. Non-specific binding at a tissue tear | tear/border | manually delete non-specific surfaces in Imaris, or (preferred) exclude the image | fig21 |
| 5. No/dim signal in > 4 z-slices | uneven antibody penetration through 30 µm | exclude the image; longer permeabilization or Triton 2%; do **not** raise antibody concentration | fig22 |

---

## 7. Parameters NOT stated (gaps — do not re-hunt the PDF)

- **Definitions/formulae of all 16 features**, and skeletonization method/parameters in
  `FeatureExtract.m` (pruning, spur length, how nodes are found).
- **Which secondary antibody labels Iba1** (inferred far-red AF647 from catalogue numbers only),
  and the secondaries' host species.
- **Objective inconsistency:** imaging says **25× oil** (LD LCI Plan-Apochromat 25×), the voxel
  filter says "**at 20x**". Which magnification the 18,000–180,000 window was calibrated on is
  unclear; NA of the objective not stated.
- The **40× voxel window** (they say only that it must change).
- Units of the laser values (21.7, 36.1) and of the pinhole value (19.8); scan speed; line/frame
  averaging actually used; bit depth; emission filter ranges; detector type.
- Single-tile pixel dimensions (only the stitched 4608 px / 1020.23 µm is given); stitching
  method (Imaris Stitcher is listed; Zen tile stitching is mentioned in troubleshooting).
- **Brain region(s) imaged** — no region is named for the 300–350 cell figure (the macro-sections
  are sagittal; none of the micrographs is labelled with a region).
- Anaesthetic dose per kg; LPS dose and route (LPS is in the materials only).
- Imaris version and "Normalize Layers" settings; whether the Gaussian width is σ or FWHM.
- Any segmentation accuracy, inter-rater agreement, or comparison against manual tracing.
- Exact sizes of what the voxel filter removes (fraction of true cells lost).
- The OwnCloud example dataset password (said to be in the GitHub repo).

---

## § What is not in this PDF

| Item | Location | Outcome |
|---|---|---|
| **MIC-MAC 2.1 code, `FeatureExtract.m`, tutorial, OwnCloud credentials** | https://github.com/CorradoAmeliLU/MIC-MAC-2.1 | **Not fetched.** `curl https://api.github.com/repos/CorradoAmeliLU/MIC-MAC-2.1` (2026-11-15) returned **403** from this session's GitHub proxy ("GitHub access to this repository is not enabled for this session"); attaching the repo read-only was **denied by the session's permission policy**. This is a policy boundary, not a missing repo — **needs a human or an unblocked environment** to record the README, the feature definitions and the code. |
| **Example acquisition + intermediate and final results** | https://owncloud.lcsb.uni.lu/s/qoXE9SmgIZ34xvX/authenticate (credentials in the GitHub repo) | Not attempted (needs the credentials above). Would be the ideal same-image comparison target for our reimplementation. |
| **Supplemental information, incl. Methods video S1 (tile scan)** | https://doi.org/10.1016/j.xpro.2024.103467 | Not fetched. |
| **Feature definitions** | Salamanca et al. 2019, *Glia* 67:1496–1509, doi:10.1002/glia.23623 (MIC-MAC) | Not in this repo — the paper to take in next for metric definitions. |
| **Biological results** using this protocol | Lind-Holm Mogensen et al. 2024, *J. Neuroinflammation* 21:174, doi:10.1186/s12974-024-03164-x; Fixemer et al. 2022, *Acta Neuropathol. Commun.* 10:36, doi:10.1186/s40478-022-01342-7 | Not in this repo. |

---

## § Extracted images

All 22 embedded images, extracted at native resolution, converted to PNG. The paper has no
numbered figures; numbering here is page order. Full panel-by-panel descriptions:
[`figures/README.md`](#figures).

| # | File | PDF page | What it is |
|---|---|---|---|
| 01 | fig01_workflow_overview.png | cover | Graphical abstract: 6-step timeline + Imaris render of one segmented cell (yellow) among others (red) |
| 02 | fig02_dissection_bench.png | 6 | Photo: dissection tray and instruments |
| 03 | fig03_brain_dissection_cuts.png | 6 | Schematic: skull cuts 1–5 |
| 04 | fig04_brain_matrix_macrosections.png | 8 | Brain matrix, sagittal macro-sections L3–R3 |
| 05 | fig05_cryostat_oct.png | 9 | Photo: OCT on chuck |
| 06 | fig06_cryostat_chuck.png | 9 | Photo: chuck in cryostat |
| 07 | fig07_imaris_normalize_gaussian.png | 12 | Imaris: Normalize Layers + Gaussian 0.300 µm |
| 08 | fig08_imaris_surfaces_button.png | 13 | Imaris: Surfaces tool button |
| 09 | fig09_imaris_surfaces_step1.png | 13 | Surfaces wizard 1/4 |
| 10 | fig10_imaris_surfaces_step2_smooth_localcontrast.png | 14 | Wizard 2/4: smooth 0.5 µm, local contrast 0.5 µm |
| 11 | fig11_imaris_surfaces_step3_threshold.png | 14 | Wizard 3/4: threshold 1.00, split off |
| 12 | fig12_imaris_surfaces_step4_voxel_filter.png | 15 | Wizard 4/4: voxels 18000–180000, 139/8159 kept |
| 13 | fig13_imaris_mask_channel.png | 16 | Mask channel 0 / 255 |
| 14 | fig14_imaris_edit_mask_all.png | 16 | Edit tab, Mask All |
| 15 | fig15_imaris_save_ims.png | 17 | Save as Imaris 5.5 .ims |
| 16 | fig16_matlab_featureextract_parameters.png | 17 | MATLAB parameters block |
| 17 | fig17_imaris_delete_channels.png | 17 | Delete all but masked Iba1 |
| 18 | fig18_trouble_tissue_holes.png | 19 | Problem 1: holes (Iba1 red + DAPI), bar 50 µm |
| 19 | fig19_trouble_cutting_stripes.png | 20 | Problem 2: stripes, bar 50 µm |
| 20 | fig20_trouble_tile_misalignment.png | 20 | Problem 3: tile seam, bar 50 µm |
| 21 | fig21_trouble_tear_nonspecific.png | 21 | Problem 4: tear, bar 100 µm |
| 22 | fig22_trouble_dim_stacks.png | 22 | Problem 5: dim region, bar 100 µm |

Figures were created by the authors (schematics with BioRender.com); reproduced under CC BY 4.0
with attribution to Lind-Holm Mogensen, Ameli, Skupin & Michelucci, *STAR Protocols* 5:103467
(2024).

---

## Figures

Every image embedded in
`../lind-holm-mogensen-2024-microglia-morphology-protocol.pdf`,
extracted at native resolution and converted to PNG. Licence **CC BY 4.0** (stated on p. 1 of the PDF); © the authors, schematics made with BioRender.

The paper has **no numbered figures and no captions** — images sit inline beside the step they
illustrate. Numbering below is page order. Nothing was dropped: the only non-content image is the
cover's graphical abstract, kept because it carries the only 3D render of a segmented cell.

**Scale bars on the micrographs** were measured off these extracted images (bar length in pixels
of the PNG, ±1–2 px). They describe the *printed* image, not the acquisition sampling (0.221
µm/px), and are given only to judge what is visible.

| Fig | Bar | Bar length (px) | ≈ µm/px of this PNG | ≈ field width |
|---|---|---|---|---|
| 18 | 50 µm | 100 | 0.50 | ≈ 490 µm |
| 19 | 50 µm | 50 | 1.0 | ≈ 970 µm |
| 20 | 50 µm | 146 | 0.34 | ≈ 330 µm |
| 21 | 100 µm | 94 | 1.06 | ≈ 1,030 µm |
| 22 | 100 µm | 93 | 1.08 | ≈ 1,050 µm |

Figs 21–22 come out at ≈ 1,030–1,050 µm across — consistent with the stated 1020.23 µm full
3×3-tile acquisition, so those two are whole acquisitions (rendered with the Imaris frame grid).

---

### fig01 — `fig01_workflow_overview.png` (1325 × 1325), cover / graphical abstract


Six-step timeline: **Step 1** mouse brain dissection (3 hours); **Step 2** fixation &
macrosectioning — 4% PFA 24 h, 30% sucrose 48 h, three coloured blades, sagittal cut lines
L3 L2 L1 R1 R2 R3 (3 days); **Step 3** tissue cryosectioning, two photos + slides (1 day);
**Step 4** tissue staining, slides + antibody + Coplin jar (2 days); **Step 5** confocal imaging,
microscope + a small purple/blue overview thumbnail (1 day); **Step 6** imaging analyses (1 day).

**What we see in Step 6:** an Imaris 3D surface render on black — one cell highlighted **yellow**
in the centre, neighbouring cell surfaces in **red**. Scale bar "10 µm" (text barely legible).
The yellow cell is a typical ramified (homeostatic) microglia: small soma, many thin, tortuous,
beaded processes radiating ≈ 2–3 bar-lengths in each direction. The red neighbours are mostly
**fragments of processes** — short disconnected tubes — which is exactly what the voxel filter
later throws away. Processes of neighbours come close to the yellow cell but do not visibly fuse
with it in this render.

### fig02 — `fig02_dissection_bench.png` (972 × 1296), p. 6


Photo: white drip tray with a red rubber board and pins; below, on tissue paper, a syringe,
two insulin syringes, small scissors, bone trimmer (rongeur-like cutter) and two forceps. Bench
layout for step 2 — no analysis content.

### fig03 — `fig03_brain_dissection_cuts.png` (972 × 622), p. 6


BioRender schematic of dissection: 70% ethanol spray; scalp midline cut; skull exposed; skull
diagram with numbered cuts **1** and **2** (along intraparietal bone, right then left), **3**
(midline to frontal/nasal bone), **4** and **5** (between parietal and frontal bones toward the
eye sockets); brain lifted out with forceps; dropped into a **PFA 4%** Falcon tube.

### fig04 — `fig04_brain_matrix_macrosections.png` (972 × 744), p. 8


Left: photo of the brain in the rodent brain matrix with forceps and pipette tips holding it,
three blade colours mapped to **Midline (red)**, **Blade 2 (green)**, **Blade 3 (black)**, labels
"L = Left", "R = Right". Centre: matrix with blades inserted; a blade with tissue on it. Right:
dorsal brain schematic with six **sagittal** cut lines **L3 L2 L1 R1 R2 R3** and a sagittal
slab on glass. **So sections are sagittal**, not coronal — relevant if we compare hippocampal
appearance with the owner's slices.

### fig05 — `fig05_cryostat_oct.png` (972 × 729), p. 9


Photo: gloved hand applying Tissue-Tek OCT from a bottle onto a specimen chuck next to a blade,
in front of a cryostat (Thermo branding visible on the instrument). Step 15.

### fig06 — `fig06_cryostat_chuck.png` (972 × 729), p. 9


Photo: inside the cryostat — chuck mounted in the holder, blade holder and anti-roll plate,
gloved hands. Steps 16–18.

### fig07 — `fig07_imaris_normalize_gaussian.png` (797 × 824), p. 12


Imaris *Image Processing* panel: channels **Ch1 (blue)**, **Ch2 (green)**, **Iba1+ Channel
(red)**. Commands queued on Iba1: **Normalize Layers**, then **Gaussian Filter**. Gaussian
parameters: **Filter Width 0.300 µm**. (Confirms the step-45 text "width = 0.3" is in µm.)

### fig08 — `fig08_imaris_surfaces_button.png` (797 × 294), p. 13


Imaris Surpass toolbar with the **Surfaces** creation icon boxed in red; scene tree shows Light
Source 1, Frame 1, Volume.

### fig09 — `fig09_imaris_surfaces_step1.png` (797 × 946), p. 13


Surfaces wizard **1/4**, Favorite parameters "Default \*". All unchecked: Segment only a Region of
Interest, Process entire Image finally (greyed), Track Surfaces (greyed), **Classify Surfaces**,
**Object-Object Statistics**, Start creation with Slicer view.

### fig10 — `fig10_imaris_surfaces_step2_smooth_localcontrast.png` (797 × 957), p. 14


Wizard **2/4**. Source Channel **"Channel 3 - Iba1+ Channel"**. **Smooth ✓, Surfaces Detail
0.500 µm.** Thresholding: Absolute Intensity ○, **Background Subtraction (Local Contrast) ●**,
**Diameter of largest Sphere which fits into the Object: 0.500 µm**; Labkit for Pixel
Classification (greyed). (Note the Imaris label: the local-contrast diameter is meant as the
*largest sphere fitting in the object* — i.e. the expected thickness of the thinnest structures
to keep, here processes.)

### fig11 — `fig11_imaris_surfaces_step3_threshold.png` (797 × 1040), p. 14


Wizard **3/4**. **Threshold (Background Subtraction) = 1.00** (lower bound, enabled); upper bound
disabled, greyed value **34.5**. Histogram axis 0 to 34, monotonically decreasing, everything
right of the yellow line at 1.00 selected — i.e. most of the local-contrast range is kept and the
cut sits just above the background peak. **Split touching Objects (Region Growing): Enable ☐**
(off); greyed defaults Seed Points Diameter **2.21 µm**, Intensity Based.

### fig12 — `fig12_imaris_surfaces_step4_voxel_filter.png` (797 × 1164), p. 15


Wizard **4/4**, Filter Surfaces: filter **"Number of Voxels Img=1" between 18000 and 180000**.
Histogram of object sizes: a tall peak of small objects on the left (grey, rejected) decaying into
a long flat tail (yellow, kept). Footer: **"139 of 8159 selected (2%)"**, right-end axis value
**69847**. **What this says about the data:** after thresholding, ~98% of connected components
are fragments (isolated process pieces, debris) below 18,000 voxels; only a small minority are
whole cells. The same page is rendered as text in the PDF with "18’000 and 180’000" — the
extracted text dropped the apostrophes and became "180000 and 1800000", which is wrong.

### fig13 — `fig13_imaris_mask_channel.png` (972 × 841), p. 16


*Mask Channel* dialog: Channel 3 - Iba1+ Channel; **Duplicate channel before applying mask ✓**;
**Constant inside/outside** — outside **0.00**, inside **255**; Apply to all time points ✓.

### fig14 — `fig14_imaris_edit_mask_all.png` (797 × 700), p. 16


Surfaces *Edit* tab (pencil): Cut, Selection, and **Edit → Mask All…** highlighted;
Object-Object Statistics unchecked.

### fig15 — `fig15_imaris_save_ims.png` (972 × 765), p. 17


Windows *Save As*: file name `test_image`, type **Bitplane: Imaris 5.5 (\*.ims)**.

### fig16 — `fig16_matlab_featureextract_parameters.png` (797 × 273), p. 17


MATLAB code: `%% Parameters` / `folder_path = ''; %INPUT FOLDER` / `folder_output = ''; %OUTPUT
FOLDER` / `reprocess_samples = false;`. The only user-set parameters of `FeatureExtract.m`
shown in the paper — no morphology parameters are exposed here.

### fig17 — `fig17_imaris_delete_channels.png` (797 × 722), p. 17


*Delete Channels*: Channel 1 - Ch1 ✓, Channel 2 - Ch2 ✓, Channel 3 - Iba1+ Channel ✓ deleted;
**Channel 4 - Masked Iba1+ Channel** kept. So the raw image had **three channels** (blue,
green, Iba1-red) plus the created mask.

### fig18 — `fig18_trouble_tissue_holes.png` (972 × 637), p. 19 — Problem 1, holes


Maximum-projection-style confocal image, **Iba1 red, DAPI blue**, scale bar **50 µm** (100 px →
≈ 0.5 µm/px of this PNG, field ≈ 490 µm). Four white arrows point to **dark holes** in the tissue
(round voids, by eye ≈ 25–50 µm, and a long dark vertical crack).
**What microglia look like:** this is the best view in the paper of normal ramified microglia at
roughly whole-field scale. Cells are **dense and evenly tiled** — a soma every few tens of µm —
each a small bright red/magenta soma (often overlapping a blue nucleus, giving magenta) with
**several (by eye ≈ 4–8) thin, branching processes** radiating out. At this display scale the processes of
neighbouring cells **interdigitate and appear to touch** in projection; the gaps between cells
are filled with fine red process fragments whose parent cell is not obvious. Many DAPI nuclei
(non-microglial) are interspersed. A few brighter, more compact cells occur near the holes.
Expect an algorithm on a projection to struggle to assign processes to cells; in 3D they separate
better.

### fig19 — `fig19_trouble_cutting_stripes.png` (972 × 494), p. 20 — Problem 2, stripes


Lower-magnification field (bar **50 µm** = 50 px → ≈ 1 µm/px, field ≈ 970 µm) at a tissue edge
(black top-right = outside tissue), **Iba1 red + DAPI blue**. Faint parallel diagonal **striations**
across the tissue (cryostat chatter; one arrow top-left). A dark shadow on the right.
**What microglia look like here:** at ≈ 1 µm/px only somata (bright magenta dots) and a diffuse
red haze are visible; processes are barely resolved, and the red background is strong. A
cortex-like layered band with denser blue nuclei is visible near the pial edge. **Instructive for
our 20× slide-scanner data:** at this sampling individual process tracing would not be possible.

### fig20 — `fig20_trouble_tile_misalignment.png` (972 × 482), p. 20 — Problem 3, tile seam


Higher zoom (bar **50 µm** = 146 px → ≈ 0.34 µm/px, field ≈ 330 µm), **Iba1 red, DAPI blue**.
A horizontal **tile seam** about one third down (five arrows) with a lateral shift: processes
crossing it are cut and offset; a dark band to the left where tiles do not meet.
**What microglia look like:** the clearest single-cell view. Somata are bright, oval, roughly
**5–10 µm** across by eye (the saturated cores alone measure ≈ 4–6 µm equivalent diameter by
thresholding this PNG at red > 240 — an underestimate of the soma, quoted only as a magnitude);
processes are **very thin (≈ 1 µm, near the resolution limit), tortuous and beaded**, and break
up into **dotted fragments** wherever they leave the focal range — many isolated red dots in the
field are process pieces, not cells. DAPI nuclei are as large as or larger than microglial somata
and far more numerous.

### fig21 — `fig21_trouble_tear_nonspecific.png` (972 × 947), p. 21 — Problem 4, tear


Imaris 3D view (frame grid) of a whole acquisition (bar **100 µm** = 94 px → field ≈ 1,030 µm),
**Iba1 red only**. Bottom-left: a black **tear** (arrow) bordered by large, bright, blobby,
**non-specific** red structures along its edge — these would pass a size filter and be mistaken
for (amoeboid) cells. The rest of the field shows evenly spaced small microglia (soma + short
processes) with a grainy red background; upper-left is hazier.
**Density at whole-field scale:** several hundred somata across the field, regularly spaced
(consistent with the paper's 300–350 analysable cells per image).

### fig22 — `fig22_trouble_dim_stacks.png` (972 × 946), p. 22 — Problem 5, dim region


Imaris 3D view of a whole acquisition (bar **100 µm** = 93 px → field ≈ 1,050 µm), **Iba1 red**
(a few tiny green specks top-left). Strong **intensity gradient**: the upper-left third is bright
with a dense, interconnected-looking meshwork of ramified cells; toward lower right the signal
fades, processes become faint dotted lines and somata dim (arrows mark dim cells).
**What it means for an algorithm:** a global threshold would over-segment the bright corner
(cells merging into one network) and lose the dim corner — the reason for per-slice normalisation
and local-contrast thresholding, and for the "exclude if > 4 dim z-slices" rule.
