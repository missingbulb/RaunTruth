# Suissa, Elmalech, Zhitomirsky-Geffet — Optimizing the neural network training for OCR error correction of historical Hebrew texts

*Omri Suissa, Avshalom Elmalech, Maayan Zhitomirsky-Geffet (Department of Information Science, Bar-Ilan University)
· the extracted text carries no venue, year, DOI or licence; its web references were last accessed 2019-06-20, so
it predates "2023", the caller's dating (unconfirmed here). It is **not** the ACM JOCCH 2022 paper (doi
10.1145/3479159) that [HEBREW.md](../HEBREW.md) cites, though by the same group on the same corpus · PDF: study Drive folder `Literature/Optimizing the neural network training for OCR error correction of historical Hebrew texts.pdf`.*

**Why it matters here:** it is the one source with a *measured* table of which Hebrew letters OCR confuses, and a
test of what dictionary-style spellcheckers do to Hebrew OCR output. Both bear on our speller (`spelling` in
`reading.js`, R7).

---

## 1. Claim

A light-weight neural OCR post-corrector for historical Hebrew can be trained with little hand-labelled data by
**synthesising training errors** from a small hand-corrected sample: errors learned from the target corpus beat
random errors, and the training text must be close in period and genre to the target. The best network raised
word accuracy on 19th–20th-century newspapers from 48.98% to 53.47%; Google Docs' and Word's spellcheckers made it
worse.

## 2. Data

- **JP_CE (evaluation):** **150** OCRed articles drawn at random from JPress (the National Library of Israel's
  historical Hebrew newspapers, 1800–2015), corrected by **75 students** and double-checked by an expert.
  **70%** of it (**105** articles) was aligned with its correction to learn the confusions below.
- **Training corpora**, both hand-typed and so taken as clean: the **Ben Yehuda Project** (secular Hebrew
  literature, mostly the last two centuries and the Middle Ages; overlaps JPress in period) and the **Hebrew
  Bible** (from sefaria.org.il).
- Four synthetic sets: **BYP** and **BIBLE** with *random* errors (per line, random characters removed, replaced
  by random characters, or inserted); **BYP_HEB** and **BIBLE_HEB** with random errors *plus* JPress-specific
  ones.

## 3. The error-synthesis method

Fig. 1's pseudo-code is an image the text extraction lost; the prose says: first language-independent errors at
random positions — **removal, insertion, and swapping two consecutive characters**; then the commonest JPress
confusions, **added in proportion to their relative frequency** in the corpus. The confusions came from a
**Needleman–Wunsch alignment** of OCR against correction over the 105 articles. Table 2, the commonest:

| pair | count in JP_CE | in our `LOOK_ALIKE` |
|---|---|---|
| ח ↔ ה | 499 | yes (`החת`) |
| ד ↔ ר | 306 | yes (`דרך`) |
| ג ↔ נ | 256 | yes (`גנ`) |
| ב ↔ כ | 210 | yes (`בכנ`) |
| י ↔ `,` (comma) | 207 | no — punctuation |
| ם ↔ ס | 194 | yes (`סםט`) |
| ח ↔ ת | 162 | yes (`החת`) |
| ו ↔ י | 162 | yes (`וזןי`) |

*Counts from one corpus of 19th–20th-century newsprint scans, a different print and OCR engine from ours; trust
the ranking as a hint, not the frequencies.* The table's header is "Character / Fix", but which column is the OCR's
reading and which the correction is not stated; we read each row as a pair. The comparison column is ours.

**OCR error forms** named (after Reynaert 2008): insertions, deletions, substitutions, transpositions, word
splitting and word joining.

## 4. Network and measures

- Baseline: the GRU corrector of Ghosh & Kristensson (2017). Chosen after a comparison: a **bidirectional LSTM,
  4 layers, dropout 0.2, 500 units, epoch size 250,000, batch size 256**. The optimisation procedure is "beyond
  the scope of the paper".
- **acc-increase** = (lev(GS, OCR) − lev(GS, Fixed)) / lev(GS, OCR) × 100, **set to 0 when the corrector added more
  errors than it fixed** — so a harmful corrector reads 0, not negative.
