# Llabrés et al. 2024 — Image-text matching for large-scale book collections

*Artemis Llabrés, Arka Ujjal Dey, Dimosthenis Karatzas, Ernest Valveny (Computer Vision Center, UAB, Spain) ·
arXiv [2407.19812](https://arxiv.org/abs/2407.19812) v1, 29 Jul 2024 (the extracted text carries no venue; DAS 2024
is the caller's attribution, unconfirmed here) · dataset and code: github.com/llabres/library-dataset · open-access
preprint; no licence is stated in the text, for the paper or the dataset · PDF: study Drive folder
Literature/llabres-2024-library-dataset.pdf.*

**Why it matters here:** it is the one source that takes spine readings all the way to catalogue entries, which is
the job of the title matcher our reader's JSON feeds (`req/shelves/matcher/export`). Its numbers say how much a
matcher loses to bad boxes, to a catalogue that grows, and to spine text that is not the catalogue's text.

---

## 1. Task and dataset

- **Task:** detect every book in a set of shelf photos and map each, *many-to-many*, to an entry of a target list
  (author, title, ISBN). The paper's point: book-to-entry matches are not independent, so solve them jointly rather
  than as one retrieval per book.
- **The Library Dataset:** **285** high-resolution photos at one public library in Barcelona (Volpelleres Miquel
  Batllori), one or two shelves each, sometimes the tops or feet of the shelf above/below in frame; **7,536 books**;
  almost all seen by the spine, a few by the cover; **14 library sections**; languages Catalan, Spanish, English
  (in that order), then small shares of French, German, Italian and **Arabic** (the one right-to-left script; no
  share is given). No Hebrew.
- **Target lists:** *Library list*, **15,229** entries from the library ("almost every book" in the photos);
  *All*, **2.3 M** GoodReads titles including the library list. Books absent from the list are labelled
  **"not in list"**; a good method should leave them unmatched.
- **What the labels are:** per photo, *which catalogue entries appear in it* — the ground truth is the set of books
  per image, matched to the list. Shipped beside it, as weak annotation: SAM masks that were manually filtered, and
  the commercial OCR's output.
- **What the labels are not:** no per-book transcription of the spine text (only the OCR's noisy text), no
  reading-order or orientation label, and no statement that every book has a hand-checked mask (books SAM missed
  were "manually annotated"; the form of that annotation is not given). It cannot score a reader's text, only a
  matcher's choice.
- **How the labels were made (bootstrapped):** Amazon Rekognition OCR (text + location) → SAM masks for every
  object → keep masks containing OCR text → each checked by hand as *book*, *not a book* (or a partial book), or
  *merged books* → CLIP + Hungarian matched the books to the library list → matches checked and corrected by hand
  → missed books annotated by hand. Table 1:

| SAM objects | with text | books | not books | merged |
|---|---|---|---|---|
| 9,850 | 8,435 | 6,912 | 1,267 | 256 |

  *Counts, trustworthy as stated.* So SAM-plus-text found 6,912 of 7,536 books cleanly (**92%**, our arithmetic),
  and 15% of its text-bearing objects were not books (section labels, partial books from other shelves,
  two-coloured spines cut in two).

## 2. Methods — exactly as described

- **Fuzzy string baseline:** similarity = 1 − Levenshtein(OCR, author+title) / max possible distance for the two
  lengths (rapidfuzz 1.8.0 cited); each book takes the most similar entry, independently. Slow at scale: all
  pairs.
- **Stage 1, CLIP:** CLIP's *text* encoder embeds each book's OCR text (B, N_B × D) and each entry's author+title
  (T, N_T × D); S = B·Tᵀ is cosine similarity; each book takes argmax of its row. No image embedding is used,
  despite the title. Failure: one-to-many collisions — Fig. 7, three books of the "Porta dels Tres Panys" series
  all match the first book's entry because the series name is that book's title (CLIP scores 0.84/0.80/0.81,
  0.80/0.75/0.68, 0.81/0.72/0.73; *illustrative, one example*).
- **Stage 2a, Hungarian:** the assignment problem over S, one-to-one, maximising total similarity (Kuhn 1955).
  Fixes the series collision. Infeasible in time and memory for the 2.3 M list.
- **Stage 2b, BERT:** CLIP keeps the top **K = 10** entries per book; BERT reads `[CLS] OCR [SEP] T1 [SEP] … TK
  [EOS]`; the CLS output goes through a linear layer and softmax over **K + 1** classes, the extra one meaning
  "none of these". Fine-tuned on synthetic data: an entry from the list, corrupted by deleting/replacing letters
  and deleting/replacing whole words (simulating spine-vs-catalogue differences and OCR slips), frozen CLIP's top
  K retrieved, the true entry included **50%** of the time.

## 3. Results — accuracy, as reported

The metric is called "accuracy" and never defined (denominator, how "not in list" and false detections count).
*Single runs, no variance; trust the ordering more than the third decimal.*

**Matching only** (correctly segmented spines, only books on the list, so every book has a right answer):

| method | exact list | library (15 k) | all (2.3 M) |
|---|---|---|---|
| String matching | 0.783 | 0.742 | **0.505** |
| CLIP | 0.939 | 0.915 | 0.449 |
| CLIP + Hungarian | **0.984** | **0.918** | — (infeasible) |
| CLIP + BERT | 0.836 | 0.824 | 0.310 |

**Detection and matching** (the real SAM output, the whole 285 photos, not-in-list books included):

| method | library | all |
|---|---|---|
| String matching | 0.573 | **0.389** |
| CLIP | 0.617 | 0.241 |
| CLIP + Hungarian | **0.641** | — |
| CLIP + BERT | 0.622 | 0.240 |

- Hungarian's edge over CLIP shrinks from +0.045 (exact) to **+0.003** (library): one-to-one assignment helps only
  when the list holds little beyond the books in view; distractors erase it.
- Real detection costs **~0.28** (0.918 → 0.641) on the library list.
- At 2.3 M, **plain string matching beats every learned method**, in both tasks (0.505 vs 0.449; 0.389 vs 0.241) —
  the authors do not comment on this.
- The abstract and conclusions claim BERT "copes better with incomplete lists"; no table measures unmatched or
  rejected books, so that claim is *unsupported by the numbers given*.

## 4. Failure modes the paper names

Spine text differs from the catalogue's author+title (Fig. 2): odd fonts, small fonts, **author name only**, one
book occluding another, reflections, **series name larger than the title**; also abbreviated authors, one author of
several, title without subtitle. Detection: section signs with text, two-coloured spines split, books merged,
partial books from neighbouring shelves. Matching: series collisions (CLIP alone), forced matches for non-books and
not-in-list books (CLIP and Hungarian always assign).

**Rejected alternatives:** library call-number tags (present on these books) were *deliberately not read*, to stay
general; CNN image-feature matching against a database of spine photos (needs that database built first).

## 5. Gaps — what the text does not state

- Which CLIP model and embedding size D; whether CLIP was fine-tuned; how OCR words of one spine were joined.
- Which BERT, its fine-tuning schedule, corruption rates, and how K = 10 was chosen.
- The accuracy definition, and how not-in-list books, non-books and merged boxes score in Table 3.
- The SAM post-processing ("after postprocessing" only), and SAM's or the OCR's own error rates on text.
- How the Hungarian handles a rectangular N_B ≪ N_T matrix, or whether it ran per image or over all 285.
- How many books are not on the library list; per-language or per-section results; Arabic's share and results.
- Bias: the ground-truth matches were seeded by CLIP + Hungarian and corrected by hand, which may favour that
  method on the library list. The paper does not discuss it.

## 6. What to take / where we diverge (our inference)

- **The reader's job ends at text that a matcher can use**, and the paper shows the matcher's biggest loss is
  detection (~0.28), not the matcher. Our finder's precision (R9 0.67) matters as much downstream as recall: every
  false box is an entry forced onto a non-book unless the matcher can say "none".
- **A matcher needs a "no match" outcome.** Hungarian and CLIP never abstain. Our export should keep what lets it
  abstain: the reading's confidence and whether the box was found or added (already in `req/shelves/matcher/export`).
- **One-to-one helps only on a small list.** For a person's own shelf against an open catalogue, the 2.3 M column
  is ours: Hungarian is moot, and character-level string similarity held up best. A shortlist by string
  similarity, then a joint step only among one photo's books, fits better.
- **Series need the joint step.** Our two black Herbert spines (`1sdDdH`) and R4's series split are this paper's
  Fig. 7 case: a matcher scoring each book alone will send both to one entry.
- **Spine text is not catalogue text.** Match against author *or* title *or* author+title, not only the
  concatenation, given author-only spines and our `author / title` slash (HEBREW.md, "The spine as a language").
- **Divergence:** CLIP's text encoder was trained on English-centric web text; its use on Hebrew spines is
  untested anywhere in this paper. Their OCR is commercial (Rekognition); ours is Tesseract in the page, noisier on
  Hebrew. Their photos are a library's tidy, labelled shelves; ours are home shelves.

## 7. Deliberately omitted

Cross-checked against the full 14-page text (pages 1–14, including references). Not carried: the introduction's
library-loan statistics and the "shelfies" social-science motivation, the related-work summaries of other spine
systems (several are separate sources in the study's Literature folder), the pie chart of images per section (no
numbers in the text), and acknowledgements.
