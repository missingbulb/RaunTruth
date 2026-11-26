# Vascular Measurements — read this first

Detect and quantify cerebral blood vessels in CD31 confocal images: **categorize** (caliber),
**count** (branch segments) and **measure** (centerline length), on the owner's z-stacks (3D, four Marianas 20×
CD31 stacks on Google Drive, `data/README.md`). [`algorithm/`](../algorithm/vascular.py) is the study's whole code:
it reads a stack and keeps every extraction version side by side (v5 the default), each drawing the vessel model
(`vessel-model/2`) the owner corrects into ground truth, and it scores a model against ground truth. The shared
lab (the repo's `lab/`) fetches, runs and scores; the study's research records are in [`../lab/`](../lab/README.md).
The first pass's 2D figure-panel pipeline (`measure_vessels.py`, `annotate_overlays.py`) and the early 3D spikes
(`trace_vessel_graph.py`, `export_stack_view.py`) are retired; they are in git at commit e49f676.

Migrated from [missingbulb/vascularColoring](https://github.com/missingbulb/vascularColoring)
on 2026-10-31 ([`MIGRATION.md`](MIGRATION.md) lists every capability and where it stands). Still there, not here: the figure and PDF files the literature's READMEs
show (they link to that repo, by the owner's choice).

## Read next

- [`WORKING-GUIDE.md`](WORKING-GUIDE.md) — the owner's rules for images, overlays, metrics and calibration.
- [`STATUS.md`](STATUS.md) — where things stand and the agreed next step.
- [`3D-STACKS.md`](3D-STACKS.md) — the 3D work, the vessel model and the owner's decisions on it.
- [`../lab/README.md`](../lab/README.md) and its `LEDGER.md` — how the versions are run and scored, and every attempt.
- [`scoring.md`](scoring.md) — how a model is scored against ground truth (3D tube overlap, in µm), why, and its validation.
- [`literature/README.md`](literature/README.md) — one digest per paper (read the digest, never the PDF),
  [`literature/METHODS-SYNTHESIS.md`](literature/METHODS-SYNTHESIS.md) and
  [`literature/BIOLOGY-INVARIANTS.md`](literature/BIOLOGY-INVARIANTS.md).

The study's working rules are the `vascular-study` local pack's; research-project's rules govern as for every study here.

## Run

From the repository's root:

```
python3 lab/fetch.py vascular                     # the owner's stacks and corrected models into data/raw/
python3 lab/run.py vascular                       # every extraction version on every stack, scored
python3 -m pytest studies/vascular
```

## The page

The page reads the stack itself and shows it in the shell's 3D viewer, flattened and slice by slice, CD31 first
(`web/channel_order.js`) and contrasted up to the 99.9% quantile (`study.json`'s `view.upper`;
`req/vascular/stack-view`); `algorithm/vascular.py` is what Python runs, through the shell's bridge: its `read` opens the stack's CD31, and
Execute runs one of its `VERSIONS` on it in the page
(`req/vascular/model/run`: Processing's Execute; the page's Python is `algorithm/` as it is; the study's list,
`web/algorithms.json`, gives each version's name, icon and How the algorithm works there, as its `TITLE`, `ICON` and
`STEPS` state them, and `web/algorithm_metrics.json`, written by `python3 lab/run.py vascular --truth drive --write`,
its precision and recall). The site ships no
drawn models. The left bar is the shell's (`req/shell/left-bar/shells`): `web/vascular.html` fills its
Processing, Summary and Ground Truth Tasks boxes, and the toolbar's left with how the model shows
(`req/shell/image/toolbar`). `web/vascular.js` mounts Processing, the vessel model over or beside the stack
(`web/model_view.js`, drawing through the 3D viewer's `three`, whose Colour by depth it follows; `req/vascular/model/view`,
`req/vascular/model/correct`), the Ground Truth Tasks while the study makes ground
truth (`web/tasks.js`; `req/vascular/truth/tasks`, `req/vascular/truth/order`, `req/vascular/truth/marks`), the item cards outside it (`web/items.js`,
`req/vascular/model/cards`), Summary's eight numbers over a lassoed mask (`web/summary_view.js`, the numbers `web/summary.js`; `req/vascular/summary/metrics`, `req/vascular/summary/mask`) and Submit Ground Truth (`req/vascular/model/ground-truth`). Every edit is a GT action of the shell's log
(`shell.gt`): `web/gt_actions.js` holds the pure functions the shell replays (the items it reads are `web/model_items.js`),
`web/model_view.js` draws whatever model the shell hands it, and the edits kept before the log under `mv-model:` are
`web/old_edits.js`, offered once through `shell.gt.legacy`. Tests:
`tests/test_model_page.py` (Review: views and cards), `tests/test_vessel_tasks_page.py` (Develop: Execute
and the tasks), `tests/test_vessel_gt_actions_page.py` (the GT actions in the page), all against the stand-in worker in `tests/stand_in.mjs`, and
`tests/test_extract_bridge.py` (the real Python in Pyodide). The model's format and edits are
`web/model.js` (`web/coverage.js` the review's tube and what the tasks cut out of the stack), pinned
by `tests/test_model_js.py` (with `tests/test_gt_actions.mjs`: the ids and the GT actions) and, against the Python fit, `tests/test_vessel_model_curve.py`.
