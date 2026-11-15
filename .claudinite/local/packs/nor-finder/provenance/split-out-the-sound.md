## 2026-11-15 · born · split a branch's sound changes out from the one that fails
- **Reason:** #932's suite turned up a memory-test regression that bisecting whole files could not
  place; the owner asked to move the logical changes one by one to a new branch, merge the sound
  ones and keep working on the rest.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** prose in the repo's pack: a judgment over a live branch, which no check can see.
- **Landed:** #969 (the split), #932 (the remainder).
