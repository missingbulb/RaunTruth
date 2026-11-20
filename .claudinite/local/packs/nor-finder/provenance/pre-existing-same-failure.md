## 2026-11-20 · born · a flake on both sides hid a branch's deterministic regression
- **Source:** #1037's session saw test_gt_actions_page fail on the branch and on main, both at the
  old menu flake (#1040), and merged; the regression below it broke main until #1039.
- **Reason:** "fails on main too" was judged on the test's name, not on where it failed, and the
  early flake ended both runs before the regression's assertion.
- **Actor:** @missingbulb (owner), asking for growth from the 2026-11-19 sessions.
- **Mechanism:** prose; comparing two runs' first failures is a judgment no check sees.
- **Retire when:** #1040's flake is fixed and the page tests have no known flake to mask behind.
