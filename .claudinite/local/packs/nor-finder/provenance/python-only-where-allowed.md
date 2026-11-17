## 2026-11-17 · born · Python kept to the studies, the page tests' fixtures and the build tools
- **Reason:** the owner expected JavaScript everywhere but the study algorithms; Python had grown
  into the build and the test harness, so the places it is allowed are fixed before it spreads
  further.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a declared tracked-file check: an allowlist of folders, since where a file lives is
  the whole question. The allowlist is every study folder but its `web/`, `web-tests/`,
  `dev/tools/{build,trick_pool,previews}/` and `.claudinite/`.
- **Rejected:** deriving the study folders from each study.json's python.paths: a study's tests, lab
  and research scripts are Python the page never loads, and page-python-imports already polices what
  the page does load.
- **Retire when:** the build or the page tests leave Python, which narrows it instead.
