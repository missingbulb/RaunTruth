# Study stages: requirements, tests and implementation

The build plan for the design in [`study-stages-map.md`](study-stages-map) (#1015). The map holds the decisions
and why; this file holds the requirements to land in `requirements.md`, how each is tested, and where the code
goes, cut into work packages a worker session can take one at a time.

**Status:** draft for the owner's review. Items marked **(proposed)** are defaults chosen here, from the second
round of persona reviews, and are not yet the owner's decisions.

## How a worker takes a package

Each package is one pull request off the newest `main`, worked as the basics pack's feature path:

1. Copy the package's requirements into `dev/requirements/requirements.md` (or `req/setup/*` into the new Study
   Setup file, see WP5), replacing the ones it names, each with "Set by the owner on <date>" and its `Test:` line.
2. Write the tests listed, run them and watch them fail.
3. Implement until they pass; run the package's tests locally with `python3 -m pytest <files>`, and let the
   pull request's Tests run (CI's test image, `dev/tools/test-image/run.sh`) carry the whole suite.
4. Update the shell-states harness where the package says so, and bring each new tentative case to the owner
   (rule `shell-states-unreviewed`).
5. A `Version-history:` line per the `writing-version-history` skill.

A package does not start before the ones it depends on have merged. Network calls and fakes listed under
"Approvals" are approved as listed; anything a worker finds it needs beyond them stops the package and goes to the
owner (rules `network-calls-approved`, `fakes-for-outside-systems`).

## Approvals on record

| What | Who calls it | Status |
|---|---|---|
| One Drive batch request per load: can this user read each study's settings file | main app, signed in | approved |
| Read a study's sharing (People) | Study Setup | approved |
| Pin the marked revision of an extraction (`keepForever`) | Study Setup | approved |
| Batch runs write extractions to the store | Study Setup | approved |
| Save writes the person's extraction, replacing their own (old revision kept) | main app | approved |
| Change any file's sharing | - | **not approved**: the owner shares by hand, guided |
| Fake Drive: per-account read sharing, the batch endpoint, revisions, permissions listing | tests | **to approve** (one question, WP1) |
| Lab reads the study index by link | lab | covered: the lab reads link-shared files today, no sign-in |

## Settled after the second persona reviews

Corrected by the owner: a Drive file can carry sharing its folder does not, so **the root is members-only** and
the folders the lab and visitors need (images, previews, extractions, and the folder holding the study index) are
each shared "anyone with the link" on top. The settings file, in the root, is members-only.

**(proposed)** defaults, each answering a review finding:

- **Save.** Every action is kept on the device as today's draft. Save writes the person's one extraction for the
  image to the store, replacing their own (Drive keeps the old revision). A count beside Save says how many images
  wait to upload.
- **A mark pins a revision.** The index records file id, revision id and content hash. An edit after marking
  makes a newer revision, shown to its author as "newer than the marked one" and to the owner in Study Setup's
  marking list; the mark stays on the pinned revision.
- **Annotators see their marks.** Load study images rows show, per image, "yours: saved / GT / official" and
  whether another's extraction was marked; one popup line counts them.
- **The extraction list** orders mine, then marked, then others (folded). Another's extraction opens read-only
  with "Start from this", which saves as mine and records its base.
- **Annotation mode names its use** in one line: "Your work scores the algorithm" (Develop) or "Your work can
  become this image's result" (Analyze).
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
  with pictures, how to share the settings file by link, and checks that it was done.
- **In Review and Public batch runs are exploratory**: they never count, since marking is closed.
- **A score from Review on carries a stamp**: algorithm version, dataset SHA, freeze date, link to the GT commit.
- **Own-image runs** are open to anyone with the address in Review too; the result can be downloaded, nothing is
  saved to Drive.
- **The welcome popup** on a Review or Public study says signing in adds nothing there.
- **Batch runs** skip images that already have an extraction at that version and parameters, so a stopped batch
  resumes; a token running out holds the batch until the next click.
- **People** shows per person which of the three shares they hold (settings file: sees; extractions folder:
  annotates; root: manages) and links to that item's Drive sharing dialog.
