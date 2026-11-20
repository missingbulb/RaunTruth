## 2026-11-20 · born · handovers called passing went red in CI and cost a second approval
- **Source:** #1035 ran only its study's tests and failed CI's requirement-tag test; #1032 skipped
  `cn check work-and-world` and failed the 32-word message cap, after the owner's conditional LGTM.
  #1023's 21-word Version-history line went red in CI and waited for the owner to ask; #924 and
  #1008 added weight to the suite and cn check runs.
- **Reason:** each red run came after the change was handed over as passing, so the fix landed after
  approval and needed approving again. CI's version-history step is as cheap to run before a push as
  the others, and it failed the same way.
- **Actor:** @missingbulb (owner), asking for growth from the 2026-11-19 sessions.
- **Mechanism:** a coded work check over the transcript, reading the pytest paths and the cn check
  subcommand from tests.yml so it never holds a second copy of what CI runs; silent where no
  transcript exists. each `python3 <script>.py check` step in tests.yml becomes a required run, read
  from the workflow like the others.
- **Rejected:** prose naming the commands: the warm-up doc already names them and #1035's session
  ran a subset anyway.
- **Retire when:** CI's fast job is run for the session by a hook, or pushes are gated on it.
