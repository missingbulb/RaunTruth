"""The world-set-up check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'world-set-up')


def test_set_up_reaching_into_a_fake_or_writing_the_device_by_hand_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('siteSettings(ctx).env = { GOOGLE_API_KEY: "k" };\n'
                                   'google.settings.push(file);\n'
                                   'drive.files.push({ id: "x" });\n'
                                   'drive.writers.set(id, new Set([EMAIL]));\n'
                                   'google.account = { email };\n'
                                   'drive.folder({ id: ROOT, name: "Cache", access: "public" });\n'
                                   'googleOf(browser).drive.file({ id: X, name: "a.tif", bytes });\n'),
        'studies/x/tests/b_driver.mjs': ('await ctx.addInitScript(() => { delete Navigator.prototype.serviceWorker; });\n'
                                         'localStorage.setItem("nor-google-sign-in", JSON.stringify(record));\n'
                                         'localStorage.setItem("nor-welcome", JSON.stringify({ choice: "google" }));\n'),
    }) == ['studies/x/tests/b_driver.mjs:1', 'studies/x/tests/b_driver.mjs:2', 'studies/x/tests/b_driver.mjs:3',
           'web-tests/a_driver.mjs:1', 'web-tests/a_driver.mjs:2', 'web-tests/a_driver.mjs:3', 'web-tests/a_driver.mjs:4',
           'web-tests/a_driver.mjs:5', 'web-tests/a_driver.mjs:6', 'web-tests/a_driver.mjs:7']


def test_the_world_the_fakes_a_comment_and_page_code_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': ('w.site.withGoogle();\n'
                                   'const ada = w.user("ada@acme.example").savedSettings({});\n'
                                   'w.folder("Cache").public().holds(image.png("a.png"));\n'
                                   '// drive.files.push would reach into the fake\n'),
        'web-tests/world.mjs': 'if (!worker) delete Navigator.prototype.serviceWorker;\nlocalStorage.setItem("nor-welcome", x);\n',
        'web-tests/fakes/google_drive.mjs': 'drive.files.push(f);\ndrive.writers.set(id, s);\n',
        'web-tests/fake_drive_driver.mjs': 'drive.folder({ id: ROOT, name: "Members root" });\n',
        'web/page.js': 'localStorage.setItem("nor-welcome", x);\n',
    }) == []
