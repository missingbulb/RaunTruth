## 2026-11-19 · born · a wait whose miss is swallowed is a sleep in disguise
- **Source:** #935's swallowed-wait item, taken up on #1025 at the owner's word: "please include the
  problems there in your analysis and defect prevention".
- **Reason:** 99 waits carried on in silence when their condition never came, so a miss surfaced, if
  at all, as a far-off check failing.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a declared line check over the tests, blocking: the line holding the wait, or a
  continuation line closing it, with its rejection turned into a value; the fix is `seen()`, which
  says on stderr what was not seen.
- **Rejected:** removing every catch outright (a wait whose miss its next check reads is legitimate,
  and needs only to say so).
- **Retire when:** never while tests drive a page.
