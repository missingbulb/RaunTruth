# Video 2 — "Teach it one image at a time" (the pitch)

**Job:** make a PI or lab manager who has never heard of RaunTruth want to try it, by showing one idea: tagging
ground truth and building the algorithm are the same loop, and every turn of it makes the next turn shorter.
**Watched:** muted first, on a landing page or in a talk; every scene must read from captions and on-screen text.
**Length:** whatever its moments take (see [how a scene is built](README.md#how-a-scene-is-built)); the animatic
gives the running time. A 60-second cut for muted autoplay keeps scenes 1, 3, 4, 6 and 9.

The UI is the design in PR 1036 (`dev/requirements/study-stages-map.md`, `study-stages-spec.md`), not today's
page, drawn as it will look, not pixel-exact. **[UI]** is a screen capture, **[MG]** a motion graphic, **[B]**
real-world footage or illustration, **[C]** the Claude chat.

## Scenes

### 1. Every node is a click

**Conveys:** counting by hand is your lab's problem, and its scale is absurd.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| one image, every node a click | both | 3 | **[B]** A confocal field fills the frame; a cursor clicks node after node, a tally ticking 1, 2, 3… | "Every node in this image is a click." |
| the scale | both | 3 | Zoom out: the field shrinks into a grid of 400; the tally reads 287 and keeps going. | "Three hundred in each image. Four hundred images." |

### 2. Today's three roads

**Conveys:** every route you have today costs weeks or trust, and the proof sits nowhere anyone can check.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| by hand: slow and inconsistent | both | 3 | **[MG]** Card 1, *By hand*: calendar pages flip; two counts of one image, 287 and 312. | "Count by hand, and it takes weeks, and two people never quite agree." |
| off the shelf: no accuracy | both | 3 | Card 2, *Off the shelf*: a box returns a number; a reviewer's comment lands on it: *"How accurate is this?"* | "Use a tool off the shelf, and you can't say how accurate it is." |
| custom: months | both | 3 | Card 3, *Custom code*: an email, *"the core can fit you in… in March"*. | "Or wait months for someone to write code for your stain." |
| the proof nowhere | both | 3 | The cards slide aside: a laptop, a spreadsheet `GT_final_v3.xlsx`. | "And the ground truth that would prove any of it is a spreadsheet on one student's laptop." |

### 3. One loop

**Conveys:** annotating and building the algorithm can be one activity.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| the idea | both | 3 | **[MG]** The three cards fold into one circle: *annotate → improve → annotate*. | "What if annotating your images and building the algorithm were the same loop?" |
| the name | picture | 1.5 | **RaunTruth** settles in the circle's centre. | |

### 4. The first turn: correct, don't draw

**Conveys:** you start from a rough draft, and your work is verdicts, not drawing; progress is visible as you go.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| a draft from your papers | both | 3 | **[C]** Two papers dropped into a Claude chat; it answers with `v1`. | "Claude reads your papers and drafts a rough algorithm." |
| it is rough | both | 2.5 | **[UI]** `v1`'s candidates as faint outlines on the image; several plainly wrong. | "It's rough. It's supposed to be." |
| approve | both | 2 | Ground Truth Tasks shows one item, ringed on the image; **Approve**. | "You correct it: approve," |
| reject | both | 1.5 | The next item slides in; **Reject**. | "reject," |
| add what it missed | both | 2 | A click on an unmarked node adds it. | "add what it missed." |
| progress you can see | picture | 3 | Sped up: decided items cut to black, area by area, until the image is dark. | |

### 5. The second turn: measured

**Conveys:** your corrections turn into a better algorithm, and you can see by how much, on your own images.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| corrections become ground truth | both | 3 | **[C]** "Improve the finder on the new ground truth." Claude runs the lab. | "Your corrections become ground truth, and Claude improves the algorithm against it." |
| every version scored | both | 3.5 | **[UI]** The algorithm list gains `v2`; its precision and recall bars grow past `v1`'s; *measured on 1 image*. | "Every version is scored on your own images, and says on how many." |

### 6. Each image faster than the last

**Conveys:** the payoff — the loop shortens itself, and you decide when it is done.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| the next image is easier | both | 3 | **[UI]** Image 2 with `v2`: fewer wrong outlines; verdicts come fast. | "And the next image is easier, because the algorithm already gets more of it right." |
| faster each time | picture | 3 | **[MG]** Three tagging-time bars, image 1 to 3, each shorter; the loop turns once per image. *Illustrative.* | |
| you decide | both | 2.5 | `v4` on a fresh image: almost every outline right. | "You stop when you judge it's good enough." |

### 7. The whole study, in one place

**Conveys:** the numbers and the images they came from live together, so you can explore and check.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| run it everywhere | both | 2.5 | **[UI]** Study Setup, *Batch run*: images tick done. | "Then run it over every image in the study." |
| numbers beside images | both | 3.5 | The main app: an image beside its count and length histogram; a lasso round a region, the numbers redraw. | "Circle a region and the numbers follow. Doubt an image, correct it." |

### 8. A score reviewers can check

**Conveys:** publishing comes with a frozen, checkable accuracy, a thing reviewers rarely get.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| frozen with the paper | both | 3 | **[MG]** A seal stamps the manuscript: *precision · recall · dataset SHA · frozen*. | "When you submit, the ground truth freezes and the score is published with it." |
| reviewers check | both | 3 | **[B]** A reviewer, signed out, opens the study's link: images, overlays, numbers. | "Reviewers can open your images and check the analysis themselves." |

### 9. End

**Conveys:** the name, the promise, where to go next.

| Moment | By | Hold | Picture | Voice |
|---|---|---|---|---|
| the promise | both | 3 | End card: rauntruth.com · *Runs in your browser. Your images stay on your Drive.* · next: the walkthrough. | "RaunTruth. From your images to numbers you can defend." |

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
