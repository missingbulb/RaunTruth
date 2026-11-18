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

## 2026-11-17 · scope-changed · every tool under dev/tools, not three named ones
- **Reason:** a hand-run tool for the page's guide screenshots (dev/tools/google_guide) landed
  beside the check and failed main; dev/tools is where the repo's tools live, so it is allowed as a
  folder.
- **Actor:** Claude, fixing its own check's break of main.
- **Mechanism:** the same declared check, its allowlist widened from three dev/tools folders to
  dev/tools.

## 2026-11-18 · scope-changed · the lab joins the folders Python may live in
- **Reason:** the owner moved every study's lab into one shared harness at a top-level lab/ (#1011).
- **Actor:** @missingbulb (owner).
- **Mechanism:** the same declared check, lab/ added to its allowlist.
