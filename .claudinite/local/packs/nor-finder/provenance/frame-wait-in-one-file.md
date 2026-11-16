## 2026-11-13 · born · frame waits go through one helper
- **Reason:** nineteen copies of a double-frame wait across the drivers, each choosing its own
  count.
- **Actor:** @missingbulb (owner), from the timers review.
- **Model:** claude-opus-5-5
- **Mechanism:** a regex over the test dirs, the helper's file excluded; frame waits are
  deterministic, so confining them is enough.

## 2026-11-16 · reworded · the fix cut to the 32 words a declared check's message may run
- **Reason:** basics/declared-check-messages caps a fix at 32 words; the first run of the checks on
  a pull request (#974) found it past.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
