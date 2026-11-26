"""req/shell/browsers/supported, req/shell/report/bug, req/shell/report/action-log: which browsers the page supports, the status
bar's icon in any other, the problem report it and the avatar's menu open, and the actions it quotes
(problem_report_driver.mjs, in a headless browser)."""
import os

import pytest
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))


def test_problem_report():
    run_driver(os.path.join(HERE, 'problem_report_driver.mjs'), timeout=120)
