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

**Why it matters to our task:** its graph step is a **1-D, global, non-overlapping choice along a shelf row**. That is
the bookshelf problem's shape, and it is the "over-generate, then choose once" idea in its simplest form. Candidates
are (column, item, width); an edge exists only when the next item starts after this one ends; the best-scoring path
is the shelf's reading. A spine row maps onto it directly, with seam-pair spans as the candidates. What it does
**not** give us: any detector that works without a catalogue image and a known physical width for every product
("unsupervised" here means no planogram and no training, not no templates). It also has no vertical localisation,
no way of finding the shelves in the image, no box metric, and nothing on reading text.

---

## 1. Setting

- **Known in advance:** a dataset D of N product images, taken under marketing-quality lighting (Fig. 1(b)–(e)), and
  the **physical dimensions** of every product and of the shelf, in any unit of length.
- **Not known:** the planogram. There is no prior on which product is where, so recognition and localisation are
  solved together.
- **Input image:** I_s, from a hand-held camera of any make under store lighting. Every example shown is a **strip
  of one shelf row**. How a rack photo is cut into rows is not described.
- **Output:** a "reconstruction": the sequence of recognised products along the shelf, each at its column, drawn as
  the catalogue images laid out in a row (Figs. 6–10).

The motivating failure: if product a is misread as c, and c is wider than a, the crop for a's neighbour b lands in
the wrong place. Neighbours must therefore be decided jointly.

## 2. Method, step by step

**Step 1 — Rescaling.** Each catalogue image D_p is converted to I_s's length-to-pixel scale using the known shelf and
product dimensions, giving D′_p. The authors call this "an approximation", and they say it does not give the
product's true scale in I_s.

**Step 2 — Hypothesis generation** (§2.1, Algorithm 1).
- `[h, c] = size(I_s)`, so **every pixel column i = 1…c is a location**. Fig. 3 refers to columns 2, 32 and 180.
- At each column, for each product p, a patch the size of D′_p is cropped at column i and compared with D′_p. The
  score is the **Pearson correlation coefficient computed separately in L, a and b, then averaged** (`match_score`).
- Scale is unsure, so D′_p is also scaled isotropically by **k ∈ [−l/2, l/2]**. Each scale gives one more crop
  scored against the scaled D′_p, so there are N + N·l crops per column.
- The range is fixed by the shelf. A product cannot be taller than the shelf, so D′_p is upscaled until its height
  equals the shelf height (aspect ratio kept). That amount is l/2, and D′_p is downscaled by the same amount.
- The scores are **summed** over a product's scales into a cumulative score `Cr[i, p]`. It is not a mean: Fig. 3
  shows values up to ~3.2 and below 0. The **top m** products by Cr at column i are its hypotheses, with **m = 3**,
  which "consistently" keeps the correct product (§2.2).
- The vertical placement of each crop (top-aligned, bottom-aligned or searched) is not stated.
- **Matching strategies (§2.2):** the authors tried "several" more elaborate matchers and saw no significant
  difference in keeping the right product within the top m. They name none and give no numbers.
- **Worked example (Fig. 3, 19 test products):** at column 2 the top 3 are products 12, 19 and 3, and at column 32
  they are 7, 3 and 12. Read off the plot by eye, the column-2 margin is thin: product 7 scores ~2.05 against
  product 3's ~2.15.

**Step 3 — Neo SURF (NSURF) score** (§2.3). SURF is modified in three ways (the text says "two aspects", then lists
three):
1. **No rotation invariance.** Box slant on a shelf is "typically ±15°", which does not disturb SURF keypoints.
2. **Kernel size capped at 51 × 51**, because large kernels make SURF poor on very small images.
3. **Only the two lower octaves are used.**

It runs on the top-m crops at column i and on D′_p, giving 64-D descriptors. A keypoint pair matches when its
Euclidean distance **θ ≤ 0.04** *and* the ratio of the best to the second-best distance is **< 0.4**. The NSURF score
U is the number of matched keypoints.

**Step 4 — Composite score** (§2.4, Eq. 1): **C_s = U^{C_r}**. The argument: U is a positive integer and far larger
than C_r, and it discriminates better. C_r should be similar for similar products, so raising U to C_r "magnifies"
the differences. Two cases are not discussed: U = 0, and negative C_r (Fig. 3), which sends C_s below 1.

**Step 5 — DAG and maximum-weight path** (§2.5).
- **Nodes:** v_ij is the j-th of the top m products at column i, so there are c·m nodes. A source S and a sink T are
  added, for **cm + 2** in total.
