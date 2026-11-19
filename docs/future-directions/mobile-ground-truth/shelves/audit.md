# Audit: Bookshelf Reader ground truth on a phone, v2

Audited: `design-v2.md`, `mockup-v2.html`, `shot-v2-light.png` against `studies/shelves/requirements.md`,
`web/shelves.js`, `web/reading.js`, `py/books.py`, `lab/grade.py`, `docs/WARMUP.md`, `docs/HEBREW.md`, the shell's
requirements and the `designing-ground-truth-tasks` skill.

`grade.py` below is the grader of the time, `lab/grade.py` (IoU > 0.5 boxes; CER and word recall for the readers). Since 2026-11-18 the study is scored by its own `algorithm/score.py` (boxes and titles together), run by the shared `lab/run.py`; the paths here are as they were then: `py/` is now `algorithm/`, and `reading/read.mjs` was retired.

**What is measured and what is not.** Nothing was tried on a phone or by a person: every time below is a sum of
step estimates (a fixation 0.25 to 0.3 s, a simple decision 0.5 to 1 s, a thumb tap with travel 0.4 to 0.6 s, a new
screen 0.3 s to slide plus 0.5 s to find one's place). The photos and ground-truth files are on Drive, not in the
checkout, so counts are `WARMUP.md`'s. One thing was measured: the completion's reach (section 3, titles), on 26
spine words taken from the docs, not from the ground truth, so it is indicative. Scale: 0.17 mm a CSS px (390 px
over 66 mm); the mock-up's frames are 360 px wide, so real sizes are about 8% larger than quoted.

## Verdict

v2's box time holds only at the top of its range (9.7 s a book when the frame's edges are really checked; 7.6 s when
they are not, which is what the screen invites). Titles are 20 to 28 s for a typical five-word Hebrew spine, not 12
to 25: completion "after two letters" saves 17% of the taps, not half. Three structural faults matter more than
the times: a confirmed frame is the finder's own box, checked on a chip that hides the neighbours; a tapped frame
has no top or foot anyone looked at and a midway side, yet `grade.py` would match the finder against it at IoU 0.5;
and the at-the-shelf mode types text from a shelf that may no longer be the photo's. v3 answers in place on the
shelf picture with one gesture, a tap on every book, and comes to about 3.5 to 5 s a book for boxes.

## 1. Pre-mortem: it failed six months in. Why?

