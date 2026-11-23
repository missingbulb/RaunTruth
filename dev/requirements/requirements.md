# The page's requirements

What a person using the page sees and can do whichever study it runs: the shell (`web/`), Study Setup, then the repo's
checks. Each line is a requirement; its detail and its test fold under it. What one study's page does is that
study's own spec, `studies/<id>/requirements.md` (`req/checks/spec-layout`).

Each requirement is named by a tag, a path under its section's tag (`req/shell/offline/default`), and
cited by that tag wherever code, tests or docs point at it. Each section is sorted by tag, segment by
segment: a new requirement goes where its tag sorts, never at the end, and a related one shares its
branch. `web-tests/test_requirement_tags.py` holds every spec to this and fails a citation of a tag no
spec has.

A sentence opening **Tentative** is a call Claude made where the owner has not decided: it says what the page
does there, and stays open until the owner approves or changes it. One opening **Undecided** names a case
nobody has decided: what the page does there is not a requirement yet.

## `req/shell` The shell, whichever study it runs

- `req/shell/account/consent-guide` Before the page opens a Google window that will ask the user something, a guide shows its screens, framing what to click, and stays until Google answers.
  <details>

  Set by the owner on 2026-11-17, since while the site is unverified Google hides the way in. Signing in when no
  one is signed in on this device (the welcome popup's Sign in with Google, the avatar menu's) first opens the
  guide: numbered steps, each with a screenshot of Google's screen and what to click framed. Signing in: choose the
  account; on Google's unverified-app screen, Advanced, then Go to rauntruth.com (unsafe); tick every box (both
  Drive ones among them, the per-file one shown) and Continue. The guide's
  Open Google's window asks Google in that click; the guide stays, saying it waits for Google, until Google
  answers, then closes; its Cancel asks Google nothing. A renewal Google answers by itself shows no guide. The
  screenshots are of other apps' screens on Google, published on help pages (owner, 2026-11-17, the source under
  each), and served from the site. Changed by the owner on 2026-11-20: sign-in asks for the per-file permission
  too, so no separate approval, Google's picker or guide for it is left (`req/shell/data/drive-access`). Test:
  `web-tests/test_welcome_page.py`.
  </details>

- `req/shell/account/settings` The avatar's menu opens Settings: every setting that follows the user, to change and save.
  <details>

  Set by the owner on 2026-10-31. Settings… in the avatar's menu opens a dialog listing each setting
  that follows the user (`req/shell/account/sign-in`), whether or not they are signed in, each with a control to change it:
  the theme (follow the system, dark or light); Show thumbnails in the Drive
  dialog; whether the low-memory popup shows; the last Google Drive link, and the last one in each
  study; the tips closed, each with a tick to clear to see it again; the recent images from Google
  Drive, each with a tick to clear to drop it; Animations; and the version seen last. Set by the owner on 2026-11-07,
  it also holds Auto-save images from Google Drive (`req/shell/drive/kept-images`), which stays with the device and is
  saved there. A line says where they are
  kept: in the user's Google Drive when signed in, else on this device only. Below them, set by the
  owner on 2026-11-02, **Kept on this device only**: every other setting the page keeps here, the
  shell's and the study on show's, each with its size and a tick to clear to forget it, and a link
  that clears them all, since the Storage tab no longer lists them (`req/shell/storage/manage`). Save writes what changed,
  the theme at once, and when signed in saves the user's settings file; Cancel changes nothing. Test:
  `web-tests/test_account_page.py`.
  </details>

- `req/shell/account/sign-in` Signing in with Google keeps the user's settings in their own Google Drive; not signing in changes nothing.
  <details>

  Set by the owner on 2026-10-31. The site has no server of its own for this: Google signs the user
  in, in Google's own window, and the page reads and writes their settings in their own Google Drive,
  in the app's hidden folder (`drive.appdata`), as one small file it reads whole and replaces whole.
  When the site has a Google client (the repository variable `GOOGLE_CLIENT_ID`, written into
  `config.js` by the build), the avatar's menu offers Sign in with Google, which asks Google for the
  user's name, email and picture, for the app's own folder in their Drive, and, set by the owner on
  2026-11-06, to read their Drive (`req/shell/drive/credentials`), and, set by the owner on 2026-11-20, Google's
  per-file permission (`drive.file`, `req/shell/data/drive-access`); it changes nothing in their Drive but its own
  folder and the files it adds to a study's folders. A token from before, lacking `drive.file`, is renewed on the
  next click on a Drive control, Google then asking for it.
  Signed in, the avatar is the user's picture, the menu names them and offers Sign out. These
  settings follow the user: dark or light, the tips closed, the version last seen, the low-memory
  popup turned off, the last Drive link (in each study too), Show thumbnails,
  the images opened from Drive lately, whether animations are on (`req/shell/resources-dialog/animations`) and how the status bar shows its resources (`req/shell/status-bar/resources`). These stay with the device: the left bar's width,
  Auto-save images, and everything kept for images. Google's token lasts about an hour and is kept on
  this device for that hour. A new one can be asked for only in the user's own click or key press, so
  once it has run out the page asks only in one that needs Google: a change to a setting that follows
  the user, opening Drive's button or the image selector, or any click that reads Drive (`req/shell/drive/renewal`). Google's window then opens and closes by itself while
  Google still remembers the consent; any other click opens nothing. Whenever
  the page has a token it syncs: the file's settings replace this device's, the theme at once, except
  each one this device changed since it last synced, which is kept and saved over the file's; with no
  file yet, this device's start it. While it has a token,
  each change to a setting that follows the user saves the whole file. Sign out forgets the user and
  the token on this device and leaves its settings as they are. A visitor who never signs in is asked
  once on opening the page (`req/shell/account/welcome`) and loads no script or account detail from Google for it; the one
  thing the page reads from Google signed out is the study's link-shared study file, by the site's key, for the study's stage
  (`req/shell/study/stage`; approved by the owner on 2026-11-22). Set by the owner on 2026-11-22: two tabs signed in at
  once, each changing settings, are not a requirement, and no test covers them; a change made in one may be lost to the
  other's sync. Test: `web-tests/test_account_page.py`,
  `web-tests/test_site_config.py`.
  </details>

- `req/shell/account/welcome` Opening the page asks, once, whether to sign in with Google or go on anonymously, and remembers the answer if asked to.
  <details>

  Set by the owner on 2026-11-02. Where the site has a Google client (`req/shell/account/sign-in`), opening the page
  fades it behind a popup offering **Sign in with Google** or **Continue anonymously**, with
  **Remember this choice** below them, unticked. Ticked, the answer stands: signed in, the next
  visits open signed in with no popup, and anonymously, with no popup either, but a tip beside the
  avatar suggesting signing in to keep the settings on every device and reach the user's data files
  as themselves, until closed (`req/shell/account/settings` lists it with the tips). Unticked, the popup comes back on the
  next visit, signed in or not; there Continue anonymously signs out as the menu's Sign out does,
  and Sign in with Google goes on as the user signed in. A remembered answer the sign-in on this
  device contradicts (anonymous, yet signed in from another tab) is asked again. Signing in from the
  menu counts as a remembered choice; signing out there forgets it, and every open tab follows a
  sign-in or sign-out made in another. Closing the popup (Escape) changes nothing for this visit.
  Set by the owner on 2026-11-02 after a review: Sign in with Google keeps the popup up until Google
  answers; a Google window cancelled or blocked leaves it up, saying sign-in did not finish, to try
  again or continue anonymously. Google's script loads as the button is pressed, never on hover or
  focus. The popup deletes nothing and stops nothing the page is doing. Offline (`req/shell/offline/default`), a user
  signed in is not asked: the page opens signed in and the settings waiting for Google Drive keep
  waiting, to be asked on the next visit online. Anyone else offline still gets the popup: Sign in
  with Google is held, as everywhere offline, and a line says signing in can wait until the network
  is back, from the avatar's menu; Continue anonymously works. The sign-in tip, like every tip,
  follows what it points at when the window resizes. Test: `web-tests/test_welcome_page.py`.
  </details>

- `req/shell/annotate/choice` After an image loads, the left bar asks how to get annotations on it, per image; only starting from scratch shows the algorithm runner.
  <details>

  Set by the owner on 2026-11-21, in place of the role menu (the header has none: one page for everyone, to which
  what Drive's sharing lets a person do only adds) and of Start GT tagging. In a study whose stage lets its users
  annotate (Setup, Develop and Analyze; `req/shell/study/stage`), once an image has loaded an
  Annotations box in the left bar asks, for that image, how to get annotations on it: **Continue local annotation
  work**, offered only when this device holds a draft of the image (`req/shell/ground-truth/save-draft`) and entering
  annotation mode with it loaded; **Load annotation from Drive**, which lists the image's annotations on Drive and,
  once one is chosen, shows it read-only, as the study's final results with no annotation tool and no algorithm run
  (`req/shell/ground-truth/view`), offering **Edit this annotation**, which enters annotation mode with it as the base;
  and **Start annotating from scratch**, which enters annotation mode and is the only way that shows the algorithm
  runner (Processing). Annotation mode is the page an annotator had, for the one image: the study opens
  afresh on it, Ground Truth Tasks, Undo, Redo, Save Draft, Save and every annotation tool show, the study's
  postprocessing shows, and the walk of the tasks is open from the first model on, with no Start GT tagging or Stop
  tagging (`req/shell/ground-truth/tagging`); the root carries `data-annotating`. Nothing of it shows outside the mode.
  Loading another image leaves the mode and asks again, so does Unload, and the mode is not kept across a reload.
  The list is that of `req/shell/extractions/list`. Tentative: a study whose stage does
  not annotate (Review, Public) asks nothing, and Processing shows as before. Test:
  `web-tests/test_annotate_mode_page.py`.
  </details>

- `req/shell/annotate/clear` Clear all annotations from image puts the page back as just after the image loaded, forgetting the device's draft.
  <details>

  Set by the owner on 2026-11-21. In annotation mode a button in the Annotations box asks first, naming the actions not
  yet saved that are lost, and on a yes forgets this device's draft of the image and opens the study afresh on the
  same image outside annotation mode, the choice asked again. Drive is not touched, whatever was saved there
  staying. Cancel changes nothing. The Edit History window's own Clear all history stays as it was
  (`req/shell/ground-truth/clear`). Test: `web-tests/test_annotate_mode_page.py`.
  </details>

- `req/shell/annotate/no-save` Someone the store lets save nothing gets the same choices and tools, with no Save, a Download, and a line saying what to do.
  <details>

  Set by the owner on 2026-11-21, and moved from the removed tagger-access requirement (set by the owner on
  2026-11-05, changed on 2026-11-07). Whether the user may save to the study is what Drive's sharing gives them: signed
  in and able to add to the study's extractions folder. Someone who may not sees every choice and every tool of the
  mode, but Save does not show and a Download button does, in the same row, taking the same popup of the
  checklist and the file, which holds the Export alone; and at the top of the Ground Truth Tasks box a line says to
  sign in (signed out), or to ask the study owner for access (signed in without it); for a sign-in without the
  per-file permission, to sign out and in again ticking its box (`req/shell/data/drive-access`); for a study that has
  set up no extractions folder, the same. Someone who may save is told nothing, the line taking no room. A sign-in that
  ran out, or a store that did not answer, is not a reason to take Save away (`req/shell/annotate/survives`). Test:
  `web-tests/test_annotate_mode_page.py`, `web-tests/test_gt_drive_page.py`.
  </details>

- `req/shell/annotate/survives` Annotation mode and unsaved work survive the token running out and going offline; a save waits for the next click, and a count says how many images wait.
  <details>

  Set by the owner on 2026-11-21. Neither Google's token running out (it lasts an hour, `req/shell/account/sign-in`) nor
  the network going leaves annotation mode or drops the actions made: the mode and Undo's count stay. Save's popup,
  when the store cannot be reached or no live token is held, says so, keeps the ground truth on this device (a draft
  saved, an upload waiting) and counts, beneath Save, how many images are waiting to upload. The waiting uploads go with
  the next click of the user, online, which renews the token as `req/shell/drive/renewal` has it; a refusal by the
  store itself is final and is said, as before (`req/shell/extractions/save`). Test:
  `web-tests/test_annotate_mode_page.py`.
  </details>

- `req/shell/browsers/supported` The page names the browsers it supports; in any other, the status bar's report icon is a warning sign.
  <details>

  Set by the owner on 2026-11-03. The page supports Chrome, Edge, Firefox and Safari on a desktop or laptop computer, each
  from the version `web/browsers.json` names, the one place the list is kept; the floor is the first version that
  places the page's popups by CSS anchor positioning (Chrome and Edge 125, Firefox 147, Safari 26; an older one
  shows each popup at a fixed spot). Firefox and Safari joined on 2026-11-03, the owner's call once the nightly
  run on their engines (`req/checks/other-engines`) was green. A phone or tablet, iPhone and iPad included, is not supported, nor is any
  other browser (Opera, Samsung Internet), whatever engine it runs; one that names
  itself as Chrome (Brave, Vivaldi) counts as Chrome. In a browser not supported, the status bar's report
  icon (`req/shell/report/bug`) is a warning sign in the warning colour instead of a bug, named Unsupported browser, its
  tooltip saying why and that clicking it reports a problem; the report it opens is titled "Unsupported browser: ". The site's landing page (`req/shell/site/landing`) lists the
  same browsers, written in by the build from `web/browsers.json`. Test: `web-tests/test_problem_report_page.py`,
  `web-tests/test_published_site.py`.
  </details>

- `req/shell/channels/rows` Each channel has its row: shown or not, its black and white points, its name and its description.
  <details>

  Set by the owner on 2026-10-31; one line per row, a colour picker, triangle points and a value bubble
  on 2026-11-03. One row per channel of the image, all on one line: a checkbox that shows or hides it,
  its name, a (?) whose hover shows the study's description of it (at most 100 words), the file's own
  name for it when the study names it otherwise, one slider holding two points, and right of the slider
  a colour picker, a swatch a little wider than tall in a thick frame, like a picture's, its colour
  shaded on the diagonal, a little lighter at the top left and darker at the bottom right with the
  channel's colour at the centre, that recolours it. At or below the black point the channel is dark, at
  or above the white point its full colour, in proportion between; the black point stays below the
  white. Only the colour picker carries the channel's colour: the checkbox and the slider, a ramp from
  black to white, look the same on every row. The slider's track is centred in its row and each point is
  a right-angled triangle sitting on it, the black one left of its value and the white one right, so
  that the two meeting make one larger triangle over one value and neither hides the other: each can
  still be dragged away from there. While a point is dragged or has the keyboard's focus, its value
  (0–255) shows in a small bubble above it, gone once it is let go. A double click on the slider puts
  the points back. The channels are added together, each in its colour. A channel's name, colour,
  description, whether it shows at first and its first points come from the study's `channels` for the
  channel at that place, the study's rule having put the file's channels in its order
  (`req/shell/image/open`), else from what the file says, else from its place: red,
  green and blue, then more colours, a lone channel grey; a channel the file colours but does not name
  is named for its colour. The rows start over with every image, and before any image there are none (set by
  the owner on 2026-11-04). Test:
  `web-tests/test_image_box_page.py`, `studies/viewer/tests/test_viewer.py`.
  Set by the owner on 2026-11-10, a study may show no channel rows at all, naming `channels` in its
  `study.json`'s `view.hide`: the Bookshelf Reader's photos are the camera's colours, nothing to unmix
  (`studies/shelves/tests/test_shelves_page.py`).
  </details>

- `req/shell/data/area-of-interest` A study owner marks an image's area of interest; the summary counts inside it, and a viewer's own area comes with a warning.
  <details>

  Set by the owner on 2026-11-17. In Data Management's Tags box (`req/shell/data/tags`) a study owner lassoes an
  image's area of interest, drawn and combined as the summary's mask is (`req/shell/summary/mask`), on the image itself
  once Load Original has opened it, never on its preview, whose pixels are not the image's; Clear takes it off. The
  page keeps it in the study file and its study index (`req/shell/data/index`). Opened by anyone, the image shows the
  area outlined, whether or not the summary shows, and its summary's mask starts as the area. A viewer may draw their
  own mask in its place; while the summary counts a mask of the viewer's own, a warning line at the bottom of the view
  says so, and Clear mask, named "Use the study's area" then, puts the study's area back. Tentative: an image with no
  area of interest counts the whole image, with no warning, until the viewer draws a mask of their own, which is
  warned of. Test: `web-tests/test_study_index_page.py`.
  </details>

