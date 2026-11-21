"""The finders and each one's filters, read from nor3.CHECKS, with the filters' three presets: the lab's to tune (the
page runs every finder with them off but DEFAULT_ON). A check added to nor3.CHECKS, with its parameters read through `p[...]`
or `p.get(...)`, becomes a filter by itself.
"""
import ast
import functools
import inspect

import nor3
import nor_rf
import nor_tl
from nor3 import CHECKS, ORDER, REASONS, REASON_TEXT

# the finders, in the order the page's list (web/algorithms.json) offers them: (function, parameters)
FINDERS = {
    'tl': (nor_tl.segment_tl, nor_tl.PT),
    'rf': (nor_rf.segment_rf, nor_rf.PR),
    'fill': (nor3.segment_fill, nor3.P3),
    'walk': (nor3.segment_walk, nor3.P2),
    'blobs': (nor3.segment, nor3.P),
}
# the finders whose result the filters reproduce exactly, since they judge each candidate on its own; rf chooses
# between alternative greens using the checks
EXACT_REFILTER = {'tl', 'fill', 'walk', 'blobs'}
# finders that take the blue mask themselves and apply it only after finding; every other finder sees no mask, so
# nuclei are left to the 'in nucleus' filter
OWN_BLUE = {'rf'}
# the filters a version keeps on unless told otherwise, as the page runs it: recall first, with the one filter that
# costs it almost none (lab/ledger.md §7)
DEFAULT_ON = ('not stick-like',)
# failures that come after the checks and have their own parameter (their defaults when a finder has none)
NUCLEUS, SHARED, FAINT = 'in nucleus', 'shares a segment', nor3.FAINT
POST = {NUCLEUS: ('nucleus_frac', 0.8), SHARED: ('max_shared', 0.3), FAINT: ('red_floor_q', 0.0)}
REASON_TEXT.setdefault(NUCLEUS, 'red mostly on a nucleus (blue mask, applied after finding)')
REASONS.setdefault(NUCLEUS, ('N', (90, 140, 255)))

# The filters' presets: balanced is the finder's own filter values, precise every filter moved PRESETS['precise'] of
# the way towards STRICT, recalling the same share towards LOOSE. One share for every filter and every finder, chosen
# by hand rather than fitted: fitting filter values to the labels did not hold up on held-out labels (lab/ledger.md
# §5), so a preset is a move along the trade-off, not a tuned optimum.
PRESETS = {'precise': 0.4, 'balanced': 0.0, 'recalling': -0.4}
STRICT = dict(min_green_balance=0.5, min_snr=5.0, purity=0.1, min_opposite=140, max_off_u=0.5, max_axis_dev=10,
              min_aspect=4.5, min_solid=0.95, nucleus_frac=0.5, max_shared=0.1, red_floor_q=0.25)
LOOSE = dict(min_green_balance=0.1, min_snr=2.0, purity=0.4, min_opposite=80, max_off_u=2.0, max_axis_dev=45,
             min_aspect=2.0, min_solid=0.5, nucleus_frac=1.0, max_shared=0.6, red_floor_q=0.0)
# a value at which a filter is off for that finder; a preset leaves it off
OFF = dict(max_off_u=99, max_axis_dev=180, min_solid=0, red_floor_q=0.0)


def check_params():
    """{check: {param: default}}, read from the source of nor3.CHECKS. A default is the one given to p.get(); None
    means the finder's parameter set must supply it."""
    return {k: dict(ps) for k, ps in _check_params().items()}


@functools.lru_cache(maxsize=None)
def _check_params():
    tree = ast.parse(inspect.getsource(nor3))
    node = next(n for n in tree.body if isinstance(n, ast.Assign) and getattr(n.targets[0], 'id', '') == 'CHECKS')
    out = {}
    for k, v in zip(node.value.keys, node.value.values):
        ps = {}
        for n in ast.walk(v):
            if isinstance(n, ast.Subscript) and getattr(n.value, 'id', '') == 'p' and isinstance(n.slice, ast.Constant):
                ps.setdefault(n.slice.value, None)
            elif (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'get'
                  and getattr(n.func.value, 'id', '') == 'p' and isinstance(n.args[0], ast.Constant)):
                ps[n.args[0].value] = n.args[1].value if len(n.args) > 1 else None
        out[k.value] = ps
    return out


def filters(P):
    """A finder's filters at its parameters P: one per check in judging order, then the nucleus rule and
    one-pixel-per-NoR, each with its key and its parameters' values."""
    cp = check_params(); out = []
    for k in ORDER + [c for c in CHECKS if c not in ORDER] + list(POST):
        ps = cp[k] if k in CHECKS else {POST[k][0]: POST[k][1]}
        vals = {n: P.get(n, d) for n, d in ps.items()}
        out.append(dict(key=k, params={n: v for n, v in vals.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}))
    return out


def own_values(finder):
    return {k: v for f in filters(FINDERS[finder][1]) for k, v in f['params'].items()}


def preset_values(finder, preset):
    s = PRESETS[preset]; end = STRICT if s > 0 else LOOSE; out = {}
    for k, v in own_values(finder).items():
        out[k] = v if k in OFF and v == OFF[k] else round(v + abs(s) * (end[k] - v), 4)
    return out
