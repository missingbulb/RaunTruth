# Literature review — index and status

What computer vision, retail dense-shelf detection and library science already know about boxing books on a
shelf photo and reading their titles, gathered 2026-11-15 so the study builds on it instead of re-deriving it.
Start with [`SURVEY.md`](SURVEY.md); each paper note holds what that source gives the study's spine detection and reading.

The PDFs live in the study's Drive root, in `Literature/`, named as the notes' `PDF:` lines say. Only the notes are in
the repo.

## The notes

| Document | What it answers |
|---|---|
| [`SURVEY.md`](SURVEY.md) | The synthesis: how the problem was framed, what failed, the few comparable numbers, what can honestly score us, the changes the evidence supports, ranked |
| [`talker-2013-spine-segmentation.md`](talker-2013-spine-segmentation.md) | The classical, viewpoint-independent spine segmenter: candidates and a contrast-free seam test, then a heuristic selection (the global choice is only in the WACV abstract) |
| [`ma-2024-oriented-rcnn-spines.md`](ma-2024-oriented-rcnn-spines.md) | The one rigorous spine-detection benchmark (CC0 Shenzhen set, AP@0.75), YOLOv8n-OBB included |
| [`yang-2016-smart-library.md`](yang-2016-smart-library.md) | Why Hough was demoted to the dominant lean; per-line reading, the up/down test, catalog retrieval |
| [`goldman-2019-sku110k.md`](goldman-2019-sku110k.md) | The EM-Merger that replaced greedy NMS on densely packed shelves |
| [`tonioni-2017-shelf-subgraph.md`](tonioni-2017-shelf-subgraph.md) | Neighbour consistency, then recovering the missed items from their neighbours |
| [`chen-2022-unitail.md`](chen-2022-unitail.md) | Quadrilateral boxes on dense shelves, and reading plus matching products |
| [`llabres-2024-book-matching.md`](llabres-2024-book-matching.md) | Matching noisy spine reads to a title list; detection, not reading, costs the most |
| [`suissa-2023-hebrew-ocr-correction.md`](suissa-2023-hebrew-ocr-correction.md) | Correcting Hebrew OCR with errors synthesised to look like the corpus's own |
| [`niso-z3941-spines.md`](niso-z3941-spines.md) | What a spine is supposed to carry and which way its title runs (Latin-script books) |
| [`anegawa-2020-text-detection-rough-books.md`](anegawa-2020-text-detection-rough-books.md) | Growing one box per book from a scene-text detector's word boxes, using lean, a corridor and a two-colour (spine/ink) match; weak numbers |
| [`kostic-2020-visual-companion-booklovers.md`](kostic-2020-visual-companion-booklovers.md) | A single-cover recognition app (SIFT + Tesseract + CNN BoW); the source of the "rotation and distortion hurt spine OCR" remark, which it never measures |
| [`wieczorek-2022-trixi-the-librarian.md`](wieczorek-2022-trixi-the-librarian.md) | Per-shelf perspective warp from shelf corners before detection; COCO "book" merges spines; HSV colour beat text and SIFT, no accuracy reported |
| [`liu-2016-planogram-recurring-patterns.md`](liu-2016-planogram-recurring-patterns.md) | Finding repeated items without templates; learning a template from the items found to recover the ones missed |
| [`ray-2018-upc-planogram.md`](ray-2018-upc-planogram.md) | Choosing the whole shelf row at once: candidates per position, then the best non-overlapping path through a graph |
| [`sah-2026-hough-rectified-shelves.md`](sah-2026-hough-rectified-shelves.md) | Hough over shelf lines picks one of two fixed homographies: +2–5 mAP on angled photos, lost above 40 objects; lean threshold toward boards |
| [`edwardy-2001-reshelving-control-charts.md`](edwardy-2001-reshelving-control-charts.md) | Library shelving accuracy: misshelved means out of order with a neighbour; sample ~10% of shelves and shelf-read only when the accuracy rating drops (93–98% in order) |
| [`newtonmiller-2010-inventory-cost-eblip.md`](newtonmiller-2010-inventory-cost-eblip.md) | The barcode-inventory baseline: 8.35 s per book, 82% of misshelved books within 25 books of their place, 30% of "Missing" books in place |

The researchers' working notes, every claim cited, are in [`topics/`](topics/): [spine
detection](topics/spine-detection.md), [spine reading and Hebrew](topics/spine-reading-hebrew.md), [library
inventory](topics/library-inventory.md), [retail dense shelves](topics/retail-dense-shelves.md) and [datasets and
code](topics/datasets-code.md).

## Findings that change how we build

1. **Detection is the wall.** In the one end-to-end measurement, matching falls from 0.918 on hand-drawn spines to
   0.641 on detected ones (Llabrés 2024). Work on Find books before reading.
2. **Our finder is in the published classical family.** The one classical segmenter with a reported precision and
   recall (Talker: 80.7 / 87.3 and 70.4 / 72.6, tuned on its test images, at a stricter match) is not clearly above ours, so there is no stronger
   classical baseline to beat — only upgrades to borrow.
3. **Over-generate, then choose once.** Talker's selection over a tree of overlapping candidates and SKU-110K's
   EM-Merger both replace pairwise merging with one global choice of non-overlapping spines — our merged-close-lines
   and post failures. Talker's candidates alone reach recall 95 at precision ~38: the choice is where precision comes from.
4. **Neighbours check and recover.** Pruning by neighbour consistency alone costs recall (Tonioni: precision 78→98%,
   recall stayed ~74%); recovering the gaps from the neighbours is what brought it to ~90/90.
5. **Remove the lean first.** Smart Library kept Hough only to find the dominant book direction and rotated by it.
6. **Read per line and keep alternatives.** Every published reader goes line by line; pass the matcher several
   readings in both orientations rather than one.
7. **No one has measured our hardest cases**: Hebrew spines, home shelves, dark plain spines, turned photos. Our own
   ground truth is the only score of them; the CC0 Shenzhen set can score detection on library shelves, nothing finer.
8. **Hebrew evidence is thin and mostly self-published.** Z39.41 §6.2 does give the Hebrew spine convention; read
   through, a Hebrew spine wants the opposite quarter turn to an English one. Count the turn per language in our
   ground truth before using it as a prior, and measure our own look-alike confusion matrix.

## Sources not reached

Stanford's Chen 2010 and Tsai 2011 (TLS failure through the proxy; their recall figures conflict between sources);
the MDPI *Electronics* 2025 YOLOv11 + PaddleOCR paper (403; 96.8% unverified); paywalled: Taira 2003/2004, Lee 2008,
Quoc & Choi 2009, Nevetha & Baskar 2015, Zhou 2022 (IPM), AuRoSS (IROS 2015), ShelvAR (ISMAR 2013). The full list,
with what each would answer, is in [`SURVEY.md`](SURVEY.md#gaps-and-sources-not-reached).
