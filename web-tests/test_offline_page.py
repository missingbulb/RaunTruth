"""req/shell/offline/default, req/shell/offline/per-study: the built site opens and runs offline, and Prepare for offline keeps the app, the studies' Python
and their data the user chooses (offline_driver.mjs, in headless Chromium with the real worker and the real
Pyodide from its CDN, which a stand-in could not prove kept: what is cached is what the worker really fetched)."""
import os
import shutil
import sys

import numpy as np
import pytest
import tifffile
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))


@pytest.mark.chromium_only
def test_the_site_runs_offline(tmp_path):
    # the site as the release builds it, under this test's own folder: dev/build/site is the build's, which another
    # test's build may rewrite while this one serves it
    sys.path.insert(0, os.path.join(ROOT, 'dev', 'tools', 'build'))
    import build
    site = tmp_path / 'site'
    build.assemble(ROOT, str(site), {'GOOGLE_API_KEY': 'stand-in'})
    # the analytics loader the release's own tree holds, which the app's pages load from the site's top, and keep offline
    shutil.copy(os.path.join(ROOT, 'dev', 'build', 'site', 'analytics.js'), site / 'analytics.js')
    build.offline_list(str(site))
    stack = str(tmp_path / 'stack.tif')
    tifffile.imwrite(stack, np.random.default_rng(1).integers(0, 255, (4, 32, 32), dtype=np.uint8), photometric='minisblack')
    run_driver(os.path.join(HERE, 'offline_driver.mjs'), str(site), stack, timeout=600)