- `req/shell/data/damaged` A study owner marks an image's damaged areas; the study's Python is handed them, the summary leaves them out and every viewer sees them marked.
  <details>

  Set by the owner on 2026-11-17. In place of Edit Image's imperfections (Edit Image is gone), a study owner lassoes
  the damaged areas of an image in Data Management's Tags box, on the image itself once Load Original has opened it;
  Clear takes them off. The image is never changed: the outlines are kept in the study file and its study index
  (`req/shell/data/index`), in the image's pixels, running through every slice of a stack. The image, opened by
  anyone, shows them darkened inside a dotted line. The summary's mask leaves them out: a point in one is not inside
  (`req/shell/summary/mask`). Set by the owner on 2026-11-18: each study's Python is handed the damaged areas with
  every call, as its Session's `damaged` (`req/shell/python/one-call`), and decides itself what to leave out; the
  fixture study leaves out the pixels whose centres lie in one. Set by the owner on 2026-11-19 (missingbulb/RaunTruth#1024):
  the NoR Finder and the Bookshelf Reader analyse no pixel of a damaged area (`req/nor/find/damaged`,
  `req/shelves/books/damaged`), Vascular Measurements leaves them out of its model's measurements
  (`req/vascular/model/damaged`), and each study's scorer leaves what lies in one out of both the answer and the
  ground truth. The lab reads the damaged areas from the tags in the study root's study file, without signing in, and hands them
  to the versions and the scorers as the page hands them to its Python, an answer kept for the areas it was run with.
  Test: `web-tests/test_study_index_page.py`, `web-tests/test_study_runs.py`, `lab/tests/test_lab.py`.
  </details>

- `req/shell/data/drive-access` A study owner sees, in the folder tree, which of the study's folders the site may write for them.
  <details>

  Set by the owner on 2026-11-02. In Data Management (`req/shell/data/mode`), the tree shows, for each
  folder: writable, as Drive's sharing lets the user add files there, or view only. The site writes with Google's
  per-file permission (`drive.file`), asked at sign-in (`req/shell/account/sign-in`); a sign-in without it, its box
  unticked, reads every folder as No permission, saying to sign out and in again ticking that box (owner,
  2026-11-20). The page only creates files and changes or trashes the ones it
  created; it never changes a file anyone else made. Changed by the owner on 2026-11-20: no approval of folders, no
  Google picker and no button asking for the permission. Real Drive lets the per-file permission create files in
  any folder the user may add to, picked or not, and a pick gave the site nothing it used
  (missingbulb/RaunTruth#1042). Test: `web-tests/test_data_mode_page.py`.
  </details>

- `req/shell/data/folder` A folder chosen shows its images as a grid or a list, and the left bar sums it up.
  <details>

  Set by the owner on 2026-11-02. Choosing a folder in the tree fills the main area with its images,
  a grid of previews or a list, a button switching them with a slide. A folder's images, in the tree and the
  folder view, are the kinds the study opens, those its `files.accept` names (set by the owner on 2026-11-07:
  the Bookshelf Reader's JPEG photos among them). A photo's preview, in the tree and the folder view, is Drive's own
  small picture of it, linked from the folder's listing; only a TIFF's comes from the folder's previews file (set by
  the owner on 2026-11-10: the page's stretch, made for fluorescence, darkened photos). The left bar's Selected Folder
  box replaces the Image box and counts its images, how many have a preview, how many previews are
  out of date (the image's SHA-256 differs from the preview's), how many have ground truth beside
  them (`<name>.ground_truth.*`, `<name>` the image's name without its extension) and how many are
  marked as needing it (`req/shell/data/preview-images`). The toolbar's tools stay over the folder's
  images, waiting for an image (set by the owner on 2026-11-04: the viewer's basic ones may sit there). Test: `web-tests/test_data_mode_page.py`,
  `web-tests/test_shell_states_page.py`.
  </details>

- `req/shell/data/folders` The study file lists the study's image folders; adding a folder is a study owner's explicit act, adding an image is not.
  <details>

  Set by the owner on 2026-11-17. The study file in its Drive root (`req/shell/ground-truth/setup`, `req/shell/study/one-file`) lists
  the folders the study's images come from, by id, under `folders`; a study file naming none has the data folder its
  root names, else the root itself, as its one listed folder. A study owner adds a folder there, or takes one out, as
  an act of its own: Data Management's tree shows each listed folder with Remove from study, and under it the folders
  of the root no listed folder holds, each with Add to study; a folder elsewhere in Drive is added by pasting its link,
  and the page says so when that folder is not shared as "Anyone with the link", which a viewer needs to read it. An
  image added to a listed folder in Drive changes nothing in the study file. An image is in the study while it is in a
  listed folder, a folder under one included. A folder beside an image of its name, a `.vsi`'s `_<name>_` folder
  (`req/shell/image/cellsens`), is part of that image and not listed. The page writes the study file only where it made
  it; one made by hand it leaves alone, and says to delete it in Drive to let the page manage it. Every other key of
  the study file stays as it was. The Image Viewer, with no root, has the folder whose link was pasted.
  </details>

- `req/shell/data/hidden` A study owner hides images by their tags; hidden images are left out of Load study images.
  <details>

  Set by the owner on 2026-11-17. The study file keeps tag rules (`req/shell/data/tags`), under `hide`, set in Data
  Management's Study images: an image carrying a tag or a tag value a rule names is hidden (a rule naming a
  multi-value tag alone, `group`, hides every image holding any value of it), and Load study images
  (`req/shell/load/study-images`) does not list it outside Data Management. A study owner in it still sees
  hidden images, marked so. Tentative: a hidden image a user opened before stays in their recent images. Test:
  `web-tests/test_study_index_page.py`, `web-tests/test_tags.py`.
  </details>

- `req/shell/data/index` The study index, generated from the listed folders, holds every image with its tags, description, areas and preview; one read gets it all.
  <details>

  Set by the owner on 2026-11-17; moved into the one study file on 2026-11-21 (`req/shell/study/one-file`). The study
  file keeps, under `index`, a generated copy of the study's images, the study index: the listed folders
  (`req/shell/data/folders`), each by id and name, and every image in them with its Drive id, name, the folder it is in,
  its path of folder names from the listed folder down, size, SHA-256 and when Drive last changed it; its tags,
  description, damaged areas (`req/shell/data/damaged`) and area of interest (`req/shell/data/area-of-interest`) join it
  as those are built; the study file's grouping tag and hiding rules, kept beside it, come with it, so the study file
  alone draws Load study images offline. Only a study owner's page writes it: each time Data Management has listed the
  study's folders, and after a folder is added or taken out, a tag or a description changed, or the grouping or hiding
  set, it writes the index when what it holds differs from the one there, saying when it was built and by whom; an index
  the same as the one there is not written again, and a tag edit and the index it changes are one write. A study file
  the page did not make is left alone, and the page says to delete it in Drive. Anyone else reads the
  study file, one read, and lists from it; an image added in Drive since the index was built is not listed until a Study
  Manager's page rebuilds it. The tags, descriptions and areas are kept here, in the file the page made, never on the
  images (`req/shell/data/drive-access`). Undecided: whether the index replaces each folder's previews file or sits
  beside it. Test: `web-tests/test_study_index_page.py`, `web-tests/test_study_root.py`.
  </details>

- `req/shell/data/mode` Data Management: Study Setup's column of the study's folders, left of the left bar, open until folded.
  <details>

  Set by the owner on 2026-11-02, changed on 2026-11-03: Data Management is a view of its own that nobody
  but those Drive lets write the study's root sees any of. Changed by the owner on 2026-11-21, with the role menu gone
  (`req/shell/annotate/choice`): it was entered from an item of the avatar's menu. Changed by the owner on 2026-11-22:
  it is Study Setup's (`req/setup/page`), the study's own page holding none of it, and it is on whenever that page is
  open for someone Drive lets write the root. In it the tree of the study's folders sits left of the left bar, open; its
  chevron folds it to a narrow strip and opens it again. The tree shows every folder and subfolder, open,
  each with its access (`req/shell/data/drive-access`); a folder's images stay folded under it until
  its image count is clicked, each with a small preview. In the mode the left bar keeps the Image box
  and hides the study's own drawers, its item view
  and the steps; Load vanishes in a puff, Unload in its line with it: choosing another image or folder
  replaces the one open (set by the owner on 2026-11-04). The steps hidden are the status bar's breadcrumbs, with the item
  view's switch and its tasks' bar (set by the owner on 2026-11-04). Set by the owner on
  2026-11-04, and on 2026-11-05 how it meets working offline (#768): offline, the avatar's Study Setup item is listed
  but says it needs the internet, and choosing it does nothing (`req/shell/offline/default`); Study Setup opened
  offline says so and asks Drive nothing (`req/setup/page`). Going offline
  inside Data Management keeps what is open: the column and the folder's box say they need the internet and do
  nothing until the network is back, and what reaches Drive (Approve, Update previews, Needs
  GT) is held with them; the Image box, the shell's own, stays usable. Test: `web-tests/test_data_mode_page.py`, `web-tests/test_shell_states_page.py`.
  </details>

- `req/shell/data/preview-images` An image chosen in Data Management opens from its preview; Load Original opens the image itself.
  <details>

  Set by the owner on 2026-11-02. Choosing an image in the tree or the folder view opens its preview
  in the study's viewer, a stack in 3D, quick and the same for everyone; the Image box's Load, or its
  top line (`req/shell/load/selector`), gives way to Load Original, which opens the image itself from the copy kept on this device when it has one,
  else from Drive. A preview that cannot be read (a damaged previews file) shows as no preview, and the image,
  chosen, opens itself instead. A study owner can mark an image as needing ground truth (Needs GT), once the study's ground
  truth is set up (`req/shell/ground-truth/setup`): the page creates an empty `<stem>__<sha8>.needs_gt`, named as the image's ground-truth subfolder
  (`req/shell/ground-truth/layout`), in the extractions folder,
  never in the data folder (set by the owner on 2026-11-10); unmarking trashes only a marker the page made. Two
  images of one name are marked apart. Once the image has ground truth the marker stays and is no longer shown. Test:
  `web-tests/test_data_mode_page.py`, `web-tests/test_previews_writer.py`.
  </details>

- `req/shell/data/roles` A study names its Drive root; Drive's own sharing decides who manages its data and who tags.
  <details>

  Set by the owner on 2026-11-02; moved to the study's root on 2026-11-07. A study's `root` is a link to its
  Google Drive root folder, the only folder the repo names; who may read it is Drive's sharing of it, members only
  until the owner shares it by link (`req/shell/study/members`). The
  folders under it are named by the root's study file (`req/shell/ground-truth/setup`), and until it has
  one, by name: `Data`, its images, and `Extractions`. Signed in, opening
  a study asks Drive, with the user's token, whether they may write to the root (Study Setup is offered) and
  to the extractions folder (they may save, `req/shell/annotate/no-save`); each is offered only where Drive says so. Nobody is
  listed in the repo, and what anyone can change is still what Drive lets them. Changed by the owner on 2026-11-21: who
  may read the root decides who sees the study at all (`req/shell/study/members`). Tests:
  `web-tests/test_study_contract.py`, `web-tests/test_study_root.py`, `web-tests/test_gt_drive_page.py`.
  </details>

- `req/shell/data/tags` A study owner tags images and folders and describes each image; a folder's tags apply to every image in it.
  <details>

  Set by the owner on 2026-11-17. A tag is a single hyphenated word (`damaged-slide`) or a value of a multi-value tag, written
  `name:value` (`group:wild-type`, `group:sick`); an image holds at most one value of each multi-value tag. A Study
  Manager adds any tag to an image, or to a listed folder, where it applies to every image in it and under it, and
  writes a description of each image. Every image carries `folder:<path>`, its folder's path from the listed folder
  down, given by the page and never edited. What a file holds, "2D · 3 channels" or "3D · 24 slices"
  (`req/shell/drive/stacks`), is not a tag. In Data Management the Tags box, below the Image box, edits the tags of the
  folder or image chosen, and an image's description: Enter adds a tag, a tag's × takes it off, and a folder's tags
  show on its images, dimmed, naming the folder they come from. Tentative: a tag is written in lower case, words of
  letters and digits joined by hyphens, and a multi-value tag's name and value alike; `folder` is the page's own name
  and no tag may use it. Tentative: an image's own value of a multi-value tag wins over one a folder gives it, and a
  folder's over one the folder holding it gives. The tags and descriptions are written by the page into the study file in the study's root, under `tags`
  (`req/shell/study/one-file`), never on the images, and from there into the study index (`req/shell/data/index`), each
  image with the tags it carries, in one write; a study file the page did not make is left alone.
  Test: `web-tests/test_study_index_page.py`, `web-tests/test_tags.py`, `web-tests/test_study_root.py`.
  </details>

- `req/shell/data/update-previews` Update previews makes the folder's previews for the images that lack one or changed, and keeps the rest.
  <details>

  Set by the owner on 2026-11-02. Under the folder's summary, Update previews is on while a TIFF
  lacks a preview or has an out-of-date one. It downloads only those TIFFs, makes their previews in
  the browser as `dev/tools/previews/make_previews.py` does (`req/shell/drive/previews`; a flat image at
  most 256 px a side, a stack at most 96 px and 24 slices), keeps every still-valid preview of a TIFF as it was,
  and writes the folder's previews file (`req/shell/drive/previews`) into the study root's `Previews` folder, made
  there when the root has none: a new file, or the page's own one replaced. Nothing is written into the data
  folder, which may be one no study participant can write to (set by the owner on 2026-11-10). A previews file the
  page did not make is left alone, and the page says to delete it in Drive to let the page manage it;
  deleting the page's own makes it start over. Test: `web-tests/test_data_mode_page.py`,
  `web-tests/test_previews_writer.py`.
  </details>

- `req/shell/dialogs/focus-returns` When a dialog or menu closes, keyboard focus goes back to the control that opened it.
  <details>

  Set by the owner on 2026-11-23. Closing any modal dialog, the shell's or a study's, by its Close or
  Cancel, its ×, Escape or a choice in it, and closing any menu (Escape, a choice), puts the keyboard on
  the control that opened it, not on the page's body. Where that control is gone or hidden by then (a
  menu item whose menu closed, a button its list redrew), it goes to the one that leads back to it: the
  menu's own button, or the redrawn button in its place. One shared piece of the shell does this, so a
  new dialog or menu does it too. Test: `web-tests/test_dialog_focus_page.py`.
  </details>

- `req/shell/dialogs/open-from-button` A popup dialog a button opens grows out of that button.
  <details>

  Set by the owner on 2026-11-03. Every modal dialog on the page, the shell's and a study's, opened by
  a click on a button or a link (or the keyboard pressing one), grows from that button's place and size
  to its own in a fifth of a second, fading in, while its backdrop darkens. A dialog nothing pressed
  opens, the Welcome on arrival say, appears at once, as does every dialog with animations off
  (`req/shell/resources-dialog/animations`) or reduced motion asked for. Test:
  `web-tests/test_dialog_motion_page.py`.
  </details>

- `req/shell/drag/escape` Escape in the middle of any drag cancels it: what the drag changed goes back, and the rest of the press does nothing.
  <details>

  Set by the owner on 2026-11-15. Every drag on the page, the shell's and a study's, cancels on Escape
  pressed before the button is let go: a ground-truth handle, corner or lasso, the summary's mask lasso, the ruler, the left bar's width, the minimap, the image's pan and the 3D view's turn all go
  back to where they were when the press began. That Escape does nothing else, no dialog closes on it,
  and letting go afterwards is no click and no drop.
  Every drag goes through one wrapper, so a new one cancels the same way. Test:
  `web-tests/test_drag_escape_page.py`, `web-tests/test_drag_wrapper.py`.
  </details>

- `req/shell/drag/hint` While anything is dragged, a label at the bottom center of the page says "Hit 'esc' to cancel".
  <details>

  Set by the owner on 2026-11-16. It shows once the pointer pressed has moved, on every drag that Escape cancels
  (`req/shell/drag/escape`), and goes when the drag ends: released, cancelled or Escaped. A click that does not move
  shows nothing. It sits above the status bar and takes no pointer. Test: `web-tests/test_drag_escape_page.py`.
  </details>

- `req/shell/drive/credentials` Signed in, the page reads Google Drive as the user, with their token alone; signed out, with the site's API key.
  <details>

  Set by the owner on 2026-11-06. Signed in, every Drive read the page makes (a folder's listing, a file's details,
  a download) carries the user's own Google token and never the site's API key, so a folder the user's account can
  see opens whether or not it is shared publicly, a shared drive's included, and one it cannot see is refused as
  Google refuses it. Signed out, the same reads carry the site's API key alone, and reach only what is shared as
  "Anyone with the link". A signed-in user whose token has run out is not read for with the key: the next click on
  a Drive control renews the token (`req/shell/drive/renewal`), and a read with none says to click again. Sign-in asks Google for read access
  to the user's Drive (`drive.readonly`) along with the rest (`req/shell/account/sign-in`); a token from before
  that, lacking it, is renewed on the next click on a Drive control. `drive.readonly` is a restricted scope: until
  Google verifies the site, Google shows an "unverified app" screen on signing in and lets in at most 100 new users
  (missingbulb/RaunTruth#803). Test: `web-tests/test_drive_reads.py`, and, of the page's own sign-in, `web-tests/test_drive_renewal_page.py`.
  </details>

- `req/shell/drive/dialog` Google Drive: a study browses its own folders, the Image Viewer takes a pasted link; open on Open, double click or Enter.
  <details>

  Set by the owner on 2026-11-04: a study naming a Drive root (its `root`, `req/shell/data/roles`) offers no link to
  paste; its dialog opens straight into the data folder its root names, else the root itself, and browses only within
  it. A study naming none, the Image Viewer, takes the pasted link of an image or a folder: one shared as
  "Anyone with the link", or, signed in, any the user's account can see (`req/shell/drive/credentials`). An image's link loads it at once; a folder lists its subfolders and the images the study opens (the kinds its `files.accept` names), to pick from, each image
  with its size, a small colour thumbnail and, for one opened before in the study, how long since, as the image
  selector says it (`req/shell/load/selector`); set by the owner on 2026-11-04, in place of the date it was added to
  Drive, an image the folder did not hold when this device last listed it carries a small boxed "new", and hovering
  on that says when it was added to Drive (a folder listed here for the first time marks none, having nothing to
  compare with: `req/shell/drive/offline-listing`); the dialog keeps one
  size while the user moves between folders. A click only selects a row; Open (or a double click,
  or Enter) opens it: an image loads, a folder lists its contents. Thumbnails are never read from
  Drive's files, which answers a burst of reads by refusing the browser for a while, the next image
  included. Set by the owner on 2026-11-07: an image no previews file covers (`req/shell/drive/previews`)
  shows Drive's own small picture of it, linked from the folder's listing, unless it is a TIFF, which Drive
  draws grey when it has several channels and which may be a 3D stack (`web-tests/test_drive_previews_page.py`). A study may ship ready-made thumbnails (its `driveThumbs`), fetched for the rows in view
  and the next 10 below them, more as the user scrolls; a row scrolled past before its turn is not
  fetched. Each thumbnail lands in its own row whatever order they arrive in, and a folder's listing
  is shown only while it is still the folder asked for. One fetched stays for the page's life:
  closing the dialog stops the rest, and reopening it shows those at once and fetches what the rows
  in view still lack. Test: `web-tests/test_drive_thumbs_page.py`. An image opened from Drive saves its own in the browser (the latest 100), shown from then
  on without a download; set by the owner on 2026-11-17, it is kept as a JPEG in cache storage, not in the settings' storage (`req/shell/storage/manage`). All but Drive's own are in the colours the page gives the
  channels. Show thumbnails in Settings (on at first, `req/shell/account/settings`) turns the downloads off; set by the
  owner on 2026-11-07, the dialog itself holds no such checkbox. The status bar's message says, while they load ("Thumbnails 3 of 10 ·
  1.2 MB"), how many have arrived and their size; once they are in, the message says again what it said
  before (set by the owner on 2026-11-05: the message, not a text of its own beside it). It needs the site's Google API key, kept in the repository variable
  `GOOGLE_API_KEY` and written into `web/config.js` at deploy; without one the option is off
  (`web-tests/test_site_config.py`). Where it takes a link, the dialog opens on the link last pasted in this
  study, else on the link last pasted in any study, and lists a folder link at once; opening on a link is not
  pasting it (`web-tests/test_drive_folder_page.py`). Nothing
  else read from Drive is kept, apart from the image files Auto-save images keeps and what each folder listed holds
  (`req/shell/storage/manage`, `req/shell/drive/kept-images`, `req/shell/drive/offline-listing`;
  `studies/nor/tests/test_drive_dialog.py`).
  </details>

- `req/shell/drive/kept-images` Images from Drive open again without a download.
  <details>

  Set by the owner on 2026-11-07, the Google Drive dialog holds neither Show thumbnails nor Auto-save images nor
  what they take on this device: both are in Settings (`req/shell/account/settings`), Auto-save images on at first and
  kept on this device, and Manage storage says what they take. While Auto-save images is on,
  an image downloaded from Drive is kept on this device. An image chosen in the image selector (`req/shell/load/selector`)
  opens from the copy kept here, with no call to Drive. One chosen from Drive itself, in the dialog's
  list or by its link, opens from the kept copy, whatever the checkbox says, only once its SHA-256
  matches the one Drive gives for the file now (from the folder's listing, or from the file's
  details for a link); otherwise it is downloaded: when the two differ (the file changed on Drive),
  and when Drive gives no SHA-256 or cannot be asked. A download replaces the kept copy while
  Auto-save images is on. Test: `web-tests/test_storage_page.py`, `web-tests/test_drive_cache_page.py`.
  </details>

- `req/shell/drive/offline-listing` The Drive dialog keeps every folder it lists, so it opens offline too, on those folders, greying what cannot open.
  <details>

  Set by the owner on 2026-11-04. Each folder the dialog lists is kept on this device: its rows, what Drive says
  of each (name, size, date, SHA-256), never a thumbnail's bytes or an image's. Offline, the dialog opens on the
  folders it opens on online and shows each folder as last listed: an image kept on this device
  (`req/shell/drive/kept-images`) opens as it does online, and every other image, and a folder never listed, is
  greyed and opens nothing. Online, opening the dialog or a folder shows its kept listing at once, when there is
  one, reads it again from Drive and puts what Drive says now in its place, kept too. Online, an image kept on this
  device carries the offline mark (`req/shell/offline/mark`), the others nothing. Offline with no listing kept for
  the link, the dialog lists the images kept on this device instead (`req/shell/offline/default`). Settings lists
  the listings among what is kept on this device only (`req/shell/account/settings`), and the privacy policy says
  they are kept. Test: `web-tests/test_image_line_page.py`.
  </details>

- `req/shell/drive/previews` A folder's previews file gives every image it covers a preview at once, a stack turning on hover.
  <details>

  A data folder's previews file is `<folder id>.tiff` in the `Previews` folder of the study's root, named by the
  data folder's id so that renaming or moving the folder keeps its previews (set by the owner on 2026-11-10; a
  `rauntruth-previews.tiff` inside a data folder, where previews were kept before, is no longer read). The
  `Previews` folder is found in the root's listing the page already reads, and listed once a minute at most.
  The file is made by Update previews (`req/shell/data/update-previews`), or by `dev/tools/previews/make_previews.py`
  on a computer that has the folder's TIFFs and uploaded under that name: a multi-page TIFF, its pages
  deflate-compressed, whose first page's description is a JSON index naming each image, its SHA-256
  and its pages. A flat image has one colour page; a stack has a mini-volume, one 8-bit page per
  slice and channel. Only TIFFs have one: a photo is shown by Drive's own small picture of it, and a picture of
  one in an older file is ignored (set by the owner on 2026-11-10). The dialog never lists the file; when a folder has one it downloads it at
  once, in one request, and keeps it in the browser until Drive gives the file a different SHA-256.
  An image the index names with the SHA-256 Drive gives for it now shows its preview and, a TIFF, what it
  holds (`req/shell/drive/stacks`; a PNG or JPEG shows no 2D or channel tags) with no read of its own: a flat image's colour picture, a stack's mini-volume drawn
  turned a little, its channels in their own colours, and turning while the pointer is over its row.
  An image the index lacks, or names with another SHA-256 (it changed since the file was made), is
  read as without the file (`req/shell/drive/dialog`, `req/shell/drive/stacks`). The download waits, like every other, while Drive
  throttles the site (`req/shell/drive/throttle`). Manage storage counts each folder's file with its study's thumbnails. Test:
  `web-tests/test_drive_previews_page.py`.
  </details>

- `req/shell/drive/renewal` Any click that reads Google Drive renews a run-out sign-in and carries on with the new token; a click in the token's last ten minutes renews it early.
  <details>

  Set by the owner on 2026-11-10. Google gives a new token only within the user's own click or key press
  (`req/shell/account/sign-in`). So, signed in, a Drive read the user's click starts, from any control (a Drive button,
  a folder or image in Data Management, Update previews, an offline download, a ground-truth save), renews a token
  that has run out, silently for the same user, waits for Google's answer and goes on with the new token: one click
  does what it was for, never "press again". In the token's last ten minutes such a click renews it too, the read
  going on at once with the token it still has. Google is asked once however many reads the click starts. A read
  with no click behind it opens nothing and, with the token run out, fails saying to click again; so does one whose
  click Google's window answered with no token. Test: `web-tests/test_drive_renewal_page.py`.
  </details>

- `req/shell/drive/stacks` The Drive dialog tells a 3D stack from a flat image, and shows a stack in 3D once opened.
  <details>

  Each TIFF row in the Google Drive dialog says what the file holds, "3D · 24 slices" for a stack
  ("3D · 30 slices · 2 channels" when it has more than one channel) and "2D · 3 channels" for a flat
  image, read from the file's first 64 KB (its ImageJ header), for the
  rows in view and the next 10 as the thumbnails are (`req/shell/drive/dialog`) and only while Show thumbnails is on.
  What each file holds is remembered in the browser, so it is read once. A file whose header says
  neither shows nothing. When a stack is opened from Drive, its thumbnail is a small 3D picture of
  the whole stack, turned a little to show its depth, its channels in their own colours (two in green
  and magenta), drawn from the file the page already has with
  no further download; a flat image's stays the one `req/shell/drive/dialog` describes. Test:
  `web-tests/test_drive_shapes_page.py`.
  </details>

- `req/shell/drive/throttle` When Google throttles the site's Drive downloads, the Drive dialog says so and waits 15 minutes.
  <details>

  Google answers a burst of downloads by refusing the site's for a while, with no word the page
  can read, so the page knows it by a download failing while Drive still answers for the same
  file's details (a failure where both fail is shown as the error it is). From then on, for 15
  minutes, the Drive dialog shows a large notice, "Google is throttling this site's downloads. Try
  again in 15 minutes.", with a red countdown from 15:00, and makes no call to Drive: its link, Go,
  Open, the list, its thumbnails and badges all wait. The wait is kept in the browser, so reloading
  the page does not end it. An image kept on this device (`req/shell/drive/kept-images`) still opens, from the device. When
  the countdown ends, the notice goes and the dialog lists its link again. Test:
  `web-tests/test_drive_throttle_page.py`, and, of telling throttling from another failure, `web-tests/test_drive_reads.py`.
  </details>

- `req/shell/extractions/file` An extraction is one file about one image, by its SHA-256: the model, the runs that made it with the version of each, and the manual actions, who made it and when.
  <details>

  Set by the owner on 2026-11-21 (WP4 of `dev/requirements/study-stages-spec.md`). Every annotation of an image, a person's
  or a batch run's, is the same kind of file in one store: the study's model as its `document` gives it, one more key,
  `history` (`req/shell/ground-truth/history-file`), holding the actions in force, and `tagger`, `created` and `image`
  (its name and SHA-256). A `run` action records `version`, `{site, code}`: the site's version string and a hash of the
  study's Python as the release's offline list names its files (the worker reads it from the list it already fetches, so no
  call is added; where the page has no list the hash is null). A file written before has no `version`: it loads
  as before, its run's version is unknown, and none is guessed. Tests: `web-tests/test_truth_actions.py`,
  `web-tests/test_python_files.py`, `web-tests/test_gt_drive_page.py`.
  </details>

- `req/shell/extractions/list` Loading an image lists every extraction of it, labelled: mine, then marked (GT, official), then others folded; another's opens read-only with Edit this annotation.
  <details>

  Set by the owner on 2026-11-21. Load annotation from Drive (`req/shell/annotate/choice`) lists, from the
  extractions folder's listing and the image's subfolder's, two in all and no file read, every extraction of the image:
  the user's own first ("Yours"), then those the study file marks GT or official (`req/shell/study/one-file`, a mark
  names its extraction by file id and follows that file's latest content), then the others, folded under "Others". A
  member (whoever Drive lets read the study's root, `req/shell/study/members`) sees each labelled "by hand" or by the
  algorithm and version that ran, from its file's name, never by a person, since the name holds only a hash; the mark is
  added to the label ("by hand · GT"). The click
  on a row reads that one file and shows it read-only; **Edit this annotation** enters annotation mode on it, and the
  next Save writes the user's own extraction with `base`, the id of the file it was edited from, leaving that file
  unchanged. Tests: `web-tests/test_annotate_mode_page.py`, `web-tests/test_extractions_page.py`,
  `web-tests/test_truth_folders.py`.
  </details>

- `req/shell/extractions/marks-shown` Load study images shows, per image, whether your extraction is saved, GT or official, and whether another's was marked.
  <details>

  Set by the owner on 2026-11-21. Each image's row in the Drive dialog and the image selector's recents carries a tag
  read from the study file's marks (`req/shell/study/one-file`) and this device's record of the images it saved:
  "yours: saved", "yours: GT" or "yours: official" (a mark whose extraction is the user's own), and "GT marked" or
  "official marked" for a mark on another's extraction, joined by " · "; an image none of them touch keeps "GT wanted"
  where its Needs GT marker is (`req/shell/data/folder`). One line of the dialog counts them: "Yours: 2 saved, 1 GT. 1
  with another's marked." Tentative: "saved" is known from this device's record, not from Drive, which would take a
  listing of every image's subfolder; an extraction saved from another device shows as saved here once it is saved or
  marked here. Tests: `web-tests/test_study_index_page.py`, `web-tests/test_gt_drive_page.py`.
  </details>

- `req/shell/extractions/outsiders` Someone who is not a member is listed only GT and official extractions, with no person's name.
  <details>

  Set by the owner on 2026-11-21. Signed out, or signed in with an account that cannot read the study's root, the
  list of an image's extractions (`req/shell/extractions/list`) holds the marked extractions alone, each labelled by
  the algorithm and version that ran or "by hand", with the mark ("by hand · GT"), and no email anywhere in it or in the
  line that follows a click. Files are named by a hash of their author's email (owner, 2026-11-22), so listing the
  link-shared folder names no one; the email stays inside each file, which anyone with the folder's link can open. Tests:
  `web-tests/test_extractions_page.py`, `web-tests/test_truth_folders.py`.
  </details>

- `req/shell/extractions/save` Save writes the person's one extraction for the image to the study's extractions folder, replacing their own and keeping Drive's old revision; a count says how many images wait to upload.
  <details>

  Set by the owner on 2026-11-21, in place of Submit. Save (the left bar's task row and its popup, which also holds
  the checklist and Export file) writes the user's extraction of the image, `x_<key>.json`, into the image's
  subfolder `<stem>__<first 8 hex of its SHA-256>` of the study's one `Extractions` folder (named by the study file,
  made by Set up extractions in Data Management and shared by link to view), making the subfolder when it lacks one.
  Saving again replaces the user's own file, keeping Drive's earlier revision (`keepRevisionForever`), and writes
  nothing else. Only an image opened from Drive can be saved, and Save is not shown to someone Drive lets write nothing
  there (`req/shell/annotate/no-save`). A save the store did not take waits on this device and goes with the next click
  online, counted beneath Save ("2 images waiting to upload"), keyed on no HTTP status: the store refusing is final
  (`req/shell/annotate/survives`). Saving also keeps the draft (`req/shell/ground-truth/save-draft`). Approved by the
  owner (study-stages-spec.md, approvals): the write of the person's extraction is the one call Save makes beyond the
  listings. Tests: `web-tests/test_gt_drive_page.py`, `web-tests/test_annotate_mode_page.py`,
  `web-tests/test_extractions_page.py`, `web-tests/test_truth_folders.py`.
  </details>

- `req/shell/ground-truth/areas` A study whose ground truth is walked area by area takes how many areas from the shell's Areas menu.
  <details>

  Set by the owner on 2026-11-19 (missingbulb/RaunTruth#747): the field is cut into n × n areas, and n is the
  tagger's to choose in an Areas menu at the top of Ground Truth Tasks, the same for every study: the whole field,
  2 × 2, 3 × 3, 4 × 4, 5 × 5, 6 × 6, 8 × 8 and 10 × 10, the list Vascular Measurements offered of its own since
  2026-11-07. A study that walks by areas names the count it starts at in its `study.json`
  (`groundTruth.areas`: NoR 10, Vascular 4); one that names none has no menu. The shell owns the walk's order: the
  rows of areas top to bottom, each row the way back from the last, so the next area always borders the one just
  done, and hands the study each area's place and box and the area a point lies in. The count only divides the work:
  what is checked is the field it covers, whatever count it was checked under, and an area is done once all of it is
  (owner: "all pixels need to be approved"). The study hears each change of count and walks again from its first area
  not done. Test: `web-tests/test_gt_areas.py`,
  `studies/nor/tests/test_truth_tasks_page.py`, `studies/vascular/tests/test_vessel_tasks_page.py`.
  </details>

- `req/shell/ground-truth/clear` Clear all history, in the Edit History window, forgets the open image's draft on this device and returns to the algorithm's output.
  <details>

  Set by the owner on 2026-11-05, as Clear progress, beside Save: a tagger's progress on an image is kept in
  the browser so they can come back to it, and clearing forgets only the open image's. Changed by the owner on 2026-11-17:
  every study keeps its ground truth as GT actions (`req/shell/ground-truth/history`), so it is Clear all history…, at
  the foot of the Edit History window, and there is no Clear progress. It asks first, naming the image, then forgets this
  image's draft on this device and returns the model to the algorithm's output, or to the base the log stands on when a
  run is not its root (the earlier edits once loaded, the stored ground truth a draft was read as): the question and the
  status line say which; other images keep theirs and anything saved stays in Drive. Test:
  `web-tests/test_gt_history_page.py`.
  </details>

- `req/shell/ground-truth/draft` A tagger's draft of the image open is their GT actions kept on this device, saved by Save Draft and offered by Load draft.
  <details>

  Set by the owner on 2026-11-10, a shell feature, not a study's: a tagger comes back to an image with their progress on
  it. Changed by the owner on 2026-11-17: every study keeps its ground truth as GT actions (`req/shell/ground-truth/history`),
  so the shell keeps no progress of a study's own and there is no Continue GT tagging. The draft is the log and its model,
  saved by Save Draft (`req/shell/ground-truth/save-draft`) and offered by Load draft (`req/shell/ground-truth/draft-offer`);
  Continue local annotation work, in the Annotations box (`req/shell/annotate/choice`), loads it and enters annotation
  mode, the walk beginning at the first item not done. Manage storage lists a draft among its image's selections, and still lists a key an earlier version
  kept (`gt-draft|…`), which a study offers once as its old store (`req/shell/ground-truth/legacy`). Clear all history forgets
  the draft (`req/shell/ground-truth/clear`). Tests: `web-tests/test_gt_history_page.py`,
  `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shell/ground-truth/draft-offer` Opening an image that has a draft on this device offers Load draft; nothing is loaded unasked.
  <details>

  Set by the owner on 2026-11-17. When the image open has a draft on this device, by the study and the image's SHA-256
  (`req/shell/ground-truth/save-draft`), the Annotations box offers Continue local annotation work (`req/shell/annotate/choice`) and, once the image is
  opened in annotation mode, the Ground Truth Tasks box opens with it and shows Load draft above its tasks, before the study has listed them too, saying when it was saved and how many actions it holds ("Load draft · saved 14:08, 212 actions").
  Only that click loads it: the model and its history come back with no step of the study run again, the replay checked
  (`req/shell/ground-truth/history-replay`) and its outcome said on the status line. Loading over actions not yet saved
  asks first. A draft that could not be looked up is said on the status line. The page's root carries `data-gt-lookup`,
  `pending` from the image's opening and `done` once the looks for its draft, and for the person's own extraction, have ended, for tests to wait on. Tentative: the button stays while the
  draft on the device is not the one loaded. Approved by the owner on 2026-11-16: for an annotator, on an image
  from the remote store, the offer also names their own extraction there ("Load your extraction · saved 12 Nov,
  14:08"), found from two listings as the image opens (the extractions folder, then the image's subfolder, when it has one), the
  file read only on that click, checked as a draft is, and one from before the log loaded as a base with no history.
  Nothing is cached, and no other call is made. Set by the owner on 2026-11-17: those two listings, and the one download
  on the click, are the only calls this adds. Tentative: both offers show when the device holds a draft too, and
  an extraction saved or loaded in this visit withdraws its offer. Tests: `web-tests/test_gt_history_page.py`,
  `web-tests/test_gt_resume_page.py`, `web-tests/test_truth_folders.py`.
  </details>

- `req/shell/ground-truth/folders` A study's annotations live in one Extractions folder under its root, read by anyone and written by those Drive lets.
  <details>

  Set by the owner on 2026-11-05 as a submissions folder and a curated folder; replaced on 2026-11-21 by one store
  (`req/shell/extractions/file`): the folder the study file names by id (`extractions`), found by name `Extractions` while
  it names none. Who may write it is what Drive's sharing of it allows; viewers, the file dialog and the study's lab read
  it, so it is shared by link to view. There is no submitted and no curated copy and no accept or reject in the main app: an
  extraction becomes ground truth or official when the owner marks it (`req/shell/study/one-file`), in Study Setup.
  Ground truth is never sent to GitHub. Tests: `web-tests/test_study_root.py`, `web-tests/test_truth_folders.py`.
  </details>

- `req/shell/ground-truth/history` A tagger's ground truth is an ordered log of GT actions, undone and redone one at a time down to the algorithm's run.
  <details>

  Set by the owner on 2026-11-17. Each change to an image's ground truth is one GT action, `{at, type, …}`: when, and
  the least data that says what happened, with no label, no inverse and no number; `at` is only ever the time, so a
  place in an action has another name. One gesture is one action, done whole by the study (a drag is one action, at its
  drop; a drag Escaped is none, `req/shell/drag/escape`). The shell keeps them in order in the action log, after its
  own: `open` (the image and the study), `run` (the algorithm, its settings and what it emitted) and `base` (stored
  ground truth that has no log). A study names a module of pure functions in its `study.json` (`groundTruth.actions`):
  `start(output, previous)`, the run's output as a model, lending it the ids of the model before by place; `run(model,
  action)`, the next model, or `{skip}` when its target is not there, never changing the one it was given;
  `describe(action, count, model)`; `where(action, model)`; `document(model)`, the study's file; and `load(document)`,
  its inverse. The study records an action with `shell.gt.act` and draws the model the shell hands it; the log, replay,
  undo and redo are the shell's, the same in every study. Undo takes the last action off the log and replays the rest
  (`req/shell/ground-truth/history-replay`); Redo puts it back; a new action forgets what was undone. Undo stops at the
  first run or base, and there is none to undo before one; undoing a later run goes back to the model on the run before.
  Two runs with no action between them are one, the later.

  The log is shown as Edit History, a tool window floating over the image at its bottom right, framed and headed as the
  minimap is, 2.5 times the minimap's height and never taller than the view less its margins, 1.4 times its width. Show
  Edit History, in Ground Truth Tasks, shows it (remembered on this device), and its ✕ hides it; it shows once the image
  has a run or a base. Newest on top, a dot at the current state; what was undone sits above the dot, dimmed and struck,
  until a new action clears it. A click on a row goes to it, the run's row back to the algorithm's output; the image's
  opening closes the list and is no row to go to. A row's words are the study's `describe`, its time at the right. Runs
  of one type fold into one row with its count and its span of time, unfolded by its chevron; Undo still takes one
  action. A day rule breaks sittings. The list scrolls inside the window, the current row pinned to its edge while
  scrolled away, and past 1,000 rows only those in view are drawn. An action a later run could not carry is greyed
  ("didn't carry over"), and so is a log a mismatch set aside ("earlier history, not replayable in this version"), the
  image's opening apart: it was never history to replay.
  Hovering a row rings its item on the image, from the study's `where`; when the item is out of view the row's title says
  "Off screen — click to go there" and nothing is ringed, and a click pans there
  (Tentative: in the 3D view the ring sits at the stack's middle depth and nothing pans). The ring is yellow, or the
  colour a study names for it in its `study.json` (`groundTruth.ring`) where its image or its own marks carry yellow.
  Undo's tooltip names what it
  will undo. Tests: `web-tests/test_truth_actions.py`, `web-tests/test_gt_history_page.py`.
  </details>

- `req/shell/ground-truth/history-carry` A run after stored ground truth, or after earlier work, carries that work onto its new output; only what no longer fits is left out, and said.
  <details>

  Set by the owner on 2026-11-17 (the design's decision 4). Ground truth read from a file with no log, a draft that did not
  replay, or Load earlier edits is a base; the algorithm then runs, and the study's `start(output, previous)` is handed that
  base as `previous`. It puts the base's ground truth onto the new output: decisions (approvals, rejections, verdicts),
  edited lines, widths, corners and titles, the areas and junctions checked, and the items the tagger added, each matched
  to the new output by its id and then by its place within the study's tolerance. An added item is kept as added. A decision
  or edit on an item the new output does not have is dropped, and the model lists what was dropped, in `dropped`; the shell
  says how many on the status line, and on the run's row in Edit History ("Algorithm ran: 12 vessels · 3 not carried
  over"), whose tooltip names them by the ids the study gave them. An item the base does not hold but the new output does is the output's own, undecided.
  Run after run with no base, `previous` holds no ground truth and nothing is carried. A study says its own line about a run
  before it records the run (`shell.gt.ran`), so that the count of what was left out is the line that stands. Tests: `web-tests/test_truth_actions.py`,
  `web-tests/test_gt_resume_page.py`, each study's `tests/test_gt_actions.mjs`, `studies/nor/tests/test_gt_actions_page.py` and
  `studies/vascular/tests/test_vessel_tasks_page.py`.
  </details>

- `req/shell/ground-truth/history-file` The saved file is the study's model with one more key, `history`, the log that made it; a file without it still loads.
  <details>

  Set by the owner on 2026-11-17. Save and Export write the study's document of the model and add
  `history: {format: "rauntruth-gt-history/1", replay, actions}`: the actions still in force, in order, each with its
  time, the runs with their outputs deflated; what was undone is not written. A reader that knows only the study's own
  fields is not disturbed, and the shell takes `history` off before it hands a file to a study. A file without
  `history` loads as a base, with no history. Test: `web-tests/test_gt_history_page.py`.
  </details>

- `req/shell/ground-truth/history-replay` The model and its log are both kept; replaying the log must give the stored model, and where it does not the stored model wins.
  <details>

  Set by the owner on 2026-11-17. A replay is the model of the last run (or base), then the study's `run` for every
  other action in order, those from before a later run too, by id: no algorithm, no page, no clock, the same under Node
  as in the page. An action whose item the new run no longer has is skipped and stays in the log. When a stored model is
  loaded with its log, the shell replays the log and compares the two as the study's documents, by SHA-256: `verified`,
  the replayed model with its whole history undoable; `mismatch`, the stored model taken as a base and the earlier log
  kept but no longer replayed; `none`, a model stored without a log, taken as a base. No study version is kept: a study
  whose code changed what an action does shows as a mismatch, as does a log whose replay fails. Tests:
  `web-tests/test_truth_actions.py`.
  </details>

- `req/shell/ground-truth/layout` The folder holds one subfolder per image and one file per author in it.
  <details>

  Set by the owner on 2026-11-05, changed on 2026-11-21. An image's subfolder is named `<image name>__<first 8 hex of its
  SHA-256>`; in it, a person's file is `x_<key>.json`, the key the first 16 hex of the SHA-256 of their lower-cased email (set by the
  owner on 2026-11-22, so a listing names no one), and a batch run's `run_<algorithm key>__<version>.json`. The file
  carries the image's full SHA-256, who made it and `created`, the time it was made. Saving again replaces the person's
  own file, keeping Drive's earlier revision forever. Only an image opened from Google Drive can be saved; for one
  opened from the computer the Ground Truth Tasks box says so. Test: `web-tests/test_gt_drive_page.py`,
  `web-tests/test_truth_folders.py`.
  </details>

- `req/shell/ground-truth/legacy` What a study kept of a tagger's edits before it kept GT actions is offered once, as a base, and never loaded unasked.
  <details>

  Set by the owner on 2026-11-17, for the edits Vascular kept in this browser. A study that kept them somewhere of its own
  hands them over with `shell.gt.legacy({model, count, from, forget})` once its run is in the log: `model` is the study's
  document, `count` how many edits it holds, `from` what to call it, `forget` removes the old store; `shell.gt.legacy(null)`
  withdraws the offer, and each image and each run says it afresh. Ground Truth Tasks then shows Load earlier edits
  beside Load draft. Only that click loads them: the document becomes the log's base, no history behind it, asking first
  when actions are not saved, and the edits are counted among the unsaved ones. The old store is forgotten only
  once Save Draft or Save has kept the base, never before, so closing the page first loses nothing and they are offered again at the next visit.
  A study whose old store means something only on the run's items (the NoR Finder's votes, kept by a candidate's place) hands
  over `actions` in place of `model` and `count`: the GT actions the store implies. The click then records each on the model as
  it stands, stamped then, as the tagger's own: nothing is replaced, so nothing is asked; each is a row of Edit History, undone
  like any other, and counted unsaved; one whose item is not there is left out, and with none recorded the offer stays (tentative:
  the owner set the base, for Vascular; the actions are the validator's of the NoR Finder's move, 2026-11-17). Tentative: the offer has no path in the
  shell's states, the studies that keep an old store being offered it by their own code. Test: `web-tests/test_gt_history_page.py`.
  </details>

- `req/shell/ground-truth/save-draft` Save Draft, beside Save, keeps the tagger's work on this device; until it is pressed nothing is saved.
  <details>

  Set by the owner on 2026-11-17. The log and its model live in the page while the tagger works, so they can try
  things without touching what is saved. Save Draft writes the log and the model to this device (IndexedDB database
  `gt-drafts`, one record per study and image SHA-256), replacing the image's draft; Save saves the draft too. Actions
  not yet saved are counted beside Undo ("· 6 unsaved", shown signed in or out: nothing is kept on this device until Save Draft, set by the owner on 2026-11-23), and leaving the page with any asks first. A write that fails is
  said, never swallowed. Manage storage lists a draft under its image and deletes it (`req/shell/storage/manage`).
  Tentative: replacing a draft that was not loaded in this visit asks first, saying when it was saved and how many
  actions it holds. Once a draft is saved or loaded, an algorithm run after it counts as unsaved too. Opening another
  image, or unloading this one, with actions not yet saved asks first. Tentative: so does choosing another study from the
  study menu, and Clear all annotations from image, which names them (`req/shell/annotate/clear`). What no question can stop gives up the
  unsaved actions without asking, and the spec says so plainly here: the browser's Back and
  Forward buttons, which swap the study at once. A sign-in that runs out gives up nothing (`req/shell/annotate/survives`).
  The count beside Undo and Save Draft are the guard against all of them. Test: `web-tests/test_gt_history_page.py`.
  </details>

- `req/shell/ground-truth/setup` Set up extractions, in Data Management, makes the study's Extractions folder and names it in the root's study file.
  <details>

  Set by the owner on 2026-11-07, changed on 2026-11-21 (one store, `req/shell/extractions/file`). For a study owner of a study in Setup, Develop
  or Analyze, Data Management offers Set up extractions, which asks to confirm and then makes `Extractions` in the root,
  shares it with anyone with the link to view, and writes `rauntruth-study.json` in the root, the one study file
  (`req/shell/study/one-file`), naming the data folder and the extractions folder by id, who set it up and when. Without the
  page's per-file permission it says the site may not write to the root. Run again, it makes only what is missing and rewrites
  the file; it never makes a second folder of a name. Google's own words show when it refuses. It sits at the top of Data
  Management's column, highlighted while the root has no such folder, and is no longer offered once the study file names
  it. There is no review of submissions to choose: nothing is submitted. Tests: `web-tests/test_study_root.py`,
  `web-tests/test_gt_drive_page.py`.
  </details>

- `req/shell/ground-truth/summary` An Extractions box in Data Management says where annotations are saved and how many images have one.
  <details>

  Set by the owner on 2026-11-07, changed on 2026-11-21. In a study in Setup, Develop or Analyze whose study file names an extractions
  folder, an Extractions box sits above the folder tree in Data Management. It says everyone's saved annotations of the
  study's images are kept there, one file per person for each image, and counts, from the folder's one listing, the images
  with an extraction and, from the study file's marks, those with a GT mark. A chosen folder's summary counts the same.
  It reads again whenever a folder is chosen. Test: `web-tests/test_gt_drive_page.py`.
  </details>

- `req/shell/ground-truth/tagging` Annotating is the walk of the tasks: it opens with annotation mode, with no Start or Stop.
  <details>

  Set by the owner on 2026-11-07, changed on 2026-11-21 (`req/shell/annotate/choice`). The Ground Truth Tasks box
  counts each task all the while. Annotation mode, which the choice of how to get annotations enters, is the walk: it
  begins at the walk's next item not done as soon as the study has a model for it (an algorithm run, a draft or an
  annotation loaded), a task's name opens it at that task, and it ends with the mode, when another image opens, the
  study leaves or all annotations are cleared; there is no Start GT tagging or Stop tagging. What tagging alone shows, the
  current item's ring, the area's frame and what is cut out of the image, is shown only in the mode, and the Show
  menu's rows for them are off out of it. Set by the owner on 2026-11-10, what is cut out can be the viewer's: a study
  gives it the shapes its tagger has decided, and the viewer cuts them out of the image while the tagger tags, black
  where it is cut out, and gives the image back whole out of the mode; changed by the owner on 2026-11-19, no picture
  shows behind it. A study hears the mode through its tasks' `tagging` hook, which runs when the mode begins, which
  may be before it has a model, and `tasks.tagging()`. Test: `web-tests/test_gt_drive_page.py`,
  `studies/nor/tests/test_truth_tasks_page.py`, `studies/vascular/tests/test_vessel_tasks_page.py`,
  `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shell/ground-truth/tasks` The shell lists the study's ground-truth tasks in Ground Truth Tasks, Save last; how a task is worked through is the study's.
  <details>

  Set by the owner on 2026-11-07. The study names its tasks in order (a name, and a tooltip saying what the
  task is) and how far each has got, done of all; the shell draws them in its Ground Truth Tasks box
  (`req/shell/left-bar/shells`): a progress bar split into one part per task, each as wide as its task is long
  and filled as far as it is done, then one row per task, "13/47 Finalists", with a check once it is done, and
  last the shell's Save row, which opens the save popup (`req/shell/extractions/save`) with
  the study's ground truth, Save Draft (`req/shell/ground-truth/save-draft`) beside it, and above them Undo and Redo (`req/shell/ground-truth/history`). A task is open only while
  the tagger tags (`req/shell/ground-truth/tagging`). The study says when Save can be pressed and, where it knows, whether its
  ground truth is done, partly done or not started, which the button shows as an icon; whatever it says, Save
  is off until the study's first step is done (owner, 2026-11-07). A task with no total (the Bookshelf Reader's
  missed books) shows its count alone, "1 Missed books", and its check once the study says it is done. A row may say
  no count at all, its bar part still filled as far as the study says (Vascular Measurements' areas, owner, 2026-11-07). One task at a time is
  the open one, its name in bold: the study puts what it needs under its row and beside its name (its item,
  Back and Skip, an area's check), and hears when the user clicks a task's name. The walk through the tasks
  stays each study's own (owner: a change of heart on how one study does its tasks must not move the others;
  what proves common is merged later, as the areas were on 2026-11-19, `req/shell/ground-truth/areas`). The Save crumb (`req/shell/status-bar/breadcrumbs`) presses
  the shell's Save. Test: `web-tests/test_study_contract.py`, `web-tests/test_status_bar_page.py`,
  `studies/nor/tests/test_truth_tasks_page.py`, the vascular study's vessel tasks test.
  </details>

- `req/shell/ground-truth/view` Anyone can load an image's marked extraction and see only its final results.
  <details>

  Set by the owner on 2026-11-05; its calls set by the owner on 2026-11-07; moved into the Annotations box on
  2026-11-21 (`req/shell/annotate/choice`), and onto the extraction list the same day (`req/shell/extractions/list`). Once
  an image from Drive is open, Load annotation from Drive lists its extractions with no sign-in, and the click on one reads
  that file alone and shows its final results on the image, with no algorithm run: none of the tagging tasks' marks (no
  blacked-out areas, no rejected candidates, no work areas). A line follows: whose file or which version, when it was made
  and its counts. Changed by the owner on 2026-11-16, an image shows its annotation or the algorithm's results, never
  both: once an annotation is loaded, Processing is not shown, nor the Items view and its switch, until another image
  opens. Test: `web-tests/test_gt_drive_page.py`, `web-tests/test_annotate_mode_page.py`.
  </details>

- `req/shell/header` A header with the logo, the study switcher and a dark/light switch (remembered).
  <details>

  GitHub's repository switcher, for studies: the study's icon (as in its list, below), its title and a solid caret form one 32 px
  control; it opens, under the caret, a 320 px panel headed "Switch study", a search box (focused,
  filtering by title as the user types) and every study it shows to the user (`req/shell/study/visibility`),
  by title, each with its own icon (the tab's icon its `study.json` names; the generic study icon
  when it names none, or the icon does not load), a rule under its name, then its offline mark (`req/shell/offline/mark`) and
  its stage (`req/shell/study/stage`), 8 px from the row's right edge. No tick marks the one on show: the
  header already names it, and only assistive tech is told which it is. Arrow
  keys move through the list, Enter opens the one marked, Escape closes it. Each entry is a link to
  the study's address (`req/shell/study/folder-and-address`), so a middle click opens it in a new tab. The header's spacing follows
  GitHub's: 64 px tall, 16 px at the sides, a 32 px logo. Test: `web-tests/test_study_runs.py`.
  </details>

- `req/shell/image/cellsens` An Olympus cellSens image, a `.vsi` and its `_<name>_` folder, is one image: one row in the Drive dialog, opened in 2D or 3D like any other.
  <details>

  Set by the owner on 2026-11-16, for the microglia study's IX83 images. cellSens saves an image as a `.vsi` file
  (its details) beside a folder `_<name>_` whose `stack1/frame_t_0.ets` holds the pixels. The Google Drive dialog
  lists the pair as one image row, named after the `.vsi`, and does not list the `_<name>_` folder. Opening it
  downloads the `.vsi`, lists the `_<name>_` folder and its `stack1` folder, and downloads the `.ets`: three requests
  more than a TIFF takes, all to Drive (approved by the owner on 2026-11-16); the two files are kept together as one
  image (`req/shell/drive/kept-images`). The page reads the `.vsi`'s own details, never a guess: the pixel size, the
  z-step, each channel's name and its display colour; and the `.ets`'s slices, every channel of every one, stored
  uncompressed or as JPEG 2000. JPEG 2000 is decoded by OpenJPEG's WebAssembly build, fetched from jsDelivr at a
  pinned version only when such an image is first opened (owner, 2026-11-16, as libheif is for a HEIC). A stack
  opens in 3D, a single plane in 2D, both through `req/shell/image/open`'s contrast and channel rows. A `.vsi`
  whose pixels are stored otherwise (JPEG, PNG, a slide scanner's tiled pyramid) says why it cannot be read.
  Opening one from this computer is not offered yet (owner, 2026-11-16: Google Drive only for now): a `.vsi` opened
  from this computer says it opens only together with its folder. Test:
  `web-tests/test_cellsens.py`.
  </details>

- `req/shell/image/file-info` The image's name unfolds what the file says about the image, and nothing it does not say.
  <details>

  Folded at first: the field in µm and px, the pixel size, the bit depth, the ImageJ series, the
  microscope and date when the file names them (the lab's ImageJ exports never do), and the software that saved
  it (`web-tests/test_file_info.py`). Changed by the owner on 2026-11-13: each format pins the fields worth
  seeing, a HEIC or JPEG photo its field, bit depth, camera (make and model) and when it was taken (with
  its UTC offset), a PNG its field and bit depth, a TIFF the lines above; a study's `view.details` may name,
  per format (`tiff`, `heic`, `jpeg`, `png`), the fields it pins instead, by the labels the details show.
  Every other field the file carries is listed below them in More details, folded at first: a TIFF's tags
  and ImageJ header, a photo's EXIF (GPS included), JFIF and XMP fields, a HEIC's container (its images,
  thumbnails, auxiliary images and colour profile), a PNG's chunks. Binary blobs (a maker note, an embedded
  profile's bytes, a thumbnail, a list of more than 16 values) are left out. The bit depth is the file's
  own, even where the page shows the image in 8 bits. What the file does not carry goes unsaid: set by the owner on 2026-11-10, no
  line says the microscope or acquisition is missing, and with no image open the box names none and shows no
  details line, the empty viewer saying it already (`web-tests/test_image_box_page.py`).
  </details>

- `req/shell/image/frame` A study names a box of the image to bring into view; the shell zooms and glides there, the same way in every study.
  <details>

  Set by the owner on 2026-11-20: framing is the shell's, a study saying only the box, in the image's pixels, and how
  much of the view it should fill (NoR's area 0.6, a Shelves book 0.7). The shell zooms to that fill, at most 800%,
  only when the zoom now is more than half again too far in or too far out; a zoom inside that band is left as it
  is, so a step to the next area or book at much the same size moves the view without touching the zoom. It then
  glides the box's middle to the view's middle, as near as the image's edges let it. Test:
  `web-tests/test_image_point_page.py`.
  </details>

- `req/shell/image/keys` A study declares its keyboard shortcuts as data; the shell wires them and lists those that act now at the image's bottom left.
  <details>

  Set by the owner on 2026-11-16: every study's shortcuts are the shell's, each study saying what it supports and the
  shell wiring the keys, drawing the controls and adapting them. A study's `study.json` lists its `actions`, in the
  order the legend shows them, each with:

  - `id`, and `label`, what it does in a word or two, and optionally `title`, its tooltip;
  - `keys`, each by its place on the keyboard (`KeyF`, `Digit1`, `Space`, `ArrowLeft`), after the modifiers held with
    it (`Ctrl+Backspace`, `Alt+ArrowLeft`), which must be exactly those; and optionally `hint`, how the legend writes
    them when it is not the first key's own name (`−/+`);
  - `kind`: `press`, acting once as the key goes down; `toggle`, the same, keeping something on or off; `hold`, on
    while the key is held and off when it is let go;
  - optionally `control`, the button it mirrors: the key presses it, it acts only while that button is shown and on,
    and the button carries the key, small, at its end; with none, the study's handler for it does what it does;
  - `legend`, `true` for a state of the image's view (a view held or kept on, a layer shown or hidden), listed in the
    keys legend, or `false` for anything else (a verdict, a step, an edit, a task's mode), its key shown only on its
    control; an action saying neither is refused, never wired (owner, 2026-11-16);
  - optionally `when`, the states the study reports that must all hold for it to act (`area`, `!look`), and `on`, the
    state that says a toggle or a hold is on (a toggle's control's own pressed or ticked state when none is named);
  - optionally `inField`, an element inside which a text field with the focus still lets the key act, and
    `ownControl`, that the key on a focused button, link or summary is that control's own.

  The study hands the shell only its handlers, by id, and its states, as they change; it listens to no key of its
  own for these. The shell hears every key once: a key acts only while its action does, never while typing in a field
  (but as `inField` says), with a menu, popover or dialog open, or as an input method composes, and once per press
  however long it is held, a held key let go wherever the focus went; only a key that acted is kept from the page, and its repeats while it is held, so a held Alt+← never takes the browser back.

  At the image's bottom left, over the image in the 2D and 3D views alike, the keys legend lists one row for each
  state of the view whose shortcut acts just now, in the study's order, the viewer's own last (the 3D view's Panning,
  `req/shell/viewer-3d`): what it does in a small label, its key beside it in a faded grey. A row is filled blue while
  its key is held, and a toggle's or a hold's while it is on, as Panning is; clicking a row does what its key does,
  a hold's click keeping it on or off. A row whose shortcut does not act just now is not shown, and with none the
  legend is empty. Set by the owner on 2026-11-17, the shell's own: Undo (Ctrl+Z, ⌘Z) and Redo (Ctrl+Shift+Z, ⌘⇧Z, Ctrl+Y)
  press their buttons in Ground Truth Tasks and so act only while those show and are on; typed in a field they are the
  browser's own text undo, and during a drag they do nothing. Test: `web-tests/test_keys_page.py`, and the vascular
  study's `req/vascular/truth/keys`; the shell's Undo and Redo, `web-tests/test_gt_history_page.py`.
  </details>

- `req/shell/image/menu` Right-clicking the image opens the study's menu for that point; the shell opens, places and closes it.
  <details>

  Set by the owner on 2026-11-20: the menu is the shell's, the study saying only which items it offers at the point
  clicked (NoR's Add a NoR Here, Shelves' Add a book here, Flip upside down and Delete this book), each with what it
  does; a point the study offers nothing at leaves the browser's own menu. The menu opens at the pointer, inside the
  window, its first item focused, and closes when an item is chosen, on Escape, on a press anywhere off it and on the
  user's wheel over the image. A glide of the page's own (`req/shell/image/frame`) leaves it open: the item acts on
  the point that was clicked. While it is open the study's keys do not act (`req/shell/image/keys`). Test:
  `web-tests/test_image_point_page.py`.
  </details>

- `req/shell/image/minimap` A minimap hovers over the image, showing the part in view; drag, zoom and step by mouse.
  <details>

  Set by the owner on 2026-10-31. The minimap (a small picture of the whole image, the part in view
  outlined; never called a thumbnail, which is a file's picture in a list) hovers over the image's top
  left corner, headed "Minimap" and framed by a solid white border that sets it apart from any image;
  a click or a drag on it moves the view there. It shows only while the image is larger than the view:
  with the whole image in view there is nothing to navigate, and it would only cover the image's
  corner. A ^ at one end of its header collapses it to the
  header, and the same spot then shows v, which opens it again, so a second click undoes the first;
  an X at the header's other end hides it. A Minimap button in the toolbar, beside the Grid, shows it
  again or hides it, pressed while it shows; hiding it folds the minimap into that button, flying there
  along an arc, and showing it unfolds it back out of the button (set by the owner on 2026-10-31; no
  motion for a user who asks the system for reduced motion); hovering over the button opens a popup choosing how
  see-through it is at rest, opaque at first and always opaque under the pointer. Whether it shows and its opacity are kept as the user's settings for the
  next visit. Dragging moves the image, wherever it starts, a label or the ruler's length included:
  no drag selects or drags the page's text (set by the owner on 2026-10-31). Only a glyph of a study's
  drawing that the user drags (a book's corner, say) moves alone, the image staying still under it, in
  every study and viewer (set by the owner on 2026-11-07; `studies/shelves/tests/test_shelves_page.py`). Scrolling up and down zooms around the pointer in small steps;
  scrolling sideways steps to the study's previous or next item (for NoR, the candidate). The main
  area's toolbar holds the zoom at its right, and its tools wait for an image; a preview opened in Data
  Management (`req/shell/data/preview-images`) is one (set by the owner on 2026-11-04). Test:
  `web-tests/test_image_box_page.py`.
  </details>

- `req/shell/image/open` The page reads and shows the image itself, the same way in every study; no study's code and no Python stands between a file and its view.
  <details>

  Set by the owner on 2026-11-07. The shell reads a TIFF (ImageJ hyperstacks, OME-TIFFs in one file and plain
  TIFFs; uncompressed, LZW, Deflate or PackBits), a HEIC (set by the owner on 2026-11-10: by libheif's
  WebAssembly build, fetched from jsDelivr at a pinned version only when a HEIC is first opened, in every browser)
  an Olympus cellSens `.vsi` with its pixels (`req/shell/image/cellsens`) and any image the browser decodes (PNG,
  JPEG), and opens it in
  the study's viewer: its channels in the file's own order, each under the name the file gives it and in the
  colour the file displays it in, a z-stack flattened (each pixel the brightest of every slice) and slice by
  slice. Each channel's contrast is set once over the whole stack, never per slice, so signal that fades with
  depth still looks faded: between its 0.5% quantile and its 99.8% one, or the upper quantile the study's
  `view.upper` sets, its black point then lifted where its black-point method measures the background on the
  channel's histogram in that window (set by the owner on 2026-11-08). The method is a preference the viewer takes
  from the first that sets one of the image, the user, the study (`view.blackPoint`) and the file's format; the
  shell has the last two. `triangle`, the format's own for a TIFF of separate channels, puts the black point at the
  histogram's knee where the background's fall meets the signal's tail (Zack's triangle), each channel by its own
  histogram; `quantile`, a photo's (an RGB TIFF, a PNG or a JPEG) and any light background's, leaves it at the 0.5%
  quantile; `background` puts it 2.5 robust standard deviations (1.4826 median absolute deviations) over the
  background's median; `flattened` sets the white point too, leaving the darkest 1% of the flattened image black
  and its brightest 1.3% full colour, the window the owner set by eye on a vascular stack (black 67, white 213 on
  `cd31_frontal_x20_r_1_slices1-12`, owner, 2026-11-08). What a study's `study.json` says of a channel (its name, description, whether it shows, its
  black point, its colour, coloured by depth) is only where that channel's row starts, every one of them the
  user's to change (`req/shell/channels/rows`). A file's display colours do not say which channel is which
  (Vascular's originals show DAPI red, NoR's come in three arrangements), so a study may give a rule, in its page
  part, that puts the file's channels in its own channels' order by what each holds, for these first settings
  alone; a study with none takes the file's order (owner, 2026-11-07). A study whose `view.stretch` is false
  shows an 8-bit image as stored, a photo as the camera took it. A file the shell cannot read says why in the
  status line. Test: `web-tests/test_image_open.py`.
  </details>

- `req/shell/image/opens-fitted` Every image opens whole in the view, never above 100%.
  <details>

  Set by the owner on 2026-11-10, in every study and the 2D viewer. An image larger than the view opens shrunk to
  fit it; one smaller opens at 100%, centred in the view. The next image opens the same way, whatever the last one
  was zoomed to. Test: `web-tests/test_image_fit_page.py`.
  </details>

- `req/shell/image/progressive` An image shows while it downloads.
  <details>

  An uncompressed TIFF like the lab's paints onto the page from its bytes as they arrive from
  Google Drive, in grey from the channels in so far, with the megabytes so far and the elapsed
  time below. Once every byte is in, its colours wipe down over the grey; a file from the computer,
  or one already kept, fades up from black into its colours instead, quickly. No pixel ever shows a
  colour its final one lacks: each is grey, black, or a darker shade of the colour it ends in, and
  the colours it ends in are the brightness the page draws once the image is read (`req/shell/image/open`), so
  that drawing, which replaces it, changes nothing visible. Any other image shows the byte count.
  </details>

- `req/shell/image/proportions` No image is ever drawn out of its proportions.
  <details>

  A crop or picture narrower than its box shrinks as a whole (`studies/nor/tests/test_page_layout.py`).
  </details>

- `req/shell/image/scaling` Zoomed out, the 2D viewer shows the image averaged down, as a photo viewer does; from 100% up, its pixels as sharp squares.
  <details>

  Set by the owner on 2026-11-10, in every study. Below 100% each screen pixel shows the average of the image
  pixels under it, so fine detail, a node or a book's title, neither breaks into scattered dots nor speckles,
  even a phone photo shrunk six times to fit; from 100% up each image pixel is a sharp square. Test:
  `web-tests/test_image_scaling_page.py`.
  </details>

- `req/shell/image/toolbar` The toolbar's left is the study's, how its results show over the image; its right is the viewer's.
  <details>

  Set by the owner on 2026-11-07. At the toolbar's left the study chooses how what it extracted is drawn over the raw
  image (what to show, how wide, how faint); the left bar holds none of those. At its right, beside Zoom, are the
  viewer's own tools (the ruler, the grid, the minimap, the 3D view's Look from). Set by the owner on 2026-11-10, a
  study says, as data in its `study.json` (`view.hide`, naming `ruler` and `grid`), which of the viewer's tools it
  does not show, and the shell reads it there: the Bookshelf Reader's photos have no scale, so it hides both. Test: `studies/vascular/tests/test_model_page.py`, `web-tests/test_viewer3d_page.py`,
  `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shell/image-viewer` The Image Viewer: the page with no study's tools, the one it opens on.
  <details>

  A study with no panels and no actions (`studies/viewer/`): it loads any TIFF or PNG and opens it in the viewer
  its shape asks for (owner, 2026-11-03): a z-stack (a TIFF's Z axis, or the pages of one that names none of its
  axes) in 3D (`req/shell/viewer-3d`), a flat image in 2D. Load being its only step, the Image box stays open once
  the image has loaded (owner, 2026-11-03). It shows each
  channel, up to 8, under the name the file gives it (an OME channel name, an ImageJ label, never
  ImageJ's own made-up "c:1/3 - …") and in the colour the file displays it in (an ImageJ LUT, mixed
  colours included), leaving what the file does not say to `req/shell/channels/rows`; the image box says what the file
  states, its scale only when the file gives one in µm. A side bar it leaves empty gives its room to the image, and it
  has no ground truth, so a local image earns no notice about sending one. A TIFF opens uncompressed or
  compressed with LZW, Deflate or PackBits. Test: `studies/viewer/tests/test_viewer.py`,
  `web-tests/test_study_runs.py`, `web-tests/test_compressed_tiff.py`, `web-tests/test_viewer3d_page.py`.
  </details>

- `req/shell/left-bar/folding` The left bar's boxes stay folded until their step makes them useful, and fold again once it is done.
  <details>

  Set by the owner on 2026-10-30. Every box in the left bar folds under its title, and clicking the
  title opens or closes it. The first is the shell's Image box (the image selector or Load, the image's
  details, its channels, Unload): open until an image opens, then folded; in a study with no steps after Load
  (the Image Viewer) it stays open, nothing else having opened (the owner, 2026-11-05). Processing opens once an image opens and folds
  again after the study's first step (`req/shell/status-bar/breadcrumbs`); Summary and Ground Truth Tasks open after that
  step (`req/shell/left-bar/shells`, set by the owner on 2026-11-07). When a step is done by the user (an image opening, or the
  step's button pressed, never a dial set back to the last run's) its boxes open and the boxes it
  closes fold; opening another image also folds every box waiting for a later step. Between those moments a box
  stays as the user left it; switching study (`req/shell/study/switch-in-place`) starts over.
  Changed by the owner on 2026-10-31. The boxes are drawers stacked in one panel, no gap between
  them, each title on a compact row behind the step's number in a circle, which turns into a green
  check once the drawer's task is done; the open drawers carry an accent bar at their left. A
  drawer's title describes its task while the task waits, open or folded; once it is done, the
  folded title sums up what was done and the open one names the drawer. The Image box, titled Load
  Image while no image is open (and again after Unload), folds once done (in a study with a step after Load) to
  a small preview of the image, its name and, for a TIFF, what it holds ("2D", "3 channels", from the file;
  only "2D" when the file does not say; a PNG or JPEG shows no such tags, set by the owner on 2026-11-10), and opens as "Loaded Image". A study's drawer is done
  when the study gives it a summary, and waits again when the study takes it back. A drawer opening or
  folding slides open or shut, and the drawers below it slide to their new places (set by the owner on
  2026-10-31). Changed by the owner on 2026-11-03: a folded drawer opens from a click anywhere on it,
  not only on its title or number; an open one still folds only from its title.
  Test: `web-tests/test_left_bar_page.py`, `web-tests/test_study_contract.py`.
  </details>

- `req/shell/left-bar/shells` The shell lays out the whole left bar, Load Image, Processing, Ground Truth Tasks and Summary; a study only fills its boxes.
  <details>

  Set by the owner on 2026-11-07: the left bar's layout is the shell's, and a study adds no box to it. Under
  the Image box (and Data Management's) come three boxes of the shell's, each holding what the study puts in it:
  Processing (what runs the algorithm: its choice, its settings, its button, and the tools that correct its
  result), Ground Truth Tasks and Summary (what the result adds up to, and its downloads). Ground Truth Tasks
  shows while the user annotates (`req/shell/annotate/choice`); Summary shows whenever the image open carries any
  model, however far along (an algorithm's run, a draft or an annotation of Drive loaded), annotation mode included,
  beside Ground Truth Tasks (changed by the owner on 2026-11-21, which had Tasks in Summary's place). Processing shows
  once an image is open in a study that annotates only on the route that starts from scratch. A box the study puts nothing in is not shown. How the study's results are drawn over the image
  is chosen in the toolbar (`req/shell/image/toolbar`), never in the left bar. Test:
  `web-tests/test_study_contract.py`, `web-tests/test_left_bar_page.py`.
  </details>

- `req/shell/left-bar/static` The left bar stays open: nothing collapses it, and it has no chevron and no Steps label.
  <details>

  Set by the owner on 2026-11-07, in place of the collapsing bar of 2026-11-03: no chevron at its top, no narrow
  Steps strip, and dragging the gutter stops at the bar's narrowest rather than collapsing it. A collapsed state
  kept on the device from before opens the bar.
  Test: `web-tests/test_left_bar_page.py`.
  </details>

- `req/shell/left-bar/width` The left bar drags wider or narrower (remembered; a double click restores it); there is no right bar.
  <details>

  Folding or unfolding a box never changes the bar's width. Set by the owner on 2026-10-31: the page
  has no right bar; what a study once put there goes over the image (its `over-image` slot) or at
  the toolbar's right end (its `toolbar-end` slot).
  </details>

- `req/shell/load/button` In a study opening from this computer alone, Load opens an image from it and shines until one is open; Unload beside it closes it.
  <details>

  No study the site publishes opens from this computer alone (`req/shell/load/from`); the shell keeps the case for
  its own tests. The left bar's Image box holds the image: its name and what the file says
  (`req/shell/image/file-info`), its channels (`req/shell/channels/rows`), and at its foot Load, which opens the
  computer's own file chooser, filled and glowing until an image is open and a plain button with a blue border
  after. Load sits at the foot, not in the box's title, so the title keeps its place whether the box is folded or
  open. Once an image is open, Unload stands beside Load and clears the page back to before any image:
  no image, no minimap, the steps starting over at Load image, the boxes folded as at first, and the
  study starting over too, its panels as they were before any image; Python, if it has started, lets the image go. Test:
  `web-tests/test_image_box_page.py`.
  </details>

- `req/shell/load/from` Only the Image Viewer opens files from this computer; every study opens images from Google Drive.
  <details>

  Set by the owner on 2026-11-04. A study's `files.from` lists where it opens images from, `local` (this
  computer) and `drive` (Google Drive), and every study lists at least one. The Image Viewer, which makes no
  ground truth, opens from both; NoR Finder and Vascular Measurements, whose images and ground truth live in
  Drive, from Google Drive alone, with no way to a file on the computer. Corrected by the owner on 2026-11-04: the
  Image Viewer is the only study that may use local files, not one limited to them. Where Load reads from is no
  setting of the user's. Test: `web-tests/test_image_line_page.py`.
  </details>

- `req/shell/load/recents-tip` A tip bubble points at the image selector when an image opened from Drive is one of the recent ones.
  <details>

  When an image chosen in the Google Drive dialog opens from this device (`req/shell/drive/kept-images`), a bubble beside
  the image selector (`req/shell/load/selector`), its arrow pointing at it, says "To load recent files click here". Its ×
  closes it for good, and so does opening the selector, which is what it asks for. Each tip has an
  id, and the ids of the tips closed are kept in the browser (listed in Manage storage's settings as
  "Tips you closed"), so a closed tip never shows again, after a reload too. Test:
  `web-tests/test_drive_cache_page.py`.
  </details>

- `req/shell/load/selector` In a study opening from Google Drive, the Image box's top line picks the image: a selector of the images opened lately, newest first, each saying how long ago; Unload once one is open; the computer's button where the study opens local files; and Drive's button.
  <details>

  Set by the owner on 2026-11-04, in place of Load and its dropdown (`req/shell/load/from`). The Image box's first
  line, above the image's details (`req/shell/image/file-info`, titled Details) and its channels, holds a selector
  looking like the header's study switcher: its face names the image open, or, before one, says "Choose an
  image"; it opens on the last 30 images opened in the study on show, newest first, the first (the one opened
  last) selected, so Enter opens it (set by the owner on 2026-10-31: an image opened in another study is
  irrelevant here). Each shows its name and where it is, beside that place's small logo: in Drive, the folders under
  where it was opened from, so two files of one name stay apart; for a file on this computer, "This computer". Each
  carries a small tag of how long since it was last opened: "<1h" within the hour, then whole hours ("3h"), days
  ("6d"), months ("2mo") and years ("1y"); one opened before the page kept that time carries none. An image is one
  entry however often it is opened. Choosing one from Drive opens the copy kept on this device
  (`req/shell/drive/kept-images`), with no download, and downloads it again only when none is kept; offline, one
  not kept is greyed and opens nothing. Choosing a file from this computer opens the file itself, as it is now,
  after the browser asks the user to allow it to be read again: the page keeps the browser's reference to the
  file, never a copy (set by the owner on 2026-11-04); a file moved, deleted or refused says so and opens nothing.
  The browser keeps such a reference only where it lets a page choose files itself (Chrome and Edge); in any
  other the list holds the images from Drive alone. With none opened yet the selector says so. At the line's right,
  where the study opens local files, a button bearing a computer opens the computer's own file chooser; last, a
  button bearing Drive's logo opens the Google Drive dialog (`req/shell/drive/dialog`), offline too
  (`req/shell/drive/offline-listing`). Until an image is open, the selector, or when it lists nothing the
  computer's button, else Drive's, is filled and glowing, as Load is (`req/shell/load/button`). Once an image is
  open a small Unload button stands after the selector, and clears the page as Unload does. The selector's list
  stays inside the left bar, a long name cut short. The references to files on this computer stay with this
  device, listed in Settings among what is kept on this device only (`req/shell/account/settings`), and the
  privacy policy says they are kept. Test: `web-tests/test_image_line_page.py`, `web-tests/test_storage_page.py`.
  </details>

- `req/shell/load/study-images` Load study images lists the study's images grouped by a multi-value tag the study owner chooses, not by folder.
  <details>

  Set by the owner on 2026-11-17. In a study with a study index (`req/shell/data/index`), Load's Google Drive dialog
  (`req/shell/drive/dialog`) becomes Load study images: every image the index holds, less the hidden ones
  (`req/shell/data/hidden`), in groups, one per value of the multi-value tag the study file names for grouping
  (`req/shell/data/tags`), `folder` while it names none: a group per folder, headed by its path, in the order of the
  listed folders and then by path. Each row shows what the dialog shows today; a TIFF's picture comes from its folder's
  previews file (`req/shell/drive/previews`), read once that folder's group scrolls into view. Tentative: a row marks
  no image "new", there being no listing on this device to compare with. Set by the owner on 2026-11-17: the Image
  Viewer, with no root and no index, lists the pasted folder one folder at a time as before, and so does a study before
  a study owner's page has written its index. Set by the owner on 2026-11-18: the index Load last read is kept on this
  device, the latest five studies', and offline the dialog lists from it just as online, an image not kept on this
  device greyed as the offline dialog greys one (`req/shell/offline/default`); a study whose index this device never
  read lists offline as before. The grouping tag is set in Data Management's Study images, which offers `folder` and
  every multi-value tag the study's images carry. Grouped by a tag, a group per value, its head `<tag>: <value>`, in
  the values' order; an image with no value of it sits in a last group, "No <tag>" (Tentative). Each row also shows the
  image's tags, and its description under its name; to a study owner a hidden image shows, marked hidden. Test:
  `web-tests/test_study_index_page.py`.
  </details>

- `req/shell/memory/no-growth` Memory does not grow with use.
  <details>

  Opening image after image, running the study's actions again and moving its controls leaves the
  page, its worker and the Python inside holding no more than the last time it did the same thing
  (`studies/nor/tests/test_memory.py`).
  </details>

- `req/shell/offline/default` Offline by default: a page opened once online opens again with no connection, and runs whatever is already on this device.
  <details>

  Set by the owner on 2026-11-02 (the airplane case), with no step from the user. Every visit keeps
  a copy of the whole site's own files on this device, the one release the build lists in
  `offline.json` with each file's SHA-256, each checked against that list and refetched only when it
  changed. With no network the page then opens at its own address and at every study's, from that
  copy, in each form the site answers online: `/app` and a study's address with a trailing slash lead where
  the site redirects them (set by the owner on 2026-11-10). A study whose Python is already on this device runs; one whose Python is not says so: it
  needs the internet once, or Make Available Offline (`req/shell/offline/per-study`). It says so plainly, not as an error
  and with no traceback, the spinner stopping, the network dropping as the study's own modules load too (set by the owner on 2026-11-03). An image kept on this device (`req/shell/drive/kept-images`,
  `req/shell/offline/per-study`) opens: offline, the Google Drive dialog shows its folders as last listed (`req/shell/drive/offline-listing`),
  or, with none kept, the images kept here.
  The status bar's online icon (`req/shell/status-bar/online`) shows it, the network's tooltip and its
  Network tab saying the page is offline too. No
  network is the browser saying so, or the site not answering, asked every 30 seconds all session long and every
  5 seconds while offline, while the tab is shown: a hidden tab asks nothing, and asks once it is shown again if
  that long has passed (set by the owner on 2026-11-13), so the network going mid-session shows within 30 seconds and coming back within
  seconds, even with a release that landed meanwhile still being copied (set by the owner on 2026-11-04), the browser saying online or not, and a Wi-Fi's
  sign-in page answering in the site's place counts as no network. What the page is doing follows it, set by the
  owner on 2026-11-03: a study whose Python could not load loads it once the network is back, with no reload;
  an open Google Drive dialog greys what cannot open once it goes and reads its folder again once it is back, and
  an image it could not download says the internet cannot be reached; an open Prepare for Offline popup reads the
  study's folder and counts again, and offers Download again after a run the network cut short, what it kept
  staying kept; a signed-in user's settings sync, the version is checked and the site's copy brought up to date.
  What needs the network says so in
  its tooltip and does nothing: Sign in with Google, opening a new GitHub issue, Submit New Study
  Request and Data Management (`req/shell/data/mode`). A change to a setting that follows the user (`req/shell/account/sign-in`) waits and is saved once the network is
  back. A visit the browser cannot reach a copy for, never opened online, shows the browser's own
  offline page: no site opens there. Nothing here installs the site as an app or asks the browser
  for anything. Test: `web-tests/test_offline_page.py`, `web-tests/test_background_tab_page.py` (a hidden tab).
  </details>

- `req/shell/offline/mark` What is available offline says so, quietly: a study, and an image from Google Drive.
  <details>

  Set by the owner on 2026-11-02, so the user knows before doing anything what works with no network
  (`req/shell/offline/default`). A small green mark, the same everywhere, an arrow into a tray for saved on this device,
  follows a study whose Python is all on this device and, for a study with a Google Drive folder of its own, at least
  one of its images too (set by the owner on 2026-11-07), in the header's switcher and its Storage
  section, and an image kept on this device, in the Google Drive dialog's rows; what is not available
  offline carries nothing. The image selector's images carry none: with Auto-save on, they are all kept; offline,
  one not kept is greyed (`req/shell/load/selector`). The owner set on
  2026-11-04 that the mark states a state rather than prompting an action, so it is green, with no
  question-mark pointer; assistive tech is told what it means: the study runs, or the image opens, without the internet.
  The owner set on 2026-11-06 a tiny tooltip on it, "Available for offline", and that in a Drive row it sits before what
  the image holds (2D, 3D), which every image shows (the nor-finder pack's row-indicators-edges). Tests:
  `web-tests/test_storage_page.py`, `web-tests/test_image_line_page.py`.
  </details>

- `req/shell/offline/per-study` Each study can be made available offline from the Storage tab, after a popup with what it takes and how long.
  <details>

  Set by the owner on 2026-11-02, nothing in it happening until the user asks. The Storage tab
  (`req/shell/storage/manage`) opens with an **Offline Settings** block holding **Install as an app** (set by the owner on
  2026-11-07): only on the user's click does the page offer the
  browser's install, an icon that opens the site in its own window, offline too; until then the
  page names no app manifest, so the browser offers none unprompted. Where the browser has no install
  button of its own to call, the tab says where that browser's own menu has it. Each study's section
  that is not available offline (`req/shell/offline/mark`), and each with a Google Drive folder of its own (`files.drive`),
  has **Make Available Offline**, which opens the **Prepare for Offline** popup, a list of what that takes: first its
  Python, a row ticked and greyed, since the study cannot run without it, with the size still missing (Python itself
  counted when it is) or saying it is already on this device; set by the owner on 2026-11-10, the files its page fetches
  beyond Python that its `study.json` names to keep offline (`web.offline`, pinned addresses, such as the Bookshelf
  Reader's text finder) go with it, the row then named **Python and models**; then every image reachable from its Google Drive folder,
  its subfolders included, each with its folder and size, ticked, to untick one by one or all at once. Below the list
  the popup carries no text of its own (set by the owner on 2026-11-07); its button at the right says what the choice
  downloads, **Download 320 MB Now**. A choice larger than how much more the browser lets the site keep is refused,
  saying so. Download asks the browser
  to keep the site's storage until the user deletes it, downloads with its progress shown and can be
  stopped, and ends saying what is now on this device and whether the browser agreed to keep it.
  When Google throttles the downloads (`req/shell/drive/throttle`) it stops and says so. Test: `web-tests/test_offline_page.py`.
  </details>

- `req/shell/page-state` The shell's controls are drawn from one page state, and change only it.
  <details>

  Set by the owner on 2026-10-31. Which image is open (or being read), and the minimap's mode and
  opacity, live in one page state in the shell (`web/page_state.js`). Loading and unloading an image
  change that state, and every control showing a part of it (Load and Unload, the image's name and
  details, the channels, the view, the minimap and its toolbar button) redraws from it; no control
  reaches into another to change it. The steps (`req/shell/status-bar/breadcrumbs`) are a state of the same kind. Test:
  `web-tests/test_image_box_page.py`.
  </details>

- `req/shell/processing/algorithms` A study offering several algorithms lists them atop its Processing box, the first the default, each with its icon, title and precision and recall.
  <details>

  Set by the owner on 2026-11-13: what NoR Finder and Vascular Measurements each drew for themselves is the shell's,
  so every study with more than one algorithm shows it the same way. Changed by the owner on 2026-11-14: the algorithms
  are data the study contributes, and the shell does the deciding. A study's `study.json` names in `algorithms` its
  `list`, a JSON file of `[{key, title, icon, about}]`, the first its default, and its `metrics`, a JSON file of
  `{measured, versions: {key: {precision, recall, note}}}` that its lab writes; no study code builds either for the
  shell, and an entry may carry fields of the study's own. The shell joins the two and draws a list at the top of
  Processing, each entry its icon, title and `(P .xx · R .xx)` where measured, its tooltip saying what they were measured on; under it a fold,
  How the *title* algorithm works, the chosen one's `about` as a Markdown outline, ending in bold with its precision
  and recall and what they were measured on, its `note` beside it. An algorithm with no precision and recall shows
  neither. The study reads the choice (`shell.algorithm`: `ready`, `key`, `title`, `on(fn)`) and runs it; it draws no
  list of its own. Test: `web-tests/test_study_contract.py`, `web-tests/test_algorithm_choice_page.py`.
  </details>

- `req/shell/processing/scoring` Beside the algorithm list, a (?) shows how the study scores its precision and recall.
  <details>

  Set by the owner on 2026-11-18: every study's precision and recall can be explained, so the method is shown, not
  only the numbers. The study's metrics file carries `scoring`, a short Markdown outline of how its scorer counts,
  which the lab writes there from the scorer itself, so the explanation is always the one the numbers were counted
  by. The shell draws a (?) at the right of the list, titled How precision and recall are scored, and a click on it
  opens and closes that outline under the list. A study whose metrics carry no `scoring`, or that names no metrics,
  shows no (?). Set by the owner on 2026-11-23: the outline, "The scoring", is shown when the (?) is clicked, and hidden otherwise. Test: `web-tests/test_algorithm_choice_page.py`.
  </details>

- `req/shell/processing/stamp` From Review on, each score shows its stamp: algorithm version, dataset SHA, freeze date and a link to the GT commit.
  <details>

  Set by the owner on 2026-11-22 (WP8 of `dev/requirements/study-stages-spec.md`). The lab's freeze (`req/lab/freeze`) writes, for each version
  in the study's metrics file, a stamp `{version, dataset_sha256, frozen, commit}`. Under the algorithm list the chosen algorithm's stamp
  is shown as one line, outside the fold: the freeze date, the algorithm version, the first eight hex of the dataset SHA and, once the lab
  has named the commit that holds the frozen ground truth, a link to it on GitHub. Metrics with no stamp (every Develop study) show no line,
  and an algorithm whose score carries none shows none. Test: `web-tests/test_algorithm_choice_page.py`.
  </details>

- `req/shell/python/file-bytes` A study's algorithms run on the image file as it is stored, never on what the viewer shows.
  <details>

  Set by the owner on 2026-11-07. The study's Python opens the file's own bytes, exactly as they came from this
  computer, Google Drive or the device's copy, and every algorithm reads only what it reads from them. Nothing the
  viewer does (its contrast, the channels shown, the black and white points, the 3D view) reaches Python, so the
  same file gives the same result however it is viewed. Narrowed by the owner on 2026-11-20 (#1059): this holds for
  the algorithms, a study's run; a ground-truth tool may work in the page on the pixels the shell decoded from the
  file (the image's planes, before any of the viewer's settings), so that tagging needs no Python. Test:
  `web-tests/test_study_runs.py`, `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shell/python/on-run` Python starts only when the user runs an algorithm.
  <details>

  Set by the owner on 2026-11-07, replacing Python's start at the page's opening: nothing in viewing an image
  needs Python (`req/shell/image/open`). While the page is open, the files Python and the study's packages need
  are kept on this device in the background, when they are not there yet, and nothing runs; the first Run starts
  Python from them, and the status bar names each stage (downloading, with the megabytes so far, only for what
  is not on this device; starting Python; reading and installing the packages; loading the study, in the study's
  own words; then the algorithm's own progress). Later runs reuse the running Python. With no network and the
  files not all here, the status line says the study's Python is not on this device, plainly and not as an error,
  before any Run; once the network is back they are kept, with no reload. Python's importer asks the
  site only for a module the study's folders hold on the release (its offline list), never for a name they
  lack, as scipy's and scikit-image's optional imports are. Test: `web-tests/test_python_files.py`,
  `web-tests/test_study_runs.py`.
  </details>

- `req/shell/python/one-call` Python is reached through one generic call.
  <details>

  The shell's Python runtime runs the study contract the lab runs too (`lab/README.md`; the owner, 2026-11-17: each
  study gives one algorithm entry point that both the page and the lab run). It opens a file with the study's
  `read(path)`; `run` runs one of its `VERSIONS` on it, and any other action one of its `STAGES` on the last run's
  answer, which stays in Python. An answer comes back as JSON, its arrays as bytes. A version that needs a service
  only the page has (reading text) asks for it, the page's study answers through its `serve` hook, and the version
  goes on. A version or stage that takes `damaged` is handed the image's damaged areas with every call
  (`req/shell/data/damaged`), `[[[x, y], ...], ...]` in the image's pixels, `[]` for none. It never names a study's
  action. Test: `web-tests/test_study_runs.py` runs the fixture study, and a
  version asking for a service, through the bridge in Pyodide and the fixture through the real worker in the page;
  the NoR study's memory test checks that repeated calls leave nothing behind.
  </details>

- `req/shell/report/action-log` The page keeps the user's last 200 actions on this device, for a problem report, and sends them nowhere.
  <details>

  Set by the owner on 2026-11-03. Each control the user clicks, ticks, chooses or sets is logged by its name
  as the page shows it, with where it is (the dialog or popup), and never what they type; opening a study, an
  image (where from, its size and slices) and a step done are logged too, and kept apart from them the errors
  the page meets: an error in the status line, and a script error the page did not catch. No image's or
  folder's name is logged: a control that shows one (Load's recents, the Drive list, the image's name, a
  file name Save… lists, the Data Management tree and folder view, the Storage tab, the lists in Settings) is logged by what it is. The log keeps the last
  200 entries in the browser, so a report filed after a reload still has them; Settings lists it among what is
  kept on this device only, with its size, to clear (`req/shell/account/settings`). The privacy policy says it is kept. Test:
  `web-tests/test_problem_report_page.py`.
  </details>

- `req/shell/report/bug` A bug icon in the status bar, always there, opens a new GitHub issue filled in with the browser, the study, its state and the last five actions.
  <details>

  Set by the owner on 2026-11-03: the regular way to report any problem. A small grey bug, the status bar's
  first item from the left of its right-hand items, in every browser (in one not supported, a warning sign:
  `req/shell/browsers/supported`), and **Report a problem…** in the avatar's menu, open a new issue in a new tab on the repo's **Problem report** form
  (`.github/ISSUE_TEMPLATE/bug-report.yml`), its fields filled in: the browser's name, full version where the
  browser gives it, system, whether it is supported, and its user-agent string; the page's state (the site's
  version, the study and its stage, whether Python is ready, the steps and which are done, the image open by
  where it came from, its size, channels and slices, never its name, the view, whether online and signed in,
  the window's size and the memory the browser says the computer has); the last five actions
  (`req/shell/report/action-log`), oldest first, each with its time; and the last three errors. The user writes what happened,
  reads what was filled in and submits it themselves; the page sends nothing. The title starts "Problem: ",
  or "Unsupported browser: " in a browser not supported. Offline both are held, as everything that
  needs the internet (`req/shell/offline/default`). Test: `web-tests/test_problem_report_page.py`.
  </details>

- `req/shell/resources-dialog` Storage, memory, network and CPU are four tabs of one dialog, alike.
  <details>

  Set by the owner on 2026-10-31. The disk, memory, network and CPU in the status bar each open
  the same dialog, titled Resource Usage, on their own tab, and its tabs switch between them. Every tab is laid out the
  same way: a line with the total, then rows of a name, what it is in grey beneath, and a size at
  the right, then a row of the tab's own buttons and Close. Switching tabs leaves the dialog as it is, the same width
  and height, a tab longer than it scrolling within it (set by the owner on 2026-11-07). Test:
  `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/resources-dialog/animations` An Animations checkbox in the resources dialog's CPU tab turns every animation on the page off.
  <details>

  Set by the owner on 2026-10-31. Set by the owner on 2026-11-20, a line under it explains it: "Stop animations if
  the website is slow" (on 2026-11-07 it had been the checkbox alone). Checked at first, it is kept as the user's setting: the next visit
  opens with it as it was left, and signed in it follows the user (`req/shell/account/sign-in`). Unchecked, nothing on the
  page moves to draw the eye: the minimap and the drawers change at once, the photocopier's light
  does not sweep the image, no button shines or glows (one that would looks plain, with no light or
  halo frozen on it), the status
  bar's digits change without rolling and a sharp rise does not flash. A spinner still turns, since
  it is what says the page is working rather than stuck. Test: `web-tests/test_status_bar_page.py`,
  `web-tests/test_account_page.py`.
  </details>

- `req/shell/resources-dialog/unload-python` An "Unload Python after each run" checkbox beside Animations in the resources dialog's CPU tab trades speed for memory.
  <details>

  Set by the owner on 2026-11-20 (#381). A line under it explains it: "Unloading python saves memory between
  algorithm runs, but the following run will take as long as the first run". Unchecked at first, and kept on this device only, since how much memory a
  computer can spare is the computer's: Python, once started by a study's run, stays loaded, and every later run
  starts at once on the image it already holds. Checked, the page shuts Python down as soon as a run ends, with its
  answer or an error, and at once when it is checked with Python idle; the memory it held is freed (about 540 MB after a NoR Find, measured 2026-11-20 in
  Chromium on Linux); the next run starts Python again from the files kept on this device and hands it the image's
  file again, about 9 s more on that measure. Nothing else the page does waits on Python, since only a study's run
  asks it anything (#1059): Shelves' reading of the titles, its tagging and its engines are the page's own and
  carry on after Python is gone. Test: `web-tests/test_study_runs.py`, `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shell/site/app-address` The app is at rauntruth.com/app/; the site's root says what the site is.
  <details>

  Set by the owner on 2026-11-02. The shell's page files are published under `app/`, beside the
  studies' `studies/` folder at the site's top, so the page's `../studies/` resolves to the same
  folder in the app and at `/web/` in a preview of the repo itself. The site's own pages (`site/`)
  are published at its top: the landing page (`req/shell/site/landing`), the legal pages (`req/shell/site/policies`, `req/shell/site/license`), the
  icons and posters (`req/shell/site/icons`), `robots.txt` and `sitemap.xml` (`req/shell/site/crawlers`). An address from before the
  move (`/<id>`, `/web/…`, `/?study=<id>`) is not served, by the owner's choice: nothing redirects
  it. The service worker the app registered at the site's top before the move is retired by a
  `/sw.js` that unregisters itself and deletes nothing it kept. Test:
  `web-tests/test_published_site.py`, `web-tests/test_old_worker_page.py`.
  </details>

- `req/shell/site/caching` Only our code is fetched fresh; third-party code is cached for 30 days.
  <details>

  Third-party code (Pyodide, its packages, vendored wheels) is cached in the browser for 30 days.
  The site's own files are fetched fresh whenever the network answers, so a release shows on the
  next load; a copy is kept only to open the page offline (`req/shell/offline/default`).
  </details>

- `req/shell/site/crawlers` `sitemap.xml` lists the site's own pages, never the app or a study; `robots.txt` keeps crawlers off the app.
  <details>

  Set by the owner on 2026-11-02. The build writes both: the sitemap lists the site's own pages;
  `robots.txt` names the sitemap and disallows `/app/`, the app and every study's address in it,
  leaving the site's pages open to crawlers. Test: `web-tests/test_published_site.py`.
  </details>

- `req/shell/site/icons` The site, the app and each study show their own icon in the tab and their own poster and description in a shared link.
  <details>

  Set by the owner on 2026-11-02. The site's pages carry the site's favicon (`favicon.svg`, and
  `favicon.ico` for whatever asks for it unnamed) and its poster; the app carries a different icon
  and its own poster. Every study a person can open (any but an `unlisted` one, which only the tests
  open) names its own in `study.json`, set by the owner on 2026-11-10: `icon` (an SVG) and `poster`
  (a 1200 × 630 JPEG), files under its `web/`, and `description`, one line of at most 160 characters.
  Its address then carries them, and while it is on show the tab's icon is its own; an unlisted study
  naming none shows the app's. A poster is named by its full address (`og:image`), with the page's
  title and description, for a shared link's preview; posters are JPEG, which every link preview
  shows. Test: `web-tests/test_published_site.py`, `web-tests/test_study_contract.py`,
  `web-tests/test_study_runs.py`.
  </details>

- `req/shell/site/landing` The site's root is a short page saying what the site is and opening the app, which lists the studies.
  <details>

  Set by the owner on 2026-11-02, so a visitor who gets a link learns what this is before landing in
  the tool. `rauntruth.com/` says what the site does and for whom, that images are analysed in the
  browser and never uploaded, and that it is free and open source; it opens the app (`req/shell/site/app-address`),
  lists the supported browsers (`req/shell/browsers/supported`), and links the privacy policy, the terms and the
  license. Changed by the owner on 2026-11-21: it lists no study, since who may see a study is read at run time from
  Drive's sharing (`req/shell/study/members`); the app's switcher (`req/shell/header`) lists them, and the page says so.
  Test: `web-tests/test_published_site.py`.
  </details>

- `req/shell/site/license` The code is MIT-licensed: the repo's `LICENSE`, and rauntruth.com/license.
  <details>

  Set by the owner on 2026-11-02, naming whoever the terms name. The license page carries the MIT
  text the repo's `LICENSE` carries, word for word, and is linked from the landing page, the legal
  pages and the avatar's menu. Test: `web-tests/test_published_site.py`.
  </details>

- `req/shell/site/out-of-date` An open page knows when it is out of date.
  <details>

  Every 5 minutes while the tab is shown it compares its version with the published one, and once a hidden tab is
  shown again when 5 minutes have passed (set by the owner on 2026-11-13); when a newer one is out, the
  version box in the status bar lights up and refreshes the page when clicked. Test: `web-tests/test_background_tab_page.py`.
  </details>

- `req/shell/site/policies` The site publishes its privacy policy and terms of service, linked from its landing page and the avatar's menu.
  <details>

  Set by the owner on 2026-10-31, for Google's sign-in consent screen, which links both and requires
  them on the site's own domain, linked from its home page. rauntruth.com/privacy and /terms say who
  runs the site and how to reach them. The privacy policy says what the page keeps on the device, what
  reaches each outside service (Cloudflare, Google, jsDelivr, GitHub) and when, and, for signing in,
  which Google user data the page reads, where it keeps it and that it shares none, under Google's
  API Services User Data Policy and its Limited Use requirements. The landing page (`req/shell/site/landing`) and the
  avatar's menu link both. Test:
  `web-tests/test_published_site.py`.
  </details>

- `req/shell/site/published-files` The shell decides what is published.
  <details>

  The published site is the shell's page and, from each study, only what its standard layout says
  the page loads: `study.json`, the study's page part under `web/` (never its Python), and the
  modules directly in the folders its Python is imported from (`python.paths`), which is all the
  page's importer can reach; the build runs none of a study's code (owner, 2026-11-14: a study contributes data).
  A study's docs, data, tests and lab notes stay in the repo, and nothing
  in a study says how, where or whether it is published. The build (`dev/tools/build/build.py`)
  assembles the set under `dev/build/site/`, the tree the release uploads. Test:
  `web-tests/test_published_site.py`.
  </details>

- `req/shell/site/visit-counting` Visits are counted without cookies.
  <details>

  The released site loads Cloudflare Web Analytics, which sets no cookies and stores nothing on the
  device. Its token is a repository variable the release writes into the uploaded copy, so a local
  preview or a fork counts nothing. Test: `web-tests/test_published_site.py`.
  </details>

- `req/shell/status-bar` The status bar: the study's steps at the left, the disk, memory, network, CPU and version at the right.
  <details>

  From the left edge: the breadcrumbs of its steps (`req/shell/status-bar/breadcrumbs`), then
  the spinner and what the page is doing now (each stage of Python's loading, the study's progress,
  an error in red) and the thumbnails' progress (`req/shell/drive/dialog`). From the right edge inward: the site's
  version (stamped by each release; `req/shell/version-history`, `req/shell/site/out-of-date`), the CPU (`req/shell/status-bar/cpu`), the network (`req/shell/status-bar/network`), the
  memory (`req/shell/status-bar/memory`) and the disk (`req/shell/status-bar/disk`); between the version and those four, the report icon (`req/shell/report/bug`), a bug, or a warning sign in a browser the page does not support,
  and then the online icon (`req/shell/status-bar/online`). The four are folded into one icon unless set
  always open (`req/shell/status-bar/resources`), and unfolding them moves neither their icon, the online icon, the report icon nor the version. With too
  little room, what the page is doing now and the four give way, cut short, while the steps at the left and the
  icons and version at the right stay whole (owner, 2026-11-07). Each of the four before the version is a small grey icon
  and its number, with no word naming it; all five are plain, with no box, alike. A mild vertical
  bar separates each item from the next, the resources icon included, folded or not, but the four, which sit
  together with none between them. Nothing in the status bar turns the pointer into a
  question mark. The image's name and the study's counts are in the
  breadcrumbs' popups: Load image names the image, the study's own step gives its counts. Test:
  `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/status-bar/breadcrumbs` Breadcrumbs show the steps done so far, and the step to do now shines.
  <details>

  A study's steps are Load image, the study's own in order (its `study.json` `phases`; for NoR
  Run algorithm and Review all items), then Save while the study makes ground truth for the user: a
  user annotating in a Setup, Develop or Analyze study (`req/shell/annotate/choice`). The status bar shows
  the steps done, then the first one not done, which shines blue, and with it the button that does
  that step (the `button` the step names; Load for Load image, the ground-truth button for Save); later steps do not show yet, and once every step is done none shines. Load image is done
  once an image is open, Save once the extraction is saved or waits to be (for a local image, once its file is
  exported); the study says when its own steps are done (NoR: Run algorithm while the image was
  searched with the finder and settings now chosen, Review all items while the Save
  button (`req/nor/downloads`) says the ground truth is complete: some vote cast, every added NoR and every
  finalist decided; corrected by the owner on 2026-10-31, so the filters rejecting every finalist
  never moves the step on while the button still says what is missing). Opening another image, or switching study (`req/shell/study/switch-in-place`), starts over. Hovering a crumb says what was done in that step
  and when. Clicking the crumb that shines brings its button into view, unfolding the box it is in
  (`req/shell/left-bar/folding`) and scrolling to it, and presses it: a way there, a lesson in where it is, and a
  shortcut. The steps live in one state in the shell, and the crumbs and the shining buttons are
  drawn from it alone. Test: `web-tests/test_status_bar_page.py`,
  `studies/nor/tests/test_ground_truth_page.py`.
  </details>

- `req/shell/status-bar/cpu` The CPU, a processor icon and "12%", is how busy this tab's threads are now.
  <details>

  Set by the owner on 2026-10-31. The page's own thread and Python's, each as a share of one core
  over the last two seconds, their sum in the status bar, as a browser's task manager counts it.
  An estimate, which its tab says: Python's share is the time it spent working; the page's is its
  long tasks, which only Chrome and Edge report (elsewhere it shows as unknown); the browser's own
  work, its drawing included, is not counted. Test: `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/status-bar/disk` The disk, a drive icon and "1.4 GB", opens the Storage tab.
  <details>

  What the site keeps on this device, the total the Storage tab reports (`req/shell/storage/manage`), kept current as the
  page saves or the user deletes. Clicking it opens the Storage tab (`req/shell/resources-dialog`). Test:
  `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/status-bar/memory` The memory, a memory-chip icon and "253 MB", opens what holds it.
  <details>

  The memory the tab holds: Python's, its files, the page's (Chrome and Edge say it) and an estimate
  for the compiled code and the browser, which a page cannot read; amber past a quarter of the
  computer's total where the browser says it. Clicking it opens the Memory tab (`req/shell/resources-dialog`) listing each
  of those, and within the page's share the image and the study's results, and the computer's
  total. The memory is hidden until Python has reported a figure: an unknown value is hidden, never shown as 0 MB (set by the owner on 2026-11-23). It carries no button to have Python collect its garbage (a Run GC button removed by the owner on
  2026-11-07), and no essay on how Python's memory grows. Test:
  `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/status-bar/network` The network, a download icon and "1.2 MB/s", is how fast this tab is downloading now.
  <details>

  Set by the owner on 2026-10-31; a speed rather than a total since 2026-10-31, so a burst shows
  as one. The speed is what was downloaded over the last two seconds, as the CPU's share is
  (`req/shell/status-bar/cpu`). Its tab gives the speed and what this tab has downloaded since it opened, and splits
  that total into the page's own files, Python with its
  packages and the study's Python, and Google Drive. What comes from this browser's caches counts
  nothing; Google's small pictures of images in the Drive dialog are not counted, since Google does
  not let a page read their size. Test: `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/status-bar/online` The online icon says whether the page is online, and opens where offline is set up.
  <details>

  Set by the owner on 2026-11-03, in the place of a red mark on the network's and the resources' icons. Between the
  resources and the report icon, a grey Wi-Fi icon while online; offline, a crossed-out cloud (set by the owner on
  2026-11-05), in red, the one red in the status bar. Its tooltip says which, and that clicking it sets up working
  offline: it opens the Storage tab of the resources dialog (`req/shell/resources-dialog`), where the page installs as
  an app and each study is made available offline (`req/shell/offline/per-study`). Online and offline are what
  `req/shell/offline/default` says. Tests: `web-tests/test_status_bar_page.py`, `web-tests/test_offline_page.py`.
  </details>

- `req/shell/status-bar/resources` The disk, memory, network and CPU fold into one icon, unfolding on hover and while something needs watching.
  <details>

  Set by the owner on 2026-11-03. The four sit in one block with a gauge icon at its right, next to the
  online icon (`req/shell/status-bar/online`). An Autohide checkbox in the resources dialog, above its tabs on every tab, chooses how the block shows:
  checked, the default, it auto-hides; unchecked, it is always open, as the status bar was before (set by the owner on
  2026-11-07, in the place of a choice that also offered Hidden always; a kept Hidden always reads as auto-hiding). Auto-hiding,
  the page opens with the four folded away and the icon alone showing; hovering the block unfolds the
  four as they look always open, opening beside the icon, which stays where it is (changed by the owner on
  2026-11-07), and leaving folds them again, both ways
  animated (at once with animations off, `req/shell/resources-dialog/animations`, or reduced motion asked for). It unfolds by
  itself, and stays unfolded, while the CPU has been over 50% of one core for more than
  5 seconds, the network has been downloading over 250 KB/s for more than 5
  seconds, or the tab holds over 1 GB, and folds 8 seconds after the last of these ends. Going offline does not unfold it
  (set by the owner on 2026-11-04): the online icon (`req/shell/status-bar/online`) says so. Always open, the four show beside the icon. Clicking the icon opens the
  resources dialog (`req/shell/resources-dialog`) on the tab last shown, Storage at first. The choice is kept as the user's setting and,
  signed in, follows the user (`req/shell/account/sign-in`). Test: `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/status-bar/rolling` The status bar's numbers roll to each new value, and a sharp rise in the CPU or network flashes.
  <details>

  Set by the owner on 2026-10-31. Whenever the disk, memory, network or CPU changes, each
  character that changed rolls up to its new one, like a clock's digits. When the CPU or the
  network speed at least doubles in one update and rises by a sharp step (30 points of a core;
  1 MB/s), its icon and number turn the warning colour for three seconds, then fade back. With
  reduced motion asked for, the digits change without rolling. Test:
  `web-tests/test_status_bar_page.py`.
  </details>

- `req/shell/storage/keys-keep-names` What a user saved stays theirs: a stored key never changes its name.
  <details>

  A browser key an existing study saves under keeps its name across the split and every later
  change to the shell, so a person's settings, decisions and measurements survive a release.
  The thumbnails' keys are the exception: they left for cache storage (owner, 2026-11-17), their pictures carried over.
  </details>

- `req/shell/storage/manage` The user sees, and can clear, what this device keeps, study by study.
  <details>

  Not signed in (`req/shell/account/sign-in`), the user is whoever opened the page on this device. An avatar at the right of
  the header opens a menu whose **Manage storage** opens the Storage tab of the resources dialog
  (`req/shell/resources-dialog`), which lists everything the site keeps on this device but settings, each with its size, in
  sections folded when the dialog opens. Set by the owner on 2026-11-02, the sections follow what it
  takes to work offline (`req/shell/offline/default`, `req/shell/offline/per-study`): one per study, whose title says whether the study is
  available offline (`req/shell/offline/mark`), holding its Python packages no other study uses, by package; its own
  pages and code, part of the site's copy; the images kept from Google Drive in it, by name; one
  record for all their thumbnails and its Drive folders' previews (set by the owner on 2026-11-17, a thumbnail is kept as a JPEG in the browser's cache storage beside the folders' previews, the latest 100, never in the settings' storage; one kept there before moves over the first time the page opens, and one the cache would not take stays where it was for the next opening, while what was kept there and is no picture is dropped); and, for the study on show, the
  selections per image, by image name, a ground-truth draft among them, in any study's section (`req/shell/ground-truth/save-draft`, set by the owner on 2026-11-17). An image, a thumbnail or a preview kept before images were
  told apart by study, and opened in none of them since, is listed with the study on show. The study sections sit under a
  **Studies** heading; then, under a **Shared** heading, the **Shared** section (set by the owner on 2026-11-07): the site itself, Python itself, the packages two studies or more use,
  and, as one record, code no study uses now. Each entry can be deleted, but a study's pages, kept
  whole with the site; each section's **Clear cache** (set by the owner on 2026-11-07, in the place of a Delete all) deletes all it can, and a study's is the study's
  whole purge, leaving what other studies use. Settings are not listed here: they are kept, shown
  and cleared in Settings (`req/shell/account/settings`); the total says what they take, and counts too what is stored
  under the site that neither the shell nor the study names. The shell names its own keys; the study names its keys through its `stored` hook, so the
  shell still names no study (`req/shell/study/knows-none`). Test: `web-tests/test_storage_page.py`.
  </details>

- `req/shell/study/folder-and-address` A study is a folder, and the app runs the one its address names: rauntruth.com/app/<id>.
  <details>

  A study is `studies/<id>/` with a `study.json` that names everything the shell needs, and every
  file it names exists. The app runs the study its path names (`rauntruth.com/app/nor`), the Image
  Viewer (`req/shell/image-viewer`) at its bare address (`rauntruth.com/app/`); `?study=<id>` there opens the same
  study and is rewritten to its path. The build publishes the page once more under the id of each study
  the switcher can offer (`req/shell/study/visibility`), so the path opens it fresh too, and refuses an id the app already serves at its
  top. Adding a study changes nothing in `web/`, in the deploy's settings or in CI. Test:
  `web-tests/test_study_contract.py`, `web-tests/test_published_site.py`, `web-tests/test_study_runs.py`.
  </details>

- `req/shell/study/knows-none` The shell knows no study.
  <details>

  Nothing in `web/` names a study, its channels, its algorithms or its flow. Everything
  study-specific reaches the page through the study's `study.json`, its Python entry module and its
  `mount(shell)`. Test: `web-tests/test_study_contract.py` reads `web/` for the NoR study's own words,
  and the shell's page tests run on the fixture study, which shares none of them.
  </details>

- `req/shell/study/members` Signed in, the switcher lists the studies whose root the user can read; signed out, the released ones.
  <details>

  Set by the owner on 2026-11-21. A study's root is members-only on Drive (a Drive file or folder can carry sharing its
  parent does not, so the folders visitors and the lab need are each shared by link on top); whoever can read the root is
  a member, and membership, not the stage, decides who sees a study. Signed in, the page asks Drive which of the listed
  studies' roots the account can read, all of them in one batch request per load, and the switcher lists those and the
  released ones (stage `Public`, in `study.json`); a study with no root is listed to all.
  Signed out, it lists the released ones and asks Drive nothing. While the token has run out or Drive does not answer, the
  list Drive last gave this user stays, with the line "as Drive last said" under it, until they sign out. The root's
  readers are Drive's: the repo lists no one. Test: `web-tests/test_study_members_page.py`.
  </details>

- `req/shell/study/one-file` A study keeps one study file in its Drive root, holding its folders, images index, tags, hide and grouping rules, marks and stage.
  <details>

  Set by the owner on 2026-11-21. `rauntruth-study.json` (format `rauntruth-study/2`) holds what the settings, index and
  tags files held (`req/shell/ground-truth/setup`, `req/shell/data/folders`, `req/shell/data/index`,
  `req/shell/data/tags`, `req/shell/data/hidden`), and the marks and the stage as they arrive; the separate index and
  tags files go. A root still holding the three files of before is read as it was and written back as one file the next
  time a study owner's page saves, the two old files trashed only where `writer.ours` says the page made them. A study
  file is read once per root a minute; each write reads it afresh and merges into what it finds, as two managers may edit
  at once. A study file the page did not make is left alone. The file is also readable by link on top of the root's
  sharing, its id kept only in the cloud environment (`RAUNTRUTH_STUDY_<STUDY>`). Test: `web-tests/test_study_root.py`,
  `web-tests/test_study_index_page.py`.
  </details>

- `req/shell/study/request-form` The switcher ends with Submit New Study Request, a GitHub issue form for proposing a study.
  <details>

  Below the studies, apart from the search, "Submit New Study Request" opens, in a new tab, a new
  issue on the repo from its `new-study` form, labelled `new-study-request`: the research proposal
  (a link, or a document attached in the box), a public Google Drive link to sample images, one to
  ground truth if any, the literature, and the submitter's name and email, which the form warns
  are public. Test: `web-tests/test_study_runs.py` (the link opens the form the repo carries),
  `web-tests/test_study_request.py` (the form asks for each of these).
  </details>

- `req/shell/study/review-link` A study in Review opens at its address for anyone, signed out, but is not listed.
  <details>

  Set by the owner on 2026-11-21. The owner shares the root by link when the study enters Review, so reviewers need no
  Google account: the study opens at its address, whose root the site's key can then read, and the switcher does not
  list it to anyone signed out: its stage in the study file is Review (`req/shell/study/stage`). Test:
  `web-tests/test_study_members_page.py`.
  </details>

- `req/shell/study/stage` A study's stage, Setup, Develop, Analyze, Review or Public, is kept in its study file and set by the owner in Study Setup; it opens and closes actions as the table in the map says.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-map.md`, `dev/requirements/study-stages-spec.md`, WP6), in place of PreGT, GT,
  PostGT and Published. The stage is a key of the study file (`req/shell/study/one-file`), read, signed in or not (a visitor who never signs in reads the link-shared study file by the site's key, once on load, the one read the page makes of Google signed out; the switcher lists the study on show by the stage so read, Public listed and Review not, and `study.json`'s stage stands in until the read answers or if it fails), when the study comes in, when the user signs in
  or out and when the user saves; `study.json`'s `stage` is the one the study has until its file names one of the five (every study but the Image
  Viewer starts in Develop), and `null` for a study outside the model, the Image Viewer, which has no stage and so no annotating, marking, batch run
  or data to close. The one table of what each stage opens is `web/stages.js`, read through `stageAllows(action)` by the shell, Study Setup and
  Data Management: Study Setup's data (open in Setup, Develop and Analyze, closed in Review and Public), viewing and running the algorithm
  (every stage; who may is Drive's sharing), running on one's own images (every stage), Start Annotating (open in Setup, for trial, Develop and
  Analyze, closed in Review and Public), marking an extraction GT or official (Develop and Analyze), a batch run (every stage; in Review and Public
  it counts once marked) and the numbers shown (none in Setup). `web-tests/stage_table.json` transcribes those rows of the map's table, and a
  test holds it to the map and to `stages.js`. The header's switcher (`req/shell/header`) shows each study's stage at the end of its row as a small
  label, in 10 px type, the stage's name bordered in its colour: red for Setup, yellow for Develop, green for Analyze, blue for Review, green and
  filled for Public. A study listed to everyone while signed out is one whose study file says Public for the study on show, which the page reads by the site's key (set by the owner on 2026-11-22), and for every other study one whose `study.json` says Public; the page reads no other study's file for that. The test
  for the signed-out read: `web-tests/test_study_members_page.py` (a file at Review shows as Review, annotating closed and not listed; at Public, listed), `web-tests/test_account_page.py` (the one read). Where Study Setup promotes or moves the study back the page takes the new stage at once. Public drops the steps that serve making ground truth
  (the study's postprocessing is not shown). The popup is `shell/study/stage-popup`. Test: `web-tests/test_study_contract.py`,
  `web-tests/test_status_bar_page.py`, `web-tests/test_stage_table.py`, `web-tests/test_stage_table_page.py`.
  </details>

- `req/shell/study/stage-popup` Hovering a study's stage label lists the five stages, what each means and what moves a study on; for the study on show it also gives the gate's conditions as the page measures them and one line for each action open to this user.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP6). The popup opens beside the switcher while a label is hovered,
  listing the five stages in order with what each means, the hovered study's highlighted and the ones before it crossed out, and what the study needs
  to move on. For the study on show, below them: the gate's conditions the page can measure, from the study file's index and marks (in Develop, "n of
  m images have a GT mark"; in Analyze, how many have an official mark; in Setup, how many images the index lists), and one line for each action
  open to this user in this stage: viewing and running the algorithm, running on their own images, for someone the store lets save "Annotate: 12
  images still need it" (the images in the study's index, hidden ones left out for those who may not manage it, that carry no GT mark), and for
  someone who may write the root the Study Setup actions the stage opens. Someone who may not save has no Annotate line, nor has anyone in a stage that
  closes annotating. Tentative: the gate's wording for each stage, which the page can measure only in part (the owner's judgement is the real gate).
  Test: `web-tests/test_stage_popup_page.py`.
  </details>

- `req/shell/study/switch-in-place` Switching study happens in place: no reload, and the new study starts as a fresh load of its address shows it.
  <details>

  Choosing a study in the switcher, or going back and forward between studies, changes the address
  and swaps the study without reloading the page: Python stays loaded and adds only the packages the
  new study needs. The image on show is unloaded, as Unload does, and nothing of it carries over (its
  steps, its results, Python's copy of it), so the new study starts as one just opened. The study that leaves
  takes its panels, its stylesheet, its drawing and its listeners with it (each listener it adds
  outside its own panels carries `shell.signal`), and an answer its Python was still working on is
  dropped. Set by the owner on 2026-11-07, in place of a reload: the page then is what loading the new
  study's address afresh shows, element by element (each one's attributes, text, form values, scroll and open
  popups) and in the shell's own state, nothing of the study before left anywhere: not the zoom, the 3D view's
  parts, a folder Data Management had open, an edit, the remote files dialog's listing, or a ground-truth line.
  What the browser keeps carries over as a reload would keep it (who is signed in, the theme, the
  user's choices, the images kept here), and so do the tab's own measures in the status bar. Test:
  `web-tests/test_study_runs.py`; and `web-tests/test_shell_states_page.py`, where the first path of each study and
  root of the shell's states ends by going to another study and back, each compared with a fresh load of its address
  (set by the owner on 2026-11-20, in place of every path: the other paths' last states add little the first does not).
  </details>

- `req/shell/study/viewer-choice` The viewer is the study's choice.
  <details>

  The image a study works on is shown by a viewer the study names (`viewer` in `study.json`),
  behind one interface: show the opened image, draw the study's layers over it, report a pick and a
  lasso in image coordinates, zoom and pan. The 3D viewer (`req/shell/viewer-3d`) keeps that interface and shows
  a stack in 3D in the 2D view's place, with no change to the studies that keep the 2D viewer.
  </details>

- `req/shell/study/visibility` A study's address opened by someone who may not see it says so, naming the account signed in.
  <details>

  Set by the owner on 2026-11-04; rewritten on 2026-11-21. Every `study.json` names its `visibility`: `"listed"` (the
  header's switcher may offer it, to those `req/shell/study/members` says) or `"unlisted"` (offered nowhere, opened only
  by its address; the fixture). A study's address opened by someone who may not see it, signed in with an account
  Drive does not let read its root, says that account cannot open it, naming the account, and offers Sign out; signed
  out, it says the study is "not open right now". Either way the study's own code is not fetched, and the Image Viewer
  opens instead. Where Drive cannot be asked (offline, the token run out with nothing learned), the study opens.
  Test: `web-tests/test_study_members_page.py`, `web-tests/test_study_contract.py`.
  </details>

- `req/shell/summary/download` Download Summary, at the Summary box's foot, saves the study's summary as one standard CSV.
  <details>

  Set by the owner on 2026-11-16: the study works out the numbers worth reporting, the shell exports them, the same
  way for every study. A study hands the shell its summary as data, `shell.summary.set({over, rows})`, and takes it
  back with `set(null)`; while it has one the box ends with Download Summary. The file, `<image name>_summary.csv`, is
  one table with a row per measurement: `image`, `study`, `counted_over` (what the study says it counted over, such as
  a mask), `measurement`, `unit`, `value` for a single number, and `n`, `mean`, `sd`, `median`, `min`, `max` for a
  distribution, a column left empty where the row has none. A summary goes with the study that set it, and with the
  image: opening another image or study takes the button away until the study sets one again. Test:
  `web-tests/study_page_driver.mjs` (the fixture study), `studies/vascular/tests/model_page_driver.mjs`.
  </details>

- `req/shell/summary/mask` Add mask, at the Summary box's top, lassoes the area the study's summary counts; the shell draws and keeps it, the study decides what lies inside.
  <details>

  Set by the owner on 2026-11-16, in place of NoR's and Vascular's own masks: one mask for every study, offered only
  by a study whose `study.json` says it can count inside one (`"summary": {"mask": true}`; every study filling the
  Summary box says true or false). Add mask switches to the image, shows all of it (a stack seen from straight above,
  held still, the area running through every slice) and lets the user lasso an area by dragging; Esc cancels, and a
  lasso a few pixels across is no area. Lassoing again adds an area by exclusive or, so one inside another cuts a hole.
  The borders show as a pulsing dashed line over the image, or over the stack following the view as it turns, and the
  inside is tinted a very transparent white only when areas overlap or nest. Clear mask, shown while a mask is on,
  removes it. The mask is kept in the image's pixels on this device, per study and file name, under the study's
  `<id>-mask-v1:<file>` key (NoR's mask from before keeps its key), and the Storage tab lists it with the image's
  selections. It shows only while the summary does: while the study makes ground truth it is neither drawn nor
  offered, and comes back with the summary. The study reads `shell.mask`: `polygons()`, `inside(x, y)`, `damaged()` and `on(fn)`
  for each change; `inside` is false in a damaged area (`req/shell/data/damaged`). Set by the owner on 2026-11-17: an
  image with an area of interest starts with it as its mask (`req/shell/data/area-of-interest`), and a mask the
  viewer draws is theirs, kept as above. Test: `web-tests/test_study_contract.py`, `studies/nor/tests/test_ground_truth_page.py`,
  `studies/vascular/tests/test_model_page.py`, `studies/shelves/tests`.
  </details>

- `req/shell/tools/grid` A Grid button beside the Ruler draws a grid over the image, its colour and spacing the user's.
  <details>

  The button, a red 3×3 grid, draws the grid or takes it away. Clicking it, or hovering over it,
  opens a popup choosing the grid's colour and the distance between its lines: in µm when the file
  gives the pixel's size, the cells then square in µm whatever the pixel's width and height, and in
  pixels when it does not. The colour and both distances, µm and pixels each its own, are kept as
  the user's settings for the next visit, and Settings lists them, kept on this device only (`req/shell/account/settings`). The grid stays on from one
  image to the next, and keeps its place through zoom. Test: `web-tests/test_grid_page.py`.
  </details>

- `req/shell/tools/ruler` A Ruler beside Zoom measures a distance on the image, in µm when the file gives a scale.
  <details>

  The Ruler button arms it: dragging from a point shows a circle of the reach around it, and on
  release the ruler alone stays on the image between the two points with their distance beside it.
  The distance is in µm when the file gives the pixel's size, its width and height each counted on
  its own axis, which may differ; in pixels when it does not. A click with no drag measures nothing.
  Once the ruler is down the image pans again; pressing the button again takes the ruler away, as
  does opening another image. The ruler keeps its place and size through zoom and the study's own
  drawing. On a stack in 3D (`req/shell/viewer-3d`) the Ruler works the same, on the plane of the top slice
  shown, where its first point lands: while dragging, a transparent white orb shows the reach around that point in
  depth too, and on release the ruler alone stays between the two points with their distance, through the view's turns,
  zoom and pans (owner, 2026-11-15). Test: `web-tests/test_ruler_page.py`, `web-tests/test_viewer3d_page.py`.
  </details>

- `req/shell/version-history` Clicking the version opens a Version history; a bubble points at it after an update.
  <details>

  Clicking the version in the status bar (it has no tooltip) opens a Version history popup: each
  release, newest first, with its date and what changed for the user. Each pull request that
  changes what users see tells it in a `Version-history:` line of one of its commit messages, at
  most 20 words, or says `Version-history: none`; a pull request changing `web/` or a study's
  `web/` without one fails the Tests workflow, and no pull request edits a shared file for it. The
  site build files each line under the release that first carried its pull request, read from
  main's history, beside the releases told before in
  [`web/version_history.md`](../../web/version_history.md). The browser remembers the version last seen; when the page has been
  updated since and the history names a change in between, a bubble points at the version saying
  "Click here to see what was updated since v…", until the user opens the history or closes the
  bubble with its ×. The history then marks the releases that are new
  (`web-tests/test_version_history.py`, `web-tests/test_version_history_page.py`).
  </details>

- `req/shell/viewer-3d` A study whose viewer is `image3d` shows a z-stack in 3D, turning it by mouse; its channel rows drive it.
  <details>

  Set by the owner on 2026-10-31, moving the 3D MicroViewer into the shell. The page reads a stack as its
  flattened planes, which the 2D view shows unchanged, and every slice of every channel
  (`req/shell/image/open`). A stack is shown in 3D only, with no switch to a flat view
  (owner, 2026-11-03: a 2D image makes no sense in 3D, nor a 3D one in 2D); only where the browser lacks
  WebGL2 does the flattened stack show instead. The 3D view casts rays through the stack in the browser (WebGL2), looking straight down
  as the microscope does. Dragging turns it about the screen's two axes, on past looking straight
  across, a sideways scroll spins it about the line of sight (owner, 2026-11-03), the wheel zooms,
  shift-drag pans, and a reset button puts the view back to the top. A Panning label at the bottom left of the 3D view always shows, filled
  blue while panning is on and outlined grey while off, its tooltip saying to press Shift to pan (owner,
  2026-11-07), a faded grey "shift" right beside it (owner, 2026-11-08); clicking it turns panning on or off, so that a plain drag
  pans instead of turning. Holding shift turns it on until shift is let go, which returns it to the state
  the label holds. That state lives only while the page is open: it is never stored or restored (owner,
  2026-11-05). Panning is the bottom row of the image's keys legend (`req/shell/image/keys`, owner, 2026-11-16). The toolbar's right holds, beside Zoom, one icon button, its tooltip "Reset view to top", that puts
  the view back to looking straight down; no menu of other views (owner, 2026-11-08), and the 2D view's Zoom, which zooms the 3D view (owner,
  2026-11-04) and its Ruler, measuring on the top slice shown (`req/shell/tools/ruler`, owner, 2026-11-15); the 2D view's other tools step aside. Brightest shows the brightest point along each
  ray, Surface a lit surface where the signal crosses a level, and colour by depth paints by the
  depth of that point so crossings at different depths read apart: the study's `view` sets the render
  it opens with. The depth is a row of the image box under the
  channels' rows, as a channel's row holds its points (owner, 2026-11-04): its first and last slice
  shown on one slider, and in the colour picker's place the spacing between slices, a box that reads with
  its unit ("1 µm") and steps up and down by its arrows and the arrow keys (owner, 2026-11-07). No count of the
  slices shown sits beside its name, and each row's picker sits at the box's right edge, its slider filling the room
  before it; a palette picker is framed as the colour picker is (owner, 2026-11-07). Colour by depth is each
  channel's own (owner, 2026-11-07): a small icon tick on each channel's own row beside its colour picker, no words
  and no palette bar beside it (owner, 2026-11-07), and while it is ticked the
  row's colour picker becomes a palette picker, since the channel is then drawn in a range of colours by the depth
  of each point, not in one colour by its brightness alone. Two channels coloured by depth each take a different
  palette, so they read apart; a study's `channels` may tick it from the start (`depth`: true, or a palette's name).
  A study drawing over the stack reads the depth colours of the first shown channel coloured by depth. The slice
  spacing comes from the file, else from the study (`view.spacing`, saying who stated it), else
  1 µm, called a guess, which the spacing's tooltip says; no text over the 3D view says it (owner, 2026-11-07). Every shown channel is drawn in its colour between the black and white
  points of its row, which redraw the 3D view as they move. The study's `view` sets the render and the
  spacing it opens with. A study draws over the 3D view, over the stack or beside it
  in the same camera, picks and drags there, and can keep only the stack inside or outside a mask of
  its own. The stack's own picture is drawn again only when what it is made from has changed (the camera, the
  slices and channels shown, a mask): the ruler and a study's marks are drawn over it as it stands (owner,
  2026-11-20). Test: `web-tests/test_viewer3d_page.py`, and the vascular study's `req/vascular/model/correct`.
  </details>

- `req/shell/views/second` A study's item view shows what was found, behind the shell's Items switch; there is none while ground truth is made.
  <details>

  Set by the owner on 2026-11-02. A study with an item view (`#items-view` in its `views` slot) gets
  the shell's switch at the toolbar's left. The cards are small viewers of what was found; the switch reads
  "Items" with how many there are, and "Image" in the item view. The study counts them (`views.count(total)`,
  null until it has any; Vascular: its junctions and vessels) and hears which view is shown (`views.on(fn)`).
  Set by the owner on 2026-11-07: the shell turns the switch on once the study has counted its items and off
  while it has not; a study never turns it on or off itself. While the study makes ground truth for the user
  (annotating in a Setup, Develop or Analyze study, `req/shell/annotate/choice`) there is no item view and no switch:
  the tasks are listed in the left bar (`req/shell/ground-truth/tasks`), the image in the main area. Changed by the
  owner on 2026-11-19: NoR's item view, shelved since 2026-11-04, is removed (missingbulb/RaunTruth#740), and with it
  the shell's `data-shelved` mark.
  Test: `web-tests/test_status_bar_page.py`, `web-tests/test_study_contract.py`.
  </details>

- `req/shell/waiting/slow-computers` Kind to slow computers: a slow button is held until its action is done; low memory is warned of.
  <details>

  A button whose action can take a while (Load, the study's slow actions — for NoR Find
  Candidates, the view switch, the item tabs, the CSV downloads, the ground truth export, restoring
  the filter defaults) is disabled the moment it is pressed, with a small spinner after its label,
  and comes back only when its action is done, including the worker's answer. A failed request
  frees its button. Browsers do not say how much memory is free, so when the browser reports 4 GB
  or less in all (Chrome and Edge report it), a popup on opening asks the user to close other tabs
  and apps, with tips (tab groups, the shortcut that reopens closed tabs, Memory Saver) and "Don't
  show this again". The page running out of memory shows it whatever was chosen, saying so. An
  image chosen while the study's own code is still coming in opens once the study is in, as loaded,
  the study's first step the one to do (`studies/nor/tests/test_slow_machine_page.py`).
  </details>

- `req/shell/waiting/visible` Visible waiting: a spinner and the elapsed time, and a sweeping light while the study works.
  <details>

  While an image is read, the page shows a spinner and the elapsed time; while a study's
  action runs (for NoR, a finder), a photocopier's light sweeps back and forth over the image, with
  what it is doing and the elapsed time below. Set by the owner on 2026-11-10, the light is the shell's: a
  study says only that it works and what it is doing, and over an image the shell sweeps it, in every study
  alike. Test: `web-tests/test_status_bar_page.py`, `studies/shelves/tests/test_shelves_page.py`.
  </details>

## `req/setup` Study Setup, the study owner's page

- `req/setup/batch` The owner runs a chosen algorithm over chosen images on Study Setup; each gets an extraction at that version, images already done are skipped, and a token running out holds the batch until the next click.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP5), batch runs being a write to the store the owner approved. With a
  folder chosen, Study Setup's Batch run box lists the study's algorithms; each image of the folder has a checkbox, and Choose
  all ticks or unticks them. Run presses the study's first step on each chosen image in turn, as the main app's user does, so
  the study's own run is the one that runs, and writes the document that makes (the model and the log that made it, with
  the version of the site and of the study's code, and no person's name) to the image's subfolder of the extractions folder
  as `run_<algorithm>__<code version>.json`. An image whose subfolder already holds that file is skipped, so a stopped
  batch goes on from where it was; a batch that has run, or skipped, an image has reached it. The study's code version is
  the first eight characters of its hash, or `unknown` where Python did not tell it. A token that has run out stops the
  batch before the next image runs, says so, and the next click on Run renews it and goes on; any other failure stops it
  naming the image. While a batch runs the tree, the cells and the choices wait. Mark this batch official marks
  each image the batch reached official, in one write. In Review and Public a batch is exploratory and counts only once marked
  (`req/setup/marks`). Tentative: the parameters of a run are the study's own at the time (a threshold in its panel);
  they are kept in the file but do not tell one batch from another, which the algorithm and the code version do. Test:
  `web-tests/test_setup_page.py` with `web-tests/setup_batch_driver.mjs`.
  </details>

- `req/setup/data` Study Setup holds everything Data Management did: folders, Drive access, extractions set-up, previews, tags and descriptions, hide rules, the grouping tag, areas of interest, damaged areas, Needs GT.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP5). Unchanged in behaviour, moved to
  `/setup`: the data requirements of `req/shell` (those tagged `data/...`) are those of Study Setup's Data Management column and its
  boxes, and each now reads as they do there. Set up extractions makes the one extractions folder
  (`req/shell/ground-truth/setup`). Study Setup shows images in the shell's plain view: the study's own drawers,
  item view and steps do not show on it. Test: `web-tests/test_data_mode_page.py`, `web-tests/test_study_index_page.py`.
  </details>

