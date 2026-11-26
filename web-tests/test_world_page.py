"""The world a page test sets up, as the page meets it (world_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_world_a_test_sets_up_is_the_one_the_page_meets():
    run_driver(os.path.join(HERE, 'world_driver.mjs'), timeout=90)
