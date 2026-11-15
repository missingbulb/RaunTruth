# Tonioni & Di Stefano 2017 — Product recognition in store shelves as a sub-graph isomorphism problem

*A. Tonioni, L. Di Stefano (University of Bologna, DISI). ICIAP 2017 by common citation; the arXiv page names no
venue · arXiv [1707.08378](https://arxiv.org/abs/1707.08378) (v2, 19 Sep 2017) · open access on arXiv, licence not
checked; annotations offered at the authors' project page (vision.disi.unibo.it) · PDF: study Drive folder
Literature/tonioni-2017-subgraph-isomorphism.pdf · full text read from the arXiv PDF.*

**Why it matters to us:** it is a classical, CPU, three-stage pipeline (detect, prune by neighbour consistency,
recover the gaps from neighbours) that shows pruning alone raises precision but not recall, and the recovery step
is what gets both to ~90%. R9's gap search and lonely veto are a crude version of stages 2 and 3.

## 1. Setting

Input: one roughly frontal shelf photo, **one model image per product**, and the **planogram** (which product
goes where, how many facings). The photo is not localised in the aisle; matching to the planogram localises it.

## 2. Method, step by step

**Step 1 — Unconstrained product recognition.** Lowe-style local-feature pipeline: detect, describe, match
features to every model image, vote in a pose space with a **Generalized Hough Transform** that keeps multiple
peaks (several instances of one product). Pose is **3 DOF: translation and scale** (frontal view assumed, rotations
small). Several feature types can run in parallel and vote into the same pose space. Output: boxes with product
labels.

**Step 2 — Graph-based consistency check.**
- *Reference planogram* I: a grid-like graph, one node per facing, edges to at most **8 neighbours** at one-edge
  distance (N, S, E, W, NE, NW, SE, SW). An edge means proximity in that direction, not alignment.
- *Observed planogram* O: one node per detection; for each, search the 8 directions for another box within "a
  dynamically determined threshold" distance; label the edge by direction (and the opposite at the other end).
  Kept self-coherent (B is A's N ⇔ A is B's S). If two boxes compete for one direction, **keep the closer**.
- *Hypotheses*: every pair (n_I, n_O) of the same product, scored c = n_nc / n_nt, coherent neighbours (same
  product in the same direction in both graphs) over n_I's neighbour count in I.
- *Search* (Algorithm 1, heuristic branch-and-bound over a constraint-satisfaction view of the NP-complete
  problem): FindSolution repeatedly takes the highest-scoring hypothesis (ties: random), removes all hypotheses
  that reuse either node, **raises the scores of hypotheses that are coherent neighbours** of the one taken
  (Fig. 2: 1/8 → 1 + 2/8), and computes an upper bound B_C = |S| + number of mutually compatible hypotheses left,
  abandoning the branch if B_C < C_max. It stops when H is empty or every remaining c < **τ = 0.25**. The solution
  score C is |S| with a penalty for disconnected sub-graphs of O whose relative distances disagree with I. The outer
  loop restarts with the first hypothesis h₀ of each solution removed, keeping the best.
- Nodes of O outside the best solution are discarded as false detections; nodes of I left unmatched are the
  *seemingly missing* items, with a known expected position.

**Step 3 — Product verification (recovery).** Iterative, one missing item per iteration:
1. Pick the missing node with the **most already-detected neighbours**.
2. Estimate its centre from each neighbour's position and size plus the **average edge length** of O; average
   across neighbours. ROI = that centre, the item's expected size (from neighbours and known metric product sizes),
   plus an unstated margin.
3. Search the ROI for *that one product*: template matching or the step-1 features restricted to the ROI and the
   one model.
4. Discard proposals overlapping an already-detected box; score the rest as the mean of two terms normalised to
   [0, 1]: closeness of the proposal's centre to the ROI centre, and match confidence (correlation for templates,
   number of correct matches for features).
5. Add the best to O (it constrains later iterations); if none survives or the best scores "too low", report a
   compliance issue. Repeat until every missing facing is found or flagged.

**Method only in figures:** Fig. 2's toy example is the only statement of the score update (+1 per coherent
neighbour added) and of B_C; Fig. 3 shows the ROI drawn wider than one facing, with several proposals inside;
Figs. 5–7's values are printed only as bar labels (decoded below: the three series assigned to P, R and F by recomputing each F from its P and R, and checked against the prose).

## 3. Data and metric

70 images from the Grocery Products dataset (George et al.), box-like packages (rice, coffee, cereal, tea,
juice, biscuits), **872 instances of 181 products** (~12 per image), re-annotated by the authors with per-instance
boxes, and an ideal planogram hand-built per image. Correct = **IoU > 0.5** (PASCAL); per-image precision, recall,
F, averaged over the dataset.

