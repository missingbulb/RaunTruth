"""req/nor/downloads, R10 — ground truth saved from the page, or the lab's own labels, read as the spots the scorer
counts, and an answer's candidates scored against them."""
import base64
import json
import os
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
import truth


def cand(x, y, fail=None, length=None, red=None):
    c = dict(cx=x, cy=y, fail=fail)
    if length is not None:
        c['m'] = dict(length=length, red_length=red)
    return c


PAGE = {
    'format': 'norfinder-ground-truth/1',
    'image': {'name': 'acme.tif', 'width': 100, 'height': 100},
    'labels': [
        {'id': 1, 'x': 10, 'y': 10, 'label': 1, 'source': 'user', 'measured': 'adjusted', 'length_px': 12.0, 'red_length_px': 3.0},
        {'id': 2, 'x': 50, 'y': 50, 'label': 0, 'source': 'user', 'measured': None},
        {'id': 3, 'x': 80, 'y': 80, 'label': 1, 'source': 'finder', 'measured': 'approved', 'length_px': 9.0, 'red_length_px': 2.0},
        {'id': 4, 'x': 30, 'y': 70, 'label': 1, 'source': 'finder', 'measured': None, 'length_px': 7.0, 'red_length_px': 1.0},
    ],
}


def counts(cands, labels):
    return {k: v for k, v in truth.score(cands, labels).items() if k in ('tp', 'fp', 'fn')}


def test_a_page_file_scores_like_a_lab_file():
    cands = [cand(11, 10, length=10.0, red=3.5), cand(50, 51), cand(80, 80, 'dim'), cand(31, 70, length=7.0, red=1.0)]
    page = truth.labels_of(PAGE)
    lab = truth.labels_of(dict(labels=[{k: L[k] for k in ('id', 'x', 'y', 'label')} for L in PAGE['labels']]))
    assert counts(cands, page) == counts(cands, lab) == dict(tp=2, fp=1, fn=1)


def test_only_measurements_a_person_checked_are_scored():
    # 1 was adjusted by hand and 3 approved; 4 is the finder's own number, so it proves nothing
    cands = [cand(11, 10, length=10.0, red=3.5), cand(80, 80, length=9.0, red=2.5), cand(31, 70, length=99.0, red=9.0)]
    e = truth.score(cands, truth.labels_of(PAGE))
    assert e['checked'] == 2
    assert abs(e['length_err'] - 2.0) < 1e-9 and abs(e['red_err'] - 1.0) < 1e-9
    # a checked NoR the finder did not pass has no measurement to compare
    cands[1]['fail'] = 'dim'
    assert truth.score(cands, truth.labels_of(PAGE))['checked'] == 1


SHA = 'ab' * 32


def submission(labels, source='drive', sha=SHA):
    loc = {'source': source, 'drive_id': 'D1' if source == 'drive' else None, 'name': 'acme.tif'}
    return {'format': truth.FORMATS[0], 'image': {'name': 'acme.tif', 'sha256': sha, 'width': 100, 'height': 100,
                                                     'location': loc}, 'labels': labels}


MISSING = {'kind': 'missing', 'x': 40, 'y': 40, 'label': 1, 'source': 'user', 'radius_px': 10}


def test_a_missing_mark_is_a_real_nor_found_within_its_radius():
    labels = truth.labels_of(submission([MISSING]))
    near, far = cand(47, 40), cand(52, 40)
    assert counts([near], labels)['tp'] == 1
    assert counts([far], labels)['fn'] == 1
    # proposing a candidate there counts even when a filter rejects it
    assert truth.score([cand(47, 40, 'dim')], labels)['missing_proposed'] == 1
    assert truth.score([far], labels)['missing_proposed'] == 0


# ---------- norfinder-ground-truth/3: the model, with its history ----------
def line(x, y, a):
    return [[x - a / 2, y], [x + a / 2, y]]


def lines_at(x, y, length=10.0):
    return {'length': line(x, y, length), 'red': line(x, y, 4.0), 'width': [[x, y - 2], [x, y + 2]]}


RUN_CANDS = [
    {'id': 'c1', 'i': 0, 'n': 1, 'x': 10.0, 'y': 10.0, 'bb': [5, 8, 15, 12], 'lines': lines_at(10, 10), 'm': {'length': 10.0, 'red_length': 4.0, 'width': 4.0}, 'fail': None},
    {'id': 'c2', 'i': 1, 'n': 2, 'x': 50.0, 'y': 50.0, 'bb': [45, 48, 55, 52], 'lines': lines_at(50, 50), 'm': {'length': 10.0, 'red_length': 4.0, 'width': 4.0}, 'fail': 'dim'},
    {'id': 'c3', 'i': 2, 'n': 3, 'x': 80.0, 'y': 80.0, 'bb': [75, 78, 85, 82], 'lines': lines_at(80, 80), 'm': {'length': 10.0, 'red_length': 4.0, 'width': 4.0}, 'fail': None},
    {'id': 'c4', 'i': 3, 'n': 4, 'x': 30.0, 'y': 70.0, 'bb': [25, 68, 35, 72], 'lines': lines_at(30, 70), 'm': {'length': 10.0, 'red_length': 4.0, 'width': 4.0}, 'fail': None},
]


