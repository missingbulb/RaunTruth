## 2026-11-26 · born · a test changed the world under work the page had under way
- **Source:** the failed runs of Tests and Full tests, 2026-11-20 to 11-25: test_account (#1081),
  test_data_management (#1080), test_study_members, test_annotating, test_status_bar, each a save or
  sync meeting a token run out, the network gone or another device's write.
- **Reason:** the harness makes setOffline and tokenRunsOut wait and says a fake's knob turned under
  work, but a reload, a navigation or a new knob has no such guard.
- **Actor:** @missingbulb (owner), in the session of pull request #1140.
- **Model:** claude-fable-5-2
- **Landed:** #1140
- **Mechanism:** prose, beside the harness's own waiting knobs: leaving the page and knobs not yet
  written are judgment a line check cannot see.
- **Retire when:** every way a test changes the world goes through a knob that waits.