- **Word accuracy:** Needleman–Wunsch alignment, words split on "a standard set of delimiters", then
  WAcc = (N − I ± S ± D) / N × 100 as printed. The printed signs are garbled, and its I and D are defined the
  other way round from the usual word error rate (I: words of the correct text missing from the output). Read it
  as 100 minus word error rate.

## 5. Results

- **Validation** (80/20 split of each training set): BYP_HEB **94%** vs BYP **85%** accuracy (Fig. 3). *On its own
  synthetic errors, so it shows the learned errors are learnable, not that they correct real text.*
- **On JP_CE**, baseline word accuracy **48.984%**:

| corrector | char acc-increase | word accuracy |
|---|---|---|
| network, BYP_HEB | **5.406%** | **53.472%** |
| Google Docs spellcheck | ~0% | 41.58% |
| Microsoft Word 2019 spellcheck | ~0% | 41.53% |
| network, BIBLE_HEB | ~0% | ~0% |

  *One evaluation set of 150 articles, no variance, and apparently including the 105 articles the confusions were
  learned from (the text does not say they were held out): trust the direction, not the size.* Note the
  spellcheckers' "~0%" is the floor of acc-increase; their word accuracy fell **~7.4 points** below doing nothing.
- The prose gives "around 4.5% character-based and 5.5% word-based" for the period-matched network; the table
  says 5.406% and +4.49 points. *The prose and table disagree; prefer the table.*
- **What the spellcheckers did** (from 20% of texts examined by hand): every *non-word* got a fix, not always the
  right one; *real-word* errors (a valid word wrong in context) were not fixed. They did fix transpositions,
  redundant spacing, "dirt" signs (smudges, damaged paper) and real-word spelling slips.
- **What the best network learned:** spelling fixes, transpositions, removing and **adding spaces**, **preserving
  named entities**, removing dirt signs. Still, **most errors were left unfixed**, and some new ones introduced;
  the authors blame genre (literature vs newspapers).
- **The Bible-trained network did nothing or harm** — period and genre matter more than language.

## 6. Gaps — what the text does not state

- Fig. 1's exact algorithm: rates of each random error, how many confusions per line, the cut-off of "most common".
- The full confusion list beyond Table 2's eight; any confusion of final letters other than ם/ס; word-split and
  word-join rates in JPress.
- The OCR engine that produced JPress, and the print typefaces.
- Whether evaluation excluded the 105 articles used to learn the errors.
- Input unit of the network (line, sentence, window), character vocabulary, training time, model size.
- How named entities were preserved, or measured.
- Anything about modern print, display fonts, short texts, or text in images — it is page OCR of newspapers.

## 7. What to take / where we diverge (our inference)

- **Our look-alike set holds every letter pair in their table** (seven of eight rows), so R7's `LOOK_ALIKE`, set
  from letter shapes, agrees with a measured corpus. Their ranking (ח/ה first, ד/ר second) could order our
  candidates when two listed words tie, instead of frequency alone.
- **The yod–comma confusion (207) is the geresh problem** of HEBREW.md item 7 from the other side: a `'` or `,` read
  for, or beside, a yod. A correction allowing `,`/`'`/`׳` ↔ `י` inside a word is a measured, not guessed, rule.
- **A dictionary speller cannot fix a real-word error**, as Docs and Word could not; ours only touches words off
  its lists, so a look-alike slip landing on another listed word passes through. Their spellcheckers *lowered*
  word accuracy by forcing every non-word to a word — the risk our names list and the rule "or stays as read"
  guard against (HEBREW.md item 1, `קריספין` → `קריסטין`).
- **Period and genre of the lexicon matter**: a Bible-trained corrector harmed modern text. Our word lists
  (subtitles, Wikipedia titles) are modern and close to spine vocabulary; that is the right direction.
- **Divergence:** we correct a few words of a spine, not running text, so no sentence context exists for a
  network like theirs to use; a neural corrector is also a heavy dependency for the page. We take the confusion
  table, not the network.

## 8. Deliberately omitted

Cross-checked against the full 10-page text, references included. Not carried: the introduction's general account
of neural networks and digitisation projects, the methodology diagram (Fig. 2, a flow chart of the steps above),
the Fig. 3 curve beyond its two end values, the "time traveller" remark, and the reference list.
