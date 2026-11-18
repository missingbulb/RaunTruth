"""Stand-ins for the services the study's versions ask for (study.json `services`), for tests that run a version end
to end without the engines: no text anywhere, nothing read, no word list. `drive` runs a version as the lab does."""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'lab'))
from study import drive  # noqa: E402,F401

STAND_IN = {
    'det': lambda tensor: np.zeros(np.shape(tensor)[2:], np.float32),
    'tesseract': lambda image, langs: dict(text='', confidence=0.0),
    'words': lambda: '',
}
