# Video 2 — "Teach it one image at a time" (the pitch)

**Job:** make a PI or lab manager who has never heard of RaunTruth want to try it, by showing one idea: tagging
ground truth and building the algorithm are the same loop, and every turn of it makes the next turn shorter.
**Watched:** muted first, on a landing page or in a talk; every scene must read from captions and on-screen text.

This brief holds the scenes, what each conveys and the pictures that carry it. Three cuts give the same moments their
own narration, holds, camera and sound (see [how a scene is built](README.md#how-a-scene-is-built)):

1. [Playful](2c-playful.md), the direction chosen: wry about the shared pain (the ruler, the spreadsheet, Reviewer
   Two), a bouncy bed.
2. [Documentary](2a-documentary.md), the runner-up: calm and lab-real, a warm bed, a narrator who sounds like a
   colleague.
3. [Launch](2b-launch.md): fast punch-ins on a driving beat, short lines on the downbeat.

The owner ranked them on 2026-11-22. A 60-second cut for muted autoplay keeps scenes 1, 3, 4, 6 and 9 of the playful
cut.

The videos never name the AI: it is "your AI software engineer", a role, so the pitch holds whichever agent a lab
uses. The algorithms it writes are computer vision, not machine learning, which the pitch says outright, since it is
what spares the lab the mountain of tagging in the third road.

The UI is the design in PR 1036 (`dev/requirements/study-stages-map.md`, `study-stages-spec.md`), not today's
page, drawn as it will look, not pixel-exact. **[UI]** is a screen capture, **[MG]** a motion graphic, **[B]**
real-world footage or illustration, **[C]** the chat with the AI software engineer, never named as a product.

## Scenes

### 1. Every node, by hand

**Conveys:** measuring by hand is your lab's problem, and its scale is absurd.

| Moment | Picture |
|---|---|
| measuring by hand | **[B]** Illustration: a researcher at a monitor showing a confocal field, holding a ruler against the screen over one node, writing its length in pencil on a notepad beside the keyboard. |
| the pencil snaps | Mid-number, the pencil tip snaps and skitters across the notepad. |
| the scale | Pull back: the screen's image tiles into 400; the notepad becomes a stack of filled pages. |

### 2. Today's three roads

**Conveys:** every route you have today costs weeks or trust, and the proof sits nowhere anyone can check.

| Moment | Picture |
|---|---|
| by hand: slow and inconsistent | **[MG]** Card 1, *By hand*: calendar pages flip; two counts of one image, 287 and 312. |
| off the shelf: no accuracy | Card 2, *Off the shelf*: a box returns a number; a reviewer's comment lands on it: *"How accurate is this?"* |
| train a model: a mountain of tagging | Card 3, *Train a model*: images pile into thousands; a tagging counter crawls, *tagged 2,140 / 10,000*; a training bar after it. |
| the proof nowhere | The cards slide aside: a laptop, a spreadsheet `GT_final_v3.xlsx`. |

### 3. One loop

**Conveys:** annotating and building the algorithm can be one activity.

| Moment | Picture |
|---|---|
| the idea | **[MG]** The three cards fold into one circle: *annotate → improve → annotate*. |
| the name | **RaunTruth** settles in the circle's centre. |

### 4. The first turn: correct, don't draw

**Conveys:** you start from a rough draft, and your work is verdicts, not drawing; progress is visible as you go.

| Moment | Picture |
|---|---|
| a draft from your papers | **[C]** Two papers dropped into a chat with an AI software engineer; it answers with `v1`, labelled *computer vision · no training data*. |
| it is rough | **[UI]** `v1`'s candidates as faint outlines on the image; several plainly wrong. |
| approve | Ground Truth Tasks shows one item, ringed on the image; **Approve**. |
| reject | The next item slides in; **Reject**. |
| add what it missed | A click on an unmarked node adds it. |
| progress you can see | Sped up: decided items hidden, area by area, until the whole image is done. |

### 5. The second turn: measured

**Conveys:** your corrections turn into a better algorithm, and you can see by how much, on your own images.

| Moment | Picture |
|---|---|
| corrections become ground truth | **[C]** "Improve the finder on the new ground truth." The agent runs the lab. |
| with a nudge, or on its own | Split: on the left, a one-line nudge, *"follow the fibre, not the blob"*; on the right, the lab's log running by itself overnight, version after version scored against the tags. |
| every version scored | **[UI]** The algorithm list gains `v2`; its precision and recall bars grow past `v1`'s; *measured on 1 image*. |

### 6. Each image faster than the last

**Conveys:** the payoff — the loop shortens itself, and you decide when it is done.

| Moment | Picture |
|---|---|
| the next image is easier | **[UI]** Image 2 with `v2`: fewer wrong outlines; verdicts come fast. |
| the tools grow too | **[UI]** Two item boxes side by side. Image 1's: *Yes · No · Missed one*. Image 3's, after the tools improved: *Widen this node · Lower the curvature · Split in two*, with handles on the node. |
| faster each time | **[MG]** Three tagging-time bars, image 1 to 3, each shorter; the loop turns once per image. *Illustrative.* |
| you decide | `v4` on a fresh image: almost every outline right. |

### 7. The whole study, in one place

**Conveys:** the numbers and the images they came from live together, so you can explore and check.

| Moment | Picture |
|---|---|
| run it everywhere | **[UI]** Study Setup, *Batch run*: images tick done. |
| numbers beside images | The main app: an image beside its count and length histogram; a lasso round a region, the numbers redraw. |

### 8. A score reviewers can check

**Conveys:** publishing comes with a frozen, checkable accuracy, a thing reviewers rarely get.

| Moment | Picture |
|---|---|
| frozen with the paper | **[MG]** A seal stamps the manuscript: *precision · recall · dataset SHA · frozen*. |
| reviewers check | **[B]** A reviewer, signed out, opens the study's link: images, overlays, numbers. |

### 9. End

**Conveys:** the name, the promise, where to go next.

| Moment | Picture |
|---|---|
| the promise | End card: rauntruth.com · *Runs in your browser. Your images stay on your Drive.* · next: the walkthrough. |

## Why this shape

- **Open on the pain, in the viewer's own terms** (scenes 1–2): a count and a deadline, not a feature.
- **One idea, shown, not listed** (scenes 3–6): the loop is the product, and scene 6 is what the viewer must leave
  with: each tagged image makes the next one faster.
- **Credibility over hype**: the scores on screen are the page's real ones with their real caveat ("measured on N
  images"), never a made-up 98%; scientists distrust a number with no denominator.
- **No sign-in, no loading, no Drive dialogs**: those belong to the walkthrough.

## Visual language

- Real UI only where it is the argument (scenes 4–7); motion graphics where the idea is abstract (the three roads,
  the loop, the seal); a few seconds of real lab footage for recognition.
- The loop circle is the recurring motif, also used in the walkthrough's chapter cards.
- Overlay colours on the microscopy follow the page's own rule: never a colour the stain itself carries.

## Open for production

- The tagging-time bars in scene 6 must be real: record actual tagging sessions of image 1 and image 3 and show their
  durations, or show the bars unnumbered as now.
- Scene 7 depends on the cross-image results view, the one part of PR 1036 still the owner's question (WP8); until
  it is decided, draw it from today's Summary box and its histograms.
