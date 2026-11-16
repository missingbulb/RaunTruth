# Talker 2013 — Book Spine Segmentation for Bookshelf Reorganization

*Lior Talker (supervisor Yael Moses), M.Sc. dissertation, Efi Arazi School of Computer Science, IDC Herzliya
(now Reichman University), July 2013. Conference version: Talker & Moses, "Viewpoint-independent book spine
segmentation", WACV 2014. No DOI for the thesis; it was found at runi.ac.il (URL in [SURVEY](SURVEY.md)). Openly
downloadable, licence not stated. Full text read from the thesis PDF. PDF: study Drive folder `Literature/Book Spine Segmentation for Bookshelf Reorganization.pdf`.*

**Why it matters to us:** it is the one classical segmenter built for leaning books under perspective, scored with a
stated match criterion. Its loop has the same shape as ours: generate too many candidates, then pick.

## Method, step by step

**Assumptions.** Every spine lies in a plane parallel to one plane π. So every spine's edge vanishing points lie on
one vanishing line ℓ, and each spine has its own orthogonal pair (v, v⊥). This is a weaker assumption than a
Manhattan world: books may lean differently.

**0. Initialisation.**
- *Vanishing line.* The two dominant orthogonal vanishing points v⁰ and v⁰⊥ come from Tretyak et al.'s joint
  edge/segment/line/VP energy (IJCV 2012). The method assumes they lie on π because "the image contains a sufficient
  number of books".
- *Calibration K.* Square pixels, no skew and a centred principal point are assumed. The focal length then follows
  from orthogonality: f² = −(v⁰ₓv⁰⊥ₓ + v⁰ᵧv⁰⊥ᵧ). Any other orthogonal pair is v(α) = K R(n̂, α) K⁻¹ v⁰, and v⊥(α)
  likewise (Eq. 3.6).
- *Seeds.* Line segments come from Košecká & Zhang's detector. Only those longer than **10% of the image height or
  width** are kept. Each gets **10 seeds** at equal spacing along it, on **both sides**, **5 px** off the line.
- *Initial lean α₀.* The dominant edge orientation in a **50×50** window around the seed, from a third-order edge
  operator (Tamrakar & Kimia). That direction is intersected with ℓ to give v, and α₀ = arccos(û·û⁰) with
  û = K⁻¹v.

**1. Candidate expansion.** A spine is a perspective rectangle (PR) with 5 parameters: four distances dᵢ from the seed
s, each measured along the direction of the opposite vanishing point, plus α (Eqs. 3.1–3.2). The vertices are
intersections of lines through qᵢ and their vanishing points.
- *Edge energy* E(e) is the **mean angle between the edge normal and the image gradient direction** along the edge
  (Eq. 3.3). Gradient magnitude never enters it.
- *Start.* All dᵢ = 1 and all four are active. In each round every active dᵢ grows by 1 px.
- *Stopping an edge.* dᵢ goes inactive when all three hold: E(eᵢ) is a local minimum in dᵢ; E(eᵢ) < t_G; and at least
  one adjacent edge's extension segment (the stretch its end would gain if dᵢ grew, Eq. 3.4) has energy above β·t_G.
  The third condition is what lets an edge pass through lettering and colour patches inside a spine (Fig. 3.3, iter.
  22).
- *Restarting an edge.* An inactive edge reactivates when E(eᵢ) > λ·t_G, with λ > 1 (hysteresis). The prose writes
  "<", but Algorithm 1 has ">".
- *Lean update.* After each round, α is re-chosen among **10 values in [α_c − 5°, α_c + 5°]** to minimise ΣE.
- *Halting.* The search stops when all four edges are inactive. A PR is kept only if this happens under an iteration
  cap `th`.
- **t_G = 17°** for every reported result.

