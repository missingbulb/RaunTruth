# Zhang et al. 2022 — angiogenesis-related proteins in bovine hemorrhagic mastitis

- **Title:** *DIA proteomics identified the potential targets associated with angiogenesis in the
  mammary glands of dairy cows with hemorrhagic mastitis*
- **Authors:** Quanwei Zhang\*, Xu Bai, Jun Shi, Xueying Wang, Bohao Zhang, Lijun Dai, Ting Lin,
  Yuan Gao, Yong Zhang, **Xingxu Zhao\*** (\*corresponding). Gansu Agricultural University,
  Lanzhou, China.
- **Venue / id:** *Frontiers in Veterinary Science* (2022) **9:980963**, Original Research.
  Published 08 Aug 2022. DOI **10.3389/fvets.2022.980963**. 15 pages.
- **Licence:** **CC BY** (stated on page 1: "distributed under the terms of the Creative Commons
  Attribution License (CC BY)").
- **PDF:** kept in the study's Drive `Literature` folder as `DIA proteomics identified the potential targets associated with angiogenesis in the mammary glands of dairy cows with hemorrhagic mastitis.pdf`, not in the repo.

---

## 1. What it gives the study

**Almost nothing; nothing here changes the extraction, the metrics or ground truth.** A proteomics
paper on cow mammary gland (n = 3 hemorrhagic mastitis vs 3 healthy), whose vessel imaging is
qualitative illustration. It reports **no vessel quantification of any kind**: no density, count,
area, diameter, length or branching, and no image-analysis method. "Angiogenesis" is inferred from
GO/KEGG term membership, never measured.

Two marginal points, for completeness of the corpus:

- **What a CD31 channel looks like when it fails.** Fig 8 row B shows CD31 alone (Cy5) on 5 µm
  paraffin sections on a Pannoramic DESK slide scanner (not a confocal): weak and punctate, the
  capillary panels (B5, B6) mostly speckle, and in the disease panels (B2, B4, B6) the vessel outline
  is barely recoverable without the authors' drawn dashed outline. An example of a channel a
  segment-and-skeletonize pipeline would fail on, not an input.
- **Arteriole, venule and capillary told apart by α-SMA**, which is far brighter and more
  continuous than CD31 in the same sections: the marker-not-caliber logic Stefanitsch 2015 and
  Wang 2022 give quantitatively.

## 5. Why no panels

Every vessel shown is a single cross-section in a 5 µm section, not a network, overdrawn with
white dashed outlines and text labels; no imaging parameter (objective, pixel size, scanner
setting) is stated, and the captions' scale bars disagree with the drawn ones (Figs 1, 7, 8).
Nothing enters `VESSEL_*`.

Left out: the proteomics, candidate-protein selection, CAV1 qPCR, western blot and IHC, histology,
and figure descriptions; none bears on the study.
