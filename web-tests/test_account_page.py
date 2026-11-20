"""req/shell/account/sign-in: signing in with Google from the avatar's menu keeps the user's settings in their own Google Drive
(account_driver.mjs, in headless Chromium, against stand-ins for Google's sign-in and the Drive API)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_account():
    run_driver(os.path.join(HERE, 'account_driver.mjs'), timeout=90)
