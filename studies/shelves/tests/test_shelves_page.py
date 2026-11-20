"""req/shelves/books/find, req/shelves/read/readers, req/shelves/matcher/export, req/shelves/summary, req/shell/summary/mask, req/shelves/truth/task and req/shelves/truth/keys: the page in
headless Chromium against a stand-in worker and a stand-in Tesseract (shelves_page_driver.mjs)."""
import json
import os
import shutil
import sys

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', '..')
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_shelves_page(tmp_path):
    sys.path.insert(0, os.path.join(ROOT, 'dev', 'tools', 'build'))
    import build
    studies = tmp_path / 'studies.json'
    studies.write_text(json.dumps(build.studies(ROOT)))
    run_driver(os.path.join(HERE, 'shelves_page_driver.mjs'), str(studies), timeout=180)
