# How a vessel model is scored against ground truth

The report behind `score` and `SCORING` in [`../algorithm/vascular.py`](../algorithm/vascular.py), written by
following the `designing-a-scoring-method` skill on 2026-11-18 and switched to on the owner's word the same day.
The next change to the scorer starts here. Tests: [`../tests/test_scoring.py`](../tests/test_scoring.py).

## 1. The owner's directions, verbatim

- "hypothesizing on many 'error types' and 'matching types', which need to award any forward progress, and not
  discount an advancement with a bad 'still not right, score zero' which does not help us move forward. Use the
  literature and append that with more online research on how other algorithms are scored (whether for ML training
  or otherwise for regular algorithms)."
- "when you score, you should not differentiate between 'what a person added' vs. automatically extracted - the GT
  is GT. You should assume it's right. You should not read into the origins of an element in GT. 'A person marked
  X' is not a worthwhile point of scoring. You can say 'An element marked as undecided' to be scored somehow, but
  it's not the origin of the marking that matters."
- Unit: "µm of centerline" (chosen over whole vessels).
- "Let's eliminate the notion of candidates. The model either says there's a vessel or not. 'Candidate' is a UI
  notion that can be avoided here."
- "Fragments are not to be judged. This is an implementation detail of the finder. We should only care about the
  3d model we extract in the 3d space. Similarly - lying in the right spot is the same as having the same width:
  there's a 3d overlap of the models."
- "GT UI should decide if it adds the vessel to the model or not. The GT cannot have 'maybe approved' notion.
  Let's approve them in the UI." (`req/vascular/model/no-undecided`)
- Depth: "Full 3D. But in order to give the scorer a chance to 'improve' perhaps you can add a 'twice the diameter'
  leeway on the GT to allow matching with the results, and give it half the score (and perhaps another tier with
  1/4)."
- Widths: "We don't 'give it width at submit' - the width exists from the first second the model exists. There's no
  vessel without width. If you're asking what the default is - we can talk about that (I assume that if the user
  adds a vessel by connecting to another one - you can take that width. Otherwise take the image average, or
  something like that)." (`req/vascular/model/every-width`)

**The shapes.** Answer: one `vessel-model/2` dict as a version returns it (nodes x, y µm, z slices, r; edges with
via points, state `vessel` or `candidate`, `r_a`/`r_b`). Ground truth: a corrected `vessel-model/2` submitted from
the page, read from the three real files (edges `accepted`, `rejected`, `vessel`; `z_step_um` 1; 77, 39 and 62 of
their vessel edges carry no `r_a`/`r_b`). `proposed`, `drawn`, `confidence`, `checked_junctions` and
`reviewed_regions` are never read. **Unit counted: a µm of vessel centerline in the image plane.**

## 2. Error types and matching types

F is the harmonic mean of precision and recall; each row is pinned by a perturbation test.

| Error | Severities tested | Movement | How |
|---|---|---|---|
| vessel missed | 1, 3, 6, 9, all | F falls with each | its µm are fn |
| vessel invented | 1–3 vessels; 5, 20, 60 µm | F falls with each and with length | its µm are fp |
| found in part; a gap | 80, 50, 20 %; gap 1–20 % | by the missing length, nothing more | per-µm credit |
| offset in the plane | 0.2 to 32 µm | most of the credit when slightly off, falling smoothly to 0 | disc overlap, then the tiers |
| offset in depth | 0.5 to 16 slices | the same, by the µm between slices; left out when the file has none | 3D distance |
| whole answer scaled | ×1.01 to 1.2 | falls smoothly | — |
| too thin | ×0.9 to 0.25 | fn grows as 1 − (r/R)² | the truth's disc is partly uncovered |
| too wide | ×1.1 to 8 | fp grows; the excess within twice the diameter counts half | the answer's disc lies partly outside |
| near miss (tubes do not overlap) | beside the tube at 1.5, 3, 4.3 radii | ½ within twice the diameter, ¼ within four times, then 0 | tiers |
| cut into more edges, or fewer | 2, 3, 7 pieces, either model | **no change** | no term reads edges |
| traced twice | 1, 2 extra tracings | each extra is fp, no extra tp | sharing per truth vessel |
| crossing vessel | 90°, same and other depth | found only where the tubes meet; 0 at another depth | 3D overlap |
| answer's candidate | true or false | not part of the model: as if absent | state |
| empty answer / the truth itself | — | F = 0 / F = 1 | — |
| truth states | accepted, vessel, rejected, candidate | the first two are vessels, the others are not | state only |
| truth vessel without a width | joined to a vessel; alone | takes the joined vessel's, else the model's mean | `_give_widths` |
| a width a person set (`width.um`) | — | is the vessel's width | — |
| damaged area (excluded) | — | left out on both sides | — |
| reordered or flipped edges | — | no change | — |

