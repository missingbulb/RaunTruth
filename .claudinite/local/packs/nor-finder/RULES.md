# nor-finder — this repo's own pack

The home for everything **specific to this repository** and its shell: the rules below, and
beside them the checks, skills and tasks that carry them. Nothing local needs a home invented for
it — this is that home. This file is loaded into every session through the rules index, so what
lands *here* should be a directive an agent can act on, not a description of how something works;
a rule a deterministic check can enforce belongs in this pack's `declared-checks.json` instead,
and a procedure with a nameable trigger in its own `skills/<name>/SKILL.md`.

What is specific to one study belongs in that study's pack (`nor-study` for `studies/nor/`), so a
study can leave without taking a repo rule with it. A lesson that would hold in another repo does
not belong here — propose it to the Claudinite canon instead, where every repo gets it.

## Where the work lives

- **Working from a Claude project (its shared folder, threads and project memory)** — the repo is
  where the work lives; the project is only a tool that helps the repo grow. Commit every piece
  of processing code, every instruction, skill, label set, ledger and the current state
  (each study's `STATE.md`) to the repo, in a PR, as part of the change that produced it and
  not as a later clean-up. The shared folder may hold only temporary processing artifacts:
  renders, caches, contact sheets and other outputs that validate the repo's algorithm and can
  be regenerated from it. Before replying that work is done, check that nothing the next session
  would need exists only in the project. (working-claude-project)

- **Starting on an issue you picked yourself, or on files another session may be changing** -
  search the open pull requests for the issue's number and for the paths you will change, and
  build on what an open one makes true or ask: parallel sessions here otherwise redo or undo each
  other's work. (in-flight-work-first)

## What a study gives the shell

- **Giving the shell something that varies by study** (its algorithms, channels, steps, their
  numbers) - contribute it as data the shell reads, named in `study.json`, and leave every decision
  about it to the shell; never write study code that builds or draws what the shell could own once.
  (study-contributes-data)

## Production and its tests

- **A test needing the page to behave otherwise than it does on the live site** — change the
  testing surface (a stand-in, a route, a seeded browser key, a shared helper beside the tests),
  never `web/` or a study's `web/`: the production code is written for the live site alone.
  (tests-bend-test-surface)

- **Faking something in the tests** - fake a system the page reaches beyond its own code (an API, a CDN, a sign-in,
  the deploy, a process) once, in `web-tests/fakes/`, active in every test, at the seam nearest that system, replacing
  only its own part, with knobs a test sets; fake the repo's own code rarely, and put each new fake to the owner as
  its own approval question first. (fakes-for-outside-systems)

- **A test case that makes the page warn or err** - declare it around that case with the harness's `expecting()`,
  by a loose pattern of a word or two, never the whole message; any other one fails the run, and is a bug to fix now.
  (expected-warnings-per-case)

- **Testing a motion the page makes** (a transition, an animation, a view transition) - check that it is on where
  it should be, that it starts and that it ends in the right state, through `web-tests/page_motions.mjs`; never
  how it looks on the way. (testing-motion-ends)

- **Waiting in a test for the page to have drawn** (a canvas, the 3D view) - wait for that surface's own draw,
  through `web-tests/page_frames.mjs`; a count of frames says only that frames passed, and a view that draws on
  demand may have drawn in none of them. (wait-for-the-draw)

- **Testing code that needs a study's image** - draw a small one in the test (NoR's is
  `studies/nor/tests/synthetic_nor.py`); never a study's real data, which no test downloads.
  (tests-draw-images)

- **Guarding a study algorithm's quality** - record it once per version, in the effort that makes the
  version (its precision, recall and dataset SHA), never in a test that re-scores it on every pull
  request; here this replaces research-project's guard-wins-regression. (quality-per-version)

## What the page reaches

- **Planning a change that adds or alters a network call or a permission request** (the page's,
  the lab's or CI's: what is called, when, by whom, how often; a scope, a picker, a share) - put
  each one to the owner as its own approval question before building it, never folded into an
  approved plan. (network-calls-approved)

## The page's controls

- **Placing items that are always there beside ones that come and go** (a list row's size, date,
  age tag or mark; a status bar; a row of controls) - anchor the always-there ones whole at the
  edges and the optional ones inward, and let variable content (text, a gauge, a slider) take the
  space left, so nothing optional moves, hides or squeezes an anchored item. (row-indicators-edges)

## The page's version history

- **Changing what a user of the NoR Finder page sees** — tell it in a `Version-history:` line of
  one of the pull request's commit messages, at most 20 words a user reads, or
  `Version-history: none`; never in a file the pull requests share. The `writing-version-history`
  skill says how. (page-version-history)

## Ground truth

- **Building or changing a study's ground-truth controls** (what its page shows in a GT or PostGT
  stage) — load the `designing-ground-truth-tasks` skill first: the tasks in the left bar, one
  item at a time, area by area, what is done cut out of the image. (designing-ground-truth-tasks)

## The shell's states

- **Working with `dev/requirements/shell-states.json`, a study's `states.json` grafted into it, or what they generate** — treat it as a development harness
  the owner does not review: never present a case there as approved, and bring each tentative or undecided case,
  and each change to what a state shows, to the owner as a question. (shell-states-unreviewed)

## Pushing

- **Pushing commits to a pull request's branch** - push once the batch of commits in hand is done,
  not after each one: every push starts a Tests run, so a burst of pushes runs the suite once per
  commit for a single result. (push-in-batches)

- **A pushed pull request showing no check runs, or one whose CI you are about to rerun or wait
  on** - read its mergeable state first: GitHub starts no `pull_request` workflow while the branch
  conflicts with its base, so merge the base in. (conflict-blocks-ci)

## Merging

- **Calling a branch's failing test pre-existing because it fails on `main` too** - compare where
  each run first failed; a flake that stops both early hides what fails after it, so rerun until
  `main` passes before clearing the branch. (pre-existing-same-failure)

- **A branch whose suite fails in a way not yet placed** - move its changes one logical change at a time onto a
  fresh branch off `main`, running the tests after each, and merge the ones that hold; the one that does not stays
  on the first branch, where the work goes on as a smaller change. (split-out-the-sound)

- **A small pull request fixing a bug** — merge it yourself, unasked, once its first commit added
  a test that failed on the bug, a later commit fixed the bug, and the same test passed with no
  test file changed after that first commit. Any other pull request waits for the owner.
  (merge-proven-fix)
