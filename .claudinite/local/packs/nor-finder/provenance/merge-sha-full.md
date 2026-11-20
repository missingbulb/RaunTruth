## 2026-11-20 · born · merge calls kept passing a 7-character head SHA and failing
- **Source:** #965 and #963 sessions on 2026-11-16, and the same API error on about ten other
  sessions' merges.
- **Reason:** the API demands the full 40-character SHA; each short one cost a failed merge call and
  a retry.
- **Actor:** @missingbulb (owner), asking for growth from the sessions since the last growth run.
- **Mechanism:** a declared action guard on the call's input; an absent field is not judged, since
  it is optional.
- **Retire when:** the merge tool resolves a short SHA, or canon's git-github pack carries the
  guard.
