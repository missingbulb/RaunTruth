## 2026-11-26 · born · four tests failed every night on one engine among the flakes
- **Source:** Full tests, 2026-11-22 to 11-25: test_explore's screenshot (Firefox, WebKit),
  test_manage_storage and test_setup_page (Firefox), test_vessel_gt_actions_page (WebKit), each on
  every run of its engine.
- **Reason:** read as flakes they stay red unexamined; each has one cause on its engine.
- **Actor:** @missingbulb (owner), in the session of pull request #1140.
- **Model:** claude-fable-5-2
- **Landed:** #1140
- **Mechanism:** prose: telling always from sometimes takes reading several runs.
- **Retire when:** the nightly files its own failures by how often each recurs.
