"""req/shell/study/viewer-choice, req/shell/python/one-call: the shell runs the fixture study, which shares none of the NoR study's words: its Python through
the bridge in Pyodide under Node (study_bridge_driver.mjs), and the whole page, viewer and panels included,
in headless Chromium with a stand-in worker (study_page_driver.mjs). req/shell/header, req/shell/image-viewer: the header's switcher and
the default study, in the same page."""
import os
import shutil

import numpy as np
import pytest
from PIL import Image
from drivers import run_driver

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


def run(driver, *args, timeout=120):
    return run_driver(os.path.join(HERE, driver), *args, timeout=timeout)


@pytest.fixture(scope='module')
def png(tmp_path_factory):
    """A grey image with two bright squares."""
    a = np.zeros((60, 80), np.uint8)
    a[10:20, 10:20] = 200
    a[30:45, 50:70] = 250
    path = str(tmp_path_factory.mktemp('fixture') / 'squares.png')
    Image.fromarray(a).save(path)
    return path


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_bridge_runs_a_study_it_knows_nothing_of(png):
    run('study_bridge_driver.mjs', png)


@pytest.fixture(scope='module')
def answers(png, tmp_path_factory):
    """What the stand-in worker answers, which is what the fixture's own Python answers about the image and each
    study's ready() on loading, with the image as the page's own reader opens it, and the build's list of studies:
    (answers.json, studies.json)."""
    import base64, json, sys
    sys.path.insert(0, os.path.join(HERE, '..', 'studies', 'fixture', 'algorithm'))
    import fixture
    d = tmp_path_factory.mktemp('answers')
    from image_open import open_image
    meta, planes, _ = open_image(d, png, view={'stretch': False})
    opened = json.dumps(dict(W=meta['W'], H=meta['H'], um=None, um_y=None, info=meta['info']))
    images = planes.tobytes()
    ran = fixture.VERSIONS['above'](fixture.read(png), threshold=100)
    mask = ran.pop('above')
    count = json.dumps(ran)
    out = d / 'answers.json'
    ready = dict(fixture={}, viewer={}, nor={})
    out.write_text(json.dumps(dict(ready=ready, opened=json.loads(opened), count=json.loads(count),
                                   images=base64.b64encode(images).decode(), mask=base64.b64encode(mask).decode())))
    sys.path.insert(0, os.path.join(HERE, '..', 'dev', 'tools', 'build'))
    import build
    studies = d / 'studies.json'
    studies.write_text(json.dumps(build.studies(os.path.join(HERE, '..'))))
    return str(out), str(studies)


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_page_runs_the_study_it_is_asked_for(png, answers):
    run('study_page_driver.mjs', answers[0], png, answers[1])