| Matching, strongest first | Worth per µm |
|---|---|
| the tubes coincide (place, depth, width) | 1 |
| the tubes overlap in part | the share of the judged disc inside the other tube |
| outside the truth's tube, inside it widened to twice its diameter | ½ of that share |
| inside four times its diameter | ¼ |
| further | 0 |

## 3. Sources (all read 2026-11-18)

The study's own literature reports aggregate metrics only; the one tracing-against-manual figure is Ji 2021
(> 0.95 accuracy, 3 connectivity errors in 2,133 segments).

| Source | Read how | Taken | Turned down |
|---|---|---|---|
| Citraro, Koziński, Fua, *Towards Reliable Evaluation of Algorithms for Road Network Reconstruction*, ECCV 2020 — https://arxiv.org/pdf/1911.12467 | PDF text read | matching must be one-to-one or a doubled road goes unseen → traced twice counts once; its review of the blind spots of CCQ, TLTS, APLS, JUNC | sampled paths; its junction score; its broken-path worth Σl²/l² (the owner: fragments are not judged) |
| Mayerich et al., *NetMets*, BMC Bioinformatics 2012 — https://pmc.ncbi.nlm.nih.gov/articles/PMC3355337 | page fetched, summarised by the fetch tool | both directions (false negative and false positive rate) per length, the fibre's own radius as the scale, resampling finely | its Gaussian envelope (a free σ); its all-or-nothing connectivity graph |
| Shit et al., *clDice*, CVPR 2021 — https://arxiv.org/abs/2003.07311 | search summary only | centerline-in-tube precision and recall | hard inside/outside; needs masks |
| Kirchhoff et al., *Skeleton Recall Loss*, 2024 — https://arxiv.org/html/2404.03010v2 | page fetched, summarised | recall of the truth's centerline as the per-length quantity | Betti-number errors (integers: no partial credit) |
| DIADEM metric — https://diadem.janelia.org/metric.html | page fetched, summarised | depth treated apart from the plane (considered, see §5) | all-or-nothing node matching; trees only |
| Heipke, Mayer, Wiedemann 1997, completeness / correctness with a buffer | search summary only, and Citraro's account (read) | length-weighted precision and recall | a hard buffer |
| APLS (SpaceNet), TLTS | Citraro's account (read) | — | blind to duplicates; sampled routes |

## 4. The design

```
tubes(model) = its vessel edges walked in 0.5 µm steps: centre (x, y µm; depth = slice × z_step µm), radius
held(k)      = area(answer's disc ∩ truth's disc at k × its radius) / area(the judged disc)
               the truth's disc when a truth step asks how much of it is found,
               the answer's when an answer step asks how right it is;
               centres apart by the 3D distance across the other's centerline; the best of the 8 nearest steps
credit       = held(1) + ½·(held(2) − held(1)) + ¼·(held(4) − held(2))
tp = Σ truth µm × credit          fn = truth µm − tp
fp = Σ answer µm × (1 − credit × share)
share: the answer's µm reaching one truth vessel (a run of edges between junctions) are held to the µm found of it
```

