# Literature — source papers

One folder per paper, self-contained: a digest written so the PDF never has to be reopened, and every
figure described. This repository is public, so a paper under a licence that forbids redistribution
or derivatives (CC BY-NC-ND, all rights reserved) keeps only its digest and figure descriptions; the
PDF and figure images are committed only under an open licence such as CC BY. The layout and the
intake procedure follow the vascular study's `paper-intake` skill, minus its vessel-panel
calibration steps.

```
literature/
  README.md          <- you are here: the paper index
  SYNTHESIS.md       <- cross-paper: what the literature measures, how, and what it means for us
  <first-author>-<year>-<short-topic>/
    digest.md        self-contained digest
    figures/
      README.md      every figure, described panel by panel
      figN_*.png     the figures themselves (open licences only)
```

## Papers

| Paper | What it gives us |
|---|---|
| [**green-2022-microglia-morphology-comparisons**](green-2022-microglia-morphology-comparisons/digest.md)<br>*Sci Rep* 12:18196 — CC BY, PDF and figures included | **Why we must measure per cell**: whole-image skeleton analysis shrank effects by 67–93% and hid three of four per-cell effects. Threshold choice alone moved coverage from 36.7% to 14.8%; Sholl needs a real soma mask. Per-cell reference values (DAB, 40×, cortex). |
| [**kim-2024-microglia-morphology-pipeline**](kim-2024-microglia-morphology-pipeline/digest.md)<br>*eNeuro* 11 — MicrogliaMorphology(R), CC BY, PDF and figures included | **The closest analogue to our setup**: mouse hippocampus, Iba1, 20× slide scanner, z-stack max-projected to 2D, 27 per-cell features in ~4 families, k-means into 4 states. Its "cell" is a thresholded blob inside an area window: touching cells are dropped, not split. Measured 2D vs 3D: 2D undercounts branches ~3× but correlates (r 0.92–0.97). |
| [**lind-holm-mogensen-2024-microglia-morphology-protocol**](lind-holm-mogensen-2024-microglia-morphology-protocol/digest.md)<br>*STAR Protoc* 5:103467 — CC BY, PDF and figures included | **The 3D route**: 50 µm cryosections, confocal z-stacks (0.221 µm/px, 1 µm step), Imaris local-contrast surfaces, a voxel window of 18,000–180,000, then MIC-MAC features in MATLAB. Touching cells are not split: only 2% of objects pass in the example. The feature definitions live in a code repo this session could not reach. |
| [**young-2018-imagej-microglia-morphology**](young-2018-imagej-microglia-morphology/digest.md)<br>*JoVE* 136:e57648 — CC BY-NC-ND, digest only | The classic **ImageJ skeleton + FracLac** protocol: whole-image endpoints and process length divided by a soma count, no per-cell segmentation. Its settings, and its warning that noise doubles the endpoint count and users differ by 20–25%. |
