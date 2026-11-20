"""An image with nothing to find in it (blank, one flat level, saturated, half saturated, or red spots with no green
beside them): every finder finds no candidate, and the filters run on that answer as on any other."""
import os
import sys

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'algorithm'))
import nor_finder
from synthetic_nor import write

SIDE, TOP = 96, np.iinfo(np.uint16).max


def blank():
    return np.zeros((3, SIDE, SIDE), np.uint16)


def flat():
    return np.full((3, SIDE, SIDE), 37, np.uint16)


def saturated():
    return np.full((3, SIDE, SIDE), TOP, np.uint16)


def half_saturated():
    a = blank(); a[:, :, SIDE // 2:] = TOP
    return a


def red_alone():
    # Nav spots and a nucleus on a dark slide, the Caspr channel empty: a node needs its two paranodes
    a = blank(); y, x = np.mgrid[0:SIDE, 0:SIDE]
    spot = lambda cy, cx, r, peak: (peak * np.exp(-((y - cy) ** 2 + (x - cx) ** 2) / (2.0 * r * r))).astype(np.uint16)
    a[0] += spot(48, 48, 9, 1500)
    for cy, cx in [(12, 12), (15, 80), (80, 15), (84, 84)]:
        a[2] += spot(cy, cx, 1.5, 800)
    return a


IMAGES = dict(blank=blank, flat=flat, saturated=saturated, half_saturated=half_saturated, red_alone=red_alone)


@pytest.fixture(scope='module', params=list(IMAGES))
def image(request, tmp_path_factory):
    return nor_finder.read(write(str(tmp_path_factory.mktemp('featureless') / f'{request.param}.tif'), IMAGES[request.param]()))


@pytest.mark.parametrize('finder', list(nor_finder.VERSIONS))
def test_a_finder_finds_nothing_where_there_is_nothing(image, finder):
    found = nor_finder.VERSIONS[finder](image)
    assert found['cands'] == [] and found.cands == [] and found['segments'].size == 0
    stage = nor_finder.STAGES['refilter'](image, found, {'values': {}, 'off': []})
    assert stage['fails'] == [] and stage['alone']['fails'] == []
