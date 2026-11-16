# Datasets, benchmarks and open-source code for book-spine detection and spine-text reading

Researched 2026-11-15. Downloaded open-access PDFs (verified with `file`, not opened) are in
the study Drive folder `Literature/`
`llabres-2024-library-dataset.pdf` (arXiv 2407.19812), `wieczorek-2022-trixi-the-librarian.pdf` (arXiv 2210.10110),
`yang-2016-smart-library.pdf` (arXiv 1611.07385). The Stanford Tsai 2011 PDF failed twice with a TLS-chain error through the proxy and was not saved.

## Q1. Datasets: size, regime, annotation type, licence, URL, quality, fit to our regime

### Takeaway
Three public sets carry **per-spine polygons** on real phone photos of shelves: the Shenzhen University 661-image set (CC0, 4TU), its 1,849-image successor (CC BY 4.0, IEEE DataPort, needs a subscription), and Open Shelves (COCO segmentation, CC BY-NC 4.0, Zenodo/Roboflow). They are all **library** shelves, not home shelves. The only set with **title ground truth** is the Barcelona "Library Dataset" (285 images, 7,536 books). It gives a per-image title list, and its masks are SAM weak labels, not ground truth. So it can score title reading or matching, but not detection. Roboflow Universe has many small spine sets that are mostly boxes and lightly documented. None of these is in Hebrew.

### Cited Findings

**A. Full per-spine geometry (can score detection)**

