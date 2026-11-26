"""The node-through-run-driver check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'node-through-run-driver')


def test_a_test_launching_node_itself_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/test_a.py': ("r = subprocess.run([NODE, os.path.join(HERE, 'a_driver.mjs')], capture_output=True, text=True, timeout=60)\n"
                                "out = subprocess.run(['node', '--input-type=module', '-e', JS], capture_output=True)\n"
                                "p = subprocess.Popen([node, script])\n"),
        'studies/x/tests/test_b.py': 'name = subprocess.check_output([NODE, script]).strip()\n',
        'lab/tests/test_c.py': 'return subprocess.run(["node", "-e", script], cwd=work)\n',
    }) == ['lab/tests/test_c.py:1', 'studies/x/tests/test_b.py:1'] + [f'web-tests/test_a.py:{n}' for n in range(1, 4)]


def test_run_driver_another_program_a_comment_and_the_runner_itself_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/test_a.py': ("r = run_driver(os.path.join(HERE, 'a_driver.mjs'), timeout=60)\n"
                                "subprocess.run(['git', '-C', ROOT, 'ls-files'], check=True)\n"
                                "subprocess.run([sys.executable, TOOL], check=True)\n"
                                "# subprocess.run([NODE, script]) hangs without a word\n"),
        'dev/tools/build/drivers.py': 'with subprocess.Popen([NODE, *node_args, path]) as p:\n    pass\n',
    }) == []
