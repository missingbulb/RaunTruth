## 2026-09-25 · declined · cross-repo duplication of the Drive-fetch-with-checksum mechanic
- **Source:** PR #182's conversation log (`src/fetch_data.py`'s gdown re-listing fix, hand-ported
  the same session into missingbulb/VascularColoring's `analysis/fetch_data.py`).
- **Reason:** a call-site gotcha tied to `src/fetch_data.py` (extracting-lessons.md's drop rule),
  not a pack-shaped rule.
- **Actor:** claudinite-growth/growth-extract (issue #185).
- **Model:** claude-sonnet-5.

## 2026-11-20 · declined · an issues-triage skill from a re-requested triage
- **Source:** the 2026-11-19 triage session had to recover the 10 Nov triage's instructions first,
  and both triages drew explain-again follow-ups.
- **Reason:** the buckets, exclusions and explanation style are the owner's own preferences, which
  belong in their personal pack, not a repo pack.
- **Actor:** @missingbulb (owner), asking for growth from the 2026-11-19 sessions.

## 2026-11-20 · declined · four candidates from the sessions of 2026-11-10 to 2026-11-20
- **Source:** the second growth pass over 30 web sessions.
- **Reason:** a fixed GT context menu with inapplicable items greyed is a product requirement, now
  in the vascular spec; a size nudge on a data file under web/ rests on one instance and
  network-calls-approved already puts the fetch to the owner; requiring pytest's -n flag is a speed
  matter, now named in ci-run-before-push's fix; "merge when the base moved" and "a version
  rewritten in place" each need an owner decision first (a branch-protection setting; a module hash
  in the metrics).
- **Actor:** @missingbulb (owner), asking for growth from the sessions since the last growth run.
