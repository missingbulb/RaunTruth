# Book-spine detection and segmentation in bookshelf photos: literature survey

Scope note: compiled 2026-11-15 with a capped tool budget. Semantic Scholar API returned HTTP 429 (rate limit) on every query, so discovery used arXiv API + web search. Stanford (web.stanford.edu) PDFs failed with a TLS "self-signed certificate in chain" error through the sandbox proxy, and MDPI PDF endpoints returned HTML (bot wall); those papers are listed but not downloaded. Downloaded PDFs (verified with `file` as real PDFs, not opened):
the study Drive folder `Literature/`
- `Smart Library - Identifying Books in a Library using Richly Supervised Deep Scene Text Reading.pdf` (arXiv 1611.07385)
- `Image-text matching for large-scale book collections.pdf` (arXiv 2407.19812)
- `Trixi the Librarian.pdf` (arXiv 2210.10110)
- `Book Spine Segmentation for Bookshelf Reorganization.pdf` (Reichman Univ. MSc thesis, 23.7 MB)

## Q1. Which papers/theses exist, and what does each method do, step by step?

### Takeaway
The field runs in three waves: (a) 2003-2015 classical pipelines (model fitting / finite-state automata, Hough lines with a dominant-direction estimate, active contours + line-segment filtering, MSER text cues), mostly on library shelves; (b) 2016-2022 CNN-assisted (text-saliency splitting, Mask R-CNN, YOLOv3/v5, DeepLabv3+); (c) 2021-2025 oriented detectors (Oriented R-CNN, YOLOv8-OBB) and foundation models (SAM, Grounding DINO + SAM, VLM readers). Almost all work is on *library* shelves (uniform, upright, tightly packed, call-number labels), not home shelves with leaning books, covers lying flat or Hebrew text.

### Cited Findings

