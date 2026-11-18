"""The Vascular Measurements study's algorithm (lab/README.md): a confocal z-stack's CD31 channel, the vessel model
each version draws from it, every vessel with its start and end width and the model with its plausibility card; and
how a model is scored against ground truth. Importing it loads neither scipy nor a version: the page opens a stack
before anyone runs one."""
import functools
import importlib
import os
import time

import numpy as np


def read_stack(path):
    """(stack as [C, Z, Y, X], µm per pixel, µm between slices) from an ImageJ or plain multi-page TIFF, the first
    time point; each size None when the file does not record it."""
    import tifffile
    with tifffile.TiffFile(path) as t:
        s, ij = t.series[0], t.imagej_metadata or {}
        a, axes = s.asarray(), s.axes
        p = t.pages[0]
        res = p.tags.get('XResolution')
        microns = str(ij.get('unit', '')).lower() in ('micron', 'um', 'µm')
        um = res.value[1] / res.value[0] if res and res.value[0] and microns else None
        spacing = float(ij['spacing']) if microns and ij.get('spacing') else None
    # a file that names none of its axes lays its slices out as pages
    if 'Z' not in axes:
        axes = next((axes.replace(x, 'Z', 1) for x in 'IQ' if x in axes), axes)
    for ax in [x for x in axes if x not in 'CZYX']:
        a = np.take(a, 0, axis=axes.index(ax)); axes = axes.replace(ax, '')
    if 'C' not in axes:
        a, axes = a[None], 'C' + axes
    if 'Z' not in axes:
        a, axes = a[:, None], axes[0] + 'Z' + axes[1:]
    return np.transpose(a, [axes.index(x) for x in 'CZYX']), um, spacing


def read(path):
    """The stack's CD31 channel [Z, Y, X] as stored, its µm per pixel and µm between slices (None where the file
    records none), and the file's name.

    A single-channel stack is a CD31 stack cut from the originals; a two-channel one is an original, DAPI then CD31
    (data/README.md: established by looking at the four originals' max projections). Fails on a stack whose channels
    are in another order: the extraction runs on DAPI."""
    stack, um, spacing = read_stack(path)
    cd31 = 1 if len(stack) == 2 else 0
    return dict(cd31=np.ascontiguousarray(stack[cd31]), um=um, spacing=spacing, name=os.path.basename(path))


def run(module, image, source=None, z_step=None):
    """The vessel model the version in module draws from the stack's CD31, each confirmed vessel with its widths
    (r_a, r_b, taper_known) and the model with its plausibility card and the seconds the version took (`score`).
    source: the stack's name as the page shows it (else the file's); z_step: the µm between slices (else the file's,
    or None while unknown)."""
    if not image['um']:
        raise ValueError('The file records no pixel size in µm, which the extraction measures every vessel in.')
    import evidence as ev
    import vessel_model as vm
    version = importlib.import_module(module)
    vol, um = image['cd31'], image['um']
    # what the version and the card both draw from the stack is computed once
    with vm.shared(vol):
        t = time.time()
        m = version.extract(vol, um, source or image['name'], z_step if z_step is not None else image['spacing'])
        seconds = time.time() - t
        card = ev.card(m, ev.flat_signal(vol, um))
    m['score'] = {k: v for k, v in card.items() if not k.startswith('_')}
    m['score']['seconds'] = round(seconds, 1)
    return m


VERSIONS = {key: functools.partial(run, module) for key, module in [
    ('v5', 'v5_no_short_islands'),
    ('v4', 'v4_line_evidence'),
    ('v3', 'v3_geodesic_bridges'),
    ('v2', 'v2_scored_repair'),
]}

# a curve counts as found where a model's vessel runs within this of it (about a capillary radius) ...
COVER_UM = 2.5
# ... over at least this share of its length
COVERED = 0.5
CONFIRMED = ('vessel', 'accepted')

