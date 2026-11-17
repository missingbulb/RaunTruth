"""req/shell/ground-truth/history, req/shell/ground-truth/history-replay (Needs GT): the GT action log (web/truth_actions.js,
under Node by truth_actions_driver.mjs against the fixture study's pure GT actions): replay, undo, redo, the check of a stored
model against its log, and the packing of a run's output. No page and no clock are involved."""
import json
import os
import shutil
import subprocess

import pytest

pytestmark = pytest.mark.full
HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.fixture(scope='module')
def out():
    if not NODE:
        pytest.skip('node missing')
    r = subprocess.run([NODE, os.path.join(HERE, 'truth_actions_driver.mjs')], capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def marks(*triples):
    return [{'id': i, 'x': x, 'y': y} for i, x, y in triples]


def test_a_replay_gives_the_model_the_actions_built(out):
    r = out['replay']
    assert r['equal'] and r['skipped'] == [] and r['dead'] == -1
    assert r['types'] == ['open', 'run', 'move-mark', 'add-mark', 'delete-mark', 'check'] and r['count'] == 4
    assert r['model'] == {'threshold': 5, 'count': 2, 'marks': marks(('m1', 12, 13), ('m3', 70, 70)), 'checked': True, 'next': 4}


@pytest.mark.parametrize('kind', ['move-mark', 'add-mark', 'delete-mark', 'check'])
def test_undo_then_redo_returns_the_same_model_for_every_fixture_action(out, kind):
    u = out['undoRedo'][kind]
    assert u['changed'] and u['undoneIsBefore'] and u['redoneIsDone']
    assert (u['movedType'], u['redoType'], u['canRedo'], u['atEnd']) == (kind, kind, True, True)


def test_a_new_action_forgets_what_was_undone(out):
    f = out['forgets']
    assert (f['before'], f['after'], f['canRedo']) == (1, 0, False)
    assert f['types'] == ['open', 'run', 'check', 'move-mark']


def test_undo_stops_at_the_first_run(out):
    s = out['stops']
    assert s['canUndo'] is False and s['undo'] is None and s['same'] and s['types'] == ['open', 'run'] and s['floor'] == 1


def test_a_second_run_carries_actions_by_id_and_skips_the_rest(out):
    s = out['second']
    # the new run's one spot is 1 px off the second mark: it keeps m2 and m2's move; m1 is gone and its move is skipped
    assert s['marks'] == marks(('m2', 52, 52)) and s['next'] == 3
    assert [i for i, _ in s['skipped']] == [2] and s['types'] == 4
    # undoing the run goes back to the model on run 1, both moves in
    assert s['undoneToRun1'] and s['undoneMarks'] == marks(('m1', 11, 11), ('m2', 52, 52))


def test_two_runs_with_nothing_between_are_one(out):
    t = out['twoRuns']
    assert t['types'] == ['open', 'run'] and t['threshold'] == 9 and t['marks'] == 1 and t['undone'] == 0


def test_no_action_before_a_run(out):
    r = out['refused']
    assert r['threw'] is True and r['none'] == 1


def test_an_action_on_a_missing_item_is_not_recorded(out):
    r = out['refused']
    assert r['appended'] == 0 and 'skip' in r['skip'] and 'skip' in r['delSkip']


def test_goto_equals_a_replay_of_that_many(out):
    g = out['goto']
    for n, c in g['checks'].items():
        assert c['same'] and c['len'] == min(int(n), 8) and c['undone'] == 8 - c['len'], (n, c)
    # clamped to the first action after the run, and to the whole list
    assert g['low'] == 2 and g['high'] == 8 and g['highSame']


def test_an_undo_replays_at_most_25_actions(out):
    c = out['cap']
    assert c['acts'] == 60 and c['worst']['undo'] <= 25 and c['worst']['goto'] <= 25 and c['right']


def test_the_check_says_verified_mismatch_or_none(out):
    c = out['check']
    assert c['ok'] == 'verified' and c['okSame']
    # a mismatch: the stored model wins as a base, the earlier log stays but is not replayed
    assert c['bad'] == 'mismatch' and c['badTypes'] == ['open', 'run', 'move-mark', 'base']
    assert c['badModelWins'] and c['badDead'] == 3 and c['badDeadLog'] == 3 and c['badFloor'] == 3 and c['badCanUndo'] is False
    assert c['none'] == 'none' and c['noneTypes'] == ['base']
    assert c['noneFrom'] == {'tagger': 'a@b.c', 'created': '2026-11-17T10:00:00Z'}
    assert set(c['noneModel']) == {'labels', 'marks', 'checked'}


def test_a_runs_output_packs_and_unpacks(out):
    p = out['pack']
    assert p['equal'] and p['plainLeft'] and p['keys'] == ['deflate'] and p['smaller'] and p['others'] and p['notChanged']


def test_the_hash_ignores_the_shells_keys_and_key_order(out):
    h = out['hash']
    assert h['equal'] and h['differs'] and h['hex']
    assert h['shellKeys'] == ['history', 'created', 'tagger', 'image', 'accepted']
    assert h['canonical'] == '{"a":{"c":[2,{"y":0,"z":1}]},"b":1}'
    assert h['format'] == 'rauntruth-gt-history/1' and set(h['bare']) == {'labels', 'marks', 'checked'}


def test_clear_goes_back_to_the_last_run(out):
    c = out['clear']
    assert c['types'] == ['open', 'run'] and c['undone'] == 0 and c['run'] and c['model'] and c['marks'] == 2
    assert c['base'] == ['open', 'base']


def test_no_model_is_changed_in_place(out):
    f = out['frozen']
    assert f['error'] is None and f['calls'] > 10 and f['allFrozen']


def test_an_action_keeps_its_time_or_takes_the_clock_given(out):
    c = out['clock']
    assert c['ats'] == ['T1', 'T2', 'T3', 'mine'] and c['default'] is True
    assert c['open']['type'] == 'open' and c['open']['study'] == 'fixture' and c['run']['algorithm']['key'] == 'count'


def test_every_studys_gt_actions_load_without_a_page_and_export_the_six(out):
    found = out['studies']
    # raised as each study names its GT actions
    assert len(found) >= 1 and 'fixture' in found
    for study, fns in found.items():
        assert fns == {n: 'function' for n in ['start', 'run', 'describe', 'where', 'document', 'load']}, study
