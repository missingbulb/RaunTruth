# Yang et al. 2016 — Smart Library: Identifying Books in a Library using Richly Supervised Deep Scene Text Reading

*Xiao Yang, Dafang He, Wenyi Huang, Zihan Zhou, Alex Ororbia, Daniel Kifer, C. Lee Giles (Penn State). arXiv
[1611.07385](https://arxiv.org/abs/1611.07385) v1, 22 Nov 2016. The paper carries an AAAI 2016 copyright line but
names no venue. Free on arXiv; licence not stated in the text. Read in full from the arXiv PDF (7 pages). PDF: study
Drive folder `Literature/yang-2016-smart-library.pdf`.*

**Why it matters to us:** it is the clearest case of demoting low-level lines to estimating the books' lean, and of
finding the boundaries between books from text rather than edges. It also gives the reading-side recipe we partly
copy: read per line, test up versus down, keep both when unsure. **It reports no segmentation accuracy at all.**

## Method, step by step

**Detection.**
1. **Dominant lean.** A Hough transform finds "the dominant direction of books", and the **whole image is rotated** by
   it (Fig. 1b). It is used for nothing else.
2. **Text saliency.** A text / non-text CNN classifies **32×64 colour patches** over the rotated image to make a
   saliency map (Fig. 1c). Its convolutional layers are shared with the recogniser (footnote 1).
3. **Spine boundaries.** "A non-max suppression to find the segmenting point of each book along the vertical axis."
   *Our reading:* a 1-D profile of saliency across the shelf, with the cuts at its suppressed minima.
   - The authors claim this separates neighbours "even when two neighbor book spines have the same color", and that
     it avoids Hough's sensitivity to lighting and low contrast.
   - A spine is then a strip between two cuts. How its top and foot are found is never said.

**Text lines on each spine.**
4. **Candidates.** Extremal regions (Neumann & Matas 2012), chosen for speed and high recall. Those the saliency map
   marks non-text are filtered out.
5. **Grouping.** He et al. 2016's character graph groups the rest into multi-oriented lines, using perceptual
   divergence and aspect ratio.

**Turning each line upright.**
6. **Classifier.** A CNN trained on **32×96** patches says whether a line is upside down.
7. **Scoring a line.** The line is resized to height **32** and a **32×96** window slides along it. The mean
   P(upside down) decides:
   - **> 0.7:** turn the line 180°;
   - **< 0.3:** keep it as is;
   - **in between: keep both** orientations, so that retrieval is not lost on a wrong flip.

   A 32×32 window was rejected: it is uninformative ("O", "OO").

**Recognition.**
8. **Network.** A CNN like VGG16, with pooling strides set so the last feature map has height 1, and batch
   normalisation after every conv. A bidirectional LSTM runs over its columns, then a softmax per time step, trained
   with CTC (Eqs. 1–4). Decoding is best-path or beam search.
9. **Per-time-step supervision.** A time step is labelled character yⱼ when its receptive field covers more than half
   of that character's box, and blank otherwise.
   - The loss is L = CTC + λ·L_pt (Eqs. 5–6).
   - λ starts where the two losses' gradients are of equal size and decreases during training (schedule not given).
   - This needs character boxes, so the authors made Jaderberg-style synthetic words that keep each character's
     position.
10. **WCTC.** WCTC = CTC × Lₑ(Y, Y_D), where Lₑ is the edit distance to the best-path decode (Eqs. 7–8). It is
    switched on after "several epochs" of plain CTC. Training is end to end with Adadelta.

**Correction and retrieval.**
11. **Correction.** A character-level seq2seq model (2 LSTM layers, 512 hidden units). It was trained on sentences from
    the Google One Billion Word corpus with random character deletions, insertions and replacements, and it both
    corrects letters and splits run-together words. A standard spell-checker was rejected because it cannot split
    strings into words.
12. **Retrieval.**
    - Each corrected word is snapped to the database's own dictionary by nearest neighbour.
    - The words are then sent as keywords to Apache Solr, which ranks by tf-idf. The top result is the prediction.
    - Only text is stored, no spine images.

## Definitions

- **Precision** = correctly identified / books the system declared. **Recall** = correctly identified / all queries.
- **Recall@k** asks whether the right book is in the top k results.
- **RR** = 1 / rank of the right book, averaged over queries as MRR.
- Recognition uses the standard cropped-word accuracy with lexicons (Wang et al. 2011).

## Data

- **Retrieval queries:** the **454 spine images** Chen 2010 and Tsai 2011 used for querying. Those authors' own
  2,300-book database was not available.
- **Database:** over 9,000 books crawled from the Stanford Engineering Library (CS, EE, maths and similar subjects),
  with title, author and publisher. The 454 test books are included in it.
- **Recognition benchmarks:** IC03, SVT and IIIT5K.

## Results

**How far to trust them:**
- The retrieval numbers come from **one query set**, 454 images of English technical books in a university library,
  against a database the authors built themselves.
- *Our inference:* the queries are spine images, so **the shelf segmentation of steps 1–3 is probably not exercised
  by this score at all**.
- Recognition numbers are scene words, not spines.

**Retrieval** (Table 2, top-1, text only):

| | P | R | F |
|---|---|---|---|
| Tsai 2011, text | 0.92 | 0.60 | 0.72 |
| Ours | 0.92 | 0.90 | 0.91 |

- **MRR 0.91** "using top-1 search results". **Recall@5 96.4%** (Fig. 6).
- The paper quotes Tsai's hybrid (text and image) as P 0.92, R 0.60, F 0.91. That is impossible: P 0.92 with R 0.60
  gives F 0.73. Treat it as a transcription error.
- Fig. 6's upper bound, which queries with the ground-truth titles, is drawn but never given as a number.

**Recognition** (Table 1, accuracy %, IC03-50 / IC03-Full / SVT-50 / IIIT5K-50 / IIIT5K-1K):
- **Tesseract** 60.1 / 57.3 / 65.9 / – / –.
- **DSL** 96.1 / 94.7 / 94.5 / 97.7 / 95.1.
- **DSL-CL** 96.6 / 95.3 / 94.5 / 98.3 / 95.9.
- **DSL-WL** 98.2 / 95.8 / 94.6 / 98.5 / 96.0.
- Jaderberg 2015b and Shi 2016 are as good or better on IC03.
- L_pt speeds up early training (Fig. 5), and its advantage shrinks as λ falls.

## Failure modes, and what was rejected

**Failures:**
- Most wrong retrievals come from **undiscriminating keywords**: near-identical titles that differ only in author,
  publisher or volume.
- Small, blurry metadata on the spine.
- The rest come from "imperfect or even wrong text localization bounding boxes".

**Rejected:**
- Hough and other low-level spine segmentation, because of lighting and low contrast. Kept only to find the lean.
- Off-the-shelf OCR (Tesseract), for poor scene-text accuracy.
- A standard spell-checker.
- 32×32 windows for the up/down test.
- Image matching, which is costly to store and send. The authors grant that it could resolve titles that text
  cannot.

## Gaps — what the paper never states

- **Any measure of spine segmentation:** no count, no IoU, no precision or recall.
- The Hough parameters and how the dominant direction is chosen.
- The saliency CNN's architecture, training data and stride.
- The NMS window and threshold, and the axis the profile runs along.
- How a spine's top and foot, and multiple shelves, are handled.
- What happens to a spine with no text.
- The λ schedule, epochs and the size of the synthetic dataset. The synthetic data was promised to be made public; no
  URL.
- Whether the 454 queries went through segmentation.
- Runtime.

## Where we diverge / what to take (our inference)

- **Level by the books, not only by the boards.** R9-roll levels a photo by the boards' Hough angle, and only at a
  roll of 5° or more. Yang levels by the books' own dominant direction. That would also straighten a whole shelf of
  books leaning together, which `LEAN` (30°) now absorbs one line at a time. Cheap trial: the median of the shelf's
  side-line leans, used to rotate the shelf before the seam scan.
- **Text as the boundary signal.** We already have a text map (PaddleOCR) and use it as a veto (`text_columns`, a line
  crossing text is lettering). Yang's minima of text-ness *between* spines is the positive form of the same signal.
  It fails exactly where our misses are: dark plain spines with no lettering. Our text map, unlike their saliency, is
  line boxes rather than a dense map, so the profile would have to come from the map's coverage per column.
- **Nothing here beats our finder on numbers,** since detection was never scored. The 0.91 F is identification on
  pre-cut spines, and it is not comparable with anything of ours.
- **Reading** (outside detection, noted for the reader): our readers try every turn and keep the most confident, which
  is a brute-force version of step 7. Their 0.3–0.7 keep-both band argues for passing both readings to the title
  matcher. Snapping words to a closed dictionary before search parallels our `spelling` (R7).

## Deliberately omitted

Omitted as outside spine detection and our readers' design:
- The CTC derivations beyond the loss definitions.
- The recognition comparison's discussion of other models.
- The Solr setup and the related-work citations' details.
- The motivation (visually impaired users).

Cross-checked against the full 7-page text.
