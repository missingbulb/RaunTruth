"""The checks-through-checks-mjs check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'checks-through-checks-mjs')


def test_a_driver_saying_its_own_failure_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('const check = async (ok, what) => { if (!ok) { console.error("FAILED: " + what); await done(1); } };\n'
                                   "} catch (e) { failed = true; console.error('FAILED: ' + e.message); }\n"),
        'studies/x/tests/b_driver.mjs': 'const report = (ok, what) => console.log((ok ? "ok: " : `FAILED ${what}`));\n',
    }) == ['studies/x/tests/b_driver.mjs:1', 'web-tests/a_driver.mjs:1', 'web-tests/a_driver.mjs:2']


def test_the_shared_checks_a_browser_error_a_comment_and_page_code_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('import { check, mustHold } from "./checks.mjs";\n'
                                   'await expecting(/ERR_FAILED/, () => cut());\n'
                                   '// prints "FAILED: what" through check()\n'),
        'web-tests/checks.mjs': 'console.error("FAILED: " + what);\n',
        'web/page.js': 'console.error("FAILED: " + x);\n',
    }) == []