- **Edges:** S → every node with weight ε, and every node → T with weight ε (ε is not given a value).
- **v_ij → v_op exists iff (o − i) ≥ width(D′_j)**, with weight **C_s[i, j]**. The next product may start anywhere at
  or beyond the end of this one, so gaps cost nothing and overlaps are impossible.
- The authors call the max-weight path NP-hard in general. They negate the weights and run **Bellman–Ford**
  (Cormen et al.) for the minimum path. On a DAG this could be done in linear time in topological order; that remark
  is ours, not theirs.
- **The §2.6 "proof"** that the path recovers the true arrangement: polynomial construction (Algorithm 1 O(n⁴),
  scoring O(n), graph O(n)). The argument assumes ideal crops with correlation 1, NSURF keypoints spread uniformly,
  and false matches whose count grows sub-quadratically with width. Under those assumptions a path through the two
  true products beats any path through several false ones. It is an informal argument, not a proof that holds on
  real scores.

## 3. Data and metric

- **In-house:** about **750 products in 7 categories**. By eye from Fig. 5: Cookies ~250, Shampoo ~132, Tea & Coffee
  ~131, Deo ~126, Others ~93, Dairy ~21, Paper Towel ~6. The shelf images number **"more than 2000"**, from stores and
  a lab, organised as **150 racks** of several shelves each. They are not released.
- **Public:** "subsets" of **WebMarket** (Zhang et al. ACCV 2007, "Where's the Weet-Bix?") and **Grocery Products**
  (George & Floerkemeier ECCV 2014). Which subsets is not stated.
- **Localisation tolerance:** a prediction at column i ± δ counts as correct, with **δ = 75 mm on a shelf of about
  1000 mm** (7.5% of the shelf width).
- **Per-product confusion counts** (over the r products on a shelf, r ≪ N):
  - TP: A is present at i and predicted at i ± δ.
  - FP: another product is at i and A is predicted there.
  - TN: another product is at i and A is not predicted.
  - FN: A is at i and another product is predicted.
  - TPR = TP/(TP+FN) and FPR = FP/(FP+TN).
- **Rack accuracy:** matches between the reconstruction and the ground truth, divided by the number of products in
  the rack. How the ground truth was annotated is not described.

## 4. Results

