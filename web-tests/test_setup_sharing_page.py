"""setup/people, setup/sharing-check: Study Setup reads the study's sharing, lists what its stage needs changed, and changes one
item's sharing only when the owner presses Fix and confirms, in headless Chromium against a stand-in Google with the fake
Drive's permissions seeded per case (setup_sharing_driver.mjs)."""
import pytest

from test_data_mode_page import folder
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


def test_study_setup_checks_the_sharing_and_fixes_only_on_a_press(answers, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('setup_sharing_driver.mjs', answers[0], answers[1], str(root), timeout=300)
