# Anegawa & Aritsugi 2020 — Text detection on roughly placed books

- **Title:** Text Detection on Roughly Placed Books by Leveraging a Learning-based Model Trained with Another Domain
  Data
- **Authors:** Riku Anegawa, Masayoshi Aritsugi (Kumamoto University, Japan)
- **Venue:** arXiv preprint [2006.14808](https://arxiv.org/abs/2006.14808) v1 [cs.CV], 26 Jun 2020 (title page dated
  29 June 2020). It extends the authors' peer-reviewed CyberSciTech 2019 paper, "Text detection on books using CNN
  trained with another domain data" ([10.1109/DASC/PiCom/CBDCom/CyberSciTech.2019.00041](https://doi.org/10.1109/DASC/PiCom/CBDCom/CyberSciTech.2019.00041)),
  which was not read.
- **Licence:** none stated in the text; the arXiv listing carries arXiv's non-exclusive distribution licence 1.0.
- **Thesis:** an off-the-shelf scene-text detector trained on ICDAR 2015 (R2CNN or EAST), left untouched, boxes single
  words on book spines; a colour-and-geometry post-process groups those words into one box per book.
- **PDF:** kept in the study's Drive `Literature` folder as `Text Detection on Roughly Placed Books by Leveraging a Learning-based Model Trained with Another Domain Data.pdf`
- **Owner's copy:** the full 16-page arXiv PDF with a text layer; read end to end, every figure looked at.

## Why this matters to our task

- **It is the text-first route to a spine box.** Our pipeline finds boundaries and uses the text map to *veto* lines
  through lettering. This paper does the inverse: it starts from text boxes and *grows* each into a book, merging
  word boxes that share an angle, sit on one line down the spine and share the same two colours. A grouping of our
  PP-OCRv4 text-line boxes into books is the cheapest form of that idea we could try, as a candidate source beside
  our seams.
- **A two-colour spine model.** k-means with k = 2 inside a text box, the corner-majority colour taken as the spine
  and the other as the ink. That is a cheap "same book?" test between two boxes, and a cheap way to centre a box on
  its lettering.
- **What it does not cover.** Its output is a **text column**, not the spine: the range runs from the top text box to
  the image's bottom edge, so it gives no spine top, no foot and no width beyond the text box's own. Books whose text
  the detector misses get no box. It assumes one shelf per photo (the range runs to the image bottom). It reads
  nothing: no OCR, no matching. Latin script, plus one Japanese spine in Fig. 1; no Hebrew.
- **Its numbers are weak** (see Results): 20 + 15 photos of a few dozen of the authors' own books, no held-out split,
  mean IoU against the full spine around 0.44–0.53 at best.

## The method, in full

The pipeline (Algorithm 1, `TextDetectionProcess`):

1. **Scene-text detection**, unmodified and not retrained (line 1). Two detectors are used in turn:
   - **R2CNN** (Jiang et al., ICPR 2018): Faster R-CNN with three ROI poolings, 7×7, 3×11 and 11×3, concatenated, so
     horizontal and vertical text are both handled. It predicts text/non-text, an axis-aligned box and an inclined
     minimum-area box, then runs inclined NMS. Anchor scales **(4, 8, 16, 32)**.
   - **EAST** (Zhou et al., CVPR 2017): a fully convolutional network predicting rotated rectangles or quads. Backbone
     **ResNet-50** here (the original used PVANET).
   - Both were **trained on ICDAR 2015** incidental scene text only.
2. **Gaussian filter** on the image, **5×5** (line 2).
3. **Sort** the boxes by centre, top of the image to the bottom (line 3).
4. **Book colours** per box (§3.2.2, line 4): k-means, k = 2, over the box's pixels. The majority colour of the box's
   **four corners** is the provisional spine colour; of the two cluster colours, the one closer to it is the spine
   colour, the other the text colour. This "binary" treatment replaces the colour histograms of the 2019 paper and is
   credited with the gain over it.
