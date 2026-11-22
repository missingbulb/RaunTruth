"""req/shell/study/stage: each of the five stages, in the study file, opens and closes the page's actions as the map's table says
(stage_table_driver.mjs, headless Chromium, a stand-in Google): on the study's page the way to start annotating and the own-images
button; on Study Setup the data controls, the mark buttons and the batch run. web-tests/stage_table.json is the table."""
import numpy as np
import pytest
from PIL import Image

from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


@pytest.fixture
def three(tmp_path):
    """Three grey images the size of the one the stand-in worker answers for, each with a SHA-256 of its own."""
    root = tmp_path / 'drive'
    root.mkdir()
    for i in range(3):
        a = np.zeros((60, 80), np.uint8)
        a[10:20, 10:20] = 200
        a[30:45, 50:70] = 250
        a[i * 5:i * 5 + 3, 0:3] = 90 + i
        Image.fromarray(a).save(root / f'img{i + 1}.png')
    return root


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_page_follows_the_stage_table(answers, three):
    run('stage_table_driver.mjs', answers[0], answers[1], str(three), timeout=400)
