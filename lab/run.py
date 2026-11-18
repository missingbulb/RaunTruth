"""Every version of a study run on every image with ground truth, each answer scored by the study's own scorer, and
the sums written as the precision and recall the page shows.

    python3 lab/run.py STUDY                 # every version, a table of how each did
    python3 lab/run.py STUDY v4 v5           # only these
    python3 lab/run.py STUDY --write         # also record them in the study's metrics file, with how they were scored
    python3 lab/run.py STUDY --truth lab     # only the study's own lab/truth/ (drive: only the curated files)

The ground truth is the study's curated files on Drive (fetch.py) and the files in the study's own lab/truth/, each
naming its image by SHA-256. A version scored at several settings (the study's SETTINGS: {version: {name: params}})
reports each beside its default. Precision is tp / (tp + fp) and recall tp / (tp + fn), over the counts every image's
score gives; an answer is kept in data/raw/runs/ and run again only when the study's algorithm code changes.
"""
import argparse
import glob
import hashlib
import json
import os
import pickle
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch  # noqa: E402
from study import Study  # noqa: E402


def code_hash(study):
    """The study's algorithm code as one SHA-256: every file of the folders the page imports it from."""
    h = hashlib.sha256()
    for p in study.paths:
        for f in sorted(glob.glob(os.path.join(p, '*.py'))):
            h.update(os.path.basename(f).encode())
            h.update(open(f, 'rb').read())
    return h.hexdigest()


class Services(dict):
    """The services a version of the study may ask for, loaded the first time one is asked for."""

    def __init__(self, study):
        super().__init__()
        self.study = study

    def __missing__(self, name):
        import services
        self.update(services.native(self.study))
        if name not in self:
            raise KeyError(name)
        return self[name]

    def __contains__(self, name):
        try:
            self[name]
        except (KeyError, ImportError):
            return False
        return True


def committed_truth(study):
    """The study's own ground-truth files (its lab/truth/), each as fetch.truth gives one."""
    out = []
    for path in sorted(glob.glob(os.path.join(study.dir, 'lab', 'truth', '*.json'))):
        doc = json.load(open(path))
        out.append(dict(subfolder=os.path.relpath(path, study.dir), path=path, doc=doc, sha256=fetch.sha256_of(path)))
    return out


def corpus(study, transport=None, which='all'):
    """[(image entry, truth)]: every ground-truth file whose image the study's data holds, curated files first; which
    is 'all', 'drive' (the curated files alone) or 'lab' (the study's own lab/truth/ alone)."""
    imgs = {e['sha256']: e for e in fetch.images(study.id, transport)}
    found, refused = fetch.truth(study.id, transport) if which != 'lab' else ([], {})
    for path, why in refused.items():
        print(f'ground truth {path} left out: {why}', file=sys.stderr)
    pairs = []
    for t in found + (committed_truth(study) if which != 'drive' else []):
        sha = t['doc']['image']['sha256']
        if sha in imgs:
            pairs.append((imgs[sha], t))
        else:
            print(f'ground truth {t["subfolder"]} left out: its image is not in the study\'s data', file=sys.stderr)
    return pairs


def answer(study, version, entry, params, code, images):
    """The version's answer on the image, from the cache while the code and the parameters are as they were."""
    key = hashlib.sha256(json.dumps([code, version, entry['sha256'], params], sort_keys=True).encode()).hexdigest()[:24]
    path = os.path.join(study.data, 'runs', version, key + '.pickle')
    if os.path.exists(path):
        with open(path, 'rb') as f:
            return pickle.load(f)
    if entry['sha256'] not in images:
        images[entry['sha256']] = study.read(entry['local'])
    t0 = time.perf_counter()
    a = study.run(version, images[entry['sha256']], Services(study), **params)
    print(f'  ran {version} on {entry["path"]} in {time.perf_counter() - t0:.1f} s', file=sys.stderr)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        pickle.dump(a, f)
    return a


def total(scores):
    """The per-image counts summed, and the precision and recall they give."""
    s = {}
    for c in scores:
        for k, v in c.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                s[k] = s.get(k, 0) + v
    tp, fp, fn = s.get('tp', 0), s.get('fp', 0), s.get('fn', 0)
    s['precision'] = round(tp / (tp + fp), 4) if tp + fp else None
    s['recall'] = round(tp / (tp + fn), 4) if tp + fn else None
    return s


def measure(study, versions=None, transport=None, which='all'):
    """{version: {settings name or None: {totals, 'images': {image sha256: counts}}}} over the corpus, and the corpus."""
    pairs = corpus(study, transport, which)
    code, images, out = code_hash(study), {}, {}
    settings = getattr(study.module, 'SETTINGS', {})
    for v in versions or study.versions:
        out[v] = {}
        for name, params in [(None, {})] + sorted((settings.get(v) or {}).items()):
            per = {e['sha256']: study.score(answer(study, v, e, params, code, images), t['doc']) for e, t in pairs}
            out[v][name] = dict(total(per.values()), images=per)
    return out, pairs


def dataset_sha(pairs):
    return hashlib.sha256(json.dumps(sorted([e['sha256'], t['sha256']] for e, t in pairs)).encode()).hexdigest()


def document(study, results, pairs):
    """The study's metrics file: the numbers the page shows, what they were measured on, and how they were scored."""
    people = sum(1 for _, t in pairs if not t['subfolder'].startswith('lab/'))
    measured = f'on {len(pairs)} image{"s" if len(pairs) != 1 else ""} with ground truth' + \
               (f', {len(pairs) - people} of them marked in the lab, not by people' if people < len(pairs) else '')
    notes = getattr(study.module, 'NOTES', {})
    versions = {}
    for v, by in results.items():
        d = by[None]
        versions[v] = dict({k: d[k] for k in ('precision', 'recall', 'tp', 'fp', 'fn') if k in d},
                           **({'note': notes[v]} if v in notes else {}),
                           **({'settings': {n: {k: x for k, x in s.items() if k != 'images'} for n, s in by.items() if n}}
                              if len(by) > 1 else {}),
                           images={sha: {k: c[k] for k in ('tp', 'fp', 'fn') if k in c} for sha, c in d['images'].items()})
    return dict(format='rauntruth-metrics/1', measured=measured, dataset_sha256=dataset_sha(pairs),
                images=[dict(image_sha256=e['sha256'], name=os.path.basename(e['path']), truth_sha256=t['sha256'],
                             truth=t['subfolder']) for e, t in pairs],
                scoring=study.scoring, versions=versions)


def table(results):
    rows = ['| version | setting | tp | fp | fn | precision | recall |', '|---|---|---|---|---|---|---|']
    for v, by in results.items():
        for n, d in by.items():
            rows.append(f'| {v} | {n or "default"} | {d.get("tp", 0)} | {d.get("fp", 0)} | {d.get("fn", 0)} | '
                        f'{d["precision"]} | {d["recall"]} |')
    return '\n'.join(rows)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study')
    ap.add_argument('versions', nargs='*')
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--truth', choices=['all', 'drive', 'lab'], default='all')
    a = ap.parse_args(argv)
    study = Study(a.study)
    results, pairs = measure(study, a.versions or None, which=a.truth)
    print(table(results))
    if a.write:
        doc = document(study, results, pairs)
        path = study.metrics_path()
        with open(path, 'w') as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
            f.write('\n')
        print(f'wrote {os.path.relpath(path)} ({doc["measured"]})')


if __name__ == '__main__':
    main()
