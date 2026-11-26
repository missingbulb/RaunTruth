"""req/shell/ground-truth/setup, req/shell/ground-truth/summary, req/shell/data/roles, req/shell/annotate/no-save, req/shell/extractions/save,
req/shell/ground-truth/layout, req/shell/ground-truth/clear, req/shell/extractions/marks-shown,
req/shell/ground-truth/view, req/shell/extractions/outsiders, req/shell/data/folder (Needs GT): the fixture study's extractions, in headless Chromium against a stand-in Google
(gt_drive_driver.mjs), from Set up in Data Management through a person's Save, a GT mark and an
outsider's Load annotation from Drive."""
import os

import pytest
from PIL import Image

from test_study_runs import answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


def folder(path, image):
    """The study's root: two images, nothing set up."""
    os.makedirs(path)
    Image.open(image).save(path / 'acme.png')
    Image.open(image).rotate(90, expand=True).save(path / 'beta.png')


def test_a_person_saves_to_the_extractions_folder(answers, png, tmp_path):
    root = tmp_path / 'drive'
    folder(root, png)
    run('gt_drive_driver.mjs', answers[0], answers[1], str(root))
