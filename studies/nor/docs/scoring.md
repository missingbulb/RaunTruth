# How the NoR finders are scored

The study's scorer since 2026-11-18, when the owner switched to it ("Switch both", lengths as "Half the credit"):
[`studies/nor/algorithm/truth.py`](../algorithm/truth.py) (`score`, `SCORING`), tested by
[`studies/nor/tests/test_truth.py`](../tests/test_truth.py) on drawn files. It redefines precision and recall (soft, one-to-one
counts), so **no number recorded before that day compares with one after**; every finder and preset was re-measured
(`python3 lab/run.py nor --write`). This file is the record the next change starts from: the error types, the
matching types, the sources, what was turned down and the validation.

## 1. The owner's directions, and the shapes

In the owner's words:

- "hypothesizing on many 'error types' and 'matching types', which need to award any forward progress, and not
  discount an advancement with a bad 'still not right, score zero' which does not help us move forward. Use the
  literature and append that with more online research on how other algorithms are scored (whether for ML training
  or otherwise for regular algorithms)."
- "when you score, you should not differentiate between 'what a person added' vs. automatically extracted - the GT
  is GT. You should assume it's right. You should not read into the origins of an element in GT. 'A person marked X'
  is not a worthwhile point of scoring. You can say 'An element marked as undecided' to be scored somehow, but it's
  not the origin of the marking that matters."
- From the Vascular round: "The GT cannot have 'maybe approved' notion"; the model "either says there's a [unit] or
  not"; a finder's implementation details are not judged, only its model against the truth.

**The unit** is a NoR: a place and three lengths (`length`, `red`, `width`).

**The answer**: `cands`, each `{cx, cy, fail, m: {length, red_length, width}, lines}`. Its NoRs are the candidates
with `fail` None. A failed candidate is an implementation detail, not part of the answer.

**The ground truth**: no file a person submitted exists yet for NoR (its Drive folder is empty), so the /3 shape was
read from the page's writer (`studies/nor/web/gt_actions.js`) and the test fixture, not from a real file; the only
real file is the lab's own `lab/truth/claude_v1.json` (/2 shape: 200 points, 72 NoR, 93 not, 35 undecided).

