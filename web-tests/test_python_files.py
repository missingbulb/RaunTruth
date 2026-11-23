"""req/shell/python/on-run: Python's importer asks the site only for a module the study's folders hold on the
release, as its offline list names them (studyModules, web/python_files.js), run under Node."""
import json
import os
import shutil
import subprocess

import pytest

pytestmark = pytest.mark.full

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = shutil.which('node')
MODULE = os.path.join(HERE, '..', 'web', 'python_files.js')


def run(call):
    if not NODE:
        pytest.skip('node missing')
    code = f'import * as m from {json.dumps("file://" + os.path.abspath(MODULE))};console.log(JSON.stringify(await ({call})(m)))'
    r = subprocess.run([NODE, '--input-type=module', '-e', code], capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def modules(listing, bases, app):
    if not NODE:
        pytest.skip('node missing')
    code = (f'import {{ studyModules }} from {json.dumps("file://" + os.path.abspath(MODULE))};'
            f'console.log(JSON.stringify(studyModules({json.dumps(listing)}, {json.dumps(bases)}, {json.dumps(app)})))')
    r = subprocess.run([NODE, '--input-type=module', '-e', code], capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


APP = 'https://acme.example/app/'
BASES = ['https://acme.example/studies/acme/py/', 'https://acme.example/studies/acme/analysis/']


def test_each_module_directly_in_a_folder_is_found_there():
    listing = {'files': [{'path': '../studies/acme/py/entry.py'}, {'path': '../studies/acme/analysis/lab.py'},
                         {'path': '../studies/acme/analysis/deep/hidden.py'}, {'path': '../studies/acme/py/notes.md'},
                         {'path': '../studies/other/py/theirs.py'}, {'path': 'shell.js'}]}
    assert modules(listing, BASES, APP) == {'entry': BASES[0] + 'entry.py', 'lab': BASES[1] + 'lab.py'}


def test_a_name_two_folders_hold_is_the_first_folders():
    listing = {'files': [{'path': '../studies/acme/analysis/x.py'}, {'path': '../studies/acme/py/x.py'}]}
    assert modules(listing, BASES, APP) == {'x': BASES[0] + 'x.py'}


def test_no_listing_leaves_every_name_to_ask_for():
    assert modules(None, BASES, APP) is None


def code_hash(listing, bases=BASES, app=APP):
    return run(f'(m) => m.codeHash({json.dumps(listing)}, {json.dumps(bases)}, {json.dumps(app)})')


def test_the_code_hash_moves_with_a_study_python_file_and_with_nothing_else():
    """req/shell/extractions/file: the hash a run records is over the study's own Python files in the release's list."""
    def listing(entry='aa', lab='bb', other='cc', note='dd'):
        return {'files': [{'path': '../studies/acme/py/entry.py', 'sha256': entry}, {'path': '../studies/acme/analysis/lab.py', 'sha256': lab},
                          {'path': '../studies/other/py/theirs.py', 'sha256': other}, {'path': '../studies/acme/py/notes.md', 'sha256': note}]}
    base = code_hash(listing())
    assert len(base) == 64 and base == code_hash(listing())
    assert code_hash(listing(entry='ab')) != base and code_hash(listing(lab='bc')) != base
    assert code_hash(listing(other='zz', note='zz')) == base


def test_no_listing_or_no_module_gives_no_code_hash_never_a_guess():
    assert code_hash(None) is None
    assert code_hash({'files': [{'path': 'shell.js', 'sha256': 'aa'}]}) is None
