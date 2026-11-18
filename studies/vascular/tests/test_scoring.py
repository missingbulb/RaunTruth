"""How the study scores a vessel model against ground truth (vascular.score, its SCORING): the overlap of the two models as
tubes, in µm of centerline. Every error at rising severity lowers F, every fix raises it, the truth scores 1 and an
empty answer 0; how a model is cut into edges changes nothing. The networks are drawn here.

Run: python3 -m pytest studies/vascular/tests/test_scoring.py
"""
import copy
import os
import random
import sys

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'algorithm'))
import vascular as S

UM = 0.55


def model(lines, **top):
    """A vessel model of edges, each (points [(x, y, z)], state, radius or None) in µm; edges that share an end
    point share its node, so three meeting there make a junction."""
    nodes, edges, ids = [], [], {}

    def node(p, r):
        key = tuple(np.round(p, 3))
        if key not in ids:
            ids[key] = len(nodes) + 1
            nodes.append(dict(id=ids[key], x=p[0], y=p[1], z=p[2], **({} if r is None else {'r': r})))
        return ids[key]
    for k, (pts, state, r) in enumerate(lines):
        via = [dict(x=p[0], y=p[1], z=p[2], **({} if r is None else {'r': r})) for p in pts[1:-1]]
        e = dict(id=k + 1, a=node(pts[0], r), b=node(pts[-1], r), state=state, via=via)
        if r is not None:
            e.update(r_a=r, r_b=r)
        edges.append(e)
    return dict(um_per_px=UM, nodes=nodes, edges=edges, **{'z_step_um': 1, **top})


def line(a, b, z=5.0, n=5):
    return [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z) for t in np.linspace(0, 1, n)]


def network(state='accepted'):
    """A small bed: a trunk with three branches off it, a wide vessel, a curved one and two islands; widths vary."""
    return [
        (line((20, 50), (100, 50)), state, 2.0), (line((100, 50), (180, 50)), state, 2.0),
        (line((180, 50), (260, 50)), state, 2.0), (line((260, 50), (340, 50)), state, 2.0),
        (line((100, 50), (100, 130)), state, 1.5), (line((180, 50), (200, 140)), state, 3.0),
        (line((260, 50), (300, 120)), state, 1.2),
        (line((30, 200), (330, 220), z=12), state, 6.0),
        ([(40, 300, 8), (90, 330, 9), (150, 300, 10), (210, 330, 11), (270, 300, 12)], state, 2.5),
        (line((300, 150), (360, 180)), state, 1.0), (line((60, 360), (160, 370), z=18), state, 4.0),
    ]


def truth_of(lines=None, **top):
    return model(lines or network(), **top)


def answer_of(lines):
    return model([(p, 'vessel', r) for p, _, r in lines])


def f(answer, truth):
    g = S.score(answer, truth)
    tp, fp, fn = g['tp'], g['fp'], g['fn']
    return 2 * tp / (2 * tp + fp + fn) if tp else 0.0


def falling(values, strictly=True):
    return all(b < a - 1e-6 if strictly else b <= a + 1e-9 for a, b in zip(values, values[1:]))


def moved(lines, dx=0.0, dy=0.0, dz=0.0, k=1.0, width=1.0):
    return [([(x * k + dx, y * k + dy, z + dz) for x, y, z in p], s, None if r is None else r * width) for p, s, r in lines]


def cut(lines, pieces):
    """The same straight vessels, each edge cut into that many edges end to end."""
    out = []
    for pts, state, r in lines:
        a, b = np.array(pts[0], float), np.array(pts[-1], float)
        at = [a + (b - a) * i / pieces for i in range(pieces + 1)]
        out += [([tuple(p), tuple(q)], state, r) for p, q in zip(at[:-1], at[1:])]
    return out


def straight(state='accepted'):
    """Straight vessels only: cutting one into edges leaves its curve exactly as it was."""
    return [(line((20, 50), (340, 50), n=2), state, 2.0), (line((100, 50), (100, 130), n=2), state, 1.5),
            (line((30, 200), (330, 220), z=12, n=2), state, 6.0), (line((60, 360), (160, 370), z=18, n=2), state, 4.0)]


