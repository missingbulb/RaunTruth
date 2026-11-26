# Efficiency review: Bookshelf Reader ground truth on a phone

Reviewed: `design.md`, `mockup.html` (this folder) against `studies/shelves/` (requirements, `web/shelves.js`,
`web/reading.js`, `py/books.py`, `lab/grade.py`, `reading/read.mjs`, `docs/WARMUP.md`, `docs/HEBREW.md`), the shell's
requirements and the `designing-ground-truth-tasks` skill. Nothing was run on the photos: they and the four
ground-truth files live on Drive and are not in the checkout, so every count below is from `WARMUP.md`'s recorded
tables. Times are my estimates, not trials. Scale used for sizes: 360 CSS px over about 62 mm, 0.17 mm/px, so
7 mm = 41 px and 9 mm = 53 px.

`grade.py` below is the grader of the time, `lab/grade.py` (IoU > 0.5 boxes; CER and word recall for the readers). Since 2026-11-18 the study is scored by its own `algorithm/score.py` (boxes and titles together), run by the shared `lab/run.py`; the paths here are as they were then: `py/` is now `algorithm/`, and `reading/read.mjs` was retired.

## Verdict

The box half is right for a phone and its 8 s a book holds up (7 to 10 s recomputed). The text half does not: by the
design's own unit times it costs 40 to 70 s a book, not 20, and a plain text field with word completion beats the
line menu at today's reader quality. Three claims are wrong against the code: drafts do not cross devices, the phone
is an unsupported browser by a standing requirement, and "works offline" fails for every corrected or added box.
Ship boxes, verdicts and turns on the phone; leave text to the desktop or to the at-the-shelf mode until the readers
improve.

## Claims checked against the code

| Design claim | Finding |
|---|---|
| Answers "are the shell's draft, so Continue tagging works across devices" (c3) | **False.** `req/shell/ground-truth/draft`: "the shell keeps it in the browser" (`GT_DRAFT` in `web/shell.js`, local storage). Cross-device needs a new synced store: a new network call |
| A phone opens the study | **Contradicts `req/shell/browsers/supported`**: "A phone or tablet, iPhone and iPad included, is not supported". A requirement change, the owner's call, missing from (f) |
| "Heavy work is not done on the phone", "works offline" | **Holds only for untouched boxes.** Box is off, Two or more and every gap answer make new corners, which need straighten (Python), the line finder (ONNX) and Tesseract before step 7 can show readings. 31% of books are missed and 28% of boxes are wrong, so over half the books need a recompute after an answer. Either the phone runs the readers or text is a second sitting after a desktop round trip |
| `turn` is "the turn readers are scored at"; `proposed` is used for "scoring finder and reader from one file" | Not in the code today: `grade.py` reads only `verdict`, `corners`, `text`; `read.mjs` calls `r.read(crop, how)` with no turn. Harmless, but neither field is exercised by the grader |
| Word recall "0.08 to 0.48" | 0.08 is pre-R7. Current: `tesseract` 0.48 / 0.23, `lines` 0.35 / 0.15 (`1HyJrL` / `1g4iFN`). Scored on 32 of the 100 tagged books; `1zktX1`, the 60-book example, has **no reader score** |
| "The finder misses 30 to 40%" | Pooled R8: 69 of 100 matched, 96 boxes. Misses 31% (5% to 42% by photo); 27 boxes of 96 (28%) are not a match |
| Line boxes and several readings per line "exist" | Computed, then discarded: `lines()` is private and `byLines` returns one joined string. `tesseract` reads the whole crop with no line split, and `ppocr` returns confident Latin for Hebrew (`QIGILIO` at 0.90). So the buttons are really one reader (`lines`) in its turn and spelling variants |
| The speller's ranked candidates "exist" | True: `word()` builds `near` and keeps the top one. But the top one is already applied, so what is still wrong is mostly names off the list (HEBREW.md: names are "the larger share of what the readers get wrong"); the alternatives will rarely hold the answer |
| "The finder re-run on the gap, told N, keeping the N-1 strongest seams it had rejected" | `side_lines.scan` keeps only lines over `BOUNDARY`; nothing below is ranked or kept. And R8's own finding is "generation is the wall, not selection": of 41 misses 17 were never proposed, and dark plain spines "gave no edge line at all". Expect an equal-width split to do most of the work |
| Per-shelf gaps cover every stretch | `find()` returns neither shelves nor rows, and drops a shelf of fewer than 3 spines; a shelf the finder lost has no gaps to ask about and falls to step 10, the whole-photo step |
| Per-shelf walk follows the skill | Yes for area-by-area, check last, cut-outs, Submit last. Deviations to put to the owner: tagging starts by itself (skill: by hand), the progress bar is split per shelf (skill: per task), there is no image as main area |
| QC by gold and agreement | The shell already keeps one extraction per person and image and lets the study owner mark one GT or official (`req/shell/extractions/list`). The design builds a second regime beside it |

