## 2026-11-16 · born · one Tests run per push made bursts of pushes run the suite once per commit
- **Source:** the owner, on the run count: "I just want to eliminate the tons of redundant tests we
  run"; chose this alongside cancelling superseded runs.
- **Reason:** one branch ran Tests 8 times in 6 minutes, once per pushed commit.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** prose in the repo's own pack; when a batch is done is a judgment no hook makes. The
  workflow's cancellation covers the runs this rule misses.
- **Retire when:** CI runs once per merge rather than per push, e.g. a merge queue.
