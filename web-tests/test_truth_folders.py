"""req/shell/extractions/file, req/shell/extractions/save, req/shell/extractions/list, req/shell/extractions/outsiders, req/shell/data/folder (Needs GT):
the study's extractions folder (web/truth_folders.js, under Node by truth_folders_driver.mjs against an in-memory Drive). The
in-memory Drive stands in for Google's, so these cases cannot catch Drive refusing a write the page sends; the page tests against
the stand-in Drive do."""
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
    r = subprocess.run([NODE, os.path.join(HERE, 'truth_folders_driver.mjs')], capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_an_image_has_a_subfolder_and_a_person_or_a_run_a_file(out):
    # the image's stem with its SHA's first 8 hex; the person's email, lower-cased; a run's algorithm and version
    assert out['names'] == {'sub': 'slide3_s2__a1b2c3d4', 'file': 'x_jane@lab.org.json', 'run': 'run_count__1.2.3.json'}


def test_a_study_names_one_extractions_folder_never_a_guess(out):
    assert out['folder'] == {'named': 'EXTRACTIONS01', 'none': None, 'unset': None}


def test_saving_again_replaces_only_the_persons_own_file_and_keeps_the_old_version(out):
    s = out['save']
    assert s['subfolders'] == 1
    # no stamp on the subfolder, no second call: the file is all Save writes
    assert s['writes'] == [['folder', 'slide3_s2__a1b2c3d4'], ['create', 'x_jane@lab.org.json'],
                           ['replace', 'x_jane@lab.org.json', True], ['create', 'x_bob@lab.org.json']]
    assert s['files'] == [['x_jane@lab.org.json', 'jane@lab.org', None], ['x_bob@lab.org.json', 'bob@lab.org', None]]
    assert s['janeBody'] == 2


def test_a_listing_passes_over_what_is_no_extraction_and_reads_a_runs_name(out):
    listing = out['listing']
    assert listing['names'] == ['x_new@x.org.json', 'run_find_nodes__0.11121.154+ab12.json']
    assert listing['run'] == {'algorithm': 'find_nodes', 'version': '0.11121.154+ab12'} and listing['by'] == 'new@x.org'
    assert listing['other'] == []


def test_a_persons_own_extraction_is_found_from_two_listings_and_nothing_is_read(out):
    o = out['own']
    # another person's file is not theirs; an image with no subfolder has none
    assert o['nobody'] is None
    assert o['mine'] == {'name': 'x_jane@lab.org.json', 'hasId': True, 'hasTime': True}
    # the extractions folder, then the image's subfolder
    assert o['listed'] == ['EXT', o['subId']]
    assert o['reads'] == []


def test_the_list_is_mine_then_marked_then_others_and_a_member_sees_who_made_each(out):
    assert out['list']['member'] == [['Yours', 'mine', []], ['yael@lab.org · GT', 'marked', ['gt']], ['count 1.2 · official', 'marked', ['official']],
                                     ['dan@lab.org', 'other', []], ['count 1.3', 'other', []]]
    assert out['list']['mineMarked'] == [['Yours · GT', 'mine', ['gt']]]


def test_someone_who_is_not_a_member_is_listed_only_the_marked_with_no_persons_name(out):
    marked = [['by hand · GT', 'marked', ['gt']], ['count 1.2 · official', 'marked', ['official']]]
    assert out['list']['outsider'] == marked and out['list']['signedInNonMember'] == marked
    assert '@' not in out['list']['outsiderNames'] and 'lab.org' not in out['list']['outsiderNames']
    # a mark that names no file the image holds lists nothing
    assert out['list']['staleMark'] == []
    assert out['list']['marksOf'] == [{'gt': {'file': 'B'}}, {}, {}]


def test_needing_ground_truth_is_a_marker_in_the_extractions_folder_named_as_the_images_subfolder(out):
    n = out['needed']
    assert n['name'] == 'a__11111111.needs_gt'
    assert n['writes'] == [['create', 'a__11111111.needs_gt'], ['create', 'b__22222222.needs_gt'], ['create', 'dup__33333333.needs_gt']]
    # nothing written anywhere but the extractions folder, read from the one listing of it
    assert n['parents'] == ['EXT']
    assert n['listed'] == ['EXT']
    assert n['a'] == {'needed': n['aId']} and n['aId']
    # its subfolder is there: still held, the marker still named
    assert n['b'] == {'held': True, 'needed': n['bId']}
    # two images of one name: only the one marked
    assert n['d1'] == {'needed': n['d1Id']} and n['d2'] is None
