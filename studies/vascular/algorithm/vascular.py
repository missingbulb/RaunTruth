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

# ---------- how a model is scored against ground truth ----------
# Each model is a set of tubes in the stack's space: a centerline with a radius, in µm, depth through the µm between
# slices. The score is how much the two sets of tubes overlap, counted in µm of centerline: walking each centerline in
# short steps, a step counts by the share of its tube's cross-section that lies inside the other model's tube there.
# Place and width are therefore one measure, and how a model cuts its vessels into edges does not enter. What the
# tubes themselves leave unmatched still earns part credit near the ground truth, so a tracing that moves closer
# scores more before it overlaps. The design, what was turned down and the validation: docs/scoring.md.

# The centerlines are walked in steps well under a capillary's radius (about 2 µm on the corrected stacks); the
# distance between two tubes is taken across the other's centerline, so where its steps fall does not count.
STEP_UM = 0.5
# The ground truth's tube as it is counts whole; widened to twice its diameter, what that newly holds counts half;
# to four times, a quarter (the owner, 2026-11-18: a leeway so that a near miss is told from a far one).
TIERS = ((1, 1.0), (2, 0.5), (4, 0.25))
# A model with no width anywhere (the lab's provisional labels) is given a capillary's radius.
BARE_RADIUS_UM = 2.5
VESSEL = ('vessel', 'accepted')
NEIGHBOURS = 8

SCORING = """- Each model is its vessels as tubes: the centerline with its radius, in µm, depth by the µm between slices; how the vessels are cut into edges does not count
- Both are walked in 0.5 µm steps; counts are µm of centerline
- A step of the ground truth is *found* by the share of its cross-section (a disc of its radius) that the answer's nearest tube covers; a step of the answer is *right* by the share of its cross-section inside the ground truth's tube
- Near misses: what the answer's tube leaves outside the ground truth's tube counts ½ where it is inside that tube widened to twice its diameter, and ¼ where inside four times
- tp: the ground truth's µm, each by how much it is found; fn: the rest of its length
- fp: the answer's µm, each by how much it is not right
- A vessel traced twice counts once: tracings on one ground-truth vessel share what was found of it
- The answer's vessels are its edges marked vessel; a candidate is not one
- The ground truth's vessels are its edges marked accepted or vessel, anywhere in the stack; rejected and candidate edges are not vessels; excluded areas are left out
- Every vessel has a width: one that carries none takes that of the vessels it joins, else the model's mean
- Against the lab's provisional labels: inside the judged tiles only, the vessels are the curves judged vessel and the lines drawn as missed, at a capillary's 2.5 µm radius and without depth"""


def _spline(P, per_unit):
    """Samples of the centripetal Catmull-Rom through the rows of P (ends continued straight), and for each the
    span it lies in plus how far along (k + t)."""
    ext = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out, at = [], []
    for k in range(len(P) - 1):
        n = max(int(np.ceil(np.linalg.norm(P[k + 1, :2] - P[k, :2]) * per_unit)), 2)
        t = np.linspace(0, 1, n, endpoint=False)
        Q = ext[k:k + 4]
        d = [max(float(np.linalg.norm(Q[i + 1] - Q[i])) ** .5, 1e-6) for i in range(3)]
        t0, t1, t2, t3 = 0.0, d[0], d[0] + d[1], d[0] + d[1] + d[2]
        u = (t1 + (t2 - t1) * t)[:, None]
        lerp = lambda p, q, ta, tb: ((tb - u) * p + (u - ta) * q) / (tb - ta)
        A1, A2, A3 = lerp(Q[0], Q[1], t0, t1), lerp(Q[1], Q[2], t1, t2), lerp(Q[2], Q[3], t2, t3)
        out.append(lerp(lerp(A1, A2, t0, t2), lerp(A2, A3, t1, t3), t1, t2))
        at.append(k + t)
    return np.vstack(out + [P[-1:]]), np.concatenate(at + [[len(P) - 1.0]])


