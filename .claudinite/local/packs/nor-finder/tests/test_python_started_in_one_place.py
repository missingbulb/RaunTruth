"""The python-started-in-one-place check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'python-started-in-one-place')


def test_page_code_that_starts_or_drives_python_is_found_in_the_shell_and_a_study(tmp_path):
    assert findings(tmp_path, {
        'web/shell.js': ('const py = await loadPyodide({ indexURL });\n'
                         'py.runPython("import study");\n'),
        'studies/x/web/x.js': ('await py.runPythonAsync(code);\n'
                               'py.globals.set("x", 1);\n'
                               'const np = py.pyimport("numpy");\n'),
        'web/index.html': '<script>pyodide.runPython("1")</script>\n',
    }) == ['studies/x/web/x.js:1', 'studies/x/web/x.js:2', 'studies/x/web/x.js:3',
           'web/index.html:1', 'web/shell.js:1', 'web/shell.js:2']


def test_the_worker_the_bridge_the_tiff_codecs_a_comment_tests_and_benchmarks_are_not(tmp_path):
    assert findings(tmp_path, {
        'web/worker.js': 'const py = await loadPyodide({ indexURL });\npy.runPython("1");\n',
        'web/bridge.js': 'py.globals.set("path", path);\npy.runPython("S = study.Session(path)");\n',
        'web/tiff_codecs.js': 'py.globals.set("js_lzw", lzw);\n',
        'web/python_files.js': '// Python itself: what loadPyodide( fetches before any package\n',
        'web/vendor/lib.js': 'py.runPython("1");\n',
        'web-tests/a_driver.mjs': 'py.runPython("1");\n',
        'studies/x/tests/b_driver.mjs': 'py.runPython("1");\n',
        'studies/x/lab/bench.mjs': 'const py = await loadPyodide({});\n',
    }) == []
