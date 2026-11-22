"""A study's stage, as its study file says it (lab/stage).

    python3 lab/stage.py STUDY                   # print the stage: unknown while the study file names none
    python3 lab/stage.py STUDY --stop-if-frozen  # also exit 3, saying so, in Review and Public

Exit 2 while RAUNTRUTH_STUDY_<STUDY> is not set. An unattended task that would change a study's algorithm or scores
asks this first: from Review on the study is frozen.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch

FROZEN_EXIT = 3


def main(argv=None, transport=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study')
    ap.add_argument('--stop-if-frozen', action='store_true')
    a = ap.parse_args(argv)
    sf = fetch.study_file(a.study, transport)
    print(sf.stage_line())
    if a.stop_if_frozen and sf.frozen:
        print(sf.frozen_message(f'the unattended run on {a.study}'))
        return FROZEN_EXIT
    return 0


if __name__ == '__main__':
    sys.exit(main())
