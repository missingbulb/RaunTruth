"""req/shelves/read/readers: the study's readers (algorithm/reading.py) on the lab's native engines (lab/services.py:
the PP-OCR text finder on ONNX Runtime, the Tesseract command, with the files study.json names) read a Hebrew spine
and an English one, each set upright from its side. The labels are drawn, so this proves the engines run and turn
the text, not how well they read real spines; ground truth scores that, through lab/run.py."""
import json
import os
import shutil
import sys
import types

import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageFont

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
STUDY = os.path.join(HERE, '..')
sys.path.insert(0, os.path.join(STUDY, 'algorithm'))
sys.path.insert(0, os.path.join(STUDY, '..', '..', 'lab'))
import reading
from study import drive

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


@pytest.fixture(scope='module')
def engines(request):
    if not shutil.which('tesseract'):
        pytest.skip('no tesseract command')
    pytest.importorskip('onnxruntime')
    import services
    # the engines' files, fetched once into pytest's cache rather than the study's downloaded data
    study = types.SimpleNamespace(dir=STUDY, data=str(request.config.cache.mkdir('shelves-engines')),
                                  manifest=json.load(open(os.path.join(STUDY, 'study.json'))))
    return services.native(study)


@pytest.fixture(scope='module')
def spines():
    """Two spines' crops, upright as straightened: a title drawn across a label and stood on its side as a spine
    stands, RGBA."""
    try:
        font = ImageFont.truetype(FONT, 40)
    except OSError:
        pytest.skip('no font with Hebrew letters to draw the labels with')
    out = []
    for text, turn in (('הארי פוטר', 90), ('THE HOBBIT', 270)):
        label = Image.new('RGB', (560, 80), (110, 30, 30))
        ImageDraw.Draw(label).text((24, 14), text, font=font, fill=(245, 230, 180))
        out.append(np.asarray(label.rotate(turn, expand=True).convert('RGBA')))
    return out


@pytest.mark.parametrize('how', ['tesseract', 'lines'])
def test_the_readers_read_hebrew_and_english_spines_set_upright(engines, spines, how):
    said = [drive(reading.read(c, how, lambda t: t), engines) for c in spines]
    hebrew, english = (r['text'] for r in said)
    assert hebrew.replace(' ', '') == 'הארי פוטר'.replace(' ', '') and english == 'THE HOBBIT', (hebrew, english)
    if how == 'tesseract':
        # quarter turns clockwise that set each upright: the Hebrew label was turned a quarter anticlockwise (the
        # lines reader may read a line upside down instead, flipping that line alone)
        assert [r['turn'] for r in said] == [1, 3], said
