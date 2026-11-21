## 2026-11-19 · born · a loop of so many frames waiting for a condition is a timeout counted in frames
- **Source:** the owner, on #1025: "review all the timeouts and waits that are not connected to a
  specific async action ending ... first create a check to prevent it recurring, see it fail, then
  fix."
- **Reason:** `test_study_index_page` failed under a parallel run on 50-frame loops waiting for the
  stand-in's writes; a loaded runner draws the frames before the work ends.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a declared line check over the tests, blocking; the fix is `idle(page)`, which
  waits on the page's own count of its work (web/pending.js).
- **Rejected:** widening `frame-wait-in-one-file` (it guards where frames are waited, not what for).
- **Retire when:** never while tests drive a page.
