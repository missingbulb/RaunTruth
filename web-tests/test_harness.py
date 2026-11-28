"""req/checks/clean-console: the harness every page test's browser comes from fails a run on a warning or error no
case declared, and answers the outside systems with their fakes (harness_driver.mjs, one case a run)."""
import json
import os
import sys

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'dev', 'tools', 'build'))
import drivers
from drivers import run_driver


def run(case):
    r = run_driver(os.path.join(HERE, 'harness_driver.mjs'), case, timeout=60, check=False)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    return r


def test_an_undeclared_warning_fails_the_run_and_is_named():
    r = run('undeclared')
    assert r.returncode == 1 and 'went wrong' in r.stderr, r.stdout + r.stderr


def test_a_failed_check_fails_the_run_whatever_exit_code_the_test_sets():
    r = run('failedcheck')
    assert r.returncode == 1 and 'ok: a check that held' in r.stdout and 'FAILED: a check that did not: {"seen":1}' in r.stderr, r.stdout + r.stderr


def test_a_check_the_rest_needs_ends_the_run_where_it_fails():
    r = run('musthold')
    assert r.returncode == 1 and 'FAILED: a check the rest needs: {"seen":2}' in r.stderr and 'a check after it' not in r.stdout, r.stdout + r.stderr


def test_a_failed_check_fails_a_run_of_plain_code_too():
    code = f'import {{ check }} from {json.dumps("file://" + os.path.join(HERE, "checks.mjs"))}; check(false, "plain"); process.exitCode = 0;'
    r = run_driver(None, node_args=['--input-type=module', '-e', code], timeout=30, check=False)
    assert r.returncode == 1 and 'FAILED: plain' in r.stderr, r.stdout + r.stderr


def test_a_machine_without_node_skips_the_test(monkeypatch):
    monkeypatch.setattr(drivers, 'NODE', None)
    with pytest.raises(pytest.skip.Exception):
        drivers.run_driver(os.path.join(HERE, 'harness_driver.mjs'), 'declared')


def test_a_declared_warning_of_work_the_case_left_under_way_is_expected_too():
    r = run('outlives')
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_run_stopped_at_its_bound_says_how_far_it_got_and_what_the_page_did():
    with pytest.raises(pytest.fail.Exception) as stopped:
        run_driver(os.path.join(HERE, 'harness_driver.mjs'), 'hangs', timeout=15)
    said = str(stopped.value)
    assert 'still running after 15 s' in said and 'ok: a step before the hang' in said, said
    assert 'a step the page took' in said.partition('before the run ended')[2], said


def test_the_network_goes_only_once_the_page_has_ended_its_work():
    r = run('offlineafterwork')
    assert r.returncode == 0 and 'the page had 0 under way' in r.stdout, r.stdout + r.stderr


def test_a_fake_changed_under_the_page_s_work_fails_the_run_and_at_rest_does_not():
    r = run('changedmidwork')
    assert r.returncode == 1 and '(a save on its way)' in r.stderr, r.stdout + r.stderr
    r = run('changedatrest')
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_page_idle_with_an_outside_call_it_does_not_count_fails_naming_the_call():
    r = run('uncounted')
    assert r.returncode == 1 and 'GET https://www.googleapis.com/drive/v3/files?q=slow' in r.stderr, r.stdout + r.stderr
    r = run('countedcall')
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_declared_warning_passes():
    r = run('declared')
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_warning_says_the_values_the_page_gave_it():
    """An Error and an object the page hands the console read as their name, message and fields on every engine."""
    r = run('values')
    assert r.returncode == 1 and 'RangeError: too far' in r.stderr and '{"left":3}' in r.stderr, r.stdout + r.stderr


def test_a_refused_and_a_failed_load_are_declared_in_the_same_words_on_every_engine():
    r = run('refused')
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_failed_run_says_what_the_page_did_before_it():
    r = run('lately')
    said = r.stderr.partition('before the run ended')[2]
    assert r.returncode == 1 and 'a step the page took' in said and 'answered 404' in said, r.stdout + r.stderr


def test_a_declaration_nothing_answers_fails():
    r = run('unanswered')
    assert r.returncode != 0 and 'none came' in r.stderr, r.stdout + r.stderr