**2. Selection** (Fig. 3.4; Algorithm 1 runs size → shelves → graph):
- *Shelves.* Direct Hough or line detection of the shelf edge failed: occlusion and clutter, shown in Fig. 5.3. The
  shelf lines are instead fitted by **RANSAC over the candidates' lower vertices (p₄₁, p₃₄)**, run up to **n = 10**
  times, each run excluding earlier inliers. Lines that do not share one vanishing point are dropped (shelves are
  parallel). A PR is kept only if it rests on a shelf or, recursively, on a kept PR (piles).
- *Size.* Every PR is moved to one reference location by Tolba et al.'s perspective-aware planar repositioning, a
  homography H ≃ I + β t̂ n̂ᵀ. This aligns p₄₁, e₁ and e₄ across PRs. A PR is dropped when its normalised e₁ or e₄ is
  more than 1σ below or 2σ above the mean (§3.2.1). Table 5.2's caption says **2.5σ above, 1σ below** were used.
- *Containment graph.* There is an edge vᵢ → vⱼ when |R(vⱼ)∩R(vᵢ)| / |R(vⱼ)| ≥ **γ = 0.75**.
- *Cliques.* A clique (near-duplicate PRs) is clustered hierarchically by **height only**, with a cutoff of 5% of the
  clique's shortest PR. The text says width differences barely matter. One PR per sub-clique is kept at random, and
  the survivors are chained tallest to shortest. Outside edges are reattached to the root. A transitive reduction
  then turns the graph into a forest.
- *Tree rules, bottom-up,* applied to each parent and its children:
  - **Horizontal span.** Adjacent, non-intersecting children cover the parent, at least one has the parent's height
    (within an unstated tolerance), and their widths sum to the parent's. The parent is dropped.
  - **Vertical oversegmentation.** A child covers the parent's bottom, and the part of the parent's side edges that
    the child does not share is unsupported: max E(e₁^Δ, e₃^Δ) > t_δ. The child is kept.
  - **Otherwise** the parent is kept.

## Definitions and evaluation

- *Ground truth.* Hand-drawn. **Only fully visible spines count; spines cut by the image border are discarded.**
- *Match.* A segment is a correct detection when **min(|c∩g|/|c|, |c∩g|/|g|) ≥ 0.8** (Hoover index, which also labels
  over-, under-segmentation, missed and noise). Precision and recall count correct detections only, and their
  harmonic mean is reported as "precision-recall". *Our inference:* both coverage ratios ≥ 0.8 forces IoU ≥ 0.667,
  so this is **stricter than our IoU > 0.5**.

## Data

- **Set 1:** 45 images, 1163 spines. Mostly one shelf, uniform lean, negligible perspective.
- **Set 2:** 27 images, 1235 spines. Arbitrary leans, several shelves, perspective.
- Sources: the internet and the author's own photos. Implemented in MATLAB.

## Results

**How far to trust them:** one parameter set on both sets, tuned by the author on the same images. There is no held-out
split, no variance and no per-image breakdown.

| | precision | recall | F (HI) | SC | PRI | VI ↓ |
|---|---|---|---|---|---|---|
| Set 1 | 80.74 | 87.27 | 83.87 | 77.12 | 91.62 | 1.378 |
| Set 2 | 70.44 | 72.55 | 71.47 | 78.53 | 84.02 | 1.397 |
| OWT-UCM, Set 1 (ODS/OIS) | | | 32.68 / 34.72 | 47.81 / 51.54 | 86.91 | 2.152 |
| OWT-UCM, Set 2 | | | 17.59 / 19.32 | 49.11 / 56.68 | 72.03 | 2.409 |

- **Phase by phase** (Table 5.2). Candidates reach recall **95.10 / 82.19** at precision **~38**. Precision after each
  stage: location 41.6/43.9, size 65.0/67.2, clique 42.5/44.5, tree 80.7/70.4. Recall falls most at the tree rules
  (~7 points).
- **The table is ambiguous** (our reading). The text implies precision fell at the clique step, which a cumulative
  filter rarely does. The columns may be single constraints rather than cumulative ones.
- **Shelf lines,** judged by eye over both sets: recall **88.14%**, precision **58.43%**. Missed shelves are those
  with few or misaligned spines. Indicative only.
