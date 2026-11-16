---
name: paper-intake
description: Take a research article into a study's literature folder as one Markdown summary. Use whenever the owner adds an article to any study, or an existing summary needs re-processing.
metadata:
  body: guidelines
---

# Paper intake

The owner adds articles so a study can keep working **without reopening them**. An intake is
finished when someone could lose the PDF and miss nothing they need: the biology, the method,
the parameters, the numbers and every figure are in one Markdown file, in words.

**The repository holds only that summary.** One file, `studies/<study>/docs/literature/<slug>.md`,
and nothing else: no PDF, no figure or crop, no supplementary script or data, under any licence.
Anything outside the summary is **linked at its source**: the article's DOI, the publisher's
supplementary page, the authors' code repository. The `literature-summaries-only` check rejects
anything else in the folder.

## The steps

### 1. Work in the scratchpad

Slug is `<first-author>-<year>-<short-topic>`, lowercase and hyphenated. Keep the PDF and
everything extracted from it in the scratchpad:

```
python3 .claudinite/local/packs/nor-finder/skills/paper-intake/extract_pdf_assets.py <paper.pdf> <scratchpad>/<slug>
```

It writes `fulltext.txt`, `raw/` (the embedded images) and `manifest.tsv`. A PDF with no text layer
(a scan, a "Print to PDF") gives an empty `fulltext.txt`: render its pages with pymupdf and read
them as images instead.

### 2. Chase the supplementary material

It is often where the method actually lives. Find it at the publisher; **ask the owner for it**
if it cannot be fetched. Transcribe what matters into the summary (parameters, tables, the
macro's steps) and link the original; never commit the file.

### 3. Read the whole paper

Read the text end to end, then **look at every extracted image**. Part of a method is often only
in a figure. Anything that is only in an image and matters is transcribed into the summary.

### 4. Write `<slug>.md`

It must stand alone. Always include:

- **Citation block**: title, authors, venue, DOI as a link, the licence as the article states it,
  a one-line thesis. Name any limitation of the owner's copy (an image-only print).
- **§ Why this matters to our task**, first and concrete: what it changes about what the study
  builds, and what it explicitly does not cover.
- **The method, in full.** Every parameter the paper states, and every one it **fails** to state,
  listed as a gap so nobody hunts for it again.
- **The reported numbers**, in tables, with their statistics and where each was read from (a
  table, or by eye off a plot).
- **Discussion arguments worth keeping**, and the authors' own limitations.
- **§ What is not in this article**: the supplementary material and code, linked, and anything you
  could not fetch (the URL and what happened).
- **§ Figures**: every figure, panel by panel: what it shows, stain, scale bars, and **what you
  actually see**, including anything that will trip the study's algorithm up. Link the figure at
  the publisher where it has its own URL; never embed an image.

### 5. Fold into the study's synthesis

Add the paper's row to the study's `literature/README.md` index. Update the study's cross-paper
synthesis (whatever its literature README names): the metric and method tables, reference
magnitudes, and **how the published numbers compare to ours and what the gap means**.

## The rules that bite here

- **Never invent a number.** Not a scale bar, a field size or a metric. Measure it off the page,
  cite it, or declare it unknown, and say which.
- **A summary may quote what the authors measured**; it must not present our run over their
  figures as validation.
- **Say what is weak**: a value read by eye off a plot, a calibration you half-trust, a direction
  of change that contradicts another paper. The summaries are read later by someone deciding
  what to believe.
- **Prefer a same-image comparison to a table comparison.** If the paper ships code and an image,
  reimplement the method and run both on that image, from the scratchpad. A number in a summary
  table may not be the raw output of the method it describes.
