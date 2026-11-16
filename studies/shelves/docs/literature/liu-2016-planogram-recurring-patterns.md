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
- **Copy read:** the arXiv PDF, 7 pages, text layer intact; all six embedded figures looked at.
- **Thesis:** repeated facings of one product form a *recurring pattern* that can be found without any product
  template. Find them inside planogram-derived regions, then match the found layout to the planogram by spectral graph
  matching. Over seven selected shelves this scores 90.53% against 71.84% for a SIFT template baseline.

**Why it matters to our task:** it is the one template-free method in the retail literature. It finds look-alike
neighbours because they repeat, which is how a run of one series' spines looks on a shelf. Two of its pieces
transfer as ideas. One is to **learn a template from the instances already found and search the whole image with it
for the ones missed**. The other is to cap the size of each search region so a cubic-cost step stays affordable. What
it does **not** give us: any way to find a single, non-repeating item, which is most books. It also takes its shelf
rows from the planogram XML, not from pixels, uses no box geometry finer than a circle per instance, and reads no text.

---

## 1. Setting

Input: one store-shelf photo and its **planogram as XML**. The parsed planogram gives the number of rows on the
shelf, the number of products in each row and the type of each product. No product images are used. Output: for each
product type, which facings are present (compliant), which detections match nothing (non-compliant) and which
planogram slots are empty.

## 2. Method, step by step

**Step 1 — Planogram parsing and region partition** (§III-A, Fig. 2(b)–(f)).
- The shelf is drawn as one rectangle and divided **vertically into identical rows**, one per planogram row. Each row
  is divided **horizontally into equal boxes**, one per product in that row. Product positions become box centres in
  a unit square: shelf top-left (0, 0), bottom-right (1, 1). These centres form `PointSet_planogram = {P_1 … P_M}`,
  with one point set `P_i` per product type (Eqs. 1–2).
- The product boxes are overlaid on the photo. For each product type, the area its boxes cover is grouped into one
  **rectangular search region** and extended by **a margin**. The margin's size is not stated.
- A region may hold **at most 25 product instances**, chosen empirically to balance detection time against the cost
  of merging. A product type with more instances is split into more regions.
- How the planogram rectangle is placed on the photo is not described: whether by hand, by detection or by assuming
  the shelf fills the frame. Fig. 2(e) shows it already aligned.

**Step 2 — Recurring-pattern detection in each region** (§III-B, Fig. 2(g)–(h)). This adopts Liu & Liu, CVPR 2013
(their ref. [11]) unchanged.
- A recurring pattern is a 2-D **feature-assignment matrix**. Rows are visual words, and the feature points in a row
  must look alike. Columns are visual objects (instances), and the layout of the points in a column must match the
  layout in the other columns. An energy function rewards both kinds of consistency; its form and weights are not
  given here.
- This joint assignment is NP-hard. It is optimised by **GRASP** (greedy randomised adaptive search) with "local
  moves": add or delete a row or column, and modify entries. The moves are applied stochastically, and each local
  optimum is one candidate pattern.
- Each detected instance becomes a **circle**. Its centre is the mean of its feature points. Its radius is the mean
  of the width and height of the bounding box of those points (Eqs. 3–4).
- **Merging across regions:** for two patterns from different regions that belong to the same product type, any pair
  of overlapping circles is combined into one. How two patterns are judged to be the same product type before merging
  is not stated.
- The feature detector and descriptor are not named in this paper (they are in ref. [11]).

**Step 3 — Compliance checking by graph matching** (§III-C, Fig. 2(i)–(k)).
- The instance centres of each detected pattern are normalised into the unit square of **their own** minimum
  bounding box: `PointSet_detected = {R_1 … R_N}` (Eqs. 5–6). That box's `Height_box` and `Width_box` are kept.
- **Pairwise spectral matching** (Leordeanu & Hebert 2005) runs between every planogram set `P` (m points) and every
  detected set `R` (n points). For candidate assignments a = (p_i, r_i′) and b = (p_j, r_j′):
  `U(a, b) = exp(−Δ_dh²/δ_dh − Δ_dv²/δ_dv)` (Eq. 7), where
  `Δ_dh = max(dis_h(p_i, r_i′), dis_h(p_j, r_j′))` and `Δ_dv` is the vertical analogue (Eqs. 8–9). The weights are
  **stated**: `δ_dh = (W/(H+W))²` and `δ_dv = (H/(H+W))²`, with W and H the detected bounding box's width and
  height. U is a sparse, symmetric, non-negative k × k matrix with k = m·n.
