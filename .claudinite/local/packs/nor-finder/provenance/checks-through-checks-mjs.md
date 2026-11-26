## 2026-11-26 · born · one check() for every driver
- **Source:** the owner asked for tests aligned to uniform launchers and harnesses, with no tests
  left over from earlier versions.
- **Reason:** 37 drivers wrote their own FAILED helper, some ending the run at the first failure and
  some going on.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a declared line check on a quoted FAILED: every hand-written helper prints it, and
  the shared module is the one place left that may.
- **Rejected:** keeping check() in harness.mjs: a driver of plain code would then need Playwright to
  say a check.