def test_the_truth_itself_scores_one_and_an_empty_answer_zero():
    truth = truth_of()
    g = S.score(answer_of(network()), truth)
    assert g['fp'] == 0 and g['fn'] == 0 and g['tp'] == pytest.approx(g['truth_um'], abs=0.06)
    g = S.score(model([]), truth)
    assert g['tp'] == 0 and g['fp'] == 0 and g['fn'] == pytest.approx(g['truth_um'], abs=0.06)


def test_the_order_of_edges_and_nodes_does_not_matter():
    truth, answer = truth_of(), answer_of(moved(network()[:8], dx=1.0))
    base = S.score(answer, truth)
    for seed in range(3):
        a, t = copy.deepcopy(answer), copy.deepcopy(truth)
        rnd = random.Random(seed)
        for m in (a, t):
            rnd.shuffle(m['edges']); rnd.shuffle(m['nodes'])
            for e in m['edges'][::2]:
                e['a'], e['b'], e['via'] = e['b'], e['a'], e['via'][::-1]
        assert {k: pytest.approx(v, abs=0.02) for k, v in base.items()} == S.score(a, t)


def test_how_a_model_is_cut_into_edges_changes_nothing():
    truth = truth_of(straight())
    for answer in (straight(), moved(straight(), dx=1.0, dz=1.0, width=0.8)):
        whole = S.score(answer_of(answer), truth)
        for pieces in (2, 3, 7):
            assert {k: pytest.approx(v, abs=0.05) for k, v in whole.items()} == S.score(answer_of(cut(answer, pieces)), truth)
            assert {k: pytest.approx(v, abs=0.05) for k, v in whole.items()} == S.score(answer_of(answer), truth_of(cut(straight(), pieces)))


def test_each_vessel_missed_lowers_the_score_and_each_restored_raises_it():
    truth, net = truth_of(), network()
    assert falling([f(answer_of(net[:n]), truth) for n in (11, 10, 8, 5, 2, 0)])


def test_each_vessel_invented_lowers_the_score_and_a_longer_one_lowers_it_more():
    truth, net = truth_of(), network()
    extra = [(line((20, 100), (80, 160)), 'vessel', 2.0), (line((220, 250), (330, 270)), 'vessel', 2.0),
             (line((350, 20), (390, 140)), 'vessel', 2.0)]
    assert falling([f(answer_of(net + extra[:n]), truth) for n in range(4)])
    assert falling([f(answer_of(net + [(line((20, 100), (20 + L, 100 + L)), 'vessel', 2.0)]), truth) for L in (0, 5, 20, 60)])


def test_a_vessel_found_in_part_scores_by_how_much_of_it_is_found_and_a_gap_by_its_length():
    truth, net = truth_of(), network()
    rest = net[:7] + net[8:]
    part = lambda lo, hi: (line((30 + 300 * lo, 200 + 20 * lo), (30 + 300 * hi, 200 + 20 * hi), z=12), 'vessel', 6.0)
    assert falling([f(answer_of(rest + ([part(0, s)] if s else [])), truth) for s in (1, .8, .5, .2, 0)])
    assert falling([f(answer_of(rest + [part(0, .5 - g), part(.5 + g, 1)]), truth) for g in (0, .01, .05, .2)])


def test_a_tube_offset_in_the_plane_scores_less_the_further_and_keeps_most_of_its_credit_when_slightly_off():
    truth, net = truth_of(), network()
    scores = [f(answer_of(moved(net, dx=d, dy=d)), truth) for d in (0, .2, .5, 1, 2, 4, 8, 16, 32)]
    assert falling(scores) and scores[1] > 0.85 and scores[-1] < 0.05
    assert falling([f(answer_of(moved(net, k=k)), truth) for k in (1, 1.01, 1.03, 1.08, 1.2)])