- `req/setup/marks` The owner marks an extraction GT or official on Study Setup; a mark names the extraction's file, and so follows that file's latest content; an image has one GT mark and one official mark.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP5). Choosing an image on Study Setup lists its extractions,
  each labelled by the algorithm version that made it or "by hand", with the time it was last saved, and each with GT and Official
  buttons, pressed where it holds that mark; pressing one marks, pressing a pressed one takes the mark off. The study file
  keeps `marks: {<image's SHA-256>: {gt: {file, by}, official: {file, by}}}`: the file's Drive id, and its author's email
  (null for a batch's). A later save by the author replaces the file's content, so the mark follows it: the main app shows
  the new model as GT at once and the dataset SHA changes. Marking another extraction GT replaces the first; GT and official
  are separate marks and may name one file or two. Each write reads the study file afresh and merges. A folder's cells say
  Ground truth and Official for the images that have them. Tentative: the list names no one, only a marked
  extraction's author, since an extraction's author is read from its file on marking. Test: `web-tests/test_setup_page.py` with
  `web-tests/setup_marks_driver.mjs`.
  </details>

- `req/setup/page` Study Setup is the site page `app/setup`, opened from the avatar's menu by those Drive lets write the study's root, online only.
  <details>

  Set by the owner on 2026-11-22. The avatar's menu of the study's own page holds Study Setup…, for someone Drive
  lets write the study's root; it opens `/app/setup?study=<id>`, renewing a token run out in its click as Drive's
  reads do. The study's own page holds none of Data Management's elements (no `#data-*`, folder view, Tags or
  Selected Folder box). On Study Setup the same menu item reads Leave Study Setup… and goes back to the study. The
  page is the shell's, loaded with `setup.js`, which attaches Data Management; its study is the one `?study=`
  names, its switcher lists the studies' setups. Someone Drive does not let write the root is told so in place of the
  folders; opened offline, it says it needs the internet and makes no Drive call, and shows the folders once the
  network is back. The page and what only it loads are left out of the list kept for working offline; no study may
  be named `setup`. Test: `web-tests/test_setup_page.py`, `web-tests/test_published_site.py`.
  </details>

- `req/setup/people` Study Setup lists each member and which of the three shares they hold, with a link to each item's Drive sharing dialog.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP5; reading a study's sharing is
  approved). The three shares: reading the root (sees), writing the extractions folder (annotates), writing the root
  (manages); a person who holds none is not listed. Anyone with the link is said once, beside the people. The
  links are the Drive sharing forms, `https://drive.google.com/drive/folders/<id>?usp=sharing`, for the root and the
  extractions folder. Test: `web-tests/test_setup_sharing_page.py`, `web-tests/test_setup_sharing_rules.py`.
  </details>

