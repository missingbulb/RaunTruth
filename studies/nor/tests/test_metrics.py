"""R11: every finder's precision and recall on the ground truth, as the page runs it (one filter on) and at each
preset, are on record
in the lab's metrics file (lab/run.py nor --write), and the presets move every filter the way their names say."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
import controls
import nor_finder

REGENERATE = 'run python3 lab/run.py nor --write and commit web/algorithm_metrics.json'


def doc():
    with open(os.path.join(HERE, '..', 'web', 'algorithm_metrics.json')) as f:
        return json.load(f)


def test_every_finder_and_setting_is_on_record():
    d = doc()
    assert d['format'] == 'rauntruth-metrics/1'
    assert list(d['versions']) == list(nor_finder.VERSIONS), f'the page offers other finders: {REGENERATE}'
    assert d['scoring'] == nor_finder.SCORING, f'the scoring changed: {REGENERATE}'
    for f, v in d['versions'].items():
        assert sorted(v['settings']) == sorted(nor_finder.SETTINGS[f]), f
    assert all(len(im['image_sha256']) == 64 and len(im['truth_sha256']) == 64 for im in d['images'])


def test_counts_cover_the_labels():
    for v in doc()['versions'].values():
        for r in [v, *v['settings'].values()]:
            # soft counts: a NoR is split between tp and fn, so the two still sum to the NoRs marked
            assert abs(r['tp'] + r['fn'] - (v['tp'] + v['fn'])) < 1e-4
            assert abs(r['precision'] - r['tp'] / (r['tp'] + r['fp'])) < 1e-4
            assert abs(r['recall'] - r['tp'] / (r['tp'] + r['fn'])) < 1e-4


def test_the_presets_are_the_lab_s_settings():
    # the presets are every filter on at their values; unfiltered, none on
    for f in controls.FINDERS:
        for p in controls.PRESETS:
            assert nor_finder.SETTINGS[f][p] == dict(values=controls.preset_values(f, p), off=[]), (f, p)
        assert sorted(nor_finder.SETTINGS[f]['unfiltered']['off']) == sorted(k['key'] for k in controls.filters(controls.FINDERS[f][1]))
        assert controls.preset_values(f, 'balanced') == controls.own_values(f)


def test_precise_is_stricter_and_recalling_looser_in_every_filter():
    for f in controls.FINDERS:
        own, hi, lo = controls.own_values(f), controls.preset_values(f, 'precise'), controls.preset_values(f, 'recalling')
        for k, v in own.items():
            if k in controls.OFF and v == controls.OFF[k]:
                assert hi[k] == lo[k] == v, f'{f} {k}: a filter the finder leaves off stays off'
                continue
            up = controls.STRICT[k] > controls.LOOSE[k]
            assert (hi[k] > v > lo[k]) if up else (hi[k] < v < lo[k]), f'{f} {k}: {lo[k]} {v} {hi[k]}'


def test_recall_falls_from_no_filter_to_precise():
    for f, v in doc()['versions'].items():
        s = v['settings']
        # rf picks between alternative greens using the checks, so a filter on can find a better one than none does
        assert f not in controls.EXACT_REFILTER or s['unfiltered']['recall'] >= v['recall'], f
        assert v['recall'] >= s['recalling']['recall'] >= s['balanced']['recall'] >= s['precise']['recall'], f


def test_filters_only_remove():
    """A filter can only reject what the finder proposed, so no preset finds a real spot the finder did not."""
    for f, v in doc()['versions'].items():
        if f not in controls.EXACT_REFILTER:
            continue  # rf picks between alternative greens using the checks, so its filters do more than remove
        top = v['settings']['unfiltered']['tp']
        # the soft pairing takes the closest pairs first, so a candidate removed can let a truth NoR pair a hair better
        assert all(r['tp'] <= top + 0.01 for r in [v, *v['settings'].values()]), f