| what the file holds | its state | scored as |
|---|---|---|
| /3 candidate or added NoR with `approved` | a NoR | a truth NoR, with its lines (edited ones over the first) |
| /3 candidate or added NoR without `approved` | undecided | neither a miss nor an invention |
| /3 element its history deleted and the file no longer lists (either kind) | not in the truth | the scorer reads the model alone, never the history (owner's call, issue 1100, 2026-11-26): an answer NoR there is an invention only where a check covers it |
| /4 `checked` box, or /3 `areas` | those pixels, that area, were checked for missed NoRs | every answer NoR in it is judged |
| /2 label 1 / 0 / null | a NoR / not / undecided | as above; points, with no lengths unless the label carries them |

**Where today's scorer reads origin** (all removed): 12 px for an added NoR against 5 px for the rest; negatives only
from deleted finder candidates; `missing_proposed` over added marks only; length error over "adjusted or approved"
lengths only; an added NoR placed at its length line's middle and a candidate at its own point.

## 2. Error types and matching types

F is 2tp / (2tp + fp + fn). Each row's movement is asserted in `tests/test_truth.py`.

| error | at rising severity | what the score does |
|---|---|---|
| a NoR missed | 1, 5, 12, all | fn +1 each; F falls each time; all missed is 0 |
| a NoR invented, where the truth knows the place (a checked area, or on a not-a-NoR element) | 1 to 4 | fp +1 each |
| a NoR invented where the truth says nothing | any | nothing: the truth is incomplete there, not the answer wrong |
| placed off | within 0.25 red length; 0.25 to 1; beyond | full; credit falls evenly to 0; unpaired. No step at either end |
| found, lengths wrong | red 10%, 20%, 30% off; all three 3x | half the credit is the place; the other half falls with the lengths |
| one NoR split into two | halves on the node; halves off it | one half paired for what it is worth, the other a duplicate. **About the cost of a miss**, see §6 |
| two merged into one | one answer between two truths | paired with the nearer, partly; the other a miss. Better than missing both, worse than both |
| duplicate | 1, 2 | earns nothing, fp + its closeness to the NoR |
| whole answer shifted | 3, 5, 7, 9 px; a node length | falls evenly; 0 at one red length |
| whole answer scaled | 2% to 20% either way | falls: places drift and lengths disagree |
| empty answer, or every candidate failed | | 0 |
| answer on an undecided element | on it, beside it | nothing on it; counts by how far beside |
| truth incomplete | no checked areas, sparse labels | only answers near a decided element are judged; said in `SCORING` |
| a candidate proposed and then failed, on a truth NoR | | not in the score (the model says NoR or not); reported beside it as `proposed` |

| matching type, strongest first | when | worth |
|---|---|---|
| same place: both points, or both red lines' middles, within 0.25 of the truth's red length | always | closeness 1 |
| near: up to one red length apart | always | closeness falling evenly from 1 to 0 |
| lengths agree (smaller over larger, less the chance level) | only on a pair already made, when the truth carries lengths | half of the pair's quality |
| an exact id | never used | a candidate id names a finder's run, so pairing by it would read origin |

One signal pairs (closeness); it is solved greedily, closest first, one-to-one. Lengths never pair, they only grade.

## 3. The scorer

```
answer NoRs  = candidates with fail None          truth NoRs = elements whose state is "a NoR"
closeness(a, t) = clip((1 - d / s) / 0.75, 0, 1)
    d = the smaller of: point to point, red-line middle to red-line middle (whichever both carry)
    s = t's red length; a truth with no lines: the answer's median red length
pair one-to-one, highest closeness first
quality(pair) = closeness                                   when the truth NoR has no lengths
              = closeness * (1/2 + 1/2 * agreement)         when it has
    agreement = mean over length, red, width of max(0, (min/max - chance) / (1 - chance))
tp = sum of quality
fn = sum over truth NoRs of 1 - quality          (1 when unpaired)
fp = sum over answer NoRs of (1 - quality) * knows * (1 - closeness to the nearest undecided element)
    knows = 1 in an area checked for missed NoRs, else closeness to the nearest element marked NoR or not
```

Constants, each a measured or stated scale, none in pixels:

- **0.25 red length, full credit**: the spread of two descriptions of one node. Between finders on the reference
  slide, 88% of nearest-NoR distances under one red length are under 0.25, and a candidate's own point sits a
  median 0.11 (90th percentile 0.27) red lengths from its red line's middle. Also the slack Acerbis et al. use.
- **1 red length, no credit**: two marks a whole node apart are not on one node. The distances between finders have
  their valley here (1027, 648, 172 pairs under 0.1, 0.25, 0.5; 34 and 16 in 0.5 to 1; then 77, 100, 139 beyond).
- **chance 0.83 / 0.73 / 0.78** for length / red / width: the mean smaller-over-larger of unrelated NoRs on the
  reference slide. Lengths here vary little, so an uncorrected ratio would hand 0.8 to any pair.
- **half and half**, place and lengths: stated, not measured. The owner's call ("Half the credit", 2026-11-18).

## 4. Sources

Read 2026-11-18 unless said. "Primary" means the paper's PDF text or the code itself was read.

| source | read as | taken | turned down |
|---|---|---|---|
| Acerbis et al. 2025, cell detection in cytology, https://arxiv.org/pdf/2504.06957 | primary (PDF) | Hungarian pairing of centroids; **no error within a slack of 0.25 of the object's size, rising linearly to a threshold of one size**, continued past it "to avoid a discontinuity" | their separate weight for fp against fn |
| Kirillov et al. 2019, Panoptic Quality, https://arxiv.org/pdf/1801.00868 | primary (PDF) | a matched pair adds its quality, not 1, to the numerator; **void regions: predictions there are not evaluated** (our undecided elements and unchecked ground) | its IoU > 0.5 gate before any credit: the step this work exists to remove |
| Oksuz et al. 2021, LRP error, https://arxiv.org/pdf/2011.10772 | primary (PDF) | a true positive carries its own localisation error into the total beside fp and fn; their criticism that AP hides localisation quality | the normalisation by 1 - tau, which keeps a hard gate |
| Luiten et al. 2020, HOTA, https://arxiv.org/pdf/2009.07736 | primary (PDF) | one-to-one pairing maximising similarity; reporting localisation apart (our `found` beside `tp`) | averaging over thresholds: one ramp says the same in one pass |
| COCO keypoint evaluation, `pycocotools/cocoeval.py`, https://github.com/cocodataset/cocoapi | primary (code); the cocodataset.org page returned only its menu | similarity scaled by the object's own size (`/ area`), never pixels; **crowd and unlabelled truths are "ignore": a detection on one is neither right nor wrong** | the Gaussian fall-off: it never reaches 0, so every far pair keeps some credit and chance pairs add up |
| Zhou et al. 2019, L-CNN `metric.py`, https://github.com/zhou13/lcnn | primary (code) | a truth matched once only, so a second detection of it is a false positive | endpoint distance as the signal: the page's width line has no fixed place along the node |
| OCELOT 2023 evaluation, https://ocelot2023.grand-challenge.org/evaluation-metric/ | **search summary only** (the page returned 403) | a tolerance in microns (3 um) rather than pixels; greedy pairing | confidence ordering: an answer has no confidence |
| LYON19, https://lyon19.grand-challenge.org/Evaluation/ | search summary only | a hit radius stated in microns | |
| Sage et al. 2019, SMLM challenge, https://pubmed.ncbi.nlm.nih.gov/30962624/ | search summary only | detection (Jaccard) and localisation (RMSE) reported side by side | |
| Matula et al. 2015, Cell Tracking Challenge DET/AOGM, https://doi.org/10.1371/journal.pone.0144959 | search summary only | a split is its own error type with its own cost | weights by the effort to fix by hand: none measured here |
| The study's literature: `appeltshauser-2022-polyneuropathy.md`, `song-2022-concussion.md`, `linke-2025-dstorm-toolkit.md`, `measurement-definitions.md` | the repo's summaries | precision and recall, not a count ratio (equal misses and inventions score 100% there); two people agree at ICC 0.73 on this task, so lengths get graded credit, not a pass mark; "node length" has several definitions, so the truth's own lines are compared, never a re-measurement | Dice on masks (Linke): the truth holds lines, not masks |

Also weighed and turned down: scaling the tolerance by the answering NoR's own red length (a 23 px red blob of `blobs`
then earned 0.28 from a NoR 18 px away); placing every NoR at its red line's middle only (a `walk` NoR standing
exactly on its label then scored 0.48, because the labels are candidates' own points); counting a failed candidate as
partial credit (against "either says there's a unit or not").

