# The vascular study's lab records

The study's research records, as data; the code that runs and scores the versions is the shared lab
([`lab/README.md`](../../../lab/README.md)), and the versions themselves are in [`../algorithm/`](../algorithm/).

| File | What |
|---|---|
| [`LEDGER.md`](LEDGER.md) | Every extraction direction tried, kept or dropped, with its evidence, and the ideas not yet tried |
| `truth/<stack>.json` | Provisional ground truth: a model's (Fable's) verdicts on traced curves in five 160 µm tiles of the four stacks, judged 2026-11-04, **not a person's**; each names its stack by SHA-256 |

```
python3 lab/fetch.py vascular                 # the four CD31 stacks and the people's corrected models from Drive
python3 lab/run.py vascular                   # every version scored on both (--truth lab or drive: one of them)
python3 lab/run.py vascular --truth lab --write   # the numbers the page shows
python3 lab/perf.py vascular snapshot|check|profile v5
node lab/perf_pyodide.mjs vascular studies/vascular/data/raw/images/<id>__<stack>.tif v5   # the same run in the page's Pyodide
```

How a model is scored against each kind of ground truth is `SCORING` in
[`../algorithm/vascular.py`](../algorithm/vascular.py).

- **Every version writes start and end widths**: `r_a`, `r_b` on each confirmed edge (µm, measured across the vessel
  and fitted as a straight taper) and `taper_known` where the taper is more than noise, plus the plausibility card as
  `score` (`algorithm/evidence.py`). The format stays `vessel-model/2`.
- **Flow direction is not inferred.** The edge field `flow` is reserved for when it is known: narrowing runs with the
  flow in arterioles but against it in venules, and CD31 alone does not tell them apart.
- **v1** (the bare tracer, `vessel_model.model`) is no longer a version: it kept 24 of 74 judged non-vessels where
  every later one keeps 13 to 17. Its file, the tile tooling that made the Fable labels (`fake_truth.py`), the model
  render (`render.py`) and the old lab CLI are in git at commit e49f676, in the study's former `analysis` folder.
