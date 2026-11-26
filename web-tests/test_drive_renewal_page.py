"""req/shell/drive/renewal: any click that reads Drive renews a run-out sign-in and carries on with the new token
(drive_renewal_driver.mjs, in headless Chromium)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_a_click_that_reads_drive_renews_the_sign_in():
    run_driver(os.path.join(HERE, 'drive_renewal_driver.mjs'), timeout=90)
