## 2026-11-16 · born · a study's literature folder holds only Markdown (#968)
- **Source:** the owner's rule recorded on paper-intake's file the same day.
- **Reason:** checkable from the file tree alone, so a check rather than prose; it failed on 83
  files before the folders were flattened. Markdown in a subfolder passes: the shelves study keeps
  topic notes in `literature/topics/`, and the rule is against the publisher's material, which a
  Markdown note is not.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a declared check, checkEachFile over tracked non-`.md` files under
  `studies/*/docs/literature/`, blocking.
- **Retire when:** the paper-intake rule is retired.
- **Landed:** #968
