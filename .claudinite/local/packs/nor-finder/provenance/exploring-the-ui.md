## 2026-11-21 · born · an exploratory walk of the page as the last check before hand-off (#1015)
- **Source:** the owner, as the orchestrating session relayed it: load the UI in isolation and "play" with it,
  random but reasonable, exercising the changed actions beside the unchanged ones, on fakes instrumented for every
  kind of user; fix bugs and simple gaps, and screenshot what is the owner's call.
- **Reason:** preset specs and paths check only what someone thought to write down; a seeded walk with oracles
  finds what the change does beside the rest of the page.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a rule naming the trigger, finishing feature work before hand-off, which no file edit predicts,
  so it stays prose; the procedure in a workflow skill it names; the tool under `web-tests/explore/`.
- **Retire when:** the explorer runs on its own for every page pull request and reports there, leaving no
  hand-off step for a session to remember.
