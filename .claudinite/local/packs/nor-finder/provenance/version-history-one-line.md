## 2026-11-20 · born · branches with two Version-history lines lost one silently
- **Source:** three sessions of 2026-11-07: #855 lost its first line in the squash; #847 and #842
  caught it just before pushing.
- **Reason:** the version history keeps one line per pull request, and nothing said the others were
  dropped.
- **Actor:** @missingbulb (owner), asking for growth from every session since the last growth run.
- **Mechanism:** a coded work check over the branch's commit messages, advisory because rewording in
  a later commit is the designed path; it names every line rather than which one wins, so it holds
  no copy of the version-history tool's ordering.
- **Retire when:** the version-history check itself reports the lines it drops.
