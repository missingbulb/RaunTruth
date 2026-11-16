---
name: paper-intake
description: Take a research article into a study's literature folder as one Markdown summary. Use whenever the owner adds an article to any study, or an existing summary needs re-processing.
metadata:
  body: guidelines
---

# Paper intake

A summary is a **reading for the study**: what this article changes about the study's
algorithm or its ground truth, and the facts that back that up. It is not a description of the
article, and an intake is never measured by how much of the paper it covers. The PDF stays in
the study's Drive `Literature` folder, named by the article's title, and the summary names that
file, so whatever the summary leaves out can still be looked up.

**The repository holds only that summary.** One file, `studies/<study>/docs/literature/<slug>.md`,
and nothing else: no PDF, no figure or crop, no supplementary script or data, under any licence.
Anything outside the summary is **linked at its source**: the article's DOI, the publisher's
supplementary page, the authors' code repository. The `literature-summaries-only` check rejects
anything else in the folder.

## The steps

### 1. Know what the study needs before opening the paper

Read the study's `STATE.md`, its requirements and its literature synthesis, and write down in
the scratchpad the questions the study has now: the algorithm's open failure, the threshold
nobody has a value for, what a ground-truth mark should be, the magnitude a result should land
near. These questions decide what the summary holds. Without them a paper gets summarised by its
own structure, section by section and figure by figure.

### 2. Read the paper against those questions

Slug is `<first-author>-<year>-<short-topic>`, lowercase and hyphenated. Keep the PDF and
everything extracted from it in the scratchpad:

```
python3 .claudinite/local/packs/nor-finder/skills/paper-intake/extract_pdf_assets.py <paper.pdf> <scratchpad>/<slug>
```

It writes `fulltext.txt`, `raw/` (the embedded images) and `manifest.tsv`. A PDF with no text layer
(a scan, a "Print to PDF") gives an empty `fulltext.txt`: render its pages with pymupdf and read
them as images instead.

Read the whole text and look at the figures, since a method step or a number is sometimes only
in one. Reading everything is not writing everything: for each finding, ask whether it changes a
decision in the study's algorithm or in how its ground truth is marked. Where the method lives in
supplementary material or code, find it at the publisher, or **ask the owner for it**, and read
it the same way.

### 3. Write `<slug>.md`, sized to what the article gives the study

- **Citation block**: title, authors, venue, DOI as a link, the licence as the article states it,
  and the PDF line: `kept in the study's Drive Literature folder as <Title>.pdf`.
- **What it gives the study**, first: the decisions it informs and how, in the study's own terms
  (its metrics, thresholds, ground-truth tasks). Then what it does not give, where a reader might
  expect it to.
- **The supporting detail**, only what those decisions rest on: the method steps and parameters
  the study would reuse or compare against; the numbers it would check a result against, with
  their statistics and whether each came from a table or by eye off a plot; and the parameters
  the paper leaves unstated **where the study would need them**.
- **A figure** appears only where it carries something the study uses: a number, a method step
  drawn rather than written, or an image of the kind the algorithm or the taggers will meet that
  would trip them up. Say in a sentence or two what in it matters. No section lists the figures,
  and nothing is described for completeness.
- **The authors' arguments and limitations** that bear on those decisions.

A paper that gives the study one fact gets a short summary stating it; one that gives nothing
says so, and why, in a few lines, so nobody re-reads it hoping. Name in one line what was left
out, and leave out the background, biology, statistics and experiments that answer none of the
study's questions.

### 4. Fold into the study's synthesis

Add the paper's row to the study's `literature/README.md` index. Update the study's cross-paper
synthesis (whatever its literature README names) where the paper changes it: reference
magnitudes, method choices, and **how the published numbers compare to ours and what the gap
means**.

## The rules that bite here

- **Every paragraph answers "so what, for this study?"** One that only says what the paper
  contains, with no consequence for the algorithm or the ground truth, is cut.
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
