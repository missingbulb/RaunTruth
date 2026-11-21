# Tutorial and pitch videos

Two videos for biology researchers, PIs and lab managers, storyboarded on the study-stages design of PR 1036
(`dev/requirements/study-stages-map.md`, `study-stages-spec.md`), which is not built yet.

| Video | For | Job | Length |
|---|---|---|---|
| [Teach it one image at a time](2-the-loop.md), in three cuts: [documentary](2a-documentary.md), [launch](2b-launch.md), [playful](2c-playful.md) | PIs and lab managers meeting RaunTruth | the pitch: today's pain against the annotate-and-improve loop | from its moments, plus a 60 s cut |
| [A study, start to publication](1-full-workflow.md), documentary | the researcher who will run a study | every action, Setup to Public | from its moments, one clip per chapter |

Every cut plays as an animatic from the storyboard page: each moment drawn, the camera moving on it, and one mixed
soundtrack of voice, music beds and sound effects:

```
python3 docs/videos/storyboard/build.py OUT_DIR --voices VOICES_DIR
```

The page reads the scenes from these files and each moment's sketch from `storyboard/frames.json`. `VOICES_DIR`
holds the [Piper](https://github.com/rhasspy/piper) models the cuts name (`pip install piper-tts`, installed ad
hoc, the models downloaded from Piper's voices list); `storyboard/sound.py` synthesizes the beds and effects and
mixes them under the voice with ffmpeg. All three are drafts standing in for a cast voice, a score and a sound
designer.

## How a scene is built

A storyboard is written scene by scene, and a scene starts from what it must convey, never from a running time:

1. **Conveys** — the one thing the viewer leaves the scene understanding, or able to do.
2. **Moments** — the key elements the viewer must experience to get there, in order.
3. **By** — what carries each moment: `both` (the picture and the voice in sync, the default for an action the
   viewer must repeat), `picture` (seen, not said: progress, a result, a feeling of speed) or `voice` (said over
   the picture already up). Neither channel is filler for the other.
4. **Hold** — the seconds the picture moment needs to be taken in: about 3 for a new screen, 1.5–2.5 for a change
   on the same screen, more for text to read.

5. **Camera** — how the frame moves while the moment plays (`push`, `pull`, `punch`, `whip`, `drift`, `shake`,
   `still`, with `@x,y` for where a push lands), motivated by where the eye should go.
6. **Sound** — what the ear gets: a music bed starting (`bed:<name>`, `bed:none`) and effects (`sfx:<name>`,
   `@seconds` for an offset), designed per moment like the picture, not laid under at the end.

The pitch's scenes, *Conveys* and pictures live in its brief, and each cut gives the same moments its own narration,
holds, camera and sound, so the cuts compare like for like.

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

## Producing them

Nothing here can be recorded until PR 1036's work packages are built; the storyboards can be animatics until
then. The suggested route, chosen so a UI change means re-rendering, not re-shooting:

1. **Capture the UI with Playwright**, scripted per beat, against the test fakes (`web-tests/fakes/`: Drive,
   sign-in) seeded with a real study's images — deterministic, no real accounts or private data on screen, no
   loading spinners. Record at 1920 × 1080 with a large cursor; zoom and pan in the edit, not in the browser.
2. **Voice from the script**: a synthetic voice, re-voiced in minutes after an edit (the owner's choice, 2026-11-21).
3. **Assemble with ffmpeg** (cuts, speed ramps, zooms, captions from the script's timings); add a small
   Remotion or Motion Canvas project only for the motion graphics if they outgrow stills.
4. **The Claude beats** are real sessions, screen-captured and trimmed, never mocked replies.

A mixed alternative is to record by hand in a recorder with auto-zoom (Screen Studio, Tella), quicker for a first
cut but re-shot on every UI change.

## Serving them

On YouTube, embedded on rauntruth.com (the owner's choice, 2026-11-21): chapters in the description, the script's
WebVTT as captions.

- **The embed changes the site's privacy promise.** A YouTube player sets third-party cookies and sends the
  visitor's address to Google, so the commit that adds it rewrites the privacy page and the README's "no cookies"
  and "sends nothing elsewhere" claims, leading with what the embed now does.
- **Alternatives weighed**: Cloudflare Stream ($5 per 1,000 minutes stored, $1 per 1,000 delivered) or MP4 and VTT
  on R2 would have kept that promise unchanged; the site's static assets are out, as a file there is capped at
  25 MiB.
