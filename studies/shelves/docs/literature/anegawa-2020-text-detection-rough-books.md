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
- **Owner's copy:** the full 16-page arXiv PDF with a text layer; read end to end.

## What it gives the study

- **A second candidate source for Find books, from text rather than edges.** Our finder finds edges and uses the
  text map only to veto lines through lettering. This paper grows a book from its text: word boxes that share an
  angle, lie in one corridor down the spine and carry the same two colours become one book. Grouping our PP-OCRv4
  text lines the same way would propose a spine that needs no edge contrast, aimed at dark plain spines *with*
  lettering and at same-colour neighbours whose ink differs. It would feed the global choice SURVEY ranks second,
  not replace the edges.
- **A two-colour "same book?" test across a seam.** k-means with k = 2 inside a text box; the majority colour of
  the box's four corners is the spine, the other cluster the ink. Comparing both colours on either side of a
  candidate edge would tell a seam through one book (the Henderson split at its lettering, `1HyJrL`) from a real
  boundary. Untested here; its thresholds are in an unstated colour space, so ours would have to be measured.
- **Grouping is what matters, adjusting is not worth porting** (Results): naive → grouping lifts box accuracy from
  0.46 to ~0.80; the box-shifting step adds a couple of points at most and sometimes halves IoU.

What it does not give: a spine box. Its output is a **text column** of the top word box's width, running from that
box to the **bottom of the image** (one shelf per photo assumed), so no top, foot or true width. A book whose text
the detector misses gets nothing. No reading, no matching, Latin script plus one Japanese spine, no Hebrew. Its
metrics ignore false positives, so it says nothing about our precision problem (posts, top shelves).

## The method steps the study would reuse

1. Scene-text detection, unmodified: **R2CNN** (anchor scales 4, 8, 16, 32; inclined boxes) or **EAST** (ResNet-50),
   both trained on ICDAR 2015 only. R2CNN won because EAST sometimes found no text on a book (authors).
2. Gaussian filter, **5×5**; boxes sorted top to bottom.
3. **Book colours** per box: k = 2 k-means; corner-majority colour → spine, the other → ink. This replaced the 2019
   paper's colour histograms.
4. (Adjusting: each box shrunk to 0.85 × 0.6 and shifted within **±5 px, then ±10°** to where its mean colour is
   furthest from the spine and closest to the ink. Not worth porting, see Results.)
5. **Grouping**, repeated until the group count stops changing: the topmost remaining box seeds a **range** of its
   own angle and width running down to the image bottom (Eqs. 1–7, drawn in Fig. 4), widened **×2**
   (`wide_range_rate`). Another box joins when **> 50% of it lies inside the range** and
   ‖spine₁ − spine₂‖ < **60** and ‖ink₁ − ink₂‖ < **100**. For us the corridor would end at the row's foot, not the
   image bottom.
6. NMS over the groups; boxes with every edge ≤ **100 px** dropped.

**Stated gaps that a port would have to fill:** the colour space and scale of 60 and 100 (RGB 0–255 is our guess
from "Euclidean distance", not stated); the Gaussian's σ; what a group's final box is (Fig. 1(c) shows boxes running
past the image edge, which suggests the range itself — our reading); the NMS threshold and detector score
thresholds; the angle convention (Eq. 4 divides by tan(angle), so degrees from horizontal, ~90° upright — our
reading); how boxes are matched to ground truth. No code, no data, no runtime.

## The numbers, and how far to trust them

Ground truth is a hand-drawn rotated box per **whole spine**. Metrics: **BA** = books with exactly one box / books;
centre distance, IoU and area difference averaged **only over BA's books**. No precision, recall or false-positive
count: a box on no book costs nothing. Not comparable with our IoU-matched P/R.

Data: 20 photos of standing books (11 at 1108×1478, 9 at 890×1188) and 15 of flat piles, rotated 90° before
processing; the authors' own technical books, no held-out split, thresholds set on the same data. The text says "27
books in total" per set, but every BA is an exact multiple of 1/128 (standing) or 1/105 (piles), so *our inference*
is ~128 and ~105 book instances (perhaps 27 books photographed repeatedly).

From Tables 1–2 (R2CNN, the better detector):

| Set | naive BA / IoU | grouping, two-colour BA / IoU | + adjusting (location) | + adjusting (location+angle) |
|---|---|---|---|---|
| Standing | 0.4609 / 0.2038 | 0.7969 / 0.2842 | 0.7891 / 0.4355 | **0.8125** / 0.4402 |
| Piles | 0.2381 / 0.30872 | 0.85714 / 0.53103 | **0.87619** / 0.53178 | 0.82857 / 0.29235 |

- IoU never passes 0.54, partly because a text column is scored against a whole spine.
- The two-colour model's gain over histograms is small and mixed: with R2CNN on standing books, histogram grouping
  scored BA 0.8047 / IoU 0.4381, *above* the two-colour grouping row; the claimed gain shows only after adjusting.
- The angle step halved IoU on piles (0.53 → 0.29); the authors blame the final NMS merging neighbouring books.
- Fig. 6 shows the hazard for our dense rows: on its crowded shelf of thin coloured spines the grouped columns
  overlap heavily and cross neighbouring books, and on piles some span two stacked books.

## The authors' arguments that bear on the study

- Hough-line spine segmentation (Chen et al. 2010) assumes neatly arranged books and "may fail to find text areas
  exactly when a book has a title of many words".
- A detector trained on another domain splits a spine's text into **per-word boxes** and puts some off the text;
  grouping repairs both. Our `lines` reader meets the same split.
- Limitation (authors): the result is capped by the base detector; detecting missed text from the spine and ink
  colours is left as future work.

Left out: the related work on RFID shelves, transfer-learning citations, the histogram method's details beyond its
table rows, and the per-figure descriptions; cross-checked against the full text.
