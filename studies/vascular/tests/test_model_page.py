"""req/vascular/model/view, req/vascular/model/correct and req/vascular/model/cards: what the main view shows, the model
corrected over the stack and its item cards, in a Review study (model_page_driver.mjs, in headless Chromium with a stand-in worker)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_model_page(tmp_path):
    # the build's list of studies, which the switcher reads: made here, not left by another test's build
    import json, sys
    sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'dev', 'tools', 'build'))
    import build
    studies = tmp_path / 'studies.json'
    studies.write_text(json.dumps(build.studies(os.path.join(HERE, '..', '..', '..'))))
    run_driver(os.path.join(HERE, 'model_page_driver.mjs'), str(studies), timeout=180)
