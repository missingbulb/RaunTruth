"""The Bookshelf Reader's score: how one answer (boxes and titles, found in one go) did against one ground-truth file.

    score(answer, truth, damaged=()) -> {tp, fp, fn, ...}      SCORING: the same, as the page shows it

answer: {"books": [{"corners": four [x, y] in image pixels, "title": str or None}]}
truth:  the ground-truth file as submitted: {"books": [{"verdict", "corners", "text"}]}. A book's verdict, corners
        and text are all that is read of it.
"""
import unicodedata
from collections import Counter

import numpy as np

# What the box and the title each weigh in a book that has a title: the algorithm returns both results in one go,
# and neither is the lesser one. Stated, the owner's to change.
BOX, TITLE = 0.5, 0.5
# Two titles "match" from this share of letter pairs up. Measured on the six photos, three finders and the lines
# reader: of 11,014 pairs of a read title and the true title of a book elsewhere in the photo, 99 in 100 share less
# than 0.21, and half the pairs of a read title and its own book's share more than 0.38. It only orders the pairing;
# credit is never cut at it.
TITLE_MATCH = 0.3
# An unpaired box is not counted at all when more than this share of it lies on books marked undecided: the majority
# of the box, as panoptic quality drops a segment lying mostly on unlabelled ground.
UNDECIDED = 0.5


def area(c):
    x, y = np.asarray(c, float).T
    return abs(float(x @ np.roll(y, -1) - y @ np.roll(x, -1))) / 2


def clip(c, by):
    """The part of polygon c inside convex polygon by, either way round: Sutherland and Hodgman's clipping."""
    x, y = np.asarray(by, float).T
    sign = 1 if float(x @ np.roll(y, -1) - y @ np.roll(x, -1)) > 0 else -1
    out = [tuple(p) for p in c]
    for (ax, ay), (bx, by_) in zip(by, list(by[1:]) + [by[0]]):
        side = lambda p: sign * ((bx - ax) * (p[1] - ay) - (by_ - ay) * (p[0] - ax))
        pts, out = out, []
        for p, q in zip(pts, pts[1:] + pts[:1]):
            sp, sq = side(p), side(q)
            if sp >= 0:
                out.append(p)
            if sp * sq < 0:
                f = sp / (sp - sq)
                out.append((p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1])))
        if not out:
            return []
    return out


def overlap(a, b):
    """The area two boxes share."""
    if (max(p[0] for p in a) < min(p[0] for p in b) or max(p[0] for p in b) < min(p[0] for p in a)
            or max(p[1] for p in a) < min(p[1] for p in b) or max(p[1] for p in b) < min(p[1] for p in a)):
        return 0.0
    both = clip(a, b)
    return area(both) if len(both) >= 3 else 0.0


def new_cover(box, book, covered):
    """The area of the book the box covers that `covered` (its pair's box, or None) does not."""
    on = clip(box, book)
    if len(on) < 3:
        return 0.0
    if covered is None:
        return area(on)
    both = clip(on, covered)
    return area(on) - (area(both) if len(both) >= 3 else 0.0)


def letters(title):
    """A title as it is compared: its letters and digits alone, case folded."""
    return ''.join(ch for ch in unicodedata.normalize('NFKC', title or '').casefold() if ch.isalnum())


def pairs_of(title):
    """The letter pairs of a title, its spaces closed up: what two titles share whatever order their words were read
    in, but for the pair at each join. A title of one letter is that letter."""
    s = letters(title)
    return Counter(zip(s, s[1:])) if len(s) > 1 else Counter(s)


def part(shared, true, said):
    """(tp, fp, fn) of one result of one paired book, each 0 to 1: the share of the union both hold, the share of
    what was said that the truth does not hold, the share of the truth that was not said."""
    if shared <= 0:
        return 0.0, 1.0 if said > 0 else 0.0, 1.0 if true > 0 else 0.0
    return shared / (true + said - shared), max(0.0, 1 - shared / said), max(0.0, 1 - shared / true)


