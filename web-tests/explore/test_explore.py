"""The explorer (explore.mjs) on the tests' fakes: a short seeded walk completes and writes its report; the same seed
walks the same steps, and a replay of a run takes them again; and a fault planted in the page is found, a control
that throws and a Drive write nobody asked for, each with the step a replay starts from."""
import json
import os
import shutil
import subprocess

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')
# a walk of a few steps: booting its world and settling after each step, well inside this
WALK_SECONDS = 300


def explore(out, *args):
    r = subprocess.run([NODE, os.path.join(HERE, 'explore.mjs'), '--out', str(out), '--quiet', *args],
                       capture_output=True, text=True, timeout=WALK_SECONDS)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    assert r.returncode in (0, 1), r.stdout + r.stderr
    with open(os.path.join(out, 'steps.json'), encoding='utf-8') as f:
        return json.load(f)


def walked(run):
    return [{k: v for k, v in s['action'].items() if k != 'said'} for s in run['steps']]


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_seed_walks_the_same_steps_and_a_replay_takes_them_again(tmp_path):
    first = explore(tmp_path / 'one', '--world', 'visitor', '--seed', '7', '--steps', '12')
    assert len(first['steps']) == 12
    assert os.path.exists(tmp_path / 'one' / 'summary.md') and os.path.exists(tmp_path / 'one' / first['finalShot'])
    # a walk explores: more than one kind of thing done, and more than one control
    assert len({s['action']['kind'] for s in first['steps']}) > 1 and len({s['action'].get('key') for s in first['steps']}) > 2
    again = explore(tmp_path / 'two', '--world', 'visitor', '--seed', '7', '--steps', '12')
    assert walked(again) == walked(first)
    other = explore(tmp_path / 'three', '--world', 'visitor', '--seed', '8', '--steps', '12')
    assert walked(other) != walked(first)
    replayed = explore(tmp_path / 'four', '--replay', str(tmp_path / 'one' / 'steps.json'))
    assert walked(replayed) == walked(first)


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_control_that_throws_is_found(tmp_path):
    run = explore(tmp_path, '--world', 'visitor', '--seed', '3', '--steps', '10', '--focus', '#theme', '--plant', 'throw:#theme')
    found = [f for f in run['findings'] if f['oracle'] == 'uncaught' and 'planted fault' in f['what']]
    assert found and found[0]['class'] == 'bug', run['findings']
    assert run['steps'][found[0]['step']]['action']['key'] == '#theme'
    # and the step it was found at, replayed, finds it again
    replayed = explore(tmp_path / 'replay', '--replay', str(tmp_path / 'steps.json'), '--upto', str(found[0]['step']))
    assert any(f['sig'] == found[0]['sig'] for f in replayed['findings'])


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_drive_write_nobody_asked_for_is_found(tmp_path):
    run = explore(tmp_path, '--world', 'owner', '--seed', '5', '--steps', '8', '--plant', 'write:3')
    found = [f for f in run['findings'] if f['oracle'] == 'driveWrites' and 'planted.txt' in f['what']]
    assert found and found[0]['class'] == 'bug', run['findings']
    # found at the step whose click set it off, which a person did
    assert run['steps'][found[0]['step']]['action']['kind'] in ('click', 'canvas', 'drag', 'key')
