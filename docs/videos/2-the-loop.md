# Video 2 — "Teach it one image at a time" (the pitch)

**Job:** make a PI or lab manager who has never heard of RaunTruth want to try it, by showing one idea: tagging
ground truth and building the algorithm are the same loop, and every turn of it makes the next turn shorter.
**Length:** 1:45, and a 60-second cut (beats 1, 3, 4, 6, 9) for the landing page's muted autoplay. **Voice:**
~140 words a minute, about 240 words in all.
**Watched:** muted first, on a landing page or in a talk; every beat must read from captions and on-screen text.

The UI here is the design in PR 1036 (`dev/requirements/study-stages-map.md`, `study-stages-spec.md`), not
today's page; it is drawn as the page will look, not pixel-exact. A beat marked **[UI]** is a screen capture;
**[MG]** is a motion graphic; **[B]** is real-world footage or illustration.

## Beat sheet

| # | Time | Picture | Voice / on-screen text |
|---|---|---|---|
| 1 | 0:00–0:07 | **[B]** A confocal image fills the frame; zoom out and it tiles into 400 images. A counter ticks up beside the cursor clicking dots in Fiji. | "Four hundred images. Three hundred nodes in each. Someone in your lab is going to click every one." |
| 2 | 0:07–0:25 | **[MG]** Three cards slide in, each a pain the audience owns: **1. By hand** — a tally clicker, weeks on a calendar, two people's counts disagreeing. **2. Off the shelf** — a black box returns a number; a reviewer's comment pops up: *"How accurate is this?"* **3. Custom** — a code editor, an email "can the bioinformatics core fit you in… in March?" | "Today you choose: count by hand for weeks, trust a tool you can't check, or wait months for someone to write code for your stain. And the ground truth that would prove any of it lives in a spreadsheet on one student's laptop." |
| 3 | 0:25–0:31 | **[MG]** The three cards collapse into one circle: *annotate → improve → annotate*. Title: **RaunTruth**. | "What if annotating and building the algorithm were one loop?" |
| 4 | 0:31–0:46 | **[UI]** A study page, an image loaded. The left bar asks *Start annotating from scratch*. A rough first algorithm (made by Claude from the study's papers) marks candidates as faint outlines. Ground Truth Tasks walks area by area: one item, **Approve / Reject**, the area cut to black as it's done; a missed node added with one click. | "Start with a rough draft. Claude writes it from your papers in an afternoon. You correct one image: approve, reject, add what it missed. Area by area, until the image is done." |
| 5 | 0:46–0:58 | **[UI]** Split screen. Left: a chat with Claude — "Improve the finder on the new ground truth." Right: the algorithm list gains a version; its precision and recall numbers move. A small stamp reads *measured on 2 images*. | "Your corrections become ground truth, and Claude improves the algorithm against it. Every version is scored on your images, so you see exactly how good it is." |
| 6 | 0:58–1:15 | **[UI]** Image 2, then 3, sped up. Each time the outlines are closer to right; the verdicts come faster; fewer *add missed* clicks. A thin progress bar per image empties quicker each time. **[MG]** overlay: the loop circle turns once per image. | "And the next image is easier — the algorithm already got most of it right. Tagging gets faster as the algorithm gets better. You stop when you judge it's good enough." |
| 7 | 1:15–1:28 | **[UI]** Study Setup: *Batch run* over all images. Back in the main app: an image with its overlay beside the study's numbers — count, density, length histogram — a lasso around one region, and the numbers redraw for it. | "Then run it over the whole study. The numbers sit beside the image they came from: circle a region, the numbers follow; doubt an image, correct it." |
| 8 | 1:28–1:38 | **[MG]** An article page; a seal stamps it: *precision · recall · dataset SHA · frozen 2027-03-02*. A link opens the study, read-only, for a reviewer. | "When you submit, the ground truth freezes and the score is published with it. Reviewers can open your images and check the analysis themselves." |
| 9 | 1:38–1:45 | **[UI]** End card: rauntruth.com, "Runs in your browser. Your images stay on your Drive." Link to Video 1. | "RaunTruth. From your images to numbers you can defend." |

## Why this shape

- **Open on the pain, in the viewer's own terms** (beat 1–2): a count and a deadline, not a feature. Every PI has
  lived beat 2's three options; naming them earns the next minute and a half.
- **One idea, shown, not listed** (beat 3–6): the loop is the product. Beat 6 is the payoff the viewer must leave
  with: *each tagged image makes the next one faster*. Spend the most screen time there.
- **Credibility over hype**: the scores on screen are the page's real ones with their real caveat ("measured on N
  images"), never a made-up 98%. Scientists distrust a number with no denominator; the denominator is the pitch.
- **Speed through the UI**: beats 4 and 6 run at 2–4× with the cursor eased; the voice describes the meaning, the
  picture shows the action. No sign-in, no loading, no Drive dialogs here — those belong to Video 1.

## Visual language

- Real UI only where it is the argument (beats 4–7); motion graphics where the idea is abstract (the three
  options, the loop, the freeze seal); one or two seconds of real lab footage (a microscope, a slide) for
  recognition.
- The loop circle is the recurring motif, also used in Video 1's chapter cards.
- Overlay colours on the microscopy follow the page's own rule: never a colour the stain itself carries.

## Open for production

- The before/after timings in beat 6 must be real: record two actual tagging sessions (image 1, image 3) and show
  their own durations, or show no number.
- Beat 7 depends on the cross-image results view, the one part of PR 1036 still the owner's question (WP8); until
  it is decided, draw it from today's Summary box and its histograms.
