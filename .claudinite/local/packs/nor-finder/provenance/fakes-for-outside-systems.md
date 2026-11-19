## 2026-11-19 · born · test fakes only for outside systems, once, in every test, each approved
- **Source:** the owner on #1033: "Mocking objects should be done once (hooking up the harness),
  uniformly (most mocks should be active in most tests, not just "for a specific case), and
  judiciously (I want to approve your decisions to mock an object)... mock objects should be added
  for objects that integrate with other systems, and very rarely on internal implementations."
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** prose for the approval and the choice of what to fake, which no check can judge;
  the checks browser-from-harness and outside-systems-faked-once hold the once-and-everywhere half.
