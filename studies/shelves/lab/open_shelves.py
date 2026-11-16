"""The Open Shelves dataset (James Gallagher, Zenodo 10885753, CC BY-NC 4.0: English home bookshelves, every book a
polygon, no titles) made into the study's own Drive layout, for the owner to upload to the study's root:

    Data/Open Shelves/<photo>.jpg                       the photo's bytes as the dataset ships them
    GT/<photo>__<its sha256's first 8>/gt_open-shelves.json  the ground truth, as the shell saves a tagger's

after which `photos.py --pin --gt` fetches them like the owner's own. Each book is a right book whose four corners
fit its polygon best (`quad`), and `fit` says how well (an L-shaped polygon on a thin spine fits worst); its title and turn are unknown
(null), so it scores the finder and none of the readers.

The export is the one Roboflow made (COCO segmentation, 640x640 stretched): every photo it augmented ships under
one name several times, rotated, and only the photos shipped once, as taken, are kept.

    curl -L -o os.zip 'https://zenodo.org/records/10885753/files/Open%20Shelves.v8i.coco-segmentation.zip?download=1'
    unzip os.zip -d os && python3 studies/shelves/lab/open_shelves.py os OUT
"""
import argparse
import collections
import glob
import hashlib
import json
import os
import re
import shutil
import sys

import numpy as np
from scipy.spatial import ConvexHull

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'py'))
from books import iou  # noqa: E402

FOLDER = 'Open Shelves'
TAGGER = 'open-shelves'
DATASET = dict(name='Open Shelves', doi='10.5281/zenodo.10885753', licence='CC BY-NC 4.0',
               labels='every book a polygon, by the dataset; corners fitted here; no titles')


def quad(points):
    """Four corners for a polygon, clockwise from the top left: of three fits, the one overlapping it most - its hull
    with the point whose loss takes the least area dropped until four are left, its smallest enclosing rectangle, and
    that rectangle's corners moved to the hull points nearest them."""
    p = np.asarray(points, float)
    hull = [q for q in p[ConvexHull(p).vertices]]
    trimmed = list(hull)
    while len(trimmed) > 4:
        loss = []
        for k in range(len(trimmed)):
            (ax, ay), (bx, by) = trimmed[k] - trimmed[k - 1], trimmed[(k + 1) % len(trimmed)] - trimmed[k - 1]
            loss.append(abs(ax * by - ay * bx))
        trimmed.pop(int(np.argmin(loss)))
    rect = None
    for a, b in zip(hull, hull[1:] + hull[:1]):
        u = (b - a) / max(1e-9, np.linalg.norm(b - a))
        v = np.array([-u[1], u[0]])
        s, t = np.array(hull) @ u, np.array(hull) @ v
        size = (s.max() - s.min()) * (t.max() - t.min())
        if rect is None or size < rect[0]:
            rect = (size, [x * u + y * v for x, y in ((s.min(), t.min()), (s.max(), t.min()), (s.max(), t.max()), (s.min(), t.max()))])
    snapped = [hull[int(np.argmin([np.linalg.norm(h - c) for h in hull]))] for c in rect[1]]
    fits = [ordered(f) for f in (trimmed, rect[1], snapped) if len({tuple(np.round(c, 3)) for c in f}) == 4]
    return max(fits, key=lambda f: iou(points, f))


def ordered(corners):
    mid = np.mean(corners, 0)
    corners = sorted(corners, key=lambda c: np.arctan2(c[1] - mid[1], c[0] - mid[0]))
    first = int(np.argmin([c[0] + c[1] for c in corners]))
    return [[round(float(x), 1), round(float(y), 1)] for x, y in corners[first:] + corners[:first]]


def book(polygon):
    """A right book: its corners, and how well they fit the dataset's polygon (its IoU), its turn and title unknown."""
    corners = quad(polygon)
    return dict(source='dataset', verdict='right', corners=corners, fit=round(iou(polygon, corners), 3), turn=None, text=None)


def source_name(file_name):
    """The photo's own name under Roboflow's: IMG_3_jpg.rf.7d7d.jpg is IMG_3."""
    return re.sub(r'_(jpe?g|png|heic)$', '', re.sub(r'\.rf\.[0-9a-f]+\.jpg$', '', file_name), flags=re.I)


def convert(src, out):
    entries = []
    for ann in sorted(glob.glob(os.path.join(src, '*', '_annotations.coco.json'))):
        doc = json.load(open(ann))
        polys = collections.defaultdict(list)
        for a in doc['annotations']:
            polys[a['image_id']].append([pt for part in a['segmentation'] for pt in zip(part[::2], part[1::2])])
        entries += [(os.path.join(os.path.dirname(ann), im['file_name']), im, polys[im['id']]) for im in doc['images']]
    shipped = collections.Counter(source_name(im['file_name']) for _, im, _ in entries)
    os.makedirs(os.path.join(out, 'Data', FOLDER), exist_ok=True)
    for path, im, books in entries:
        name = source_name(im['file_name'])
        if shipped[name] > 1:
            continue
        photo = os.path.join(out, 'Data', FOLDER, name + '.jpg')
        shutil.copyfile(path, photo)
        sha = hashlib.sha256(open(photo, 'rb').read()).hexdigest()
        gt = dict(image=dict(name=name + '.jpg', sha256=sha), W=im['width'], H=im['height'], tagger=TAGGER, dataset=DATASET,
                  books=[book(b) for b in books])
        folder = os.path.join(out, 'GT', f'{name}__{sha[:8]}')
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, f'gt_{TAGGER}.json'), 'w') as f:
            json.dump(gt, f, indent=1)
            f.write('\n')


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('src', help='the unzipped export: its train, valid and test folders')
    ap.add_argument('out')
    a = ap.parse_args(argv)
    convert(a.src, a.out)


if __name__ == '__main__':
    main()