def test_an_uncaught_page_error_fails_the_run():
    r = run('uncaught')
    assert r.returncode == 1 and 'thrown by the page' in r.stderr, r.stdout + r.stderr


def test_a_request_leaving_the_machine_is_turned_away_and_seen():
    r = run('offsite')
    assert 'turned away' in r.stdout and r.returncode == 1, r.stdout + r.stderr


def test_a_request_leaving_the_machine_from_a_worker_is_seen_too():
    r = run('offsiteworker')
    assert 'turned away' in r.stdout and r.returncode == 1 and 'left this machine' in r.stdout, r.stdout + r.stderr


def test_a_wait_in_the_page_gives_what_it_waited_for():
    r = run('untilgives')
    assert r.returncode == 0 and 'gave {"n":42}' in r.stdout, r.stdout + r.stderr


def test_a_wait_that_never_holds_says_what_its_function_threw():
    r = run('untilthrows')
    # past the function's own source, the engine's error: each says what was undefined
    said = r.stdout.partition('window.missing.field')[2]
    assert 'timed out after 300 ms' in r.stdout and 'undefined' in said, r.stdout + r.stderr


def test_the_deploys_variables_write_config_js_as_the_release_does():
    r = run('settings')
    assert r.returncode == 0 and 'unset: <!doctype html>' in r.stdout and '"apiKey": "the-key", "clientId": "the-client"' in r.stdout, r.stdout + r.stderr


def test_a_studys_edits_change_it_alone():
    r = run('studies')
    assert r.returncode == 0 and 'study: {"id":"served","stage":"PreGT"} other: {"id": "served"}' in r.stdout, r.stdout + r.stderr


def test_a_tests_own_route_answering_a_fakes_address_fails_the_run():
    r = run('ownroute')
    assert r.returncode == 1 and 'a test answered what a fake answers' in r.stdout, r.stdout + r.stderr


def test_jsdelivr_answers_from_the_installed_libraries():
    r = run('cdn')
    assert r.returncode == 0 and 'served 1.19.8' in r.stdout, r.stdout + r.stderr


def test_a_setup_reading_storage_runs_on_the_site_alone():
    r = run('setup')
    assert r.returncode == 0 and 'seeded yes' in r.stdout, r.stdout + r.stderr


def test_drive_answers_by_access_and_credentials():
    r = run('drive')
    assert r.returncode == 0, r.stdout + r.stderr
    seen = json.loads(r.stdout.split('drive ', 1)[1])
    assert seen == {'listed': ['a.png+sha'], 'piece': 'png', 'closedByKey': 404, 'closedByToken': 200, 'stranger': 401, 'nothing': 403}, seen


def test_sign_in_grants_a_token_that_reads_the_account_and_the_app_folder():
    r = run('signin')
    assert r.returncode == 0, r.stdout + r.stderr
    assert json.loads(r.stdout.split('signin ', 1)[1]) == {'email': 'ada@acme.example', 'kept': '{"theme":"dark"}', 'asked': 1, 'loads': 1}, r.stdout


def test_offline_the_fakes_answer_nothing():
    r = run('offline')
    assert 'unreachable' in r.stdout and 'INTERNET_DISCONNECTED' in r.stderr, r.stdout + r.stderr


def test_a_wait_on_what_is_heard_hears_what_comes_while_it_looks():
    # the one event there will be comes while the wait reads its condition: a wake asked for after reading would never come
    code = f'''import {{ untilHeard }} from {json.dumps("file://" + os.path.join(HERE, "page_until.mjs"))};
let n = 0, ring, next = new Promise((ok) => {{ ring = ok; }});
const happen = () => {{ n++; ring(); next = new Promise((ok) => {{ ring = ok; }}); }};
let first = true;
const t0 = Date.now();
const got = await untilHeard(async () => {{ const seen = n; if (first) {{ first = false; await Promise.resolve(); happen(); }} return seen > 0; }}, () => next, {{ timeout: 3000 }});
console.log(JSON.stringify({{ got, ms: Date.now() - t0 }}));'''
    r = run_driver(None, node_args=['--input-type=module', '-e', code], timeout=30)
    said = json.loads(r.stdout.strip().splitlines()[-1])
    assert said['got'] and said['ms'] < 1000, said
