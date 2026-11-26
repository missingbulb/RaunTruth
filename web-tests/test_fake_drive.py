"""The Drive fake's own behaviour (fake_drive_driver.mjs, under Node with no browser): per-account read sharing, the
batch endpoint, the revisions a replace keeps, and permissions listed and changed. A page test leans on each as it
leans on Drive."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_the_fake_drive_shares_batches_revises_and_lists_permissions():
    run_driver(os.path.join(HERE, 'fake_drive_driver.mjs'), timeout=30)


def test_the_stand_in_drive_seeds_its_root_with_members():
    run_driver(os.path.join(HERE, 'stand_in_members_driver.mjs'), timeout=60)
