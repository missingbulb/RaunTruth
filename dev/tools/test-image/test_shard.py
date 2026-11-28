"""req/checks/ci-sets: the PR's Chromium run split across runners runs every test once, on one of them, each runner's
share of the time as near the others' as the tests' lengths allow."""
import shard


def test_the_shards_run_every_test_once_between_them():
    ids = [f'web-tests/test_{i % 7}.py::test_{i}' for i in range(100)]
    parts = [shard.mine(ids, k, 3, {}) for k in (1, 2, 3)]
    assert sorted(sum(parts, [])) == sorted(ids)
    assert max(map(len, parts)) - min(map(len, parts)) <= 1


def test_a_shard_is_the_same_whatever_order_the_tests_are_collected_in():
    ids = [f'studies/test_{i}.py::test' for i in range(20)]
    took = {i: (n * 7) % 11 for n, i in enumerate(ids)}
    assert set(shard.mine(ids, 2, 3, took)) == set(shard.mine(list(reversed(ids)), 2, 3, took))


def test_the_long_tests_are_spread_so_no_runner_waits_on_the_others():
    # sorted by name, every third test, the three long ones would all land on one runner
    ids = [f'web-tests/test_{c}{i}.py::t' for c in 'abc' for i in range(10)]
    took = {i: 1 for i in ids} | {'web-tests/test_a0.py::t': 60, 'web-tests/test_a3.py::t': 60, 'web-tests/test_a6.py::t': 60}
    loads = [sum(took[i] for i in shard.mine(ids, k, 3, took)) for k in (1, 2, 3)]
    assert sorted(sum((shard.mine(ids, k, 3, took) for k in (1, 2, 3)), [])) == sorted(ids)
    assert max(loads) - min(loads) <= 1, loads


def test_a_test_not_measured_yet_counts_as_a_middling_one():
    ids = ['a::long', 'b::new', 'c::short', 'd::short2']
    took = {'a::long': 10, 'c::short': 1, 'd::short2': 3}
    parts = [shard.mine(ids, k, 2, took) for k in (1, 2)]
    assert sorted(sum(parts, [])) == sorted(ids)
    # the new test weighs the median, 3: with the long one alone on one runner, the other three share the second
    assert ['a::long'] in parts, parts


def test_what_each_test_took_is_read_from_a_run_that_said_every_duration():
    import durations
    said = ['============ slowest durations ============',
            '12.31s call     web-tests/test_a.py::test_x[1]',
            '0.40s setup    web-tests/test_a.py::test_x[1]',
            '3.00s call     lab/test_b.py::test_y',
            '(296 durations < 0.005s hidden.  Use -vv to show these durations.)']
    assert durations.took(said) == {'lab/test_b.py::test_y': 3.0, 'web-tests/test_a.py::test_x[1]': 12.7}
