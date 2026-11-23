"""req/shell/annotate/choice, req/shell/annotate/clear, req/shell/annotate/no-save, req/shell/annotate/survives, req/shell/left-bar/shells: the main
app's one page for everyone, with no role menu, on the fixture study in headless Chromium against a stand-in Google
(annotate_driver.mjs): how an image's annotations are got once it loads, annotation mode and its tools, who may save, and
what keeps the work through a token run out and a store that does not answer."""
import numpy as np
import pytest
from PIL import Image

from test_data_mode_page import folder
from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


@pytest.fixture(scope='module')
def second(tmp_path_factory):
    """Another grey image, with other squares, so that it has a SHA-256 of its own."""
    a = np.zeros((60, 80), np.uint8)
    a[5:15, 60:75] = 220
    path = str(tmp_path_factory.mktemp('second') / 'other.png')
    Image.fromarray(a).save(path)
    return path


@pytest.mark.skipif(not NODE, reason='node missing')
def test_annotating(answers, png, second, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('annotate_driver.mjs', answers[0], answers[1], str(root), png, second, timeout=240)
