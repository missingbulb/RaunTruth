"""req/vascular/model/damaged — the model leaves the damaged areas out of its measurements, and the scorer out of the
score.

Run: python3 -m pytest studies/vascular/tests/test_damaged.py
"""
import os
import sys
import types

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'algorithm'))
import vascular as S
from test_scoring import answer_of, f, line, network, truth_of

UM = 0.5


@pytest.fixture
def version(monkeypatch):
    """A version drawing no vessel: what run adds to its model is all there is to see."""
    def extract(vol, um, source, z_step):
        Z, H, W = vol.shape
        return dict(format='vessel-model/2', source=source, slices=Z, size_px=[W, H], um_per_px=um, z_step_um=z_step,
                    nodes=[], edges=[], excluded_regions=[dict(polygon=[[0, 0], [1, 0], [1, 1]], reason='torn')])
    monkeypatch.setitem(sys.modules, 'acme_version', types.SimpleNamespace(extract=extract))
    return 'acme_version'


def image():
    return dict(cd31=np.zeros((3, 40, 60), np.uint16), um=UM, spacing=1.0, name='acme.tif')


def test_the_damaged_areas_join_the_model_s_excluded_areas_in_microns(version):
    m = S.run(version, image(), damaged=[[[10, 4], [30, 4], [30, 20]]])
    assert [r['polygon'] for r in m['excluded_regions']] == [[[0, 0], [1, 0], [1, 1]], [[5, 2], [15, 2], [15, 10]]]


def test_the_scorer_leaves_out_what_lies_in_a_damaged_area_on_both_sides():
    net = network()
    # the wide vessel at y 200-220 µm missed, and a vessel the truth does not have traced beside it
    answer = answer_of(net[:7] + net[8:] + [(line((220, 235), (330, 250)), 'vessel', 2.0)])
    assert f(answer, truth_of()) < 0.95
    # the band y 180-260 µm, in the stack's pixels
    um = truth_of()['um_per_px']
    band = [[x / um, y / um] for x, y in [[0, 180], [400, 180], [400, 260], [0, 260]]]
    g = S.score(answer, truth_of(), damaged=[band])
    assert (g['fn'], g['fp']) == (pytest.approx(0, abs=0.05), pytest.approx(0, abs=0.05))
