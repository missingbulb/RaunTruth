"""A study's Python failing on an image reaches the page as an error message, as the real worker's does, never as an
uncaught error that leaves the run unsettled (stand_in_error_driver.mjs)."""
import json

import numpy as np
import pytest
import tifffile

from test_study_runs import answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


def test_a_study_failing_on_its_image_is_an_error_message_not_an_uncaught_one(answers, tmp_path):
    (tmp_path / 'drive').mkdir()
    two = tmp_path / 'two.tif'
    y, x = np.mgrid[0:60, 0:80]
    tifffile.imwrite(two, np.stack([(x * 3).astype(np.uint8), (y * 4).astype(np.uint8)]), imagej=True, metadata={'axes': 'CYX'})
    import os, sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'studies', 'nor', 'tests'))
    from synthetic_nor import nor_image
    nor = nor_image(str(tmp_path / 'nor.tif'))
    live = tmp_path / 'answers.json'
    live.write_text(json.dumps({**json.load(open(answers[0], encoding='utf-8')), 'live': ['nor']}))
    run('stand_in_error_driver.mjs', str(live), answers[1], str(tmp_path / 'drive'), str(two), nor)
