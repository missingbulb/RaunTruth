# Bookshelf Reader: ground truth on a phone (design exploration)

Nothing here is built or measured. Every time and share below is an estimate from the study's own
recorded scores, not from a trial. Mock-up: `mockup.html`, beside this file.

## (a) What the desktop makes, and what the phone must make

Desktop (`req/shelves/truth/task`, `web/shelves.js`): one task, Books, each book in the order it
stands. Submit writes `<photo>_books_gt.json`, books in walk order, only those marked right:

`grade.py` below is the grader of the time, `lab/grade.py` (IoU > 0.5 boxes; CER and word recall for the readers). Since 2026-11-18 the study is scored by its own `algorithm/score.py` (boxes and titles together), run by the shared `lab/run.py`; the paths here are as they were then: `py/` is now `algorithm/`, and `reading/read.mjs` was retired.

| Field | Desktop sets it by | Used by `lab/grade.py` for |
|---|---|---|
| `corners` (4, clockwise) | dragging corners on the photo | finder: a found box is the book at IoU > 0.5; also the crop the readers are scored on |
| `turn` (quarter turns) | Flip | the turn readers are scored at |
| `text` (may be empty) | a text box prefilled with the reading | readers: CER and word recall, letters and digits only; a book with no text is not scored for reading |
| `source` found / missed | Add a book here, Draw a book | reporting |
| `proposed` {corners, text} | kept automatically | scoring finder and reader from one file |

The phone writes **the same file**, so `grade.py` needs no change. Per field:

| Field | Phone tier | Why |
|---|---|---|
| verdict (book / not a book), `turn`, `source`, `proposed` | **same as desktop** | a yes/no or a two-way choice on a clear chip loses nothing |
| `text` | **same as desktop**, when the answer is a typed or confirmed line; anchoring on the reader's guess is the same risk the prefilled desktop box already has | the human still reads every letter on a big chip |
| `corners` | **weaker**: good for the IoU > 0.5 match and for cropping, *not* for mean IoU | boxes are confirmed or moved by whole edges, rarely drawn, so they lean toward the finder's own proposal |
| completeness (no book left out) | **arguably stronger** | every stretch of shelf is either a box or a gap someone counted; desktop has one "None missed" for the whole photo |

