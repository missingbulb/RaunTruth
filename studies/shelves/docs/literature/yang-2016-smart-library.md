# Yang et al. 2016 — Smart Library: Identifying Books in a Library using Richly Supervised Deep Scene Text Reading

*Xiao Yang, Dafang He, Wenyi Huang, Zihan Zhou, Alex Ororbia, Daniel Kifer, C. Lee Giles (Penn State). arXiv
[1611.07385](https://arxiv.org/abs/1611.07385) v1, 22 Nov 2016. The paper carries an AAAI 2016 copyright line but
names no venue. Free on arXiv; licence not stated in the text. Read in full from the arXiv PDF (7 pages). PDF: study Drive folder `Literature/Smart Library - Identifying Books in a Library using Richly Supervised Deep Scene Text Reading.pdf`.*

## What it gives the study

- **Level by the books, not only the boards.** Yang finds "the dominant direction of books" by a Hough transform and
  rotates the whole image by it; Hough is used for nothing else, demoted for its sensitivity to lighting and low
  contrast. R9-roll levels by the boards' Hough angle, and only at a roll of 5° or more. Levelling by the books'
  own lean would also straighten a shelf leaning together, which `LEAN` (30°) now absorbs one line at a time. Cheap
  trial: the median of the shelf's side-line leans, used to rotate the shelf before the seam scan.
- **Text as the boundary signal, in its positive form.** A text / non-text CNN over **32×64** patches makes a
  saliency map, and the cuts between books are the suppressed minima of text-ness along the shelf (our reading of
  "a non-max suppression to find the segmenting point of each book along the vertical axis"). The authors claim it
  separates neighbours "even when two neighbor book spines have the same color". We use our text map only as a veto
  (`text_columns`, a line crossing text is lettering); a profile of the map's coverage per column is the positive
  form. It fails exactly where our misses are, dark plain spines with no lettering.
- **The up/down test with a keep-both band.** A CNN on **32×96** windows slid along a line resized to height 32; mean
  P(upside down) **> 0.7** turns it, **< 0.3** keeps it, in between **keeps both** so retrieval is not lost on a wrong
  flip (a 32×32 window was rejected as uninformative: "O", "OO"). Our readers try every turn and keep the most
  confident, a brute-force version of this test; the band argues for passing both readings to the title matcher.
- **Snapping words to a closed dictionary before search**, which our `spelling` (R7) parallels: each corrected word
  goes to its nearest neighbour in the database's dictionary, then to tf-idf retrieval (Solr).

It gives **no segmentation accuracy at all** (no count, IoU, precision or recall), so nothing here places our
finder. How a spine's top and foot, several shelves, or a spine with no text are handled is never said.

## The numbers, and why they do not compare

- **Retrieval** on the **454 spine images** of Chen 2010 / Tsai 2011 against 9,000+ Stanford Engineering Library
  books: top-1 **P 0.92 / R 0.90 / F 0.91** (Tsai 2011, text: 0.92 / 0.60 / 0.72); MRR 0.91; Recall@5 96.4%. One
  query set of English technical books, a database the authors built; the queries are spine images, so the shelf
  segmentation is probably not exercised by this score (our inference). The quoted Tsai hybrid row (P 0.92, R 0.60,
  F 0.91) is arithmetically impossible: a transcription error.
- **Recognition** on scene-word benchmarks, not spines: Tesseract 60.1 / 57.3 / 65.9 (IC03-50 / IC03-Full / SVT-50)
  against their CNN-LSTM-CTC reader's 94–98.
- **Failures:** most wrong retrievals are near-identical titles differing only in author, publisher or volume; small
  blurry metadata; imperfect text boxes. A character-level seq2seq corrector was used because a standard
  spell-checker cannot split run-together words.

## Gaps the study would need

The Hough parameters, the saliency CNN and its stride, the NMS window and threshold, the profile's axis, and
whether the 454 queries went through segmentation.

Left out: the recogniser's architecture, losses and training (CTC, per-time-step supervision, WCTC), the corrector's
training data, the Solr setup, and the motivation.
