"""req/nor/downloads, R10 — ground truth saved from the page, or the lab's own labels, read as its elements by their
state alone, and an answer scored against them: each kind of error at rising severity, on drawn files in the page's
shapes (docs/scoring.md)."""
import base64
import json
import zlib
import copy
import math
import os
import random
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'algorithm'))
import nor_finder
import truth as S

RED, LENGTH, WIDTH = 10.0, 26.0, 5.0
# a grid of NoRs far enough apart that none reaches another
PLACES = [(60.0 + 80 * i, 60.0 + 80 * j) for j in range(4) for i in range(5)]


def lines_at(x, y, length=LENGTH, red=RED, width=WIDTH):
    return {'length': [[x - length / 2, y], [x + length / 2, y]], 'red': [[x - red / 2, y], [x + red / 2, y]],
            'width': [[x, y - width / 2], [x, y + width / 2]]}


def cand(x, y, fail=None, length=LENGTH, red=RED, width=WIDTH, i=None):
    return dict(i=i, cx=x, cy=y, fail=fail, m=dict(length=length, red_length=red, width=width), lines=lines_at(x, y, length, red, width))


def three(places=PLACES, areas=range(100), undecided=(), deleted=(), added=()):
    """A /3 file over a 400 x 400 image: approved candidates at `places`, unapproved ones at `undecided`, candidates the
    history deleted at `deleted`, approved added NoRs at `added`; every area checked unless told."""
    k = iter(range(1, 10 ** 6))
    def c(x, y, **more):
        return dict(id=f'c{next(k)}', x=x, y=y, lines=lines_at(x, y), m=dict(length=LENGTH, red_length=RED, width=WIDTH), fail=None, **more)
    kept = [c(x, y, approved=True) for x, y in places] + [c(x, y) for x, y in undecided]
    gone = [c(x, y) for x, y in deleted]
    actions = [{'type': 'run', 'output': {'cands': [dict(g) for g in kept + gone]}}] + [{'type': 'delete', 'cand': g['id']} for g in gone]
    return {'format': 'norfinder-ground-truth/3', 'image': {'width': 400, 'height': 400}, 'grid': 10, 'areas': list(areas),
            'candidates': kept, 'added': [dict(id=f'u{n + 1}', lines=lines_at(x, y), approved=True) for n, (x, y) in enumerate(added)],
            'history': {'actions': actions}}


def two(places=PLACES, nots=(), unsure=()):
    labels = [dict(x=x, y=y, label=1) for x, y in places] + [dict(x=x, y=y, label=0) for x, y in nots] + [dict(x=x, y=y, label=None) for x, y in unsure]
    return {'format': 'norfinder-ground-truth/2', 'labels': [dict(L, id=n) for n, L in enumerate(labels)]}


def right(places=PLACES):
    return [cand(x, y, i=n) for n, (x, y) in enumerate(places)]


def F(cands, doc):
    c = S.score(cands, doc)
    assert min(c['tp'], c['fp'], c['fn']) >= -1e-9
    return 2 * c['tp'] / (2 * c['tp'] + c['fp'] + c['fn']) if c['tp'] else 0.0


def falls(values, strictly=True):
    return all(a > b if strictly else a >= b for a, b in zip(values, values[1:]))


BOTH = [three(), two()]


@pytest.mark.parametrize('doc', BOTH)
def test_the_truth_itself_scores_one_and_nothing_scores_zero(doc):
    assert F(right(), doc) == pytest.approx(1.0)
    assert F([], doc) == 0.0
    assert F([cand(x, y, fail='dim') for x, y in PLACES], doc) == 0.0


@pytest.mark.parametrize('doc', BOTH)
def test_the_order_of_the_units_changes_nothing(doc):
    cands = right()[:15] + [cand(x + 4, y + 3) for x, y in PLACES[:6]] + [cand(200, 20)]
    base = S.score(cands, doc)
    for seed in range(5):
        a, d = cands[:], copy.deepcopy(doc)
        random.Random(seed).shuffle(a)
        for key in ('labels', 'candidates'):
            if key in d:
                random.Random(seed).shuffle(d[key])
        got = S.score(a, d)
        assert all(got[k] == pytest.approx(base[k]) for k in ('tp', 'fp', 'fn'))


@pytest.mark.parametrize('doc', BOTH)
def test_each_unit_missed_costs_more(doc):
    assert falls([F(right()[:n], doc) for n in (20, 19, 15, 8, 1, 0)])


@pytest.mark.parametrize('doc', BOTH + [three(areas=())])
def test_each_unit_invented_costs_more(doc):
    """issue 1100: the score is the expected set against the answer's, so a NoR that matches none in the truth is an
    invention wherever it lies; which areas were checked for missed NoRs is a task of the tagging, not of the score."""
    extra = [cand(100.0 + 80 * i, 100.0) for i in range(4)]
    assert falls([F(right() + extra[:n], doc) for n in range(5)])


