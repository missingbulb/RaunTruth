"""req/vascular/truth/keys: the Ground Truth Tasks' keys (vessel_keys_driver.mjs, in headless Chromium with a stand-in
worker that answers Execute with a model fixture, over a drawn stack)."""
import json
import os
import sys

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_vessel_keys_page(tmp_path):
    sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'dev', 'tools', 'build'))
    import build
    studies = tmp_path / 'studies.json'
    studies.write_text(json.dumps(build.studies(os.path.join(HERE, '..', '..', '..'))))
    run_driver(os.path.join(HERE, 'vessel_keys_driver.mjs'), str(studies), timeout=180)