- `req/setup/promote` Study Setup promotes the study to the next stage and moves it back; before Review it lists the images whose extractions are newer than their GT, and promoting to Review freezes marking and data.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP6). Study Setup's Stage box shows the study's stage and what it
  means, a button to promote to the next stage and one to move back to the one before; only the owner (whoever may write the root) reaches it, and
  nothing is measured to suggest either. Each writes the stage into the study file, keeping its other keys, and the page takes it at once: what the
  stage closes shows (`req/shell/study/stage`) and the sharing is checked again for it (`req/setup/sharing-check`). Before Review a button in the box, Find images with newer extractions, lists each
  image whose GT mark names an extraction that another, unmarked, extraction of the image is newer than, for the owner to look at and mark first;
  the listing (one extractions listing per GT-marked image) runs on that press and never on opening Study Setup, on a mark or on a stage change
  (set by the owner on 2026-11-22).
  Promoting to Review runs it once more first and asks, in a dialog that says marking and data close, what people save afterwards is kept but not counted, and lists
  those images; Freeze writes Review and Cancel writes nothing. From Review on the GT and official buttons are gone from an image's
  extractions and every control that changes the study's data is gone (folders, set-up of extractions, previews, tags, descriptions, areas, hide rules, the
  grouping tag, Needs GT, and the study index is no longer written), while the stage, the sharing and the batch run stay. Moving back reopens them. The main app's Save of a
  session begun before the freeze still writes the person's extraction, and says it was saved "after the freeze, not counted". Test:
  `web-tests/test_setup_page.py` with `web-tests/setup_stage_driver.mjs`.
  </details>

