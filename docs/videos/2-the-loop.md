# Video 2 — "Teach it one image at a time" (the pitch)

**Job:** make a PI or lab manager who has never heard of RaunTruth want to try it, by showing one idea: tagging
ground truth and building the algorithm are the same loop, and every turn of it makes the next turn shorter.
**Watched:** muted first, on a landing page or in a talk; every scene must read from captions and on-screen text.

This brief holds each scene, what it must convey, the pictures that carry it and the words over them. The words are
the playful cut's, the direction the owner chose on 2026-11-22: wry about the pain every lab shares (the ruler, the
spreadsheet, Reviewer Two), the jokes at the problem's expense, never the viewer's. The finished video was made on
another platform from this brief; this file keeps the reasoning, not the assets.

The videos never name the AI: it is "your AI software engineer", a role, so the pitch holds whichever agent a lab
uses. The algorithms it writes are computer vision, not machine learning, which the pitch says outright, since it is
what spares the lab the mountain of tagging in the third road.

The UI is the design in PR 1036 (`dev/requirements/study-stages-map.md`, `study-stages-spec.md`), not today's
page, drawn as it will look, not pixel-exact. **[UI]** is a screen capture, **[MG]** a motion graphic, **[B]**
real-world footage or illustration, **[C]** the chat with the AI software engineer, never named as a product.

## Scenes

### 1. Every node, by hand

**Conveys:** measuring by hand is your lab's problem, and its scale is absurd.

| Moment | Picture | Voice |
|---|---|---|
| measuring by hand | **[B]** Illustration: a researcher at a monitor showing a confocal field, holding a ruler against the screen over one node, writing its length in pencil on a notepad beside the keyboard. | "Here's how it's done today. A ruler. On the screen. And a pencil." |
| the pencil snaps | Mid-number, the pencil tip snaps and skitters across the notepad. | "Of course." |
| the scale | Pull back: the screen's image tiles into 400; the notepad becomes a stack of filled pages. | "Three hundred nodes an image. Four hundred images. Your grad student says hi." |

### 2. Today's three roads

**Conveys:** every route you have today costs weeks or trust, and the proof sits nowhere anyone can check.

| Moment | Picture | Voice |
|---|---|---|
| by hand: slow and inconsistent | **[MG]** Card 1, *By hand*: calendar pages flip; two counts of one image, 287 and 312. | "Option one: count by hand, twice, and get two different answers." |
| off the shelf: no accuracy | Card 2, *Off the shelf*: a box returns a number; a reviewer's comment lands on it: *"How accurate is this?"* | "Option two: a black box. How accurate is it, asks Reviewer Two. Great question." |
| train a model: a mountain of tagging | Card 3, *Train a model*: images pile into thousands; a tagging counter crawls, *tagged 2,140 / 10,000*; a training bar after it. | "Option three: tag ten thousand images to train a model, so you never have to tag images. Hmm." |
| the proof nowhere | The cards slide aside: a laptop, a spreadsheet `GT_final_v3.xlsx`. | "Meanwhile, the ground truth lives in GT final, version three. On a laptop." |

### 3. One loop

**Conveys:** annotating and building the algorithm can be one activity.

| Moment | Picture | Voice |
|---|---|---|
| the idea | **[MG]** The three cards fold into one circle: *annotate → improve → annotate*. | "What if tagging and building the algorithm were the same thing?" |
| the name | **RaunTruth** settles in the circle's centre. | *(picture alone)* |

### 4. The first turn: correct, don't draw

**Conveys:** you start from a rough draft, and your work is verdicts, not drawing; progress is visible as you go.

| Moment | Picture | Voice |
|---|---|---|
| a draft from your papers | **[C]** Two papers dropped into a chat with an AI software engineer; it answers with `v1`, labelled *computer vision · no training data*. | "Your AI software engineer reads your papers and writes an algorithm. Computer vision, not machine learning, so no ten thousand images. Done by lunch." |
| it is rough | **[UI]** `v1`'s candidates as faint outlines on the image; several plainly wrong. | "Is it good? Not yet. That's where you come in." |
| approve | Ground Truth Tasks shows one item, ringed on the image; **Approve**. | "Yes," |
| reject | The next item slides in; **Reject**. | "no," |
| add what it missed | A click on an unmarked node adds it. | "you missed one." |
| progress you can see | Sped up: decided items hidden, area by area, until the whole image is done. | *(picture alone)* |

