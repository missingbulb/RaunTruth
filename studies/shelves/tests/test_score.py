"""The Bookshelf Reader's score under every error it should grade: each test spoils a true answer in one way, at rising
severity, and holds the score to falling with the severity, rising with each fix, and never dropping to nothing for
an answer that is nearly right. The shelf is drawn here, in the shape a submitted ground-truth file has."""
import copy
import os
import random
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'algorithm'))
from score import BOX, SCORING, SLIP, TITLE, TITLE_MATCH, UNDECIDED, part, score

TITLES = ['פרנק הרברט / חולית', 'פרנק הרברט / משיח חולית', 'RIAN MALAN MY TRAITOR’S HEART', 'אלן דין פוסטר הנוסע השמיני', '',
          'ג׳ון לה קארה המתופפת הקטנה', 'Seth Godin Small Is the New Big', '', 'רוברט סילברברג | האיש במבוך', 'מעוף הדרקון']


def shelf(titles=TITLES, lean=30.0):
    """A ground-truth file of one shelf: leaning spines of unequal width side by side, some with no title."""
    books, x = [], 100.0
    for k, t in enumerate(titles):
        w = 60.0 + 25 * (k % 3)
        books.append(dict(verdict='right', corners=[[x + lean, 200.0], [x + w + lean, 200.0], [x + w, 900.0], [x, 900.0]], turn=1, text=t))
        x += w
    return dict(W=2048, H=1536, books=books)


def as_answer(truth):
    return dict(books=[dict(corners=copy.deepcopy(b['corners']), view='spine', title=b['text'] or None)
                       for b in truth['books'] if b['verdict'] == 'right'])


TRUTHS = [('drawn', shelf()), ('drawn-flat', shelf(lean=0.0))]


@pytest.fixture(params=TRUTHS, ids=[n for n, _ in TRUTHS])
def truth(request):
    return copy.deepcopy(request.param[1])


def pr(s):
    return s['tp'] / max(1e-12, s['tp'] + s['fp']), s['tp'] / max(1e-12, s['tp'] + s['fn'])


def f(answer, truth):
    p, r = pr(score(answer, truth))
    return 2 * p * r / max(1e-12, p + r)


def moved(c, dx=0.0, dy=0.0, grow=1.0):
    cx, cy = sum(p[0] for p in c) / 4, sum(p[1] for p in c) / 4
    return [[cx + (x - cx) * grow + dx, cy + (y - cy) * grow + dy] for x, y in c]


def width(c):
    return abs(c[1][0] - c[0][0])


def falls(values, strictly=True):
    return all(a > b + 1e-9 if strictly else a >= b - 1e-9 for a, b in zip(values, values[1:]))


# ---- the fixed points

def test_the_truth_itself_is_perfect(truth):
    s = score(as_answer(truth), truth)
    assert s['tp'] == pytest.approx(s['truth']) and s['fp'] == pytest.approx(0) and s['fn'] == pytest.approx(0)
    assert pr(s) == pytest.approx((1, 1))


def test_an_empty_answer_scores_nothing(truth):
    s = score(dict(books=[]), truth)
    assert (s['tp'], s['fp'], s['fn']) == (0, 0, s['truth'])


def test_the_order_of_the_books_changes_nothing(truth):
    a = as_answer(truth)
    for k, b in enumerate(a['books']):       # an imperfect answer, so that the pairing has choices to make
        b['corners'] = moved(b['corners'], dx=0.3 * width(b['corners']) * (k % 3 - 1))
        if k % 4 == 0:
            b['title'] = None
    a['books'] += copy.deepcopy(a['books'][:2])
    base = score(a, truth)
    rng = random.Random(7)
    for _ in range(5):
        a2, t2 = copy.deepcopy(a), copy.deepcopy(truth)
        rng.shuffle(a2['books']), rng.shuffle(t2['books'])
        s = score(a2, t2)
        assert (s['tp'], s['fp'], s['fn']) == pytest.approx((base['tp'], base['fp'], base['fn']))


# ---- a book placed off

@pytest.mark.parametrize('axis', ['dx', 'dy'])
def test_a_shift_costs_more_the_further_it_goes(truth, axis):
    """The whole answer shifted, as a finder with a constant offset does: no step of it is free and none is a cliff."""
    steps = [0, 0.05, 0.1, 0.2, 0.3, 0.45]
    got = []
    for k in steps:
        a = as_answer(truth)
        for b in a['books']:
            size = width(b['corners']) if axis == 'dx' else abs(b['corners'][3][1] - b['corners'][0][1])
            b['corners'] = moved(b['corners'], **{axis: k * size})
        got.append(score(a, truth))
    assert falls([s['tp'] for s in got]) and falls([-s['fp'] for s in got]) and falls([-s['fn'] for s in got])
    assert got[-1]['tp'] > 0.25 * got[0]['tp']      # nearly half a book off is still worth something


