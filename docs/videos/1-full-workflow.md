# Video 1 — "A study, start to publication" (the walkthrough)

**Job:** show a researcher who has decided to try RaunTruth every action of a study, in order, so they can do it
themselves. It is a how-to, watched with a purpose and often paused, so it may be longer than the pitch, but
each chapter must stand alone: it is published as **one clip per chapter** (40–110 s each, one task each) and
as the whole, chaptered.
**Length:** about 7:30 in all. **Voice:** ~140 words a minute, about 1,000 words.
**Opens** with a 15-second promise and a chapter map, so a lab manager can jump to *Set up*, a student to
*Annotate*, a PI to *Analyze* and *Publish*.

The UI is the design in PR 1036 (`dev/requirements/study-stages-map.md`, `study-stages-spec.md`): two apps (the
main app and **Study Setup**), five stages (**Setup → Develop → Analyze → Review → Public**), one store of
extractions, GT and official marks. It is drawn as the page will look, not pixel-exact. **[UI]** is a screen
capture, **[MG]** a motion graphic, **[B]** real-world footage or illustration, **[C]** the Claude chat.

A **stage ribbon** — the five stages as a row of pills, the current one lit — sits in a corner throughout, and
each chapter opens on a card with the loop motif from Video 2.

## 0. Cold open and map — 0:00–0:20

| Picture | Voice / text |
|---|---|
| **[B]** Slide into a confocal microscope; images land as files. **[MG]** They fly into a folder, then into the page, then out as a table and a published article. | "This is a whole study in RaunTruth: from the microscope to numbers you can publish, with the ground truth that proves them." |
| **[MG]** The stage ribbon draws itself; each pill names its chapter and timestamp. | "Five stages. Jump to the one you need." |

## 1. Set up the study's Drive — 0:20–1:20 · stage: Setup

| Picture | Voice / text |
|---|---|
| **[B]** Images exported from the microscope software onto a laptop. | "Your images start where they always do: off the microscope." |
| **[UI]** Google Drive: one study folder (the root) holding `Data` with sub-folders per animal or slide, `Previews` and `extractions`. Drag the TIFFs into `Data`. | "Make one Drive folder for the study and put the images in its Data folder, organised however your lab already does." |
| **[UI]** The site, signed in. Profile menu → **Study Setup…**. Study Setup opens on the study, online, plain image view. Add the `Data` folders; **Make previews** runs, thumbnails fill in. | "Study Setup is where the study's owner works. Add the folders, and the page makes a light preview of every image, right in your browser." |
| **[MG]** Lock icon on the root, link icons on `Data`, `Previews`, `extractions`. | "The study folder is shared only with your members. The image folders can be read by link, so the analysis can reach them — the root stays private." |

## 2. Describe the images — 1:20–2:30 · stage: Setup

| Picture | Voice / text |
|---|---|
| **[UI]** Study Setup, Tags box: tag a folder `animal: A3`, `condition: 4-AP`; an image inherits them. Type a one-line description. Pick `condition` as the grouping tag; **Load study images** in the main app now groups by it. | "Tag folders and images with what matters to your study — animal, condition, region. A folder's tags apply to every image in it, and the study's image list groups by the tag you choose." |
| **[UI]** A hide rule: `quality: blurry` hides those images from everyone. | "Images you don't want analysed can be hidden by a tag." |
| **[UI]** On one image, draw the **area of interest** (a polygon round the corpus callosum); then a **damaged area** over a fold in the tissue, hatched. | "Mark where to count — the area of interest — and where the tissue is damaged. The algorithm is told about damage, and the numbers leave it out." |
| **[UI]** Tick **Needs GT** on four images spanning the conditions. | "Pick a few images for ground truth: different animals, different conditions." |

*Edit note:* the tagging is repetitive; show one of each action at speed, then a 2-second time-lapse of the rest.

## 3. Literature, members and permissions — 2:30–3:30 · stage: Setup

| Picture | Voice / text |
|---|---|
| **[B]** A stack of PDFs. **[C]** Drop two papers into a Claude session: "Add these to the study's literature." A Markdown summary appears: the method, its parameters, what counts as a node. | "Give Claude the papers your method rests on. It writes one summary of each into the study — the definitions and measurements your algorithm must follow." |
| **[UI]** Study Setup, **People**: three rows — *sees*, *annotates*, *manages* — each with a link to Drive's own sharing dialog. A second student is added in Drive; the row appears. | "Members are whoever you share the study with in Drive. People shows who can see, who can annotate, who can manage." |
| **[UI]** **Sharing check**: one correction, *"Previews is not readable by link"*, with a picture and a **Fix** button. Press, confirm, it clears: *"Sharing is as this stage needs."* | "Study Setup checks the sharing against what this stage needs, and fixes it only when you press Fix." |

## 4. The first draft — 3:30–4:10 · stage: Setup → Develop