def test_the_tagging_s_tasks_change_no_score():
    cands = right()[:15] + [cand(100.0, 100.0), cand(20.0, 20.0)]
    assert all(S.score(cands, three(areas=a))[k] == pytest.approx(S.score(cands, three())[k]) for a in ((), [0]) for k in ('tp', 'fp', 'fn'))
    four = dict(three(), format='norfinder-ground-truth/4', checked=[])
    del four['grid'], four['areas']
    assert all(S.score(cands, four)[k] == pytest.approx(S.score(cands, three())[k]) for k in ('tp', 'fp', 'fn'))


@pytest.mark.parametrize('doc', BOTH)
def test_a_unit_placed_further_off_costs_more_with_no_step(doc):
    offs = [0, 2, 3, 4, 5, 6, 8, 9.9, 10, 14]
    got = [F(right()[1:] + [cand(PLACES[0][0], PLACES[0][1] + d)], doc) for d in offs]
    assert got[0] == pytest.approx(1.0) and got[1] == pytest.approx(1.0)   # inside the slack
    assert falls(got[1:8]) and falls(got, strictly=False)
    # barely paired costs what the two cost unpaired: nothing jumps at the reach
    assert abs(got[7] - got[8]) < 0.01
    # half a node off is partly right, not wrong
    assert F(right()[1:], doc) < got[4] < 1.0


@pytest.mark.parametrize('doc', BOTH)
def test_the_whole_answer_shifted_costs_more_the_further(doc):
    got = [F([cand(x + d, y) for x, y in PLACES], doc) for d in (0, 3, 5, 7, 9, 12)]
    assert falls(got[:5]) and got[-1] == 0.0


def test_the_whole_answer_scaled_costs_more_the_further():
    # about the image's middle: places move, and lengths with them
    def scaled(k):
        return [cand(200 + (x - 200) * k, 200 + (y - 200) * k, length=LENGTH * k, red=RED * k, width=WIDTH * k) for x, y in PLACES]
    assert falls([F(scaled(k), three()) for k in (1.0, 1.02, 1.05, 1.1, 1.2)])
    assert falls([F(scaled(k), three()) for k in (1.0, 0.98, 0.95, 0.9, 0.8)])


def test_a_unit_found_and_measured_wrong_is_partly_right():
    def with_red(k):
        return right()[1:] + [cand(*PLACES[0], red=RED * k)]
    got = [F(with_red(k), three()) for k in (1.0, 1.1, 1.2, 1.3)]
    assert falls(got)
    wrong_all = F(right()[1:] + [cand(*PLACES[0], length=LENGTH * 3, red=RED * 3, width=WIDTH * 3)], three())
    assert F(right()[1:], three()) < wrong_all < got[-1]
    # a file with no lengths asks only for the place
    assert F(right()[1:] + [cand(*PLACES[0], red=RED * 3)], two()) == pytest.approx(1.0)
    c = S.score(with_red(1.2), three())
    assert c['measured'] == 20 and c['red_err'] == pytest.approx(2.0) and c['length_err'] == pytest.approx(0.0)


@pytest.mark.parametrize('doc', BOTH)
def test_a_duplicate_earns_nothing_and_costs(doc):
    x, y = PLACES[0]
    assert falls([F(right() + [cand(x + 1, y)] * n, doc) for n in (0, 1, 2)])
    c = S.score(right() + [cand(x + 1, y)], doc)
    assert c['tp'] == pytest.approx(20.0) and c['fp'] == pytest.approx(1.0)


@pytest.mark.parametrize('doc', BOTH)
def test_one_unit_split_in_two_and_two_merged_into_one(doc):
    x, y = PLACES[0]
    def halves(off):
        return [cand(x - off, y, length=LENGTH / 2, red=RED / 2), cand(x + off, y, length=LENGTH / 2, red=RED / 2)]
    # one half is paired for what it is worth and the other is a duplicate: mending the split always gains
    assert falls([F(right(), doc), F(right()[1:] + halves(2), doc), F(right()[1:] + halves(4), doc)])
    # ...and it is worth about a miss, more only when a half sits on the node and the truth asks for no lengths
    if 'labels' in doc:
        assert F(right()[1:] + halves(2), doc) > F(right()[1:], doc)
    # two truth NoRs a node apart, answered by one between them
    near = PLACES + [(x + 9, y)]
    d = three(near) if doc['format'].endswith('3') else two(near)
    both = right() + [cand(x + 9, y)]
    merged = right()[1:] + [cand(x + 4.5, y, length=LENGTH + 9, red=RED + 9)]
    assert F(right()[1:], d) < F(merged, d) < F(both, d)
    # the truth beside itself still scores one against itself
    assert F(both, d) == pytest.approx(1.0)


