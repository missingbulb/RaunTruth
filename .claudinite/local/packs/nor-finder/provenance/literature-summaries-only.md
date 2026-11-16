## 2026-11-16 · born · a study's literature folder holds only flat Markdown summaries (#968)
- **Source:** the owner's rule recorded on paper-intake's file the same day.
- **Reason:** checkable from the file tree alone, so a check rather than prose; it failed on 83
  files before the folders were flattened.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a declared check, checkEachFile over tracked files under
  `studies/*/docs/literature/` that are not a flat `.md`, blocking.
- **Retire when:** the paper-intake rule is retired.
- **Landed:** #968
