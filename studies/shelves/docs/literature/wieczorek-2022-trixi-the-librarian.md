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
- **Our copy:** the complete **10-page** arXiv v2 PDF: text, references, an appendix of Figs. 14–20 and 25 embedded
  images, all read. (An earlier note called the local file "only 2 pages; possibly truncated". It is not.)
- **Weakness of the copy:** §IV-B4b carries a stray paste of an online editor's track-changes panel ("Track changes
  is off Everyone … Sep 30, 2022 10:07 PM"). The sentence about Google Vision is broken around it.
- **PDF:** kept in the study's Drive `Literature` folder as `Trixi the Librarian.pdf`.

## Why this matters to our task

- **Per-shelf perspective correction, done properly.** Before detection, each shelf level is warped on its own to a
  view where the spine edges are axis-aligned. Its four corners are projected from an AprilTag's known pose, and the
  boxes are mapped back by the inverse matrix. This is the per-row rectification that Sah & Mathew only propose
  ([sah-2026](sah-2026-hough-rectified-shelves.md)). Trixi gets the corners from a fiducial; we would have to read
  them off the boards.
- **Evidence that text can lose to colour on a real camera.** The spine text was mostly too small or blurry for the
  head camera. Both a scene-text model and Google Vision were tried and set aside. Colour histograms alone made the
  final call. With a 15-book database they confuse same-coloured books (Fig. 8).
- **Off-the-shelf COCO "book" merges neighbours.** A pretrained detector "had a critical issue for recognizing
  multiple books spine together as one book spine". That is our merged-spines failure, reported independently. It is
  the reason they fine-tuned on their own 611 images.
- **Temporal voting.** Ten observations are clustered and pruned, which is out of reach for one phone photo but a
  model for combining several shots.
- **What it does not cover:** any detection or identification accuracy, IoU, precision or recall; leaning or turned
  books (all spines here stand upright on an office cabinet); Hebrew or non-Latin text; dense home shelves. The task
  is 3 books in the demo and about 15 in the database.

## The method, in full

**System** (§III, Fig. 1). Three ROS modules: a vision pipeline, task planning and manipulation.
- The camera is an Azure Kinect RGB-D on the PR-2's head.
- The vision pipeline runs preprocessing → spine detection → text recognition and book matching against a book
  database. Shelf detection uses AprilTags.
- It produces a MoveIt planning scene.

**1. Preprocessing** (§IV-A, Fig. 3, Fig. 5).
- The head camera sees the shelf in perspective, so spine edges are not axis-aligned.
- For each shelf level, the four corners come from the AprilTag's known pose plus offsets for the shelf's
  dimensions. They are projected into the image as anchors.
- A perspective transform per level gives **two images** (two levels) with spine edges along the image axes.
- The inverse matrix is kept, so detections can be mapped back.

**2. Book database** (Table I). Fields: id, title, height, width, depth, author, cover type (hard/soft), and count.
Spine images of each database book were photographed (Fig. 16).

**3. Spine detection** (§II-B, §IV-B2, Fig. 4).
- The COCO "book" class failed: it missed spines and merged several into one.
- So the authors labelled spines in **611 images** and fine-tuned YOLOv5 through Roboflow. Detection is an
  axis-aligned box (Conclusion: "a bounding box approach").
- Dataset at Roboflow, ref. [30] (a key-bearing download link, `app.roboflow.com/ds/NC9bTX2P8g?key=…`, by
  Shang-Ching Liu).
- **Fig. 4's screenshot** (Roboflow dataset page, transcribed):
  - 1446 images; train 1.3k (87%), validation 119 (8%), test 69 (5%).
  - Preprocessing: auto-orient, resize to fit within 416×416.
  - Augmentation: 3 outputs per training example, 90° rotation clockwise and counter-clockwise, brightness −25% to
    +25%.
  - The thumbnails show yellow polygon outlines on upright and lying spines.
  - *Our arithmetic:* the split does not reconcile exactly with 611 originals tripled in training (423 × 3 + 188 =
    1457, not 1446).
- Training hyper-parameters, epochs, weights and confidence threshold are not given. One appendix frame (Fig. 17)
  shows a "Book Spine 0.85" label.

**4. Text detection** (§IV-B3). CRAFT runs on the two rectified level images. Its polygons (magenta in Fig. 5) are
mapped back through the inverse matrix.

**5. Text recognition** (§IV-B4).
- (a) The deep-text-recognition-benchmark (DTRB) best combination: TPS + ResNet + BiLSTM + attention.
- (b) Google Vision API, added for size, light, font and multi-language trouble. Its drawbacks: "most of the time,
  the camera still fails to give a clear enough image", and free use is limited to 1000 calls a month.
- Text was to be compared to database titles with "fuzzywoozy" (fuzzywuzzy) similarity (§II-B). The final system
  does not use text (step 7).

**6. HSV histogram** (§IV-B5).
- Per detected spine, a histogram of each HSV channel with **20 bins**.
- Each is compared with each database book's histogram by **cosine similarity**.