def test_a_tube_offset_in_depth_scores_less_the_further_by_the_µm_between_slices():
    truth, net = truth_of(), network()
    scores = [f(answer_of(moved(net, dz=d)), truth) for d in (0, .5, 1, 2, 4, 8, 16)]
    assert falling(scores) and scores[1] > 0.7
    # the same slices twice as far apart are twice the offset
    deep = truth_of(z_step_um=2)
    assert f(answer_of(moved(net, dz=1)), deep) == pytest.approx(f(answer_of(moved(net, dz=2)), truth), abs=0.01)
    # without the µm between slices depth cannot be placed, and is left out
    assert f(answer_of(moved(net, dz=5)), truth_of(z_step_um=None)) == pytest.approx(1.0, abs=1e-4)


def test_a_tube_too_thin_or_too_wide_scores_less_the_more_it_is_off_and_keeps_most_when_slightly_off():
    truth, net = truth_of(), network()
    thin = [f(answer_of(moved(net, width=w)), truth) for w in (1, .9, .75, .5, .25)]
    wide = [f(answer_of(moved(net, width=w)), truth) for w in (1, 1.1, 1.3, 2, 4, 8)]
    assert falling(thin) and falling(wide) and thin[1] > 0.85 and wide[1] > 0.85
    # too thin leaves the truth's tube uncovered (fn); too wide puts the answer's outside it (fp), a quarter of it
    # in the tube, the rest within twice its diameter and so counted half
    g = S.score(answer_of(moved(net, width=.5)), truth)
    assert g['fp'] < 0.005 * g['answer_um'] and g['fn'] == pytest.approx(.75 * g['truth_um'], rel=0.02)
    g = S.score(answer_of(moved(net, width=2)), truth)
    assert g['fn'] < 0.005 * g['truth_um'] and g['fp'] == pytest.approx(.375 * g['answer_um'], rel=0.02)


def test_what_the_tubes_leave_unmatched_counts_half_within_twice_the_truth_s_diameter_and_a_quarter_within_four_times():
    # a 3 µm-radius truth vessel and a 1 µm-radius tracing beside it, wholly outside the tube at each distance
    truth = truth_of([(line((20, 100), (220, 100), n=2), 'accepted', 3.0)])
    beside = lambda d: answer_of([(line((20, 100 + d), (220, 100 + d), n=2), 'vessel', 1.0)])
    for d, worth in ((0, 1.0), (1.9, 1.0), (4.5, .5), (4.9, .5), (9, .25), (10.9, .25), (13.1, 0.0)):
        g = S.score(beside(d), truth)
        assert g['fp'] == pytest.approx(200 * (1 - worth), abs=0.5), d
        # the truth's own tube is found by what of the tracing's disc that width holds, over its own disc
        assert g['tp'] == pytest.approx(200 * worth / 9, abs=0.5), d
    # between the tiers the credit runs smoothly: no step as a tracing nears the vessel
    scores = [f(beside(d), truth) for d in np.arange(14, -.01, -.25)]
    assert falling(scores[::-1], strictly=False) and max(np.diff(scores)) < 0.03 and scores[0] == 0


def test_a_vessel_with_no_width_takes_that_of_the_vessels_it_joins_else_the_model_s_mean():
    trunk, wide = (line((20, 50), (180, 50), n=2), 'accepted', 3.0), (line((20, 150), (180, 150), n=2), 'accepted', 5.0)
    branch = lambda r: (line((180, 50), (180, 120), n=2), 'accepted', r)
    island = lambda r: (line((20, 250), (180, 250), n=2), 'accepted', r)

    def bare(m, k):
        """The model with edge k's widths taken out, and those of the points only it touches."""
        e = m['edges'][k]
        e.pop('r_a'); e.pop('r_b')
        for n in m['nodes']:
            if n['id'] in (e['a'], e['b']) and sum(n['id'] in (x['a'], x['b']) for x in m['edges']) == 1:
                n.pop('r')
        return m
    # the branch joins the trunk (3 µm): scored as a 3 µm vessel
    truth = bare(truth_of([trunk, wide, branch(9.0)]), 2)
    assert f(answer_of([trunk, wide, branch(3.0)]), truth) == pytest.approx(1.0, abs=1e-4)
    assert f(answer_of([trunk, wide, branch(1.5)]), truth) < 0.95
    # the island joins nothing: the mean of the model's vessels, by length (3 and 5 µm, as long as each other)
    truth = bare(truth_of([trunk, wide, island(9.0)]), 2)
    assert f(answer_of([trunk, wide, island(4.0)]), truth) == pytest.approx(1.0, abs=1e-4)
    assert f(answer_of([trunk, wide, island(2.0)]), truth) < 0.95


