## 2026-11-23 · born · the explorer walked weekly, each new finding an issue
- **Source:** the owner: "The change also added a skill to do a random UI walk that detects issues. I think I want
  that running weekly, and open issues for the detected problems."
- **Reason:** the walk ran only when a session remembered it before a hand-off, so what it finds beside the changed
  parts surfaced only on the change that happened to run it.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a scheduled task, weekly and only when the repo moved, as the mutation sweep is; its agent runs the
  exploring-the-ui skill and files issues, changing no file, since sorting a finding into a bug, a gap or a call is
  judgement code cannot make.
- **Retire when:** the explorer runs on every page pull request and reports there.
