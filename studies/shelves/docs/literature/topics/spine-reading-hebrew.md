# Book-spine text reading and identification, with attention to Hebrew

Scope note: about 15 tool calls. Where a figure comes from a search-engine summary rather than a page I fetched, it is marked "(snippet)". Downloaded PDFs are in the study Drive folder `Literature/`. I did not open them; every detail below comes from the fetched arXiv abstract or HTML pages.

Paper index (open access unless marked):

| File | Paper | Year | Licence | PDF |
|---|---|---|---|---|
| yang-2016-smart-library.pdf | Yang, He, Huang, Zhou, Ororbia, Kifer, Giles, "Smart Library: Identifying Books in a Library using Richly Supervised Deep Scene Text Reading" (Penn State) | 2016 | arXiv licence | https://arxiv.org/pdf/1611.07385 |
| llabres-2024-library-dataset.pdf | Llabrés, Dey, Karatzas, Valveny (CVC Barcelona), "Image-text matching for large-scale book collections", DAS 2024, LNCS 14994 | 2024 | CC BY 4.0 | https://arxiv.org/pdf/2407.19812 |
| anegawa-2020-text-detection-rough-books.pdf | Anegawa, Aritsugi, "Text Detection on Roughly Placed Books by Leveraging a Learning-based Model Trained with Another Domain Data" | 2020 | arXiv licence | https://arxiv.org/pdf/2006.14808 |
| wieczorek-2022-trixi-the-librarian.pdf | Wieczorek, Liu, Sygo, Koshil, "Trixi the Librarian" (PR-2 robot sorts books) | 2022 | CC BY 4.0 | https://arxiv.org/pdf/2210.10110 |
| kostic-2020-visual-companion-booklovers.pdf | Kostic et al., "Visual Companion for Booklovers" (BookVIS app) | 2020 | arXiv licence | https://arxiv.org/pdf/2011.00329 |
| ma-2024-oriented-rcnn-spine-detection.pdf | Ma, Wang, Li, Xu, Han, "An Accurate Book Spine Detection Network Based on Improved Oriented R-CNN", *Sensors* 24(24):7996 | 2024 | MDPI CC BY | https://pdfs.semanticscholar.org/5400/ccb6f4d16302552068af709e23ff8e6f47ae.pdf |
| suissa-2023-hebrew-ocr-postcorrection.pdf | Suissa, Elmalech, Zhitomirsky-Geffet (Bar-Ilan), "Optimizing the Neural Network Training for OCR Error Correction of Historical Hebrew Texts" | 2023 | CC BY-NC-ND 4.0 | https://arxiv.org/pdf/2307.16220 |

Not downloaded (paywalled, or the download failed):
- Chen, Tsai, Girod et al., "Building book inventories using smartphones", ACM MM 2010. ResearchGate: https://www.researchgate.net/publication/221571765. Paywalled at ACM.
- Tsai, Chen, Chen, Hsu, Kim, Singh, Girod, "Combining Image and Text Features: A Hybrid Approach to Mobile Book Spine Recognition", ACM MM 2011. https://www.researchgate.net/publication/221572644. The Stanford PDF guess failed TLS through the proxy, so nothing was downloaded.
- Chen et al., "Mobile augmented reality for books on a shelf", 2011. https://www.researchgate.net/publication/221265915
- "Automatic Book Spine Extraction and Recognition for Library Inventory Management", ACM. https://dl.acm.org/doi/abs/10.1145/2791405.2791506 (paywalled)
- "Library on-shelf book segmentation and recognition based on deep visual features", *Information Processing & Management* 2022. https://www.sciencedirect.com/science/article/abs/pii/S0306457322002023 (paywalled)
- "Research on a Method for Recognizing Text on Book Spines in Libraries Based on Improved YOLOv11 and Optimized PaddleOCR", *Electronics* 14(23):4689, 2025. MDPI, so open access, but the fetch returned 403: https://www.mdpi.com/2079-9292/14/23/4689
- Suissa et al., "Toward a Period-specific Optimized Neural Network for OCR Error Correction of Historical Hebrew Texts", *ACM JOCCH*. https://dl.acm.org/doi/full/10.1145/3479159. This is a journal version related to the arXiv paper above.
- US patent US9977955B2, "Method and system for identifying books on a bookshelf": https://patents.google.com/patent/US9977955B2/en

