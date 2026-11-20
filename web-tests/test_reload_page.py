"""req/shell/browsers/supported: a reload hands the page its controls as its markup starts them, in every browser
the page supports (reload_driver.mjs)."""
import os
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'dev', 'tools', 'build'))
from drivers import NODE, run_driver  # noqa: E402

pytestmark = pytest.mark.full


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_reload_hands_the_page_its_controls_as_the_markup_starts_them():
    run_driver(os.path.join(HERE, 'reload_driver.mjs'))