- **Shenzhen Univ. book-spine set, 4TU (Zhong & Yang, 2019-11-25).** 661 images, each in a JSON file with manually labelled polygon vertices, plus a MATLAB reader script (getImgFromJson.m). The zip is about 766 MB. Licence **CC0**. DOI 10.4121/uuid:33f2a166-de13-4505-b359-2b202c491fd8. Credited to the Laboratory of Machine Vision & Inspection, Shenzhen University. The page does not say how the images were captured. It has 2,088 downloads. — [4TU.ResearchData](https://data.4tu.nl/datasets/2c3f156f-8bfc-4ca4-8c8a-f3d4d02d6674); mirror on [figshare](https://figshare.com/articles/dataset/Data_mannually-labelled_accompanying_the_research_on_segmentation_of_book-spine_images/12688436)
  - The 2024 Sensors paper describes what appears to be the same 661-image set. Its details: smartphone photos of **library shelves at Shenzhen University**; 283 tilted-book images and 378 near-vertical ones (under 5° tilt); **15,454 manually labelled spine instances**, about 23 per image. The authors added a second polygon class, "book label" (the call-number sticker), with Labelme and converted to DOTA (oriented-box) format. They cite the dataset as ref [22]: Zeng W., Yang Y., Zhong X., "A mountain-shaped network for semantic segmentation of book spines on-shelves", *J. Image Signal Process.* 9:218–225 (2020). Data availability statement: "Data are contained within the article"; no link is given. — [Ma et al. 2024, Sensors 24(24):7996 (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- **On-shelf book spine dataset for instance segmentation, IEEE DataPort (Xiaopin Zhong, 2021-04-26).** 1,849 photos at about 3000×4000, taken with several mobile phones. Content is dense, tilted books, more than 25 per image on average, from varied angles. Labelme polygons converted to MS COCO. Split: 1,387 train, 462 test. 4.31 GB. Licence **CC BY 4.0**, but **downloading needs an IEEE DataPort subscription**. DOI 10.21227/g82y-gt86. The page names no associated paper. — [IEEE DataPort](https://ieee-dataport.org/documents/shelf-book-spine-dataset-instance-segmentation)
- **Open Shelves (James Gallagher, Roboflow, 2024-03-27).** Zenodo v1 file "Open Shelves.v8i.coco-segmentation.zip", 42.5 MB, COCO segmentation. Licence on Zenodo is **CC BY-NC 4.0**; the GitHub repo says **CC BY-NC-SA 4.0** (the two sources disagree). The image count is stated in neither place. Images were contributed by email. The GitHub repo was **archived on 2026-09-18**. — [Zenodo 10.5281/zenodo.10885753](https://zenodo.org/records/10885753); [GitHub capjamesg/open-shelves](https://github.com/capjamesg/open-shelves); Roboflow page (returned 403 to fetch) [universe.roboflow.com/capjamesg/open-shelves](https://universe.roboflow.com/capjamesg/open-shelves)
- **Roboflow Universe spine projects.** Listing pages exist for, among others:
  - LibVision "Book Spines" (CC BY 4.0, object detection)
  - Harald Varner "Book spine instance segmentation" (one class, no description)
  - minhaz "book_spine_instance_segmentation" (CC BY 4.0, updated Nov 2025)
  - Art Processors "book spines test 2" (instance segmentation, CC BY 4.0)
  - cnu-hmlab "book spine dataset" and "…-library"
  - "Book spine detection (P2)"
  - Kocaeli Univ. "Book Dataset" (classes: book spine, object)
  - "books but only if spine is fully visible"
  - leo-ueno "Book Spine Segmentation"
  - DAHL "Book Spine Identification"
  - Harald Varner "Book identification by spine"

  A search summary reported one set with 546 CC BY 4.0 images and one with 611 images, both boxes. I could not verify which projects those are; the 611 matches Trixi's own count (below). Most descriptions are empty. — [LibVision](https://universe.roboflow.com/libvision/book-spines-vh9b8), [Varner seg](https://universe.roboflow.com/harald-varner-xv5u7/book-spine-instance-segmentation), [minhaz](https://universe.roboflow.com/minhaz/book_spine_instance_segmentation-uqybb), [Art Processors](https://universe.roboflow.com/art-processors/book-spines-test-2/dataset/), [cnu-hmlab](https://universe.roboflow.com/cnu-hmlab-syko-and-ash/book-spine-dataset), [cnu-hmlab library](https://universe.roboflow.com/cnu-hmlab-syko-and-ash/book-spine-dataset-library), [P2](https://universe.roboflow.com/book-detection/book-spine-detection-p2), [Kocaeli](https://universe.roboflow.com/kocaeli-university-yw5uh/book-dataset), [fully-visible](https://universe.roboflow.com/dt-bbmdm/books-but-only-if-spine-is-fully-visible.), [leo-ueno](https://universe.roboflow.com/leo-ueno/book-spine-segmentation), [DAHL](https://universe.roboflow.com/woody-willis-kly8v/dahl-book-spine-identification), [Varner id](https://universe.roboflow.com/harald-varner-xv5u7/book-identification-by-spine), [shangching books](https://universe.roboflow.com/shangching-live-com/books-pxco5)
- **Trixi the Librarian (Wieczorek, Sygo, Liu, Koshil; arXiv 2022-10).** A robotics paper that labelled spines in **611 images**, fine-tuned YOLOv5 on them and links its dataset. A Roboflow project by shangching (likely co-author Shang-Ching Liu) appears in search results. Its only reported result is qualitative: it can "repeatedly sort three books on a shelf". — [arXiv 2210.10110](https://arxiv.org/abs/2210.10110); [Roboflow shangching books](https://universe.roboflow.com/shangching-live-com/books-pxco5)

**B. Title or identity labels (can score reading or matching; aggregate only for detection)**

- **Library Dataset (Llabrés et al., CVC-UAB; DAS 2024, arXiv 2407.19812).**
  - Content: 285 high-resolution photos of one or two shelves each, 7,536 books, from a **public library in Barcelona** (14 sections). Mostly Catalan, Spanish and English, plus some French, German, Italian and Arabic.
  - Ground truth: the **titles present in each image**, from a manual inventory.
  - Weak labels: filtered SAM masks and Amazon Rekognition OCR. Of 9,850 SAM objects, 6,912 were books, 1,267 were not books and 256 were merged books. Two-coloured spines are sometimes split in two.
  - Target lists: a 15,229-book library list (title, author, ISBN, tag) and about 2.3 M GoodReads titles.
  - Licence: the repo is **MIT**; no separate licence for the images is stated. The images are on SharePoint, linked from the repo.
  - Results: matching-only accuracy 0.984 with CLIP+Hungarian on the exact list and 0.918 on the library list. Detection-plus-matching reaches 0.641 on the library list and 0.389 on the full list.

  — [arXiv 2407.19812](https://arxiv.org/html/2407.19812v1); [GitHub llabres/library-dataset](https://github.com/llabres/library-dataset)
- **Smart Library (Yang et al., arXiv 1611.07385, 2016).** No dataset was released. A synthetic word set with character-level boxes was "to be made public" but no URL is given. For queries it used **454 spine images from Chen et al. 2010 / Tsai et al. 2011 (Stanford)**, which the authors say they "have access to"; their annotations and licence are not given. Retrieval results: top-1 P/R/F 0.92/0.90/0.91 against about 9k books, versus Tsai 2011 at 0.92/0.60/0.72 against about 2.3k. — [ar5iv 1611.07385](https://ar5iv.arxiv.org/html/1611.07385)
- **Stanford book-spine recognition (Tsai et al., ACM MM 2011).** Its PDF is at Stanford. The query set is cited above. I found no public download page. — [Tsai ACM MM 11 PDF](https://web.stanford.edu/~bgirod/pdfs/Tsai_ACM_Multimedia_11.pdf)
- **DL-On-shelf-Books-Recognition (Boatsure).** A "10k-level" high-resolution set with **book identity labels**: 5.6k spines and 3.6k identities in the validation scenario. Downloads are on Baidu Netdisk, along with the authors' annotation software. The repo is Apache-2.0. Reported top-1 is 99.18% on simulated recognition. Search snippets link it to a ScienceDirect paper describing "10k-level datasets of spine instance segmentation and recognition" (*Information Processing & Management*, 2022); I did not confirm the link. — [GitHub](https://github.com/Boatsure/DL-On-shelf-Books-Recognition); [ScienceDirect S0306457322002023](https://www.sciencedirect.com/science/article/abs/pii/S0306457322002023)
- **On-shelf-books-recognition set, National Agricultural Library of CAAS.** 425 images at 1920×1080, **unannotated**, used only for qualitative generalization checks in Ma et al. 2024. Its ref [23] may be the Boatsure set. — [Ma et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- **Improved-DETR end-to-end spine text detection and recognition (ACM 2025/26).** Uses a book spine dataset of 924 RGB images split into segmentation, recognition and simulated-experiment subsets, alongside polygon scene-text sets. Its availability was not checked. — [ACM DL 10.1145/3802133.3802303](https://dl.acm.org/doi/10.1145/3802133.3802303)

**C. Generic or adjacent sets**

- **SKU-110K.** 11,743 dense retail-shelf images with one class (boxes). The original licence is the Trax **academic, non-commercial** licence; the Roboflow copy relabels it CC BY 4.0, which is a third-party relabelling. Upstream: eg4000/SKU110K_CVPR19. — [Voxel51 card](https://docs.voxel51.com/dataset_zoo/datasets_hf/sku110k_test.html); [Roboflow copy](https://universe.roboflow.com/large-benchmark-datasets/sku-110k-dataset); [Ultralytics docs](https://docs.ultralytics.com/tr/datasets/detect/sku-110k)
- **COCO and LVIS.** COCO masks were collected by a crowd pipeline with no cross-category de-duplication and contain systematic errors. COCO-ReM refines masks with SAM and imports exhaustive instances from LVIS. LVIS mask quality is reported higher (IoU 0.90–0.92 vs 0.83–0.87 for COCO, via a secondary summary), and the LVIS paper illustrates its exhaustive-marking stage with "book" instances. — [COCO-ReM arXiv 2403.18819](https://arxiv.org/html/2403.18819v1); [LVIS arXiv 1908.03195](https://ar5iv.arxiv.org/html/1908.03195); [LVIS review summary](https://liner.com/review/lvis-dataset-for-large-vocabulary-instance-segmentation)
- **Vertical text.** WHU-VHTR has 23,674 line-level transcribed images (Street View and Chinese urban scenes, vertical and horizontal). VCTR is a vertical Chinese recognition set built from PosterErase (arXiv 2309.01081). Both are Chinese, not spines. — [IEEE DataPort WHU-VHTR](https://ieee-dataport.org/documents/vertical-and-horizontal-scene-text-recognition-dataset-whu-vhtr); [arXiv 2309.01081](https://arxiv.org/abs/2309.01081v1)
- **Cover sets, for retrieval rather than spines.** Kaggle "Book Covers Dataset" (Luka Anicin, 33 genre folders of about 1k images each); HF marvy/book-covers; HF irisxue/childrens_book_covers. The HF NexaAI/Bookcase dataset (WebDataset, 1K–10K items) is undescribed. — [Book Covers mirror](https://data.poltekkes-smg.ac.id/fr/dataset/book-covers-dataset); [HF marvy](https://huggingface.co/datasets/marvy/book-covers); [HF irisxue](https://huggingface.co/datasets/irisxue/childrens_book_covers/viewer/default/train); [HF NexaAI/Bookcase](https://huggingface.co/datasets/NexaAI/Bookcase/commits/main)
- **S3D on Zenodo is a false friend.** "Spine detection in 2D and depth-tracking" surfaced in the spine search; it appears to be anatomical (vertebral) spine data, not book spines (not verified). — [Zenodo 17335417](https://zenodo.org/records/17335417)

### Inferences
- **Best detection scorer for us:** the 661-image Shenzhen set (CC0, free download, about 23 polygons per image, phone photos). The main mismatch is regime: library shelves with uniform call-number labels, likely mostly Chinese titles, and no home shelves, Hebrew or English. The 1,849-image successor is larger, but its subscription gate makes it impractical.
- **Our 6 photos / 133 books (about 22 per photo)** are close in density to the Shenzhen set (about 23 per image).
- **Library Dataset:** usable only for title-level or aggregate scoring, such as recall of titles per image and spine count per image versus the inventory count. Its SAM masks must not be treated as detection ground truth.
- **Roboflow box-only sets:** can score detection only under an axis-aligned-box IoU, which is ill-suited to tilted spines. Each set's annotation completeness (are all spines labelled?) must be checked visually before scoring.
- **COCO / Open Images / LVIS "book":** they label books in general scenes, not exhaustively per spine on shelves. I would not use them to score per-spine detection. This is inference; I found no book-class-specific audit.

### Gaps
- Image counts and annotation completeness for Open Shelves and most Roboflow projects (Roboflow pages returned 403).
- Open Images V7 "Book" class statistics: my search returned nothing on it.
- The Stanford/Tsai 454-spine set is not publicly downloadable as far as I found.
- Whether the 924-image DETR set and the "10k-level" IP&M set can be downloaded, and their licences.
- No Kaggle-hosted shelf-spine dataset was found.

## Q2. Open-source projects: method, quality, licence, activity, CPU/ONNX models

### Takeaway
The open projects pair a YOLO detector or segmenter with an OCR engine or VLM. **None reports a quantitative accuracy, and none publishes a ready ONNX spine model** that I could find. Roboflow-hosted trained models (Open Shelves, the Roboflow projects) can usually be exported, but only through the Roboflow platform.

### Cited Findings
- **suxrobGM/bookshelf-scanner (MIT, 34 commits).** Resizes the photo to 2560 px and denoises it, segments spines with YOLO11x-seg, then crops and rotates each spine. A fine-tuned, quantized Moondream2 VLM reads the title and author. No weights location, training data or accuracy is stated. — [GitHub](https://github.com/suxrobGM/bookshelf-scanner)
- **jparkington/Bookshelf-Scanner.** A YOLOv8 spine locator, crop enhancement, then OCR. — [mirror](https://github.imc.re/jparkington/Bookshelf-Scanner)
- **Boatsure/DL-On-shelf-Books-Recognition (Apache-2.0).** Instance segmentation, affine rectification, then a spine-feature encoder with inventory retrieval; no OCR. Top-1 99.18% on simulated scenarios; no weights are mentioned. — [GitHub](https://github.com/Boatsure/DL-On-shelf-Books-Recognition)
- **llabres/library-dataset (MIT).** SAM plus Rekognition OCR plus CLIP or string matching, with demo notebooks. — [GitHub](https://github.com/llabres/library-dataset)
- **capjamesg/open-shelves (archived 2026-09-18).** Dataset with Roboflow-hosted models; no architecture or metrics are given. — [GitHub](https://github.com/capjamesg/open-shelves)
- **Other repos seen in search, not inspected:** lakshyakhatri/bookshelf-reader (and -api); manasha1232/book_spine_scanner. — [ecosyste.ms bookshelf-reader](https://awesome.ecosyste.ms/projects/github.com%2Flakshyakhatri%2Fbookshelf-reader); [GitHub book_spine_scanner](https://github.com/manasha1232/book_spine_scanner)
- **Paper methods with numbers.**
  - Improved Oriented R-CNN on the Shenzhen set reaches mAP@0.75 = **90.22%** (spine AP 90.20). Baselines on the same set: YOLOv8n-OBB 81.32, Oriented R-CNN 85.75, STD-O 88.84, RoI Transformer 80.15, Rotated Faster R-CNN 77.25, S2ANet 73.51, R3Det 63.17. — [Ma et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
  - YOLOv8+CBAM spine segmentation for misplacement detection (SPIE 2025); no code was found. — [SPIE 13396](https://medicalimaging.spiedigitallibrary.org/conference-proceedings-of-spie/13396/133960A/Design-of-a-book-misplacement-detection-system-based-on-image/10.1117/12.3050429.full)
  - Smart Library cites Tesseract as performing poorly on shelf photos. — [ar5iv 1611.07385](https://ar5iv.arxiv.org/html/1611.07385)

### Inferences
- **Small CPU-runnable spine detector:** the cheapest route is a YOLOv8n-OBB or YOLO11n-seg trained on the CC0 Shenzhen set and exported through Ultralytics' ONNX export. Ma et al. measured YOLOv8n-OBB at 81.3 mAP@0.75 on that set, a reasonable reference point. This is a suggestion, not a published model.
- **Licence note:** Ultralytics models are AGPL-3.0. This matters for a browser deployment; I did not verify how it applies to exported weights.

### Gaps
- Last-commit dates for every repo (the pages did not show them).
- Whether any Hugging Face model is a book-spine detector; I did not search the HF model hub directly.

## Q3. Published benchmark or leaderboard

### Takeaway
I found **no public leaderboard** for spine detection or reading. The closest things are per-paper tables: Ma et al. 2024 on the Shenzhen set, and Llabrés et al. 2024 for matching.

### Cited Findings
- Ma et al. compare 7 oriented detectors on one split of the Shenzhen dataset at IoU 0.75. — [PMC11679322](https://pmc.ncbi.nlm.nih.gov/articles/PMC11679322/)
- The Library Dataset defines matching-only and detection+matching tasks against closed-set and open-set (2.3 M) catalogues. — [arXiv 2407.19812](https://arxiv.org/html/2407.19812v1)
- Papers With Code was not reachable as a source; it was not checked.

### Inferences
- **Shenzhen set as a de facto benchmark:** it is the only spine set used across several papers (Zeng 2020, Ma 2024). Ma's split is post-augmentation (1,587/396), so their numbers are not directly comparable to a raw-image evaluation.

### Gaps
- Whether a Papers With Code task page exists for "book spine detection".

## Q4. Hebrew book or Hebrew scene-text data

### Takeaway
I found **no Hebrew book-spine data** and **no sizeable Hebrew scene-text benchmark**. The closest is a 68-photo Hebrew signage set on Hugging Face. The rest is synthetic or rendered printed text, or handwriting.

### Cited Findings
- **danielrosehill/Hebrew-Language-Signage (HF).** 68 real photos of signs in Israel, many also in English or Arabic. The card lists scene-text detection and recognition as uses and says to check the Pexels licence. I saw it only through mirrors. — [mirror](https://good23hfaccelerating.pages.dev/datasets/danielrosehill/Hebrew-Language-Signage)
- **johnlockejrr/heb_synth_pangoline (HF).** Synthetic Hebrew document images with text and ALTO-XML, built from DICTA texts. — [HF](https://huggingface.co/datasets/johnlockejrr/heb_synth_pangoline)
- **jhonnyisaacc/hutter (HF).** Rendered images of Hebrew biblical text. — [HF](https://huggingface.co/datasets/jhonnyisaacc/hutter)
- **Handwriting.** HHD_v0 has handwritten Hebrew letters; Pinkas has medieval manuscripts at word, line and page level; HebHTR is code. — [HHD_v0](https://tc11.cvc.uab.es/datasets/HHD_v0_1); [Pinkas](https://cris.bgu.ac.il/en/publications/the-pinkas-dataset-2/); [HebHTR](https://github.com/Lotemn102/HebHTR)
- **Synthetic-Hebrew recipe for PaddleOCR (blog).** — [prog.world](https://prog.world/my-experience-and-solutions)
- The Library Dataset includes some **Arabic** spines (right-to-left), the nearest RTL spine data found. — [arXiv 2407.19812](https://arxiv.org/html/2407.19812v1)

### Inferences
- **Hebrew spine reading:** has to be validated on the owner's own photos, aggregate-only beyond the 133 labelled books. Synthetic rendering, Hebrew fonts on spine-like strips, is the only scalable source for training a recognizer. It must not be used as ground truth for scoring.

### Gaps
- I did not check Israeli library sources (for example the National Library of Israel) for shelf imagery, nor any ICDAR multilingual (MLT) Hebrew content. To my knowledge MLT does not include Hebrew, but that is unverified.
