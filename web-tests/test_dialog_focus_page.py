"""req/shell/dialogs/focus-returns: closing a dialog or menu puts keyboard focus back on the control that opened it
(dialog_focus_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_closing_returns_focus_to_the_opener():
    run_driver(os.path.join(HERE, 'dialog_focus_driver.mjs'), timeout=60)