Proposed addition (owner's call, see f): a per-book `how` (`confirmed`, `edges`, `seams`, `drawn`)
so a later reader of the file can tell a drawn box from a confirmed one. Mean IoU would then be
reported over `drawn` boxes only.

## (b) The micro-tasks, in order

The walk is the desktop's: shelf by shelf from the top, each shelf left to right. Per shelf the
phone does steps 1 to 5 before the next shelf, so a shelf is finished, not half-done (the
area-by-area rule of `designing-ground-truth-tasks`). Steps 2 to 4 and 7 to 8 appear only when needed.

| # | Task | Shown | Answers (thumb, bottom third) | Extraction behind it | Est. s |
|---|---|---|---|---|---|
| 1 | **One book?** | the straightened chip, laid on its side across the screen's width, at the reader's turn; above it a small context strip (the box and two neighbours on the photo) | swipe right / **One book**; swipe left / **Not a book**; **Two or more**; **Box is off**; Flip (top right of chip) | exists: `books.straighten`, reader's `turn` | 2 |
| 2 | Which way up? | the chip at both turns, one over the other | tap the one that reads | exists (`turns` in `reading.js`); asked only when the two turns' confidences are close | 2 |
| 3 | Box is off | the chip with a margin of photo around it, four edges as fat handles | drag a whole edge (not a corner), snaps to the nearest strong edge; **Done**. Fallback: corner drag with a loupe above the finger | **new**: straighten with padding; edge snap from `books.Edges` | 8 |
| 4 | Two or more | the chip, upright as on the shelf, the series-split seam proposed as a dashed line | tap where the books part (each tap a seam, snapped); **Done**; **It is one book after all** | exists: `series_split` proposal; **new**: tap-to-seam snap from `side_lines` at a relaxed threshold | 4 |
| 5 | **How many books here?** (each gap between kept boxes, and each shelf end) | the gap, straightened, with the kept neighbour either side dimmed | **0** (wall, board, gap) / **1** / **2** / **3** / **4+** | **new**: gap strips; then the finder re-run on the gap alone, told N, keeping the N-1 strongest seams it had rejected | 3 |
| 6 | Seams right? (after a count above 0) | the gap with the proposed seams | **Yes** / tap to move a seam | as 4. Each new box then takes steps 1 and 7 | 4 |
| 7 | **Title, a line at a time** | one text line of the chip, upright and enlarged (a spine has 2 to 4: author, title, publisher) | up to four readings as big buttons, `dir=auto`; **None of these**; **No text here**; **Can't read** | exists: line boxes from the `lines` reader, three readers, both turns, spelled and unspelled; **new**: keep all of them instead of the most confident, dedupe; add lines already confirmed on this photo and earlier ones (publishers and authors repeat along a shelf) | 3 |
| 8 | Fix a word (after None of these) | the line, the best reading under it as word tokens | tap a wrong word: look-alike alternatives from the lexicon, or type that word alone with completion from the two word lists; add / delete a word; **Type the whole line** as last resort | **new**: the speller's ranked candidates exposed (it already computes them and keeps one); prefix completion over `heb.txt` + `names.txt` | 12; typing a whole line 25 |
| 9 | **Shelf check** | the whole shelf band across the screen (pan sideways), every decided book cut out to black | **Nothing left** / tap what is left (opens step 5 on that spot) | exists: `viewer.doneMask` idea, on a strip | 4 |
| 10 | Outside the shelves | the photo with all shelves cut out | **No books here** / tap a book (lying covers, piles): a median-size box there, then step 3 | exists: desktop's Add a book here | 5 |
| 11 | Submit | counts: kept, added, unread | **Submit ground truth** | exists | 3 |

Throughput, per photo of 60 books (the size of `1zktX1`), assuming the readers stay as weak as
recorded (word recall 0.08 to 0.48, so a whole line is right perhaps one time in five; **this share
is a guess**): boxes and gaps about 8 s a book, titles about 20 s a book, so roughly **25 to 30 minutes,
about 28 s a book, three quarters of it text**. Boxes alone (no titles): about 8 minutes.

## (c) Entry

1. The desktop page, with a photo found and read, shows **Tag on a phone**: a QR code and a link
   to `/app/shelves?tag=<photo>`. A phone opening the study directly lists the photos that have a
   pack ready, newest first.
2. The phone opens straight into the first undecided task. No viewer, no panels, no Find or Read
   buttons; one line of progress (`3/12 Books`, a bar split per shelf) and the task.
3. Heavy work is not done on the phone. Pyodide, the text finder and Tesseract on 12 MP are a
   desktop's job; the desktop (or the lab) writes a **task pack** beside the photo: chips, line
   crops, readings, gap strips. The phone downloads the pack, works offline, and its answers are
   the shell's draft (`req/shell/ground-truth/draft`), so Continue tagging works across devices.
4. **In front of the shelf** (the owner on their own phone): a switch on the entry screen. It
   changes two things: Can't read becomes **Read it off the book** (type what the spine says), and
   a new photo can be taken there and queued for a pack.

Steps 1, 3 and 4 each add a network call or a permission (Drive write of a pack, camera); each is
the owner's approval, one by one (`network-calls-approved`).

## (d) Misses, boxes, text

- **Misses.** Never "look at the photo and spot what is missing" as the first resort: that is the
  task a small screen is worst at. The gap count (step 5) turns it into a number per stretch of
  shelf, and the finder does the boxing with the count as a constraint. The shelf check (step 9)
  is the net under it. The finder currently misses 30 to 40% of books, so this is a main path, not
  an edge case.
- **Boxes.** No free corner dragging by default: a finger covers the corner it drags. Whole edges
  with snap, seams by tap, and a loupe corner drag as the fallback. A box cut by the photo's edge
  keeps four corners, as on the desktop (the edge is dragged past the frame).
- **Two halves of one book** (a box cut at its lettering): a **Same book?** yes/no on two
  neighbouring boxes, raised when their colours match and a text line crosses their shared seam.
- **Rotated spines.** The chip is always shown with its text reading across, at the reader's
  turn, so nobody tilts their head or phone. Flip is one tap; step 2 is asked only on a close call.
- **RTL / LTR.** Every reading, token and input is `dir=auto`; direction marks (U+200E/F) are
  stripped before showing or comparing. Word tokens of a Hebrew line are laid right to left, so
  the token under a word in the picture is that word. A line mixing both scripts is two runs.
- **Text entry.** Order of resort: choose a line, fix a word from alternatives, complete a word
  from the lexicon after two letters, type. The phone's own keyboard (with its dictation key) is
  the last step and nothing is built for voice. Can't read saves empty text, which the grader
  already leaves out of the readers' score while still scoring the box.

## (e) Quality control

- **Gold chips.** The four desktop-tagged photos (about 100 books) supply known answers; one task
  in ten is gold, unmarked. A helper under 90% on gold stops feeding ground truth and their
  answers go to review. (Gold items can be recognised once seen often; rotate them.)
- **Agreement.** A helper's answer counts once a second person gives the same one (verdict, count,
  chosen line); the owner's own answer counts alone. A disagreement goes to the desktop's queue.
