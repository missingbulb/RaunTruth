"""req/shell/drive/dialog: a folder lists the images the study on show opens, by its files.accept (drive_accept_driver.mjs,
in headless Chromium)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_a_folder_lists_what_the_study_opens():
    run_driver(os.path.join(HERE, 'drive_accept_driver.mjs'), timeout=90)
