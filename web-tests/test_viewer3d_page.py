"""req/shell/viewer-3d: a study in the image3d viewer shows a z-stack in 3D, driven by its channel rows (viewer3d_driver.mjs, in
headless Chromium with a stand-in worker)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_viewer3d():
    run_driver(os.path.join(HERE, 'viewer3d_driver.mjs'), timeout=120)
