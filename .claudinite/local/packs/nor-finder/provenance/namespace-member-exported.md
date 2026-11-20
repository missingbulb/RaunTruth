## 2026-11-20 · born · a member read its module stopped exporting went unnoticed to main
- **Source:** #1037 dropped `GRID` from gt_actions.js while old_marks.js still read `N.GRID`; fixed
  in #1039 after Full tests on main went red.
- **Reason:** the read became `area < NaN`, so restoring old marks silently dropped every checked
  area; only a page test reached it, and a flake masked that.
- **Actor:** @missingbulb (owner), asking for growth from the 2026-11-19 sessions.
- **Mechanism:** a coded world check, since it pairs each `import * as` with what the target
  exports, following `export *`; proved on the tree at 38f422c^, where it finds old_marks.js:49.
- **Rejected:** ESLint's import/namespace rule: a new dependency for one rule.
- **Retire when:** the page's JS is type-checked or linted with namespace resolution.
