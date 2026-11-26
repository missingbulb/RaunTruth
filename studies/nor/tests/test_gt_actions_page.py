"""req/nor/candidates/remembered, req/shell/ground-truth/history: the NoR Finder's tagging as GT actions on the page. Drives web/ in headless
Chromium with the stand-in worker of the memory test (gt_actions_page_driver.mjs): a thumbs down and Ctrl+Z, a length end dropped or cancelled,
an added NoR's id, the checked areas, Save Draft and Load draft with no Find Candidates, what the older browser keys held, and Edit History's ring."""
from synthetic_nor import nor_image
from test_memory import SIDE, page_answers, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


@pytest.fixture(scope='module')
def crop(tmp_path_factory):
    """A drawn NoR image with a node the finder finds in its first area, so the walk opens on a candidate's card."""
    return nor_image(str(tmp_path_factory.mktemp('crop') / 'corner.tif'), side=SIDE, n=20, seed=21)


def test_nor_tagging_is_gt_actions(crop, page_answers):
    run('gt_actions_page_driver.mjs', page_answers, crop)