SCORING = """- Only the model's confirmed vessels (state vessel or accepted) count; its candidates do not
- A curve is found where the model's vessels run within 2.5 µm of it over at least half its length, in the image plane
- Against a corrected vessel model (people's ground truth), inside the areas it marks as reviewed only:
  - tp: a vessel of the ground truth (accepted, or vessel) the model finds
  - fn: one it does not find
  - fp: a vessel of the model that finds no vessel of the ground truth, and no candidate it leaves undecided
  - a vessel the ground truth rejected counts as no vessel; who drew an edge never counts
- Against the lab's provisional labels (a model's verdicts on traced curves, in a few tiles):
  - tp: a curve judged a vessel the model finds
  - fn: one it does not find
  - fp: a curve judged not a vessel the model still traces
  - curves judged unsure are left out; the vessels the judge drew as missed are counted apart (missed_found)"""


def points_um(model):
    """[(edge, samples along its curve: x and y in µm, z in slices)] for each of the model's edges between two nodes."""
    import evidence as ev
    um = model['um_per_px']
    nodes = {n['id']: n for n in model['nodes']}
    out = []
    for e in model['edges']:
        if e['a'] == e['b']:
            continue
        xy, _ = ev.sample_edge(e, nodes, um)
        out.append((e, np.column_stack([xy[:, :2] * um + um / 2, xy[:, 2]])))
    return out


def tree(curves):
    from scipy.spatial import cKDTree
    return cKDTree(np.vstack([p[:, :2] for p in curves])) if curves else None


def coverage(pts, near):
    """The share of the points within COVER_UM of the tree's."""
    return float(np.mean(near.query(pts)[0] <= COVER_UM)) if near is not None and len(pts) else 0.0


def densify(line, step=1.0):
    P = np.asarray(line, float)
    out = [P[0]]
    for a, b in zip(P[:-1], P[1:]):
        n = max(int(np.linalg.norm(b - a) / step), 1)
        out.extend(a + (b - a) * (np.arange(1, n + 1) / n)[:, None])
    return np.array(out)


def score(answer, truth):
    """tp, fp and fn of a version's model against one ground-truth file: a corrected vessel model, or the lab's
    provisional labels (its `tiles`)."""
    found = tree([p for e, p in points_um(answer) if e.get('state', 'vessel') in CONFIRMED])
    if 'tiles' in truth:
        return score_labels(found, truth)
    return score_model(found, answer, truth)


def score_labels(found, truth):
    g = dict(tp=0, fp=0, fn=0, missed_found=0, missed=0)
    for t in truth['tiles']:
        for c in t['curves']:
            hit = coverage(densify(c['curve_um']), found) >= COVERED
            if c['verdict'] == 'vessel':
                g['tp' if hit else 'fn'] += 1
            elif c['verdict'] == 'not':
                g['fp'] += hit
        for line in t['missed']:
            g['missed'] += 1
            # the judge's lines are rough
            g['missed_found'] += float(np.mean(found.query(densify(line))[0] <= 2 * COVER_UM)) >= COVERED if found is not None else 0
    return g


def reviewed(pts, regions):
    """Which points (x, y in µm, z in slices) lie in one of the reviewed boxes."""
    inside = np.zeros(len(pts), bool)
    for r in regions:
        (x0, x1), (y0, y1), (z0, z1) = r['x'], r['y'], r.get('z') or (-np.inf, np.inf)
        inside |= (pts[:, 0] >= x0) & (pts[:, 0] <= x1) & (pts[:, 1] >= y0) & (pts[:, 1] <= y1) & \
                  (pts[:, 2] >= z0 - 0.5) & (pts[:, 2] <= z1 + 0.5)
    return inside


def score_model(found, answer, truth):
    regions = truth.get('reviewed_regions') or []
    gt = points_um(truth)
    vessels = [p for e, p in gt if e.get('state') in CONFIRMED]
    undecided = [p for e, p in gt if e.get('state') == 'candidate']
    g = dict(tp=0, fp=0, fn=0)
    for p in vessels:
        inside = p[reviewed(p, regions)]
        if len(inside):
            g['tp' if coverage(inside[:, :2], found) >= COVERED else 'fn'] += 1
    near_vessel, near_undecided = tree(vessels), tree(undecided)
    for e, p in points_um(answer):
        if e.get('state', 'vessel') not in CONFIRMED:
            continue
        inside = p[reviewed(p, regions)][:, :2]
        if len(inside) and coverage(inside, near_vessel) < COVERED and coverage(inside, near_undecided) < COVERED:
            g['fp'] += 1
    return g
