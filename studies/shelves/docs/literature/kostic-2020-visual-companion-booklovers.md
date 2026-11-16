# Kostic et al. 2020 — Visual Companion for Booklovers (BookVIS)

- **Title:** Visual Companion for Booklovers
- **Authors:** Zona Kostic, Jared Jessup, Jeffrey Baglioni, Nathan Weeks, Johann Philipp Dreessen, Ning Chen,
  Tianyu Liu (Harvard University)
- **Venue:** arXiv preprint [2011.00329](https://arxiv.org/abs/2011.00329) v1 [cs.HC], 31 Oct 2020 ("9 pages,
  8 figures"); no venue printed. It redesigns BookVIS, a SIGGRAPH Asia 2019 poster
  ([10.1145/3355056.3364594](https://doi.org/10.1145/3355056.3364594)), not read.
- **Licence:** none stated in the text; the arXiv listing carries arXiv's non-exclusive distribution licence 1.0.
- **Thesis:** a phone web app that recognises a **single book cover** from a photo and shows glanceable,
  cover-coloured visualisations of the book and of the user's Goodreads taste; a design and HCI paper, not a
  recognition paper.
- **PDF:** kept in the study's Drive `Literature` folder as `Visual Companion for Booklovers.pdf`
- **Owner's copy:** the 12-page arXiv PDF with a text layer; the text layer repeats parts of the reference list across
  pages 10–11 (a layout artefact, no content lost). Read end to end, every figure looked at.

## Why this matters to our task

Very little. It neither boxes spines nor reads a shelf photo: one cover per photo, recognised against a trained image
model. Three things are worth a line:

- **The OCR claim the topic notes cite is in the text, but it is an observation, not a measurement.** §3.2: camera
  geometric distortion and photo rotation "decrease the chances of good quality text recognition", "handwriting
  typefaces were inaccurately recognized", and spine images "proved inefficient for unseen images with handwriting
  typefaces". The OCR is Tesseract (ref. 43). No error rate, no test set.
- **Edition text lives on the spine.** "Most of the 'edition' words are on the books' spines" — a reason to keep spine
  reading even when a cover is visible; for us, a reminder that spine text can carry tokens (edition, volume) a title
  list may not.
- **Whole-shelf input is their future work**, not done: "taking a picture of the entire stack or a bookshelf".

What it does **not** cover: spine detection, multi-book photos, Hebrew, any recognition accuracy.

## The method, in full

### Recognition (§3.2)

An ensemble of three recognisers, run server-side:

1. **SIFT with a vocabulary tree** (Nistér & Stewénius, CVPR 2006): SIFT descriptors hierarchically quantised in a
   vocabulary tree with per-feature weights; a query is descended to its cluster and compared with the images there.
   Good under cover transformations, and the cover "was easily extracted from the bookshelf background", but it cannot
   tell editions apart when they share a cover design.
2. **OCR** (Tesseract) to add text such as "2nd edition", or to retrieve a book "solely based on the image of the book
   spine". If a word like "edition" is detected, it is stored for later processing.
3. **CNN BoW retrieval** (Radenović, Tolias & Chum, "CNN image retrieval learns from BoW", ECCV 2016), fine-tuned, then
   retrained on the same training images. The authors say it needs no manual annotation, handles tilted, distorted
   and low-resolution images, and removed the need for augmentation.

### System (§3.1, Fig. 2)

AWS: a t2.micro EC2 instance runs a Flask app and MongoDB (user data); a GPU EC2 instance holds the TensorFlow/Keras
model and periodically retrains it on user-uploaded cover images stored on an Elastic File System; Elastic Beanstalk
orchestrates. After recognition, book and author data and the user's shelves are fetched live from the Goodreads API;
d3.js draws the visualisations.

### Visual design (§3.3) — summarised only

- Cover colours by **k-means** on the cover; the UI and every chart take those colours. They tried more than four
  dominant colours; it did not reliably pick the salient ones and made colouring harder.
- Six views: bookSelfie (author photo, average and total ratings, rating distance, review count, as cover-coloured
  squares), other books by the author (stacked-bar timeline carousel), similar books (5×5 grid of rating by year),
  myRose (rose diagram of user vs average ratings), dataSelfie (radial genre histogram with density contours), and
  How-it-fits (the new book's dot placed among the genre peaks it belongs to, pulled toward bigger peaks).
- One-thumb gestures only: swipe between pages, drag for hover, tap to select, long-press to save; double-tap
  excluded.

### Gaps — what the paper never states

- Any recognition accuracy, for the ensemble or any member.
- How the three recognisers' outputs are combined.
- The number of books or images in the training set and the retrieval database.
- Vocabulary-tree branching and depth; the CNN backbone; Tesseract version, language packs or settings.
- How a spine image is cropped or oriented before OCR.
- Response time.

## The reported numbers

None on recognition. The only numbers are from a usability survey (§4, Fig. 8):

| What | Result | Where read |
|---|---|---|
| Participants | 6 external (information and library science experts, no data-visualisation experience), plus the authors' own collections; 3 graphic designers for a subjective read of the selfies | text |
| Could read the bookSelfie | 5 of 6 | text |
| "Other books by the author" clear? | 25% yes, 50% no, 25% a written comment | Fig. 8 pie |
| dataSelfie read as the shape of their taste? | 50% / 50% | Fig. 8 pie |
| Book placement (black dot) works well, 1–5 | all answers at 4 or 5; bar heights suggest more 4s than 5s | Fig. 8 bars, by eye |
| Usability of How-it-fits, 1–5 | answers at 3 and 4, mostly 4 | Fig. 8 bars, by eye |
| Next step after the visualisations | 66.7% look for more information, 16.7% continue browsing the shelves, 16.7% one other option (legend shades too close to tell which) | Fig. 8 pie |
| Participants "e" and "f" library sizes | 800 and 1200 books | text |

With six participants none of this is more than anecdote; the authors say so ("a larger and more diverse pool of
users" is needed).

## Discussion arguments worth keeping

- The OCR limitations quoted above, and that one-image-in, one-book-out models lose information when the edition is
  only on the spine; they suggest feeding a spine and a cover image together.
- Multiple authors: only the first author was used.
- Users asked how different covers of the same book would be handled; the authors call that "a minor issue" for
  recognition (no evidence given).

## What is not in this article

- No code, data or supplementary material is linked. Nothing to fetch.
- The 2019 SIGGRAPH Asia poster (ACM) was not read.

## Figures

- **Fig. 1** (p. 2). The six views on phone mock-ups, with Susan Sontag covers ("The Volcano Lover" 1992, "Where the
  Stress Falls" 2003, "Sontag on Film" 2012) and their extracted colour bars; a photo of a hand holding a phone over a
  green Sontag cover propped against a short row of books on a shelf, the cover filling the phone screen. The other
  books' spines are visible but not processed.
- **Fig. 2** (p. 3). The AWS architecture diagram described above.
- **Fig. 3** (p. 4). Top: four versions of one O'Reilly cover ("Interactive Data Visualization for the Web", 2nd ed.):
  sharp, heavily blurred, a noisy low-quality print and a cropped one, labelled "CNN BoW". Middle left: four
  translated editions of the same cover (Chinese, Japanese, Polish titles) — different-language covers of one book.
  Middle centre: **six cream spines standing side by side**, each with dashed red OCR boxes over its title lines
  (vertical text; legible titles include "EXTRA VIRGIN" and "JOHN GRAY"); the boxes cover title, author and publisher
  blocks separately. Middle right: the cover with word boxes ("Interactive", "Data", "Visualization", "for", "the",
  "Web", "Scott Murray") labelled "OCR used for text recognition". Bottom: a phone photographing the cover tilted on a
  wooden shelf, with red lines joining matched SIFT keypoints to the upright cover, labelled "SIFT used to calculate
  descriptors and generate trees". The spine panel is the only spine material in the paper; it shows no recognition
  result.
- **Fig. 4** (p. 5). UI/UX: gesture icons (swipe, tap, hold, drag), a 360 dp four-column grid, the navigation map
  (book image ↔ bookSelfie → other books → similar books; book image ↔ How-it-fits → dataSelfie → myRose), thumb-reach
  zones (hard, stretching, natural) and the swipe transitions.
- **Fig. 5** (p. 6). The dataSelfie design path: hand sketches of a genre histogram and bell curve, a radial genre
  stacking, dots as landmarks turned into topographic contours, and the How-it-fits placement of a "new book" dot.
- **Fig. 6** (p. 7). Three books (Kyle Simpson's "Scope & Closures", Sontag, C. S. Lewis's "Mere Christianity"): the
  cover's four dominant colours, How-it-fits charts, bookSelfies, and three users' myRose diagrams each with its own
  palette.
- **Fig. 7** (p. 8). Selfie creation steps and six users' dataSelfies (a–f), annotated with "outline shades", "inner
  circle size" and "inner dark area"; a and b look nearly identical.
- **Fig. 8** (p. 12, appendix). The survey questions beside summarised answers and the pies and bars tabulated above.

## Deliberately omitted

The introduction's arguments about bookstores, serendipity and COVID-19, the related work on library VR and
visualisation, and the details of each chart's visual encoding beyond one line each — none bears on boxing or reading
spines. Cross-checked against the full 12-page text.
