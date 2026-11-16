# Tonioni & Di Stefano 2017 — Product recognition in store shelves as a sub-graph isomorphism problem

*A. Tonioni, L. Di Stefano (University of Bologna, DISI). ICIAP 2017 by common citation; the arXiv page names no
venue · arXiv [1707.08378](https://arxiv.org/abs/1707.08378) (v2, 19 Sep 2017) · open access on arXiv, licence not
checked; annotations offered at the authors' project page (vision.disi.unibo.it) · PDF: study Drive folder `Literature/Product recognition in store shelves as a sub-graph isomorphism problem.pdf` · full text read from the arXiv PDF.*

## What it gives the study

A classical, CPU, three-stage pipeline (detect, prune by neighbour consistency, recover the gaps from the
neighbours) measured stage by stage: **pruning alone raises precision but not recall; the recovery step is what
gets both to ~90%**. R9's gap search and `LONELY` veto are a crude version of stages 2 and 3, so this is the
paper that says what a principled version would add: recovery **ordered by evidence and constrained by the
neighbours**, one gap at a time.

It does not transfer as is: it relies on a **planogram** (which product goes where) and one model image per
product, so its verification knows *which* item to look for. Ours knows only "a spine", and its reference would be
estimated from the same noisy boxes it judges, so a run of false boxes can make itself consistent.

## The two stages that transfer

**Consistency check.** Each detection is a node with edges to its nearest box in each of 8 directions (within a
"dynamically determined threshold", unstated), the closer kept when two compete. A hypothesis (planogram facing,
detection) scores c = coherent neighbours / the facing's neighbours. A greedy branch-and-bound takes the best
hypothesis, removes those reusing its nodes, **raises the scores of its coherent neighbours**, and stops when every
remaining c < **τ = 0.25** (only value reported). Detections left out are false; facings left unmatched are the
missing items, each with an expected position.

**Recovery**, one missing item per iteration:
1. Take the missing item with the **most already-detected neighbours**.
2. Predict its centre from each neighbour's position and size plus the average edge length; average them. The
   search region is that centre, the expected size, and an unstated margin.
3. Search it for that one item; drop proposals overlapping an accepted box; score the rest as the mean of
   closeness to the predicted centre and match confidence, each in [0, 1].
4. Add the best, which then constrains later iterations; if none scores high enough, report the item missing.

## The numbers (70 Grocery Products images, 872 instances, IoU > 0.5)

| Stage (BRISK features in step 1) | Precision | Recall | F |
|---|---|---|---|
| Step 1 | ~.78 | ~.75 | ~.76 |
| + graph check (τ = 0.25) | ~.98 | ~.74 | ~.84 |
| + recovery by BRISK in the region | **.905** | **.903** | **.904** |
| + recovery by ZNCC in HSV | .845 | .840 | .843 |

Figs. 5–7 print these values only as bar labels (assigned to P, R, F by recomputing each F from its P and R, and
checked against the prose).
With a noisier step 1 (BRISK+SURF, .66 / .81) the graph check gives ~.97 / ~.74: more false positives make the search
harder and buy nothing. **Recall falls at the graph check because true detections lack enough coherent neighbours.**
Trust: one small dataset, ground truth and planograms by the authors, the planogram built from the very image tested
(a perfect reference); ~90/90 is an upper bound for the setting. Colour descriptors added nothing; region proposals
(selective search) isolated logos and merged same-coloured neighbours on textured shelves.

## Gaps the study would need

The neighbour-distance threshold, the search-region margin, the "too low" score, and whether τ was swept.

## What to try on a bookshelf (our inference)

- **The graph collapses to a row**: left and right neighbours along a shelf; the reference is the row's own median
  spine width and spacing, the shared foot line and the spread of tops.
- **Pruning:** a box whose width, top or foot departs from *both* neighbours, or that overlaps both, is the
  signature of a post, board edge or frame (R9's precision loss on `1zktX1`). The c ≥ τ rule becomes "agrees with at
  least one neighbour". Tonioni's recall dip warns that a lone true book fails it, R9's `LONELY` failure.
- **Recovery:** visit the gap with the most confident neighbours first, predict the spine's span from the neighbours'
  edges and the row's median width, search that span alone at a lowered seam threshold, drop proposals overlapping
  accepted boxes, score by (closeness + seam/texture strength)/2, add the winner and let it constrain the next gap.
  R9's gap search (`GAP_MIN` 0.6 widths) does one pass in fixed order; the iterative order is what is new.
- Region proposals failing on same-coloured neighbours is the caveat on our Felzenszwalb regions.

Left out: the feature-type comparison, the pose voting of step 1, the search's bound and penalty terms, runtime,
the business motivation and related work.
