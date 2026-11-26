"""The node-skip-in-run-driver check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'node-skip-in-run-driver')


def test_a_test_looking_for_node_itself_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/test_a.py': "NODE = shutil.which('node')\n@pytest.mark.skipif(not NODE, reason='node missing')\ndef test_a():\n    pass\n",
        'studies/x/tests/test_b.py': 'needs = pytest.mark.skipif( not  NODE, reason="needs node")\n',
        'lab/tests/test_c.py': '    if not shutil.which("node"):\n        pytest.skip()\n',
        'web-tests/test_d.py': "def run():\n    if not NODE:\n        pytest.skip('node missing')\n",
    }) == ['lab/tests/test_c.py:1', 'studies/x/tests/test_b.py:1', 'web-tests/test_a.py:1', 'web-tests/test_a.py:2', 'web-tests/test_d.py:2']


def test_run_driver_another_program_a_comment_and_the_runner_itself_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/test_a.py': ("from drivers import NODE, run_driver\n"
                                "GIT = shutil.which('git')\n"
                                "@pytest.mark.skipif(not NODES_FOUND, reason='x')\n"
                                "if not NODE_PATH:\n"
                                "# skipif(not NODE) is run_driver's to say\n"),
        'dev/tools/build/drivers.py': "NODE = shutil.which('node')\n",
    }) == []