## 4. Results

Step 1, feature choice (P / R / F, read from Fig. 5's labels): BRISK .78 / .75 / .76 (best F); BRISK/FREAK
.79 / .70 / .74; SURF .71 / .75 / .73; BRISK+SURF .66 / .81 / .72 (best recall); Opponent SURF (colour) .75 / .67 /
.71, no gain from colour; SIFT .68 / .72 / .70; ORB .62 / .79 / .70; AKAZE .70 / .61 / .65; MSD/FREAK .70 / .50 /
.59; KAZE .59 / .51 / .55; BOLD (line segments) .59 / .50 / .54.

| Stage (BRISK in step 1) | Precision | Recall | F |
|---|---|---|---|
| Step 1 | ~.78 | ~.75 | ~.76 |
| + graph check (τ = 0.25) | ~.98 | ~.74 | ~.84 |
| + verification by BRISK in ROI | **.905** | **.903** | **.904** |
| + verification by ZNCC in HSV | .845 | .840 | .843 |
| + verification by Best-Buddies Similarity (RGB) | .839 | .836 | .837 |

With BRISK+SURF in step 1 the graph check gives P ~.97, R ~.74 (from .66 / .81): more step-1 false positives make
the search harder and buy nothing. Recall falls at step 2 because true detections lack enough coherent neighbours
(c < τ). Runtime: ≤ 15 s per image single-threaded on a laptop, ~1 s of it in the isomorphism.

Trust: one small dataset, ground truth and planograms made by the authors, no variance, the planogram built from the
very image it is tested on (perfect reference). The ~90/90 is an upper-bound-style figure for this setting. The
comparison with Marder et al. (recall 90.2% vs 87.4%) is across different, unpublished data and means nothing.

**Rejected alternatives:** region proposals (selective search) + CNN classification: proposals isolate logos and
merge same-coloured neighbours on textured shelves, "by no means" correct segmentations. Template verification
(ZNCC, BBS) loses ~6 points to re-using the features.

**Stated failure modes:** bottles, jars, deformable and texture-less items (local features give too few detections
to build O); distractors such as vivid banner ads; heavy step-1 false positives.

## 5. Gaps

- The **dynamic neighbour-distance threshold** for building O's edges: how it is computed.
- The disconnected-sub-graph **penalty** in C: its form and weight.
- The ROI **margin**, and the "too low" proposal score that triggers a compliance issue.
- Feature-matching parameters (ratio test, Hough bin sizes, minimum votes per pose).
- Whether τ was tuned or swept; only 0.25 is reported.
- Per-stage timing beyond the isomorphism, and the laptop's specification.

## 6. What transfers to a bookshelf / where we diverge (our inference)

- **The graph collapses to a row.** Books stand side by side, so the 8-neighbour graph is left/right neighbours
  along a shelf (N/S become the shelves above and below, useful only for shelf-row consistency). Without a
  planogram, the reference is the row's own statistics: median spine width and spacing, the shared foot line, the
  spread of tops.
- **Consistency pruning:** a box whose width, top or foot departs from *both* neighbours, or that overlaps both, is
  the signature of a post, board edge or cabinet frame (R9's precision loss on `1zktX1`). The c ≥ τ rule becomes
  "agrees with at least one neighbour". Tonioni's recall dip warns that a lone true book fails this, which is
  exactly R9's `LONELY` failure on a book standing alone.
- **Recovery ordered by evidence:** visit the gap with the most confident neighbours first, predict the
  missing spine's span from neighbours' edges and the row's median width (their average-edge-length estimate), search
  only that ROI at a lowered seam threshold, discard proposals overlapping accepted boxes, score by
  (closeness to the predicted span + seam/texture strength)/2, add the winner and let it constrain the next gap.
  R9's gap search (`GAP_MIN` 0.6 widths) does one pass in fixed order; the iterative, neighbour-constrained order
  is the new part.
- **Divergence:** their verification knows *which* product to look for (a model image); ours knows only "a
  spine", so it must be the generic spine test, not template matching. Their reference is perfect and external;
  ours is estimated from the same noisy detections it judges, so a run of false boxes can make itself
  consistent.
- Their negative results transfer: colour descriptors added nothing; region proposals fail on textured,
  same-coloured neighbours, which is our Felzenszwalb-regions caveat.

## 7. Deliberately omitted

Cross-checked against the full 9-page text. Omitted: the business motivation (void-shelf sales statistics),
related-work summaries (Merler, Cotter, George, Marder, robot and camera-network systems), the planned
deep-learning categorisation step (future work only), and the qualitative Fig. 8.
