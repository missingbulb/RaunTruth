"""3 — the study's algorithm: detect, then filter on the stored measurements; the page runs it with one filter on."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
import controls
import nor3
import nor_finder
import pytest
from synthetic_nor import nor_image


class Recorder(dict):
    """Records every parameter a check reads."""
    def __init__(self):
        super().__init__(); self.read = set()

    def __getitem__(self, k):
        self.read.add(k); return 0.0

    def get(self, k, d=None):
        self.read.add(k); return 0.0


def test_every_parameter_a_check_reads_is_a_control():
    # a candidate that fails nothing, so each check reads all of its parameters
    c = dict(opp_deg=180, red_off_u=0, axis_dev=0, red_purity=0, green_purity=[0, 0], green_balance=1,
             green_bright_balance=1, aspect=10, solid=1, snr=100)
    cp = controls.check_params()
    assert set(cp) == set(nor3.CHECKS)
    for k, fn in nor3.CHECKS.items():
        p = Recorder(); fn(c, p)
        assert p.read == set(cp[k]), (k, p.read, cp[k])


def test_the_page_lists_exactly_the_finders_python_runs():
    # the page's list (web/algorithms.json) and the versions the algorithm runs are two artifacts that could drift
    listed = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'algorithms.json')))
    assert [a['key'] for a in listed] == list(nor_finder.VERSIONS)


@pytest.fixture(scope='module')
def found(tmp_path_factory):
    image = nor_finder.read(nor_image(str(tmp_path_factory.mktemp('algorithm') / 'nodes.tif')))
    return image, nor_finder.VERSIONS['tl'](image)


def test_the_answer_keeps_only_the_stick_like_filter_on(found):
    # the page shows the NoRs the default answer passes: recall first, with the one filter that costs it almost nothing
    # (req/nor/find/nors-only)
    image, a = found
    keys = [f['key'] for f in controls.filters(a.P)]
    assert [r['fail'] for r in a['cands']] == nor_finder.refilter(image, a, {'off': [k for k in keys if k != 'not stick-like']})
    assert a['segments'].nbytes == sum(r['h'] * r['w'] for r in a['cands'])
    # every candidate made too short to be stick-like: the filter rejects each one the finder measured, and no other does
    short = nor_finder.VERSIONS['tl'](image, min_aspect=1e9)
    judged = [r['fail'] for r in short['cands'] if 'm' in r]
    assert judged and set(judged) == {'not stick-like'}, judged


def test_a_stricter_filter_only_removes(found):
    image, a = found
    passing = lambda sp: {i for i, f in enumerate(nor_finder.refilter(image, a, sp)) if f is None}
    assert passing({'values': {'min_snr': 6}, 'off': [controls.SHARED]}) <= passing({'off': [controls.SHARED]})


def test_the_page_asks_python_for_nothing_but_a_run():
    assert 'refilter' not in nor_finder.STAGES
