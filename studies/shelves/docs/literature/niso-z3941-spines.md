# ANSI/NISO Z39.41-1997 — Printed Information on Spines

*National Information Standards Organization, "Printed Information on Spines", ANSI/NISO Z39.41-1997 (revision of
Z39.41-1990; first issued 1979 as *Book Spine Formats*), approved by ANSI 14 January 1997 · NISO Press, Bethesda,
1998 · ISBN 1-880124-32-7, ISSN 1041-5653 · niso.org · © 1998 NISO, all rights reserved (no reproduction without
permission; these notes paraphrase and quote clauses briefly) · PDF: study Drive folder `Literature/Printed Information on Spines.pdf`.*

## What it gives the study

The norm for *which way* a spine's title runs, Hebrew included, and *where* on the spine the title, author and
publisher go. These are a standard's prescriptions, not measurements: how far publishers follow them, in the US or
elsewhere, the document does not say, and it is an American national standard (next review was due 2001; whether
it was reaffirmed or withdrawn is not in the text).

- **A turn prior by script, checkable on our ground truth.** If the reading below holds, a standard Hebrew spine and a
  standard English spine both read head to foot but need **opposite quarter turns** to set upright: English
  clockwise, Hebrew counter-clockwise. Our reader tries both quarter turns of a tall crop and keeps the most
  confident ([WARMUP](../WARMUP.md), Read); the ground truth keeps each book's turn and its language, so the share of
  Hebrew books at each turn can be counted before anything is built. A prior should only break near ties, since
  publishers deviate.
- **Layout priors for splitting a reading into fields:** title and author at the top, publisher in the bottom
  **1.5 in (40 mm) or more**, a library area of 1.5 in between (on library books; ours have none). A reading split into
  lines can weight the upper text as title/author and the foot as publisher, as HEBREW.md's "spine as a language"
  already observes on our shelves. A prior, never a rule the finder may depend on.
- **What a matcher must tolerate, by the standard's own leave:** one type of responsible entity, so one author of
  several (§4.1.1); a series title beside the volume title (§4.1.2); abbreviations, logos or symbols in place of words
  (§6.3); only the intended title of a multi-language work (§4.1.2.1). **No ISBN on the spine** (§4.3: Z39.21 puts it
  on the back cover), so no identifier can be expected from a spine photo.
- **A gap in our readers:** a **pillar** title (one character per line, read top to bottom upright) is not read by any
  reader of whole lines at any turn. Not yet seen in our photos.

## The direction clauses (§3, §6.2, Fig. 5)

- **Descending** title: along the spine, readable when the work **lies flat**, front cover up; for Roman scripts left
  to right. "For non-Roman scripts that are printed right to left (e.g., Hebrew) the direction of the title should be
  reversed, i.e., right to left."
- **Pillar** (one character per line, upright) and **transverse** (across the spine, upright) are the other two
  spine styles; **edge** titles, for works with no spine, run along the right edge for Hebrew.
- The **ascending** spine (bottom to top, common in continental Europe) is **not** among the styles. §6.1 allows any
  mix when descending or pillar leaves too little room.

**Worked through (our inference, not the standard's words):** a Latin book lying flat, front up, spine toward the
reader, has its head on the left, so left-to-right text runs head to foot; standing, its letters' tops face the
front cover, on the spine's right: turned a quarter **clockwise**. A Hebrew book's front cover is the other one:
lying flat front up, spine toward the reader, its head is on the right, so right-to-left text again runs **head to
foot**; standing, its letters' tops face the front cover, now on the spine's *left*: turned a quarter
**counter-clockwise**. The one sentence does not spell this out, nor how Israeli publishers actually print.

## Gaps

Hebrew for pillar or transverse titles; which cover is a right-to-left book's front (implied by reading order, not
defined); mixed-script spines and bidirectional text; the order of author and title inside the top area and any
separator (our `author / title` slash is the publishers', not this standard's); the minimum spine width that counts
as a spine (§3 excludes spines "too narrow" without a width); typefaces, sizes, contrast.

Left out: the scope over non-book media, the library-label placement details beyond the area sizes, the edition and
numbering clauses, and the front matter.
