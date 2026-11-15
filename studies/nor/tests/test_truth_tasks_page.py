"""req/nor/truth/tasks, req/nor/truth/order, req/nor/truth/marks, req/shell/views/second: while the study makes
ground truth, its tasks are in the left bar one candidate at a time, area by area, and the image shows what is
reviewed. Drives web/ in headless Chromium with the stand-in worker of the memory test, answering from real
results on a drawn image whose first area holds a candidate, so the walk's first step is a candidate's card
(truth_tasks_page_driver.mjs)."""
from synthetic_nor import nor_image
from test_memory import SIDE, needs_node, page_answers, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


@pytest.fixture(scope='module')
def crop(tmp_path_factory):
    """A drawn NoR image with a node the finder finds in its first area; the page answers are worked out on it."""
    return nor_image(str(tmp_path_factory.mktemp('crop') / 'corner.tif'), side=SIDE, n=20, seed=21)


@needs_node
def test_truth_tasks(crop, page_answers):
    run('truth_tasks_page_driver.mjs', page_answers, crop)
