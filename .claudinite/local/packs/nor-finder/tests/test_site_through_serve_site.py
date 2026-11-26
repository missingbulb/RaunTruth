"""The site-through-serve-site check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'site-through-serve-site')


def test_a_test_serving_the_site_itself_is_found(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': 'const server = http.createServer((q, r) => r.end());\n',
        'web-tests/b_helper.mjs': 'const s = https.createServer(opts, answer);\n',
        'studies/x/tests/c_driver.mjs': 'import http from "node:http";\nhttp.createServer(serve).listen(0);\n',
    }) == ['studies/x/tests/c_driver.mjs:2', 'web-tests/a_driver.mjs:1', 'web-tests/b_helper.mjs:1']


def test_serve_site_the_server_itself_the_fakes_the_explorer_and_a_comment_are_not(tmp_path):
    assert findings(tmp_path, {
        'web-tests/a_driver.mjs': 'const { origin } = await serveSite({ "/web/worker.js": "" });\n// http.createServer( is serveSite\'s\n',
        'web-tests/site_server.mjs': 'const server = http.createServer((q, r) => {});\n',
        'web-tests/fakes/outside_server.mjs': 'const server = https.createServer(tls, answer);\n',
        'web-tests/explore/session.mjs': 'const server = http.createServer((req, res) => {});\n',
        'web/page.mjs': 'http.createServer();\n',
    }) == []