## 1. Doability with phone inputs

| Element (mock-up) | Size | Verdict |
|---|---|---|
| Main buttons (60 px), count buttons (58 × 60), readings (58), alternatives (54), word tokens (about 49) | 8 to 10 mm | Fine |
| Small buttons (46 px) | 7.8 mm | Borderline, acceptable |
| **Back, Next, "No text here", "Type the whole line"** (13 px text links) | about 3 mm tall | **Too small.** "No text here" is a ground-truth answer in a 3 mm link |
| **Flip** pill (about 58 × 26 px) | 4.4 mm tall | Too small, and it overlaps the chip's corner and crowds the question above it |
| "+" token (about 38 px wide), entry switch (28 px tall) | 5 to 6.5 mm | Small |
| Shelf check: "tap what is left" on a 9 px strip | **1.5 mm** | Not tappable. Snap the tap to the nearest undecided region |
| Spines in the context strip (15 to 30 px) | 2.5 to 5 mm | A locator only; people will try to tap them |
| Seams (2 px lines, 79 px apart in the mock-up) | fine if nearest-seam | Under 41 px apart once a gap holds 5 or more thin spines: show at most 4 books a screen |

- **Swipes.** Swipe right or left is a verdict in step 1 and a pan in step 9, and an edge swipe is the browser's
  Back on iOS. Not a book is irreversible on the desktop (2026-11-10: "Back no longer brings it back"); a slip of
  the thumb must not delete a box. Drop the swipe or add an undo.
- **Dragging.** Step 3 is the one precise drag. A whole-edge move cannot fix a tilted top or foot (the boxes follow
  "the book's own, at the angle they run"), so leaners fall to the loupe corner drag. Snap goes to "the nearest
  strong edge", which is how the finder went wrong in the first place (lettering, boards). Offer two or three
  alternative boxes to pick from before any drag.
- **Unexpected multi-touch.** Step 10 shows a whole photo at 328 px wide and asks for a tap on a lying cover: it
  needs pinch-zoom, and tap against pan must be told apart. No hover is used anywhere.
- **Detail at chip size.** A spine 8 to 15 times longer than wide, laid across 328 px, is 22 to 40 px tall (4 to
  7 mm); its title letters are about 2 to 3 mm, author and publisher about 1.5 mm. Enough for "one book?", not for
  checking a turn on small print. The mock-up leaves about 200 px of empty stage under the chip: wrap the spine into
  two rows at twice the size. Enlarging a line adds no detail the photo lacks; all four tagged photos are
  `PHOTO-….jpg` names (probably messenger-compressed, unverified), where spines 8 to 15 px wide at the finder's
  900 px are small in the original too.
- **What the chip cannot show.** A box that is short or narrow looks like one clean book from inside. The context
  strip is too small to show a 15% under-reach. See 4.
- **Choosing a reading.** The three buttons differ by one look-alike letter (ב/כ, ה/ת) at 20 px. That is
  spot-the-difference in a sans font, about 5 s, not 3. Mark the letters that differ.
