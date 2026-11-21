# Study stages: requirements, tests and implementation

The build plan for the design in [`study-stages-map.md`](study-stages-map.md) (#1015). The map holds the decisions
and why; this file holds the requirements to land in `requirements.md`, how each is tested, and where the code
goes, cut into work packages a worker session can take one at a time.

**Status:** every decision here is the owner's; the one question left is the cross-image results view (WP8).

## How a worker takes a package

Packages are the units worker sessions take; the owner is not asked to approve each one. Every package is built on
its own branch off the integration branch (`claude/gifted-fermat-g7q3rj`, pull request #1036); the orchestrating
session reviews its diff, runs its tests and merges it into the integration branch, and the owner reviews the
integration pull request once. A worker:

1. Copies the package's requirements into `dev/requirements/requirements.md` (or `setup/*` into the new Study
   Setup section, see WP5), replacing the ones it names, each with "Set by the owner on <date>" and its `Test:` line.
2. Writes the tests listed, runs them and watches them fail.
3. Implements until they pass, running the package's tests with `python3 -m pytest <files>` and every test file it
   touched; the integration pull request's Tests run carries the whole suite.
4. Rewrites, in the same package, every rule, skill, study requirement and lab doc its change makes wrong (what WP9
   listed).
5. Updates the shell-states harness where the package says so, listing each new tentative case for the owner
   (rule `shell-states-unreviewed`).
6. Ends each commit message with a `Version-history:` line per the `writing-version-history` skill.

A package starts only once the ones it depends on are merged into the integration branch. Network calls and fakes
listed under "Approvals" are approved as listed; anything a worker finds it needs beyond them stops the package and
goes to the owner (rules `network-calls-approved`, `fakes-for-outside-systems`).

## Approvals on record

| What | Who calls it | Status |
|---|---|---|
| One Drive batch request per load: can this user read each study's root | main app, signed in | approved |
| Read a study's sharing (People) | Study Setup | approved |
| Pin the marked revision of an extraction (`keepForever`) | Study Setup | approved, then not needed: marks follow the latest |
| Batch runs write extractions to the store | Study Setup | approved |
| Save writes the person's extraction, replacing their own (old revision kept) | main app | approved |
| Change one item's sharing, only when the owner presses that correction's Fix button | Study Setup | approved (owner, 2026-11-21); never otherwise |
| Fake Drive: per-account read sharing, the batch endpoint, revisions, permissions listing and changing | tests | approved (changing comes with the sharing fix above) |
| Lab reads the study file by link | lab | covered: the lab reads link-shared files today, no sign-in |

## Decided after the second persona reviews

Corrected by the owner: a Drive file or folder can carry sharing its parent does not. So **the root is
members-only**, and **membership is "can read the root"**. The folders visitors and the lab need (images,
previews, extractions) are each shared "anyone with the link" on top. **One study file** in the root
(`rauntruth-study.json`) holds what the settings, index and tags files hold today, plus the marks and the stage;
it too is link-readable on top, its id kept only in the cloud environment (`RAUNTRUTH_STUDY_<STUDY>`). The repo
names the root's id, harmless since only members open it. Entering Review or Public, the owner shares the root by
link, from Study Setup's sharing check (below).

Each answering a review finding, accepted by the owner:

- **Save.** Every action is kept on the device as today's draft. Save writes the person's one extraction for the
  image to the store, replacing their own (Drive keeps the old revision). A count beside Save says how many images
  wait to upload.
- **A mark follows the latest** (owner): it names the extraction file, so its author's later edit counts at once
  and changes the dataset SHA; the Review freeze's committed copy is what keeps published numbers fixed.
- **Annotators see their marks.** Load study images rows show, per image, "yours: saved / GT / official" and
  whether another's extraction was marked; one popup line counts them.
- **The extraction list** orders mine, then marked, then others (folded). Another's extraction opens read-only
  with "Edit this annotation", which saves as mine and records its base.
- **Outsiders** (not members) are listed only GT and official extractions, labelled by algorithm version or "by
  hand", with no person's name.
- **The article link** shows from Public, or earlier when the owner ticks "show the article".
- **One GT mark per image.** The lab scores GT marks only, never official ones; the metrics record which
  algorithm version each GT file started from.
- **Lab labels** (`studies/*/lab/truth/`, made by a model) are not annotations and never count in official
  numbers.
- **Owner** means anyone Drive lets write the root.
- **Entering Review is three steps**: the owner freezes in Study Setup (marking and data close); a Claude session
  runs the freeze command (commits model-only GT, publishes the official scores); Study Setup then shows the owner,
  with pictures, how to share the root by link, and checks that it was done.
- **In Review and Public batch runs are exploratory**: they never count, since marking is closed.
- **A score from Review on carries a stamp**: algorithm version, dataset SHA, freeze date, link to the GT commit.
- **Own-image runs** are open to anyone with the address in Review too; the result can be downloaded, nothing is
  saved to Drive.
- **The welcome popup** on a Review or Public study says signing in adds nothing there.
- **Batch runs** skip images that already have an extraction at that version and parameters, so a stopped batch
  resumes; a token running out holds the batch until the next click.
- **People** shows per person what they hold (read the root: sees; write the extractions folder: annotates;
  write the root: manages) and links to that item's Drive sharing dialog.
- **The lab's single interface is the study file**: it names images (id, hash), the marks, damaged areas and the
  stage. The lab reads it by link from `RAUNTRUTH_STUDY_<STUDY>` and downloads by id, never listing folders.
- **The stage lives on Drive only**, in the study file; repo sessions learn it from the lab, which prints it.
  Nothing in the repo records it.
- **The dataset SHA is computed over the model-only form** of each GT file, so Drive and the committed copy agree.

Still the owner's (asked when the package reaches it): the cross-image results view (WP8).

## Requirements

Each entry: the requirement line as it lands (a tag not yet in `requirements.md` is written here without its `req/`
prefix, which it gains when it lands), then **Test** (file, driver, fake knobs, what is asserted) and
**Build** (where the code goes). Existing names are kept where the meaning survives.

### WP1 - the fake Drive grows sharing (tests only)

Depends on nothing. Needs the owner's one approval for the fake's new parts.

- **Fake: per-account sharing.** `web-tests/fakes/google_drive.mjs` gains `drive.readers` (a Map of item id to a
  Set of emails) beside `drive.writers`; `sees(g)` becomes: public, or the signed-in email in the nearest readers
  set, or a writer. An item with no readers set inherits its parent's. Own unit test
  `web-tests/test_fake_drive.py` asserts: a members-only root with a link-shared `Data` child; signed out reads
  `Data`, is refused the root; a member reads the root and the study file in it; a non-member signed in is refused.
- **Fake: batch endpoint.** `POST /batch/drive/v3` with `multipart/mixed` parts, each answered as its single call
  would be. Asserted by the same test: three `GET files/<id>` parts, one refused, come back as three parts with
  200, 200, 404.
- **Fake: revisions.** Each replace keeps a revision (`id`, bytes), listed by `GET files/<id>/revisions` as Drive
  lists them, the current one included, as the page's Save relies on Drive keeping the old one. Asserted: create,
  then replace twice, three revisions, read the first's
  bytes back.
- **Fake: permissions listing and changing.** `GET files/<id>/permissions` lists readers and writers as Drive does
  (`type`, `role`, `emailAddress`); `POST` (exists) and `DELETE files/<id>/permissions/<pid>` change them and are
  logged as writes. Asserted against a seeded root.
- **Build:** only `web-tests/fakes/google_drive.mjs` and `web-tests/stand_in_drive.mjs` (a `members` option seeding
  readers on the root).

### WP2 - who sees a study

Depends on WP1.

- `shell/study/one-file` A study keeps one study file in its Drive root, holding its folders, images index,
  tags, hide and grouping rules, marks and stage; the separate index and tags files go.
  - **Test:** `test_study_root.py` (`study_root_driver.mjs`, under Node): reading a root that holds only
    `rauntruth-study.json` (format `rauntruth-study/2`) gives folders, index, tags and stage; a root still holding
    the three old files is read once and written back as one file the next time a manager saves (migration), the old
    two trashed only if the page made them (`writer.ours`); `test_data_mode_page.py` asserts one write per tag edit.
  - **Build:** `web/study_root.js`: `SETTINGS`, `INDEX`, `TAGS` collapse into one document with sections; `read()`,
    `readTags`/`writeTags`, `readIndex`/`writeIndex` become views on it (a single cached read per root). Writes
    re-read and merge before replacing, as concurrent managers may edit it.
- `shell/study/members` Signed in, the study list holds the studies whose root the user can read, asked of
  Drive in one batch request per load; signed out, the released ones.
  - **Test:** `web-tests/test_study_members_page.py` with a new `members_driver.mjs`, stand-in Drive seeded with
    three studies whose roots are: A members {x}, B members {y}, C link-shared at stage Public. Signed in as x: switcher lists A and C;
    the fake's request log shows exactly one `/batch` call and no per-study metadata call. Signed in as y: B and C.
    Signed out: C only, and no `/batch` call. Token expired (`google.expire()`): the last list, and the line
    "as Drive last said" under it. Sign out then in as y: x's list is gone.
  - **Build:** `web/shell.js` `studyMenu()`/`drawStudies()` take the list from a new `web/members.js`
    (`members(remote, studies)` returning ids, cached per account through `signIn.learn("members")`).
    `web/drive.js` gains `batch(calls)`.
- `req/shell/study/visibility` (rewritten) A study's address opened by someone who may not see it says so: signed
  in, naming the account; signed out, "not open right now".
  - **Test:** in `test_study_members_page.py`: open `app/A` as y: the message names y and offers Sign out; signed
    out: the signed-out wording; neither loads the study's module (no request for `studies/A/web/*.js`).
  - **Build:** `mountNow(id)` in `web/shell.js` checks membership before `import`.
- `shell/study/review-link` A study in Review opens at its address for anyone, signed out, but is not listed.
  - **Test:** stand-in study D, root link-shared, stage Review: signed out, `app/D` opens; the switcher does not
    list D; a member's switcher lists D.
  - **Build:** the stage read from the study file (WP6) decides listing: `Public` listed, `Review` not.
- `req/shell/site/landing` (rewritten) The landing page lists no studies; it describes the site and links into the
  app, whose switcher lists them.
  - **Test:** `test_published_site.py`: the built `index.html` has no `#studies` list and no study id in its text;
    the app link is present.
  - **Build:** `dev/tools/build/build.py` drops `list_studies()`.

### WP3 - one main app, no role menu

Depends on WP2.

- `req/shell/account/role` (removed) and `shell/annotate/choice` The header has no role menu. After an image
  loads, the left bar asks how to get annotations on it, per image: **Continue local annotation work** (only when
  this device holds a draft for the image; enters annotation mode), **Load annotation from Drive** (the image's
  extraction list, shell/extractions/list; the chosen one shows read-only, with **Edit this annotation**
  entering annotation mode from it), or **Start annotating from scratch** (annotation mode, and the only route that
  shows the algorithm runner). Every annotation tool shows only in annotation mode. Loading another image asks again.
  - **Test:** `web-tests/test_annotate_mode_page.py` (rename of `test_roles_page.py`; driver `annotate_driver.mjs`
    from `roles_driver.mjs`). Stand-in Drive, one image with a device draft (seeded IndexedDB `gt-drafts`) and one
    without, two extractions on Drive. Assert: no `#role-menu` in the DOM; after load the three choices show, the
    first only on the image with a draft; the Processing box (algorithm runner) is absent until "from scratch";
    "Load annotation from Drive" shows the list, choosing one draws its model with no annotation tool, "Edit this
    annotation" enters `html[data-annotating]`; loading the second image clears the mode and asks again.
  - **Build:** delete `web/roles.js` and its uses in `web/shell.js` (506-538); a new `web/annotate_choice.js` draws
    the choice in the left bar; `makesTruth()` becomes `stageAnnotates() && annotating`; CSS `[data-role=…]` rules
    become `[data-annotating]`; `truth_tasks.js` `#gt-start`/Stop goes. The Processing box's visibility follows the
    "from scratch" route.
- `shell/annotate/clear` **Clear all annotations from image** resets the page to just after loading and, after a
  confirmation naming the unsaved actions lost, discards this device's draft for the image; Drive is untouched.
  - **Test:** same file: 4 actions, Clear, confirm: model empty, the three choices back, `gt-drafts` has no record
    for the image, the fake's writes log is unchanged; Cancel changes nothing.
- `shell/annotate/no-save` Someone who may not save gets the same choices and tools, with no Save: their work
  can be downloaded, and a line says to ask the study owner for access (signed out: to sign in).
  - **Test:** same file as v (member, no write) and signed out: choices present, `#save` absent, Download present,
    the line's text per case.
  - **Build:** today's `tagger-access` line moves here.
- `shell/annotate/survives` Annotation mode and unsaved work survive the token running out and going
  offline; Save waits for the next click online, and a count says how many images have work waiting to upload.
  - **Test:** same file: annotate 3 actions, `google.expire()`, mode still on, Undo count 3; offline
    (`context.setOffline(true)`), annotate a second image, Save on both: "2 waiting"; back online and a click: the
    fake's writes log two extraction writes, count gone.
  - **Build:** `web/shell.js` stops dropping the session on expiry (`save-draft` path); Save queues on the device.
- `req/shell/left-bar/shells` (changed) The Summary box shows whenever the image carries any model, however far
  along, annotation mode included; Ground Truth Tasks shows beside it, no longer in its place.
  - **Test:** `test_left_bar_page.py`: no model: no Summary; after one action in annotation mode: Summary and
    Ground Truth Tasks both visible; a model loaded read-only from Drive: Summary visible.
  - **Build:** the swap in `web/shell.js` that hides Summary while `makesTruth()` goes; Summary's visibility keys on
    the model being non-empty.
- Shell states: `role` leaves `dev/requirements/shell-states.json`; `annotating` (bool), `maySave`, `hasDraft` and
  `route` (scratch / drive / local) join;
  regenerate with `python3 dev/tools/build/shell_states.py`; `test_shell_states_page.py` passes. Each new case to
  the owner.

### WP4 - one store of extractions

Depends on WP3.

- `shell/extractions/file` An extraction is one file about one image (by SHA): the model, the runs (algorithm
  key, parameters, code version) and the manual actions, who made it and when.
  - **Test:** `web-tests/test_truth_actions.py` (unit, under Node): a `run` action records `version` (the site
    version string and the study's algorithm code hash); a file without it still loads (old files) and shows
    version unknown, never a guessed one.
  - **Build:** `web/truth_actions.js` `run` entries; the studies' `run` calls (`nor.js`, `vascular.js`,
    `shelves`) pass the version the shell hands them.
- `shell/extractions/save` Save writes the person's one extraction for the image to the study's extractions
  folder, replacing their own and keeping Drive's old revision; a count says how many images wait to upload.
  - **Test:** `web-tests/test_extractions_page.py` with `extractions_driver.mjs`: Save twice on one image: one
    file `<stem>__<sha8>/x_<email>.json`, two revisions; two images saved offline: "2 waiting"; online and a click:
    0. `test_truth_folders.py` (Node) covers naming and replace.
  - **Build:** `web/truth_folders.js` loses `accept`/`reject`/`status`'s curated branch; `submit` becomes `save`
    into one `extractions` folder; the `submitTruth` dialog in `web/shell.js` (around 1943) becomes Save.
- `shell/extractions/list` Loading an image lists every extraction of it, labelled: mine, then marked (GT,
  official), then others folded; another's opens read-only with "Edit this annotation".
  - **Test:** same file: seed three extractions (mine, y's marked GT, a batch run); assert the order and labels;
    "Edit this annotation" on y's then Save writes mine with `base: <y's file id>`; y's file unchanged (fake writes log).
- `shell/extractions/outsiders` Someone who is not a member is listed only GT and official extractions, with no
  person's name.
  - **Test:** same seed, signed out on a Review study: two rows, neither containing an `@`.
- `shell/extractions/marks-shown` Load study images shows, per image, whether my extraction is saved, GT or
  official, and whether another's was marked.
  - **Test:** `test_study_index_page.py`: index seeded with marks; row texts asserted.
- Removed: `req/shell/ground-truth/curate`, `pending`, `submit`, `tagger-access` (folded into WP3), and the curated
  and submissions folders in `layout`/`folders`; `history-carry`, `save-draft`, `draft-offer`, `history-file` are
  rewritten to say "extraction". `test_gt_drive_page.py` loses its curate cases and gains none (they move to WP5).

### WP5 - the Study Setup app

Depends on WP4. The largest package; may be split into 5a (the page and what moves) and 5b (marks, batch, People).

- `setup/page` Study Setup is the site page `app/setup`, opened from the profile menu's "Study Setup..." by
  those Drive lets write the root, online only, showing images in the shell's plain view.
  - **Test:** `web-tests/test_setup_page.py` with `setup_driver.mjs`: as owner the profile menu has the item and it
    opens `/app/setup?study=A`; as t it is absent; offline the page says it needs the internet and makes no Drive
    call; the main page `app/A` has none of `#data-*` in its DOM. `test_published_site.py`: `app/setup.html` ships
    and is in the offline list exclusion.
  - **Build:** `web/setup.html` and `web/setup.js`; `web/data_mode.js` moves under it (its `ctx` built in
    `setup.js` instead of `shell.js` around 2499). Shared pieces it needs from `shell.js` (sign-in, `remote`,
    `place`, the viewer, left bar) are moved into modules both pages import; this is the package's main cost.
    `build.py` needs no change (any `web/*.html` ships under `app/`), but `study_pages` must refuse a study named
    `setup`.
- `setup/data` Everything Data Management does today, unchanged in behaviour, in Study Setup: folders, Drive
  access, ground-truth setup (now: the extractions folder), previews, tags and descriptions, hide rules, the
  grouping tag, areas of interest, damaged areas, Needs GT.
  - **Test:** `test_data_mode_page.py` and `test_study_index_page.py` re-pointed at `app/setup`; same assertions.
- `setup/marks` The owner marks an extraction GT or official; the study file records the extraction's file id,
  and the mark follows that file's latest content; one GT mark and one official mark per image; "mark all of this
  batch official".
  - **Test:** `test_setup_page.py`: mark y's extraction GT: the index JSON (read from the fake) holds
    `{sha256, file}` for the image; y saves again: the mark still names the file and the main app shows y's new
    model as GT; marking another GT for the image replaces the first; "mark all of this batch" marks each image the
    batch reached.
  - **Build:** `web/study_root.js` `writeIndex` gains `marks`.
- `setup/batch` The owner runs a chosen algorithm over chosen images; each image gets an extraction at that
  version and parameters; images already done are skipped; a token running out holds it until the next click.
  - **Test:** stand-in Python worker answering from `answers.json`; batch over 3 images writes 3 files; rerun
    writes none; expire after 1, click, the other 2 follow.
  - **Build:** reuses the main app's runner module; Study Setup imports the study's algorithm code for the batch only.
- `setup/people` Study Setup lists each member and which of the three shares they hold, with a link to each
  item's Drive sharing dialog.
  - **Test:** fake permissions seeded on the extractions folder and the root; rows asserted; links point at
    `https://drive.google.com/drive/folders/<id>?usp=sharing` forms.
- `setup/sharing-check` Study Setup validates the study's Drive sharing against what its stage needs and lists
  every correction, each with what to change, where (a link to that item's sharing dialog) and pictures; it checks
  again on opening, on each promotion or move back, and on a Check again button. What the stage needs: before
  Review the root is shared with named people only, never by link; from Review on the root is shared by link; in
  every stage `Data`, `Previews`, the extractions folder and the study file are readable by link; at least one
  person may write the extractions folder once the stage allows annotating. Each correction the site can make has
  a **Fix** button: pressing it, and confirming what will change, makes that one sharing change and checks again.
  Nothing changes sharing without that press, not a promotion, not opening the page.
  - **Test:** `test_setup_page.py`, the fake's permissions seeded per case, one assertion per rule: a Develop root
    shared by link: one correction naming the root, "Make it shared with named people only"; `Previews` not
    link-readable: one correction naming it; everything right: "Sharing is as this stage needs" and no correction;
    promote to Review with the root still members-only: the correction "Share the root by link" appears; seed the
    share and press Check again: it clears. Through every case above the fake's log holds permission reads only.
    Then press Fix on "Share the root by link" and confirm: the log holds exactly one permission write, on the
    root, and the correction clears; Fix then Cancel writes nothing.
  - **Build:** a rules table in `web/setup_sharing.js` (stage, item, expected), checked against the permissions read
    of `setup/people`; the corrections list renders above People. Fix calls `web/drive.js` `share(id)` (exists)
    or a new `unshare(id, permissionId)`. Verify first, with a real run, that the owner's sign-in scope may change
    sharing on a folder the page did not make; where it may not, the correction keeps its pictures and link and
    shows no Fix button.

### WP6 - the five stages

Depends on WP5.

- `req/shell/study/stage` (rewritten) A study's stage, Setup, Develop, Analyze, Review or Public, is kept in its
  study file and set by the owner in Study Setup; it opens and closes actions as the table in the map.
  - **Test:** `test_status_bar_page.py` and a new `test_stage_table_page.py` driven from one data file,
    `web-tests/stage_table.json`, transcribing the map's table (stage × action → open/closed); the test loads the
    stand-in study in each stage and asserts each action's control is present or absent, so the table and the page
    cannot drift. A drift guard (`sharedConstants` or a test) ties `stage_table.json` to the map's table rows.
  - **Build:** `web/shell.js` `STAGES` and `stageTruth()`/`takesTaggers()` (454-504) are replaced by one
    `stageAllows(action)` reading a table module `web/stages.js`; `data_mode` reads the same.
- `shell/study/stage-popup` The stage label's popup lists the five stages, this one's gate conditions as the
  page measures them, and one line per action open to this user.
  - **Test:** `study_page_driver.mjs`: Develop with 12 images lacking a GT mark: the line "Annotate: 12 images
    still need it" for an annotator, absent for a viewer.
- `setup/promote` Study Setup promotes and moves back; before Review it lists images with extractions newer
  than their GT; promoting to Review freezes marking and data.
  - **Test:** `test_setup_page.py`: the list; after Freeze, mark buttons gone; the main app's Save still works but
    labels "after the freeze, not counted".
- Existing studies: NoR, vascular, shelves and fixture start in Develop (their study files written by WP2's
  migration and the hand step).
- Shell states: `stage` takes the five values; each new case to the owner.

### WP7 - the lab reads the study file

Depends on WP4 (marks format), can run beside WP5-6.

- `lab/study-file` The lab reads a study's study file by link, from the id in `RAUNTRUTH_STUDY_<STUDY>`, and
  lists no Drive folder; without the variable it stops with a message naming it.
  - **Test:** `lab/tests/test_lab.py` with a local HTTP stub standing in for Drive (as the tests do now): with the
    variable, `fetch.py` downloads exactly the ids the study file names; without it, exit 2 and the message; no Drive id
    is printed in either output.
  - **Build:** `lab/fetch.py` `Root` replaced by `StudyFile`; `images()` downloads by its ids; `sources.json`
    keeps names and hashes only (a check asserts no `drive_id` key).
- `lab/gt-marks` The lab scores against GT marks only, reading each marked file's latest content.
  - **Test:** stub study file with two GT marks and one official; the scoring corpus has exactly the two GT pairs.
- `lab/dataset-sha` The dataset SHA is computed over the model-only form of each GT file.
  - **Test:** two GT files differing only in `history` and `tagger` give the same dataset SHA.
- `lab/stage` The lab prints the study's stage from the study file, and unattended tasks stop on Review or
  Public.
  - **Test:** stub study file at Review: `run.py --write` exits with "frozen"; `mutation-sweep`'s task worker exits clean
    with the same message (rule `writing-exit-path`).

### WP8 - the Review freeze and the published score

Depends on WP6 and WP7.

- `lab/freeze` One lab command commits the study's GT, model-only, to `studies/<id>/gt/<freeze date>/` and
  writes the official scores with their stamp.
  - **Test:** `lab/tests/test_lab.py`: stub study file with marks; `python3 lab/freeze.py <study>` writes one file per GT
    mark with no `history`, `tagger`, `created` or email anywhere in the bytes; the metrics carry `{version,
    dataset_sha256, frozen, commit}`.
- `shell/processing/stamp` From Review on, each score shows its stamp: algorithm version, dataset SHA, freeze
  date and a link to the GT commit.
  - **Test:** `algorithm_choice_driver.mjs`: metrics with a stamp render it; without one (Develop) nothing.
- The cross-image results view: **owner's question first**.

### WP9 - folded into each package

The rewording of rules, skills, study requirements and lab docs that name the old model (the
`designing-ground-truth-tasks` rule and skill, each study's `requirements.md` stage lines, `lab/README.md`, the
`improve-on-ground-truth` and `refitting-on-new-ground-truth` skills) is done by whichever package makes each one
wrong (step 4 above).

## Hand steps (the owner's)

To file as one handover issue when WP2 starts (skill `writing-handover-issues`):

- For each of NoR, vascular, shelves: share the root with the members only; keep `Data`, `Previews`, the
  extractions folder and the study file "anyone with the link".
- Set `RAUNTRUTH_STUDY_<STUDY>` in the Claude cloud environment for each study, once WP2's migration has written
  the one study file.
- Already-committed Drive ids stay in git history; images that must stay private before Public need re-uploading.

## Order

WP1 → WP2 → WP3 → WP4 → WP5 → WP6 → WP8, with WP7 beside WP5-6. WP5 is the one to split if a worker's diff grows
past one session.
