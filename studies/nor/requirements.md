# The NoR Finder page's requirements

What a person using the NoR Finder page sees and can do beyond the shell, which
[the shell's requirements](../../dev/requirements/requirements.md) state with the conventions this spec
follows too: tags, their order, **Tentative** and **Undecided**. Its research requirements, which no user sees, are [docs/requirements.md](docs/requirements.md).

## `req/nor` The NoR Finder page: the algorithm proposes NoRs, the tagger corrects them, in the browser

Set by the owner on 2026-09-28: the shell running the NoR study with no backend. Its engine is
[`studies/nor/algorithm/nor_finder.py`](algorithm/nor_finder.py), tested by
[`studies/nor/tests/test_algorithm.py`](tests/test_algorithm.py).

- `req/nor/candidates/add-missed` Right-clicking the image adds a NoR the finder missed.
  <details>

  Right-clicking the image offers "Add a NoR Here" (the shell's menu, `req/shell/image/menu`): a NoR the finder proposed nothing for. It is not
  drawn as a mask; it gets measuring lines (level, centred where clicked, as long and wide as the
  image's median finalist) that the user corrects on its card, which is selected at once. It lists
  among the finalists, marked by an icon rather than text; thumbing it down removes it, as its
  card's Remove does (as can right-clicking it), and Undo brings it back. On the image it shows its lines
  and, until the user gives a verdict, a dashed yellow circle glowing between 0.8 and 0.3 opacity.
  Like any candidate it enters the ground truth only once the user approves it. Added NoRs are kept
  as GT actions, whatever the finder (`req/nor/candidates/remembered`).
  </details>

- `req/nor/candidates/decide` One selected candidate, decided on its card with a thumbs up or down.
  <details>

  Clicking a candidate selects it (a thin white ring) and clicking it again deselects it, as does
  clicking the image where there is no candidate (set by the owner on 2026-11-04). Changed by
  the owner on 2026-10-31: its card alone, with no title, hovers over the image's top right corner
  while a candidate is selected, and only then; buttons to the previous and next candidate by number
  hover over the bottom of its crop. Decisions are
  made on cards, not by clicking the image, with a thumbs up (a real NoR, with the lengths shown)
  and a thumbs down (not one) at the card's top, each saying what it does in its tooltip; pressing
  the chosen one again undoes it. Pressing either also selects that
  candidate. Cards the user voted up or down have their own border colours. Changed by the owner on
  2026-11-19: the item views are gone (missingbulb/RaunTruth#740), so double clicking a candidate on
  the image selects it, as a click does. Changed by the owner on 2026-11-03: while the study makes ground truth no card hovers over the image; the
  selected candidate is the current task's, its card in the Ground Truth Tasks box
  (`req/nor/truth/tasks`), and clicking or double clicking a candidate on the image makes it the
  current one there. Test: `studies/nor/tests/test_ground_truth_page.py`.
  </details>

- `req/nor/candidates/numbering` Each candidate keeps one number for as long as a detection lasts.
  <details>

  Numbered top to bottom. Added
  NoRs are numbered after the finder's candidates, in the order added (set by the owner on
  2026-10-07). The image, the cards, the Candidates CSV and the ground-truth file all name a
  candidate by that number (`studies/nor/tests/test_ground_truth_page.py`).
  </details>

- `req/nor/candidates/remembered` Decisions, lengths, added NoRs and checked areas are GT actions; a tagger saves them with Save Draft.
  <details>

  Each of them is one of the shell's GT actions (`req/shell/ground-truth/history`; owner, 2026-11-17, with the Edit
  History): approving a candidate, rejecting it (which deletes it from the candidates that remain), taking a verdict
  back, a length, red length or width end dropped (one action at the drop, none while it is dragged or when Escape
  cancels it) or Reset measurements, adding a NoR, and "No missed NoRs here". They live in the page until Save Draft
  (`req/shell/ground-truth/save-draft`), not in the browser per file name. A candidate keeps its id from the run
  (c87), and a run again from Find Candidates gives each candidate at the
  same place the same id and carries the tagger's actions over, skipping any whose candidate has gone; an added NoR's
  id (u3) is never reused. What the five older browser keys hold for a file (decisions, lengths, added NoRs, a
  pre-v1 list of missing marks and checked areas) is offered once, after Find Candidates, as Load earlier edits
  (`req/shell/ground-truth/legacy`): the GT actions they imply on the run's candidates, an old thumbs down a delete of
  its candidate, recorded when the tagger loads them and undone like any other; the keys go when a draft holds them,
  and until then Manage storage lists them under their image, as earlier work, to see and delete
  (`web-tests/test_storage_page.py`). A draft whose candidates are not the page's, each by its id at its place, takes
  the page's place whole: no candidate the model does not hold is shown as decided. The candidates' pixel masks are not in the log, so a draft loaded with no
  Find Candidates draws each candidate from its box, with no outline, until the finder runs again. Edit History's
  window keeps its top below the selected candidate's card at the top right, which shows outside tagging only, and its
  ring is mint (`#00ff96`), the one colour apart from the channels' and the rest of what the page draws (yellow, pink and
  blue included); mint being still a green beside the image's own, the ring has a dark casing under it. Tentative: outside annotation mode nothing is kept across visits.
  A run after stored ground truth (a file read with no history, a draft that did not replay, earlier edits loaded;
  `req/shell/ground-truth/history-carry`) carries it onto the new candidates, each decision and edited line by the
  candidate's id and then by its rounded place: an approval, a rejection, the
  tagger's lines, the NoRs added and the areas checked. An approval or a rejection of a candidate the run does not have
  is left out and counted on the status line. A `/2` file read again gives a candidate marked wrong back as a rejected
  one, and its lines as the tagger's; a `/3` file keeps `next`, the ids it will give next, so one given up is not given again.
  Test: `studies/nor/tests/test_gt_actions.mjs`, `studies/nor/tests/test_nor_gt_actions.py`, `studies/nor/tests/test_gt_actions_page.py`, `studies/nor/tests/test_ground_truth_page.py`.
  </details>

- `req/nor/cards/adjusters` A card's adjusters correct its lengths and width by dragging.
  <details>

  The adjusters are the ends of the green-to-green length, the red length and the width, each
  draggable anywhere. The four length and red ends stay on one straight axis, in order. A red end
  only slides along the axis, changing the red length. A green end drags anywhere: the axis turns,
  through it, about the other green end, and the other ends keep their distances from that end. A
  width end sets where along the axis the width is measured and, mirrored, how wide it is. On
  release the crop turns level with the new axis. The new measurements show on the image, the card,
  the summary and the downloads.
  </details>

- `req/nor/cards/options` A candidate's card shows it cropped, with the cards' options.
  <details>

  Each candidate cropped on a card: its number, state and decision buttons on top, the crop below
  (on the selected candidate's card, with a faint go-to button in its corner that shows it on the
  image), then "Lengths adjusted" with a reset (on a task's card, only a Reset measurements button:
  the task says the rest; set by the owner on 2026-11-04), and the rest. A card the user rejected
  says so. The options set the crop's context padding, turn each crop so the NoR lies level,
  and show or hide the NoR borders, the measurement bars, the lengths on the crop, the lengths on
  the card and the measurement adjusters. They open with a 4 px padding and everything on but the
  lengths on the card. Changed by the owner on 2026-11-20: one set of options for every card, the
  rejected's gone with the filters (`req/nor/find/nors-only`). A task's cogwheel holds them.
  Changed by the owner on 2026-11-19: the item views that listed the cards, each with its own sort
  and Options menu, are removed (missingbulb/RaunTruth#740); the cogwheel is the only place the
  options are set.
  </details>

- `req/nor/downloads` Download Candidates and the shell's Download Summary give CSVs; Save writes the extraction.
  <details>

  Moved by the owner on 2026-10-07. At the bottom of the Summary box, Download Candidates gives the candidates as
  CSV (every candidate, the user's decision and its measurements), and under it the shell's
  Download Summary the summary (owner, 2026-11-16: the shell's one CSV, `req/shell/summary/download`): the
  NoRs, their density and the area counted, and each measurement's statistics. Save, the last of the Ground Truth Tasks (`req/nor/truth/tasks`, moved there by the owner on
  2026-11-03, and shown only while annotating is open, `req/shell/study/stage`), gives the ground truth
  (`norfinder-ground-truth/4`, the model of the tagger's work as the shell's GT actions leave it,
  `req/shell/ground-truth/history`): a JSON file naming the image (its SHA-256, and where it was loaded
  from: its Google Drive id and link, or "local") and the finder it was run with, with
  `candidates`, the finder's candidates that remain, each with its id, number, place, `approved` once the tagger
  approved it, and its lengths and length lines (`edited` holding those the tagger moved); `added`, the NoRs the tagger
  added, each with its id, its lines and `approved`; and `checked`, the parts of the image checked for missed NoRs,
  each a box `[x0, y0, x1, y1]` in whole pixels, `x0` to `x1` not included (changed by the owner on 2026-11-19: a check
  covers pixels, whatever count of areas it was made under, `req/shell/ground-truth/areas`; a `/3` file's `areas`, each
  an area of its `grid`, read as their boxes), and `next`, the ids the candidates and added NoRs are given next. A candidate the tagger rejected is absent, and is read from the file's `history`: its
  `delete`, and the output of the run it was in; one the file lacks that no `delete` names is not known, and no label. The lab's scorer (`algorithm/truth.py`) reads it, and the `/2` files already
  curated, which list `labels` (every candidate voted up or down, and every added NoR approved). The scorer reads
  each element's state alone (a NoR, not a NoR, undecided), never where it came from, and scores an answer's place
  and, where the element carries lengths, its lengths ([`docs/scoring.md`](docs/scoring.md),
  `studies/nor/tests/test_truth.py`). A candidate nobody voted on is undecided: in `candidates` without
  `approved`, and neither a miss nor an invention.
  </details>

- `req/nor/find/blue-mask` The blue mask is only a filter: no finder blanks nuclei before finding.

- `req/nor/find/damaged` The finders analyse no pixel of a damaged area, and the scorer counts no NoR in one.
  <details>

  Set by the owner on 2026-11-19. The study owner's damaged areas (`req/shell/data/damaged`) join the pixels each
  finder leaves out of its colour thresholds and its green and red segments, as a finder that blanks the blue mask
  does, so no candidate is made of their pixels. A NoR that crosses the line keeps only its outside part, and is
  found only if that part is still a red between two greens. The blue mask stays a filter (`req/nor/find/blue-mask`):
  a damaged area is never reported as "in nucleus". The scorer leaves out the ground truth's elements and the answer's
  candidates whose centre lies in a damaged area. Test: `studies/nor/tests/test_nor_damaged.py`.
  </details>

- `req/nor/find/finders` All finders are offered; Traffic light is the default.

- `req/nor/find/nors-only` The algorithm gives the page a list of NoRs, and nothing else; the page has no filters, settings or presets.
  <details>

  Set by the owner on 2026-11-20. The tagger goes over every NoR the algorithm proposes anyway and then marks the
  missed ones, so filters, finder settings and presets have no part in the workflow: the page shows none of them, and
  no rejected candidate or rejection reason. Python runs only to find the NoRs (Find Candidates). The finder runs with
  its filters off but one, "not stick-like": while the study makes ground truth, recall comes before precision, since
  a NoR missed costs the tagger a search and a false one a thumbs down, but not at any price, and that filter buys
  much of the precision back for almost no recall (changed by the owner on 2026-11-20, every filter off having cost
  too much precision; [lab/ledger.md](lab/ledger.md) §7). The
  filters stay in the algorithm, the lab's to tune ([docs/requirements.md](docs/requirements.md) R11). Test:
  `studies/nor/tests/test_processing_box.py`, `studies/nor/tests/test_algorithm.py`.
  </details>

- `req/nor/find/one-slow-step` One image, one slow step: the finder runs only on Find Candidates.
  <details>

  Loading an image only reads it. The finder runs when the user presses Find Candidates, and that
  button shines while the finder differs from the last run's. Everything else
  (forced markings, the list, the summary) redraws from the stored candidates without
  finding again.
  </details>

- `req/nor/lab-parity` The page runs the lab's code, and shows the NoRs its default answer gives.
  <details>

  The Python it runs is the study's `algorithm/` as it is, the code the lab runs, so the finder stays
  malleable. The page shows the NoRs the lab scores as the finder's default (`req/nor/find/nors-only`).
  </details>

- `req/nor/layout` The left bar holds Load Image, Processing and Summary, or Ground Truth Tasks while the study makes ground truth.
  <details>

  Changed by the owner on 2026-10-30, 2026-10-31 and 2026-11-02. Below the Image box
  (`req/shell/left-bar/folding`) the left bar holds Processing, the candidates finder (its "how the
  algorithm works" folds away, and starts folded), open
  from the image's opening until Find Candidates and, folded once Find Candidates has run with the finder
  now chosen, titled "<finder> executed"; and Summary, which opens once the candidates are
  found, keeping its name whatever is done. Changed by the owner on 2026-11-20: Processing holds no settings and no filters
  (`req/nor/find/nors-only`). Test:
  `studies/nor/tests/test_processing_box.py`. The main area has a toolbar over two views: the image and the
  items, a card for each candidate, with the shell's switch between them at its left (`req/shell/views/second`).
  Changed by the owner on 2026-11-03: while the study makes ground truth, Ground Truth Tasks
  (`req/nor/truth/tasks`) takes Summary's place, and the main area is the image alone, with no
  switch and no item view: the image's markings are the tasks' (`req/nor/truth/marks`), switched by
  the Show menu's task-named rows (`req/nor/show-menu`).
  Changed by the owner on 2026-10-31: there is no right bar (`req/shell/left-bar/width`).
  Changed by the owner on 2026-11-04: the item view is shelved (`req/shell/views/second`), so in
  every mode the main area is the image alone, with the Show menu above it (`req/nor/show-menu`);
  removed by the owner on 2026-11-19 (missingbulb/RaunTruth#740).
  </details>

- `req/nor/metrics` On the released site each finder shows its precision and recall.
  <details>

  The finder list and the finder's note read the study's measured
  quality (`studies/nor/docs/requirements.md` R11), so that file ships with the page part
  (`studies/nor/web/`), like everything else the page fetches. Test:
  `web-tests/test_published_site.py`, which checks that every file a study's page module fetches is
  published.
  </details>

- `req/nor/show-menu` The Show menu switches each kind of marking on and off (remembered).
  <details>

  Changed by the owner on 2026-11-04: a menu above the image in every role, its rows named as the
  ground-truth tasks name them. Outside ground truth: Finalists and those the user rejected, each with
  its own line width and colour, the candidate numbers and the measuring lines. While the
  study makes ground truth, the tasks' own markings (`req/nor/truth/marks`): Finalists
  (each waiting one's outline and cross), Added NoRs, Cut out what is done, and Frame the area, all on
  at first. Test: `studies/nor/tests/test_truth_tasks_page.py`.
  </details>

- `req/nor/submit/progress` The submit button's icon says how finished the work is; its popup lists what is left.
  <details>

  Changed by the owner on 2026-10-06, twice on 2026-10-07 and on 2026-11-03. A small icon beside the Save button's text says how finished the work is: a green check when every task before it is
  done (every finalist has the user's verdict, and every area is
  checked for missed NoRs), an orange warning when some candidates have a verdict but a task is not done, and a red
  error when no candidate has one yet or a candidate the user added still waits for a verdict; the
  warning and the error pulse gently. Any animation scrolled out of view is paused, since Chrome
  would keep drawing it. The button itself stays plain. Its popup (`req/shell/extractions/save`) carries a checklist of
  short instructions (approve or reject the NoRs you added, vote on at least one candidate, vote on
  every finalist, check every area for missed NoRs, only
  images from Google Drive can be exported), each done one crossed out with a
  green check; the added-NoRs line shows only when the user added some. The issue names the image (name,
  SHA-256, Drive link, finder, what was marked). With nothing marked the popup says how to mark and
  exports nothing (`studies/nor/tests/test_ground_truth_page.py`). What happens to a submission is
  the study's R10.
  </details>

- `req/nor/summary/density` The summary gives the finalists' density, in NoRs per mm² when the file has a scale.
  <details>

  Like all of Summary, shown only while the study does not make ground truth (`req/nor/layout`).

  Set by the owner on 2026-10-06. The summary and the Summary CSV give the finalists' density over
  the area counted (the mask, else the whole image) in NoRs per mm², from the scale in the file, or
  per million square pixels when the file has none (`studies/nor/tests/test_ground_truth_page.py`).
  </details>

- `req/nor/summary/histograms` The summary shows one histogram per measurement of the finalists.
  <details>

  Changed by the owner on 2026-10-07: a count axis, the mean drawn as a line with one SD either side
  shaded, and the mean, SD and n written above it, with no separate table.
  </details>

- `req/nor/summary/mask` The shell's summary mask limits the summary and the CSVs to the candidates inside it.
  <details>

  Set by the owner on 2026-10-06; the mask itself is the shell's since 2026-11-16 (`req/shell/summary/mask`). The
  summary counts only the candidates whose centre is inside the mask, and the Candidates and Summary CSVs hold only
  those; the ground truth ignores the mask (`studies/nor/tests/test_ground_truth_page.py`). Set by the owner on
  2026-11-04: the mask shows only while the summary does, so before a model it is neither drawn nor listed in the submit
  popup, and comes back with the summary; changed on 2026-11-21: the summary shows beside the tasks while the user
  annotates (`req/shell/left-bar/shells`), so the mask is drawn then too (`studies/nor/tests/test_truth_tasks_page.py`).
  </details>

- `req/nor/truth/keys` While tagging, a key gives the open item's verdict, so the hands stay on the keyboard.
  <details>

  Set by the owner on 2026-11-15, one scheme for every study. F is a NoR (the thumbs up), J is not
  (the thumbs down), Space is the area's "No missed NoRs here", Backspace is Back, S is Skip and R is
  Reset measurements. A key is read by where it sits on the keyboard, so it works in any layout
  (Hebrew too), and does just what clicking its button does, and nothing while that button is not
  shown or is off. Keys act only while tagging (`req/shell/ground-truth/tagging`) with an item or an
  area's check open, never while typing in a field, holding a key down, with Ctrl, Alt or Cmd held, or with a
  menu or dialog open; a key that does nothing there keeps its usual effect. Each button shows its key
  in a small chip beside its label. Changed by the owner on 2026-11-16: the keys are the shell's
  (`req/shell/image/keys`), declared in the study's `study.json` and listed in the keys legend at the image's
  bottom left while they act, the study listening to no key itself; and the Show menu's ground-truth rows are
  on number keys, 1 Finalists, 2 Added NoRs, and while tagging 3 Cut out what is done and 4 Frame
  the area (changed by the owner on 2026-11-20, the Rejected row gone with the filters), each row filled blue while it is on. Test: `studies/nor/tests/test_truth_tasks_page.py`.
  </details>

- `req/nor/truth/marks` While the study makes ground truth, what is reviewed is cut out of the image.
  <details>

  Set by the owner on 2026-11-03. The markings that look at what was found (pink and blue, numbers,
  measuring lines) give way to the tasks' own. A candidate waiting for the
  user's verdict is only a thin white outline, and the current
  one has a yellow ring. Changed by the owner on 2026-11-24, the outline at 30% having been "much too subtle": the
  outline is 80% opaque at the same one-pixel width, and the cross of the candidate's length and width measurements is
  drawn over it in white, with no number or other glyph and without the red line; an added NoR waiting shows its
  cross too. Once the user decides a candidate, up or down, its area (the rectangle
  around its pixels, two pixels wider each way) is removed from the image. The area being worked on
  (`req/nor/truth/order`) is framed in yellow. Changed by the owner on 2026-11-04: once an area is
  done, every candidate in it decided and it checked for missed NoRs, the whole area is removed.
  The Show menu switches each of these markings (`req/nor/show-menu`). The ring, the frame and what is removed
  show only while tagging (`req/shell/ground-truth/tagging`; owner, 2026-11-07), the image otherwise whole.
  Where the image is removed, it shows black. Changed by the owner on 2026-11-19: no picture shows behind it, and
  the page fetches none. Test: `studies/nor/tests/test_truth_tasks_page.py`.
  </details>

- `req/nor/truth/order` The candidates come area by area, so the review fills the image one area after another.
  <details>

  Set by the owner on 2026-11-03. The image is cut into areas taken row by row, each row
  the way back from the last (so the next area always borders the one just done). Changed by the owner on
  2026-11-19: how many is the tagger's, from the shell's Areas menu (`req/shell/ground-truth/areas`), 10 by 10 at first;
  an area is checked once all of its pixels are, by checks made under any count. Changed by the
  owner on 2026-11-04: the tasks are one walk through the areas, so after a number of verdicts a
  whole region of the image is done rather than candidates scattered over it. In each area its
  finalists, then the NoRs the user added there, each top to bottom, and last
  the area's check for missed NoRs; then the next area. The grid is not drawn on the image; the area being worked
  on is framed (`req/nor/truth/marks`). Set by the owner on 2026-11-24: while the user annotates, the minimap shows the
  areas (`req/shell/ground-truth/area-map`): an area is done once each of its steps is, its check included, and begun
  once any is; clicking one goes to its first step not done, else to its check. Test: `studies/nor/tests/test_truth_tasks_page.py`.
  </details>

- `req/nor/truth/tasks` Ground Truth Tasks lists the tasks, one row each; the open one shows one item at a time.
  <details>

  Set by the owner on 2026-11-03. In the left bar while the user annotates (`req/shell/annotate/choice`), counting
  once the candidates are found; the walk opens with annotation mode, as soon as the candidates are found
  (`req/shell/ground-truth/tagging`). A bar split into one part per task, each as wide as the task is
  long and filled as far as it is done, heads one row per task, each counting only once and never
  repeating that it is a review: "13/47 Finalists", "0/100 Areas" (the areas
  checked for NoRs the finder missed), and Save (`req/nor/downloads`); a done task
  is marked done with a check (no marks on the others). The rows count; the work is one walk
  (`req/nor/truth/order`), and the row of the current item's task is the open one. Clicking a task
  goes to its next item not done along the walk. The open task's row carries a
  cogwheel that opens the cards' options as a popup (`req/nor/cards/options`), a small Back link and
  a small Skip link; under it, its candidate's card (`req/nor/candidates/decide`),
  no number, state, separator or go-to button: the crop across the box's whole width, with big
  thumbs up and down side by side under it. A verdict or a skip slides the next card in over the last one (no motion when the user asks
  for reduced motion): the walk's next item not done, and once none is left Submit. Back, set by the
  owner on 2026-11-04, returns to the item the user was on before, as often as they like, to change
  a verdict, a skip or the measurements; it slides the other way. Entering an area frames it on the
  image, filling 0.6 of the view (`req/shell/image/frame`); inside an area the image pans to
  the candidate when it is out of the middle of the view. An area's check says to right-click where
  the finder missed a NoR there; an added NoR's card waits for its verdict, and "No missed NoRs
  here" marks the area checked. The Areas task is done once every area is checked and every added
  NoR decided. The added NoRs
  and the checked areas are kept per file name. Test: `studies/nor/tests/test_truth_tasks_page.py`.
  </details>
