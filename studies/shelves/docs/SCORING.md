# How the Bookshelf Reader is scored

Status: **the score of record since 2026-11-18**, approved by the owner with three choices (§9), replacing the
box-only grader (`lab/grade.py`, retired). Every version was measured again under it (§8); no number of the old
score is carried. The scorer is `algorithm/score.py` (`score(answer, truth)`, `SCORING`, the outline the page shows
beside the precision and recall), run by the shared lab (`python3 lab/run.py shelves --write`); its tests are
`tests/test_score.py`, on drawn shelves alone. The validation's own scripts and renders were throwaway and are not
kept; their numbers are below.

## 1. The owner's directions

Verbatim, and outranking everything below:

> Regarding shelves - I think there's something to be said for scoring the matches 'back to start': use a fuzzy
> matching of titles between the extracted titles and GT; for each of the 'matching' ones also check the overlaying
> areas of the boxes (precision and recall as areas ratios between the union area vs the unmatched GT or overshot
> extraction). Once there are no more matching books - the remaining unmatched GT ones can be matched to the highest
> overlapping extracted box. Obviously an exactly name-matched book with exactly the same bounding box's score is
> perfect, and an unnamed book with a matching 100% box should count for less. Also take into account GT books with
> no names (those can match to anything with no name by overlapped area and still get a perfect score). This is an
> initial try of a scoring algorithm... create, validate, and reason on a new scoring algorithm for the extraction
> algorithm. Make sure this is a sound direction by hypothesizing on many 'error types' and 'matching types', which
> need to award any forward progress, and not discount an advancement with a bad 'still not right, score zero' which
> does not help us move forward. Use the literature and append that with more online research on how other
> algorithms are scored (whether for ML training or otherwise for regular algorithms).

> when you score, you should not differentiate between 'what a person added' vs. automatically extracted - the GT is
> GT. You should assume it's right. You should not read into the origins of an element in GT. 'A person marked X' is
> not a worthwhile point of scoring. You can say 'An element marked as undecided' to be scored somehow, but it's not
> the origin of the marking that matters.

Also decided by the owner: the algorithm is end to end, boxing and title reading in one go, and the score covers
both results.

How each direction is met:

| Direction | In the scorer |
|---|---|
| fuzzy title matching first | stage 1 pairs books whose titles share 0.3 or more of their letter pairs |
| for those, check the boxes' areas, as ratios against the union / the unmatched GT / the overshoot | every pair's box gives three shares: `overlap / union` (tp), share of the found box off the book (fp), share of the book not covered (fn) |
| then the rest by highest overlap | stage 2, largest `overlap / union` first, any overlap |
| exact name and exact box is perfect | tp 1, fp 0, fn 0 (tested) |
| an unnamed book with a 100% box counts for less | tp 0.5, fn 0.5 (tested) |
| a GT book with no name is perfect under an unnamed box | the box alone is scored (tested) |
| no "still not right, score zero" | no threshold cuts credit anywhere; 0.3 only orders the pairing |
| GT is GT, origin never read | `score` reads a book's `verdict`, `corners` and `text` only; a test adds `source` and `proposed` and asserts nothing moves |
| an undecided element may be scored somehow | a book with no verdict is not truth, and a box lying mostly on it is not counted either way |

## 2. The shapes

- **Answer**: `{"books": [{"corners": 4 × [x, y] image px, "view", "title": str or null}]}`.
- **Ground truth**, read from the six submitted files (`data/raw/gt/*.json`): `{image, W, H, reader, books, created,
  tagger}`, each book `{source, verdict, corners, turn, text, proposed?}`. 133 books are marked right, 1 wrong, none
  undecided; 12 of the right ones (all in one photo) have an empty `text`. Corners can lie outside the image.
- **The unit counted**: a book, which is a box and its title.

## 3. Error types, and what each should do to the score

"Up" and "down" are against the same answer without the error. Every row is graded: none is all-or-nothing.
The last column is the test in `test_score.py` that holds it (✓), or what the scorer does where it falls short.

