# Reference digest — Bizou et al. 2026, NVU communications and regional angiogenic programs

> Self-contained digest of the source paper. **No need to reopen the PDF.**

- **Title:** *Mapping neuro-vascular unit communications reveals distinct angiogenic programs
  across developing mouse brain regions*
- **Authors:** Mathilde Bizou, Elise Drapé, Gael Cagnone, Joel P. Howard, Frans Irgolitsch,
  Séverine Leclerc, Mei Xi Chen, Blanche Boisseau, Isabelle Robillard, Matthieu Ruiz,
  Fréderic Lesage, Jean-Sébastien Joyal, Gregor Andelfinger, **Alexandre Dubrac**.
  CHU Sainte-Justine / Université de Montréal / Polytechnique Montréal.
- **Venue / id:** *Nature Communications* (2026) **17:6746**.
  DOI **10.1038/s41467-026-73373-w**. Received 18 Aug 2023, accepted 28 Apr 2026. 18 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `Mapping neuro-vascular unit communications reveals distinct angiogenic programs across developing mouse brain regions.pdf`, not in the repo.
- **One-line thesis:** spatial transcriptomics + region-resolved endothelial scRNA-seq across
  postnatal mouse brain show that **cortex and thalamus run different angiogenic programs on
  different schedules**; neuronal→endothelial **TGFβ2** signalling drives thalamic vascularization
  in a defined postnatal window, and losing endothelial **TGFβR1** causes **mTOR hyperactivation,
  thalamus-predominant vascular malformations and haemorrhage** — rescued by mTOR inhibition.

---

## 1. Why this matters to *our* task

This is predominantly an **omics** paper; the imaging is supporting evidence. It contributes
**no panels to the working dataset** (§5). Three things are worth having:

1. **A whole-brain vascular-density heatmap, computed the way Rust 2020 does it but at brain
   scale.** Segment the vasculature, tile the image into fixed-size squares, compute density per
   square, colour-map. Rust argues for this as a *visualization*; Bizou uses it as the primary
   measurement across seven brain regions and five ages. Two independent papers converging on the
   same construct is a good argument for adding it — and it directly answers the
   *where is tissue under-vascularized* question that the ischemic-core/penumbra work is about.