5. **Adjusting** (§3.2.3, Algorithm 2), run twice: first on location, then on angle (lines 5–6). For each box, every
   shift in `adjust_range` is tried; `shift()` also **shrinks the box to 0.85 of its x size and 0.6 of its y size**
   (to allow for rotation, and because a book's y size far exceeds its x size). For each shifted box the mean colour
   `ave` is taken and the score is

   `‖ave − spine_colour‖ − ‖ave − text_colour‖`

   The highest-scoring shift is kept: the box moves to where its mean colour is furthest from the spine and closest
   to the ink, i.e. onto the lettering. **`adjust_range` = ±5 px for location, ±10° for angle.**
6. **Grouping** (§3.2.4, Algorithm 3), repeated until the number of groups stops changing (lines 7–16):
   - Take the first (topmost) remaining box as `box1`; it is assumed to be the book's top text box.
   - Compute the **book range** from it (Eqs. 1–7, Fig. 4). The range keeps the box's angle and width and runs from
     the box down to the **bottom edge of the image**:
     - `box_w = box.height·cos(angle) + box.width·sin(angle)`
     - `h = (box_w / 2)·tan(angle)`
     - `line_h = h + (img.height − box.y)`
     - `line_w = line_h / tan(angle)`
     - `range.height = line_h / sin(angle)`
     - `range.x = box.x + box_w/2 − line_w/2`
     - `range.y = box.y − (box_w/2)·tan(angle) + line_h/2`
     - `range.angle = box.angle`, `range.width = box.width`
   - Widen it: `range.width × wide_range_rate`, **`wide_range_rate` = 2**.
   - A box `box2` joins `box1`'s group when **more than 50% of it lies inside the range** *and* its colours match:
     `‖spine₁ − spine₂‖ < threshold_spine` **(60)** and `‖text₁ − text₂‖ < threshold_text` **(100)**.
   - Remove the group from the pool and repeat with the next topmost box.
7. **NMS** over the groups (line 17).
8. **Drop small boxes** (line 18): "bounding boxes with edges, each of which was less than or equal to **100 pixels**"
   are removed, in all methods compared.

### Parameters the paper fails to state (gaps)

- The Gaussian's σ.
- The colour space and scale the thresholds 60 and 100 live in (by the "Euclidean distance" wording, plausibly RGB
  0–255 — our inference, not stated).
- The step inside `adjust_range` (1 px and 1° would be the natural reading; not stated), and whether the location
  shift is in x, y or both.
- What a group's final box is: the range, the union of its boxes, or something else; and how a group's colours are
  recomputed when grouping is repeated over groups. Fig. 1(c) shows red boxes running past the image's bottom edge,
  which suggests the range itself (our reading).
- The NMS overlap threshold, the detectors' score thresholds, and where the trained weights came from.
- Whether "each edge ≤ 100 px" means both sides or either side.
- The angle convention (the equations read as degrees from horizontal, ~90° for an upright book — our reading;
  Eq. 4 divides by tan(angle)).
- How a detected box is assigned to a ground-truth book for BA and IoU.
- Runtime, hardware, code.

## Definitions and evaluation

Ground truth: hand-drawn rotated boxes around each **whole spine** (Fig. 6 top row). Four metrics (Eqs. 8–11):

- **BA** (box accuracy) = #books with exactly one bounding box / #books.
- **EDBC** = Euclidean distance between box and ground-truth centres, pixels.
- **IoU** = area(b ∩ g) / area(b ∪ g).
- **ADM** = |area(b) − area(g)|, pixels², unnormalised.

EDBC, IoU and ADM are averaged **only over the books counted in BA's numerator**, so a method that boxes fewer books
is scored on its easier ones. No precision, recall or false-positive count is reported: a box on no book costs
nothing in any metric.

## Data

- **Roughly placed:** 20 photos of books standing on a shelf at various leans, "various light conditions"; 11 at
  1108×1478 and 9 at 890×1188 px.
- **Horizontally placed:** 15 photos at 1108×1478 of books lying flat in a pile, some overhanging others; each image
  was rotated 90° and processed as above.
- The text says **"27 books in total"** for each set. The BA values do not fit 27: every roughly-placed BA is an exact
  multiple of 1/128 (0.4609 = 59/128, 0.8125 = 104/128) and every horizontal BA but one a multiple of 1/105
  (0.2381 = 25/105, 0.87619 = 92/105). *Our inference:* the sets hold about **128 and 105 book instances** (perhaps 27
  distinct books photographed repeatedly). The one misfit, EAST naive on the horizontal set (0.2422), equals 31/128,
  which looks like a cell copied from the other table.
- All photos appear to be of the authors' own technical books (Fig. 1, 3 and 6 show the same titles repeatedly).

## Results

**How far to trust them:** one lab's photos, a few dozen distinct books, no held-out split, no variance, thresholds
chosen by the authors on the same data. IoU never exceeds 0.54, partly because the output is a text column and the
ground truth a whole spine.

Table 1 — roughly placed books (read from Table 1):

| Detector | Method | BA | EDBC | IoU | ADM |
|---|---|---|---|---|---|
| R2CNN | naive | 0.4609 | 115.33 | 0.2038 | 44698.2 |
| R2CNN | histogram (2019): grouping | 0.8047 | 65.38 | 0.4381 | 31969.0 |
| R2CNN | histogram: + adjusting (location) | 0.7109 | 61.0338 | 0.3476 | 26899.7 |
| R2CNN | histogram: + adjusting (location+angle) | 0.5703 | 78.34 | 0.2838 | 40638.6 |
| R2CNN | colour clustering (this paper): grouping | 0.7969 | 53.87 | 0.2842 | 41461.7 |
| R2CNN | colour clustering: + adjusting (location) | 0.7891 | 51.19 | 0.4355 | 26490.6 |
| R2CNN | colour clustering: + adjusting (location+angle) | **0.8125** | 63.01 | 0.4402 | 34432.8 |
| EAST | naive | 0.3750 | 196.85 | 0.2994 | 75492.0 |
| EAST | histogram: grouping | 0.6953 | 74.89 | 0.4530 | 53990.9 |
| EAST | histogram: + adjusting (location) | 0.6953 | 73.68 | 0.4553 | 52627.4 |
| EAST | histogram: + adjusting (location+angle) | 0.7266 | 78.09 | 0.44270 | 56930.0 |
| EAST | colour clustering: grouping | 0.7031 | 70.79 | 0.4840 | 50354.0 |
| EAST | colour clustering: + adjusting (location) | 0.7188 | 78.51 | 0.4724 | 51890.2 |
| EAST | colour clustering: + adjusting (location+angle) | 0.7344 | 73.72 | 0.4708 | 51845.0 |

Table 2 — horizontally placed (piled) books (read from Table 2):

| Detector | Method | BA | EDBC | IoU | ADM |
|---|---|---|---|---|---|
| R2CNN | naive | 0.2381 | 153.53 | 0.30872 | 45832.4 |
| R2CNN | histogram: grouping | 0.8476 | 71.33 | 0.48704 | 33451.2 |
| R2CNN | histogram: + adjusting (location) | 0.75238 | 74.99 | 0.49449 | 35851.2 |
| R2CNN | histogram: + adjusting (location+angle) | 0.67619 | 109.72 | 0.26503 | 57451.0 |
| R2CNN | colour clustering: grouping | 0.85714 | 61.82 | 0.53103 | 31633.9 |
| R2CNN | colour clustering: + adjusting (location) | **0.87619** | 62.71 | 0.53178 | 32453.9 |
| R2CNN | colour clustering: + adjusting (location+angle) | 0.82857 | 73.03 | 0.29235 | 39160.1 |
| EAST | naive | 0.2422 | 346.98 | 0.2208 | 163013.8 |
| EAST | histogram: grouping | 0.7238 | 165.76 | 0.4183 | 101556.4 |
| EAST | histogram: + adjusting (location) | 0.7238 | 165.89 | 0.4164 | 101563.5 |
| EAST | histogram: + adjusting (location+angle) | 0.6952 | 171.87 | 0.4026 | 105051.5 |
| EAST | colour clustering: grouping | 0.800 | 153.76 | 0.4314 | 96280.4 |
| EAST | colour clustering: + adjusting (location) | 0.8095 | 147.54 | 0.4481 | 94896.6 |
| EAST | colour clustering: + adjusting (location+angle) | 0.8190 | 154.43 | 0.4255 | 98808.0 |

What the tables say, beyond the authors' prose:

- **Grouping does nearly all the work.** Naive → grouping lifts BA from 0.46 to ~0.80 (R2CNN, rough). Adjusting adds at
  most a couple of BA points, and is not monotone: the angle step **halves IoU** for R2CNN on piled books
  (0.53 → 0.29) and lowers it for R2CNN with histograms on rough books (0.35 → 0.28).
- **The colour change (histogram → two-colour) is a small, mixed gain.** On rough books with R2CNN, grouping alone is
  slightly *lower* in BA (0.8047 → 0.7969) and much lower in IoU (0.44 → 0.28); the authors' claimed gain shows only
  in the adjusting rows.
- **R2CNN beats EAST** because EAST sometimes found no text at all on a book (authors). The final result is capped by
  the base detector.
- The authors' own explanation for the R2CNN angle-adjusting drop on piled books: the final NMS merged boxes of
  neighbouring books.

## Discussion arguments worth keeping

- Hough-based line extraction (Chen et al., ACM MM 2010) assumes neatly arranged books and "may fail to find text
  areas exactly when a book has a title of many words".
- A detector trained on another domain splits a spine's text into **per-word boxes** and places some of them off the
  text; both are the domain gap, and both are what the post-process repairs.
- **Limitations (authors):** performance depends on the base detector; future work is to detect the text the detector
  missed from the spine and ink colours, and to compare against a detector trained on enough in-domain data (neither
  done here).

## Where we diverge / what to take (our inference)

- **Text lines as spine seeds.** Group our PP-OCRv4 line boxes by shared angle, a corridor along the line's axis,
  and a two-colour match, and treat each group's extent as a spine candidate. It is a candidate source that does not
  depend on edge contrast, so it is aimed at dark plain spines *with* lettering and at same-colour neighbours whose
  ink differs. Bound the corridor by our row's foot, not the image bottom.
- **A two-colour "same book" test.** Spine colour from the corner majority of a k = 2 split inside a text box, ink the
  other. Compare across a candidate seam: if both colours match on both sides, the seam likely runs through one book
  (the Henderson split-at-lettering case); if either differs, it is a real boundary. Untested; thresholds would have
  to be ours, measured in a stated colour space.
- **Do not borrow its scoring.** BA ignores false positives and the other metrics are conditional on BA's numerator;
  our IoU-matched precision and recall are stricter and not comparable with these numbers.

## What is not in this article

- No supplementary material, no code, no data link. Nothing to fetch.
- The 2019 CyberSciTech paper (histogram version) is behind IEEE; not read. Its numbers appear here as the
  "histogram" rows.

## Figures

- **Fig. 1 — Overview** (p. 3). (a) Original photo: five books standing on a shelf against a wall, leaning slightly
  left: a grey "Smith — The Design and Analysis of Parallel Algorithms" (Oxford) leaning at a visible angle, a yellow
  "Cochran — Sampling Techniques", a black "Shafer — A Mathematical Theory of Evidence", a pink Japanese spine
  (katakana and kanji, horizontal characters stacked down the spine) and a blue "Education and Society, Information
  Processing 92, Volume II". (b) R2CNN (green) and EAST (cyan) boxes: many small per-word boxes on each spine, plus
  boxes on library labels at the feet and the publisher logo; R2CNN boxes carry printed scores. Both detectors find
  text on the Japanese spine. (c) The refined result: one long red rotated box per book along the text column, several
  of them **running past the image's top or bottom edge**, and on the leaning Smith book the box follows the lean.
  The boxes are narrower than the spines.
- **Fig. 2 — Spine and text colours** (p. 6). Three upside-down or mirrored word crops ("search" on tan, "ELLIGENCE"
  on red, "Information" on blue), each beside two swatches: the chosen spine ("back") and text colours, with labels
  saying which k-means cluster (1 or 2) became which. Shows dark-ink-on-light and light-ink-on-dark cases both
  resolved.
- **Fig. 3 — Adjusting** (p. 7). Before/after of the same eight-book shelf (Pascal, Computer Science, The Design and
  Analysis of Parallel Algorithms, Sampling Techniques, List Processing, a maroon "Introduction to Theoretical Computer
  Science", a blue Information Processing volume). Before: green word boxes, several offset from the text or spanning
  two words. After: boxes are smaller (the 0.85/0.6 shrink) and centred on letters; a few still sit across two
  lines or at an odd angle (on the blue spine, two tilted boxes near "Volume II" stay crossed).
- **Fig. 4 — Book range** (p. 9). A schematic: an image rectangle, a leaning book outline, its top text box (red,
  centre (box.x, box.y), height box.height), and the blue range rectangle of the same width and angle running from the
  box down to the image's bottom edge, with h, line_h, line_w, box_w/2 and img.height − box.y dimensioned. It is the
  only place the geometry of Eqs. 1–7 is drawn.
- **Fig. 5 — Metric geometry** (p. 11). Two overlapping rotated rectangles, g (green) and b (red), their centres,
  intersection (yellow) and union, defining EDBC, IoU and ADM.
- **Fig. 6 — Results** (p. 12). Eight columns: six standing-book shelves, then two piles of flat books shown
  horizontally. Rows: ground truth (green, whole-spine boxes), R2CNN naive / grouping / grouping+adjusting, EAST naive /
  grouping / grouping+adjusting. What we see: grouped boxes (red) are long text columns, often extending below the
  shelf; on the crowded sixth shelf (a dense row of thin coloured spines) the red boxes overlap heavily and cross
  neighbouring books; EAST naive shows few detections on several books; on the piles, some red boxes span two stacked
  books. Thumbnails are too small to count errors per image.

## Deliberately omitted

The related-work paragraph on RFID shelves, the transfer-learning citations and the reference list beyond the
detectors used. Cross-checked against the full 16-page text.