## 5. Validation

**Looked at first**: `tl`'s pairings drawn over the reference slide (pairs, misses, inventions and the answers the
truth says nothing about, in white, blue and violet, checked against the slide's brightest pixels). The render and
the scripts behind this section were shown in the session and are not in the repo. What it showed: most of `tl`'s 222 NoRs are dots. **The truth judges about a quarter of the answer**, so every
precision below is over those alone.

**Real runs**, the reference slide, the lab's labels (tp/fp/fn under the rule before, then under this one; dataset SHA in `web/algorithm_metrics.json`):

| finder | precise | balanced | recalling | unfiltered |
|---|---|---|---|---|
| tl | 34/2/38 → 34.1/3.5/37.9 | 46/5/26 → 45.9/7.2/26.1 | 49/7/23 → 49.2/10.2/22.8 | 61/20/11 → 61.6/24.2/10.4 |
| rf | 35/4/37 → 35.5/6.4/36.5 | 48/9/24 → 48.7/13.2/23.3 | 52/10/20 → 53.0/14.2/19.0 | 62/17/10 → 62.6/24.3/9.4 |
| fill | 32/3/40 → 32.5/4.3/39.5 | 43/5/29 → 43.6/6.4/28.4 | 48/8/24 → 48.9/10.0/23.1 | 61/19/11 → 62.0/22.0/10.0 |
| walk | 31/4/41 → 31.9/5.6/40.1 | 37/6/35 → 38.0/7.6/34.0 | 43/11/29 → 44.0/13.3/28.0 | 63/32/9 → 63.5/34.6/8.5 |
| blobs | 28/8/44 → 28.7/10.1/43.3 | 36/9/36 → 37.9/11.7/34.1 | 42/13/30 → 45.0/16.2/27.0 | 64/38/8 → 65.8/40.9/6.2 |

