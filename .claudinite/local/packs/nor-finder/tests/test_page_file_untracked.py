"""The page-file-untracked check, run by the engine on a fixture repo with untracked files.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
import os
import shutil
import subprocess

from test_async_wait_predicate import CN, ROOT


def untracked_findings(tmp_path, tracked, untracked):
    """The check's findings, as paths, on a repo committing `tracked` and leaving `untracked` unadded."""
    shutil.copytree(os.path.join(ROOT, '.claudinite'), tmp_path / '.claudinite', ignore=shutil.ignore_patterns('__pycache__', 'bin'))
    for name, text in tracked.items():
        (tmp_path / name).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / name).write_text(text)
    git = ['git', '-c', 'user.email=t@t', '-c', 'user.name=t']
    subprocess.run(['git', 'init', '-q'], cwd=tmp_path, check=True)
    subprocess.run(git + ['add', '-A'], cwd=tmp_path, check=True)
    subprocess.run(git + ['commit', '-qm', 'fixture'], cwd=tmp_path, check=True)
    for name, text in untracked.items():
        (tmp_path / name).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / name).write_text(text)
    out = subprocess.run([CN, 'check', '--tag', 'work', '--repo', str(tmp_path)], capture_output=True, text=True).stdout
    prefix = ('finding nor-finder/page-file-untracked ', 'advisory nor-finder/page-file-untracked ',
              'finding local/nor-finder/page-file-untracked ', 'advisory local/nor-finder/page-file-untracked ')
    return sorted(line.split()[2].rstrip(':') for line in out.splitlines() if line.startswith(prefix))


def test_a_page_module_and_a_study_page_file_left_untracked_are_found(tmp_path):
    assert untracked_findings(tmp_path, {'web/app.js': 'export const a = 1;\n'}, {
        'web/summary_mask.js': 'export const m = 1;\n',
        'studies/acme/web/view.js': 'export const v = 1;\n',
    }) == ['studies/acme/web/view.js', 'web/summary_mask.js']


def test_tracked_page_files_and_untracked_files_the_build_does_not_ship_are_not(tmp_path):
    assert untracked_findings(tmp_path, {'web/app.js': 'export const a = 1;\n'}, {
        'studies/acme/notes.md': 'research\n',
        'studies/acme/lab/run.py': 'pass\n',
        'webby/x.js': '1\n',
    }) == []
