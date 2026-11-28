"""The vessel model's edits and ids, the review's coverage tube and the Summary's numbers, in the page's own JavaScript (web/model.js, web/summary.js,
web/coverage.js): test_vessel_model_edits.mjs, test_microviewer_coverage.mjs, test_vessel_summary.mjs, test_vessel_networks.mjs, test_gt_actions.mjs and, for the colour of Edit History's ring, test_ring_colour.mjs, run under Node."""
import os

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
from drivers import run_driver


@pytest.mark.parametrize('script', ['test_vessel_model_edits.mjs', 'test_microviewer_coverage.mjs', 'test_vessel_summary.mjs', 'test_vessel_networks.mjs', 'test_gt_actions.mjs', 'test_ring_colour.mjs'])
def test_model_js(script):
    r = run_driver(os.path.join(HERE, script), timeout=120, check=False)
    assert r.returncode == 0, r.stdout + r.stderr
