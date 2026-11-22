## 2026-11-22 · born · a round trip through a second visit flaked on the races between the visits
- **Source:** the status-bar test's flake (#1079): a second tab, reproduced as a race in the
  settings sync.
- **Actor:** @missingbulb (owner): "make tests start from a given state (stored settings) and end.
  No two sessions needed."
- **Mechanism:** prose for the split, held by the coded check `second-visit-in-test` for its
  signature.
- **Reason:** a second visit also runs whatever the first left in flight (a debounced save, a sync,
  storage events).
- **Retire when:** the page keeps nothing across visits, or the harness itself starts every case
  from seeded storage.
