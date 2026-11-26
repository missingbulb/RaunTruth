"""A ground-truth file read as its elements, and one answer's NoRs paired one-to-one with the truth's, each pair
credited by how well it is placed and, where the truth carries lengths, how well it is measured.

A file is the page's (norfinder-ground-truth/4: the candidates that remain, the NoRs added and the boxes checked for
missed NoRs; /3: the same with the areas checked of its `grid`; /2: its `labels`) or the lab's own
(its `labels`, as /2 has them).

A ground-truth element is read for its own state only: a NoR, not a NoR, or undecided; where it came from (a finder's
candidate, a mark somebody added) changes nothing. An answer's NoR is a candidate its filters pass; a failed
candidate is not part of the answer.
"""
import math

import numpy as np

FORMATS = ('norfinder-ground-truth/2', 'norfinder-ground-truth/3', 'norfinder-ground-truth/4')
GRID = 10  # a /3 file's areas each way, when it does not say (its `grid`)

# Two marks of one NoR agree fully while they are this fraction of the node's (red) length apart: the spread of two
# descriptions of one node (on the reference slide, of the nearest NoRs two finders give within one red length, 88%
# lie within it). The same slack, a quarter of the object's size, as Acerbis et al. 2025 use for nuclei.
SLACK = 0.25
# ...and not at all from one whole node length apart: both marks cannot then be on the node. Credit falls linearly
# between the two, so there is no distance at which a pairing starts or stops.
REACH = 1.0
# A paired NoR is half found and half measured, where the truth carries lengths to measure it against (the owner's
# call: 0 scores finding alone).
MEASURE_SHARE = 0.5
# The agreement (smaller over larger) two unrelated NoRs' lengths reach by chance: the mean over every pair of
# passing candidates of the five finders on the reference slide (docs/scoring.md). An agreement at this
# level earns nothing.
CHANCE = dict(length=0.83, red=0.73, width=0.78)
LINES = ('length', 'red', 'width')

SCORING = f"""- A NoR of the answer is a candidate its filters pass; a NoR of the ground truth is an element marked a \
NoR. Where an element came from is not read
- Each has a place: its own point, and the middle of its red line; the nearer of the two tells how far apart two \
are
- Two are **close** by 1 up to {SLACK:g} of the truth NoR's red length apart, falling evenly to 0 at {REACH:g} red \
length (a truth with no lines: the answer's median red length)
- Pair them one-to-one, the closest first
- A pair's **quality** is its closeness; where the ground truth carries lengths, half of it is how well the three \
lengths agree (smaller over larger, less what unrelated NoRs reach by chance)
- tp: the sum of the pairs' qualities
- fn: the rest of each paired truth NoR, and 1 for each unpaired one
- fp: the rest of each paired answer NoR, and 1 for each unpaired one
- Only ground truth with every tagging task done is scored; what the tasks marked (areas checked, verdicts) is not \
read
- A failed candidate is not in the answer"""


def _len(seg):
    (a, b), (c, d) = seg
    return math.hypot(c - a, d - b)


def _mid(seg):
    (a, b), (c, d) = seg
    return (a + c) / 2, (b + d) / 2


def _element(state, eid=None, x=None, y=None, lines=None, sizes=None):
    """One element: its state, its place and its lengths in pixels. Its place is told two ways, by whichever the
    element carries: its own point (x, y) and the middle of its red line (rx, ry); x, y fall back on the latter."""
    sizes = dict(sizes or {})
    rx = ry = None
    if lines and all(k in lines for k in LINES):
        rx, ry = _mid(lines['red'])
        sizes = {k: _len(lines[k]) for k in LINES}
    if x is None or y is None:
        x, y, own = rx, ry, False
    else:
        own = True
    return dict(id=eid, state=state, x=float(x), y=float(y), own=own, rx=rx, ry=ry, **{k: sizes.get(k) for k in LINES})


def truth_of(doc):
    """Every element of a ground-truth file as {id, state, x, y, length, red, width}, state one of 'nor', 'not' and
    'undecided'. /3 and /4: an element marked approved is a NoR, one the file lists unapproved is undecided; the file's
    history is never read. /2 and the lab's files: a label 1 is a NoR, 0 not one, null undecided."""
    if doc.get('format') not in FORMATS[1:]:
        out = []
        for L in doc.get('labels') or []:
            sizes = dict(length=L.get('length_px'), red=L.get('red_length_px'), width=L.get('width_px'))
            state = {1: 'nor', 0: 'not'}.get(L.get('label'), 'undecided')
            out.append(_element(state, L.get('id'), L['x'], L['y'], L.get('lines'), sizes))
        return out
    out = []
    for e in (doc.get('candidates') or []) + (doc.get('added') or []):
        lines = dict(e.get('lines') or {}, **(e.get('edited') or {})) or None
        out.append(_element('nor' if e.get('approved') else 'undecided', e.get('id'), e.get('x'), e.get('y'), lines))
    return out


