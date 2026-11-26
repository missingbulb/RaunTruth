## 2026-11-26 · born · tests skip without Node in one place
- **Source:** the owner asked for tests aligned to uniform launchers and harnesses, with no tests
  left over from earlier versions.
- **Reason:** 83 test files each looked Node up and skipped themselves, copies of what run_driver
  does.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a declared line check over the Python tests: the lookup and the skipif are both
  one-line signatures.
