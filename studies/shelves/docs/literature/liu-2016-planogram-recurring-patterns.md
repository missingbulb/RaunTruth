# Liu et al. 2016 — Planogram compliance checking based on detection of recurring patterns

- **Title:** Planogram Compliance Checking Based on Detection of Recurring Patterns
- **Authors:** Song Liu, Wanqing Li, Stephen Davis, Christian Ritz, Hongda Tian (University of Wollongong, NSW,
  Australia). The PDF prints five authors; the arXiv abstract page says "Song Liu and 3 other authors".
- **Venue:** arXiv [1602.06647](https://arxiv.org/abs/1602.06647) v1, 22 Feb 2016; the PDF names no venue. The
  arXiv page adds "Accepted by MM (IEEE Multimedia Magazine) 2016" and the related DOI
  [10.1109/MMUL.2016.19](https://doi.org/10.1109/MMUL.2016.19), which was not opened, so the published version may
  differ. It extends the authors' ISM 2015 paper (their ref. [12]).
- **Licence:** none stated in the PDF. The arXiv page grants arXiv's non-exclusive distribution licence
  (arxiv.org/licenses/nonexclusive-distrib/1.0), not an open content licence.
- **PDF:** kept in the study's Drive `Literature` folder as `Planogram Compliance Checking Based on Detection of Recurring Patterns.pdf`.
- **Copy read:** the arXiv PDF, 7 pages, text layer intact.
- **Thesis:** repeated facings of one product form a *recurring pattern* that can be found without any product
  template. Find them inside planogram-derived regions, then match the found layout to the planogram by spectral graph
  matching. Over seven selected shelves this scores 90.53% against 71.84% for a SIFT template baseline.

## What it gives the study

- **Recovery from a self-learned template.** In each matched pattern, the instance with the most feature points
  becomes that product's image, which is then template-matched over the whole photo to find instances the search
  regions missed (Fig. 4(b): a third heater box outside its region recovered). For us: after Find books accepts its
  spines, crop a confident one and search its row for near-copies at a lowered threshold — matching volumes of a
  series, the same publisher band at the same height. It would complement `books.series_split` (R4), which parts a
  wide box whose marks repeat, by finding the series volumes no box reached. Fig. 4 is also the warning: the template
  is the bounding box of the features (on a Kleenex box, only the logo), so recovery gives a **location, not the
  spine's edges**; those must still come from the seam finder. The template-matching method and threshold are not
  named, and recovery was offered as a capability, not scored.
- **Cap the region to bound a cubic step.** Recurring-pattern detection costs **O(n³)** in instances; a region holds
  **at most 25 instances** (chosen empirically). On one 39-instance case, 1 / 2 / 3 regions took 489 / 195 / 136 s
  (Table III); "over 70%" faster on average is claimed "without compromising" accuracy, with no accuracy printed for
  the partitioned runs. Any super-linear per-row choice we add (SURVEY's global selection) can be capped the same way,
  per shelf.
- **A count metric to report beside, never instead of, P/R.** Per product type, `1 − |N_matched − N_expected| /
  N_expected`, averaged: the analogue of SURVEY's per-photo count error.

What it does not give: a way to find a non-repeating item, which is most books — a pattern needs at least two
instances, so repetition is a side channel for series, never a book finder. Its weak class was **poor-feature
items, 81.24%** (template baseline 55.95%), and dark plain spines are poorer still, so it will not rescue them. Shelf
rows come from the planogram XML, not from pixels; instances are circles (centre the mean of the feature points, no
edges); it reads no text.

## The numbers, and how far to trust them

Overall **90.53%** against 71.84% for a SIFT template baseline the authors implemented (prose, §IV-A). From Table II
(template / proposed): small products 40.34% / 84.44%, large quantities 51.69% / 87.57%, poor features 55.95% /
81.24%; big and rich-feature items ~95% for both. False positives below 1% (template) and below 3% (proposed), over an
unstated denominator, caused by **same-vendor look-alikes** classed as different products — the retail form of two
near-identical spines of one series read as one or as different books.

Weak: seven hand-picked shelves from an unstated number of iPad Mini photos, per-sample accuracies not printed, group
classes overlapping (heater filed Big/Medium), no variance, data not released. The planograms were drawn **by hand
to match each photo**, so every shelf is compliant by construction and the score is a detector count accuracy, with
no IoU. Read the ~19-point gain as a direction (small, numerous, poorly textured items), not an absolute.

## The authors' limitations that bear on the study

- A bad region partition loses products; template recovery is the remedy.
- Accuracy drops for small items, large quantities (dense packing) and poor texture — our thin packed and dark plain
  spines.
- Deformable packages are unsolved.

Left out: the planogram parsing and unit-square normalisation, the spectral graph-matching equations (no use without
a planogram), the GRASP pattern detector of their ref. [11], the sample table, the speed table by quantity, the
figure-by-figure descriptions and the related work; cross-checked against the full text.
