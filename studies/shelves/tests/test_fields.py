"""req/shelves/read/fields: a spine's text read into title, author, publisher, volume and library mark
(algorithm/fields.py), on blocks of text drawn here as the reader hands them over: each line's text and where it lies
on the book's crop turned to read across."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'algorithm'))
import fields as F

# a spine 100 px wide and 700 long, turned a quarter clockwise to read across: 700 wide, 100 tall, its head at the right
SIZE, TURN = (700, 100), 1


def line(text, x0, x1, y0=30, y1=70):
    return dict(text=text, box=(x0, y0, x1, y1), size=SIZE, turn=TURN)


def label(*blocks, library_seen=False):
    return F.label(list(blocks), library_seen=library_seen)[0]


def test_a_slash_parts_the_author_before_it_from_the_title_after_it():
    assert label(line('פרנק הרברט / חולית', 100, 600)) == dict(author='פרנק הרברט', title='חולית')
    assert label(line('ג׳ו הולדמן \\ שלום לנצח', 100, 600)) == dict(author='ג׳ו הולדמן', title='שלום לנצח')


def test_a_bar_or_a_dot_parts_blocks_and_an_initial_tells_the_author():
    assert label(line('שדה קרב ארץ | ל. רון האברד', 100, 600)) == dict(title='שדה קרב ארץ', author='ל. רון האברד')
    assert label(line('אן ס. קריספין 0 וי 0 חלק א׳', 100, 600)) == dict(author='אן ס. קריספין', title='וי', volume='חלק א׳')


def test_text_with_no_cue_for_the_author_stays_in_the_title():
    """a wrong guess costs both fields their slip; the title holding both costs the author's alone"""
    assert label(line('רוברט סילברברג | האיש במבוך', 100, 600)) == dict(title='רוברט סילברברג האיש במבוך')
    assert label(line('הנוסע השמיני אלן דין פוסטר', 100, 600)) == dict(title='הנוסע השמיני אלן דין פוסטר')


def test_a_publisher_is_known_by_name_even_with_no_separator():
    assert label(line('הבושם פטריק זיסקינד מודן', 100, 600)) == dict(title='הבושם פטריק זיסקינד', publisher='מודן')
    assert label(line('רוברט סילברברג | האיש במבוך | מועדון קוראי מעריב', 50, 650))['publisher'] == 'מועדון קוראי מעריב'
    assert label(line('מייקל קרייטון זרע אנדרומדה', 200, 680), line('ספריית מעריב', 20, 150))['publisher'] == 'ספריית מעריב'


def test_a_volume_is_known_by_its_pattern_as_printed():
    for v in ('IV', 'Vol 1', 'כרך ג', 'חלק ב׳', '4', 'ג׳'):
        got = label(line('הנסיכים', 300, 650), line(v, 120, 200))
        assert got == dict(title='הנסיכים', volume=v), v
    assert label(line('1984', 300, 650)) == dict(title='1984'), 'a title alone is never a volume'


def test_a_library_mark_is_a_call_number_at_the_spines_head_or_foot():
    assert label(line('חולית', 200, 600), line('892.4 טול', 5, 80)) == dict(title='חולית', library='892.4 טול')
    # the same text in the middle of the spine is part of the title
    assert 'library' not in label(line('חולית', 450, 650), line('892', 300, 380), line('הרברט', 20, 200))


def test_once_one_spine_carries_a_mark_a_looser_one_is_taken_at_the_ends():
    loose = [line('חולית', 200, 600), line('8l3.5 ק', 5, 80)]
    assert 'library' not in label(*loose)
    assert label(*loose, library_seen=True)['library'] == '8l3.5 ק'
    assert F.photo([[line('חולית', 200, 600), line('813.5 ה', 5, 80)], loose])[1][0]['library'] == '8l3.5 ק'


def test_larger_letters_are_the_title_and_smaller_ones_beside_them_the_author():
    big, small = line('חולית', 300, 650, 20, 80), line('פרנק הרברט', 60, 260, 40, 60)
    assert label(big, small) == dict(title='חולית', author='פרנק הרברט')
    alike = line('פרנק הרברט', 60, 260, 22, 78)
    assert label(big, alike) == dict(title='חולית פרנק הרברט'), 'joined from the head, along the spine'


def test_each_field_keeps_where_it_was_read_as_shares_of_the_book_at_its_first_turn():
    got, regions = F.label([line('פרנק הרברט / חולית', 100, 600)])
    assert set(regions) == {'author', 'title'}
    # the crop turned a quarter clockwise: its x runs from the spine's foot (0) to its head (700), its y across
    (ax0, ay0, ax1, ay1), (tx0, ty0, tx1, ty1) = regions['author'], regions['title']
    assert 0 <= ax0 < ax1 <= 1 and 0 <= ty0 < ty1 <= 1
    # Hebrew reads right to left: the author, first in the text, stands nearer the head, the top of the book
    assert ay1 <= ty0 + 1e-9
    assert ax0 == pytest.approx(0.3) and ax1 == pytest.approx(0.7)


def test_text_with_no_place_is_labelled_on_its_text_alone():
    got, regions = F.label([dict(text='פרנק הרברט / חולית | מודן', box=None, size=None, turn=None)])
    assert got == dict(author='פרנק הרברט', title='חולית', publisher='מודן') and regions == {}


def test_nothing_read_is_no_field():
    assert F.label([]) == ({}, {}) and F.label([line('  ', 1, 9)]) == ({}, {})


def test_a_word_that_starts_like_a_volume_is_no_volume_and_a_dash_parts_blocks():
    assert label(line('מבחן קבלה נאוה מקמל-עתיר ידיעות ספרים', 100, 600)) == dict(title='מבחן קבלה נאוה מקמל-עתיר', publisher='ידיעות ספרים')
    assert label(line('תגידי מה את רוצה - רביטל ויטלזון-יעקבס - מודן', 100, 600)) == dict(title='תגידי מה את רוצה רביטל ויטלזון-יעקבס', publisher='מודן')
