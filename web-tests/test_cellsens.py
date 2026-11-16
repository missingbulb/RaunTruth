"""req/shell/image/cellsens: an Olympus cellSens image (a .vsi and its _<name>_ folder) opens as the page opens any
image. Each pair is drawn by cellsens_fixture.py, handed over zipped as the page keeps it, and must open exactly as
an ImageJ TIFF holding the same pixels, scale, z-step, channel names and colours (written by tifffile, which knows
nothing of cellSens). The Google Drive dialog side runs in headless Chromium (cellsens_drive_driver.mjs)."""
import json
import os
import shutil
import subprocess

import numpy as np
import pytest
import tifffile

from cellsens_fixture import write_pair, zipped
from test_study_runs import answers, png  # noqa: F401  (fixtures)
from test_study_runs import run as run_page

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')
COLOURS = [(0, 0, 255), (255, 0, 255)]
NAMES = ['DAPI', 'Iba1']


def lut(rgb):
    return np.stack([np.arange(256) * (k // 255) for k in rgb]).astype(np.uint8)


def run(tmp_path, *files):
    if not NODE:
        pytest.skip('node missing')
    jobs = [{'file': str(f), 'view': {}, 'planes': str(tmp_path / f'p{k}.bin'), 'volume': str(tmp_path / f'v{k}.bin')}
            for k, f in enumerate(files)]
    spec = tmp_path / 'jobs.json'
    spec.write_text(json.dumps(jobs))
    r = subprocess.run([NODE, os.path.join(HERE, 'image_open_driver.mjs'), str(spec)], capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stderr
    out = []
    for j, line in zip(jobs, r.stdout.splitlines()):
        o = json.loads(line)
        if 'error' not in o:
            o['planes'] = open(j['planes'], 'rb').read()
            o['volume_bytes'] = open(j['volume'], 'rb').read() if o['volume'] else b''
        out.append(o)
    return out


def pair_and_twin(tmp_path, planes, um, zstep, compression):
    write_pair(str(tmp_path), 'scan', planes, um=um, zstep=zstep, names=NAMES, colours=COLOURS, compression=compression)
    pair = tmp_path / 'scan.vsi.zip'
    pair.write_bytes(zipped(str(tmp_path), 'scan'))
    twin = str(tmp_path / 'twin.tif')
    Z = planes.shape[0]
    tifffile.imwrite(twin, planes, imagej=True, resolution=(1 / um, 1 / um),
                     metadata={'axes': 'ZCYX', 'unit': 'micron', 'spacing': zstep, 'LUTs': [lut(c) for c in COLOURS], 'Labels': NAMES * Z})
    return pair, twin


def noise(shape, seed):
    return np.random.default_rng(seed).gamma(2.0, 400, shape).clip(0, 65535).astype(np.uint16)


def opens_as_its_twin(got, twin):
    assert (got['W'], got['H'], got['Z']) == (twin['W'], twin['H'], twin['Z'])
    assert got['planes'] == twin['planes'], 'the flattened planes differ'
    assert got['volume_bytes'] == twin['volume_bytes'], 'the slices differ'
    assert got['channels'] == twin['channels']
    assert (got['um'], got['umY'], got['spacing']) == (twin['um'], twin['umY'], twin['spacing'])


def test_a_flat_uncompressed_image_opens_as_its_tiff_twin(tmp_path):
    pair, twin = pair_and_twin(tmp_path, noise((1, 2, 40, 56), 1), um=0.338166, zstep=1.0, compression='raw')
    got, want = run(tmp_path, pair, twin)
    opens_as_its_twin(got, want)
    assert got['Z'] == 1 and [c['name'] for c in got['channels']] == NAMES


def test_a_jpeg2000_stack_opens_as_its_tiff_twin(tmp_path):
    pair, twin = pair_and_twin(tmp_path, noise((4, 2, 48, 36), 2), um=0.336942, zstep=1.0, compression='j2k')
    got, want = run(tmp_path, pair, twin)
    opens_as_its_twin(got, want)
    assert got['Z'] == 4 and got['spacing'] == 1.0 and [c['colour'] for c in got['channels']] == ['#0000ff', '#ff00ff']


def test_an_image_stored_as_jpeg_says_why_it_cannot_be_read(tmp_path):
    write_pair(str(tmp_path), 'scan', noise((1, 2, 16, 16), 3), um=0.5, zstep=1.0, names=NAMES, colours=COLOURS, compression='jpeg')
    pair = tmp_path / 'scan.vsi.zip'
    pair.write_bytes(zipped(str(tmp_path), 'scan'))
    got, = run(tmp_path, pair)
    assert 'JPEG' in got.get('error', ''), got


@pytest.mark.full
@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_drive_dialog_lists_the_pair_as_one_image_and_opens_it(answers, tmp_path):
    root = tmp_path / 'drive'
    root.mkdir()
    write_pair(str(root), 'scan', noise((3, 2, 32, 32), 4), um=0.34, zstep=1.0, names=NAMES, colours=COLOURS, compression='j2k')
    run_page('cellsens_drive_driver.mjs', answers[0], answers[1], str(root))