**7. SIFT** (§IV-B6). Tried, and it works on some examples (Fig. 6). It fails among similar books (Fig. 7). Not
used.

**8. Final score and assignment** (§IV-B7, Algorithm 1).
- Score = sim_hue + 0.2 · sim_sat, with value ignored. "Empirically defined", with no search reported.
- Greedy one-to-one assignment over the score matrix: take the highest cell, assign that book to that detection,
  delete its row and column, and repeat. The score is the recognition's confidence.

**9. Belief over time** (§IV-C, Fig. 9).
- **10** sequential observations, each a set of recognised books with poses.
- k-means on position, with k = the most recognitions in any one observation.
- Clusters with **fewer than 4** recognitions are pruned as misdetections.
- The cluster position is the mean. The ID comes from Algorithm 1 again, with the score being how often each ID
  occurs in the cluster.
- Cluster confidence c = Σ conf(bᵢ) / n. As printed, the sum runs from i = 0 to n, which is n + 1 terms over n.

**10. Planning and manipulation** (§V, §VI). Noted only for completeness:
- Procedural plans move books to the lower shelf in sorted order.
- Extraction: a Shadow-hand finger tilts the book, the gripper grasps it, lets it fall back, regrasps and pulls it
  out.
- Placing: the book is leaned against the wall or a neighbour using the force-torque sensor. Sorting is only
  possible tallest-first.

### Gaps: what the paper never states

- Any detection metric (mAP, precision, recall, IoU) for the fine-tuned YOLOv5.
- Any identification accuracy for text, SIFT or HSV.
- The model size, the epochs, the training and test split as used, and the confidence and NMS thresholds.
- The camera resolution in use. The image size at which text became illegible.
- How text was meant to combine with colour before it was dropped.
- The database size. About 15 spines appear in Fig. 8, and IDs up to 18 appear in Figs. 10 and 13.
- The scale of the confidence. Values shown are 0.019–0.090 (Figs. 10 and 13), on a score whose maximum should be
  1.2.
- How many sort runs were attempted, and how many succeeded.

## The reported numbers

None quantitative. The abstract's claim is that the system is "good enough to repeatedly sort three books on a
shelf"; §VII describes one demo of three books moved from the upper to the lower shelf. The only numbers in figures:

| What | Value | Where |
|---|---|---|
| Images in the Roboflow project (after augmentation) | 1446 (train 1.3k, val 119, test 69) | Fig. 4, screenshot |
| Detections before clustering, one run | 140 | Fig. 9a caption |
| Recognition confidences, first panel | 0.018611, 0.028617, 0.032551, 0.026388, 0.034756 | Fig. 10, read off the screenshot |
| Recognition confidences, demo | 0.063982, 0.066345, 0.088975, 0.090277 | Fig. 13, read off the screenshot |
| Estimated spine sizes shown | e.g. 29 mm × 221 mm, 47 mm × 247 mm | Figs. 10, 13 |

## Discussion and the authors' limitations

- **Text fails on illegible spines.** "It suffers as soon as the text becomes illegible e.g. due to being too small".
  The authors also note that the text size the camera could read conflicted with the weight the gripper could lift,
  so they made a fake book cover with large text (Fig. 15).
- **Look-alike books defeat SIFT** (Fig. 7). Neither text nor SIFT "showed sufficient performance".
- **The detector may overfit.** The training set is small; a larger one is the first proposed improvement, with
  "more fine-tuned metrics" for matching.
- **No standard to compare against.** "Comparing the results of the mentioned work meaningfully is hard as no
  standardized way in the field of book spine recognition exists" (§II-B).
- **Related-work context worth keeping:**
  - Most classical work detects spines by edges and line-segment processing and often needs an orthographic view.
  - Talker & Moses avoid that ([talker-2013](talker-2013-spine-segmentation.md)).
  - Fowers et al. 2010 match spines by DoG features over YCbCr plus SIFT, without OCR. That is the colour-matching
    precedent Trixi follows.

## What is not in this article

- The dataset is a key-bearing Roboflow download link, ref. [30]. It was not fetched, and its licence is not stated
  in the paper. A public Roboflow Universe project by "shangching" is mentioned in
  [topics/datasets-code.md](topics/datasets-code.md); the paper does not link it, so the identity is unconfirmed.
- No code repository is linked. The demo video seen in Fig. 13 (`librarian_showcase_full.mp4`) is not published.

## Figures

