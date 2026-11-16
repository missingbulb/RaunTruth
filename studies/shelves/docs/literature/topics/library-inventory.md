# Library shelf reading, automated shelf inventory, spine conventions and home cataloguing

Scope note: this covers the library-practice and library-automation side only. Each source is marked with its date, open-access (OA) status and, where one was downloaded, its local PDF. Local PDFs are in the study Drive folder `Literature/`. I could not extract their text: the sandbox refused text extraction on downloaded files. So every claim below comes from pages fetched over the web or from search-result abstracts, never from the local PDFs.

## Q1. What accuracy have automated shelf-inventory systems reached, under what conditions, and what made them fail or be abandoned?

### Takeaway
The only near-perfect field figure, "up to 99%", comes from RFID (A*STAR's AuRoSS, 2015–16). It comes from a press release, and its error breakdown is not published. Vision systems that read spines in a real library score far lower. The UJI drone (2021), reading call-number labels with Tesseract, reached 65% overall. Smartphone spine recognition (Stanford, 2011) reached about 91% recall on its own test set. Deep-learning spine ID reaches about 99% only in simulation, against a closed database. The common failure causes are image resolution and blur, thin spines, look-alike adjacent books and missing or skewed labels. Commercial home-library photo apps died for business reasons, not accuracy reasons.

### Cited Findings
**RFID robots**
- AuRoSS (A*STAR Institute for Infocomm Research, Singapore). Li, Huang, Kurniawan & Ho, IROS 2015, pp. 6100–6105, DOI 10.1109/IROS.2015.7354246; paywalled (IEEE). The abstract says only that library tests show "high accuracy", with no percentage. — [ScienceDaily 2016 press summary](https://www.sciencedaily.com/releases/2016/06/160606101548.htm); [A*STAR research highlight](https://research.a-star.edu.sg/articles/highlights/high-tech-librarian-knows-its-books/)
- A*STAR's own write-up claims "up to 99 per cent scanning accuracy", including on curved shelves, from trials in Singapore libraries. New Atlas repeats the figure. It gives no test conditions and no split between tag read rate and misplacement detection. — [A*STAR](https://www.research.a-star.edu.sg/research/7512/high-tech-librarian-knows-its-books) (search snippet; the page itself was bot-blocked when fetched); [New Atlas 2016](https://newatlas.com/robotic-librarians-hit-books/43666)
- How it scans: a lateral mini-manipulator with ultrasonic sensors holds the RFID antenna at the best distance from the books ("too far and we lose the RFID signals, but too close and the antenna hits the shelf"). It navigates by tracking the shelf surface, because library maps were too coarse for robot motion. — [phys.org 2016](https://phys.org/news/2016-06-automated-robot-scans-library-shelves.pdf)
- RFID wand read rate (Abcouwer & van Loon, *Library Hi Tech*, 2020, DOI 10.1108/LHT-06-2019-0129; OA status unknown, not downloaded):
  - Tags near the spine read reliably; tags near the fore-edge were sometimes missed.
  - Other book-specific factors mattered little.
  - A repeat sweep of tags missed on the first pass raised the read rate by 0.15.
  - Data: tags on three fixed shelves, read 40 times per configuration.
  - [sciencegate](https://www.sciencegate.app/document/10.1108/lht-06-2019-0129); [x-mol](https://www.x-mol.com/paper/1349522689524264960)

**Vision robots**
- UJI Aerial Librarian (Martinez-Martin, Ferrer, Vasilev, del Pobil, *Sensors* 21(4):1079, Feb 2021, DOI 10.3390/s21041079; OA, CC BY 4.0). It is a Parrot Bebop 2 quadcopter that localizes with ArUco markers on the shelves. It reads the **call-number label at the bottom of the spine, not the title**: Tesseract OCR, with the output checked against the catalogue-code format. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7915268/). PDF: https://www.mdpi.com/1424-8220/21/4/1079/pdf (the curl download returned HTML, not a PDF, so it was not saved).
- UJI field test: a high-school library outside opening hours, with 88 books on 2 shelves analysed.
  - Tag detection: 72% per frame, about 85% across overlapping frames.
  - OCR of the code: 75%, falling to about 25% at poor resolution.
  - Overall recognition plus localization: **65%**, or 72% if unreadable tags are excluded.
  - Estimated time: about 42% of manual time. This is an estimate, not a measurement.
  - The authors say a 35% error rate "implies considerable inventory loss" and needs refinement before real use.
  - [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7915268/)
- UJI failure causes: tags not at the bottom of the spine; adjacent books too similar, with no clear vertical gap; broken or skewed tags; very thin spines; motion blur; low resolution (856×480 real-time stream); localization drift. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7915268/)
- UJI's review of prior vision systems: Hummel et al. reached 50% success, but on a poster of mock-up books. Tabassum et al. and Jubair et al. are described as having "low success rates". Quoc & Choi and Hu et al. were limited by fixed-camera constraints. The UJI paper also lists RFID robots: AdvanRobot, AuRoSS, LibBot and the commercial TORY. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7915268/)
- Trixi the Librarian (Wieczorek, Sygo, Liu, Koshil, Univ. Hamburg, arXiv:2210.10110, 2022; OA):
  - Platform: a PR-2 robot.
  - Pipeline: YOLOv5 spine detection, fine-tuned on 611 self-labelled images, then CRAFT text detection and a DTRB scene-text recognizer.
  - Text matching was abandoned for **HSV colour histograms**, because neither text nor SIFT "showed sufficient performance": the text was too small and the camera gave too few clear images, and SIFT confused look-alike books (full text: [`wieczorek-2022-trixi-the-librarian.md`](../wieczorek-2022-trixi-the-librarian.md)).
  - It reports no quantitative accuracy; the demo sorts three books.
  - It notes **there is no standardized benchmark for book-spine recognition**.
  - [ar5iv](https://ar5iv.labs.arxiv.org/html/2210.10110). Local: `Trixi the Librarian.pdf` (the complete 10-page arXiv v2).
- DL On-shelf Books Recognition (GitHub, Boatsure): top-1 99.18%, top-5 99.91% when recognizing 3.6k IDs from 5.6k spine images, in **simulated** scenarios, with a prototype grasping robot. — [GitHub](https://github.com/Boatsure/DL-On-shelf-Books-Recognition)

**Smartphone and vision research**
- Chen, Tsai et al., "Building book inventories using smartphones", ACM MM 2010 (DOI 10.1145/1873951.1874043). The method is spine segmentation plus bag-of-features image matching, with each book's location inferred from accelerometer, compass and WiFi readings. — [unpaywall record](https://unpaywall.org/10.1145%2F1873951.1874043). Author PDF: https://web.stanford.edu/~bgirod/pdfs/ChenMM2010.pdf (the URL is a guess. Both Stanford downloads failed on a TLS error at the proxy, so this file was not saved.)
- Tsai, Chen, Singh, Girod, "Combining image and text features: a hybrid approach to mobile book spine recognition", ACM MM 2011 (DOI 10.1145/2072298.2071930). It runs text-based search (spine OCR as keywords) and image-feature matching in parallel and combines the results. The motivation: "some book spines contain only text components that do not yield distinguishing image features". A listing reports that either pipeline alone reaches about 72% recall and the hybrid about 91%. — [NTHU listing](https://scholars.nthu.edu.tw/esploro/outputs/conferencePaper/Combining-image-and-text-features-A/9957768442206774); author PDF https://web.stanford.edu/~bgirod/pdfs/Tsai_ACM_Multimedia_11.pdf (not saved: TLS error).
  - Conflict: a later arXiv paper cites the Tsai hybrid as precision 0.92, recall 0.60, F 0.91 (internally inconsistent). Unresolved until the original is read. — [arXiv 1611.07385](https://arxiv.org/pdf/1611.07385)
  - A later Stanford Android version used tiled search and reached about 1 s recognition delay for live viewfinder augmentation. Stanford also holds patent US 9,805,331, "Smartphone-based asset management", covering library, bookstore and **personal collections**. — [Google Patents](https://patents.google.com/patent/US9805331)
- Yang, He, Huang, Zhou, Ororbia, Kifer, Giles (Penn State), "Smart Library: Identifying Books in a Library using Richly Supervised Deep Scene Text Reading", arXiv:1611.07385, 2016; OA. It treats spine reading as scene text and argues that "the performance of most existing approaches is limited by book spine segmentation and off-the-shelf OCR systems". The abstract gives no numbers. — [arXiv abs](https://arxiv.org/abs/1611.07385). Local: `Smart Library - Identifying Books in a Library using Richly Supervised Deep Scene Text Reading.pdf` (2 pages; may be a truncated copy, not verified).
- IAPR DAS 2024, "Image-text matching for large-scale book collections": SAM-based spine segmentation, commercial OCR and partial text matching against the catalogue, with a released bookshelf-image dataset from a Spanish public library. — [IAPR archive](https://iapr.org/archives/das2024/papers/Image-text%20matching%20for%20large-scale%20book%20collections.html) (not downloaded; OA status unchecked)

**Tagged AR**
- ShelvAR (Miami University, Bo Brinkman's AR group, 2011–2013) does **not** read spines. It puts QR-like coded tags that encode the call number on each spine: 16-bit at first, with a 72-bit version planned. The app flags misplaced books with an arrow to the right place and produces an inventory list as a by-product. — [Popular Science 2011](https://www.popsci.com/technology/article/2011-04/augmented-reality-app-librarians-instantly-shows-which-books-are-misfiled/); [i-programmer](https://i-programmer.info/news/105-artificial-intelligence/2187-augmented-reality-app-for-shelf-reading.html)
- Brinkman & Brinkman, "AR in the Library: A Pilot Study of Multi-Target Acquisition Usability", IEEE ISMAR 2013, DOI 10.1109/ISMAR.2013.6671785; paywalled. People with no library experience were "just as fast and accurate" as experienced workers. It frames shelf reading as a multi-target task where the user "must be able to easily double-check that none were missed". The abstract gives no numbers. — [ISMAR 2013 poster page](https://ismar2013.ismar.net/ismar/2013/poster/ar-library-pilot-study-multi-target-acquisition-usability.html)

**Abandoned products**
- Shelfie (formerly BitLit, Vancouver) identified books from photos of a user's bookshelf, offering discounted ebook or audiobook editions of books they owned. A beta tester found it identified most books, but flash glare on spines interfered. It **shut down on 31 Jan 2017**. The CEO blamed ebook economics: the company did not control a platform. Kobo bought the technology in April 2017; whether shelf scanning ever shipped in Kobo's apps is unverified. — [Publishers Weekly](https://www.publishersweekly.com/pw/by-topic/digital/content-and-e-books/article/72650-shelfie-closes.html); [The Stranger](https://www.thestranger.com/books/bitlit-is-an-app-that-would-convert-your-print-books-into-e-books-if-it-worked-properly-21308304/); [Liliputing](https://liliputing.com/shelfie-shuts-jan-31st-takes-drm-laden-ebooks/); [PW on Kobo](https://www2.publishersweekly.com/pw/by-topic/digital/content-and-e-books/article/73280-kobo-acquires-shelfie-technology-platform.html)

### Inferences
- Vision systems that succeed in libraries read the **call-number label** (a short, constrained, format-checkable code), not the title. Home books carry no such label, so our task is closer to the Stanford, Penn State and DAS-2024 "spine title → catalogue match" line. There, published recall sits at roughly 60–91%, and only closed-set matching gets higher.
- The repeated lesson is to pair OCR with a matcher against a known list, using fuzzy or partial matching (Tsai 2011, DAS 2024, UJI's format check). That supports our design, where a separate title matcher consumes the reader's output.
- The failure modes UJI and Trixi list (resolution, thin spines, look-alike neighbours, blur, glare) are the ones to report separately in our evaluation.

### Gaps
- AuRoSS's IROS paper is paywalled; there is no published breakdown of the 99%.
- I did not read the full texts of the Tsai 2011 and Chen 2010 papers, so the conflicting recall figures are unresolved.
- I found no peer-reviewed accuracy figures for commercial products: Bibliotheca, TORY, "LibraryAI", Spines/BookSnap, or Goodreads, StoryGraph or Libib photo features.
- I found no information on an Aberdeen shelf-scanning robot. The robot the assignment remembered is probably AuRoSS (A*STAR, Singapore).

## Q2. Why did RFID win over vision in many libraries, and what does that imply for a vision-only home-library tool?

### Takeaway
RFID reads every tag in range without line of sight or legible print, and libraries already tag books for self-checkout and security. Inventory then comes almost free, at about 99% read rates with good tag placement. Vision needs resolution, lighting and a legible label, and in field tests it lost 25–35% of books. A home tool has no tags and no labels. It has to read publisher-designed titles, so it should expect the vision regime's lower ceiling and design for user correction.

### Cited Findings
- UJI's case for vision states RFID's limits: it reads every tag in range **without precise book location**, so it cannot tell order on the shelf, and it needs every book tagged. — [Martinez-Martin 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7915268/)
- RFID read reliability depends mostly on tag placement (near the spine), and a second pass recovers misses (+0.15 read rate). — [Abcouwer & van Loon 2020](https://www.sciencegate.app/document/10.1108/lht-06-2019-0129)
- RFID inventory practice reports (anecdotal):
  - Norfolk Public Library (MA): after RFID inventory it found only 388 items missing, against a prior estimate of 10%. — [Public Libraries Online](https://publiclibrariesonline.org/?p=28777)
  - University of Warwick: routine wand checks detect misplaced items (vendor case study). — [Lyngsoe](https://lyngsoesystems.com/library/cases/the-university-of-warwick-library)
- Vision in the same setting: 65% overall, collapsing to 25% OCR accuracy at low resolution. — [Martinez-Martin 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7915268/)
- ShelvAR shows libraries choosing **added machine-readable tags** over reading existing print, even for a camera system. — [Popular Science 2011](https://www.popsci.com/technology/article/2011-04/augmented-reality-app-librarians-instantly-shows-which-books-are-misfiled/)
- Libraries without RFID budgets fall back to barcode scanning with spreadsheets, stressing that scan results must be accurate and captured in real time. — [Code4Lib Journal issue 38, 2017](https://journal.code4lib.org/articles/12783)

### Inferences
- RFID's advantage is "machine-readable identity added at accession". Vision-only tools succeed when they reduce the problem to matching against a known list. For a home tool, that list is the user's own candidate catalogue or a book database, which is what our title matcher provides.
- RFID's two-pass gain (+0.15) suggests capturing multiple photos or angles and merging them. UJI's per-frame 72% rising to 85% with overlapping frames points the same way.
- Because RFID gives no order, misplacement detection was a vision or AR selling point. Our tool cares about presence, not order.

### Gaps
- I found no published cost comparison of RFID versus vision inventory in libraries.
- Adoption statistics (the share of libraries using RFID) were not searched.

## Q3. What do spine-printing standards specify, and how consistent is practice, including for Hebrew?

### Takeaway
ISO 6357:1985 (confirmed 2023) prefers a **transverse** (horizontal) spine title where it fits, and otherwise a **descending** one (top to bottom). Ascending titles are "not standard", and the standard covers only Latin, Greek and Cyrillic scripts. ANSI/NISO Z39.41 (1979; 1997, reaffirmed; 2015 "Placement Guidelines for Information on Spines") allocates spine areas, including space for library labels. Real practice varies: Anglo-American books are mostly descending, German and continental European books traditionally ascending. I found no authoritative source for the Hebrew convention.

### Cited Findings
- ISO 6357:1985, "Documentation — Spine titles on books and other publications". Status 90.93, confirmed; released 1985-12-19. — [ISO](https://www.iso.org/standard/12665.html)
- What ISO 6357 says (summaries from catalogue and preview pages; the full text is paid):
  - Descending title = read top to bottom, easily read when the book lies flat, front cover up.
  - Ascending titles are not standard.
  - The transverse title is preferred "where possible".
  - On spines too thin for a title, an "edge title" goes on the front cover near the spine.
  - Scope is limited to Roman, Greek and Cyrillic scripts.
  - [iTeh preview](https://standards.iteh.ai/catalog/standards/iso/fe15b4c9-b490-4e85-b6bc-27845c6c4382/iso-6357-1985); [ISO](https://www.iso.org/standard/12665.html)
- British equivalent BS 6738. The author's English shelf is mostly descending, with some transverse and ascending exceptions. Commenters report German and Swiss titles as "typically ascending". — [Dan Q blog, 2019](https://bcdn.danq.me/2019/01/27/iso-6357/) (blog, secondary)
- North America runs top to bottom, Europe usually bottom to top. — [creativepro "dot-font: Putting Some Spine in Design"](https://creativepro.com/?p=118228) (secondary)
- ANSI/NISO Z39.41: first issued 1979 as a spine format standard, now titled "Placement Guidelines for Information on Spines". It "describes and allocates areas on the spines of printed bindings, covers, containers". NISO distributes it free. — [NISO project page](https://groups.niso.org/higherlogic/ws/public/projects/126/details); [ANSI webstore](https://webstore.ansi.org/standards/niso/ansinisoz39411997r2002)
  - PDF: https://groups.niso.org/higherlogic/ws/public/download/6465/Printed%20Information%20on%20Spines.pdf. Local copy: `Printed Information on Spines.pdf`. It is an encrypted PDF, so its clauses (label-area dimensions, title direction) could not be read and are not verified here.
- Hebrew: Hebrew books run right to left, so their page order is reversed (the last page of the PDF is the first page of the book). The source does not discuss spines. — [Times of Israel blog "Reverse polarity"](https://blogs.timesofisrael.com/reverse-polarity/)

### Inferences
- A spine reader must try **both** 90° rotations plus horizontal. Descending dominates English books, but ascending is common in European and imported books. Horizontal appears on thick spines, and very thin books may have nothing on the spine at all.
- Hebrew is outside ISO 6357's scope, so neither direction can be assumed. From experience (not sourced), Israeli books appear in both orientations, so both must be tried. Inside a rotated Hebrew line the characters still run right to left, so text-line direction and rotation must be decided independently.
- Library labels (call numbers) sit at the spine foot under Z39.41's allocation. Home books bought second-hand from libraries may carry them, and a reader should not take label text for the title.

### Gaps
- I found no source for Hebrew or Israeli spine-direction practice, either in English or in Hebrew searches; there is no Israeli standard (SI) equivalent found. Ask an owner or a publisher, or measure it on the corpus.
- Z39.41's exact label-area and direction clauses could not be read because the PDF is encrypted.
- I found no empirical survey of how many books follow ISO 6357.

## Q4. Shelf reading as a practice, home cataloguing tools, and what evaluation measures the library world uses

### Takeaway
Manual shelf reading checks call-number order shelf by shelf. Cornell measured 2.24 minutes and 1.18 errors per 3-ft shelf, and a cheaper partial read caught 83% of errors. Libraries count "misshelved" (present but out of place, measured by distance) separately from "missing" (not found). Home catalogue apps identify books by ISBN barcode, and photo cataloguing is newer and treated as a starting point that needs checking. Measures worth reporting: per-book recall, how many books were found at all, error-detection rate against a full read, and time per shelf.

### Cited Findings
- Cornell Engineering Library (page dated 2019, describing work from 1999–2002):
  - Traditional shelf reading took 2.24 min per 3-ft shelf and found 1.18 shelving errors per shelf, for 274 h over 7,340 shelves.
  - "QuickRead": students check only the first half of each call number, 25–35 shelves per 15-minute stint. It finds **83%** of shelving errors (goal 90% in half the time) and catches every book misshelved several aisles away.
  - [Cornell](https://engineering.library.cornell.edu/space-optimization-and-inventory-control)
- Electronic shelf reading, about 305,000 volumes scanned (LC classes D–H, N, P and Q, two thirds of the monograph collection; Sung, Whisler & Sung 2009, reviewed by Newton Miller 2010):
  - Of 228 "missing" books, 30% were scanned in their correct location, 10% were found 26–100 books away and about 50% more than 100 books away.
  - The labour of inventory control (2.2 ¢ per book scanned) cost less than repurchasing or borrowing the badly misshelved books it found.
  - [EBLIP evidence summary, Sep 2010](https://doaj.org/article/8d04ab196e384558971336867b7ef9eb) (search snippet; DOAJ returned 403 on fetch). OA. PDF https://journals.library.ualberta.ca/eblip/index.php/EBLIP/article/download/8214/7342/22440, local `Labour Costs for Inventory Control Less Expensive than Repurchasing.pdf`.
  - Full text: [`newtonmiller-2010-inventory-cost-eblip.md`](../newtonmiller-2010-inventory-cost-eblip.md).
- Edwardy & Pontius, "Monitoring book reshelving in libraries using statistical sampling and control charts", *LRTS* 45(2), 2001, DOI 10.5860/lrts.45n2.90; OA. It samples misshelving rates over time and uses a control chart to decide when to shelf-read. — [LRTS](https://journals.ala.org/index.php/lrts/article/view/5196). Local: `Monitoring Book Reshelving in Libraries Using Statistical Sampling and Control Charts.pdf`.
- Other figures:
  - UW–Madison sample inventory: 1,225 items reported misshelved in 2 months (Van Gemert, 1996). — [search snippet, crln](https://crln.acrl.org/index.php/crlnews/article/view/18994/21903)
  - Purdue (barcode era): 20% of books missing or misshelved before a full inventory; the missing rate fell from 5.6% to under 0.5% after. — [Purdue e-Pubs](https://docs.lib.purdue.edu/lib_fsdocs/1)
  - Yale: a staffer's estimate (not a study) of a 3% human error rate, or more than 12,000 books misplaced. — [Yale Daily News](https://yaledailynews.com/?p=35877)
- Home cataloguing tools:
  - LibraryThing's app adds books by search or ISBN barcode scan. — [App Store](https://apps.apple.com/us/app/id948824489)
  - Libib scans barcodes of books, media and games. — [Google Play](https://play.google.com/store/apps/details?id=com.libib.app)
  - Hylle (2026) catalogues from shelf photos, suggesting about 10–50 books per photo. A review calls it "a starting point, not a replacement for checking your work". — [GearDiary, Oct 2026](https://geardiary.com/2026/10/19/hylle-app-review/)
  - A 2007 blog proposed shelf photos as a catalogue, noting that photos are useful even without OCR. — [4brad](https://ideas.4brad.com/node/675)
  - User reviews found complaints about missing features and scanner crashes; I found nothing quantitative on photo accuracy. — [App Store](https://apps.apple.com/us/app/id948824489)

### Inferences
Suggested metrics for our tool, mapped from library practice:

| Metric | Library analogue |
|---|---|
| Per-book recall (books whose title was read and correctly matched / books on the shelf) | Read rate |
| Precision (no phantom books) | — |
| Unread-but-boxed rate (a box with no usable text) | UJI's "unreadable tag" split, 65% vs 72% |
| Results by spine class (thin, horizontal or rotated, Hebrew vs English, glare) | — |
| User correction time per shelf | Cornell's minutes per shelf |

Detecting misplacement (order) is irrelevant for a home tool. "Missing" here means a book on the shelf that the pipeline never boxed, and it should be reported separately from boxed-but-misread.

### Gaps
- I found no studies of user complaints about Delicious Library, StoryGraph or Goodreads photo-scanning features.
- I have no quantitative error rates from manual shelf reading itself: how many errors a human shelf-reader misses.
- No library-science source defines a standard "inventory accuracy" metric. Practice uses ad hoc read rates and missing counts.

Each of these is now summarised from its full text: [`niso-z3941-spines.md`](../niso-z3941-spines.md), [`newtonmiller-2010-inventory-cost-eblip.md`](../newtonmiller-2010-inventory-cost-eblip.md), [`edwardy-2001-reshelving-control-charts.md`](../edwardy-2001-reshelving-control-charts.md), [`yang-2016-smart-library.md`](../yang-2016-smart-library.md), [`wieczorek-2022-trixi-the-librarian.md`](../wieczorek-2022-trixi-the-librarian.md).

Paywalled or failed downloads:
- Li et al. IROS 2015 (AuRoSS): paywalled.
- Brinkman ISMAR 2013: paywalled.
- Abcouwer & van Loon, LHT 2020: OA unknown.
- Tsai MM 2011 and Chen MM 2010: author PDFs exist, but the proxy failed TLS.
- UJI *Sensors* 2021: OA, but MDPI returned HTML to curl.
