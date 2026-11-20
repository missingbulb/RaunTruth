"""req/checks/ci-sets/one-image: the test image's tag names what it is built from, so a changed input builds a new
image and an unchanged one reuses the one pushed."""
import os
import subprocess

import inputs


def repo(tmp_path, files):
    for f, text in files.items():
        os.makedirs(tmp_path / os.path.dirname(f), exist_ok=True)
        (tmp_path / f).write_text(text)
    subprocess.run(['git', 'init', '-q', str(tmp_path)], check=True)
    subprocess.run(['git', '-C', str(tmp_path), 'add', '.'], check=True)
    return str(tmp_path)


FILES = {'requirements.txt': 'numpy\n', 'dev/test-image/Dockerfile': 'FROM acme\n', 'web/acme.js': '// a page module\n',
         'studies/acme/study.json': '{}', 'studies/acme/algorithm/acme.py': '# a finder\n', 'README.md': 'acme\n'}


def test_the_tag_moves_with_each_input_and_with_nothing_else(tmp_path):
    root = repo(tmp_path, FILES)
    base = inputs.tag(root)
    assert inputs.tag(root) == base
    moved = []
    for f in FILES:
        before = (tmp_path / f).read_text()
        (tmp_path / f).write_text(before + 'changed\n')
        moved.append(inputs.tag(root) != base)
        (tmp_path / f).write_text(before)
    assert dict(zip(FILES, moved)) == {'requirements.txt': True, 'dev/test-image/Dockerfile': True, 'web/acme.js': True,
                                       'studies/acme/study.json': True, 'studies/acme/algorithm/acme.py': False,
                                       'README.md': False}


def test_the_context_holds_what_the_tag_hashes(tmp_path):
    root = repo(tmp_path / 'repo', FILES)
    inputs.context(str(tmp_path / 'ctx'), root)
    held = sorted(os.path.relpath(os.path.join(d, f), tmp_path / 'ctx') for d, _, fs in os.walk(tmp_path / 'ctx') for f in fs)
    assert held == inputs.files(root) == sorted(f for f in FILES if f not in ('studies/acme/algorithm/acme.py', 'README.md'))
