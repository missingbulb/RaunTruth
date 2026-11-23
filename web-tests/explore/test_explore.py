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


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_files_a_study_keeps_offline_are_on_the_cdn_fake_as_they_are_on_the_cdn(tmp_path):
    click = {'kind': 'click', 'family': 'preferences', 'file': 'stack', 'confirm': True}
    plan = {'world': {'name': 'annotator', 'path': os.path.join(HERE, 'worlds', 'annotator.json')}, 'seed': 1, 'focus': [], 'plants': [],
            'steps': [{'i': 0, 'action': {**click, 'key': '#sb-res-icon', 'text': 'Resources'}},
                      {'i': 1, 'action': {**click, 'key': '#storage-list > details:nth-of-type(1) > summary > button', 'text': 'Make Available Offline'}}]}
    (tmp_path / 'plan.json').write_text(json.dumps(plan), encoding='utf-8')
    run = explore(tmp_path / 'run', '--replay', str(tmp_path / 'plan.json'))
    assert not [f for f in run['findings'] if f['class'] == 'bug'], run['findings']


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_screenshot_for_the_owner_has_two_device_pixels_to_a_css_pixel(tmp_path):
    from PIL import Image
    run = explore(tmp_path, '--world', 'phone', '--seed', '1', '--steps', '12')
    shots = [f['ownerShot'] for f in run['findings'] if f.get('ownerShot')]
    assert shots, run['findings']
    assert Image.open(tmp_path / shots[0]).size[0] == 2 * 390


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_press_repeated_that_answers_as_before_is_not_a_dead_control(tmp_path):
    click = {'kind': 'click', 'family': 'a control', 'file': 'large', 'confirm': True}
    memory = '#usage-dlg > form > div:nth-of-type(1) > div > button:nth-of-type(2)'
    plan = {'world': {'name': 'visitor', 'path': os.path.join(HERE, 'worlds', 'visitor.json')}, 'seed': 1, 'focus': [], 'plants': [],
            'steps': [{'i': 0, 'action': {**click, 'key': '#sb-res-icon', 'text': 'Resources'}},
                      {'i': 1, 'action': {**click, 'key': '#offline-install', 'text': 'Install as an app'}},
                      {'i': 2, 'action': {**click, 'key': '#offline-install', 'text': 'Install as an app'}},
                      {'i': 3, 'action': {**click, 'key': memory, 'text': 'Memory'}},
                      {'i': 4, 'action': {**click, 'key': memory, 'text': 'Memory'}}]}
    (tmp_path / 'plan.json').write_text(json.dumps(plan), encoding='utf-8')
    run = explore(tmp_path / 'run', '--replay', str(tmp_path / 'plan.json'))
    assert not [f for f in run['findings'] if f['sig'].startswith('dead ')], run['findings']


def replayed(tmp_path, world, steps):
    plan = {'world': {'name': world, 'path': os.path.join(HERE, 'worlds', world + '.json')}, 'seed': 1, 'focus': [], 'plants': [],
            'steps': [{'i': i, 'action': {'family': 'a control', 'file': 'png', 'confirm': True, **a}} for i, a in enumerate(steps)]}
    (tmp_path / 'plan.json').write_text(json.dumps(plan), encoding='utf-8')
    return explore(tmp_path / 'run', '--replay', str(tmp_path / 'plan.json'))


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_study_that_could_not_come_in_is_not_held_to_its_shell_states(tmp_path):
    # offline, the vascular study's file cannot be fetched: the address names it, the page still shows the study before
    run = replayed(tmp_path, 'offline-tagger', [
        {'kind': 'event', 'event': 'offline'},
        {'kind': 'click', 'key': '#study-menu > summary', 'text': 'Switch study'},
        {'kind': 'click', 'key': '#study-list > a:nth-of-type(4)', 'text': 'Vascular Measurements Develop'}])
    assert run['steps'][2]['vars']['online'] is False
    assert not [f for f in run['findings'] if f['oracle'] == 'shellStates'], run['findings']


@pytest.mark.skipif(not NODE, reason='node missing')
def test_bookkeeping_is_allowed_only_where_the_step_stood_to_make_it():
    script = """
    import { bookkeeping } from './oracles.mjs';
    import fs from 'node:fs';
    const effects = JSON.parse(fs.readFileSync('./effects.json', 'utf8'));
    const st = (vars, open) => ({ vars, open });
    const out = [
      bookkeeping(effects, st({ signedIn: false }, ['#study-menu']), st({ signedIn: false }, []), { kind: 'click' }),
      bookkeeping(effects, st({ signedIn: false }, ['#study-menu']), st({ signedIn: false }, ['#study-menu', '#other']), { kind: 'click' }),
      bookkeeping(effects, st({ signedIn: false }, ['#study-menu']), st({ signedIn: false }, []), { kind: 'key' }),
      bookkeeping(effects, st({ signedIn: false }, []), st({ signedIn: false }, []), { kind: 'click' }),
      bookkeeping(effects, st({ signedIn: false }, []), st({ signedIn: true }, []), { kind: 'click' }),
    ];
    console.log(JSON.stringify(out));
    """
    r = subprocess.run([NODE, '--input-type=module', '-e', script], cwd=HERE, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    closes, opens, pressed, nothing, signed = json.loads(r.stdout)
    assert closes == ['open'] and opens == [] and pressed == [] and nothing == []
    assert 'settings' in signed and 'signin' in signed and 'storage.nor-google-sign-in' in signed


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_details_the_images_name_unfolds_are_not_found_wrong_for_showing(tmp_path):
    run = replayed(tmp_path, 'annotator', [
        {'kind': 'click', 'key': '#sb-load', 'text': 'Load image'},
        {'kind': 'click', 'key': '#remote-list > button:nth-of-type(4)', 'text': 'wide scan.png 3.4 MB'},
        {'kind': 'click', 'key': '#remote-open', 'text': 'Open'},
        {'kind': 'click', 'key': '#image-box > div:nth-of-type(1) > h2', 'text': 'wide scan.png'},
        {'kind': 'click', 'key': '#file-name', 'text': 'Details'}])
    assert run['steps'][4]['vars']['image'] == 'original', run['steps']
    assert not [f for f in run['findings'] if f['oracle'] == 'shellStates'], run['findings']


@pytest.mark.skipif(not NODE, reason='node missing')
def test_a_refusal_the_world_itself_caused_is_not_found_wrong(tmp_path):
    # the owner stops sharing the study's folder while the dialog that lists it is open: Drive answers the page's next read
    # of the folder 404, which Chromium logs and the page tells the person of
    run = replayed(tmp_path, 'member', [
        {'kind': 'click', 'key': '#sb-res-icon', 'text': 'Resources'},
        {'kind': 'event', 'event': 'offline'},
        {'kind': 'click', 'key': '#storage-list > details:nth-of-type(4) > summary > button', 'text': 'Make Available Offline'},
        {'kind': 'event', 'event': 'accessRemoved'},
        {'kind': 'event', 'event': 'online'}])
    assert any('404' in m['line'] for s in run['steps'] for m in s['heard']), 'the world refused nothing, so the case proves nothing'
    assert not [f for f in run['findings'] if f['class'] == 'bug'], run['findings']
