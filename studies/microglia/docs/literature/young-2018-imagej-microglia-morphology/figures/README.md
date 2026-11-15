# Figures — Young & Morrison 2018 (described, not reproduced)

Paper digest: [`../digest.md`](../digest.md).

The article is licensed **CC BY-NC-ND 3.0** (printed in every page header). That licence forbids
derivatives, and this repository is public, so **no image and no PDF is committed**. Each figure
is described here panel by panel instead. The PDF embeds every figure as one JPEG, **700 px wide**
(low resolution; the JoVE site links "larger versions", not retrieved — see digest §9). Every
scale bar in the paper is **10 µm**; the caption gives no pixel size.

**Step-number offset:** the panel labels in Figs 2 and 3 use step numbers **one lower** than the
protocol text (panel "4.1 Grayscale" = text step 4.2, "4.5 Binary" = text 4.6, "4.7 Skeletonize"
= text 4.8, "4.8 Tagged skeleton" = text 4.9). Labels below are quoted as printed.

---

## Figure 1 — circular vs single-origin soma (PDF p. 5, 700 × 281)

Three square panels in a row.

- **"Circular Soma"** — a black-on-white skeleton of one ramified cell; a **red circle** marks the
  soma, where the skeleton forms a **closed loop** around the cell body (labelled suboptimal).
- **"Single Origin Soma"** — the same cell's skeleton with a **green circle** at the soma, where
  the processes converge on one point/short star with no loop (optimal). The two skeletons look
  almost identical outside the soma — the difference is only the few pixels at the centre.
- **"Overlay"** — the skeleton in **red** over the Iba1 fluorescence (green on black). One cell
  centred: a bright, roughly triangular soma, ~6–8 primary processes that branch repeatedly into
  fine, tortuous terminal twigs; the skeleton follows processes to their tips. Fragments of
  neighbouring cells' processes are visible at the panel edges, unskeletonized. Scale bar 10 µm
  (white, bottom right); the cell's arbor spans several bar lengths.

What it means for us: skeletonizing a filled soma without care produces a loop; a loop inside
the soma is a detectable defect.

## Figure 2 — skeleton protocol on a fluorescence image (PDF p. 5, 700 × 273)

Two rows of panels; each panel shows the whole field with a **single cell enlarged** as an inset
in its top-left quadrant (a white frame), red 10 µm bars in both the inset and the field.

- **Original Image** — Iba1 (green on black). Roughly **15–20 microglia** in the field, evenly
  spaced, each with a compact bright soma and a star of processes; processes of neighbours come
  close to each other but cells are mostly separable by eye.
- **4.1 Grayscale**, **4.2 Brightness/Contrast**, **4.3 Unsharp Mask**, **4.4 Despeckle** — white
  on black; each step brightens fine processes and makes the background more uniform. After B/C
  the somas saturate white.
- **4.5 Binary**, **4.6.1 Despeckle**, **4.6.2 Close**, **4.6.3 Remove Outliers** — black cells on
  white. Somas are solid black blobs, processes thick black lines; the binary visibly merges
  neighbouring processes in places, and speckle is progressively reduced. Differences between the
  four binary panels are small at this resolution.
- **4.7 Skeletonize** — thin grey skeleton on white; every cell becomes a tree, with small
  isolated fragments around.
- **4.8 Tagged skeleton** — AnalyzeSkeleton output on black (branches/endpoints/junctions in
  colour); at 700 px almost nothing is legible.

## Figure 3 — skeleton protocol on a DAB bright-field image (PDF p. 5, 700 × 219)

Same layout as Fig 2, red 10 µm bars, inset of one cell top-left.

- **Original Image** — brown DAB-stained microglia on a pale blue-grey background; ~15 cells,
  dense dark somas, brown processes.
- **4.1 FFT Bandpass Filter** — background flattened, cells become more orange.
- **4.1 Grayscale**, **4.2 Brightness/Contrast**, **4.3 Unsharp Mask**, **4.4 Despeckle** — dark
  cells on light grey; contrast rises step by step.
- **4.5 Binary**, **4.6.1 Despeckle**, **4.6.2 Close** — black cells on white; somas and proximal
  processes are heavier and blobbier than in the fluorescence case. **No "Remove Outliers"
  panel** for DAB.