def test_a_width_a_person_set_on_a_vessel_is_its_width():
    net = network()
    truth = truth_of()
    truth['edges'][7]['width'] = dict(um=6.0, how='nudge')
    truth['edges'][8]['width'] = dict(how='looked')
    as_set = [(p, st, 3.0 if k == 7 else r) for k, (p, st, r) in enumerate(net)]
    assert f(answer_of(as_set), truth) == pytest.approx(1.0, abs=1e-4) and f(answer_of(net), truth) < 0.99


def test_a_pair_barely_touching_costs_about_what_the_two_cost_apart():
    truth = truth_of([network()[7]])
    scores = [f(answer_of(moved([network()[7]], dy=d)), truth) for d in (28, 29.9, 30.1, 150)]
    assert scores[0] < 0.05 and scores[1] < 0.001 and scores[2] == 0 and scores[3] == 0


def test_a_vessel_traced_twice_counts_once():
    truth, net = truth_of(), network()
    twin = lambda dy: (line((30, 200 + dy), (330, 220 + dy), z=12), 'vessel', 6.0)
    scores = [f(answer_of(net), truth), f(answer_of(net + [twin(0)]), truth), f(answer_of(net + [twin(0), twin(1)]), truth)]
    assert falling(scores)
    g, once = S.score(answer_of(net + [twin(0)]), truth), S.score(answer_of(net), truth)
    assert g['tp'] == pytest.approx(once['tp'], abs=0.1) and g['fp'] == pytest.approx(300.7, rel=0.02)


def test_a_vessel_crossing_another_is_found_only_where_the_tubes_meet():
    truth = truth_of([(line((100, 20), (100, 180)), 'accepted', 2.0)])
    g = S.score(answer_of([(line((20, 100), (180, 100)), 'vessel', 2.0)]), truth)
    assert g['tp'] < 0.06 * g['truth_um'] and g['fp'] > 0.94 * g['answer_um']
    # at another depth the tubes do not meet at all
    g = S.score(answer_of([(line((20, 100), (180, 100), z=20), 'vessel', 2.0)]), truth)
    assert g['tp'] == 0


def test_every_fix_of_one_error_raises_the_score():
    truth, net = truth_of(), network()
    bad = moved(net[:6], dx=1.5, width=1.4) + [(line((20, 100), (80, 160)), 'vessel', 2.0),
                                              (line((30, 201), (150, 209), z=12), 'vessel', 6.0),
                                              (line((170, 210), (330, 221), z=3), 'vessel', 6.0)]
    steps = [bad]
    steps.append(steps[-1][:6] + steps[-1][7:])                                     # the invented vessel removed
    steps.append(moved(steps[-1][:6], dx=-1.5) + steps[-1][6:])                     # the shift undone
    steps.append(moved(steps[-1][:6], width=1 / 1.4) + steps[-1][6:])               # the widths corrected
    steps.append(steps[-1][:7] + [(line((170, 210), (330, 221), z=12), 'vessel', 6.0)])   # the depth corrected
    steps.append(steps[-1][:6] + [net[7]])                                          # the gap bridged
    steps.append(steps[-1] + [net[6]])                                              # a missed vessel added
    steps.append(steps[-1] + net[8:])                                               # the rest added
    scores = [f(answer_of(s), truth) for s in steps]
    assert falling(scores[::-1]) and scores[-1] == pytest.approx(1.0, abs=1e-4)


