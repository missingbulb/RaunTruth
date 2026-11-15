# Ground-truth tagging on a phone (future direction)

A design exploration, not a plan: nothing here is built, approved or timed on a person. It asks how
each study in its GT stage could take ground truth from a phone, with fingers instead of a mouse, a
small screen, maybe a noisy room, and maybe a trained helper instead of the lead. On the phone the work
becomes short questions (yes/no, pick one of a few) that the lab prepares ahead of time.

Each study's design went through four rounds, each written by an agent and kept here as written:

| Round | File | What it is |
|---|---|---|
| v1 | `design.md`, `mockup.html` | First design, after a little research on mobile labelling |
| review | `review.md` | Independent efficiency review against the code. NoR and Vascular counts were measured on real data |
| v2 | `design-v2.md`, `mockup-v2.html` | Revision against the review, with the designer's disagreements |
| audit → v3 | `audit.md`, `mockup-v3.html`, `shot-v3-light.png` | Pre-mortem ("assume it failed: why?"), what data each answer needs, and an eyes-and-thumb walkthrough of every step; v3 is the audit's redesign |

[`tech-spec.md`](tech-spec.md) covers what mobile web can and can't do against an app, for all three
studies.

## Where each study landed (v3)

| Study | The phone's job | Time (estimated) | The audit's sharpest warning |
|---|---|---|---|
| [NoR Finder](nor/audit.md) | Detection only: yes/no on each pass with the crop sitting on the buttons; rejects and other finders' proposals on 2×3 "tap any node" sheets; a last look per grid square. Bars stay on the desktop (`measured: null`) | ~29.5 min per image per helper | Passes are ~90% yes: the thumb rests on Yes and the labels repeat the finder |
| [Bookshelf Reader](shelves/audit.md) | Tap every book in place on the shelf; untapped frames become the questions; titles are an optional second sitting with completion | Boxes 3.5–5 s a book; titles 15–19 s | With one tagger and a working desktop, the build may cost more than it saves |
| [Vascular Measurements](vascular/audit.md) | One straightened branch–gap–landing strip per dead end; two still slabs chosen by the lab for junctions that depth can split; one sitting | 13–29 min per stack | Defaults settle 50–110 junctions per stack; COUNT must show how much rests on them |

Mobile web carries all three; the one app-only gap is screen brightness control. The real risks are the
shell's Google sign-in in an iPhone home-screen app and iOS clearing a tab's storage after seven days of
not visiting the site ([`tech-spec.md`](tech-spec.md)).

## What blocks any build

- **No owner-curated ground truth exists** in any study, so there are no gold answers to check helpers
  against. The owner tags one image or stack first.
- **Each network call and permission** (hosting packs, syncing answers, identifying helpers, camera) is
  its own approval question under the nor-finder pack's `network-calls-approved` rule.
- **`req/shell/browsers/supported`** marks phones unsupported.
- **The `designing-ground-truth-tasks` skill** walks area by area, one item at a time; NoR's pooled
  chips and the Shelves segment tap both depart from it on the phone.
- **Whether it pays:** both auditors ask how many more images or stacks are coming and whether anyone
  besides the owner will tag.

The cheapest next test, before writing code, is the owner answering on paper or a click-through prototype:
60 NoR chips on their own phone, the held-out shelf photo `16w5nW` by taps, and 30 vascular junctions with
the depth chart beside each.

## How to read the numbers

Counts marked measured come from probe runs over the reference images at the time (NoR's reference slide,
v5 on the four vascular stacks, the Shelves tables recorded in its warm-up); the probe scripts were
throwaway and are not kept. Every duration is built from textbook figures for fixations and taps. Web
sources were mostly read as search summaries; `tech-spec.md` marks which.