| # | Story | Kind | Likelihood | Preventing change |
|---|---|---|---|---|
| 1 | **The truth is the finder's echo.** At 3 s a book the thumb settles on One book; the wrapped chip shows 1.5 mm of margin and no neighbour, so a frame 15% short, or over two volumes of one colour, passes. Most boxes are `how: confirmed` and score 1.0 against themselves; R9 "improves" by agreeing with R8's habits | data | **High** | Judge the frame in place on the shelf at 9 mm a spine or more, neighbours visible; `grade.py` reports by `how` (it reads neither `how` nor `legible` today); `16w5nW` tagged both ways first |
| 2 | **Tapped frames punish a correct finder.** A tap gives a place across the shelf only. Sides are cut "midway" (a 9 px pamphlet beside a 56 px book gets half of the pair's width), top and foot come from the same texture test that fails on dark spines. These are the 31% the finder misses; a later finder that boxes them well gets IoU under 0.5 against the truth and is scored a miss plus a false box | data | **High** | A tapped book is a point, not a box: grade it by "a found box holds the point and no other", never by IoU, until its ends are set (v3 change 4) |
| 3 | **The owner already has a desk.** One tagger, 14 photos, 4 tagged. The phone path needs a pack writer, a store, rows and candidates out of `find`, a phone page outside the shell. It saves perhaps 5 minutes a photo over a desktop that works today. The build is never finished or never opened | owner | **High** | Smallest build: the tap-in-place walk is touch added to the existing page's photo (`shelves.js` already drags corners by pointer events; only Add a book here needs a non-right-click path), not a second app |
| 4 | **Titles never happen.** "Optional second sitting", 22 minutes of thumb typing for the 60-book photo. Boxes get done on the sofa, titles wait for the desktop, and the reader's truth stays at 32 books | owner | **High** | Say so: titles are the desktop's; the phone offers them only for books the photo cannot show (at the shelf) and for books already typed on another photo (one tap) |
| 5 | **The shelf moved.** Photos are dated 2026-09-25; tagging runs into 2027. Books lent, added, reshelved. The owner hunts 60 spines for the chip's book, finds its neighbour or a new arrival, and types that. The file now says a spine reads what the photo does not show | data, owner | Medium | Shelf mode opens with "Does this shelf still look like this?" per shelf row; No means take a new photo (a new input with its own truth), never patch the old one |
| 6 | **One hand, a book in the other.** At the shelf the phone is in the left hand; the right pulls a worn book to read its cover, then has to put it back before typing, or types one-thumbed across a 66 mm keyboard at about 60% of two-thumb speed | user | Medium | Shelf mode asks nothing typed while a hand is busy: a photo of the pulled book's spine or cover (camera, an owner approval), typed later; or the keyboard's own dictation, which the page neither calls nor can rely on |
| 7 | **Illegible at chip size, so the reader is scored on the easy books.** The four tagged photos are `PHOTO-….jpg` (messenger-sized, unverified); a thin spine is 8 to 15 px wide at the finder's 900 px, 14 to 27 px in a 1600 px original. Wrapping at "twice the size" enlarges blur. Half the thin spines become Can't read (`null`), which `grade.py` drops | data | Medium to high on compressed photos | A legibility gate from the frame's own width in source pixels: under a set width the title is not asked, the file says `text: null, why: "small"`, and the reader's score is reported with the count left out beside it |
| 8 | **Completion writes the list's spelling.** The tagger types `היי`, taps `היינליין`; the spine prints `היינלין`. Nobody rereads the tail of a word they did not type. CER moves by a letter a name, silently, and always toward what the speller (built on the same lists) would output | data | Medium | Grade ו/י variants as equal (the speller already does), or show the accepted word's untyped tail in a second colour until Done |
| 9 | **The draft is gone.** Drafts are browser-local; Safari clears script-written storage for a site not opened for 7 days unless it is installed to the home screen. Photo of 60 books, 35 done, a fortnight's pause: empty. Or the tab is discarded with a 12 MP photo decoded (about 48 MB) plus warps, mid-shelf | technical | Medium | Submit per shelf (a partial file is still a file); pack carries a phone-sized photo (long side about 2000 px) with corners in original pixels; resume at the last book (the shell's draft is written on each change already) |
| 10 | **The keyboard covers the chip.** iOS's keyboard is about 290 px plus a 45 px bar; of 844 px about 410 are left under Safari's bars. v2's title screen needs about 360 px above the keyboard and is drawn with a 210 px keyboard. On focus Safari scrolls the page; a "pinned" chip pinned to the layout viewport slides under the keyboard | technical | Medium | Lay the title screen out to `visualViewport`, 400 px budget: chip 110, field 48, suggestions docked on the keyboard 44; the three answer buttons leave the keyboard screen |
| 11 | **Two tiers in one series.** Phone boxes (confirmed, chosen, taps) and desktop boxes (drawn) are pooled; R-iteration deltas move with the mix. A research-rule breach: a metric whose definition changed under its name | data | Medium | The held-out photo stays desktop-drawn; every table says its tier; phone files enter the tuning set only after the both-ways comparison |
| 12 | **The frame colour is the book's.** Yellow `#ffd400` frame on the mock-up's own yellow Heinlein chip (frame 6); gold and cream spines are common. In sunlight at the shelf the 2 px line is lost | user | Low to medium | Keep the page's two strokes (dark under light) at 3 px and pick the light one per screen against the pixels under it |
| 13 | **"Choose a frame" never holds the right one.** R8's direction E: perfect selection over the finder's candidates gained 0 books (49/92 both ways); "generation is the wall, not selection". The three panels differ by 3 px on a 34 px spine. Seven seconds, then None fits, most times | technical | **High** that the step is wasted | Drop the chooser (v3 change 3); measure first if kept: offline, how often a rejected candidate beats the kept box by IoU 0.1 on the four truths |

