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


STUDY = '{"title": "Acme", "python": {"wheels": ["acme-1.0-py3-none-any.whl"], "packages": ["numpy"]}, "services": {"det": "https://acme.example/det.onnx"}}'
FILES = {'requirements.txt': 'numpy\n', 'dev/tools/test-image/Dockerfile': 'FROM acme\n',
         'web/acme.js': 'import "https://cdn.jsdelivr.net/npm/acme@1.0.0/acme.js"; // a page module\n',
         'studies/acme/study.json': STUDY, 'studies/acme/algorithm/acme.py': '# a finder\n', 'README.md': 'acme\n'}


def moves(tmp_path, root, f, change):
    base, before = inputs.tag(root), (tmp_path / f).read_text()
    (tmp_path / f).write_text(change(before))
    moved = inputs.tag(root) != base
    (tmp_path / f).write_text(before)
    return moved


def test_the_tag_moves_with_what_the_image_takes_in_and_with_nothing_else(tmp_path):
    root = repo(tmp_path, FILES)
    assert inputs.tag(root) == inputs.tag(root)
    # what the image's build fetches or runs
    assert moves(tmp_path, root, 'requirements.txt', lambda t: t + 'scipy\n')
    assert moves(tmp_path, root, 'dev/tools/test-image/Dockerfile', lambda t: t + 'RUN true\n')
    assert moves(tmp_path, root, 'web/acme.js', lambda t: t.replace('acme@1.0.0', 'acme@1.0.1'))
    assert moves(tmp_path, root, 'studies/acme/study.json', lambda t: t.replace('acme-1.0', 'acme-1.1'))
    assert moves(tmp_path, root, 'studies/acme/study.json', lambda t: t.replace('"numpy"', '"numpy", "scipy"'))
    assert moves(tmp_path, root, 'studies/acme/study.json', lambda t: t.replace('det.onnx', 'det2.onnx'))
    # the page's own code and the rest of a study's settings: nothing the image holds
    assert not moves(tmp_path, root, 'web/acme.js', lambda t: t + 'export const x = 1;\n')
    assert not moves(tmp_path, root, 'studies/acme/study.json', lambda t: t.replace('"Acme"', '"Acme 2"'))
    assert not moves(tmp_path, root, 'studies/acme/algorithm/acme.py', lambda t: t + 'x = 1\n')
    assert not moves(tmp_path, root, 'README.md', lambda t: t + 'more\n')


def test_the_context_holds_what_the_tag_hashes(tmp_path):
    root = repo(tmp_path / 'repo', FILES)
    inputs.context(str(tmp_path / 'ctx'), root)
    held = sorted(os.path.relpath(os.path.join(d, f), tmp_path / 'ctx') for d, _, fs in os.walk(tmp_path / 'ctx') for f in fs)
    assert held == inputs.files(root) == sorted(f for f in FILES if f not in ('studies/acme/algorithm/acme.py', 'README.md'))
