"""req/vascular/truth/widths: an area's widths step, its lens, a vessel selected, its width stepped or put back, These
widths look right marking the rest looked at and doing the area, and the export (vessel_widths_driver.mjs, in headless
Chromium on a stack drawn there). SHOTS, when set, is a folder the driver saves a picture of the step and of the lens
into."""
import json
import os
import shutil
import sys

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
from drivers import run_driver
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_vessel_widths_page(tmp_path):
    # the build's list of studies, which the switcher reads: made here, not left by another test's build
    sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'dev', 'tools', 'build'))
    import build
    studies = tmp_path / 'studies.json'
    studies.write_text(json.dumps(build.studies(os.path.join(HERE, '..', '..', '..'))))
    r = run_driver(os.path.join(HERE, 'vessel_widths_driver.mjs'), str(studies), *filter(None, [os.environ.get('SHOTS')]), timeout=180, check=False)
    print(r.stdout, r.stderr)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    assert r.returncode == 0, r.stdout + r.stderr