def _steps(line, r_line):
    """A polyline (x, y µm; z slices or NaN) with a radius at each point, cut into equal steps of about STEP_UM:
    per step its middle (x, y, z), its radius, its length in the image plane and where it heads (dx, dy, dz)."""
    seg = np.linalg.norm(np.diff(line[:, :2], axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    L = s[-1]
    if L < 1e-6:
        return np.zeros((0, 8))
    n = max(int(round(L / STEP_UM)), 1)
    mid = (np.arange(n) + .5) * L / n
    k = np.clip(np.searchsorted(s, mid, side='right') - 1, 0, len(seg) - 1)
    t = (mid - s[k]) / np.maximum(seg[k], 1e-12)
    xyz = line[k] + (line[k + 1] - line[k]) * t[:, None]
    r = r_line[k] + (r_line[k + 1] - r_line[k]) * t
    return np.column_stack([xyz, r, np.full(n, L / n), line[k + 1] - line[k]])


def _edge_steps(e, nodes, um):
    """The steps of one edge of a vessel model, its curve and radius as the model defines them."""
    pts = [nodes[e['a']]] + list(e.get('via') or []) + [nodes[e['b']]]
    num = lambda v: np.nan if v is None else float(v)
    P = np.array([[p['x'] / um - .5, p['y'] / um - .5, num(p.get('z'))] for p in pts], float)
    r = np.array([num(p.get('r')) for p in pts], float)
    said = e.get('width') or {}
    if said.get('how') in ('walls', 'nudge') and (said.get('um') or 0) > 0:
        # a person's word on the vessel's width, a diameter
        r = np.full(len(pts), said['um'] / 2)
    elif e.get('r_a') is not None and e.get('r_b') is not None:
        s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P[:, :2], axis=0), axis=1))])
        r = e['r_a'] + (e['r_b'] - e['r_a']) * s / max(s[-1], 1e-9)
    keep = np.r_[True, np.linalg.norm(np.diff(P[:, :2], axis=0), axis=1) > 1e-6]
    P, r = P[keep], r[keep]
    if len(P) < 2:
        return np.zeros((0, 8))
    flat = np.isnan(P[:, 2]).any()
    if flat:
        P = P.copy(); P[:, 2] = 0.0
    C, at = _spline(P, 4.0)
    k = np.minimum(at.astype(int), len(P) - 2)
    rl = r[k] + (r[k + 1] - r[k]) * (at - k)
    line = np.column_stack([(C[:, 0] + .5) * um, (C[:, 1] + .5) * um, np.full(len(C), np.nan) if flat else C[:, 2]])
    return _steps(line, rl)


