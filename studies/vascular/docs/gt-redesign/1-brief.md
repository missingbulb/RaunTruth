# Design brief: making ground truth for a vessel-tracing algorithm

You are designing the user interface a person uses to turn an algorithm's draft into **ground truth**. You have
never seen the app. This brief is everything you need. Design from the work, not from any existing screen.

## 1. The image

- A **confocal z-stack** of mouse brain tissue: a pile of 12–30 grey images ("slices") of the same 660 × 660 µm
  field, 1 µm apart in depth. Each slice is 1200 × 1200 pixels, 0.55 µm per pixel. 16-bit intensity.
- One stain, **CD31**, lights the walls of every blood vessel, so vessels appear as bright tubes on a dark,
  speckled background. Most are **capillaries**, 2–5 µm across (4–9 px). A few are arterioles or venules, up to
  about 8 µm and more. Thick vessels can look like two parallel lines with a dimmer middle (the lumen).
- Vessels run in 3D. When you flatten the stack (take each pixel's brightest value through depth) two
  vessels at different depths that only pass over each other **look exactly like a junction**. Turning the
  stack in 3D, or stepping through slices, tells them apart.
- Faint capillaries can be as dim as the speckle. Stain dropouts make a single vessel look broken into pieces.
- Parts of a sample can be damaged. Damaged regions are marked elsewhere in the app and are out of scope here.

## 2. What the algorithm gives you

A **vessel graph** in 3D:

- **Points**: junctions (3+ vessels meet) and tips (a vessel ends, or leaves the frame).
- **Vessels (segments)**: each a smooth curve from one point to the next (junction-to-junction or
  junction-to-tip), with a **width** (diameter, µm) the algorithm estimated.
- Each vessel is either **confident** or **low-confidence** (too faint for the algorithm to be sure).

Measured on the four stacks the owner has today:

| | per stack |
|---|---|
| Confident vessel segments | 200–580 (median length about 38 µm) |
| Junctions | 75–260 |
| Low-confidence vessels | about 15 to 160 |
| Total centerline length | 9–17 mm |
| Vessels the algorithm missed (from a model judge's sample, extrapolated) | a few dozen, mostly faint capillaries |
| Wrong vessels the algorithm kept | in a judged sample, 13 of 74 non-vessel traces were kept: short branches over speckle, duplicate traces along both walls of a thick vessel. Roughly 1 kept vessel in 10 is wrong |

There are 4 stacks now and more to come. One person, the lead researcher, does the tagging today. Trained
helpers may do it later.

## 3. What ground truth must contain when the person is done

The output is the corrected vessel graph. It is used to score versions of the algorithm and to compute the
study's three measurements: **COUNT** = number of branch segments, **CATEGORIZE** = vessels by caliber (width),
**MEASURE** = total centerline length. So ground truth needs:

1. **Existence.** Every vessel in the graph is really a vessel; every real vessel is in the graph.
   - Each confident vessel: kept, or deleted if it is not a vessel.
   - Each low-confidence vessel: kept or rejected. Nothing may stay "maybe".
   - Every vessel the algorithm **missed** is drawn in.
2. **Geometry.** Each vessel's curve follows the vessel's center closely enough, and ends where it really ends.
   Points may need dragging; a curve may need a bend added.
3. **Topology** (this drives COUNT):
   - Each **junction** is a real branch point, or two vessels **crossing** at different depths, which must be
     split apart.
   - A vessel broken by a dropout is **joined** into one; a gap the algorithm bridged wrongly is **cut**.
   - A tip that should attach to a nearby vessel is attached.
4. **Width** (this drives CATEGORIZE). Each vessel has one diameter in µm (no taper). The algorithm's estimate
   stands unless the person changes it. The file records for each vessel whether the person **set** the width,
   only **looked at** it and agreed, or **said nothing**. Silence must never be recorded as agreement. A width
   near 3 µm is about 6 pixels, close to the optical resolution, so judging it by eye needs a brightness
   profile across the vessel. Widths are values, not classes.
5. **Coverage.** Which parts of the field the person has checked **completely**. Outside a checked region, a
   missing vessel means "not looked at", not "absent". Partial work must still be valid ground truth for the
   regions that were finished.

Every change is an action in an undoable history (undo, redo, save a draft, resume later on the same device or
another one). The finished file is submitted at the end.

## 4. Context of use

- **Desktop or laptop, mouse and keyboard**, a dedicated session at a desk. The person is the expert: a
  neuroscientist who knows the tissue and will spend hours on a stack if the work is worth it, but hates
  repeated clicks, waiting, and losing their place.
- The person will do several stacks, in sittings of maybe 30–90 minutes, interrupted, and resumed later.
- They must be able to **trust** the result: they need to know at any time what is finished, what is left,
  and what the algorithm said versus what they said.

## 5. The app's fixed frame (you design inside it)

The app is a single page. These parts exist and stay:

- **A left bar**, about 280 px wide, of stacked boxes. While ground truth is made, a "tasks" box lives here.
  Below it a summary box (counts, lengths) and Save Draft / Upload buttons.
- **The main view**, filling the rest: the stack, shown either in **3D** (turnable, zoomable, the vessel graph
  drawn as lines over it, a handle on each point) or **flattened in 2D**. Holding number keys swaps views
  briefly (e.g. 1 = the graph alone, 2 = the image without the graph, 3 = side by side, 4 = 2D/3D). A
  toolbar on top holds undo, redo, zoom and view controls. A small map of the whole field can float in a corner.
- Direct editing of the graph is already built in the main view: drag a point; right-click a vessel for a menu
  (delete, add bend, split, connect, split a junction into a crossing); right-click empty image to draw a
  missed vessel; drag a tip onto a vessel to attach it; click a faint low-confidence vessel to keep it.
- A status line at the bottom.

## 6. Principles a sibling study's ground-truth UI follows (follow, or depart and say why)

- The page exists to make ground truth while tagging; statistics only sit beside it.
- The main area is always the image. Never switch the main area to a list of cards.
- Work one item at a time: the current item shown big in the left bar, its verdict buttons under it, and a
  verdict moves on to the next item by itself.
- Walk the field **area by area** (a grid; the person chooses how fine it is), not one pass per task, so each
  region is finished and stays finished. What is done is **cut out** of the image (blacked out), so remaining
  work is visible on the picture itself.
- Mark the current item with a ring in a colour the image never carries.
- Show progress as a bar split per task, filled as far as each is done.

## 7. What we need from you

A complete UI design in words (no code), detailed enough to build and mock up:

1. **The unit of work and the order of work**: what the person does first, next, last, per region and per
   stack, and why. Say which judgments are per-item (one vessel, one junction), which are a broad look over a
   region (missed vessels, fragmentation), and how they interleave.
2. **For every question the person answers**: what is on screen when they answer it (which view, what
   evidence: depth, cross-section profile, neighbours, the raw image), the possible answers, the keys and
   buttons, and what happens after the answer.
3. **The left bar's tasks box**, line by line, in each state (start of stack, mid-region, region done, stack
   done), and **the main view's markings** in each state.
4. **Widths** specifically: how a person sets or confirms 200–580 widths without it becoming a chore, and
   without silence counting as agreement. Consider what the algorithm could pre-compute to make each answer
   fast.
5. **Progress, interruptions and trust**: how the person sees what is left, comes back after a break, and
   undoes a mistake.
6. **A time estimate** per stack, from per-step seconds you state.
7. What you would **cut or defer** to make the first version cheap to build, and the cheapest test with the
   person before building it.

Write it as a design document with headings. Be concrete: names of buttons, keys, colours, what is drawn where.
