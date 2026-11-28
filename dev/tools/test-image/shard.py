"""The tests one runner of several runs (req/checks/ci-sets): SHARD=k/n keeps the k-th of n parts of the tests
collected, every runner collecting the same and running its own part, the parts as near each other in time as the
tests' lengths allow, by what each last took (durations.json, which durations.py writes). Loaded with pytest -p shard;
with no SHARD, every test runs."""
import json
import os
import statistics

TOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'durations.json')


def mine(ids, k, n, took):
    """The k-th (from 1) of n parts of the tests named ids: the longest first, each to the part with the least time so
    far, a test with no time of its own counted as the median one, ties settled by name."""
    middle = statistics.median(took.values()) if took else 1
    loads, parts = [0.0] * n, [[] for _ in range(n)]
    for i in sorted(ids, key=lambda i: (-took.get(i, middle), i)):
        at = min(range(n), key=lambda p: (loads[p], p))
        loads[at] += took.get(i, middle)
        parts[at].append(i)
    return parts[k - 1]


def pytest_collection_modifyitems(config, items):
    if not os.environ.get('SHARD'):
        return
    k, n = map(int, os.environ['SHARD'].split('/'))
    with open(TOOK, encoding='utf-8') as f:
        took = json.load(f)
    keep = set(mine([item.nodeid for item in items], k, n, took))
    config.hook.pytest_deselected(items=[item for item in items if item.nodeid not in keep])
    items[:] = [item for item in items if item.nodeid in keep]
