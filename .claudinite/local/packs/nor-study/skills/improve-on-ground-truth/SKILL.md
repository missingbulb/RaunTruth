---
name: improve-on-ground-truth
description: Improving the NoR finders when new ground truth is curated in the study's Drive folder (its dataset SHA moved), or when asked to improve them on the ground truth.
paths:
  - "studies/nor/**"
metadata:
  body: workflow
  usage:
    expect: triggered
---

# Improving the finders on new ground truth

The order of work is the repo's
[refitting-on-new-ground-truth](../../../nor-finder/skills/refitting-on-new-ground-truth/SKILL.md)
skill. Each step below is its step of the same number, filled in with NoR's commands. The rules are
research-project's and `studies/nor/docs/requirements.md` R7, R9 and R10. Read
`studies/nor/lab/STATE.md` and `studies/nor/lab/ledger.md` first.

The curated files are the best reference there is: a person marked each label, where the lab's own
labels (`studies/nor/lab/truth/`) are Claude's eye. `--truth drive` scores on the curated files
alone; never re-weigh the two by hand.

## 1. See what moved

```
python3 lab/fetch.py nor && python3 lab/run.py nor --write && git diff studies/nor/web/algorithm_metrics.json
```

The metrics file holds each finder's precision and recall, at its own filters and each preset, and
its counts per ground-truth file; the diff against the committed copy is what moved. Which items
moved, finder by finder:

```
python3 lab/items.py nor table
```

A finder retired from the registry leaves `controls.FINDERS` (`studies/nor/algorithm/`) and the
page's list, with the lock re-accepted by the owner.

## 2. Missing candidates first

A missing mark (`"kind": "missing"` in a submission) is a NoR no finder proposed.
The scorer counts the marks some candidate already lies on (`missing_proposed`,
`studies/nor/algorithm/truth.py`). For each of the others, open the image on the page and look at
the region, find the detection step that lost it (no red seed, no green pair, a size or shape gate
before the checks), and ablate the change on every image:

```
python3 lab/items.py nor ablate tl 'tl:<setting>=<value>'
```

## 3. Then re-tune

Ledger §5 found the filter values are not finder-specific, and that fitting them per finder did not
survive held-out labels. Re-tune one shared set, and only once the ground truth can carry a fit.

## 4. Land it

```
python3 -m pytest web-tests studies dev/tools/trick_pool
```

A finder changed here is a new version (R9): `lab/items.py nor table` names every item that moved,
and `lab/run.py nor --write` writes its results. A loss is the owner's to accept, never yours.
Commit `studies/nor/web/algorithm_metrics.json` (R11) with it, and update `STATE.md`. Keep a
speed-up's output bit-identical.
