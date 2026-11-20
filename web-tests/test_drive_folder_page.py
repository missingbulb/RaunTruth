"""req/shell/drive/dialog: the Google Drive dialog opens on the link last pasted in this study, else on the folder the study's
own study.json names, else on the link last pasted anywhere (drive_folder_driver.mjs, in headless Chromium)."""
import os
import shutil

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.mark.skipif(not NODE, reason='node missing')
def test_drive_folder_per_study():
    run_driver(os.path.join(HERE, 'drive_folder_driver.mjs'), timeout=90)
