## 2026-11-17 · born · what the page's Python imports is what its study.json installs
- **Reason:** an import the page does not install fails only in the browser, the first time someone
  asks for the action reaching it; the owner asked that the browser's Python have explicit entry
  points and nothing else.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a coded check, since it walks each study's imports from its entry module across its
  python.paths and reads the study.json; an import ending `# native only: <reason>` is the declared
  boundary of what the page runs.
- **Rejected:** following module-level imports alone: the page's own path reaches the lab through an
  import inside a method (vascular's `import lab`), so function-level imports are followed and the
  native-only ones are marked.
- **Retire when:** the worker refuses, at load, any import its study.json does not install.
