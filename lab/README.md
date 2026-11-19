# The lab

One harness for every study: it fetches a study's images and ground truth, runs the study's algorithm versions on
them, scores each answer with the study's own scorer, and writes the precision and recall the page shows. A study
holds only its algorithm: code that starts from an image file and returns the answer, plus the scorer that
compares an answer with ground truth. Everything else lives here, once.

```
python3 lab/fetch.py STUDY            # the study's images and its curated ground truth, into studies/STUDY/data/raw/
python3 lab/run.py STUDY [VERSION...] # run and score every version (or those named); --write records the metrics
python3 lab/perf.py STUDY snapshot|check|profile [VERSION]   # a speed-up is kept only when every answer is bit-identical
node lab/perf_pyodide.mjs STUDY IMAGE VERSION        # the same version's time and memory under the page's Pyodide
python3 lab/items.py STUDY table|ablate ...          # per-item verdicts of every version; a paired bootstrap of two
python3 lab/mutate.py STUDY list|sweep|one|view|marks # the mutation sweep over the trick pool (dev/tools/trick_pool)
```

## What a study gives the lab and the page

The study's `study.json` names its algorithm package in `python`: `paths` (the folders the page loads its Python
from, the only Python of the study the page ships) and `entry`, the module both the page and the lab import. That
module defines:

| name | what it is |
|---|---|
| `read(path)` | the image file opened as the versions take it (channels, masks, its pixel size): everything the file says, nothing the viewer does |
| `VERSIONS` | `{key: run}`, the study's algorithm versions in the order `web/algorithms.json` lists them; `run(image, **params)` returns the answer |
| `STAGES` | `{name: stage}`, optional: a later step the page runs on an answer without running the version again, `stage(image, answer, **args)` |
| `score(answer, truth)` | how one answer did against one ground-truth file: at least `tp`, `fp` and `fn` |
| `SCORING` | how `score` counts, as a short Markdown outline: what the page shows beside the precision and recall |
| `SETTINGS` | optional, `{version: {name: params}}`: settings the lab scores beside each version's default (NoR's filter presets) |
| `NOTES` | optional, `{version: text}`: the note the page shows beside a version's numbers |

`score` may also return `items` (each truth and answer unit's verdict), which `items.py` and `mutate.py` read, and
a study may give a `verify` stage the mutation sweep runs on a mutant's map.

An answer is a dict the page can read as JSON; a numpy array in it travels to the page as bytes, a numpy number as a
number. A version that
needs a service only the environment has (reading text, for one) is a generator: it yields a request,
`('tesseract', crop, langs)`, and is sent the answer. In the lab the request is served natively; on the page, by the
page's own engines through the worker. The version is the same code in both. The lab's services (`services.py`) load
the files the study's `study.json` names under `services` (`det`, `tessdata`, `words`; a URL is fetched once into
the study's `data/raw/services/`), and run Tesseract on one thread, which is several times faster for many small
crops.

## What the lab owns

- **Fetching** (`fetch.py`): the images a study's `data/sources.json` names, checked by SHA-256, and the newest
  ground-truth file per image from the study's curated folder on Drive (the shell's layout:
  `<image>__<sha8>/gt_<tagger>.json`), into `studies/STUDY/data/raw/`, which git never holds.
- **Running and scoring** (`run.py`): each version on each image with ground truth, scored by the study's `score`,
  summed over images into precision `tp / (tp + fp)` and recall `tp / (tp + fn)`; with `--write`, the study's
  metrics file (`study.json` `algorithms.metrics`) with the numbers, what they were measured on (each image's and
  ground-truth file's SHA-256) and the study's `SCORING`.
- **Speed** (`perf.py`): time and peak memory of a version, and a signature of every answer, so an optimisation
  is kept only when the answers stay bit-identical.

A study's research records (its ledger, the labels it was tuned on before people marked any) stay in the study's
`lab/` folder as data; the lab reads them, and no Python lives there.
