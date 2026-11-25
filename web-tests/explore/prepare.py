"""What an exploration's world needs on disk before its browser opens (explore.mjs): the world's Drive tree as a
folder, each file drawn here from the sample it names, and what the stand-in worker answers for every study the
shell-states paths walk (test_shell_states_page.own_answers). Prints {answers, studies, rootDir, files}, files the
samples a person loads from their computer.
    python3 web-tests/explore/prepare.py WORLD.json OUT_DIR
"""
import json
import os
import pathlib
import sys
import zlib

import numpy as np
import tifffile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..'), os.path.join(HERE, '..', '..', 'dev', 'tools', 'build')]


def squares(path):
    """A grey PNG with two bright squares, which the fixture study counts, and a third placed by the file's name: two
    images are one to the page only where they share their bytes, as two of a name in two folders do."""
    a = np.zeros((60, 80), np.uint8)
    a[10:20, 10:20] = 200
    a[30:45, 50:70] = 250
    at = zlib.crc32(os.path.basename(path).encode()) % 60
    a[52:57, 5 + at:10 + at] = 220
    Image.fromarray(a).save(path, format='PNG')


def two_channels(path):
    y, x = np.mgrid[0:60, 0:80]
    tifffile.imwrite(path, np.stack([(x * 3).astype(np.uint8), (y * 4).astype(np.uint8)]), imagej=True, metadata={'axes': 'CYX'})


def stack(path):
    z, y, x = np.mgrid[0:6, 0:40, 0:50]
    tifffile.imwrite(path, np.stack([(x * 5 + z * 10).astype(np.uint8), (y * 6).astype(np.uint8)], axis=1), imagej=True, metadata={'axes': 'ZCYX'})


def photo(path):
    y, x = np.mgrid[0:90, 0:120]
    Image.fromarray(np.stack([x * 2, y * 2, x + y], -1).astype(np.uint8)).save(path, format='JPEG')


def large(path):
    """Wider and taller than the view: it opens below 100%."""
    Image.fromarray(np.random.default_rng(2).integers(0, 256, (1500, 2400), np.uint8)).save(path, format='PNG')


def broken(path):
    """Named as an image, holding none: a file cut short in its upload."""
    pathlib.Path(path).write_bytes(b'\x89PNG\r\n\x1a\n' + b'\0' * 40)


SAMPLES = {'png': squares, 'tif': two_channels, 'stack': stack, 'photo': photo, 'large': large, 'broken': broken}


def tree(entries, at):
    os.makedirs(at, exist_ok=True)
    for e in entries:
        p = os.path.join(at, e['name'])
        if 'children' in e:
            tree(e['children'], p)
        else:
            SAMPLES[e['sample']](p)


def main(world_path, out):
    with open(world_path, encoding='utf-8') as f:
        world = json.load(f)
    out = pathlib.Path(out)
    root = out / 'drive'
    tree(world['drive']['tree'], root)
    own = out / 'samples'
    own.mkdir(parents=True, exist_ok=True)
    files = {}
    for kind in ('png', 'tif', 'stack', 'photo', 'large', 'broken'):
        files[kind] = str(own / {'png': 'squares.png', 'tif': 'two channels.tif', 'stack': 'stack.tif', 'photo': 'photo.jpg',
                                 'large': 'large.png', 'broken': 'broken.png'}[kind])
        SAMPLES[kind](files[kind])
    from test_study_runs import write_answers
    from test_shell_states_page import own_answers
    answers, studies = write_answers(files['png'], own)
    answers = own_answers(answers, files['png'], files['tif'], files['stack'], own / 'answers-all.json')
    print(json.dumps({'answers': answers, 'studies': studies, 'rootDir': str(root), 'files': files}))


if __name__ == '__main__':
    main(*sys.argv[1:3])
