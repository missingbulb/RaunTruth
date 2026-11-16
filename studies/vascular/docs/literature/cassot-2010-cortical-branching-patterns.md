# Reference digest — Cassot et al. 2010, branching of human cortical arterioles and venules

- **Title:** *Branching patterns for arterioles and venules of the human cerebral cortex*
- **Authors:** **Francis Cassot\*** (\*corresponding, francis.cassot@inserm.fr), Frédéric Lauwers,
  Sylvie Lorthois, Prasanna Puwanarajah, Valérie Cances-Lauwers, Henri Duvernoy. INSERM U825
  Toulouse; Fluid Mechanics Institute of Toulouse; Oxford.
- **Venue / id:** *Brain Research* **1313**:62–78 (2010), available online 11 Dec 2009.
  DOI **10.1016/j.brainres.2009.12.007**. Paywalled; PDF supplied by the owner (2026-10-29). 17 pages.
- **PDF:** kept in the study's Drive `Literature` folder as `Branching patterns for arterioles and venules of the human cerebral cortex.pdf`, not in the repo.

## What it gives the study

The largest measured set of single-junction geometry in brain vessel trees (9,414 bifurcations),
and with it what the scorer may and may not ask of a junction in the vessel model:

1. **Murray's law is too loose to score one junction.** The per-junction exponent has median 3.58,
   IQR 2.28–6.14, 5–95% range 1.36–16.33. Penalize only far outside that range (B8).
2. **The thinnest branch is the reliable signal, not "the widest is the parent".** The larger
   daughter is wider than the parent in ~40% of junctions, the smaller daughter in under 10%. At a
   tree junction the thinnest of three is a daughter; which of the other two is the trunk is close
   to a coin toss on width. This is what the scorer's narrowing check and any flow direction from
   `r_a`/`r_b` can rest on (B8, B10).
3. **Junction angles are wide, and optimal-angle theory does not predict them.** Daughters sit
   ~104° apart against a predicted 75–83°, with near-zero correlation; even the straighter daughter
   turns ~53° from straight. Score against the measured distribution, never a formula (B4, B9).
4. **Junctions are mostly flat:** over half under 6° out of plane, under 10% over 50°. The
   reference for the scorer's 3D out-of-plane flag, which runs at 4–18% on the stacks (ledger L9) (B4).
5. **How to measure a branch angle:** from tangents where each branch leaves a sphere as wide as the
   widest branch, not from end-to-end chords. The scorer adopted this (ledger L9).
6. **Width steps at junctions:** how much the larger daughter narrows depends on the junction type,
   none to marked (B11).

**What it does not give:** mouse (one human brain), capillaries (trees only), CD31 (India ink),
diameters in µm (in Cassot 2006 / Lauwers 2008), segment lengths, or taper within a segment. It
does not say how arterioles were told from venules, so it offers no cue CATEGORIZE could use.

## The method behind the numbers

- **Tissue:** one human brain (60-year-old woman, no known vascular or cerebral disease), India ink
  + gelatine injected via the six cerebral arteries; right temporal cortex beside the collateral
  sulcus; 300 µm sections; confocal, **voxel 1.22 × 1.22 × 3 µm**, 28.6 mm³ in all.
- **Trees vs capillaries:** each tree traced from its pial origin through vessels below a flow
  resistance threshold (value not stated). Arteriole vs venule assigned "according to their
  morphological features", not specified.
- **Ordering and junction types:** diameter-defined Strahler orders, 0 = terminal branches into the
  capillaries. Junction types by order asymmetry (parent order − smaller daughter order): **ALB**
  asymmetric-lateral (> 1, a small side branch off a continuing vessel), **HSB** homogeneous-
  symmetric (= 1), **IEB** intra-element (= 0).
- **Angle recipe (Fig. 12):** centerlines smoothed with a 5-point weighted filter and resampled by
  cubic spline every 0.5 µm. A branch's direction is the mean of its unit tangents at the last point
  inside and the first outside a sphere centred on the node, radius = the largest local radius of
  the three vessels. α₀₁ parent–larger daughter, α₀₂ parent–smaller, α₁₂ between daughters, as
  angles between outward directions (straight on = 180°). Planarity Ω = α₀₁ + α₀₂ + α₁₂ − π;
  out-of-plane angle = π − Ω (0 = flat).
- **Ratios:** A = cross-section, D₁ > D₂; AER = (A₁ + A₂)/A₀; Murray exponent k solved per junction
  from d₀ᵏ = d₁ᵏ + d₂ᵏ.

## The numbers

**Sample:** 228 trees (152 arteriolar, 76 venular), **9,414 bifurcations** (5,431 arterial, 3,983
venous). Venular trees have ~50% more nodes (over 52 vs under 36). 3 to 5 orders between
precapillary vessel and pial origin. Parent order 1 (next to the capillaries) is 71.3% of junctions;
types ALB 54%, HSB 37.4%, IEB 8.6%.

**Area ratios** (Table 2; log-normal):

| | AER (A₁+A₂)/A₀ | A₁/A₀ | A₂/A₀ | A₂/A₁ |
|---|---|---|---|---|
| Median | **1.519** | **0.905** | **0.608** | **0.721** |
| Mean ± SD | 1.626 ± 0.684 | 0.984 ± 0.46 | 0.642 ± 0.294 | 0.686 ± 0.213 |

A₁/A₀ > 1 in **~40%**; A₂/A₀ > 1 in **< 10%**. Murray (k = 3) caps AER at 1.26; **~¾** of junctions
exceed it. Arteriolar ratios run ~5% above venular. The larger daughter of an IEB arises "without
tapering", of an ALB "with a weak taper", of an HSB "with a marked taper".

**Angles** (Table 3; mean ± circular SD): α₀₁ **127.1° ± 27.3**, α₀₂ **114.5° ± 26**, α₁₂
**103.8° ± 27.4**; always α₀₁ > α₀₂ > α₁₂. Venular daughters sit closer together (smaller α₁₂) than
arteriolar ones; planarity does not differ between them. **Planarity:** mean out-of-plane ~13°;
~⅓ under 2°, over ½ under 6°, ¾ under 20°, under 10% over 50°, a distribution falling steeply from
zero (Fig. 6). Energy-minimization angles (Frame & Sarelius) fall in 75–83° between daughters;
correlation with measured ≈ 0.

**Murray exponent k** (Fig. 9; per-group medians read off its bar labels): all median **3.58**,
IQR 2.28–6.14, 5–95% 1.36–16.33; arterioles 3.61, venules 3.54 (no difference); parent order 1
3.98, orders 2–4 2.73 / 2.75 / 2.89; ALB 3.27, HSB 3.81, IEB 4.46.

## The authors' arguments and limitations

- Optimality is not a valid assumption for microvascular branching; the spread is too wide for
  Murray's law to describe the architecture.
- Human cortex junctions are more 3D than rat arteriolar ones (Zamir 1983: 12% > 10° out of plane).
- Limitations they state: section depth (local ratios and angles do not need whole trees),
  shrinkage (assumed uniform, so ratios hold), post-mortem loss of tone. One subject only;
  BIOLOGY-INVARIANTS' question 6 asks whether mouse junctions share this spread.
- Supplementary Tables 4–7 (significance tests) are online-only and were not supplied.

Left out: the connectivity matrix, the shear-stress reading of k, by-order and by-type angle and
ratio trends beyond those above, the clinical discussion, and the figures not cited here.
