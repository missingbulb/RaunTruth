# Wieczorek et al. 2022 — Trixi the Librarian: a PR-2 robot that detects, identifies and sorts books

- **Title:** Trixi the Librarian
- **Authors:** Fabian Wieczorek, Björn Sygo, Shang-Ching Liu, Mykhailo Koshil, in that order as printed (dept.
  Informatik, TAMS, University of Hamburg). The section headings name which author wrote each part.
- **Venue:** arXiv [2210.10110](https://arxiv.org/abs/2210.10110) v2 [cs.RO], 20 Oct 2022 (v1 18 Oct 2022). A
  student-project report; no venue, not peer-reviewed.
- **Licence:** CC BY 4.0, as the arXiv abstract page states; the PDF itself states none.
- **Thesis:** a two-armed PR-2 sorts three books on a shelf. It finds spines with a YOLOv5 model fine-tuned on 611
  labelled images, identifies them by HSV colour histograms after text and SIFT matching proved unreliable, and
  moves them with a Shadow hand plus a gripper.
- **Our copy:** the complete **10-page** arXiv v2 PDF, text, references and appendix, all read. (An earlier note
  called the local file "only 2 pages; possibly truncated". It is not.) §IV-B4b carries a stray paste of an online
  editor's track-changes panel; the sentence about Google Vision is broken around it.
- **PDF:** kept in the study's Drive `Literature` folder as `Trixi the Librarian.pdf`.

## What it gives the study

- **Per-shelf perspective correction from the shelf's own corners.** Before detection, each shelf level is warped on
  its own so the spine sides run along the image axes; the four corners come from an AprilTag's known pose plus the
  shelf's dimensions, and boxes are mapped back through the inverse matrix. This is the per-shelf correction Sah &
  Mathew only propose ([sah-2026](sah-2026-hough-rectified-shelves.md)). We have no tag, but our board lines give
  each shelf's top and bottom edges, and their ends against the posts could give the corners: one warp per shelf in
  place of R9-roll's one levelling, making spine sides vertical even under yaw (our inference). Fig. 3 shows why it
  works: the books stand square to the shelf, so straightening the level's front edge straightens their sides too —
  which a leaning book breaks.
- **A pretrained COCO "book" detector merges neighbours** — it "had a critical issue for recognizing multiple books
  spine together as one book spine", our merged-spines failure reported independently, and the reason they
  fine-tuned on their own 611 images. Even then, Fig. 5 shows several thin adjacent spines boxed together or partly,
  and boxes stopping short of spine tops, and Fig. 17 one "Book Spine 0.85" box over a whole shelf (captioned "quite
  good").
- **Text can lose to the camera; colour cannot tell a series apart.** The spine text was mostly too small or blurry
  for the head camera ("most of the time, the camera still fails to give a clear enough image"); CRAFT plus a
  TPS-ResNet-BiLSTM-attention recogniser and Google Vision were both set aside, and SIFT confused look-alike books.
  Identification fell to **HSV histograms, 20 bins per channel, cosine similarity, score = sim_hue + 0.2 · sim_sat**
  ("empirically defined"), with greedy one-to-one assignment. Fig. 8's score matrix shows the limit: a run of black
  series spines of one publisher gives rows of near-equal scores. For the title matcher, colour could at most rank
  candidates when there is no text (dark plain spines), never override a confident read (our inference).
- **"No standardized way in the field of book spine recognition exists"** (§II-B) — the authors' own statement that
  nothing public scores this task, cited in SURVEY.

What it does not give: any detection or identification accuracy (no mAP, IoU, precision or recall); the only claim is
the abstract's "good enough to repeatedly sort three books on a shelf", from one demo. No leaning or turned books
(all upright on an office cabinet), no dense home shelves, no Hebrew; the database holds about 15 books. Detection is
an axis-aligned box. The 611 images (Roboflow, a key-bearing download link, ref. [30]; licence not stated; the public
project by "shangching" in [topics/datasets-code.md](topics/datasets-code.md) is unconfirmed as the same) could at most
score upright-spine detection in a different regime. Fig. 4's screenshot of that project shows 1446 images after
tripling the training set, which does not reconcile exactly with 611 originals (our arithmetic: 423 × 3 + 188 = 1457).

Ten observations clustered by k-means and pruned below 4 recognitions vote on each book over time; a model for
combining several phone shots, not for one photo.

Left out: the robot, manipulation and planning, the book-database fields, the confidence readouts, the
figure-by-figure descriptions and the related work beyond the line above; cross-checked against the full text.
