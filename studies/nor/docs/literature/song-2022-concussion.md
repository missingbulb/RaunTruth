# Song et al. 2022 — Concussion leads to widespread axonal sodium channel loss and disruption of the node of Ranvier

*Acta Neuropathol 144(5):967–985 · DOI [10.1007/s00401-022-02498-1](https://doi.org/10.1007/s00401-022-02498-1) ·
[PMID 36107227](https://pubmed.ncbi.nlm.nih.gov/36107227/) · read from the NIH author manuscript
(PMC, 33 pages) supplied by the owner.*


*PDF: kept in the study's Drive `Literature` folder as `Concussion leads to widespread axonal sodium channel loss and disruption of the node of Ranvier.pdf`, not in the repo.*

> **Attribution correction.** The first pass of this review cited this paper as "Reeves et al.",
> from a web-search summary. **The authors are Song, McEwan, Ameen-Ali, Tomasevich,
> Kennedy-Dietrich, Palma, Arroyo, Dolle, Johnson, Stewart & Smith.** Issue
> [#6](https://github.com/missingbulb/RaunTruth/issues/6) carries the wrong name.

## 1. What it gives the study

The closest published tissue to the owner's: **periventricular white matter at the lateral
ventricle / corpus callosum junction**, Caspr + Na<sub>v</sub>1.6, confocal, maximum-intensity
projection, in swine.

- **The ceiling for ground truth.** Two blinded investigators scoring these images reached an
  **ICC of 0.73** (§4). Agreement between the finder and one tagger should be judged against that
  spread, and the curated ground truth should be expected to disagree with itself at about that
  level.
- **The nearest reference length for corpus callosum**: sham ~1.05 µm, on an undefined "gap size"
  definition (§2, §3).
- **Definitions of void nodes and heminodes**, precise enough to implement, with the denominator
  to report them in (§3) — what the open owner question on counting them separately needs, and
  what a tagger would mark if they are counted. The finder's misses that are faint one-sided
  paranodes look like the heminode case.
- **How much the excluded categories move with injury** (§2): heminodes ~3% in sham, about double
  after injury; void nodes ~0.2% → ~1.7%. A detector that requires both paranodes and the Nav
  drops a condition-dependent fraction (R5).
- **Images of our kind.** Figure 3a (sham) is dense CNS white matter with a 10 µm scale bar; the
  R1 iteration used a crop of it as a test image ([`../results/README.md`](../results/README.md)).

**What it does not give:** an operational length rule, the pixel size, any absolute count, or any
number in the text — every value below is read off a plot.

## 2. The numbers (Figure 3)

**Read by eye off the figure's scatter plots**; the paper states none of them in the text, and the
values are in Supplemental Table 2, which is not in the supplied manuscript. Approximate to roughly
±0.05 µm / ±0.2 percentage points. Each point is **one animal** (n = 3–4 per group), so the
scatter is between-animal variance, not the node-length distribution.

| Group | Node length (µm) | % void nodes | % heminodes |
|---|---|---|---|
| Sham | ~1.05 | ~0.2 | ~3.2 |
| 6 h | ~1.55 | ~0.55 | ~7.2 * |
| 72 h | ~1.5 *** | ~1.4 ** | ~7.0 ** |
| 2 weeks | ~1.15 | ~1.7 ** | ~6.1 * |

*Significance as marked in the figure, against sham. 6 h has the highest mean length but no
asterisk while 72 h is `***`, consistent with tighter between-animal spread at 72 h.*

- The sham ~1.05 µm is almost identical to Arancibia-Cárcamo's optic nerve 1.02 µm
  ([`arancibia-carcamo-2017.md`](arancibia-carcamo-2017.md)). **Swine, not rat or mouse, and a
  different definition** — a plausibility anchor, not a target.
- Length is **not monotonic in time**: up by 6–72 h, back toward baseline at 2 weeks. A plausibility
  window fitted to sham would cut the injured nodes the study exists to measure.

## 3. Definitions

**Node length is underspecified.** The paper says only that Caspr staining was *"used for measuring
NOR length"* in ImageJ, the axis reads "Node Length (µm)", and the legend says *"node lengths (gap
size)"*. So: the gap between the paired Caspr domains, measured by hand, with **no threshold, edge
criterion or profile** — gap family, recorded as definition C in
[`measurement-definitions.md`](measurement-definitions.md). The first pass of this review recorded
it as *"the distance between the inner edges of the Caspr-positive paranodal regions"*, from a
search summary; **that phrasing is not in the paper.**

**The morphology categories are precise:**

- **Void node** — *"paired Caspr domain in the absence of Na<sub>v</sub>1.6 expression"*; legend:
  *"complete loss of Nav1.6 with normal Caspr labeling paranodal space."*
- **Heminode** — *"unpaired Caspr domain"*; legend: *"loss of Caspr immunoreactivity on one side of
  NOR, with normal or reduced Nav1.6 expression."*
- Percentages are of **the total number of NOR observed**.

Unstated: how Na<sub>v</sub>1.6 "absence" was thresholded for a void node, whether length was
measured on the projection or in 3D, and whether tilted axons were excluded.

## 4. The inter-rater number, and the sampling behind it

**ICC 0.73** between two blinded investigators — good by convention, and on exactly this task
(dense white matter, Caspr + Nav1.6, counting and classifying nodes). A finder that disagrees with
one annotator by less than the annotators disagree with each other has matched the human baseline.

What bears on reading it and the other numbers:

- **Leica SP5, 63× oil NA 1.40, zoom 2**, 10-slice stacks at 0.22 µm, field 0.0445 mm², pinhole
  1 Airy unit for Caspr, maximum intensity projection. The field implies a ~211 µm side, but the
  frame in pixels is never given, so **µm/px cannot be derived**.
- **Colours in the figures: Caspr red, Na<sub>v</sub>1.6 cyan** — a third convention after the
  owner's and the eLife paper's. Nothing may key on colour.
- ROIs (2–4 per animal, ~0.14 mm² total) were **chosen for co-existing APP-immunoreactive axons** —
  a non-random sample biased toward injured regions.

Left out: the injury model and biomechanics, APP and axonal-injury quantification, the βIV-spectrin
/ ankyrin-G / neurofascin-186 results, the human post-mortem cohort, Airyscan/Imaris figure
imaging, antibody detail, and statistics beyond the ICC.
