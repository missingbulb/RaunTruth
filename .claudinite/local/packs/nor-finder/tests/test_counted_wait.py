"""The counted-wait check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'counted-wait')


def test_a_loop_of_frames_or_draws_waiting_for_a_condition_and_a_wait_for_nothing_are_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('for (let k = 0; k < 50 && writes.length === n; k++) await frames(page);\n'
                                   'for (let i = 0; i < 20 && !seen(); i++) { await viewDrawn(page); }\n'
                                   'await page.waitForFunction(() => true);\n'),
        'studies/x/tests/b_driver.mjs': 'for (let k = 0; k<10&&!done; k++) await frames(p, 1);\n',
    }) == ['studies/x/tests/b_driver.mjs:1', 'web-tests/a_driver.mjs:1', 'web-tests/a_driver.mjs:2', 'web-tests/a_driver.mjs:3']


def test_a_wait_for_the_end_a_loop_of_actions_a_comment_and_page_code_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('await idle(page);\n'
                                   'for (let y = 0; y <= height; y += 250) { await page.evaluate((t) => scroll(t), y); await frames(page, 1); }\n'
                                   'for (let k = 0; k < 120 && await page.evaluate(() => st.task === "missed"); k++) await page.click("#ok");\n'
                                   '// for (let k = 0; k < 50 && !x; k++) await frames(page) counts frames\n'
                                   'await page.waitForFunction(() => true === window.ready);\n'),
        'web/page.js': 'for (let k = 0; k < 5 && !x; k++) await frames(page);\n',
    }) == []
