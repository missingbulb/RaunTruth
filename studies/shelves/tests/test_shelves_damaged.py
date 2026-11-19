"""req/shelves/books/damaged — Find books analyses no pixel of a damaged area; a box may still reach into one, and the
scorer counts no book centred in one."""
import os
import sys

import numpy as np
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'lab'))
import shelves
from score import score
from study import drive
from test_score import as_answer, shelf

# a square in the photo's middle, in its pixels
SQUARE = [[[60, 40], [140, 40], [140, 120], [60, 120]]]


def photo(inside):
    """A shelf-like photo: stripes, with `inside` painted over the square."""
    rgb = np.zeros((160, 200, 3), np.uint8)
    rgb[:, ::10] = 200
    rgb[40:120, 60:140] = inside
    return rgb


@pytest.mark.parametrize('reads_text', [False, True])
def test_a_version_sees_nothing_of_what_lies_in_a_damaged_area(reads_text):
    seen = []

    def find(rgb, text):
        seen.append(rgb.copy())
        return []
    run = shelves.version(find, reads_text)
    services = {'det': lambda *a: None, 'words': lambda *a: None}
    for inside in (0, 255, (255, 0, 0)):
        drive(run(photo(inside), damaged=SQUARE), services)
    assert len(seen) == 3 and all(np.array_equal(seen[0], s) for s in seen)
    # and what lies outside it is the photo itself
    assert np.array_equal(seen[0][:, :50], photo(0)[:, :50])
    drive(run(photo(0)), services)
    drive(run(photo(255)), services)
    assert not np.array_equal(seen[-1], seen[-2]), 'without a damaged area, the square is seen'


def test_the_scorer_counts_no_book_centred_in_a_damaged_area():
    truth = shelf()
    answer = as_answer(truth)
    # the first book missed, and a box invented beside the shelf
    first, answer['books'] = truth['books'][0], answer['books'][1:] + [dict(corners=[[1500, 200], [1560, 200], [1560, 900], [1500, 900]], title='acme')]
    whole = score(answer, truth)
    assert whole['fn'] >= 1 and whole['fp'] >= 1
    xs, ys = np.asarray(first['corners'], float).T
    around = lambda x, y: [[x - 5, y - 5], [x + 5, y - 5], [x + 5, y + 5], [x - 5, y + 5]]
    cut = score(answer, truth, damaged=[around(xs.mean(), ys.mean()), around(1530, 550)])
    assert (cut['fp'], cut['fn']) == (pytest.approx(0), pytest.approx(0)) and cut['truth'] == len(truth['books']) - 1
