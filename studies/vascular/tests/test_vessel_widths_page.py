"""req/vascular/truth/widths: the widths look of an open area, its lens, the widths set, nudged, marked cannot or put
back, Area is right marking the rest looked at, and the export (vessel_widths_driver.mjs, in headless Chromium on a
stack drawn there). SHOTS, when set, is a folder the driver saves a picture of the look and of the lens into."""
import json
import os
import shutil
import subprocess
import sys

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_vessel_widths_page(tmp_path):
    # the build's list of studies, which the switcher reads: made here, not left by another test's build
    sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'dev', 'tools', 'build'))
    import build
    studies = tmp_path / 'studies.json'
    studies.write_text(json.dumps(build.studies(os.path.join(HERE, '..', '..', '..'))))
    r = subprocess.run([NODE, os.path.join(HERE, 'vessel_widths_driver.mjs'), str(studies), *filter(None, [os.environ.get('SHOTS')])], capture_output=True, text=True, timeout=180)
    print(r.stdout, r.stderr)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    assert r.returncode == 0, r.stdout + r.stderr
