"""req/shelves/truth/task: the study's GT actions (web/gt_actions.js) on small hand-built books, and the colour of Edit History's ring against the photo's channels and what the page draws, run under Node."""
import os
import shutil
import subprocess

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
@pytest.mark.parametrize('script', ['test_gt_actions.mjs', 'test_ring_colour.mjs'])
def test_gt_actions(script):
    r = subprocess.run([NODE, os.path.join(HERE, script)], capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stdout + r.stderr
