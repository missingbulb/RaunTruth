"""setup/page: Study Setup's page is the app's page with Data Management added. Two HTML files hold it, because each page
names its own module and title, so this guard holds web/setup.html to web/index.html: every line of the app's page is
in Study Setup's, in order, but the three each page must say for itself (the html tag, the title, the script), and Study
Setup only adds lines."""
import difflib
import os

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web')
OWN = ('<html ', '<title>', '<script type="module"')


def lines(name):
    with open(os.path.join(WEB, name), encoding='utf-8') as f:
        return f.read().splitlines()


def test_study_setups_page_only_adds_to_the_apps_page():
    index, setup = lines('index.html'), lines('setup.html')
    changed = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, index, setup, autojunk=False).get_opcodes():
        if op in ('equal', 'insert'):
            continue
        own = op == 'replace' and i2 - i1 == j2 - j1 and all(
            any(a.lstrip().startswith(p) and b.lstrip().startswith(p) for p in OWN) for a, b in zip(index[i1:i2], setup[j1:j2]))
        if not own:
            changed.append((op, index[i1:i2], setup[j1:j2]))
    assert changed == [], 'web/setup.html differs from web/index.html beyond adding lines: edit both alike'
    # the guard compared the whole of both pages
    assert len(index) > 200 and len(setup) > len(index)
