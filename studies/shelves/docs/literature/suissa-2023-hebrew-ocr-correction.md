# Suissa, Elmalech, Zhitomirsky-Geffet — Optimizing the neural network training for OCR error correction of historical Hebrew texts

*Omri Suissa, Avshalom Elmalech, Maayan Zhitomirsky-Geffet (Department of Information Science, Bar-Ilan University)
· the extracted text carries no venue, year, DOI or licence; its web references were last accessed 2019-06-20, so
it predates "2023", the caller's dating (unconfirmed here). It is **not** the ACM JOCCH 2022 paper (doi
10.1145/3479159) that [HEBREW.md](../HEBREW.md) cites, though by the same group on the same corpus · PDF: study Drive folder `Literature/Optimizing the neural network training for OCR error correction of historical Hebrew texts.pdf`.*

## What it gives the study

Two measured facts for our speller (`spelling` in `reading.js`, R7); the neural corrector itself we do not take.

- **A measured table of which Hebrew letters OCR confuses**, and our `LOOK_ALIKE`, set from letter shapes, holds
  every letter pair in it (seven of eight rows; the eighth is punctuation). Their ranking (ח/ה first, ד/ר second)
  could order our candidates when two listed words tie, instead of frequency alone.
- **The yod–comma confusion is the geresh problem** of HEBREW.md item 7 from the other side: a `'` or `,` read for, or
  beside, a yod. A correction allowing `,`/`'`/`׳` ↔ `י` inside a word is a measured rule, not a guessed one.
- **What a dictionary speller does to Hebrew OCR:** Google Docs' and Word's spellcheckers *lowered* word accuracy
  ~7.4 points below doing nothing, by forcing every non-word to some word, and fixed no real-word error (a valid word
  wrong in context). Ours only touches words off its lists, so a look-alike slip landing on another listed word
  passes through; the forcing risk is what our names list and "or stays as read" guard against (HEBREW.md item 1,
  `קריספין` → `קריסטין`).
- **The lexicon's period and genre matter more than its language:** a Bible-trained corrector did nothing or harm on
  modern newsprint. Our word lists (subtitles, Wikipedia titles) are modern and close to spine vocabulary, the right
  direction.

It gives nothing on modern print, display fonts, short texts or text in images: it is page OCR of historical
newspapers. A spine has a few words and no sentence context for a network like theirs, which would also be a heavy
dependency for the page.

## The confusion table (Table 2, from a Needleman–Wunsch alignment of OCR against correction over 105 JPress articles)

| pair | count | in our `LOOK_ALIKE` |
|---|---|---|
| ח ↔ ה | 499 | yes (`החת`) |
| ד ↔ ר | 306 | yes (`דרך`) |
| ג ↔ נ | 256 | yes (`גנ`) |
| ב ↔ כ | 210 | yes (`בכנ`) |
| י ↔ `,` (comma) | 207 | no — punctuation |
| ם ↔ ס | 194 | yes (`סםט`) |
| ח ↔ ת | 162 | yes (`החת`) |
| ו ↔ י | 162 | yes (`וזןי`) |

*One corpus of 19th–20th-century newsprint scans, a different print and OCR engine from ours: trust the ranking as a
hint, not the frequencies.* The header is "Character / Fix", but which column is the OCR's reading is not stated; we
read each row as a pair. The comparison column is ours.

## The results behind the speller points

On **150** hand-corrected JPress articles, baseline word accuracy **48.984%**:

| corrector | char acc-increase | word accuracy |
|---|---|---|
| network trained on period-matched literature with JPress errors | **5.406%** | **53.472%** |
| Google Docs spellcheck | ~0% | 41.58% |
| Microsoft Word 2019 spellcheck | ~0% | 41.53% |
| network trained on the Bible with JPress errors | ~0% | ~0% |

acc-increase is floored at 0 when a corrector adds more errors than it fixes, so the spellcheckers' "~0%" hides harm
that their word accuracy shows. *No variance, and the evaluation apparently includes the 105 articles the
confusions were learned from (not said to be held out): trust the direction, not the size.* The prose gives "around
4.5% character-based and 5.5% word-based" for the best network against the table's 5.406% and +4.49 points; prefer
the table. Even the best network left most errors unfixed; it learned to add and remove spaces and to preserve named
entities.

## Gaps

The full confusion list beyond eight rows, final-letter confusions other than ם/ס, word-split and word-join rates,
and the OCR engine and typefaces behind JPress.

Left out: the network's architecture and training, the error-synthesis procedure beyond its source, the
word-accuracy formula's garbled signs, the validation on synthetic errors, and the introduction.