2. **An open-source segmentation-analysis package** — the **LIOM Toolkit**
   (<https://github.com/LIOMLab/liom-toolkit>), Python + scikit-image, the same stack as our
   pipeline. A second implementation to read alongside Pyvane.
3. **A caution about regional heterogeneity.** Vascular density differs *significantly by brain
   region at the same age* — thalamus consistently highest from P6 to P40. Any "normal cortex"
   baseline number is region-specific. Our own panels are all cortex, which is fortunate, but it
   is a reason not to compare our numbers to a whole-brain literature value.

**Note on the vascular-density unit:** this paper reports **µm²/mm² × 10³** — an *area* density
(our `area%` rescaled), not the length density (mm/mm²) that Rust and Freitas-Andrade use. Do not
mix the two.

---

## 2. Vessel segmentation and analysis (the transferable part)

- **Labelling:** antibodies against **CD31 and ICAM2**; the two channels are **merged to improve
  signal-to-noise** before segmentation. (A neat trick, and an argument that our single-channel
  inputs are working with less information than the field typically does.)
- **Imaging:** Leica **DMi8** inverted microscope for the vascular sections; Leica **TCS SP8**
  confocal at **63×** for the RNAscope/high-magnification work; **Zeiss Axioscan Z1** slide
  scanner for Visium H&E.
- **Segmentation:** **Imaris 9.9.1**, `Surfaces` module on the merged CD31/ICAM2 channel, with
  **surface detail = 1 µm** and **background subtraction = 3 µm**. **Pixel classification** was
  then trained to predict and reject false-positive vessels.
- **Downstream analysis:** Python + **scikit-image**, published as the **LIOM Toolkit**
  segmentation module.
- **Heatmap:** the segmented image is divided into **fixed-size squares**; vascular density is
  computed per square and rendered as a heatmap over the coronal section.
- **Other quantifications:** ERG⁺ endothelial nuclei per mm² of tissue; ERG⁺EdU⁺/ERG⁺ for
  proliferation; **tip cells per mm² of vessel**, identified as having **CD31⁺/ICAM2⁻ filopodia**
  — a nice example of using a two-marker mismatch to identify a structure neither marker
  identifies alone.
- **Stats:** one-way ANOVA with Dunnett's or Tukey's multiple comparisons, Kruskal–Wallis with
  Dunn's, Brown-Forsythe/Welch ANOVA with Dunnett's T3; all two-sided; mean ± s.e.m.

## 3. Results

1. **Regional vascularization dynamics (Fig 1).** Vascular density (CD31/ICAM2) mapped across
   **7 regions** — cortex (CTX), hippocampal formation (HPF), thalamus (THAL), hypothalamus (HY),
   piriform (PIR), caudoputamen (CP), amygdala (AMG) — at **P1, P6, P12, P21, P40**
   (n = 3 per age; n = 5 at P40). Density rises from birth to ~P20 in **all** regions, but
   **thalamus is significantly the densest from P6 through P40** (P6 p=0.031, P12 p=0.0066,
   P20 p=0.0006, P40 p=0.0047 vs the whole-brain mean). ERG⁺ endothelial cells and **tip cells**
   (CD31⁺/ICAM2⁻ filopodia) peak at **P6** and differ significantly between cortex and thalamus.
2. **Endothelial heterogeneity (Fig 2).** Region-resolved scRNA-seq of cortical and thalamic ECs
   at P6, P12 and adult resolves arterial, venous, capillary, proliferative and **tip-cell**
   clusters (tip markers *Chst1*, *Apod*). Proliferative and tip clusters exist at both early
   stages; angiogenic and BBB/transporter pathway activity diverges between the two regions.
3. **Spatial profiling (Fig 3).** Visium spatial transcriptomics at P6, P12 and adult
   (n = 2 per age) tracks synaptic remodelling and glial differentiation (*Mbp*, *Gfap* up;
   *Tubb2b* down, *Rora* up) alongside region-specific angiogenic expression landscapes.
4. **NVU communications (Fig 4).** Ligand–receptor analysis ranks **VEGFA** top overall;
   **TGFβ2** signalling from neurons to endothelium is specific to thalamus at **P6–P12**,
   validated spatially by Visium, ISH and the Allen atlas.
5. **TGFβ is required (Fig 5).** Endothelial *Tgfbr1* knockout disrupts postnatal angiogenesis
   and vascular maturation.
6. **mTOR is the mechanism (Fig 6).** Loss of endothelial TGFβR1 → **mTOR hyperactivation**
   (strong phospho-S6 and phospho-4EBP1) → thalamus-predominant vascular malformations and
   haemorrhage; **mTORC1 inhibition rescues** the phenotype.

## 4. Limitations / gaps for us

- **No pixel size, no scale bar** identifiable on the extracted figures; nothing to calibrate.
- Segmentation depends on **Imaris**, commercial software — the exact step we cannot reproduce.
  Only the *downstream* analysis (LIOM Toolkit) is open.
- **Heatmap square size is not stated** — the same parameter Rust 2020 also leaves to the user.
- The vascular measurements are supporting evidence for a molecular story; the paper does not
  report branch counts, lengths or tortuosity.

## 5. Extracted images — and why there is no `panels/` folder here

All six figures are extracted and described in [`figures/README.md`](#figures).

**No panel from this paper enters the working dataset.** The micrographs are all
**multi-channel merges** — vessels in yellow with DAPI nuclei in blue and often EdU or a third
marker in white/red — so none is an isolated vessel channel, and the DAPI speckle would be
measured as texture by any thresholding pipeline. The rest of the figures are heatmaps, UMAPs,
PCA plots and expression heatmaps. With no stated pixel size there is nothing to calibrate
either.

| File | Fig | Content |
|---|---|---|
| `figures/fig1_regional_vascularization_dynamics.png` | 1 | **Whole-brain vascular-density heatmaps** P1→P40 + ERG/EdU and tip-cell micrographs. |
| `figures/fig2_endothelial_heterogeneity_scRNAseq.png` | 2 | Endothelial scRNA-seq: UMAP, PCA, pathway heatmaps. |
| `figures/fig3_spatial_angiogenic_signatures.png` | 3 | Visium spatial profiling across regions and ages. |
| `figures/fig4_NVU_communications.png` | 4 | Ligand–receptor NVU communication maps; TGFβ2 spatial validation. |
| `figures/fig5_endothelial_TGFb_signaling.png` | 5 | Endothelial TGFβ signalling in postnatal angiogenesis. |
| `figures/fig6_mTORC1_inhibition_rescue.png` | 6 | mTORC1 inhibition rescues the vascular malformations. |

---

## Figures

All six main figures, extracted from
the PDF in the study's Drive `Literature` folder (named in the citation block) with
the paper-intake skill's extractor. 
> **No `panels/` folder for this paper, deliberately.** Every micrograph is a multi-channel merge
> (vessels yellow + DAPI blue + EdU/other marker), so none is an isolated vessel channel, and no
> pixel size is stated. Reasoning: §5 above.
>
> **Note:** the figures are extracted as embedded raster images, so the **vector panel letters,
> axis labels and annotations from the PDF are not baked in**. Panel identification below comes
> from the published captions.

---

### Fig 1 — `fig1_regional_vascularization_dynamics.png` ⭐


- **(a)** the part worth studying: **whole-brain vascular-density heatmaps** of coronal sections
  at **P1, P6, P12, P21, P40**, built by segmenting CD31/ICAM2 and tiling into fixed-size squares
  (black→purple→orange→white colour scale). The progressive brightening from P1 to P40 is the
  developmental densification, and the thalamic hot zone in the later sections is the paper's
  main imaging claim. Conceptually the same construct as Rust 2020's grid heatmap, applied at
  whole-brain scale.
- **(b)** vascular density per region, µm²/mm² × 10³, dotted line = whole-brain mean.
- **(c)** ERG (endothelial nuclei) + EdU double labelling — yellow vessels, blue nuclei, white
  EdU⁺ proliferating endothelial cells; a red dotted line marks the pia/parenchyma boundary.
  The two rows are cortex and thalamus across ages.
- **(d, e)** ERG⁺ cells per mm², and the EdU⁺ proliferating fraction.
- **(f)** high-magnification **tip cells** (right-hand column), identified by **CD31⁺/ICAM2⁻
  filopodia** — the fine spray of processes at the vessel tip is clearly visible.
- **(g)** tip cells per mm² of vessel.

### Fig 2 — `fig2_endothelial_heterogeneity_scRNAseq.png`


Region-resolved endothelial scRNA-seq: (a) experimental schematic, (b) UMAP of all ECs across
cortex/thalamus and stages, (c) PCA, (d) differentially expressed genes by subtype/region/age,
(e) angiogenic pathway activity, (f) BBB and transporter pathway activity.

### Fig 3 — `fig3_spatial_angiogenic_signatures.png`


Visium spatial transcriptomics across developing brain regions: cluster maps, UMAPs, marker
feature plots (*Mbp*, *Gfap*, *Tubb2b*, *Rora*) and the region-specific angiogenic expression
landscape.

### Fig 4 — `fig4_NVU_communications.png`


Ligand–receptor interaction analysis across P6, P12 and adult; VEGFA ranked top overall, with the
thalamus-specific neuronal→endothelial **TGFβ2** signal validated by Visium, in-situ
hybridization and the Allen Developing Mouse Brain atlas.

### Fig 5 — `fig5_endothelial_TGFb_signaling.png`


Endothelial TGFβ signalling coordinating postnatal angiogenesis and vascular maturation —
*Tgfbr1* endothelial knockout phenotype.

### Fig 6 — `fig6_mTORC1_inhibition_rescue.png`


mTORC1 inhibition rescues the vascular anomalies in *Tgfβr1^iECKO^* mice; includes the
phospho-S6 / phospho-4EBP1 immunostaining that demonstrates mTOR hyperactivation.
