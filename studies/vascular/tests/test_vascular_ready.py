"""req/vascular/model/run: the study's Python loads, and a stack opens, without loading the extraction versions or
scipy, each checked in a Python of its own."""
import json
import os
import subprocess
import sys

import pytest

pytestmark = pytest.mark.full

STUDY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def loaded_after(code):
    """The modules a fresh Python holds after code runs with the study's folders on its path."""
    paths = [os.path.join(STUDY, 'algorithm')]
    run = f'import sys; sys.path[:0] = {paths!r}\n{code}\nimport json; print(json.dumps(sorted(sys.modules)))'
    return set(json.loads(subprocess.run([sys.executable, '-c', run], capture_output=True, text=True, check=True, timeout=120).stdout.splitlines()[-1]))


def test_python_loads_and_a_stack_opens_without_the_versions_or_scipy(tmp_path):
    import numpy as np
    import tifffile
    path = str(tmp_path / 'stack.tif')
    tifffile.imwrite(path, np.zeros((3, 8, 8), np.uint16), imagej=True, resolution=(2, 2), metadata={'unit': 'micron', 'axes': 'ZYX'})
    got = loaded_after(f'import vascular; image = vascular.read({path!r}); assert image["cd31"].shape == (3, 8, 8) and image["um"] == 0.5')
    assert not {'scipy', 'skimage', 'vessel_model', 'evidence', 'v5_no_short_islands'} & got

