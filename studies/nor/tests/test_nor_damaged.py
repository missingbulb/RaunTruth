"""req/nor/find/damaged — the finders analyse no pixel of a damaged area, and the scorer counts no NoR in one."""
import os
import sys

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'algorithm'))
import nor_finder
from synthetic_nor import nor_image
from test_truth import PLACES, cand, right, three

# the image's left half, in its pixels
LEFT = [[[0, 0], [80, 0], [80, 160], [0, 160]]]


@pytest.fixture(scope='module')
def image(tmp_path_factory):
    return nor_finder.read(nor_image(str(tmp_path_factory.mktemp('damaged') / 'nodes.tif')))


def touching_left(found):
    """The candidates with a red or green pixel in the left half."""
    out = []
    for c in found.cands:
        x0 = c['box'][1]
        if any((np.nonzero(m)[1] + x0 < 80).any() for m in [c['red'], *c['greens']]):
            out.append(c)
    return out


@pytest.mark.parametrize('finder', list(nor_finder.VERSIONS))
def test_no_candidate_is_made_of_damaged_pixels(image, finder):
    run = nor_finder.VERSIONS[finder]
    assert touching_left(run(image)), 'the image has candidates in its left half to leave out'
    found = run(image, damaged=LEFT)
    assert found.cands and not touching_left(found)


def test_a_damaged_area_is_never_called_in_nucleus(image):
    # rf's blue mask fails candidates "in nucleus"; a damaged area leaves its pixels out and fails nothing
    found = nor_finder.VERSIONS['rf'](image, damaged=LEFT)
    whole = nor_finder.VERSIONS['rf'](image)
    nucleus = lambda f: sum(c['fail'] == 'in nucleus' for c in f.cands)
    assert nucleus(found) <= nucleus(whole)


def test_the_scorer_counts_no_nor_in_a_damaged_area():
    # the truth's NoRs in the left half go unfound, and the answer adds a pass there the truth does not have
    left = [p for p in PLACES if p[0] < 200]
    cands = [c for c in right() if c['cx'] >= 200] + [cand(100.0, 20.0, i=99)]
    whole = nor_finder.score(dict(cands=cands), three())
    assert whole['fn'] >= len(left) - 1e-6 and whole['fp'] > 0
    cut = nor_finder.score(dict(cands=cands), three(), damaged=[[[0, 0], [200, 0], [200, 400], [0, 400]]])
    assert (cut['tp'], cut['fp'], cut['fn']) == pytest.approx((len(PLACES) - len(left), 0, 0))
