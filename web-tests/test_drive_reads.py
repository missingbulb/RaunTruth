"""req/shell/drive/credentials: signed in, the page's Drive code reads with the user's token alone; signed out, with
the site's API key. And the read's own half of req/shell/drive/throttle: which failed download is Google's throttling
(drive_reads_driver.mjs, under Node with no browser)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_drive_reads_as_the_signed_in_user():
    run_driver(os.path.join(HERE, 'drive_reads_driver.mjs'), timeout=30)
