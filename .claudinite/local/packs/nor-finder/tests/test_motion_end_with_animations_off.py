"""The motion-end-with-animations-off check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'motion-end-with-animations-off')


def test_code_waiting_on_a_motions_end_is_found_in_the_shell_and_a_study(tmp_path):
    assert findings(tmp_path, {
        'web/shell.js': ('pop.addEventListener("transitionend", close);\n'
                         'item.onanimationend = () => item.classList.remove("spike");\n'),
        'studies/x/web/view.js': 'el.addEventListener("animationcancel", done);\n',
    }) == ['studies/x/web/view.js:1', 'web/shell.js:1', 'web/shell.js:2']


def test_a_motion_saying_how_it_ends_a_comment_and_tests_are_not(tmp_path):
    assert findings(tmp_path, {
        'web/shell.js': ('pop.addEventListener("transitionend", close); // ends with animations off: kept in style.css\n'
                         '// transitionend never fires with animations off\n'),
        'web-tests/a_driver.mjs': 'el.addEventListener("transitionend", ok);\n',
    }) == []
