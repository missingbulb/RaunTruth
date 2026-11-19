"""The hand-rolled-poll check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'hand-rolled-poll')


def test_a_deadline_a_test_keeps_for_itself_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('const end = Date.now() + 10000, t0 = Date.now();\n'
                                   'for (const end = Date.now() + 5000; inflight && Date.now() < end; ) await next;\n'
                                   'let deadline=Date.now()+ms;\n'),
        'studies/x/tests/b_driver.mjs': '  const end = Date.now() + 8000;\n',
    }) == ['studies/x/tests/b_driver.mjs:1'] + [f'web-tests/a_driver.mjs:{n}' for n in range(1, 4)]


def test_the_wait_helpers_a_token_expiry_a_marked_wait_a_comment_and_page_code_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/page_until.mjs': 'const end = Date.now() + timeout;\n',
        'web-tests/a_driver.mjs': ('const who = { token: "t", until: Date.now() + 3600e3 };\n'
                                   'const download = () => { const end = Date.now() + 8000; }; // waits on purpose: the rate the page measures\n'
                                   '// const end = Date.now() + 10000 is a deadline of its own\n'
                                   'const took = Date.now() - t0;\n'),
        'web/page.js': 'const end = Date.now() + 10000;\n',
    }) == []
