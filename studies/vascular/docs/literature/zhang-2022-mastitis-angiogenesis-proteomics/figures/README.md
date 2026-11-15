# Figures — Zhang et al. 2022

The three micrograph figures, described from the PDF (kept in the study's Drive Literature folder
as `fvets-09-980963.pdf`) with `_tools/extract_pdf_assets.py` at the resolution embedded in the PDF.
Licence CC BY. The images are not in the repo: the study keeps no binaries in git. Digest: [`../digest.md`](../digest.md).

Figures 2–6 are omics charts; their content is transcribed in the digest §3.

> **No `panels/` folder, deliberately.** All tissue is 5 µm paraffin sections of cow mammary
> gland on an Olympus microscope or a Pannoramic slide scanner. The only single-channel vessel
> images (Fig 8 row B, CD31) each show one vessel cross-section, not a network. Reasoning:
> [`../digest.md`](../digest.md) §7.

Scale bars below are the ones **drawn on the panels**; the captions state different values (digest
§4). No bar was measured in pixels.

---

## Fig 8 — `fig8_IF_DAPI_CD31_aSMA_CAV1.png` (the one closest to us)

*Image not in the repo: the study keeps no binaries in git. Render it from the PDF in the Drive Literature folder.*

3780 × 3140 px. A 5 × 6 grid. Columns: arteriole Con / HM, venule Con / HM, capillary Con / HM.
Rows: **A** DAPI (blue), **B** CD31 (Cy5, shown magenta), **C** α-SMA (Cy3, red), **D** CAV1
(FITC, green), **E** merge. Drawn bars: **20 µm** in columns 1–4, **10 µm** in columns 5–6.

What you actually see:

- **B1 (arteriole, Con)**: a faint, dotted CD31 ring inside a drawn dashed outline. **B2 (HM)**:
  diffuse speckle with a single bright elongated profile; the ring is not recoverable without the
  dashed outline.
- **B3 (venule, Con)**: the clearest CD31 image — a continuous, convoluted endothelial outline,
  labelled "VE". (The text calls B3 an arteriole; it sits under "Venules".) **B4 (HM)**: diffuse
  network-like speckle, no clear lumen.
- **B5 / B6 (capillary)**: almost all background speckle; one small CD31-positive profile inside
  a dashed box in B5, none distinguishable in B6's box.
- Row C (α-SMA) is far brighter and more continuous than CD31: thick smooth-muscle rings around
  the Con arteriole (C1) and venule (C3); fragmented blobs in HM (C2, C4); in C5 the many
  α-SMA rings are other vessels, and the boxed capillary is α-SMA-negative.
- Drawn **white dashed outlines and boxes** cross the vessels in rows A, B, D and E, and white
  text labels (VE, VSM, VEC, VV, LY, NEUT) sit on the image — any pipeline run on these would
  segment the annotations.

## Fig 1 — `fig1_HE_alveoli_and_vessels.png`

*Image not in the repo: the study keeps no binaries in git. Render it from the PDF in the Drive Literature folder.*

827 × 1039 px. H&E, 4 rows × 2 columns (Con | HM): **A/B** alveoli, **C/D** arterioles, **E/F**
venules, **G/H** capillaries. Drawn bars: A **100 µm**; B, C, D **50 µm**; E–H **20 µm** — so the
alveoli pair A/B is shown at different magnifications. Con alveoli are open with an intact
epithelial lining (dashed outline in A); HM alveoli are packed with RBCs and neutrophils. The Con
arteriole (C, dashed outline) has a defined smooth-muscle wall; the HM one (D) has a collapsed
lumen. HM venule (F) is distended and filled with RBCs. Capillaries (G, H) are only a dashed box
around a few cells — at this scale a capillary is a handful of nuclei, not a tube.

## Fig 7 — `fig7_CAV1_IHC_qPCR_western.png`

*Image not in the repo: the study keeps no binaries in git. Render it from the PDF in the Drive Literature folder.*

1535 × 2034 px. **A1–D2**: CAV1 IHC (DAB brown, haematoxylin counterstain) in alveoli, arterioles,
venules and capillaries, Con | HM. **A3–D4**: matching negative controls (no primary), blue only.
Drawn bars **50 µm** everywhere except A3 and A4, which carry **100 µm**. Dashed outlines mark the
alveolus, arteriole wall and venule; a red dashed box marks an RBC in D2. **E**: relative CAV1
mRNA per animal (C1–C3 red, HM1–HM3 blue), `**`. **F**: western blot (CAV1 20 kDa, β-actin
42 kDa) with integral OD bars, `*`. The bar values are only drawn, not tabulated; the digest §3
gives readings off the plot, marked as such.

---

## Figures 2–6 (described for completeness)

- **Fig 2** — A: identification bars (76,255 / 63,103 / 7,618 / 20,335); B: pie of peptides per
  protein; C: DEPs up 2,718, down 1,021; D: GO/KEGG term counts (all vs P.adjust < 0.05);
  E/F: top-20 BP and KEGG bubble plots (rich factor 0.15–0.35 and 0.2–0.5).
- **Fig 3** — A: −log10(Q) vs z-score bubble plot with a table of the 23 GO IDs (3 vasculature,
  20 blood); B: Venn 3 / 24 / 32; C: volcano, 49 up / 10 down; D: heat map of 24 shared DEPs.
- **Fig 4** — ClueGO network of 59 DEPs and 25 GO terms, angiogenesis terms enlarged at right.
- **Fig 5** — A: circular KEGG plot (ko04370 VEGF, ko04917 prolactin, ko04614 RAS, ko05418
  shear stress; legend misspelled "Fluclass"); B: heat map of 49 DEPs; C: volcano; D: upset plot.
- **Fig 6** — A: Venn 50 / 9 / 40; B: heat map of the 9 shared DEPs; C: log2FC bars (CAV1 the only
  down); D: concentric PPI network of 99 DEPs; E: MGI phenotype grid for the 9 DEPs.