- **Speed floor.** Answers faster than a person can read the chip are discarded, not averaged in.
- **The coarse step is the owner's.** The shelf check and Submit are done by the owner, on phone
  or desktop; helpers do steps 1 to 8 only.
- **Anchoring.** A chosen reading is more likely to keep a look-alike letter the reader got wrong
  than a typed one. Audit: retype a sample of chosen lines on the desktop and compare.

## (f) Open questions for the owner

1. **Who is the helper?** The study is visible to one account (`req/shelves/visibility`). A helper
   who sees only chips, never the whole photo, is a privacy gain; do they get an account, a link
   to one pack, or is the helper only ever you?
2. **A title the photo does not show but the book does.** In front of the shelf you can read what
   the photo cannot. Is ground-truth text what the spine says, or what the photo shows? The first
   blames the readers for the camera. Proposed: keep the text and add `legible: false`.
3. **Is phone ground truth mixed with desktop's**, or kept as its own tier until a photo tagged
   both ways shows they agree? Proposed: tag `16w5nW` (8 books, already held out) both ways first.
4. **`how` per book** in the file (a): accepted as a schema addition?
5. **The task pack on Drive, the QR link, the camera:** each a network call or permission to approve.
6. **Do text lines keep their roles?** The phone works line by line; it could record author /
   title / publisher for the matcher at no extra cost. Out of scope today.
7. **English.** No tagged title is English, so nothing here is checked against one.

## Sources

Read as search summaries, not the originals; re-verify before quoting.

- reCAPTCHA, von Ahn et al., *Science* 321 (2008), doi 10.1126/science.1160379: an unknown word
  shown beside a known control word, accepted once several people agree. The model for gold chips
  and for agreement. Via [NPR](https://www.npr.org/2008/08/14/93605988/web-security-words-help-digitize-old-books).
- [Google Crowdsource](https://en.wikipedia.org/wiki/Crowdsource_(app)): micro-tasks of "5-10 seconds",
  image-label verification as a yes/no. The model for step 1 and the time budget.
- Steven Hoober, [Design for fingers and thumbs](https://uxmatters.com/mt/archives/2013/11/design-for-fingers-and-thumbs-instead-of-touch.php):
  49% of 1,300 observed users held the phone one-handed. Why answers sit in the bottom third.
- FromThePage, [Quality control for crowdsourced transcription](https://content.fromthepage.com/quality-control-for-crowdsourced-transcription/),
  and [arXiv 1408.1928](https://arxiv.org/pdf/1408.1928): voting and gold questions, their limits.