**Table 1** (accuracy, %; the paper's own table):

| Method | In-house | WebMarket | Grocery |
|---|---|---|---|
| Proposed | **92.4** | **90.8** | 88.51 |
| S1 (Zhang et al.) | 41.6 | 62.03 | 51.28 |
| S2 (Zhang et al.) | 41.2 | 68.69 | 53.43 |
| S3 (Zhang et al.) | 36 | 59.29 | 63.05 |
| MIC (George & Floerkemeier) | 91.2 | 54.41 | 69.23 |
| "NMS [4]" (Felzenszwalb et al. DPM) | 47.56 | 51.02 | **96.67** |

- **The table does not support the abstract's "better than the competing approaches by at least 10%".** On Grocery
  the DPM entry beats the proposed method by 8.2 points. In-house, MIC is within 1.2 points.
- The authors note the scores are **not like for like**. Theirs includes localisation (within ±δ); the competitors'
  figures are recognition only, with no localisation penalty. They do not say whether they re-ran the competitors or
  copied numbers, nor which subsets they used.
- "NMS [4]" is their label for reference [4], the deformable-part-model detector. Nothing explains the name.

**Fig. 11(b), rack-wise accuracy over 150 racks** (bar labels): 51–60%: 1; 61–70%: 2; 71–80%: 45; 81–90%: 48;
91–100%: 54. So 36% of racks are at 91% or better, and 32% are below 81%. A pooled mean is not given.

**Fig. 11(a), ROC over "2000 shelf images"** (by eye):
- Proposed: a near-vertical rise to TPR ~0.92 at FPR ~0, then a straight line to (1, 1).
- Block-histogram matching (Merler et al.): TPR ~0.32 at FPR ~0.07, then straight to (1, 1).
- Each curve has a single operating point, so these "ROCs" are one point each joined to the corners. AUC is
  described as "significantly better" but not given.

**Fig. 12, stress test.** 500 Cookies shelf images, camera angle varied within ±15° and at several distances, 9
products on the shelves. D is grown from 9 to 285 images "in steps of 30" (the points sit at 9, 30, 60 … 270 and
285). The added products are absent from the shelves. Accuracy and time below are read off the plot and its point
labels:

| \|D\| | Proposed acc. / time | Block histogram acc. / time | DPM ("NMS") acc. / time |
|---|---|---|---|
| 9 | ~99% / 24 s | ~65% / 25 s | ~54% / 144 s |
| 30 | ~97% / 36 s | ~45% / 126 s | ~47% / 648 s |
| 90 | ~96% / 84 s | ~21% / 378 s | ~42% / 1656 s |
| 150 | ~96% / 120 s | ~24% / 579 s | ~45% / 2450 s |
| 285 | ~92% / 240 s | ~18% / 1151 s | ~51% / 4025 s |

The proposed method's time grows roughly linearly with |D|, and its accuracy declines slowly. Whether the times are
per image or for the whole set is not stated, and neither is the hardware.

**Qualitative (Figs. 6–10):**
- Look-alike variants are told apart (a red vs a green stripe on two Chocos boxes).
- A Surf bottle and a Surf pouch sharing one front design are both correct.
- Strong specular glare is survived.
- **The stated failure:** a product set back from the shelf front is misidentified (Fig. 7(a)).

**Trust:**
- The in-house data, ground truth and baselines are the authors' own, and there is no variance.
- The headline comparison mixes metrics, and its own table contradicts the abstract.
- The ±δ tolerance (7.5% of shelf width) is loose for narrow items: a ~75 mm window spans two or three slim products.
- The ~92% is reasonable evidence that DAG selection over top-3 hypotheses works with a good catalogue and known
  widths. It is weak evidence for anything beyond that.

## 5. Discussion arguments worth keeping

- **Neighbours must be decided together:** choosing the best product per column greedily breaks, because the best
  at column i may overlap a better one inside its own width.
- **Coarse matcher, then a joint choice:** the first layer only needs to keep the right answer in the top 3; the
  joint step does the deciding. Elaborate first-layer matchers did not help.
- **Correlation and keypoints are complementary.** Correlation alone fills the shelf with wrong small items
  (Fig. 9(a)), and NSURF alone confuses variants of one brand (Fig. 10(a)); the product of the two fixes both.
- **Future work:** single-instance learning folded into the graph search.

## 6. Gaps — what the paper does not state

- How a rack image is divided into single-shelf strips, and how the shelf's ends are found. They state only that
  "it is impossible to find the exact boundary of the shelf" in a hand-held photo, and use the shelf *height* as a
  bound.
- The vertical position of each column's crop.
- The step between scales k inside [−l/2, l/2], the number of scales, and how a pixel count of l is derived.
- The value of ε on the source and sink edges.
- How C_s behaves when U = 0 or C_r < 0.
- Which width the edge rule uses for a scaled match: the nominal D′_j or the scale that won.
- The SURF Hessian threshold, and the descriptor normalisation that makes θ ≤ 0.04 meaningful.
- The hardware, and per-image run time on the main data.
- The WebMarket and Grocery subsets used, whether the competitor numbers were re-run or copied, and how the
  in-house ground truth was annotated.
- The pooled accuracy over the 150 racks.

## 7. What is not in this article

- No supplementary material is linked from the CVF page, and no code or data link appears in the paper.
- The Springer LNCS version is said to be identical; it was not opened.
- WebMarket and Grocery Products are the cited public sets; neither was fetched here.

## 8. Figures

- **Fig. 1:** a strip of one cereal shelf (a): Crisp Rice, Cheerios, a gap, then two Cheerios.
  - (b)–(e) are catalogue images: Crisp Rice, Cheerios, a Surf detergent pack and a red-and-white box.
  - (f)–(g) are poor crops cut from shelf images, of the same products as (d) and (e). They are dim, blurred and
    much lower in resolution.
  - The caption says (d) and (e) are not on the shelf. The illumination gap between catalogue and shelf is plain.
- **Fig. 2, the block diagram:** a shelf image and a row of product images go in. Correlation matching and NSURF
  matching run in parallel, feed a composite score, then the "graph theoretic approach", and the output is a strip of
  catalogue images. The example shelf holds All-Bran boxes and smaller products.
- **Fig. 3:** a bar chart of the cumulative matching score per product code (1–19) at columns 2, 32 and 180 of
  Fig. 1(a).
  - Column 2 peaks at product 12 (~3.2), then 19 (~2.3), 3 (~2.15) and 7 (~2.05).
  - Column 32 peaks at 7 (~2.0), then 3 (~1.55), 12 (~1.5) and 11 (~1.33).
  - Column 180's scores are all ≤ ~0.5, and many are negative (down to ~−0.9). It looks like a location with no good
    match, perhaps the gap, though the paper does not say.
  - **What you see:** the fourth-ranked product is often within ~5% of the third, so m = 3 is a tight cut.
- **Fig. 4:** a toy DAG.
  - S on the left and T on the right. Three coloured first-column nodes (red a, green b, yellow c) each link to
    later nodes far enough away. The edges are labelled C_s(a), C_s(b) (twice) and C_s(c).
  - Arrows below show width(a) > width(b) and width(c) the longest. The edge reach therefore differs per product: a
    wide product can only connect to nodes further right.
- **Fig. 5:** a bar chart of in-house products per category (values in §3).
- **Fig. 6:**
  - (a) The reconstruction of Fig. 1(a): four catalogue images at their positions, with the gap preserved.
  - (b) A Chocos and Corn Flakes shelf and its reconstruction, both with a magenta tint. The two small Chocos boxes
    at the right end differ in one stripe colour and are told apart.
- **Fig. 7:**
  - (a) A Cheerios shelf in blue, green and red variants. Its first product sits set back, and the reconstruction
    puts a wrong box there.
  - (b) Surf bottles and a pouch beside an All-Bran box, all correct.
  - (c) An All-Bran shelf with a strong white glare across the boxes, reconstructed correctly.
- **Fig. 8:**
  - (a) Block-histogram matching on an All-Bran shelf returns the wrong products (Kellogg's and Triscuit boxes).
  - (b) U-PC returns All-Bran, a dark box, All-Bran, a yellow box and All-Bran, matching the shelf.
- **Fig. 9:**
  - (a) Choosing by correlation alone fills the reconstruction of an All-Bran / Special K shelf with many tiny,
    unrelated products (bottles, small purple items) spread across the width.
  - (b) The composite score gives the five correct boxes.
  - **What you see:** with correlation alone, many small items each scoring a little outscore a few large items.
    Read through the sum-of-weights objective, that is a bias toward **more, narrower** picks (our reading; the
    authors attribute it only to the score).
- **Fig. 10:**
  - (a) Choosing by NSURF alone on a Special K / "Awake" / Nature Valley shelf misses the Special K pair and swaps
    the Awake variants.
  - (b) The composite gets them right.
- **Fig. 11:** (a) the ROC and (b) the rack-accuracy histogram (values in §4).
- **Fig. 12:** accuracy against |D| for three methods, each point labelled with its run time (values in §4).

The CVF page gives no per-figure URLs.

## 9. What transfers to a bookshelf, and where we diverge (our inference)

- **The DAG is our row-level selector.** Treat each candidate spine span [x₀, x₁) on a rectified row as a node, with
  an edge to every span starting at or after x₁, and weight it with the span's own evidence. The max-weight S→T path
  is then the globally best set of non-overlapping spines in that row, solved exactly by dynamic programming in
  O(edges).
  - This is the 1-D special case of Talker's global choice and SKU-110K's merger.
  - It replaces pairwise merging of close lines, which is our "merged-close-lines" failure.
- **The divergences that matter:**
  - They know each product's **width** from the catalogue. We do not, so widths must come from our seam pairs, which
    turns their "top-3 products per column" into "top-k spans starting at each seam".
  - Their score is a positive product-match strength summed along the path, which rewards **more items**
    (Fig. 9(a)). On spines that would favour over-splitting. A per-span score must be calibrated so that splitting
    a true spine in two never gains: for example a log-likelihood ratio against "not a spine boundary", or a
    per-width normalisation with a penalty per extra node.
  - Gaps are free in their graph. For us, a gap should cost its unexplained width, or the path will happily leave
    real spines out.
- **Use a joint choice, not greedy per column.** Their Fig. 9 and 10 ablations are the visual case that choosing
  per location breaks, matching Tonioni's and Talker's lesson.
- **There is no vertical localisation.** U-PC assumes the strip is one shelf. For us, row finding and per-row
  rectification must come first, and any lean of the books handled before a 1-D model applies.
- **Their metric (column ± δ) is a 1-D hit test,** easy to mirror on our ground truth as "spine centre within ±δ".
  Their δ, 7.5% of the shelf, would be far too loose for 15-px spines, so δ should be a fraction of the local median
  spine width.
- **Catalogue matching is the matcher's job, not the finder's.** The idea of a coarse top-k plus a joint decision
  carries over to title matching along a shelf: neighbouring books in one series or one author run constrain each
  other. That is speculative here.

## 10. Deliberately omitted

Cross-checked against the full 15-page text. Omitted:
- the related-work summaries (Gevers & Smeulders, Zhang et al., Merler et al., George et al., Kim et al., George et
  al. 2015), beyond what positions the comparisons;
- the business motivation;
- the acknowledgements.
