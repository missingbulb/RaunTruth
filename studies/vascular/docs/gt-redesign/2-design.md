# Vessel ground truth: tasks UI design

## 0. The shape in one paragraph

The stack is walked **region by region** on a grid (default 4×4, so cells are 165 µm, about 300 × 300 px,
holding about 25 vessels and 10 junctions each). Inside a region the person does four short tasks in a fixed
order: **Doubts → Junctions → Gaps & missed → Vessels**. The first, second and fourth are per-item: one
item in the left bar, verdict keys under it, auto-advance. The third is a broad look over the region, driven by a
short list of precomputed suggestions and closed by an explicit "nothing else missing". When all four are done the
region is **cut out** of the image and the camera moves to the next one. Coverage is recorded in two layers per
region, **Graph checked** (existence, geometry, topology) and **Widths checked**, so a stack with all graphs checked
but half the widths is still valid ground truth for COUNT and MEASURE.

## 1. Unit and order of work

### Why this order inside a region

1. **Doubts** (per-item): every low-confidence vessel, plus confident vessels the algorithm flags as *suspect*
   (terminal spur under 10 µm, a trace running parallel to another within one vessel width, mean contrast within
   1.5× the local speckle). Deleting wrong vessels first removes the false junctions they create, so the
   junction task is shorter and cleaner.
2. **Junctions** (per-item): every junction still standing: branch, crossing, or a wrong link to cut. Topology
   must be settled before widths, because a split or a join changes which segments exist.
3. **Gaps & missed** (broad look with suggestions): breaks to join, tips to attach, faint vessels to draw, then
   a free look over the region. Done after junctions so the person reads a clean graph and sees what is absent.
4. **Vessels** (per-item): each final segment once: width verdict, and a last existence and geometry check.
   This is the only pass that visits every confident vessel, so existence of confident vessels rides on it at no
   extra visit (the Delete key is on this card too).

### Per stack

- **Start**: choose the grid (3×3, 4×4, 6×6), then start at the suggested cell (the one with the most vessels,
  so the person calibrates on a rich region while fresh) or click any cell.
- **Per region**: the four tasks, then **Region complete**. Next region is the nearest unfinished one, sideways
  first (snake order A1→A4, B4→B1…), so borders the person just saw are fresh.
- **Ownership**: an item belongs to the region holding its midpoint (vessel) or its position (junction, tip). The
  region view shows a 15% margin of neighbours so border-crossing vessels are seen whole; items in the margin are
  drawn but not asked about.
- **Last**: a stack-level **Final check** lists anything silent or skipped, then Upload.

The person may also run **Graph only** for a region (tasks 1–3) and leave Widths for later; the region then shows as
half-cut (see §3). This keeps a 30-minute sitting productive.

## 2. Every question, on screen

Common to all per-item tasks:

- **Left bar card**: a 256 × 256 px crop of the current item, flattened over a local depth window (item depth ±4
  slices), graph drawn thin, current item ringed in **magenta #FF2BD6** (a hue the grey image never carries).
  Under the crop, one facts line and the verdict buttons, each labelled with its key.
- **Main view**: the region, 2D flattened by default, camera centred on the item, same magenta ring. Verdict →
  the item fades to its decided style, the camera glides (200 ms) to the nearest undecided item of the same task.
