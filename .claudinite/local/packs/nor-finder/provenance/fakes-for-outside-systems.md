## 2026-11-19 · born · test fakes only for outside systems, once, in every test, each approved
- **Source:** the owner on #1033: "Mocking objects should be done once (hooking up the harness),
  uniformly (most mocks should be active in most tests, not just "for a specific case), and
  judiciously (I want to approve your decisions to mock an object)... mock objects should be added
  for objects that integrate with other systems, and very rarely on internal implementations." the
  owner on #1033: "Use "Rarely, asked first", but the pyodide is an external process invocation, so
  that's legit, and a settings provider or a studies provider is something that talks to external
  systems, so you can create a fake object at the seam... Make sure the fake is as close to the
  external system as possible, and replace only that-external-system-specific-code, and not general
  handling of the requests/return values."
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** prose for the approval and the choice of what to fake, which no check can judge;
  the checks browser-from-harness and outside-systems-faked-once hold the once-and-everywhere half.
- **Reason:** "never" was stronger than the owner's "very rarely", and the tree's stand-ins
  contradicted it.