- The solution is the **principal eigenvector** of U, binarised by a greedy pass. The score `S = xᵀUx` (Eqs. 10–11)
  is kept.
- This fills an M × N matrix of scores (planogram types × detected patterns). A second greedy pass takes the highest
  score, rejects every conflicting match and repeats, giving **one recurring pattern per planogram product type**.
- **Verdict:** a detected instance matched to a planogram point is compliant (TP). One matched to no planogram point
  is non-compliant (FP). A planogram point matched by no instance is **empty**, which is also non-compliant.

**Step 4 — Product-image extraction and recovery** (§IV-C, Fig. 4). This is an addition over the ISM 2015 paper.
- In the pattern matched to a product type, the **instance with the most feature points** is taken as the most
  representative. The bounding box of its feature points becomes that product's image.
- That image can then be **template-matched over the whole photo** to find instances the region partition missed.
  The one example is a convection heater lying outside its search region (Fig. 4(b); the text calls it "Fig 6",
  which does not exist). The template-matching algorithm and its threshold are not named. The paper offers this as
  a capability, not as part of the scored pipeline.

## 3. Data and metric

- **Data:** a set collected at "a supermarket chain" with an iPad Mini (1st gen, 5 MP camera). The number of images
  is **not stated**. Results are given for **seven selected samples**, "due to the limit of space". The data are not
  released.
- **Implementation:** C++ on a PC with a 3.4 GHz Intel Core i7.
- **Ground truth:** planogram XML files were **created by hand to match each photo**. Every test shelf is therefore
  compliant by construction, and the compliance accuracy doubles as the detector's accuracy. No real non-compliance
  case is tested.
- **Metric:** per product type, `1 − |N_matched − N_expected| / N_expected`, averaged over the types in a case. It is
  a **count** comparison. It does not check that a matched instance sits where the planogram puts it, beyond what the
  graph matching enforced, and it has no IoU.
- **Baseline:** templates are cropped from images taken with a high-resolution camera. SIFT keypoints and
  descriptors are extracted, the input is split into non-overlapping segments, and each segment is brute-force
  matched against every template. A match counts when the number of matched descriptors exceeds a threshold, whose
  value is not stated.

Table I, the seven samples:

| Sample | Product size | Product quantity | Feature quality |
|---|---|---|---|
| Toilet paper | Big | Small | Rich |
| Heater | Big/Medium | Medium/Small | Medium |
| Coke | Big | Medium/Small | Rich |
| Cereal | Medium | Small | Rich |
| Shampoo | Small | Medium/Small | Poor |
| Tissue | Small | Large | Medium |
| Chocolate | Small | Large | Poor |

The size, quantity and quality classes have no numeric definitions.

## 4. Results

Overall compliance accuracy: **proposed 90.53%**, template-based 71.84% (prose, §IV-A).

Table II, compliance accuracy by group (template-based / proposed):

| Group | Template-based | Proposed |
|---|---|---|
| Size: big | 94.60% | 95.90% |
| Size: medium | 89.82% | 90.61% |
| Size: small | 40.34% | 84.44% |
| Quantity: large | 51.69% | 87.57% |
| Quantity: medium | 79.43% | 87.85% |
| Quantity: small | 91.25% | 92.94% |
| Features: rich | 95.71% | 96.03% |
| Features: medium | 82.49% | 91.77% |
| Features: poor | 55.95% | 81.24% |

- **False positives:** below 1% for the template method and below 3% for the proposed one, averaged over "the entire
  set of testing images" (prose; denominator not stated). The false positives come from **same-vendor look-alikes**
  classed as different products: different tissues, and different shampoos from one brand.
- **Viewpoint:** the proposed method is said to work on non-front views, and the template method is said to be
  unsuitable there. This is qualitative only (Fig. 3(b)); no number is given.

Table III, speed:

| Quantity | Template-based | Proposed |
|---|---|---|
| Large | 274 s | 478 s |
| Medium | 166 s | 359 s |
| Small | 147 s | 127 s |

