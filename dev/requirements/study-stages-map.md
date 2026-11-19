# Study stages: the map

A [Wayfinder](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md) map for #1015,
kept as this one file instead of tracker issues (the owner's choice). Every question it charted is resolved; what
remains is the hand-off below.

## Destination

`req/shell/study/stage`, `req/shell/account/role` and the requirements that hang off them are rewritten in
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
  moves the page into annotation mode; every annotation tool, accepting or rejecting submissions included, shows
  only in that mode.
- **Study Setup** is a page of the same site, opened from the profile menu's "Study Setup...", sharing the shell's
  code, study files and sign-in. The aim is simpler code, tests and requirements, not only a simpler screen. All
  of Data Management moves there: folders, Drive access, ground-truth setup, previews, tags and descriptions, hide
  rules, the grouping tag, areas of interest, damaged areas, Needs GT. It shows images in the shell's plain view
  (no study algorithm, steps or item view), is online-only, and has its own requirement prefix (`req/setup/*`)
  and test folder; what both apps share stays under `req/shell`.
- Marking an image's inputs is its own step before annotating: short, purely human work, where annotating is the
  long work the algorithms exist to shorten.
- Images hidden by tag are hidden for everyone in the main app.

### Who sees a study

- The repo names each study's **settings file** by its Drive ID, and no folder links: the three real root links
  now in `study.json` come out of the repo. The settings file is shared with named members only and names the
  study's folders, which stay "anyone with the link"; an unnamed folder cannot be guessed.
- Signed in, the page asks Drive whether the user can read each study's settings file, **all studies in one Drive
  batch request per load** (approved by the owner as a batch, not one call per study), and lists only those
  studies. Signed out, or for a study not yet shared, it lists only released ones. An expired token or offline
  keeps the list Drive last gave, until sign-out, with a line saying so.
- **Releasing** a study is sharing its settings file as "anyone with the link"; that is Public's gate action.
- A study naming an article shows a link to it in the header, with some fanfare, in any stage.

### The stages

Rows are actions, columns stages. "Members" as above. One stage per study.

| | **Setup** | **Develop** | **Analyze** | **Review** | **Public** |
|---|---|---|---|---|---|
| **Study Setup** (root write): folders, tags, descriptions, areas of interest, damaged areas, Needs GT, hide rules, GT setup, previews | open | open | open: new images may still be added and marked | closed | closed |
| **Main app, view and run the algorithm** on the study's images | members | members | members | members, frozen | everyone |
| **Run the algorithm on your own images**, in the browser only, nothing leaving the device | - | - | - | - | everyone |
| **Start Annotating** (submissions write) | closed: no annotation tool yet | open: annotations score the algorithm | open: annotations replace the algorithm's answer in the study's numbers | closed | closed |
| **Accept or reject submissions** (curated write), in annotation mode | closed | open | open | closed | closed |
| **Batch run** over the study's images | closed | closed | open, on the locked version | closed | closed |
| **Numbers shown** | none | each version's precision and recall | the study's results | the frozen results | the published results |
| **Developer** (repo) | first algorithm and annotation tools | improve algorithms, record each version's quality | only output-preserving changes | same | same |
| **Owner promotes when** | inputs marked, an annotation tool works | the owner judges the analysis valid, locking the version | the owner calls the results final | the article is accepted | none |

- Develop and Analyze differ by whether the algorithm may change: Analyze's numbers come from one locked version.
- Review adds no permission: reviewers open the study as members, and Review is a freeze.
- The stage is kept in the study's **settings file** and set by the owner in Study Setup. The page measures each
  gate's conditions where it can and shows them; promoting is always the owner's act.
- A study can move back a stage; only the owner moves it, and nothing is measured to suggest it.
- Each app tells a person their next action in today's stage popup, extended with the gate's conditions and one
  line per action open to this user (for example "Annotate: 12 images still need it").
- The stage directs repo work through each study's `STATE.md` and the skills. The settings file is members-only,
  so a repo session does not read it: `STATE.md` records the stage the owner last gave, and a session that needs
  it and finds none asks.
- Today's studies, all at GT, start in Develop. The Image Viewer is outside the model.

## Decisions so far

- [Destination](#destination): rewritten requirements, no code.
- [Two apps, no role menu](#two-apps-no-role-menu): permissions add actions; Start Annotating opens annotation
  mode; Data Management becomes Study Setup.
- [Who sees a study](#who-sees-a-study): membership through the settings file, one batch check per load; release
  is the settings file's public share.
- [The stages](#the-stages): Setup, Develop, Analyze, Review, Public as in the table; stage in the settings file,
  owner-promoted, may move back.
- One store for annotations, two uses: scoring in Develop, the image's final answer in Analyze.

## Hand-off: the requirements to rewrite

Every requirement that names a stage, a role, Data Management or the root (most mentions first):
`req/shell/study/stage`, `req/shell/account/role`, `req/shell/data/mode`, `req/checks/shell-states`,
`req/shell/load/study-images`, `req/shell/data/index`, `req/shell/ground-truth/summary`,
`req/shell/ground-truth/setup`, `req/shell/ground-truth/pending`, `req/shell/data/roles`,
`req/shell/data/folders`, `req/shell/data/damaged`, `req/shell/left-bar/shells`, `req/shell/ground-truth/folders`,
`req/shell/ground-truth/curate`, `req/shell/data/tags`, `req/shell/data/hidden`,
`req/shell/data/area-of-interest`, `req/shell/views/second`, `req/shell/study/switch-in-place`,
`req/shell/status-bar`, `req/shell/status-bar/breadcrumbs`, `req/shell/report/bug`, `req/shell/report/action-log`,
`req/shell/python/one-call`, `req/shell/python/on-run`, `req/shell/offline/default`, `req/shell/header`,
`req/shell/ground-truth/tagger-access`, `req/shell/ground-truth/save-draft`, `req/shell/ground-truth/draft-offer`,
`req/shell/drive/renewal`, `req/shell/drive/dialog`, `req/shell/data/preview-images`,
`req/shell/data/drive-access`, `req/shell/account/sign-in`, `req/shell/account/settings`.

Tests reading a stage or a role: `study_calls.py`, `test_gt_drive_page.py`, `test_roles_page.py`,
`test_shell_states.py`, `test_status_bar_page.py`, `test_study_contract.py`, `test_study_root.py`, and the shell
states harness (`dev/requirements/shell-states.json`), whose role and stage axes change shape.

## Not yet specified

- Study Setup in detail: how the profile menu opens it, how it returns to the main app, which shared pieces move
  from `req/shell/data/*` to `req/setup/*`.
- What a batch run writes, where, and the study results view: no requirement for either exists yet.
- The gate conditions the page can measure for each stage, worded for the popup.

## Out of scope

- The Image Viewer: no stage, set apart by the owner.
- A preset numeric validity target: the owner judges validity for now, for want of a good UI to set one.
- Building any of it: this map ends at agreed requirements.
