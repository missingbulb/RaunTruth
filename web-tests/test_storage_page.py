"""req/shell/storage/manage: the avatar's Manage storage dialog lists, and clears, what this device keeps
(storage_driver.mjs, in headless Chromium)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_manage_storage():
    run_driver(os.path.join(HERE, 'storage_driver.mjs'), timeout=60)
