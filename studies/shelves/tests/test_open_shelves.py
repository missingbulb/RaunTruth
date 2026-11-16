"""req/shelves/truth/datasets: a public dataset's per-book polygons become ground truth in the study's own Drive layout,
which the lab fetches and scores on its own, never mixed into the numbers of the books the owner tagged."""
import json
import os
import sys

import numpy as np
from PIL import Image

STUDY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(STUDY, 'lab'))
sys.path.insert(0, os.path.join(STUDY, 'py'))
import finder_metrics
import open_shelves
import photos
from books import iou

LEANING = [[100, 20], [130, 22], [112, 190], [82, 188]]           # a spine leaning right, its sides not upright
LYING = [[150, 140], [230, 140], [230, 160], [190, 161], [150, 160]]   # a book lying flat, five points round it
CUT = [[25, 194], [25, 186], [1, 20], [0, 199], [22, 200]]   # a spine the photo's edge cuts to nearly a triangle


def coco(tmp, split, name, polys):
    os.makedirs(tmp / split, exist_ok=True)
    Image.fromarray(np.full((200, 240, 3), 90, np.uint8)).save(tmp / split / name)
    doc = dict(images=[dict(id=0, file_name=name, width=240, height=200)], categories=[dict(id=1, name='book')],
               annotations=[dict(id=k, image_id=0, category_id=1, segmentation=[sum(p, [])]) for k, p in enumerate(polys)])
    json.dump(doc, open(tmp / split / '_annotations.coco.json', 'w'))


def test_each_book_is_a_right_book_whose_corners_cover_its_polygon_and_whose_title_is_unknown(tmp_path):
    coco(tmp_path / 'in', 'valid', 'IMG_1_jpg.rf.0a1b.jpg', [LEANING, LYING, CUT])
    out = tmp_path / 'out'
    open_shelves.convert(tmp_path / 'in', out)
    (gt_file,) = list((out / 'GT').glob('*/*.json'))
    gt = json.load(open(gt_file))
    assert len(gt['books']) == 3
    for book, poly in zip(gt['books'], [LEANING, LYING, CUT]):
        assert book['verdict'] == 'right' and len({tuple(c) for c in book['corners']}) == 4
        assert iou(poly, book['corners']) > 0.9 and book['fit'] == round(iou(poly, book['corners']), 3), book
        assert book['text'] is None and book['turn'] is None


def test_only_the_photos_the_dataset_did_not_augment_are_kept(tmp_path):
    coco(tmp_path / 'in', 'train', 'IMG_2_jpg.rf.9c9c.jpg', [LEANING])
    coco(tmp_path / 'in', 'valid', 'IMG_2_jpg.rf.8b8b.jpg', [LEANING])    # the same photo again, augmented
    coco(tmp_path / 'in', 'test', 'IMG_3_jpg.rf.7d7d.jpg', [LEANING])
    out = tmp_path / 'out'
    open_shelves.convert(tmp_path / 'in', out)
    assert [p.name for p in (out / 'Data' / open_shelves.FOLDER).iterdir()] == ['IMG_3.jpg']


def test_the_lab_finds_the_ground_truth_where_the_shell_would_have_saved_it(tmp_path):
    coco(tmp_path / 'in', 'valid', 'IMG_4_jpg.rf.5e5e.jpg', [LEANING])
    out = tmp_path / 'out'
    open_shelves.convert(tmp_path / 'in', out)
    (photo,) = list((out / 'Data' / open_shelves.FOLDER).iterdir())
    (gt_file,) = list((out / 'GT').glob('*/*.json'))
    manifest = [dict(drive_id='acme-id', sha256=photos.sha256_of(photo))]
    got = photos.gt_name(str(gt_file.relative_to(out)), manifest)
    assert os.path.basename(got) == 'acme-id__open-shelves.json'


def test_a_dataset_is_scored_apart_from_the_books_people_tagged():
    pairs = [('a.jpg', '/x/gt/id1__acme@example.com.json'), ('b.jpg', '/x/gt/id2__open-shelves.json'),
             ('c.jpg', '/x/gt/id3__acme@example.com.json')]
    groups = finder_metrics.by_source(pairs)
    assert groups == {None: [pairs[0], pairs[2]], 'open-shelves': [pairs[1]]}
