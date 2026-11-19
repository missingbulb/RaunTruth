"""In CI every test must run: a test that skips there for a missing slide, node, Pyodide or
Chromium would leave the run green while covering nothing, so a skip fails the run instead."""
import os
import subprocess
import sys

import pytest

BUILD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build.py')
_built = []


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if os.environ.get('CI') and report.skipped:
        report.outcome = 'failed'
        report.longrepr = f'skipped in CI, where every test must run: {report.longrepr}'


def pytest_configure(config):
    config.addinivalue_line('markers', 'full: drives Node, Pyodide or Chromium, or measures speed or memory; '
                                       'left out of the fast set every PR runs (-m "not full")')
    config.addinivalue_line('markers', "chromium_only: needs what only Playwright's Chromium offers (its DevTools, or routing a "
                                       "service worker's requests), so the run on the other engines leaves it out "
                                       '(req/checks/other-engines)')


def pytest_sessionstart(session):
    """The site as the build makes it before any test reads it: the files it writes into web/ (the list of studies, the
    version history, the vendored wheels), which a page reads, written once by the run that hands the tests out, so a
    test that builds the site itself midway changes nothing another one sees."""
    if hasattr(session.config, 'workerinput') or _built:
        return
    _built.append(True)
    subprocess.run([sys.executable, BUILD], check=True, timeout=300, stdout=subprocess.DEVNULL)
