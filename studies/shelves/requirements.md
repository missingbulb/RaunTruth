# The Bookshelf Reader page's requirements

What a person using the Bookshelf Reader page sees and can do beyond the shell, which
[the shell's requirements](../../dev/requirements/requirements.md) state with the conventions this spec
follows too: tags, their order, **Tentative** and **Undecided**.

## `req/shelves` The Bookshelf Reader page: the books on a photo of shelves, boxed and read

Set by the owner on 2026-11-04: a study of image processing, not biology, an outlier on the site. It
takes a photo of bookshelves, boxes every book on it and reads the text on each, and writes what it
read for a title matcher; matching the titles is not part of it.

- `req/shelves/books/damaged` Find books analyses no pixel of a damaged area; a box may still reach into one.
  <details>

  Set by the owner on 2026-11-19. Before a version finds or reads anything, the pixels of the Study Manager's damaged
  areas (`req/shell/data/damaged`) are filled from the pixels around them, so neither the finders, the text finder
  nor the readers see what was there. A box may still be drawn over a damaged area, as one may run off the photo's
  edge. The scorer leaves out the ground truth's books and the answer's books whose box centre lies in a damaged
  area. Test: `studies/shelves/tests/test_shelves_damaged.py`.
  </details>

- `req/shelves/books/find` Find books boxes every book on the photo and reads its title, in one go: four corners, spine or cover, standing or lying.
  <details>

  Find books runs the study's finder over the photo and draws each book it finds as four corners
  joined; until it has run, its box says nothing of books not found (set by the owner on 2026-11-10), two strokes (dark under light) that show over any colour a book carries, a cover's dashed.
  A book is a spine (its narrow face, standing upright or lying flat in a pile) or a cover (facing
  the camera); one shelf can hold all three. Its corners go clockwise from the one nearest the
  photo's top left. Set by the owner on 2026-11-04, a book leaning on its neighbours is boxed
  leaning with it: its box's long sides follow the spine's own edges, at the angle they run.
  Set by the owner on 2026-11-07, each box is that book's spine by itself, whatever the shelf, the camera angle or
  the books beside it: its top and foot are the book's own, at the angle they run, not a line the shelf's books
  share, with the books packed against each other and the photo taken from the front or from a side. A box is kept only once it checks out as a readable spine: its long sides lie on edges along the book's
  length, its ends on edges across it, it is convex and spine-shaped, and its inside carries a book's texture rather
  than a wall's, a board's or a gap's; a book that fails is left for the ground truth to draw in, never boxed
  wrong. Set by the owner on 2026-11-07, two books of one series standing together, one colour and parted by no
  visible edge, are two boxes: their spines repeat one design, the same marks at the same heights, and a box that
  holds a mark and its repeat further across is two books. Set by the owner on 2026-11-07, books lying cover-up (on a
  ledge, a bench, a table) are boxed as covers, view `cover`, their four corners on the cover's own edges as the camera
  sees them, at a slant or not; a cover is kept only once its four sides lie on edges with the cover on one side and
  something else on the other, so the long lines of a bench's planks or a ledge's rim box nothing.
  Set by the owner on 2026-11-10, the text lines on the photo place the books: Find books first runs PaddleOCR's text
  finder over the photo (finding where text is, reading none of it), and an edge between books never runs through a
  line of text, a strip holding two titles side by side holds two books, and a box a text line runs along is a book's
  face, however plain. The text finder's files are fetched at pinned versions from jsDelivr on Find books' first run,
  and kept offline with the study's Python; when they cannot be reached, Find books finds without them and says so.
  The same day the owner dropped the rule that one camera's perspective must turn every book's ends alike: on the
  photos it removed real books. Set by the owner on 2026-11-10, no box lies over another: of two boxes overlapping,
  one is certainly wrong, and two stacked one over the other that overlap each other alone, by a large share, are one
  book's two halves, boxed as one. A line across the shelf that the edges between books run on across is lettering
  or a light's edge over the books, not a shelf's board, and cuts no book. Set by the owner on 2026-11-10, while
  the study is in its GT stage Find books favours finding every book over boxing nothing wrong: a wrong box costs the
  tagger one click to drop, a missed book a box drawn by hand. Versions are compared by F2, recall weighted twice
  precision (Claude's default for the weighting and the stage; not yet confirmed by the owner). Set by the owner on
  2026-11-18 (#1011), the algorithm is both the boxing and the reading of the titles: Find books is one run of the
  study's algorithm (`algorithm/`, its one entry point the page and the lab both run), which boxes the books and
  reads each one's title (`req/shelves/read/readers`), and its answer holds both; the page answers the engines the run
  asks for with its own (`web/reading.js`), and the lab with the same models run natively (`lab/services.py`). Set by the owner on
  2026-11-10, Find books finds the same books in a photo the camera took turned, in one taken with one side of the
  shelf nearer than the other, and in one where shade cuts across the books. Test: `studies/shelves/tests/test_books.py`,
  `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shelves/books/open` Load takes any single 2D photo: JPEG, PNG, WebP, BMP, a one-page TIFF or HEIC.
  <details>

  The photo is shown in its own colours, turned as the camera said it was held (its EXIF
  orientation); a grey or 16-bit image is shown grey. Set by the owner on 2026-11-10, a phone's HEIC photo is
  listed and opened too: the shell decodes it for the view (`req/shell/image/open`), and the study's Python reads
  the file itself, through Pillow's HEIF plugin, never what the view decoded (`req/shell/python/file-bytes`). Test:
  `studies/shelves/tests/test_books.py`, `web-tests/test_image_open.py`.
  </details>

- `req/shelves/books/versions` Find books runs the finder chosen: text-guided (R9), the default, precise (R8) or edge-only (R5).
  <details>

  Set by the owner on 2026-11-13: the finder's versions are offered side by side, as NoR's and Vascular's are, in
  the shell's list (`req/shell/processing/algorithms`), today's first under a name of its own and beside it an
  earlier one that behaves differently enough to be worth choosing. Text-guided is R9, the finder as it stands
  (`algorithm/books.py`), recall first. Set by the owner on 2026-11-15, once R9 had replaced it, precise is R8 as it was
  (`algorithm/r8_precise.py`), precision first. Edge-only is R5 as it was (`algorithm/r5_edges.py`), which finds the
  books from the photo's edges alone, so its run asks for no text finder over the photo. Each reads the titles of the
  books it boxed with the same reader. The list is the study's data (`web/algorithms.json`, its order the page's), and
  so are their numbers: each one's precision and recall over every ground truth, measured once per version by the
  lab (`python3 lab/run.py shelves --write`, into `web/algorithm_metrics.json`), and how far they can be trusted.
  Set by the owner on 2026-11-18, the score of record is the lab's native run (Tesseract 5.3, ONNX Runtime), not the
  page's (tesseract.js), whose readings differ slightly; and the score holds both results: each book is half its box
  and half its title, a spare box costs only the share of it that adds no new cover of a book, and text read on a
  book the ground truth gives no title costs nothing (`algorithm/score.py`, its outline the (?) beside the list).
  Every version is measured again under it; no number from the earlier box-only score is carried. Set by the owner
  on 2026-11-19 (#899), the title half is a field half: each field's text is compared with the same field's in the
  truth, by letter pairs and weighted by its letters, and text read in another field than the truth's keeps 0.9 of
  its credit (`SLIP`), so a publisher read as the title costs little. A publisher, volume or library mark the truth
  lacks costs nothing; Title and Author, which the task always shows, say the spine has none when left empty. A
  ground-truth file from before the fields reads its text as the title, its one box having held the whole spine, so
  text read in any field counts against it. Every version is measured again under
  this score. Test:
  `studies/shelves/tests/test_versions.py`, `studies/shelves/tests/test_score.py`,
  `studies/shelves/tests/test_shelves_page.py`, `studies/shelves/tests/test_find_bridge.py`.
  </details>

- `req/shelves/matcher/export` Download for the matcher writes each book's text, view, corners and how sure the reading is.
  <details>

  Outside ground truth the Summary box lists each book's text in the order found, shelf by shelf
  from the top; Download for the matcher saves `<image>_books.json`: the image, its size, and per
  book an id, its view, its text (empty when nothing was read; every field joined), its fields
  (`req/shelves/read/fields`), the reader's confidence (0 to 1,
  null when it was not read) and the reader's name, and its corners. With a summary mask on, the list and the file hold
  only the books inside it, each keeping its number (`req/shelves/summary`). Test:
  `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shelves/read/fields` The algorithm reads a spine into fields: title, author and publisher, and a volume and a library mark where it carries them.
  <details>

  Set by the owner on 2026-11-19 (#899): a spine carries several blocks of text in different fonts, sizes and
  colours, sometimes parted by separators and sometimes turned 90° to the rest. The algorithm returns each book's
  text as fields rather than as one string: at most one block each for `title`, `author` and `publisher`, and the
  optional `volume` (as printed: "C", "IV", "ג", "Vol 1", "4") and `library` (a call-number sticker, at the spine's
  head or foot, in Dewey or the Hebrew libraries' notation). A field it does not find is absent, never empty. The
  reader parts the lines it read into blocks at a separator (`/`, `|`, a dot `•`, `·` or a lone `o`), at a wide gap
  along the spine, and where the letters' height changes sharply; two lines side by side across the spine are one
  block. It labels each block: a library mark by its pattern (three digits with a decimal, a short author code or
  both) at the spine's head or foot; a volume by `Vol`, `כרך`, `חלק` with one, or a bare roman numeral, number or
  letter where a separator sets it apart or it stands alone at the head or foot; a publisher by name or as a block
  of letters at the spine's foot; of the rest, the block before a slash, or one bearing an initial, is the author,
  and the larger words the title over a smaller name; with no such cue the text stays in the title. Since
  a library's shelf stickers every book, once one spine on the photo carries a clear mark, a looser one at the
  head or foot of the others is taken too. Each block keeps where it was read on the straightened book (its
  `regions`), which the ground-truth task outlines. The answer keeps `title` as every field's text joined, for
  the matcher. The routes and what they cost: `docs/fields/EXTRACTION.md`. Test: `studies/shelves/tests/test_reading.py`.
  </details>

- `req/shelves/read/readers` Find books reads each book's title in the same run; Read titles reads every book again with the reader chosen, in Hebrew and English.
  <details>

  Set by the owner on 2026-11-04, three readers are offered, kept side by side until the ground
  truth chooses: Tesseract on the whole book (Hebrew and English), PaddleOCR's text finder marking
  each line of text and Tesseract reading each line, and PP-OCR finding and reading the lines itself
  (English only: it has no Hebrew, and on Hebrew it reads Latin letters with high confidence). Each
  book is straightened to an upright rectangle first and read at each turn its shape allows, the
  most confident kept. The page loads pinned builds of the engines from jsDelivr (the text finder already on Find books) and the two
  languages from the site. The reader last chosen is kept in the browser. Set by the owner on 2026-11-18 (#1011), the
  reading of the titles is part of the algorithm: Find books reads every book it boxed in the same run, with the
  algorithm's reader (lines: PaddleOCR's text finder, then Tesseract on each line; `algorithm/reading.py`), whatever
  reader is chosen. The reader choice, Read titles and the re-reading of a book while it is tagged are the page's own
  tools for making ground truth (`web/reading.js`), like the boxes' handles: not the algorithm, and free to use other
  engines. Set by the owner on 2026-11-10, a dictionary sets each reading's Hebrew words right: a word of three
  letters or more that is not in it, nor is once a prefix letter or two (ו, ה, ב, כ, ל, מ, ש) is taken off, becomes the most
  frequent word in it that differs by one letter for a letter print makes look alike (ב כ נ, ד ר ך, ה ח ת, ו ז ן י,
  ס ם ט, ג נ, ע צ), or by a ו or a י added or dropped (full and defective spelling), and stays as read when none is.
  A final letter (ך ם ן ף ץ) ends a word, so one read inside a run of letters ends a word there, and a run no listed
  word fits is parted into the likeliest listed words, of three letters or more each. The words are FrequencyWords'
  subtitle list, fetched from jsDelivr at a pinned commit on Find books' first run and kept offline with the study's
  Python, then, the owner's choice of 2026-11-10, the names of Hebrew Wikipedia's article titles (authors, book
  titles, publishers), the site's own file, made by the lab from one dated dump. Test: `studies/shelves/tests/test_reading.py`, `studies/shelves/tests/test_spelling.py`,
  `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shelves/summary` Summary counts the books, spines and covers, and lists each one's text, over the books the mask touches.
  <details>

  Set by the owner on 2026-11-16. Outside ground truth, once books are found, the Summary box says how many books it
  counts, how many of them spines and how many covers, above the list of their texts. A book counts when any part of
  its box lies inside the shell's summary mask (`req/shell/summary/mask`), every book with no mask. The shell's
  Download Summary saves the three counts and a row per book, its number, view and text
  (`req/shell/summary/download`). Test: `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shelves/truth/fields` A book's text is set field by field: Title and Author always, Publisher, Volume and Library mark when used.
  <details>

  Set by the owner on 2026-11-19 (#899), replacing the single title box of `req/shelves/truth/task` where the two
  differ. The task shows a text box per field, each filled with what the reader read for it: Title and Author
  always, and Publisher, Volume and Library mark only once the reader read one or the tagger opens it from a
  small `+ Publisher`, `+ Volume` or `+ Library mark` link, so a book without them costs nothing. Once any book on
  the photo has a library mark, the Library mark box is open on every book. Each field has its own colour and
  letter (T, A, P, V, L), on its box and on the outline of where the reader read it on the book's picture, never
  the colour alone; the tagger never draws or corrects those outlines. A ⇅ between two boxes swaps them, and Alt+↓ /
  Alt+↑ (`req/shelves/truth/keys`) do the same or move only the selected text. Leaving a box commits its text as
  one action, Right carries the boxes not yet committed, and approves every field as it stands. The file keeps,
  per book, `fields` (only the fields that hold text), `text` (every field joined, as before) and `regions` (the
  reader's outlines, as shares of the straightened book at its first turn), and for a found book what the reader
  proposed for each field. A file from before the fields reads its text as the title. The reasoning behind the
  panel: `docs/fields/GT-UI.md`. Test: `studies/shelves/tests/test_gt_actions.mjs`,
  `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shelves/truth/keys` While a book is open in the task, the keyboard gives its verdicts: Enter Right, Alt+← Back, Alt+→ Next, Ctrl+↑ Flip, Ctrl+Backspace Not a book.
  <details>

  Set by the owner on 2026-11-15, as for NoR's and Vascular Measurements' tasks, but with keys the title's text box
  leaves free, since letters there are typing: Enter, in the title or anywhere in the task, is Right with the title
  typed, the same as the button, and moves on. A title still exactly as the reader read it is never approved by one
  key: the first Enter says "Left as read: Enter again if it is exactly right" under it, and a second Enter approves.
  Alt+← is Back, Alt+→ Next, Ctrl+↑ Flip and Ctrl+Backspace Not a book. The keys are read by where they sit on the
  keyboard, so they work in any layout (Hebrew too); they act only while tagging with a book open, a key held down
  acts once, a key does nothing while its button is hidden or off, and an Enter that ends a word being composed (an
  IME) approves nothing. Each button shows its key in small type. Changed by the owner on 2026-11-16: the keys are the
  shell's (`req/shell/image/keys`), declared in the study's `study.json` and listed in the keys legend at the image's
  bottom left while a book is open, the study listening to no key itself. Set by the owner on 2026-11-19 (#899),
  with the book's fields (`req/shelves/truth/fields`): Alt+↓ and Alt+↑ in a field swap it with the field below or
  above, or move only the text selected in it there; Tab moves between the fields; and the second Enter is asked
  while the title and the author are both exactly as read. Test: `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shelves/truth/task` One ground-truth task: each book in turn, in the order they stand, has its corners, turn and title set right, and the missed books are added.
  <details>

  Set by the owner on 2026-11-04: boxing and reading are made into ground truth together, as
  NoR's finding and measuring are. A Ground Truth Tagger finds and reads the books, then works down
  the Ground Truth Tasks box: Books ("12/40 Books"), one book at a time, its straightened picture across
  the box, Flip and Turn 90° beside Hebrew, English and Both, its title in a text box filled with what the
  reader read, and Right or Not a book under it, with Back and Skip on its row; its corners drag on the photo,
  and the picture and the reading follow them. Then Missed books: a book is added from the photo's right-click
  menu, or drawn with Draw a book, four clicks on the photo, its corners, and is read and reviewed as the others;
  None missed ends the task. Submit ground truth is last, and saves `<image>_books_gt.json`, each book with where
  it came from (found or missed), its verdict, its corners, its turn and text, and for a found one what the
  finder and the reader proposed. Summary is not shown while ground truth is made.

  Set by the owner on 2026-11-10:
  - The photo is never covered while a book is straightened and read again: the picture is drawn by the page
    from the photo it shows, and follows a corner while it is dragged; the reading runs behind it, and a later
    reading of the same book replaces one still under way. Set by the owner on 2026-11-20 (#1059): the book is
    straightened for its reading in the page, from the photo's pixels as the shell decoded them, the same
    straightening as the finder's (`books.straighten`, within a level per channel), asking Python for nothing
    (`req/shell/python/file-bytes`). Test: `studies/shelves/tests/test_shelves_page.py`,
    `studies/shelves/tests/test_straighten.py`.
  - A corner may be dragged past the photo's edge, for a book the camera cut off, so that every book keeps four
    corners; the picture is black where the box leaves the photo.
  - The picture is shown upright at the turn the reader read it at, and Flip (half a turn) and Turn 90° set it
    right; the book is then read again at that turn alone. Hebrew, English and Both say which language the title
    is in, Both at first, and read it again in that language alone (PP-OCR reads English whatever is chosen). The
    file keeps the turn (quarter turns clockwise from the picture's first corner at its top left), not the
    language.
  - The task asks no spine or cover: the box's shape and the finder's search already tell them apart, and
    nothing reads the label; the matcher's file keeps the finder's own (`req/shelves/matcher/export`).
  - Right-clicking the photo opens a menu: off every book, Add a book here, which boxes an upright book centred
    at the click, as wide and as tall as the median book kept so far, its corners then dragged into place; on a
    book, Flip upside down and Delete this book, which takes an added book away and marks a found one not a
    book (Back undoes it).
  - Each book's outline keeps its width on the screen at any zoom, thick enough to see on any photo.

  Set by the owner on 2026-11-10, replacing what is above where the two differ:
  - One task, Books ("3/12 Books"): every book on the photo, found or added, decided alike. The task carries no
    instructions of its own. A book the finder missed, added from the right-click menu or drawn, is one more book
    to review, open at once; once every book is decided the task asks for the missed ones (Draw a book, None
    missed), and Submit opens only after None missed.
  - The books are walked in the order they stand on the photo, shelf by shelf from the top, each shelf left to
    right, never in the finder's order. Back and Next (no longer Skip) go to the book beside the open one along that
    order, whatever its verdict; a verdict, changed or new, moves on to the next book still open.
  - A book clicked on the photo opens in the task whatever its verdict, its verdict shown and changeable; a box
    marked Not a book stays faint on the photo while tagging, so it can be picked. Add a book here is offered on a
    book too, since a box drawn over two books hides one of them.
    Set by the owner on 2026-11-10, a book clicked on the photo leaves the view where it is, its zoom and place
    kept, while any part of the book is in view; only one out of view is framed.
  - A book not yet approved opens with its title's text box focused and all its text selected, to retype.
  - Flip alone turns the picture: no Turn 90°, and no language choice, the title's language being plain from what is
    typed; a book read again is read in Hebrew and English.
  - The approved books are cut out of the photo while tagging (`req/shell/ground-truth/tagging`).
  - Each book has an id, kept in the model and in the file and never shown; a book the tagger adds has an id of its
    own kind, so that finding again never gives two books one id. The tagger's work is the shell's GT actions
    (`req/shell/ground-truth/history`): a corner's drop (one action, none while it is dragged or when Escape cancels
    it), Flip, a title committed (another book opened or the field left: one action, not one a key), Right, Not a
    book or Delete this book, a book added, None missed, and each answer of the reader landing on a book, which
    carries the answer and is never read again when the history is replayed. Right on a title typed and not yet
    committed, by Enter or by its button, is one action, the approval carrying the title: Undo takes the verdict and
    the title back together. A book may be added before Find books has run: the log then starts from the photo
    alone, with no book, and the books added are carried over when Find books runs. Save Draft keeps them and
    Load draft brings them back (`req/shell/ground-truth/save-draft`, `req/shell/ground-truth/draft-offer`); a draft
    kept before Edit History is offered once (`req/shell/ground-truth/legacy`).
    A run after stored ground truth (`req/shell/ground-truth/history-carry`) carries it onto the new books: a verdict, a
    typed title, a turn and moved corners go to the book with the same id (a book moved since is found by the corners the
    finder proposed for it), the books added and None missed stand as they were, and a book the tagger had worked on that
    the run does not find is left out and counted on the status line. The file keeps `next`, the ids the finder's books and
    the added ones are given next, so an id given up is not given again after the file is read.
    Test: `studies/shelves/tests/test_gt_actions.mjs`.
  - The file lists every book with its id and its verdict (right, or none while it is not decided), in the walk's
    order; the readers and the lab take the books marked right.

  Changed by the owner on 2026-11-10, replacing what is above where the two differ: Not a book, and Delete this
  book, take a box off the photo and out of the walk, found or added alike; nothing is left faint on the photo,
  and Back no longer brings it back.

  Changed on 2026-11-17 with the GT action log (`docs/future-directions/edit-log/README.md`), replacing what is above
  where the two differ: Undo brings a book taken off back. Continue GT tagging is gone: Load draft, then Start GT
  tagging, begins the walk at the first book not yet decided. The file lists every book, not only those marked right.

  Test: `studies/shelves/tests/test_shelves_page.py`.
  </details>

- `req/shelves/visibility` The study is shown to its owner's account alone.
  <details>

  Its `visibility` names the owner's Google account (`req/shell/study/visibility`), so the site,
  whose focus is biology, offers it to no one else. Test: `web-tests/test_study_contract.py`.
  </details>