| Error | Severities | Should move | Held by |
|---|---|---|---|
| a book missed | 1 … all | fn +1 each; recall down | ✓ `each_book_missed…` |
| a box invented (a post, the wall) | 1 … many | fp +1 each; precision down | ✓ same |
| a box placed off | 5% … 45% of its width or height | tp down, fp and fn up, smoothly; still above 0 near half off | ✓ `a_shift_costs_more…`, `no_cliff_at_half_overlap` |
| a box too big (runs onto the board, the neighbour) | ×1.2 … ×3 | fp up only | ✓ `a_box_too_large…` |
| a box too small (half the spine's height) | ×0.9 … ×0.2 | fn up only | ✓ same |
| the whole answer shifted or scaled | as above, all books | as above, summed | ✓ shift test runs on all books of all six real files |
| one book split into two boxes | halves | better recall than a miss; worse than the whole; merging them is a gain | ✓ `a_book_split_in_two…`; the spare half costs only the share of it that covers none of the book its pair left uncovered (§9) |
| two books merged into one box | 2 | better than missing both; worse than both | ✓ `two_books_merged…` |
| a book given twice | 2 | the spare is fp +1: it adds no new cover | ✓ `a_book_given_twice…` |
| box right, title not read | – | the title half is fn: tp 0.5 | ✓ owner's example |
| box right, title misread | 1 … 12 letters | tp down a little per letter; one letter costs under 10% of the book | ✓ `each_letter_misread…` |
| box right, title cut short | 6 … 19 letters gone | fn up only | ✓ `junk…_and_a_title_cut_short…` |
| box right, junk read with the title | 3 … 9 letters | fp up only | ✓ same |
| title words in another order, punctuation, case | – | (nearly) nothing: over 0.85 for a full swap | ✓ `the_order_of_a_titles_words…` |
| title right, box off or on the neighbour | – | the title half is kept, the box half graded | ✓ `titles_pair_first…`, `a_title_on_the_wrong_book…` |
| titles of two books swapped | – | above 0, below right | ✓ `titles_pair_first…` |
| a title read on a book whose truth has none | – | nothing: the box alone is scored (§9) | ✓ `a_true_book_with_no_title…` |
| an empty answer | – | tp 0 | ✓ |
| the truth itself | – | precision = recall = 1 | ✓ on the drawn shelf and all six real files |
| order of books in either file | – | nothing | ✓ |
| truth incomplete (a real book nobody boxed) | – | a box on it is fp: the truth is taken as right | by design; `1zktX1` has such books at its right edge |
| truth undecided (verdict null) | – | a box mostly on it is not counted | ✓ `a_box_on_an_undecided_book…` |
| truth marked wrong | – | a box there is an ordinary fp | ✓ same |
| every fix of a many-error answer, in any order | 9 errors, 3 orders | F up at each step, 1 at the end | ✓ `every_single_fix…` |

## 4. Matching types, strongest evidence first

| Pairing | Evidence | Worth (tp) |
|---|---|---|
| titles match and boxes coincide | both | up to 1: `0.5 × box + 0.5 × title` |
| titles match, boxes overlap partly | title, some area | the title share plus the graded box share |
| titles match, no overlap (the title read on another box) | title only | up to 0.5; did not occur in the real runs (0 of 226 title pairs) |
| no title match, boxes overlap, truth has a title | area | up to 0.5 from the box, plus whatever letter pairs the titles do share (no cut at 0.3) |
| truth has no title, answer has none, boxes overlap | area, and that is all there is | up to 1 |
| truth has no title, answer has one | area | up to 1: the box alone, whatever was read |
| boxes barely touch | almost none | almost 0, and almost the full fp and fn: the same as unpaired, so pairing by "any overlap" has no step in it |
| nothing | – | unpaired: fn 1 or fp 1 |

## 5. Sources

All read 2026-11-18. The study's own literature first, then online.

**The study's literature** (`docs/literature/`):
- `SURVEY.md`: the field reports P/R/F at IoU 0.5 (Tonioni 2017), AP at IoU 0.75 (Ma 2024), Talker's min-of-two area
  ratios ≥ 0.8; it notes "a 0.5 hit on a 15-pixel spine can be off by a whole neighbour". *Taken*: Talker's two
  area ratios are exactly the owner's area precision and recall; I report them as fp and fn shares instead of
  thresholding them. *Turned down*: any fixed IoU cut.
- `anegawa-2020`: its metrics average only over matched books, so "a box on no book costs nothing". *Taken as a
  warning*: every unpaired box costs here.
- `llabres-2024`, `yang-2016`: titles are matched to a list by Levenshtein or CLIP and scored top-1. *Turned down*:
  top-1 is all-or-nothing per book.
- `chen-2022-unitail`: reading is scored by word accuracy and normalised edit distance.
- `goldman-2019`, `ray-2018`: a count error per photo beside P/R. *Not taken into the score* (`truth` and `found`
  are returned as diagnostics).

**Online**:
- ICDAR 2019 LSVT, end-to-end task — https://ar5iv.labs.arxiv.org/html/1909.07741 : detections pair with truth at
  IoU > 0.5; score = 1 − N.E.D., the edit distance over the longer string, averaged over pairs, an unpaired item
  paired with the empty string; "do not care" regions excluded. *Taken*: text graded, not exact-match; unpaired
  items cost on both sides; don't-care regions. *Turned down*: the IoU 0.5 gate before any text credit, and edit
  distance itself (see §7).
- ICDAR 2019 ArT — https://ar5iv.labs.arxiv.org/html/1909.07145 (search summary only, not fetched in full): ranks
  by 1 − N.E.D. with spaces and symbols removed. *Taken*: letters and digits only.
- CLEval (Baek et al., CVPRW 2020) — https://ar5iv.labs.arxiv.org/html/2006.06244 : character-level credit;
  recall = correct characters / true characters, precision = correct / read characters, each summed over
  instances; a split or merge is paired many-to-one and costs a granularity penalty of 1 per extra piece. *Taken*:
  a title's error split into a recall side and a precision side, and sums before the ratio. *Turned down*:
  many-to-one pairing (a book is the unit; two boxes are two catalogue entries); the spare box's price is §9.3.
- TedEval (Lee et al. 2019) — https://ar5iv.labs.arxiv.org/html/1907.01227 : pairs by area recall and area
  precision rather than IoU. *Taken*: confirms the owner's two area ratios as an established device.
- Panoptic Quality (Kirillov et al. 2019) — https://ar5iv.labs.arxiv.org/html/1801.00868 : PQ = Σ IoU over pairs /
  (TP + ½FP + ½FN) = SQ × RQ; pairs need IoU > 0.5; an unpaired segment lying mostly on void is dropped. *Taken*:
  summing IoU as soft tp; the void rule, as the undecided rule with its 0.5. *Turned down*: the 0.5 gate, and
  multiplying box quality by recognition (a book with no title read would be worth 0).
- GIoU (Rezatofighi et al. 2019) — https://ar5iv.labs.arxiv.org/html/1902.09630 : "if two objects do not overlap,
  the IoU value will be zero and will not reflect how far the two shapes are from each other". *Weighed, turned
  down for now*: credit for a box near but not touching its book; the scorer is flat there (see *Where it breaks*).
- DETR (Carion et al. 2020) — https://ar5iv.labs.arxiv.org/html/2005.12872 : one-to-one Hungarian pairing on a
  cost mixing class and box terms. *Weighed*: an optimal one-to-one pairing on `tp` instead of stages. Kept the
  owner's stages; measured against it (§8): the stages lose 0.13 tp of 175.

## 6. The design

```
truth  = the books marked right            (verdict, corners, text: nothing else is read)
part(shared, true, said) = (shared / union,  1 − shared / said,  1 − shared / true)        # tp, fp, fn
box(t, a)   = part(overlap area, area of t, area of a)
title(t, a) = part(letter pairs both hold, pairs of t, pairs of a)
              # letters and digits only, case folded, spaces closed up; a multiset, so word order hardly counts
pair(t, a)  = box                         if t has no title, whatever a read
            = 0.5 × box + 0.5 × title     otherwise   (no title read: the title half is all fn)

1. candidates: every (t, a) whose title tp ≥ 0.3; take the highest pair tp first, each book once
2. candidates: every remaining (t, a) with any overlap; take the highest overlap / union first
tp = Σ pair tp;  fp = Σ pair fp + Σ spare;  fn = Σ pair fn + unpaired true books
spare(a)    = 1 − (area of the true books a covers that their own pair leaves uncovered) / area of a
an unpaired found box more than 0.5 on undecided books is dropped
```

Properties worth stating:
- One pair alone has precision = `overlap / found area` and recall = `overlap / true area` when one box contains
  the other; with a plain offset both sit a little under those ratios.
- At zero overlap a pair's box part is (0, 1, 1), exactly an unpaired box and an unpaired book, so stage 2 needs no
  minimum overlap and has no step.

The constants, all in `score.py` with their reasons:

| Constant | Value | Kind |
|---|---|---|
| `BOX`, `TITLE` | 0.5, 0.5 | stated: two results, neither the lesser. The owner's to change |
| `TITLE_MATCH` | 0.3 | measured: 99 in 100 of 11,014 unrelated real title pairs share under 0.21; half of 371 own-book pairs share over 0.38. Orders pairing only |
| `UNDECIDED` | 0.5 | stated: the majority of the box, as in panoptic quality |

No pixel count anywhere.

## 7. What was tried and turned down

- **Edit distance (1 − N.E.D.) and longest common subsequence for titles.** Measured on the real runs before the
  choice (1,622 unrelated pairs): the median unrelated pair scored 0.12 (N.E.D.) and 0.13 (LCS) against 0.02 for
  letter pairs; at a cut keeping about half the own-book pairs, N.E.D. kept 5.4% of unrelated pairs, LCS 3.4%,
  letter pairs 1.8%. Both also depend on the order lines were read in, and the tagger's "author / title" order is
  not the reader's.
- **Letter triples**: cleaner on unrelated pairs but one wrong letter costs three units; own-book median fell from
  0.19 to 0.10.
- **Padding a title's ends** (so a one-letter title has pairs): junk appended to a right title then cost recall as
  well as precision. Dropped; a one-letter title is its letter.
- **Each pair's weight summing to 1** (`tp + fp + fn = 1`, shares of the union): one pair's precision and recall are
  then exactly the two area ratios, but a pair that barely touches costs 0.5 + 0.5 where an unpaired box and book
  cost 1 + 1, so any sliver of overlap with a neighbour halves the price of an invention beside a miss.
- **Multiplying** box by title (PQ's SQ × RQ shape): zero for a perfectly boxed unread book.
- **A minimum overlap in stage 2**: a threshold is a cliff, and none is needed (above).
- **An optimal (Hungarian) pairing**: equal within 0.1% on the real runs, and harder to explain than two stages.
- **Requiring overlap for a title pair**: would zero a right title read off the neighbouring box.
- **A fixed discount for a spare box lying on a real book** (a split's second half): one more constant, and it makes
  a box straddling two books cheap. The owner chose instead to charge a spare box the share of it that adds no new
  cover (§9), which needs no constant: a second box on a book already covered still costs 1.

## 8. Validation

### Perturbation tests

`python3 -m pytest studies/shelves/tests/test_score.py`: 29 tests, each spoiling a drawn shelf in one way at rising
severity. Spoiling the scorer made them fail (in the validation of the first draft: a 0.5 cut on credit, titles
ignored, a 0.5 minimum overlap, pairing in file order).

### Real runs, the score of record

Every version end to end, natively (`lab/run.py shelves`: the photos decoded by the container's Pillow, the text
finder on ONNX Runtime, Tesseract 5.3), the lines reader, on the six photos with ground truth (133 true books), and
beside it the page's path (Pyodide, onnxruntime-web, tesseract.js), from the validation's sandbox runs.
**All numbers are indicative**: six photos, one tagger, 60 of the 133 books in one photo, and R9 and R8 tuned on
five and three of them.

| Version | P native | R native | P page | R page | old P | old R |
|---|---|---|---|---|---|---|
| r9 text-guided | 0.499 | 0.598 | 0.479 | 0.596 | 0.674 | 0.887 |
| r8 precise | 0.594 | 0.534 | 0.572 | 0.504 | 0.772 | 0.737 |
| r5 edge-only | 0.538 | 0.367 | 0.521 | 0.360 | 0.589 | 0.496 |
| *the true boxes, read by `lines` (page)* | | | *0.807* | *0.761* | *1* | *1* |
| *the true boxes, unread* | | | *1* | *0.545* | *1* | *1* |

The old numbers are boxes alone at IoU > 0.5 and must not be read as the same quantity. Native and page agree on
the score within 0.03 but not book by book: the container's Pillow decodes a JPEG to slightly other pixels than
Pyodide's, so only about half the boxes fall within 2 px of the page's (r9 86 of 170, r8 69 of 130, r5 69 of 105),
and of those, Tesseract 5.3 and tesseract.js read 29, 15 and 13 titles the same. The two italic rows are what a
perfect finder would get: with today's reader the ceiling is about 0.81 / 0.76, and with no reader recall stops at
0.55. The numbers are lower than the old ones mostly because the title half is poor, not because the boxes got worse.
The order of the versions is the same under both scores (r9 leads recall, r8 precision, r5 last on recall).

### Where they disagree, and who is right

On the page's path, under the first draft of the scorer (before §9's choices 2 and 3):

- **Near misses now count.** Pairs at IoU ≤ 0.5, worth nothing before: r9 11 pairs earning 2.3 tp, r8 15 earning
  2.8, r5 33 earning 8.9. r5's boxes are often half a spine (mean IoU 0.48 on `1zktX1`); the old score called a
  third of what it found a miss *and* an invention. The new one is right that they are partly found.
- **Hits now differ.** The 118 r9 pairs over IoU 0.5 were worth 118 before and are worth 68.5 now: a 0.55 box and a
  0.98 box were the same; an unread title cost nothing.
- **Photo `16w5nW`, the one order change.** Old F: r9 0.71 > r8 0.67. New: r8 0.42 > r9 0.39. Both pair the same
  six books. r8's box on one of them is at IoU 0.47, r9's at 0.85; the old scorer saw a miss turn into a hit (a
  whole book), the new one sees a box improve (+0.22 tp) and two more invented boxes (+2 fp). The new reading is the
  accurate one about what changed; whether 0.22 of a book is worth two inventions is what F trades.
- **Stages against the best pairing.** Staged tp / best one-to-one tp: r9 70.77 / 70.77, r8 60.82 / 60.82, r5 43.75
  / 43.88. The stages cost nothing measurable.

### Where it breaks

Seen on a render of r9's pairings on `1zktX1` (not kept):
- **A found box near no true box is flat.** A box 1 px off its book and one across the photo both cost fp 1.
- **A split's spare half** now costs only what it adds no new cover of (§9); a box straddling a covered book and a
  missed one is cheap in proportion to the missed book it covers.
- **Slivers pair.** Three r9 pairs are under IoU 0.1 (tp 0.02, 0.03, 0.06 in the picture). They are worth what
  they show, nearly nothing, but the picture draws them as pairs.
- **Unboxed real books** (right edge, lower right) make true finds count as inventions. The truth is taken as
  right; boxing them is the fix.
- **A junk title is charged twice**, as fp and as fn of the title half (a perfectly boxed book with a wholly wrong
  title: tp 0.49, fp 0.51, fn 0.50), where an unread title is charged once. That is deliberate (a wrong title in a
  catalogue is worse than none) and it is why precision sits below the old one everywhere.
- **Same-title books** (a series, two copies) share all their letter pairs (64 unrelated pairs over 0.3 of 11,014);
  the box breaks the tie since stage 1 orders by box and title together.

## 9. The owner's choices (2026-11-18)

1. **Half and half** approved: a book is half its box and half its title (`BOX`, `TITLE`).
2. **A title read where the truth has none costs nothing**: such a book is scored on its box alone.
3. **A spare box** (a split's second half, a duplicate) costs only the share of it that adds no new cover of a true
   book: the part on a book its pair already covers, or on no book, is charged.
4. Switching approved: native lab scoring is the score of record, every version measured again, no old number
   carried. Still open: credit for a box near but not touching a missed book (none now); view (`spine` / `cover`)
   is not scored, the ground truth carrying none.

## 10. The fields (2026-11-19, #899)

The owner's direction: the reader returns a spine's text as fields (title, author, publisher, and a volume and a
library mark where printed), the tagger sets them one by one, and "the scorer should punish very lightly confusion
between the 3 fields names". The owner's choices: text read in another field than the truth's keeps **0.9** of its
credit (`SLIP`), and the fields weigh by their letters.

The title half became a text half, `text_part` in `algorithm/score.py`:

- each field's letter pairs are compared with the same field's in the truth; the pairs shared count whole;
- of what is left, the pairs the truth holds in some field and the answer holds in another count `SLIP`;
- a publisher, volume or library mark the truth lacks costs nothing; only the truth's own text read in it counts,
  as a slip. Title and Author are always known, empty or not: the task always shows them. In a file from before the
  fields every field is known, its one box having held the whole spine. The first cut let any field the truth lacked
  go free, and on today's title-only files the reader's junk escaped into the author and the publisher: R9's
  precision rose 0.499 → 0.511 for no better reading;
- the three shares are `part(shared, truth's letters, answer's letters over the truth's fields)`, as before.

Pairing is unchanged: it reads every field's text joined, on both sides. A file from before the fields, and an
answer from before them, read their text as the title, so on a title-only truth with everything read in the title
the score is the old one exactly: every version measured again gave the recorded numbers to the fourth decimal
(R9 0.4993 / 0.5982, R8 0.5942 / 0.5343, R5 0.5376 / 0.3671).

What it means for a number. **While the ground truth holds titles alone**, an author or a publisher the reader
parts out of the title earns `SLIP` of its letters, not all of them: a reader splitting right scores a little lower
on that truth than one that does not split. Only ground truth tagged field by field measures the split; until then
the field half compares a reader's letters, not its labels. Tests: the `test_*field*` and slip cases in
`tests/test_score.py`.
