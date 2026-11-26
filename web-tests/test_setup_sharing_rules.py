"""setup/sharing-check, setup/people: the rules of Study Setup's sharing check (web/setup_sharing.js), under Node by
setup_sharing_rules_driver.mjs: what each of the five stages needs of the sharing, one case a rule, and what People holds."""
import json
import os
import shutil

import pytest

pytestmark = pytest.mark.full
HERE = os.path.dirname(os.path.abspath(__file__))
from drivers import run_driver
NODE = shutil.which('node')


@pytest.fixture(scope='module')
def out():
    if not NODE:
        pytest.skip('node missing')
    r = run_driver(os.path.join(HERE, 'setup_sharing_rules_driver.mjs'), timeout=60, check=False)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_before_review_the_root_is_for_named_people_and_from_review_on_it_is_by_link(out):
    assert list(out['stages']) == ['Setup', 'Develop', 'Analyze', 'Review', 'Public']
    for stage, c in out['stages'].items():
        early = stage in ('Setup', 'Develop', 'Analyze')
        assert c['rootByLink'] == ([['root', 'unshare']] if early else []), stage
        assert c['rootNamed'] == ([] if early else [['root', 'share']]), stage


def test_every_stage_wants_the_data_previews_and_study_file_readable_by_link(out):
    assert out['itemsNotByLink'] == [['previews', 'share'], ['file', 'share']]


def test_someone_may_write_the_extractions_folder_only_while_the_stage_lets_people_annotate(out):
    assert out['noWriter'] == {'Setup': [['extractions', 'ask']], 'Develop': [['extractions', 'ask']], 'Analyze': [['extractions', 'ask']],
                               'Review': [], 'Public': []}
    assert out['ownerIsWriter'] == []


def test_an_anyone_with_the_link_edit_permission_is_wrong_sharing_to_correct_and_not_a_writer(out):
    assert out['linkEditIsWrong'] == [['extractions', 'unshare']]
    assert out['linkEditNamesItsPermission'] == 'anyoneWithLink'
    assert out['linkEditOnlyIsNoWriter'] == [['extractions', 'unshare'], ['extractions', 'ask']]
    assert out['linkEditElsewhere'] == [['root', 'unshare'], ['data', 'unshare']]


def test_a_sharing_the_account_cannot_read_is_a_correction_with_nothing_to_fix_and_an_absent_item_is_skipped(out):
    assert out['unreadable'] == [['previews', 'ask']]
    assert out['missingItemsSkipped'] == 0


def test_a_link_to_remove_names_its_permission(out):
    assert out['permissionToRemove'] == 'anyoneWithLink'


def test_the_stage_is_the_study_files_when_it_is_one_of_the_five_and_else_develop(out):
    assert out['stageOf'] == {'fileFive': 'Analyze', 'todayGT': 'Develop', 'todayNull': 'Develop', 'todayOther': 'Develop'}


def test_people_hold_the_three_shares_by_what_drive_lists(out):
    held = {p['email']: p['holds'] for p in out['people']['members']}
    assert held == {'m@example.com': ['sees', 'manages'], 'v@example.com': ['sees', 'analyses'], 'o@example.com': ['analyses']}
    assert out['people']['link'] is True


def test_each_correction_links_where_the_store_changes_its_items_sharing(out):
    assert out['links'] == ['root:r', 'file:f']
