## 2026-11-15 · born · split a branch's sound changes out from the one that fails
- **Source:** the owner, on #932: "take your changes, and move them one-by one (not by file, by
  logical change) to a new branch, then run tests there, and move all the features except the
  problematic one, and merge the sane ones, and continue working on the problematic one here, on a
  smaller change."
- **Retire when:** a branch's failures are placed by other means before they hold up its sound
  changes (CI that tests each commit, say).
- **Reason:** #932's suite turned up a memory-test failure that bisecting whole files could not
  place (it proved a flake main has too); the owner asked to move the logical changes one by one to a new branch, merge the sound
  ones and keep working on the rest.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** prose in the repo's pack: a judgment over a live branch, which no check can see.
- **Landed:** #969 (the split), #932 (the remainder).
