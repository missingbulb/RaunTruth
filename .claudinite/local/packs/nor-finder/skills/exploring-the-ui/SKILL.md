---
name: exploring-the-ui
description: The final check of feature work on the page - the explorer (web-tests/explore/) playing with it at random, as a person would, in seeded worlds on the tests' fakes, then each finding triaged. Use when finishing feature work, before handing it to the owner.
metadata:
  body: workflow
  usage:
    expect: triggered
---

# Exploring the UI before hand-off

The explorer walks the page in a world, a scenario of worlds/ (the study and its stage, the Drive tree, who Drive
lets read and write it, who is signed in and as what, the window), doing one thing a person could do at each step,
and checks what the step changed. Its own header says what it takes; the commands below are the ones a hand-off
runs.

## 1. Choose the worlds

Take every world whose person the change reaches, and one it should not: a change for annotators runs `annotator`
and `offline-tagger`, and `visitor` too, to see what the change shows someone it is not for. A layout change runs
`phone`. A change to signing in or to what Drive lets someone do runs `first-visit`, `expired-token`, `member` and
`stranger`. A situation no world sets up gets a world of its own: a new file in `worlds/`, data alone, the same
fields as its neighbours; a world needing a fake to do what it cannot yet is a knob on that fake, and a system no
fake answers is the owner's call (fakes-for-outside-systems).

## 2. Choose the focus

Weight up what the change touched, never restrict the walk to it: how it works beside the unchanged parts is half
of what the walk is for.

```
node web-tests/explore/explore.mjs --world annotator --seed 1 --steps 200 --focus-diff origin/main
```

`--focus-diff` takes the ids the change's own lines in `web/` and the studies' `web/` name; add `--focus` terms
(an id, a word of a control's text, a family of `effects.json`, an event) for what the change affects without
naming it.

## 3. Run until runs stop finding

Run each world on seeds 1, 2, 3 and on, 150 to 300 steps a seed, until two seeds in a row add no finding the
earlier ones did not have (a finding's `sig` in `steps.json` is the same wherever it recurs). Write the runs
outside the repo (the default), never into a commit.

```
for s in 1 2 3; do node web-tests/explore/explore.mjs --world owner --seed $s --steps 200 --focus-diff origin/main --out /tmp/explore/owner-$s; done
```

## 4. Triage each finding

Open each run's `summary.md`, look at the finding's screenshot, and replay it, then shrink it to the fewest steps
that still find it:

```
node web-tests/explore/explore.mjs --replay RUN/steps.json --upto STEP
node web-tests/explore/explore.mjs --shrink RUN/steps.json --finding 'SIG'
```

- **A bug** (a check failed) - first decide whose it is. A shell-states finding is what the unreviewed harness says
  (shell-states-unreviewed): check it against `dev/requirements/requirements.md`, and where the spec does not say
  so, it is a call. A message an `allow` entry of `effects.json` names, or one a fake answers unlike the system it
  fakes, is the fake's: fix the fake. A page bug is fixed test-first: the shrunk steps become a test in
  `web-tests/` that fails on the bug, then the fix, then the same test green (merge-proven-fix).
- **A gap** (what a person plainly expects is missing) - fix it where the requirement is plain and the fix small;
  otherwise it is a call.
- **A call** (the owner's to decide) - ask it, one question an item, with the finding's `owner/` screenshot, taken
  at two device pixels to a CSS pixel for this; never decide it by changing the page.
- **An unexpected change** that is right - declare it in the family's `may` (or `must`, where the action always
  makes it) in `effects.json`, so the next run checks it rather than flags it; one that is wrong is a bug.

Then run the seeds that found something again: each fixed finding is gone, and nothing new came.

## 5. Hand it over

Say in the pull request which worlds and seeds ran, how many steps, what was fixed, and which calls wait on the
owner, with their screenshots.

## What it cannot see

How the page looks (a colour, an overlap the hit test misses), what a canvas draws, anything that needs a long
wait or the clock, a page opened offline (the stand-in Google turns the service worker off, so the walk goes to
another page online alone), and what a real worker computes (the stand-in answers the fixture's sums). Check
those by eye, or with a page test.
