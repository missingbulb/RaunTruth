# Tutorial and pitch videos

Two videos for biology researchers, PIs and lab managers, storyboarded on the study-stages design of PR 1036
(`dev/requirements/study-stages-map.md`, `study-stages-spec.md`), which is not built yet.

| Video | For | Job | Length |
|---|---|---|---|
| [Teach it one image at a time](2-the-loop.md) | PIs and lab managers meeting RaunTruth | the pitch: today's pain against the annotate-and-improve loop | 1:45, plus a 60 s cut |
| [A study, start to publication](1-full-workflow.md) | the researcher who will run a study | every action, Setup to Public | ~7:30, as eight chapter clips |

The pitch is the entry point and ends on a link to the walkthrough; the walkthrough's chapter 5 is the pitch's
loop shown in full.

## What the storyboards are built on

- **Length.** Completion falls with length (Vidyard, 1.78 M business videos: 66 % finish under 1 min, 56 % at
  1–2 min, 50 % at 2–10 min), and how-to viewers care more about skimming than about length (Guo et al. 2014, edX).
  So: a pitch under two minutes, and a walkthrough cut into one-task clips that also play as one chaptered video.
  These figures are vendor and platform studies — directional, not settled.
- **Hook in the first five seconds**, with the pain in the viewer's terms (a count, a deadline), never a logo.
- **Muted first.** Most autoplayed video is watched without sound, so every beat carries on-screen text, and both
  videos ship a WebVTT caption file; the pitch's autoplay cut has the captions burned in.
- **Voice at ~140 words a minute**, slower than a pitch reel, as the audience reads data while it listens.
- **Real UI for the product, motion graphics for ideas, footage for recognition.** The UI is the argument wherever
  an action is shown; the abstract parts (three bad options, the loop, the freeze) are motion graphics; a few
  seconds of a microscope and a manuscript anchor the story in the lab.
- **Scientists want the data, not adjectives.** Every score on screen is the page's real one with its denominator
  ("measured on N images"); no invented accuracy, no timings that were not timed, no "revolutionary".

## Producing them

Nothing here can be recorded until PR 1036's work packages are built; the storyboards can be animatics until
then. The suggested route, chosen so a UI change means re-rendering, not re-shooting:

1. **Capture the UI with Playwright**, scripted per beat, against the test fakes (`web-tests/fakes/`: Drive,
   sign-in) seeded with a real study's images — deterministic, no real accounts or private data on screen, no
   loading spinners. Record at 1920 × 1080 with a large cursor; zoom and pan in the edit, not in the browser.
2. **Voice from the script**: a synthetic voice (re-voiced in minutes after an edit), or the owner's own voice,
   which reads as more credible to scientists. The owner's call.
3. **Assemble with ffmpeg** (cuts, speed ramps, zooms, captions from the script's timings); add a small
   Remotion or Motion Canvas project only for the motion graphics if they outgrow stills.
4. **The Claude beats** are real sessions, screen-captured and trimmed, never mocked replies.

A mixed alternative is to record by hand in a recorder with auto-zoom (Screen Studio, Tella), quicker for a first
cut but re-shot on every UI change.

## Serving them

- **On rauntruth.com**: Cloudflare Stream ($5 per 1,000 minutes stored, $1 per 1,000 delivered; adaptive
  streaming, captions, chapters), or plain MP4 and VTT on R2 behind a `<video>` tag. Not the site's static
  assets: a file there is capped at 25 MiB.
- **For reach**: the same files on YouTube, with chapters in the description, linked from the site rather than
  embedded.
- **Before either ships**: an embedded player is a new outbound connection, an approval question of its own, and
  the site's privacy text ("no cookies", nothing sent elsewhere) must be reconciled with it — a YouTube embed would
  falsify it, Stream or R2 keep it true.
