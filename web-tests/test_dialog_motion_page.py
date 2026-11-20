"""req/shell/dialogs/open-from-button: a popup dialog a button opens grows out of that button
(dialog_motion_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_dialogs_open_from_their_button():
    run_driver(os.path.join(HERE, 'dialog_motion_driver.mjs'), timeout=60)
