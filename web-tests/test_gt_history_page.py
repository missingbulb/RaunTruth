"""req/shell/ground-truth/save-draft, req/shell/ground-truth/draft-offer, req/shell/ground-truth/history-file, req/shell/ground-truth/history,
req/shell/image/keys (the shell's Undo and Redo), req/shell/storage/manage (a draft listed and deleted): the fixture study's GT actions, in
headless Chromium against a stand-in Google (gt_history_driver.mjs), as a Ground Truth Tagger: Save Draft and Load draft, Undo and Redo,
and the history in Submit's file. The Edit History window the log is shown in, and Clear all history (req/shell/ground-truth/clear), are
checked in gt_history_window_driver.mjs."""
import os

import pytest

from test_gt_drive_page import folder
from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)

pytestmark = pytest.mark.full


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_tagger_saves_loads_undoes_and_submits_a_log(answers, png, tmp_path):
    root = tmp_path / 'drive'
    folder(root, png)
    run('gt_history_driver.mjs', answers[0], answers[1], str(root), timeout=240)


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_edit_history_window_shows_the_log(answers, png, tmp_path):
    root = tmp_path / 'drive'
    folder(root, png)
    run('gt_history_window_driver.mjs', answers[0], answers[1], str(root), timeout=300)
