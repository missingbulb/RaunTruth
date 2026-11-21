# Reading a spine into fields: routes (issue 899)

Ideation by a Fable agent on 2026-11-19 at the owner's request. Nothing here was run or measured when it was
written, and every threshold is a starting guess to set on ground truth. What is built is recorded as iterations in
[the warm-up](../WARMUP.md). This file holds the routes, so the next session does not have to work them out again.

Two facts shape it:
- `web/words/names.txt` lists **words** from Hebrew Wikipedia titles. It does not say whether a word is an author,
  a title or a publisher, so it cannot label a block by itself.
- [HEBREW.md](../HEBREW.md) finds the `author / title` slash on 11 of 32 tagged books, so that separator is the
  cheapest strong cue.

## 1. Segmentation: lines to blocks

The spine's own frame: `u` runs along the spine (0 at the head, 1 at the foot), `v` across it. Every measure is
relative to the spine's width `w` or the line's height `h`, never in pixels.

**Lines at both orientations.** Today one turn is kept for the whole book. Instead, also run the text finder across
the spine (turn 0) and keep the lines that read that way: a publisher or a sticker set at 90°. This costs one more
`det` call per book.

| Feature of a line | Measured from |
|---|---|
| `u0, u1`, height `h/w` | the line box |
| orientation | which turn the box came from |
| ink and background colour | 2-means on the box's pixels in Lab |
| stroke width / `h` | `2 × median(distance transform at the skeleton)` of the ink |
| script | the share of Hebrew, Latin and digit characters read |
| confidence | Tesseract's |

**Cut cues**, each a score from 0 to 1 at a candidate boundary:
1. **Gap** between lines along `u`: `gap / median(h)`. Inside a line, gaps on the text finder's probability, cut
   past about `1.5 × h`, since a word space is about `0.3 × h`.
2. **Separator glyph**: in the text, `/ | • · – -` alone between spaces, and a lone `o`, `0` or `.` between two
   Hebrew words. In pixels: an ink component in a gap that is thin and tall (`|`, `/`) or small and round (a dot).
3. **Height change**: `|log(h1/h2)|`, full at `log 1.5`.
4. **Stroke change**: the same on stroke / `h`.
5. **Colour change**: the ink's and the background's. A background change (a band, a white sticker) is the
   stronger.
6. **Orientation change**: a hard cut.
7. **Script change**: a soft cut.

Combined as a noisy-OR, with orientation and a separator as hard cuts:

```
cut(i) = 1                      if orientation differs or a separator is seen
       = 1 - Π(1 - a_k·cue_k)   otherwise   # a: gap .9, background .8, height .6, ink .5, stroke .4, script .3
split where cut > 0.5; at most 5 blocks, the weakest cuts merged first
```

**Tesseract's word boxes** (TSV or hOCR, from the same request) would give the gaps between words, the separator's
box, each word's height inside a line, and per-word confidence. It is the one service change worth making, and it
adds no network call.

## 2. Labelling: blocks to fields

At most one title, one author, one publisher, one volume and one library mark. If any block exists, the title is not
empty.

**Patterns first**, nearly decisive:
- **Library mark**: `\d{3}(\.\d+)?`, maybe followed by a Cutter-like code (`[A-Zא-ת]{1,3}\d*`) or two or three
  Hebrew letters, at the spine's head or foot (`u1 > 0.85` or `u0 < 0.1`), on a background unlike the spine's.
- **Volume**: a short block (4 letters or fewer once the keyword is removed): a roman numeral, digits, one Latin
  letter or a Hebrew numeral (`א`–`ט`, `י"א`), or carrying `Vol`, `Volume`, `כרך`, `חלק`, `ספר`, `No.`. A lone letter
  counts only where a cut parts it from the title.
- **Publisher**: on a short list of imprints (`עם עובד`, `כתר`, `זמורה ביתן`, `Penguin`, …), matched with the
  reader's look-alike letters.

**Layout** (NISO Z39.41: title and author at the head, publisher at the foot):
```
publisher: + at the foot, + across the spine, + small type, + on the publisher list
title:     + largest h/w, + longest
author:    + before a slash, + smaller than the title, + two or three words
```
With a slash, the block before it is the author (`author / title`). With none, the smaller of the top two blocks is.

**Across the photo**, a second pass over its books:
- **Library**: once a share of the spines carries a matched mark, lower the bar for the rest. Stickers on one shelf
  sit at one height.
- **Publisher**: blocks at the foot read alike on three spines or more are a publisher or a series.
- **Series**: neighbours sharing a block's text share its label, and what differs is the volume.

**Payoff, most for least**: 1. split at a slash or a bar, largest block the title; 2. volume and library patterns;
3. foot and across-the-spine for the publisher; 4. a publisher list; 5. sharing library and publisher evidence
across the photo; 6. Tesseract's word boxes; 7. colour and stroke cues; 8. logos clustered by appearance.

## 3. Phasing and failure modes

**v1**: separators and gaps in the text, the patterns, layout, the library prior across the photo.
- an author and a title in one line with nothing between them are not cut;
- a subtitle smaller than the title is taken for the author;
- a title like "1984" is taken for a volume or a class number;
- a year or a price on a sticker is taken for a library mark;
- a publisher's logo reads as junk letters, or is not found at all.

**v2**: word boxes; colour and stroke; the publisher list; publishers matched across the photo. Stroke width is
unreliable under about 12 px of letter height, and colour splits on glare and two-tone spines.

**Later**: logos matched by appearance; the sticker read with a digits-only pass at four turns; a small sequence
model over the blocks' labels, once a few hundred books are tagged.

## 4. Scoring

Keep the pairing and the box half of `score.py`, pairing on every field's text together. Replace the title half by a
field half:

```
right   = Σ_f |T_f ∩ A_f|                       # right text, right field
moved   = |(Σ_f rest T_f) ∩ (Σ_f rest A_f)|      # right text, another field
shared  = right + SLIP × moved
text    = part(shared, Σ|T_f|, Σ|A_f| over the fields the truth holds)
book    = BOX × box + TITLE × text
```

A field absent from the truth costs nothing. A reader putting everything in `title` keeps `SLIP` of the rest, so the
old reader is measurable under the new score and splitting right is always a gain.

## 5. What the tagger could cheaply add

Worth asking: the field texts, pre-filled for correcting; perhaps one tap per field on the spine to place it. Not
worth asking: line or word boxes, labels for font, size or colour, logo outlines, each block's orientation.
