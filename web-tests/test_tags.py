"""req/shell/data/tags, req/shell/data/hidden, req/shell/load/study-images: the study's tag rules (web/tags.js), under
Node by tags_driver.mjs: what a tag may be, a multi-value tag's one value, a folder's tags on its images, hiding, and
the groups Load study images draws."""
import json
import os

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
from drivers import run_driver


@pytest.fixture(scope='module')
def out():
    r = run_driver(os.path.join(HERE, 'tags_driver.mjs'), timeout=60, check=False)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_a_tag_is_lower_case_hyphenated_words_and_folder_is_the_pages_own(out):
    tags = [p.get('tag') for p in out['parsed']]
    assert tags == ['damaged-slide', 'group:wild-type', 'group:sick', None, None, None, None, None, None, None]
    assert all(p.get('error') for p in out['parsed'][3:])


def test_a_multi_value_tag_holds_one_value_and_a_tag_is_held_once(out):
    assert out['added'] == [['dim', 'group:wild-type'], ['dim'], ['bright']]


def test_an_images_own_value_wins_over_its_folders_and_a_nearer_folders_over_a_farther(out):
    assert out['effective'] == ['far', 'group:sick', 'mine', 'near']
    assert out['inheritedOnly'] == ['group:wild-type']


def test_a_rule_naming_a_multi_value_tag_alone_hides_every_value_of_it(out):
    assert out['hidden'] == [True, False, True, False, False]


def test_groups_follow_the_folders_or_the_values_with_the_untagged_last(out):
    assert out['byFolder'] == [['Data', ['1', '4']], ['Data / sub', ['2']], ['Elsewhere', ['3']]]
    assert out['byTag'] == [['group: sick', ['2', '4']], ['group: wild-type', ['1']], ['No group', ['3']]]
    assert out['names'] == ['group']
