"""req/shell/drive/kept-images, req/shell/load/recents-tip: a kept Drive image opens once its SHA-256 matches Drive's, and a tip points at the recents
(drive_cache_driver.mjs, in headless Chromium)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_drive_cache():
    run_driver(os.path.join(HERE, 'drive_cache_driver.mjs'), timeout=60)