- **The lab's single interface is the study index**: it names images (id, hash), the marks, damaged areas and the
  stage. `RAUNTRUTH_INDEX_<STUDY>` names the index file; the lab reads it by link and downloads by id.
- **The dataset SHA is computed over the model-only form** of each GT file, so Drive and the committed copy agree.

Still the owner's (asked when the package reaches it): what the landing page lists now that membership is read at
run time (WP2), and the cross-image results view (WP8).

## Requirements

Each entry: the requirement line as it lands, then **Test** (file, driver, fake knobs, what is asserted) and
**Build** (where the code goes). Existing names are kept where the meaning survives.

### WP1 - the fake Drive grows sharing (tests only)

Depends on nothing. Needs the owner's one approval for the fake's new parts.

- **Fake: per-account sharing.** `web-tests/fakes/google_drive.mjs` gains `drive.readers` (a Map of item id to a
  Set of emails) beside `drive.writers`; `sees(g)` becomes: public, or the signed-in email in the nearest readers
  set, or a writer. An item with no readers set inherits its parent's. Own unit test
  `web-tests/test_fake_drive.py` asserts: a members-only root with a link-shared `Data` child; signed out reads
  `Data`, is refused the root and the settings file; a member reads both; a non-member signed in is refused.
- **Fake: batch endpoint.** `POST /batch/drive/v3` with `multipart/mixed` parts, each answered as its single call
  would be. Asserted by the same test: three `GET files/<id>` parts, one refused, come back as three parts with
  200, 200, 404.
- **Fake: revisions.** Each replace keeps a revision (`id`, `keepForever`, bytes); `GET/PATCH
  files/<id>/revisions/<rev>` and `?alt=media` on a revision. Asserted: replace twice, pin the first, read its
  bytes back.
- **Fake: permissions listing.** `GET files/<id>/permissions` lists readers and writers as Drive does (`type`,
  `role`, `emailAddress`). Asserted against a seeded root.
- **Build:** only `web-tests/fakes/google_drive.mjs` and `web-tests/stand_in_drive.mjs` (a `members` option seeding
  readers on the root).

### WP2 - who sees a study

Depends on WP1.

- `req/shell/study/settings` Every study names its Drive settings file by id; no Drive folder link is in the repo.
  - `study.json`'s `root` gives way to `settings` (a file id). `test_study_contract.py` asserts every study with a
    stage names `settings` as 25-60 id characters and no `drive.google.com` link appears in any `studies/*/study.json`
    or `studies/*/data/sources.json` (a grep over the tree, comments included).
  - **Build:** `web/drive.js` `remote.study(manifest)` reads `settings`; `web/study_root.js` `read()` starts from the
    settings file and takes the root, data, previews, extractions and index folder ids from it. Migration of the
    three real studies' files is a hand step (see Hand steps).
- `req/shell/study/members` Signed in, the study list holds the studies whose settings file the user can read,
  asked of Drive in one batch request per load; signed out, the released ones.
  - **Test:** `web-tests/test_study_members_page.py` with a new `members_driver.mjs`, stand-in Drive seeded with
    three studies: A members {x}, B members {y}, C link-shared (released). Signed in as x: switcher lists A and C;
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
- `req/shell/study/review-link` A study in Review opens at its address for anyone, signed out, but is not listed.
  - **Test:** stand-in study D, settings link-shared, stage Review: signed out, `app/D` opens; the switcher does
    not list D; a member's switcher lists D.
  - **Build:** the stage read from the settings file (WP6) decides listing: `Public` listed, `Review` not.
- `req/shell/site/landing` (rewritten) - **owner's question first** (what it lists). Test stays in
  `test_published_site.py`.

### WP3 - one main app, no role menu

Depends on WP2.

