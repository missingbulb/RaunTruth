# Edwardy & Pontius 2001 — Monitoring Book Reshelving with Sampling and Control Charts

- **Title:** Monitoring Book Reshelving in Libraries Using Statistical Sampling and Control Charts
- **Authors:** Jeffrey M. Edwardy (Carlson Marketing Group) and Jeffrey S. Pontius (Department of Statistics,
  Kansas State University)
- **Venue:** *Library Resources & Technical Services* (LRTS) 45(2), 2001, pp. 90–94. Received 3 Oct 2000, accepted
  14 Nov 2000. Peer-reviewed (the acknowledgement thanks the referees).
- **DOI:** [10.5860/lrts.45n2.90](https://doi.org/10.5860/lrts.45n2.90) — taken from our topic note; the PDF prints no
  DOI. Article page: [journals.ala.org](https://journals.ala.org/index.php/lrts/article/view/5196).
- **Licence:** not stated in the PDF. Openly downloadable from the journal's archive.
- **PDF:** kept in the study's Drive `Literature` folder as `Monitoring Book Reshelving in Libraries Using Statistical Sampling and Control Charts.pdf`
- **Owner's copy:** the 5-page article with a text layer; the one figure is an embedded raster. Read in full.
- **Thesis:** instead of shelf reading every book on a schedule, sample about 10% of a collection's shelves, estimate
  the share of correctly shelved books, and shelf-read only when that estimate falls below a control limit.

## Why this matters to our task

Little, and mostly as vocabulary. It is a statistics-of-sampling paper with no imaging at all. It gives:

- **An operational definition of "misshelved"** that is purely local: a book is misshelved when its call number is
  greater than its right neighbour's or less than its left neighbour's. A shelf-order checker built on our reads would
  need only adjacent pairs, not a global sort.
- **A shelf-level accuracy measure**, AR = 1 − (misshelved books per shelf ÷ books per shelf). It is the share of
  books in order, not a detection or reading accuracy, and should not be confused with our precision/recall.
- **Magnitudes:** in four academic collections, 93–98% of books were in order. So a few misplaced books per hundred
  is the signal a library shelf-reader looks for; a photo tool that misreads more than that would drown it (our
  inference).

It does **not** cover locating or reading books, home shelves, the time a shelf read takes, or distance of a
misplaced book from its place. Misplacement order is out of scope for our home tool
([topics/library-inventory.md](topics/library-inventory.md)), so this paper informs only a possible library mode.

## Method

**Setting.** Kansas State University's Hale Library, criteria agreed with its stacks managers. A "book" includes
bound and unbound periodicals, government documents, abstracts and indexes.

**Sampling unit: a shelf, not a book.** A shelf is easy to locate; sampling non-empty shelves avoids accounting for
borrowed or lost books. Hale keeps up-to-date shelf diagrams, which serve as the sampling frame.

**Census of four collections**, each treated as its own population: science reference (needs a very low misshelving
rate), juvenile literature (low rate not critical), mathematics (high use), anthropology (low use). Every non-empty
shelf was inspected; books per shelf and misshelved books per shelf recorded. Volume numbers in a run of bound
periodicals count as identifiers.

**Three strategies compared on the census data:**

1. Simple random sampling without replacement (SRSWOR) of shelves, mean misshelved per shelf.
2. SRSWOR with a ratio estimator (misshelved ÷ books on the shelf).
3. Adaptive cluster sampling: if a sampled shelf has ≥ 2 misshelved books, inspect the shelves above and below,
   continuing until both have < 2.

Adaptive cluster sampling was dropped: clusters of shelves with ≥ 2 misshelved books were not rare, which Thompson
(1992) says it needs. The ratio estimator was dropped: no linear relation between misshelved count and books per
shelf ("random scatter in each plot"), and relative efficiencies close to 1 (Table 1). **Recommended: SRSWOR with
the sample mean.** The authors' finding is that misshelving is not related to how full a shelf is; they speculate it
comes from inexperienced, inattentive or tired staff, or complex call numbers.

**Accuracy rating and control chart.**

- AR̂ = 1 − ȳ / µₓ, where ȳ is the mean misshelved books over the n sampled shelves and µₓ the known mean books per
  non-empty shelf (total books ÷ non-empty shelves). A close approximation to µₓ is said to be enough.
- SE(AR̂) = s / (√n · µₓ), s the sample standard deviation of misshelved counts. No finite-population correction is
  written, although sampling is without replacement.
- The chart plots AR̂ per sampling round against a target; the lower control limit is set by the manager, or at two
  or three standard errors below the target. No upper limit (AR cannot exceed 1).
- Reshelving starts once at least one AR̂ falls below the lower limit. Inspectors must **not** reshelve while
  sampling: it slows them and alters the chart's trend.

**Sample size.** At least **10% of a collection's shelves**, chosen from how standard errors fell with sample size
over the four censuses and the staff time available. Larger samples risk "shelf reading burnout", which the authors
expect to add measurement error.

**Tooling.** An Excel 95 spreadsheet draws the shelf sample, takes the counts and draws the chart (details in
Edwardy's 1998 M.S. thesis; not public).

**Variants suggested, not tried:** one population for a small library; stratified sampling by collection with one
chart; two-stage sampling with cases as primary units; collections defined by employee or building section;
excluding bound periodicals from "book".

## Reported numbers

Table 1 — relative efficiency (SE of ratio estimate ÷ SE of sample mean), from the censuses:

| Anthropology | Juvenile | Mathematics | Science |
|---|---|---|---|
| 1.21 | 1.09 | 1.14 | 1.07 |

Table 2 — census accuracy rating (AR) and a lower limit (LRL):

| | Anthropology | Juvenile | Mathematics | Science |
|---|---|---|---|---|
| AR | .97 | .93 | .97 | .98 |
| LRL | .93 | .86 | .92 | .96 |

- How the per-collection LRLs in Table 2 were computed is not stated (presumably standard errors below AR).
- Managers chose **target AR 0.97 and LRL 0.935** for all collections; the authors flag juvenile literature
  (census AR .93, below that limit) as the exception, accepted because it is low priority.
- Monitoring example: anthropology, **10 rounds at 3-day intervals, n = 20 shelves each, about 14% of the
  collection's shelves**. No round fell below 0.935; estimates stayed near 0.97.
- **Not reported:** shelf counts, book counts or misshelved counts for any collection; the standard errors; the
  sample sizes tried when arriving at 10%.

## Discussion worth keeping

- Shelf reading is a census and costly when few books are out of place; sampling buys the same decision cheaply.
- Kendrick (1991) proposed shelving-accuracy performance measures; the authors' point is that a measure without
  history and a decision rule is weaker than a chart.
- Limitation, unstated by the authors: one library, four collections, one short monitoring run in a low-use
  collection at intervals they themselves call shorter than real practice.

## Gaps — what the article never states

- Collection sizes (shelves, books) and the misshelved totals behind Tables 1 and 2.
- How Table 2's LRLs were derived, and how many standard errors.
- The monitoring rounds' AR values (only plotted; read by eye below).
- What happens to a misshelved book whose neighbours are themselves misshelved (whether one displaced book counts
  once or as two out-of-order neighbours).
- Time per shelf inspected.

## What is not in this article

The Excel program and its instructions are in Edwardy's 1998 M.S. thesis (Kansas State University), "contact the
first author"; not fetched. No supplementary material.

## Figures

**Figure 1 — Control chart of the anthropology collection** (p. 93). Scatter of estimated accuracy rating (y-axis,
0.90–1.00) against "sample times (days)" (x-axis, ticks 2–10). Note the x-axis numbers the ten sampling rounds 1–10,
although the text says rounds were three days apart. A dashed horizontal line sits at about 0.97 (the target) and a
dotted one at about 0.935 (the lower limit). Ten points, **read by eye, ±0.002**: round 1 ≈ 0.958, 2 ≈ 0.985,
3 ≈ 0.975, 4 ≈ 0.966, 5 ≈ 0.973, 6 ≈ 0.968, 7 ≈ 0.958, 8 ≈ 0.975, 9 ≈ 0.970, 10 ≈ 0.988. All above the lower
limit; the spread (~0.96–0.99) is the round-to-round sampling noise at n = 20. (The extracted raster is
inverted, white on black; the printed figure is presumably black on white.)

## Deliberately omitted

The literature review of book-level sampling (Miller & Sorum's two-stage design, DiCarlo's sequential sampling,
Fussler and Bookstein's card-file sampling) beyond naming it; the reference list. Cross-checked against the full
five pages.
