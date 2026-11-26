"""The NoR Finder study's algorithm, as the page and the lab run it (lab/README.md): an image's NoRs found.

  read(path)                         the channels and the blue (DAPI) mask
  VERSIONS[finder](image, values=None, off=None, damaged=(), **overrides)
                                     a finder proposes candidates and measures each one (with its parameters, plus
                                     overrides), and the filters judge them (at their own values, plus values, less
                                     the filters named in off: all but controls.DEFAULT_ON unless off is given, as
                                     the page runs it); the pixels of the damaged areas (outlines in the image's pixels) are left
                                     out of finding

The page calls nothing but a version: its NoRs are the candidates an answer passes. The filters are the lab's to tune,
through SETTINGS.

The blue (DAPI) mask is only ever a filter here ('in nucleus'), never applied before finding.

Judging again reproduces a finder's own result exactly when the finder judges each candidate on its own (tl, fill,
walk, blobs). rf chooses between alternative greens using the checks, so at other filter values it approximates what rf
would find with them; at the finder's own values it returns the finder's own result.
"""
import math

import numpy as np
from skimage.draw import polygon as fill_polygon

import channels
import controls
import nor3
import truth
from controls import EXACT_REFILTER, FAINT, FINDERS, NUCLEUS, OWN_BLUE, POST, SHARED
from nor3 import CHECKS, ORDER, judge, resolve_overlaps


def read(path):
    """The image: its Caspr (green) and Nav (red) channels, its pixel size and the blue (DAPI) mask."""
    caspr, nav, um, dapi = channels.load(path)
    return dict(caspr=caspr, nav=nav, um=um, blue=channels.blue_mask(dapi))


class Found(dict):
    """A finder's answer, as the page reads it; it also holds the candidates themselves (masks and every measurement),
    which the filters judge again and which never leave Python."""
    cands, P, finder = [], {}, None


def _num(v):
    v = float(v)
    return round(v, 6) if math.isfinite(v) else None


def damaged_mask(shape, damaged):
    """The pixels whose centres lie in a damaged area ([[x, y], ...] in the image's pixels)."""
    out = np.zeros(shape, bool)
    for poly in damaged or ():
        q = np.asarray(poly, float)
        out[fill_polygon(q[:, 1] - 0.5, q[:, 0] - 0.5, shape)] = True
    return out


def detect(image, finder, overrides=None, damaged=()):
    """Run a finder with its parameters (plus overrides), leaving out the pixels of the damaged areas: each
    candidate's place, measurements and the finder's own verdict, and its segments, an h*w block at the candidate's
    `off` in `segments` (1 = red, 2 and 3 = the greens)."""
    fn, P = FINDERS[finder]
    P = dict(P, **(overrides or {}))
    bm = image['blue']
    gone = damaged_mask(bm.shape, damaged)
    if finder in OWN_BLUE:
        cands, info = fn(image['caspr'], image['nav'], bm, P, gone=gone)
    else:
        cands, info = fn(image['caspr'], image['nav'], gone, P)
    H, W = image['caspr'].shape
    blocks, off, rows = [], 0, []
    for i, c in enumerate(cands):
        # what the finder decided before any check: 'one green', 'no green', 'red not rectangular'...
        c['fail0'] = None if c['fail'] in CHECKS or c['fail'] in POST else c['fail']
        c['fail_found'] = c['fail']
        y0, x0 = c['box']; h, w = c['red'].shape
        c['red_on_blue'] = float(bm[y0:y0 + h, x0:x0 + w][c['red']].mean()) if c['red'].any() else 0.0
        seg = np.zeros((h, w), np.uint8)
        for j, g in enumerate(c['greens'][:2]):
            seg[g] = 2 + j
        seg[c['red']] = 1
        blocks.append(seg.ravel())
        row = dict(i=i, cx=_num(c['cx']), cy=_num(c['cy']), y0=int(y0), x0=int(x0), h=int(h), w=int(w), off=off,
                   fail0=c['fail0'], fail=c['fail'])
        off += h * w
        if len(c['greens']) == 2 and 'length_px' in c:
            L = c['lines']
            row['m'] = dict(length=_num(c['length_px']), red_length=_num(c['red_len_px']), width=_num(c['width_px']),
                            red_over_length=_num(c['red_len_px'] / c['length_px']), length_over_width=_num(c['aspect']))
            row['lines'] = {k: [[_num(x0 + q[1] + 0.5), _num(y0 + q[0] + 0.5)] for q in L[k]] for k in L}
            row['f'] = dict(opp_deg=c.get('opp_deg'), red_off_u=c.get('red_off_u'), axis_dev=c.get('axis_dev'),
                            red_purity=c.get('red_purity'), green_purity=max(c.get('green_purity', [0])),
                            green_balance=c.get('green_balance'), green_bright_balance=c.get('green_bright_balance'),
                            aspect=c.get('aspect'), solid=c.get('solid'), snr=c.get('snr'), red_on_blue=c['red_on_blue'])
            row['f'] = {k: _num(v) for k, v in row['f'].items() if v is not None}
        rows.append(row)
    found = Found(finder=finder, H=H, W=W, um=image['um'], unit=_num(info['unit']), cands=rows,
                  segments=np.concatenate(blocks) if blocks else np.zeros(0, np.uint8))
    found.cands, found.P, found.finder = cands, P, finder
    return found


