"""setup/page, setup/aspects, setup/marks, setup/batch: Study Setup, the site page /app/setup, in headless Chromium against a stand-in Google (setup_driver.mjs): its
item in the avatar's menu for those Drive lets write the study's root, the page itself, online only, and the study's own
page keeping nothing of Data Management."""
import numpy as np
import pytest
from PIL import Image

from test_data_mode_page import folder
from test_study_runs import answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


def test_study_setup_is_a_page_for_those_who_write_the_root(answers, tmp_path):
    root = tmp_path / 'drive'
    folder(root)
    run('setup_driver.mjs', answers[0], answers[1], str(root))


def test_study_setup_has_a_layout_of_its_own_and_shows_what_it_loads(answers, tmp_path):
    """req/setup/aspects, req/setup/image, req/setup/loading, req/shell/status-bar/calls: the stages, the rail and no viewer; a place emptied
    while the store is read and a late answer dropped; the store's calls in the status bar."""
    root = tmp_path / 'drive'
    folder(root)
    run('setup_layout_driver.mjs', answers[0], answers[1], str(root), timeout=240)


def test_study_setup_lists_the_studys_papers_against_the_repos_summaries(answers, tmp_path):
    """req/setup/literature: the Literature folder listed once when its aspect is chosen, each paper paired with a summary or not, and the
    summaries with no paper."""
    root = tmp_path / 'drive'
    folder(root)
    run('setup_literature_driver.mjs', answers[0], answers[1], str(root), timeout=240)


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


def test_the_owner_marks_extractions_gt_and_official(answers, three):
    """setup/marks: the study file holds {file, by} for each mark, which follows its file's latest content."""
    run('setup_marks_driver.mjs', answers[0], answers[1], str(three), timeout=240)


def test_a_batch_run_makes_an_extraction_per_image(answers, three):
    """setup/batch: one extraction per chosen image, none again on a rerun, held when the token runs out, marked official."""
    run('setup_batch_driver.mjs', answers[0], answers[1], str(three), timeout=240)


def test_the_owner_promotes_freezes_and_moves_back(answers, three):
    """setup/promote: the images with extractions newer than their GT listed before Review, the stage written into the study file,
    Freeze closing marking and data, a move back reopening them, and the main app's Save after the freeze labelled."""
    run('setup_stage_driver.mjs', answers[0], answers[1], str(three), timeout=300)


def test_the_results_are_read_on_a_press_alone_and_listed_one_row_per_image(answers, three):
    """req/setup/results: official marks seeded on two images; before the press nothing of theirs is read; after it, two rows and the totals, the
    CSV the same rows; an image with no official mark has no row."""
    run('setup_results_driver.mjs', answers[0], answers[1], str(three), timeout=240)
