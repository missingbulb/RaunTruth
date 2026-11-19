## 2026-11-19 · born · a test routes no outside address of its own; the fakes under web-tests/fakes/ answer
- **Reason:** 23 drivers each answered Google or jsDelivr with routes of their own; the owner asked
  for each outside system to be faked once, uniformly.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a regex for a route on a literal outside address or an upper-case address constant;
  a reserved `.example` host, a test's own made-up outside, is left alone.