@pytest.mark.parametrize('unmarked', [three(undecided=[(100.0, 100.0)]), two(unsure=[(100.0, 100.0)]), two(nots=[(100.0, 100.0)])])
def test_an_element_not_marked_a_nor_is_not_in_the_expected_set(unmarked):
    assert F(right(), unmarked) == pytest.approx(1.0)
    assert F(right() + [cand(100.0, 100.0)], unmarked) == pytest.approx(F(right() + [cand(100.0, 100.0)], three()))


def test_where_an_element_came_from_changes_nothing():
    cands = right()[:17] + [cand(PLACES[18][0] + 4, PLACES[18][1]), cand(300.0, 20.0), cand(*PLACES[19], red=RED * 1.2)]
    as_candidates = S.score(cands, three())
    as_added = S.score(cands, three(PLACES[:10], added=PLACES[10:]))
    assert all(as_added[k] == pytest.approx(as_candidates[k]) for k in ('tp', 'fp', 'fn', 'measured', 'red_err'))
    # an added NoR the history deleted is gone from the truth, as a deleted candidate is
    doc = three(areas=())
    doc['history']['actions'] += [{'type': 'add', 'cand': 'u1', 'lines': lines_at(300.0, 20.0)}, {'type': 'delete', 'cand': 'u1'}]
    assert S.score(cands, doc)['fp'] == pytest.approx(S.score(cands, three(areas=()))['fp'])


def test_a_failed_candidate_is_not_in_the_answer_and_is_told_apart():
    cands = right()[2:] + [cand(*PLACES[0], fail='dim')]
    c = S.score(cands, three())
    assert c['fn'] == pytest.approx(2.0) and c['fp'] == 0 and c['proposed'] == pytest.approx(1.0)


@pytest.mark.parametrize('doc', BOTH)
def test_every_fix_of_one_error_raises_the_score(doc):
    """An answer with one of each error; fixing any one of them, in any order, never lowers F and each raises it."""
    x0, y0 = PLACES[0]
    fixes = {
        'missed': (lambda a: a, lambda a: a + [cand(*PLACES[5])]),
        'invented': (lambda a: a + [cand(x0 + 1, y0 + 40)], lambda a: a),
        'off': (lambda a: a + [cand(PLACES[6][0] + 6, PLACES[6][1])], lambda a: a + [cand(*PLACES[6])]),
        'duplicate': (lambda a: a + [cand(PLACES[7][0], PLACES[7][1] + 1)], lambda a: a),
        'mismeasured': (lambda a: a + [cand(*PLACES[8], red=RED * 1.25)], lambda a: a + [cand(*PLACES[8])]),
    }
    d = copy.deepcopy(doc)
    if 'labels' in d:
        d['labels'].append(dict(id=99, x=x0 + 1, y=y0 + 40, label=0))
    base = [cand(x, y) for n, (x, y) in enumerate(PLACES) if n not in (5, 6, 8)]

    def answer(fixed):
        a = base[:]
        for name, (broken, mended) in fixes.items():
            a = (mended if name in fixed else broken)(a)
        return a
    names = list(fixes)
    for seed in range(6):
        order = names[:]
        random.Random(seed).shuffle(order)
        scores = [F(answer(set(order[:n])), d) for n in range(len(order) + 1)]
        for n, name in enumerate(order):
            if name == 'mismeasured' and 'labels' in d:
                assert scores[n + 1] == pytest.approx(scores[n])
            else:
                assert scores[n + 1] > scores[n], (order, name)
        assert scores[-1] == pytest.approx(1.0)


def test_a_bigger_fix_raises_it_more():
    doc = three()
    worst = right()[1:] + [cand(PLACES[0][0] + 9, PLACES[0][1])]
    small, big = (right()[1:] + [cand(PLACES[0][0] + d, PLACES[0][1])] for d in (6, 2))
    assert F(worst, doc) < F(small, doc) < F(big, doc)


def test_the_page_outline_carries_the_scorers_own_numbers():
    assert f'{S.SLACK:g}' in S.SCORING and f'{S.REACH:g} red length' in S.SCORING
    assert len(S.SCORING.splitlines()) <= 10 and nor_finder.SCORING == S.SCORING


# ---------- a file read as its elements ----------
def states(doc):
    return sorted((e['state'], round(e['x']), round(e['y'])) for e in S.truth_of(doc))


