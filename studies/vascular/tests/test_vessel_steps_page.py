"""req/vascular/truth/tasks, req/vascular/truth/widths and req/vascular/truth/keys: an area's four steps, Doubts,
Junctions, Missed and Vessels, each answered by its keys, and the export (vessel_steps_driver.mjs, in headless Chromium
on a stack drawn there). SHOTS, when set, is a folder the driver saves a picture of each step into."""
import json
import os
import sys

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
from drivers import run_driver


def test_vessel_steps_page(tmp_path):
    # the build's list of studies, which the switcher reads: made here, not left by another test's build
    sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'dev', 'tools', 'build'))
    import build
    studies = tmp_path / 'studies.json'
    studies.write_text(json.dumps(build.studies(os.path.join(HERE, '..', '..', '..'))))
    r = run_driver(os.path.join(HERE, 'vessel_steps_driver.mjs'), str(studies), *filter(None, [os.environ.get('SHOTS')]), timeout=180, check=False)
    print(r.stdout, r.stderr)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    assert r.returncode == 0, r.stdout + r.stderr
