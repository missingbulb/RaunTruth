# Bookshelf Reader: ground truth on a phone, v2

Answers `review.md`. Still nothing built or measured; times are the review's recomputed estimates
and mine. Mock-up: `mockup-v2.html`; renders `shot-v2-light.png`, `shot-v2-dark.png`.

## What changed, and why

| Change | Why |
|---|---|
| **Boxes are the phone tier.** Sitting A (verdict, turn, frames, misses, shelf check) is submitted by itself, every book `text: null` | v1's text arithmetic was wrong: at the readers' recorded recall only 10 to 20% of lines are right as read, so the line menu costs 38 to 69 s a book, not 20. Boxes hold at 7 to 10 s |
| **Titles are a separate, optional sitting**: one text field a book, empty to start, completion from the two word lists and words already typed on the photo; on the phone, on the desktop, or at the shelf | 12 to 25 s a book against 38 to 69. Needs no reader on the phone, so a moved or added box needs no recompute. Typed text is not the reader's own output, so no anchoring |
| **Tap each book** replaces count-then-seams | The count was the weakest question, "4+" was not a count, and the finder keeps no seams below its threshold to rank. A tap is count and place at once and survives an interruption |
| **Frame is off: choose among 2 to 3 frames, then loupe corner drag**; whole-edge drag dropped | An edge move cannot fix a tilted top or foot, and snapping to the strongest edge repeats the finder's mistake |
| **The chip shows a margin of photo and is wrapped into two rows** | A frame that stops short looks like a clean book from inside; letters were 2 to 3 mm |
| **`how` per book** (`confirmed`, `chosen`, `taps`, `drawn`) and **`text: null`** (unread) apart from `""` (no text on the spine) | A confirmed box scores 1.0 against itself, so finder precision and recall move, not only mean IoU: report them by `how`. Unknown is not empty. `grade.py` already skips both for the readers |
| Every answer 44 px or more (Back, Next, Flip, No text on it); swipes act on the chip only; Not a book has an Undo | 3 mm links carried a ground-truth answer; a swipe elsewhere is a pan or the browser's Back; desktop's Not a book is final |
| Decided books are **faded and hatched, never blacked out**; a tap in the shelf check goes to the nearest unframed stretch | The finder's typical miss is a dark spine on dark wood, the same colour as a black cut-out |
| Gold chips, agreement and speed floor **dropped** | The shell already has per-tagger submissions and a Study Manager's accept or reject; the study has no crowd |
| Three v1 claims **withdrawn** | Drafts are browser-local, so no Continue across devices: the hand-over between sittings is the submitted file. A phone is unsupported by `req/shell/browsers/supported`. "Offline" held only for untouched boxes; with text out of sitting A it holds for all of A, given the pack carries the photo |

## Where I disagree with the review

- **"Is this what it says?" yes/no on very confident readings**: not adopted. The readers' confidence
  is not calibrated here (`ppocr` reads Hebrew as Latin at 0.90), so "very confident" selects
  nothing reliable, and it brings the anchoring back.
- **Verdicts by exception** (tap the wrong boxes, "the rest are right"): not adopted as default.
  Approval by omission is the weakest evidence a box was looked at, and it worsens the
  self-confirmation bias the review itself raises on corners. Listed as an owner question.
- **A cut-out colour the photo does not carry**: fading was asked for instead and I agree with
  it; any flat fill hides what a frame missed inside its own area.
- **Equal widths where no edge is found**: adopted, but such frames are `how: taps` and should
  be left out of mean IoU; they are a count with a rough place, not a drawn box.

## Tasks

Sitting A, boxes (shelf by shelf, the desktop's walk order):

| # | Task | Shown | Answers | New work | Est. s |
|---|---|---|---|---|---|
| 1 | One whole book? | padded chip, two rows, frame outlined; locator strip | One book / Not a book (Undo) / Two or more / Frame is off / Flip; swipe on the chip | straighten with a margin | 3 |
| 2 | Frame is off | the book with 2 to 3 other frames | A / B / C; None fits: corners with a loupe | finder's rejected candidates kept | 5, or 15 dragged |
| 3 | Two or more | the frame, upright | tap each book | as 4 | 1.5 a book |
| 4 | Tap each book (each unframed stretch, 4 books a screen at most) | the stretch bright, neighbours faded | a tap a book; That is all; Nothing here is a book; Undo last tap | `find` returns shelf rows; cut between taps on an edge, else midway | 1.5 a book, 1.5 an empty stretch |
| 5 | Same book? (every abutting or stacked pair of new frames) | the two frames | Yes / No | pair check | 2 |
| 6 | Shelf check | the shelf, framed books faded | Nothing left / tap what is bright | tap to nearest unframed stretch | 4 |
| 7 | Outside the shelves | the photo, pinch-zoom | No books here / tap one | as desktop's Add a book here | 5 |
| 8 | Submit boxes | counts | Submit | file with `how`, `text: null` | 3 |

Sitting B, titles (optional; opens a submitted boxes file):

| # | Task | Shown | Answers | New work | Est. s |
|---|---|---|---|---|---|
| 9 | What does the spine say? | chip in two rows, pinned above the keyboard | one field, `dir=auto`, autocorrect off, completion after two letters; No text on it (`""`); Can't read (`null`); at the shelf: typed off the book, `legible: false` | prefix index over `heb.txt` + `names.txt` | 12 to 25 |

## Throughput

| Photo | Boxes (7 to 10 s a book) | Titles on the phone (12 to 25 s a book) |
|---|---|---|
| median, 16 books | 2 to 3 min | 3 to 7 min |
| largest, 60 books | 7 to 10 min | 12 to 25 min |

Tap-per-book should put boxes at the low end; the review's desktop text figure (about 13 s a
book) is also an estimate, so "phone text costs about twice the desktop's" is unverified.

## For the owner (added to v1's list)

1. Lift `req/shell/browsers/supported` for a phone page, or build it outside the shell?
2. May a boxes-only file (`text: null` throughout) be submitted as ground truth for the finder?
3. Tagging starts by itself and the progress bar is split per shelf, both against the
   `designing-ground-truth-tasks` skill: accepted for the phone?
4. Verdicts by exception on high-precision shelves: wanted?
5. A book the frame cuts off: tagged or left out? (Left untagged on `1HyJrL`.)
6. Tag `16w5nW` both ways before mixing phone and desktop boxes.
