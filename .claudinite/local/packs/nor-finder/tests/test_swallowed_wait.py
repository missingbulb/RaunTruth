"""The swallowed-wait check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'swallowed-wait')


def test_a_wait_whose_miss_is_swallowed_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('await page.waitForFunction(() => x, null, { timeout: 5000 }).catch(() => {});\n'
                                   'await b.page.waitForSelector("#d[open]", { timeout: 3000 }).catch(() => {});\n'
                                   'const c = page.waitForEvent("filechooser", { timeout: 3000 }).catch(() => null);\n'
                                   'const ok = await until(page, () => y).then(() => true, () => false);\n'
                                   'await page.waitForResponse((r) => r.ok()).catch( () => undefined );\n'),
        'studies/x/tests/b_driver.mjs': ('await p2.waitForFunction(() => z).then(() => frames(p2)).catch(() => {});\n'
                                         'await page.waitForFunction((w) => {\n  return w;\n}, open).catch(() => {});\n'
                                         'await page.waitForFunction(() => a\n  && b, null, { timeout: 9 }).catch(() => {});\n'
                                         'await page.waitForFunction(() => a,\n  null, { timeout: 9 }).catch(() => {});\n'),
    }) == ['studies/x/tests/b_driver.mjs:1', 'studies/x/tests/b_driver.mjs:4', 'studies/x/tests/b_driver.mjs:6', 'studies/x/tests/b_driver.mjs:8'] + [f'web-tests/a_driver.mjs:{n}' for n in range(1, 6)]


def test_a_wait_through_or_missed_one_that_fails_loudly_a_comment_and_page_code_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('await orMissed(page.waitForFunction(() => x, null, { timeout: 5000 }));\n'
                                   'await page.waitForFunction(() => x).catch((e) => fail(e));\n'
                                   'await fetch(u).catch(() => {});\n'
                                   '// page.waitForFunction(() => x).catch(() => {}) swallows the miss\n'),
        'web/page.js': 'await page.waitForFunction(() => x).catch(() => {});\n',
    }) == []