def test_a_box_too_large_is_overshoot_and_one_too_small_is_a_miss():
    t = shelf(['א', 'ב', 'ג'])
    one = dict(verdict='right', corners=[[2000, 200], [2100, 200], [2100, 900], [2000, 900]], turn=1, text='')
    t = dict(books=[one])
    big = [score(dict(books=[dict(corners=moved(one['corners'], grow=g), title=None)]), t) for g in (1, 1.2, 1.5, 2, 3)]
    small = [score(dict(books=[dict(corners=moved(one['corners'], grow=g), title=None)]), t) for g in (1, 0.9, 0.7, 0.5, 0.2)]
    assert falls([s['tp'] for s in big]) and falls([-s['fp'] for s in big]) and all(s['fn'] == pytest.approx(0) for s in big)
    assert falls([s['tp'] for s in small]) and falls([-s['fn'] for s in small]) and all(s['fp'] == pytest.approx(0) for s in small)
    assert pr(small[3]) == pytest.approx((1, 0.25))   # half the size each way: all of it book, a quarter of the book


def test_no_cliff_at_half_overlap():
    """The old scorer's cliff: IoU 0.49 was worth nothing and 0.51 a whole book."""
    one = dict(verdict='right', corners=[[0, 0], [100, 0], [100, 700], [0, 700]], text='')
    t = dict(books=[one])
    under, over = (score(dict(books=[dict(corners=moved(one['corners'], dx=d), title=None)]), t)['tp'] for d in (35, 32))
    assert 0.45 < under < 0.5 < over < 0.55


# ---- books missed, invented, split, merged, doubled

