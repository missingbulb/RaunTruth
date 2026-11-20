"""req/shelves/truth/task: the page straightens a book for its reading as the finder does (books.straighten), within a
level per channel, on a colour photo and a grey one, upright, tilted, perspective and past the photo's edge boxes."""
import base64
import json
import os
import shutil
import subprocess
import sys

import numpy as np
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
import books

pytestmark = pytest.mark.full

NODE = shutil.which('node')
BOXES = [
    [[40, 50], [90, 50], [90, 200], [40, 200]],
    [[130.3, 20.7], [171.9, 31.2], [140.4, 190.6], [98.2, 180.1]],
    [[200, 30], [290, 60], [280, 170], [210, 210]],
    [[-30, 50], [40, 50], [40, 200], [-30, 200]],
    [[250, 180], [330, 180], [330, 260], [250, 260]],
    [[400, 300], [450, 300], [450, 350], [400, 350]],
]


def page_crops(rgb, grey, tmp_path):
    planes = rgb[..., :1] if grey else rgb
    doc = dict(W=rgb.shape[1], H=rgb.shape[0], boxes=BOXES,
               planes=base64.b64encode(np.ascontiguousarray(planes.transpose(2, 0, 1)).tobytes()).decode())
    (tmp_path / 'in.json').write_text(json.dumps(doc))
    r = subprocess.run([NODE, os.path.join(HERE, 'straighten_driver.mjs'), str(tmp_path / 'in.json'), str(tmp_path / 'out.json')],
                       capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    return [np.frombuffer(base64.b64decode(c['data']), np.uint8).reshape(c['height'], c['width'], 4)
            for c in json.loads((tmp_path / 'out.json').read_text())]


@pytest.mark.skipif(not NODE, reason='node missing')
@pytest.mark.parametrize('grey', [False, True])
def test_the_page_straightens_as_the_finder_does(grey, tmp_path):
    rng = np.random.default_rng(7)
    rgb = rng.integers(0, 256, (240, 320, 3), dtype=np.uint8)
    if grey:
        rgb[..., 1] = rgb[..., 2] = rgb[..., 0]
    for corners, got in zip(BOXES, page_crops(rgb, grey, tmp_path)):
        want = books.straighten(rgb, corners)
        assert got.shape == want.shape, (corners, got.shape, want.shape)
        diff = np.abs(got.astype(int) - want.astype(int))
        assert diff.max() <= 1, (corners, int(diff.max()), int((diff > 0).sum()))
