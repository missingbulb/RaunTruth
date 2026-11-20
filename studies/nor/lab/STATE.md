# NoR detection: current state

Read this first, then `lab/ledger.md` (everything tried, with verdicts). The method is the
`image-algorithm-development` skill in this repo's local pack; what counts as a NoR is
[`studies/nor/docs/requirements.md`](../docs/requirements.md) R7. Update this file in the PR that changes the
state.

_Last updated 2026-11-18._

## Setup
1. `python3 -m pip install -r requirements.txt`
2. `python3 lab/fetch.py nor`: downloads, the first time, the study's images and its curated ground truth into
   `data/raw/`, which is never committed.
3. `python3 lab/run.py nor tl rf`: every finder scored on every image with ground truth (here, the reference
   slide `Slide5_4AP_NoR.sld - Slice1_up_left2.tif` against `lab/truth/claude_v1.json`). An answer is kept in
   `data/raw/runs/` and run again only when `algorithm/` changes.

## Where things stand
- **Default finder: traffic light** (`nor_tl.py`, spec `tl`). 206 passes from 463 candidates.
  On the labels, as the page runs it: 46 real found, 5 false (P 0.90, R 0.64); the finder run with the blue
  mask applied before finding (the old lab path) found 47 / 4. Since
  2026-11-04 it fails its image's faintest tenth of passes (R7, ledger §6 M1a; `red_floor_q=0` turns it off).
- **Red-first finder** (`nor_rf.py`, spec `rf`), built on 2026-09-27 from Ariel's idea, with
  the verdicts in ledger §2 applied. 48 real found, 9 false. That ties tl (P(better) 0.48), so
  tl stays the default.
- **Blue (DAPI) mask:** approved by Ariel for Slide5. It works post hoc in rf (its own
  `nucleus_frac`) and as the page's 'in nucleus' filter for every other finder. Post hoc: fail only when ≥80% of the red lies on the mask.
- **Labels:** `lab/truth/claude_v1.json`, 200 spots labelled by Claude's eye (72 real, 93 not,
  35 unsure), **not by Ariel**. How an answer is scored against them: `../docs/scoring.md` (soft, one-to-one counts since 2026-11-18; numbers recorded before that day, here and in the ledger, are under the old rule, a pass within 5 px of a spot). With 72 real
  spots, a difference of 1-2 is noise.
- **Curated ground truth** (R10, moved to Drive 2026-11-05): people mark candidates (thumbs up/down)
  and missed NoRs on the page and submit them to the study's submissions folder on Drive; a Data
  Manager accepts them into its curated folder (`study.json` `groundTruth`, both `null` until the
  owner makes them). `lab/fetch.py` takes each image's newest curated file, the first time, into
  `data/raw/truth/`, never git, and stops when a folder lists 50 entries; `lab/run.py` scores every finder on
  every image with ground truth. None has arrived yet.
- **Precision and recall per finder and filter preset** (R11, 2026-10-06; the default one filter on, not stick-like, since 2026-11-20, as the page runs it; ledger §7):
  `../web/algorithm_metrics.json`, written by `python3 lab/run.py nor --write`, naming
  the data it was measured on: each image's and ground-truth file's SHA-256 and the dataset SHA. Quote
  that dataset SHA with any precision or recall.
  Presets, the lab's settings and not on the page: precise / balanced (the finder's own) / recalling, every filter 40% towards a fixed
  strict or loose end. Fitting filter values to the labels does not survive held-out labels
  (ledger §5), so don't tune filters per finder on these labels.
- **Filters are not finder-specific** (ledger §5): tl's filter values score as well as or better
  than each finder's own on all five finders.
- **Only one image has been processed.**
- **Browser page** (the shell in `web/` running this study, `studies/nor/requirements.md`): open an image, detect once, then tune every filter
  live. It runs `algorithm/` (the entry `nor_finder.py`) under Pyodide, the same code the lab runs. How it is published
  is the shell's business ([docs/WARMUP.md](../../../docs/WARMUP.md) says how to preview it).
  A finder's `MAIN` tuple names the settings the page shows first; adding a finder to
  `controls.FINDERS` with a `MAIN`, and to `web/algorithms.json`, is all the page needs.

