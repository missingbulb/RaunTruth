"""A study's images and its curated ground truth, from the study's root on Google Drive into studies/STUDY/data/raw/,
which git never holds; the study's data/sources.json is the repository's whole record of the images.

    python3 lab/fetch.py STUDY            # fetch what is missing, verify every image against its SHA-256
    python3 lab/fetch.py STUDY --pin      # list the data folder again: record what is new, drop what is gone

The images are the files of the root's data folder (its rauntruth-study.json `data`, else a top folder named Data). The
ground truth is the newest file per image of the root's curated folder (its `curated`, else a top folder named
GT curated or GT), in the shell's layout: one subfolder per image, `<image>__<its sha256's first 8>`, one
`gt_<tagger>.json` per tagger in it. Each file names its image by SHA-256, which is how the lab pairs the two.
Reading needs the folders shared as "Anyone with the link"; nothing here signs in.
"""
import argparse
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from study import STUDIES  # noqa: E402

SETTINGS = 'rauntruth-study.json'
# the names each folder is found by while the root's settings file names none, best first
DATA_NAMES = ('data',)
CURATED_NAMES = ('gt curated', 'gt')
GT_FILE = re.compile(r'^gt_.+\.json$')
# the most entries a listing with no key is trusted to return whole
LISTING_MAX = 50


class ListingFull(Exception):
    pass


class ChecksumMismatch(Exception):
    pass


class GoogleDrive:
    """The real transport: public files and folders, read with no key."""

    def download(self, drive_id, out):
        import gdown
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if gdown.download(id=drive_id, output=out + '.part', quiet=True) is None:
            raise RuntimeError(f'Drive refused {drive_id}: is it shared as "Anyone with the link"?')
        os.replace(out + '.part', out)

    def list_folder(self, drive_id):
        """[(path under the folder, drive id)] of every file under it."""
        import gdown
        return [(f.path, f.id) for f in gdown.download_folder(id=drive_id, skip_download=True, quiet=True)]


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def root_of(manifest):
    m = re.search(r'/folders/([\w-]{10,})', manifest.get('root') or '')
    return m.group(1) if m else None


def listed_whole(listing, folder):
    """Raise ListingFull when a folder in the listing holds LISTING_MAX entries or more: the listing may be cut short."""
    children = {}
    for path, _ in listing:
        parts = path.split('/')
        for depth in range(len(parts)):
            children.setdefault('/'.join(parts[:depth]), set()).add(parts[depth])
    for where, names in children.items():
        if len(names) >= LISTING_MAX:
            raise ListingFull(f'{folder}{"/" + where if where else ""} listed {len(names)} entries; a listing with no key '
                              f'may stop at {LISTING_MAX}, so stopped rather than work on part of it')


class Root:
    """A study's Drive root: its folders as the shell names them."""

    def __init__(self, transport, root, raw):
        self.transport, self.root, self.raw = transport, root, raw
        self.listing = transport.list_folder(root)
        self.settings = {}
        sid = next((fid for path, fid in self.listing if path == SETTINGS), None)
        if sid:
            out = os.path.join(raw, SETTINGS)
            transport.download(sid, out)
            try:
                self.settings = json.load(open(out))
            except ValueError:
                pass

    def folder(self, key, names):
        """[(path under the folder, id)] of the folder the settings name under key, else of the first top folder by
        name; None while the root has neither."""
        if self.settings.get(key):
            listing = self.transport.list_folder(self.settings[key])
            listed_whole(listing, key)
            return listing
        tops = {path.split('/')[0] for path, _ in self.listing if '/' in path}
        for name in names:
            top = next((t for t in sorted(tops) if t.strip().lower() == name), None)
            if top:
                listing = [(path[len(top) + 1:], fid) for path, fid in self.listing if path.startswith(top + '/')]
                listed_whole(listing, top)
                return listing
        return None


def image_path(raw, entry):
    """Where an image is kept: by its Drive id, since two images in the folder may share a name."""
    return os.path.join(raw, 'images', entry['drive_id'] + '__' + os.path.basename(entry['path']))


