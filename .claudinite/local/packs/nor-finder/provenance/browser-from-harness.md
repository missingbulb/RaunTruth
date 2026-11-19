## 2026-11-19 · born · page tests launch their browser through web-tests/harness.mjs
- **Reason:** #1004's growth was the warnings of fetches no fake answered, in a test whose browser
  no shared code watched; the owner asked for the fakes and the no-warnings check to come from the
  harness, not each test.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a regex over test code for a launch call; the launch is the one place every driver
  passes through.
