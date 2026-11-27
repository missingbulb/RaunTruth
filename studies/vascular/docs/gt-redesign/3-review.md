# Review: vessel ground truth tasks UI

The design is careful about the region walk, the three width statuses and undo, and better than today's flow on silence. In four places it is weaker than it looks. Width "Agree" is a reflex Enter on the algorithm's own number. The junction card gives the verdict but not the evidence behind it. "Nothing else missing" is an unguarded claim of coverage. The time estimate leaves out an honest free look. The design also reverses several of the owner's dated decisions without saying so (§5).

## 1. Pre-mortem: it failed six months in, why?

| # | Story | Likelihood | Prevention |
|---|---|---|---|
| 1 | **Widths echo the algorithm.** About 300 of 412 widths per stack are "looked", given by Enter about 2 s after the card shows. The truth's width distribution is the algorithm's. CATEGORIZE scores close to perfect for every version, and the owner only learns this when a new version that "improves" widths changes nothing. The 400 ms guard stops a held key, but not a reflex at 2 Hz. | High | Take Agree off Enter. For a blind sample per region (for example 3 vessels), hide the algorithm value and the fit, and have the person drag both edges. The output records `set-blind`. Score widths on the blind sample, and treat "looked" as a weak tier. |
| 2 | **Nobody knows where the edge is.** At 3 µm (about 6 px, at the resolution limit) the profile is just the point-spread function. One day the person puts the edges at half-maximum, another day at the foot of the curve. A helper does it a third way. Widths drift by about 1 µm between sittings, which is a whole caliber class. | High | Print the convention on the card and draw it, for example a horizontal half-max line the edges must meet. Mark widths below the resolution floor as such. The owner decides the convention (§6). |
| 3 | **F pressed without looking.** The free look is the only place missed vessels are found, and the ridge-filter candidates are deferred. After the 10th region, "Nothing else missing" comes about 5 s after the last suggestion. Coverage says "checked completely" where faint capillaries are missing, so missed vessels count as true absences. This is the worst kind of error, because the file claims it is valid. | High | Keep the faint candidates in v1. Do not offer F until the slices have been stepped through once, and show this as a `slices seen 22/22` line. Record the time spent and slices seen per region in the file, so the owner can audit coverage. |
| 4 | **The junction verdict is anchored.** The card prints `suggests crossing` and colours the arms with the algorithm's pairing, and C applies that pairing. The person agrees when in doubt. Crossings in the truth become the 3 µm depth heuristic. | Medium–high | Show the evidence (each arm's depth at the arm's end, a depth-coloured crop on hold), not the verdict. Draw the pairing only after C is pressed, or on Tab. Add **Can't tell** as an answer recorded on its own. |
| 5 | **Crossings arrive as two junctions.** Skeletons often turn a shallow-angle crossing into two 3-arm nodes joined by a link of a few µm. Each card asks about one node, and neither node is a crossing alone. The person answers Branch twice and COUNT goes up by 2 per crossing. | Medium–high | Precompute clusters of junctions closer than about 2 vessel widths, and ask about each cluster as one item. Crossing then removes the link and pairs the four outer arms. |
| 6 | **The owner rejects it, or it is built and then torn out.** The design reverses dated owner decisions: no "nothing missed" button (owner, 2026-11-07), no per-vessel tasks (replaced on 2026-11-07), the F/J key scheme for every study (2026-11-15), no Back (2026-11-15), the area map at top left, and the blackout. None of these is named as a departure, except the hatch. | High | Put each departure to the owner as its own question before building (§6). |
| 7 | **Keys collide on a Mac laptop.** On a MacBook the key labelled "delete" sends Backspace, which here is **Back**. "Not a vessel" (Del) needs Fn+delete. The person presses delete to reject, goes back instead, and then answers the previous card. Enter, the arrows, Backspace, K, N and P are also right-hand keys, although §2 promises left-hand keys only, so the hand leaves the mouse for every width. | Medium | Use letters only for verdicts, in the owner's F/J scheme or with X as "not a vessel" everywhere. Put Back on Shift+Space. Keep the arrows for fine adjustment only. |
| 8 | **The person never comes back.** An honest median stack takes about 2¼ h (§3), not 85 min. The first 30-minute sitting finishes 2 regions, Vessels is the biggest task, and graph-only regions are deferred from v1, so a sitting cannot end cleanly. After two stacks the person stops, and widths stay silent. | Medium–high | Keep graph-only regions in v1. Show the estimate per region, so a sitting can be planned. |
| 9 | **Border judgments are blind.** The hatch over done regions also covers the 15% margin (visible above B2 in the mockups), so arms that run into a done neighbour are hidden. Editing anything there asks `Reopen B2?`, and after the third dialog the person stops fixing border mistakes. | Medium | Hatch only inside a done region's own cell. Draw done neighbours' graph in the margin at 40%. Only a topology or existence change reopens a region, and it says why. |
| 10 | **A resumed draft meets a new model.** The algorithm is re-run (new version, new ids such as V-0388 and J-0147), and the draft's per-item verdicts point at items that no longer exist. Weeks of work are lost or silently misapplied. | Medium | Store verdicts on the corrected geometry, not the algorithm's ids. Key the draft to the model's hash, and refuse to resume, saying why. |
| 11 | **Cards wait.** The XZ strip, straightening and profile fit are computed per item in Pyodide, each card takes 300–800 ms, and the person starts pressing ahead of the card. | Medium | Compute every card of a region in a worker when the region opens. Show the next card from cache. |
| 12 | **Provenance cannot be read.** P draws "confirmed" in white on white vessels, and "untouched" in cyan, which is also the ordinary graph colour. | Low–medium | Use a provenance palette checked against the image (white is the image's own colour). |

## 2. Evidence for each decision

| Question | What a correct answer needs | On screen? |
|---|---|---|
| **Doubt** (keep / reject) | The vessel over its whole length, with both ends and where they connect. The raw signal without the dashed amber trace over it. Its depth extent, since faint vessels show in 2–3 slices. The local speckle for comparison. | Partly. A crop at ±4 slices and the contrast ratio. Hold 2 removes the trace. No slice stepping on the card, and nothing shows whether both ends meet vessels (a spur over speckle versus a bridge). Not mocked. |
| **Junction** (branch / crossing / cut) | Each arm's depth **tied to that arm**. Whether the arms of the proposed pair continue straight and at one depth. A view across the node in depth. Which arm Cut would cut. A way to say "I can't tell" when the depth difference is under axial resolution (about 2–3 µm). | **No.** `z 1·4·4·2` is not tied to arms, so the person has to map four numbers to four arms by angle and keep them in mind. The side strip in the mockup is speckle with no visible vessel. The pairing tint and `suggests crossing` give the answer without the reason. Cut defaults to the shortest arm, and Tab is deferred. There is no can't-tell answer, and Skip just brings the item back. The mock's depths (spread of 3) would not even pass the design's own >3 µm rule, yet the card says crossing. |
| **Gap suggestion** (accept / no) | The depths of both ends. The raw signal between them across slices. The result of accepting. | Not specified. §2.3 does not say what the card shows for a suggestion, only the dotted violet bridge in the main view. |
| **Free look** ("nothing else missing") | The raw image at an adjustable contrast. Every slice. Which parts and slices have been looked at. What the algorithm considered and dropped. | Partly. Raw at fixed full contrast, which in the mock blooms bright vessels and hides faint neighbours, and slice stepping. Nothing tracks what has been seen, and the candidates are deferred. "Slice 6 of 12" does not say whether the main view is now one slice or a flattened view. |
| **Width** | **The convention for the edge.** The vessel's full extent, so the person knows which segment is asked. A profile with a µm scale. Whether the profile mixes in a junction or bend. Variation along the vessel. The resolution limit. | Partly. The ring marks one point, not the 51 µm vessel. The profile in the mock has no tick labels, and its dashed edges are not centred on its peak (about 150 and 296 around a peak near 200). The straightened strip, which is the only along-vessel evidence, is deferred in v1. With the fit also deferred, the dashed lines sit at the algorithm's value, which is the strongest anchor possible. |

## 3. Body walk

Setup: a 27" monitor, the card at the far left and the ring in the main view about 250–350 mm to the right.

**One junction (clear case)**
1. Eyes jump from the glide's end in the main view to the card, about 300 mm with a head turn: 0.4 s. Taxing, because the item is shown twice and far apart.
2. Find the ring in the crop and count the arms: 2 fixations, 0.7 s. Fine.
3. Read `z 1·4·4·2` and map the numbers to arms clockwise from a start the card never states, holding 4 numbers: 1.5 s. Grueling.
4. Glance at the side strip: 0.5 s. Futile as mocked (no vessel visible).
5. Read `suggests crossing`: 0.3 s. Redundant and anchoring.
6. Left index finger stretches to B or C: 0.3 s. Fine.
7. 200 ms glide, then re-find the ring: 0.5 s. Taxing.

Total about 4.2 s when confident, matching the design's 4 s.

**Bad path, unsure (depth gap near 3 µm, about 25% of 4-arm junctions):** R is deferred, so Esc, move the mouse to the main view, drag to turn, find the junction again among the turned lines, decide, turn back or not, click the card, press C. That takes 15–25 s and is grueling. The undo goes back to the card, which is fine.

**Bad path, wrong answer (B pressed for a crossing):** Backspace brings the card back with its verdict shown, then C. About 2 s, fine, except on a Mac (story 7).

**One width**
1. Eyes to the card: 0.4 s. Taxing.
2. Read the facts line, which wraps onto two lines in the mock: compare the algorithm's 3.4 with the fit's 3.3, two numbers 30 mm apart: 0.8 s. Taxing.
3. Check that the dashed edges meet the curve where the convention says, which it never states: 0.6 s. Futile without the convention.
4. A "last existence and geometry check" needs the vessel in the main view. Find the ring, trace 51 µm along a vessel that is not highlighted, and check its ends: 1.5–2 s. Taxing. The design leaves this time out.
5. Right hand leaves the mouse for Enter (or the left hand crosses over): 0.4 s. Taxing, against the design's own rule.
6. Glide and re-find: 0.5 s.

Total about 4.5 s honest, against the design's 2.5 s. An adjusted width (four taps or a drag, plus a re-look after each) takes 10–14 s. "Can't tell" has no key, so Space records silent, which is the honest choice but leaves the region unable to close. An interruption mid-card returns to that exact card (fine). An undo after three later Enters moves the card back, but the person has to remember what was wrong, and the status line names only the last action.

**Free look (one 165 µm region, 22 slices)**
1. Read the paragraph of instructions, about 40 words: 4 s, only the first time. Redundant afterwards.
2. Scan the flattened region in a raster: about 20 fixations, 15 s.
3. Step through 22 slices with "." at about 2–3 s each, comparing each to memory: 50–65 s. Grueling, because memory of "where was something faint" is cleared at every slice.
4. Draw one missed vessel: right-click, about 4–6 clicks along a faint curve, snap the end: 15–25 s.
5. Press F: 0.3 s.

Total 1.5–2.5 min honest, against the design's 45 s. The futile path is pressing F at step 1, which costs nothing and leaves no trace.

**Re-summing §6 with these step times:** doubts 110 × 5 s = 9 min; junctions 168 × about 7 s (including the unsure share) = 20; suggestions 5; drawing 30 × 20 s = 10; free look 16 × 2.5 min = 40; widths 412 × (0.75 × 4.5 + 0.25 × 12) = 44; geometry 5; region overhead 4. **About 135 min for the median stack, against the claimed 85; the largest stack is about 3 h.** These are built from textbook seconds, not measured. The cheapest test should time the free look and the honest width card, not only the clean ones.

## 4. Mockups compared with the text, and visual problems

- **Start cell versus order.** The start mock suggests B1, the cell with the most vessels. The later mocks show the A row, B4 and B3 done and B2 as "region 7 of 16", which is the snake from A1. Either the suggested start is ignored or the numbering misleads. Decide: the snake runs from wherever the person starts, and "region n" counts in work order.
- **Counts disagree.** The cell labels' doubts add up to 15, but the list says 24. Their vessels add up to 217, but Segments is 197 and the status line says 212 vessels.
- **The junction crop does not match the main view.** The crop shows a clean X, while the main view at the ring shows a different-looking node at the region's bottom edge. The camera is also not centred on the item as §2 says, which is actually better (less motion), but then the text should say so.
- **Colours are reused.** The pairing tints yellow and violet are also the Junctions and Gaps task colours. Amber #FFB020 and yellow #F5E050 cannot be told apart in the 4 px progress segments. The yellow arm over a white glowing vessel has low contrast. Cyan is used for the graph, the width edge lines and "untouched" in provenance. Magenta is today's "algorithm width, nobody checked", and it becomes the current-item ring here.
- **The cut-out hides the margin**, and the ✓ is about 60 px, not "small".
- **The 280 px bar is crowded.** The chips wrap onto two rows. The widths facts line wraps. In the junction mock the Summary box and Save Draft are pushed below the fold. The Image, Analysis, Execute and "How the analysis works" boxes take about 270 px above the tasks during tagging.
- **The free-look mock** still draws a refused trace (dotted violet, lower left), and the full-contrast stretch blooms bright vessels.
- **The minimap** sits at bottom right, overlapping the region, while the owner's rule puts the area map at top left.

## 5. Owner decisions the design overturns without naming them

The owner's own decision record (`req/vascular/truth/tasks`, `req/vascular/truth/keys`) says:

- no "nothing missed" button, and no ending the junctions apart (2026-11-07);
- one pass per area, replacing both the three-step and the vessel-by-vessel tasks;
- F/J positional verdict keys for every study (2026-11-15);
- no Back;
- the area map at top left;
- a blackout through every slice.

The design may well be right on several of these, and the brief asks that silence never count as agreement, which today's "These widths look right" breaks. But each is the owner's call, not a build detail.

## 6. Ranked changes

1. Put each overturned owner decision (§5) to the owner as its own question before any build.
2. Widths: take Agree off Enter. Add a blind edge-drag sample per region that the scoring rests on. Ask each vessel only where it is flagged (fit and algorithm disagree, double wall, over 5 µm).
3. Print and draw the width-edge convention on the profile, with µm ticks and the resolution floor marked.
4. Junction card: label each arm's depth at its arm end, offer a depth-coloured crop on hold, drop the `suggests crossing` text and the pre-drawn pairing, and add **Can't tell** as a recorded answer.
5. Ask about clusters of close junctions as one item, so a crossing split into two nodes is caught.
6. Keep the faint candidates in v1. Offer F only after every slice has been seen, and record dwell time and slices seen per region in the file.
7. Keep graph-only regions in v1, so a 30-minute sitting ends on valid truth.
8. Verdicts on letter keys only, with no Enter, Delete or Backspace as verdicts. Use the F/J scheme or X for "not a vessel" everywhere.
9. Highlight the whole current vessel (or every arm of the junction) in the main view, and keep the camera still within a region.
10. Hatch only a done cell's own area. Show the neighbours' graph in the margin. Reopen only on existence or topology changes.
11. Tagging layout: collapse the boxes above the tasks, keep the chips on one row, keep the facts line on one line and keep Summary visible. Use a palette with task colours never reused for marks, checked against white vessels.
12. Re-estimate at about 2¼ h per median stack, and extend the paper test to time the free look and a blind width sample.

## Decisions only the owner can make

1. **Reverse the 2026-11-07/15 decisions?** An explicit "nothing else missing" claim, per-item tasks with Back, and new keys instead of F/J.
2. **What width truth is.** Where the edge sits, whether widths below resolution are measured by a person at all, and whether a blind sample replaces asking about every vessel ("looked" then being a weak tier).
3. **Coverage tiers.** Whether a graph-only region counts as ground truth for COUNT and MEASURE, and whether "can't tell" junctions are left out of scoring.
4. **The cut-out style:** the hatch in place of the blackout.