- **Space = Skip** (item stays undecided, comes back at the end of the task's queue, recorded as nothing).
  **Backspace = Back** to the previous item (its verdict shown, can be changed). **Esc** releases the card so the
  person can edit freely in the main view; **Enter** on an empty card returns to it.
- Number keys stay the view keys (hold 1/2/3/4). Verdict keys are all letters reachable by the left hand while the
  right stays on the mouse.

### 2.1 Doubts

- **Evidence**: crop at item depth; facts line `Low-confidence · 14 µm · contrast 1.3× speckle` or
  `Suspect: parallel to V-0211 (2.1 µm apart)`. For a parallel suspect the other trace is drawn in white so the
  person sees the pair. Hold **2** to see the raw image without the graph.
- **Answers**: **K Keep** · **X Reject**. Keep turns the dashed amber trace solid; Reject turns it to a red dotted
  ghost (hidden unless ghosts are on, key **G**).
- In the main view, clicking a faint vessel still keeps it (existing behaviour); the card follows.

### 2.2 Junctions

- **Evidence**: the crop; under it a **side strip** 256 × 64 px (XZ projection along the junction's main axis) so
  depth is visible without turning anything; facts line `J-0147 · 4 arms · arm depth z 12 · 12 · 17 · 17 ·
  suggests crossing`. Precomputed: each arm's mean depth over its first 8 µm; arms differing by >3 µm flag a
  likely crossing. The arms are tinted in the crop by the suggested pairing: pair one **yellow #F5E050**, pair two
  **violet #A78BFA**. Key **R** rocks the main view in 3D ±15° around the junction for as long as it is held.
- **Answers**: **B Branch** (real branch point) · **C Crossing** (split into two vessels that pass; uses the shown
  pairing; **Tab** cycles other pairings for 4+ arms) · **X Cut** (the algorithm bridged a gap that is not there;
  the shortest arm is cut at the junction, Tab picks another arm).
- **After**: Branch → filled white dot. Crossing → the two vessels drawn with a small over/under gap, junction
  removed, the merged vessels join the Vessels queue. Cut → the arm's end becomes a tip.

### 2.3 Gaps & missed

The card becomes a **suggestion list**, one at a time, then a free look.

- **Precomputed suggestions** in the region: *breaks* (two tips within 12 µm, directions within 30°, depths within
  3 µm: dotted violet bridge between them), *attachments* (a tip within 6 µm of a vessel's side: dotted violet stub),
  *faint candidates* (ridge-filter traces at least 15 µm long not covered by the graph: dotted violet curve).
- **Answers per suggestion**: **Enter Accept** (join, attach or draw as shown) · **X No** · Space skip. An accepted
  drawing is a person-made vessel (green) and joins the Vessels queue.
- **Free look**: after the last suggestion the card reads `Look for anything still missing in B2` with the graph
  dimmed to 40% and the raw image at full contrast. The person draws with the existing right-click tool, steps
  slices with **, / .** (one slice) to check faint ones, and ends with **F Nothing else missing**. This button is
  what records the region's graph coverage; there is no implicit completion.

### 2.4 Vessels (width, plus a last look)

See §4 for the width card in full. Answers: **Enter Agree** · **↑/↓ adjust** · **T Take fit** · **Delete Not a
vessel** · Space skip. Geometry is fixed in the main view while the card stays: drag a point, right-click → Add
bend. Precomputed *centerline offset*: stretches where the profile peak sits >1 µm off the curve are drawn as
short orange **#FF8A3D** ticks across the vessel, so the person knows where to drag.

## 3. The left bar and the main view, state by state

Task colours, used only in the left bar: Doubts **amber #FFB020**, Junctions **yellow #F5E050**, Gaps **violet
#A78BFA**, Vessels **teal #2DD4BF**.

**Progress bar** (248 px): four parts sized by expected time, Doubts 10%, Junctions 25%, Gaps 20%, Vessels 45%,
each filled in its colour as far as that task is done across the stack; unfilled is a dark outline. Sized by time
so the bar's fill predicts the time left. Under it: `Regions 5 / 16 · about 55 min left`.

### 3.1 Start of stack

Left bar, tasks box:

1. `TASKS · Stack S2 · 22 slices`
2. `Grid  [3×3]  [4×4 ●]  [6×6]   cell 165 µm`
3. progress bar, empty
4. `Doubts      0 / 112`
5. `Junctions   0 / 168`
6. `Gaps        0 / 16 regions`
7. `Vessels     0 / 412`
8. Button **Start at B2 ▸** (Enter); hint `or click a cell`

Main view: whole field flattened, graph drawn: confident vessels **cyan #2EC4F0** 1 px, low-confidence **amber
dashed**, junctions hollow white circles. Grid lines white at 30%; each cell labelled top-left `B2 · 27 · 8?`
(vessels, doubts). Suggested cell outlined white 2 px.

### 3.2 Mid-region (example: Junctions in B2)

1. `B2 · region 5 of 16`  with **◀ ▶** to move between regions
2. Task row, four chips: `Doubts ✓ 9` · `Junctions 6/11` (active, yellow underline) · `Gaps –` · `Vessels 0/27`
3. The card: crop 256 × 256 with magenta ring, side strip 256 × 64
4. `J-0147 · 4 arms · z 12·12·17·17`
5. `Algorithm: junction · suggests crossing · You: –`
6. Buttons: **[B Branch] [C Crossing] [X Cut]**
7. Small: **[Space Skip] [⌫ Back]**  `Tab: other pairing`
8. progress bar, then `Regions 4 / 16 · about 62 min left`

The chips are clickable: the person can jump to a later task in the region, but Region complete stays locked until
every chip is ✓.

Main view: B2 plus margin. Outside B2 dimmed to 35%. Done regions cut out (below). Items of the active task still
undecided: full colour with a hollow white handle; decided ones: their decided style at 60%. Current item: magenta
ring 3 px, 6 px clear of the item. Floating minimap (bottom right, 140 px): grid with done cells hatched, B2 white.

**Cut-out style**: done regions are filled **flat slate #1B2330 at 90% with thin diagonal hatching** and a small
green ✓, not pure black. *Departure*: the CD31 background is itself near-black, so a black cut-out would read as
empty tissue; the hatch says "finished" unambiguously. A **graph-only** region (widths pending) gets the hatch
at 50% so its vessels still show faintly.

### 3.3 Region done

1. `B2 ✓ complete`
2. `Graph checked ✓ · Widths checked ✓`
3. `You: kept 6, rejected 3, crossings 2, drew 4, widths set 7, looked 20`
4. Button **Next: B3 ▸** (N), secondary **Reopen B2**
5. progress bar, regions line

Main view: B2 fades into the cut-out (300 ms), the camera pulls back to the field for a beat, then to B3 on N.
Reopen lifts the cut-out and moves B2's coverage back to *unchecked* until Region complete is pressed again; editing
anything inside a done region (e.g. from a neighbour's margin) asks `Reopen B2?` first.

### 3.4 Stack done

1. `Stack S2 ✓ all 16 regions`
2. progress bar full
3. `Final check`
4. `Low-confidence undecided  0`
5. `Widths silent  0` (if not 0: count in red and **Show**, which walks them as a Vessels queue)
6. `Skipped items  0`
7. **Review provenance** (P)
8. Below, in the summary box: **Upload** becomes primary

Main view: whole field hatched. **H** held lifts the hatch to see the final graph; **P** colours it by provenance:
**cyan** = algorithm, untouched; **white** = algorithm, you confirmed; **green #3DDC84** = you changed or drew;
**red dotted** = you deleted or rejected. P works in every state, not only here.

### Summary box (below tasks, every state)

`Segments 412 (−41, +18 drawn) · Junctions 168 → 151 · Crossings 17 · Length 14.2 mm`
`Widths: set 61 · looked 290 · silent 61`, then **Save Draft** and **Upload**.

## 4. Widths

The width card replaces the crop with three stacked panels:

1. **Straightened vessel** 256 × 72 px: the vessel resampled along its curve, so a curved vessel reads as a
   straight band; two thin cyan lines mark the current width's edges along its whole length.
2. **Profile** 256 × 120 px: the mean cross-section brightness over the vessel's middle 60% (grey curve), the fitted
   curve (thin white), and two **draggable dashed lines** at ±half the current width. Ticks every 1 µm. A double
   peak (thick vessel showing both walls) is detected and the edges sit on the outer walls.
3. Facts line: `V-0388 · 41 µm · Algorithm 4.1 µm · Fit 4.4 µm ± 0.3`, the fit in **bold** if it disagrees with the
   algorithm by more than 15%.

**Answers**:

- **Enter Agree** keeps the algorithm's value and records **looked**. It is accepted only while the card is shown
  for at least 400 ms (so a held Enter cannot sweep a queue).
- **T Take fit** sets the fitted value, records **set**.
- **↑ / ↓** ±0.25 µm, **Shift+↑/↓** ±1 µm, or drag a dashed edge, records **set**; Enter confirms and moves on.
- **W** focuses a numeric field for typing an exact value; Enter confirms.
- **Delete** not a vessel; **Space** skip, recorded **silent**.

**Rules that keep silence honest**: there is no "agree to all" button anywhere. A vessel never visited is
**silent**. Joining two vessels gives the length-weighted width and the *weaker* status of the two (silent < looked <
set); a crossing split keeps each part's status; dragging a point more than one width resets *looked* to *silent*
(set stays set). Widths checked for a region means no silent vessel left in it.

**Precomputed to make it fast**: the profile, the fit and its uncertainty, double-wall detection, and the queue
order: a walk along connected vessels so the next card is a neighbour and the camera barely moves. Clean cards
(fit and algorithm agree within 10%, single clean peak) are answered by one Enter in about 2 s; the bold
disagreements are the ones worth thinking about.

## 5. Progress, interruptions, trust

- **What is left**: the progress bar, the chips' counts, the cut-out on the picture, the minimap.
- **Autosave**: every action is written to the device's draft at once; **Save Draft** puts it in the account for
  another device. The status line shows `Draft saved 14:02 on this device · account copy 13:40`.
- **Coming back**: on open, the tasks box shows `Welcome back · B2, Junctions, 6 of 11 · last action: Crossing on
  J-0141` with **Resume (Enter)**. The camera returns to that exact item at the same zoom and view.
- **Undo**: Ctrl+Z / Ctrl+Shift+Z (and toolbar). Undo also moves the card and camera back to the item it
  touched, and reopens a region if the undone action was its completion, so an undo is always visible where it
  happened. The status line names it: `Undone: Reject V-0212`.
- **Trust**: P (provenance) anywhere; the card's line `Algorithm: … · You: …` on every item; the summary box's
  set / looked / silent counts; the Final check before Upload.

## 6. Time per stack

Taking a median stack (412 segments after edits, 168 junctions, 70 low-confidence, 16 regions):

| Step | Items | Seconds each | Minutes |
|---|---|---|---|
| Doubts (70 low-conf + 40 suspects) | 110 | 4 | 7 |
| Junctions (80% clear 4 s, 20% crossings 10 s) | 168 | 5.2 | 15 |
| Gap suggestions | 60 | 5 | 5 |
| Drawing missed vessels | 30 | 15 | 7.5 |
| Free look per region | 16 | 45 | 12 |
| Widths (75% clean 2.5 s, 25% adjusted 10 s) | 412 | 4.4 | 30 |
| Geometry drags | 40 | 8 | 5 |
| Region overhead (move, review line) | 16 | 15 | 4 |
| **Total** | | | **about 85 min** |

Small stacks (200 segments) come to about 45 min, the largest (580) to about 2 h: one or two sittings.

## 7. Cut or defer for version one, and the first test

**Build first**: grid fixed at 4×4; the four tasks with the left-bar card; Doubts and Junctions with the crop and
the side strip; the width profile panel with Enter / arrows / Delete / Space and the three statuses; breaks and
attachments as suggestions (cheap geometry); the free look and F; cut-out; progress bar; provenance view; resume.

**Defer**: grid choice; Tab pairing cycle (use the existing right-click split for odd cases); R rocking (the side
strip and slice keys carry depth); the straightened-vessel strip; faint-vessel candidates from a ridge filter
(the free look covers it); Take fit and the bold disagreement flag (show only the algorithm's value with the
profile); the centerline offset ticks; graph-only half-cut regions.

**Cheapest test before building**: one 40-minute session with the lead researcher on one region of a real stack,
using static cards rendered offline: 20 junction cards (crop + side strip + arm depths) and 30 width cards
(profile + algorithm value), answered by keypress in a bare page that only records the key and the time. Then
check the same 20 junctions in the existing 3D view. It measures the two things the design stands on: whether the
card's evidence is enough to tell a crossing from a branch without turning the stack, and whether a width card
really takes 2–5 s. Ask at the end whether 165 µm feels like a region worth finishing in one go.
