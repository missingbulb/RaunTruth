"""req/shell/controls/one-look: the page's controls share one look for their kind and place, on the study's page and on Study Setup
(control_styles_driver.mjs)."""
import pytest

from test_data_mode_page import folder
from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_controls_of_a_kind_and_place_share_one_look(answers, png, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('control_styles_driver.mjs', answers[0], answers[1], str(root), png, timeout=240)