## 2. Data dependencies: what must be seen or known to answer

| Task | To decide, the person needs | On the screen? | The system needs | Has it? |
|---|---|---|---|---|
| 1 One whole book? | Both long sides against the neighbours; top and foot against board and shelf above; that the neighbour is a different book (a seam, or a repeat of the design); that one title, not two, runs along it | **Partly.** Long sides are cut in two by the wrap, with a 9 px (1.5 mm) strip of neighbour: enough for a colour change, not for a same-colour series. Ends: an 18 px margin, fine. A boundary that falls at the wrap point is invisible. The neighbour's lettering, which says "that is another book", is not shown | Straighten with a margin | New |
| 1 Flip | Letters big enough to tell upside down | Yes on a title line. **But nothing in sitting A uses the turn** (`grade.py` reads `verdict`, `corners`, `text`): the answer is redundant here | | |
| 1 Which book is this? | The chip's place on the shelf | Locator: current spine 26 px (4.4 mm) in a 96 px strip, 37 mm above the chip. Enough to find, never enough to judge | Shelf rows from `find` | No: `find` returns no rows |
| 2 Which frame fits? | The same four edges, three times over, and the differences between them | Three 97 px panels, book 34 px wide; candidates differing by 10% differ by 3 px (0.5 mm) | Ranked rejected candidates near the box | No: only lines over `BOUNDARY` are kept; and see story 13 |
| 2 Corner drag | The corner and 5 mm around it, not under the finger; which of four corners is wrong | Loupe: yes. Which corner: the person must work it out per corner | JS warp follows the drag | Yes (`picture`) |
| 3, 4 Tap each book | Every seam in the stretch, or a design that repeats; where the stretch ends; what is shelf, wall or bookend | Bright against 0.6-faded neighbours: yes. **A seam the photo does not show** (dark spines on dark wood, one-colour series) is not on any screen; only the shelf itself has it | Zoom so the narrowest book is tappable, **which needs the count it is asking for**; top and foot of each tapped book | No. "At most four a screen" cannot be promised; ends unspecified |
| 5 Same book? | A continuous spine across the seam: one title crossing it, or two | For side-by-side pairs made by taps, the person answered this two seconds ago by tapping twice: **redundant**. For stacked halves (the Henderson case) the title crossing the seam decides, and it is shown | Pair check | New |
| 6 Shelf check | Book against not-book for every unfaded patch | Faded-and-hatched against bright works for coloured spines. **A dark unframed spine and the dark wood are both unhatched and both dark**: same failure as the black cut-out, one step removed | Tap to nearest unframed stretch | New |
| 7 Outside the shelves | Lying covers and piles at whole-photo scale; also every shelf the finder dropped (fewer than three spines is no shelf) | 328 px for the whole photo: a pile's spines are 2 to 4 px. Pinch needed, two hands | Add a book here | Yes (right-click only) |
| 8 Submit | What is being submitted, and how much of it was only confirmed | Counts only; not by `how` | | |
| 9 Title | Each letter at 2.5 mm or more **and sharp**; the reading order of author, title, publisher; which script; whether to type slash, geresh, volume number | Size yes (54 px rows). Sharpness depends on source pixels the screen cannot add (story 7). Order and punctuation rules: not stated | Prefix index over two lists | `names.txt` is the site's; the subtitle list is fetched from jsDelivr and kept offline, not a study file as v2 says |
| 9 At the shelf | That the shelf is the photo's shelf; which physical book the chip is | Not asked; locator only | `legible: false` kept out of the readers' score | No: `grade.py` scores any non-empty `text` |

