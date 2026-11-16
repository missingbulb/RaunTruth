# Llabrés et al. 2024 — Image-text matching for large-scale book collections

*Artemis Llabrés, Arka Ujjal Dey, Dimosthenis Karatzas, Ernest Valveny (Computer Vision Center, UAB, Spain) ·
arXiv [2407.19812](https://arxiv.org/abs/2407.19812) v1, 29 Jul 2024 (the extracted text carries no venue; DAS 2024
is the caller's attribution, unconfirmed here) · dataset and code: github.com/llabres/library-dataset · open-access
preprint; no licence is stated in the text, for the paper or the dataset · PDF: study Drive folder `Literature/Image-text matching for large-scale book collections.pdf`.*

## What it gives the study

The one source that takes spine readings all the way to catalogue entries, the job of the title matcher our JSON
feeds (`req/shelves/matcher/export`). Matching is not this study's, but the paper says what the finder and the
export owe it:

- **Detection costs the matcher most:** accuracy falls **0.918 → 0.641** (~0.28) from correctly segmented spines to
  real detection, on the library list. Our finder's precision (R9 0.67) matters downstream as much as its recall:
  every false box is an entry forced onto a non-book unless the matcher can say "none".
- **The export should let a matcher abstain.** Hungarian and CLIP never abstain; keep the reading's confidence and
  whether the box was found or added (already in `req/shelves/matcher/export`).
- **Series need a joint step.** Three books of one series all matched the first book's entry with CLIP alone (its
  series name is that book's title); the one-to-one assignment fixed it. Our two black Herbert spines (`1sdDdH`) and
  `series_split` are this case.
- **Spine text is not catalogue text:** author only, series larger than the title, abbreviated authors, one author
  of several, title without subtitle. Match against author *or* title *or* both, given author-only spines and our
  `author / title` slash ([HEBREW.md](../HEBREW.md), "The spine as a language").
- **Against an open catalogue, plain string matching held up best** (below), and one-to-one helps only on a small
  list; for a person's own shelf, a string-similarity shortlist then a joint step among one photo's books fits better.

It gives no per-book spine transcription (only a commercial OCR's noisy text), so it **cannot score a reader**, and
no "not in list" rejection numbers. No Hebrew; Arabic is the one right-to-left script, share not given.

## The numbers

**Data:** 285 photos at one Barcelona public library, one or two shelves each, **7,536 books**; target lists of
**15,229** library entries and **2.3 M** GoodReads titles. Labels were bootstrapped: commercial OCR → SAM masks →
masks holding text checked by hand → CLIP + Hungarian matches corrected by hand → missed books added. SAM-plus-text
found 6,912 of 7,536 books cleanly (**92%**, our arithmetic); 1,267 of its 8,435 text-bearing objects were not books
(section labels, partial books from other shelves, two-coloured spines cut in two) and 256 were merged books.

"Accuracy" is never defined (its denominator, how not-in-list books and false detections count). Single runs, no
variance; trust the ordering more than the third decimal.

| method | matching only, library (15 k) | matching only, all (2.3 M) | with detection, library | with detection, all |
|---|---|---|---|---|
| String matching (Levenshtein) | 0.742 | **0.505** | 0.573 | **0.389** |
| CLIP text encoder | 0.915 | 0.449 | 0.617 | 0.241 |
| CLIP + Hungarian | **0.918** | infeasible | **0.641** | — |
| CLIP + BERT re-rank (top 10, plus "none") | 0.824 | 0.310 | 0.622 | 0.240 |

- On the exact list Hungarian reached 0.984 vs CLIP 0.939; on the library list its edge is **+0.003**: distractors
  erase what one-to-one assignment buys.
- At 2.3 M, string matching beats every learned method in both tasks; the authors do not comment on it.
- The claim that BERT "copes better with incomplete lists" is unsupported: no table measures rejected books.
- Bias: the ground-truth matches were seeded by CLIP + Hungarian, which may favour it on the library list.
- CLIP's text encoder was trained on English-centric web text; its use on Hebrew is untested here.

Left out: the BERT fine-tuning data, model and schedule details (mostly unstated), the call-number tags they chose
not to read, the motivation and related work.