def test_a_three_file_gives_each_element_its_state():
    doc = three(PLACES[:2], undecided=[(100.0, 100.0)], deleted=[(200.0, 100.0)], added=[(300.0, 100.0)])
    doc['added'].append(dict(id='u9', lines=lines_at(350.0, 100.0)))
    assert states(doc) == [('nor', 60, 60), ('nor', 140, 60), ('nor', 300, 100), ('undecided', 100, 100), ('undecided', 350, 100)]


def test_a_file_with_a_tagging_task_undone_says_which():
    """Only ground truth with every task done is scored (the owner, 2026-11-26): every finalist and added NoR has a
    verdict, and the whole image is checked for missed NoRs; a /2 file or the lab's labels never had that check."""
    assert S.undone(three()) is None
    assert S.undone(three(areas=range(99))) and S.undone(three(areas=()))
    assert S.undone(three(undecided=[(100.0, 100.0)]))
    failed = three()
    failed['candidates'].append(dict(failed['candidates'][0], id='c99', x=100.0, y=100.0, approved=None, fail='dim'))
    assert S.undone(failed) is None, 'a failed candidate is no finalist, and wants no verdict'
    unvoted = three()
    unvoted['added'].append(dict(id='u9', lines=lines_at(350.0, 100.0)))
    assert S.undone(unvoted)
    assert S.undone(two()) and S.undone({'labels': two()['labels']})


def test_a_four_file_is_done_once_its_checks_cover_the_image():
    """req/nor/downloads: /4 keeps each check as its box in whole pixels, x0 to x1 not included."""
    doc = dict(three(PLACES[:2]), format='norfinder-ground-truth/4', checked=[[0, 0, 200, 400], [190, 0, 400, 400]])
    del doc['grid'], doc['areas']
    assert states(doc) == states(three(PLACES[:2]))
    assert S.undone(doc) is None
    for gap in ([[0, 0, 200, 400], [201, 0, 400, 400]], [[0, 0, 400, 399]], [[0, 0, 400, 200], [0, 200, 399, 400]], []):
        assert S.undone(dict(doc, checked=gap)), gap
    assert S.undone(dict(doc, checked=[[-5, -5, 405, 405]])) is None


def test_an_element_is_measured_on_the_lines_it_stands_on():
    doc = three(PLACES[:1])
    doc['candidates'][0]['edited'] = {'red': [[50.0, 60.0], [64.0, 60.0]]}
    e = S.truth_of(doc)[0]
    assert (e['red'], e['length'], e['width']) == (14.0, LENGTH, WIDTH) and (e['rx'], e['ry']) == (57.0, 60.0)


def test_the_truth_is_the_model_alone():
    """issue 1100: the scorer compares the answer with the model the file lists, never its history; a candidate the
    history deleted is simply not there, packed history or not, and a file without its history scores the same."""
    doc = three(PLACES[:1], deleted=[(200.0, 100.0)])
    packed = copy.deepcopy(doc)
    run = packed['history']['actions'][0]
    run['output'] = {'deflate': base64.b64encode(zlib.compress(json.dumps(run['output']).encode())).decode()}
    bare = copy.deepcopy(doc)
    del bare['history']
    assert states(packed) == states(doc) == states(bare) == [('nor', 60, 60)]
    cands = right(PLACES[:1]) + [cand(200.0, 100.0)]
    assert S.score(cands, doc) == S.score(cands, bare) == S.score(cands, packed)
    assert S.score(cands, bare)['fp'] == pytest.approx(1.0)


def test_a_two_file_and_a_lab_file_read_alike():
    labels = [dict(id=1, x=10, y=10, label=1, source='user', kind='missing', radius_px=12, length_px=12.0, red_length_px=3.0, width_px=2.0),
              dict(id=2, x=50, y=50, label=0, source='finder'), dict(id=3, x=80, y=80, label=None)]
    page = {'format': 'norfinder-ground-truth/2', 'labels': labels}
    lab = {'labels': [{k: L[k] for k in L if k not in ('source', 'kind', 'radius_px')} for L in labels]}
    assert S.truth_of(page) == S.truth_of(lab)
    assert states(page) == [('nor', 10, 10), ('not', 50, 50), ('undecided', 80, 80)]
    assert S.truth_of(page)[0]['red'] == 3.0


def test_the_graded_items_say_what_the_answer_keeps():
    doc = two(PLACES[:3], nots=[(100.0, 100.0), (300.0, 100.0)], unsure=[(200.0, 100.0)])
    got = S.score([cand(*PLACES[0]), cand(PLACES[1][0] + 8, PLACES[1][1]), cand(100.0, 101.0), cand(200.0, 100.0)], doc)
    assert [(it['label'], it['hit']) for it in got['items']] == [(1, True), (1, False), (1, False), (0, True), (0, False)]
    assert nor_finder.score(dict(cands=[cand(*PLACES[0])]), doc)['tp'] == 1.0
