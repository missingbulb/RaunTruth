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

## 2026-11-25 · strengthened · the walk is taken by three personas, QA, a user and a designer
- **Source:** the owner: "Currently it simulates a user who knows what they are doing ... in a
  'white box' way - you have all the spec in front of you. I want to have the random walk be done by
  3 different personas: QA, graphic designer, and user ... before a UI action is taken, the 'user'
  is asked to hypothesize what would happen, then do the action, then ask the user if that is what
  they expected."
- **Reason:** a walk checked against the spec finds where the page breaks its own rules, never where
  the rules surprise a newcomer or the page looks uneven.
- **Actor:** @missingbulb (owner).
- **Model:** claude-fable-5-2
- **Mechanism:** the same workflow skill, its description naming the personas; the
  hypothesis-act-verdict order is held by `web-tests/explore/session.mjs`, which refuses a step out
  of order, rather than by the brief's prose; the user is a fresh subagent because a fork carries
  the session's knowledge of the page.
- **Rejected:** playing the user in the main session (it has read the spec); a prose-only
  instruction to state the expectation (a step described in prose is one the agent can skip).
- **Retire when:** the personas' walks run on their own for every page pull request and report
  there.
