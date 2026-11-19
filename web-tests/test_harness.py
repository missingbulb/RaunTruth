"""req/checks/clean-console: the harness every page test's browser comes from fails a run on a warning or error no
case declared, and answers the outside systems with their fakes (harness_driver.mjs, one case a run)."""
import json
import os
import shutil
import subprocess

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


def run(case):
    if not NODE:
        pytest.skip('node missing')
    r = subprocess.run([NODE, os.path.join(HERE, 'harness_driver.mjs'), case], capture_output=True, text=True, timeout=60)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    return r


def test_an_undeclared_warning_fails_the_run_and_is_named():
    r = run('undeclared')
    assert r.returncode == 1 and 'went wrong' in r.stderr, r.stdout + r.stderr


def test_a_failed_check_fails_the_run_whatever_exit_code_the_test_sets():
    r = run('failedcheck')
    assert r.returncode == 1 and 'ok: a check that held' in r.stdout and 'FAILED: a check that did not: {"seen":1}' in r.stderr, r.stdout + r.stderr


def test_a_declared_warning_passes():
    r = run('declared')
    assert r.returncode == 0, r.stdout + r.stderr


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
