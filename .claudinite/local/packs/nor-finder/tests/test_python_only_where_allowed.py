"""The python-only-where-allowed check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'python-only-where-allowed')


def test_python_in_the_page_the_site_a_study_page_or_elsewhere_in_dev_is_found(tmp_path):
    assert findings(tmp_path, {
        'web/helper.py': 'x = 1\n',
        'site/make.py': 'x = 1\n',
        'studies/x/web/view.py': 'x = 1\n',
        'dev/requirements/gen.py': 'x = 1\n',
        'dev/build/site/x.py': 'x = 1\n',
        'top.py': 'x = 1\n',
    }) == ['dev/build/site/x.py', 'dev/requirements/gen.py', 'site/make.py', 'studies/x/web/view.py', 'top.py', 'web/helper.py']


def test_a_study_its_tests_and_research_the_page_tests_and_the_dev_tools_are_not(tmp_path):
    assert findings(tmp_path, {
        'studies/x/py/x.py': 'x = 1\n',
        'studies/x/tests/test_x.py': 'x = 1\n',
        'studies/x/lab/grade.py': 'x = 1\n',
        'web-tests/image_open.py': 'x = 1\n',
        'dev/tools/build/build.py': 'x = 1\n',
        'dev/tools/trick_pool/tricks.py': 'x = 1\n',
        'dev/tools/previews/make_previews.py': 'x = 1\n',
        'dev/tools/google_guide/make_images.py': 'x = 1\n',
        'web/shell.js': 'const py = "x.py";\n',
    }) == []
