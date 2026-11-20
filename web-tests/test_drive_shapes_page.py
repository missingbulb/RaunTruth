"""req/shell/drive/stacks: the Google Drive dialog tells a 3D stack from a flat image and saves a 3D thumbnail of an opened stack
(drive_shapes_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_drive_shapes():
    run_driver(os.path.join(HERE, 'drive_shapes_driver.mjs'), timeout=60)
