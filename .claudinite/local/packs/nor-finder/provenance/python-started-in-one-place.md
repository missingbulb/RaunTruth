## 2026-11-17 · born · the page reaches Python through the worker alone
- **Reason:** the page's one way into a study's Python is ready() and Session.call(action, args) in
  the worker; the owner asked that no other entry point grow.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a declared line check over page code (web/, studies/*/web/) for the Pyodide calls
  that start or drive Python, outside web/worker.js, web/bridge.js and web/tiff_codecs.js. Tests and
  benchmarks drive Pyodide on purpose and are out of scope.