def packed(output):
    return {'deflate': base64.b64encode(zlib.compress(json.dumps(output).encode())).decode()}


def three(candidates, added=(), history=True, pack=True):
    """A /3 file: the candidates that remain, and a history whose last run is RUN_CANDS."""
    run = {'image': {}, 'finder': 'tl', 'cands': RUN_CANDS}
    doc = {'format': 'norfinder-ground-truth/3', 'image': submission([])['image'], 'finder': 'tl', 'grid': 10,
           'candidates': list(candidates), 'added': list(added), 'areas': [0, 3]}
    if history:
        old = {'type': 'run', 'at': '2026-11-17T09:00:00Z', 'output': {'cands': RUN_CANDS[:1]}}
        last = {'type': 'run', 'at': '2026-11-17T10:00:00Z', 'output': packed(run) if pack else run}
        doc['history'] = {'format': 'rauntruth-gt-history/1', 'replay': 'verified', 'actions': [{'type': 'open'}, old, last, {'type': 'delete', 'cand': 'c2'}]}
    return doc


def kept(*ids, approved=()):
    return [dict(c, **({'approved': True} if c['id'] in approved else {})) for c in RUN_CANDS if c['id'] in ids]


ADDED = {'id': 'u1', 'lines': lines_at(40, 40, 8.0), 'approved': True}


def test_a_three_file_gives_its_approved_candidates_and_the_run_candidates_it_lacks():
    doc = three(kept('c1', 'c3', 'c4', approved=('c1', 'c3')), [ADDED, {'id': 'u2', 'lines': lines_at(60, 20)}])
    got = {(L['x'], L['y']): L for L in truth.labels_of(doc)}
    assert sorted((k, L['label']) for k, L in got.items()) == [((10.0, 10.0), 1), ((40.0, 40.0), 1), ((50.0, 50.0), 0), ((80.0, 80.0), 1)]
    a = got[(10.0, 10.0)]
    assert (a['decision'], a['measured'], a['length_px'], a['red_length_px'], a['width_px']) == ('approved', 'approved', 10.0, 4.0, 4.0)
    # c4 was never voted on, and u2 never approved: neither is a label
    assert (30.0, 70.0) not in got and (60.0, 20.0) not in got
    m = got[(40.0, 40.0)]
    assert m['kind'] == 'missing' and m['radius_px'] >= 12 and m['length_px'] == 8.0 and m['measured'] == 'adjusted'
    assert got[(50.0, 50.0)]['decision'] == 'rejected' and got[(50.0, 50.0)]['source'] == 'user'


def test_an_edited_candidate_is_scored_on_its_edited_lines():
    c = dict(kept('c1', approved=('c1',))[0], edited={'length': line(10, 10, 14.0)})
    got = truth.labels_of(three([c], history=False))[0]
    assert got['measured'] == 'adjusted' and got['length_px'] == 14.0 and got['red_length_px'] == 4.0
    assert got['lines']['length'] == line(10, 10, 14.0) and got['lines']['red'] == line(10, 10, 4.0)


def test_a_three_file_with_no_history_gives_positives_only():
    doc = three(kept('c1', 'c3', approved=('c1',)), history=False)
    assert [(L['label'], L['x']) for L in truth.labels_of(doc)] == [(1, 10.0)]
    # an unpacked run reads as well as a packed one
    both = [(L['label'], L['x']) for L in truth.labels_of(three(kept('c1', 'c3', 'c4', approved=('c1',)), pack=False))]
    assert sorted(both) == [(0, 50.0), (1, 10.0)]


def test_a_candidate_the_file_lacks_is_a_negative_only_where_the_history_deleted_it():
    # c2 was deleted; c3 and c4 are absent with no delete to say why (a file taken as a base lists only what it held): not known
    doc = three(kept('c1', approved=('c1',)))
    assert sorted((L['label'], L['x']) for L in truth.labels_of(doc)) == [(0, 50.0), (1, 10.0)]
    # a delete taken back leaves the candidate in the file, and it is no label
    doc = three(kept('c1', 'c2', approved=('c1',)))
    assert [(L['label'], L['x']) for L in truth.labels_of(doc)] == [(1, 10.0)]
    # a delete of a candidate the last run does not hold marks nothing
    doc = three(kept('c1', approved=('c1',)))
    doc['history']['actions'].append({'type': 'delete', 'cand': 'c9'})
    assert sorted(L['label'] for L in truth.labels_of(doc)) == [0, 1]


def test_a_two_file_is_read_as_it_always_was():
    doc = submission([MISSING, {'x': 60, 'y': 60, 'label': 0}])
    assert truth.labels_of(doc) == doc['labels']


def test_the_lab_reads_a_three_file_through_its_labels():
    labels = truth.labels_of(three(kept('c1', 'c3', 'c4', approved=('c1',)), [ADDED]))
    assert sorted((L['label'], L['x']) for L in labels) == [(0, 50.0), (1, 10.0), (1, 40.0)]
    sc = counts([cand(10, 10, length=10.0, red=4.0)], labels)
    assert (sc['tp'], sc['fn']) == (1, 1)
