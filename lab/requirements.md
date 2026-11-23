# The lab's requirements

What the lab (`lab/`) does with a study's Drive store: the one harness that fetches a study's images and ground
truth, runs its versions and scores them (`lab/README.md`). The lab's study file is the page's study file
(`req/shell/study/one-file`); the stages are those of `req/shell/study/stage`. Each requirement is named by a tag
under `req/lab` and cited by it, as in the shell's spec (`web-tests/test_requirement_tags.py`).

## `req/lab` The lab reads the study file

- `req/lab/dataset-sha` The dataset SHA is computed over the model-only form of each GT file, so Drive's copy and the committed one agree.
  <details>

  Set by the owner on 2026-11-22 (WP7 of `dev/requirements/study-stages-spec.md`). The model-only form of an extraction
  file (`lab/fetch.py` `model_only` and `model_form`, the one definition the Review freeze reuses) drops its `history`, `tagger`,
  `created` and `base`, any `tagger` or `email` key and the image's Drive id, and keeps the rest; the lab scores that
  form too, so what it scores is what the freeze commits. Two GT files differing only in what the form drops give the
  same dataset SHA; a changed label gives another. Decided by the owner on 2026-11-23: the form keeps each image's rejected candidates, which a study's module lists from the file's history
  (`rejected_of`, NoR's `studies/nor/algorithm/truth.py`) as `rejected`, so NoR's scorer still counts them as known non-NoRs, and the dataset
  SHA covers them. (Scoring the model against the results alone is a later change.) Test: `lab/tests/test_lab.py`.
  </details>

- `req/lab/freeze` One lab command commits the study's GT, model-only, to `studies/<id>/gt/<freeze date>/` and writes the official scores with their stamp.
  <details>

  Set by the owner on 2026-11-22 (WP8 of `dev/requirements/study-stages-spec.md`). `python3 lab/freeze.py <study>` is the second of the three
  steps of entering Review (Study Setup's Freeze, this, then the sharing check) and refuses unless the study file's stage is Review. It
  writes each GT mark's file in its model-only form (`req/lab/dataset-sha`) as `studies/<id>/gt/<freeze date>/<image SHA-256>.json`, one per
  GT mark and none for official marks or the lab's own labels, with no `history`, `tagger`, `created` or email anywhere in the bytes (a file
  that still holds an email address stops the freeze, nothing written). The scores are measured on those committed files alone and written to
  the study's metrics file, whose every version carries a stamp `{version, dataset_sha256, frozen, commit}` (the page shows it from Review
  on, `req/shell/processing/stamp`); the metrics record, for each image, the algorithm and code version the GT file's history began with, since
  the model-only form drops that history. The commit cannot exist before the files are committed, so the stamp holds `commit: null` until
  `lab/freeze.py <study> --stamp` writes the commit that holds the files (it refuses while they are uncommitted or changed); a session commits
  the files, stamps, and commits the metrics. The frozen files keep the rejected candidates too (`req/lab/dataset-sha`, decided 2026-11-23), so the frozen score counts them. Test: `lab/tests/test_lab.py`.
  </details>

- `req/lab/gt-marks` The lab scores against GT marks only, reading each marked file's latest content.
  <details>

  Set by the owner on 2026-11-22. For each image the study file's marks give a GT mark, the lab downloads the
  extraction file the mark names afresh on each run, so an author's later edit counts at once and changes the dataset
  SHA. Official marks are never scored, a file naming another image than its mark's is left out with the reason, and the
  files of a study's own `lab/truth/` (made by a model, not annotations) are scored beside them as before. Test:
  `lab/tests/test_lab.py`.
  </details>

- `req/lab/stage` The lab prints the study's stage from the study file, and unattended tasks stop on Review or Public.
  <details>

  Set by the owner on 2026-11-22. The stage is read from the study file only: a study file that names none is
  `unknown`, never a default stage. `lab/stage.py` prints it; `lab/fetch.py` and `lab/run.py` print it as they start.
  In Review and Public the study is frozen: `lab/run.py --write` exits with a message saying so, and the NoR
  mutation-sweep task ends its run clean with the same message, nothing changed. Test: `lab/tests/test_lab.py`.
  </details>

- `req/lab/study-file` The lab reads a study's study file by link, from the id in `RAUNTRUTH_STUDY_<STUDY>`, and lists no Drive folder.
  <details>

  Set by the owner on 2026-11-22. The id comes only from that environment variable (the study's id upper-cased), never
  from the repo and never into any output; without it the lab exits 2 with a message naming the variable. The lab
  downloads the files the study file names (each image by the id its index gives its hash, each GT mark's file), and
  `studies/<id>/data/sources.json` keeps image names and hashes only, no Drive id. Test: `lab/tests/test_lab.py`.
  </details>
