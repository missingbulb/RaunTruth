## 2026-11-26 · born · the settings save was work idle() could not see
- **Source:** web/account.js's debounced save and its sync, counted nowhere until #1140; idle()
  returned with the file still holding the old value (the failing check in
  web-tests/account_driver.mjs).
- **Reason:** idle() is only as true as what the page counts; the harness fails an idle page with an
  outside call on its way, which catches a call but not a timer still waiting.
- **Actor:** @missingbulb (owner), in the session of pull request #1140.
- **Model:** claude-fable-5-2
- **Landed:** #1140
- **Mechanism:** prose for the author of page code; web/pacing.js counts every debounce, and idle()
  names an uncounted outside call.
- **Retire when:** no page work can start outside web/pending.js.
