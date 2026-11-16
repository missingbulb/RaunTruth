## 2026-11-13 · born · page code sets no raw timer outside web/pacing.js
- **Reason:** the owner asked for no set-time timers in production: visual effects become CSS
  motions, background cadences one module that pauses in a hidden tab.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a regex over page code, with a `timed here:` marker for a timer only a raw one can
  be (a worker, a debounce of local compute); a module wrapper alone, without the check, would let a
  new raw timer in unseen.
- **Rejected:** a production clock hook for tests - Playwright's clock already fakes every page
  timer, and tests bend their own surface.

## 2026-11-16 · reworded · the fix names the animations-off rule a motion something waits on needs
- **Reason:** the fix sent converted timers to transitionend/animationend, which animations off
  never fires.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5

## 2026-11-16 · reworded · the fix cut to the 32 words a declared check's message may run
- **Reason:** basics/declared-check-messages caps a fix at 32 words; the first run of the checks on
  a pull request (#974) found it past.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
