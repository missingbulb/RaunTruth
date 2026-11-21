## 2026-11-20 · born · two sessions waited on CI that a merge conflict kept from starting
- **Source:** #1035 and #1032 on 2026-11-19: each pushed onto a branch conflicting with main, saw no
  runs, and waited (20 and 30 minutes) or dispatched a run before finding the conflict. #796: after
  the owner's LGTM a cancelled job was rerun on a head that conflicted with main, and the turn
  waited 22 minutes until the owner asked for the conflicts to be fixed.
- **Reason:** GitHub's docs: workflows do not run on `pull_request` activity while the pull request
  has a merge conflict. the rule fired only on a pull request with no runs, and this one had stale
  ones.
- **Actor:** @missingbulb (owner), asking for growth from the 2026-11-19 sessions.
- **Mechanism:** prose; the diagnosis reads live GitHub state, which no check over the tree, the
  diff or a tool call's input sees.
- **Retire when:** the canon's git-github pack carries it.
