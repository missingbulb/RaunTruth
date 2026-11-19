# References — source papers

One Markdown file per paper, holding what the article gives this study: the method steps,
parameters and numbers its tracing, counting and measuring can use, and the inventory of any panel
it gave the working dataset. The PDF is in the study's Drive `Literature` folder, named by title.
Nothing else lives
here — no PDF, figure, panel, crop script or supplementary file, whatever the licence; the article
and its supplementary material are linked at the publisher. The `literature-summaries-only` check
holds the folder to this shape.

```
literature/
  README.md                  <- you are here: the paper index
  METHODS-SYNTHESIS.md       <- cross-paper: what the literature does vs what we adopted
  BIOLOGY-INVARIANTS.md      <- what a real vessel graph must look like: scoring invariants, for expert sign-off
  <paper-slug>.md            the paper: what it gives the study, and its panel inventory where it has one
```

**Slug format:** `<first-author>-<year>-<short-topic>`, lowercase, hyphenated.

**Adding a paper?** Follow the `paper-intake` skill.


---

## Papers

| Paper | What it gives us | Panels in the dataset |
|---|---|---|
| [**wang-2022-cd31-vascular-network**](wang-2022-cd31-vascular-network.md)<br>*Sci Rep* 12:22288 — gP-CD31 / phalloidin / α-SMA, normal and ischemic **rat** brain | **The source of the primary images** and of the biology: which marker labels what, the four cortical regions, why gP-CD31 beats mM-CD31. Published only intensity + area %. | **16** — the primary set |
| [**rust-2020-fiji-vascular-analysis**](rust-2020-fiji-vascular-analysis.md)<br>*Front Neurosci* 14:244 — automated **Fiji** analysis | **The methods reference**, and now the **strongest validation** we have: its supplementary material supplies the exact Fiji macro plus a µm-calibrated native-resolution vessel image, on which our pipeline reproduces their method to within 5–16%. | **21** (incl. the native supplementary image) |
| [**freitas-andrade-2022-pyvane-endothelial-networks**](freitas-andrade-2022-pyvane-endothelial-networks.md)<br>*Neurophotonics* 9(3):031916 — **Pyvane** | **The closest analogue of our pipeline** and the only **external ground truth**: three images with published density/branching/tortuosity, plus reference masks and skeletons. Fully specified algorithm. | **6** (grayscale, uncalibrated) |
| [**stefanitsch-2015-tpa-cerebrovascular-tree**](stefanitsch-2015-tpa-cerebrovascular-tree.md)<br>*Front Cell Neurosci* 9:456 — tPA⁻/⁻ mice | **The only quantitative reference for CATEGORIZE**: CD31⁺ caliber bins (<5 / 5–10 / >10 µm) and ASMA⁺ artery diameters (mean 22.9 µm). Says our artery threshold is too low. | none — all micrographs are multi-channel |
| [**hill-2020-aging-mra-cerebrovascular-loss**](hill-2020-aging-mra-cerebrovascular-loss.md)<br>*Front Aging Neurosci* 12:585218 — CE-MRA | A **cross-modality validation design** worth imitating, a count of vessel cross-sections (458/mm², young mouse) that is not our COUNT and not a target, and aging as a confounder. | none — MR angiography, different modality |
| [**bizou-2026-nvu-angiogenic-programs**](bizou-2026-nvu-angiogenic-programs.md)<br>*Nat Commun* 17:6746 — NVU communications | **Whole-brain vascular-density heatmaps** (the second paper to converge on the grid-heatmap construct), an open analysis toolkit, and a warning that density is region-specific. | none — all micrographs are multi-channel |
| [**blinder-2013-cortical-angiome**](blinder-2013-cortical-angiome.md)<br>*Nat Neurosci* 16:889 — the cortical angiome | **What a correct mouse cortical vessel graph looks like**: 93% three-way junctions, median vessel 50 µm, radius ~2 µm, loops of ~8 edges, no dangling sub-networks, penetrating venules 3× arterioles. Feeds [`BIOLOGY-INVARIANTS.md`](BIOLOGY-INVARIANTS.md). | none — renders of vectorized networks and plots |
| [**cassot-2010-cortical-branching-patterns**](cassot-2010-cortical-branching-patterns.md)<br>*Brain Res* 1313:62 — human cortical arteriole and venule bifurcations | **Junction geometry from 9,414 bifurcations**: Murray's exponent scatters (IQR 2.3–6.1), the larger daughter is wider than the parent in ~40%, angles are wide (~104° between daughters) and mostly planar; optimal-angle theory fails. | none — human, India ink, renders and plots |
| [**ji-2021-whole-brain-microvascular-topology**](ji-2021-whole-brain-microvascular-topology.md)<br>*Neuron* 109:1168 — three whole mouse brains at sub-µm resolution | **The largest measured vessel graph**: 97–99% three-way junctions, angles 84/118/145°, junctions ~15° out of plane, loops of ~9 branches, median capillary 45–46 µm, tortuosity 1.27, length density per region including hippocampus. Copyrighted. | none — no figures committed |
| [**smith-2019-capillary-networks-across-species**](smith-2019-capillary-networks-across-species.md)<br>*Front Physiol* 10:233 — mouse vs human capillary beds, CC BY | **Capillary-bed statistics and a generator**: loops of ~11 edges and ~490 µm, 7% four-way junctions, tissue-to-vessel distance ~18 µm, junctions about half converging and half diverging. Mouse data shared with Blinder 2013. | none — renders and plots |
| [**walchli-2020-hierarchical-vascular-network-imaging**](walchli-2020-hierarchical-vascular-network-imaging.md)<br>*bioRxiv* 2020.10.19.344903 — corrosion casts + synchrotron µCT, P10 vs P60 mouse brain; all rights reserved | **A fully stated 3D skeleton-graph recipe in µm** (Otsu, close 0.75 µm, merge junctions < 2 µm, spur if L < 2·r, isolated < 5 µm) and a **7 µm inner-diameter capillary cut**. P60 cortex: segments ~30 µm long, ~5 µm wide, tortuosity ~1.21, 17,000 branch points/mm³; P10→P60 branch points ×4.3. | none — resin-cast µCT renders and plots |
| [**pfau-2024-bbb-regional-heterogeneity**](pfau-2024-bbb-regional-heterogeneity.md)<br>*Nat Neurosci* 27:1892 — BBB heterogeneity, median eminence vs somatosensory cortex, CC BY | **A definition-matched caliber anchor**: CD31 capillary diameter (area ÷ length) **3.95 ± 0.49 µm** in mouse cortex vs **9.61 ± 1.82 µm** in the leaky median eminence; EC nuclei 1.9 vs 5.6 per 100 µm; pericytes per EC 0.29 vs 0.16. Arteries by αSMA, not caliber. Mostly transcriptomics. | **17** CD31 crops described, with crop boxes and measured bars; images not yet in any store |
| [**sweeney-2019-bbb-physiology-disease**](sweeney-2019-bbb-physiology-disease.md)<br>*Physiol Rev* 99:21 — BBB review | **Vessel types by wall cells, not caliber** (SMC layers vs pericytes; the endothelium changes gradually along the tree), and the primary sources for mouse capillary length and pericyte coverage. Microvascular density goes **down** in AD and ALS, **up** in HD and epilepsy. No morphometry of its own. | none — schematics only |
| [**zhang-2022-mastitis-angiogenesis-proteomics**](zhang-2022-mastitis-angiogenesis-proteomics.md)<br>*Front Vet Sci* 9:980963 — DIA proteomics, **cow** mammary gland, hemorrhagic mastitis | **Low relevance**: a different species, tissue and disease; CD31 only in qualitative IF on 5 µm slide-scanned sections, **no vessel quantification**. Useful only as an example of a weak, speckled CD31 channel. | none — single vessel cross-sections, not networks |

**Ten of fourteen contribute no panels, and that is a result, not a gap.** A paper enters the
working dataset only if it has isolated single-channel vessel images; forcing multi-channel
merges or a different imaging modality into `VESSEL_*` would break the one contract the dataset
has.

---

## What goes in the working dataset

The figure panels themselves are not in this repository: no literature image is (owner,
2026-11-16). Each paper's file keeps its panel inventory — which panels were cropped, their
`VESSEL_` names and their µm/px — so the dataset can be rebuilt from the publisher's figures.
The retired figure-panel pipeline (`measure_vessels.py`, in git at commit e49f676) read `VESSEL_*` panels and kept
their calibration in `SCALEBAR_PX` / `UNCALIBRATED`.

A panel earns the `VESSEL_` prefix when it is an **isolated single-channel vessel image**: vessels
bright on a dark background, no second marker mixed in. Every paper after Wang carries a paper tag
(`rust20fig1_…`) so calibration prefixes cannot collide.

**Different papers are never averaged together.** `measure_vessels.py` groups its region rollup by
paper, because species, injury model, marker and magnification all differ across the corpus.
