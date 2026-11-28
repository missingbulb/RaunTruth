"""req/shell/image/idle, req/shell/load/from: the page before an image, on the fixture study in headless Chromium with a
stand-in worker (idle_view_driver.mjs)."""
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


def test_the_page_before_an_image(png, answers):
    run('idle_view_driver.mjs', answers[0], png, answers[1])
