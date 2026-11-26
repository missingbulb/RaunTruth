# The lab

One harness for every study: it fetches a study's images and ground truth, runs the study's algorithm versions on
them, scores each answer with the study's own scorer, and writes the precision and recall the page shows. A study
holds only its algorithm: code that starts from an image file and returns the answer, plus the scorer that
compares an answer with ground truth. Everything else lives here, once.

```
python3 lab/fetch.py STUDY            # the study's images and its GT marks' files, through its study file, into studies/STUDY/data/raw/
python3 lab/run.py STUDY [VERSION...] # run and score every version (or those named); --write records the metrics
python3 lab/perf.py STUDY snapshot|check|profile [VERSION]   # a speed-up is kept only when every answer is bit-identical
node lab/perf_pyodide.mjs STUDY IMAGE VERSION        # the same version's time and memory under the page's Pyodide
python3 lab/items.py STUDY table|ablate ...          # per-item verdicts of every version; a paired bootstrap of two
python3 lab/stage.py STUDY [--stop-if-frozen]   # the stage the study file names; exit 3 in Review and Public
python3 lab/freeze.py STUDY [--stamp]   # in Review: commit the GT model-only to studies/STUDY/gt/<date>/ and write the stamped scores
python3 lab/mutate.py STUDY list|sweep|one|view|marks # the mutation sweep over the trick pool (dev/tools/trick_pool)
```

## What a study gives the lab and the page

The study's `study.json` names its algorithm package in `python`: `paths` (the folders the page loads its Python
from, the only Python of the study the page ships) and `entry`, the module both the page and the lab import. That
module defines:

| name | what it is |
|---|---|
| `read(path)` | the image file opened as the versions take it (channels, masks, its pixel size): everything the file says, nothing the viewer does |
| `VERSIONS` | `{key: run}`, the study's algorithm versions in the order `web/algorithms.json` lists them; `run(image, **params)` returns the answer; a `run` that takes `damaged` is handed the image's damaged areas |
| `STAGES` | `{name: stage}`, optional: a later step the page runs on an answer without running the version again, `stage(image, answer, **args)` |
| `score(answer, truth)` | how one answer did against one ground-truth file: at least `tp`, `fp` and `fn`; a `score` that takes `damaged` is handed the image's damaged areas |
| `SCORING` | how `score` counts, as a short Markdown outline: what the page shows beside the precision and recall |
| `SETTINGS` | optional, `{version: {name: params}}`: settings the lab scores beside each version's default (NoR's filter presets, its default one filter on) |
| `NOTES` | optional, `{version: text}`: the note the page shows beside a version's numbers |

`score` may also return `items` (each truth and answer unit's verdict), which `items.py` and `mutate.py` read, and
a study may give a `verify` stage the mutation sweep runs on a mutant's map.

An image's damaged areas (`req/shell/data/damaged`) are `[[[x, y], ...], ...]` in its pixels, `[]` for none: the lab
reads them from the tags in the study file (`rauntruth-study.json`), by the image's Drive id, and keeps an answer for the
areas it was run with.

An answer is a dict the page can read as JSON; a numpy array in it travels to the page as bytes, a numpy number as a
number. A version that
needs a service only the environment has (reading text, for one) is a generator: it yields a request,
`('tesseract', crop, langs)`, and is sent the answer. In the lab the request is served natively; on the page, by the
page's own engines through the worker. The version is the same code in both. The lab's services (`services.py`) load
the files the study's `study.json` names under `services` (`det`, `tessdata`, `words`; a URL is fetched once into
the study's `data/raw/services/`), and run Tesseract on one thread, which is several times faster for many small
crops.

## What the lab owns

- **The study file** (`fetch.py`, `req/lab/study-file`): the lab's one interface to a study's Drive store. Its Drive id
  is the environment variable `RAUNTRUTH_STUDY_<STUDY>` (the study's id upper-cased), never the repo or any output;
  without it every command that reads it exits 2 naming the variable. The file is link-shared and read with no
  sign-in; it names the images (id and SHA-256), the marks, the damaged areas and the stage, and the lab downloads
  by those ids and lists no folder.
- **Fetching** (`fetch.py`): the images a study's `data/sources.json` names (names and hashes, no Drive id), checked by
  SHA-256 and downloaded by the id the study file gives each hash, and the extraction file each GT mark names
  (`req/lab/gt-marks`), read afresh each run so a mark follows its file's latest content, into `studies/STUDY/data/raw/`,
  which git never holds. Only GT marks are scored, never official ones. A file is kept in its model-only form
  (`model_only`: no history, tagger, creation time or email), and the dataset SHA covers that form
  (`req/lab/dataset-sha`).
- **The stage** (`stage.py`, `req/lab/stage`): printed from the study file, or `unknown` when it names none. In Review
  and Public the study is frozen: `run.py --write` stops, and so does an unattended task that would change its
  algorithm (the NoR mutation sweep ends its run clean).
- **The freeze** (`freeze.py`, `req/lab/freeze`): the second of the three steps of entering Review, run only while the study
  file says Review. It writes each GT mark's file, model-only, as `studies/STUDY/gt/<freeze date>/<image SHA-256>.json`
  (no history, tagger, creation time or email; a file still holding an email stops it), measures every version on those
  committed files alone, and writes the metrics file with a stamp `{version, dataset_sha256, frozen, commit}` on each
  version and, per image, the algorithm and code version the GT file's history began with. `commit` is `null` until the
  session has committed the files and run `freeze.py STUDY --stamp`, which writes the commit that holds them; then the
  metrics are committed too. The model-only form drops `history`, which no scorer reads, so
  the frozen set scores as `run.py` scores it.
- **Running and scoring** (`run.py`): each version on each image with ground truth, scored by the study's `score`,
  summed over images into precision `tp / (tp + fp)` and recall `tp / (tp + fn)`; with `--write`, the study's
  metrics file (`study.json` `algorithms.metrics`) with the numbers, what they were measured on (each image's and
  ground-truth file's SHA-256) and the study's `SCORING`.
- **Speed** (`perf.py`): time and peak memory of a version, and a signature of every answer, so an optimisation
  is kept only when the answers stay bit-identical.

A study's research records (its ledger, the labels it was tuned on before people marked any) stay in the study's
`lab/` folder as data; the lab reads them, and no Python lives there.