- `req/shell/account/role` (removed) and `req/shell/annotate/start` The header has no role menu; someone Drive lets
  write the study's extractions folder sees **Start Annotating**, which moves the page into annotation mode; every
  annotation tool shows only in it, and the mode stays across images and reloads.
  - **Test:** `web-tests/test_annotate_mode_page.py` (rename of `test_roles_page.py`, driver `annotate_driver.mjs`
    from `roles_driver.mjs`). Stand-in Drive with `writers` on the extractions folder for t. As t: no
    `#role-menu` in the DOM; `#annotate-start` visible; before pressing, the DOM differs from a non-annotator's
    only by that button (compare the visible control ids of both pages, a set difference of exactly
    `{annotate-start}`); after pressing, `html[data-annotating]` is set and the GT tasks box shows; next image and
    a reload keep it; Stop leaves it.
  - **Build:** delete `web/roles.js` and its uses in `web/shell.js` (506-538); `makesTruth()` becomes
    `stageAnnotates() && annotating`; CSS `[data-role=…]` rules become `[data-annotating]`. `truth_tasks.js`
    `#gt-start` is replaced by the page-level button.
- `req/shell/annotate/access` Signed in but not let to write, Start Annotating shows with "Ask the study owner
  for access".
  - **Test:** same file, as v (member, no write): button disabled, the line shown; signed out: no button.
  - **Build:** today's `tagger-access` line moves to the button.
- `req/shell/annotate/survives` Annotation mode and unsaved work survive the token running out and going
  offline; Save waits for the next click online.
  - **Test:** same file: annotate 3 actions, `google.expire()`, mode still on, Undo count 3; offline
    (`context.setOffline(true)`), add one, count 4, Save shows "waits for the network"; back online and a click:
    the fake's writes log one extraction write.
  - **Build:** `web/shell.js` stops dropping the session on expiry (`save-draft` path); Save queues on the device.
- `req/shell/annotate/use` Annotation mode names what the work is for in this stage.
  - **Test:** stage Develop shows "scores the algorithm"; Analyze "can become this image's result".
- Shell states: `role` leaves `dev/requirements/shell-states.json`; `annotating` (bool) and `mayAnnotate` join;
  regenerate with `python3 dev/tools/build/shell_states.py`; `test_shell_states_page.py` passes. Each new case to
  the owner.

### WP4 - one store of extractions

Depends on WP3.

- `req/shell/extractions/file` An extraction is one file about one image (by SHA): the model, the runs (algorithm
  key, parameters, code version) and the manual actions, who made it and when.
  - **Test:** `web-tests/test_truth_actions.py` (unit, under Node): a `run` action records `version` (the site
    version string and the study's algorithm code hash); a file without it still loads (old files) and shows
    version unknown, never a guessed one.
  - **Build:** `web/truth_actions.js` `run` entries; the studies' `run` calls (`nor.js`, `vascular.js`,
    `shelves`) pass the version the shell hands them.
- `req/shell/extractions/save` Save writes the person's one extraction for the image to the study's extractions
  folder, replacing their own and keeping Drive's old revision; a count says how many images wait to upload.
  - **Test:** `web-tests/test_extractions_page.py` with `extractions_driver.mjs`: Save twice on one image: one
    file `<stem>__<sha8>/x_<email>.json`, two revisions; two images saved offline: "2 waiting"; online and a click:
    0. `test_truth_folders.py` (Node) covers naming and replace.
  - **Build:** `web/truth_folders.js` loses `accept`/`reject`/`status`'s curated branch; `submit` becomes `save`
    into one `extractions` folder; the `submitTruth` dialog in `web/shell.js` (around 1943) becomes Save.