def _covered(boxes, W, H):
    """Whether the boxes [x0, y0, x1, y1] (x1, y1 not included) cover every pixel of a W x H image."""
    xs = sorted({0, W, *(min(max(v, 0), W) for b in boxes for v in (b[0], b[2]))})
    ys = sorted({0, H, *(min(max(v, 0), H) for b in boxes for v in (b[1], b[3]))})
    for xa, xb in zip(xs, xs[1:]):
        for ya, yb in zip(ys, ys[1:]):
            if not any(b[0] <= xa and xb <= b[2] and b[1] <= ya and yb <= b[3] for b in boxes):
                return False
    return True


def undone(doc):
    """The tagging task a ground-truth file left undone, in words, or None when every one is done: each finalist and
    each added NoR has a verdict, and the whole image is checked for missed NoRs. Only a file with none undone is
    scored (the owner's call, 2026-11-26). A /2 file and the lab's labels never had the check."""
    if doc.get('format') not in FORMATS[1:]:
        return 'its labels were never checked for missed NoRs'
    if any(not c.get('approved') and c.get('fail') is None for c in doc.get('candidates') or []):
        return 'a finalist has no verdict'
    if any(not a.get('approved') for a in doc.get('added') or []):
        return 'an added NoR has no verdict'
    image = doc.get('image') or {}
    W, H = image.get('width'), image.get('height')
    if not (W and H):
        return 'the image has no size to check it against'
    if doc.get('format') == FORMATS[2]:
        boxes = [b for b in doc.get('checked') or [] if len(b) == 4]
        return None if _covered(boxes, W, H) else 'part of the image is not checked for missed NoRs'
    grid = doc.get('grid') or GRID
    return None if set(range(grid * grid)) <= set(doc.get('areas') or []) else 'an area is not checked for missed NoRs'


def answer_of(cands):
    """The answer's candidates as elements: state 'nor' for a pass, 'failed' for the rest."""
    out = []
    for c in cands:
        m = c.get('m') or {}
        sizes = dict(length=m.get('length'), red=m.get('red_length'), width=m.get('width'))
        out.append(_element('nor' if c.get('fail') is None else 'failed', c.get('i'), c['cx'], c['cy'], c.get('lines'), sizes))
    return out


def closeness(a, t, typical):
    """How close each of the answer's elements a is to each of the truth's t, 0 to 1, and the distances. The scale
    is the truth element's own red length; for one that carries none, `typical`, the answer's typical red length
    (not the answering NoR's own: a long invented blob would then reach its neighbours)."""
    if not len(a) or not len(t):
        return np.zeros((len(a), len(t))), np.zeros((len(a), len(t)))
    nan = float('nan')

    def apart(kx, ky, have):
        return np.hypot(np.subtract.outer([e[kx] if have(e) else nan for e in a], [e[kx] if have(e) else nan for e in t]),
                        np.subtract.outer([e[ky] if have(e) else nan for e in a], [e[ky] if have(e) else nan for e in t]))
    # by the points both carry and by the red lines both carry, whichever says nearer; else point against line
    d = np.fmin(apart('x', 'y', lambda e: e['own']), apart('rx', 'ry', lambda e: e['rx'] is not None))
    d = np.where(np.isnan(d), apart('x', 'y', lambda e: True), d)
    s = np.array([e['red'] or typical or nan for e in t], float)[None, :] + 0 * d
    with np.errstate(invalid='ignore', divide='ignore'):
        c = np.clip((REACH - d / s) / (REACH - SLACK), 0, 1)
    # no scale anywhere: only the same place is the same NoR
    return np.where(np.isnan(s), (d == 0).astype(float), c), d


def agreement(a, t):
    """How well a's lengths agree with t's, 0 to 1, over the lengths t carries; None when it carries none. A length
    the answer lacks agrees by 0."""
    got = []
    for k in LINES:
        if not t[k]:
            continue
        r = min(a[k], t[k]) / max(a[k], t[k]) if a[k] else 0.0
        got.append(max(0.0, (r - CHANCE[k]) / (1 - CHANCE[k])))
    return sum(got) / len(got) if got else None


