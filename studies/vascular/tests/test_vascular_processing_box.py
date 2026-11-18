"""req/vascular/model/run: what the page's Processing box is given, the study's list (web/algorithms.json) and its
numbers (web/algorithm_metrics.json). Every algorithm it offers is one of the study's versions, in their order, with
its icon, its name and its steps as a Markdown outline, as its module says; and the numbers the page shows are of
those versions, scored as the study's scorer says it scores."""
import importlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STUDY = os.path.join(HERE, '..')
sys.path.insert(0, os.path.join(STUDY, 'algorithm'))

import vascular  # noqa: E402

METRICS = os.path.join(STUDY, 'web', 'algorithm_metrics.json')


def offered():
    return json.load(open(os.path.join(STUDY, 'web', 'algorithms.json')))


def test_every_offered_algorithm_is_a_version_with_an_icon_a_name_and_its_steps():
    algos = offered()
    assert [a['key'] for a in algos] == list(vascular.VERSIONS)
    for a in algos:
        assert a['icon'] and a['title'], a
        lines = [l for l in a['about'].split('\n') if l.strip()]
        assert lines and all(l.lstrip().startswith('- ') for l in lines), a['about']
        mod = importlib.import_module(vascular.VERSIONS[a['key']].args[0])
        assert (a['title'], a['icon'], a['about']) == (mod.TITLE, mod.ICON, mod.STEPS)


def test_the_metrics_the_page_shows_are_of_every_offered_version_and_say_how_they_were_scored():
    # regenerate with: python3 lab/run.py vascular --write
    q = json.load(open(METRICS))
    assert q['scoring'] == vascular.SCORING
    assert set(q['versions']) == {a['key'] for a in offered()}
    for v in q['versions'].values():
        assert 0 <= v['precision'] <= 1 and 0 <= v['recall'] <= 1
