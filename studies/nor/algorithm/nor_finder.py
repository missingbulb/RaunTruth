"""The NoR Finder study's algorithm, as the page and the lab run it (lab/README.md): an image detected once, then
filtered many times.

  read(path)                         the channels and the blue (DAPI) mask
  VERSIONS[finder](image, values=None, off=None, **overrides)
                                     the slow part: a finder proposes candidates and measures each one (with its
                                     parameters, plus overrides), and the filters judge them (at their own values,
                                     plus values, less the filters named in off)
  STAGES['refilter'](image, answer, spec)
                                     the fast part: the checks, the nucleus rule and one-pixel-per-NoR run again on
                                     the answer's stored measurements (milliseconds)

The blue (DAPI) mask is only ever a filter here ('in nucleus'), never applied before finding.

Refiltering reproduces a finder's own result exactly when the finder judges each candidate on its own (tl, fill, walk,
blobs). rf chooses between alternative greens using the checks, so after a filter change it is an approximation until
the finder runs again with the new values; at the finder's own values it returns the finder's own result.
"""
import math

import numpy as np

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


def detect(image, finder, overrides=None):
    """Run a finder with its parameters (plus overrides): each candidate's place, measurements and the finder's own
    verdict, and its segments, an h*w block at the candidate's `off` in `segments` (1 = red, 2 and 3 = the greens)."""
    fn, P = FINDERS[finder]
    P = dict(P, **(overrides or {}))
    bm = image['blue']
    cands, info = fn(image['caspr'], image['nav'], bm if finder in OWN_BLUE else np.zeros_like(bm), P)
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
    found = Found(finder=finder, exact_refilter=finder in EXACT_REFILTER, H=H, W=W, um=image['um'], unit=_num(info['unit']),
                  filters=controls.filters(P), detection_params=controls.detection_params(P), reasons=controls.reasons(),
                  pink=nor3.PINK, blue=nor3.BLUE, cands=rows,
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


def alone(image, found, spec):
    """What each filter rejects with every other filter off, at the values in spec (whether or not it is switched
    off): {'counts': {filter: n}, 'fails': per candidate, the filters that reject it, 'only': {filter: n} rejected by
    that filter and by no other switched on}. Candidates the finder already rejected are not counted."""
    p = dict(found.P, **spec.get('values', {})); keys = [f['key'] for f in controls.filters(found.P)]
    frac = p.get('nucleus_frac', POST[NUCLEUS][1])
    fails = [[] for _ in found.cands]; open_ = []
    for i, c in enumerate(found.cands):
        if c['fail0'] is not None or len(c['greens']) != 2:
            continue
        fails[i] = [k for k in keys if k in CHECKS and CHECKS[k](c, p)] + ([NUCLEUS] if c['red_on_blue'] >= frac else [])
        open_.append((i, dict(c, fail=None)))
    # one-pixel-per-NoR among every candidate the finder kept, the strongest first
    resolve_overlaps([c for _, c in open_], image['caspr'].shape, p.get('max_shared', POST[SHARED][1]))
    for i, c in open_:
        if c['fail'] == SHARED:
            fails[i].append(SHARED)
    nor3.red_floor([c for _, c in open_], p.get('red_floor_q', POST[FAINT][1]))
    for i, c in open_:
        if c['fail'] == FAINT:
            fails[i].append(FAINT)
    off = set(spec.get('off', []))
    only = {k: sum(k in f and all(o == k or o in off for o in f) for f in fails) for k in keys}
    return dict(counts={k: sum(k in f for f in fails) for k in keys}, only=only, fails=fails)


def version(finder):
    def run(image, values=None, off=None, **overrides):
        found = detect(image, finder, overrides)
        for row, fail in zip(found['cands'], refilter(image, found, {'values': values or {}, 'off': off or []})):
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

STAGES = {
    'refilter': lambda image, answer, spec: dict(fails=refilter(image, answer, spec), alone=alone(image, answer, spec)),
    'verify': verify,
}

# the image's planes a transform of the image may change, in the colours they are drawn: red, then green
PLANES = ('nav', 'caspr')

# each finder scored beside its own filters: at the stricter and the looser preset, and with no filter at all (the
# candidates its own structural checks keep: two greens around a red)
SETTINGS = {f: dict({p: dict(values=controls.preset_values(f, p)) for p in controls.PRESETS if p != 'balanced'},
                    unfiltered=dict(off=[k['key'] for k in controls.filters(P)]))
            for f, (_, P) in FINDERS.items()}

NOTES = {f: 'with its default filters' for f in FINDERS}

SCORING = truth.SCORING


def score(answer, doc):
    return truth.score(answer['cands'], truth.labels_of(doc))
