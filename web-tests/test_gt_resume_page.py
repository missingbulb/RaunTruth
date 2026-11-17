"""req/shell/ground-truth/draft-offer (the tagger's own submission, Approved by the owner on 2026-11-16), req/shell/ground-truth/history-replay
(a submission checked as a draft is): a Ground Truth Tagger on another device is offered their own submission in the study's Drive
folder, found from two listings as the image opens and read only on the click, in headless Chromium against a stand-in Google
(gt_resume_driver.mjs)."""
import pytest

from test_gt_drive_page import folder
from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_tagger_is_offered_their_own_submission_on_another_device(answers, png, tmp_path):
    root = tmp_path / 'drive'
    folder(root, png)
    run('gt_resume_driver.mjs', answers[0], answers[1], str(root), timeout=300)
