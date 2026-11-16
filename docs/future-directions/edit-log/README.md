# The ground-truth change log, with undo and a History panel (future direction)

A design, not a plan: nothing here is built, approved or tried on a person. The owner asked for a
tagger's ground truth to be kept as a sequential log of every change to the GT model, from the image
opening, through the algorithm's run, to each correction; for that log to travel with the model to Drive
and back; for replay to reproduce the model without re-running the algorithm; and for undo and redo with
the stack shown as a list. [`mockup.html`](mockup.html) / [`mockup.png`](mockup.png) draw the panel.

![The History panel under Ground Truth Tasks](mockup.png)

## How to read the evidence

| mark | source | trust |
|---|---|---|
| **[repo]** | Read in this repo, 2026-11-16 | Exact |
| **[measured]** | A throwaway Node script over `studies/vascular/tests/fixtures/cd31_frontal_x20_r_1_slices1-12.vessels.json` (680 points, 646 segments), one run, this container; script not kept | Indicative of order of magnitude |
| **[estimate]** | Sized from a synthetic row of the shape the code writes; no real NoR run (the container has no SciPy) | Rough |
| **[exact]** | Page fetched with `curl`, text read from disk | Exact text |
| **[fetch]** | Page read through a summarizing fetch tool | Content right, wording not byte-exact |
| **[S]** | Search-result summary only (Adobe's own page answered 403) | Indicative; re-verify |

## The decisions in one table

| | Decision | Why |
|---|---|---|
| Name | A **change** (code), kept in the **change log**; the user sees **History**. Modules `web/truth_changes.js` (pure) and `web/truth_history.js` (the panel), spec ids `req/shell/ground-truth/history…` | "Action" is taken twice (`web/action_log.js`, the problem report's click log; `web/actions.js`, the keyboard) and "edit" once (`web/edit.js`, `web/image_edit.js`, Edit Image) [repo] |
| Log | A **stack** of `open`, `run`, `change`, `base`, `submit` entries and a pointer. Undo moves the pointer back; the entries above it are the redo tail, kept on the device until a new change deletes them. Drive and replay carry **only the surviving entries**, up to the pointer | The owner's call (question 1): the file records what the model is made of, not how the tagger got there |
| Inverse | **Stored** in each change beside the forward payload, produced by the study's `apply` | The inverse of a delete or a junction split needs the state before it, which the forward payload does not hold |
| Model + log | Both kept, the model the authority; replay is checked against it by hash | The owner's rule; an old op may not replay |
| Undo model | **Linear**, redo cut off by a new change, down to the first `run` or `base` and no further; a later re-run is itself undoable | What every tool surveyed does by default; ops name items that later ops create and destroy, so selective undo is unsafe |
| Re-run | A new `run` **replays the surviving changes onto the new output**; a change that no longer fits is dropped and shown greyed under the run | The owner's call (question 4). Ops must therefore address items by what survives a re-run (a place, within a tolerance), never by an index or id the algorithm assigns |
| Device storage | The journal in **IndexedDB**, one record per entry; today's `gt-draft|…` key stays as the small head | `localStorage` is 5 MiB an origin and rewrites the whole value on each change |
| Drive | **One file**, the study's document as today plus a `history` key the shell adds; no new call | The owner's ask; a second file is a second write and can come apart from the first |
| Panel | A folded **History** row at the foot of Ground Truth Tasks, Undo and Redo always on it; open, a list newest first | The left bar belongs to the tasks (`designing-ground-truth-tasks`) |

## Where the request and the code disagree [repo]

1. **Only Shelves uses the shell's draft.** NoR keeps votes, measurements, added NoRs and checked areas
   in five `localStorage` keys of its own, by file *name* (and finder), not SHA-256 (`nor.js` `MARKS`,
   `EDITS`, `ADDED`, `AREAS_KEY`); Vascular keeps `{edits, model}` under `mv-model:<fingerprint of the
   algorithm's output>` (`model_view.js`). "Loading a local draft loads both" means three stores today.
2. **Nothing loads a tagger's own submission back to go on tagging.** Load GT tagging
   (`req/shell/ground-truth/view`) shows a curated file's final results, read-only, to whoever is *not*
   tagging. "Loading GT from Drive loads model and log" is a new feature with a new Drive read (question 5).
3. **NoR's submitted file is not a model.** `norfinder-ground-truth/2` holds only the candidates the
   tagger voted on; the unvoted ones and the algorithm's output are left out by design
   (`nor.js` `truth()`). The NoR model the log replays has to be defined (below); the file stays a
   projection of it.
4. **NoR's votes survive a new run today**, re-attached by rounded position, per finder (`loadMarks`).
   A `run` entry that resets the model would end that (question 4).
5. **A drag in Vascular records its edit on the first move**, not the drop (`model_view.js` `grab`:
   `history.push(base); edits++`), and its `cancel()` keeps the moved model. Read, not run; if it holds,
   Escape mid-drag leaves an edit behind, against `req/shell/drag/escape` and against the request.
6. **Vascular's ids do not survive its own file format.** After an edit, `parse(toJSON(m))` gives
   different point ids and segment order [measured]. Ops that name a point id or a segment index are
   valid only along the in-memory line from the algorithm's output, so the stored end model cannot be
   the base that later ops apply to.
7. **Shelves' books have no id** (array position and object identity), its title is saved per
   keystroke, and a corner drop or a Flip starts an OCR read that changes `text`, `confidence` and
   `turn` when it lands, outside any pure function.
8. **Vascular's undo is page-wide Ctrl+Z of its own** (`model_view.js`), outside `web/actions.js` and
   the legend; NoR and Shelves have no undo, only per-item take-backs (Reset measurements, a verdict
   pressed again).
9. `study.json` carries no study version; the only version on hand is the site's (`package.json`).

## 1. The data model

One journal per (study, image SHA-256). Every entry:

```json
{ "n": 17, "at": "2026-11-16T12:08:41.120Z", "kind": "change",
  "op": "move-line-end", "v": 1, "do": { "item": 23, "line": "length", "end": 1, "to": [412.5, 220.25] },
  "undo": { "op": "move-line-end", "v": 1, "do": { "item": 23, "line": "length", "end": 1, "to": [408.5, 222.25] } },
  "say": "Moved a length end of #23 (+4, −2 px)" }
```

`n` is the entry's place, from 1, and its id (one tagger, one device at a time; no merging). `say` is
the label as the study worded it when the change was made, stored so a log stays readable once the op is
retired. Everything an op needs is in `do`: a day stamp (Vascular's `setWidth` takes `on`) or a view
factor (`splitJunction`'s z scale) is payload, never read from the clock or the page.

| kind | carries | undoable |
|---|---|---|
| `open` | `image: {name, sha256, width, height}`, `study: {id, site_version}` | no |
| `run` | `algorithm: {key, title, params}`; `output`, the model the algorithm emitted, deflated and base64'd; `output_sha256`; on a re-run, `dropped: [n…]`, the changes that did not fit | the first is undo's floor; a re-run undoes to the model before it |
| `change` | `op`, `v`, `do`, `undo`, `say`; or `ops: [...]` for a compound gesture; `with: n` when it follows from entry n | yes |
| `base` | `from: {kind: "submission" \| "device", created, tagger}`, `model`, `why` | no: a floor, for stored GT that has no replayable log |
| `submit` | `model_sha256`, the file's name | no: a mark in the list, not a floor |

A value not known is left out or `null`, never zero: `site_version` of a log made before versions,
`params` of a model that arrived as a file.

**Compound gestures are one change.** A gesture that touches several things is one entry with `ops`,
applied in order and undone in reverse: Vascular's "These widths look right" (one reviewed area, each
open vessel decided, each unsaid width marked looked at), a tip dragged onto another vessel (move, then
attach). **A consequence that arrives later** (Shelves' re-read after a corner drop) is its own entry
with `with: n`; undo and redo take the pair as one step. **A drag** calls the shell at the drop alone;
Escape reaches `shell.drag`'s `cancel` and nothing is logged, which is what `req/shell/drag/escape`
already demands. **Typing** a title is one change per commit of the field (Enter, a verdict, another
book), not per key; inside the field Ctrl+Z stays the browser's own.

**What is not a change:** the open item, the walk's place and Back stack, zoom, pan, Show menu, sort,
card options, NoR's summary mask. They stay where they are kept today; the walk's place rides in the
draft head as `place`, outside the journal.

**What a study supplies** (data and pure functions, named in `study.json` as
`groundTruth.changes: "web/changes.js"`, a module importing nothing from the page):

```js
export const ops = { "<op>": { v: 1,
  apply(model, args),        // → { model, undo: { op, v, do } }; never mutates, never reads a clock
  say(args, model),          // → "Moved a length end of #23 (+4, −2 px)"
  where(args, model) } };    // → [x0, y0, x1, y1] in image pixels, or null: what the panel highlights
export const start = (output) => model;      // the algorithm's emitted output → the model
export const canonical = (model) => json;    // what is hashed: ids and order that carry no meaning left out
export const document = (model, ctx) => doc; // the study's GT file, as it is today
```

The shell owns the rest: `shell.changes.run({algorithm, output})`, `shell.changes.do(op, args)` or
`.do([...])`, the journal, storage, undo, redo, replay, the panel, the keys. The study draws from
`shell.changes.model()` and hears each new one.

## 2. Replay and its check

`replay(entries, ops)`: `start(run.output)` of the last `run`, then each `change` after it applies `do`,
up to the pointer. No algorithm, no DOM, no
clock. It runs under Node as it does in the page, which is what the lab would call (Vascular's model is
already tested that way, `test_model_js.py`).

**The check.** The model's SHA-256 is taken over `canonical(model)` with keys sorted. On load the shell
replays and compares with the stored model's hash, and writes down which path ran, in the head and on
the status line: `verified`, `mismatch`, `unknown-op` or `not-run` (no log).

| outcome | what the tagger gets |
|---|---|
| `verified` | The replayed model (ids intact), the whole history undoable down to the run |
| `mismatch`, `unknown-op` | The **stored model wins**. A `base` entry starts a new floor; the old entries stay in the journal and show folded, grey, as "earlier history, not replayable in this version" |
| `not-run` (a file from before the log) | A `base` entry: "Ground truth by <tagger>, <created>, no history" |

**Versions.** Each op has an integer `v`. A study changing an op's meaning raises it and gives
`upgrade[v]` to rewrite an old entry, or gives none and the log falls to `mismatch`. The hash is over
JSON as JavaScript prints numbers; a Python replay would have to print floats identically, so the
reference replay is the JavaScript one.

## 3. Undo and redo

- **Linear, with redo cut off by a new change.** Blender: "you can hop around on the Undo timeline as
  much as you want as long as you do not make a new change. Once you do make a new change, the Undo
  History is truncated at that point" [exact]. Photoshop's default is the same, later states dimmed
  until an edit deletes them; its Allow Non-Linear History is off by default [S]. Branching is on
  record as powerful and hard: undo-tree's own header says many find Emacs' undo "confusing", and tree
  users say it is unusable without a visualizer [S]. Selective undo tested well for painting (Myers et
  al., CHI 2015 [S]) and badly where one mistake had consequences downstream [S]; here ops name points
  and segments that later ops create and destroy, so undoing one from the middle is not safe.
  The per-item take-backs that exist (Reset measurements, Take back the verdict) stay: they are forward
  changes, and they are the selective undo the tasks need.
- **Undo moves a pointer; it writes no entry.** The undone entries stay on the device as the redo
  tail, through a reload, until a new change deletes them, as in Photoshop and Blender. Submit sends
  the entries up to the pointer only.
- **Not past the first run.** Undo stops at the first `run` or `base`; before it there is no model.
- **Running the algorithm again** appends a `run` and replays every surviving change after the
  previous run onto the new output, through the same `apply`. A study's `apply` returns
  `{misfit: "why"}` when its target is not in the model (no candidate near that place, no vessel
  there); the shell drops that change, lists it greyed under the new run ("didn't carry over: …"),
  and records its `n` in `dropped`. The carried changes are re-appended after the run with their
  original `at`, so the surviving log replays from the new run alone. Undoing the re-run restores the
  model before it, held on the device in the run entry, never sent. This is why ops address items by
  place within a tolerance: an index or id the algorithm assigned means nothing in its next output.
- **After a reload: yes.** The journal and its stored inverses are on the device, so Continue GT
  tagging comes back with History intact. Photoshop forgets its history when the document closes [S];
  tagging here spans sittings (`req/shell/ground-truth/draft`), so the log does too.
- **Submit** appends a `submit` mark and changes nothing else; undo walks through it, and a later
  Submit replaces the file as today (Drive keeps the earlier revision).
- **Clear progress** deletes the journal and head from the device after its confirm, as
  `req/shell/ground-truth/clear` says, and cannot be undone. "Back to the algorithm's output, undoably"
  is a click on the run's row in History.
- **Undo moves the walk.** The shell hands the study the entry undone; the study opens that item and
  pans to it only when it is out of the middle of the view, the rule a verdict already follows.
- **Only while tagging.** Out of tagging nothing a change touches is drawn, so an undo would be
  invisible (question 7).

## 4. Storage

Sizes per image:

| | algorithm output (`run`) | a change | a long sitting |
|---|---|---|---|
| NoR | 517–761 candidates on the reference slide (`finder_metrics.json` [repo]); rows as JSON ≈ 280–420 KB, deflated ≈ 37–54 KB [estimate]. The per-candidate pixel masks (≈ 0.45–0.66 MB raw [estimate]) are a drawing aid and stay out | ≈ 150–250 B | ≈ 700 changes ≈ 150 KB |
| Shelves | tens of books, 4 corners and a title each: a few KB [estimate] | ≈ 200–400 B | < 50 KB |
| Vascular | 62 KB JSON, 14.6 KB deflated [measured] | move ≈ 180 B; a junction split with its inverse ≈ 870 B [measured] | 500 changes ≈ 150 KB |

**On the device.** `localStorage` holds 5 MiB an origin and throws `QuotaExceededError` past it [fetch,
MDN]; it already holds sign-in, thumbnails, the action log and every setting, and `writeJSON` swallows
that error [repo], so a draft would stop saving with nothing said. A value there is rewritten whole on
every change. IndexedDB, which the shell already opens for file handles (`FILE_HANDLES`), takes one
small record per entry and shares the disk-sized quota Cache Storage has (Chrome: up to 60% of disk an
origin [fetch, MDN]). So: database `gt-history`, records keyed `[draft key, n]`, the `run` output a
compressed blob (`CompressionStream`, already used by `previews_writer.js`). The existing
`gt-draft|<study>|<image>|<sha>` key keeps its name (`req/shell/storage/keys-keep-names`) and becomes
the head: `{n, pointer, model_sha256, replay, place}`, read synchronously by Continue GT tagging as today.
Manage storage lists the journal under the image's selections and deletes it with them; it is site
data in the one place the user already clears, no second location. A failed write is said on the
status line, not swallowed. No cap in v1: at ≈ 200 KB an image, fifty images are 10 MB.

**In Drive.** `truthTagger.submit` already wraps the study's document with `created`, `tagger` and
`image`; it adds one key:

```json
"history": { "format": "rauntruth-gt-history/1", "model_sha256": "…", "replay": "verified", "entries": [ … ] }
```

The study's own fields stay where they are, so every reader keeps working: the NoR lab's `validate`
checks `format`, `image` and `labels` and ignores the rest [repo]. Two cautions: Vascular's `parse`
keeps unknown top-level keys and `toJSON` writes them back [repo], so the shell strips `history` before
a study sees a document; and `truth_folders.js` `current()` downloads every tagger's file in the
subfolder to find the newest [repo], so Load GT tagging grows from tens of KB to ≈ 0.1–0.3 MB a tagger.
A sidecar would avoid that at the cost of a second write and a pair that can come apart; note any
`gt_*.json` name would match the folder reader's file pattern. An old file has no `history` and loads
as a `base`.

## 5. Performance [measured, Vascular fixture]

| | cost |
|---|---|
| Clone the model (what a snapshot costs today) | 0.17 ms |
| Apply one move | 0.14 ms (500 in 71 ms) |
| `toJSON` + `stringify` | 1.5 ms |
| SHA-256 of the canonical model | 4.6 ms |

So replaying a thousand changes on load is ≈ 0.15 s and a jump of a hundred rows ≈ 15 ms: **no
checkpoints in v1.** The stored end model is the only snapshot; add periodic ones when a real log's
replay is measured past ≈ 200 ms, and keep them in the in-memory form, since Vascular's file form
renumbers (disagreement 6). In memory, Vascular's list of models may stay as a cache; what is persisted
is inverses, because a list of 62 KB models cannot be. Each change is one IndexedDB `add` (deleting the redo tail first, if any); an undo or redo writes only the pointer; the head is
written on a 500 ms trailing timer and on `pagehide`. The head is a cache of the journal: a head behind
it is caught up by replaying the tail. NoR's cost is unmeasured; its ops set one field of one
candidate, cheaper than Vascular's.

## 6. The History panel

**Place.** A folded row at the foot of Ground Truth Tasks, under Submit and Clear progress: "History ·
39", Undo and Redo on the row itself, usable while it is folded. It is not a task, takes no part of the
bar, and never pushes the open item's picture. Open, it is a list capped at about nine rows, scrolling.

**The list**, grounded in what the surveyed tools do:

- **Newest on top, a dot at the current state**, as Blender's Undo History: "The top of the list
  corresponds to the most recent actions. A small icon of a dot next to one of the entries indicates
  the current status" [exact]. Top-first keeps the current row beside the buttons with no scrolling.
- **Undone rows stay above the dot, dimmed and struck**, until a new change removes them from the list
  (Photoshop dims the states after the selected one [S]).
- **A click on a row goes to it**, many undos or redos at once: "Selecting one of the entries in the
  list takes the current status to that position" [exact]. Krita's docker is sold on the same point,
  going back "far more quickly than rapidly reusing the Ctrl + Z shortcut" [fetch]. A jump is itself
  undone by clicking the top row, until something changes.
- **Runs of the same kind fold into one row** ("Approved 14 finalists · show each"), as Figma folds
  autosaves into a group that expands [S] and Krita merges strokes close in time [fetch]. The folding
  is display only: Ctrl+Z still takes one change at a time; a click on the folded row goes before all
  of it.
- **Labels** are the study's `say`: the verb, the item's number as the image shows it, the amount.
  "Moved a length end of #23 (+4, −2 px)", "Rejected #31", "Area 14 right: 6 vessels accepted, 2
  declined". Each row's time shows at its right; Undo's tooltip names what it will undo.
- **Marks, not steps:** "Submitted to Drive" sits in the list as a grey rule; the run and the image
  opening close it at the bottom, the run clickable (back to the algorithm's output), nothing below it.
- **Hovering a row rings its item on the image** from the op's `where`, in the study's ring colour,
  one the data does not carry; a click pans there when it is out of view.

**Keys.** Undo `Ctrl+Z` / `⌘Z`, redo `Ctrl+Shift+Z` / `⌘⇧Z` and `Ctrl+Y`, as shell-owned actions in
`web/actions.js` (`actions.add`), each bound to its button with `control`, so the key shows on the
button and in the legend while it can act, like every other key (`req/shell/image/keys`).
`actions.js` matches modifiers exactly, so each is declared for Ctrl and for Meta. It already leaves
keys typed in a field alone, so a title keeps the browser's text undo, and it stands down while a
dialog or menu is open. A drag in progress ignores both. Vascular's own Ctrl+Z listener goes.

**Phones** are unsupported today (`req/shell/browsers/supported`). When they are not: no hover, so a
tap rings the item and a second tap goes to it; rows at touch height; no shake-to-undo.

**Seen elsewhere, not copied:** version histories (Figma, VS Code's Timeline of local
saves [S]) list *saved versions*, coarser than this log; the `submit` marks are our version of that.
Label Studio shows the state of its action history and whether undo is possible [S]; no visible undo
list was found for CVAT [S].

## 7. Each study's ops [repo]

Inverse "same op" means the op with the earlier value as payload; `restore` is one generic op whose
payload is the points and segment splices that put the earlier state back, written by a `diff(before,
after)` helper at apply time.

**NoR.** Model: `{cands (the run's rows), fails, verdict: {i → "in"|"out"}, lines: {i → {length, red,
width}}, added: [{id, lines, verdict}], areas: [checked]}`; `document()` is today's `truth()`.

| op | today | `do` | inverse |
|---|---|---|---|
| `set-verdict` | `decide(i, v)`; also sets `approved` in `edits` | `{item, to: "in"\|"out"\|null}` | same op, earlier value |
| `set-lines` | `edit(i, lines)` at a handle's drop; Reset measurements | `{item, lines \| null}` | same op, earlier lines |
| `add-item` | right-click Add a NoR Here | `{id, at: [x, y], lines}` | `remove-item {id}` |
| `remove-item` | Remove Added NoR | `{id}` | `add-item` with all it held, verdict too |
| `set-added` | `setAdded(k, {lines \| verdict})` | `{id, lines?, verdict?}` | same op, earlier values |
| `check-area` | No missed NoRs here | `{area, on: true\|false}` | same op, opposite |

Not clean today: all of it is `st` mutated in place and written to five keys; added NoRs are named by
array place (`"u" + (k + 1)`), which shifts on removal, so they need ids; the finalist/rejected split
is the filters' (`st.fails`, computed in Python by `refilter`), so a filter or preset change after the
run is a `run` entry carrying the new `fails`, not a change; the summary mask is not ground truth.

**Shelves.** Model: `{books: [{id, corners, view, turn, turnSet, text, typed, confidence, reader,
source, verdict, proposed}], noneMissed}`; `document()` is today's `submit()` document.

| op | today | `do` | inverse |
|---|---|---|---|
| `move-corners` | a corner's drop (then `clockwise`) | `{book, corners}` | same op, earlier corners |
| `set-turn` | Flip | `{book, turn}` | same op, earlier turn and `turnSet` |
| `set-text` | typing, committed | `{book, text}` | same op, earlier text and `typed` |
| `set-verdict` | Right | `{book, to}` | same op, earlier value |
| `add-book` | Draw a book, Add a book here | `{id, corners}` | `remove-book {id}` |
| `remove-book` | Not a book, Delete this book | `{id}` | `add-book` with all it held, at its place |
| `none-missed` | None missed | `{on}` | same op, opposite |
| `read` | the OCR's answer landing | `{book, text, confidence, reader, turn}`, `with: n` | same op, earlier values |

Not clean today: books need ids; `read` is the result of a non-deterministic engine, so like the run
it is recorded, never recomputed; Not a book removes the box instead of recording a "wrong" verdict.

**Vascular.** Model: `model.js`'s in-memory form, already pure ("each edit returns a new model").

| op | function | `do` | inverse |
|---|---|---|---|
| `move-node` | `moveNode` at the drop | `{node, to: {x, y, z}}` | same op, earlier place |
| `attach-tip` | `attach` (compound with the move) | `{node, to}` | `restore` |
| `connect`, `draw-segment` | `connect`, `drawSegment` | `{from, to}` | `restore` |
| `split-segment`, `cut-segment` | add a curve point, cut | `{segment, t}` / `{segment, ta, tb}` | `restore` |
| `remove-bend`, `delete-node`, `delete-segment` | same names | `{node}` / `{segment}` | `restore` |
| `split-junction` | `splitJunction` | `{node, zScale}` | `restore` |
| `review`, `decide` | verdicts on vessels | `{segment \| segments, verdict}` | `restore` (states only) |
| `check-junction` | `checkJunction` | `{node, on}` | same op, opposite |
| `set-width` | `setWidth`, `measure`, `nudge` | `{segments, width \| null}`, the day inside | same op, earlier width |
| `review-area` | `widthsRight`'s `reviewed_regions` push, compound with its decides and widths | `{region}` | `restore` |

Not clean today: segments are named by array index and points by ids that `toJSON` renumbers
(disagreement 6); because a re-run replays changes onto a new output (section 3), Vascular's ops must name a segment or point by place within a tolerance, not by index or id, and `canonical()` must be
`toJSON` without its stamps; `widthsRight` and `truth()` read the clock; the drag records at the first
move (disagreement 5); `corrections`, the count the file carries, would come from the journal.

## 8. Phasing

The feature path each time: the requirement in the spec, a test that fails, then the code.

1. **Shell core, with the fixture study.** `truth_changes.js` (journal, apply, undo, redo, replay,
   hash) with Node tests and no page; then storage, the panel, the keys.
   Spec: `req/shell/ground-truth/history` (the list, undo, redo, the floor), `…/history-replay` (model
   and log both kept, the check, the stored model wins), `…/history-file` (the `history` key, old files
   load as a base), and edits to `…/draft`, `…/clear`, `…/submit`, `req/shell/storage/manage`,
   `req/shell/image/keys`.
   Tests: `web-tests/test_truth_changes.py` (Node: replay equals the stored model; `undo` after `do` is
   the model before, for every op; a new change deletes the redo tail; a re-run carries fitting changes and drops the rest), `test_truth_history_page.py`
   (the list, a jump, the keys, a drag Escaped logs nothing, a reload keeps History), additions to
   `test_gt_drive_page.py` (the file carries `history`; a file without it loads) and
   `test_storage_page.py`. Fixture ops only; no study's image.
2. **Vascular.** `studies/vascular/web/changes.js` over `model.js`; the list of models, the Undo, Redo
   and Discard buttons, the Ctrl+Z listener and the `mv-model:` store go, the last read once and turned
   into a `base`. Fixes disagreement 5. Test: every op's inverse over the fixture model, in
   `test_model_js.py`.
3. **Shelves.** Ids for books, `changes.js`, the draft document replaced by the journal; a draft in the
   old shape loads as a `base`.
4. **NoR.** The model pulled out of `st`, ids for added NoRs, the five keys read once into a `base` and
   left in place until Clear progress.
5. **Resume from Drive**, if approved (question 5).

Each phase is its own PR; the diff will reach `web/`, one study's `web/`, the specs and tests. The
abstraction that keeps it there is the study's `changes.js`: the shell never learns an op's meaning.

## 9. The owner's decisions (2026-11-16)

1. **Only surviving changes are kept** in the file and in replay; undos and cut-off redos are not
   recorded (the designer had recommended keeping them all). The redo tail lives on the device only.
2. **Timestamps of every change go to Drive** with the tagger's email. That is new data leaving the
   device, so the privacy page changes in the same commit.
3. **One Drive file**, a `history` key in it; Load GT tagging downloads more.
4. **Running the algorithm again replays the changes onto the new output**, dropping and showing
   those that no longer fit (the designer had recommended asking and starting a new floor). Section 3
   says how; it constrains every study's op addressing.
5. **Continue from your own submission on another device** (a Drive read at Continue) is approved, as
   phase 5.
6. **"No missed NoRs here" is an op**, and the checked areas join NoR's file.
7. **NoR's candidate pixel masks stay out of the `run` output**; outlines show as unknown after a
   resume without a re-run.
8. **Vascular is the first study** after the shell core.

Not asked, taken as designed: undo only while tagging; the names "change" in code and "History" on
the page.

## Sources

- Blender manual, Undo & Redo: <https://docs.blender.org/manual/en/latest/interface/undo_redo.html> [exact]
- Krita manual, Undo History docker: <https://docs.krita.org/en/reference_manual/dockers/undo_history.html> [fetch]
- MDN, Storage quotas and eviction criteria: <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria> [fetch]
- Adobe, Undo and history (answered 403; claims above are from search summaries of it and of
  <https://jkost.com/blog/?p=18541>, <https://www.tipsquirrel.com/using-non-linear-history-in-photoshop/>): <https://helpx.adobe.com/photoshop/using/undo-history.html> [S]
- Figma, View a file's version history: <https://help.figma.com/hc/en-us/articles/360038006754> [S]
- VS Code, Timeline and local history: <https://code.visualstudio.com/docs/sourcecontrol/history> [S]
- Myers et al., selective undo for painting, CHI 2015: <https://unpaywall.org/10.1145%2F2702123.2702543> [S]
- Just Undo It, undo in multi-user VR: <https://arxiv.org/pdf/2403.11756> [S]
- undo-tree.el header: <https://lists.nongnu.org/archive/html/gnu-emacs-sources/2010-12/txtoxqjmpAxDr.txt> [S]
- Label Studio release notes: <https://github.com/HumanSignal/label-studio/releases?page=4>; CVAT annotation interface: <https://docs.cvat.ai/docs/manual/basics/cvat-annotation-interface/_print> [S]
- NN/g, User control and freedom: <https://www.nngroup.com/articles/user-control-and-freedom/> [S]
- Fowler, Event Sourcing (log plus snapshot, reversing events): <https://martinfowler.com/eaaDev/EventSourcing.html> [S]