- **Hebrew typing.** About 11 keys a row on 62 mm is under 6 mm a key, below the 7 mm target, one thumb. The keyboard
  takes about 45% of the screen, so the line must stay pinned above it. Set `autocorrect`, `autocapitalize` and
  `spellcheck` off or the phone rewrites foreign names (`היינליין`). A script switch costs about 1.5 s each way.
  Niqqud and geresh never need typing: `grade.py` keeps only `0-9a-zא-ת`. Tell the helper so, since a pointed
  word would split into fragments in `words()`.
- **Loud, distracted, no audio.** Nothing needs sound. A gap count interrupted mid-count restarts; a tap per book
  does not.

## 2. Time on task

Real sizes: 13, 19, 60 and 8 books a photo: **mean 25, median 16**. The design's example is the largest, 2.4 times
the mean. Per 100 real books (pooled R8): 96 boxes to judge, 27 of them wrong, 31 books to recover from gaps.

**Boxes**, per 100 books, about 15 shelf cells:

| Item | n | Design s | Sum | Realistic s | Sum |
|---|---|---|---|---|---|
| One book? | 96 | 2 | 192 | 3 | 288 |
| Two or more, with its new boxes | 9 | 8 | 72 | 10 | 90 |
| Box is off | 9 | 8 | 72 | 15 | 135 |
| Gap counts (about 50, two thirds answered 0) | 50 | 3 | 150 | 1.5 / 5 | 138 |
| Seams right? | 18 | 4 | 72 | 6 | 108 |
| One book? on the 31 recovered | 31 | 2 | 62 | 3 | 93 |
| Shelf checks, outside, submit | | | 92 | | 142 |
| **Total** | | | **712 (7 s a book)** | | **994 (10 s a book)** |

The design's 8 s a book stands. A 60-book photo is 7 to 10 minutes of boxes; a median photo 2 to 3.

**Text.** 170 Hebrew words on 32 books is 5.3 words a book, about 30 letters; at 3 lines, under 2 words a line.
Book-weighted word recall: `tesseract` 0.38, `lines` 0.27. A 2-word line wholly right is then about 0.07 to 0.14 if
words fail independently, more if failures cluster by book: call it **0.1 to 0.2**. The design's 0.2 is the top of
that. But its arithmetic does not follow from its own table:

| Model | s a line | s a book (3 lines) |
|---|---|---|
| Design's headline | 6.7 | **20** |
| Design's own units at q = 0.2: 3 + 0.8 × (12 to 25) | 12.6 to 23 | **38 to 69** |
| q needed for 20 s a book: 3 + (1 - q) × 12 = 6.7 | | q = **0.69** |
| One text field per book, typed, about 34 characters at 1.7 to 2 a second, plus reading | | **23 to 26** |
| The same with completion after two letters and words confirmed earlier on the photo (about 16 taps) | | **12 to 15** |
| Desktop today (box selected to retype, keyboard) | | about 13 |

So the whole design is **50 to 80 s a book, 50 to 80 minutes for the 60-book photo, 85% of it text**, not 28 s and
25 to 30 minutes. The line menu wins only once about 60% of lines are right as read; today it is 10 to 20%. The
desktop requirement already says as much: a book opens "with its title's text box focused and all its text
selected, to retype".

Taps per decision: verdict 1; turn 1; count 1 (plus 1 to 2 for seams); box off 2 to 5 with a drag; a line 1 when
offered right, else 3 to 8; a typed title about 34, or about 16 with completion.

**Is text worth doing on the phone?** Not as the main path. Phone text is about twice the desktop's cost at best,
and the photo limits legibility either way. Two cases earn it: no desktop at hand, and the owner at the shelf, the
one mode that can fill a title the photo cannot show.

**Where a different decomposition halves the time:**