Balanced, precision / recall / F: tl 0.902/0.639/0.748 → 0.865/0.638/0.734; rf 0.842/0.667/0.744 → 0.786/0.677/0.727;
fill 0.896/0.597/0.717 → 0.872/0.606/0.715; walk 0.860/0.514/0.643 → 0.833/0.527/0.646; blobs 0.800/0.500/0.615 →
0.764/0.526/0.623. The ranking by F is unchanged (tl, rf, fill, walk, blobs). These numbers are indicative only: one
slide, labels made by Claude from two finders' candidates.

**Where the two disagree**, per truth NoR: label 132 at (786, 772). All five finders pass a NoR 5.5 px from it, on the
same node (the crop was looked at: the label sits at the node's upper edge). Old: a miss for all five, by half a
pixel. New: 0.56 to 0.65. Likewise `blobs` on labels 7 and 117 (5.5 px, 0.63 and 0.64), `walk` on 6, `rf` on 74 (0.40)
and 9 (0.12). The new one is right in each: these are the near misses the old rule zeroed. The new fp is higher
everywhere because a second answer NoR beside a paired truth NoR, and the off part of a pair, now count; the old
rule let one pass sit on several spots for free.

**Pairing**: greedy against `linear_sum_assignment` on all 20 real answers: gap 0.000 in every one.

**Ceiling**: the truth scored against itself is 72/0/0, F 1. No two truth NoRs reach each other on this slide.

**Chance**: against the truth mirrored left to right, 7 to 10% of elements get any closeness and the mean best
closeness is 0.03 to 0.05, against 0.53 to 0.68 on the real truth. Not zero: the slide is dense (a NoR every 30 px).

**Bias**: the labels were drawn from `fill`'s and `blobs`' candidates, so those two stand exactly on them. With no
slack `fill` would lead (0.682 against tl 0.648); the slack removes that edge, and what remains of it is in which
NoRs were labelled at all. The lead of any finder here is partly the truth's origin.

**Sensitivity** (balanced F; tl, rf, fill, walk, blobs): reach 0.75: .733 .732 .719 .647 .626; reach 1.5: .723 .713
.699 .636 .616; slack 0.5: .744 .732 .715 .649 .632. The order holds; tl and rf are within noise of each other.

**Tests**: the 26 perturbation tests pass. Ten mutations of the scorer (a hard threshold, pairing not one-to-one, undecided ignored, checked
areas ignored, only deleted candidates as negatives, lengths unscored, failed candidates counted, and three more)
each fail 1 to 8 tests.

**Not validated**: the /3 path and the lengths' half on real data. No real /3 file exists; both are tested on drawn
files only. Re-run this section when the first curated file arrives.

## 6. Where it breaks

- **A split scores about what a miss does**, and below it when the truth carries lengths (two half-length NoRs: one
  pair at half quality, one duplicate). One-to-one pairing cannot credit both halves. Mending a split always gains.
- **Unlabelled neighbours**: with sparse truth, a real NoR 6 to 10 px from a labelled one takes a small fp (its
  closeness to the neighbour). Checked areas remove this.
- **A truth with no lengths** borrows the answer's median red length as its scale, so an answer's tolerance depends
  slightly on the answer.
- **Two places for one NoR** (its point, its red line's middle), the nearer taken: forgiving by up to 0.27 red length.

## 7. Decided, and still open

Decided on 2026-11-18:

- **Lengths are half the credit** of a pair, where the truth carries them (the owner: "Half the credit").
- **Undecided counts for nothing, everywhere**, also inside an area checked for missed NoRs: a default taken from the
  owner's earlier rulings, not asked anew.
- **An answer on ground nobody judged counts for nothing**: the same kind of default.
- **A split scores about as a miss**: left as designed (§6).

Open:

- **A split that adds coverage should cost less.** The owner ruled so for Shelves (a spare piece that adds coverage).
  Not applied here: a NoR is paired as a whole, so crediting a second half needs pairing by parts of the node, which
  is neither cheap nor tested yet.
- **The lab's item tools** (`lab/items.py`) read one yes or no per graded element: `hit` is quality of at least 0.5
  for a NoR, and an answer NoR at least 0.5 close for an element marked not one. A soft version is theirs to grow.
