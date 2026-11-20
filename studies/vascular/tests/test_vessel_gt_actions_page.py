"""req/vascular/model/correct, req/vascular/model/ground-truth and req/shell/ground-truth/legacy: the study's GT actions in the page, as a Ground
Truth Tagger (vessel_gt_actions_driver.mjs, in headless Chromium with a stand-in worker that answers Execute with a model fixture): a drag
recorded once at its drop and never by Escape, the shell's Undo and Redo, the ids and no clock in the file, Save Draft with Load draft, and the
edits kept in this browser before Edit History offered once."""
import json
import os
import shutil
import sys

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_vessel_gt_actions_page(tmp_path):
    # the build's list of studies, which the switcher reads: made here, not left by another test's build
    sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'dev', 'tools', 'build'))
    import build
    studies = tmp_path / 'studies.json'
    studies.write_text(json.dumps(build.studies(os.path.join(HERE, '..', '..', '..'))))
    run_driver(os.path.join(HERE, 'vessel_gt_actions_driver.mjs'), str(studies), timeout=240)