| Change | From | To |
|---|---|---|
| Text: one field per book with completion, in place of steps 7 and 8 | 40 to 70 s a book | 12 to 25 |
| Misses: tap each book once in the gap, in place of count then seams (a tap is the count and the place; seams go between taps) | 5 + 6 s a gap, plus fixes | about 1 s a book |
| Verdicts by exception on good shelves: the shelf strip zoomed so spines are 8 mm, tap the wrong boxes, then "the rest are right" | 3 s a box | about 1 s a box. Breaks the skill's one item at a time; the owner's call, and only where precision is high (0.86 on two photos) |

## 3. Answerability

| Question | Fast from what is shown? |
|---|---|
| One book? | Yes for "is this a book". **No for "is the box right"**: under-reach is invisible on the chip |
| Which way up? | Yes on a title line; not on a spine with small print only |
| Box is off | Slow by nature; answerable |
| Two or more: tap where they part | Yes when a seam is visible. For one-colour series the seam is invisible by definition; the proposed split is all the person has |
| **How many books here? 0/1/2/3/4+** | **Weakest question.** These are the stretches where the finder saw no edge: dark plain spines on dark wood, one-colour series, steep leaners, piles. Counting them at phone scale is a judgement, not a glance. "4+" is not a count and its follow-up is undefined. At a shelf end, a book the frame cuts has no rule (the desktop tagger left one untagged on `1HyJrL`). Piles lying flat need horizontal seams |
| Seams right? | Yes when visible |
| Title, a line at a time | Only if the line is legible in the photo. Order of lines is not asked and matters (see 4) |
| Fix a word | Answerable; the alternatives rarely hold a name |
| Shelf check | **Not in its current colours.** Decided books are cut to black, and the finder's known misses are dark spines on dark wood: the undecided thing is the same colour as the done thing. Cut out in a colour the photo does not carry |
| Outside the shelves | Needs zoom; the one truly coarse step, as intended |

## 4. Ground-truth equivalence

| Field | Design's tier | Gaps |
|---|---|---|
| verdict, turn, source | same | Agree, given an undo for Not a book. A halved book (Henderson, cut at its lettering) reads as two books with text each: "Same book?" must fire on every stacked or abutting pair, not only where colours match |
| `corners` | weaker; fine for IoU > 0.5 | Agree it is weaker, and it is worse than stated. Mean IoU on desktop truth is 0.79 to 0.82; a box confirmed as is scores 1.0 against itself. A short or narrow box that a drawn truth would match at IoU under 0.5 gets confirmed, so **precision and recall move too**, not only mean IoU. `how` is needed; report finder scores on `drawn` and `edges` boxes apart |
| `text` | "same as desktop" | **Not the same, four ways.** (1) Coverage: only lines the line finder boxed are asked, so text it missed never enters the truth, and the readers are graded on what a reader could already see. (2) Order: `lines()` sorts boxes by top then left; Hebrew parts on one row come out last-first, and CER is order-sensitive (word recall is not). (3) Selection: Can't read saves "", which `grade.py` drops from the readers' score, so the score is taken over the legible books only. Keep unknown apart from none: `text: null` against `""`. (4) Anchoring: a picked line is the reader's own output, the thing being scored; the desktop prefill is retyped by default |
| completeness | "arguably stronger" | Only on shelves the finder found, with the count as a soft question; lost shelves fall to the coarse step. Call it equal until `16w5nW` is tagged both ways |

Privacy: a helper who sees only chips still sees every title, and the titles are the private thing; what a chip
hides is the room. The helper most likely to exist is the owner at the shelf.

## 5. Algorithmic dependencies

