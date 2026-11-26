"""req/shell/site/app-address: a browser still holding the service worker the app registered at the site's top, before the app moved
to /app/, gets the landing page at / and loses that registration, and the app registers its own
(old_worker_driver.mjs, in headless Chromium, with the worker as it was at the top)."""
import os
import shutil
import subprocess
import sys

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
# the commit before the app moved under /app/, whose web/sw.js browsers registered at the site's top
BEFORE_THE_MOVE = '1fe278b'


def test_the_worker_the_app_once_registered_at_the_top_retires_itself(tmp_path):
    old = tmp_path / 'sw.js'
    # a shallow checkout (CI's) lacks the commit: fetch the history first
    if subprocess.run(['git', '-C', ROOT, 'rev-parse', '--is-shallow-repository'], capture_output=True, text=True).stdout.strip() == 'true':
        subprocess.run(['git', '-C', ROOT, 'fetch', '--quiet', '--unshallow', 'origin'], check=True)
    old.write_bytes(subprocess.run(['git', '-C', ROOT, 'show', f'{BEFORE_THE_MOVE}:web/sw.js'], capture_output=True, check=True).stdout)
    sys.path.insert(0, os.path.join(ROOT, 'dev', 'tools', 'build'))
    import build
    site = tmp_path / 'site'
    build.assemble(ROOT, str(site), {})
    # the analytics loader the release's own tree holds, which the app's pages load from the site's top
    shutil.copy(os.path.join(ROOT, 'dev', 'build', 'site', 'analytics.js'), site / 'analytics.js')
    run_driver(os.path.join(HERE, 'old_worker_driver.mjs'), str(site), str(old), timeout=120)