## Owner preferences that are fixed (Ariel)
- **The review render is an API.** It drew every candidate with a pink (pass) or blue (fail) 1-px
  outline around each segment at 3×, a reason letter, numbers running top to bottom, white measuring
  lines, and a legend and list panel, zoom x 900-2100, y 1200-2400. Its script (`render_std.py`) left
  with the move to the shared lab (2026-11-18, git history keeps it); the page draws the same overlay
  from the same answer. Whether it comes back as a lab tool is Ariel's call.
- **Quality is recorded per version (R9, changed 2026-11-07).** A finder changes only in an effort made to
  change it, as a new version; that effort records its precision and recall with the dataset SHA (R11) by
  `python3 lab/run.py nor --write`, once `python3 lab/items.py nor table` has named every item that moved.
  `lab/quality_baseline.json` is the spot-by-spot record of the versions before the move. No test re-scores a finder on a real image: the tests run on a drawn one (`tests/synthetic_nor.py`).
- **Keep or drop every change by data:** `python3 lab/items.py nor ablate BASE VARIANT...`. Log every attempt,
  failures included, in `lab/ledger.md`.
- **Performance pass** at the end of long algorithmic tasks, never on quick fixes where Ariel is
  waiting: `python3 lab/perf.py nor snapshot|check|profile VERSION` (the output must stay identical; it reports time and peak memory, and a
  lower peak is a gain of its own since the page keeps it). See the `speeding-up-an-algorithm` skill.
- **Algorithmic and performance work runs the raw Python finders** (`lab/run.py`, `lab/items.py`,
  `lab/perf.py`), never through the web page (2026-09-29). `lab/perf_pyodide.mjs` and the tools in
  `browser/` only check the page's own runtime.
- **Scale-free:** sizes in image units (median green half-length), never absolute pixels.
- **One pixel belongs to at most one NoR.**

## Next
0. **Mutation sweeps** (ledger §6): `python3 lab/mutate.py nor sweep` splices the repo's trick pool into tl and
   reports what no finder does, above a chance bar of null mutants; the nor-study `mutation-sweep`
   task runs it weekly. M1a (a red floor relative to the image's own passes) is tl's default; grow
   M2 (band-passed Caspr at the candidate stage) once submitted ground truth arrives.
1. The 20 labelled real NoRs that both finders miss (ledger §2 and v10 REPORT): mostly faint
   one-sided paranodes and "not found" spots.
2. Retry C10 (node = red outshining green) once there are more labels.
3. Ariel's submissions from the page (R10) replace the Claude labels spot by spot as they
   arrive (checkpoint H5), so decisions stop resting on Claude's own eye.
4. Performance: every finder was profiled and sped up on 2026-09-29 with identical output (ledger
   §4). Raw Python: tl 3.2 s, rf 6 s, fill 5 s, walk 4.6 s, blobs 2.4 s. A speed-up must never
   change the output (Ariel: no quality loss for performance).

## Files
The algorithm (`../algorithm/`, the only Python the page loads):

| file | what |
|---|---|
| nor_finder.py | the entry: `read`, `VERSIONS` (one per finder), `STAGES` (`verify`, the lab's), `score`, `SETTINGS` (the presets), `SCORING` |
| controls.py | the finders' registry (`FINDERS`), each one's filters and presets |
| truth.py | a ground-truth file read as its elements by their state, and the scorer (`../docs/scoring.md`) |
| channels.py | `load`, `blue_mask`, `to8` and the image-wide helpers the finders share |
| nor3.py | segment checks A-J, `finish`, `measure`, blob/walk/fill finders |
| nor_tl.py | traffic-light finder (default) |
| nor_rf.py | red-first finder; every tested change is a switch in `PR` |

The research records (here, `lab/`):

| file | what |
|---|---|
| ledger.md | everything tried, with verdicts |
| truth/claude_v1.json | the lab's labels on the reference slide, as a ground-truth file |
| pool.json | the spots those labels were drawn from |
| quality_baseline.json | the finders' spot-by-spot results before the move to the shared lab |
| browser/ | the page's runtime measured in a browser (Pyodide): parity, memory, start-up |
| history.md | how the algorithm got here (stages S0-S10, who drove what) |