Decisions that need what the screen does not show: the neighbour's identity (task 1), unseen seams (3, 4), book against
dark wood (6), the photo's sharpness limit (9), the shelf's present state (9 at the shelf).

## 3. Micro-interaction walkthrough

Marks: **F** fine, **T** taxing, **G** grueling, **X** futile, **R** redundant. Distances on the mock-up at
0.17 mm/px; phone held at about 30 cm, so 10 mm is about 2° of eye travel.

### 3.1 One whole book? (frame 2), the answer One book

| Step | Eyes, attention, fingers | Size, distance | s | Mark |
|---|---|---|---|---|
| a | Next chip slides in; eyes are still on the One book button from the last tap and jump 50 mm up to the chip | 295 px | 0.55 | F |
| b | Glance 37 mm further up to the locator to see which spine is outlined, and back | 26 px (4.4 mm) outline | 0.5 | **R**: tells where, which no answer here needs |
| c | Read row 1 right to left, jump to the start of row 2, notice the author's name is split across the wrap (`פרנק` / `הרברט`), reassemble | 2 rows, 64 px tall | 0.8 | T |
| d | Check the frame: each long side is two segments (one a row), each against a 9 px strip; then the two short ends at the outer row ends. Six fixations, each a comparison of the yellow line with a colour change 1.5 mm away | 6 × 0.3 | 1.8 | **G** done honestly, and **skipped** in practice |
| e | Hold in mind "which end of row 2 is the foot" while checking it | memory: 1 item | | T |
| f | Decide | | 0.5 | F |
| g | Thumb to One book, bottom right | 150 × 60 px (25 × 10 mm), 15 mm travel | 0.4 | F |

Sum **4.5 s** with the edge check, **2.3 s** without. v2 says 3: the design's own number assumes the check that
makes the answer worth having is mostly skipped.

