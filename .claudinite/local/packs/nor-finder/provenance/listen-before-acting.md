## 2026-11-26 · born · a listener attached after the answer hung a driver for its whole bound
- **Source:** #1114: memory_page_driver.mjs looked for the page's worker frame by frame and attached
  its listener after the first answer had come; 240 s with no output, run 45191796682.
- **Reason:** a lost wake-up is silent, and nothing in the wait says it was missed.
- **Actor:** @missingbulb (owner), in the session of pull request #1140.
- **Model:** claude-fable-5-2
- **Landed:** #1140
- **Mechanism:** prose: which listener belongs to which action is not a line's property.
- **Retire when:** never while tests wait on events.
