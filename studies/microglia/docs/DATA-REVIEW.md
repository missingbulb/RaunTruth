# Data review — can we read the owner's images, and what do they hold?

First technology review of the study's data (2026-11-15), on the one image in Drive `Data/`. The
files and how to fetch them: [`../data/README.md`](../data/README.md). The reader:
[`../py/read_vsi.py`](../py/read_vsi.py).

## 1. The format — read, and read twice

- **Olympus cellSens `.vsi`.** Every cellSens image is a pair: the `.vsi` (a TIFF container,
  `II*`, carrying the metadata and the document tree) and a folder `_<name>_/stackN/` holding one
  `frame_t_N.ets` per stack with the pixels. This is the "file plus a folder" layout. It is how
  cellSens always saves, not a sign of a pyramid or of 3D.
- **This file holds one stack: a single 2048 × 2048 plane, 3 channels, uint16, uncompressed, one
  resolution level.** No z-slices, no time points, no mosaic tiles, no pyramid.
- **Read by [`slideio`](https://pypi.org/project/slideio/) 2.10** (a pip wheel; no Java,
  no Bio-Formats), and independently by a ~30-line numpy parser of the ETS tile table
  (`read_ets_raw`). The two agree **bit for bit** on all three channels.
- **The channel order is confirmed** two ways: slideio's names (`DAPI`, `GFP`, `Cy3`), and each
  channel's 99.9th percentile matching the display limits cellSens saved for it (Iba1 4198 vs
  4199, CD68 3662 vs 3663).
- **Nothing is saturated:** channel maxima 858 / 11 098 / 12 167 of 65 535, one pixel each.

The tile parser only handles what this file has: uncompressed uint16, one tile per channel. A
z-stack, a mosaic or a slide-scanner pyramid stores more tiles (and often JPEG or JPEG 2000
compression) and makes it raise `NotImplementedError`. slideio reads those cases. The parser
matters because the study's page runs its Python in the browser (Pyodide), where slideio cannot
run and a numpy reader can.

## 2. The acquisition, as the file records it

| fact | value | source |
|---|---|---|
| microscope | Olympus **IX83** inverted (`IX83 P1ZF`), IX3-ZDC focus drive | `.vsi` device list |
| imaging mode | **widefield epifluorescence**: X-Cite XYLIS lamp, mirror turret; no confocal or spinning-disk unit listed | `.vsi` device list |
| objective | **UCPLFLN PH 20× / 0.7**, air (refractive index 1.0), working distance 0.8 mm | `.vsi` optical properties |
| camera | Hamamatsu **ORCA-Flash4.0**, 2048 × 2048, binning 1, 16-bit | `.vsi` |
| pixel size | **0.338166 µm/px** (field 692.6 µm) — read from the file, never assumed | `.vsi` physical pixel size |
| channels | 0 `DAPI` (nuclei) · 1 `GFP` = **Iba1**, 488 · 2 `Cy3` = **CD68**, 555 | `.vsi` channel names, file name |
| exposures | 100 / 150 / 200 ms (the three channels; which is which is not resolved yet) | `.vsi` |
| focus | one plane, at stage z 4830.06 µm | `.vsi` frame properties |
| software, date | cellSens Dimension 4.1.1, 2025-07-28 13:30 | `.vsi` |
| tissue | hippocampus (`HIPP` in the file name), section "11-2" | file name only |

## 3. What this means for the study

The owner expected a 3D scan. **This file is 2D**: one widefield focal plane through a section much
thicker than the 20×/0.7 depth of field (a couple of µm). Cells above and below that plane appear
as out-of-focus blur. Cell volume and a full 3D process tree are not in the data. What a 2D plane
does and does not support is in §4.

## 4. What the image shows

*Pending:* the visual and measured reading of the field (anatomy, cell count, focus, processes,
CD68, artefacts) is being written and lands in this section.
