## 2026-11-03 · born · how a study's page lets a person make ground truth (#720)
- **Source:** the owner, building NoR's tasks: "take my initial instructions on what the rationale
  of tasks and how we want to build this UI … a skill to be used when creating GT creation
  controls."
- **Reason:** NoR's GT redesign set the owner's rationale (a to-do list, one item at a time, area by
  area, progress cut out of the image, a lean box); every other study's GT controls should start
  from it rather than re-derive it.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5.5
- **Mechanism:** a guidelines skill picked by its description, with a RULES.md line pointing at it,
  since GT controls are built in study panels no single file-edit path predicts.
- **Retire when:** the shell owns the ground-truth tasks UI itself, so studies only declare their
  tasks.
- **Landed:** #720

## 2026-11-04 · reworded · the reveal picture is a link, fetched from its own host
- **Source:** the owner: "Dog photo link should be set in the study.json file and fetched, not
  served by us."
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5.5

## 2026-11-04 · reworded · the tasks are one walk area by area, with Back; the Show menu stays, task-named (#739)
- **Source:** the owner on the NoR page: separate passes left the image scattered and never finished
  region by region; "we need a way to go back"; the display options belong on the image, aligned to
  the tagging actions; the mask stays where the summary is; rejected candidates need the finalists'
  adjusters.
- **Reason:** "No Go back" and per-task ordering were wrong guidance for every study that follows.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5.5
- **Landed:** #739

## 2026-11-05 · reworded · the NoR reference build's requirements moved to studies/nor/requirements.md
- **Reason:** the path it named no longer holds req/nor (req/checks/spec-layout).
- **Actor:** @missingbulb (owner).

## 2026-11-07 · reworded · tagging starts and stops by hand
- **Reason:** jumping into the first task as the algorithm finished was wonky; entering tagging is
  explicit, for every study.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5.5
- **Source:** the owner, on the vascular GT process: "entering GT tagging mode should be explicit.
  Obviously I'm saying things relevant to the shell and all studies"; "There should be a 'Stop
  tagging' button".
- **Landed:** #859

## 2026-11-19 · reworded · what is cut out shows black; no picture behind the image
- **Reason:** the owner asked to delete the reveal picture: "Drop the image, the fetch, the relevant
  study settings."
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5

## 2026-11-21 · policy-changed · annotating is the walk; statistics sit beside the tasks
- **Reason:** the role menu and the Start/Stop tagging buttons are gone; after an image loads the
  person chooses how to annotate it (local work, an annotation from Drive, or from scratch), and
  choosing one enters the walk. The Summary shows whenever the image carries a model, so statistics
  now sit beside the tasks instead of being for viewing only. Replaces "tagging starts and stops by
  hand" and "statistics are for viewing, not for making ground truth".
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** the skill's prose, loaded when building or changing ground-truth controls; the walk's entry is
  now the page's per-image choice, which its tests pin.
- **Source:** the owner, on #1015: "only the last option should actually show the algorithms
  runner"; "once there's any model on the image, no matter the progress of it, I want the 'summary'
  block showing."
- **Landed:** #1036

## 2026-11-22 · reworded · the old stages GT, PostGT and PreGT became the five stages
- **Reason:** the rule and skill named stages that no longer exist; annotating is open in Setup,
  Develop and Analyze.
- **Actor:** Claude, work package WP6 of the study-stages plan (owner's decisions of 2026-11-22).
- **Model:** claude-opus-5-5

## 2026-11-26 · reworded · a done task stays as a ticked line
- **Source:** the three-persona walk of 2026-11-25; a persona ticked the fixture's one task and lost
  its controls with only Undo to get back.
- **Reason:** the owner chose "Keep a ticked row": the finished task stays as one ticked line that
  can be unticked, only its tools fold away.
- **Actor:** @missingbulb (owner).
- **Model:** claude-fable-5-2