**Wrong tap and undo.** Not a book and One book are side by side, 10 px (1.7 mm) apart, same height. After either
the same slide plays; the only sign of the wrong one is a toast 20 mm above the thumb, in the stage, while the eyes
have gone to the new chip. Notice (0.5 to 1 s, or never; the toast's lifetime is unspecified), thumb 19 mm up to
Undo (44 px), old chip returns (0.3), re-read (0.5), correct tap (0.4): **2.7 s**, T. A wrong One book is silent:
Back (48 px, bottom left, a stretch for a right thumb), re-read, answer: 2.5 s, F. Fix: the two answers get
different motion (chip leaves left or right) and are not neighbours.

### 3.2 Frame is off (frame 4)

| Step | Eyes, attention, fingers | Size, distance | s | Mark |
|---|---|---|---|---|
| a | Thumb up to the middle of three small buttons | 97 × 46 px (16 × 7.8 mm), 10 px apart | 0.5 | T |
| b | New screen; find the yellow book in panel A | | 0.8 | F |
| c | Compare three panels: same book, 34 px wide, frames that differ at one edge by a few px. Twelve edge checks, held across saccades of 18 mm | 3 panels × 4 edges | 4 to 5 | **G** |
| d | Map the panel to its letter, eyes drop 45 mm to the A B C row, thumb | 97 × 60 px | 0.9 | **R**: the panel itself is the larger target |
| e | Most times none is right (story 13): None fits | 46 px | 0.6 | **X** |
| f | Corner drag. Per corner: find it, press (thumb hides 8 to 10 mm, loupe appears above), eyes to the loupe, creep, lift without slipping, check | handle about 44 px; the top two corners sit in the top third, out of a one-handed thumb's reach | 4 to 5 each | **G** |

Choose and stop: **7 s** (v2: 5). Choose, fail, two corners: **17 s**; four corners (a leaner, or a box through the
board): **25 to 27 s** (v2: 15). One-handed it is two-handed work: the phone is re-gripped for each top corner.

### 3.3 Two or more, and Tap each book (frame 3)

| Step | Eyes, attention, fingers | Size | s | Mark |
|---|---|---|---|---|
| a | New screen; tell bright from 0.6-faded neighbours | | 0.8 | F |
| b | Per book: find the next untapped spine, tap it; a 30 px (5 mm) numbered dot lands on it | spine 56 px (9.5 mm) | 1.2 | F |
| b' | A thin book: 9 px (1.5 mm) beside a 56 px one. The thumb covers both; the dot covers the thin spine whole and half the next one's title | | 2 to 3, with Undo last tap (46 px) | **G** |
| c | Three volumes of one colour: the seam is a guess; count by the repeated ornament | | +1 | T |
| d | That is all of them | 312 × 60 px | 0.6 | F |
| e | Same book? on each pair just tapped apart | | 2.3 each | **R** |
| f | Nobody is shown the frames the taps made: sides midway, ends unknown | | 0 | **missing step** |

About 1.2 to 1.5 s a book as v2 says, plus 1.4 s a stretch, plus 2.3 s a pair that need not be asked. An empty
stretch (two thirds of them, by the review's count) costs 2 s: 0.8 to orient, 0.7 to be sure the dark patch is
wood, 0.5 to tap Nothing here is a book, which sits 8 mm from Undo last tap.

### 3.4 Shelf check and Outside (frame 5)

Shelf 250 px tall, so a shelf of 14 to 20 books is two to three screens wide: scan (1 s), drag (0.8), scan, drag,
scan, Nothing left: **5 to 7 s** (v2: 4), T. Spotting a pale 9 px sliver: F. Spotting a dark spine on dark wood:
**X** from the photo. Outside: whole photo at 328 px, pinch with the second hand (T), and any added book is an
upright median box then four corner drags: **25 s a book, G**; whole lost shelves land here.

### 3.5 Title (frame 6), a five-word Hebrew spine, 30 letters

| Step | Eyes, attention, fingers | Size, distance | s | Mark |
|---|---|---|---|---|
| a | Read the chip, pick the order (author first?) | letters 3 to 3.7 mm, publisher 2.2 mm | 1.5 | F if sharp; **X** on a 14 px source spine |
| b | Tap the field; keyboard rises (first book only) | | 0.4 | F |
| c | Per word: type until it is offered. **Measured**: of 26 spine words (`פרנק הרברט חולית מעריב רוברט היינליין זמורה ביתן …`) against the subtitle list then `names.txt`, the word enters the top three after a median of **4 letters**; after two letters for **4 of 26**; 2 are on neither list. Taps saved: **17%** (150 to 124), where the review assumed about half | keys 28 to 32 px (5 mm), under the 7 mm target | 0.45 to 0.5 a key | T |
| d | After each key, eyes jump 30 mm from keyboard to the suggestion row, read three words that differ by a letter, back | 3 chips 100 × 46 px | 0.4 a look | **T**: 3 to 4 looks a word, most find nothing |
| e | The Done button sits between the suggestions and the keyboard, 10 px under them | 46 px | | T: a slip ends the book half typed |
| f | A foreign name: hold two or three letters, type, look back at the chip 45 mm up, find the place again | memory 3 letters; 2 trips a name | 0.8 a trip | T |
| g | Reread the field against the chip; Done | | 1.5 + 0.5 | F |

Sum: 30 letters + 4 spaces at 17% saved is about 28 taps × 0.5 = 14 s; looks 5 × 3 × 0.4 × ½ (half are peripheral)
= 3 s; trips 2 × 0.8 = 1.6 s; a, b, g = 3.9 s: **22 to 23 s**, range 14 (two short words) to 30. v2's 12 to 25 has
its middle where this has its floor.

Bad paths: **mixed script** (an English publisher, a Latin title on a Hebrew shelf): globe key, a new layout to
find one's place in, and back, +3 s, and `dir=auto` takes the field's side from the first strong letter, so a
title starting with a digit or a Latin word flips the caret to the other edge mid-line (T). **Numbers** (volume 2):
123 layer and back, +2 s. **Geresh** (`ג'ון`): on the 123 layer, +2 s, and `grade.py`'s `words()` turns it into a
space, so `ג'ון` scores as the word `ון`: say "leave it out" and have the grader drop it inside a word. **Niqqud**:
never needed; a long press nobody should be asked for. **One-handed**: 5 mm keys at the far edge, about 0.7 s a
key, 30 s a book. **Interrupted**: the half-typed field must be in the draft per keystroke. **Glare**: the chip is
a photo of a photo; raise the chip's contrast, not the screen's.

### 3.6 v2 summed, per 100 real books (pooled R8: 96 boxes, 69 right, 27 wrong; 31 missed)

| Item | n | s each | Sum |
|---|---|---|---|
| One whole book? | 96 | 4.5 (2.3 unchecked) | 432 (221) |
| Two or more: screen, taps, That is all, Same book? | 9 | 8.8 | 79 |
| Frame is off: choose, and 70% go on to drag | 9 | 18.9 | 170 |
| Unframed stretches, empty | 33 | 2.0 | 66 |
| Unframed stretches with books: 31 taps, 17 screens | | | 70 |
| Same book? on tapped pairs | 14 | 2.3 | 32 |
| Shelf checks | 15 | 6 | 90 |
| Outside, Submit (4 photos) | | | 32 |
| **Total** | | | **971 s = 9.7 s a book** (760 s = 7.6 unchecked) |

v2's 7 to 10 s holds; the low end is bought by not checking edges. For the 60-book photo by its own numbers (55
boxes, 35 right; 25 missed): about **590 s, 9.8 min**. Titles: **22 s a book** against v2's 12 to 25.

## v3 changes

Each replaces a taxing, grueling, futile or redundant step. Savings are per 100 books from the sums above; all
estimates.

| # | Change | Replaces | Saves |
|---|---|---|---|
| 1 | **Tap every book, in place.** The shelf is shown a segment at a time, zoomed until the narrowest frame is 44 px (7.5 mm), frames drawn on the photo in two strokes. A tap on a framed book confirms that frame (it gets a tick); a tap on an unframed spine adds a book there. One gesture, one tap a book, left to right; eyes and thumb are on the same spot, so no travel to a button, no chip to reassemble, neighbours in view | One whole book? (3.1 a to g), Tap each book as a separate task, the locator | 96 × 4.5 + 70 = 502 s becomes 100 × 0.9 + 31 × 0.3 + 26 screens × 1.1 = **128 s** |
| 2 | **What is left untapped is the question.** On Done with these, each frame not tapped is asked about where it stands: Not a book, Two or more (tap each inside it), Ends are off. Leaving several is "Remove these 3". Nothing is approved by omission: every kept frame was touched | Not a book beside One book; the toast; Same book? on tapped pairs (the taps answered it); the empty-stretch question (an untapped stretch is the answer) | 66 + 32 + 79 = 177 s becomes 9 × 1.5 + 9 × 4.3 = **52 s** |
| 3 | **Ends, not corners; no chooser.** The frame's two ends slide along the spine's own sides (through the board, half a book: 16 of R7's 41 misses on `1zktX1` were length or merge errors, 7 misalignment). The thumb drags anywhere in the lower half and the end moves at half speed, shown in a loupe: nothing under the finger, nothing in the top third to reach. Corners, by the same relative drag, only when a side is wrong. The A/B/C chooser goes | 3.2 c to f | 170 s becomes 6 × 5 + 3 × 12 = **66 s** |
| 4 | **Tapped books are checked the same way.** After the segment's taps the new frames are drawn; a wrong side is fixed by tapping the seam, a wrong end by change 3. A tapped book whose ends nobody set is saved as `how: taps` with a point, and the grader matches it by the point | The missing step in 3.3 f | Costs: 31 × 30% × 5 = **+46 s** |
| 5 | **The segment walk is the shelf check.** Every stretch of shelf has been on the screen at tapping size; the last segment's Done ends the shelf. For dark spines the segment is shown with its shadows lifted (a display curve, not the file) | Shelf check (3.4), its panning | 90 s becomes **0** |
| 6 | **Outside the shelves**: a long press adds a book where the finger is, sized by the nearest frame, then change 3 | Median upright box and four corners | small; per photo |
| 7 | **Flip leaves the boxes sitting** and is asked in titles, where the letters are being read anyway | 3.1 Flip | one button fewer on the busiest screen |
| 8 | **Titles: suggestions on the keyboard's top edge**, ranked: words typed on this photo and on earlier photos first (authors and publishers repeat down a shelf), the reader's own words for this spine next (ranked, never filled in), then the lists. The previous book's words are offered before any letter. Done leaves the keyboard's neighbourhood | 3.5 c, d, e | about 6 s a book on a shelf of series; 3 s otherwise |
| 9 | **A legibility gate**: a frame narrower than a set number of source pixels is not asked for a title; it is saved `text: null, why: "small"` and counted | 3.5 a on blurred spines; story 7 | removes 5 to 8 s of squinting a book where it applies; share unknown until the photos' sizes are read |
| 10 | **At the shelf: "Does this shelf still match?" first**, a row at a time. Yes: type only the gated books, off the book, `legible: false`, kept out of the readers' score. No: take a new photo | Stories 5, 6 | prevents wrong truth; no time claim |
| 11 | **Grader**: report by `how`; point-match `taps`; skip `legible: false`; ו/י and an inner geresh as equal | Stories 1, 2, 8, 11 | none; makes the rest safe to use |

**New totals** (estimates, same pooled counts):

| | v2 as designed | v2 summed here | v3 |
|---|---|---|---|
| Boxes, a book | 7 to 10 s | 9.7 s (7.6 unchecked) | **3.5 to 5 s** (128 + 52 + 66 + 46 + 32 = 324 s a 100; the range allows for slips and thin spines) |
| Boxes, median photo (16) | 2 to 3 min | 2.6 min | **about 1 to 1.3 min** |
| Boxes, largest photo (60; 35 right, 20 wrong, 25 missed) | 7 to 10 min | 9.8 min | **about 4 to 5 min** |
| Titles, a book | 12 to 25 s | 22 s (14 to 30) | **15 to 19 s** |
| Titles, median photo | 3 to 7 min | 5.9 min | 4 to 5 min |
| Titles, largest photo | 12 to 25 min | 22 min | 15 to 19 min, less whatever the gate removes |

The box numbers are the ones to trust least in the direction of optimism: they assume a tap in place is looked at
as carefully as a chip. The check is cheap: tag `16w5nW` (8 books, held out, desktop-drawn) by taps on a paper or
click-through prototype and compare boxes and time before anything is built.

## For the owner (each its own approval; none assumed)

1. One gesture for a segment of four to six books breaks the skill's "one item at a time". Each book still gets
   its own tap. Accepted for touch?
2. **Camera at the shelf** (a new photo of a row, or of a pulled book): a permission request and a new input.
   Wanted?
3. **Words from earlier photos' truth carried in the pack**: no new call if the pack is made on the desktop from
   files already fetched; a new stored thing on the phone.
4. **A book catalogue for whole-title completion** (the National Library of Israel, Open Library): a new network
   call that sends what is typed, and so the owner's titles, to a third party, and it would complete to the
   catalogue's wording rather than the spine's. Not in v3; listed because it was asked about.
5. Build as touch on the existing page (lifting `req/shell/browsers/supported` for it) or as a separate phone page?
6. v2's questions 2, 5 and 6 stand (boxes-only files, a cut-off book, `16w5nW` both ways).