- `req/shell/extractions/list` Loading an image lists every extraction of it, labelled: mine, then marked (GT,
  official), then others folded; another's opens read-only with "Start from this".
  - **Test:** same file: seed three extractions (mine, y's marked GT, a batch run); assert the order and labels;
    "Start from this" on y's then Save writes mine with `base: <y's file id>`; y's file unchanged (fake writes log).
- `req/shell/extractions/outsiders` Someone who is not a member is listed only GT and official extractions, with no
  person's name.
  - **Test:** same seed, signed out on a Review study: two rows, neither containing an `@`.
- `req/shell/extractions/marks-shown` Load study images shows, per image, whether my extraction is saved, GT or
  official, and whether another's was marked.
  - **Test:** `test_study_index_page.py`: index seeded with marks; row texts asserted.
- Removed: `req/shell/ground-truth/curate`, `pending`, `submit`, `tagger-access` (folded into WP3), and the curated
  and submissions folders in `layout`/`folders`; `history-carry`, `save-draft`, `draft-offer`, `history-file` are
  rewritten to say "extraction". `test_gt_drive_page.py` loses its curate cases and gains none (they move to WP5).

### WP5 - the Study Setup app

Depends on WP4. The largest package; may be split into 5a (the page and what moves) and 5b (marks, batch, People).

- `req/setup/page` Study Setup is the site page `app/setup`, opened from the profile menu's "Study Setup..." by
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
- `req/setup/data` Everything Data Management does today, unchanged in behaviour, in Study Setup: folders, Drive
  access, ground-truth setup (now: the extractions folder), previews, tags and descriptions, hide rules, the
  grouping tag, areas of interest, damaged areas, Needs GT.
  - **Test:** `test_data_mode_page.py` and `test_study_index_page.py` re-pointed at `app/setup`; same assertions.
- `req/setup/marks` The owner marks an extraction GT or official; the study index records file id, pinned revision
  and content hash; one GT mark and one official mark per image; "mark all of this batch official".
  - **Test:** `test_setup_page.py`: mark y's extraction GT: index JSON (read from the fake) has
    `{sha256, file, revision, hash}`, the fake's revision has `keepForever: true`; y saves again: the mark keeps the
    old revision and Study Setup lists the image as "newer than the marked one"; marking another GT replaces the
    first.
  - **Build:** `web/study_root.js` `writeIndex` gains `marks`; `web/drive.js` gains `pin(fileId, revisionId)`.
    Verify first, with a real run, that the owner's per-file permission (`drive.file`) lets them pin a revision of
    a file another member's page made; if not, stop and bring it to the owner.
- `req/setup/batch` The owner runs a chosen algorithm over chosen images; each image gets an extraction at that
  version and parameters; images already done are skipped; a token running out holds it until the next click.
  - **Test:** stand-in Python worker answering from `answers.json`; batch over 3 images writes 3 files; rerun
    writes none; expire after 1, click, the other 2 follow.
  - **Build:** reuses the main app's runner module; Study Setup imports the study's algorithm code for the batch only.
- `req/setup/people` Study Setup lists each member and which of the three shares they hold, with a link to each
  item's Drive sharing dialog.
  - **Test:** fake permissions seeded on settings file, extractions folder and root; rows asserted; links point at
    `https://drive.google.com/drive/folders/<id>?usp=sharing` forms.
- `req/setup/share-guide` Where a stage needs a sharing change (entering Review, Public, moving back), Study Setup
  shows the owner what to share, with pictures, and checks it afterwards.
  - **Test:** promote D to Review: the guide shows; the fake's settings file not yet link-shared: "not done yet";
    seed the share; "done". No sharing write in the fake's log at any point.

### WP6 - the five stages

Depends on WP5.

- `req/shell/study/stage` (rewritten) A study's stage, Setup, Develop, Analyze, Review or Public, is kept in its
  settings file and set by the owner in Study Setup; it opens and closes actions as the table in the map.
  - **Test:** `test_status_bar_page.py` and a new `test_stage_table_page.py` driven from one data file,
    `web-tests/stage_table.json`, transcribing the map's table (stage × action → open/closed); the test loads the
    stand-in study in each stage and asserts each action's control is present or absent, so the table and the page
    cannot drift. A drift guard (`sharedConstants` or a test) ties `stage_table.json` to the map's table rows.
  - **Build:** `web/shell.js` `STAGES` and `stageTruth()`/`takesTaggers()` (454-504) are replaced by one
    `stageAllows(action)` reading a table module `web/stages.js`; `data_mode` reads the same.
- `req/shell/study/stage-popup` The stage label's popup lists the five stages, this one's gate conditions as the
  page measures them, and one line per action open to this user.
  - **Test:** `study_page_driver.mjs`: Develop with 12 images lacking a GT mark: the line "Annotate: 12 images
    still need it" for an annotator, absent for a viewer.
- `req/setup/promote` Study Setup promotes and moves back; before Review it lists images with extractions newer
  than their GT; promoting to Review freezes marking and data.
  - **Test:** `test_setup_page.py`: the list; after Freeze, mark buttons gone; the main app's Save still works but
    labels "after the freeze, not counted".
- Existing studies: NoR, vascular, shelves and fixture start in Develop (their settings files written in the hand
  step).
- Shell states: `stage` takes the five values; each new case to the owner.

### WP7 - the lab reads the index

Depends on WP4 (marks format), can run beside WP5-6.

- `req/lab/index` The lab reads a study's index by link, from the id in `RAUNTRUTH_INDEX_<STUDY>`, and nothing else
  from Drive's listings; without the variable it stops with a message naming it.
  - **Test:** `lab/tests/test_lab.py` with a local HTTP stub standing in for Drive (as the tests do now): with the
    variable, `fetch.py` downloads exactly the ids the index names; without it, exit 2 and the message; no Drive id
    is printed in either output.
  - **Build:** `lab/fetch.py` `Root` replaced by `Index`; `images()` downloads by the index's ids; `sources.json`
    keeps names and hashes only (a check asserts no `drive_id` key).
- `req/lab/gt-marks` The lab scores against GT marks only, at their pinned revision, and refuses a file whose
  hash differs from the mark.
  - **Test:** stub index with two GT marks and one official; scoring corpus has two pairs; a tampered byte: exit
    with the mismatch.
- `req/lab/dataset-sha` The dataset SHA is computed over the model-only form of each GT file.
  - **Test:** two GT files differing only in `history` and `tagger` give the same dataset SHA.
- `req/lab/stage` The lab prints the study's stage from the index, and unattended tasks stop on Review or Public.
  - **Test:** stub index at Review: `run.py --write` exits with "frozen"; `mutation-sweep`'s task worker exits clean
    with the same message (rule `writing-exit-path`).

### WP8 - the Review freeze and the published score

Depends on WP6 and WP7.

- `req/lab/freeze` One lab command commits the study's GT, model-only, to `studies/<id>/gt/<freeze date>/` and
  writes the official scores with their stamp.
  - **Test:** `lab/tests/test_lab.py`: stub index with marks; `python3 lab/freeze.py <study>` writes one file per GT
    mark with no `history`, `tagger`, `created` or email anywhere in the bytes; the metrics carry `{version,
    dataset_sha256, frozen, commit}`.
- `req/shell/processing/stamp` From Review on, each score shows its stamp: algorithm version, dataset SHA, freeze
  date and a link to the GT commit.
  - **Test:** `algorithm_choice_driver.mjs`: metrics with a stamp render it; without one (Develop) nothing.
- The cross-image results view: **owner's question first**.

### WP9 - instructions that name the old model

Depends on WP6. No code.

- Rewrite the `designing-ground-truth-tasks` rule and skill, each study's `requirements.md` stage lines
  (`studies/nor/requirements.md`, `studies/shelves/requirements.md`, `studies/vascular/requirements.md`),
  `lab/README.md`, the `improve-on-ground-truth` and `refitting-on-new-ground-truth` skills' "curated folder",
  and give every study a `STATE.md` at one path (`studies/<id>/STATE.md`) carrying `Stage: <name> (<date>, <who>)`.
- **Test:** a declared check: every `studies/*/study.json` with a stage has `studies/<id>/STATE.md` with a `Stage:`
  line; a grep check that `PreGT|PostGT|Ground Truth Tagger|Study Manager` appear nowhere outside history files.

## Hand steps (the owner's)

To file as one handover issue when WP2 starts (skill `writing-handover-issues`):

- For each of NoR, vascular, shelves: make the root members-only, keep `Data`, `Previews`, the extractions folder
  and the index's folder "anyone with the link", share the settings file with the members.
- Set `RAUNTRUTH_INDEX_<STUDY>` in the Claude cloud environment for each study.
- Already-committed Drive ids stay in git history; images that must stay private before Public need re-uploading.

## Order

WP1 → WP2 → WP3 → WP4 → WP5 → WP6 → WP8, with WP7 beside WP5-6 and WP9 last. WP2-4 change what users see and
each ships alone; WP5 is the one to split if a worker's diff grows past one review.