Classical era (annotated bibliography; dates flagged)
- **Taira, Uchida & Sakoe (2003)**, "Book boundary detection from bookshelf image based on model fitting," Int. Symp. Information Science and Electrical Engineering, 601-604: uses a finite-state-automaton model with global optimization to detect book angles and boundaries. No numbers quoted by later citers. Paywalled/not found online. — [Yang et al. 2016 related work, via ar5iv](https://ar5iv.labs.arxiv.org/html/1611.07385)
- **Taira et al. (2004)**, "Book boundary detection and title extraction for automatic bookshelf inspection," Korea-Japan Joint Workshop on Frontiers of Computer Vision. — [Ma et al. 2024 ref. 5](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- **Lee, Chang, Archibald & Pitzak (2008)**, "Matching book-spine images for library shelf-reading process automation," IEEE CASE 2008, 738-743 (paywalled IEEE). — [Yang et al. 2016](https://ar5iv.labs.arxiv.org/html/1611.07385); [ResearchGate record](https://www.researchgate.net/publication/4373643_Matching_Book-Spine_Images_for_Library_Shelf-Reading_Process_Automation)
- **Quoc & Choi (2009)**, "A framework for recognition books on bookshelves," Emerging Intelligent Computing Technology and Applications (ICIC 2009, Springer LNCS), 386-395: a general framework for spine extraction addressing lighting and distortion. Paywalled. — [Yang et al. 2016](https://ar5iv.labs.arxiv.org/html/1611.07385); [ResearchGate](https://www.researchgate.net/publication/220778125_A_Framework_for_Recognition_Books_on_Bookshelves)
- **Chen, Tsai, Girod, Hsu, Kim & Singh (2010)**, "Building book inventories using smartphones," ACM Multimedia 2010, 651-654: an efficient Hough-based book-boundary detector, then SURF matching for retrieval. — [Yang et al. 2016](https://ar5iv.labs.arxiv.org/html/1611.07385)
- **Tsai, Chen, Chen, Hsu, Kim, Singh & Girod (2011)**, "Combining image and text features: a hybrid approach to mobile book spine recognition," ACM MM 2011, 1029-1032: spine segmentation + bag-of-features image matching + OCR text. — [ResearchGate](https://www.researchgate.net/publication/221572644_Combining_Image_and_Text_Features_A_Hybrid_Approach_to_Mobile_Book_Spine_Recognition); [Yang et al. 2016](https://ar5iv.labs.arxiv.org/html/1611.07385)
- **Talker (2013 MSc thesis, Reichman Univ.)**, "Book spine segmentation for bookshelf reorganization" (open PDF, downloaded) and **Talker & Moses (WACV 2014)**, "Viewpoint-independent book spine segmentation," pp. 453-460, DOI 10.1109/WACV.2014.6836066: shape-dependent active contour from seed points produces spine candidates; detected line segments are filtered by structural constraints (spine borders); final spine set selected by a *maximal weighted independent set* on a conflict graph with spatial constraints. Targets general viewpoints (perspective), text/texture on spines, close-packed books; application: virtual "tidying" of shelves. — [Haifa CRIS](https://cris.haifa.ac.il/en/publications/viewpoint-independent-book-spine-segmentation/); [mlanthology](https://mlanthology.org/wacv/2014/talker2014wacv-viewpoint); [thesis PDF](https://runi.ac.il/media/dwefkmbw/book-spine-segmentation-for-bookshelf-reorganization-2013.pdf); [ResearchGate](https://www.researchgate.net/publication/269299980_Viewpoint-independent_book_spine_segmentation). Author-name conflict: DBLP lists different authors for this title (likely indexing error) and one record gives the second author as "Yoram" — [search summary of dblp/ISC records](https://dblp.uni-trier.de/db/conf/wacv/wacv2014.html)
- **Fang et al. (2014)**, "Book-spine recognition by robot vision based on wavelet analysis and probability Hough transform," Comput. Eng. Sci. (Chinese). — [Ma et al. 2024 ref. 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- **Nevetha & Baskar (2015)**, "Automatic book spine extraction and recognition for library inventory management," Proc. 3rd Int. Symp. Women in Computing and Informatics (ACM), 44-48. Paywalled. — [Yang et al. 2016](https://ar5iv.labs.arxiv.org/html/1611.07385); [ResearchGate](https://www.researchgate.net/publication/301377077_Automatic_Book_Spine_Extraction_and_Recognition_for_Library_Inventory_Management)
- **Multi-row shelves (IEEE 2016/17)**, "An approach to recognize book title from multi-cell bookshelf images": horizontal edges split shelf rows, then vertical lines split spines (same skeleton as our current finder). — [IEEE Xplore 7890886](https://ieeexplore.ieee.org/document/7890886/)
- **Cui & Ren (2020)**, spine localization via MSER-based text detection; **Cao et al. (2019)** OpenCV + Tesseract; **Cao et al. (2018)** projection operator for call numbers (all Chinese venues). — [Ma et al. 2024 refs 2,4,7](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Patent: "Method and system for identifying books on a bookshelf" (US 9977955 / WO2015192246A1), segmenting shelf photos into per-spine regions. — [Google Patents](https://patents.google.com/patent/WO2015192246A1/en)

CNN-assisted era
- **Yang, He, Huang, Zhou et al. (2016)**, "Smart Library" (arXiv 1611.07385, open): (1) Hough transform used *only* to estimate the dominant book direction; (2) rotate the whole image by it; (3) a text/non-text CNN (32x64 colour patches, shared conv layers with the recognizer) gives a saliency map; (4) non-max suppression along the axis of the saliency map yields split points between adjacent books. Claim: gives "a clear segmentation of each book even when two neighbor book spines have the same color." No thresholds/window sizes given. — [ar5iv](https://ar5iv.labs.arxiv.org/html/1611.07385)
- **Zeng, Yang & Zhong (2020)** mountain-shaped semantic-segmentation net for spines; **(2021)** Mask R-CNN with an added angle-regression branch for oriented spine boxes. — [Ma et al. 2024 refs 20, 22](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- **Xie et al. (2021)** YOLOv5 + OCR with statistical pre-pruning; **Wang et al. (2022)** YOLOv3-Tiny with multi-scale outputs for out-of-sequence detection; **Wang X. et al. (2022)** multi-angle image rotation before detection. — [Ma et al. 2024 refs 26-28](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- **Zhou et al. (2022)**, "Library on-shelf book segmentation and recognition based on deep visual features," Information Processing & Management (Elsevier, paywalled): instance-segmentation masks -> affine warp to rectangles -> learned visual-feature encoder for matching (colour/texture/design of the whole spine, not only text); deployed on a library robot prototype. — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0306457322002023)
- **Wieczorek et al. (2022)**, "Trixi the Librarian" (arXiv 2210.10110, open): PR2 robot sorting books; multistep vision pipeline mixing DL models and conventional CV; good enough to repeatedly sort three books. — [arXiv abstract](https://arxiv.org/abs/2210.10110)
- **Ji, Zhang & Tang (2023)**, improved DeepLabv3+ for spine segmentation (J. Comput. Appl.). — [Ma et al. 2024 ref 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)

Oriented-detector / foundation-model era
- **Ma, Wang, Li, Xu & Han (2024)**, "An Accurate Book Spine Detection Network Based on Improved Oriented R-CNN," Sensors 24(24):7996, **CC BY 4.0**, PDF https://www.mdpi.com/1424-8220/24/24/7996/pdf (download blocked by bot wall here). Steps: ResNet50 with deformable conv in last 3 stages; PAFPN neck (N2-N6); oriented RPN with midpoint-offset box encoding (x,y,w,h,Δα,Δβ); anchor aspect ratios replaced by an improved K-median (K=3, distance 1-IoU) clustering giving h/w ratios {1.79, 7.05, 15.94} instead of {0.5,1,2}; 1024x1024 input, SGD lr 0.005, batch 2, 48 epochs. — [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- **Llabrés, Dey, Karatzas & Valveny (2024)**, "Image-text matching for large-scale book collections" (arXiv 2407.19812, open): SAM "everything" masks over each image; a mask is kept only if commercial OCR finds text inside it; then CLIP matching + Hungarian / BERT refinement against a catalogue. — [arXiv HTML](https://arxiv.org/html/2407.19812)
- **SPIE 2025**, "Algorithm for spine segmentation of books in naturally placed state" (Proc. SPIE 13646): YOLOv5 detector + affine transform to normalize tilt, then DeepLabv3+-based pixel segmentation of spines at various angles. Paywalled. — [SPIE](https://www.spiedigitallibrary.org/conference-proceedings-of-spie/13646/1364612/Algorithm-for-spine-segmentation-of-books-in-naturally-placed-state/10.1117/12.3056359.short)
- **ACM 2025**, "Research on Library Book Spine Segmentation and Recognition Based on Deep Learning": Mask R-CNN with its RPN replaced by a rotated RPN to handle large tilts. Paywalled. — [ACM DL](https://dl.acm.org/doi/10.1145/3811874.3812121)
- **Electronics 2025**, 14(23):4689, "Recognizing text on book spines ... improved YOLOv11 and optimized PaddleOCR" (MDPI, open access; PDF download blocked here). — [DOI](https://doi.org/10.3390/electronics14234689)
- Hobby / GitHub systems: Grounding DINO (text prompt "book") + SAM masks, each crop sent to GPT-4V for reading ([jamesg.blog 2024](https://jamesg.blog/2024/02/14/clickable-bookshelves)); its follow-up Open Shelves trains a fine-tuned detector on a Roboflow dataset because GDINO+SAM "requires significant computational resources", licence CC BY-NC-SA 4.0, no metrics ([GitHub capjamesg/open-shelves](https://github.com/capjamesg/open-shelves)); bookshelf-scanner: YOLO segmentation of spines + Moondream2 VLM to read title/author ([GitHub suxrobGM/bookshelf-scanner](https://github.com/suxrobgm/bookshelf-scanner)); librum: classical-CV title recognition ([GitHub maxbalrog/librum](https://github.com/maxbalrog/librum)).

### Inferences
- Our pipeline (row split by long horizontal edges -> near-vertical lines -> text map to veto lines through lettering) is a hybrid of the IEEE multi-row approach and Yang et al.'s text-saliency splitting; the literature has no cleaner classical recipe that clearly dominates it.
- Talker & Moses is the only classical work explicitly built for arbitrary viewpoint and non-upright books, and its global selection step (weighted independent set over candidate spines) is a direct, CPU-friendly idea for our "close lines merged" and "posts mistaken for books" failures: generate over-complete candidates, then choose a non-overlapping set by score.

### Gaps
- Step-level parameters of Chen 2010, Tsai 2011, Quoc & Choi 2009, Lee 2008, Nevetha & Baskar 2015, Taira 2003 were not read: Stanford PDFs blocked by a TLS error through the proxy (needs an unblocked environment), the others paywalled. From memory (unverified, not cited): Chen 2010 used Canny edges + Hough to find the dominant angle and spine boundary lines, and Tsai 2011 used MSER-based text detection on segmented spines. Re-verify before relying on it.
- The Talker 2013 thesis (downloaded) and WACV paper were not read for numbers; the thesis is the most promising unread source for classical parameters and failure modes.
- No 2023-2026 VLM-native spine detector paper (e.g. a Florence-2/Qwen-VL grounding study on bookshelves) was found in this pass.

## Q2. What accuracy was reported, on what data, with what definition of "correct"?

### Takeaway
Reported numbers are scarce and rarely comparable: classical papers report retrieval, not segmentation; the one rigorous detection benchmark (Ma et al. 2024) uses mAP at IoU 0.75 on 661 library photos; the SAM work reports only manual mask-review counts.

### Cited Findings
- Yang et al. 2016 report **no segmentation accuracy** and define no segmentation criterion; evaluation is end-to-end retrieval (precision, recall, recall@k, MRR 0.91 "using top-11 search results"). Data: 454 spine images (the same set as Chen 2010 / Tsai 2011), database >9,000 books crawled from Stanford Engineering Library vs ~2,300 in the prior work. — [ar5iv](https://ar5iv.labs.arxiv.org/html/1611.07385)
- Tsai et al. 2011 (as read off curves by Yang et al.): text-only precision 0.92 / recall 0.60 / F 0.72; hybrid reported F 0.91 (the quoted precision/recall for the hybrid look inconsistent with F 0.91, likely a transcription error in the extraction). — [ar5iv](https://ar5iv.labs.arxiv.org/html/1611.07385)
- Ma et al. 2024 dataset: 661 smartphone photos of Shenzhen University library shelves (283 with tilted books, 378 near-vertical <5° tilt), 15,454 labelled spines (~23/image), two classes (spine, call-number label), polygon labels in Labelme converted to DOTA OBB; 8:2 split before augmentation (1,587 train / 396 test after augmentation). Metric: AP at **IoU 0.75** only. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Ma et al. 2024 Table 4, spine-class AP@0.75 / FPS: R3Det 47.98 / 10.7; S2ANet 57.33 / 12.6; Rotated Faster R-CNN 64.59 / 12.3; RoI Transformer 70.85 / 8.1; **YOLOv8n-OBB 75.19 / 26.7 (10.9 MB, 29.6 GFLOPs)**; Oriented R-CNN 81.41 / 12.5; STD-O (ViT) 89.07 / 3.2; proposed 90.20 / 10.9 (45.3 MB, 195 GFLOPs). FPS hardware not clearly stated; trained on an A800. The paper's text gives gap figures that contradict its own table for three baselines. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Ma et al. ablation: default anchors 80.68 mAP -> clustered elongated anchors 85.75 (spine AP 71.25 -> 81.41); + DCN 90.06; + PAFPN 90.15; both 90.22. Generalization claimed only qualitatively on 425 unannotated 1920x1080 images (CAAS library). — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Llabrés et al. 2024: 285 high-res photos of a Spanish public library (1-2 shelves each), 7,536 books, 14 sections, mostly Catalan/Spanish/English plus Arabic and others. SAM mask review: 9,850 masks, 8,435 containing text, 6,912 = books, 1,267 = not books, 256 = merged books. No IoU-based precision/recall. — [arXiv HTML](https://arxiv.org/html/2407.19812)
- Fatema et al. used 50 shelf images (edge + Hough + fuzzy OCR matching). — [Llabrés et al. related work](https://arxiv.org/html/2407.19812)

### Inferences
- From the SAM counts, OCR-gated SAM keeps ~6,912 true books of 8,435 text masks (~82% "precision" of kept masks by manual review, with 256 merged-book masks) and finds roughly 6,912 of 7,536 books (~92%) — a rough figure computed here, not reported by the authors, and with no IoU criterion. This is in the same band as our P 0.67 / R 0.89.
- No paper reports a classical method's segmentation precision/recall with an IoU threshold, so there is no published classical-vs-learned comparison on the same data.

### Gaps
- Chen 2010 / Tsai 2011 / Talker 2014 segmentation accuracy numbers not retrieved (see Q1 gaps).
- YOLOv11/PaddleOCR (Electronics 2025), SPIE 2025 and ACM 2025 numbers not retrieved (bot wall / paywall).

## Q3. Recurring failure modes, and fixes tried and abandoned

### Takeaway
The same failures recur across 20 years: low contrast between neighbouring spines, titles/graphics creating false vertical lines, tilted books, perspective distortion at the photo edges, identical adjacent books, two-tone spines split in two, adjacent books merged, and non-book objects (labels, shelf signage, books on the next shelf) detected as books.

### Cited Findings
- Hough/low-level segmentation "can be easily influenced by lighting conditions or low contrast between books"; hand-crafted segmentation "suffers from common image distortion and low contrast between books" — Yang et al. therefore demoted Hough to dominant-direction estimation only and moved splitting to a text-saliency map. — [ar5iv](https://ar5iv.labs.arxiv.org/html/1611.07385)
- Long titles and spine graphics produce false boundary lines in line-based methods. — [search summary of Yang et al.](https://arxiv.org/pdf/1611.07385)
- Talker & Moses designed explicit structural constraints to filter line segments because of text and texture on spines, perspective-induced orientation variety and book proximity. — [ResearchGate abstract](https://www.researchgate.net/publication/269299980_Viewpoint-independent_book_spine_segmentation)
- Ma et al. 2024 baseline failures: misaligned *upper* boundaries on vertical spines; missed five tilted spines of **identical** books; missed spines at the left edge distorted by the shooting angle. DCN-only configs localize tilted spines poorly. Traditional methods criticised for handcrafted features and empirically set thresholds. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Default square-ish anchors underfit elongated spines; replacing them with clustered ratios up to ~16:1 was the single largest gain (+10 spine AP). — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Abandoned/limited approaches named by Ma et al.: horizontal-box YOLOv3-Tiny/YOLOv5 "does not address elongated spines" / "may not be optimal for tilted books"; Mask R-CNN + affine (Zhou 2022) "relies on horizontal boxes"; multi-angle image rotation before detection has "lower detection efficiency"; Mask R-CNN with angle regression (Zeng 2021) loses accuracy on *upright* spines due to angle periodicity; RRPN dense rotated anchors are computationally costly; RoI Transformer struggles with high-aspect-ratio targets. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- SAM on shelves: segments text-bearing non-books (section labels), splits two-coloured spines into two objects, merges several adjacent books, detects partial books from neighbouring shelves. — [Llabrés et al.](https://arxiv.org/html/2407.19812)
- Grounding DINO + SAM was dropped by its own author for a fine-tuned detector because of compute cost; GPT-4V struggles when the title is hard to read. — [open-shelves](https://github.com/capjamesg/open-shelves); [jamesg.blog](https://jamesg.blog/2024/02/14/clickable-bookshelves)
- Yang et al. remaining failures are text-localization errors ("imperfect or even wrong text localization bounding boxes"). — [ar5iv](https://ar5iv.labs.arxiv.org/html/1611.07385)

### Inferences
- "Two-colour spine split" (SAM) and "colour-region fallback" (our Felzenszwalb) are the same hazard; a region method needs a shape prior (elongated, spans shelf height) to merge parts.
- "Upper boundary misaligned" is reported even for the best deep detector — the top/foot of a spine is a hard sub-problem in general, not just in our texture-change rule.

### Gaps
- No source found that specifically studies glare, dark plain spines, decorations/ornaments on shelves, or turned (90°/180°) photos; posts/frames are only covered indirectly ("non-book objects", "section labels").

## Q4. Output representation: axis-aligned box vs rotated box vs quadrilateral vs mask

### Takeaway
Recent work argues for oriented boxes (OBB) for tilted, densely packed spines because axis-aligned boxes overlap neighbours and get NMS-suppressed; masks are used when the next step is warping to a rectangle. No paper compares quadrilaterals with perspective, and no paper directly measures axis-aligned vs oriented on the same data.

### Cited Findings
- Axis-aligned boxes on tilted, dense spines include parts of neighbours; their high mutual IoU makes NMS suppress correct detections; slim high-aspect objects need accurate angle. — [Ma et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Angle-regression OBB suffers periodicity near upright (≈90°, the most common angle); Ma et al. use midpoint-offset encoding to avoid direct angle regression. Their dataset angles concentrate near 90°. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Ma et al. include no axis-aligned baseline, so the HBB-vs-OBB benefit is argued from literature, not measured. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Masks then affine-warp to rectangles (Zhou 2022; SPIE 2025 YOLOv5 + affine + DeepLabv3+) — the mask is the representation when appearance matching/reading follows. — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0306457322002023); [SPIE](https://www.spiedigitallibrary.org/conference-proceedings-of-spie/13646/1364612/Algorithm-for-spine-segmentation-of-books-in-naturally-placed-state/10.1117/12.3056359.short)
- Talker & Moses model spines under perspective projection from general viewpoints (i.e. non-rectangular images of spines). — [Haifa CRIS](https://cris.haifa.ac.il/en/publications/viewpoint-independent-book-spine-segmentation/)

### Inferences
- A quadrilateral (our choice) strictly generalizes an OBB and handles the perspective/left-edge distortion Ma et al. list as a failure; an OBB detector's output could seed our quadrilateral refinement. IoU 0.75 on OBBs is a stricter bar than most classical work ever met; worth adopting IoU≥0.5 and ≥0.75 both in our scorer for comparability.

### Gaps
- No published comparison of OBB vs quadrilateral vs mask on the same spine data.

## Q5. Which lightweight (CPU) methods hold up best; where does a small learned detector beat classical edges?

### Takeaway
There is no head-to-head classical-vs-learned benchmark. Indirect evidence: authors who tried Hough-based splitting abandoned it for text-saliency (2016) or detectors; among learned models, the nano YOLOv8n-OBB (10.9 MB, 29.6 GFLOPs) is the best speed/accuracy trade-off and is ONNX-exportable, though 15 spine-AP points below the heaviest models.

### Cited Findings
- YOLOv8n-OBB: spine AP@0.75 75.19 at 26.7 FPS, 10.88 MB, 29.63 GFLOPs vs proposed Oriented R-CNN 90.20 at 10.9 FPS, 45 MB, 195 GFLOPs. Authors flag their own model's size as a hindrance for embedded/mobile deployment and propose pruning/distillation/quantization as future work. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- Yang et al. keep a cheap Hough dominant-direction + rotation step (classical, CPU) and replace only the splitting with a CNN text map. — [ar5iv](https://ar5iv.labs.arxiv.org/html/1611.07385)
- Foundation-model pipelines (GDINO+SAM) were too compute-heavy even on a server for their author. — [open-shelves](https://github.com/capjamesg/open-shelves)
- Ultralytics YOLOv8 was the first official YOLO release supporting rotated boxes. — [Ma et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)

### Inferences
- For our browser/no-GPU setting: (1) keep the classical line pipeline as the candidate generator; (2) the most transferable classical upgrades from the literature are Yang's "rotate by dominant direction first" (helps leaning-book shelves where all books lean together, and turned photos) and Talker & Moses' global non-overlapping candidate selection; (3) a YOLOv8n/11n-OBB at ~640 px in onnxruntime-web WASM is the plausible learned step, but it would need home-shelf training labels (library datasets lack covers lying flat, Hebrew spines, decor) — the Shenzhen dataset (661 images) is library-only, and its licence/availability was not confirmed.
- Elongated-anchor clustering (h/w up to ~16) is the key detail if training any anchor-based spine detector; anchor-free YOLOv8 avoids the issue.

### Gaps
- No measured CPU/WASM latency for any spine detector found.
- No public, permissively licensed home-bookshelf spine dataset with polygon labels identified (Roboflow Open Shelves is CC BY-NC-SA; Llabrés dataset licence not stated).