def test_a_candidate_of_the_answer_is_not_a_vessel_of_its_model():
    truth, net = truth_of(), network()
    unsure = model([(p, 'candidate' if k == 7 else 'vessel', r) for k, (p, _, r) in enumerate(net)])
    assert S.score(unsure, truth) == S.score(answer_of(net[:7] + net[8:]), truth)
    false = model([(p, 'vessel', r) for p, _, r in net] + [(line((20, 100), (80, 160)), 'candidate', 2.0)])
    assert f(false, truth) == pytest.approx(1.0, abs=1e-4)


def test_the_ground_truth_s_vessels_are_its_accepted_and_vessel_edges_and_nothing_is_undecided():
    net = network()
    with_it, without = answer_of(net), answer_of(net[:7] + net[8:])
    for state in ('rejected', 'candidate'):
        truth = truth_of(net[:7] + [(net[7][0], state, 6.0)] + net[8:])
        assert f(without, truth) == pytest.approx(1.0, abs=1e-4) and f(with_it, truth) < 0.95
    for state in ('vessel', 'accepted'):
        truth = truth_of(net[:7] + [(net[7][0], state, 6.0)] + net[8:])
        assert f(with_it, truth) == pytest.approx(1.0, abs=1e-4) and f(without, truth) < 0.95


def test_reviewed_areas_gate_nothing():
    net = network()
    top = [dict(x=[0, 400], y=[0, 170], z=[0, 23])]
    truth = model(net, reviewed_regions=top)
    assert f(answer_of(net + [(line((220, 250), (330, 270)), 'vessel', 2.0)]), truth) < 0.98
    assert f(answer_of(net[:7] + net[8:]), truth) < 0.95
    assert S.score(answer_of(net[:9]), truth) == S.score(answer_of(net[:9]), truth_of())


def test_an_excluded_area_is_left_out_on_both_sides():
    net = network()
    damaged = [dict(polygon=[[0, 180], [400, 180], [400, 260], [0, 260]], reason='torn')]
    truth = truth_of(excluded_regions=damaged)
    assert f(answer_of(net[:7] + net[8:]), truth) == pytest.approx(1.0, abs=1e-4)
    assert f(answer_of(net + [(line((220, 235), (330, 250)), 'vessel', 2.0)]), truth) == pytest.approx(1.0, abs=1e-4)


def test_the_provisional_labels_are_scored_inside_their_tiles_as_vessels_without_width_or_depth():
    curve = lambda y: [[x, y] for x in range(10, 91, 4)]
    truth = dict(tiles=[dict(box_um=[0, 0, 100, 100], missed=[[[10, 90], [90, 90]]], curves=[
        dict(verdict='vessel', curve_um=curve(10)), dict(verdict='vessel', curve_um=curve(30)),
        dict(verdict='not', curve_um=curve(50)), dict(verdict='unsure', curve_um=curve(70))])])
    flat = lambda y, state='vessel', x1=90: (line((10, y), (x1, y)), state, 2.5)
    g = S.score(model([flat(10), flat(50), flat(30, 'candidate'), flat(90), flat(120, x1=190)]), truth)
    # the judged vessel and the missed line found, the other vessel not (a candidate), the non-vessel traced;
    # what lies outside the tile is not judged
    assert g['truth_um'] == pytest.approx(240, abs=0.5) and g['answer_um'] == pytest.approx(240, abs=0.5)
    assert (g['tp'], g['fn'], g['fp']) == (pytest.approx(160, abs=0.5), pytest.approx(80, abs=0.5), pytest.approx(80, abs=0.5))


def test_scoring_states_the_scorer_s_own_numbers():
    assert f'{S.STEP_UM:g} µm steps' in S.SCORING and f'{S.BARE_RADIUS_UM:g} µm radius' in S.SCORING
    assert S.TIERS == ((1, 1.0), (2, .5), (4, .25))
    assert 'counts ½ where it is inside that tube widened to twice its diameter, and ¼ where inside four times' in S.SCORING
    assert 'a candidate is not one' in S.SCORING and 'depth by the µm between slices' in S.SCORING
