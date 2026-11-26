"""req/shelves/truth/task: the study's GT actions (web/gt_actions.js) on small hand-built books, and the colour of Edit History's ring against the photo's channels and what the page draws, run under Node."""
import os

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
from drivers import run_driver


@pytest.mark.parametrize('script', ['test_gt_actions.mjs', 'test_ring_colour.mjs'])
def test_gt_actions(script):
    r = run_driver(os.path.join(HERE, script), timeout=120, check=False)
    assert r.returncode == 0, r.stdout + r.stderr