The figures have no URLs of their own outside the [arXiv HTML](https://arxiv.org/html/2210.10110v2).

- **Fig. 1 (p. 3): the system diagram.**
  - The vision pipeline: preprocessing, book spine detection, text recognition, book matching, and shelf detection
    by AprilTags.
  - A "Books" database, a MoveIt planning scene in RViz, self-calibration, task planning with on/off switches, and
    manipulation (controller, Shadow hands, gripper) acting on the physical world.
- **Fig. 2 (p. 3): the robot.** The PR-2 photographed with a Shadow hand on one arm and a two-finger gripper on the
  other.
- **Fig. 3 (p. 3): the per-level warp.**
  - A rendered cabinet with two shelf levels, each holding three upright coloured blocks as books.
  - Each level's four corners are dots, red for the upper level and blue for the lower, joined by dashed outlines.
  - Arrows lead to two warped images in which each level is a rectangle with the books' sides vertical.
  - *What you see:* the warp straightens the level's front edge and the spine sides together, because the books
    stand square to the shelf.
- **Fig. 4 (p. 3): the Roboflow dataset page.**
  - Numbers transcribed in Method step 3.
  - The eight thumbnails are dim office shots: two nearly black frames, a cabinet seen from afar, and close-ups of
    spines with yellow outlines, some books lying flat.
- **Fig. 5 (p. 4): reversal of the warp.**
  - Left: the two rectified levels with green spine boxes and magenta text polygons.
  - Right: the same boxes mapped back onto the source photo, where they become slanted quadrilaterals.
  - The scene: a grey office cabinet with an AprilTag, about 17 books, upright, mostly white, black and
    red/pink.
  - *What you see:* several thin adjacent spines are boxed together or partly, and a white spine at the right of the
    upper shelf has a lone box. Boxes stop short of some spine tops.
- **Fig. 6 (p. 4): SIFT success.**
  - Database spines are shown on the left in vertical and horizontal views, with match lines to a detection.
  - The caption says it matched "but not for the vertical one". It is too small to read further.
- **Fig. 7 (p. 4): SIFT failure.** The same layout, with match lines fanning to several similar database books.
- **Fig. 8 (p. 5): the score matrix.**
  - Rows: about 15 detected spines, turned horizontal. Columns: about 18 database spine photos, upright, including
    *Requirements-Engineering und -Management*, *CAE-gestützte IC-Entwurfsmethoden*, *Arithmetik*, *Technik
    Wörterbuch*, *Deutsches Wörterbuch* (Duden) and *Die Suchfibel*.
  - Green is high and red is low.
  - *What you see:* a yellow detection scores bright green against **several** yellow database spines. A run of
    black series spines (same publisher design) gives rows of near-equal greens. This is the look-alike confusion
    colour cannot break.
- **Fig. 9 (p. 5): clustering.** Three 3-D scatter plots of recognition positions in metres: (a) 140 detections,
  (b) colour-coded clusters, (c) after pruning.
- **Fig. 10 (p. 5): the "Librarian" RViz panel.**
  - Columns: ID, confidence, size, text. Rows: 11 *CAE-gestützte IC-Entwurfs-methoden*, 8 *Betriebliche
    Expertensystem-Anwendungen*, 4 *LOGIC DESIGN AND SIMULATION Volume 2*, 16 *Arithmetik*, 9 *Toolbox Programming*.
  - The confidences are 0.019–0.035.
- **Figs. 11–12 (p. 7): manipulation.** Photo strips: extraction steps (a)–(f), from tilting with the Shadow-hand
  finger to the regrasp, and placing steps (a)–(d), from leaning to pushing upright.
- **Fig. 13 (p. 7): the demo screen.**
  - RViz with a green collision-model cabinet.
  - Librarian panel IDs 15 "TECHNIK-…", 17 "Der Kleine DUDEN", 3 "Elektronische …" and 18 "Die Suchfibel", with
    confidences 0.064–0.090.
  - A camera view with green spine boxes on two upright books.
  - A rectified "Azure Kinect RGB Rectified" panel and a live score matrix.
- **Figs. 14–20 (pp. 9–10): development history.** One-gripper grasp, the fake large-text cover, collecting database
  images, an early YOLOv5 frame, the first Shadow-hand pick, the first two-hand cooperation, and a robot holding a
  yellow Duden up to read it.
  - Fig. 17 shows two large red "Book Spine" boxes, one at 0.85, covering a whole upper shelf of books as one
    detection. It is an example of the merged-spines failure, though the caption calls it "quite good".

## Where we diverge, and what to take (our inference)

- **Per-shelf rectification from the shelf's own corners** is the strongest idea for us. We have no AprilTag, but our
  board lines give each shelf's top and bottom edges. Their ends against the frame's posts could give the four
  corners. That replaces one global levelling (R9-roll) with one warp per shelf, so spine sides become vertical
  even under yaw.
- **Colour as a tie-breaker, not an identifier.** Trixi's own Fig. 8 shows HSV failing on same-design series, which
  are common on home shelves. For our title matcher, a colour histogram could rank candidates only when text is
  absent (dark plain spines). It should never override a confident read.
- **Spine-level detector data.** The 611 labelled images (office shelf, few books, upright, German and English
  titles) are a different regime from ours. They are axis-aligned boxes with no quadrilaterals, and the paper gives
  no licence for them. At most they could score detection on upright spines, and nothing finer.
- **Nothing here is a benchmark number.** The paper offers no accuracy to compare with our finder.

## Deliberately omitted

- The service-robot motivation.
- The manipulation and grasping literature in §II-A.
- MoveIt, BioIK and OMPL planning detail beyond the summary in step 10.
- The task-planning formalism.

Cross-checked against the full 10-page text and every embedded image.
