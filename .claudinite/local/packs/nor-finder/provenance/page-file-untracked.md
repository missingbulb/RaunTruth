## 2026-11-20 · born · page files left untracked failed page tests with a misleading cause
- **Source:** #1000 (web/summary_mask.js) and #1032 (web/pending.js): each new page module was
  untracked, so the build omitted it and service-worker or page tests failed until it was added.
- **Reason:** the build ships git ls-files; the failure looked like a regression, costing a
  diagnosis and a comparison run on main.
- **Actor:** @missingbulb (owner), asking for growth from the sessions since the last growth run.
- **Mechanism:** a declared work check (flagUntrackedFilesMatching), the shape of basics'
  untracked-test-file, scoped to the trees the build ships.
- **Retire when:** the build reads the working tree, or canon's untracked check covers shipped
  files.
