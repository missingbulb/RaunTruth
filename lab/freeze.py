"""The freeze of Review (lab/freeze): commits a study's ground truth, model-only, and publishes its official scores.

    python3 lab/freeze.py STUDY           # in Review: write studies/STUDY/gt/<date>/ and the metrics file, stamped
    python3 lab/freeze.py STUDY --stamp   # after those files are committed: put the commit that holds them into the stamp

The second of the three steps of entering Review (study Setup's Freeze first, this next, then the sharing check). Only a
study in Review is frozen here. Each GT mark's file, as the study file names it, is written in its model-only form
(fetch.model_only) as studies/STUDY/gt/<freeze date>/<image SHA-256>.json, and the scores are measured on those files and
nothing else, so the committed set is what the numbers name; the metrics file then carries, for each version, a stamp
{version, dataset_sha256, frozen, commit}, which the page shows from Review on (req/shell/processing/stamp). The commit does
not exist yet when the files are written: the stamp holds null until --stamp names the commit that added them, the one the
page links to; a session commits the files, runs --stamp, and commits the metrics.
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch
import run
from study import Study, ROOT

EMAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')


def gt_dir(study, date):
    return os.path.join(study.dir, 'gt', date)


def started_from(path):
    """The algorithm and code version a GT file's history begins with, {algorithm, code}, from the file as Drive holds it;
    None for one that records no run."""
    history = json.load(open(path)).get('history')
    for action in (history or {}).get('actions') or []:
        if isinstance(action, dict) and action.get('type') == 'run' and action.get('algorithm'):
            version = action.get('version') if isinstance(action.get('version'), dict) else {}
            return dict(algorithm=action.get('algorithm'), code=version.get('code'))
    return None


def committed(study, date):
    """The frozen ground truth as fetch.truth gives it: [{'subfolder', 'path', 'doc', 'sha256'}], read from the files."""
    out = []
    folder = gt_dir(study, date)
    for name in sorted(os.listdir(folder)):
        path = os.path.join(folder, name)
        doc = json.load(open(path))
        out.append(dict(subfolder=os.path.relpath(path, study.dir), path=path, doc=doc, sha256=fetch.model_sha256(doc)))
    return out


def freeze(sid, transport=None, today=None):
    study = Study(sid)
    sf = fetch.study_file(sid, transport)
    print(sf.stage_line())
    if sf.stage != 'review':
        raise SystemExit(f'the freeze is the freeze of Review, and {sid} is in {sf.stage.capitalize() if sf.stage else "no stage the study file names"}')
    kept, refused = fetch.truth(sid, sf=sf)
    for label, why in refused.items():
        print(f'ground truth {label} left out: {why}', file=sys.stderr)
    if not kept:
        raise SystemExit(f'{sid} has no GT mark to freeze')
    texts = {t['doc']['image']['sha256']: json.dumps(t['doc'], indent=1, sort_keys=True, ensure_ascii=False) + '\n' for t in kept}
    for sha, text in texts.items():
        if EMAIL.search(text):
            raise SystemExit(f'the GT file of image {sha[:8]} holds an email address even in its model-only form: nothing was written')
    started = {t['doc']['image']['sha256']: started_from(t['path']) for t in kept}
    date = today or datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    folder = gt_dir(study, date)
    os.makedirs(folder, exist_ok=True)
    for name in os.listdir(folder):
        os.remove(os.path.join(folder, name))
    for sha, text in texts.items():
        with open(os.path.join(folder, sha + '.json'), 'w') as f:
            f.write(text)
    results, pairs = run.measure(study, sf=sf, truths=committed(study, date))
    doc = run.document(study, results, pairs)
    for image in doc['images']:
        image['started_from'] = started[image['image_sha256']]
    doc['frozen'], doc['commit'] = date, None
    for key, v in doc['versions'].items():
        v['stamp'] = dict(version=key, dataset_sha256=doc['dataset_sha256'], frozen=date, commit=None)
    print(f'wrote {os.path.relpath(folder)} ({len(texts)} files) and {os.path.relpath(run.write(study, doc))} ({doc["measured"]})')
    return doc


def git_commit_of(path):
    """The commit that last changed path, or None while it is not committed (untracked, or changed since)."""
    git = lambda *a: subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True, check=True).stdout.strip()
    return None if git('status', '--porcelain', '--', path) else git('log', '-1', '--format=%H', '--', path) or None


def stamp(sid, commit_of=git_commit_of):
    """The frozen files' commit written into the metrics file's stamps."""
    study = Study(sid)
    with open(study.metrics_path()) as f:
        doc = json.load(f)
    if not doc.get('frozen'):
        raise SystemExit(f"{sid}'s metrics carry no freeze: run the freeze first")
    commit = commit_of(gt_dir(study, doc['frozen']))
    if not commit:
        raise SystemExit(f'the frozen files in gt/{doc["frozen"]}/ are not committed: commit them, then stamp')
    doc['commit'] = commit
    for v in doc['versions'].values():
        v['stamp']['commit'] = commit
    print(f'wrote {os.path.relpath(run.write(study, doc))} (stamped with commit {commit[:8]})')


def main(argv=None, transport=None, today=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study')
    ap.add_argument('--stamp', action='store_true')
    a = ap.parse_args(argv)
    if a.stamp:
        stamp(a.study)
    else:
        freeze(a.study, transport, today)


if __name__ == '__main__':
    main()
