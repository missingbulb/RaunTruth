"""req/shell/study/stage: the stage table (web/stages.js) says what the map's table says (dev/requirements/study-stages-map.md), through
web-tests/stage_table.json: every cell of its rows is the map's, word for word, and every `open` is what stageAllows answers."""
import json
import os
import shutil

import pytest

pytestmark = pytest.mark.full
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
from drivers import run_driver
NODE = shutil.which('node')
TABLE = json.load(open(os.path.join(HERE, 'stage_table.json')))


def map_rows():
    """The map's stage table: {row label: [its five cells]}, the bold markup taken off."""
    rows = {}
    for line in open(os.path.join(ROOT, 'dev', 'requirements', 'study-stages-map.md'), encoding='utf-8'):
        if line.startswith('| **'):
            cells = [c.strip().replace('**', '') for c in line.strip().strip('|').split('|')]
            rows[cells[0]] = cells[1:]
    return rows


def test_each_row_of_the_table_is_the_maps():
    rows = map_rows()
    assert TABLE['stages'] == ['Setup', 'Develop', 'Analyze', 'Review', 'Public']
    for action, a in TABLE['actions'].items():
        assert a['row'] in rows, f'{action}: no row of the map reads {a["row"]!r}'
        assert rows[a['row']] == a['cells'], f"{action}: the cells are not the map's: {rows[a['row']]}"


def test_a_cell_closes_an_action_exactly_when_it_says_so():
    for action, a in TABLE['actions'].items():
        for cell, opened in zip(a['cells'], a['open']):
            closed = cell == 'none' or cell.startswith('closed') or cell.endswith('closed')
            assert opened == (not closed), f'{action}: {cell!r} is {"closed" if closed else "open"}, the table says {opened}'


@pytest.fixture(scope='module')
def out():
    if not NODE:
        pytest.skip('node missing')
    r = run_driver(os.path.join(HERE, 'stage_rules_driver.mjs'), timeout=60, check=False)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_the_module_answers_the_table(out):
    assert out['stages'] == TABLE['stages']
    assert set(out['allows']) == set(TABLE['actions'])
    for action, a in TABLE['actions'].items():
        assert out['allows'][action] == a['open'], action


def test_a_study_outside_the_model_has_only_what_every_visitor_has(out):
    """The Image Viewer has no stage: nothing of annotating, marking, batch or data is open in it."""
    assert out['outside'] == {'setup-data': False, 'view': True, 'own-images': True, 'annotate': False, 'mark': False, 'batch': False, 'numbers': False}


def test_the_stage_is_the_study_files_when_it_is_one_of_the_five_then_the_studys_own_and_else_develop(out):
    assert out['stageOf'] == {'file': 'Analyze', 'fallback': 'Review', 'none': 'Develop', 'old': 'Develop', 'unknown': 'Develop'}


def test_each_stage_has_a_light_a_meaning_and_what_moves_it_on(out):
    assert out['lights'] == [[n, 'string', 'string', 'string'] for n in TABLE['stages']]


def test_the_stages_that_freeze_are_the_labs():
    """lab/stage.py stops unattended work from the stages that close the study's data (lab/stage): the page's names, lower case."""
    import sys
    sys.path.insert(0, os.path.join(ROOT, 'lab'))
    import fetch
    shut = [s.lower() for s, o in zip(TABLE['stages'], TABLE['actions']['setup-data']['open']) if not o]
    assert list(fetch.FROZEN_STAGES) == shut


def test_the_shell_states_tool_annotates_where_the_table_does():
    """dev/tools/build/shell_states.py derives makesTruth from the stages that open annotating, the table's."""
    import importlib.util
    spec = importlib.util.spec_from_file_location('shell_states', os.path.join(ROOT, 'dev', 'tools', 'build', 'shell_states.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    opens = [s for s, o in zip(TABLE['stages'], TABLE['actions']['annotate']['open']) if o]
    for s in TABLE['stages'] + [None]:
        got = mod.derived({'annotating': True, 'stage': s, 'keepsLog': True, 'counted': False, 'route': 'none'})['makesTruth']
        assert got == (s in opens), s
