## 2026-11-15 · born · converted from the tests-draw-images prose by the prose-to-checks sweep (#944)
- **Source:** the owner, on PR CI failing without the NoR slide: "you don't need actual images. You
  can create them on the run"; converted by the prose-to-checks sweep (#944).
- **Reason:** a test reading a study's downloaded `data/raw` runs only where the images were
  fetched, so CI never exercises it.
- **Actor:** claudinite/prose-to-checks-sweep.
- **Mechanism:** a declared line check over the page and study tests: one path into `data/raw` is
  one line.
- **Retire when:** a test genuinely checks a study's real data.
