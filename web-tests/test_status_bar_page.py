"""req/shell/status-bar, req/shell/study/stage, req/shell/steps, req/shell/status-bar/memory, req/shell/status-bar/disk, req/shell/status-bar/online: the status bar, its stage, the button of the step to do now shining, its memory
popup and its disk, on the fixture study in headless Chromium with a stand-in worker (status_bar_driver.mjs)."""
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


def test_the_status_bar_follows_the_steps(png, answers):
    run('status_bar_driver.mjs', answers[0], png, answers[1])
