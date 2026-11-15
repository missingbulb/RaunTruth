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
| [**young-2018-imagej-microglia-morphology**](young-2018-imagej-microglia-morphology/digest.md)<br>*JoVE* 136:e57648 — CC BY-NC-ND, digest only | The classic **ImageJ skeleton + FracLac** protocol: whole-image endpoints and process length divided by a soma count, no per-cell segmentation. Its settings, and its warning that noise doubles the endpoint count and users differ by 20–25%. |
