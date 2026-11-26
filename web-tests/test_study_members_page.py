"""shell/study/members, req/shell/study/visibility, shell/study/review-link: which studies the switcher lists and which
open at their address, by what Drive's sharing lets the account read, in headless Chromium against a stand-in Google
(members_driver.mjs)."""
import pytest

from test_data_mode_page import folder
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


def test_a_study_is_listed_to_those_who_can_read_its_root_and_opened_by_them_alone(answers, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('members_driver.mjs', answers[0], str(root))