- **Place and width are one measure.** No tolerance constant: the reach is the vessels' own radii. The tiers
  (1, 2, 4 × the truth's diameter at 1, ½, ¼) are the owner's; the step (0.5 µm) only sets the resolution.
- **Why µm and not volume**: a step's share is multiplied by its length, so an artery does not outweigh a hundred
  capillaries, and the totals read in MEASURE's unit.
- **States**: answer `vessel` (and `accepted`) edges are its model, `candidate` is not. Truth `accepted` and
  `vessel` are vessels anywhere, `rejected` and `candidate` are not; excluded polygons are dropped on both sides.
- **Widths**: an edge's `width.um` a person set, else `r_a`/`r_b`, else its points' `r`; an edge with none takes
  the radius of the vessels it joins at the shared points, else the model's mean by length.
- **Provisional labels** (`tiles`): inside the judged tiles, the vessels are the curves judged vessel and the lines
  drawn as missed, at a capillary's 2.5 µm radius, no depth; `not` and `unsure` are not vessels.
- **Chance level** (one stack's v5 against another stack's truth): F 0.013 with the tube alone, 0.030 with the
  half tier, **0.055 (max 0.083) as shipped**. The leeway is what raises it; depth ignored would give 0.079
  before any tier.

## 5. Turned down

- Counting whole vessels with a "within 2.5 µm over half its length" rule (the scorer before): two thresholds, and
  a 3 µm stub weighed as a 200 µm vessel.
- The first proposal's distance kernel with separate direction, one-piece and width shares
  (P .786 R .770 for v5): three free constants, and it judged fragments.
- A softer depth (counted half, or ignored): raises v5's F by .02 / .05 and chance two- to sixfold; the owner chose
  full 3D with the tiers.
- Taking the answer's width where the truth has none (place only): replaced by the owner's default rule.
- Junction and COUNT terms, `checked_junctions`, Betti numbers, APLS, the answer's `confidence`.
- Pure volume overlap (a tube traced twice is one volume): it would let a doubled vessel double MEASURE for free.

## 6. Validation

- **Perturbation tests**: 22, on drawn networks, every row of §2. **Mutations**: 14 (no tiers, one tier missing,
  tiers at full worth, depth ignored, candidates as vessels, rejected as vessels, twice counts twice, width ignored,
  hard in/out overlap, step-to-step distance, excluded ignored, a bare vessel never takes its neighbour's width, a
  person's width not read, tiles unclipped): each fails a test.
- **The truth against itself**: exactly 1 on all three files. **Ceiling**: the truth's accepted edges alone score
  P 1.000, R .886–.901, F .94–.95.
- **Real runs** (3 corrected stacks; `python3 lab/run.py vascular --truth drive`):

  | | before (edges) P / R | tp / fp / fn (µm) | P | R | F |
  |---|---|---|---|---|---|
  | v5 | .925 / .852 | 31,204 / 6,349 / 7,122 | .831 | .814 | .822 |
  | v4 | .912 / .858 | 31,385 / 6,900 / 6,941 | .820 | .819 | .819 |
  | v3 | .877 / .858 | 31,259 / 7,658 / 7,067 | .803 | .816 | .809 |
  | v2 | .880 / .857 | 31,008 / 7,620 / 7,318 | .803 | .809 | .806 |

  The ranking v5 > v4 > v3 > v2 is the one before (which tied v2 and v3) and held under every variant tried (no
  tiers, depth half or ignored, candidates counted). The numbers are lower than before because a vessel half found
  is half credit and because 17 % of v5's own length lies outside every truth tube.
  Without the tiers: v5 .778 / .751, v4 .766 / .754, v3 .750 / .751, v2 .747 / .743.
- **How far to trust them**: the truth is three corrected **v5** models (904 of 1,096 truth edges are v5's own
  curves and widths), so any scorer favours v5, and v2–v5 share one tracer, so offsets and widths are exercised only
  by the vessels added in correction. On the provisional labels (a model's, widthless, flat) v5 scores P .646
  R .521: every traced vessel in a tile the judge did not list is false there, and every label is given one radius;
  not a number to steer by.
- **Where it breaks** (seen on frontal r_1 over the max projection): several vessels added in correction run
  2–4 µm beside the tracer's tube for the same bright vessel; the truth one is then mostly missed and the tracer's
  mostly false, softened to a half or a quarter by the tiers. By "the GT is right" that is the correct reading.

## 7. Open

- The default width of a drawn vessel ("we can talk about that") is the scorer's fallback too; if it changes in
  the page it changes here.
- COUNT and junctions are not rewarded (fragments are not judged); a missed junction costs only its branch's length.
- The pairing was checked against an optimal one-to-one assignment only for the first proposal (0.3 % apart).
