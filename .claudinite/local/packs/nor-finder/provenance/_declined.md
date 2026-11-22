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

## 2026-11-20 · declined · the two candidates put to the owner
- **Source:** the owner's answers on the second growth pass.
- **Reason:** no up-to-date-before-merge setting or guard, by the owner's choice: one instance in 36
  sessions; the version-rewritten-in-place guard is filed as #1055, since it needs a metrics-format
  change of its own.
- **Actor:** @missingbulb (owner).

## 2026-11-20 · declined · the one-off candidates from the sessions of 2026-10-11 to 2026-11-10
- **Source:** the third growth pass over 121 web sessions.
- **Reason:** each rests on one instance: retrying a merge call after a 502 (#743), stashing during
  a merge (#796), an internal tag in a popup (#760), an unseeded randomized routine (#864), a render
  on a test's small image (#739). A page import its study does not install (#864, #881) is already
  page-python-imports. Version-history conflicts, requirement-number conflicts and a test's own
  route losing to the harness's were removed by #750, #652 and #1033.
- **Actor:** @missingbulb (owner), asking for growth from every session since the last growth run.

## 2026-11-22 · declined · the prose-to-checks sweep of the local packs found nothing convertible
- **Source:** the prose-to-checks sweep of nor-finder, nor-study and vascular-study (#1090).
- **Reason:** nothing left that a check can carry with confidence. Each rule is already a check or a harness behavior (the harness fails an undeclared warning at exit), or judgment: how loose an `expecting()` pattern is, which fakes are the owner's call, when a change needs approval, how to order pushes and merges, how items sit in a row. `tests-bend-test-surface` leaves no violation mark, since a PR may legitimately touch `web/` for other reasons. `locked-metric-definitions` states what the product measures, a requirement, left in place.
- **Actor:** claudinite/prose-to-checks-sweep (issue #1090).
- **Model:** Claude, per the commit trailer.
