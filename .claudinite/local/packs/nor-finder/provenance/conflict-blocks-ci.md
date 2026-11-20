## 2026-11-20 · born · two sessions waited on CI that a merge conflict kept from starting
- **Source:** #1035 and #1032 on 2026-11-19: each pushed onto a branch conflicting with main, saw no
  runs, and waited (20 and 30 minutes) or dispatched a run before finding the conflict.
- **Reason:** GitHub's docs: workflows do not run on `pull_request` activity while the pull request
  has a merge conflict.
- **Actor:** @missingbulb (owner), asking for growth from the 2026-11-19 sessions.
- **Mechanism:** prose; the diagnosis reads live GitHub state, which no check over the tree, the
  diff or a tool call's input sees.
- **Retire when:** the canon's git-github pack carries it.