def inside(poly, x, y):
    """Whether x, y lies inside the polygon [[x, y], ...]: a ray from it crosses the border an odd number of times."""
    k = False
    for (x0, y0), (x1, y1) in zip(poly, list(poly[1:]) + [poly[0]]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            k = not k
    return k


def score(answer, truth, damaged=()):
    """The answer against the truth, every book of either whose box centre lies in a damaged area (outlines in the
    photo's pixels) left out."""
    def kept(b):
        x, y = np.asarray(b['corners'], float).mean(axis=0)
        return not any(inside(p, x, y) for p in damaged or ())
    books = [b for b in truth['books'] if kept(b)]
    right = [b for b in books if b.get('verdict') == 'right']
    undecided = [b['corners'] for b in books if b.get('verdict') is None]
    found = [b for b in answer['books'] if kept(b)]
    T, A = [b['corners'] for b in right], [b['corners'] for b in found]
    t_area, a_area = [area(c) for c in T], [area(c) for c in A]
    t_name, a_name = [pairs_of(b.get('text')) for b in right], [pairs_of(b.get('title')) for b in found]

    def pair(i, j):
        """What book i of the truth and box j of the answer are worth as one book."""
        box = part(overlap(T[i], A[j]), t_area[i], a_area[j])
        n, m = sum(t_name[i].values()), sum(a_name[j].values())
        if not n:
            # a true book with no title says nothing of the reading: its box is all it is scored on
            return dict(iou=box[0], title=None, tp=box[0], fp=box[1], fn=box[2])
        name = part(sum((t_name[i] & a_name[j]).values()), n, m)
        tp, fp, fn = (BOX * b + TITLE * t for b, t in zip(box, name))
        return dict(iou=box[0], title=name[0], tp=tp, fp=fp, fn=fn)

    every = {(i, j): pair(i, j) for i in range(len(T)) for j in range(len(A))}
    done_t, done_a, pairs = set(), set(), []

    def take(candidates, stage):
        # the best first; a tie goes to the same pair whatever order the books came in
        for _, _, i, j in sorted(candidates, key=lambda c: (-c[0], T[c[2]], A[c[3]])):
            if i not in done_t and j not in done_a:
                done_t.add(i), done_a.add(j)
                pairs.append(dict(truth=i, answer=j, stage=stage, **every[i, j]))

    take([(p['tp'], 0, i, j) for (i, j), p in every.items() if p['title'] is not None and p['title'] >= TITLE_MATCH], 'title')
    take([(p['iou'], 0, i, j) for (i, j), p in every.items() if p['iou'] > 0], 'box')

    missed = [i for i in range(len(T)) if i not in done_t]
    loose = [j for j in range(len(A)) if j not in done_a]
    ignored = [j for j in loose if a_area[j] > 0 and sum(overlap(A[j], u) for u in undecided) / a_area[j] > UNDECIDED]
    invented = [j for j in loose if j not in ignored]
    # a box left over costs the share of it that covers no part of a true book its pair left uncovered: the spare
    # half of a split book costs little, a box on bare shelf or a second box on a book already covered costs 1
    paired = {p['truth']: p['answer'] for p in pairs}
    spare = {j: 1 - min(1.0, sum(new_cover(A[j], T[i], A[paired[i]] if i in paired else None) for i in range(len(T)))
                         / a_area[j]) if a_area[j] > 0 else 1.0 for j in invented}
    return dict(tp=float(sum(p['tp'] for p in pairs)),
                fp=float(sum(p['fp'] for p in pairs) + sum(spare.values())),
                fn=float(sum(p['fn'] for p in pairs) + len(missed)),
                truth=len(T), found=len(A), pairs=pairs, missed=missed, invented=invented, ignored=ignored)


SCORING = f"""- **A book** is a box and its title. Truth is every book marked right; its box and its text are all that count.
- **Compare two boxes** by area: `overlap` = area both cover.
  - right = `overlap / union`, overshot = share of the found box off the book, missed = share of the book not covered
- **Compare two titles** by letter pairs (letters and digits only, any word order): the same three shares.
- **Pair** found books with true books, each used once:
  1. titles that match (share {TITLE_MATCH:g} of their letter pairs or more), the best box-and-title first
  2. then the rest by box alone, the largest `overlap / union` first, any overlap at all
- **Each pair adds** to tp, fp, fn:
  - the true book has a title: `{BOX:g} × box + {TITLE:g} × title` (no title read: the title half is all fn)
  - the true book has no title: the box alone, whatever was read, so a perfect box is a perfect book
- **A true book left unpaired** adds 1 to fn
- **A found box left unpaired** adds to fp the share of it that covers no part of a true book its pair left uncovered
  - the spare half of a split book costs little; a box on bare shelf, or a second box on a covered book, costs 1
  - not counted at all when more than {UNDECIDED:g} of it lies on books marked undecided
- **A damaged area**: a book of either side whose box centre lies in one is left out
- precision = `tp / (tp + fp)`, recall = `tp / (tp + fn)`, summed over the photos
"""
