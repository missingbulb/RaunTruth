"""req/shell/image/keys: a study's declared actions, wired by the shell and listed in the keys legend, on the fixture study in
headless Chromium with a stand-in worker (keys_driver.mjs)."""
from test_study_runs import NODE, answers, png, run  # noqa: F401  (fixtures)
import pytest

pytestmark = pytest.mark.full


@pytest.mark.skipif(not NODE, reason='node missing')
def test_declared_keys_act_and_show(png, answers):
    run('keys_driver.mjs', answers[0], png, answers[1])
