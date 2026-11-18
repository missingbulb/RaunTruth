"""How the study scores a vessel model against ground truth (vascular.score, its SCORING): against a corrected vessel
model, inside the areas it marks reviewed, and against the lab's provisional labels.

Run: python3 -m pytest studies/vascular/tests/test_scoring.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
import vascular  # noqa: E402

UM = 0.5


def model(lines, **top):
    """A vessel model of straight edges, each (x0, y0, x1, y1) in µm with its state."""
    nodes, edges = [], []
    for k, (x0, y0, x1, y1, state) in enumerate(lines):
        nodes += [dict(id=2 * k + 1, x=x0, y=y0, z=1, r=1.0), dict(id=2 * k + 2, x=x1, y=y1, z=1, r=1.0)]
        edges.append(dict(id=k + 1, a=2 * k + 1, b=2 * k + 2, state=state, via=[]))
    return dict(um_per_px=UM, nodes=nodes, edges=edges, **top)


REVIEWED = [dict(x=[0, 100], y=[0, 100], z=[0, 3])]


def test_a_ground_truth_vessel_found_missed_and_a_vessel_of_the_model_matching_none_are_counted():
    truth = model([(10, 10, 90, 10, 'accepted'), (10, 50, 90, 50, 'vessel')], reviewed_regions=REVIEWED)
    answer = model([(10, 11, 90, 11, 'vessel'), (10, 80, 90, 80, 'vessel')])
    assert vascular.score(answer, truth) == dict(tp=1, fp=1, fn=1)


def test_only_the_reviewed_areas_count_and_a_rejected_edge_is_no_vessel():
    truth = model([(10, 10, 90, 10, 'rejected'), (110, 50, 190, 50, 'accepted')], reviewed_regions=REVIEWED)
    answer = model([(10, 10, 90, 10, 'vessel'), (110, 80, 190, 80, 'vessel')])
    # the rejected edge the model traces is a false vessel; nothing outside the reviewed box counts either way
    assert vascular.score(answer, truth) == dict(tp=0, fp=1, fn=0)


def test_a_candidate_the_ground_truth_leaves_undecided_counts_neither_way_and_neither_do_the_model_s():
    truth = model([(10, 10, 90, 10, 'candidate')], reviewed_regions=REVIEWED)
    answer = model([(10, 10, 90, 10, 'vessel'), (10, 60, 90, 60, 'candidate')])
    assert vascular.score(answer, truth) == dict(tp=0, fp=0, fn=0)


def test_against_the_provisional_labels_a_kept_non_vessel_is_false_and_unsure_curves_are_left_out():
    truth = dict(tiles=[dict(box_um=[0, 0, 100, 100], missed=[[[10, 90], [90, 90]]], curves=[
        dict(verdict='vessel', curve_um=[[10, 10], [90, 10]]), dict(verdict='vessel', curve_um=[[10, 30], [90, 30]]),
        dict(verdict='not', curve_um=[[10, 50], [90, 50]]), dict(verdict='unsure', curve_um=[[10, 70], [90, 70]])])])
    answer = model([(10, 10, 90, 10, 'vessel'), (10, 50, 90, 50, 'vessel'), (10, 70, 90, 70, 'vessel'),
                    (10, 30, 90, 30, 'candidate'), (10, 91, 90, 91, 'vessel')])
    assert vascular.score(answer, truth) == dict(tp=1, fp=1, fn=1, missed_found=1, missed=1)
