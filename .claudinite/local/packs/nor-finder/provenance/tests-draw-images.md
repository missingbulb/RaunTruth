## 2026-11-07 · born · tests draw their images; no study data in any test
- **Source:** the owner, on PR CI failing without the NoR slide: "you don't need actual images. You
  can create them on the run, and you can create small ones that will make the test efficient, like
  128/128".
- **Actor:** @missingbulb (owner).
- **Mechanism:** prose in the repo's pack; which image a test needs is decided while writing it.
- **Retire when:** a test genuinely checks a study's real data.

## 2026-11-15 · converted · a test may not read a study's downloaded data/raw
- **Source:** the owner, on PR CI failing without the NoR slide: "you don't need actual images. You
  can create them on the run"; converted by the prose-to-checks sweep (#944).
- **Reason:** a test reading a study's downloaded `data/raw` runs only where the images were
  fetched, so CI never exercises it.
- **Actor:** claudinite/prose-to-checks-sweep.
- **Mechanism:** a declared line check over the page and study tests, blocking after its grace
  window: one path into `data/raw` is one line. The prose stays: it also says what to do instead and
  covers images a test reads from elsewhere.
- **Retire when:** a test genuinely checks a study's real data.
