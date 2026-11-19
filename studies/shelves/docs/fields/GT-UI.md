# Ground truth for a spine's fields: the tagger's panel (issue 899)

A design written by a Fable agent on 2026-11-19 at the owner's request: separate text boxes per book for title,
author, publisher, volume and library mark. It was not walked through at the body level and no workload was
measured. What the owner decided, and what was built, is in `req/shelves/truth/fields` in
[the requirements](../../requirements.md). This file is the reasoning behind it.

## Context of use

Desktop, mouse and keyboard, one focused tagger (the owner). The work is transcription, so typing and tabbing are
the cost. The common book, title and author read right, stays at two Enters, and a title/author mix-up takes one
more key.

## 1. The panel

```
 3/12 Books                               Back  Next
┌──────────────────────────────────────────────────┐
│ ┌T──────────────┐ ┌A───────┐          ┌L──┐      │  straightened spine, each
│ │ מלחמה ושלום   │ │ טולסטוי│   ░░░    │892│      │  field's region outlined,
│ └───────────────┘ └────────┘          └───┘      │  a letter tab on its corner
└──────────────────────────────────────────────────┘
 [Flip ^↑]
 [T] [ מלחמה ושלום                               ]
  ⇅
 [A] [ טולסטוי                                   ]
 [L] [ 892.4 טול                                 ]
 + Publisher   + Volume
 [      Right ⏎      ]  [   Not a book ^⌫   ]
```

| Field | Shown | Notes |
|---|---|---|
| Title (T) | always, first, focused and selected on open | as before |
| Author (A) | always, second | empty when none is printed |
| Publisher (P) | when the reader proposed one or the tagger typed one; otherwise a small `+ Publisher` link | |
| Volume (V) | the same; `+ Volume` | free text as printed: "C", "IV", "ג", "Vol 1" |
| Library mark (L) | the same; `+ Library mark`; see section 4 | as printed, the sticker's lines joined by a space, not parsed |

- The letter chip sits at the row's left edge so the chips line up down the panel (`row-indicators-edges`). The `+`
  links share one line under the last open field and Tab skips them.
- Every box is `dir="auto"`. Text is stored in logical order, with no direction marks.
- **Swap**: `⇅` between two neighbouring rows exchanges them whole. From the keyboard, Alt+↓ / Alt+↑ does the same
  with the row below or above.
- **Split**: with part of a box selected, Alt+↓ / Alt+↑ moves only the selection into the neighbouring field. This
  fixes the reader's likeliest mistake, author and title merged into one line.

## 2. Colour link and regions: store text, carry the reader's region

The tagger never draws or corrects a region. The ground truth is text per field. Each block the reader proposes
carries its box on the straightened spine, which is drawn there in its field's colour and saved beside the text as
the reader's, never checked by a person. A field the tagger typed from nothing has no region.

Tagger-drawn regions would roughly triple the pointing work per book, for a signal the scorer does not need.

One fixed hue per field, the same on the chip, the box's edge and the region's outline, so the link can be learnt.
Never colour alone: the letter is on the chip and on the region's tab.

## 3. Keyboard

| Key | Does |
|---|---|
| Tab / Shift+Tab | moves through Title, Author, the open optional fields, Right. Leaving a changed field commits it (one action) |
| Enter | Right for the whole book, carrying every field not yet committed, then moves on |
| Alt+↓ / Alt+↑ | swap with the neighbouring field, or move the selection there |
| Alt+← / Alt+→, Ctrl+↑, Ctrl+Backspace | Back / Next, Flip, Not a book, unchanged |

One approval means that the box, the turn and every non-empty field are right as they stand. An empty field says
nothing. The second Enter is asked only while Title and Author are both exactly as read.

## 4. Library marks

Once any book on the photo has a library mark, every book opened after it shows the Library field already open. The
field is last in Tab order, so a book with no sticker costs nothing. A field opened like this and left empty writes
nothing: it does not mean "no sticker".

## 5. The file

```json
{ "id": "b7", "verdict": "right", "corners": [], "turn": 1, "text": "מלחמה ושלום טולסטוי",
  "fields": { "title": "מלחמה ושלום", "author": "טולסטוי", "library": "892.4 טול" },
  "proposed": { "corners": [], "text": "…", "fields": {} } }
```

`fields` is the truth, with only non-empty fields as keys: an unknown field is an absent key, never `""`. A file
from before fields reads its `text` as the title.

## 6. Left out, on purpose

Drawing regions; separators, fonts, per-block orientation and language as labels; subtitle, series, edition and
ISBN; several authors as several fields; parsing the call number; an "other text" bin; "no author" affirmations;
highlights on the photo itself; any mark that a field was edited.

## 7. GT actions

| Action | Payload | Notes |
|---|---|---|
| `set-field` | `book, field, text` | `set-text` is still read, as `field: "title"`, so the logs kept until now replay |
| `swap-fields` | `book, a, b` | exchanges the two fields' text |
| `approve` | `book, fields?` | carries the fields not yet committed |
| `read` | `book, fields, …` | lands per field, never over one the tagger typed |
