## 2026-11-03 · born · an async waitForFunction predicate never waits (#680)
- **Source:** #669's follow-up sweep: six such waits in four drivers, one (old_worker) failing about
  one Firefox run in five.
- **Reason:** Playwright takes the predicate's promise as truthy on every engine, so the wait
  silently does nothing; until() in web-tests/page_until.mjs is the wait that works.
- **Actor:** @missingbulb (owner), who asked for the guard.
- **Mechanism:** a declared line check over the test drivers: the pattern is one token on one line,
  so a regex catches every instance and nothing else.
- **Retire when:** Playwright's waitForFunction awaits a predicate's promise.
- **Landed:** #680

## 2026-11-16 · reworded · the fix cut to the 32 words a declared check's message may run
- **Reason:** basics/declared-check-messages caps a fix at 32 words; the first run of the checks on
  a pull request (#974) found it past.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
