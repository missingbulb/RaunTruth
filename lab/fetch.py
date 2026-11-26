"""A study's images and its ground truth, read through the study file on Google Drive into studies/STUDY/data/raw/,
which git never holds; the study's data/sources.json is the repository's whole record of the images (names and hashes).

    python3 lab/fetch.py STUDY            # fetch what is missing, verify every image against its SHA-256
    python3 lab/fetch.py STUDY --pin      # record the study file's images in data/sources.json: what is new, not what is gone

The study file (rauntruth-study.json, format rauntruth-study/2) is the lab's one interface to a study's Drive store
(lab/study-file): its id is read from the environment variable RAUNTRUTH_STUDY_<STUDY> and never kept in the repo or
printed. It names the images (id, SHA-256), the marks, the damaged areas and the stage. The lab lists no folder: it
downloads the files the study file names by id. The ground truth is the extraction file each GT mark names, its latest
content (lab/gt-marks), kept in its model-only form (lab/dataset-sha). Reading needs the study file and the files it
names shared as "Anyone with the link"; nothing here signs in.
"""
import argparse
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from study import STUDIES, Study

# the stages from which a study's ground truth and scores are frozen
FROZEN_STAGES = ('review', 'public')
# what an extraction file carries beyond the model the scorer reads
NOT_MODEL = ('history', 'tagger', 'created', 'base')
NOT_MODEL_ANYWHERE = ('tagger', 'email')
NOT_MODEL_IN_IMAGE = ('drive_id',)


class ChecksumMismatch(Exception):
    pass


class NotInStudyFile(Exception):
    pass


class GoogleDrive:
    """The real transport: public files, read with no key."""

    def download(self, drive_id, out):
        import gdown
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if gdown.download(id=drive_id, output=out + '.part', quiet=True) is None:
            raise RuntimeError('Drive refused a file the study file names: is it shared as "Anyone with the link"?')
        os.replace(out + '.part', out)


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def env_name(sid):
    return 'RAUNTRUTH_STUDY_' + re.sub(r'[^A-Za-z0-9]', '_', sid).upper()


def _without_emails(x):
    if isinstance(x, dict):
        return {k: _without_emails(v) for k, v in x.items() if k not in NOT_MODEL_ANYWHERE}
    if isinstance(x, list):
        return [_without_emails(v) for v in x]
    return x


def model_only(doc):
    """An extraction file as the model alone: without its action history, tagger, creation time and base, any email, and
    the image's Drive id. The one definition of what the scorer, the dataset SHA and the freeze keep."""
    out = _without_emails({k: v for k, v in doc.items() if k not in NOT_MODEL})
    if isinstance(out.get('image'), dict):
        out['image'] = {k: v for k, v in out['image'].items() if k not in NOT_MODEL_IN_IMAGE}
    return out


def undone(module, doc):
    """The tagging task a ground-truth file left undone, as the study's module words it (its `undone`), or None. Only
    ground truth with every task done is scored."""
    said = getattr(module, 'undone', None)
    return said(doc) if said else None


def model_sha256(doc):
    """The SHA-256 of a model-only form, over its canonical JSON."""
    return hashlib.sha256(json.dumps(model_only(doc), sort_keys=True, separators=(',', ':'), ensure_ascii=False)
                          .encode()).hexdigest()


class StudyFile:
    """A study's study file, read afresh by the id its environment variable gives."""

    def __init__(self, transport, fid, raw):
        self.transport, self.raw = transport, raw
        out = os.path.join(raw, 'study-file.json')
        transport.download(fid, out)
        try:
            doc = json.load(open(out))
        except ValueError:
            doc = None
        if not isinstance(doc, dict):
            raise SystemExit("the study file is not JSON: is the id in the environment variable the study file's?")
        self.doc = doc

    @property
    def stage(self):
        """The study's stage, lower case, or None while the file names none: unknown, never a default."""
        s = self.doc.get('stage')
        return s.strip().lower() if isinstance(s, str) and s.strip() else None

    @property
    def frozen(self):
        return self.stage in FROZEN_STAGES

    def stage_line(self):
        return f'stage: {self.stage}' if self.stage else 'stage: unknown (the study file names none)'

    def frozen_message(self, what):
        return f'{what} stops: the study is in {self.stage.capitalize()}, so its ground truth and scores are frozen'

    def index_images(self):
        index = self.doc.get('index') if isinstance(self.doc.get('index'), dict) else {}
        return [i for i in index.get('images') or [] if isinstance(i, dict) and i.get('id') and i.get('name')]

    def image_ids(self):
        """{image SHA-256: Drive id} of the images the study file's index names whose hash it holds."""
        return {i['sha']: i['id'] for i in self.index_images() if i.get('sha')}

    def damaged(self):
        """{image SHA-256: damaged areas, [[[x, y], ...], ...] in its pixels}: the study file's tags, by Drive id."""
        tags = self.doc.get('tags') if isinstance(self.doc.get('tags'), dict) else {}
        by_id = tags.get('images') if isinstance(tags.get('images'), dict) else {}
        shas = {v: k for k, v in self.image_ids().items()}
        return {shas[fid]: own['damaged'] for fid, own in by_id.items()
                if fid in shas and isinstance(own, dict) and own.get('damaged')}

    def marks(self, kind):
        """{image SHA-256: extraction file id} of the marks of that kind ('gt' or 'official')."""
        marks = self.doc.get('marks') if isinstance(self.doc.get('marks'), dict) else {}
        return {sha: m[kind]['file'] for sha, m in sorted(marks.items())
                if isinstance(m, dict) and isinstance(m.get(kind), dict) and isinstance(m[kind].get('file'), str)}