- **4.7 Skeletonize** — grey skeletons; **4.8 Tagged Skeleton** — on black, illegible at this size.

## Figure 4 — with vs without the protocol (PDF p. 6, 700 × 364)

- **A** — fluorescence Iba1 field (green on black), **~20–25 microglia** evenly tiling the field,
  each with distinct soma and radiating processes; yellow box marks the cell enlarged in B. Red
  10 µm bar. Cells' territories abut but seldom overlap heavily.
- **B** — the enlarged cell: a bright soma with **~6–8 primary processes** branching into many
  thin secondary/tertiary branches; neighbouring somas visible at the top edge. Red 10 µm bar.
- **C "WITH PROTOCOL"** — binary (left) and skeleton (right) of the B crop: solid soma, connected
  thick processes; skeleton is a clean tree with modest speckle.
- **D "WITHOUT PROTOCOL"** — binary has many small specks and broken processes; the skeleton is
  dense with tiny fragments everywhere — the source of the inflated endpoint counts.
- **E (with protocol)**, **F (without protocol)** — bar charts of endpoints/cell (axis 0–500) and
  process length/cell (µm, axis 0–800), uninjured (white) vs injured (grey); values transcribed
  in digest §6.1. ** (p < 0.01) on both E charts, none on F.

## Figure 5 — inter-user variability (PDF p. 6, 700 × 288)

- **Original Image** (left) — DAB bright-field field (brown cells on pale background) with one
  cell circled and enlarged in an inset; red 10 µm bars.
- **Binary / Skeleton × User 1 / User 2** — four panels, each with the same cell inset. **Coloured
  circles (red, dark blue, orange, light blue)** mark the same locations in both users' insets
  where the binaries/skeletons differ — processes joined or broken, a branch present for one user
  and missing for the other. The differences are local and small-looking but change counts.
- **Bar charts** for User 1 and User 2: endpoints/cell (axis 0–150) and process length/cell (µm,
  axis 0–300) for Uninjured (black) and Injured Regions 1–3 (greys); values and significance marks
  transcribed in digest §6.2.

## Figure 6 — fractal analysis (PDF p. 7, 700 × 1170)

- **A "Uninjured"** — fluorescence crop (green on black), white 10 µm bar bottom right. One
  central cell with a small, moderately bright soma and **many thin, long, wavy processes**
  reaching toward the panel edges; parts of 2–3 neighbouring cells at the borders, whose
  processes interdigitate with the central cell's. Fine punctate background. By our measurement
  of the bar (≈ 37–38 px = 10 µm) the panel is ≈ 87 µm across — rough, off a JPEG.
- **B "Injured"** — same framing, white 10 µm bar. **Four or five cells with large, bright,
  elongated/irregular somas** and fewer, **thicker, shorter** processes; cells crowd closer
  together than in A.
- **C** — binary of the isolated central cell, "Without Protocol" / "With Protocol", for A then B.
  Without the protocol the processes are broken into dots and short dashes; with it they are
  continuous and the arbor is complete.
- **D** — the same cells as **outlines** (Process › Binary › Outline).
- **E** — outlines with **convex hull (blue polygon)** and **bounding/enclosing circle (pink)**.
  The hull of the uninjured cell is roughly pentagonal; the injured cell's is a narrower
  triangle-like shape.
- **F** — three stacked thumbnails per cell showing **box-counting grids** at different box sizes
  (grid lines in pink/red over the outline).
- **G** — the FracLac numbers for each of the four columns (D_B, λ, density, span ratio,
  circularity); transcribed exactly in digest §6.3.

### What microglia look like at these magnifications

Objectives and pixel sizes for the figures are not stated. At the field scale of Figs 2–5
(~15–25 cells per field), uninjured microglia are **separate,
evenly spaced cells with a compact soma and a radiating star of processes**; primary processes
are clearly resolved, fine terminal twigs are faint and break up in the binary without filtering.
Neighbouring arbors **touch and interdigitate at their tips** but somas never overlap; the human
isolation step in the fractal protocol exists exactly to cut those touching tips apart. Injured
cells have bigger, brighter somas and fewer, stubbier processes, and sit closer together.
