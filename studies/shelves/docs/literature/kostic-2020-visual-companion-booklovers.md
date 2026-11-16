# Kostic et al. 2020 — Visual Companion for Booklovers (BookVIS)

- **Title:** Visual Companion for Booklovers
- **Authors:** Zona Kostic, Jared Jessup, Jeffrey Baglioni, Nathan Weeks, Johann Philipp Dreessen, Ning Chen,
  Tianyu Liu (Harvard University)
- **Venue:** arXiv preprint [2011.00329](https://arxiv.org/abs/2011.00329) v1 [cs.HC], 31 Oct 2020 ("9 pages,
  8 figures"); no venue printed. It redesigns BookVIS, a SIGGRAPH Asia 2019 poster
  ([10.1145/3355056.3364594](https://doi.org/10.1145/3355056.3364594)), not read.
- **Licence:** none stated in the text; the arXiv listing carries arXiv's non-exclusive distribution licence 1.0.
- **Thesis:** a phone web app that recognises a **single book cover** from a photo and shows cover-coloured
  visualisations of the book and the user's Goodreads taste; a design and HCI paper, not a recognition paper.
- **PDF:** kept in the study's Drive `Literature` folder as `Visual Companion for Booklovers.pdf`
- **Owner's copy:** the 12-page arXiv PDF with a text layer; read end to end.

## What it gives the study

Almost nothing. It neither boxes spines nor reads a shelf: one cover per photo, recognised server-side by an
ensemble of SIFT with a vocabulary tree, Tesseract OCR and a fine-tuned CNN bag-of-words retrieval model. It is
kept for one remark the topic notes cite, and that remark is not evidence:

- **"Rotation and distortion hurt spine OCR" is an observation, not a measurement.** §3.2 says camera geometric
  distortion and photo rotation "decrease the chances of good quality text recognition", that "handwriting typefaces
  were inaccurately recognized", and that spine images "proved inefficient for unseen images with handwriting
  typefaces". The OCR is Tesseract (ref. 43). No error rate, no test set, no version or language settings. It
  agrees with why we straighten each box and try every quarter-turn, but cannot set any threshold.
- **Spine text carries tokens a title list may not.** "Most of the 'edition' words are on the books' spines"; their
  OCR stores words like "edition" separately. For the downstream matcher, edition and volume words on a spine are
  noise to strip, not title.

What it does not give: spine detection, multi-book photos (a whole shelf is their future work), Hebrew, or any
recognition accuracy — for the ensemble or any member. How the three recognisers are combined, the training-set
size, the CNN backbone and how a spine crop is oriented before OCR are all unstated.

The only numbers are a usability survey of six participants, which the authors themselves call too small; none bears
on the study.

Left out: the AWS architecture, the six visualisations and their colour design, the gesture design, the survey
results and the figures; cross-checked against the full text.