def test_each_book_missed_and_each_box_invented_costs(truth):
    full = as_answer(truth)
    n = len(full['books'])
    missing = [score(dict(books=full['books'][k:]), truth) for k in range(0, n, max(1, n // 5))]
    assert falls([s['tp'] for s in missing]) and falls([-s['fn'] for s in missing])
    assert all(s['fp'] == pytest.approx(0) for s in missing)
    far = [dict(corners=[[-5000 - 100 * k, 0], [-4950 - 100 * k, 0], [-4950 - 100 * k, 500], [-5000 - 100 * k, 500]], title='לא ספר') for k in range(4)]
    extra = [score(dict(books=full['books'] + far[:k]), truth) for k in range(5)]
    assert [s['fp'] for s in extra] == pytest.approx([0, 1, 2, 3, 4]) and all(s['tp'] == pytest.approx(n) for s in extra)


def halves(c):
    (a, b, d, e) = c
    top, foot = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], [(d[0] + e[0]) / 2, (d[1] + e[1]) / 2]
    return [a, top, foot, e], [top, b, d, foot]


def test_a_book_split_in_two_recalls_more_than_a_miss_and_loses_to_the_whole():
    t = shelf()
    whole = as_answer(t)
    left, right = halves(whole['books'][0]['corners'])
    split = dict(books=[dict(corners=left, title=TITLES[0]), dict(corners=right, title=None)] + whole['books'][1:])
    half = dict(books=[dict(corners=left, title=TITLES[0])] + whole['books'][1:])
    gone = dict(books=whole['books'][1:])
    # found in two pieces: more of the truth than a miss, and one box more than there are books
    assert pr(score(gone, t))[1] < pr(score(split, t))[1] < 1
    assert f(gone, t) < f(split, t) < f(whole, t)
    # its spare half lies on the part of the book its pair left uncovered: it costs next to nothing, unlike a box
    # on bare shelf
    shelfbox = dict(books=half['books'] + [dict(corners=moved(right, dy=2000), title=None)])
    assert score(split, t)['fp'] == pytest.approx(score(half, t)['fp'], abs=1e-6)
    assert score(shelfbox, t)['fp'] == pytest.approx(score(half, t)['fp'] + 1)


def test_two_books_merged_into_one_beats_missing_both_and_loses_to_both():
    t = shelf()
    whole = as_answer(t)
    a, b = whole['books'][0]['corners'], whole['books'][1]['corners']
    merged = dict(books=[dict(corners=[a[0], b[1], b[2], a[3]], title=TITLES[0])] + whole['books'][2:])
    gone = dict(books=whole['books'][2:])
    assert f(gone, t) < f(merged, t) < f(whole, t)
    s = score(merged, t)
    assert len(s['missed']) == 1 and s['fp'] > 0


def test_a_book_given_twice_is_one_book_and_one_invention(truth):
    a = as_answer(truth)
    twice = dict(books=a['books'] + [copy.deepcopy(a['books'][0])])
    s = score(twice, truth)
    assert s['tp'] == pytest.approx(s['truth']) and s['fp'] == pytest.approx(1) and s['fn'] == pytest.approx(0)


# ---- the title

def spoiled(title, k, rng):
    """A title with k of its letters misread."""
    at = [i for i, ch in enumerate(title) if ch.isalnum()]
    out = list(title)
    for i in rng.sample(at, min(k, len(at))):
        out[i] = 'ץ' if out[i] != 'ץ' else 'ף'
    return ''.join(out)


def test_each_letter_misread_costs_and_each_put_right_pays():
    t = shelf()
    got = []
    for k in (0, 1, 2, 4, 8, 12):
        a = as_answer(t)
        for b in a['books']:
            if b['title']:
                b['title'] = spoiled(b['title'], k, random.Random(len(b['title'])))
        got.append(score(a, t))
    assert falls([s['tp'] for s in got])
    assert got[1]['tp'] > 0.9 * got[0]['tp']        # one letter in a title is a small error, never a lost book
    assert all(not s['missed'] and not s['invented'] for s in got)


def test_junk_read_with_the_title_is_overshoot_and_a_title_cut_short_is_a_miss():
    t = shelf(['פרנק הרברט / משיח חולית'])
    box = t['books'][0]['corners']
    junk = [score(dict(books=[dict(corners=box, title='פרנק הרברט / משיח חולית' + ' qzx' * k)]), t) for k in range(4)]
    cut = [score(dict(books=[dict(corners=box, title='פרנק הרברט / משיח חולית'[:n])]), t) for n in (23, 17, 10, 4)]
    assert falls([s['tp'] for s in junk]) and falls([-s['fp'] for s in junk]) and all(s['fn'] == pytest.approx(0) for s in junk)
    assert falls([s['tp'] for s in cut]) and falls([-s['fn'] for s in cut]) and all(s['fp'] == pytest.approx(0) for s in cut)


def test_the_order_of_a_titles_words_punctuation_and_case_do_not_count():
    t = shelf(['Rian Malan / My Traitor’s Heart'])
    box = t['books'][0]['corners']
    assert score(dict(books=[dict(corners=box, title='rian malan, my traitors heart')]), t)['tp'] == pytest.approx(1)
    turned = score(dict(books=[dict(corners=box, title='My Traitor’s Heart Rian Malan')]), t)['tp']
    assert 0.85 < turned < 1      # only the pairs at the words' joins change


# ---- the owner's examples

def test_named_exact_is_perfect_and_an_unnamed_exact_box_counts_for_less():
    t = shelf(['פרנק הרברט / חולית'])
    box = t['books'][0]['corners']
    named = score(dict(books=[dict(corners=box, title='פרנק הרברט / חולית')]), t)
    bare = score(dict(books=[dict(corners=box, title=None)]), t)
    assert (named['tp'], named['fp'], named['fn']) == pytest.approx((1, 0, 0))
    assert (bare['tp'], bare['fp'], bare['fn']) == pytest.approx((BOX, 0, TITLE))
    assert 0 < bare['tp'] < named['tp']


def test_a_true_book_with_no_title_is_perfect_under_an_unnamed_box():
    t = shelf([''])
    box = t['books'][0]['corners']
    bare = score(dict(books=[dict(corners=box, title=None)]), t)
    blank = score(dict(books=[dict(corners=box, title=' — ')]), t)
    named = score(dict(books=[dict(corners=box, title='qzx')]), t)
    assert (bare['tp'], bare['fp'], bare['fn']) == pytest.approx((1, 0, 0))
    assert (blank['tp'], blank['fp'], blank['fn']) == pytest.approx((1, 0, 0))     # a title of no letters is no title
    assert (named['tp'], named['fp'], named['fn']) == pytest.approx((1, 0, 0))     # read text on it costs nothing


def test_titles_pair_first_and_the_rest_pair_by_overlap():
    """Two true books; the answer's boxes sit on them the wrong way round by title. The title pairs each with its own
    book (the old scorer saw two perfect boxes), and what is left pairs by overlap."""
    t = shelf(['אלן דין פוסטר הנוסע השמיני', 'Seth Godin Small Is the New Big', ''])
    c = [b['corners'] for b in t['books']]
    s = score(dict(books=[dict(corners=c[1], title='אלן דין פוסטר הנוסע השמיני'), dict(corners=c[0], title='Seth Godin Small Is the New Big'),
                          dict(corners=moved(c[2], dx=10), title=None)]), t)
    stages = {(p['truth'], p['answer']): p['stage'] for p in s['pairs']}
    assert stages == {(0, 0): 'title', (1, 1): 'title', (2, 2): 'box'}
    right = score(as_answer(t), t)
    assert 0 < s['tp'] < right['tp']


def test_a_title_on_the_wrong_book_is_still_progress_over_no_title():
    t = shelf(['אלן דין פוסטר הנוסע השמיני', ''])
    c = [b['corners'] for b in t['books']]
    nothing = dict(books=[])
    read_elsewhere = dict(books=[dict(corners=c[1], title='אלן דין פוסטר הנוסע השמיני')])
    boxed_unread = dict(books=[dict(corners=c[0], title=None)])
    both = dict(books=[dict(corners=c[0], title='אלן דין פוסטר הנוסע השמיני')])
    assert f(nothing, t) < f(read_elsewhere, t) < f(both, t)
    assert f(nothing, t) < f(boxed_unread, t) < f(both, t)


def test_a_box_on_an_undecided_book_is_not_counted():
    t = shelf(['א ב ג ד', 'ה ו ז ח'])
    t['books'][1]['verdict'] = None
    c = [b['corners'] for b in t['books']]
    s = score(dict(books=[dict(corners=c[0], title='א ב ג ד'), dict(corners=moved(c[1], dx=5), title='ה ו ז ח')]), t)
    assert (s['tp'], s['fp'], s['fn']) == pytest.approx((1, 0, 0)) and s['ignored'] == [1]
    t['books'][1]['verdict'] = 'wrong'
    assert score(dict(books=[dict(corners=c[0], title='א ב ג ד'), dict(corners=c[1], title='ה ו ז ח')]), t)['fp'] == pytest.approx(1)


def test_where_a_book_came_from_does_not_count():
    """A true book scores the same whoever marked it and whatever was proposed for it."""
    t = shelf()
    a = as_answer(t)
    for k, b in enumerate(a['books']):
        b['corners'] = moved(b['corners'], dx=7.0 * (k % 3))
    base = score(a, t)
    for k, b in enumerate(t['books']):
        b['source'] = ['found', 'missed'][k % 2]
        b['proposed'] = dict(corners=moved(b['corners'], dx=40), text='qzx')
    s = score(a, t)
    assert (s['tp'], s['fp'], s['fn']) == (base['tp'], base['fp'], base['fn'])


# ---- every fix pays

def test_every_single_fix_of_a_bad_answer_raises_the_score():
    """An answer wrong in every way at once, put right one error at a time, in three orders: no fix is free and none
    is held back until the rest are made."""
    t = shelf()
    right = as_answer(t)['books']
    c = [b['corners'] for b in right]
    fixes = [
        ('shift', 0, lambda b: b.update(corners=c[0])),
        ('title misread', 1, lambda b: b.update(title=TITLES[1])),
        ('title missing', 2, lambda b: b.update(title=TITLES[2])),
        ('box too big', 3, lambda b: b.update(corners=c[3])),
        ('half a book', 5, lambda b: b.update(corners=c[5])),
        ('junk in the title', 6, lambda b: b.update(title=TITLES[6])),
    ]
    for seed in range(3):
        bad = copy.deepcopy(right)
        bad[0]['corners'] = moved(c[0], dx=0.4 * width(c[0]))
        bad[1]['title'] = spoiled(TITLES[1], 5, random.Random(1))
        bad[2]['title'] = None
        bad[3]['corners'] = moved(c[3], grow=1.3)
        bad[5]['corners'] = halves(c[5])[0]
        bad[6]['title'] = TITLES[6] + ' 1234 qzx'
        del bad[9]                                              # a book missed
        bad.append(dict(corners=moved(c[0], dy=-5000), title='x'))   # a box invented
        steps = fixes + [('missed', None, None), ('invented', None, None)]
        random.Random(seed).shuffle(steps)
        was = f(dict(books=bad), t)
        for name, k, fix in steps:
            if name == 'missed':
                bad.insert(9, copy.deepcopy(right[9]))
            elif name == 'invented':
                bad.pop()
            else:
                fix(bad[k])
            now = f(dict(books=bad), t)
            assert now > was + 1e-6, name
            was = now
        assert was == pytest.approx(1)


def test_the_outline_shows_the_scorers_own_numbers():
    assert f'{TITLE_MATCH:g}' in SCORING and f'{BOX:g} × box' in SCORING and f'{UNDECIDED:g}' in SCORING
    assert f'{SLIP:g}' in SCORING


# ---- the fields (req/shelves/read/fields): each field's text against the same field's, a slip costing little

DUNE = dict(title='משיח חולית', author='פרנק הרברט', publisher='עם עובד')


def fielded(fields):
    """A ground-truth file of one book whose text is set field by field."""
    t = shelf([' '.join(fields.values())])
    t['books'][0]['fields'] = dict(fields)
    return t


def one(t, **fields):
    return dict(books=[dict(corners=t['books'][0]['corners'], fields=fields)])


def text_share(s):
    return s['pairs'][0]['title']


def test_every_field_right_is_perfect():
    t = fielded(DUNE)
    s = score(one(t, **DUNE), t)
    assert (s['tp'], s['fp'], s['fn']) == pytest.approx((1, 0, 0))


def test_the_right_text_in_the_wrong_field_keeps_most_of_its_credit():
    t = fielded(DUNE)
    swapped = score(one(t, title=DUNE['author'], author=DUNE['title'], publisher=DUNE['publisher']), t)
    every = score(one(t, title=DUNE['publisher'], author=DUNE['title'], publisher=DUNE['author']), t)
    assert text_share(every) == pytest.approx(part(SLIP, 1, 1)[0])     # SLIP of the letters shared, every one moved
    assert part(SLIP, 1, 1)[0] < text_share(swapped) < 1
    assert score(one(t), t)['tp'] < every['tp'] < swapped['tp'] < 1


def test_text_all_in_the_title_as_the_old_reader_reads_it_is_measured_and_splitting_pays():
    t = fielded(DUNE)
    joined = score(dict(books=[dict(corners=t['books'][0]['corners'], title=' / '.join(DUNE.values()))]), t)
    split = score(one(t, **DUNE), t)
    assert 0.7 < text_share(joined) < text_share(split) == pytest.approx(1)     # its joins read as overshoot too


def test_an_optional_field_the_truth_lacks_costs_nothing_but_title_and_author_are_always_set():
    t = fielded(dict(title=DUNE['title'], author=DUNE['author']))
    s = score(one(t, title=DUNE['title'], author=DUNE['author'], publisher='qzx קקק', volume='IV'), t)
    assert (s['tp'], s['fp'], s['fn']) == pytest.approx((1, 0, 0))
    # the task always shows the title and the author: one left empty there says the spine has none
    alone = fielded(dict(title=DUNE['title']))
    assert score(one(alone, title=DUNE['title'], author='qzx קקק'), alone)['fp'] > 0


def test_in_a_file_from_before_the_fields_the_one_box_held_the_whole_spine():
    """junk read in any field is junk read on the spine: no field escapes it"""
    t = shelf([DUNE['title']])
    s = score(one(t, title=DUNE['title'], publisher='qzx קקק'), t)
    assert s['fp'] > 0 and s['fp'] == pytest.approx(score(one(t, title=DUNE['title'] + ' qzx קקק'), t)['fp'], rel=0.2)


def test_the_truths_text_read_in_a_field_the_truth_lacks_still_earns_the_slip():
    t = fielded(dict(title=DUNE['title']))
    s = score(one(t, publisher=DUNE['title']), t)
    assert text_share(s) == pytest.approx(part(SLIP, 1, 1)[0])


def test_fields_weigh_by_their_letters():
    t = fielded(dict(title='המלחמה הגדולה של שנות השלושים', volume='ב'))
    no_volume = score(one(t, title='המלחמה הגדולה של שנות השלושים'), t)
    no_title = score(one(t, volume='ב'), t)
    assert 0.9 < text_share(no_volume) < 1 and text_share(no_title) < 0.1


def test_a_file_from_before_the_fields_reads_its_text_as_the_title():
    t = shelf([DUNE['title']])
    s = score(one(t, title=DUNE['title']), t)
    assert (s['tp'], s['fp'], s['fn']) == pytest.approx((1, 0, 0))
    moved_ = score(one(t, author=DUNE['title']), t)
    assert text_share(moved_) == pytest.approx(part(SLIP, 1, 1)[0])
