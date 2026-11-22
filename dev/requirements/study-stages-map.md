# Study stages: the map

A [Wayfinder](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md) map for #1015,
kept as this one file instead of tracker issues (the owner's choice). The design below is decided; what is left is
the hand-off and the items Not yet specified.

Requirements, tests and build plan: [`study-stages-spec.md`](study-stages-spec.md).

## Destination

`req/shell/study/stage`, `shell/account/role` and the requirements that hang off them are rewritten in
`requirements.md` and agreed by the owner, ready to build. Nothing is built inside this map.

## Notes

- A stage exists to **direct work**, not to describe a study: each stage is defined by the actions it opens and
  the actions it closes.
- Load `grilling` and `domain-modeling` (Wayfinder's companions, upstream in the same repo) when reopening any
  decision.

### Terms

- **Annotation** - a qualified person saying what an image really shows. "Ground truth" (for developing the
  algorithm) and "correction" (for the study's numbers) are the same action, stored in the same place; only its
  use differs by stage.
- **Member** - someone Drive lets read the study's settings file. Membership, not the stage, decides who sees a
  study.
- **Study Setup** - the second app, holding everything Data Management holds today.

## The design

### Two apps, no role menu

- The main app has no role menu. Drive permissions only add actions. Before annotating, the page differs between
  someone who may annotate and someone who may not by one button, **Start Annotating** (name tentative), which
  moves the page into annotation mode; every annotation tool shows
  only in that mode.
- **Study Setup** is a page of the same site, opened from the profile menu's "Study Setup...", sharing the shell's
  code, study files and sign-in. The aim is simpler code, tests and requirements, not only a simpler screen. All
  of Data Management moves there: folders, Drive access, ground-truth setup, previews, tags and descriptions, hide
  rules, the grouping tag, areas of interest, damaged areas, Needs GT. It shows images in the shell's plain view
  (no study algorithm, steps or item view), is online-only, and has its own requirement prefix (`setup/*`)
  and test folder; what both apps share stays under `req/shell`.
- Marking an image's inputs is its own step before annotating: short, purely human work, where annotating is the
  long work the algorithms exist to shorten.
- Images hidden by tag are hidden for everyone in the main app.

### Who sees a study

- **The root is members-only** (owner's correction: a Drive file or folder can carry sharing its parent does
  not): the settings file in it is members-only, and the folders visitors and the lab need are each shared
  "anyone with the link" on top. The site changes sharing only when the owner presses a Fix button in Study Setup's sharing check.
- The repo names each study's **settings file** by its Drive ID, and no folder links: the three real root links
  now in `study.json` come out of the repo. The settings file is shared with named members only and names the
  study's folders, which stay "anyone with the link"; an unnamed folder cannot be guessed.
- Signed in, the page asks Drive whether the user can read each study's settings file, **all studies in one Drive
  batch request per load** (approved by the owner as a batch, not one call per study), and lists only those
  studies. Signed out, or for a study not yet shared, it lists only released ones. An expired token or offline
  keeps the list Drive last gave, until sign-out, with a line saying so.
- Entering **Review** shares the settings file as "anyone with the link": the study opens at its address, signed
  out, but is not listed, so paper reviewers stay anonymous and need no Google account (unlisted, not secret).
  **Public** lists it; the page tells the two apart by the stage in the settings file.
- A study naming an article shows a link to it in the header, with some fanfare, in any stage.

### The stages

Rows are actions, columns stages. "Members" as above. One stage per study.

| | **Setup** | **Develop** | **Analyze** | **Review** | **Public** |
|---|---|---|---|---|---|
| **Study Setup** (root write): folders, tags, descriptions, areas of interest, damaged areas, Needs GT, hide rules, GT setup, previews | open | open | open: new images may still be added and marked | data closed | data closed |
| **Main app, view and run the algorithm** on the study's images | members | members | members | anyone with the address (unlisted), frozen | everyone, listed |
| **Run the algorithm on your own images**, in the browser only, nothing leaving the device | members | members | members | members | everyone |
| **Start Annotating**, saving extractions (extractions folder write) | open for trial, nothing counted | open: annotations score the algorithm | open: annotations replace the algorithm's answer in the study's numbers | closed | closed |
| **Mark an extraction GT or official** (Study Setup, study owner) | closed | open | open | closed | closed |
| **Batch run** (Study Setup) over chosen images | open once there is an algorithm | open | open | open, counts once marked | open, counts once marked |
| **Numbers shown** | none | each version's precision and recall | the study's results | the frozen results | the published results |
| **Developer** (repo) | first algorithm and annotation tools | improve algorithms, record each version's quality | improve algorithms; users correct outputs | only output-preserving changes | same |
| **Owner promotes when** | inputs marked, an annotation tool works | the owner judges the analysis valid | the owner calls the results final | the article is accepted | none |

- Develop and Analyze differ by what the work serves: in Develop annotations score the algorithm, in Analyze
  batch runs and corrections make the study's numbers. Algorithms may keep changing through Analyze (they are not
  meant to be perfect, users correct them); every extraction names the version that made it. The freeze is at
  Review, where a frozen performance score is published with the frozen ground truth that produced it.
- Review adds no permission: reviewers open the study by its address, and Review is a freeze.
- Study Setup's data actions close in Review and Public; the stage, the article link and who is shared stay open
  in every stage, so the owner can still promote, move back and name the article.
- The stage is kept in the study's **settings file** and set by the owner in Study Setup. The page measures each
  gate's conditions where it can and shows them; promoting is always the owner's act.
- A study can move back a stage; only the owner moves it, and nothing is measured to suggest it.
- Each app tells a person their next action in today's stage popup, extended with the gate's conditions and one
  line per action open to this user (for example "Annotate: 12 images still need it").
- The stage directs repo work through each study's `STATE.md` and the skills. The settings file is members-only,
  so a repo session does not read it: `STATE.md` records the stage the owner last gave, and a session that needs
  it and finds none asks.
- Today's studies, all at GT, start in Develop. The Image Viewer is outside the model.

### Ground truth and scores

- An annotation applies only to the image file whose hash it names; it is never carried to another image.
- Re-annotating an image changes the dataset SHA (it covers the annotation bytes), and the next recorded scoring
  re-measures every version on the new dataset; old numbers stay with the old SHA, never patched.
- **At promotion to Review the GT extractions are copied into the repo**, beside the algorithms, holding the
  model alone: no action history, no algorithm invocation, no annotator name. Precision and recall are published
  "officially" then, measured on that committed set; the commit is what makes the numbers reproducible. Before
  Review, annotations live on Drive only. (Committed means public at once, while the study is only unlisted.)

- **Batch runs** run in the main app over the study's images and write one extraction per image to the study's
  Drive folders, each naming the image hash and the algorithm version; the results view reads them and downloads
  a table.
- **Ground truth is a marked extraction.** Every extraction (a tagger's, a researcher's run, a batch run) is the
  same kind of file, kept in one store: the algorithm runs at a version and parameters, then the manual actions
  added. There is no submit, no curated copy and no accept or reject in the main app. Marking an extraction **GT**,
  or **official** for the study's numbers, is a management action the study owner takes in Study Setup, recorded
  in the study index (owner-writable), with the file's content hash so a later edit of a marked file shows. The
  main app only shows the marks. Loading an image lists every extraction of it, labelled (who made it, by algorithm
  or by hand, GT, official). Committing GT at Review is an addendum to this flow.
- **Claude sessions reach a study's Drive root** through an environment variable per study in the owner's cloud
  environment (for example `RAUNTRUTH_ROOT_VASCULAR`), never the repo; a session without it stops with a clear
  message. `sources.json` keeps image names and hashes and drops Drive IDs. CI and the website need no root.

- **Superseded by the spec review** ([`study-stages-spec.md`](study-stages-spec.md)): membership is "can read the
  root" (members-only), not the settings file; one study file in the root holds settings, index, tags, marks and
  stage, link-readable, its id only in the cloud environment; the stage lives on Drive only, never in `STATE.md`;
  after loading an image the page asks how to get annotations on it (continue local work, load from Drive, start
  from scratch, which alone shows the algorithm runner), replacing the Start Annotating button; a GT or official
  mark follows its file's latest content; the Summary box shows whenever the image carries a model.

## Decisions so far

- [Destination](#destination): rewritten requirements, no code.
- [Two apps, no role menu](#two-apps-no-role-menu): permissions add actions; Start Annotating opens annotation
  mode; Data Management becomes Study Setup.
- [Who sees a study](#who-sees-a-study): membership through the settings file, one batch check per load; release
  is the settings file's public share.
- [The stages](#the-stages): Setup, Develop, Analyze, Review, Public as in the table; stage in the settings file,
  owner-promoted, may move back.
- One store for annotations, two uses: scoring in Develop, the image's final answer in Analyze.
- [Ground truth and scores](#ground-truth-and-scores): annotations are hash-exact; re-annotating re-measures
  everything; at Review the model-only annotations are committed and the official scores published on them.
- After the persona reviews: Review opens by unlisted link; Setup opens annotating for trial; Study Setup's
  stage, article and sharing stay open in every stage.
- **Official is just a tag on one extraction of an image**, which counts whole in the study's numbers; no
  combining by area.
- **Annotators**: someone signed in who may not save sees Start Annotating with a line to ask the owner for
  access; annotation mode and unsaved work survive the Google token expiring or going offline, saving waiting for
  the next click online; Start Annotating replaces today's per-image Start GT tagging and stays across images and
  reloads.
- **Entering Review**: before promoting, Study Setup shows the owner the images with unmarked extractions newer
  than their GT. After the freeze the numbers use marked extractions only, so anything saved later does not count.
  Moving back from Review keeps the committed GT and published scores as a dated record; the next Review commits
  anew.
- **Outsiders**: a study's address opened by someone who may not see it says so and names the account they are
  signed in with. Running the algorithm on one's own image, loaded from the device, is open to members in every
  stage and to everyone at Public.

- **Batch runs are a Study Setup action**, open in any stage with algorithms and data: the owner chooses the
  algorithm and the files, and the extractions are stored with the rest. Study Setup therefore runs the study's
  algorithm for a batch, though its viewer stays the shell's plain view. After the Review freeze, batch
  extractions count only once marked, like any other.
- **Study Setup lists People**, read-only: each member and what Drive lets them do (sees, annotates, manages),
  read from the sharing of the settings file and folders (a Drive call approved by the owner here).
- Published numbers show no exclusion counts; the article explains them.
- Each study records its stage, with the date and who gave it, in its `STATE.md`; unattended tasks and unasked
  merges leave a study's algorithm alone from Review on.

## Persona review questions

All nine were resolved in the decisions above, except where they fell under Not yet specified below.

## Hand-off: the requirements to rewrite

Every requirement that names a stage, a role, Data Management or the root (most mentions first):
`req/shell/study/stage`, `shell/account/role`, `req/shell/data/mode`, `req/checks/shell-states`,
`req/shell/load/study-images`, `req/shell/data/index`, `req/shell/ground-truth/summary`,
`req/shell/ground-truth/setup`, `shell/ground-truth/pending`, `req/shell/data/roles`,
`req/shell/data/folders`, `req/shell/data/damaged`, `req/shell/left-bar/shells`, `req/shell/ground-truth/folders`,
`shell/ground-truth/curate`, `req/shell/data/tags`, `req/shell/data/hidden`,
`req/shell/data/area-of-interest`, `req/shell/views/second`, `req/shell/study/switch-in-place`,
`req/shell/status-bar`, `req/shell/status-bar/breadcrumbs`, `req/shell/report/bug`, `req/shell/report/action-log`,
`req/shell/python/one-call`, `req/shell/python/on-run`, `req/shell/offline/default`, `req/shell/header`,
`shell/ground-truth/tagger-access`, `req/shell/ground-truth/save-draft`, `req/shell/ground-truth/draft-offer`,
`req/shell/drive/renewal`, `req/shell/drive/dialog`, `req/shell/data/preview-images`,
`req/shell/data/drive-access`, `req/shell/account/sign-in`, `req/shell/account/settings`.

Tests reading a stage or a role: `study_calls.py`, `test_gt_drive_page.py`, `test_roles_page.py`,
`test_shell_states.py`, `test_status_bar_page.py`, `test_study_contract.py`, `test_study_root.py`, and the shell
states harness (`dev/requirements/shell-states.json`), whose role and stage axes change shape.

Also missed by the first list: `req/shell/study/visibility`, `req/shell/site/landing`, `req/shell/load/from`,
`req/shell/load/button`, `req/shell/load/selector`, `req/shell/account/welcome`. Beyond `requirements.md`: the
`designing-ground-truth-tasks` rule and skill, each study's `requirements.md`, `lab/fetch.py`, `lab/README.md` and
the studies' `STATE.md`.

## Not yet specified

- Study Setup in detail: how the profile menu opens it, how it returns to the main app, which shared pieces move
  from `shell/data/*` to `setup/*`.
- The study results view (cross-image numbers over official extractions), and how extraction files are named
  when one person or one batch makes several for an image.
- The landing page, which lists studies from `study.json` at build time, now that membership is read at run time.
- The gate conditions the page can measure for each stage, worded for the popup.

## Out of scope

- The Image Viewer: no stage, set apart by the owner.
- A preset numeric validity target: the owner judges validity for now, for want of a good UI to set one.
- Building any of it: this map ends at agreed requirements.