## Q1. Spine recognition pipelines, reported accuracy, what failed, orientation

### Takeaway
Every published spine pipeline uses the same stages: segment the spines, normalise orientation, detect text lines, recognise them, then match to a catalog. The strongest academic system (Penn State 2016) reads per line, not per whole spine. It runs an explicit upside-down classifier that keeps both orientations when unsure, and it reports that Tesseract does far worse than a CNN-LSTM-CTC recogniser. Segmentation and detection errors, not recognition, are the biggest losses in recent end-to-end numbers.

### Cited Findings
- **Smart Library (2016) pipeline.** A Hough transform estimates the dominant orientation and rotates the image. A text/non-text CNN saliency map with non-max suppression finds the boundaries between books. Extremal regions are grouped into multi-orientation text lines. A CNN on 32x96 patches scores each line as upside down or not: flip if p > 0.7, keep if p < 0.3, keep both orientations in between. Recognition is a VGG16-style CNN, then a BiLSTM, trained with CTC. A character-level seq2seq LSTM then repairs missing characters and word breaks; it was trained on the 1-billion-word corpus with synthetic noise — [Yang et al. 2016](https://arxiv.org/html/1611.07385)
- **Tesseract versus deep recognisers (2016, cropped scene words).** Tesseract scored 60.1 / 57.3 / 65.9% on IC03-50, IC03-Full and SVT-50. The authors' DSL-WL scored 98.2 / 95.8 / 94.6%. They write that Tesseract "performs poorly in all cases" — [Yang et al. 2016](https://arxiv.org/html/1611.07385)
- **Identification (2016).** Test set: 454 spine images from the Stanford data of Chen 2010 and Tsai 2011. Database: about 9,000 Stanford Engineering Library books. Results: about 96.4% recall in the top 5, MRR 0.91, and text-only P/R/F 0.92/0.90/0.91, against Tsai et al. 2011 text-only 0.92/0.60/0.72. The extracted page rendered k ambiguously, so check the top-k value in the PDF — [Yang et al. 2016](https://arxiv.org/html/1611.07385)
- **Failure modes (2016).** Non-discriminative keywords: near-identical titles that differ only by author, publisher or volume. Also small or blurry metadata, and imperfect text-localisation boxes. Querying with ground-truth titles sets the upper bound for text retrieval — [Yang et al. 2016](https://arxiv.org/html/1611.07385)
- **Detection losses dominate (2024).** With ground-truth segments, CLIP+Hungarian matching reaches 0.918 on a 15k-title library list. With SAM detection it drops to 0.641. SAM returned 9,850 objects, of which 6,912 were books, 1,267 were non-books and 256 were merged books. It also split two-colour spines and segmented shelf section labels — [Llabrés et al. 2024](https://arxiv.org/html/2407.19812)
- **Spine content (2024).** Spines carry abbreviated authors, subtitles, series names, small fonts, occlusion and reflections — [Llabrés et al. 2024](https://arxiv.org/html/2407.19812)
- **Reusing a scene-text detector.** A detector pretrained on another domain can be reused, with refinement algorithms that turn its output into boxes around book text, instead of retraining on book data. The abstract gives no metrics — [Anegawa & Aritsugi 2020](https://arxiv.org/abs/2006.14808)
- **Robot use (2022).** A robot pipeline that combines deep learning models with classical computer vision for book detection and recognition is "good enough to repeatedly sort three books". The abstract gives no numbers. The search snippet adds that it fine-tunes a detector on 611 self-collected spine images and uses CRAFT for text detection before recognition (snippet) — [Wieczorek et al. 2022](https://arxiv.org/abs/2210.10110)
- **2025 library system.** YOLOv11 segmentation plus optimised PaddleOCR reports 96.8% single-book recognition accuracy in real bookshelf scenes (snippet; the page returned 403 and was not verified) — [Electronics 2025](https://www.mdpi.com/2079-9292/14/23/4689)
- **Spine detection only (2024).** An improved Oriented R-CNN detects rotated spine boxes at 90.22% mAP on its spine dataset. This measures detection, not reading (snippet) — [Ma et al. 2024](https://www.mdpi.com/1424-8220/24/24/7996)
- **Older OCR-based work.** Camera geometric distortion and photo rotation lower OCR quality (snippet from a search summary of the BookVIS paper; its abstract describes a visualisation app, so this claim is unverified) — [Kostic et al. 2020](https://arxiv.org/pdf/2011.00329)

### Orientation and publishing convention
- **English-language standard.** ISO 6357 favours descending (top-to-bottom) spine titles, which read correctly when the book lies flat with its cover up — [danq.me on ISO 6357](https://danq.me/2019/01/27/iso-6357/)
- **No historical agreement.** The ABAA glossary says the direction (up, down or across) "was not agreed upon". Historically, British books read upward and American books read downward — [ABAA glossary](https://www.abaa.org/glossary/spine)
- **Hebrew and Arabic (anecdotal only).** A typesetter in a forum wrote that all the Hebrew spines they had seen or printed ran top-to-bottom. An image search suggested bottom-to-top for the Arabic market — [InDesign-talk thread](https://groups.google.com/g/indesign-talk/c/rA4DdLNtpUY)

### Inferences
- Our "try every quarter-turn and keep the most confident" approach is a brute-force version of Smart Library's orientation classifier. Their "keep both when 0.3 < p < 0.7" rule suggests passing both readings to the matcher instead of committing to one in the reader.
- Convention is a prior, not a rule, for European (often ascending) and older British books. Direction should stay data-driven. For Hebrew, a weak prior towards descending text is plausible. RTL inside a descending spine means a Hebrew line rotated 90° clockwise reads right-to-left from top to bottom, which needs checking on real samples.
- Line detection before recognition is what the literature did. Whole-crop Tesseract on a spine is the configuration with the weakest reported numbers.

### Gaps
- No paper reports spine character or word error rate per line for Tesseract specifically. The 2016 comparison is on cropped scene words, not spines.
- Stacked (vertical, upright) letters, decorative fonts and glare are named as problems but never quantified.
- There is no authoritative Hebrew spine-direction standard (no SII/ISO Hebrew guidance found).

## Q2. Catalog matching from noisy OCR, and image retrieval versus reading

### Takeaway
Matching rescues a lot: plain fuzzy string matching reaches 0.74 on a 15k library list from commercial OCR. Embedding matching (CLIP) plus a global one-to-one assignment (Hungarian) reaches about 0.92. All methods collapse on an open 2.3M-title catalog, where fuzzy string matching (0.505) actually beats CLIP (0.449). A closed or user-specific candidate list matters more than the matcher. Image retrieval (Stanford, SIFT or vocabulary-tree) worked but needs a spine-image database; text retrieval reached comparable or better recall without one.

### Cited Findings
- **Llabrés 2024 setup.** 285 shelf photos from a Barcelona public library, 7,536 annotated books in Catalan, Spanish and English, Amazon Rekognition OCR and SAM segmentation. Target lists: the 15,229-book library inventory and 2.3M GoodReads titles — [Llabrés et al. 2024](https://arxiv.org/html/2407.19812)
- **Matching accuracy with ground-truth segments (exact / 15k / 2.3M).**
  - String matching: 0.783 / 0.742 / 0.505
  - CLIP: 0.939 / 0.915 / 0.449
  - CLIP+Hungarian: 0.984 / 0.918 / not run
  - CLIP+BERT: 0.836 / 0.824 / 0.310

  [Llabrés et al. 2024](https://arxiv.org/html/2407.19812)
- **With detection (15k / 2.3M).**
  - String matching: 0.573 / 0.389
  - CLIP: 0.617 / 0.241
  - CLIP+Hungarian: 0.641 / not run
  - CLIP+BERT: 0.622 / 0.240

  [Llabrés et al. 2024](https://arxiv.org/html/2407.19812)
- **Why matching is many-to-many.** Matching each book independently lets several books of one series map to the same entry. Hungarian assignment fixes this, but its gain shrinks as the number of distractor titles grows (+0.003 on the 15k list), and it does not scale to 2.3M. The paper frames the task as many-to-many matching — [Llabrés et al. 2024](https://arxiv.org/html/2407.19812)
- **Stanford mobile visual search (2010, 2011).** The phone app recognises and localises each spine in a shelf photo and adds it to an inventory. The 2011 hybrid system runs a text pipeline (keywords into a text database) alongside an image-feature pipeline matching against an image database, with about 91% recall reported (snippet). A later system adds location for a location-aware inventory — [Chen et al. 2010](https://www.researchgate.net/publication/221571765_Building_book_inventories_using_smartphones), [Tsai et al. 2011](https://www.researchgate.net/publication/221572644_Combining_Image_and_Text_Features_A_Hybrid_Approach_to_Mobile_Book_Spine_Recognition), [D. Chen MVS page](https://sites.google.com/site/chenmodavid/mobile-visual-search)
- **Text retrieval can replace image matching.** Smart Library argues that text recognition is competitive with image matching while avoiding the storage and transmission of spine images. Its text-only F of 0.91 compares with Tsai's text-only 0.72 — [Yang et al. 2016](https://arxiv.org/html/1611.07385)
- **Per-book expectations (patent).** A patent learns, for each book, which text its spine shows and matches OCR against that expectation (snippet) — [US9977955B2](https://patents.google.com/patent/US9977955B2/en)

### Inferences
- **Recommended matcher for a home library with no closed list:**
  1. Fuzzy or character n-gram retrieval against a large catalog to get candidates (string matching degrades most gracefully at 2.3M).
  2. Rerank by author and title agreement.
  3. Enforce one-to-one per photo only when a closed list exists, such as the user's own previously confirmed books.

  This is inference from one paper's numbers.
- Image retrieval of spines is not practical for Hebrew home libraries: no public spine-image database for Hebrew books was found. Reading the title stays necessary. Image matching could still help re-identify books the user has already confirmed, across photos.
- Our separate title matcher should receive both orientations and several OCR hypotheses (n-best), not just the single most confident string.

### Gaps
- Llabrés reports no precision, recall or "not in list" rejection numbers. Open-set rejection is the practical problem for a home library.
- There are no published spine-matching results against Hebrew catalogs: the NLI, Steimatzky or Simania metadata, or Open Library's Hebrew coverage.
- Google Books and Open Library fuzzy-search behaviour on noisy queries was not benchmarked in any source found.

## Q3. VLM and LLM approaches

### Takeaway
I found no peer-reviewed benchmark of GPT-4V, Claude or Gemini reading book spines or whole shelves. The only evidence is anecdotal, and it shows small VLMs confidently hallucinating plausible but wrong titles. A small VLM is a speculative future route, and its output would need to pass the same catalog-match check.

### Cited Findings
- **One-photo informal test.** On a single shelf photo, none of the small models read a Bruce Lee spine correctly; all produced "Tao of Jeff Kune Do". Author-rubric scores: Claude Sonnet 4.5 0.33, Qwen3-VL 8B 0.66. One Qwen reply claimed no image was present. This is one image and an unvalidated rubric (blog, 2025) — [daconta.us](https://daconta.us/Articles/slm-image-recognition-test-and-impressions.html)
- **Hallucination benchmarks.** General MLLM benchmarks find GPT-4V hallucinates least among the models tested, but still does in some scenes. They measure objects and attributes, not text — [AMBER, arXiv 2311.07397](https://arxiv.org/pdf/2311.07397)
- **Multi-image degradation.** GPT-4V made errors with several images per query and none with single images, which the authors attribute to information loss across inputs — [GPT-4V insurance study, arXiv 2404.09690](https://arxiv.org/pdf/2404.09690)
- **Where OCR fails inside VLMs.** Recent work studies where OCR "routing" bottlenecks occur in VLMs. It is general, not about spines — [arXiv 2602.22918](https://arxiv.org/pdf/2602.22918)

### Inferences
- The failure mode to design against is fluent completion of a familiar title (the "Tao of Jeff Kune Do" pattern). A VLM's output should be treated as another noisy OCR hypothesis and accepted only if it matches the catalog and is consistent with the crop.
- Whole-shelf prompting is likely worse than per-spine crops, given the multi-object degradation above. This is inference.

### Gaps
- There are no quantitative shelf benchmarks for frontier or small VLMs, no Hebrew VLM spine results, and no published evaluations of "Shelfie"-type apps (Shelfie / BitLit was not covered by any primary source found).

## Q4. Hebrew OCR: quality, error profile, correction

### Takeaway
Stock Tesseract `heb` is weak even on printed pages: about 0.23 CER and 0.47 WER on HeOCR's 38-page benchmark. Community fine-tunes give small gains, and none target scene text or spines. Look-alike confusions (ו/ז/ן, ה/ח/ת, ב/כ, מ/ס) and final forms becoming medial forms are the error classes that practitioners report. The best-documented correction method is Bar-Ilan's: train a light neural corrector on synthetic errors that mimic the target corpus's own OCR error profile, which beats random noise injection.

### Cited Findings
- **Stock `heb` on HeOCR's benchmark.** CER 0.226 and WER 0.473 on 38 pages; CER 0.384 and WER 0.588 on 10 pages. The HeOCR R6 fine-tune of `tessdata_best heb` on NLI scans with Project Ben-Yehuda text lowers the 38-page CER to 0.209, which the author calls "a small, measured improvement… not a new engine". R7 used 95,151 real lines from 30 public-domain books and showed no page-level gain over R6. Neither covers Rashi or other non-square scripts. These are self-published Zenodo records, dates not verified, likely 2026 — [HeOCR R6](https://zenodo.org/records/24109989), [HeOCR R7](https://zenodo.org/records/24126449), [HeOCR site](https://heocr.github.io/)
- **heb_rivok (Apache-2.0).** A fine-tune of `tessdata_best`, trained on synthetic line images. Self-reported: 4.7% error for stock `heb` versus 1.4% on 403 Hebrew-only document lines, and 19.3% versus 14.0% on mixed Hebrew/English lines. Mixed scripts are much harder, which matters because spines mix languages — [GitHub RivoksLab/tesseract-heb-rivok](https://github.com/RivoksLab/tesseract-heb-rivok), [HF](https://huggingface.co/Rivok/tesseract-heb-rivok)
- **HeOCR kraken pipeline.** Line detection, then reading order, then recognition, for modern Hebrew. The recogniser was trained on synthetic pages only and is "much weaker" on real scans — [Zenodo 24023074](https://zenodo.org/records/24023074)
- **kraken training size.** A printed-script model with a small grapheme inventory, such as Hebrew or Arabic, needs about 800 lines — [kraken docs](https://kraken.re/3.0/training.html)
- **Other Hebrew models.** A Rashi-script tessdata exists — [Pninim tessdata_heb_rashi](https://gitlab.com/pninim.org/tessdata_heb_rashi)
- **Tesseract on scene text.** Accuracy "largely fluctuated" on scene images, compared with good performance on documents — [arXiv 2004.08079](https://arxiv.org/pdf/2004.08079)
- **Look-alike letters (practitioner guides, not research).** OCR not trained on Hebrew confuses ן/ו, ה/ח, ב/כ and מ/ס — [kovetz.co.il](https://www.kovetz.co.il/en/guides/ocr-pdf-hebrew). Other groups: ו/ז/ן and ה/ח/ת, plus advice to check that final letters were not output as medial forms — [fastocr.org](https://fastocr.org/hebrew-ocr)
- **Post-correction (Bar-Ilan, 2023).** A light-weight network is trained on automatically generated training data with language- and corpus-specific errors. On JPress historical newspapers it beat random error injection, other neural post-correctors and complex spellcheckers. Performance depends on the genre and period of the training data — [Suissa et al. 2023](https://arxiv.org/abs/2307.16220)
- **JP_CE evaluation set.** 150 JPress articles corrected by 75 students and checked by an expert. The synthetic training set BYP_HEB has about 2.64M sentences from Project Ben-Yehuda, with JPress-style errors inserted (snippet) — [ACM JOCCH 10.1145/3479159](https://dl.acm.org/doi/full/10.1145/3479159)
- **Post-correction competition (2026).** The ICDAR 2026 HIPE-OCRepair competition uses LLM-assisted post-correction of Tesseract output, for European languages, not Hebrew — [arXiv 2607.08143](https://arxiv.org/pdf/2607.08143)

### Inferences
- Our frequency-list corrector, one look-alike letter or ו/י away, matches the reported confusion classes. Add explicit confusion pairs for ז/ו/ן, ה/ח/ת, ב/כ, ר/ד and ם/ס/מ, and a final-or-medial normalisation (map ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ before matching, and restore after). Weight edits by a measured confusion matrix from our own spine crops, following Suissa's finding that corpus-specific error profiles beat generic ones.
- Matching titles at the catalog level with final-form and matres-lectionis (ו/י) folding is probably worth more than word-level correction, because titles are short and rare words abound.
- Nikud is rare on modern spines and was not addressed in any source. Treat diacritics as noise to strip.

### Gaps
- No Hebrew scene-text dataset or recogniser from Israeli universities was found in these searches. I found no Dicta OCR model, and no NLI OCR model beyond NLI scans used as training data.
- There is no quantitative Hebrew confusion matrix from any peer-reviewed source.
- Tesseract RTL handling on rotated crops (bidi reordering of mixed Hebrew/Latin/digit lines) is not documented in the sources found. A PR in a third-party repo mentions handling Latin inside Hebrew lines and RTL reading order as a separate engineering step — [lumen-md PR #357](https://github.com/talstilkol/lumen-md/pull/357)

## Q5. Is a small VLM a realistic future route?

### Takeaway
Not on current evidence. There is no benchmark for spine reading by any VLM, Hebrew support is untested, and the one informal test shows hallucinated titles. The browser and no-GPU constraint also rules out most VLMs. The literature supports improving detection (per-line, oriented boxes) and catalog-level matching first.

### Cited Findings
- Detection, not matching or reading, caused the largest drop in the only recent end-to-end study (0.918 to 0.641) — [Llabrés et al. 2024](https://arxiv.org/html/2407.19812)
- Small VLMs agreed on a wrong title for a single spine — [daconta.us](https://daconta.us/Articles/slm-image-recognition-test-and-impressions.html)

### Inferences
- If a VLM is tried, constrain it: give it per-spine crops, ask for transcription rather than identification, and accept only output that matches the catalog, so a hallucination becomes a rejected match instead of a false title.

### Gaps
- No VLM Hebrew scene-text accuracy figures were found. No evaluation of Shelfie, Libib or similar apps was found from a primary source.
