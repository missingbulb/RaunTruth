"""req/checks/ci-sets: CI runs every test, and the `full` mark names those that drive Node, Pyodide or a browser, or
measure speed or memory, so `-m "not full"` is a quick local loop that needs neither Node nor a browser."""
import ast
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HEAVY = ('_driver.mjs', 'needs_node', 'subprocess', 'perf_counter', 'mallinfo', 'Speed-ups')


def marked_full(path):
    tree = ast.parse(open(path).read())
    return any(isinstance(n, ast.Assign) and any(getattr(t, 'id', '') == 'pytestmark' for t in n.targets)
               and 'full' in ast.unparse(n.value) for n in tree.body)


def test_every_heavy_test_is_in_the_full_set():
    every = glob.glob(os.path.join(HERE, 'test_*.py')) + glob.glob(os.path.join(HERE, '..', 'studies', '*', 'tests', 'test_*.py'))
    heavy = [p for p in sorted(every)
             if any(h in open(p).read() for h in HEAVY) and not p.endswith('test_ci_split.py')]
    assert len(heavy) >= 7, f'found only {len(heavy)} heavy test modules: the probe is not looking at them all'
    unmarked = [os.path.basename(p) for p in heavy if not marked_full(p)]
    assert not unmarked, f'drive Node or a browser, or time or weigh something, but are not marked full: {unmarked}'

