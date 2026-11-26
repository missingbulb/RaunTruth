"""req/shell/dialogs/close-as-opened: a dialog closes with a motion, a part that makes room folds open and shut, and the step's button
shines three times and rests (fold_motion_driver.mjs)."""
import os

import pytest
from drivers import run_driver

HERE = os.path.dirname(os.path.abspath(__file__))
pytestmark = pytest.mark.full


def test_a_dialog_closes_and_a_part_folds_with_a_motion_that_ends():
    run_driver(os.path.join(HERE, 'fold_motion_driver.mjs'), timeout=90)
