"""req/shell/drive/credentials: signed in, the page reads Drive with the user's token alone; signed out, with the site's
API key (drive_credentials_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_drive_reads_as_the_signed_in_user():
    run_driver(os.path.join(HERE, 'drive_credentials_driver.mjs'), timeout=90)