def _segments(edges):
    """For each edge the run it belongs to: edges that meet at a node only two of them touch run on as one, so a
    vessel reads the same however it is cut into edges."""
    deg = {}
    for e in edges:
        for n in (e['a'], e['b']):
            deg[n] = deg.get(n, 0) + 1
    parent = list(range(len(edges)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    first = {}
    for i, e in enumerate(edges):
        if e['a'] == e['b']:
            continue
        for n in (e['a'], e['b']):
            if deg[n] == 2:
                if n in first:
                    parent[find(i)] = find(first[n])
                else:
                    first[n] = i
    return [find(i) for i in range(len(edges))]


class _Tubes:
    """The steps of one model: xyz, radius (NaN where the model gives none), length, heading, and the run of
    edges each is of (used only to share a vessel traced twice)."""

    def __init__(self, rows=(), edge=()):
        rows = np.vstack(rows) if len(rows) else np.zeros((0, 8))
        self.xyz, self.r, self.len, self.along = rows[:, :3], rows[:, 3].copy(), rows[:, 4], rows[:, 5:8]
        self.r[self.r <= 0] = np.nan
        self.edge = np.concatenate(edge).astype(int) if len(edge) else np.zeros(0, int)

    def keep(self, mask):
        out = _Tubes()
        out.xyz, out.r, out.len, out.edge = self.xyz[mask], self.r[mask], self.len[mask], self.edge[mask]
        out.along = self.along[mask]
        return out

    def __len__(self):
        return len(self.len)


def _model_tubes(model, states):
    um = model['um_per_px']
    nodes = {n['id']: n for n in model['nodes']}
    edges = [e for e in model['edges'] if e.get('state', 'vessel') in states]
    rows, edge = [], []
    for e, run in zip(edges, _segments(edges)):
        rows.append(_edge_steps(e, nodes, um)); edge.append(np.full(len(rows[-1]), run))
    _give_widths(edges, rows)
    return _Tubes(rows, edge)


def _give_widths(edges, rows):
    """Every vessel has a width: where an edge carries none, that of the vessels it joins (their radius at the
    shared point), else its own points', else the model's mean, else a capillary's."""
    known = lambda r: np.isfinite(r) & (r > 0)
    at = {}
    for e, w in zip(edges, rows):
        if len(w):
            for n, r in ((e['a'], w[0, 3]), (e['b'], w[-1, 3])):
                if known(r):
                    at.setdefault(n, []).append((id(e), r))
    every = np.vstack(rows) if rows else np.zeros((0, 8))
    ok = known(every[:, 3])
    mean = float(np.average(every[ok, 3], weights=every[ok, 4])) if ok.any() else BARE_RADIUS_UM
    for e, w in zip(edges, rows):
        bare = ~known(w[:, 3])
        if not bare.any():
            continue
        joined = [r for n in (e['a'], e['b']) for owner, r in at.get(n, []) if owner != id(e)]
        w[bare, 3] = np.mean(joined) if joined else np.mean(w[~bare, 3]) if (~bare).any() else mean


def _label_tubes(truth):
    """The lab's provisional labels as tubes without width or depth, and the judged tiles."""
    rows, edge, boxes = [], [], []
    for t in truth['tiles']:
        x0, y0, x1, y1 = t['box_um']
        boxes.append(dict(x=[x0, x1], y=[y0, y1]))
        lines = [c['curve_um'] for c in t['curves'] if c['verdict'] == 'vessel'] + list(t.get('missed') or [])
        for line in lines:
            P = np.asarray(line, float)
            if len(P) >= 2:
                rows.append(_steps(np.column_stack([P[:, :2], np.full(len(P), np.nan)]), np.full(len(P), np.nan)))
                edge.append(np.full(len(rows[-1]), len(rows)))
    _give_widths([dict(a=2 * k, b=2 * k + 1) for k in range(len(rows))], rows)
    return _Tubes(rows, edge), boxes


def _in_boxes(xyz, boxes):
    inside = np.zeros(len(xyz), bool)
    for b in boxes:
        inside |= (xyz[:, 0] >= b['x'][0]) & (xyz[:, 0] <= b['x'][1]) & (xyz[:, 1] >= b['y'][0]) & (xyz[:, 1] <= b['y'][1])
    return inside


def _in_polygons(xyz, regions):
    inside = np.zeros(len(xyz), bool)
    x, y = xyz[:, 0], xyz[:, 1]
    for r in regions or []:
        poly = np.asarray(r['polygon'], float)
        odd = np.zeros(len(xyz), bool)
        for (x0, y0), (x1, y1) in zip(poly, np.roll(poly, -1, axis=0)):
            cross = (y0 > y) != (y1 > y)
            with np.errstate(divide='ignore', invalid='ignore'):
                odd ^= cross & (x < x0 + (y - y0) * (x1 - x0) / (y1 - y0))
        inside |= odd
    return inside


def _lens(d, r1, r2):
    """The area two discs of radius r1 and r2 share, their centres d apart."""
    d = np.maximum(d, 1e-12)
    small, big = np.minimum(r1, r2), np.maximum(r1, r2)
    a = np.clip((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1)
    b = np.clip((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1)
    root = np.sqrt(np.clip((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2), 0, None))
    lens = r1 * r1 * np.arccos(a) + r2 * r2 * np.arccos(b) - .5 * root
    return np.where(d >= r1 + r2, 0.0, np.where(d <= big - small, np.pi * small * small, lens))


def _in(P, Q, p_is_truth, z_um):
    """For each step of P: how much it is found (P the ground truth) or right (P the answer) against Q's tubes, by
    the step of Q that gives it most; how far the two reach each other at all (for sharing); and that step of Q."""
    if not len(P) or not len(Q):
        return np.zeros(len(P)), np.zeros(len(P)), np.zeros(len(P), int)
    from scipy.spatial import cKDTree
    depth = z_um is not None and not np.isnan(P.xyz[:, 2]).any() and not np.isnan(Q.xyz[:, 2]).any()
    place = lambda v: np.column_stack([v[:, :2], v[:, 2] * z_um]) if depth else v[:, :2]
    p, q = place(P.xyz), place(Q.xyz)
    heading = place(np.nan_to_num(Q.along))
    heading = heading / np.maximum(np.linalg.norm(heading, axis=1, keepdims=True), 1e-12)
    half = Q.len / 2
    k = min(NEIGHBOURS, len(Q))
    _, idx = cKDTree(q).query(p, k=k)
    idx = idx.reshape(len(P), k)
    best, touch, who = np.full(len(P), -1.0), np.zeros(len(P)), idx[:, 0].copy()
    for c in range(k):
        j = idx[:, c]
        # across the other's centerline; along it only what lies beyond the step's own stretch (past a vessel's end)
        gap = p - q[j]
        run = np.sum(gap * heading[j], axis=1)
        beyond = np.maximum(np.abs(run) - half[j], 0)
        d = np.sqrt(np.maximum(np.sum(gap * gap, axis=1) - run * run, 0) + beyond * beyond)
        rt, ra = (P.r, Q.r[j]) if p_is_truth else (Q.r[j], P.r)
        # the answer's disc inside the truth's tube at each width, over the disc that is judged: the truth's own
        # when the truth is asked how much of it is found, the answer's when the answer is asked how right it is
        over = np.pi * (rt if p_is_truth else ra) ** 2
        credit, before = np.zeros(len(P)), np.zeros(len(P))
        for times, worth in TIERS:
            held = np.minimum(_lens(d, times * rt, ra) / over, 1.0)
            credit += worth * np.maximum(held - before, 0)
            before = np.maximum(held, before)
        # the nearer step keeps a tie: a branch's first steps lie inside the trunk's tube as much as in its own
        better = credit > best + 1e-9
        best[better], who[better] = credit[better], j[better]
        reach = np.minimum(_lens(d, TIERS[-1][0] * rt, ra) / (np.pi * np.minimum(rt, ra) ** 2), 1.0)
        touch[better] = reach[better]
    return np.clip(best, 0, 1), touch, who


def score(answer, truth):
    """tp, fp and fn (µm of centerline) of a version's vessel model against one ground-truth file: a corrected
    vessel model, or the lab's provisional labels (its `tiles`); and what they are made of."""
    A = _model_tubes(answer, VESSEL)
    if 'tiles' in truth:
        T, boxes = _label_tubes(truth)
        T, A, z_um = T.keep(_in_boxes(T.xyz, boxes)), A.keep(_in_boxes(A.xyz, boxes)), None
    else:
        T, z_um = _model_tubes(truth, VESSEL), truth.get('z_step_um')
        excluded = truth.get('excluded_regions') or []
        T, A = T.keep(~_in_polygons(T.xyz, excluded)), A.keep(~_in_polygons(A.xyz, excluded))

    covered, t_touch, _ = _in(T, A, True, z_um)
    inside, a_touch, a_to = _in(A, T, False, z_um)
    # a vessel traced twice counts once: the answer's length on one truth vessel (a run of edges between
    # junctions or ends) is held to the length found of it
    if len(A) and len(T):
        found = np.bincount(T.edge, T.len * t_touch)
        claimed = np.bincount(T.edge[a_to], A.len * a_touch, len(found))
        # (to within a step: which of two vessels a step at their junction is counted on is arbitrary)
        inside = inside * np.minimum(1.0, (found + STEP_UM) / np.maximum(claimed, 1e-12))[T.edge[a_to]]

    tp = float(np.sum(T.len * covered))
    fn = float(np.sum(T.len)) - tp
    fp = float(np.sum(A.len * (1 - inside)))
    out = dict(tp=round(tp, 2), fp=round(max(fp, 0.0), 2), fn=round(max(fn, 0.0), 2),
               truth_um=round(float(T.len.sum()), 1), answer_um=round(float(A.len.sum()), 1),
               touched_um=round(float(np.sum(T.len * (covered > 0))), 1))
    return out