| Tissue sample, 39 instances of one type | Regions | Expected instances per region | Time |
|---|---|---|---|
| | 1 | 39 | 489 s |
| | 2 | 20 | 195 s |
| | 3 | 13 | 136 s |

Recurring-pattern detection costs **O(n³)** in the number of instances and dominates the run time. Partitioning is
claimed to improve speed "by over 70%" on average "without compromising" accuracy. Only the tissue run is shown,
where 489 → 136 s is a 72% cut, and no accuracy is printed for the partitioned runs.

**Trust:** seven hand-picked shelves, and the per-sample accuracies are not printed. Group means mix samples that
Table I files under two classes at once (heater Big/Medium), so which sample counts where is not reproducible. The
planogram is a perfect hand-made reference, there is no variance, and the baseline was implemented by the authors.
The ~19-point overall gain is credible as a direction, mainly on small, numerous and poorly textured items. As an
absolute number it is weak.

## 5. Discussion and the authors' limitations

- Accuracy drops for small products (less texture in frame), large quantities (small items come packed densely) and
  poor feature quality (too few visual words to form a pattern).
- Template methods also suffer from out-of-date templates, seasonal packaging and template viewpoint. Avoiding those
  is the case for going template-free.
- A **bad region partition loses products**. Recovery by extracted template is the stated remedy.
- **Deformable packages** (chips) are unsolved; that is their stated future work.
- They know of no other planogram-compliance method that works without templates.

## 6. Gaps — what the paper does not state

- The number of images in the data set, and the per-sample accuracies.
- How the planogram rectangle is registered onto the photo.
- The search-region margin.
- The feature detector and descriptor, the energy function's form and weights, and the GRASP iteration count and
  stopping rule (all deferred to ref. [11] or simply absent).
- How patterns from different regions are judged to be one product type before their circles merge.
- The greedy binarisation threshold on the eigenvector.
- The template-matching algorithm and acceptance threshold used for recovery, and whether recovery was part of the
  scored runs.
- The baseline's segment size and match-count threshold.
- The FP-rate denominators.
- Any accuracy for the partitioned speed runs.

## 7. What is not in this article

- No supplementary material and no code is referenced. The arXiv page lists none.
- The ISM 2015 predecessor (Liu & Tian, ref. [12]) holds "intermediate results on recurring pattern merging". It was
  not fetched.
- The IEEE MultiMedia version (DOI above) was not opened; it may carry edits.
- The recurring-pattern detector itself is Liu & Liu, CVPR 2013, "Grasp recurring patterns from a single view". Its
  energy and moves are only summarised here.

## 8. Figures

- **Fig. 1:** a planogram drawing beside a compliant photo of the same end-cap. The planogram has six rows of
  "Be Natural" products drawn as labelled boxes; the top two rows split into narrower facings (nut bars, trail-bar
  flavours) and the lower rows into four or three wide facings. The photo is a frontal shot of a gondola: muesli-bar
  and cereal boxes in neat facings, other products visible at both sides of the frame, and price tags on the shelf
  lips. It illustrates the task only.
- **Fig. 2, the block diagram.** It is the only place several steps are shown.
  - (a) The input photo: a tall end-cap with milk bottles on top and four rows of "Plus" cereal.
  - (b) An XML stub, and (c) the parsed planogram: a grey shelf with yellow rows and coloured product boxes.
  - (d) The planogram points in a unit square, one colour per type.
  - (e) The product boxes projected onto the photo, with a red search region drawn around the top milk row.
  - (f) The cropped region.
  - (g) The bottles, each carrying the same coloured feature points (one colour per visual word) joined by black
    lines (one graph per object).
  - (h) A circle on each bottle.
  - (i) The merged patterns: overlapping circles of many colours on the cereal rows, inside a red box labelled
    (0, 0) to (1, 1).
  - (j) The detected points normalised to that box.
  - (k) Lines joining each planogram point to its matched detected point.
  - **What you see:** the detected points in (j)–(k) form looser, multi-coloured clusters than the clean planogram
    grid. Several detected patterns sit near each planogram slot, which is why a second greedy one-to-one step is
    needed.
