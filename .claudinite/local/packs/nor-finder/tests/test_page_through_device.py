"""The page-through-device check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'page-through-device')


def test_a_driver_sending_a_page_to_an_address_itself_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('await page.goto(origin + "/web/fixture");\n'
                                   'await b.page.goto(at);\n'
                                   'const open = async () => { await h2.goto(`${origin}/web/`); };\n'),
        'studies/x/tests/b_driver.mjs': "await first.goto( 'http://127.0.0.1/app/');\n",
    }) == ['studies/x/tests/b_driver.mjs:1'] + [f'web-tests/a_driver.mjs:{n}' for n in range(1, 4)]


def test_the_device_the_truth_log_the_world_the_explorer_and_a_comment_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('const page = await device.opens("nor");\n'
                                   'await device.visits("/app/fixture", { in: page });\n'
                                   'log.goto(n); opened.goto(0); log.goto(99);\n'
                                   '// page.goto(origin) skips the device\n'),
        'web-tests/world.mjs': 'await page.goto(origin + address);\n',
        'web-tests/explore/world.mjs': 'run: () => page.goto(s.origin + "/web/"),\n',
    }) == []
