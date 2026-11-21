## 2026-11-19 · born · a deadline a test keeps for itself is a poll written again
- **Source:** #935's hand-rolled-poll item, taken up on #1025 at the owner's word.
- **Reason:** six loops kept their own `Date.now() + N` deadline, each with its own bound and wake,
  two of them the drivers' `quiet()` that a loaded run starves.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a declared line check over the tests outside web-tests/page_until.mjs, blocking;
  the fix is `until()` for the page's state or `untilHeard()` for the test's own, woken by what the
  test hears.
- **Retire when:** never while tests drive a page.
