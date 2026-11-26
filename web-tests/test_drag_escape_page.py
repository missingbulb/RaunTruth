"""req/shell/drag/escape: Escape cancels the shell's drags, on the fixture study in headless Chromium with a stand-in worker (drag_escape_driver.mjs)."""
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


def test_escape_cancels_the_shells_drags(png, answers):
    run('drag_escape_driver.mjs', answers[0], png, answers[1])
