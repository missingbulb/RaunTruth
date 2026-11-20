## 2026-11-20 · born · two study test files of one name stopped pytest's collection
- **Source:** #744: vascular's test_processing_box.py collided with NoR's once main came in, and was
  renamed in dc02060.
- **Reason:** with no packages and no import mode set, pytest imports a test module by its file
  name; studies copy each other's contracts, so names recur.
- **Actor:** @missingbulb (owner), asking for growth from every session since the last growth run.
- **Mechanism:** a coded world check over tracked test modules, since it groups by name; proved on
  dc02060^ (finds both files) and silent on today's 829 tracked files.
- **Retire when:** pytest runs with `--import-mode=importlib`, or the test folders become packages.
