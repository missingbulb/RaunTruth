"""req/shell/data/folders, req/shell/data/index, req/shell/load/study-images, req/shell/extractions/marks-shown: a study's listed folders and its study index,
on the fixture study in headless Chromium against a stand-in Google (study_index_driver.mjs): the Study Manager adds a
folder of the root and one pasted from elsewhere and takes one out, the page writes the index only when it changes,
and a Viewer's Load lists the index's images grouped by folder, each carrying what the study file's marks say of it."""
import os

import numpy as np
import pytest
from PIL import Image

from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


def folder(path):
    """The study's root: a Data folder with a subfolder, and an Other folder no listed folder holds."""
    for d in ('Data/sub', 'Other'):
        os.makedirs(path / d)
    # each its own grey, so that each has an SHA-256 of its own, which the study file's marks name
    for k, f in enumerate(('Data/acme.png', 'Data/sub/beta.png', 'Other/gamma.png')):
        Image.fromarray(np.full((64, 64, 3), 30 * k, np.uint8)).save(path / f)


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_listed_folders_and_the_study_index(answers, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('study_index_driver.mjs', answers[0], answers[1], str(root))
