"""req/shell/data/roles, req/shell/data/folders, req/shell/data/index, req/shell/data/tags, req/shell/data/hidden, req/shell/ground-truth/folders, req/shell/ground-truth/setup, req/shell/ground-truth/switch: a study's root and its settings
file (web/study_root.js, under Node by study_root_driver.mjs against an in-memory store). The store stands in for
Google's, so these cases cannot catch Drive refusing a write; the page test against the stand-in Drive does."""
import json
import os
import shutil
import subprocess

import pytest

pytestmark = pytest.mark.full
HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')


@pytest.fixture(scope='module')
def out():
    if not NODE:
        pytest.skip('node missing')
    r = subprocess.run([NODE, os.path.join(HERE, 'study_root_driver.mjs')], capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_a_root_with_only_its_data_is_not_set_up(out):
    # one listing of the root, and nothing downloaded
    assert out['bare'] == {'data': True, 'curated': None, 'submissions': None, 'set': False, 'calls': 1}


def test_set_up_with_review_makes_two_folders_shares_curated_and_writes_the_file(out):
    r = out['review']
    assert r['writes'] == [['folder', 'GT curated'], ['folder', 'GT submissions'], ['share', 'GT curated'], ['create', 'rauntruth-study.json']]
    assert r['doc'] == {'format': 'rauntruth-study/1', 'data': True, 'curated': True, 'submissions': True, 'review': True,
                        'set_by': 'dm@acme.example', 'set_at': '2026-11-07T10:00:00.000Z'}
    assert r['same'] is False and r['readBack'] is True


def test_set_up_again_makes_nothing_twice(out):
    assert out['rerun'] == {'folders': 0, 'writes': [['share', 'GT curated'], ['replace', 'rauntruth-study.json']]}


def test_set_up_without_review_makes_one_folder_for_both(out):
    f = out['free']
    assert f['writes'] == [['folder', 'GT'], ['share', 'GT'], ['create', 'rauntruth-study.json']]
    assert f['same'] is True and f['one'] is True


def test_folders_made_by_hand_are_found_by_name(out):
    # any case: the names a person would type
    assert out['byName'] == {'curated': True, 'submissions': True, 'same': False, 'set': False}


def test_the_settings_file_names_folders_by_id(out):
    assert out['byFile'] == {'curated': True, 'same': True}


def test_a_second_read_within_the_minute_lists_nothing(out):
    assert out['cache'] == {'cached': 1, 'fresh': 1}


def test_switching_to_one_folder_keeps_curated_and_records_the_mode_before(out):
    # the curated folder serves as both; GT submissions is left as it is and only the settings file is rewritten
    assert out['toOne'] == {'writes': [['replace', 'rauntruth-study.json']], 'same': True, 'curatedKept': True,
                            'set': {'by': 'dm@acme.example', 'review': False},
                            'was': {'review': True, 'curated': True, 'submissions': True},
                            'who': 'sm@acme.example', 'at': '2026-11-07T10:00:00.000Z'}


def test_switching_back_to_review_finds_the_old_submissions_folder_by_name(out):
    # never a second folder of a name
    assert out['toTwo'] == {'writes': [['replace', 'rauntruth-study.json']], 'same': False, 'curatedKept': True, 'submissionsBack': True}


def test_switching_one_folder_to_review_makes_only_gt_submissions(out):
    assert out['oneToTwo'] == {'writes': [['folder', 'GT submissions'], ['replace', 'rauntruth-study.json']],
                               'curatedKept': True, 'same': False, 'review': True}


def test_the_previews_folder_is_found_by_name_and_made_once(out):
    p = out['previews']
    assert p['none'] is None and p['made'] and p['found']
    assert p['folders'] == [['folder', 'Previews']]
    assert p['name'] == '1AbCdataFolderId.tiff'


def test_the_listed_folders_default_to_the_data_folder_and_are_written_keeping_every_other_key(out):
    assert out['folders'] == {'implicit': True, 'rootOnly': True, 'writes': [['replace', 'rauntruth-study.json']], 'listed': True,
                              'keysKept': True, 'afterSwitchAndSetup': True, 'made': {'format': 'rauntruth-study/1', 'folders': 1},
                              'refused': True, 'handWrites': 0}


def test_the_index_is_written_only_when_it_differs_and_never_over_one_made_by_hand(out):
    assert out['index'] == {'first': 'written', 'same': 'same', 'changed': 'written', 'format': 'rauntruth-index/1',
                            'by': 'dm@acme.example', 'at': '2026-11-07T10:00:00.000Z', 'images': 2,
                            'writes': [['create', 'rauntruth-index.json'], ['replace', 'rauntruth-index.json']],
                            'hand': 'not ours', 'handWrites': 0, 'none': None}


def test_the_tags_file_is_the_pages_own_and_the_study_file_keeps_grouping_and_hiding(out):
    assert out['tags'] == {'none': {'images': 0, 'folders': 0},
                           'writes': [['create', 'rauntruth-tags.json'], ['replace', 'rauntruth-tags.json']],
                           'back': {'images': 0, 'folder': ['dim'], 'format': 'rauntruth-tags/1'},
                           'refused': True, 'handWrites': 0,
                           'study': {'group': 'group', 'hide': ['damaged-slide'], 'folders': 1, 'readGroup': 'group', 'readHide': ['damaged-slide']}}
