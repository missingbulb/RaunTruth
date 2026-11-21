"""The repo's files the test image is built from (req/checks/ci-sets/one-image), and what it takes in from them: the
image's own files, the Python packages, the libraries the page pins, and what each study names for its Python and its
services. A hash of what it takes in names the image, so a change to any of it builds a new one, and a change to the
page's code or a study's other settings builds none.
  python3 dev/tools/test-image/inputs.py --tag            print the image's tag
  python3 dev/tools/test-image/inputs.py --context DIR    copy them into DIR, laid out as the repo is, to build the image from"""
import fnmatch
import glob
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'web-tests'))
import page_libraries  # noqa: E402 - found beside the page tests, once their folder is on the path
INPUTS = (
    # the build's own files; the rest of this folder is what a run does with the image
    'dev/tools/test-image/Dockerfile', 'dev/tools/test-image/prepare.sh',
    'requirements.txt',
    # the page's libraries and the Pyodide packages the studies name (web-tests/page_libraries.py)
    'web-tests/page_libraries.py', 'web/*.js', 'studies/*/web/*', 'studies/*/study.json',
    # the studies' pinned wheels (build.wheels) and the files their native services fetch (lab/services.py)
    'dev/tools/build/*.py', 'lab/services.py',
    # the Claudinite engine it pins, and the workflow naming its installer
    '.claudinite/settings.yaml', '.github/workflows/tests.yml',
)


def files(root=ROOT):
    tracked = subprocess.run(['git', '-C', root, 'ls-files', '-z'], capture_output=True, check=True).stdout.decode().split('\0')
    return sorted(f for f in tracked if f and any(fnmatch.fnmatch(f, p) for p in INPUTS) and os.path.isfile(os.path.join(root, f)))


# the files whose whole text the image takes in; of the rest, only what takes_in() reads from them
WHOLE = ('dev/tools/test-image/Dockerfile', 'dev/tools/test-image/prepare.sh', 'requirements.txt', 'web-tests/page_libraries.py', 'lab/services.py')


def takes_in(root=ROOT):
    """What the image's build takes from the page, the studies and Claudinite: the libraries the page pins, each study's
    Python and services, and the engine and its installer."""
    studies = {}
    for path in sorted(glob.glob(os.path.join(root, 'studies', '*', 'study.json'))):
        m = json.load(open(path))
        studies[os.path.relpath(path, root)] = {'python': m.get('python'), 'services': m.get('services')}
    tests = open(os.path.join(root, '.github', 'workflows', 'tests.yml')).read()
    settings = open(os.path.join(root, '.claudinite', 'settings.yaml')).read()
    claudinite = {'installer': re.findall(r'@claudinite/setup@[0-9.]+', tests)[:1],
                  'engine': re.search(r'^engine:\n(?:  .*\n)*', settings, re.M).group(0)}
    return {'libraries': page_libraries.libraries(root), 'studies': studies, 'claudinite': claudinite}


def tag(root=ROOT):
    h = hashlib.sha256()
    for f in files(root):
        if any(fnmatch.fnmatch(f, p) for p in WHOLE):
            h.update(f.encode() + b'\0' + open(os.path.join(root, f), 'rb').read() + b'\0')
    h.update(json.dumps(takes_in(root), sort_keys=True).encode())
    return h.hexdigest()[:16]


def context(out, root=ROOT):
    for f in files(root):
        os.makedirs(os.path.join(out, os.path.dirname(f)), exist_ok=True)
        shutil.copy2(os.path.join(root, f), os.path.join(out, f))


if __name__ == '__main__':
    if sys.argv[1:2] == ['--tag']:
        print(tag())
    elif sys.argv[1:2] == ['--context'] and len(sys.argv) == 3:
        context(sys.argv[2])
    else:
        sys.exit(__doc__)
