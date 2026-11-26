"""req/shelves/read/fields: the page reads a reading's text into fields as fields.label does a block with no place on
the spine, on the same texts: the cues the labelling reads, and the characters JavaScript's and Python's text
handling could part on (Unicode digits and whitespace, NFKC forms, case folding)."""
import json
import os
import shutil
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
import fields as F

pytestmark = pytest.mark.full

from drivers import run_driver
NODE = shutil.which('node')
TEXTS = [
    '', '   ', 'חולית',
    'פרנק הרברט / חולית', 'ג׳ו הולדמן \\ שלום לנצח', 'א / ב / ג',
    'שדה קרב ארץ | ל. רון האברד', 'אן ס. קריספין 0 וי 0 חלק א׳', 'ל. ס. / ג׳.ג׳. טולקין',
    'רוברט סילברברג | האיש במבוך', 'הנוסע השמיני אלן דין פוסטר',
    'הבושם פטריק זיסקינד מודן', 'רוברט סילברברג | האיש במבוך | מועדון קוראי מעריב', 'כנרת זמורה ביתן',
    'מבחן קבלה נאוה מקמל-עתיר ידיעות ספרים', 'תגידי מה את רוצה - רביטל ויטלזון-יעקבס - מודן',
    'Dune Frank Herbert Ace', 'Dune HARPERCOLLINS', 'Dune Del rey', 'Ｄｕｎｅ Ｔｏｒ', 'The Hobbit Pocket  Books',
    'הנסיכים | ספר שני', 'הנסיכים | II', 'הנסיכים - 3', 'הנסיכים vol. 2', 'הנסיכים כרך ג', 'Foundation Book 2', '1984',
    'חולית | 892.4 טול', '892.4 טול', '892 הר', '892', 'חולית | ٨٩٢.٤ טול', 'הנסיכים | ٣',
    'פרנק הרברט / חולית', 'פרנק\x1cהרברט / חולית', '﻿חולית / מודן', 'פרנק הרברט  / חולית',
    'Straße / Tor', 'מס\' 4', 'ל. רון / מס\' 4 / מודן',
]


@pytest.mark.skipif(not NODE, reason='node missing')
def test_the_page_labels_a_text_as_the_study_does(tmp_path):
    (tmp_path / 'in.json').write_text(json.dumps(TEXTS))
    r = run_driver(os.path.join(HERE, 'fields_driver.mjs'), str(tmp_path / 'in.json'), str(tmp_path / 'out.json'), timeout=60, check=False)
    assert r.returncode == 0, r.stderr
    got = json.loads((tmp_path / 'out.json').read_text())
    assert len(got) == len(TEXTS) == 41
    for text, page in zip(TEXTS, got):
        for seen in (False, True):
            fields, regions = F.label([dict(text=text)], library_seen=seen)
            assert (page['fields'], page['regions']) == (fields, regions), (text, seen)
