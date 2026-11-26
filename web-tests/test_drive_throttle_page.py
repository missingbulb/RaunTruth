"""req/shell/drive/throttle: when Google throttles the site's Drive downloads, the Drive dialog shows a notice and a countdown and
calls Drive for nothing for 15 minutes (drive_throttle_driver.mjs, in headless Chromium)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_drive_throttle():
    run_driver(os.path.join(HERE, 'drive_throttle_driver.mjs'), timeout=60)
