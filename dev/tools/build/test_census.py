"""Every test there is, counted by where it runs, for whoever tells of a test run: the ones every pull request and main
run on Chromium, the same ones postponed to the nightly on each other engine (other_engines.py), and the ones a flaky
mark has ignored where they fail. Prints the line to say them by.

    python3 dev/tools/build/test_census.py
"""
import json
import os
import re
import subprocess
import sys
import tempfile

import other_engines

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
# what the test image runs on Chromium
INSIDE = os.path.join(ROOT, 'dev', 'tools', 'test-image', 'inside.sh')
ENGINES = [e for e in other_engines.BROWSER if e != 'chromium']

LISTING = '''
import json, sys, pytest

class Listing:
    def pytest_collection_modifyitems(self, items):
        json.dump([{"test": i.nodeid, "marks": [m.name for m in i.iter_markers()],
                    "flaky": next((m.kwargs for m in i.iter_markers("flaky")), None)} for i in items], open(sys.argv[1], "w"))

sys.exit(pytest.main(["--collect-only", "-q", "-p", "no:cacheprovider", *sys.argv[2:]], plugins=[Listing()]))
'''


def chromium_paths():
    line = next(l for l in open(INSIDE) if re.match(r'\s*chromium\)', l))
    return re.search(r'-p shard (.*?) -q ', line).group(1).split()


def listed(root, paths):
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'tests.json')
        r = subprocess.run([sys.executable, '-c', LISTING, out, *paths], cwd=root, capture_output=True, text=True)
        if not os.path.exists(out):
            raise RuntimeError('the tests could not be listed:\n' + r.stdout + r.stderr)
        return json.load(open(out))


def census(root, paths, other_paths=None):
    """The tests under paths, and those of them the other engines run too (under other_paths, all of paths when none)."""
    tests = listed(root, paths)
    under = lambda t: other_paths is None or any(t['test'].startswith(p.rstrip('/') + '/') for p in other_paths)
    again = [t for t in tests if 'full' in t['marks'] and 'chromium_only' not in t['marks'] and under(t)]
    postponed = {e: len(again) for e in ENGINES}
    return {
        'chromium': len(tests),
        'postponed': postponed,
        'all': len(tests) + sum(postponed.values()),
        'ignored': [{'test': t['test'], 'issue': t['flaky']['issue'], 'engines': t['flaky']['engines']} for t in tests if t['flaky']],
    }


def said(c):
    late = sum(c['postponed'].values())
    each = ', '.join(f'{n} on {other_engines.BROWSER[e]}' for e, n in c['postponed'].items())
    ignored = '; '.join(f"{i['test'].split('::')[-1]} on {' and '.join(i['engines'])} (#{i['issue']})" for i in c['ignored'])
    return (f"{c['all']} tests in all: {c['chromium']} run on Chromium in every pull request and on main, "
            f"{late} postponed to the nightly ({each})" + (f"; ignored where they fail: {ignored}" if ignored else '') + '.')


if __name__ == '__main__':
    print(said(census(ROOT, chromium_paths(), other_engines.PATHS)))
