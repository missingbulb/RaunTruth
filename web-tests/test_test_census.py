"""The count of every test there is, by where it runs (dev/tools/build/test_census.py), on a drawn tree of tests."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dev', 'tools', 'build'))
import test_census

CONFTEST = '''
def pytest_configure(config):
    for m in ('full', 'chromium_only', 'flaky(issue, engines)'):
        config.addinivalue_line('markers', m)
'''
TESTS = '''
import pytest

def test_plain(): pass

@pytest.mark.full
def test_page(): pass

@pytest.mark.full
@pytest.mark.parametrize('n', [1, 2])
def test_page_twice(n): pass

@pytest.mark.full
@pytest.mark.chromium_only
def test_devtools(): pass

@pytest.mark.full
@pytest.mark.flaky(issue=7, engines=['webkit'])
def test_now_and_then(): pass
'''


def drawn(tmp_path):
    (tmp_path / 'acme').mkdir()
    (tmp_path / 'acme' / 'conftest.py').write_text(CONFTEST)
    (tmp_path / 'acme' / 'test_acme.py').write_text(TESTS)
    return test_census.census(str(tmp_path), ['acme'])


def test_every_test_is_counted_once_on_chromium_and_the_full_ones_again_on_each_other_engine(tmp_path):
    c = drawn(tmp_path)
    assert c['chromium'] == 6
    assert c['postponed'] == {'firefox': 4, 'webkit': 4}
    assert c['all'] == 14


def test_a_test_ignored_under_a_flaky_mark_is_counted_where_it_is_ignored_with_its_issue(tmp_path):
    assert drawn(tmp_path)['ignored'] == [{'test': 'acme/test_acme.py::test_now_and_then', 'issue': 7, 'engines': ['webkit']}]


def test_the_line_says_all_of_them(tmp_path):
    line = test_census.said(drawn(tmp_path))
    assert '14 tests' in line and '6 ' in line and '8 postponed' in line and '#7' in line, line
