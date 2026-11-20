#!/bin/sh
# Inside the image's build, with the network on: fetches what the tests would otherwise fetch on each run, from the
# inputs inputs.py assembled at $1, a tree laid out as the repo is.
set -e
cd "$1"
# the page's libraries and Pyodide's packages (web-tests/page_libraries.py), where run.sh links them from
python3 web-tests/page_libraries.py
python3 web-tests/page_libraries.py --check
mkdir -p /opt/page-libraries && mv web-tests/node_modules /opt/page-libraries/
# the studies' pinned wheels the build vendors into web/vendor/
python3 - <<'PY'
import subprocess, sys
sys.path.insert(0, 'dev/tools/build')
import build
if build.wheels():
    subprocess.run([sys.executable, '-m', 'pip', 'download', '-q', '--no-deps', '--only-binary', ':all:', '-d', '/opt/wheels', *build.wheels()], check=True)
PY
mkdir -p /opt/wheels
# the files each study's native services fetch once (lab/services.py), into the data folder a test gives them
python3 - <<'PY'
import glob, json, os, sys, types
import numpy as np
sys.path.insert(0, 'lab')
import services
for path in sorted(glob.glob('studies/*/study.json')):
    manifest = json.load(open(path))
    if not manifest.get('services'):
        continue
    study = types.SimpleNamespace(dir=os.path.abspath(os.path.dirname(path)), manifest=manifest,
                                  data=os.path.join('/opt/test-downloads', manifest['id']))
    native = services.native(study)
    native['words']()
    native['det'](np.zeros((1, 3, 32, 32), np.float32))
    print('fetched the services of', manifest['id'])
PY
