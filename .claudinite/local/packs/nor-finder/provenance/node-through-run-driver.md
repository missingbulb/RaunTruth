## 2026-11-26 · born · a hung driver launched by its test said nothing
- **Source:** #1114, and test_status_bar's 120 s hangs of 2026-11-23 to 11-25.
- **Reason:** run_driver asks a driver at its bound to stop and prints what the page did; a test's
  own subprocess.run kills it in silence.
- **Actor:** @missingbulb (owner), in the session of pull request #1140.
- **Model:** claude-fable-5-2
- **Landed:** #1140
- **Mechanism:** a declared line check over the tests' Python, blocking: the launch is one line's
  shape.
- **Retire when:** tests launch no Node.
