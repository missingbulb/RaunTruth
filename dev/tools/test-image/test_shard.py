"""req/checks/ci-sets: the PR's Chromium run split across runners runs every test once, on one of them."""
import shard


def test_the_shards_run_every_test_once_between_them():
    ids = [f'web-tests/test_{i % 7}.py::test_{i}' for i in range(100)]
    parts = [shard.mine(ids, k, 3) for k in (1, 2, 3)]
    assert sorted(sum(parts, [])) == sorted(ids)
    assert max(map(len, parts)) - min(map(len, parts)) <= 1


def test_a_shard_is_the_same_whatever_order_the_tests_are_collected_in():
    ids = [f'studies/test_{i}.py::test' for i in range(20)]
    assert set(shard.mine(ids, 2, 3)) == set(shard.mine(list(reversed(ids)), 2, 3))
