"""req/shell/extractions/save, req/shell/extractions/list, req/shell/extractions/outsiders: the one store of extractions, on the
fixture study in headless Chromium against a stand-in Google (extractions_driver.mjs): Save writing the person's one file per
image and replacing it keeping the old revision, the list of an image's extractions in its order with its labels, Edit this
annotation saving as the user's own with its base and the other's file untouched, and someone who is not a member listed the
marked alone with no name. The count of images waiting to upload is test_annotate_mode_page.py's, against this Save."""
import numpy as np
import pytest
from PIL import Image

from test_data_mode_page import folder
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


@pytest.fixture(scope='module')
def second(tmp_path_factory):
    """Another grey image, with other squares, so that it has a SHA-256 of its own."""
    a = np.zeros((60, 80), np.uint8)
    a[5:15, 60:75] = 220
    path = str(tmp_path_factory.mktemp('second') / 'other.png')
    Image.fromarray(a).save(path)
    return path


def test_the_store_of_extractions(answers, png, second, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('extractions_driver.mjs', answers[0], answers[1], str(root), png, second, timeout=240)
