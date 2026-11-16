# Ray et al. 2018 — U-PC: Unsupervised Planogram Compliance

- **Title:** U-PC: Unsupervised Planogram Compliance
- **Authors:** Archan Ray (UMass Amherst), Nishant Kumar (SMART-FM, Singapore), Avishek Shaw (TCS Limited, India),
  Dipti Prasad Mukherjee (Indian Statistical Institute, Kolkata)
- **Venue:** ECCV 2018. The CVF open-access page ([html](https://openaccess.thecvf.com/content_ECCV_2018/html/Archan_Ray_U-PC_Unsupervised_Planogram_ECCV_2018_paper.html))
  gives booktitle *Proceedings of the European Conference on Computer Vision (ECCV)*, September 2018, with no pages
  and no DOI. The PDF's header says it is the author-created version, identical in content to the LNCS version on
  SpringerLink. The Springer DOI and page range were not verified here.
- **Licence:** none stated in the PDF beyond that CVF provision notice.
- **PDF:** kept in the study's Drive `Literature` folder as `U-PC - Unsupervised Planogram Compliance.pdf`.
- **Copy read:** the CVF PDF, 15 pages. Its Type-3 fonts carry no usable text mapping, so a plain text extraction
  gives dingbats. The text was decoded from the glyph codes, and the formula passages were checked against page
  renders.
- **Thesis:** the method scans a single-shelf image column by column. At each column it ranks every catalogue product
  by Lab correlation over a range of scales and keeps the top 3. It re-scores those 3 with a stripped-down SURF and
  then picks the arrangement of the whole shelf at once, as the **maximum-weight path through a DAG** whose edges
  require the next product to start at least one product-width further on.

## What it gives the study

**The simplest exact form of SURVEY's "over-generate, then choose once", for one shelf row.** Find books today keeps
or merges edges pair by pair (`CROWD`, the lonely veto), and its open failures — merged close lines, a book split at
its lettering, boxes on posts — are what a pairwise rule gets wrong. U-PC's step maps onto a row directly:

- **Nodes** are candidate spine spans [x₀, x₁) on a levelled shelf (from pairs of our Sobel edges, text-column gaps
  and Felzenszwalb regions), plus a source and a sink.
- **An edge** joins a span to every span starting at or after x₁; overlaps are impossible.
- **The max-weight source-to-sink path** is the best non-overlapping set of spines in the row. U-PC runs
  Bellman–Ford on negated weights; on a DAG a dynamic programme in left-to-right order is exact and linear in the
  edges (our remark), cheap enough for Pyodide.

Three divergences decide whether it works for us (our inference):

- **The score must not reward splitting.** U-PC sums a positive match strength along the path, and Fig. 9(a) shows
  the consequence: correlation alone fills a shelf with many small wrong items that together outscore a few right
  large ones. On spines that is over-splitting. A span's weight must be calibrated so two halves of one spine never
  beat the whole — a log-likelihood ratio against "not a spine", or a per-width score with a cost per extra node.
- **Gaps are free in U-PC; for us a gap should cost its unexplained width**, or the path will leave real dark plain
  spines out.
- **U-PC knows each product's width from its catalogue**; we do not, so its "top 3 products per column" becomes
  "top-k spans starting at each edge", widths from our edge pairs.

What it does not give: any detector without a catalogue image and a known physical width per product
("unsupervised" means no planogram and no training, not no templates); finding shelves in a rack photo (every input
is already a one-shelf strip; how racks are cut is not described); vertical placement of a crop; a box metric;
reading. Its columns are assumed upright, so our lean must be removed per row before a 1-D model applies.

## The supporting detail

- **Hypotheses:** every pixel column; each catalogue image rescaled by the known shelf and product dimensions, then
  isotropically over a range up to the shelf height; Pearson correlation per L, a, b channel, averaged, summed over
  scales; **top m = 3** per column, which "consistently" keeps the right product. More elaborate first-layer matchers
  made no significant difference (none named, no numbers): the coarse layer need only keep the answer in the top 3,
  the joint step decides. Fig. 3's margins show the cut is tight: at column 2 the fourth product scores ~2.05 against
  the third's ~2.15 (by eye).
- **Re-score:** a SURF with no rotation invariance (shelf slant "typically ±15°"), kernels capped at 51 × 51, the two
  lower octaves; a match needs distance ≤ 0.04 and a best/second ratio < 0.4. Composite C_s = U^{C_r} (U the match
  count, C_r the correlation sum); U = 0 and negative C_r are not discussed. Correlation alone and keypoints alone
  each fail (Figs. 9(a), 10(a)); the product of the two fixes both.
- **The §2.6 "proof"** that the path recovers the true arrangement assumes ideal crops and uniform keypoints; it is
  an informal argument, not a guarantee on real scores.
- **Stated gaps that a port would meet:** the value of ε on source and sink edges; which width the edge rule uses for
  a scaled match; the scale step.

## The numbers, and how far to trust them

Data: ~750 catalogue products, "more than 2000" in-house shelf images in 150 racks (not released), and unnamed
subsets of WebMarket and Grocery Products. A hit is the right product at column i ± δ, **δ = 75 mm on a ~1000 mm
shelf** (7.5% of its width) — far too loose to mirror for 15-px spines; a δ for us would be a fraction of the local
median spine width.

Table 1 (accuracy, %):

| Method | In-house | WebMarket | Grocery |
|---|---|---|---|
| Proposed | **92.4** | **90.8** | 88.51 |
| MIC (George & Floerkemeier) | 91.2 | 54.41 | 69.23 |
| "NMS [4]" (Felzenszwalb et al. DPM) | 47.56 | 51.02 | **96.67** |

(Zhang et al.'s S1–S3 score 36–68.69.) The table contradicts the abstract's "better than the competing approaches
by at least 10%": on Grocery the DPM entry beats U-PC by 8.2 points, and in-house MIC is within 1.2. The authors note
the scores are not like for like — theirs include localisation, the competitors' are recognition only — and do not
say whether competitors were re-run. Over 150 racks (Fig. 11(b) bar labels) 54 are at 91–100% and 48 at 81–90%, 48
below 81%; no pooled mean. Own data, own ground truth (annotation undescribed), no variance. Reasonable evidence that a
joint path over top-3 hypotheses works with a good catalogue and known widths; weak beyond that.

The stated failure: a product set back from the shelf front is misidentified (Fig. 7(a)) — the retail form of a book
pushed back on its shelf.

Left out: the catalogue-size stress test and its timings, the ROC, the per-category product counts, the confusion
definitions and the figure-by-figure descriptions; cross-checked against the full text.
