"""req/shell/ground-truth/areas: the shell's walk through a study's areas (web/gt_areas.js), for every count its Areas menu
offers, under Node (gt_areas_cases.mjs), and the count each study starts at. No page is involved."""
import glob
import json
import os
import shutil

import pytest

pytestmark = pytest.mark.full
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
from drivers import run_driver
NODE = shutil.which('node')
needs_node = pytest.mark.skipif(not NODE, reason='node missing')


@needs_node
def test_the_walk_through_the_areas():
    r = run_driver(os.path.join(HERE, 'gt_areas_cases.mjs'), timeout=60, check=False)
    assert r.returncode == 0, r.stdout + r.stderr


@needs_node
def test_a_study_walking_by_areas_starts_at_a_count_the_shell_offers():
    js = 'import(process.argv[1]).then((m) => console.log(JSON.stringify(m.COUNTS)))'
    counts = json.loads(run_driver(None, os.path.join(ROOT, 'web', 'gt_areas.js'), node_args=['-e', js], timeout=60).stdout)
    studies = [json.load(open(p)) for p in sorted(glob.glob(os.path.join(ROOT, 'studies', '*', 'study.json')))]
    named = {m['id']: m['groundTruth']['areas'] for m in studies if 'areas' in (m.get('groundTruth') or {})}
    assert len(named) >= 2, f'the sweep reads no study that walks by areas: {named}'
    assert all(n in counts for n in named.values()), f'{named} against the menu {counts}'