### 5. The second turn: measured

**Conveys:** your corrections turn into a better algorithm, and you can see by how much, on your own images.

| Moment | Picture | Voice |
|---|---|---|
| corrections become ground truth | **[C]** "Improve the finder on the new ground truth." The agent runs the lab. | "Your corrections become ground truth. It takes notes, and tries again." |
| with a nudge, or on its own | Split: on the left, a one-line nudge, *"follow the fibre, not the blob"*; on the right, the lab's log running by itself overnight, version after version scored against the tags. | "Give it a hint, or don't. It knows its craft, and runs a lab that scores every try against your tags while you sleep." |
| every version scored | **[UI]** The algorithm list gains `v2`; its precision and recall bars grow past `v1`'s; *measured on 1 image*. | "Every version gets a report card. Graded on your images." |

### 6. Each image faster than the last

**Conveys:** the payoff — the loop shortens itself, and you decide when it is done.

| Moment | Picture | Voice |
|---|---|---|
| the next image is easier | **[UI]** Image 2 with `v2`: fewer wrong outlines; verdicts come fast. | "And the next image? Easier. It learned." |
| the tools grow too | **[UI]** Two item boxes side by side. Image 1's: *Yes · No · Missed one*. Image 3's, after the tools improved: *Widen this node · Lower the curvature · Split in two*, with handles on the node. | "The tagging tools learn too. Yes, no, missed one, becomes widen this node, and lower the curvature." |
| faster each time | **[MG]** Three tagging-time bars, image 1 to 3, each shorter; the loop turns once per image. *Illustrative.* | *(picture alone)* |
| you decide | `v4` on a fresh image: almost every outline right. | "Stop whenever you're happy. Yes, you're allowed." |

### 7. The whole study, in one place

**Conveys:** the numbers and the images they came from live together, so you can explore and check.

| Moment | Picture | Voice |
|---|---|---|
| run it everywhere | **[UI]** Study Setup, *Batch run* over all 400 images: they tick done. | "Then run it on all four hundred. Go get a coffee." |
| numbers beside images | The main app: an image beside its count and length histogram; a lasso round a region, and the count redraws for it, *41 in the lasso*. | "Numbers next to their images, so nobody has to trust a spreadsheet again." |

### 8. A score reviewers can check

**Conveys:** publishing comes with a frozen, checkable accuracy, a thing reviewers rarely get.

| Moment | Picture | Voice |
|---|---|---|
| frozen with the paper | **[MG]** A seal stamps the manuscript: *precision · recall · dataset SHA · frozen*. | "Submit the paper, and the score freezes with it." |
| reviewers check | **[B]** A reviewer, signed out, opens the study's link: images, overlays, numbers. | "Reviewer Two can check it personally. You're welcome, Reviewer Two." |

### 9. End

**Conveys:** the name, the promise, where to go next.

| Moment | Picture | Voice |
|---|---|---|
| the promise | End card: rauntruth.com · *Runs in your browser. Your images stay on your Drive.* · next: the walkthrough. | "RaunTruth. Numbers you can defend. Even to Reviewer Two." |

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

## Claims to keep true

The pitch makes claims about the product; when the product changes one of these, this brief and the published video
are corrected with it:

- the algorithms are computer vision written by the agent, with nothing to train (scenes 2 and 4);
- the agent improves them with a nudge or on its own, through its lab, scored on the study's own tags (scene 5);
- the tagging tools improve between images (scene 6);
- ground truth freezes and the score is published at submission, and reviewers open the study by its link without
  an account (scene 8);
- the analysis runs in the browser and the images stay on the lab's Drive (scene 9).

The tagging-time and precision bars in scenes 5 and 6 are illustrative and stay labelled so until real measurements
replace them.