def study_file(sid, transport=None):
    """The study's study file, or exit 2 naming the environment variable while it is not set."""
    var = env_name(sid)
    fid = os.environ.get(var)
    if not fid:
        print(f'the lab reads study {sid} through its study file, whose Drive id the environment variable {var} holds, '
              f'and {var} is not set', file=sys.stderr)
        raise SystemExit(2)
    return StudyFile(transport or GoogleDrive(), fid, os.path.join(STUDIES, sid, 'data', 'raw'))


def image_path(raw, entry):
    """Where an image is kept: by its SHA-256, since two images may share a name."""
    return os.path.join(raw, 'images', entry['sha256'][:16] + '__' + os.path.basename(entry['path']))


def images(sid, transport=None, pin=False, only=None, sf=None):
    """Every image the study's data/sources.json names, fetched by the id the study file gives its hash and verified;
    with pin, the manifest rewritten first from the study file's index (what is new, its SHA-256 recorded once known,
    without what is gone); with only (a set of SHA-256), just those images."""
    sdir = os.path.join(STUDIES, sid)
    raw, manifest_path = os.path.join(sdir, 'data', 'raw'), os.path.join(sdir, 'data', 'sources.json')
    sf = sf or study_file(sid, transport)
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {'images': []}
    entries = manifest['images']
    if pin:
        skip = re.compile(manifest.get('skip', r'^$'))
        known = {e['path']: e for e in entries}
        entries = []
        for i in sorted(sf.index_images(), key=lambda i: (i.get('path') or [], i['name'])):
            path = '/'.join(list(i.get('path') or [])[1:] + [i['name']])
            if skip.search(path):
                continue
            sha = i.get('sha') or (known.get(path) or {}).get('sha256')
            if sha is None:
                tmp = os.path.join(raw, 'images', 'pinning__' + os.path.basename(path))
                sf.transport.download(i['id'], tmp)
                sha = sha256_of(tmp)
            entries.append(dict(path=path, sha256=sha))
    ids = sf.image_ids()
    for e in entries:
        if only is not None and e['sha256'] not in only:
            continue
        out = image_path(raw, e)
        if not os.path.exists(out):
            if e['sha256'] not in ids:
                raise NotInStudyFile(f'{e["path"]}: the study file names no image with its SHA-256')
            sf.transport.download(ids[e['sha256']], out)
        sha = sha256_of(out)
        if sha != e['sha256']:
            raise ChecksumMismatch(f'{out}: sha256 {sha}, data/sources.json says {e["sha256"]}')
    if pin:
        manifest['images'] = entries
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=1, ensure_ascii=False)
            f.write('\n')
    return [dict(e, local=image_path(raw, e)) for e in entries if only is None or e['sha256'] in only]


def truth(sid, transport=None, sf=None):
    """The study's ground truth: for each GT mark in the study file, the file it names, read afresh (a mark follows its
    file's latest content), as its model-only form: [{'subfolder', 'path', 'doc', 'sha256'}], and {label: why} for the
    marks refused (the file is not JSON, or names another image than the mark's). sha256 is that of the model-only
    form, which is what the dataset SHA covers."""
    sf = sf or study_file(sid, transport)
    raw = os.path.join(STUDIES, sid, 'data', 'raw')
    module = Study(sid).module
    kept, refused = [], {}
    for sha, fid in sf.marks('gt').items():
        label = f'gt/{sha[:8]}'
        out = os.path.join(raw, 'truth', sha + '.json')
        sf.transport.download(fid, out)
        try:
            doc = json.load(open(out))
        except ValueError as e:
            refused[label] = f'not JSON ({e})'
            continue
        if not isinstance(doc, dict) or (doc.get('image') or {}).get('sha256') != sha:
            refused[label] = 'the file names another image than the mark'
            continue
        why = undone(module, doc)
        if why:
            refused[label] = f'a tagging task undone: {why}'
            continue
        form = model_only(doc)
        kept.append(dict(subfolder=label, path=out, doc=form, sha256=model_sha256(form)))
    return kept, refused


def corpus(sid, transport=None, sf=None):
    """[(image entry, truth)] for every GT mark whose image the study's data holds, and the labels of the marks whose
    image it does not."""
    sf = sf or study_file(sid, transport)
    found, _ = truth(sid, sf=sf)
    imgs = {e['sha256']: e for e in images(sid, sf=sf, only={t['doc']['image']['sha256'] for t in found})}
    pairs = [(imgs[t['doc']['image']['sha256']], t) for t in found if t['doc']['image']['sha256'] in imgs]
    lost = [t['subfolder'] for t in found if t['doc']['image']['sha256'] not in imgs]
    return pairs, lost


def main(argv=None, transport=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study')
    ap.add_argument('--pin', action='store_true')
    a = ap.parse_args(argv)
    sf = study_file(a.study, transport)
    print(sf.stage_line())
    for e in images(a.study, pin=a.pin, sf=sf):
        print('ok  ', e['path'])
    kept, refused = truth(a.study, sf=sf)
    for t in kept:
        print('gt  ', t['subfolder'])
    for label, why in refused.items():
        print('skip', label, '-', why)


if __name__ == '__main__':
    main()
