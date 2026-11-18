"""3 — the study's algorithm: detect once, then filter on the stored measurements, the page's controls for each finder,
and the filters' own counts."""
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


def test_each_finder_names_its_main_settings():
    # the page shows these first; each must be a real detection parameter of that finder
    for f in controls.FINDERS:
        fn, P = controls.FINDERS[f]
        d = controls.describe(f)
        assert fn.MAIN and list(fn.MAIN) == d['main_params'], (f, fn.MAIN, d['main_params'])


def test_the_page_lists_exactly_the_finders_python_runs():
    # the page's list (web/algorithms.json) and the versions the algorithm runs are two artifacts that could drift
    listed = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'algorithms.json')))
    assert [a['key'] for a in listed] == list(nor_finder.VERSIONS)


def test_every_setting_is_explained():
    # the page shows a ? with HELP beside every setting
    for f in controls.FINDERS:
        d = controls.describe(f)
        shown = set(d['detection_params']) | {n for fl in d['filters'] for n in fl['params']}
        missing = shown - set(d['help'])
        assert not missing, (f, sorted(missing))


def test_every_reason_has_its_own_letter_and_title():
    # the page tells reasons apart by one letter each, with a short title and a line saying what it means
    seen = 0
    for f in controls.FINDERS:
        d = controls.describe(f)
        letters = [r['letter'] for r in d['reasons'].values()]
        assert len(set(letters)) == len(letters), (f, sorted(letters))
        for k, r in d['reasons'].items():
            assert len(r['letter']) == 1 and r['letter'] != 'X' and r['title'] and r['text'], (f, k, r)
            seen += 1
        for fl in d['filters']:
            assert (fl['letter'], fl['title']) == (d['reasons'][fl['key']]['letter'], d['reasons'][fl['key']]['title'])
    assert seen >= 5 * 11


@pytest.fixture(scope='module')
def found(tmp_path_factory):
    image = nor_finder.read(nor_image(str(tmp_path_factory.mktemp('algorithm') / 'nodes.tif')))
    return image, nor_finder.VERSIONS['tl'](image)


def test_the_answer_s_verdicts_are_the_filters_at_the_finder_s_own_values(found):
    image, a = found
    assert [r['fail'] for r in a['cands']] == nor_finder.refilter(image, a, {'values': controls.own_values('tl')})
    assert a['segments'].nbytes == sum(r['h'] * r['w'] for r in a['cands'])


def test_each_filter_s_count_is_what_it_rejects_with_every_other_filter_off(found):
    image, a = found
    spec = {'values': {'min_snr': 4}}
    alone = nor_finder.alone(image, a, spec)
    keys = [f['key'] for f in controls.filters(a.P)]
    for k in keys:
        fails = nor_finder.refilter(image, a, dict(spec, off=[o for o in keys if o != k]))
        assert sum(f == k for f in fails) == alone['counts'][k], k
        assert sum(k in x for x in alone['fails']) == alone['counts'][k], k
    # a stricter value only removes passes
    passing = lambda sp: {i for i, f in enumerate(nor_finder.refilter(image, a, sp)) if f is None}
    assert passing({'values': {'min_snr': 6}, 'off': [controls.SHARED]}) <= passing({'off': [controls.SHARED]})


def test_the_stage_answers_the_page_s_refilter(found):
    image, a = found
    got = nor_finder.STAGES['refilter'](image, a, {'values': {}, 'off': []})
    assert got['fails'] == nor_finder.refilter(image, a, {'values': {}, 'off': []}) and set(got['alone']) == {'counts', 'only', 'fails'}