- **Sensitivity:** flat for t_G in [15°, 23°], the above-mean size cut in [1σ, 3σ] and the below-mean cut in
  [0.5σ, 1.5σ]. Raising t_G stops edges earlier, which helps weak edges. Fig. 5.1 compares 17° with 20°.

## Failure modes, and what was rejected

**Failures** (Figs. 5.5–5.7): several spines merged into one, an over-extended spine, and a partial spine.

**Rejected or argued against:**
- Long-line pairing (Chen, Quoc, Tsai, Taira): texture creates false lines.
- Chan–Vese energy: it assumes a near-constant colour.
- Manhattan-world rectangle detectors.
- General segmenters: OWT-UCM measured above; mean shift and Felzenszwalb only argued against. Their segments never
  have a spine's shape.
- Hough or long-line shelf detection. The comparison baseline used segments longer than 30% of the image, ≤ 30° from
  horizontal and consistent with a common vanishing point.

## Gaps — what the thesis never states

- β, λ, t_δ, the iteration cap `th`, and the height tolerance in the horizontal-span rule.
- The RANSAC inlier distance.
- How many PRs a typical image yields, and the runtime.
- Image resolutions.
- Whether duplicate correct detections count in the candidate-stage precision.
- Any per-image or per-lean breakdown.
- A code or data URL ("will be available").
- **No maximum-weight independent set appears anywhere in the thesis.** Selection is the heuristic tree above. The
  MWIS that our [README](README.md) and [SURVEY](SURVEY.md) attribute to Talker & Moses comes from the WACV 2014
  abstract and is unverified here.

## Where we diverge / what to take (our inference)

- **A seam test that does not depend on contrast.** E(e), the mean angle between the gradient and the edge normal,
  ignores gradient magnitude. Our seams use Sobel |gx| > 40, which dark plain spines fail. A direction-agreement test
  at about 17° is the kind of "seam test that holds on dark books" that the revisit condition of R8-B (in
  [WARMUP](../WARMUP.md)) asks for. Cheapest trial: score each candidate side line by its mean gradient-direction
  error, on the rows it crosses.
- **Shelf feet from the candidates, robustly.** R9-frame fitted a foot line per shelf and was rejected for fitting the
  over-tall false boxes. Talker uses RANSAC over all candidates' feet before selection. That is the robust version
  of our untried "foot line through a shelf's boxes", and it also explains the "a frame built only from boxes that
  passed `spine`" revisit condition.
- **A scale-free size filter.** Talker compares each candidate's normalised height and width with that photo's own
  mean ± σ. Ours uses fixed constants (`ASPECT` 2.5). A per-shelf σ cut on height and width is a cheap trial against
  the posts and the over-tall wedges on `1zktX1`.
- **When to split a box.** The horizontal-span rule prefers the children only when their widths sum to the parent's
  and their height matches. Our `most_books` always prefers a split. Requiring height agreement from the children is
  a principled test for the Henderson split-at-lettering case.
- **Perspective.** Their method depends on one vanishing line. We dropped our perspective check (the owner's call,
  R6), and their F falls from 84 to 71 on the perspective set. Leaving perspective out is our choice, not a gap in
  the literature.
- **Comparing scores.** Their GT drops frame-cut spines, which is both of `1g4iFN`'s misses, and their match is
  stricter. Set 2's P 0.70 / R 0.73 cannot be compared with our R9 P 0.67 / R 0.89. To compare, re-grade ours with
  the min-coverage ≥ 0.8 rule and with frame-cut books excluded.

## Deliberately omitted

Omitted as outside detection:
- Chapter 4, the reorganiser: the derivation of the translation and rotation homography and the OpenGL rendering.
  Only its use in the size filter is kept above.
- Tretyak's energy terms beyond their role.
- The BSDS metrics' definitions.
- Acknowledgements and the Hebrew abstract.

Cross-checked against the full 51-page text.
