## 2026-11-19 · born · page code hands the console text alone, through web/log.js (#1004)
- **Reason:** #1004's 4 KB kept per open was the errors the page warned with, each held with its
  stack by the browser's console storage, with no DevTools attached too, up to its 1000-message cap.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a regex over page code, one module allowed: a regex cannot tell an error argument
  from a string, and a wrapper alone would let a raw call in unseen.
- **Rejected:** only tightening the page memory test - it sees what one stand-in run warns of, never
  a rarer path handing the console a large object.
