"""req/shelves/books/versions: the page's list of versions (web/algorithms.json) offers exactly the versions the
study's algorithm runs, in its order, and each one's numbers (the metrics file study.json names, written by
`python3 lab/run.py shelves --write`) were measured with the scorer the study holds, on every version."""
import json
import os
import sys

STUDY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(STUDY, 'algorithm'))
import shelves  # noqa: E402

MANIFEST = json.load(open(os.path.join(STUDY, 'study.json')))


def own(rel):
    return json.load(open(os.path.join(STUDY, rel)))


def test_the_page_lists_exactly_the_versions_python_runs_in_its_order():
    assert [a['key'] for a in own(MANIFEST['algorithms']['list'])] == list(shelves.VERSIONS)


def test_each_listed_version_was_measured_with_the_scorer_the_study_holds():
    m = own(MANIFEST['algorithms']['metrics'])
    assert m['format'] == 'rauntruth-metrics/1' and m['scoring'] == shelves.SCORING, \
        'the scorer changed since the versions were measured: python3 lab/run.py shelves --write'
    for key in shelves.VERSIONS:
        got = m['versions'][key]
        assert 0 <= got['precision'] <= 1 and 0 <= got['recall'] <= 1 and 'tuned' in got['note'], (key, got)
        assert set(got['truths']) == {i['truth_sha256'] for i in m['images']}, key
