"""req/shell/account/welcome: opening the page asks, once, whether to sign in with Google or go on anonymously, and
req/shell/account/consent-guide: signing in first shows Google's screens (welcome_driver.mjs, in headless Chromium, against stand-ins for Google's sign-in)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_welcome():
    run_driver(os.path.join(HERE, 'welcome_driver.mjs'), timeout=90)
