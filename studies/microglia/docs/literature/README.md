# Literature — source papers

One Markdown file per paper, `<first-author>-<year>-<short-topic>.md`, written so the article never
has to be reopened: its method, numbers and figures described in text. Nothing else lives here —
no PDF, figure, crop or supplementary file, whatever the licence; the article, its figures and its
supplementary material are linked at the publisher. `SYNTHESIS.md` holds the cross-paper reading.
The intake procedure is the `paper-intake` skill; the `literature-summaries-only` check holds the
folder to this shape.

## Papers

| Paper | What it gives us |
|---|---|
| [**green-2022-microglia-morphology-comparisons**](green-2022-microglia-morphology-comparisons.md)<br>*Sci Rep* 12:18196 — CC BY | **Why we must measure per cell**: whole-image skeleton analysis shrank effects by 67–93% and hid three of four per-cell effects. Threshold choice alone moved coverage from 36.7% to 14.8%; Sholl needs a real soma mask. Per-cell reference values (DAB, 40×, cortex). |
| [**kim-2024-microglia-morphology-pipeline**](kim-2024-microglia-morphology-pipeline.md)<br>*eNeuro* 11 — MicrogliaMorphology(R), CC BY | **The closest analogue to our setup**: mouse hippocampus, Iba1, 20× slide scanner, z-stack max-projected to 2D, 27 per-cell features in ~4 families, k-means into 4 states. Its "cell" is a thresholded blob inside an area window: touching cells are dropped, not split. Measured 2D vs 3D: 2D undercounts branches ~3× but correlates (r 0.92–0.97). |
| [**lind-holm-mogensen-2024-microglia-morphology-protocol**](lind-holm-mogensen-2024-microglia-morphology-protocol.md)<br>*STAR Protoc* 5:103467 — CC BY | **The 3D route**: 50 µm cryosections, confocal z-stacks (0.221 µm/px, 1 µm step), Imaris local-contrast surfaces, a voxel window of 18,000–180,000, then MIC-MAC features in MATLAB. Touching cells are not split: only 2% of objects pass in the example. The feature definitions live in a code repo this session could not reach. |
| [**moser-2025-ipsc-mononuclear-phagocytes**](moser-2025-ipsc-mononuclear-phagocytes.md)<br>*Adv Sci* 12:e17848 — CC BY | **The closest biology to ours**: dentate gyrus Iba1 + CD68 in aging and AD mice. Morphology is traced **by hand** (SNT on 63× confocal stacks, 0.5 µm step): branch length and Sholl area-under-curve for a few cells per mouse. CD68 is scored only as % positive (~75% in young dentate gyrus), so a per-cell CD68 amount would say more. Shows how dense and interleaved dentate gyrus arbors are. |
| [**baek-2026-opc-microglia-bmp4**](baek-2026-opc-microglia-bmp4.md)<br>*Signal Transduct Target Ther* 11:109 — CC BY-NC-ND (the owner's copy is an image-only print) | Biology, not methods: in AD-model cortex, Imaris Filament Tracer **terminal points per cell** (≈16 vs ≈7.5) and process length, CD68⁺/Iba1⁺ area, and the **20 µm soma-to-plaque** association rule. "Activated" means de-ramified. Imaging settings are only in the supplement, which was not provided. |
| [**young-2018-imagej-microglia-morphology**](young-2018-imagej-microglia-morphology.md)<br>*JoVE* 136:e57648 — CC BY-NC-ND | The classic **ImageJ skeleton + FracLac** protocol: whole-image endpoints and process length divided by a soma count, no per-cell segmentation. Its settings, and its warning that noise doubles the endpoint count and users differ by 20–25%. |
