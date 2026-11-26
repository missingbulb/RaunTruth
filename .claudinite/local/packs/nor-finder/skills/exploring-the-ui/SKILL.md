---
name: exploring-the-ui
description: The page's final check before hand-off, by QA, user and designer personas walking it in worlds on the tests' fakes, each finding triaged. Use when finishing feature work.
metadata:
  body: workflow
  usage:
    expect: triggered
---

# Exploring the UI before hand-off

Three personas walk the page in a world, a scenario of `web-tests/explore/worlds/` (the study and its stage, the
Drive tree, who Drive lets read and write it, who is signed in and as what, the window). Each sees what the others
cannot:

- **QA** knows the spec. The explorer (`explore.mjs`) does one thing a person could do at each step, at random, and
  checks what the step changed against the page's rules.
- **User** knows nothing of the page. A fresh subagent is given a person and a goal, says what it expects before each
  step and whether that happened after it. Its findings are the mismatches and the hesitations.
- **Designer** looks. A fresh subagent walks the same flows with the owner's design questions, answering each from a
  screenshot, an action's frames or a count of how the controls look.

The user and the designer drive `web-tests/explore/session.mjs`, the same walk taken one command at a time; the
header of each script says what it takes.

## 1. Choose the worlds

Take every world whose person the change reaches, and one it should not: a change for annotators runs `annotator`
and `offline-tagger`, and `visitor` too, to see what the change shows someone it is not for. A layout change runs
`phone`, whose findings are calls, the page supporting no phone. A change to signing in or to what Drive lets someone do runs `first-visit`, `expired-token`, `member` and
`stranger`. A situation no world sets up gets a world of its own: a new file in `worlds/`, data alone, the same
fields as its neighbours, its `goals` the person and what they came to do, in their words; a world needing a fake to
do what it cannot yet is a knob on that fake, and a system no fake answers is the owner's call
(fakes-for-outside-systems).

## 2. QA: the seeded walk

Weight up what the change touched, never restrict the walk to it: how it works beside the unchanged parts is half
of what the walk is for. `--focus-diff` takes the ids the change's own lines in `web/` and the studies' `web/` name;
add `--focus` terms (an id, a word of a control's text, a family of `effects.json`, an event) for what the change
affects without naming it.

Run each world on seeds 1, 2, 3 and on, 150 to 300 steps a seed, until two seeds in a row add no finding the
earlier ones did not have (a finding's `sig` in `steps.json` is the same wherever it recurs). Write the runs
outside the repo (the default), never into a commit.

```
for s in 1 2 3; do node web-tests/explore/explore.mjs --world owner --seed $s --steps 200 --focus-diff origin/main --out /tmp/explore/owner-$s; done
```

## 3. User: someone who does not know the page

For each chosen world, take its person and each of its goals:

```
node web-tests/explore/session.mjs goals --world annotator
node web-tests/explore/session.mjs start --world annotator --persona user --person "<person>" --goal "<goal>" --out /tmp/explore/user-annotator-1
```

`start` prints `DIR/page`, the one command the persona drives. Fill [user-brief.md](user-brief.md) with the person,
the goal and that command, and hand it to a **fresh** subagent (the Agent tool's general-purpose type, never a fork:
a fork carries this session's knowledge of the page), one goal a subagent, several in parallel. When it reports,
run `DIR/page end` if it did not, and read `DIR/session.md`.

The tool holds the order: an action is refused without what the persona expects, and the next is refused until it
has said how the last went. What the isolation cannot hold: the subagent knows how software usually works, as a
real newcomer does, and it has file tools it is only asked not to use. The tell that it read more than the screen
is an expectation in words only the code has; `session.md` lists those it finds under "Words only the code has",
and a session with any is run again with a fresh subagent.

## 4. Designer: someone who looks

One session a world, without `--persona user`, so that each action also names what the page animated:

```
node web-tests/explore/session.mjs start --world annotator --persona designer --out /tmp/explore/designer-annotator
```

Fill [designer-brief.md](designer-brief.md) with the world's person, its goals as the flows to walk, and `DIR/page`,
and hand it to a fresh subagent. It answers the owner's questions from evidence: a screenshot, an action's contact
sheet (its frames in order, with how long after the action each was drawn), or `styles`, which gathers the controls
on show by how they look and names the odd one out.

## 5. Triage each finding

A QA finding: open the run's `summary.md`, look at its screenshot, replay it, then shrink it to the fewest steps
that still find it:

```
node web-tests/explore/explore.mjs --replay RUN/steps.json --upto STEP
node web-tests/explore/explore.mjs --shrink RUN/steps.json --finding 'SIG'
```

A user's mismatch or hesitation, and a designer's finding, come with their step's screenshots in `session.md`; a
session's `steps.json` replays the same way. Each finding, whoever found it, is one of:

- **A bug** (a check failed, or the page did what no reading of it promises) - first decide whose it is. A
  shell-states finding is what the unreviewed harness says (shell-states-unreviewed): check it against
  `dev/requirements/requirements.md`, and where the spec does not say so, it is a call. A message an `allow` entry of
  `effects.json` names, or one a fake answers unlike the system it fakes, is the fake's: fix the fake. A page bug is
  fixed test-first: the shrunk steps become a test in `web-tests/` that fails on the bug, then the fix, then the same
  test green (merge-proven-fix).
- **A gap** (what a person plainly expects is missing) - fix it where the requirement is plain and the fix small;
  otherwise it is a call.
- **A call** (the owner's to decide) - ask it, one question an item, with its screenshot at two device pixels to a
  CSS pixel (a QA finding's `owner/` one; a session's are all so); never decide it by changing the page. A user's
  expectation the page did not meet where the spec asks for what the page did, and nearly every designer's finding,
  is a call.
- **An unexpected change** that is right - declare it in the family's `may` (or `must`, where the action always
  makes it) in `effects.json`, so the next run checks it rather than flags it; one that is wrong is a bug.

Then run again what found something: the QA seeds, and the goal with a fresh user. Each fixed finding is gone, and
nothing new came.

## 6. Hand it over

Say in the pull request, persona by persona: QA's worlds, seeds and steps; the user's persons and goals, how many
steps went otherwise than expected and each hesitation; the designer's findings in its own order, the most
bothersome first. Then what was fixed, and which calls wait on the owner, with their screenshots.

## What nobody sees

What a canvas draws beyond a look at its screenshot, anything that needs a long wait or the clock, a page opened
offline (the stand-in Google turns the service worker off, so the walk goes to another page online alone), what a
real worker computes (the stand-in answers the fixture's sums), a native tooltip as it is drawn (its words are
listed), and motion faster than the frames the browser hands over. Check those by eye, or with a page test.
