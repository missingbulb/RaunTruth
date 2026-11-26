## 2026-11-22 · born · set-up said once, in the test's terms, instead of each fake's internals
- **Source:** a survey of the page-test drivers: one intent set up as many as six different ways, 21
  drivers each with its own open helper.
- **Actor:** @missingbulb (owner): "have a 'World' object in tests that knows how to set up the fake
  externals (or provides a fluent, clean API)".
- **Mechanism:** prose for the intent, with the declared check `world-set-up` on the hand-written
  signatures (a fake's state assigned or pushed, the page's sign-in and welcome records, the service
  worker removed); its rule and its check share this file. the declared check's pattern gains
  `drive.folder({`/`drive.file({`.
- **Retire when:** the fakes keep no state a test could reach but through the World.
- **Reason:** the owner chose fluent Drive folders and images as the next layer; the check holds it.
