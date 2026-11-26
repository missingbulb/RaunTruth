"""shell/study/one-file, req/shell/data/roles, req/shell/data/folders, req/shell/data/index, req/shell/data/tags, req/shell/data/hidden, req/shell/ground-truth/folders, req/shell/ground-truth/setup: a study's root and its settings
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
    assert out['bare'] == {'data': True, 'extractions': None, 'set': False, 'calls': 1}


def test_set_up_makes_the_one_extractions_folder_shares_it_by_link_and_writes_the_file(out):
    r = out['setup']
    assert r['writes'] == [['folder', 'Analysis'], ['share', 'Analysis'], ['create', 'rauntruth-study.json']]
    assert r['doc'] == {'format': 'rauntruth-study/2', 'data': True, 'extractions': True,
                        'set_by': 'dm@acme.example', 'set_at': '2026-11-07T10:00:00.000Z'}
    assert r['readBack'] is True


def test_set_up_again_makes_nothing_twice(out):
    assert out['rerun'] == {'folders': 0, 'writes': [['share', 'Analysis'], ['replace', 'rauntruth-study.json']]}


def test_a_folder_made_by_hand_is_found_by_name_and_the_old_ground_truth_folders_are_not_read(out):
    # any case: the names a person would type
    assert out['byName'] == {'extractions': True, 'set': False, 'old': False, 'named': 'EXTRACTIONS'}


def test_the_folder_is_found_as_analysis_before_its_name_of_before(out):
    """req/shell/ground-truth/setup: a root holding both is read by today's name, and the name the store has is told."""
    assert out['byNewName'] == {'extractions': True, 'named': 'Analysis'}


def test_the_study_file_names_the_folder_by_id(out):
    assert out['byFile'] == {'extractions': True, 'set': True}


def test_a_second_read_within_the_minute_lists_nothing(out):
    assert out['cache'] == {'cached': 1, 'fresh': 1}


def test_the_previews_folder_is_found_by_name_and_made_once(out):
    p = out['previews']
    assert p['none'] is None and p['made'] and p['found']
    assert p['folders'] == [['folder', 'Previews']]
    assert p['name'] == '1AbCdataFolderId.tiff'


def test_the_listed_folders_default_to_the_data_folder_and_are_written_keeping_every_other_key(out):
    assert out['folders'] == {'implicit': True, 'rootOnly': True, 'writes': [['replace', 'rauntruth-study.json']], 'listed': True,
                              'keysKept': True, 'afterSetup': True, 'made': {'format': 'rauntruth-study/2', 'folders': 1},
                              'refused': True, 'handWrites': 0}


def test_the_index_is_written_into_the_study_file_only_when_it_differs_and_never_over_one_made_by_hand(out):
    assert out['index'] == {'first': 'written', 'same': 'same', 'changed': 'written', 'format': 'rauntruth-study/2',
                            'by': 'dm@acme.example', 'at': '2026-11-07T10:00:00.000Z', 'images': 2, 'files': ['rauntruth-study.json'],
                            'writes': [['create', 'rauntruth-study.json'], ['replace', 'rauntruth-study.json']],
                            'hand': 'not ours', 'handWrites': 0, 'none': None}


def test_the_tags_and_the_index_go_into_the_study_file_in_one_write_and_the_study_file_keeps_grouping_and_hiding(out):
    assert out['tags'] == {'none': {'images': 0, 'folders': 0}, 'both': 'written', 'oneWrite': [['replace', 'rauntruth-study.json']],
                           'back': {'images': 0, 'folder': ['dim']}, 'indexImages': 1, 'files': ['rauntruth-study.json'],
                           'refused': True, 'handWrites': 0,
                           'study': {'group': 'group', 'hide': ['damaged-slide'], 'folders': 1, 'readGroup': 'group', 'readHide': ['damaged-slide']}}


def test_a_root_holding_only_the_study_file_gives_its_folders_index_tags_marks_and_stage_from_one_download(out):
    assert out['oneFile'] == {'stage': 'Review', 'folders': 1, 'index': 1, 'group': 'group', 'hide': ['x'], 'tags': ['group:sick'], 'marks': 'E1', 'calls': 1}


def test_a_root_still_holding_the_three_files_of_before_is_read_and_written_back_as_one_file_trashing_the_old_two_only_where_the_page_made_them(out):
    m = out['migration']
    assert m['before'] == {'index': 1, 'tags': ['I1'], 'old': True}
    assert m['writes'] == [['replace', 'rauntruth-study.json'], ['trash', 'rauntruth-index.json'], ['trash', 'rauntruth-tags.json']]
    assert m['one'] == {'format': 'rauntruth-study/2', 'index': 1, 'tags': ['I1'], 'stage': 'Develop', 'group': 'group'}
    assert m['after'] == {'old': {'index': None, 'tags': None}, 'index': 1, 'tags': ['I1']}
    assert m['hand'] == {'trashes': 0, 'files': ['Data', 'rauntruth-index.json', 'rauntruth-study.json', 'rauntruth-tags.json']}
