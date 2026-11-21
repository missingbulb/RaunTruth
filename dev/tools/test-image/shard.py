"""The tests one runner of several runs (req/checks/ci-sets): SHARD=k/n keeps the k-th of n parts of the tests
collected, every runner collecting the same and running its own part. Loaded with pytest -p shard; with no SHARD,
every test runs."""
import os


def mine(ids, k, n):
    """The k-th (from 1) of n parts of the tests named ids: every n-th of them in the order of their names."""
    return [i for at, i in enumerate(sorted(ids)) if at % n == k - 1]


def pytest_collection_modifyitems(config, items):
    if not os.environ.get('SHARD'):
        return
    k, n = map(int, os.environ['SHARD'].split('/'))
    keep = set(mine([item.nodeid for item in items], k, n))
    config.hook.pytest_deselected(items=[item for item in items if item.nodeid not in keep])
    items[:] = [item for item in items if item.nodeid in keep]
