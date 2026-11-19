"""The deadline-literal check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'deadline-literal')


def test_a_deadline_written_as_a_number_is_found_in_a_driver_and_a_pytest(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('page.setDefaultTimeout(10000);\n'
                                   'await page.waitForFunction(() => x, null, { timeout: 5000 });\n'
                                   'await page.waitForFunction(() => x, null, { timeout: 4 * LATE + 2000 });\n'),
        'studies/x/tests/test_b.py': "r = subprocess.run([NODE, 'b_driver.mjs'], capture_output=True, text=True, timeout=120)\n",
    }) == ['studies/x/tests/test_b.py:1', 'web-tests/a_driver.mjs:1', 'web-tests/a_driver.mjs:2', 'web-tests/a_driver.mjs:3']


def test_a_named_deadline_the_deadlines_module_a_comment_and_page_code_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/deadlines.mjs': 'export const STEP = 10000;\n',
        'web-tests/a_driver.mjs': ('page.setDefaultTimeout(STEP);\n'
                                   'await page.waitForFunction(() => x, null, { timeout: Math.max(1, end - Date.now()) });\n'
                                   '// { timeout: 5000 } would guess\n'),
        'studies/x/tests/test_b.py': "run('b_driver.mjs', timeout=DRIVER)\n",
        'web/page.js': 'fetch(u, { timeout: 5000 });\n',
    }) == []
