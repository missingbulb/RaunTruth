## 2026-11-19 · born · a deadline written as a number guesses how long one wait may take
- **Source:** #935's deadline-literal item, taken up on #1025 at the owner's word; 935 asked it to
  land warn-only first.
- **Reason:** 212 numeric deadlines, each a guess a slow runner must have raised by hand; one name
  per kind is answered in one place.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a declared line check over the tests, advising; web-tests/deadlines.mjs holds the
  kinds, STEP the first (the 45 default timeouts moved onto it).
- **Retire when:** never while tests drive a page; raise it to block once the advisories reach zero.