def refilter(image, found, spec):
    """spec: {'values': {param: value}, 'off': [filter keys]}. Each candidate's result: None for a pass, else the
    failure reason."""
    values = spec.get('values', {}); p = dict(found.P, **values); off = set(spec.get('off', []))
    ours = {n: v for f in controls.filters(found.P) for n, v in f['params'].items()}
    cands = found.cands
    if found.finder not in EXACT_REFILTER and all(ours.get(n, v) == v for n, v in values.items()) and not off:
        # the finder's own result, so the page opens on exactly what the lab scores
        for c in cands:
            c['fail'] = c['fail_found']
        return [c['fail'] for c in cands]
    order = [k for k in ORDER if k not in off] + [k for k in CHECKS if k not in ORDER and k not in off]
    for c in cands:
        c['fail'] = c['fail0']
        judge(c, p, order)
        if c['fail'] is None and NUCLEUS not in off and c['red_on_blue'] >= p.get('nucleus_frac', POST[NUCLEUS][1]):
            c['fail'] = NUCLEUS
    if SHARED not in off:
        resolve_overlaps(cands, image['caspr'].shape, p.get('max_shared', POST[SHARED][1]))
    if FAINT not in off:
        nor3.red_floor(cands, p.get('red_floor_q', POST[FAINT][1]))
    return [c['fail'] for c in cands]


def version(finder):
    def run(image, values=None, off=None, damaged=(), **overrides):
        found = detect(image, finder, overrides, damaged)
        if off is None:
            off = [f['key'] for f in controls.filters(found.P) if f['key'] not in controls.DEFAULT_ON]
        for row, fail in zip(found['cands'], refilter(image, found, {'values': values or {}, 'off': off})):
            row['fail'] = fail
        return found
    run.__name__ = finder
    return run


def verify(image, found, map, mode, q):
    """A second opinion from a map of the image (an array of its shape): with mode 'reject', the passes whose red
    segment's mean on the map is below the q-quantile of the passes' own fail ('by the map'); with 'rescue', the
    candidates the finder or the filters failed (all but those with no green) at or above it pass. A new answer."""
    out = Found(found, cands=[dict(r) for r in found['cands']])
    out.cands, out.P, out.finder = found.cands, found.P, found.finder
    H, W = map.shape

    def mean(c):
        by, bx = c['box']; ys, xs = np.nonzero(c['red'])
        ys, xs = np.clip(ys + by, 0, H - 1), np.clip(xs + bx, 0, W - 1)
        return float(map[ys, xs].mean()) if len(ys) else float(map[int(c['cy']), int(c['cx'])])
    v = [mean(c) for c in found.cands]
    pv = [v[i] for i, r in enumerate(out['cands']) if r['fail'] is None]
    if not pv:
        return out
    t = np.quantile(pv, q)
    for i, r in enumerate(out['cands']):
        if mode == 'reject' and r['fail'] is None and v[i] < t:
            r['fail'] = 'by the map'
        elif mode == 'rescue' and r['fail'] not in (None, 'no green') and v[i] >= t:
            r['fail'] = None
    return out


VERSIONS = {f: version(f) for f in FINDERS}

STAGES = {'verify': verify}

# the image's planes a transform of the image may change, in the colours they are drawn: red, then green
PLANES = ('nav', 'caspr')

# each finder's default is its filters off but controls.DEFAULT_ON; it is scored beside its filters on at each preset,
# and with none on, the candidates its own structural checks keep (two greens around a red)
SETTINGS = {f: dict({p: dict(values=controls.preset_values(f, p), off=[]) for p in controls.PRESETS},
                    unfiltered=dict(off=[k['key'] for k in controls.filters(P)]))
            for f, (_, P) in FINDERS.items()}

NOTES = {f: 'with one filter on, not stick-like' for f in FINDERS}

SCORING = truth.SCORING


def score(answer, doc, damaged=()):
    return truth.score(answer['cands'], doc, damaged)


undone = truth.undone

