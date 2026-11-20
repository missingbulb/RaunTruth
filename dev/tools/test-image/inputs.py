"""The repo's files the test image is built from (req/checks/ci-sets/one-image): what the image fetches is read from
these alone, so a hash of them names the image, and a change to any of them builds a new one.
  python3 dev/tools/test-image/inputs.py --tag            print the image's tag
  python3 dev/tools/test-image/inputs.py --context DIR    copy them into DIR, laid out as the repo is, to build the image from"""
import fnmatch
import hashlib
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
INPUTS = (
    'dev/tools/test-image/*',
    'requirements.txt',
    # the page's libraries and the Pyodide packages the studies name (web-tests/page_libraries.py)
    'web-tests/page_libraries.py', 'web/*.js', 'studies/*/web/*', 'studies/*/study.json',
    # the studies' pinned wheels (build.wheels) and the files their native services fetch (lab/services.py)
    'dev/tools/build/*.py', 'lab/services.py',
)


def files(root=ROOT):
    tracked = subprocess.run(['git', '-C', root, 'ls-files', '-z'], capture_output=True, check=True).stdout.decode().split('\0')
    return sorted(f for f in tracked if f and any(fnmatch.fnmatch(f, p) for p in INPUTS) and os.path.isfile(os.path.join(root, f)))


def tag(root=ROOT):
    h = hashlib.sha256()
    for f in files(root):
        h.update(f.encode() + b'\0' + open(os.path.join(root, f), 'rb').read() + b'\0')
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