# a graded item counts as kept (its `hit`) from this much: more right than wrong
HIT = 0.5


def _in_any(polys, x, y):
    """Whether x, y lies inside any of the polygons [[x, y], ...]: a ray from it crosses a border an odd number of times."""
    if x is None or y is None:
        return False
    for poly in polys:
        k = False
        for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
            if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
                k = not k
        if k:
            return True
    return False


def score(cands, doc, damaged=()):
    """{tp, fp, fn}, soft counts of NoRs, the elements of either side whose centre lies in a damaged area left out. Beside them, not part of the score: `pairs`, the pairs made; `found`, the
    sum of their closeness (what tp would be were lengths not scored); `proposed`, the truth NoRs left unpaired that
    a failed candidate lies on; `measured`, the pairs whose truth carries lengths, and `length_err` and `red_err`,
    the sums of how far the answer's are from them (pixels); `items`, every element marked a NoR or not one as
    {id, x, y, label, hit, tp}; `answers`, every NoR of the answer as {id, x, y, pair, tp, fp}."""
    elements = truth_of(doc)
    mine = answer_of(cands)
    if damaged:
        damaged = [[list(q) for q in p] for p in damaged]
        elements = [e for e in elements if not _in_any(damaged, e['x'], e['y'])]
        mine = [e for e in mine if not _in_any(damaged, e['x'], e['y'])]
    passes = [e for e in mine if e['state'] == 'nor']
    failed = [e for e in mine if e['state'] == 'failed']
    reds = [e['red'] for e in passes if e['red']] or [e['red'] for e in elements if e['red']]
    typical = float(np.median(reds)) if reds else None
    by = {s: [e for e in elements if e['state'] == s] for s in ('nor', 'not', 'undecided')}
    C, D = closeness(passes, by['nor'], typical)
    G = {(i, j): agreement(passes[i], by['nor'][j]) for i, j in zip(*np.nonzero(C))}

    # the closest first, then the better measured; ties by place, so the order of either list changes nothing
    order = sorted(G, key=lambda p: (-C[p], -(G[p] or 0), D[p], by['nor'][p[1]]['x'], by['nor'][p[1]]['y'],
                                     passes[p[0]]['x'], passes[p[0]]['y']))
    pair, back = {}, {}
    for i, j in order:
        if i not in pair and j not in back:
            pair[i], back[j] = j, i

    N = closeness(passes, by['not'], typical)[0]
    onfail = closeness(failed, by['nor'], typical)[0].max(axis=0, initial=0.0)

    tp = fp = fn = found = proposed = length_err = red_err = 0.0
    measured, quality, answers = 0, {}, []
    for i, a in enumerate(passes):
        j, q = pair.get(i), 0.0
        if j is not None:
            t, g = by['nor'][j], G[i, j]
            q = float(C[i, j]) * (1.0 if g is None else 1 - MEASURE_SHARE + MEASURE_SHARE * g)
            quality[j] = q
            found += float(C[i, j])
            if g is not None:
                measured += 1
                length_err += abs((a['length'] or 0) - t['length']) if t['length'] else 0.0
                red_err += abs((a['red'] or 0) - t['red']) if t['red'] else 0.0
        wrong = 1 - q
        tp += q
        fp += wrong
        answers.append(dict(id=a['id'], x=a['x'], y=a['y'], pair=None if j is None else by['nor'][j]['id'], tp=q, fp=wrong))
    items = []
    for j, t in enumerate(by['nor']):
        q = quality.get(j, 0.0)
        fn += 1 - q
        if j not in back and len(failed):
            proposed += float(onfail[j])
        items.append(dict(id=t['id'], x=t['x'], y=t['y'], label=1, hit=q >= HIT, tp=q))
    for j, t in enumerate(by['not']):
        on = float(N[:, j].max(initial=0.0)) if len(passes) else 0.0
        items.append(dict(id=t['id'], x=t['x'], y=t['y'], label=0, hit=on >= HIT, tp=0.0))
    r = lambda v: round(v, 6)
    return dict(tp=r(tp), fp=r(fp), fn=r(fn), pairs=len(pair), found=r(found), proposed=r(proposed), measured=measured,
                length_err=r(length_err), red_err=r(red_err), items=items, answers=answers)
