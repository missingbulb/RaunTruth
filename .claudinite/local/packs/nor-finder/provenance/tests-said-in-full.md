## 2026-11-26 · born · tests failed every night and the owner did not know
- **Source:** the owner, in the session of #1140: "I'm having a really hard time understanding what
  test we have, when each runs, how many we have ... let's make sure we talk about them as
  'postponed' and keep counting them at all times", and, turning down a standing report: "I want you
  to mention all tests when you talk about an execution. Say '696 of xxx ran, 696 passed, 2 ignored,
  287 postponed (283 passed last time), 44/44 Claudinite checks passed'".
- **Reason:** a run told by its own count hides the tests another trigger runs; four failed nightly
  on one engine for days unseen.
- **Actor:** @missingbulb (owner).
- **Model:** claude-fable-5-2
- **Mechanism:** prose at the moment of telling, with dev/tools/build/test_census.py for the totals:
  the telling is a reply, which no check of the tree sees.
- **Rejected:** a standing status issue, an issue per failing test, results uploaded from CI: the
  owner chose the telling alone.
- **Retire when:** the owner reads a run's state from somewhere that counts every test itself.
- **Landed:** #1140
