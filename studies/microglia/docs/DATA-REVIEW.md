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

A first reading of the one field, by eye and with throwaway measurements. None of it is an
algorithm, and every number here comes from this single image. Tags: **[measured]** = computed on
the pixels, **[by eye]** = judged from renders. No overlays are committed: they render the owner's
data and were scratch work.

**Anatomy — low confidence.** No compact pyramidal or granule cell layer is in the field; nuclei
are scattered [by eye]. An arched, streaky band, bright in DAPI, crosses the top ~20% and curves
down the right edge, with elongated Iba1⁺ cells aligned along it. It looks like a fibre tract
(alveus/fimbria or corpus callosum) over a neuropil layer such as stratum oriens or radiatum
[by eye]. Which subfield this is cannot be told from this field. **Ask the owner.**

**Cell count.** A difference-of-Gaussians soma detector on Iba1 (σ 2 vs 4.7 µm) gives 199 peaks
at 8 MAD above background, 240 at 6 and 395 at 4 [measured]. In three 600 px crops, every ≥8 MAD
mark sat on a soma; about half of the 6–8 MAD marks did; the 4–6 MAD marks were mostly process
knots, with a few dim out-of-focus somata among them [by eye]. A DAPI nucleus lies under 68% of
≥8 MAD peaks, against 15% at random positions [measured]. **Estimate: ~220 ± 40 cells in the
field, ~415–500 per mm².** That is *projected* density through a section of unknown thickness,
so it is indicative only and not comparable to a per-volume density.

**Soma size.** Median half-maximum diameter **6.8 µm** (10–90%: 5.5–9.0 µm, n = 178) [measured].
Blur inflates it for out-of-focus cells, so trust it only for the in-focus subset.

**Focus — the dominant limitation.** Only ~40–50% of detected somata are sharp with visible
processes; the rest are featureless blurred discs from above or below the focal plane. The
bottom-right quadrant is the worst [by eye]. The depth of field at 20×/0.7 is ~1–2 µm, and the
amount of blur and haze implies a section many times thicker [by eye]. A simple soma edge-width
measure did **not** separate sharp from blurred cells (unimodal, median 2.3 µm) [measured], so a
focus gate is still an open problem.

**Processes.** In-focus cells show **2–4 primary processes and 1–2 branch orders, traceable for
~10–25 µm** before they fade into haze [by eye]. Neighbouring arbors and blurred processes from
other depths cross everywhere, so which cell a process belongs to is ambiguous beyond ~10 µm from
the soma [by eye]. Process width measures ~1.9 µm median at half maximum [measured], 3–4× the
~0.45 µm diffraction limit: blur limits resolution here, not pixel size.

**States.** Mostly ramified with small somata in the neuropil. Elongated or bipolar along the
fibres in the top band. No clear amoeboid clusters, but blurred discs cannot be classified at all
[by eye].

**CD68.** Punctate, ~0.5–2 µm, mostly at somata and proximal processes [by eye]. 82% of the
≥8 MAD somata have a CD68 punctum within 4 µm, and 57–69% of bright-punctum pixels fall inside an
Iba1 mask covering 7% of the field [measured]. 16 of 63 large CD68 blobs have negligible Iba1,
concentrated in the top band [measured]. They could be CD68-high/Iba1-low macrophages,
autofluorescence or non-specific signal; **ask the owner**. Only 9–15% of puncta coincide with
DAPI signal, so there is no strong sign of lipofuscin, which shows in every channel [measured].

**Artefacts.** Two dark objects, black in all channels with soft edges, look like debris in the
light path: at (y 858, x 1110), 9 µm across, and (y 1979, x 275), 18 µm [measured]. Iba1
background varies 745–1063 counts across the field, with the corners at 0.86 of the centre
[measured]; shading and tissue are not separated. The haze pedestal is ~800–1000 counts against a
process signal of ~1000 and noise SD ~54 [measured]. Streaky out-of-focus signal in the top band
produces elongated, ambiguous soma detections [by eye].

## 5. What this kind of image supports

| quantity | from one 20× widefield plane | why |
|---|---|---|
| cell count, density per region | **yes**, ~±15–20% | blurred somata are still detected |
| CD68 per cell (soma-centred) | **yes** | puncta sit at the soma and proximal processes |
| soma area | in-focus cells only | needs a focus gate, not yet found |
| coarse state (ramified / elongated / compact) | in-focus cells only | blurred discs show no shape |
| primary-process count | a lower bound at best | only the in-plane part of the arbor is visible |
| branch order, endpoints, Sholl, territory | **no** | arbors cut by the focal plane and overlapping |
| cell volume | **no** | one plane |

Process counts, branching and volume, the measurements the owner named, need **a z-stack through
the section**. The literature's route is confocal or spinning-disk at 40×/≥0.95 or 60× oil,
~0.1–0.2 µm/px, z-step ≤ 0.5–1 µm, through 30–50 µm sections (see
[`literature/lind-holm-mogensen-2024-microglia-morphology-protocol.md`](literature/lind-holm-mogensen-2024-microglia-morphology-protocol.md)).
The 20× slide-scanner route of
[`literature/kim-2024-microglia-morphology-pipeline.md`](literature/kim-2024-microglia-morphology-pipeline.md)
also takes a z-stack, then projects it. The IX83 here has a motorised focus drive (IX3-ZDC) and
cellSens can acquire a z-series, so a widefield z-stack with deconvolution is a possible, weaker
middle route on the same instrument.
