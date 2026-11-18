"""A ground-truth file read as the marked spots the scorer counts, and one answer's candidates scored against them.

A file is the page's (norfinder-ground-truth/3: the candidates that remain, the NoRs added by hand and the GT history
that made them; /2: its `labels`) or the lab's own (its `labels`, as /2 has them). Each spot is {x, y, label}: label 1
a NoR, 0 not one, None not judged; an added NoR carries its own radius_px.
"""
import base64
import json
import math
import zlib

import numpy as np

FORMATS = ('norfinder-ground-truth/2', 'norfinder-ground-truth/3')
# a passing candidate within this distance of a marked spot is on it (an added NoR carries its own radius_px)
MATCH_PX = 5
# an added NoR is found when a candidate lies within this distance of its middle (the page's MISSING_RADIUS)
MISSING_RADIUS = 12

SCORING = f"""- Each spot the ground truth marks is judged on its own, against the candidates the filters pass
- A passing candidate is on a spot when its centre lies within {MATCH_PX} pixels of it; a NoR added by hand counts \
within its own radius ({MISSING_RADIUS} pixels)
- tp: the spots marked a NoR with a passing candidate on them
- fn: the spots marked a NoR with none
- fp: the spots marked not a NoR with a passing candidate on them
- A pass on a spot nobody marked counts for neither, and one pass may sit on several spots
- The page's file gives its approved candidates and added NoRs as NoRs, and the candidates its history says the \
tagger deleted as not NoRs; a candidate never voted on is no spot"""


def _length(seg):
    (a, b), (c, d) = seg
    return math.hypot(c - a, d - b)


def _unpacked(output):
    if isinstance(output, dict) and isinstance(output.get('deflate'), str):
        return json.loads(zlib.decompress(base64.b64decode(output['deflate'])))
    return output


def _rejected(doc):
    """The candidates the tagger rejected: those of the last run in the file's history that a `delete` in it names and
    the file no longer lists. One the file lacks with no delete to say why is not known, and is no label."""
    actions = [a for a in (doc.get('history') or {}).get('actions') or [] if isinstance(a, dict)]
    runs = [a for a in actions if a.get('type') == 'run']
    if not runs:
        return []
    deleted = {a.get('cand') for a in actions if a.get('type') == 'delete'}
    have = {c.get('id') for c in doc.get('candidates') or []}
    return [c for c in _unpacked(runs[-1].get('output')).get('cands') or [] if c.get('id') in deleted and c.get('id') not in have]


def _mark(c, label, **more):
    return dict(id=c.get('id'), x=c['x'], y=c['y'], label=label, source='user', **more)


def labels_of(doc):
    """The marked spots of a ground-truth file: /2's and the lab's `labels`; /3's approved candidates (label 1, on the
    lengths the tagger left), approved added NoRs (kind `missing`) and a label 0 for each candidate the history says the
    tagger rejected (_rejected)."""
    if doc.get('format') != FORMATS[1]:
        return doc.get('labels')
    out = []
    for c in doc.get('candidates') or []:
        if not c.get('approved'):
            continue
        lines = dict(c.get('lines') or {}, **(c.get('edited') or {}))
        m = c.get('m') or {}
        px = {k: (_length(lines[k]) if k in (c.get('edited') or {}) else m.get(k + '_length' if k == 'red' else k))
              for k in ('length', 'red', 'width')}
        out.append(_mark(c, 1, decision='approved', measured='adjusted' if c.get('edited') else 'approved',
                         length_px=px['length'], red_length_px=px['red'], width_px=px['width'],
                         lines={k: lines[k] for k in ('length', 'red', 'width')} if lines else None))
    for a in doc.get('added') or []:
        if not a.get('approved'):
            continue
        L = a['lines']
        (p, q), (r, t) = L['length']
        out.append(dict(id=a.get('id'), kind='missing', origin='added by user', x=(p + r) / 2, y=(q + t) / 2, label=1, source='user',
                        radius_px=MISSING_RADIUS, decision='approved', measured='adjusted', length_px=_length(L['length']),
                        red_length_px=_length(L['red']), width_px=_length(L['width']), lines=L))
    return out + [_mark(c, 0, decision='rejected', measured=None) for c in _rejected(doc)]


def radius(L):
    return L.get('radius_px') or MATCH_PX


def score(cands, labels):
    """cands: [{cx, cy, fail, m?}]. {tp, fp, fn}; `missing_proposed`, the added NoRs some candidate lies on, passed or
    not (whether the finder proposes what a person said it overlooked); `checked`, the NoRs whose lengths a person
    adjusted or approved that a pass lies on, and `length_err` and `red_err`, the sums of how far its lengths are from
    theirs (pixels); and `items`, every judged spot's {id, x, y, label, hit}."""
    ps = np.array([(k['cx'], k['cy']) for k in cands if k['fail'] is None]).reshape(-1, 2)
    al = np.array([(k['cx'], k['cy']) for k in cands]).reshape(-1, 2)
    passes = [k for k in cands if k['fail'] is None]
    tp = fp = fn = proposed = checked = 0
    length_err = red_err = 0.0
    items = []
    for L in labels:
        if L['label'] is None:
            continue
        d = np.hypot(*(ps - (L['x'], L['y'])).T) if len(ps) else np.zeros(0)
        hit = bool(len(ps) and d.min() <= radius(L))
        items.append(dict(id=L.get('id'), x=L['x'], y=L['y'], label=L['label'], hit=hit))
        if L['label'] == 1:
            tp += hit
            fn += not hit
        elif hit:
            fp += 1
        if L.get('kind') == 'missing' and len(al) and np.hypot(*(al - (L['x'], L['y'])).T).min() <= radius(L):
            proposed += 1
        m = len(ps) and passes[int(d.argmin())].get('m')
        if L['label'] == 1 and L.get('measured') in ('adjusted', 'approved') and m and d.min() <= MATCH_PX:
            checked += 1
            length_err += abs(m['length'] - L['length_px'])
            red_err += abs(m['red_length'] - L['red_length_px'])
    return dict(tp=tp, fp=fp, fn=fn, missing_proposed=proposed, checked=checked, length_err=length_err, red_err=red_err,
                items=items)
