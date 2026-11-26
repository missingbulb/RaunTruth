"""shell/study/stage-popup: the stage label's popup in the switcher lists the five stages, this one's gate conditions as the page
measures them, and a line for each action open to this user (stage_popup_driver.mjs, headless Chromium, a stand-in Google)."""
import numpy as np
import pytest
from PIL import Image

from test_study_runs import answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


def test_the_popup_tells_each_user_their_next_action(answers, tmp_path):
    root = tmp_path / 'drive'
    root.mkdir()
    Image.fromarray(np.zeros((60, 80), np.uint8)).save(root / 'img1.png')
    run('stage_popup_driver.mjs', answers[0], answers[1], str(root), timeout=240)
