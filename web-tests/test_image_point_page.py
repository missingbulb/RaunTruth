"""req/shell/image/menu, req/shell/image/frame: the right-click menu of a study's items at a point of the image, and a
box of the image framed, on the fixture study in headless Chromium with a stand-in worker (image_point_driver.mjs)."""
from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_shell_owns_the_menu_at_a_point_and_framing_a_box(png, answers):
    run('image_point_driver.mjs', answers[0], png, answers[1])