def images(sid, transport=None, pin=False):
    """Every image the study's data/sources.json names, fetched and verified; with pin, the data folder listed again
    first and the manifest rewritten with what is new (its SHA-256 recorded once fetched) and without what is gone."""
    sdir = os.path.join(STUDIES, sid)
    raw, manifest_path = os.path.join(sdir, 'data', 'raw'), os.path.join(sdir, 'data', 'sources.json')
    transport = transport or GoogleDrive()
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {'images': []}
    entries = manifest['images']
    if pin:
        with open(os.path.join(sdir, 'study.json')) as f:
            root = root_of(json.load(f))
        listing = Root(transport, root, raw).folder('data', DATA_NAMES) or []
        skip = re.compile(manifest.get('skip', r'^$'))
        known = {e['drive_id']: e for e in entries}
        entries = [known.get(fid) or dict(path=path, drive_id=fid, sha256=None)
                   for path, fid in sorted(listing) if not skip.search(path)]
    for e in entries:
        out = image_path(raw, e)
        if not os.path.exists(out):
            transport.download(e['drive_id'], out)
        sha = sha256_of(out)
        if e['sha256'] is None:
            e['sha256'] = sha
        elif sha != e['sha256']:
            raise ChecksumMismatch(f'{out}: sha256 {sha}, data/sources.json says {e["sha256"]}')
    if pin:
        manifest['images'] = entries
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=1, ensure_ascii=False)
            f.write('\n')
    return [dict(e, local=image_path(raw, e)) for e in entries]


def truth(sid, transport=None):
    """The newest ground-truth file of every image in the study's curated folder, kept in data/raw/truth/ (a file
    fetched before is not fetched again): [{'subfolder', 'path', 'doc', 'sha256'}], and {path: why} for the files
    refused (not JSON, no image SHA-256, no `created` time)."""
    sdir = os.path.join(STUDIES, sid)
    raw = os.path.join(sdir, 'data', 'raw')
    transport = transport or GoogleDrive()
    with open(os.path.join(sdir, 'study.json')) as f:
        root = root_of(json.load(f))
    if not root:
        return [], {}
    listing = Root(transport, root, raw).folder('curated', CURATED_NAMES) or []
    by_image = {}
    for path, fid in listing:
        parts = path.split('/')
        if len(parts) == 2 and GT_FILE.match(parts[1]):
            by_image.setdefault(parts[0], []).append(fid)
    kept, refused = [], {}
    for sub, ids in sorted(by_image.items()):
        best = None
        for fid in ids:
            out = os.path.join(raw, 'truth', fid + '.json')
            if not os.path.exists(out):
                transport.download(fid, out)
            try:
                doc = json.load(open(out))
            except ValueError as e:
                refused[f'{sub}/{fid}'] = f'not JSON ({e})'
                continue
            why = (None if isinstance((doc.get('image') or {}).get('sha256'), str) else 'no image SHA-256') or \
                  (None if isinstance(doc.get('created'), str) else 'no `created` time')
            if why:
                refused[f'{sub}/{fid}'] = why
            elif best is None or doc['created'] > best['doc']['created']:
                best = dict(subfolder=sub, path=out, doc=doc, sha256=sha256_of(out))
        if best:
            kept.append(best)
    return kept, refused


def corpus(sid, transport=None):
    """[(image entry, truth)] for every curated ground-truth file whose image the data folder holds, and the
    ground-truth files whose image it does not, by subfolder."""
    imgs = {e['sha256']: e for e in images(sid, transport)}
    found, _ = truth(sid, transport)
    pairs = [(imgs[t['doc']['image']['sha256']], t) for t in found if t['doc']['image']['sha256'] in imgs]
    lost = [t['subfolder'] for t in found if t['doc']['image']['sha256'] not in imgs]
    return pairs, lost


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('study')
    ap.add_argument('--pin', action='store_true')
    a = ap.parse_args(argv)
    for e in images(a.study, pin=a.pin):
        print('ok  ', e['path'])
    kept, refused = truth(a.study)
    for t in kept:
        print('gt  ', t['subfolder'])
    for path, why in refused.items():
        print('skip', path, '-', why)


if __name__ == '__main__':
    main()
