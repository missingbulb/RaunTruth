# Talker 2013 — Book Spine Segmentation for Bookshelf Reorganization

*Lior Talker (supervisor Yael Moses), M.Sc. dissertation, Efi Arazi School of Computer Science, IDC Herzliya
(now Reichman University), July 2013. Conference version: Talker & Moses, "Viewpoint-independent book spine
segmentation", WACV 2014. No DOI for the thesis; it was found at runi.ac.il (URL in [SURVEY](SURVEY.md)). Openly
downloadable, licence not stated. Full text read from the thesis PDF. PDF: study Drive folder `Literature/Book Spine Segmentation for Bookshelf Reorganization.pdf`.*

## What it gives the study

The one classical segmenter built for leaning books under perspective and scored with a stated match criterion. Its
loop has R9's shape (too many candidates, then a choice), and four of its pieces answer open R9 failures:

- **A seam test that does not depend on contrast**, for the dark plain spines our Sobel |gx| > 40 misses: the edge
  energy is the mean angle between the edge normal and the gradient direction, magnitude ignored, threshold 17°.
- **Shelf feet fitted robustly from the candidates**, the version of R9-frame that would not fit the over-tall
  false boxes.
- **A scale-free size filter** against posts and wedges, in place of fixed constants (`ASPECT` 2.5).
- **A rule for when to split a box**, for the Henderson split-at-lettering case that `most_books` always takes.

It does **not** give a comparable score (stricter match, frame-cut spines dropped) or a maximum-weight independent
set: the thesis's selection is a heuristic tree (below). It needs one vanishing line, which we dropped with the
perspective check (the owner's call, R6).

## The method, as far as the study would reuse it

- **Assumption:** every spine lies in a plane parallel to one plane, so all spine vanishing points lie on one
  vanishing line ℓ; books may lean differently (weaker than a Manhattan world).
- **Seeds:** line segments longer than **10% of the image height or width**, **10 seeds** each along both sides,
  **5 px** off the line; initial lean from the dominant edge orientation in a **50×50** window.
- **Candidate growth:** a perspective rectangle (four distances from the seed plus a lean α) grows 1 px per round per
  active side. A side stops when its energy E is a local minimum, E < t_G, and an adjacent side's extension has
  energy above β·t_G; that third condition is what lets a side pass through lettering and colour patches inside a
  spine. It restarts when E > λ·t_G (λ > 1; the prose writes "<", Algorithm 1 ">"). α is re-chosen each round among
  **10 values in ±5°**. **t_G = 17°** for every result.
- **Shelves:** Hough or line detection of the shelf edge failed (occlusion, clutter). Instead **RANSAC over the
  candidates' lower vertices**, up to **10** runs each excluding earlier inliers; lines not sharing one vanishing
  point dropped. A candidate is kept only if it rests on a shelf or, recursively, on a kept candidate (piles).
- **Size:** each candidate is moved to one reference location by a perspective-aware homography, then dropped when
  its normalised side length is more than **1σ below or 2σ above** that photo's mean (§3.2.1; Table 5.2's caption
  says **2.5σ above**).
- **Containment graph and tree rules:** an edge i → j when |R(j)∩R(i)| / |R(j)| ≥ **0.75**; near-duplicates
  clustered by height only (cutoff 5% of the shortest), one kept, then a forest. Bottom-up, per parent:
  - **horizontal span:** adjacent, non-intersecting children cover the parent, at least one has the parent's height
    (tolerance unstated), widths sum to the parent's → the parent is dropped (the split wins);
  - **vertical oversegmentation:** a child covers the parent's bottom and the parent's unshared side edges are
    unsupported (energy > t_δ) → the child is kept;
  - otherwise the parent is kept.

## Numbers to place ours against

- **Match:** min(|c∩g|/|c|, |c∩g|/|g|) ≥ **0.8** (Hoover index); both ratios ≥ 0.8 forces IoU ≥ 0.667 (our
  inference), **stricter than our IoU > 0.5**. Ground truth drops spines cut by the image border.
- **Data:** Set 1, 45 images / 1163 spines, mostly one shelf, uniform lean; Set 2, 27 images / 1235 spines,
  arbitrary leans, several shelves, perspective. Internet and the author's photos.
- **Results:** Set 1 P 80.74 / R 87.27 / F 83.87; **Set 2 P 70.44 / R 72.55 / F 71.47**. One parameter set,
  tuned by the author on the same images; no held-out split, variance or per-image breakdown.
- **By stage** (Table 5.2): candidates reach recall **95.10 / 82.19** at precision ~38; after the tree rules 80.7 /
  70.4. The tree rules cost the most recall (~7 points). The table is ambiguous (precision appears to fall at the
  clique step; the columns may be single constraints, not cumulative).
- **Shelf lines** by eye: recall **88.14%**, precision **58.43%**; missed shelves have few or misaligned spines.
- **Sensitivity:** flat for t_G in [15°, 23°], the above-mean cut in [1σ, 3σ], the below-mean cut in [0.5σ, 1.5σ].

Set 2's P 0.70 / R 0.73 cannot be compared with R9's P 0.67 / R 0.89: re-grade ours with the min-coverage ≥ 0.8 rule
and frame-cut books excluded (both of `1g4iFN`'s misses are frame-cut) before setting them side by side.

**Failures** named: several spines merged into one, an over-extended spine, a partial spine. **Rejected:** long-line
pairing (texture creates false lines), Chan–Vese (assumes near-constant colour), Manhattan rectangle detectors, and
general segmenters (OWT-UCM measured at F 32.68 / 17.59; mean shift and Felzenszwalb argued against: their segments
never have a spine's shape, a caveat on our `books.regions`).

## Gaps the study would need filled

β, λ, t_δ, the iteration cap, the horizontal-span height tolerance, the RANSAC inlier distance, candidates per
image, runtime, image resolutions, code or data ("will be available"). **No maximum-weight independent set appears
anywhere in the thesis**; the MWIS that [README](README.md) and [SURVEY](SURVEY.md) attribute to Talker & Moses
comes from the WACV 2014 abstract and is unverified here.

## What to try (our inference)

- Score each candidate side line by its mean gradient-direction error on the rows it crosses, at about 17°: the
  "seam test that holds on dark books" R8-B's revisit condition (in [WARMUP](../WARMUP.md)) asks for.
- Fit a foot line per shelf by RANSAC over all candidates' feet before selection, not over the kept boxes.
- A per-shelf σ cut on height and width, against the posts and over-tall wedges on `1zktX1`.
- Let a split win only when the children's widths sum to the parent's and one matches its height.

Left out: the reorganiser (chapter 4: its homographies and rendering, beyond their use in the size filter), the
vanishing-point energy's terms, the BSDS metrics and the OWT-UCM table's other columns.
