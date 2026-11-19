## 2026-11-19 · born · a warning or error a test sees is declared by its case, loosely, or fails the run
- **Source:** the owner on #1033: "Any write to "Error" or "warn" during test runs should be
  explicitly expected in the test, and should be special to the tested case... every test should end
  with a "make sure no errors or warnings happened" (make sure not every test has to write that
  code, and the test runner does it for them)... avoid expecting full text matching so that tests
  need to change on language change."
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** the harness fails any run with an undeclared message at its exit; the prose carries
  how a case declares one, which the harness cannot judge.
- **Rejected:** a stable key per page warning - the owner chose loose patterns, since not every
  message is the page's own.
