# Microglia study — state (read this first)

**Goal (the owner's, 2026-11-15):** algorithmically find every microglia cell in an image, then
compute per-cell geometry: number of extensions (processes), branching, volume and similar.
**Phase:** exploration. The owner said explicitly that building an algorithm or a ground-truth
flow is premature until they understand the data better. There is no `study.json` yet, so the
study is not on the site.

## Where things are

| what | where |
|---|---|
| the data: Drive root, files, checksums | [`../data/README.md`](../data/README.md) |
| the reader (slideio + a numpy ETS parser, cross-checked) | [`../py/read_vsi.py`](../py/read_vsi.py) |
| what the first image is and what it supports | [`DATA-REVIEW.md`](DATA-REVIEW.md) |
| the six papers, digested | [`literature/README.md`](literature/README.md) |
| what the papers mean for us | [`literature/SYNTHESIS.md`](literature/SYNTHESIS.md) |

## What we know

- The data is Olympus cellSens `.vsi` + `.ets`, read reliably. The first file is **one widefield
  focal plane** at 20×/0.7, 0.338 µm/px, with DAPI / Iba1 / CD68. It is not 3D.
- A single plane supports cell count and per-cell CD68. Soma size and coarse state hold only for
  in-focus cells. Process counts, branching and volume need a z-stack.
- No published pipeline in the set separates touching cells, so finding *every* cell is new work.

## Open questions for the owner

1. Is a z-stack (or an extended-focus image) available for these sections, or was this file one
   plane on purpose? The answer decides whether processes and volume are in scope.
2. Section thickness, the hippocampal subfield of this field, and the animal model and conditions.
3. Are the CD68-bright, Iba1-low objects in the top band real (macrophages) or background?

## Next, once those are answered

Not started, by the owner's choice: a soma detector and its evaluation, any ground truth.