- `req/setup/results` Study Setup's Results box lists one row per image with an official mark, with totals and a CSV, reading nothing until Show results is pressed.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP8; reading each image's official extraction on that press alone is
  approved). Nothing is read on opening Study Setup, on a mark or on a stage change. Pressing Show results reads the study file's marks and
  then each official mark's extraction, and lists one row per image with an official mark, by image name: the image, the algorithm and the
  first eight of its code version where a batch run made the extraction, "by hand" where a person's did, and the study's measures, the
  columns its `study.json` names under `results.measures` (`{title, path}` for a number in the extraction's document, `{title, count}` for
  the lengths of the lists at those paths added), the totals last (the images and each measure summed). An image with no official mark has no
  row. Download CSV saves the same rows and totals from the page as a file, asking the network for nothing. Tentative: the measures
  declared for NoR (candidates kept and NoRs added), vascular (branch segments) and shelves (books) count what each extraction's document
  holds and are not the studies' final numbers; the box shows in every stage. Test: `web-tests/test_setup_page.py` with
  `web-tests/setup_results_driver.mjs`.
  </details>

- `req/setup/sharing-check` Study Setup checks the study's Drive sharing against what its stage needs and lists each correction, with what to change, where and pictures; Fix changes one item's sharing only when the owner presses it and confirms.
  <details>

  Set by the owner on 2026-11-22 (`dev/requirements/study-stages-spec.md`, WP5; changing one item's sharing, only on that
  correction's Fix press, is approved, 2026-11-21). It checks again on opening, on each promotion or move back, and on a Check
  again button. What a stage needs: before Review (Setup, Develop, Analyze) the root is shared with named people only,
  never by link; from Review on it is shared by link; in every stage `Data`, `Previews`, the extractions folder and the
  study file are readable by link; while people annotate (Setup, Develop, Analyze) at least one person may write the
  extractions folder. A study whose file names none of the five stages is in the one its `study.json` names (`req/shell/study/stage`).
  Each correction names the item, what to change, a link to that item's sharing dialog and a picture of Drive's own
  dialog; one the site can make has a **Fix** button, which asks to confirm what will change, makes that one change
  and checks again; Cancel writes nothing. Nothing else changes sharing: not opening the page, not a promotion, not
  Check again. Where Drive refuses the change (403), that correction drops its Fix, keeps its link and picture, and
  says to change it there. Tentative: a correction for an item whose sharing this account may not read has no Fix,
  only the link; the owner of the extractions folder counts as someone who may write it; a person with an
  `anyone`-with-the-link edit permission on it counts too. Test: `web-tests/test_setup_sharing_page.py` (the fake
  Drive's permissions seeded per case, each rule, Fix, Cancel, Drive refusing), `web-tests/test_setup_sharing_rules.py`
  (the rules per stage).
  </details>

## `req/checks` The repo's checks

- `req/checks/ci-sets` Every PR runs every test on Chromium before it can merge, the tests of the repo's own Claudinite checks among them, and a test that would skip there fails instead.
  <details>

  Set by the owner on 2026-11-20, in place of the fast set each PR ran and the full set only main did. Each PR runs
  the whole set on Chromium (`.github/workflows/tests.yml`), split across three runners side by side, each running a
  third of the tests (set by the owner on 2026-11-21; `dev/tools/test-image/shard.py`, test
  `dev/tools/test-image/test_shard.py`), and every push to main runs it again, so it has run on
  anything a release can ship: a green run on main wakes the site release (`.github/workflows/tests-full.yml`). The
  nightly run also runs it on Firefox and WebKit (`req/checks/other-engines`). The `full` mark still names the tests that
  drive Node, Pyodide or a browser, or measure speed or memory, so `-m "not full"` stays a quick local loop
  (`web-tests/test_ci_split.py`). The repo's Claudinite checks run on every PR and every push to main, in a job of
  their own (set by the owner on 2026-11-16), so a PR breaking one is red before it merges.
  </details>

- `req/checks/ci-sets/one-image` Every CI test run runs in its engine's test image, which already holds everything the tests use, with no way off the machine.
  <details>

  Set by the owner on 2026-11-20. Each engine's image (`dev/tools/test-image/`) holds the Python packages, Node, the
  page's libraries and Pyodide's packages, the studies' vendored wheels, Tesseract and the files the tests would
  otherwise fetch once, and that engine's browser alone, so a Chromium run pulls half what an image of all three
  weighed. The site's code is never in them: each run mounts the checkout. They are tagged by a hash of what they take in
  and the engine: the files they are built by, the Python packages, the
  libraries the page pins and what each study names for its Python and its services, never the page's code or a
  study's other settings (set by the owner on 2026-11-21). One is built only when that changes
  (`.github/workflows/test-image.yml`), its layers in the order each changes, least often first, from the layers of the
  engine's image built last wherever they still match; each night on main the images no run needs any more, older
  than 14 days and neither main's nor a cache tag, are deleted (set by the owner on 2026-11-21;
  `dev/tools/test-image/prune.py`, test `dev/tools/test-image/test_prune.py`); each run pulls it and runs the tests in it on a network with no way off
  the machine (`dev/tools/test-image/run.sh`), so a test that downloads anything fails rather than slowing every run. Test: `dev/tools/test-image/test_inputs.py`.
  </details>

- `req/checks/clean-console` A page test fails on any warning or error its case did not declare, and the outside systems the page reaches are faked once, in every test.
  <details>

  Set by the owner on 2026-11-19. Every page test's browser comes from `web-tests/harness.mjs`, which fails the run as
  it exits on a warning or error the page or the browser wrote that no case declared with `expecting()`, by a loose
  pattern; a case declaring one that never came fails too. Each context it opens reaches the network through a server
  of its own on the test's machine, which answers the systems the page reaches with the fakes in `web-tests/fakes/` and
  turns away every other request leaving the machine; the run fails when a test's own route answers what a fake does.
  Test: `web-tests/test_harness.py`.
  </details>

- `req/checks/other-engines` Every night the full set also runs on Firefox and WebKit; their failures fail the night only once the page supports their browser.
  <details>

  Set by the owner on 2026-11-03. The nightly full run (the workflow's own schedule) runs the full
  set again on Playwright's Firefox and on its WebKit, standing for Safari; a push to main does not, and
  neither gates a release. An engine whose browser `web/browsers.json` does not list (`req/shell/browsers/supported`) reports
  its failures as a warning on the run and the night stays green; once its browser is listed, a failure
  fails the night as any other test does. A test that needs what only Playwright's Chromium offers is marked
  `chromium_only` and left out of those runs: the page's memory, read through Chromium's DevTools, and working
  offline, whose stand-in Google Drive answers the service worker's requests, which Playwright routes in Chromium only; and a check of that kind inside another test (the listeners a
  study leaves, the page's own thread's load) is made in Chromium only. Each page test's driver launches the engine `PW_ENGINE` names, so the
  same run can be made by hand: `python3 dev/tools/build/other_engines.py firefox`. Test:
  `web-tests/test_other_engines.py`.
  </details>

- `req/checks/shell-states` A tree of the shell's elements says what each shows in every state its paths reach; the matrix is generated from it, and a browser walks the paths to check it.
  <details>

  Set by the owner on 2026-11-04: a harness for developing the page and its requirements and for keeping what works
  working, which the owner does not review; its tentative and undecided cases are questions for the owner.
  `dev/requirements/shell-states.json` lists the shell's elements as a tree, each
  under the one holding it; each study with a `studies/<id>/states.json` grafts its own elements in there, under the
  shell's elements holding them, may say where a shell element differs there (its rule), and may add roots and paths
  of its own (`req/checks/spec-layout`), with the sample image or z-stack its paths load and what stands in for what
  its page reaches off the site. The shell's paths
  open the study the file names, the fixture; a study's own paths open it, on the shell's tree with its own elements
  alone grafted in. Each element gives only what differs from its parent: cases over the state (the
  study's stage, who is signed in, whether the store lets them save, whether they are annotating and by which route, whether this device holds a draft, whether Study Setup is open, the image open and whether it is a z-stack, the study's step done, the view, what Data Management
  has selected, whether the page is online, whether the image fits the view, whether it is larger than the view,
  whether a notice shows, and what the study says of itself in its
  `study.json` and panels: whether it opens images from the computer, has steps after Load, and has an item view,
  `req/shell/views/second`), each citing the requirement that decides it and marked tentative or undecided where the owner has
  not decided (an undecided case is shown and not checked). Its paths start from a few roots (a study's stage, who is signed in and whether they may save) and take actions one after another, each state one more action on the one before: loading an image, one
  larger than the view, a z-stack or a file from the study's Drive folder, Unload, the study's first step, the view switched, how to annotate chosen
  (from scratch, from the work kept here, from an annotation of Drive, the study opening afresh in annotation mode), a draft saved, Study Setup opened and left (the page opening afresh), another study and Back, the notice's OK, zooming in until
  the image no longer fits, Study Setup's folder, preview and Load Original, and
  the network lost and back.
  `dev/tools/build/shell_states.py` writes from it the matrix, `dev/requirements/shell-states.GENERATED.md`, one table
  per path, and the browser test's expectations. It fails on what the walk would leave unchecked: a case no state
  reaches; a case decided only where a parent hides or folds the element, which the browser reads as gone whatever
  the case says, unless the element or the case is marked unwalked with why no path shows it (what an unwalked
  element holds goes with it); an element every state shows the same, unless marked steady with why; such a mark a
  state contradicts; an action no path takes; and a value of a var no state has. Without a browser the
  generated files must be up to date, every element in each study's tree must be on the shell's page or that
  study's panels (one the page makes as it runs, such as the 3D view's controls, by the nearest element holding it
  that the page does not make), every element of the shell's page and of each study's panels, but what a dialog,
  popup, menu or disclosure holds, must be in the shell's tree or that study's, and the tree must call an element a
  box or a control where the page does. In the full set one page per path takes the actions on its study, the study's stage set for it,
  against a stand-in Google and a stand-in Python answering what the study's own Python answers on loading and on
  opening the image, or the z-stack a path loads, and the study's own Python answering its calls once it takes its
  first step, signed in as an account the study is shown to, and at every state, the study's calls answered, reads each element as shown,
  disabled, held offline, folded or gone. After its last state, back online first, the first path of each study and
  root goes to another study and back (`req/shell/study/switch-in-place`), and the page in each must be what a fresh load of that address
  shows in the same browser: the whole page read element by element and the shell's own state, leaving out what
  changes between two readings of the same page (the status bar's measures of the tab, the browser's mark on what is
  scrolled out of view, an attribute left empty, the order of a class list); every difference is listed before it fails. Test: `web-tests/test_shell_states.py`,
  `web-tests/test_shell_states_page.py`.
  </details>

- `req/checks/shell-states/renders` Every state the browser walks is pictured, arrows pointing at what changed there.
  <details>

  Set by the owner on 2026-11-04. With `SHELL_STATES_RENDERS` set, the browser test keeps a picture of each state
  and an `index.html` of them, path by path. Arrows point at the elements that changed since the state before,
  only the outermost of those that changed together, and on a path's first state at what shows folded or disabled;
  a dashed arrow points where an element was before it went, and a red one at an element that is not what the
  rules say. The arrows say where to look, not what to expect. The pictures are made on demand and kept nowhere. Test: `web-tests/test_shell_states_page.py`.
  </details>

- `req/checks/spec-layout` The shell's requirements are in one spec, and each study's in its own folder.
  <details>

  Set by the owner on 2026-11-05. `dev/requirements/` holds what the shell does whichever study it runs:
  `requirements.md` has only `req/shell` and `req/checks`, and `shell-states.json` only the shell's own elements.
  Everything one study's page must do is under that study's folder: `studies/<id>/requirements.md` holds its
  requirements, one section tagged `req/<id>`, and a study whose elements the shell's states walk (the fixture
  study) gives them in `studies/<id>/states.json`, grafted into the shell's tree under the element it names.
  Removing a study's folder removes its requirements with it. Test: `web-tests/test_requirement_tags.py`,
  `web-tests/test_shell_states.py`.
  </details>
