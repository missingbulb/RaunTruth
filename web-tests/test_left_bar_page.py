"""req/shell/left-bar/folding: the left bar's drawers fold with the steps and title themselves by them, on the fixture study in headless Chromium with a stand-in
worker (left_bar_driver.mjs)."""
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


def test_the_left_bar_folds_with_the_steps(png, answers):
    run('left_bar_driver.mjs', answers[0], png, answers[1])
