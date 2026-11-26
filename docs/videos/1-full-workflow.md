# Video 1 — "A study, start to publication" (the walkthrough)

**Job:** show a researcher who has decided to try RaunTruth every action of a study, in order, so they can do it
themselves. It is a how-to, watched with a purpose and often paused; each chapter stands alone and is published
as its own clip as well as in the whole, chaptered.
**Tone:** documentary: unhurried camera moves onto the control in use, a light piano bed, a soft tick for each press.
**Length:** whatever its moments take (see [how a scene is built](README.md#how-a-scene-is-built)). A how-to moment is
an action the viewer must be able to repeat, so most are carried by both: the picture shows where the control is and
what it does, while the voice names it and says why. The Camera and Sound columns are direction for the edit.
**Status:** not made yet; it waits on the UI of PR 1036, which it shows.

The UI is the design in PR 1036 (`dev/requirements/study-stages-map.md`, `study-stages-spec.md`): two apps (the
main app and **Study Setup**), five stages (**Setup → Develop → Analyze → Review → Public**), one store of
extractions, GT and official marks. It is drawn as the page will look, not pixel-exact. **[UI]** is a screen
capture, **[MG]** a motion graphic, **[B]** real-world footage or illustration, **[C]** the chat with the AI software engineer, never named as a product. A stage
ribbon (the five stages, the current one lit) sits in a corner throughout, and each chapter opens on a card.

## 0. The map

### 0.1 What a study is

**Conveys:** where this goes, and that you can jump to your part.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the whole journey | both | 4 | **[B]** A slide under a confocal microscope; **[MG]** images fly into a folder, then the page, then out as a table and an article. | `push@50,45` slow | "This is a study in RaunTruth: from the microscope to numbers you can publish, with the ground truth that proves them." | `bed:doc-warm` `sfx:whoosh` |
| five stages | both | 3 | **[MG]** The stage ribbon draws itself, each pill labelled with its chapters. | `pull` | "It moves through five stages. Jump to the one you need." |  |

## 1. Set up the study's Drive · stage: Setup

### 1.1 The images go to Drive

**Conveys:** the study is one Drive folder; your images go in its Data folder, organised as you already do.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| from the microscope | both | 2.5 | **[B]** TIFFs exported from the microscope software onto a laptop. | `push@50,45` slow | "Your images start where they always do: off the microscope." | `bed:doc-light` |
| one folder per study | both | 3 | **[UI]** Google Drive: the study folder holding `Data`, `Previews`, `extractions` and the study file. | `drift` | "Make one Drive folder for the study." |  |
| drop into Data | both | 3 | The TIFFs dragged into `Data`, into sub-folders per animal. | `drift` | "Put the images in its Data folder, organised however your lab already does." | `sfx:whoosh` |

### 1.2 Study Setup

**Conveys:** Study Setup is the owner's app, and the first thing it does is make previews.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| where it opens | both | 2.5 | **[UI]** The site, signed in: profile menu → **Study Setup…**. | `push@18,32` onto the control | "Open Study Setup from your profile menu. It's where the study's owner works." |  |
| add the folders | both | 2.5 | Study Setup: **+ Add folder** on `Data/A1`, `A2`, `A3`. | `push@18,32` onto the control | "Add the image folders." |  |
| previews appear | both | 3 | **Make previews**: thumbnails fill in one by one. | `pull` as the thumbnails fill in | "It makes a light preview of every image, right in your browser." |  |

### 1.3 Who can read what

**Conveys:** the study itself stays private; only the image folders are readable by link, so the analysis can reach them.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the root is private | both | 2.5 | **[MG]** The study folder with a lock: *members only*. | `pull` | "The study folder is shared only with your members." |  |
| the folders are linked | both | 3 | Link icons light on `Data`, `Previews`, `extractions`. | `still` | "The image folders can be read by link, so the analysis can reach them, without opening the study." |  |

## 2. Describe the images · stage: Setup

### 2.1 Tags and grouping

**Conveys:** tags carry your experimental design, and folder tags reach every image in the folder.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| tag a folder | both | 3 | **[UI]** Tags box: on folder `A3`, add `animal: A3`, `condition: 4-AP`. | `push@18,32` onto the control | "Tag folders with what matters to your study: animal, condition, region." |  |
| images inherit | both | 2.5 | The twelve thumbnails under `A3` gain the tags. | `push@70,60` onto the A3 thumbnails | "A folder's tags apply to every image in it." |  |
| group by a tag | both | 3 | *Grouping tag*: `condition`; the main app's image list regroups into control and 4-AP. | `push@18,32` onto the control | "Pick one tag to group the study's image list by." |  |

### 2.2 Hiding images

**Conveys:** unusable images can be set aside for everyone with one rule.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| a hide rule | both | 3 | **[UI]** Hide rules: `quality: blurry`; two thumbnails fade with *hidden*. | `push@18,32` onto the control | "Images you don't want analysed are hidden by a tag, for everyone." |  |

### 2.3 Where to count, and where not

**Conveys:** areas of interest and damaged areas change what is counted, so they are marked before anything runs.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| area of interest | both | 3 | **[UI]** On one image, a polygon drawn round the corpus callosum. | `push@62,48` onto the image | "Mark the area of interest: where to count." |  |
| damaged area | both | 3 | A hatched polygon over a fold in the tissue. | `push@62,48` onto the image | "Mark where the tissue is damaged. The algorithm is told about it, and the numbers leave it out." |  |

### 2.4 Choosing images for ground truth

**Conveys:** ground truth should span your conditions.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| needs GT | both | 3 | **[UI]** **Needs GT** ticked on four images: two animals, both conditions; a *GT* badge on each. | `push@18,32` onto the control | "Pick a few images for ground truth, across your animals and conditions." | `sfx:tick` |

## 3. Literature and people · stage: Setup

### 3.1 The papers

**Conveys:** the study's method is grounded in its literature, and the agent keeps it.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| hand over the papers | both | 3 | **[C]** Two PDFs dropped into a chat with the AI software engineer: "Add these to the study's literature." | `drift` | "Give your AI software engineer the papers your method rests on." |  |
| what it keeps | both | 3.5 | The agent's reply lists what it wrote: what counts as a node, how length is measured, values to check against. | `drift` | "It writes a summary of each into the study: the definitions your algorithm must follow." | `sfx:typing` |

### 3.2 Members

**Conveys:** membership is Drive sharing, and the page shows it.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| people | both | 3.5 | **[UI]** Study Setup, **People**: you *manages*, Dana *annotates*, Omer *sees*, each with a Drive link. | `push@18,32` onto the control | "Members are whoever you share the study with in Drive. People shows who sees, who annotates and who manages." |  |

### 3.3 The sharing check

**Conveys:** the page checks sharing for you and changes it only when you say so.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| a correction | both | 3 | **[UI]** **Sharing check**: *Previews is not readable by link*, with a picture of Drive's dialog. | `push@18,32` onto the control | "Study Setup checks the sharing against what this stage needs." |  |
| fix | both | 2.5 | **Fix**, confirm; it clears: *Sharing is as this stage needs*. | `push@18,32` onto the control | "It changes it only when you press Fix." | `sfx:tick` |

## 4. The first draft · stage: Setup → Develop

### 4.1 Ask for a rough algorithm

**Conveys:** the start is cheap: the agent drafts both a computer-vision algorithm and the tools to correct it, with nothing to train.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the ask | both | 3 | **[C]** "Write a rough first algorithm for this study and the ground-truth tools to correct it." | `drift` | "Now ask for a rough draft: an algorithm, and the tools to correct it." |  |
| what comes back | both | 4 | The agent's plan, then a pull request: algorithm `v1`, labelled *computer vision · no training data*, its scorer, the ground-truth tasks. | `drift` | "It writes computer vision, not machine learning, so there's nothing to train. It won't be good yet. It doesn't need to be." | `sfx:typing` |

### 4.2 Promote to Develop

**Conveys:** the stage popup tells you when you are ready; promoting is your call.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the gate | both | 3 | **[UI]** The stage popup: *✓ inputs marked · ✓ an annotation tool works*. | `push@18,32` onto the control | "When the images are marked and the tools work," |  |
| promote | both | 2 | Study Setup: **Promote to Develop**; the ribbon lights *Develop*. | `push@18,32` onto the control | "promote the study to Develop." | `sfx:chime` |

## 5. The double loop · stage: Develop

### 5.1 Start annotating

**Conveys:** annotation starts from the algorithm's answer, by your choice.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| pick an image | both | 2.5 | **[UI]** Load study images → an image with the *GT* badge. | `push@18,32` onto the control | "Load an image that needs ground truth." |  |
| three ways in | both | 3.5 | The left bar asks: *Continue local work · Load from Drive · Start annotating from scratch*. | `push@18,32` onto the control | "The page asks how to start. Choose from scratch," |  |
| run the draft | both | 2.5 | The Processing box appears; **Run** `v1`; faint outlines over the image. | `push@18,32` onto the control | "and run the draft algorithm." |  |

### 5.2 One item at a time

**Conveys:** how a verdict is given, and that the image itself shows what is left.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the task list | both | 3 | **[UI]** Ground Truth Tasks: *13/47 Finalists · 0/22 Rejected · Missed*. | `push@18,32` onto the control | "The tasks list what the algorithm found, what it rejected, and what it may have missed." |  |
| one item | both | 3 | The current item full width under its task, ringed on the image; **Approve**. | `push@62,48` onto the image | "You review one item at a time. Approve," | `sfx:tick` |
| or reject | both | 1.5 | The next item slides in; **Reject**. | `still` | "or reject." | `sfx:tick` |
| area by area | both | 3 | The walk frames one area; decided items are hidden. | `push@62,48` onto the image | "You go area by area, and what's done is hidden, so you only see what's left." |  |
| what it missed | both | 3 | A click on an unmarked node adds it; **No missed nodes here**; the area is hidden. | `push@62,48` onto the image | "Add what it missed, then close the area." | `sfx:pop` |
| the rest | picture | 3 | Sped up, 4×: done areas hidden one after another across the image. | `pull` back to the whole image |  | `sfx:ticks` |

### 5.3 Save, and mark ground truth

**Conveys:** your work is kept safely, and the owner's mark is what makes it ground truth.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| save | both | 2.5 | **[UI]** **Save** → *Saved*. | `push@18,32` onto the control | "Save, and your annotation goes to the study's Drive." | `sfx:tick` |
| offline | both | 2.5 | Offline: Save shows *1 waiting to upload*; online again, it clears. | `drift` | "If the connection drops, it waits on your device." |  |
| mark GT | both | 3 | Study Setup: the image's extractions; **Mark GT** on Dana's. | `push@18,32` onto the control | "The owner marks it as ground truth." | `sfx:tick` |

### 5.4 The agent improves it

**Conveys:** the improvement is measured on your ground truth, guided by you or not, and the tagging tools grow too.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the ask | both | 3 | **[C]** "Improve the algorithm on the new ground truth." | `drift` | "Ask your AI software engineer to improve the algorithm on the new ground truth." |  |
| scored | both | 4 | The agent's reply: the lab scored every version; `v2` ahead; a figure of `v2` against your marks. | `drift` | "It brings its own methods, and a lab that scores every version against your marks and keeps what's better." | `sfx:typing` |
| a nudge helps | both | 3.5 | A one-line nudge, *"follow the fibre, not the blob"*, and the lab runs again by itself. | `drift` | "Point it in a direction if you have one. If not, it finds its own." | `sfx:ticks` |
| tools too | both | 4 | **[UI]** Image 1's item box: *Yes · No · Missed one*; after the change, image 2's: *Widen this node · Lower the curvature*, with handles on the node. | `push@18,40` onto the item box | "The tagging tools grow too. At first you answer yes or no. Next time, you widen this node, or lower its curvature." | `sfx:pop` |
| on the page | both | 3 | **[UI]** The algorithm list: `v2` and `v1` with precision and recall, *measured on 1 image*. | `push@18,32` onto the scores | "Every version shows its score, and on how many images." |  |

### 5.5 Around again

**Conveys:** each turn is quicker, and stopping is your judgement.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the next image | both | 3 | **[UI]** Image 2 with `v2`: fewer wrong outlines, the walk faster. | `push@62,48` onto the image | "The next image is quicker, because the algorithm already gets more of it right." |  |
| faster each time | picture | 3 | **[MG]** Tagging-time bars for images 1 to 3, each shorter. *Illustrative.* | `pull` |  |  |
| you decide | both | 3 | `v4`'s overlay; the stage popup: *Annotate: 1 image still needs it*. | `push@18,32` onto the control | "There's no magic threshold. You judge when it's good enough," |  |
| promote | both | 2 | **Promote to Analyze**; the ribbon lights *Analyze*. | `push@18,32` onto the control | "and promote the study to Analyze." | `sfx:chime` |

## 6. Analyze the whole study · stage: Analyze

### 6.1 Batch run

**Conveys:** the whole study is processed in one action, resumably, and its results become official.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| choose and run | both | 3 | **[UI]** Study Setup, **Batch run**: `v4`, all 12 images; thumbnails tick done. | `push@18,32` onto the control | "Run the chosen algorithm over every image." | `sfx:whoosh` |
| resumes | both | 2.5 | A stop, then a click: *3 skipped, already done*. | `drift` | "A stopped batch picks up where it left off." |  |
| official | both | 2.5 | **Mark all official**. | `push@18,32` onto the control | "Mark the batch official." | `sfx:tick` |

### 6.2 Correct an image

**Conveys:** any single result can be corrected, and the correction becomes the answer.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| open the result | both | 3 | **[UI]** Main app: **Load from Drive** → the official extraction, read-only. | `push@18,32` onto the control | "Doubt an image? Open its result," |  |
| correct it | both | 3 | **Edit this annotation**; two nodes fixed; **Save**; marked official. | `push@18,32` onto the control | "correct it, and your correction becomes its answer." | `sfx:tick` |

### 6.3 The study's numbers

**Conveys:** the numbers come out grouped by your design, ready for statistics.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| the table | both | 3.5 | **[UI]** Results: per-image count, density and length, grouped by condition. | `drift` | "The study's numbers, for every image, grouped by your tags," |  |
| download | both | 2 | **Download table**. | `push@18,32` onto the control | "ready for your statistics." |  |

## 7. Submit, review, publish · stage: Review → Public

### 7.1 Freeze at submission

**Conveys:** submission freezes the ground truth and publishes a reproducible score.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| before the freeze | both | 3 | **[UI]** Study Setup: *3 images have edits newer than their GT*, resolved one by one. | `drift` | "Before you submit, Study Setup shows anything not yet marked." |  |
| freeze | both | 2.5 | **[MG]** The manuscript into an envelope; **Freeze**. | `pull` | "Then freeze the study." | `sfx:stamp` |
| the stamp | both | 4 | **[MG]** The score's stamp: *v4 · dataset SHA 768c… · frozen · GT commit*. | `pull` | "The ground truth is committed, and the score is published with its stamp: which version, which ground truth, when." | `sfx:stamp` |

### 7.2 Reviewers

**Conveys:** reviewers check the analysis themselves, with no account.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| share by link | both | 2.5 | **[UI]** Sharing check: *Share the root by link* → **Fix**. | `push@18,32` onto the control | "Share the study by link," | `sfx:tick` |
| a reviewer opens it | both | 3 | **[B]** A reviewer, signed out, opens the link: images, overlays, numbers. | `push@50,45` slow | "and reviewers open it with no account, and check the analysis themselves." |  |

### 7.3 Public

**Conveys:** after acceptance the study is open to everyone, including running it on their own images, privately.

| Moment | By | Hold | Picture | Camera | Voice | Sound |
|---|---|---|---|---|---|---|
| accepted | both | 2.5 | **[MG]** The envelope returns: *Accepted*. **Promote to Public**; the article link appears in the header. | `pull` | "Once the article is accepted, make the study public." | `sfx:chime` |
| anyone, their own images | both | 4 | **[UI]** A visitor opens their own image from their computer; the algorithm runs; **Download result**. | `push@18,32` onto the control | "Anyone can run your algorithm on their own images, in their own browser, with nothing uploaded." |  |
| end | both | 2.5 | End card: the five stages, and the pitch video. | `drift` | "That's a study, start to finish." | `bed:doc-warm` `sfx:chime` |

## Notes the storyboard follows from the spec

- **The freeze is at Review, not at publication.** Freezing at submission is what makes the reviewed numbers the
  published ones; Public only lists the study.
- **"Run on your own images", not "upload":** the image never leaves the visitor's device and nothing is saved to
  Drive; the video must say so, because it is a privacy promise.
- **Develop and Analyze differ by purpose**: in Develop annotations score the algorithm, in Analyze corrections are
  the study's answer. The stage ribbon and the voice should keep that distinction visible.
- **The cross-image results view** (6.3) is still the owner's open question in PR 1036 (WP8); record it once
  decided.
