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
- **Owner's copy:** the 5-page article with a text layer. Read in full.
- **Thesis:** instead of shelf reading every book on a schedule, sample about 10% of a collection's shelves, estimate
  the share of correctly shelved books, and shelf-read only when that estimate falls below a control limit.

## What it gives the study

Little: a statistics-of-sampling paper with no imaging, and shelf order is out of the study's scope (the page boxes
and reads books; it does not check order — [topics/library-inventory.md](topics/library-inventory.md)). It matters
only if a library mode is ever built, and then for three facts:

- **"Misshelved" is a purely local test.** A book is misshelved when its call number is greater than its right
  neighbour's or less than its left neighbour's. An order checker over our reads would need only adjacent pairs in
  the order the books stand, which the ground-truth task already walks (`inPlace`).
- **The rate to detect is small.** The accuracy rating AR = 1 − (misshelved per shelf ÷ books per shelf), the share
  of books in order, was **.97, .93, .97, .98** in four academic collections at Kansas State's Hale Library (census,
  Table 2). A few misplaced books per hundred is the signal; a photo tool that misreads more books than that would
  drown it (our inference). AR is not a detection or reading accuracy and must not be set beside our precision and
  recall.
- **Sampling ~10% of shelves is enough for the decision.** Recommended: simple random sampling of non-empty shelves
  without replacement, the sample mean of misshelved books per shelf, AR̂ = 1 − ȳ / µₓ, a control chart with a lower
  limit two or three standard errors below the target (managers chose target 0.97, limit 0.935), and shelf reading
  only once a round falls below it. In the one monitoring run (anthropology, 10 rounds of n = 20 shelves, about 14%
  of its shelves) no round fell below 0.935; Figure 1's points, read by eye, spread ~0.96–0.99.

What it does not give: locating or reading books, home shelves, time per shelf, or how far a misplaced book sits
from its place (Newton Miller 2010 has that). Collection sizes, misshelved totals and how Table 2's limits were
derived are not reported; one library, four collections, one short monitoring run.

Left out: the comparison with ratio and adaptive cluster sampling (both rejected, relative efficiencies 1.07–1.21),
the speculated causes of misshelving, the Excel tooling, the review of book-level sampling and the figure's
point-by-point readings; cross-checked against the full text.
