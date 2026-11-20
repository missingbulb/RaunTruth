"""req/shell/drive/dialog: the Google Drive dialog fetches thumbnails for the rows in view and the next 10, in order,
across fast scrolls and reopening (drive_thumbs_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_drive_thumbnails():
    run_driver(os.path.join(HERE, 'drive_thumbs_driver.mjs'), timeout=60)