- **Fig. 3(a), front views; left the template method, right the proposed one.** It has four rows.
  - Coke cases: the template method gives green boxes labelled `s:0`–`s:3`. The proposed method draws yellow circles
    on the red Coke cases, grey-green on the black Zero cases and teal on the silver cases.
  - The cereal end-cap: the template method boxes only some facings and runs together the labels on the milk row. The
    proposed method circles every milk bottle in black and gives each cereal pair its own colour.
  - A Kleenex tissue stack: the template method boxes perhaps a third of the boxes. The proposed method circles almost
    every visible box, black on the left half and purple on the right, so the stack is read as two product types.
  - Cadbury chocolate in a tiered display: the template labels overlap into an unreadable band. The proposed method
    puts a yellow circle on nearly every bar.
  - **What you see:** the template method's misses are concentrated on small, numerous items, as Table II says. The
    circles mark presence, not extent; no box edge is estimated.
- **Fig. 3(b), oblique views, proposed method only.**
  - Toilet paper: purple P0 circles on three columns of Kleenex packs and red P1 on a narrow fourth column.
  - Heaters: cream P2 circles on the fan-heater boxes and magenta P1 on a second type. Of the three large convection
    heater boxes on the floor, only the two lower ones are circled in dark red; this is the miss Fig. 4(b) recovers.
    Several small, stray circles sit in the fourth row.
  - Shampoo: a tall gondola, each row of bottles circled in its own colour. In the bottom row some red bottles carry
    no circle, and the circles in the third row (deodorant cans) are small and sparse.
  - **What you see:** angled shelves with converging rows still give one pattern per row. Misses cluster on glossy
    bottles and on the edges of the frame.
- **Fig. 4(a), product-image extraction.**
  - Four Kleenex boxes, each with coloured feature points and their connecting lines. A blue box marks the instance
    with the most points, and the crop taken from it shows **only the "Kleenex" logo**, not the box.
  - Three Uncle Tobys Oats boxes: the points spread over the face, and the crop covers the middle of the package but
    cuts off the "UNCLE TOBYS" banner.
  - **What you see:** the extracted "product image" covers where the features are, which can be far smaller than the
    product.
- **Fig. 4(b), recovery.** A red search region holds two convection-heater boxes (black P0 circles); the third box
  sits above the region and was missed. The extracted patch, a narrow crop of the heater illustration, is
  template-matched over the photo, and the right panel shows **three** black rectangles, one per box. Each rectangle
  is drawn around the heater picture, not the whole box. The recovered box is found, but its extent is the template's,
  not the product's.

Figures have no standalone URLs; the arXiv HTML view (ar5iv) shows them in the page.

## 9. What transfers to a bookshelf, and where we diverge (our inference)

- **Repetition is a cue only for series.** Most shelves carry each spine once, and a pattern needs at least two
  instances. At best this is a side channel for runs of a uniform edition or matching volumes, never a book finder.
  Poor-texture items were its weak class (81%), and dark plain spines are poorer still, so the cost does not pay.
- **Self-learned templates for recovery are the transferable piece.** After the primary finder accepts spines, crop
  a confident spine and search along the row for near-copies at a lowered threshold, for example the same publisher
  band at the same height. This is Fig. 4(b) applied to series volumes. Fig. 4 is also the warning: a template built
  from where the features are recovers the *location*, not the spine's true edges. The edges must still come from
  the seam finder.
- **Capping region size to bound a super-linear step** carries over to any per-row optimisation we run. Their cap is
  in instances (25), not pixels.
- **Shelf rows from the planogram do not transfer.** We have no external reference, so the rows must come from the
  image (see the topics note on shelf structure). The unit-square normalisation and spectral matching have no use
  without a planogram. A previous inventory of the same shelf could play that role, but nothing here tests it.
- **Their metric is a count**, insensitive to where an instance is. For us it is the analogue of per-row count error,
  worth reporting next to box-level precision and recall but never instead of them.

## 10. Deliberately omitted

Cross-checked against the full 7-page text. Omitted:
- the business motivation and the template-maintenance argument beyond one line;
- the related-work survey (Auclair, Winlock, Kleban, Varol & Kuzu, latent-topic models, and the three families of
  co-detection methods);
- the acknowledgement.
