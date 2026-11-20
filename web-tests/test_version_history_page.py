"""req/shell/version-history: the page's version box opens its Version history, and after an update a bubble points at it
(version_history_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_version_history_popup_and_update_bubble():
    run_driver(os.path.join(HERE, 'version_history_driver.mjs'), timeout=60)
