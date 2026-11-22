"""setup/page: Study Setup, the site page /app/setup, in headless Chromium against a stand-in Google (setup_driver.mjs): its
item in the avatar's menu for those Drive lets write the study's root, the page itself, online only, and the study's own
page keeping nothing of Data Management."""
import pytest

from test_data_mode_page import folder
from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


@pytest.mark.skipif(not NODE, reason='node missing')
def test_study_setup_is_a_page_for_those_who_write_the_root(answers, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('setup_driver.mjs', answers[0], answers[1], str(root))
