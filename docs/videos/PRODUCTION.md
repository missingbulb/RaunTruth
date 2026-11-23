# Producing the videos

How the storyboards become finished videos: the elements that must stay the same from scene to scene, where every
shot comes from, how the sound is made, and how a render is checked before anyone watches it. The method each
scene is built by is the [README's](README.md#how-a-scene-is-built).

## The pipeline

```
python3 docs/videos/storyboard/build.py OUT --voices VOICES_DIR
```

```
node docs/videos/storyboard/audit.cjs OUT CUT OUT/audit-CUT
```

```
python3 docs/videos/storyboard/audit.py OUT CUT OUT/audit-CUT
```

```
node docs/videos/storyboard/render.cjs OUT CUT OUT/video/CUT.mp4 30
```

1. **Build** times every moment from its voice and hold, renders the voice (Piper), composes the music
   (`storyboard/music.py`), lays the effects and mixes them (`storyboard/sound.py`), then compresses and normalises
   the soundtrack to -14 LUFS with a -1 dBTP ceiling.
2. **Audit** samples each moment's middle and end as the render will draw them and checks them (below). It exits
   non-zero on an error; a render waits for a clean audit.
3. **Render** draws every frame at its time in headless Chromium, the camera moves and in-moment motion included,
   burns in the subtitles, and encodes 1920×1080 H.264 with the soundtrack.

Everything is deterministic: the same storyboard renders the same video, so a script edit is a re-render.

To make the pitch in another tool, pack its precursor artifacts as a kit: brief, scene goals, script with
timecodes, timeline CSV, subtitles, every moment's first and last frame as editable SVG, a contact sheet,
and the product's palette and fonts:

```
python3 docs/videos/storyboard/kit.py OUT OUT/RaunTruth-pitch-kit.zip
```

## The bible: elements that recur

An element keeps its look and its state across every scene it appears in. The audit checks the ones a machine can;
the reviewer reads the contact sheet for the rest.

| Element | What it is | Where | Holds true |
|---|---|---|---|
| The image | one confocal field of Caspr–Nav1.6–Caspr triplets | desk monitor, tagging, results, the lab's figure | the same field wherever "the image" is meant; final cut: one real NoR image, the owner's choice |
| The researcher | seen from behind, ruler, pencil, notepad | pitch scene 1 | the notepad only fills; the pencil breaks once |
| The overlay ring | amber, `--ring` | every tagging frame | never the stain's red or green (audited) |
| Versions | `v1`, `v2`, … | the agent's chat, the lab log, the algorithm list | only rise through a cut; a dropped try never gets a number (audited) |
| The three roads | By hand, Off the shelf, Train a model | pitch scene 2 | in that order, with the same icons |
| Reviewer Two | the sceptical reviewer | pitch scenes 2 and 8 | named, never shown |
| The AI software engineer | the agent's chat window | pitch 4–5, walkthrough 3–5 | never named as a product |
| The loop | annotate → improve → annotate | pitch scene 3, chapter cards | turns once per tagged image |
| The stage ribbon | Setup · Develop · Analyze · Review · Public | walkthrough, every frame | lights the chapter's stage |
| Illustrative bars | tagging time, precision and recall bars | pitch 5–6 | labelled illustrative until real numbers replace them |

## The shot list

Every moment is drawn today, so every cut renders now. A drawn UI frame is replaced by a capture of the real page
once that page exists; motion graphics and illustrations stay drawn, and footage is shot or licensed.

| Source | Pitch moments | Final source | Waits on |
|---|---|---|---|
| Illustration | measuring by hand, the pencil snaps, the scale | drawn, refined by an illustrator if wanted | nothing |
| Motion graphic | the three roads, the proof nowhere, the idea, the name, faster each time, frozen with the paper, the promise | drawn | nothing |
| The agent's chat | a draft from your papers, corrections become ground truth, with a nudge | a real session, screen-captured, the product's name off screen | nothing |
| UI | it is rough, approve, reject, add what it missed, progress you can see, the next image is easier, the tools grow too, you decide | capture of the page against the test fakes | the annotation choice and tasks (PR 1036 WP3) |
| UI | every version scored, run it everywhere, numbers beside images | capture | Study Setup's batch run (WP5) and the results view (WP8, the owner's open question) |
| Footage | reviewers check | shot: a person at a laptop, signed out | nothing |

The walkthrough's UI moments are its shot list, chapter by chapter, each waiting on the work package that builds
the controls it shows: Study Setup (WP5) for chapters 1–3 and 6, the stages (WP6) for the promotions, the
extractions store (WP4) for Save and Mark GT, the freeze (WP8) for chapter 7. Captures run through Playwright
against `web-tests/fakes/`, seeded per moment through the shell-states harness, at 1920×1080 and twice the pixel
density, the cursor added in the edit.

## Sound

- **Voice**: synthetic, from the script (the owner's choice), one take per moment. A pronunciation sheet goes with
  the script: Ranvier (*ron-vee-AY*), Caspr (*CAS-per*), Nav1.6 (*nav one point six*). A cast voice, if ever wanted,
  replaces the takes moment by moment, and the timing follows.
- **Music**: composed in code for each bed, no licensed tracks (the owner's choice): plucked strings, mallets, pads,
  bass and light drums in a stereo room. Beds change on the moments the storyboard names, so a hit lands on the
  picture it belongs to.
- **Effects**: synthesized, each named by the moment that cues it.
- **Mix**: voice high-passed, music ducked under it, 12-15 dB below the voice (measured and audited), a gentle bus
  compressor, then loudness normalised to -14 LUFS integrated and -1 dBTP.

## The audit

What `audit.py` checks on every sampled frame and the soundtrack:

| Check | Level |
|---|---|
| text sliced by the frame's edge (camera included) | error |
| two drawn texts overlapping | error |
| the ring's colour too close to a stain colour | error |
| true peak over -1 dBTP | error |
| text outside title-safe on a slide or title (screens are full-bleed by nature) | warning |
| text under 20 px at 1080p | warning |
| text contrast under 3:1 against what is behind it | warning |
| the subtitle covering drawn text | warning |
| a version shown lower than one already kept | warning |
| voice faster than 190 words a minute | warning |
| loudness more than 1.5 LU from -14 | warning |
| music less than 10 dB under the voice | warning |

The audit also writes a contact sheet, each moment's last frame. A reviewer who did not write the storyboard reads
it against each scene's *Conveys* line and picture, and answers per scene: does the frame show what the picture says,
and does the scene land with the sound off. That read is a separate session's, so it is not anchored on the author's.
