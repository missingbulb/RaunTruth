## 2026-11-16 · born · code waiting on a CSS motion's end says how it ends with animations off
- **Source:** the owner, after #969: "add some of those lessons to the project's local pack on how
  to do things".
- **Reason:** in #932/#969 timers turned into CSS motions were stopped by the animations-off rule,
  which strips every animation and transition: a popup no longer closed on leave and the busy
  counter froze.
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a regex over page code with an `ends with animations off:` marker; a CSS-only clock
  nothing listens to rides on timers-in-one-file's fix text instead.
- **Retire when:** animations off no longer cancels motions wholesale (an allow-list replaces `* {
  … !important }`).