| Picture | Voice / text |
|---|---|
| **[C]** "Write a rough first algorithm for this study and the ground-truth tools to correct it." Claude answers with a plan, then a pull request: the algorithm, its scorer, the tasks for tagging. | "Now ask Claude for a rough draft: an algorithm that tries, and the tools to correct it. It won't be good yet — it doesn't need to be." |
| **[UI]** Main app: the algorithm list shows `v1` with no numbers yet. The stage popup lists the gate: *inputs marked ✓, an annotation tool works ✓*. Study Setup → promote to **Develop**. | "When the images are marked and the tools work, promote the study to Develop." |

## 5. The double loop — 4:10–6:00 · stage: Develop

The heart of the video, and the bridge to Video 2. The loop motif turns once per pass.

| Picture | Voice / text |
|---|---|
| **[UI]** Load study images → a *Needs GT* image. The left bar asks: *Continue local work · Load from Drive · Start annotating from scratch*. Choose **from scratch**; the Processing box appears; run `v1`. Faint outlines over the image. | "Load an image that needs ground truth and start annotating. Run the draft algorithm." |
| **[UI]** Ground Truth Tasks: *13/47 Finalists · 0/22 Rejected · Missed*. One item at a time, full width, **Approve / Reject**; the walk frames one area, decided items cut to black; *No missed nodes here*; next area. Real speed for 5 s, then 4×. | "You review one item at a time, area by area. Approve, reject, add what it missed. What's done is cut out of the image, so you always see what's left." |
| **[UI]** **Save**: "Saved". A count beside Save shows images waiting when offline. | "Save. Your annotation goes to the study's Drive — and if you lose the connection, it waits on your device." |
| **[UI]** Study Setup: the image's extraction list → **Mark GT**. | "The owner marks it as ground truth." |
| **[C]** "Improve the algorithm on the new ground truth." Claude runs the lab, scores every version; reply: `v2`, precision and recall up, a figure of what it found against your marks. Optional: "the reject button is too far from the image" → a tools change. | "Claude improves the algorithm against your ground truth — and, if you ask, the tagging tools too." |
| **[UI]** Main app: the algorithm list now shows `v1` and `v2` with precision and recall, *measured on 1 image*. | "Every version carries its score, on your images, with how many images it was measured on." |
| **[UI]** Image 2, run `v2`: fewer wrong outlines; the walk goes faster. Mark GT, ask Claude, `v3`. Speed-ramped. | "Then the next image — and it's quicker, because the algorithm already gets more of it right." |
| **[UI]** The stage popup: *Annotate: 1 image still needs it*. The owner looks at `v4`'s numbers and the overlay, and promotes to **Analyze**. | "You decide when it's good enough. There's no magic threshold — you judge." |

## 6. Analyze the whole study — 6:00–6:50 · stage: Analyze

| Picture | Voice / text |
|---|---|
| **[UI]** Study Setup, **Batch run**: choose `v4`, all images; progress per image; already-done images skipped. **Mark all of this batch official**. | "Run the chosen algorithm over every image. A stopped batch picks up where it left off." |
| **[UI]** Main app, an image the PI doubts: *Load from Drive* → the official extraction, read-only → **Edit this annotation** → fix two nodes → Save → marked official. | "Doubt an image? Open its result, correct it, and your correction becomes its answer." |
| **[UI]** The study's results: per-image counts, density and lengths, grouped by condition, with **Download table**. | "The study's numbers, for every image, grouped by your tags — ready for your stats." |

*Production note:* the cross-image results view is still the owner's open question in PR 1036 (WP8); record this
beat once it is decided.

## 7. Submit, review, publish — 6:50–7:30 · stage: Review → Public

| Picture | Voice / text |
|---|---|
| **[MG]** A manuscript slides into an envelope. **[UI]** Study Setup: *3 images have edits newer than their GT* → resolved → **Freeze**. **[C]** Claude runs the freeze: the ground truth is committed and the official score published. | "When you submit, freeze the study. The ground truth is committed, and the algorithm's score is published on it." |
| **[UI]** The score with its stamp: *v4 · dataset SHA 768c… · frozen 2027-03-02 · GT commit*. Sharing check: *Share the root by link* → Fix. | "Every published score carries its stamp: which version, which ground truth, when." |
| **[B]** A reviewer at home, signed out, opens the study's link: the images, the overlays, the numbers. | "Reviewers open your study by its link — no account — and check the analysis themselves." |
| **[MG]** The envelope comes back with *Accepted*. **[UI]** Study Setup → **Public**. The study now appears in the switcher; the header shows the article link. A visitor opens *their own* image: the algorithm runs in their browser and they download the result. | "Once the article is accepted, make the study public. Anyone can see your images and analysis, and run your algorithm on their own images — in their own browser, nothing uploaded." |
| **[UI]** End card: links to Video 2 and to the help. | "That's a study, start to finish." |

## Notes the storyboard follows from the spec

- **The freeze is at Review, not at publication.** Freezing at submission is what makes the reviewed numbers the
  published ones; Public only lists the study.
- **"Run on your own images", not "upload":** the image never leaves the visitor's device and nothing is saved to
  Drive; the video must say so, because it is a privacy promise.
- **Develop and Analyze differ by purpose**: in Develop annotations score the algorithm, in Analyze corrections are
  the study's answer. The stage ribbon and the voice should keep that distinction visible.