| Need | Exists | New work | Risk |
|---|---|---|---|
| Chips, turns | `books.straighten`, `turns`, JS `picture` warp in `shelves.js` | Chips for new corners on the phone can reuse the JS warp if the pack carries the photo | Low |
| Task pack and its store | No | Pack writer, Drive write, QR link | Medium; three approvals (`network-calls-approved`) |
| Draft across devices | No (browser only) | A synced draft | Medium; a new call |
| Phone as a supported browser | No (`req/shell/browsers/supported`) | A page outside the shell, or the requirement changed | Owner's call |
| Line crops and all readings kept | Computed, dropped | Export `lines()` boxes and every try; a line split for whole-crop Tesseract; drop `ppocr` on Hebrew | Low to medium |
| Readings for new or moved boxes | Desktop `reread` | Readers on the phone (about 4 MB of language data, seconds a crop) or a second sitting | **High**: decides offline and one-sitting claims |
| Gap strips, shelf rows | `shelves()`, `book_rows` are internal | Return rows from `find`; gaps from them | Low |
| Finder told N | No | Unthresholded seam ranking in `side_lines`, an equal-width prior | **High** on the misses that matter (no edge to find) |
| Tap-to-seam snap, edge snap | `seams(…, False)`, `Edges` | Snap radius, lean | Medium: snaps to lettering |
| Word alternatives, completion | `word()` candidates; the lists (790 KB + 490 KB) | Expose ranked list; prefix index | Low |
| "Same book?" trigger | `apart` joins halves at find time | A pair check on confirmed boxes | Low |
| Gold, agreement, speed floor | Shell submissions and curation | All of it | Medium, and sized for a crowd this study does not have |

## 6. Top five changes, ranked

1. **Split the phone work in two and ship boxes first.** Sitting A: verdict, turn, gaps, shelf check, at 7 to 10 s a
   book with no reader needed. Text is a separate sitting: desktop by default, phone at the shelf. This removes the
   recompute problem, the anchoring problem and 85% of the time from the first build.
2. **Replace the line menu with one text field per book plus completion** (the two word lists, and words already
   confirmed on this photo), autocorrect off, the chip wrapped to two rows above the keyboard. Keep "Is this what it
   says?" as a single yes or no only where the reading is very confident. 40 to 70 s a book becomes 12 to 25.
3. **Replace the gap count and seam check with a tap on each book**, seams placed between taps, equal widths where
   no edge is found. State the rule for a book the frame cuts.
4. **Make the truth honest about how it was made**: `how` per box, `text: null` for unread against `""` for no
   text, a last "any text left on this spine?" yes or no, and reading order fixed for Hebrew lines. Tag `16w5nW`
   both ways before mixing tiers, as the design proposes.
5. **Fix the inputs that fail the finger**: every answer at 8 mm or more (No text here, Back, Flip), an undo in place
   of swipe verdicts, snapped taps in the shelf check, a cut-out colour the shelves do not carry, pinch-zoom on the
   outside step. And correct the three false claims (draft sync, supported browsers, offline) before the owner
   reads the design.

Also drop the gold and agreement regime in favour of the shell's existing submission and curation, plus the owner's
shelf check.

## Mock-up render (headless Chrome, 2060 × 1900, light and dark)

Files: `render/light.png`, `render/dark.png` beside this review. The dark render forces the dark tokens by
rewriting the media query to `@media all` in a copy, since the headless run had no scheme switch at hand; the
tokens and layout are the page's own.

Dark mode renders cleanly: no unreadable text, buttons and progress keep their contrast. Problems, both schemes
unless said:

- Flip sits at the chip's top left (the chip is `dir=rtl`, so `inset-inline-end` is the left), overlapping the
  chip's edge and crowding "One book?"; the design says top right.
- About 200 px of empty stage between the chip and the buttons in frames 2, 3, 6, 7 and 8, while the chip is 52 to
  74 px tall.
- Dark: black cut-outs on the dark shelf on a dark screen read as one mass in the shelf check; the pale strip shows
  only because it is pale.
- The dimmed neighbours in the gap frame (opacity 0.35) nearly vanish into the wood, worse in dark; they are meant
  to anchor the count.
- Frame 7: the gap's solid frame and the dashed seams are the same yellow, so a seam near the frame's side would
  be lost against it.
- Dark: the wrong-word token's border (pale red on dark) is a weak cue; light: the "Hallway" card at 0.6 opacity is
  low contrast.
- Four reading buttons, as the design allows, would not fit: three already fill the thumb area down to the links.
