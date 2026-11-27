# Tutorial and pitch videos

Two videos for biology researchers, PIs and lab managers, written on the study-stages design of PR 1036
(`dev/requirements/study-stages-map.md`, `study-stages-spec.md`). This folder keeps what each scene must convey,
what carries it and why; the finished videos and their assets live on the platform they were made with, and are
linked from here once published.

| Video | For | Job | State |
|---|---|---|---|
| [Teach it one image at a time](2-the-loop.md) | PIs and lab managers meeting RaunTruth | the pitch: today's pain against the annotate-and-improve loop | made, in the playful cut, on another platform |
| [A study, start to publication](1-full-workflow.md) | the researcher who will run a study | every action, Setup to Public | storyboarded; waits on PR 1036's UI |

## How a scene is built

A storyboard is written scene by scene, and a scene starts from what it must convey, never from a running time:

1. **Conveys** — the one thing the viewer leaves the scene understanding, or able to do.
2. **Moments** — the key elements the viewer must experience to get there, in order.
3. **By** — what carries each moment: `both` (the picture and the voice in sync, the default for an action the
   viewer must repeat), `picture` (seen, not said: progress, a result, a feeling of speed) or `voice` (said over
   the picture already up). Neither channel is filler for the other.
4. **Hold** — the seconds the picture moment needs to be taken in: about 3 for a new screen, 1.5–2.5 for a change
   on the same screen, more for text to read.

5. **Camera** — how the frame moves while the moment plays, motivated by where the eye should go.
6. **Sound** — what the ear gets: where the music changes and which effect marks the moment, designed per moment
   like the picture, not laid under at the end.

A moment lasts as long as the longer of its voice and its hold, so the running time comes out of the scenes. When
it runs long, cut or merge moments that do not serve their scene's *Conveys*; never speed the voice or shorten a
hold below what the picture needs.

The pitch is the entry point and ends on a link to the walkthrough; the walkthrough's chapter 5 is the pitch's
loop shown in full.

## What the storyboards are built on

- **Length.** Completion falls with length (Vidyard, 1.78 M business videos: 66 % finish under 1 min, 56 % at
  1–2 min, 50 % at 2–10 min), and how-to viewers care more about skimming than about length (Guo et al. 2014, edX).
  So: a pitch under two minutes, and a walkthrough cut into one-task clips that also play as one chaptered video.
  These figures are vendor and platform studies — directional, not settled — and were read from search
  summaries, not the sources' own pages: re-check each against its source before quoting it anywhere public.
- **Hook in the first five seconds**, with the pain in the viewer's terms (a count, a deadline), never a logo.
- **Muted first.** Most autoplayed video is watched without sound, so every beat carries on-screen text, and both
  videos ship a WebVTT caption file; the pitch's autoplay cut has the captions burned in.
- **Voice at ~140 words a minute**, slower than a pitch reel, as the audience reads data while it listens.
- **Real UI for the product, motion graphics for ideas, footage for recognition.** The UI is the argument wherever
  an action is shown; the abstract parts (three bad options, the loop, the freeze) are motion graphics; a few
  seconds of a microscope and a manuscript anchor the story in the lab.
- **Scientists want the data, not adjectives.** Every score on screen is the page's real one with its denominator
  ("measured on N images"); no invented accuracy, no timings that were not timed, no "revolutionary".

## Keeping a video consistent

An element keeps its look and state in every scene it appears in: one microscopy image wherever "the image" is
meant; the overlay ring in a colour the stain does not carry; version numbers that only rise; the agent never named
as a product; illustrative numbers labelled as such until real ones replace them.

## Serving them

On YouTube, embedded on rauntruth.com (the owner's choice, 2026-11-21): chapters in the description, the script's
WebVTT as captions.

- **The embed changes the site's privacy promise.** A YouTube player sets third-party cookies and sends the
  visitor's address to Google, so the commit that adds it rewrites the privacy page and the README's "no cookies"
  and "sends nothing elsewhere" claims, leading with what the embed now does.
- **Alternatives weighed**: Cloudflare Stream ($5 per 1,000 minutes stored, $1 per 1,000 delivered) or MP4 and VTT
  on R2 would have kept that promise unchanged; the site's static assets are out, as a file there is capped at
  25 MiB.
