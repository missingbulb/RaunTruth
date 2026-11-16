"""req/shell/drag/escape: every drag on the page, the shell's and each study's, goes through the one wrapper that
cancels it on Escape, so a drag written later cancels too. A drag holds its pointer: only the wrapper may capture one."""
import glob
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
WRAPPER = os.path.join(ROOT, 'web', 'drag.js')


def served():
    found = glob.glob(os.path.join(ROOT, 'web', '*.js')) + glob.glob(os.path.join(ROOT, 'studies', '*', 'web', '**', '*.js'), recursive=True)
    return sorted(p for p in found if '/vendor/' not in p)


def code(path):
    return re.sub(r'//[^\n]*|/\*.*?\*/', '', open(path, encoding='utf-8').read(), flags=re.S)


def test_only_the_wrapper_captures_a_pointer():
    assert os.path.exists(WRAPPER), 'the drag wrapper is missing'
    paths = served()
    assert len(paths) > 20, "the page's scripts are no longer where this looks"
    bypass = [os.path.relpath(p, ROOT) for p in paths if p != WRAPPER and 'setPointerCapture' in code(p)]
    assert not bypass, f'a drag outside the wrapper (web/drag.js), which Escape would not cancel: {bypass}'
