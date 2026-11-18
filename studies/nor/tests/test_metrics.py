"""R11: every finder's precision and recall on the ground truth, at its own filters and at each preset, are on record
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
            assert r['tp'] + r['fn'] == v['tp'] + v['fn']
            assert r['precision'] == round(r['tp'] / (r['tp'] + r['fp']), 4)
            assert r['recall'] == round(r['tp'] / (r['tp'] + r['fn']), 4)


def test_the_presets_are_the_lab_s_settings():
    for f in controls.FINDERS:
        assert nor_finder.SETTINGS[f]['precise'] == dict(values=controls.preset_values(f, 'precise'))
        assert nor_finder.SETTINGS[f]['recalling'] == dict(values=controls.preset_values(f, 'recalling'))
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


def test_recall_falls_from_recalling_to_precise():
    for f, v in doc()['versions'].items():
        s = v['settings']
        assert s['recalling']['recall'] >= v['recall'] >= s['precise']['recall'], f


def test_filters_only_remove():
    """A filter can only reject what the finder proposed, so no preset finds a real spot the finder did not."""
    for f, v in doc()['versions'].items():
        top = v['settings']['unfiltered']['tp']
        assert all(r['tp'] <= top for r in [v, v['settings']['precise'], v['settings']['recalling']]), f
