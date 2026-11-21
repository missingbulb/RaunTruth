"""The flaky mark (pytest_ci.py): a test's failure on an engine it names is reported as an expected failure and fails
no CI run; on any other engine, or with no mark, a failure fails it as before."""
import os
import subprocess
import sys

BUILD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build')

TESTS = '''
import pytest

@pytest.mark.flaky(issue=1, engines=['webkit'])
def test_flaky_fails():
    assert False

@pytest.mark.flaky(issue=1, engines=['webkit'])
def test_flaky_passes():
    pass

@pytest.mark.xfail(reason='not a flaky mark')
def test_plain_xfail():
    assert False
'''


def outcomes(tmp_path, engine):
    (tmp_path / 'conftest.py').write_text(
        f'import sys\nsys.path.insert(0, {BUILD!r})\nfrom pytest_ci import pytest_configure, pytest_runtest_makereport\n')
    (tmp_path / 'test_cases.py').write_text(TESTS)
    env = {k: v for k, v in os.environ.items() if k not in ('PW_ENGINE', 'PYTEST_ADDOPTS')}
    env.update(CI='true', **({'PW_ENGINE': engine} if engine else {}))
    out = subprocess.run([sys.executable, '-m', 'pytest', '-p', 'no:cacheprovider', '-p', 'no:xdist', '-rA', '-q', 'test_cases.py'],
                         cwd=tmp_path, env=env, capture_output=True, text=True, timeout=120).stdout
    got = {}
    for line in out.splitlines():
        word = line.split()
        if len(word) > 1 and word[0] in ('PASSED', 'FAILED', 'XFAIL', 'XPASS', 'SKIPPED') and '::' in word[1]:
            got[word[1].split('::')[-1]] = word[0]
    assert len(got) == 3, out
    return got


def test_a_flaky_failure_on_a_named_engine_is_expected(tmp_path):
    got = outcomes(tmp_path, 'webkit')
    assert got['test_flaky_fails'] == 'XFAIL', got
    assert got['test_flaky_passes'] == 'PASSED', got


def test_a_flaky_failure_on_another_engine_fails(tmp_path):
    assert outcomes(tmp_path, 'firefox')['test_flaky_fails'] == 'FAILED'
    # no engine named is Chromium's run
    assert outcomes(tmp_path, None)['test_flaky_fails'] == 'FAILED'


def test_a_plain_xfail_still_fails_ci(tmp_path):
    assert outcomes(tmp_path, 'webkit')['test_plain_xfail'] == 'FAILED'
